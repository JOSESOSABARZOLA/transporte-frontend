/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: GrupoParametros.tsx
 * Responsabilidad: Una sección plegable de parámetros con su título y su resumen.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * La cabecera es un `<button>` con `aria-expanded` y `aria-controls`: se abre con clic, Enter o
 * Espacio. El chevron acompaña, no informa (regla 6): lo dice `aria-expanded`.
 */

import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";

import Iconos from "../common/Iconos.tsx";
import type { GrupoParametros as Grupo } from "../../config/catalogoParametros.ts";

type GrupoParametrosProps = {
  grupo: Grupo;
  abierto: boolean;
  onAlternar: () => void;
  children: ReactNode;
};

const GrupoParametros: FC<GrupoParametrosProps> = ({
  grupo,
  abierto,
  onAlternar,
  children,
}) => {
  const idCuerpo = `grupo-parametros-${grupo.id}`;
  return (
    <section className="rounded-md border border-base-300 bg-base-100">
      <div className="flex items-center justify-between gap-3 bg-base-200 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          aria-expanded={abierto}
          aria-controls={idCuerpo}
          onClick={onAlternar}
        >
          {/* Chevron real (2026-10-24): a la derecha plegado, abajo abierto, con transición. */}
          <span
            aria-hidden="true"
            className={`inline-flex text-xs text-app-muted motion-safe:transition-transform ${
              abierto ? "rotate-90" : ""
            }`}
          >
            <Iconos nombre="acordeon" />
          </span>
          {/* Sin el número de parámetros (plantilla visual, 2026-10-24). */}
          <span className="font-semibold text-app-strong">{grupo.titulo}</span>
        </button>
        <span className="text-xs text-app-muted">
          {grupo.resumen}
          {grupo.enlace && (
            <>
              {" · "}
              <Link to={grupo.enlace.ruta} className="link link-primary">
                {grupo.enlace.texto}
              </Link>
            </>
          )}
        </span>
      </div>
      {abierto && (
        <div id={idCuerpo} className="overflow-x-auto">
          {children}
        </div>
      )}
    </section>
  );
};

export default GrupoParametros;
