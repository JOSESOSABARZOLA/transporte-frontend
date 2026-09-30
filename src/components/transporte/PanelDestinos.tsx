/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Destino del vehículo
 * Archivo: PanelDestinos.tsx
 * Responsabilidad: Declarar dónde queda cada vehículo al terminar la jornada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * RN-DAF-03. «SI NO SE LES PONE DÓNDE DEJAR EL VEHÍCULO SE VUELVE UN DESPELOTE.»
 *
 * Es la columna COORDINACIÓN de la hoja de la DAF, informada en 393 filas del mes de
 * agosto, y no existía en ninguna capa del sistema. Sin ella, al día siguiente nadie sabe
 * dónde está cada placa y la planificación empieza a ciegas.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * VIVE EN P-03 Y NO EN UNA PANTALLA APARTE. El destino se decide MIENTRAS se asigna: la
 * analista resuelve las dos cosas en la misma llamada de teléfono. Separarlas en dos
 * pantallas obligaría a recorrer la flota dos veces, que es exactamente la doble digitación
 * que este módulo existe para eliminar.
 *
 * ES UNA FILA POR VEHÍCULO, NO POR OPERATIVO. Un conductor encadena varios operativos en
 * un turno —106 celdas del mes llevan dos rangos y 53 llevan tres o más— y el vehículo
 * termina en un solo sitio.
 */

import type { FC } from "react";

import type {
  DestinoVehiculo,
  UbicacionFlota,
  VehiculoDeLaFlota,
} from "../../interfaces/Transporte.ts";

/** Valor del desplegable que significa «se lo lleva el conductor». */
export const DOMICILIO = "domicilio";

type PanelDestinosProps = {
  vehiculos: VehiculoDeLaFlota[];
  ubicaciones: UbicacionFlota[];
  /** Lo ya declarado ese día, por identificador de vehículo. */
  destinos: Map<number, DestinoVehiculo>;
  soloLectura: boolean;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  onDeclarar: (vehiculoId: number, valor: string) => void;
};

const PanelDestinos: FC<PanelDestinosProps> = ({
  vehiculos,
  ubicaciones,
  destinos,
  soloLectura,
  guardando,
  aviso,
  onDeclarar,
}) => (
  <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
    <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
        Dónde queda cada vehículo
      </h2>
      <span className="badge badge-ghost badge-sm">
        {destinos.size} de {vehiculos.length} declarados
      </span>
    </div>

    <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
      {aviso && (
        <div
          className="alert alert-error"
          role="alert"
        >
          <span>{aviso}</span>
        </div>
      )}

      {/*
        El catálogo lo carga el administrador y nace vacío: la evidencia se contradice
        —cinco zonales en la hoja de agosto, cuatro en la reunión— y es la pregunta Q-01.
        Sin catálogo no se puede declarar nada, y decirlo es mejor que ofrecer un
        desplegable con una sola opción inútil.
      */}
      {ubicaciones.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-base-content/70">
          Todavía no hay zonales de reposo registradas. El administrador debe
          cargarlas desde «Conductores y vehículos» antes de poder declarar dónde
          queda cada vehículo.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm table-zebra">
            <thead>
              <tr>
                <th scope="col">Placa</th>
                <th scope="col">Estado</th>
                <th scope="col">Queda en</th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-sm text-base-content/70"
                  >
                    No hay vehículos registrados en la flota.
                  </td>
                </tr>
              ) : (
                vehiculos.map((vehiculo) => {
                  const declarado = destinos.get(vehiculo.id);
                  const valor = declarado
                    ? declarado.domicilio
                      ? DOMICILIO
                      : String(declarado.ubicacion?.id ?? "")
                    : "";

                  return (
                    <tr key={vehiculo.id}>
                      <td className="px-2 py-1 align-top font-mono text-xs font-semibold">
                        {vehiculo.placa}
                      </td>
                      {/* Regla 6: el estado se lee, no se deduce de un color. */}
                      <td className="px-2 py-1 align-top">
                        {vehiculo.utilizable
                          ? "Disponible"
                          : (vehiculo.motivo ?? "No disponible")}
                      </td>
                      <td className="px-2 py-1 align-top">
                        <select
                          className="select select-bordered select-xs w-full"
                          aria-label={`Destino de ${vehiculo.placa}`}
                          value={valor}
                          disabled={soloLectura || guardando}
                          onChange={(evento) =>
                            onDeclarar(vehiculo.id, evento.target.value)
                          }
                        >
                          <option value="">Sin declarar</option>
                          {/*
                            RN-DAF-04. Solo el conductor con parqueadero autorizado puede
                            llevárselo; quién conduce ese día puede cambiar después, así
                            que la opción se ofrece siempre y el servidor no la bloquea.
                          */}
                          <option value={DOMICILIO}>
                            Se lo lleva el conductor
                          </option>
                          {ubicaciones.map((ubicacion) => (
                            <option
                              key={ubicacion.id}
                              value={ubicacion.id}
                            >
                              {ubicacion.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

export default PanelDestinos;
