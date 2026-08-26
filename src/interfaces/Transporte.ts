/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: Transporte.ts
 * Responsabilidad: Declarar la asignación logística de la DAF.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * `ActualizarTransporte` TIENE EXACTAMENTE DOS PROPIEDADES.
 *
 * Es el reflejo del DTO más sensible del backend, y la regla 3 de su CLAUDE.md: la DAF
 * escribe **dos campos** de los nueve formularios. El servidor rechaza cualquier otro con
 * `400 CAMPOS_NO_PERMITIDOS`, así que ampliarlo aquí solo produciría errores.
 *
 * **No se le agrega ninguna propiedad bajo ninguna circunstancia.**
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EstadoTransporte } from "./Operativo";

/** Cuerpo de `PATCH /transporte/operativos/:id`. Dos propiedades. */
export interface ActualizarTransporte {
  conductorId: number;
  vehiculoId: number;
}

/** Fila de `GET /transporte/pendientes/:fecha`. */
export interface OperativoPendiente {
  id: number;
  identificador: string;
  formularioNombre: string;
  formularioCodigo: string;
  colorFondo: string;
  horario: string;
  esNocturno: boolean;
  /** RN-43. Si es nocturno y lleva condicionante, el conductor es obligatorio. */
  requiereConductor: boolean;
  personasAsignadas: number;
  puntoEncuentro: string;
  zonales: string[];
  estadoTransporte: EstadoTransporte;
}

/** Respuesta de la asignación. */
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
 * Conductor ofrecido a la DAF. RN-45: la lista llega **ya filtrada** de ausencias.
 *
 * `vehiculoHabitual` es de donde la pantalla propone la placa al elegir conductor.
 */
export interface ConductorDisponible {
  id: number;
  nombreCompleto: string;
  licenciaTipo: string | null;
  vehiculoHabitual: { id: number; placa: string } | null;
}

export interface Conductor {
  id: number;
  cedula: string;
  nombreCompleto: string;
  telefono: string | null;
  licenciaTipo: string | null;
  vehiculoHabitual: { id: number; placa: string } | null;
  activo: boolean;
}

export interface Vehiculo {
  id: number;
  placa: string;
  descripcion: string | null;
  activo: boolean;
}

/** Comparación de un recurso contra lo declarado. RN-46. */
export interface HolguraFlota {
  declarados: number;
  requeridos: number;
  excedente: number;
  suficiente: boolean;
}

/** Respuesta de `GET /transporte/capacidad/:fecha`. */
export interface CapacidadFlota {
  fecha: string;
  /** `null` mientras la DAF no declare: no es lo mismo que declarar cero hábiles. */
  declarada: {
    vehiculosHabiles: number;
    conductoresHabiles: number;
    observacion: string | null;
    declaradoPor: number;
    declaradoEn: string;
  } | null;
  demanda: { vehiculos: number; conductores: number };
  vehiculos: HolguraFlota | null;
  conductores: HolguraFlota | null;
  hayAdvertencia: boolean;
  /** VAL-24. Se muestra tal cual y **no impide nada**. */
  advertencia: string | null;
}

export interface DeclararCapacidad {
  vehiculosHabiles: number;
  conductoresHabiles: number;
  observacion?: string;
}
