/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: Transporte.ts
 * Responsabilidad: Tipos de la flota, el mantenimiento y los propios medios de la DAF.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * La asignación clásica de dos campos (`ActualizarTransporte`, `PATCH /transporte/operativos/:id`) y
 * la bandeja heredada se retiraron el 2026-10-08 con «Planificar el día»: la DAF asigna por TRAMOS
 * (`Planificacion.ts`). La regla 3 del servidor —dos campos, ni uno más— sigue en su DTO; aquí ya
 * no hay pantalla que lo use.
 */

import type { EstadoTransporte } from "./Operativo";

/** Respuesta de `PATCH /transporte/operativos/:id/propios-medios`. */
export interface ResultadoTransporte {
  id: number;
  identificador: string;
  estadoTransporte: EstadoTransporte;
  conductor: { id: number; nombreCompleto: string } | null;
  vehiculo: { id: number; placa: string } | null;
  asignadoEn: string | null;
  alertaActiva: boolean;
}

/**
 * Una parada de taller. RN-DAF-05.
 *
 * **El motivo sí se muestra**, al contrario que en las ausencias del personal: allí puede
 * decir «cirugía programada» y es un dato de salud; aquí dice «cambio de frenos» y es lo
 * que permite estimar cuándo vuelve el vehículo.
 */
export interface MantenimientoVehiculo {
  id: number;
  vehiculoId: number;
  /** `AAAA-MM-DD`. Se compara como cadena, nunca se convierte a `Date` (regla 12). */
  desde: string;
  hasta: string;
  taller: string | null;
  /** `HH:MM`. Es el `08H00` de «CITA AMBACAR 08H00». */
  hora: string | null;
  motivo: string | null;
  /** Estado de la cita de taller (Fase 5, 2026-10-06). Las paradas antiguas llegan PROGRAMADO. */
  estado?: EstadoMantenimiento;
  /** Zonal del taller: destino de la TAREA «Llevar a taller». */
  zonalTallerId?: number | null;
}

/** PROGRAMADO → EN_TALLER → LISTO (LISTO es final; EN_TALLER puede volver a PROGRAMADO). */
export type EstadoMantenimiento = "PROGRAMADO" | "EN_TALLER" | "LISTO";

/** Cuerpo de `POST /transporte/vehiculos/:id/mantenimiento`. */
export interface CrearMantenimiento {
  desde: string;
  hasta: string;
  taller?: string;
  hora?: string;
  motivo?: string;
  /** Con `hora`, la cita genera la TAREA «Llevar a taller» hacia esta zonal (Fase 5). */
  zonalTallerId?: number | null;
}

export interface Conductor extends DatosDeBaja {
  id: number;
  cedula: string;
  nombreCompleto: string;
  telefono: string | null;
  licenciaTipo: string | null;
  /**
   * `descripcion` y `activo` llegan desde el 2026-10-14 (Flota y garajes): la tabla pone la
   * descripción bajo la placa, y un habitual dado de baja cuenta como «Sin vehículo».
   */
  vehiculoHabitual: {
    id: number;
    placa: string;
    descripcion?: string | null;
    activo?: boolean;
  } | null;
  activo: boolean;
  /**
   * Lo que le falta a la ficha (2026-10-14), calculado por el servidor y en este orden. Vacío =
   * completo. Alimenta el indicador «Conductores con datos incompletos» y sus distintivos.
   */
  faltantes?: FaltanteConductor[];
  /**
   * Los tres del 2026-08-31. `null` significa **no consta**, y cada regla lo respeta.
   */
  sector: "NORTE" | "SUR" | "CENTRO" | "VALLE" | null;
  parqueaderoAutorizado: boolean;
  /**
   * La JORNADA LABORAL (2026-10-23), que reemplaza al tipo de contrato: en qué días y horas trabaja.
   * `null` = sin jornada: no se le asigna transporte.
   */
  jornadaLaboralId: number | null;
  /**
   * Acta de parqueadero (Art. 8, 2026-10-06). Sin acta VIGENTE no se declara DOMICILIO como
   * guarda del vehículo. Fechas AAAA-MM-DD (regla 12). Opcionales en la respuesta (contratos viejos).
   */
  actaParqueaderoNumero?: string | null;
  actaParqueaderoDesde?: string | null;
  actaParqueaderoHasta?: string | null;
  /**
   * Patrón de rotación (2026-10-06), p. ej. «DDDDDLL». Lo sigue la propuesta del mes. NO cuenta
   * para «Incompleto»: sin él, el conductor se planifica igual.
   */
  patronRotacion?: string | null;
}

