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

import { useEffect, useMemo, useRef, useState, type FC } from "react";
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
  const [errorRender, setErrorRender] = useState<string | null>(null);
  const [escala, setEscala] = useState(1);
  const [miniaturas, setMiniaturas] = useState(false);
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);

  // El propio visor (para la pantalla completa), la caja de scroll y una referencia por
  // página, para desplazarse a una sin remontar nada.
  const raizRef = useRef<HTMLDivElement>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const paginaRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Al cambiar el PDF (nueva vista previa) se reinicia el estado. Es el patrón de React de
  // «ajustar estado durante el render» comparando con el valor anterior, no un efecto: así no
  // se pinta un instante la paginación del documento viejo sobre el nuevo.
  const [pdfPrevio, setPdfPrevio] = useState(pdf);
  if (pdf !== pdfPrevio) {
    setPdfPrevio(pdf);
    setPagina(1);
    setPaginas(0);
    setEscala(1);
    setErrorRender(null);
  }

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
  const irAPagina = (numero: number): void => {
    if (Number.isNaN(numero)) return;
    const destino = Math.min(Math.max(1, numero), Math.max(1, paginas));
    setPagina(destino);
    paginaRefs.current[destino - 1]?.scrollIntoView({ block: "start" });
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
        if (indice >= 0) setPagina(indice + 1);
      },
      { root: caja, threshold: [0.1, 0.5, 0.9] },
    );

    paginaRefs.current
      .slice(0, paginas)
      .forEach((elemento) => elemento && observador.observe(elemento));

    return () => observador.disconnect();
  }, [paginas]);

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
              onClick={() => setPagina(1)}
              aria-label="Primera página"
              title="Primera página"
            >
              «
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((numero) => Math.max(1, numero - 1))}
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
                value={pagina}
                onChange={(evento) =>
                  irAPagina(Number.parseInt(evento.target.value, 10))
                }
                className="input input-bordered input-xs w-12 text-center"
                aria-label={`Página ${pagina} de ${paginas}`}
              />
              <span className="text-xs text-base-content/70">/ {paginas}</span>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina((numero) => Math.min(paginas, numero + 1))}
              aria-label="Página siguiente"
              title="Página siguiente"
            >
              ›
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina(paginas)}
              aria-label="Última página"
              title="Última página"
            >
              »
            </button>
          </div>
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
            <DocumentoPdf file={pdf} loading={null} error={null}>
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
            <DocumentoPdf
              file={pdf}
              onLoadSuccess={({ numPages }) => setPaginas(numPages)}
              onLoadError={(fallo) => setErrorRender(fallo.message)}
              loading={
                <p className="py-8 text-center text-sm text-base-content/70">
                  Cargando el documento…
                </p>
              }
              error={
                <div className="alert alert-error" role="alert">
                  <span className="text-xs">No se pudo mostrar el PDF.</span>
                </div>
              }
            >
              {/* Todas las páginas apiladas: cambiar de página desplaza, no remonta. Antes de
                  conocer el total se pinta una, para que el documento tenga qué renderizar. */}
              {Array.from({ length: Math.max(paginas, 1) }, (_, indice) => (
                <div
                  key={indice}
                  ref={(elemento) => {
                    paginaRefs.current[indice] = elemento;
                  }}
                  className={indice > 0 ? "mt-3" : ""}
                >
                  <PaginaPdf
                    pageNumber={indice + 1}
                    width={anchoPagina}
                    renderAnnotationLayer={false}
                  />
                </div>
              ))}
            </DocumentoPdf>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisorPdf;
