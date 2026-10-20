/**
 * App: Cuadro de Colores
 * Módulo: Pruebas
 * Feature: RBAC
 * Archivo: permisos.ts
 * Responsabilidad: Derivar los permisos de un rol como lo hace el servidor, para las pruebas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * ESPEJO de la semilla `t_rol_permiso` del backend (`matriz-permisos.ts`). En producción los
 * permisos llegan del servidor en `/auth/session`; aquí se reconstruyen para poder montar un
 * usuario de prueba con la misma unión que tendría de verdad.
 */

import type { RolDepartamental } from "../config/env";

/** Permiso -> roles que lo tienen (igual que la semilla del servidor). */
const PERMISO_ROLES: Record<string, RolDepartamental[]> = {
  "operativos:leer": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR", "DAF", "DIRECTOR"],
  "operativos:registrar": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR"],
  "operativos:editar": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR"],
  "operativos:retirar": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR"],
  "operativos:personal:gestionar": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR"],
  "operativos:adicional:crear": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR", "DIRECTOR"],
  "operativos:apoyo:solicitar": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR"],
  "operativos:apoyo:ver": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR", "DAF", "DIRECTOR", "ADMINISTRADOR_DMIP"],
  "operativos:apoyo:bandeja": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR", "DIRECTOR", "ADMINISTRADOR_DMIP"],
  "cuadro:abrir": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR"],
  "cuadro:cerrar-reabrir": ["DIRECTOR"],
  "transporte:pendientes:ver": ["DAF", "DIRECTOR"],
  "transporte:vehiculos:ver": ["DAF", "DIRECTOR", "ADMINISTRADOR_DAF"],
  "transporte:conductores:ver": ["DAF", "DIRECTOR"],
  "transporte:destinos:ver": ["DAF", "DIRECTOR"],
  "transporte:jornada:ver": ["DAF"],
  "transporte:asignar": ["DAF"],
  "transporte:destino:fijar": ["DAF"],
  "transporte:propios-medios": ["DAF"],
  "transporte:desasignar": ["DAF"],
  "flota:administrar": ["ADMINISTRADOR_DAF", "DAF", "ADMINISTRADOR"],
  "flota:mantenimiento": ["ADMINISTRADOR_DAF", "DAF", "ADMINISTRADOR"],
  // Ausencias de los conductores desde «Flota y garajes» (2026-10-16).
  "flota:ausencias": ["ADMINISTRADOR_DAF", "DAF", "ADMINISTRADOR"],
  "flota:capacidad:ver": ["DAF", "DIRECTOR"],
  "flota:capacidad:declarar": ["DAF", "ADMINISTRADOR_DMIP", "ADMINISTRADOR"],
  "matriz:ver": ["DIRECTOR"],
  "ordenes:gestionar": ["DIRECTOR"],
  "jornada:ver": ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR"],
  "personal:administrar": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR_DMIT", "ADMINISTRADOR"],
  "personal:directorio:ver": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR_DMIT", "ADMINISTRADOR"],
  "catalogos:administrar": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR"],
  "usuarios:administrar": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR"],
  "ventanas:administrar": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR"],
  "roles-auth:administrar": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR"],
  "roles:ver": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR"],
  "parametros:administrar": ["ADMINISTRADOR_DMIP", "ADMINISTRADOR", "ADMINISTRADOR_DMIT", "ADMINISTRADOR_DAF"],
  "permisos:administrar": ["ADMINISTRADOR"],
  // Versión consolidada de la DAF (2026-10-06): la carga inicial, solo el administrador general.
  "carga-inicial:administrar": ["ADMINISTRADOR"],
};

/** Los permisos efectivos (unión) de un conjunto de roles, como los daría el servidor. */
export const permisosDeRoles = (roles: readonly RolDepartamental[]): string[] => {
  const union = new Set<string>();
  for (const [permiso, suyos] of Object.entries(PERMISO_ROLES)) {
    if (suyos.some((rol) => roles.includes(rol))) union.add(permiso);
  }
  return [...union];
};
