/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: TablaConductores.tsx
 * Responsabilidad: Mostrar los conductores del maestro y lo que les falta.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * SE SEÑALA EN LA FILA LO QUE IMPIDE TRABAJAR Y NO DA NINGÚN ERROR AL CREAR:
 *
 *   · SIN VEHÍCULO HABITUAL, la DAF no puede proponerle placa (RF-032) y, peor, **ese
 *     vehículo no llega a existir para ella**: su única vía de conocer la flota son los
 *     habituales de los conductores disponibles (PV-33). El alta parece correcta y el
 *     problema aparece el día de la asignación.
 *
 * Se escribe con palabra y no con un guion, por el mismo motivo que en P-11: «—» lo haría
 * parecer un dato que alguien olvidó cargar, y el siguiente administrador lo «completaría»
 * con lo que fuera.
 *
 * EL ESTADO LLEVA COLOR **Y** PALABRA, regla 6 de CLAUDE.md.
 */

import type { FC } from "react";

import type { Conductor } from "../../interfaces/Transporte.ts";

type TablaConductoresProps = {
  conductores: Conductor[];
  procesando: boolean;
  onEditar: (conductor: Conductor) => void;
  onDarDeBaja: (conductor: Conductor) => void;
  mensajeVacio: string;
};

const TablaConductores: FC<TablaConductoresProps> = ({
  conductores,
  procesando,
  onEditar,
  onDarDeBaja,
  mensajeVacio,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          <th scope="col">Cédula</th>
          <th scope="col">Nombre completo</th>
          <th scope="col">Teléfono</th>
          <th scope="col">Licencia</th>
          <th scope="col">Vehículo habitual</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {conductores.length === 0 ? (
          <tr>
            <td
              colSpan={7}
              className="px-3 py-6 text-center text-sm text-base-content/70"
            >
              {mensajeVacio}
            </td>
          </tr>
        ) : (
          conductores.map((conductor) => (
            <tr
              key={conductor.id}
              className={conductor.activo ? "hover:bg-info/10" : "opacity-60"}
            >
              <td className="px-3 py-1 align-top font-mono text-xs">
                {conductor.cedula}
              </td>
              <td className="px-3 py-1 align-top font-medium">
                {conductor.nombreCompleto}
              </td>
              <td className="px-3 py-1 align-top">
                {conductor.telefono ?? (
                  <span className="text-xs text-base-content/70">Sin teléfono</span>
                )}
              </td>
              <td className="px-3 py-1 align-top">
                {conductor.licenciaTipo ?? (
                  <span className="text-xs text-base-content/70">Sin registrar</span>
                )}
              </td>

              <td className="px-3 py-1 align-top">
                {conductor.vehiculoHabitual ? (
                  <span className="font-mono text-sm">
                    {conductor.vehiculoHabitual.placa}
                  </span>
                ) : (
                  <span className="badge badge-warning badge-sm">
                    Sin vehículo: la DAF no podrá proponerle placa
                  </span>
                )}
              </td>

              <td className="px-3 py-1 align-top">
                <span
                  className={`badge badge-sm ${
                    conductor.activo ? "badge-success" : "badge-ghost"
                  }`}
                >
                  {conductor.activo ? "Activo" : "Dado de baja"}
                </span>
              </td>

              <td className="px-3 py-1 align-top">
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onEditar(conductor)}
                    disabled={procesando}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => onDarDeBaja(conductor)}
                    disabled={procesando || !conductor.activo}
                    title={
                      conductor.activo
                        ? undefined
                        : "Este conductor ya está fuera del maestro."
                    }
                  >
                    Dar de baja
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default TablaConductores;
