/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Trámites de Inspección
 * Archivo: tramitesInspeccion.service.ts
 * Responsabilidad: Consultar los trámites de Inspección de las personas que se están asignando.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * Los ids viajan separados por coma (`funcionarioId=4,9`): `axios` serializaría un arreglo como
 * `funcionarioId[]=…`, que el servidor no reconoce.
 */

import httpClient from "../api/httpClient.ts";
import type { ConsultaTramites } from "../interfaces/TramiteInspeccion.ts";

const consultar = async (
  fecha: string,
  funcionarioIds: readonly number[],
): Promise<ConsultaTramites> => {
  const { data } = await httpClient.get<ConsultaTramites>(
    "/inspeccion/tramites",
    { params: { fecha, funcionarioId: funcionarioIds.join(",") } },
  );
  return data;
};

export const TramitesInspeccionService = { consultar };
