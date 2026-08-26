/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Identidad del usuario
 * Archivo: User.ts
 * Responsabilidad: Definir el usuario resuelto y las acciones disponibles por fila.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import type { RolDepartamental } from "../config/env";
import type { ModalType } from "./Modal";

/**
 * Usuario resuelto por UserContext. Mientras el microservicio de Active Directory
 * no esté disponible, se construye desde config/usuariosPrueba.ts.
 * Ver docs/FASE4-arquitectura-tecnica.md §9.
 */
export interface User {
  userid: number;
  usuFullName: string;
  usuEmail: string;
  /** Rol del módulo, con el mismo nombre que usa el servidor. Ver rolUser en config/env.ts */
  /** Todos los roles de la persona. Las pantallas se montan con la unión. */
  rolCodes: RolDepartamental[];
  rolName: string;
  token: string;
  actividades: UserActions[];
}

/**
 * Acción disponible sobre una fila de tabla. En este módulo los permisos son por
 * rol, no por acción: la lista la arma la propia pantalla, no un endpoint.
 */
export interface UserActions {
  actiId: number;
  actiName: ModalType;
  actiLabel: string;
  actiContext: string;
  actiIconName: string;
  actiIsPrioritaly: boolean;
  actiIsDisabled?: boolean;
}
