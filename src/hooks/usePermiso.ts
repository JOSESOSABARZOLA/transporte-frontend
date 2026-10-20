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
/**
 * ¿Tiene ALGUNO de los roles exigidos? Sin roles exigidos, sí (la mayoría de las pantallas solo
 * piden permiso). EXCEPCIÓN DELIBERADA A LA REGLA 4 (2026-10-05): Órdenes de servicio exige,
 * además del permiso, el ROL DIRECTOR —el documento lo firma el Director, igual que en el servidor
 * (F21)—, para que conceder el permiso a otro rol no le abra un módulo que el servidor le niega.
 */
export const tieneRol = (
  rolCodes: readonly string[],
  requeridos: readonly string[] | undefined,
): boolean =>
  !requeridos ||
  requeridos.length === 0 ||
  requeridos.some((rol) => rolCodes.includes(rol));

export const usePermiso = (...requeridos: string[]): boolean => {
  const { user } = useUser();
  return user ? tienePermiso(user.permisos, requeridos) : false;
};

/** Hook: ¿el usuario actual tiene alguno de estos roles? Sin roles exigidos, sí (ver `tieneRol`). */
export const useTieneRol = (requeridos: readonly string[] | undefined): boolean => {
  const { user } = useUser();
  return user ? tieneRol(user.rolCodes, requeridos) : false;
};
