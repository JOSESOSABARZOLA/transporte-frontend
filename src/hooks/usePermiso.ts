/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Autorización por permisos (RBAC)
 * Archivo: usePermiso.ts
 * Responsabilidad: Decir si el perfil tiene alguno de unos permisos atómicos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * El servidor sigue siendo la autoridad (cada petición se autoriza contra la matriz de
 * permisos). Esto solo evita mostrar u ofrecer lo que el servidor rechazaría con 403.
 */

import { useUser } from "./useUser";

/** ¿La lista de permisos del perfil incluye ALGUNO de los requeridos? (semántica OR). */
export const tienePermiso = (
  permisos: readonly string[],
  requeridos: readonly string[],
): boolean => requeridos.some((permiso) => permisos.includes(permiso));

/** Hook: ¿el usuario actual tiene alguno de estos permisos? */
export const usePermiso = (...requeridos: string[]): boolean => {
  const { user } = useUser();
  return user ? tienePermiso(user.permisos, requeridos) : false;
};
