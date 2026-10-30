/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Plantilla visual
 * Archivo: EncabezadoPagina.tsx
 * Responsabilidad: El encabezado ÚNICO de las pantallas: módulo, título, subtítulo, chips y, a la
 *                  derecha, los selectores de contexto que ya tenga la pantalla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * PLANTILLA VISUAL (2026-10-24). Cada página escribía su `page-heading-*` a mano y el antetítulo
 * decía cosas distintas (el rol, «DMIT Instrucción» fijo, «Dirección»). Ahora:
 *   · el antetítulo es el MÓDULO: «Cuadro de Colores» o «Administración»;
 *   · el perfil de quien mira va en un chip «Perfil: …»;
 *   · los chips van en el orden código · fecha · semana · estado (los propios de la pantalla, al
 *     final): los arma quien llama, este componente solo los coloca;
 *   · los selectores de contexto que ya existían (fecha del cuadro, Desde–Hasta, formulario que
 *     se configura) van a la derecha desde `md`.
 * El banner de ventana va justo DEBAJO de este encabezado, en cada pantalla que lo tiene.
 */

import type { FC, ReactNode } from "react";

/** «Transporte · DAF» se sumó el 2026-10-24 (plantilla visual en las pantallas de la DAF). */
export type ModuloPagina = "Cuadro de Colores" | "Administración" | "Transporte · DAF";

type EncabezadoPaginaProps = {
  modulo: ModuloPagina;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** El rol con que entró la persona: va como chip «Perfil: …». */
  perfil?: string | null;
  /** Los chips de la pantalla, ya en orden. */
  chips?: ReactNode;
  /** Selectores de contexto y botones de la cabecera, a la derecha. */
  contexto?: ReactNode;
  /**
   * Bajo el título y el subtítulo, a todo el ancho (2026-10-24): lo que gobierna la pantalla entera
   * y merece ir junto al título, como el formulario que se configura en Catálogos.
   */
  debajo?: ReactNode;
};

const EncabezadoPagina: FC<EncabezadoPaginaProps> = ({
  modulo,
  titulo,
  subtitulo,
  perfil,
  chips,
  contexto,
  debajo,
}) => (
  <header className="flex flex-col gap-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">{modulo}</p>
        <h1 className="page-heading-title">{titulo}</h1>
        {subtitulo && <p className="page-heading-subtitle text-sm">{subtitulo}</p>}
        {(perfil || chips) && (
          <div className="flex flex-wrap items-center gap-2 pt-1" data-chips-encabezado>
            {perfil && <span className="badge badge-ghost badge-sm">Perfil: {perfil}</span>}
            {chips}
          </div>
        )}
      </div>
      {contexto && (
        <div className="app-page-header-actions flex flex-wrap items-end gap-3">{contexto}</div>
      )}
    </div>
    {debajo}
  </header>
);

export default EncabezadoPagina;
