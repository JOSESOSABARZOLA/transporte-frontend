/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: VisorPdfMemorando.tsx
 * Responsabilidad: Ver el PDF del memorando emitido en un cajón lateral ancho, con imprimir/descargar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-22
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * «VER DOCUMENTO» EN CAJÓN LATERAL (2026-10-01). Antes era un `MarcoModal` centrado; ahora abre el
 * mismo `DrawerLateral` del resto de la app —en su variante ANCHA («3xl», ~768px)— para dar más
 * sitio al PDF. Renderiza con `VisorPdf` (react-pdf), el MISMO visor de la vista previa del editor
 * de plantilla: mismo zoom, páginas y controles. Aquí solo se añaden el pedido del PDF, el aviso
 * de borrador AGRUPADO por quién completa cada dato (E21) y las acciones Imprimir / Descargar.
 *
 * AVISO DE BORRADOR AGRUPADO POR ORIGEN (E21). Los datos sin completar se agrupan por QUIÉN los
 * completa —persona, configuración del cuadro y datos generales de la plantilla (que incluyen el
 * FIRMANTE: nombre, cargo y dependencia, 2026-10-02)— y cada grupo ofrece su propia acción: «Completar
 * datos» (el cargo del destinatario de ESTA orden, EN LÍNEA), «Completar cuadro» (NUT y
 * «elaborado por» del DÍA, EN LÍNEA, que promueve los borradores de la jornada) y «Completar en la
 * plantilla» (los datos generales del Director —incluido el firmante—, que abre el editor de la
 * plantilla). Al completar, el documento se regenera y el padre recarga la lista SIN cerrar el cajón.
 * Los formularios en línea se abren de a uno; el foco entra al primer campo y vuelve al botón al
 * cerrar; Enter guarda y Esc cierra solo el formulario (no el cajón).
 *
 * SE PIDE POR `httpClient` COMO BLOB, NO POR URL. La orden va detrás de sesión (cookie, solo
 * DIRECTOR): pasarle a react-pdf una URL haría que pdf.js la pidiera SIN la cookie y el servidor
 * respondería 401. Por eso se trae el Blob con `verOrdenMemorando` (que viaja con credenciales).
 *
 * IMPRIMIR usa un `iframe` oculto con una URL `blob:` del propio origen (sin recursos externos, por
 * la CSP estricta del nginx). Si la CSP bloqueara el `blob:` en un marco, «Descargar PDF» queda como
 * la acción fiable —y por eso es la primaria—. Un BORRADOR no es un documento válido (E22): antes de
 * imprimirlo o descargarlo se pide confirmación, y el archivo lleva el sufijo «-BORRADOR».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import DrawerLateral from "../common/DrawerLateral.tsx";
import ModalConfirmacion from "../common/ModalConfirmacion.tsx";
import VisorPdf from "./VisorPdf.tsx";
import { DocumentoService } from "../../services/documento.service.ts";
import type {
  EstadoOrden,
  Faltante,
  OrigenFaltante,
} from "../../interfaces/Documento.ts";
import { descargarArchivo } from "../../utils/banner.util.ts";
import { presentarError } from "../../utils/errorApi.util.ts";

type VisorPdfMemorandoProps = {
  codigo: string;
  /** Número oficial AMC-OS (G), o `null` mientras es Borrador. Va en el antetítulo y el archivo. */
  numeroOrden?: string | null;
  /** Estado único (A): gobierna el chip y el aviso de borrador. */
  estado?: EstadoOrden;
  /** Dueño de la hoja; va en el título del cajón: «Orden de servicio · <funcionario>». */
  funcionario: string;
  /** Vigente o Reemplazada (una reemitida deja la anterior no vigente). */
  vigente: boolean;
  /**
   * Datos del documento sin completar (D15/D16), cada uno con su ORIGEN ('persona' | 'configuracion'
   * | 'plantilla'), para agrupar el aviso de borrador por quién los completa (E21). Vacío = sin alerta.
   */
  datosFaltantes?: Faltante[];
  /** Fecha de la jornada (AAAA-MM-DD): la config del memorando es del DÍA (E21, 'configuracion'). */
  fechaJornada: string;
  /** Tras completar datos o configuración, para que el padre recargue la lista de órdenes. */
  onActualizado?: () => void;
  /**
   * Abre el editor de la plantilla (2026-10-02): los datos generales del Director —dirección
   * responsable, memorando de designación y funcionario designado— se completan ahí, no por orden.
   * Es la acción del grupo 'plantilla' del aviso de borrador.
   */
  onEditarPlantilla?: () => void;
  /**
   * PLANTILLA POR DIRECTOR (2026-10-05): `true` si la orden la generó el Director en sesión. Solo
   * entonces hay formularios en línea y «Completar en la plantilla»; una orden ajena es de SOLO
   * LECTURA (el servidor también lo exige con 403). Por omisión `true`, como hasta ahora.
   */
  esPropia?: boolean;
  /** Director que generó la orden, para «Faltan datos en la plantilla de <Director>». */
  directorNombre?: string | null;
  onCerrar: () => void;
};

