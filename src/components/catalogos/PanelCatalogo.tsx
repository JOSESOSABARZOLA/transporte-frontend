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
 * segunda coordenada, la zonal, y se leen agrupados por ella—, así que la tabla común (la antigua
 * `TablaCatalogo`, retirada el 2026-10-13) ya no podía servirlos. Lo que **sí** siguen compartiendo los tres es el marco: el panel, el
 * título, el recuento de vigentes y el botón de alta.
 *
 * Eso es lo que vive aquí, para que la división de arriba no traiga de vuelta el hallazgo
 * D-01: el día que cambie cómo se anuncia un catálogo, sigue habiendo un solo sitio.
 *
 * ESTÁNDAR DE BOTONES (2026-10-15): la acción de la cabecera azul es `<Boton enBarraOscura>` de
 * 36 px: `primario` con borde claro (guardar, crear) o `secundario` blanco. Apagada, con su motivo
 * en el `title` (`motivoAccion`). Antes era `app-modules-panel-action`: 27,6 px y translúcido.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import Boton from "../common/Boton.tsx";

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
  /** Por qué está apagada la acción («Sin cambios»): va al `title`. */
  motivoAccion?: string | null;
  /** `primario` por omisión (guardar, crear); `secundario` para lo que no es la acción principal. */
  varianteAccion?: "primario" | "secundario";
  children: ReactNode;
};

const PanelCatalogo: FC<PanelCatalogoProps> = ({
  titulo,
  distintivo,
  procesando,
  onAgregar,
  textoAccion = "Agregar",
  accionDeshabilitada = false,
  motivoAccion,
  varianteAccion = "primario",
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
          <Boton
            variante={varianteAccion}
            enBarraOscura
            onClick={onAgregar}
            deshabilitado={procesando || accionDeshabilitada}
            motivoDeshabilitado={motivoAccion}
          >
            {textoAccion}
          </Boton>
        )}
      </div>
    </div>

    <div className="app-data-panel-body px-2 pb-4 pt-2 md:px-4">{children}</div>
  </div>
);

export default PanelCatalogo;
