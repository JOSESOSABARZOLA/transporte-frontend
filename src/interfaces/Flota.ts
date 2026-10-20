/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: Flota.ts
 * Responsabilidad: Declarar lo que se envía para mantener la flota y lo que devuelven el resumen,
 *                  la baja y el aviso previo a la baja.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * `Conductor`, `Vehiculo` Y `UbicacionFlota` NO SE DECLARAN AQUÍ. Viven en `Transporte.ts`
 * desde M-17; volver a declararlas daría dos definiciones del mismo registro que empiezan a
 * separarse en cuanto se corrige una. Este archivo añade **lo que se envía**, que es distinto
 * de lo que se recibe, y las respuestas propias de «Flota y garajes».
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA BAJA SE DESHACE DESDE EL 2026-10-14. Hasta esa fecha los contratos de edición no admitían
 * `activo` y una baja por error solo se corregía en la base. Ahora hay tres rutas `…/reactivar`
 * sin cuerpo; los contratos de edición siguen sin `activo`, a propósito. Contrato:
 * `transporte-backend/docs/CONTRATO-flota-y-garajes.md`.
 */

import type { EstadoDisponibilidad, MomentoAusencia } from "./Personal.ts";

/** Cuerpo de `POST /administracion/conductores`. */
export interface CrearConductor {
  cedula: string;
  nombreCompleto: string;
  telefono?: string;
  licenciaTipo?: string;
  /**
   * El vehículo que este conductor lleva habitualmente. De aquí sale la placa que P-03 propone al
   * elegirlo (RF-032). Un vehículo que no sea habitual de nadie sí se puede asignar desde PV-33,
   * pero no se propone automáticamente.
   */
  vehiculoHabitualId?: number;
  /**
   * OMITIRLOS SIGNIFICA «NO CONSTA», y no es lo mismo que un valor por defecto: sin
   * `tipoContrato` la regla que impide conducir de noche a quien es de nombramiento **no
   * se aplica** a ese conductor.
   */
  sector?: "NORTE" | "SUR" | "CENTRO" | "VALLE";
  /** RN-DAF-04. Quien lo tiene se lleva el vehículo a casa y al día siguiente repite. */
  parqueaderoAutorizado?: boolean;
  tipoContrato?: "NOMBRAMIENTO" | "OCASIONAL";
  /** Acta de parqueadero (Art. 8): obligatoria si hay parqueadero autorizado. AAAA-MM-DD. */
  actaParqueaderoNumero?: string | null;
  actaParqueaderoDesde?: string | null;
  actaParqueaderoHasta?: string | null;
  /** De 2 a 14 letras D, N, E, L, A. `null` lo quita. */
  patronRotacion?: string | null;
}

/**
 * Cuerpo de `PATCH /administracion/conductores/:id`. **La cédula no está**: es la llave natural
 * del conductor. `vehiculoHabitualId` se puede cambiar pero no quitar (el servidor rechaza `null`).
 */
export type ActualizarConductor = Omit<CrearConductor, "cedula">;

/** Cuerpo de `POST /administracion/vehiculos`. */
export interface CrearVehiculo {
  /** AAA-999 o AAA-9999 (2026-10-14), exigido solo al crear o al cambiarla. */
  placa: string;
  descripcion?: string;
  /** Ficha (2026-10-06). `null` borra el dato al editar. */
  tipo?: string | null;
  asientos?: number | null;
  kilometraje?: number | null;
  matriculaVencimiento?: string | null;
  soatVencimiento?: string | null;
}

/** Cuerpo de `PATCH /administracion/vehiculos/:id`. La placa sí se corrige. */
export type ActualizarVehiculo = Partial<CrearVehiculo>;

/** Un conductor nombrado en la baja o en su aviso previo. */
export interface ConductorNombrado {
  id: number;
  nombreCompleto: string;
}

