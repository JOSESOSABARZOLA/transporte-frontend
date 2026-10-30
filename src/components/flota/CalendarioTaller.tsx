/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: CalendarioTaller.tsx
 * Responsabilidad: La vista «Calendario semanal» de la pestaña Vehículos: placa × 7 días con una
 *                  barra por parada de taller.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUSTITUYE A `SemanaMantenimiento` (de la página «Mantenimiento de vehículos», retirada el
 * 2026-10-20). La pregunta sigue siendo «¿qué tengo parado esta semana?», ahora dentro de Flota:
 *
 *   · Siete días desde `desde`, con ‹ Anterior · Hoy · Siguiente ›. El día elegido en «Estado el
 *     día» se resalta (`bg-primary/5` y «(elegido)» para el lector de pantalla, regla 6).
 *   · Una BARRA por parada: la celda ocupa sus días consecutivos de la semana (`colSpan`), lleva el
 *     motivo escrito (y el estado si no hay motivo) y el tooltip dice motivo, rango y estado.
 *   · Solo los vehículos activos con alguna parada en la semana; sin ninguno, «Ningún vehículo en
 *     taller esta semana.». El buscador ya llega aplicado en `filas`.
 *
 * Los datos los pide la página (`FlotaService.disponibilidad` con la fecha `desde`): aquí solo se
 * pintan. Un día de la semana sin parada dice «—» (no es una ausencia de dato: está libre).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import Boton from "../common/Boton.tsx";
import Insignia from "../common/Insignia.tsx";
import Tooltip from "../common/Tooltip.tsx";
import type { DisponibilidadDeVehiculo, ParadaDeLaSemana } from "../../interfaces/Flota.ts";
import { fechaLarga } from "../../utils/ausencias.util.ts";
import { NOMBRE_ESTADO_PARADA, diaCorto, normalizarPlaca } from "../../utils/flota.util.ts";
import { sumarDias } from "../../utils/jornada.util.ts";

export const VACIO_CALENDARIO = "Ningún vehículo en taller esta semana.";

/** «Cambio de frenos · del 20/10/2026 al 23/10/2026 · En taller». */
const textoParada = (parada: ParadaDeLaSemana): string =>
  [
    parada.motivo ?? "Sin motivo registrado",
    `del ${fechaLarga(parada.desde)} al ${fechaLarga(parada.hasta)}`,
    NOMBRE_ESTADO_PARADA[parada.estado],
  ].join(" · ");

type CalendarioTallerProps = {
  /** Primer día de la semana (AAAA-MM-DD). */
  desde: string;
  /** El día de «Estado el día», que se resalta si cae en la semana. */
  fechaElegida: string;
  /** Las filas de `disponibilidad(desde)`, ya filtradas por el buscador; `null` mientras carga. */
  filas: DisponibilidadDeVehiculo[] | null;
  error: string | null;
  onCambiarDesde: (desde: string) => void;
  onHoy: () => void;
};

const CalendarioTaller: FC<CalendarioTallerProps> = ({
  desde,
  fechaElegida,
  filas,
  error,
  onCambiarDesde,
  onHoy,
}) => {
  const dias = Array.from({ length: 7 }, (_, indice) => sumarDias(desde, indice));
  const conParadas = (filas ?? []).filter((fila) => fila.activo && fila.paradas.length > 0);

  /** Las celdas de una fila: una barra por parada (sus días consecutivos) y «—» los días libres. */
  const celdas = (fila: DisponibilidadDeVehiculo): ReactNode[] => {
    const salida: ReactNode[] = [];
    let indice = 0;
    while (indice < dias.length) {
      const dia = dias[indice];
      const parada = fila.paradas.find((p) => p.desde <= dia && p.hasta >= dia);
      if (!parada) {
        salida.push(
          <td key={dia} className={`px-2 py-1 text-xs text-app-muted ${dia === fechaElegida ? "bg-primary/5" : ""}`}>
            —
          </td>,
        );
        indice += 1;
        continue;
      }
      let fin = indice;
      while (fin + 1 < dias.length && dias[fin + 1] <= parada.hasta) fin += 1;
      const texto = textoParada(parada);
      salida.push(
        <td
          key={dia}
          colSpan={fin - indice + 1}
          className="px-1 py-1"
          data-parada={parada.id}
        >
          <Tooltip texto={texto}>
            <span tabIndex={0} className="flex min-w-0">
              <Insignia variante="aviso" className="min-w-0 max-w-full justify-start">
                <span className="min-w-0 truncate">
                  {parada.motivo ?? NOMBRE_ESTADO_PARADA[parada.estado]}
                </span>
                <span className="sr-only">: {texto}</span>
              </Insignia>
            </span>
          </Tooltip>
        </td>,
      );
      indice = fin + 1;
    }
    return salida;
  };

  return (
    <section aria-label="Calendario semanal de taller" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-app-strong">
          Semana del {diaCorto(dias[0])} al {diaCorto(dias[6])}
        </h2>
        <div className="flex items-center gap-2">
          <Boton tamano="sm" aria-label="Semana anterior" onClick={() => onCambiarDesde(sumarDias(desde, -7))}>
            <span aria-hidden="true">‹</span> Anterior
          </Boton>
          <Boton tamano="sm" onClick={onHoy}>
            Hoy
          </Boton>
          <Boton tamano="sm" aria-label="Semana siguiente" onClick={() => onCambiarDesde(sumarDias(desde, 7))}>
            Siguiente <span aria-hidden="true">›</span>
          </Boton>
        </div>
      </div>

      {error && <AvisoEnLinea variante="error">{error}</AvisoEnLinea>}

      <div className="overflow-x-auto">
        <table className="table table-sm table-zebra w-full text-sm" aria-label="Paradas de taller de la semana">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-app-label">
              <th scope="col">Placa</th>
              {dias.map((dia) => (
                <th
                  key={dia}
                  scope="col"
                  className={`whitespace-nowrap ${dia === fechaElegida ? "bg-primary/5" : ""}`}
                  aria-current={dia === fechaElegida ? "date" : undefined}
                >
                  {diaCorto(dia)}
                  {dia === fechaElegida && <span className="sr-only"> (elegido)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conParadas.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-app-muted">
                  {filas === null ? "Cargando la semana…" : VACIO_CALENDARIO}
                </td>
              </tr>
            ) : (
              conParadas.map((fila) => (
                <tr key={fila.vehiculoId} className="hover:bg-primary/5" data-vehiculo-id={fila.vehiculoId}>
                  <th scope="row" className="font-mono font-semibold text-app-strong">
                    {normalizarPlaca(fila.placa)}
                  </th>
                  {celdas(fila)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CalendarioTaller;
