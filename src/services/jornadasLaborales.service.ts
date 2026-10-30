/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: jornadasLaborales.service.ts
 * Responsabilidad: Las llamadas del catálogo de jornadas laborales.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 *
 * NO SE CACHEA AQUÍ SINO EN `useJornadasLaborales`, como el catálogo de roles: este archivo solo
 * traduce las llamadas. Leer pide sesión; crear, editar y desactivar, el permiso de parámetros.
 */

import httpClient from "../api/httpClient";
import type { GuardarJornadaLaboral, JornadaLaboral } from "../interfaces/JornadaLaboral.ts";

const RUTA = "/administracion/jornadas-laborales";

const listar = async (): Promise<JornadaLaboral[]> => {
  const { data } = await httpClient.get<JornadaLaboral[]>(RUTA);
  return data;
};

const crear = async (datos: GuardarJornadaLaboral): Promise<JornadaLaboral> => {
  const { data } = await httpClient.post<JornadaLaboral>(RUTA, datos);
  return data;
};

const actualizar = async (id: number, datos: GuardarJornadaLaboral): Promise<JornadaLaboral> => {
  const { data } = await httpClient.put<JornadaLaboral>(`${RUTA}/${id}`, datos);
  return data;
};

const cambiarActivo = async (id: number, activo: boolean): Promise<JornadaLaboral> => {
  const { data } = await httpClient.patch<JornadaLaboral>(`${RUTA}/${id}/activo`, { activo });
  return data;
};

export const JornadasLaboralesService = { listar, crear, actualizar, cambiarActivo };
