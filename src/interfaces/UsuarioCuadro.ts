/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Cuentas del módulo
 * Archivo: UsuarioCuadro.ts
 * Responsabilidad: Declarar la cuenta del Cuadro de Colores tal como la administra P-11.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * SE CONTRASTÓ CONTRA EL DTO DEL SERVIDOR antes de escribirse, que es la regla salida de
 * los cuatro defectos del 7 de agosto: aquellas interfaces se escribieron adivinando la
 * forma de la respuesta y ninguna prueba podía detectarlo.
 *
 * SE LLAMA `UsuarioCuadro` Y NO `Usuario` a propósito: ya existe `User` para la persona
 * que tiene la sesión abierta. Son cosas distintas —una es quien mira la pantalla, otra
 * es la fila que se administra— y confundirlas sería fácil con el mismo nombre.
 */

import type { RolDepartamental } from "../config/env.ts";

/** La ficha de personal enlazada. Sin ella, esa persona no recibe órdenes de servicio. */
export interface FichaEnlazada {
  cedula: string;
  nombreCompleto: string;
}

export interface UsuarioCuadro {
  id: number;
  correo: string;
  nombre: string;
  /**
   * Todos los roles de la persona. Plural desde el 2026-08-19.
   *
   * Ve la UNIÓN de los formularios de cada uno. Nunca está vacío: el servidor rechaza un
   * alta sin ningún rol, porque esa persona no podría hacer nada y no entendería por qué.
   */
  roles: RolDepartamental[];
  /**
   * Usuario con el que entra a Auth central. Es la llave del ingreso: **sin él, esa
   * persona no puede entrar**, por mucho que la cuenta exista y esté activa.
   */
  identificadorAd: string | null;
  funcionario: FichaEnlazada | null;
  activo: boolean;
}

/** Alta. El correo es la llave natural y solo se fija aquí. */
export interface CrearUsuarioCuadro {
  correo: string;
  nombre: string;
  /**
   * Todos los roles de la persona. Plural desde el 2026-08-19.
   *
   * Ve la UNIÓN de los formularios de cada uno. Nunca está vacío: el servidor rechaza un
   * alta sin ningún rol, porque esa persona no podría hacer nada y no entendería por qué.
   */
  roles: RolDepartamental[];
  identificadorAd: string | null;
  /** Cédula. El servidor la resuelve contra el maestro de personal. */
  funcionarioCedula: string | null;
}

/** Edición. Sin correo: cambiarlo no sería corregir la cuenta, sería crear otra. */
export interface ActualizarUsuarioCuadro {
  nombre?: string;
  /** Si viene, REEMPLAZA el conjunto entero. No se añade ni se quita de uno en uno. */
  roles?: RolDepartamental[];
  identificadorAd?: string | null;
  funcionarioCedula?: string | null;
  activo?: boolean;
}