const VisorPdfMemorando: FC<VisorPdfMemorandoProps> = ({
  codigo,
  numeroOrden = null,
  estado,
  funcionario,
  vigente,
  datosFaltantes = [],
  fechaJornada,
  onActualizado,
  onEditarPlantilla,
  esPropia = true,
  directorNombre = null,
  onCerrar,
}) => {
  // Estado efectivo: si no llega por prop, se deriva de vigente + faltantes (misma regla, A).
  const estadoEfectivo: EstadoOrden =
    estado ??
    (!vigente
      ? "REEMPLAZADA"
      : datosFaltantes.length > 0
        ? "BORRADOR"
        : "VIGENTE");
  const esBorrador = estadoEfectivo === "BORRADOR";
  // El archivo lleva el número oficial si ya lo tiene; si no, el código interno. Un borrador avisa
  // en el propio nombre que NO es un documento válido (E22).
  const nombreArchivo = `orden-${numeroOrden ?? codigo}${
    esBorrador ? "-BORRADOR" : ""
  }.pdf`;

  const [pdf, setPdf] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Contador para RE-PEDIR el PDF tras completar datos: al cambiar, el efecto vuelve a traerlo.
  const [recarga, setRecarga] = useState(0);
  const iframeImpresion = useRef<HTMLIFrameElement | null>(null);

  // Qué formulario en línea del aviso de borrador está abierto, y el estado de su envío. El firmante
  // y los demás datos generales se completan en el editor de la plantilla, no aquí (2026-10-02).
  const [formulario, setFormulario] = useState<
    "persona" | "cuadro" | null
  >(null);
  const [cargo, setCargo] = useState("");
  // El número de memorando salió de la config del cuadro (2026-10-02): es un dato general de la
  // plantilla. Aquí quedan el NUT y «elaborado por», que sí son del día.
  const [config, setConfig] = useState({
    nut: "",
    elaboradoPor: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  // Accesibilidad de los formularios en línea: el foco entra al primer campo al abrir y VUELVE al
  // botón que lo abrió al cerrar (Cancelar/Esc). Guardamos ambos para dirigirlo.
  const primerCampoRef = useRef<HTMLInputElement | null>(null);
  const botonAbridorRef = useRef<HTMLButtonElement | null>(null);
  // Confirmación de imprimir/descargar un borrador (E22): no es un documento válido todavía.
  const [confirmando, setConfirmando] = useState<"imprimir" | "descargar" | null>(
    null,
  );

  // El padre remonta el visor por `key={codigo}`, así que el estado nace limpio en cada apertura.
  // `recarga` lo vuelve a pedir tras completar un dato, para que el documento refleje el cambio.
  useEffect(() => {
    let vigenteEfecto = true;

    DocumentoService.verOrdenMemorando(codigo)
      .then((blob) => {
        if (vigenteEfecto) setPdf(blob);
      })
      .catch((fallo: unknown) => {
        if (vigenteEfecto) setError(presentarError(fallo).mensaje);
      });

    return () => {
      vigenteEfecto = false;
    };
  }, [codigo, recarga]);

  // Limpia el iframe de impresión al cerrar, para no dejar URLs `blob:` ni nodos sueltos.
  useEffect(
    () => () => {
      const marco = iframeImpresion.current;
      if (marco) {
        if (marco.src) URL.revokeObjectURL(marco.src);
        marco.remove();
        iframeImpresion.current = null;
      }
    },
    [],
  );

  const faltantesDe = (origen: OrigenFaltante): Faltante[] =>
    datosFaltantes.filter((falta) => falta.origen === origen);
  // Los CINCO orígenes (2026-10-05), en el orden en que se leen: funcionario, plantilla, firmante,
  // cuadro (NUT, elaborado por) y configuración (siglas institucionales).
  const faltantesPersona = faltantesDe("persona");
  const faltantesPlantilla = faltantesDe("plantilla");
  const faltantesFirmante = faltantesDe("firmante");
  const faltantesCuadro = faltantesDe("cuadro");
  const faltantesConfig = faltantesDe("configuracion");

  /**
   * Acción de los grupos que se completan EN LA PLANTILLA (datos generales y firmante): el botón solo
   * si la orden es propia —la plantilla es del Director que la generó—; si es ajena, se dice de quién
   * es la plantilla, sin botón (punto 31).
   */
  const accionPlantilla: ReactNode = esPropia ? (
    onEditarPlantilla ? (
      <button
        type="button"
        className="btn btn-sm whitespace-nowrap"
        onClick={onEditarPlantilla}
      >
        Completar en la plantilla
      </button>
    ) : null
  ) : (
    <span className="text-xs text-base-content/70">
      Faltan datos en la plantilla de {directorNombre ?? "otro Director"}
    </span>
  );

  /**
   * Abre el formulario de un grupo (solo uno a la vez); guarda el botón que lo abrió para devolverle
   * el foco al cerrar. La config se precarga con lo ya guardado del día.
   */
  const abrirFormulario = async (
    cual: "persona" | "cuadro",
    boton: HTMLButtonElement | null,
  ) => {
    setErrorForm(null);
    botonAbridorRef.current = boton;
    setFormulario(cual);
    if (cual === "cuadro") {
      try {
        const actual = await DocumentoService.obtenerConfigCuadro(fechaJornada);
        setConfig({
          nut: actual.nut ?? "",
          elaboradoPor: actual.elaboradoPor ?? "",
        });
      } catch {
        // Si no se pudo precargar, el formulario arranca vacío: no es un fallo que detenga completar.
      }
    }
  };

  /** Cierra el formulario abierto SIN cerrar el cajón y devuelve el foco al botón que lo abrió. */
  const cerrarFormulario = () => {
    setFormulario(null);
    setErrorForm(null);
    botonAbridorRef.current?.focus();
  };

  // Al abrir un formulario, el foco entra a su primer campo (accesibilidad).
  useEffect(() => {
    if (formulario !== null) primerCampoRef.current?.focus();
  }, [formulario]);

  /** Enter guarda; Escape cierra SOLO el formulario (no el cajón: se detiene la propagación). */
  const manejarTecla = (evento: KeyboardEvent, guardar: () => void) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      guardar();
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      cerrarFormulario();
    }
  };

  /** Tras completar con éxito: cierra el formulario, re-pide el PDF y avisa al padre para recargar. */
  const trasCompletar = () => {
    setFormulario(null);
    setGuardando(false);
    setRecarga((valor) => valor + 1);
    onActualizado?.();
  };

  const completarPersona = async () => {
    if (cargo.trim() === "") return;
    setGuardando(true);
    setErrorForm(null);
    try {
      await DocumentoService.completarDatosPersona(codigo, cargo.trim());
      trasCompletar();
    } catch (fallo) {
      setErrorForm(presentarError(fallo).mensaje);
      setGuardando(false);
    }
  };

  const completarConfig = async () => {
    setGuardando(true);
    setErrorForm(null);
    try {
      await DocumentoService.guardarConfigCuadro(fechaJornada, {
        nut: config.nut.trim() || null,
        elaboradoPor: config.elaboradoPor.trim() || null,
      });
      trasCompletar();
    } catch (fallo) {
      setErrorForm(presentarError(fallo).mensaje);
      setGuardando(false);
    }
  };

  const imprimir = () => {
    if (!pdf) return;
    // Un marco oculto con el PDF en `blob:` (del propio origen) e `print()` al cargar. Si la CSP lo
    // bloquea, no pasa nada: el usuario tiene «Descargar PDF».
    const anterior = iframeImpresion.current;
    if (anterior) {
      if (anterior.src) URL.revokeObjectURL(anterior.src);
      anterior.remove();
    }
    const url = URL.createObjectURL(pdf);
    const marco = document.createElement("iframe");
    marco.style.position = "fixed";
    marco.style.right = "0";
    marco.style.bottom = "0";
    marco.style.width = "0";
    marco.style.height = "0";
    marco.style.border = "0";
    marco.src = url;
    marco.onload = () => {
      marco.contentWindow?.focus();
      marco.contentWindow?.print();
    };
    document.body.appendChild(marco);
    iframeImpresion.current = marco;
  };

  const descargar = () => {
    if (pdf) descargarArchivo(pdf, nombreArchivo);
  };

  /** Imprimir/descargar: si es borrador, se pide confirmación antes (E22); si no, se hace directo. */
  const pedirImprimir = () => {
    if (!pdf) return;
    if (esBorrador) setConfirmando("imprimir");
    else imprimir();
  };
  const pedirDescargar = () => {
    if (!pdf) return;
    if (esBorrador) setConfirmando("descargar");
    else descargar();
  };
  const confirmarAccion = () => {
    const accion = confirmando;
    setConfirmando(null);
    if (accion === "imprimir") imprimir();
    else if (accion === "descargar") descargar();
  };

  /** Una fila del aviso agrupado: las etiquetas de ese origen y su acción. */
  const filaGrupo = (etiqueta: string, faltas: Faltante[], accion: ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm">
        <span className="font-semibold">{etiqueta}:</span>{" "}
        {faltas.map((falta) => falta.etiqueta).join(", ")}.
      </span>
      {accion}
    </div>
  );

  return (
    <DrawerLateral
      abierto
      ancho="3xl"
      antetitulo={numeroOrden ?? "Borrador · sin número"}
      titulo={`Orden de servicio · ${funcionario}`}
      onCerrar={onCerrar}
      pie={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!pdf}
            onClick={pedirImprimir}
          >
            Imprimir
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!pdf}
            onClick={pedirDescargar}
          >
            Descargar PDF
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`badge badge-sm whitespace-nowrap ${
              estadoEfectivo === "REEMPLAZADA"
                ? "badge-ghost"
                : estadoEfectivo === "BORRADOR"
                  ? "badge-warning"
                  : "badge-success"
            }`}
          >
            {estadoEfectivo === "REEMPLAZADA"
              ? "Reemplazada"
              : estadoEfectivo === "BORRADOR"
                ? "Borrador"
                : "Vigente"}
          </span>
          {/* Al completar los datos, la orden pasa a Vigente y toma su número oficial AMC-OS. */}
          {estadoEfectivo === "VIGENTE" && numeroOrden && (
            <span className="text-sm text-success" role="status">
              Orden vigente con el número {numeroOrden}
            </span>
          )}
        </div>

        {/* E21 · aviso de borrador AGRUPADO: un renglón por origen, cada uno con su acción. */}
        {esBorrador && datosFaltantes.length > 0 && (
          <div
            className="flex flex-col gap-3 rounded-md bg-warning/10 p-3"
            role="alert"
          >
            <p className="text-sm font-semibold">
              Borrador: faltan {datosFaltantes.length}{" "}
              {datosFaltantes.length === 1 ? "dato" : "datos"} · aparecen
              resaltados; la orden pasa a «Vigente» al completarlos.
            </p>

            {faltantesPersona.length > 0 &&
              filaGrupo(
                "Datos del funcionario",
                faltantesPersona,
                esPropia && <button
                  type="button"
                  className="btn btn-sm whitespace-nowrap"
                  onClick={(evento) =>
                    void abrirFormulario("persona", evento.currentTarget)
                  }
                >
                  Completar datos
                </button>,
              )}

            {esPropia && formulario === "persona" && (
              <div
                className="flex flex-col gap-2 rounded-md bg-base-100 p-2"
                onKeyDown={(evento) =>
                  manejarTecla(evento, () => void completarPersona())
                }
              >
                <label className="form-control w-full">
                  <span className="label-text text-xs">
                    Cargo del destinatario
                  </span>
                  <input
                    ref={primerCampoRef}
                    type="text"
                    className="input input-bordered input-sm w-full"
                    value={cargo}
                    onChange={(evento) => setCargo(evento.target.value)}
                    placeholder="Cargo del destinatario"
                    aria-label="Cargo del destinatario"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={cerrarFormulario}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void completarPersona()}
                    disabled={guardando || cargo.trim() === ""}
                  >
                    {guardando ? (
                      <>
                        <span
                          className="loading loading-spinner loading-sm"
                          aria-hidden="true"
                        />
                        Guardando…
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </div>
            )}

            {faltantesCuadro.length > 0 &&
              filaGrupo(
                "Cuadro",
                faltantesCuadro,
                esPropia && (
                  <button
                    type="button"
                    className="btn btn-sm whitespace-nowrap"
                    onClick={(evento) =>
                      void abrirFormulario("cuadro", evento.currentTarget)
                    }
                  >
                    Completar cuadro
                  </button>
                ),
              )}

            {esPropia && formulario === "cuadro" && (
              <div
                className="flex flex-col gap-2 rounded-md bg-base-100 p-2"
                onKeyDown={(evento) =>
                  manejarTecla(evento, () => void completarConfig())
                }
              >
                <p className="text-xs text-base-content/70">
                  Son del día: al guardarlos, se completan todas las órdenes de la
                  jornada que solo esperaban estos datos.
                </p>
                <label className="form-control w-full">
                  <span className="label-text text-xs">NUT</span>
                  <input
                    ref={primerCampoRef}
                    type="text"
                    className="input input-bordered input-sm w-full"
                    value={config.nut}
                    onChange={(evento) =>
                      setConfig((previo) => ({
                        ...previo,
                        nut: evento.target.value,
                      }))
                    }
                    aria-label="NUT"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text text-xs">Elaborado por</span>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    value={config.elaboradoPor}
                    onChange={(evento) =>
                      setConfig((previo) => ({
                        ...previo,
                        elaboradoPor: evento.target.value,
                      }))
                    }
                    aria-label="Elaborado por"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={cerrarFormulario}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void completarConfig()}
                    disabled={guardando}
                  >
                    {guardando ? (
                      <>
                        <span
                          className="loading loading-spinner loading-sm"
                          aria-hidden="true"
                        />
                        Guardando…
                      </>
                    ) : (
                      "Guardar cuadro"
                    )}
                  </button>
                </div>
              </div>
            )}

            {faltantesPlantilla.length > 0 &&
              filaGrupo(
                "Datos generales de la plantilla",
                faltantesPlantilla,
                // La dirección responsable, el memorando de designación y el funcionario designado son
                // datos generales de la plantilla del Director: se completan en el editor (una vez para
                // todas sus órdenes), no por orden.
                accionPlantilla,
              )}

            {faltantesFirmante.length > 0 &&
              filaGrupo("Firmante", faltantesFirmante, accionPlantilla)}

            {faltantesConfig.length > 0 &&
              filaGrupo(
                "Configuración",
                faltantesConfig,
                // Siglas institucionales: parámetro global, sin formulario en el visor.
                <span className="text-xs text-base-content/70">
                  Se configura en «Ventanas y parámetros».
                </span>,
              )}

            {errorForm && (
              <p className="text-xs text-error" role="alert">
                {errorForm}
              </p>
            )}
          </div>
        )}

        <VisorPdf
          pdf={pdf}
          cargando={!pdf && !error}
          error={error}
          ancho={700}
          maxAlto={Math.round(
            (typeof window !== "undefined" ? window.innerHeight : 900) * 0.72,
          )}
        />
      </div>

      <ModalConfirmacion
        abierto={confirmando !== null}
        titulo="Este documento es un borrador"
        mensaje={
          "La orden aún tiene datos sin completar y el documento sale con la marca «BORRADOR · NO VÁLIDO». ¿Continuar de todos modos?"
        }
        textoSi={confirmando === "imprimir" ? "Sí, imprimir" : "Sí, descargar"}
        textoNo="Cancelar"
        onConfirmar={confirmarAccion}
        onCancelar={() => setConfirmando(null)}
      />
    </DrawerLateral>
  );
};

export default VisorPdfMemorando;
