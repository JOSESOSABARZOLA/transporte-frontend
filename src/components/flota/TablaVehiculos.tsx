/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: TablaVehiculos.tsx
 * Responsabilidad: Mostrar los vehículos del maestro y lo que se puede hacer con ellos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * EL ESTADO LLEVA COLOR **Y** PALABRA, regla 6 de CLAUDE.md. En un sistema llamado
 * *cuadro de colores* esa disciplina exige atención deliberada.
 *
 * LOS INACTIVOS SE ATENÚAN Y SE ROTULAN, no se esconden. Es la misma decisión de P-07:
 * quien busca un vehículo que no aparece concluye que se borró y lo vuelve a dar de alta;
 * entonces la placa choca contra el índice único y el sistema parece averiado.
 *
 * CUÁNTOS CONDUCTORES LO LLEVAN es una columna y no un adorno: es lo que explica por qué
 * dar de baja un vehículo cambia lo que la DAF ve en P-03. Un vehículo sin conductor
 * habitual **no se puede asignar** desde aquella pantalla (PV-33), así que un cero ahí es
 * una advertencia, no un dato neutro.
 */

import type { FC } from "react";

import type { Conductor, Vehiculo } from "../../interfaces/Transporte.ts";

type TablaVehiculosProps = {
  vehiculos: Vehiculo[];
  /** El maestro de conductores, para contar quién lleva cada vehículo. */
  conductores: Conductor[];
  procesando: boolean;
  onEditar: (vehiculo: Vehiculo) => void;
  onDarDeBaja: (vehiculo: Vehiculo) => void;
  mensajeVacio: string;
};

const TablaVehiculos: FC<TablaVehiculosProps> = ({
  vehiculos,
  conductores,
  procesando,
  onEditar,
  onDarDeBaja,
  mensajeVacio,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm table-zebra">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          <th scope="col">Placa</th>
          <th scope="col">Descripción</th>
          <th scope="col">Conductores habituales</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {vehiculos.length === 0 ? (
          <tr>
            <td
              colSpan={5}
              className="px-3 py-6 text-center text-sm text-base-content/70"
            >
              {mensajeVacio}
            </td>
          </tr>
        ) : (
          vehiculos.map((vehiculo) => {
            // Solo los conductores ACTIVOS cuentan: uno dado de baja ya no lo lleva a
            // ningún operativo, y sumarlo haría creer que el vehículo sigue cubierto.
            const habituales = conductores.filter(
              (conductor) =>
                conductor.activo &&
                conductor.vehiculoHabitual?.id === vehiculo.id,
            );

            return (
              <tr
                key={vehiculo.id}
                className={
                  vehiculo.activo ? "hover:bg-primary/5" : "opacity-60"
                }
              >
                <td className="px-3 py-1 align-top font-mono font-medium">
                  {vehiculo.placa}
                </td>
                <td className="px-3 py-1 align-top">
                  {vehiculo.descripcion ?? (
                    <span className="text-xs text-base-content/70">Sin descripción</span>
                  )}
                </td>

                <td className="px-3 py-1 align-top">
                  {habituales.length === 0 ? (
                    /* Con palabras, no con un guion: un «—» parece un dato que alguien
                       olvidó cargar, y esto es una consecuencia que conviene entender. */
                    <span className="badge badge-warning badge-sm">
                      Ninguno: la DAF no podrá asignarlo
                    </span>
                  ) : (
                    <span className="text-sm">
                      {habituales
                        .map((conductor) => conductor.nombreCompleto)
                        .join(", ")}
                    </span>
                  )}
                </td>

                <td className="px-3 py-1 align-top">
                  <span
                    className={`badge badge-sm ${
                      vehiculo.activo ? "badge-success" : "badge-ghost"
                    }`}
                  >
                    {vehiculo.activo ? "Activo" : "Dado de baja"}
                  </span>
                </td>

                <td className="px-3 py-1 align-top">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onEditar(vehiculo)}
                      disabled={procesando}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => onDarDeBaja(vehiculo)}
                      disabled={procesando || !vehiculo.activo}
                      title={
                        vehiculo.activo
                          ? undefined
                          : "Este vehículo ya está fuera del maestro."
                      }
                    >
                      Dar de baja
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default TablaVehiculos;
