/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogo de roles
 * Archivo: catalogoRoles.service.ts
 * Responsabilidad: Pedir al servidor qué roles existen.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-01
 *
 * NO SE CACHEA AQUÍ SINO EN `useCatalogoRoles`. Este archivo traduce una llamada; decidir
 * cuántas veces se hace es de quien la consume, y ahí está escrito por qué se puede.
 */

import httpClient from "../api/httpClient";
import type { RolDelCatalogo } from "../interfaces/CatalogoRoles.ts";

const consultar = async (): Promise<RolDelCatalogo[]> => {
  const { data } = await httpClient.get<RolDelCatalogo[]>(
    "/administracion/roles",
  );
  return data;
};

export const CatalogoRolesService = { consultar };
