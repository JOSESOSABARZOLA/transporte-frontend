/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: jornada.service.ts
 * Responsabilidad: Consultar la jornada del día para el rol que la pide.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * UN SOLO MÉTODO, Y ESO ES TODO LO QUE ESTA PANTALLA HACE CONTRA SU PROPIO ENDPOINT.
 *
 * No hay exportación —el PDF es de la Dirección, RN-44 y RN-47— ni cierre de cuadro. La
 * escritura de esta pantalla es el personal, y va por `operativo.service.ts`, que ya
 * tiene `asignarPersonal` y `retirarPersonal` con todas sus comprobaciones.
 *
 * EL ROL NO VIAJA EN LA PETICIÓN. Lo resuelve el servidor desde la sesión; mandarlo desde
 * aquí dejaría que cualquiera pidiera la jornada «como Director».
 */

import httpClient from "../api/httpClient.ts";
import type { Jornada } from "../interfaces/Jornada.ts";

/** `GET /jornada/:fecha`. Hoy solo lo admite DMIT Instrucción. */
const consultarJornada = async (fecha: string): Promise<Jornada> => {
  const { data } = await httpClient.get<Jornada>(`/jornada/${fecha}`);
  return data;
};

export const JornadaService = {
  consultarJornada,
};
