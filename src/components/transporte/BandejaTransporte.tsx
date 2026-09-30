/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: BandejaTransporte.tsx
 * Responsabilidad: Listar lo que la DAF tiene por resolver, con los nocturnos primero.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ORDEN LO DECIDE EL SERVIDOR, Y NO SE REORDENA AQUÍ.
 *
 * `GET /transporte/pendientes/:fecha` devuelve **los nocturnos primero** porque son los
 * que impiden cerrar la jornada (INV-11 y RN-43). Reordenar en el cliente por cualquier
 * otro criterio —identificador, formulario— enterraría el operativo urgente en la mitad
 * de la lista sin que nadie lo notara.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * YA NO TODO LO QUE LLEGA ESTÁ PENDIENTE. 2026-08-31.
 *
 * Hasta hoy el endpoint filtraba por `estadoTransporte = PENDIENTE` y no había filas
 * resueltas que separar, así que la columna de conductor podía escribir «Pendiente» a
 * mano. Con `?incluirResueltos=true` eso pasó a ser mentira: llegan también los asignados
 * y los de propios medios, y la columna **tiene que leer el estado real**.
 *
 * El caso 5 del plan sigue valiendo en la vista por omisión: sin resueltos, al guardar una
 * asignación la fila sale de la bandeja.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import type { OperativoPendiente } from "../../interfaces/Transporte.ts";

type BandejaTransporteProps = {
  operativos: OperativoPendiente[];
  seleccionadoId: number | null;
  onSeleccionar: (operativo: OperativoPendiente) => void;
  /** Fuera de la ventana la bandeja se consulta, pero no se abre el panel. */
  soloLectura: boolean;
  mensajeVacio: string;
};

const BandejaTransporte: FC<BandejaTransporteProps> = ({
  operativos,
  seleccionadoId,
  onSeleccionar,
  soloLectura,
  mensajeVacio,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm table-zebra">
      <thead>
        <tr>
          <th scope="col">Identificador</th>
          <th scope="col">Formulario</th>
          <th scope="col">Horario</th>
          <th scope="col">Personal</th>
          <th scope="col">Punto</th>
          <th scope="col">Conductor</th>
          <th scope="col">Acción</th>
        </tr>
      </thead>
      <tbody>
        {operativos.length === 0 ? (
          <tr>
            <td
              colSpan={7}
              className="px-2 py-6 text-center text-sm text-base-content/70"
            >
              {mensajeVacio}
            </td>
          </tr>
        ) : (
          operativos.map((operativo) => (
            <tr
              key={operativo.id}
              className={
                operativo.id === seleccionadoId ? "bg-primary/5" : undefined
              }
            >
              <td className="px-2 py-1 align-top font-mono text-xs font-semibold">
                {operativo.identificador}
              </td>
              <td className="px-2 py-1 align-top">
                <span className="flex items-center gap-2">
                  {/* El color del banner lo entrega el servidor (regla 3 de CLAUDE.md). */}
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-1.5 rounded"
                    style={{ backgroundColor: operativo.colorFondo }}
                  />
                  {operativo.formularioNombre}
                </span>
              </td>
              <td className="px-2 py-1 align-top">
                {operativo.horario}
                {operativo.esNocturno && (
                  <span className="badge badge-ghost badge-xs ml-2">
                    Nocturno
                  </span>
                )}
              </td>
              <td className="px-2 py-1 align-top">
                {operativo.personasAsignadas}
              </td>
              <td className="px-2 py-1 align-top">
                {operativo.puntoEncuentro || "—"}
              </td>

              {/*
                Equivalente textual SIEMPRE, y el amarillo solo cuando de verdad falta
                algo (regla 6). El obligatorio de RN-43 se distingue del simplemente
                pendiente: no es lo mismo «falta» que «sin esto no se cierra la jornada».
                Una fila ya resuelta no se pinta de alerta, porque no lo es.
              */}
              <td
                className={`px-2 py-1 align-top font-semibold ${
                  operativo.estadoTransporte === "PENDIENTE"
                    ? "bg-warning/25"
                    : ""
                }`}
              >
                {textoDelEstado(operativo)}
              </td>

              <td className="px-2 py-1 align-top">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onSeleccionar(operativo)}
                  disabled={soloLectura}
                  title={
                    soloLectura
                      ? "La ventana de asignación de la DAF no está abierta."
                      : undefined
                  }
                >
                  {operativo.estadoTransporte === "PENDIENTE"
                    ? "Asignar"
                    : "Corregir"}
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

/**
 * Lo que dice la columna de conductor, en palabras.
 *
 * `PROPIOS_MEDIOS` no se abrevia a «resuelto»: es una decisión concreta de la DAF —el
 * operativo se cubre SIN vehículo— y confundirla con «ya tiene conductor» llevaría a
 * buscar una placa que nunca se asignó.
 */
const textoDelEstado = (operativo: OperativoPendiente): string => {
  if (operativo.estadoTransporte === "ASIGNADO") return "Asignado";
  if (operativo.estadoTransporte === "PROPIOS_MEDIOS") return "Propios medios";

  return operativo.requiereConductor ? "Obligatorio, pendiente" : "Pendiente";
};

export default BandejaTransporte;
