/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: transporte.service.ts
 * Responsabilidad: Consumir la asignación logística y la capacidad de flota.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * `asignar` ENVÍA EXACTAMENTE DOS CAMPOS, porque el contrato tiene exactamente dos. Es
 * el segundo de los cuatro niveles con los que el backend acota la escritura de la DAF;
 * este servicio es el tercero desde este lado: no hay forma de que la pantalla de
 * transporte mande otra cosa, porque no existe el parámetro para hacerlo.
 */

import httpClient from "../api/httpClient";
import type {
  ActualizarTransporte,
  CapacidadFlota,
  ConductorDisponible,
  CrearMantenimiento,
  DeclararCapacidad,
  DeclararDestino,
  DestinoVehiculo,
  JornadaDeConductor,
  MantenimientoVehiculo,
  OperativoPendiente,
  ResultadoTransporte,
  UbicacionFlota,
  VehiculoDeLaFlota,
} from "../interfaces/Transporte";

/**
 * `GET /transporte/pendientes/:fecha`. Los nocturnos primero.
 *
 * Con `incluirResueltos` llegan también los ya asignados y los de propios medios: es la
 * bandeja desde la que se CORRIGE. Sin ella, un error de asignación solo se arreglaba con
 * una sentencia en la base (P-07).
 */
const consultarPendientes = async (
  fecha: string,
  incluirResueltos = false,
): Promise<OperativoPendiente[]> => {
  const { data } = await httpClient.get<OperativoPendiente[]>(
    `/transporte/pendientes/${fecha}`,
    incluirResueltos ? { params: { incluirResueltos: "true" } } : undefined,
  );
  return data;
};

/**
 * `GET /transporte/vehiculos?fecha=`. PV-33.
 *
 * Llega la flota ENTERA, incluidas las placas que hoy no se pueden usar. Hasta el
 * 2026-08-31 la pantalla componía la lista con los vehículos habituales de los conductores
 * libres, y un vehículo sin conductor habitual era inasignable e invisible.
 */
const consultarVehiculos = async (
  fecha: string,
): Promise<VehiculoDeLaFlota[]> => {
  const { data } = await httpClient.get<VehiculoDeLaFlota[]>(
    "/transporte/vehiculos",
    { params: { fecha } },
  );
  return data;
};

/**
 * `GET /transporte/conductores?fecha=`. RN-45.
 *
 * La lista llega **sin los ausentes**. Filtrarla aquí sería tarde: el servidor no ofrece
 * lo que después rechazaría.
 */
const consultarConductores = async (
  fecha: string,
): Promise<ConductorDisponible[]> => {
  const { data } = await httpClient.get<ConductorDisponible[]>(
    "/transporte/conductores",
    { params: { fecha } },
  );
  return data;
};

/** `PATCH /transporte/operativos/:id`. Dos campos, ni uno más. */
const asignar = async (
  operativoId: number,
  asignacion: ActualizarTransporte,
): Promise<ResultadoTransporte> => {
  const { data } = await httpClient.patch<ResultadoTransporte>(
    `/transporte/operativos/${operativoId}`,
    asignacion,
  );
  return data;
};

/**
 * `PATCH /transporte/operativos/:id/desasignar`. Sin cuerpo, igual que propios medios.
 *
 * Deshace las DOS decisiones —asignado y propios medios— y devuelve el operativo a
 * pendiente. Es la salida que no existía: hasta el 2026-08-31 una asignación equivocada
 * solo se corregía entrando en la base.
 */
const desasignar = async (operativoId: number): Promise<ResultadoTransporte> => {
  const { data } = await httpClient.patch<ResultadoTransporte>(
    `/transporte/operativos/${operativoId}/desasignar`,
  );
  return data;
};

/** `PATCH /transporte/operativos/:id/propios-medios`. Sin cuerpo: el acto es la decisión. */
const declararPropiosMedios = async (
  operativoId: number,
): Promise<ResultadoTransporte> => {
  const { data } = await httpClient.patch<ResultadoTransporte>(
    `/transporte/operativos/${operativoId}/propios-medios`,
  );
  return data;
};

