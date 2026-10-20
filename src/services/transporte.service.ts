/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: transporte.service.ts
 * Responsabilidad: Consumir la flota que ve la DAF, los propios medios y el mantenimiento.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * 2026-10-08: con «Planificar el día» se retiraron la bandeja heredada y su asignación clásica
 * de dos campos (`PATCH /transporte/operativos/:id`), la jornada de los conductores (P-14), los
 * destinos sueltos, la capacidad declarada a mano y la preparación: la DAF asigna por TRAMOS
 * (`planificacion.service.ts`) y el estado del día llega en el resumen (`jornadaDaf.service.ts`).
 */

import httpClient from "../api/httpClient";
import type {
  CrearMantenimiento,
  MantenimientoVehiculo,
  ResultadoTransporte,
  SemanaMantenimiento,
  VehiculoDeLaFlota,
} from "../interfaces/Transporte";

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

/** `PATCH /transporte/operativos/:id/propios-medios`. Sin cuerpo: el acto es la decisión. */
const declararPropiosMedios = async (
  operativoId: number,
): Promise<ResultadoTransporte> => {
  const { data } = await httpClient.patch<ResultadoTransporte>(
    `/transporte/operativos/${operativoId}/propios-medios`,
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

/** `GET /transporte/mantenimiento/semana?desde=` (2026-10-06): 7 días de vehículos parados. */
const consultarSemanaMantenimiento = async (
  desde: string,
): Promise<SemanaMantenimiento[]> => {
  const { data } = await httpClient.get<SemanaMantenimiento[]>(
    "/transporte/mantenimiento/semana",
    { params: { desde } },
  );
  return data;
};

export const TransporteService = {
  consultarVehiculos,
  declararPropiosMedios,
  listarMantenimientos,
  registrarMantenimiento,
  retirarMantenimiento,
  consultarSemanaMantenimiento,
};
