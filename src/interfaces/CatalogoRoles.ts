/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogo de roles
 * Archivo: CatalogoRoles.ts
 * Responsabilidad: Declarar lo que el servidor dice de cada rol.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-01
 *
 * ES UN CATÁLOGO, NO UNA MATRIZ DE PERMISOS. Dice qué roles hay y cómo se llaman; **no**
 * dice qué abre cada uno. Eso vive en los `@Roles` del servidor y parametrizarlo es otro
 * trabajo, ya planificado y aparte.
 */

import type { RolDepartamental } from "../config/env.ts";

/** Respuesta de `GET /administracion/roles`. */
export interface RolDelCatalogo {
  codigo: RolDepartamental;
  nombre: string;
  /**
   * Si se puede otorgar a una cuenta nueva. **Todos se pueden nombrar.**
   *
   * `ADMINISTRADOR` quedó vacío el 2026-09-01: se sigue nombrando porque hay filas de
   * auditoría que lo llevan, y no se ofrece porque otorgarlo crearía una cuenta que entra
   * y no puede hacer nada.
   */
  asignable: boolean;
}
