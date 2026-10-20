/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: jornadaDaf.service.ts
 * Responsabilidad: Consumir el resumen de la jornada DAF, los candidatos por operativo, la
 *                  simulación de libres, los vehículos que salen, la emisión de hojas de ruta y
 *                  las horas libres del día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * SOLO POR `httpClient` (regla 8). Las asignaciones siguen por `PlanificacionService` (tramos,
 * optimizador, fin del día): aquí solo está lo que el flujo guiado añadió.
 */

import httpClient from "../api/httpClient";
import type {
  FiltrosHuecos,
  RespuestaCandidatos,
  RespuestaEmision,
  RespuestaHuecos,
  ResumenJornadaDaf,
  Simulacion,
  VehiculosJornada,
} from "../interfaces/JornadaDaf";

/** `GET /transporte/jornada-daf/:fecha`: todo el estado de la jornada en una llamada. */
const resumen = async (fecha: string): Promise<ResumenJornadaDaf> => {
  const { data } = await httpClient.get<ResumenJornadaDaf>(
    `/transporte/jornada-daf/${fecha}`,
  );
  return data;
};

/** `GET /transporte/candidatos/:operativoId`: conductores ordenados, con categoría y motivo. */
const candidatos = async (
  fecha: string,
  operativoId: number,
): Promise<RespuestaCandidatos> => {
  const { data } = await httpClient.get<RespuestaCandidatos>(
    `/transporte/candidatos/${operativoId}`,
    { params: { fecha } },
  );
  return data;
};

/** `POST /transporte/optimizar` con `simular: true`: no escribe nada. */
const simular = async (fecha: string, compartirCarro: boolean): Promise<Simulacion> => {
  const { data } = await httpClient.post<Simulacion>("/transporte/optimizar", {
    fecha,
    simular: true,
    compartirCarro,
  });
  return data;
};

const vehiculos = async (fecha: string): Promise<VehiculosJornada> => {
  const { data } = await httpClient.get<VehiculosJornada>(
    `/transporte/vehiculos-jornada/${fecha}`,
  );
  return data;
};

/** `saleIds` = los que SALEN; el resto de la flota activa queda como «no sale». */
const confirmarVehiculos = async (
  fecha: string,
  saleIds: number[],
): Promise<VehiculosJornada> => {
  const { data } = await httpClient.put<VehiculosJornada>(
    `/transporte/vehiculos-jornada/${fecha}`,
    { saleIds },
  );
  return data;
};

/** Sin `conductorId`, emite las hojas de todos los conductores con tramos. */
const emitir = async (fecha: string, conductorId?: number): Promise<RespuestaEmision> => {
  const { data } = await httpClient.post<RespuestaEmision>(
    `/transporte/hojas-ruta/${fecha}/emitir`,
    conductorId !== undefined ? { conductorId } : {},
  );
  return data;
};

/**
 * `GET /transporte/huecos/:fecha` (2026-10-14): las horas libres de los conductores y vehículos del
 * día. Es de lectura: no pasa por la ventana de carga. Solo viajan los filtros que se pasan.
 */
const huecos = async (fecha: string, filtros: FiltrosHuecos = {}): Promise<RespuestaHuecos> => {
  const { data } = await httpClient.get<RespuestaHuecos>(`/transporte/huecos/${fecha}`, {
    params: filtros,
  });
  return data;
};

export const JornadaDafService = {
  resumen,
  candidatos,
  simular,
  vehiculos,
  confirmarVehiculos,
  emitir,
  huecos,
};