/**
 * `GET /transporte/jornada-conductores/:fecha`. P-14.
 *
 * Es una VISTA: no asigna nada. La asignación sigue en P-03, con todas sus reglas.
 */
const consultarJornadaConductores = async (
  fecha: string,
): Promise<JornadaDeConductor[]> => {
  const { data } = await httpClient.get<JornadaDeConductor[]>(
    `/transporte/jornada-conductores/${fecha}`,
  );
  return data;
};

// ─────────────── Destino del vehículo · RN-DAF-03 ───────────────

/** `GET /transporte/destinos/:fecha`. Lo declarado ese día, con placa y zonal. */
const consultarDestinos = async (
  fecha: string,
): Promise<DestinoVehiculo[]> => {
  const { data } = await httpClient.get<DestinoVehiculo[]>(
    `/transporte/destinos/${fecha}`,
  );
  return data;
};

/**
 * `PUT /transporte/vehiculos/:id/destino/:fecha`.
 *
 * `PUT` porque declarar dos veces deja el mismo resultado: corregir es volver a declarar.
 * El servidor lo resuelve con un `upsert` sobre la clave (vehículo, fecha).
 */
const declararDestino = async (
  vehiculoId: number,
  fecha: string,
  destino: DeclararDestino,
): Promise<void> => {
  await httpClient.put(
    `/transporte/vehiculos/${vehiculoId}/destino/${fecha}`,
    destino,
  );
};

/** `GET /administracion/ubicaciones-flota`. El catálogo de zonales de reposo. */
const consultarUbicaciones = async (): Promise<UbicacionFlota[]> => {
  const { data } = await httpClient.get<UbicacionFlota[]>(
    "/administracion/ubicaciones-flota",
  );
  return data;
};

// ─────────────── Mantenimiento de la flota · P-16, RN-DAF-05 ───────────────

/** `GET /transporte/vehiculos/:id/mantenimiento`. De la parada más reciente hacia atrás. */
const listarMantenimientos = async (
  vehiculoId: number,
): Promise<MantenimientoVehiculo[]> => {
  const { data } = await httpClient.get<MantenimientoVehiculo[]>(
    `/transporte/vehiculos/${vehiculoId}/mantenimiento`,
  );
  return data;
};

/** `POST /transporte/vehiculos/:id/mantenimiento`. */
const registrarMantenimiento = async (
  vehiculoId: number,
  datos: CrearMantenimiento,
): Promise<MantenimientoVehiculo> => {
  const { data } = await httpClient.post<MantenimientoVehiculo>(
    `/transporte/vehiculos/${vehiculoId}/mantenimiento`,
    datos,
  );
  return data;
};

/** `DELETE /transporte/vehiculos/:id/mantenimiento/:mantenimientoId`. */
const retirarMantenimiento = async (
  vehiculoId: number,
  mantenimientoId: number,
): Promise<void> => {
  await httpClient.delete(
    `/transporte/vehiculos/${vehiculoId}/mantenimiento/${mantenimientoId}`,
  );
};

/** `GET /transporte/capacidad/:fecha`. El indicador de P-03 y de la cabecera de P-04. */
const consultarCapacidad = async (fecha: string): Promise<CapacidadFlota> => {
  const { data } = await httpClient.get<CapacidadFlota>(
    `/transporte/capacidad/${fecha}`,
  );
  return data;
};

/** `PUT /transporte/capacidad/:fecha`. Declarar dos veces deja el mismo resultado. */
const declararCapacidad = async (
  fecha: string,
  capacidad: DeclararCapacidad,
): Promise<CapacidadFlota> => {
  const { data } = await httpClient.put<CapacidadFlota>(
    `/transporte/capacidad/${fecha}`,
    capacidad,
  );
  return data;
};

export const TransporteService = {
  consultarPendientes,
  consultarConductores,
  consultarVehiculos,
  asignar,
  desasignar,
  declararPropiosMedios,
  consultarJornadaConductores,
  consultarDestinos,
  declararDestino,
  consultarUbicaciones,
  listarMantenimientos,
  registrarMantenimiento,
  retirarMantenimiento,
  consultarCapacidad,
  declararCapacidad,
};
