/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: transporte.service.ts
 * Responsabilidad: Consumir los propios medios y el mantenimiento de la flota.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * 2026-10-08: con «Planificar el día» se retiraron la bandeja heredada y su asignación clásica
 * de dos campos (`PATCH /transporte/operativos/:id`), la jornada de los conductores (P-14), los
 * destinos sueltos, la capacidad declarada a mano y la preparación: la DAF asigna por TRAMOS
 * (`planificacion.service.ts`) y el estado del día llega en el resumen (`jornadaDaf.service.ts`).
 *
 * 2026-10-20: el mantenimiento se programa desde la pestaña Vehículos de Flota. La flota del día
 * (`GET /transporte/vehiculos`) y la semana (`GET /transporte/mantenimiento/semana`) los leía solo
 * la página «Mantenimiento de vehículos», que se retiró; la disponibilidad y las paradas de la
 * semana llegan juntas en `FlotaService.disponibilidad`.
 */

import httpClient from "../api/httpClient";
import type { TramoAfectadoPorParada } from "../interfaces/Flota";
import type {
  CrearMantenimiento,
  MantenimientoVehiculo,
  ResultadoTransporte,
} from "../interfaces/Transporte";

/** `PATCH /transporte/operativos/:id/propios-medios`. Sin cuerpo: el acto es la decisión. */
const declararPropiosMedios = async (
  operativoId: number,
): Promise<ResultadoTransporte> => {
  const { data } = await httpClient.patch<ResultadoTransporte>(
    `/transporte/operativos/${operativoId}/propios-medios`,
  );
  return data;
};

// ─────────────── Mantenimiento de la flota · RN-DAF-05 ───────────────

/** `GET /transporte/vehiculos/:id/mantenimiento`. De la parada más reciente hacia atrás. */
const listarMantenimientos = async (
  vehiculoId: number,
): Promise<MantenimientoVehiculo[]> => {
  const { data } = await httpClient.get<MantenimientoVehiculo[]>(
    `/transporte/vehiculos/${vehiculoId}/mantenimiento`,
  );
  return data;
};

/**
 * `GET /transporte/vehiculos/:id/mantenimiento/impacto?desde=&hasta=` (2026-10-20, D4): los
 * traslados ya asignados a la placa en el rango, para avisar ANTES de guardar. No cambia nada.
 */
const impactoMantenimiento = async (
  vehiculoId: number,
  desde: string,
  hasta: string,
): Promise<TramoAfectadoPorParada[]> => {
  const { data } = await httpClient.get<{ tramosAfectados: TramoAfectadoPorParada[] }>(
    `/transporte/vehiculos/${vehiculoId}/mantenimiento/impacto`,
    { params: { desde, hasta } },
  );
  return data.tramosAfectados;
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

export const TransporteService = {
  declararPropiosMedios,
  listarMantenimientos,
  impactoMantenimiento,
  registrarMantenimiento,
  retirarMantenimiento,
};
