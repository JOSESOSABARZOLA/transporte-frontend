/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: Cobertura.ts
 * Responsabilidad: Los tipos de la matriz mensual de turnos del personal de Instrucción.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * 2026-10-05: la matriz trae también el cargo, los avisos entre días, el estado del mes y los
 * totales completos (descanso, ausencias, sin turno). Contrato del backend `cobertura-turnos`.
 */

/** Turno editable en la matriz. Las ausencias vienen de la disponibilidad, no de aquí. */
export type EstadoTurno = "DIURNO" | "NOCTURNO" | "DESCANSO";

/** Estado del mes (solo informativo: la elegibilidad usa la matriz esté publicada o no). */
export type EstadoMesCobertura =
  | "BORRADOR"
  | "PUBLICADO"
  | "PUBLICADO_CON_CAMBIOS";

export interface CeldaCobertura {
  fecha: string; // AAAA-MM-DD
  /** DIURNO | NOCTURNO | DESCANSO | VACACIONES | REPOSO_MEDICO | … | null si está vacío. */
  estado: string | null;
  /** `true` cuando el estado viene de una ausencia (no editable). */
  esAusencia: boolean;
  /** Aviso entre días (racha sin descanso, nocturno→diurno). Solo avisa, no bloquea. */
  aviso?: string;
}

export interface PersonaCobertura {
  funcionarioId: number;
  nombre: string;
  /** El cargo del Maestro de personal (se muestra si difiere de la denominación). */
  cargo: string | null;
  zonalId: number | null;
  zona: string | null;
  denominacion: string | null;
  /** Cuántas celdas de la persona tienen aviso. */
  avisos: number;
  celdas: CeldaCobertura[];
}

export interface TotalDia {
  fecha: string;
  diurno: number;
  nocturno: number;
  descanso: number;
  ausencias: number;
  /** Celda vacía sin ausencia: ese día la persona no tiene restricción de horario. */
  sinTurno: number;
  activos: number;
}

export interface MatrizCobertura {
  mes: string; // AAAA-MM
  dias: string[];
  personas: PersonaCobertura[];
  totales: TotalDia[];
  estadoMes: EstadoMesCobertura;
  /** `true` si alguna regla de aviso está configurada (si no, no hay avisos que mostrar). */
  avisosConfigurados: boolean;
  /**
   * Días por debajo del mínimo de conductores (solo la DAF, 2026-10-06), por fecha. Lo calcula el
   * servidor con `DAF_MIN_CONDUCTORES_DIA/NOCHE`; sin esos parámetros no viaja.
   */
  bajoMinimo?: Record<string, { dia: boolean; noche: boolean }>;
}

/**
 * Una celda a escribir: `estado: null` la limpia. El estado es TEXTO (2026-10-06): la misma matriz
 * planifica los turnos de Instrucción (DIURNO/NOCTURNO/DESCANSO) y los de conductores (DIA/NOCHE/…).
 * `funcionarioId` es el identificador de la FILA (persona o conductor).
 */
export interface CambioCelda {
  funcionarioId: number;
  fecha: string;
  estado: string | null;
}

/** Respuesta del lote: lo aplicado y lo que el servidor omitió, con su motivo. */
export interface ResultadoLote {
  aplicadas: number;
  omitidas: { funcionarioId: number; fecha: string; motivo: string }[];
}

/** Propuesta de «Continuar rotación»: no escribe nada; se aplica con el lote. */
export interface PropuestaRotacion {
  propuestas: { funcionarioId: number; fecha: string; estado: string }[];
  personas: number;
  omitidas: number;
}

export interface ResultadoPublicar {
  estadoMes: EstadoMesCobertura;
  celdasVacias: number;
}

/**
 * «Generar propuesta del mes» (DAF, 2026-10-06). El servidor llena el mes según el patrón de
 * rotación de cada conductor y los mínimos por día; NO escribe: se aplica con el lote.
 */
export interface PropuestaMes {
  propuestas: { funcionarioId: number; fecha: string; estado: string }[];
  resumen: {
    celdasALlenar: number;
    diasBajoMinimo: {
      fecha: string;
      turno: "DIA" | "NOCHE";
      hay: number;
      minimo: number;
    }[];
    avisos: { funcionarioId: number; fecha: string; mensaje: string }[];
    /** Claves de los parámetros que la propuesta necesitaría y no tienen valor. */
    parametrosSinConfigurar: string[];
  };
}
