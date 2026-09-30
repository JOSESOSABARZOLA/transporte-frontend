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
import type { NivelFatiga } from "./Personal";

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
  /**
   * Semáforo de carga del conductor (FRMS / ISO 39001+45001, 2026-09-24). **Advisory**: da
   * visibilidad de cuánto lleva ese día/período para repartir de forma pareja; NO lo saca del
   * desplegable ni bloquea (la fatiga que impide conducir la comprueba el servidor al asignar).
   * Opcional: solo llega si el servidor lo calculó.
   */
  nivelCarga?: NivelFatiga;
}

/**
 * Fila de `GET /transporte/vehiculos?fecha=`. PV-33, cerrado el 2026-08-31.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO LLEGA FILTRADA, Y ES LO CONTRARIO DE `ConductorDisponible`.
 *
 * Los conductores ausentes se excluyen en el servidor (RN-45). Las placas no utilizables
 * **sí vienen**, con `utilizable` en falso y `motivo` escrito para la DAF: una placa en el
 * taller es justo la que ella esperaba usar, y saber hasta cuándo lo está es lo que le
 * permite replanificar. Es el criterio de la regla 14: quien no puede ser convocado se
 * muestra, no se oculta.
 *
 * **No las filtre aquí.** Se pintan deshabilitadas y con su motivo al lado.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export interface VehiculoDeLaFlota {
  id: number;
  placa: string;
  descripcion: string | null;
  utilizable: boolean;
  /** Por qué no se puede usar hoy. `null` cuando sí se puede. */
  motivo: string | null;
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
}

/** Cuerpo de `POST /transporte/vehiculos/:id/mantenimiento`. */
export interface CrearMantenimiento {
  desde: string;
  hasta: string;
  taller?: string;
  hora?: string;
  motivo?: string;
}

export interface Conductor {
  id: number;
  cedula: string;
  nombreCompleto: string;
  telefono: string | null;
  licenciaTipo: string | null;
  vehiculoHabitual: { id: number; placa: string } | null;
  activo: boolean;
  /**
   * Los tres del 2026-08-31. `null` significa **no consta**, y cada regla lo respeta: sin
   * contrato registrado, la que impide conducir de noche NO se aplica a ese conductor.
   */
  sector: "NORTE" | "SUR" | "CENTRO" | "VALLE" | null;
  parqueaderoAutorizado: boolean;
  tipoContrato: "NOMBRAMIENTO" | "CONTRATO" | null;
}

/** Zonal donde puede quedar un vehiculo. Catalogo del administrador. RN-DAF-03. */
export interface UbicacionFlota {
  id: number;
  nombre: string;
  activo: boolean;
}

/**
 * Donde queda un vehiculo al terminar la jornada. RN-DAF-03.
 *
 * ES DEL VEHICULO Y DEL DIA, no del operativo: en la hoja de la DAF la coordinacion se
 * escribe una vez por turno, y un conductor encadena varios operativos dentro de el.
 */
export interface DestinoVehiculo {
  vehiculoId: number;
  placa: string;
  fecha: string;
  ubicacion: { id: number; nombre: string } | null;
  /** Se lo lleva el conductor a casa. Excluyente con `ubicacion`. */
  domicilio: boolean;
  observacion: string | null;
}

/** Cuerpo de `PUT /transporte/vehiculos/:id/destino/:fecha`. */
export interface DeclararDestino {
  ubicacionId?: number | null;
  domicilio?: boolean;
  observacion?: string;
}

/** Un operativo dentro de la jornada de un conductor. P-14. */
export interface TramoDeJornada {
  identificador: string;
  horario: string;
  horaInicio: string;
  horaFin: string;
  esNocturno: boolean;
  placa: string | null;
  punto: string;
}

/**
 * La jornada de un conductor ese dia. P-14.
 *
 * ES EL HALLAZGO CENTRAL DEL LEVANTAMIENTO: el sistema modelaba un operativo con un
 * conductor, y el 38 por ciento de las asignaciones reales encadenan mas de uno.
 *
 * `disponible` en falso NO significa ocultar: el tablero muestra a los ausentes marcados,
 * porque saber que cinco conductores estan de vacaciones es lo que explica por que no
 * alcanza la flota.
 */
export interface JornadaDeConductor {
  conductorId: number;
  nombreCompleto: string;
  sector: "NORTE" | "SUR" | "CENTRO" | "VALLE" | null;
  parqueaderoAutorizado: boolean;
  tipoContrato: "NOMBRAMIENTO" | "CONTRATO" | null;
  tramos: TramoDeJornada[];
  horasAcumuladas: number;
  disponible: boolean;
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
