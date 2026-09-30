/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: VisorPdfMemorando.tsx
 * Responsabilidad: Ver el PDF del memorando emitido DENTRO de la app, tal cual, con descarga.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-22
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL VISOR DEL MEMORANDO EMITIDO. 2026-09-22.
 *
 * «Ver PDF» abre el memorando EXACTO de una orden ya emitida —lo que va a entregar la
 * Dirección— sin salir de la pantalla, con paginación y descarga. Renderiza con `VisorPdf`
 * (react-pdf); solo aporta el marco (modal), el pedido del PDF y la descarga.
 *
 * SE PIDE POR `httpClient` COMO BLOB, NO POR URL. La orden va detrás de sesión (cookie,
 * solo DIRECTOR): pasarle a react-pdf una URL haría que pdf.js la pidiera SIN la cookie y
 * el servidor respondería 401. Por eso se trae el Blob con `verOrdenMemorando` (que ya
 * viaja con credenciales) y se le entrega a `VisorPdf`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";
import VisorPdf from "./VisorPdf.tsx";
import { DocumentoService } from "../../services/documento.service.ts";
import { descargarArchivo } from "../../utils/banner.util.ts";
import { presentarError } from "../../utils/errorApi.util.ts";

type VisorPdfMemorandoProps = {
  codigo: string;
  onCerrar: () => void;
};

const VisorPdfMemorando: FC<VisorPdfMemorandoProps> = ({ codigo, onCerrar }) => {
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El padre remonta el visor por `key={codigo}`, así que el estado nace limpio en cada apertura.
  useEffect(() => {
    let vigente = true;

    DocumentoService.verOrdenMemorando(codigo)
      .then((blob) => {
        if (vigente) setPdf(blob);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(presentarError(fallo).mensaje);
      });

    return () => {
      vigente = false;
    };
  }, [codigo]);

  return (
    <MarcoModal
      abierto
      etiqueta={`Orden de servicio ${codigo}`}
      titulo="Orden de servicio"
      antetitulo={codigo}
      // Diálogo ACOTADO y centrado: se ve la página de Órdenes alrededor, así queda claro que es
      // una ventana encima —no una recarga—. Para verlo grande, el visor tiene su propio botón de
      // pantalla completa (Fullscreen del navegador), que no depende del tamaño del modal.
      ancho="4xl"
      onCerrar={onCerrar}
      pie={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!pdf}
            onClick={() => pdf && descargarArchivo(pdf, `orden-${codigo}.pdf`)}
          >
            Descargar
          </button>
        </div>
      }
    >
      <VisorPdf
        pdf={pdf}
        cargando={!pdf && !error}
        error={error}
        ancho={740}
        // La caja del PDF se limita al 68 % de la ventana, que cabe dentro del cuerpo del modal
        // —así el modal NO añade su propia barra y el scroll sigue siendo uno solo—.
        maxAlto={Math.round(
          (typeof window !== "undefined" ? window.innerHeight : 900) * 0.68,
        )}
      />
    </MarcoModal>
  );
};

export default VisorPdfMemorando;
