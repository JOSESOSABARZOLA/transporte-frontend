/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Zonas de la ciudad
 * Archivo: zonasCiudad.service.ts
 * Responsabilidad: Las llamadas de la administración de las zonas de la ciudad (t_zonal).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-05
 *
 * Todas piden `catalogos:administrar`. La lectura de las zonas para personal, flota y cobertura
 * sigue en `CatalogoCuadroService.listarZonales` (`GET /zonales`), que solo pide sesión.
 */

import httpClient from "../api/httpClient";
import type { GuardarZonaCiudad, ZonaCiudad } from "../interfaces/ZonaCiudad.ts";

const RUTA = "/administracion/zonas";

const listar = async (): Promise<ZonaCiudad[]> => {
  const { data } = await httpClient.get<ZonaCiudad[]>(RUTA);
  return data;
};

const crear = async (datos: GuardarZonaCiudad): Promise<ZonaCiudad> => {
  const { data } = await httpClient.post<ZonaCiudad>(RUTA, datos);
  return data;
};

const actualizar = async (id: number, datos: Partial<GuardarZonaCiudad>): Promise<ZonaCiudad> => {
  const { data } = await httpClient.put<ZonaCiudad>(`${RUTA}/${id}`, datos);
  return data;
};

/** Baja lógica. 409 si algún formulario la tiene activa. */
const desactivar = async (id: number): Promise<ZonaCiudad> => {
  const { data } = await httpClient.delete<ZonaCiudad>(`${RUTA}/${id}`);
  return data;
};

const reactivar = async (id: number): Promise<ZonaCiudad> => {
  const { data } = await httpClient.post<ZonaCiudad>(`${RUTA}/${id}/reactivar`);
  return data;
};

/** Borrado definitivo, solo sin ningún uso. */
const eliminar = async (id: number): Promise<{ id: number; mensaje: string }> => {
  const { data } = await httpClient.delete<{ id: number; mensaje: string }>(
    `${RUTA}/${id}/permanente`,
  );
  return data;
};

export const ZonasCiudadService = {
  listar,
  crear,
  actualizar,
  desactivar,
  reactivar,
  eliminar,
};
