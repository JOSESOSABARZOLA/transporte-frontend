/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: Flota.ts
 * Responsabilidad: Declarar lo que se envía para dar de alta y mantener la flota.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * `Conductor` Y `Vehiculo` NO SE DECLARAN AQUÍ. Ya existen en `Transporte.ts` desde M-17,
 * donde se escribieron para la pantalla de la DAF, y **hasta hoy no las consumía nadie**.
 * Volver a declararlas habría dado dos definiciones del mismo registro que empiezan a
 * separarse en cuanto se corrige una. Este archivo solo añade lo que faltaba: **lo que se
 * envía**, que es distinto de lo que se recibe.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NINGUNO DE LOS DOS CONTRATOS DE EDICIÓN LLEVA `activo`, Y NO ES UN OLVIDO.
 * `ActualizarConductorDto` y `ActualizarVehiculoDto` del servidor tampoco lo llevan, así
 * que enviarlo produciría `400 CAMPOS_NO_PERMITIDOS`. La consecuencia es que **la baja de
 * un conductor o un vehículo no se puede deshacer desde la aplicación**, a diferencia de
 * la de un funcionario, cuyo contrato sí lo admite. La pantalla lo advierte antes de dar
 * de baja en lugar de ofrecer un botón que el servidor rechazaría.
 */

/** Cuerpo de `POST /administracion/conductores`. */
export interface CrearConductor {
  cedula: string;
  nombreCompleto: string;
  telefono?: string;
  licenciaTipo?: string;
  /**
   * El vehículo que este conductor lleva habitualmente.
   *
   * De aquí sale la placa que P-03 propone al elegirlo (RF-032), y **es la única vía por
   * la que la DAF llega a conocer un vehículo** (PV-33): uno que no sea habitual de nadie
   * no se puede asignar desde aquella pantalla. Por eso conviene asignarlo al dar de alta.
   */
  vehiculoHabitualId?: number;

  /**
   * Los tres del 2026-08-31, del levantamiento con la DAF.
   *
   * OMITIRLOS SIGNIFICA «NO CONSTA», y no es lo mismo que un valor por defecto: sin
   * `tipoContrato` la regla que impide conducir de noche a quien es de nombramiento **no
   * se aplica** a ese conductor. Enviar cadena vacía en lugar de omitirlos haría que el
   * servidor rechazara el enumerado.
   */
  sector?: "NORTE" | "SUR" | "CENTRO" | "VALLE";
  /** RN-DAF-04. Quien lo tiene se lleva el vehículo a casa y al día siguiente repite. */
  parqueaderoAutorizado?: boolean;
  tipoContrato?: "NOMBRAMIENTO" | "CONTRATO";
}

/**
 * Cuerpo de `PATCH /administracion/conductores/:id`.
 *
 * **La cédula no está**, y es deliberado: es la llave natural del conductor. Cambiarla no
 * sería corregir este registro, sería crear otro. Mismo criterio que el correo en P-11.
 *
 * `vehiculoHabitualId` se puede **cambiar pero no quitar**: el contrato del servidor lo
 * declara `@IsInt()` y rechaza `null`. Es una limitación heredada, no una decisión de
 * esta pantalla.
 */
export type ActualizarConductor = Omit<CrearConductor, "cedula">;

/** Cuerpo de `POST /administracion/vehiculos`. */
export interface CrearVehiculo {
  placa: string;
  descripcion?: string;
}

/**
 * Cuerpo de `PATCH /administracion/vehiculos/:id`.
 *
 * La placa **sí** se puede corregir, a diferencia de la cédula del conductor. El servidor
 * lo admite y tiene sentido: una placa mal digitada es un error de captura, y el vehículo
 * sigue siendo el mismo.
 */
export type ActualizarVehiculo = Partial<CrearVehiculo>;

/**
 * Respuesta de los dos `DELETE`. La baja es **lógica**.
 *
 * `operativosHistoricos` dice en cuántos operativos ya registrados sigue figurando, para
 * que el administrador vea que no está borrando nada.
 *
 * SE LLAMA ASÍ Y NO `usosHistoricos`, que es lo que decía `06_Manual_API.md` §11 hasta el
 * 2026-08-20. El manual estaba equivocado; el nombre bueno es el que devuelve el código.
 */
export interface BajaDeFlota<T> {
  registro: T;
  operativosHistoricos: number;
  /** Redactado por el servidor para el administrador. Se muestra tal cual (regla 7). */
  mensaje: string;
}

/**
 * Lo que devuelven `POST` y `PATCH` de **conductores**: solo dos campos.
 *
 * Los de vehículos devuelven el registro completo. La asimetría es del servidor, y por eso
 * la pantalla **relee la lista** tras cada escritura en lugar de fiarse de la respuesta:
 * es lo que ya hacen P-07 y P-11, y así el mismo código sirve para los dos paneles.
 */
export interface ConductorCreado {
  id: number;
  nombreCompleto: string;
}

/** Filtros de cada panel. Vacío significa «sin filtrar». */
export interface FiltrosFlota {
  busqueda?: string;
  /** `""` todos · `activos` · `inactivos`. */
  estado?: "" | "activos" | "inactivos";
}

/**
 * Zonal donde puede quedar un vehiculo al terminar la jornada. RN-DAF-03.
 *
 * EL CATALOGO NACE VACIO: la evidencia se contradice -cinco zonales en la hoja de agosto,
 * cuatro en la reunion- y es la pregunta Q-01. Lo carga el administrador cuando el negocio
 * confirme la lista; sembrarlo habria convertido una suposicion en dato maestro.
 */
export interface CrearUbicacion {
  nombre: string;
}

export interface ActualizarUbicacion {
  nombre?: string;
  activo?: boolean;
}
