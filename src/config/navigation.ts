/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Navigation
 * Archivo: navigation.ts
 * Responsabilidad: Definir la estructura del menú lateral del módulo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 *
 * RBAC (2026-09-16): cada ítem se ofrece por PERMISO (`requiredPermissions`), no por rol
 * fijo. Coincide con los permisos de la ruta en `routes.tsx`: menú y ruta deben decir lo
 * mismo, o quien ve la entrada y la abre recibe un 403.
 */

import type { NombreIcono } from "../components/common/Iconos.tsx";

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  /** Tipado, no cadena: una errata la dice el compilador (regla 13). */
  icon?: NombreIcono;
  children?: NavigationItem[];
  /** Permisos que abren el ítem. Si no se define, lo ven todos. Basta tener UNO. */
  requiredPermissions?: string[];
  /**
   * Roles exigidos ADEMÁS del permiso (basta uno). Debe coincidir con `ROLES_REQUERIDOS` de la
   * ruta (hoy solo Órdenes de servicio → DIRECTOR; excepción deliberada a la regla 4).
   */
  requiredRoles?: string[];
  defaultOpen?: boolean;
};

/**
 * PER-07: los ítems no autorizados se muestran atenuados y bloqueados, no ocultos,
 * para que el usuario comprenda que existen y no le corresponden.
 * Ver docs/FASE5-diseno-interfaz.md §3.2.
 */
export const shellNavigationItems: NavigationItem[] = [
  {
    id: "cuadro",
    label: "Cuadro de Colores",
    path: "cuadro",
    icon: "cuadro",
    defaultOpen: true,
    children: [
      {
        id: "cuadro-registro",
        label: "Registro de operativo",
        path: "cuadro/registro",
        icon: "registro",
        requiredPermissions: ["operativos:registrar"],
      },
      {
        id: "cuadro-mis-operativos",
        label: "Mis operativos",
        path: "cuadro/mis-operativos",
        icon: "misOperativos",
        requiredPermissions: ["operativos:registrar"],
      },
      {
        id: "cuadro-jornada",
        label: "Jornada del Día",
        path: "cuadro/jornada",
        icon: "jornada",
        requiredPermissions: ["jornada:ver"],
      },
      {
        id: "cuadro-transporte",
        label: "Asignación de transporte",
        path: "cuadro/transporte",
        icon: "transporte",
        requiredPermissions: ["transporte:asignar"],
      },
      {
        id: "cuadro-jornada-conductores",
        label: "Jornada de los conductores",
        path: "cuadro/jornada-conductores",
        icon: "jornadaConductores",
        requiredPermissions: ["transporte:jornada:ver"],
      },
      {
        id: "cuadro-capacidad",
        label: "Capacidad de flota",
        path: "cuadro/capacidad",
        icon: "capacidad",
        // Pantalla operativa solo de la DAF (ver la nota en routes.tsx): permiso solo-DAF.
        requiredPermissions: ["transporte:asignar"],
      },
      {
        id: "cuadro-matriz",
        label: "Matriz Consolidada",
        path: "cuadro/matriz",
        icon: "matriz",
        requiredPermissions: ["matriz:ver"],
      },
      {
        id: "cuadro-ordenes",
        label: "Órdenes de servicio",
        path: "cuadro/ordenes",
        icon: "ordenes",
        requiredPermissions: ["ordenes:gestionar"],
        requiredRoles: ["DIRECTOR"],
      },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    path: "administracion",
    icon: "administracion",
    defaultOpen: false,
    // El grupo se habilita por sus hijos (grupoUtil): si alguno es alcanzable, se muestra.
    children: [
      {
        id: "administracion-personal",
        label: "Personal y disponibilidad",
        path: "administracion/personal",
        icon: "personal",
        // Quién entra lo dice el permiso; qué ve cada uno lo acota el servidor por dirección.
        requiredPermissions: ["personal:administrar"],
      },
      {
        id: "administracion-catalogos",
        label: "Catálogos del cuadro",
        path: "administracion/catalogos-cuadro",
        icon: "catalogos",
        requiredPermissions: ["catalogos:administrar"],
      },
      {
        id: "administracion-formularios",
        label: "Formularios del cuadro",
        path: "administracion/formularios-cuadro",
        icon: "formularios",
        requiredPermissions: ["catalogos:administrar"],
      },
      {
        id: "administracion-ventanas",
        label: "Ventanas y parámetros",
        path: "administracion/ventanas",
        icon: "ventanas",
        // El DMIT entra por los parámetros de turno; la administración general por las ventanas.
        requiredPermissions: ["ventanas:administrar", "parametros:administrar"],
      },
      {
        id: "administracion-roles-auth",
        label: "Roles de Auth central",
        path: "administracion/roles-auth",
        icon: "rolesAuth",
        requiredPermissions: ["roles-auth:administrar"],
      },
      {
        id: "administracion-usuarios",
        label: "Cuentas del cuadro",
        path: "administracion/usuarios",
        icon: "cuentas",
        requiredPermissions: ["usuarios:administrar"],
      },
      {
        id: "administracion-permisos",
        label: "Permisos por rol",
        path: "administracion/permisos",
        icon: "permisos",
        requiredPermissions: ["permisos:administrar"],
      },
      {
        id: "administracion-flota",
        label: "Conductores y vehículos",
        path: "administracion/flota",
        icon: "flota",
        requiredPermissions: ["flota:administrar"],
      },
      {
        id: "administracion-mantenimiento",
        label: "Mantenimiento de vehículos",
        path: "administracion/mantenimiento",
        icon: "mantenimiento",
        requiredPermissions: ["flota:mantenimiento"],
      },
    ],
  },
];
