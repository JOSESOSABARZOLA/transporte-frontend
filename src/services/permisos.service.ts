/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de permisos (RBAC)
 * Archivo: permisos.service.ts
 * Responsabilidad: Consumir el catálogo de permisos y la matriz rol<->permiso.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 */

import httpClient from "../api/httpClient";

/** Un permiso atómico del catálogo. */
export interface Permiso {
  codigo: string;
  modulo: string;
  descripcion: string;
}

/** `GET /administracion/permisos`. El catálogo completo. */
const listarPermisos = async (): Promise<Permiso[]> => {
  const { data } = await httpClient.get<Permiso[]>("/administracion/permisos");
  return data;
};

/** `GET /administracion/roles/:rol/permisos`. Los permisos que hoy tiene un rol. */
const permisosDeRol = async (rol: string): Promise<string[]> => {
  const { data } = await httpClient.get<string[]>(
    `/administracion/roles/${rol}/permisos`,
  );
  return data;
};

/** `PUT /administracion/roles/:rol/permisos`. Reemplaza el conjunto; devuelve el resultante. */
const guardarPermisosDeRol = async (
  rol: string,
  permisos: string[],
): Promise<string[]> => {
  const { data } = await httpClient.put<string[]>(
    `/administracion/roles/${rol}/permisos`,
    { permisos },
  );
  return data;
};

export const PermisosService = {
  listarPermisos,
  permisosDeRol,
  guardarPermisosDeRol,
};
