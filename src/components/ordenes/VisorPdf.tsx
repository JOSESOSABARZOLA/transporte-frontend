/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: VisorPdf.tsx
 * Responsabilidad: Renderizar un PDF (ya en memoria) DENTRO de la app, con desplazamiento continuo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-22
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISOR REUTILIZABLE, SOBRE UN BLOB QUE YA SE TIENE.
 *
 * No pide nada al servidor: recibe el PDF como Blob y lo pinta con react-pdf. Así sirve a
 * dos casos: el modal «Ver PDF» del memorando emitido, y la VISTA PREVIA EN VIVO del editor
 * (editar → previsualizar → generar), que ya tiene el Blob de `generarMemorandoEditado`.
 *
 * EL WORKER DE pdf.js SE SIRVE DESDE EL PROPIO ORIGEN. Vite lo emite como asset con `?url`
 * (misma versión que instala react-pdf, sin CDN); la CSP lo admite con `worker-src 'self'
 * blob:`, y nginx sirve el `.mjs` como `text/javascript` (sin eso el worker no ejecuta).
 *
 * TODAS LAS PÁGINAS SE PINTAN A LA VEZ, apiladas y con UN SOLO scroll (2026-09-23). La
 * botonera y el número de página DESPLAZAN a una página; no cambian la que se renderiza. Antes
 * se pintaba una sola página y avanzar desmontaba el lienzo para montar el siguiente, y ese
 * parpadeo se veía como si «se recargara» todo. Ahora avanzar solo desliza el scroll.
 *
 * TRAE ZOOM, MINIATURAS Y PANTALLA COMPLETA (2026-09-23), todo sobre el mismo react-pdf, sin
 * librería nueva: el zoom re-pinta la página a otra escala; las miniaturas son un segundo
 * documento con páginas pequeñas que desplazan a la elegida; la pantalla completa usa la
 * Fullscreen API del navegador sobre el propio visor. No hay marca de agua ni dependencias.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
