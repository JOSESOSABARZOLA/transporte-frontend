/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Asignación de transporte (línea de tiempo por conductor)
 * Archivo: Planificacion.ts
 * Responsabilidad: Tipos de la planificación por tramos, el optimizador, el fin del día y la
 *                  operación diaria del vehículo (Fases 4 y 5).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Son el espejo de los contratos del servidor (`/transporte/planificacion`, `/evaluar`,
 * `/tramos/*`, `/optimizar*`, `/priorizacion`, `/fin-del-dia`, `/movilizacion`, `/checklist`,
 * `/kilometraje`, `/vales`). Las horas viajan «HH:MM»; las franjas, en MINUTOS sobre la línea que
 * empieza en `inicioJornada` (05H00): el navegador no recalcula los parámetros (regla 2).
 */

import type { TipoTransporte } from "./Operativo.ts";

export type TipoTramo = "DEJAR" | "RETIRAR" | "COMPLETO" | "TAREA";
export type TurnoConductor = "DIA" | "NOCHE" | "ECU_NOCHE" | "LIBRE" | "ADMINISTRATIVO";

/** Minutos sobre la línea de la jornada (0 = `inicioJornada`). `fin` puede pasar de 1440. */
export interface FranjaLinea {
  inicio: number;
  fin: number;
}

export interface ZonalCorta {
  id: number;
  nombre: string;
  sector: string | null;
}

export interface OperativoPlanificado {
  id: number;
  identificador: string;
  formulario: string;
  horaInicio: string;
  horaFin: string;
  tipoTransporte: TipoTransporte;
  esMacrooperativo: boolean;
  /**
   * ALV-07 (2026-10-07): el registro cambió el tipo de transporte con la asignación hecha y esta se
   * liberó. La DAF lo ve como «Transporte liberado» hasta volver a asignarlo.
   */
  transporteLiberado?: boolean;
  estadoTransporte: string;
  /**
   * Departamento que lo registró, en palabras («Inspección · Unidad de Operativos»). Desde la
   * versión consolidada (2026-10-06) el servidor lo envía legible: es lo que se pinta, nunca el código.
   */
  departamento: string;
  /** El código del rol que lo registró (para decidir, no para mostrar). */
  departamentoCodigo?: string;
  zonal: ZonalCorta | null;
  funcionarios: { id: number; nombre: string }[];
  bloque: number | null;
}

export interface BloquePlanificado {
  operativoIds: number[];
  funcionarioIds: number[];
  enCadena: boolean;
}

export interface TramoPlanificado {
  id: number;
  operativoId: number | null;
  identificador: string | null;
  tipo: TipoTramo;
  horaInicio: string;
  horaFin: string;
  cruzaMedianoche: boolean;
  conductorId: number | null;
  conductor: string | null;
  vehiculoId: number | null;
  placa: string | null;
  zonalOrigen: ZonalCorta | null;
  zonalDestino: ZonalCorta | null;
  compartidoConTramoId: number | null;
  /** Compartir unidad (2026-10-19): el identificador del anfitrión, si viaja en otra unidad. */
  compartidoCon?: string | null;
  /**
   * Solo de la interfaz: los operativos que viajan en la unidad de ESTE tramo, fundidos en él por
   * `fundirCompartidos` para que la línea de tiempo pinte UN viaje y no dos bloques encimados.
   */
  invitados?: string[];
  /**
   * Solo de la interfaz (2026-10-20): con un «completo» en el grupo la barra abarca todo el día, y
   * aquí van los traslados que la unidad hace dentro de ella (dejar, retirar), para marcarlos.
   */
  marcas?: { identificador: string | null; tipo: string; horaInicio: string; horaFin: string }[];
  descripcion: string | null;
  mantenimientoId?: number | null;
}

export interface ConductorPlanificado {
  id: number;
  nombre: string;
  sector: string | null;
  tipoContrato: string | null;
  parqueaderoAutorizado: boolean;
  actaVigente: boolean;
  turno: TurnoConductor | null;
  activado: boolean;
  ausente: boolean;
  /** Minuto de HOY (línea 05H00) en que terminó su último tramo de ayer; > 0 = vino de noche. */
  ultimoFinAyer: number | null;
  vehiculoHabitualId: number | null;
}

export interface VehiculoPlanificado {
  id: number;
  placa: string;
  tipo?: string | null;
  asientos: number | null;
  enTaller: boolean;
  amaneceEn: { zonalId: number | null; sector: string | null } | null;
  llevadoPor?: number | null;
  avisoCombustible?: boolean;
}

export interface Planificacion {
  fecha: string;
  inicioJornada: string;
  /**
   * Franjas en MINUTOS DESDE `inicioJornada` (la misma escala que `minutoEnLinea`), ya convertidas
   * por el servidor: el navegador las dibuja tal cual, sin volver a restar el inicio.
   */
  ventanaNombramiento?: FranjaLinea;
  ventanasTurno?: { DIA: FranjaLinea; NOCHE: FranjaLinea; ECU_NOCHE: FranjaLinea };
  operativos: OperativoPlanificado[];
  bloques: BloquePlanificado[];
  tramos: TramoPlanificado[];
  conductores: ConductorPlanificado[];
  vehiculos: VehiculoPlanificado[];
}

export interface PropuestaOptimizacion {
  estrategia: string;
  cubiertos: number;
  total: number;
  avisos: number;
  asignaciones: {
    tramoIds: number[];
    operativoIds: number[];
    identificadores: string[];
    conductorId: number;
    conductor: string;
    vehiculoId: number | null;
    placa: string | null;
    avisos: string[];
  }[];
  activaciones: { conductorId: number; motivo: string; conductor: string }[];
  compartidos: { tramoId: number; compartidoConTramoId: number }[];
  sinRecurso: {
    operativoId: number | null;
    identificador: string | null;
    tramoIds: number[];
    motivo: string;
  }[];
}

export interface ResultadoConfirmacion {
  aplicadas: number;
  omitidas: { tramoIds: number[]; conductorId: number; motivo: string }[];
  activados: number[];
  compartidos: number;
  compartidosOmitidos: { tramoId: number; motivo: string }[];
  /** Correlación de la traza de esta confirmación en el historial (2026-10-14). */
  correlacionId: string;
}

export interface ResultadoPriorizacion {
  solicitudId: number;
  creada: boolean;
  rolRequerido: string;
  estado: string;
  observacion: string | null;
}

export type TipoGuarda = "GARAJE" | "DOMICILIO" | "TALLER";

export interface GuardaFinal {
  vehiculoId: number;
  tipo: TipoGuarda;
  ubicacionId: number | null;
  conductorId?: number | null;
  observacion?: string | null;
  /** Obligatorio en DOMICILIO (parqueadero autorizado, Art. 8): se compara con el acta vigente. */
  actaNumero?: string | null;
}

export interface ResultadoFinDelDia {
  guardadas: number;
  errores: { vehiculoId: number; motivo: string }[];
}

export interface ChecklistVehiculo {
  fecha: string;
  vehiculoId: number;
  conductorId: number;
  items: Record<string, boolean>;
  observacion?: string;
  kilometrajeSalida?: number;
}
