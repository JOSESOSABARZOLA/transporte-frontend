/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: Administracion.ts
 * Responsabilidad: Declarar los parámetros de política y las ventanas de carga.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL RANGO VIAJA CON EL VALOR, Y ESO ES LO QUE HACE POSIBLE P-09.
 *
 * `minimo`, `maximo`, `unidad` y `descripcion` llegan en la misma respuesta que `valor`.
 * La pantalla puede así decir «entre 8 y 16 horas» **sin conocer ningún parámetro en
 * concreto**: los siete se dibujan con el mismo código y, el día que se agregue un octavo,
 * aparece solo.
 *
 * Es también lo que permite validar antes de enviar sin duplicar la regla: lo que se
 * comprueba en el navegador es el rango **que el servidor acaba de declarar**, no una
 * copia escrita a mano en el cliente.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { RolDepartamental } from "../config/env";

export type TipoParametro = "ENTERO" | "DECIMAL" | "TEXTO" | "BOOLEANO";

/** Respuesta de `GET /parametros`. Solo el ADMINISTRADOR. */
export interface ParametroPolitica {
  clave: string;
  valor: string;
  tipo: TipoParametro;
  /** Redactada por el servidor, con la regla de negocio que gobierna. Se muestra tal cual. */
  descripcion: string;
  unidad: string | null;
  /** Extremos del rango admisible. Nulos cuando el tipo no los tiene. */
  minimo: string | null;
  maximo: string | null;
  /** Caso 5: quién y cuándo. La traza completa vive en la auditoría del servidor. */
  modificadoPor: number | null;
  modificadoEn: string;
}

/** Cuerpo de `PUT /parametros/:clave`. **Una sola propiedad.** */
export interface ActualizarParametro {
  valor: string;
}

export type TipoVentana = "SEMANAL" | "DIARIO" | "INTERVALO";

/**
 * Ventana de carga de un rol. Respuesta de `GET /administracion/ventanas`.
 *
 * Hay **exactamente una por rol** —`uq_ventana_rol`— y por eso el contrato no tiene
 * `POST` ni `DELETE`: crear una séptima no significa nada, y borrar una **abriría** la
 * carga de ese rol las veinticuatro horas, porque el evaluador trata la ausencia de
 * ventana como «sin restricción». Para eso está `activo: false`.
 */
export interface VentanaCarga {
  rol: RolDepartamental;
  tipo: TipoVentana;
  diaApertura: number | null;
  horaApertura: string | null;
  diaCierre: number | null;
  horaCierre: string | null;
  zonaHoraria: string;
  /** Lo que leerá el funcionario cuando su ventana esté cerrada. */
  mensajeCierre: string;
  activo: boolean;
}

/**
 * Cuerpo de `PUT /administracion/ventanas/:rol`.
 *
 * `null` es un valor con significado, no la ausencia del campo: una hora de apertura
 * nula significa «sin restricción de apertura». Lo que no viene no se toca; lo que viene
 * como nulo se limpia.
 */
export interface ActualizarVentana {
  tipo?: TipoVentana;
  diaApertura?: number | null;
  horaApertura?: string | null;
  diaCierre?: number | null;
  horaCierre?: string | null;
  mensajeCierre?: string;
  activo?: boolean;
}

/** Respuesta de la modificación: qué quedó guardado y qué conviene revisar. */
export interface VentanaActualizada {
  ventana: VentanaCarga;
  /** Redactadas por el servidor. No impiden nada: avisan. */
  advertencias: string[];
}