import { Document as DocumentoPdf, Page as PaginaPdf, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
// La capa de texto hace el PDF SELECCIONABLE, como el visor de resolución. Su hoja usa estilos
// en línea, que la CSP admite (`style-src 'unsafe-inline'`).
import "react-pdf/dist/Page/TextLayer.css";

// El worker vive en el propio origen (Vite lo emite como asset); sin CDN, la CSP lo admite.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Límites del zoom: de la mitad al triple, en pasos de un 20 %. */
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_PASO = 0.2;

type VisorPdfProps = {
  /** El PDF a mostrar. `null` mientras se genera o carga. */
  pdf: Blob | null;
  /** Aún no hay PDF porque se está generando/pidiendo. */
  cargando?: boolean;
  /** Mensaje de error del servidor, si lo hubo. Se muestra tal cual (regla 7). */
  error?: string | null;
  /** Texto mientras no hay nada que mostrar (ni cargando ni error). */
  vacio?: string;
  /** Ancho base de la página, en px (al 100 % de zoom). Por omisión se acota a la pantalla. */
  ancho?: number;
  /**
   * Alto máximo del área del PDF, en px. Dentro de esa caja el documento HACE SCROLL (como el
   * visor de resolución), en vez de estirar el modal. Por omisión se acota a la ventana.
   * Se ignora con `llenarAlto` y en pantalla completa.
   */
  maxAlto?: number;
  /**
   * El visor LLENA EL ALTO de su contenedor (`h-full`), en lugar de acotarse con `maxAlto`. Así
   * hay UN SOLO scroll: la caja del PDF ocupa exactamente el cuerpo del modal. Requiere que el
   * contenedor tenga alto definido.
   */
  llenarAlto?: boolean;
};

const VisorPdf: FC<VisorPdfProps> = ({
  pdf,
  cargando,
  error,
  vacio,
  ancho,
  maxAlto,
  llenarAlto = false,
}) => {
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  // Borrador del campo «ir a página»: lo que se teclea NO salta al instante; se aplica al pulsar
  // Enter o al salir del campo (blur). `null` = el campo refleja la página actual (E23).
  const [paginaEnEdicion, setPaginaEnEdicion] = useState<string | null>(null);
  const [errorRender, setErrorRender] = useState<string | null>(null);
  const [escala, setEscala] = useState(1);
  const [miniaturas, setMiniaturas] = useState(false);
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);

  // El propio visor (para la pantalla completa), la caja de scroll y una referencia por
  // página, para desplazarse a una sin remontar nada.
  const raizRef = useRef<HTMLDivElement>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const paginaRefs = useRef<(HTMLDivElement | null)[]>([]);
  /**
   * Página a la que se está NAVEGANDO por botón, campo o miniatura (punto 33, 2026-10-05). Mientras
   * el desplazamiento llega, el IntersectionObserver informa páginas intermedias (o la de partida)
   * y devolvía el indicador a la 1: con esto ignora lo que no sea el destino hasta alcanzarlo.
   */
  const navegandoARef = useRef<number | null>(null);
  const liberarNavegacionRef = useRef<number | null>(null);

  /*
   * DOBLE BÚFER: EL PDF ANTERIOR SIGUE A LA VISTA MIENTRAS SE PREPARA EL NUEVO (2026-10-05).
   *
   * Cada PDF es una «capa» con su propio `<Document>`. Con `suspense={false}` react-pdf NO comparte
   * caché entre documentos: si a un único `<Document>` se le cambiara el `file`, se vaciaría (su
   * `loading`) hasta cargar el nuevo, y eso era el parpadeo. Por eso, al llegar un PDF nuevo, la capa
   * VISIBLE sigue pintando el anterior y la nueva se carga y renderiza OCULTA; cuando TODAS sus páginas
   * terminan de pintarse se intercambian en un solo commit. No se vuelve a la página 1 ni se reinicia
   * el zoom: se conservan página, escala y scroll. Un documento distinto (otra orden) remonta el visor
   * desde fuera (`key`), y ahí sí empieza de cero.
   */
  const [capas, setCapas] = useState<{ id: number; file: Blob }[]>(() =>
    pdf ? [{ id: 0, file: pdf }] : [],
  );
  const [capaVisible, setCapaVisible] = useState(0);
  // Total de páginas de la capa que se prepara oculta (para pintarlas todas antes de mostrarla).
  const [totalPendiente, setTotalPendiente] = useState(1);
  // Progreso del pintado de la capa oculta y scroll a restaurar al intercambiar. Son refs porque
  // solo se leen/escriben en manejadores y efectos, nunca durante el render.
  const progresoRef = useRef<{ id: number; total: number; listas: number } | null>(
    null,
  );
  const scrollAGuardarRef = useRef<number | null>(null);

  // Al cambiar el PDF se ajusta el estado DURANTE el render (patrón de React, no un efecto): se añade
  // la capa nueva junto a la visible, sin tocar página ni zoom.
  const [pdfPrevio, setPdfPrevio] = useState(pdf);
  if (pdf !== pdfPrevio) {
    setPdfPrevio(pdf);
    setErrorRender(null);
    if (pdf === null) {
      setCapas([]);
    } else {
      const idNuevo = (capas.at(-1)?.id ?? -1) + 1;
      const visible = capas.find((capa) => capa.id === capaVisible);
      setTotalPendiente(1);
      if (visible) {
        setCapas([visible, { id: idNuevo, file: pdf }]);
      } else {
        setCapas([{ id: idNuevo, file: pdf }]);
        setCapaVisible(idNuevo);
      }
    }
  }

  /** La capa oculta ya pintó todas sus páginas: pasa a ser la visible, conservando el scroll. */
  const promover = (id: number, total: number): void => {
    scrollAGuardarRef.current = cajaRef.current?.scrollTop ?? null;
    progresoRef.current = null;
    setCapas((actual) => actual.filter((capa) => capa.id === id));
    setCapaVisible(id);
    setPaginas(total);
    setPagina((actual) => Math.min(actual, Math.max(1, total)));
  };

  /** Una página más de la capa oculta quedó pintada; con todas, se intercambia. */
  const paginaLista = (id: number): void => {
    const progreso = progresoRef.current;
    if (!progreso || progreso.id !== id) return;
    progreso.listas += 1;
    if (progreso.listas >= progreso.total) promover(id, progreso.total);
  };

  // Restaura el scroll tras el intercambio, ANTES de pintar (layout effect): el lector no ve saltos.
  useLayoutEffect(() => {
    const guardado = scrollAGuardarRef.current;
    if (guardado !== null && cajaRef.current) {
      cajaRef.current.scrollTop = guardado;
    }
    scrollAGuardarRef.current = null;
  }, [capaVisible]);

  const actualizando = capas.length > 1;
  const archivoVisible =
    capas.find((capa) => capa.id === capaVisible)?.file ?? pdf;

  // El ancho base, nunca más que la pantalla disponible (en móvil no desborda); el zoom lo
  // multiplica después.
  const anchoBase = useMemo(() => {
    const disponible =
      (typeof window !== "undefined" ? window.innerWidth : 800) - 96;
    return Math.min(ancho ?? 600, disponible);
  }, [ancho]);

  const anchoPagina = Math.round(anchoBase * escala);

  // El alto del área del PDF: acotado a la ventana, para que el documento haga SCROLL dentro de
  // una caja y el modal no se estire.
  const alturaMaxima = useMemo(() => {
    const disponible =
      (typeof window !== "undefined" ? window.innerHeight : 800) - 220;
    return Math.max(320, Math.min(maxAlto ?? 900, disponible));
  }, [maxAlto]);

  // La caja llena el alto cuando lo pide el contenedor o cuando estamos a pantalla completa.
  const llenarCaja = llenarAlto || enPantallaCompleta;

  // TODAS LAS PÁGINAS SE PINTAN A LA VEZ, apiladas. La botonera y las miniaturas DESPLAZAN a una
  // página; NO cambian la que se renderiza, así el documento nunca se vuelve a montar.
  //
  // E23: TODA navegación (botones «/‹/›/», campo y miniaturas) pasa por aquí, que a la vez mueve el
  // contador Y DESPLAZA el scroll a la página. Antes los botones solo hacían `setPagina`, así que el
  // número cambiaba a «2/2» pero el documento se quedaba en la página 1.
  const irAPagina = (numero: number): void => {
    if (Number.isNaN(numero)) return;
    const destino = Math.min(Math.max(1, numero), Math.max(1, paginas));
    setPagina(destino);
    const elemento = paginaRefs.current[destino - 1];
    const caja = cajaRef.current;
    if (!elemento) return;
    navegandoARef.current = destino;
    // Red de seguridad: si el destino nunca llega a ser el más visible (página final más corta que
    // la caja), la navegación se libera sola y el indicador vuelve a seguir el scroll.
    if (liberarNavegacionRef.current !== null) {
      window.clearTimeout(liberarNavegacionRef.current);
    }
    liberarNavegacionRef.current = window.setTimeout(() => {
      navegandoARef.current = null;
    }, 800);
    // Desplaza SOLO la caja del visor (no el cajón ni la página que la contienen): `scrollIntoView`
    // movía también los contenedores externos. Donde `scrollTo` no existe (jsdom), se usa el otro.
    if (caja && typeof caja.scrollTo === "function") {
      const arriba =
        caja.scrollTop +
        (elemento.getBoundingClientRect().top - caja.getBoundingClientRect().top);
      caja.scrollTo({ top: Math.max(0, arriba - 8) });
    } else {
      elemento.scrollIntoView({ block: "start" });
    }
  };

  // Aplica lo tecleado en el campo «ir a página», validado a 1..total por `irAPagina`; un valor
  // vacío o inválido no mueve nada. Luego el campo vuelve a reflejar la página actual.
  const aplicarEntradaPagina = (): void => {
    if (paginaEnEdicion !== null && paginaEnEdicion.trim() !== "") {
      irAPagina(Number.parseInt(paginaEnEdicion, 10));
    }
    setPaginaEnEdicion(null);
  };

  const alejar = (): void =>
    setEscala((valor) => Math.max(ZOOM_MIN, Math.round((valor - ZOOM_PASO) * 10) / 10));
  const acercar = (): void =>
    setEscala((valor) => Math.min(ZOOM_MAX, Math.round((valor + ZOOM_PASO) * 10) / 10));

  const alternarPantallaCompleta = (): void => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void raizRef.current?.requestFullscreen();
    }
  };

  // Al desmontar, no deja vivo el temporizador que libera la navegación.
  useEffect(
    () => () => {
      if (liberarNavegacionRef.current !== null) {
        window.clearTimeout(liberarNavegacionRef.current);
      }
    },
    [],
  );

  // El estado de pantalla completa lo manda el navegador (también al salir con Escape).
  useEffect(() => {
    const alCambiar = (): void =>
      setEnPantallaCompleta(document.fullscreenElement === raizRef.current);
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  // El indicador «X / N» sigue a lo que se ve al desplazarse a mano: la página más visible
  // dentro de la caja manda. Sin PDF cargado (o en pruebas) no se observa nada.
  useEffect(() => {
    const caja = cajaRef.current;
    if (paginas < 1 || !caja || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const indice = paginaRefs.current.indexOf(
          visible.target as HTMLDivElement,
        );
        if (indice < 0) return;
        // Navegación explícita en curso: solo la página de destino puede fijar el indicador.
        if (navegandoARef.current !== null) {
          if (indice + 1 !== navegandoARef.current) return;
          navegandoARef.current = null;
        }
        setPagina(indice + 1);
      },
      { root: caja, threshold: [0.1, 0.5, 0.9] },
    );

    paginaRefs.current
      .slice(0, paginas)
      .forEach((elemento) => elemento && observador.observe(elemento));

    return () => observador.disconnect();
    // La capa visible cambia sus nodos al intercambiar: se vuelve a observar la nueva.
  }, [paginas, capaVisible]);

  const problema = error ?? errorRender;

  if (problema) {
    return (
      <div className="alert alert-error" role="alert">
        <span className="text-xs">{problema}</span>
      </div>
    );
  }

  if (cargando || !pdf) {
    return (
      <p className="py-8 text-center text-sm text-base-content/70">
        {cargando ? "Cargando el documento…" : (vacio ?? "Sin documento.")}
      </p>
    );
  }

  const totalMiniaturas = Math.max(paginas, 1);

  return (
    // Columna: BOTONERA arriba y, debajo, la fila [miniaturas · caja de scroll]. En pantalla
    // completa (o con `llenarAlto`) la columna ocupa todo el alto y la caja crece con `flex-1`.
    // A pantalla completa se pinta el fondo, que si no el navegador lo deja negro.
    <div
      ref={raizRef}
      className={`flex flex-col gap-2 ${llenarCaja ? "h-full" : ""} ${
        enPantallaCompleta ? "bg-base-100 p-3" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {paginas > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pagina <= 1}
              onClick={() => irAPagina(1)}
              aria-label="Primera página"
              title="Primera página"
            >
              «
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pagina <= 1}
              onClick={() => irAPagina(pagina - 1)}
              aria-label="Página anterior"
              title="Página anterior"
            >
              ‹
            </button>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={paginas}
                value={paginaEnEdicion ?? pagina}
                onChange={(evento) => setPaginaEnEdicion(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") {
                    evento.currentTarget.blur();
                  }
                }}
                onBlur={aplicarEntradaPagina}
                className="input input-bordered input-xs w-12 text-center"
                aria-label={`Página ${pagina} de ${paginas}`}
              />
              <span className="text-xs text-base-content/70">/ {paginas}</span>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pagina >= paginas}
              onClick={() => irAPagina(pagina + 1)}
              aria-label="Página siguiente"
              title="Página siguiente"
            >
              ›
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pagina >= paginas}
              onClick={() => irAPagina(paginas)}
              aria-label="Última página"
              title="Última página"
            >
              »
            </button>
          </div>
        )}

        {/* Indicador DISCRETO mientras se prepara la versión nueva: la anterior sigue a la vista. */}
        {actualizando && (
          <span className="text-xs text-base-content/60" role="status">
            Actualizando…
          </span>
        )}

        {/* Zoom · miniaturas · pantalla completa, pegados a la derecha. */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={escala <= ZOOM_MIN}
              onClick={alejar}
              aria-label="Alejar"
              title="Alejar"
            >
              −
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEscala(1)}
              aria-label="Ajustar el zoom al 100 %"
              title="Ajustar (100 %)"
            >
              {Math.round(escala * 100)}%
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={escala >= ZOOM_MAX}
              onClick={acercar}
              aria-label="Acercar"
              title="Acercar"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMiniaturas((valor) => !valor)}
            aria-pressed={miniaturas}
            aria-label={miniaturas ? "Ocultar miniaturas" : "Ver miniaturas"}
            title={miniaturas ? "Ocultar miniaturas" : "Ver miniaturas"}
          >
            ▤ Miniaturas
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={alternarPantallaCompleta}
            aria-label={
              enPantallaCompleta
                ? "Salir de pantalla completa"
                : "Pantalla completa"
            }
            title={
              enPantallaCompleta
                ? "Salir de pantalla completa"
                : "Pantalla completa"
            }
          >
            {enPantallaCompleta ? "⛶ Salir" : "⛶ Pantalla completa"}
          </button>
        </div>
      </div>

      {/* Fila: panel de miniaturas (opcional) + la caja de scroll del documento. */}
      <div
        className={`flex min-h-0 gap-2 ${llenarCaja ? "flex-1" : ""}`}
        style={llenarCaja ? undefined : { maxHeight: `${alturaMaxima}px` }}
      >
        {miniaturas && (
          <aside
            className="shrink-0 overflow-auto rounded-md bg-base-200/40 p-1"
            style={{ width: 108 }}
            aria-label="Miniaturas de las páginas"
          >
            <DocumentoPdf
              file={archivoVisible}
              suspense={false}
              loading={null}
              error={null}
            >
              {Array.from({ length: totalMiniaturas }, (_, indice) => (
                <button
                  key={indice}
                  type="button"
                  onClick={() => irAPagina(indice + 1)}
                  className={`mb-2 block w-full rounded-md border p-1 ${
                    pagina === indice + 1
                      ? "border-primary"
                      : "border-base-300"
                  }`}
                  aria-label={`Ir a la página ${indice + 1}`}
                  aria-current={pagina === indice + 1}
                >
                  <PaginaPdf
                    pageNumber={indice + 1}
                    width={84}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  <span className="mt-1 block text-center text-xs text-base-content/70">
                    {indice + 1}
                  </span>
                </button>
              ))}
            </DocumentoPdf>
          </aside>
        )}

        {/* LA ÚNICA caja de scroll del documento: desplaza a lo largo y a lo ancho. */}
        <div
          ref={cajaRef}
          className="min-w-0 flex-1 overflow-auto rounded-md bg-base-200/40"
        >
          <div className="mx-auto w-fit p-2">
            {capas.map((capa) => {
              const visible = capa.id === capaVisible;
              return (
                // La capa oculta se pinta entera (hidden) y no entra en la accesibilidad hasta que
                // se intercambia; la visible conserva las referencias de página para navegar.
                <div key={capa.id} hidden={!visible} aria-hidden={visible ? undefined : true}>
                  <DocumentoPdf
                    file={capa.file}
                    suspense={false}
                    onLoadSuccess={({ numPages }) => {
                      if (visible) {
                        setPaginas(numPages);
                        return;
                      }
                      progresoRef.current = { id: capa.id, total: numPages, listas: 0 };
                      setTotalPendiente(numPages);
                    }}
                    onLoadError={(fallo) => setErrorRender(fallo.message)}
                    loading={
                      visible ? (
                        <p className="py-8 text-center text-sm text-base-content/70">
                          Cargando el documento…
                        </p>
                      ) : null
                    }
                    error={
                      visible ? (
                        <div className="alert alert-error" role="alert">
                          <span className="text-xs">No se pudo mostrar el PDF.</span>
                        </div>
                      ) : null
                    }
                  >
                    {/* Todas las páginas apiladas: cambiar de página desplaza, no remonta. Antes de
                        conocer el total se pinta una, para que el documento tenga qué renderizar. */}
                    {Array.from(
                      { length: visible ? Math.max(paginas, 1) : totalPendiente },
                      (_, indice) => (
                        <div
                          key={indice}
                          ref={
                            visible
                              ? (elemento) => {
                                  paginaRefs.current[indice] = elemento;
                                }
                              : undefined
                          }
                          className={indice > 0 ? "mt-3" : ""}
                        >
                          <PaginaPdf
                            pageNumber={indice + 1}
                            width={anchoPagina}
                            renderAnnotationLayer={false}
                            onRenderSuccess={
                              visible ? undefined : () => paginaLista(capa.id)
                            }
                            // Una página que no se pudo pintar cuenta igual: la capa se muestra y no
                            // queda «Actualizando…» para siempre.
                            onRenderError={
                              visible ? undefined : () => paginaLista(capa.id)
                            }
                          />
                        </div>
                      ),
                    )}
                  </DocumentoPdf>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisorPdf;
