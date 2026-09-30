/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: Cobertura.ts
 * Responsabilidad: Los tipos de la matriz mensual de turnos del personal de Instrucción.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 */

/** Turno editable en la matriz. Las ausencias vienen de la disponibilidad, no de aquí. */
export type EstadoTurno = "DIURNO" | "NOCTURNO" | "DESCANSO";

export interface CeldaCobertura {
  fecha: string; // AAAA-MM-DD
  /** DIURNO | NOCTURNO | DESCANSO | VACACIONES | REPOSO_MEDICO | … | null si está vacío. */
  estado: string | null;
  /** `true` cuando el estado viene de una ausencia (no editable). */
  esAusencia: boolean;
}

export interface PersonaCobertura {
  funcionarioId: number;
  nombre: string;
  zonalId: number | null;
  zona: string | null;
  denominacion: string | null;
  celdas: CeldaCobertura[];
}

export interface TotalDia {
  fecha: string;
  diurno: number;
  nocturno: number;
  activos: number;
}

export interface MatrizCobertura {
  mes: string; // AAAA-MM
  dias: string[];
  personas: PersonaCobertura[];
  totales: TotalDia[];
}
