/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Homologación de roles
 * Archivo: RolAuth.ts
 * Responsabilidad: Declarar la correspondencia entre los roles de Auth central y los del módulo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * SE CONTRASTÓ CONTRA EL DTO DEL SERVIDOR antes de escribirse. Es la regla que salió de
 * los cuatro defectos del 7 de agosto: aquellas interfaces se escribieron en M-21 sin
 * consumidor, adivinando la forma de la respuesta, y ninguna prueba podía detectarlo
 * porque repetían el mismo valor inventado que el código.
 */

import type { RolDepartamental } from "../config/env.ts";

/** Una correspondencia registrada. */
export interface RolAuth {
  /** Identificador del rol en Auth central. Es la llave, y la escribe el administrador. */
  idAuth: number;
  /** Nombre tal como lo muestra Auth. Solo informativo: no se decide con él. */
  nombreAuth: string;
  /** Rol del Cuadro de Colores al que corresponde. */
  rol: RolDepartamental;
  subsistema: number;
  activo: boolean;
}

/**
 * Lo que devuelve la consulta: lo registrado y lo que falta.
 *
 * `sinCorrespondencia` no es un adorno. Hoy contiene `FUNCIONARIO`, y significa que quien
 * recibe una orden de servicio **no puede elegir el módulo en el portal**, porque Auth no
 * creó ese rol. La pantalla lo muestra para que el hueco se vea, en vez de descubrirse
 * cuando alguien no logra entrar.
 */
export interface PanoramaRolesAuth {
  correspondencias: RolAuth[];
  sinCorrespondencia: RolDepartamental[];
}

/** Alta. `idAuth` viaja en el cuerpo porque lo asigna Auth, no este sistema. */
export interface CrearRolAuth {
  idAuth: number;
  nombreAuth: string;
  rol: RolDepartamental;
  subsistema?: number;
}

/** Edición. Todos opcionales: se envía solo lo que cambia. */
export interface ActualizarRolAuth {
  nombreAuth?: string;
  rol?: RolDepartamental;
  activo?: boolean;
}

/** Resultado de una baja lógica, con el aviso del servidor. */
export interface BajaRolAuth {
  idAuth: number;
  activo: boolean;
  /** Redactado por el servidor. Se muestra tal cual (regla de interfaz nº 7). */
  mensaje: string;
}
