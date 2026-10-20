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
  /**
   * Divisor fino ANTES de este ítem dentro de su grupo (2026-10-08). Sustituye a los encabezados
   * de sección «Uso diario» / «Configuración» de «Transporte · DAF»: ningún otro submenú tiene
   * títulos de grupo, y el menú sigue un solo patrón. Solo se pinta si hay un ítem visible antes.
   */
  divisorAntes?: boolean;
  /** Solo en grupos. Sus enlaces llevan `?fecha=` de la fecha de trabajo compartida de la DAF. */
  conFechaDaf?: boolean;
  /**
   * Solo en hijos de un grupo `conFechaDaf` (2026-10-15): su enlace NO lleva `?fecha=`. Es el
   * maestro de «Flota y garajes», que no depende de ninguna jornada.
   */
  sinFechaDaf?: boolean;
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
  /*
   * TRANSPORTE · DAF (2026-10-06). Todo lo de la DAF en un solo grupo, en el orden en que se usa:
   * lo de cada día arriba y la configuración abajo. Las rutas NO cambian (siguen bajo `cuadro/` y
   * `administracion/`): solo cambia dónde se ofrecen. Los permisos son los mismos de cada ruta.
   */
  {
    id: "transporte-daf",
    label: "Transporte · DAF",
    path: "transporte-daf",
    icon: "transporteDaf",
    defaultOpen: false,
    conFechaDaf: true,
    children: [
      {
        id: "cuadro-transporte",
        label: "Planificar el día",
        path: "cuadro/transporte",
        icon: "transporte",
        requiredPermissions: ["transporte:asignar"],
      },
      {
        id: "administracion-turnos-conductores",
        label: "Turnos del mes",
        path: "administracion/turnos-conductores",
        icon: "turnosConductores",
        requiredPermissions: ["flota:administrar"],
      },
      {
        id: "administracion-mantenimiento",
        label: "Mantenimiento",
        path: "administracion/mantenimiento",
        icon: "mantenimiento",
        requiredPermissions: ["flota:mantenimiento"],
      },
      {
        id: "administracion-flota",
        label: "Flota y garajes",
        path: "administracion/flota",
        icon: "flota",
        divisorAntes: true,
        sinFechaDaf: true,
        requiredPermissions: ["flota:administrar"],
      },
      {
        id: "administracion-traslados",
        label: "Traslados entre zonales",
        path: "administracion/traslados",
        icon: "traslados",
        requiredPermissions: ["flota:administrar"],
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
        // Versión consolidada (2026-10-06). El mismo permiso que la ruta: hoy solo ADMINISTRADOR.
        id: "administracion-carga-inicial",
        label: "Carga inicial",
        path: "administracion/carga-inicial",
        icon: "cargaInicial",
        requiredPermissions: ["carga-inicial:administrar"],
      },
    ],
  },
];