/** Zonal donde puede quedar un vehiculo. Catalogo del administrador. RN-DAF-03. */
export interface UbicacionFlota extends DatosDeBaja {
  id: number;
  nombre: string;
  activo: boolean;
  /** Garaje autorizado (Art. 8, 2026-10-06): Matriz, Eloy Alfaro, Calderón, Quitumbe, Los Chillos. */
  garajeAutorizado?: boolean;
  /** Zonal donde queda el garaje (para calcular el traslado al primer punto). */
  zonalId?: number | null;
  /**
   * El zonal asociado, con su nombre (2026-10-06). `null` = sin zonal: el garaje «Matriz» no
   * se asocia a ninguno por decisión del negocio, y sus traslados usan la regla «otro sector».
   */
  zonal?: { id: number; nombre: string } | null;
  /** `activo && garajeAutorizado` (2026-10-14): lo único que la pantalla llama «Vigente». */
  vigente?: boolean;
  /** Última vez que cada vehículo quedó aquí, de la más reciente a la más antigua. */
  usos?: UsoDeGaraje[];
}

/** Lo que el servidor señala como faltante en la ficha de un conductor (2026-10-14). */
export type FaltanteConductor =
  | "VEHICULO_HABITUAL"
  | "JORNADA_LABORAL"
  | "PATRON_ROTACION";

/** Un vehículo que quedó en un garaje, con la última fecha (AAAA-MM-DD). */
export interface UsoDeGaraje {
  vehiculoId: number;
  placa: string;
  ultimaFecha: string;
}

/**
 * El estado de los documentos de un vehículo (2026-10-14): el MÁS CRÍTICO de matrícula y SOAT.
 * Lo calcula el servidor con `DAF_DIAS_AVISO_VENCIMIENTO`; `dias` es negativo si venció.
 * INCOMPLETO (2026-10-15): falta exactamente una fecha y `documento` dice cuál; si la otra está en
 * alerta, gana la alerta (VENCIDO > POR_VENCER > INCOMPLETO > AL_DIA).
 */
export interface EstadoDocumentos {
  estado: "VENCIDO" | "POR_VENCER" | "INCOMPLETO" | "AL_DIA" | "SIN_FECHAS";
  documento: "MATRICULA" | "SOAT" | null;
  vence: string | null;
  dias: number | null;
}

/**
 * ACTIVO o DE_BAJA, y cuándo y quién lo dio de baja (2026-10-20, D1). El estado se deriva de
 * `activo` en el servidor; `bajaEn` (ISO) y `bajaPorNombre` van en `null` si está activo.
 */
export interface DatosDeBaja {
  estado?: "ACTIVO" | "DE_BAJA";
  bajaEn?: string | null;
  bajaPorNombre?: string | null;
}

export interface Vehiculo extends DatosDeBaja {
  id: number;
  placa: string;
  descripcion: string | null;
  activo: boolean;
  /** Ficha del vehículo (2026-10-06). Opcionales: contratos viejos no los traen. */
  tipo?: string | null;
  /** Plazas de pasajeros: decide si cabe el personal de un operativo. */
  asientos?: number | null;
  kilometraje?: number | null;
  /** AAAA-MM-DD (regla 12). */
  matriculaVencimiento?: string | null;
  soatVencimiento?: string | null;
  /**
   * Avisos de vencimiento que CALCULA EL SERVIDOR (versión consolidada, 2026-10-06), con el umbral
   * `DAF_DIAS_AVISO_VENCIMIENTO`. El navegador ya no cuenta días contra un 30 fijo (regla 2).
   */
  alertasVencimiento?: AlertaVencimiento[];
  /** El más crítico de los dos documentos (2026-10-14). Lo pinta la columna «Documentos». */
  documentos?: EstadoDocumentos;
}

/** Un documento del vehículo vencido o por vencer. `vence` es AAAA-MM-DD (regla 12). */
export interface AlertaVencimiento {
  documento: "SOAT" | "MATRICULA";
  vence: string;
  dias: number;
  estado: "VENCIDO" | "POR_VENCER";
}

