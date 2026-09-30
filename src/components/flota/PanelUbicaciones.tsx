/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: PanelUbicaciones.tsx
 * Responsabilidad: Mantener las zonales donde puede quedar un vehículo. RN-DAF-03.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES CATÁLOGO Y NO TEXTO LIBRE, Y ESA ES SU RAZÓN DE SER.
 *
 * La hoja de la DAF escribe la misma zonal de cuatro formas —`CALDERON`, `CALDERÓN`,
 * `LA CALDERON`— y lo mismo con `LOS CHILLOS`, que aparece como `LLOS CHILLOS`,
 * `LALOS CHILLOS` y `L.OS CHILLOS`. Con texto libre ninguna comparación es fiable y no se
 * puede responder «dónde duerme hoy la 7056».
 *
 * Por eso el nombre se guarda **en mayúsculas y sin espacios sobrantes**, el servidor lo
 * normaliza igual, y la unicidad la sostiene `uq_ubicacion_nombre` en la base.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA BAJA ES LÓGICA. `fk_destino_ubicacion` es `ON DELETE RESTRICT`: una zonal usada en un
 * destino ya declarado no se puede borrar sin dejar sin sitio a ese vehículo. Se desactiva
 * y deja de ofrecerse, conservando lo ya declarado.
 */

import { useState, type FC } from "react";

import type { UbicacionFlota } from "../../interfaces/Transporte.ts";

type PanelUbicacionesProps = {
  ubicaciones: UbicacionFlota[];
  cargando: boolean;
  procesando: boolean;
  onCrear: (nombre: string) => void;
  onDesactivar: (id: number) => void;
};

const PanelUbicaciones: FC<PanelUbicacionesProps> = ({
  ubicaciones,
  cargando,
  procesando,
  onCrear,
  onDesactivar,
}) => {
  const [nombre, setNombre] = useState("");

  const agregar = () => {
    const limpio = nombre.trim();
    if (!limpio) return;

    onCrear(limpio);
    setNombre("");
  };

  return (
    <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
      <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
          Zonales de reposo de la flota
        </h2>
        <span className="badge badge-ghost badge-sm">
          {cargando ? "Cargando…" : `${ubicaciones.length} vigentes`}
        </span>
      </div>

      <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
        <p className="text-xs text-base-content/70">
          Dónde puede quedar un vehículo al terminar la jornada. Sin al menos una
          zonal registrada, la DAF no puede declarar el destino de la flota en la
          asignación de transporte.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="form-control">
            <label
              className="label"
              htmlFor="nombreZonal"
            >
              <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
                Nombre de la zonal
              </span>
            </label>
            <input
              id="nombreZonal"
              type="text"
              className="input input-bordered input-sm"
              placeholder="ELOY ALFARO"
              value={nombre}
              disabled={procesando}
              onChange={(evento) => setNombre(evento.target.value)}
              onKeyDown={(evento) => {
                // Se registra una detrás de otra: obligar a soltar el teclado para
                // pulsar un botón haría del alta de cinco zonales un ejercicio de ratón.
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  agregar();
                }
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={agregar}
            disabled={procesando || nombre.trim() === ""}
          >
            Agregar zonal
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm table-zebra">
            <thead>
              <tr>
                <th scope="col">Zonal</th>
                <th scope="col">Estado</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ubicaciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-sm text-base-content/70"
                  >
                    {cargando
                      ? "Cargando…"
                      : "Todavía no hay zonales registradas. Mientras el catálogo esté vacío, la DAF no podrá declarar dónde queda cada vehículo."}
                  </td>
                </tr>
              ) : (
                ubicaciones.map((ubicacion) => (
                  <tr key={ubicacion.id}>
                    <td className="px-2 py-1 align-top font-semibold">
                      {ubicacion.nombre}
                    </td>
                    {/* Regla 6: el estado se lee, no se deduce de un color. */}
                    <td className="px-2 py-1 align-top">
                      {ubicacion.activo ? "Vigente" : "Dada de baja"}
                    </td>
                    <td className="px-2 py-1 align-top">
                      {ubicacion.activo && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => onDesactivar(ubicacion.id)}
                          disabled={procesando}
                        >
                          Dar de baja
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PanelUbicaciones;
