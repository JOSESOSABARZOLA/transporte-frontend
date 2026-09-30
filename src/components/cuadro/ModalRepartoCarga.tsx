/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: ModalRepartoCarga.tsx
 * Responsabilidad: Mostrar de un vistazo cómo está repartida la carga del personal del formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-29
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISIÓN GLOBAL DEL REPARTO, CON LAS DOS SEÑALES.
 *
 * El selector de personal muestra la carga persona a persona; esta ventana la muestra JUNTA, para
 * ver el reparto del formulario de un vistazo antes de asignar. No pide nada al servidor: reusa los
 * mismos `candidatos` que ya trajo `GET /personal/elegible`, con sus dos señales advisory:
 *
 *   · FATIGA (seguridad): `nivelFatiga`, por umbrales absolutos. Carga baja/media/alta.
 *   · EQUIDAD (reparto): `nivelEquidad` frente a la CUOTA JUSTA (media del grupo). Bajo/en/sobre
 *     su parte. `sugerido` marca a quien está por debajo, candidato a recibir más.
 *
 * Cada señal lleva su TEXTO, no solo el color (regla 6). La tabla se desplaza en horizontal en
 * móvil (regla 16: scroll, no tarjetas) y usa solo clases del inventario (regla 1).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../../interfaces/Personal.ts";
import {
  CLASE_BADGE_EQUIDAD,
  CLASE_BADGE_FATIGA,
  NIVEL_EQUIDAD,
  NIVEL_FATIGA,
  NOMBRE_AREA,
} from "../../utils/personal.util.ts";

type ModalRepartoCargaProps = {
  abierto: boolean;
  onCerrar: () => void;
  /** El mismo listado que alimenta el selector; se leen sus señales ya calculadas. */
  candidatos: PersonaElegible[];
};

/** «+3.3» / «−6.4» / «0»: el signo hace ver de un lado quién sobra y quién falta de su parte. */
const conSigno = (valor: number): string =>
  valor > 0 ? `+${valor}` : String(valor);

const ModalRepartoCarga: FC<ModalRepartoCargaProps> = ({
  abierto,
  onCerrar,
  candidatos,
}) => {
  /**
   * Solo quienes traen carga calculada, ordenados de MAYOR a menor índice: la visión de reparto
   * se lee mejor con el más cargado arriba (lo contrario que el selector, que ofrece al de menor
   * carga primero para asignar). No muta el arreglo original.
   */
  const filas = useMemo(
    () =>
      candidatos
        .filter((persona) => persona.indiceCarga !== undefined)
        .slice()
        .sort((a, b) => (b.indiceCarga ?? 0) - (a.indiceCarga ?? 0)),
    [candidatos],
  );

  /** La cuota justa es la misma para todo el grupo; se toma de la primera que la traiga. */
  const cuota = filas.find((persona) => persona.cuotaJusta !== undefined)
    ?.cuotaJusta;

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta="Reparto de carga del personal"
      onCerrar={onCerrar}
      ancho="4xl"
      antetitulo="Personal del formulario"
      titulo="Reparto de carga"
      pie={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/*
          LAS DOS SEÑALES, EXPLICADAS EN UNA LÍNEA. Sin esto, «En su parte» o «Carga alta» se leen
          sin saber contra qué. La cuota justa —la media del grupo— es la referencia de la equidad.
        */}
        <p className="text-sm text-base-content/70">
          <strong>Fatiga</strong> es la carga acumulada de la semana (seguridad).{" "}
          <strong>Reparto</strong> compara a cada persona con la{" "}
          <strong>cuota justa</strong>
          {cuota !== undefined ? ` del grupo (${cuota})` : ""}: quien está por
          debajo puede recibir más; quien está por encima, ya carga de más.
        </p>

        {filas.length === 0 ? (
          <p className="px-1 py-2 text-sm text-base-content/70">
            Todavía no hay carga calculada para este personal.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Unidad</th>
                  <th className="text-right">Operativos</th>
                  <th className="text-right">Índice</th>
                  <th>Fatiga</th>
                  <th>Reparto</th>
                  <th className="text-right">Desviación</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((persona) => (
                  <tr key={persona.id}>
                    <td>
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="font-medium">
                          {nombreDePersona(persona)}
                        </span>
                        {persona.sugerido && (
                          <span className="badge badge-primary badge-sm">
                            Sugerido
                          </span>
                        )}
                        {!persona.elegible && (
                          <span className="badge badge-ghost badge-sm">
                            No disponible
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-sm text-base-content/70">
                      {NOMBRE_AREA[persona.area]}
                    </td>
                    <td className="text-right">
                      {persona.operativosAsignados ?? 0}
                    </td>
                    <td className="text-right">{persona.indiceCarga}</td>
                    <td>
                      {persona.nivelFatiga && (
                        <span
                          className={`badge badge-sm ${CLASE_BADGE_FATIGA[persona.nivelFatiga]}`}
                        >
                          {NIVEL_FATIGA[persona.nivelFatiga]}
                        </span>
                      )}
                    </td>
                    <td>
                      {persona.nivelEquidad && (
                        <span
                          className={`badge badge-sm ${CLASE_BADGE_EQUIDAD[persona.nivelEquidad]}`}
                        >
                          {NIVEL_EQUIDAD[persona.nivelEquidad]}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {persona.desviacionCarga !== undefined
                        ? conSigno(persona.desviacionCarga)
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MarcoModal>
  );
};

export default ModalRepartoCarga;
