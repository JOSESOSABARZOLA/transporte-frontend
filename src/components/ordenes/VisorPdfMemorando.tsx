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
 * mismo `DrawerLateral` del resto de la app. Desde el cajón estándar (2026-10-15, D6) es `lg` en modo
 * LECTURA —[Imprimir] · [Cerrar] · [Descargar PDF]— y el documento se dibuja AL ANCHO DEL CAJÓN
 * (se mide con `ResizeObserver`), no a 700 px fijos. Renderiza con `VisorPdf` (react-pdf), el MISMO visor de la vista previa del editor
 * de plantilla: mismo zoom, páginas y controles. Aquí solo se añaden el pedido del PDF, el aviso
 * de borrador AGRUPADO por quién completa cada dato (E21) y las acciones Imprimir / Descargar.
 *
 * AVISO DE BORRADOR AGRUPADO POR ORIGEN (E21). Los datos sin completar se agrupan por QUIÉN los
 * completa —datos generales de la plantilla (que incluyen el FIRMANTE: nombre, cargo y
 * dependencia, 2026-10-02, y la TABLA DE CONTROL: «elaborado por» y siglas, 2026-10-08)— y cada
 * grupo ofrece su propia acción: «Completar en la plantilla» abre el editor de la plantilla del
 * Director. El grupo «Cuadro» (NUT y «elaborado por» del DÍA) se retiró el 2026-10-08, y también
 * «Completar datos» (el cargo del destinatario EN LÍNEA): el cargo sale de la ficha de Personal y,
 * si no lo tiene, va en blanco, así que ya no es un dato que falte.
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

import { useEffect, useRef, useState, type FC, type ReactNode } from "react";

import Boton from "../common/Boton.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import Insignia from "../common/Insignia.tsx";
import MensajeModal from "../common/MensajeModal.tsx";
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
   * Datos del documento sin completar (D15/D16), cada uno con su ORIGEN ('persona' | 'plantilla' |
   * 'firmante' | 'configuracion'), para agrupar el aviso de borrador por quién los completa (E21). Vacío = sin alerta.
   */
  datosFaltantes?: Faltante[];
  /**
   * Abre el editor de la plantilla (2026-10-02): los datos generales del Director —dirección
   * responsable, memorando de designación y funcionario designado— se completan ahí, no por orden.
   * Es la acción del grupo 'plantilla' del aviso de borrador.
   */
  onEditarPlantilla?: () => void;
  /**
   * PLANTILLA POR DIRECTOR (2026-10-05): `true` si la orden la generó el Director en sesión. Solo
   * entonces se ofrece «Completar en la plantilla»; una orden ajena es de SOLO
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
  const iframeImpresion = useRef<HTMLIFrameElement | null>(null);

  // D6: el ancho del cuerpo del cajón, para dibujar el documento a ese ancho. 0 mientras no se mide
  // (o sin `ResizeObserver`, como en las pruebas): entonces, el ancho de siempre.
  const contenedor = useRef<HTMLDivElement>(null);
  const [anchoDisponible, setAnchoDisponible] = useState(0);
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(([entrada]) =>
      setAnchoDisponible(Math.floor(entrada.contentRect.width)),
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  // Ya no hay formularios en línea (2026-10-08): el firmante, los datos generales y la tabla de
  // control se completan en el editor de la plantilla; el cargo del destinatario sale de su ficha.
  // Confirmación de imprimir/descargar un borrador (E22): no es un documento válido todavía.
  const [confirmando, setConfirmando] = useState<"imprimir" | "descargar" | null>(
    null,
  );

  // El padre remonta el visor por `key={codigo}`, así que el estado nace limpio en cada apertura.
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
  }, [codigo]);

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
  // Los CUATRO orígenes (2026-10-08), en el orden en que se leen: funcionario, plantilla (con la tabla
  // de control), firmante y configuración (el respaldo de órdenes antiguas).
  const faltantesPersona = faltantesDe("persona");
  const faltantesPlantilla = faltantesDe("plantilla");
  const faltantesFirmante = faltantesDe("firmante");
  const faltantesConfig = faltantesDe("configuracion");

  /**
   * Acción de los grupos que se completan EN LA PLANTILLA (datos generales y firmante): el botón solo
   * si la orden es propia —la plantilla es del Director que la generó—; si es ajena, se dice de quién
   * es la plantilla, sin botón (punto 31).
   */
  const accionPlantilla: ReactNode = esPropia ? (
    onEditarPlantilla ? (
      <Boton variante="secundario" tamano="sm" icono="editar" onClick={onEditarPlantilla}>
        Completar en la plantilla
      </Boton>
    ) : null
  ) : (
    <span className="text-xs text-app-muted">
      Faltan datos en la plantilla de {directorNombre ?? "otro Director"}
    </span>
  );

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
      ancho="lg"
      modo="lectura"
      titulo={`Orden de servicio · ${funcionario}`}
      subtitulo={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-mono">{numeroOrden ?? "Borrador · sin número"}</span>
          <Insignia
            className="whitespace-nowrap"
            variante={
              estadoEfectivo === "REEMPLAZADA"
                ? "neutro"
                : estadoEfectivo === "BORRADOR"
                  ? "aviso"
                  : "exito"
            }
          >
            {estadoEfectivo === "REEMPLAZADA"
              ? "Reemplazada"
              : estadoEfectivo === "BORRADOR"
                ? "Borrador"
                : "Vigente"}
          </Insignia>
        </span>
      }
      onCerrar={onCerrar}
      textoAccionLectura="Descargar PDF"
      onAccionLectura={pedirDescargar}
      motivoGuardar={pdf ? null : "El documento todavía se está cargando."}
      accionesPie={
        <Boton
          tamano="lg"
          motivoDeshabilitado={pdf ? null : "El documento todavía se está cargando."}
          onClick={pedirImprimir}
        >
          Imprimir
        </Boton>
      }
    >
      <div
        ref={contenedor}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        {/* Al completar los datos, la orden pasa a Vigente y toma su número oficial AMC-OS. */}
        {estadoEfectivo === "VIGENTE" && numeroOrden && (
          <p
            className="text-sm text-[var(--app-text-exito)]"
            role="status"
          >
            Orden vigente con el número {numeroOrden}
          </p>
        )}

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
                // Sin acción (2026-10-08): el nombre y la dependencia los deriva el servidor y el cargo
                // sale de la ficha, en blanco si no lo tiene. El grupo se tolera, sin formulario.
                null,
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
                <span className="text-xs text-app-muted">
                  Se configura en «Ventanas y parámetros».
                </span>,
              )}
          </div>
        )}

        <VisorPdf
          pdf={pdf}
          cargando={!pdf && !error}
          error={error}
          ancho={anchoDisponible > 0 ? anchoDisponible - 24 : 700}
          maxAlto={Math.round(
            (typeof window !== "undefined" ? window.innerHeight : 900) * 0.72,
          )}
        />
      </div>

      <MensajeModal
        abierto={confirmando !== null}
        variante="advertencia"
        titulo={
          confirmando === "imprimir" ? "¿Imprimir el borrador?" : "¿Descargar el borrador?"
        }
        mensaje="La orden aún tiene datos sin completar y el documento sale con la marca «BORRADOR · NO VÁLIDO»."
        textoPrincipal={confirmando === "imprimir" ? "Sí, imprimir" : "Sí, descargar"}
        onPrincipal={confirmarAccion}
        onSecundario={() => setConfirmando(null)}
      />
    </DrawerLateral>
  );
};

export default VisorPdfMemorando;
