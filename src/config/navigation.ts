/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Navigation
 * Archivo: navigation.ts
 * Responsabilidad: Definir la estructura del menú lateral del módulo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import { rolUser, type RolDepartamental } from "./env";

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
  requiredRole?: string;
  requiredPermissions?: string[];
  /** Códigos de rol que pueden ver el ítem. Si no se define, lo ven todos. */
  allowedRoles?: RolDepartamental[];
  defaultOpen?: boolean;
};

// Departamentos que registran operativos en sus propios formularios.
const rolesDepartamentales = [
  rolUser.rolDmipOperativos,
  rolUser.rolDmipInspecciones,
  rolUser.rolDmitInstructor,
];

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
    icon: "documentacion",
    defaultOpen: true,
    children: [
      {
        id: "cuadro-registro",
        label: "Registro de operativo",
        path: "cuadro/registro",
        icon: "documentacion",
        allowedRoles: rolesDepartamentales,
      },
      {
        id: "cuadro-mis-operativos",
        label: "Mis operativos",
        path: "cuadro/mis-operativos",
        icon: "documentacion",
        allowedRoles: rolesDepartamentales,
      },
      {
        id: "cuadro-transporte",
        label: "Asignación de transporte",
        path: "cuadro/transporte",
        icon: "documentacion",
        allowedRoles: [rolUser.rolDaf],
      },
      {
        id: "cuadro-matriz",
        label: "Matriz Consolidada",
        path: "cuadro/matriz",
        icon: "estadisticas",
        allowedRoles: [rolUser.rolDirector],
      },
      {
        id: "cuadro-ordenes",
        label: "Órdenes de servicio",
        path: "cuadro/ordenes",
        icon: "documentacion",
        allowedRoles: [rolUser.rolDirector],
      },
    ],
  },
  {
    id: "mis-ordenes",
    label: "Mis órdenes",
    path: "mis-ordenes",
    icon: "documentacion",
    allowedRoles: [rolUser.rolFuncionario],
  },
  {
    id: "administracion",
    label: "Administración",
    path: "administracion",
    icon: "documentacion",
    defaultOpen: false,
    allowedRoles: [rolUser.rolAdministrador],
    children: [
      {
        id: "administracion-personal",
        label: "Personal y disponibilidad",
        path: "administracion/personal",
        icon: "documentacion",
        allowedRoles: [rolUser.rolAdministrador],
      },
      {
        id: "administracion-catalogos",
        label: "Catálogos del cuadro",
        path: "administracion/catalogos-cuadro",
        icon: "documentacion",
        allowedRoles: [rolUser.rolAdministrador],
      },
      {
        id: "administracion-ventanas",
        label: "Ventanas y parámetros",
        path: "administracion/ventanas",
        icon: "documentacion",
        allowedRoles: [rolUser.rolAdministrador],
      },
      {
        id: "administracion-roles-auth",
        label: "Roles de Auth central",
        path: "administracion/roles-auth",
        icon: "documentacion",
        allowedRoles: [rolUser.rolAdministrador],
      },
      {
        id: "administracion-usuarios",
        label: "Cuentas del cuadro",
        path: "administracion/usuarios",
        icon: "documentacion",
        allowedRoles: [rolUser.rolAdministrador],
      },
      {
        id: "administracion-flota",
        label: "Conductores y vehículos",
        path: "administracion/flota",
        icon: "documentacion",
        allowedRoles: [rolUser.rolAdministrador],
      },
    ],
  },
];
