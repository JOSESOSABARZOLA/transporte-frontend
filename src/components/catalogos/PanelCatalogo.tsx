/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: PanelCatalogo.tsx
 * Responsabilidad: El marco y la cabecera que comparten los tres catálogos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE EXTRAJO AL DEJAR DE SER TRES TABLAS IGUALES.
 *
 * Los puntos de encuentro dejaron de listarse como los otros dos catálogos —tienen una
 * segunda coordenada, la zonal, y se leen agrupados por ella—, así que `TablaCatalogo` ya
 * no puede servirlos. Lo que **sí** siguen compartiendo los tres es el marco: el panel, el
 * título, el recuento de vigentes y el botón de alta.
 *
 * Eso es lo que vive aquí, para que la división de arriba no traiga de vuelta el hallazgo
 * D-01: el día que cambie cómo se anuncia un catálogo, sigue habiendo un solo sitio.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

type PanelCatalogoProps = {
  titulo: string;
  /** Lo que acompaña al botón. Normalmente el recuento de valores vigentes. */
  distintivo: ReactNode;
  procesando: boolean;
  /**
   * El alta del catálogo. OPCIONAL desde el 2026-09-04: los puntos de encuentro movieron
   * su «Agregar» dentro de la tabla de zonales —se agrega a una zonal concreta—, así que
   * su panel ya no lleva botón en la cabecera. Sin esta función, la cabecera solo muestra
   * el distintivo.
   */
  onAgregar?: () => void;
  /**
   * Rótulo del botón. «Agregar» en los tres catálogos de lista.
   *
   * Se parametrizó el 2026-08-27, cuando entró un panel que no agrega filas sino que
   * guarda un conjunto: las áreas admitidas del formulario. La alternativa era duplicar
   * el marco del panel, y este componente existe justamente para que haya uno solo.
   */
  textoAccion?: string;
  /** Apaga el botón sin apagar el panel: no hay nada que guardar todavía. */
  accionDeshabilitada?: boolean;
  children: ReactNode;
};

const PanelCatalogo: FC<PanelCatalogoProps> = ({
  titulo,
  distintivo,
  procesando,
  onAgregar,
  textoAccion = "Agregar",
  accionDeshabilitada = false,
  children,
}) => (
  <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
    <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
        {titulo}
      </h2>
      <div className="flex items-center gap-2">
        {distintivo}
        {onAgregar && (
          <button
            type="button"
            className="btn btn-sm app-modules-panel-action"
            onClick={onAgregar}
            disabled={procesando || accionDeshabilitada}
          >
            {textoAccion}
          </button>
        )}
      </div>
    </div>

    <div className="app-data-panel-body px-2 pb-4 pt-2 md:px-4">{children}</div>
  </div>
);

export default PanelCatalogo;
