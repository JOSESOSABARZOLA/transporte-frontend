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
  DeclararCapacidad,
  OperativoPendiente,
  ResultadoTransporte,
} from "../interfaces/Transporte";

/** `GET /transporte/pendientes/:fecha`. Los nocturnos primero. */
const consultarPendientes = async (
  fecha: string,
): Promise<OperativoPendiente[]> => {
  const { data } = await httpClient.get<OperativoPendiente[]>(
    `/transporte/pendientes/${fecha}`,
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

/** `PATCH /transporte/operativos/:id/propios-medios`. Sin cuerpo: el acto es la decisión. */
const declararPropiosMedios = async (
  operativoId: number,
): Promise<ResultadoTransporte> => {
  const { data } = await httpClient.patch<ResultadoTransporte>(
    `/transporte/operativos/${operativoId}/propios-medios`,
  );
  return data;
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
  asignar,
  declararPropiosMedios,
  consultarCapacidad,
  declararCapacidad,
};
