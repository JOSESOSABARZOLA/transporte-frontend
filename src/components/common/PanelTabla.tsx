/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Plantilla visual
 * Archivo: PanelTabla.tsx
 * Responsabilidad: El panel ÚNICO de las tablas: cabecera azul con su título (o sus pestañas) y sus
 *                  botones, barra blanca de filtros, cuerpo, pie y nota de ayuda.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * PLANTILLA VISUAL (2026-10-24).
 *   · Cabecera azul (#1E2E78, `app-modules-panel > app-section-header`) y `rounded-2xl`, en todas:
 *     Personal, Catálogos y Formularios eran paneles blancos.
 *   · En la cabecera, SOLO el título en mayúsculas (o las pestañas) y, a la derecha, los botones
 *     que ya tenía la pantalla. Sin contadores: el total se lee en el pie «Mostrando X–Y de Z».
 *   · LOS BOTONES DE LA CABECERA van dentro de `BarraOscuraContexto`: toman solos las variantes de
 *     barra que ya usan los cajones y `BarraPie` (principal azul con borde blanco, secundario blanco
 *     con texto azul). No hay variante nueva.
 *   · Bajo la cabecera, una barra blanca con los filtros que ya existían.
 *   · La nota de ayuda, al pie, con `NotaPanel`.
 */

import type { FC, ReactNode } from "react";

import { BarraOscuraContexto } from "./barraOscura.ts";
import NotaPanel from "./NotaPanel.tsx";

type PanelTablaProps = {
  /** El título de la cabecera (se pinta en mayúsculas). Sin `cabecera`. */
  titulo?: ReactNode;
  /** En lugar del título: las pestañas (`Pestanas sobreBarra`). */
  cabecera?: ReactNode;
  /** Los botones de la cabecera, a la derecha. */
  acciones?: ReactNode;
  /** La barra blanca de filtros, bajo la cabecera. */
  filtros?: ReactNode;
  /** La nota de ayuda al pie del panel. */
  nota?: ReactNode;
  /** El pie gris de acciones (los pasos de «Planificar el día»), bajo el cuerpo. */
  pie?: ReactNode;
  /** Atributos del cuerpo cuando es el panel de unas pestañas. */
  cuerpo?: { id: string; role: "tabpanel"; "aria-labelledby": string };
  etiqueta?: string;
  children: ReactNode;
};

const PanelTabla: FC<PanelTablaProps> = ({
  titulo,
  cabecera,
  acciones,
  filtros,
  nota,
  pie,
  cuerpo,
  etiqueta,
  children,
}) => (
  <section
    aria-label={etiqueta}
    className="app-modules-panel app-data-panel app-panel-tabla app-shell-surface overflow-visible rounded-2xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
  >
    <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      {cabecera ?? (
        <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
          {titulo}
        </h2>
      )}
      {acciones && (
        <BarraOscuraContexto.Provider value>
          <div className="flex flex-wrap items-center gap-2">{acciones}</div>
        </BarraOscuraContexto.Provider>
      )}
    </div>
    {filtros && (
      <div className="flex flex-wrap items-center gap-3 border-b border-base-300 bg-base-100 px-4 py-3 md:px-6">
        {filtros}
      </div>
    )}
    <div {...cuerpo} className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
      {children}
      {nota && <NotaPanel>{nota}</NotaPanel>}
    </div>
    {pie && (
      <div className="flex flex-col gap-3 rounded-b-2xl border-t border-base-300 bg-base-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        {pie}
      </div>
    )}
  </section>
);

export default PanelTabla;
