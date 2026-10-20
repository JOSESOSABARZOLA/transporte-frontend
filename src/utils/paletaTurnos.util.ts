/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Turnos de conductores
 * Archivo: paletaTurnos.util.ts
 * Responsabilidad: La letra, el nombre y el color de cada turno del conductor, en un solo sitio.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * LA COMPARTEN «Turnos del mes» (la matriz) y «Flota y garajes» (las fichas del patrón de
 * rotación y su constructor). Antes vivía solo en `configTurnosConductores.ts`; repetirla en la
 * flota habría dejado dos paletas que se separan en cuanto se toca una. Cada turno lleva su LETRA:
 * el color nunca es la única señal (regla 6).
 */

export type LetraTurno = "D" | "N" | "E" | "L" | "A";

export type TurnoDePatron = {
  letra: LetraTurno;
  nombre: string;
  /** Clases del inventario (colores del tema), las mismas de la matriz de turnos. */
  clase: string;
};

export const TURNOS_PATRON: TurnoDePatron[] = [
  { letra: "D", nombre: "Día", clase: "bg-success text-success-content" },
  { letra: "N", nombre: "Noche", clase: "bg-info text-info-content" },
  { letra: "E", nombre: "ECU noche", clase: "bg-primary text-primary-content" },
  { letra: "L", nombre: "Libre", clase: "bg-base-300" },
  { letra: "A", nombre: "Administrativo", clase: "bg-base-200" },
];

/** El turno de una letra del patrón. Una letra desconocida no tiene turno. */
export const turnoDeLetra = (letra: string): TurnoDePatron | undefined =>
  TURNOS_PATRON.find((turno) => turno.letra === letra);