/** Respuesta de los dos `DELETE`. La baja es **lógica**. */
export interface BajaDeFlota<T> {
  registro: T;
  operativosHistoricos: number;
  /** Redactado por el servidor. Se muestra tal cual (regla 7). */
  mensaje: string;
  /** Quiénes quedaron sin vehículo habitual (D3). Vacío en la baja de un conductor. */
  conductoresSinVehiculo?: ConductorNombrado[];
}

/** La primera asignación vigente que impide la baja. */
export interface AsignacionVigente {
  fecha: string;
  horaInicio: string;
  identificador: string;
}

/** `GET …/:id/impacto-baja`: lo que pasaría al dar de baja, para avisarlo antes. */
export interface ImpactoBaja {
  /** Mayor que cero ⇒ el `DELETE` responderá 409 `RECURSO_CON_ASIGNACION`. */
  asignacionesVigentes: number;
  primeraAsignacion: AsignacionVigente | null;
  /** Conductores activos que quedarían sin vehículo habitual. Vacío para un conductor. */
  conductoresHabituales: ConductorNombrado[];
}

/** Lo que devuelven `POST`/`PATCH` de conductores: solo dos campos. La pantalla relee. */
export interface ConductorCreado {
  id: number;
  nombreCompleto: string;
}

/** `GET /administracion/flota/resumen`: los cuatro indicadores y la anticipación del aviso. */
export interface ResumenFlota {
  vehiculos: {
    activos: number;
    deBaja: number;
    /** Vencidos o por vencer (VENCIDO + POR_VENCER). */
    documentosPorVencer: number;
    /**
     * Activos con fechas faltantes: sin ninguna (SIN_FECHAS) o con una sola (INCOMPLETO, F1).
     * No entran en el anterior.
     */
    sinFechas: number;
    sinConductorHabitual: number;
  };
  conductores: { activos: number; deBaja: number; incompletos: number };
  garajes: { vigentes: number; deBaja: number };
  /** `DAF_DIAS_AVISO_VENCIMIENTO`. */
  diasAviso: number;
  /** `DAF_KM_MAXIMO`: el tope del kilometraje, para avisar antes de guardar. */
  kmMaximo: number;
}

/** Cuerpo de `POST /administracion/ubicaciones-flota`. El garaje nace autorizado. */
export interface CrearUbicacion {
  nombre: string;
  zonalId?: number | null;
}

/** Cuerpo de `PATCH /administracion/ubicaciones-flota/:id`. La baja tiene su propia ruta. */
export interface ActualizarUbicacion {
  nombre?: string;
  zonalId?: number | null;
}

// ─────────────── Ausencias de los conductores (2026-10-16) ───────────────
// Contrato: transporte-backend/docs/CONTRATO-ausencias-conductor.md. Misma forma que las del
// personal (`Disponibilidad`), con `conductorId` en lugar de `funcionarioId`.

/** Un periodo de ausencia de un conductor, con su motivo (`GET /administracion/conductores/:id/ausencias`). */
export interface AusenciaConductor {
  id: number;
  conductorId: number;
  estado: EstadoDisponibilidad;
  desde: string;
  hasta: string;
  /** Puede describir una condición de salud: solo se ve en el cajón de ausencias. */
  motivo: string | null;
  registradoPor: number;
  momento: MomentoAusencia;
}

/**
 * `GET /administracion/conductores/ausencias?desde=`: las EN CURSO y PRÓXIMAS de toda la flota, en
 * UNA consulta y sin motivo. Alimenta el distintivo de la columna «Estado».
 */
export interface AusenciaDeLaFlota {
  id: number;
  conductorId: number;
  estado: EstadoDisponibilidad;
  desde: string;
  hasta: string;
  momento: MomentoAusencia;
}

/** Un tramo ya asignado al conductor dentro del rango de la ausencia: la ausencia no lo retira. */
export interface TramoAfectado {
  operativoId: number;
  identificador: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

/** Respuesta del `POST`: la ausencia registrada y los tramos que quedan por reasignar (A5). */
export interface AusenciaConductorRegistrada extends AusenciaConductor {
  tramosAfectados: TramoAfectado[];
}
