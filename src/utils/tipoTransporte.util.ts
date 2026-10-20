/**
 * App: Cuadro de Colores
 * Módulo: Cuadro
 * Feature: Transporte requerido
 * Archivo: tipoTransporte.util.ts
 * Responsabilidad: Nombre, explicación y etiqueta de cada tipo de transporte, en UN solo lugar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ÚNICA FUENTE DE LOS TEXTOS DEL TRANSPORTE (2026-10-07).
 *
 * Hasta esta fecha había dos mapas que no coincidían: el registro decía «Solo dejar (inicio)» y la
 * planificación de la DAF «Solo dejar». Ahora el registro, Mis operativos, la tabla «Operativos de
 * este formulario», «Por cubrir», la línea de tiempo y los indicadores leen de aquí. Los textos son
 * GENÉRICOS a propósito —sin horas ni lugares—: describen qué se pide a la DAF, no un caso.
 *
 * La etiqueta de color siempre lleva el nombre dentro (regla 6): el color acompaña, no informa solo.
 *
 * UNA SOLA ETIQUETA, CON BORDE (2026-10-13). Antes eran tres rellenos distintos (`badge-primary`,
 * `-info`, `-accent`) y uno con borde, mezclados con texto plano. Ahora las cuatro que piden
 * vehículo van iguales —azul claro con borde (`app-etiqueta-transporte`)— y se distinguen por la
 * palabra; Propios medios va en gris con borde (`app-etiqueta-transporte-neutra`): no pide
 * vehículo, y de un vistazo se distingue.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { TipoTransporte } from "../interfaces/Operativo.ts";

export interface OpcionTransporte {
  valor: TipoTransporte;
  nombre: string;
  descripcion: string;
  /** Clases del distintivo (inventario de FASE5 §2.2). */
  claseEtiqueta: string;
}

/** La etiqueta de los tipos que piden vehículo a la DAF. */
const CLASE_PIDE_VEHICULO = "app-etiqueta-transporte";

/** Las cinco opciones, en el orden en que se ofrecen. */
export const OPCIONES_TRANSPORTE: readonly OpcionTransporte[] = [
  {
    valor: "COMPLETO",
    nombre: "Completo",
    descripcion: "El vehículo se queda con el equipo durante todo el operativo.",
    claseEtiqueta: CLASE_PIDE_VEHICULO,
  },
  {
    valor: "SOLO_INICIO",
    nombre: "Solo dejar",
    descripcion:
      "Se deja al equipo en el punto de encuentro al inicio del operativo; regresa por su cuenta.",
    claseEtiqueta: CLASE_PIDE_VEHICULO,
  },
  {
    valor: "SOLO_FIN",
    nombre: "Solo retirar",
    descripcion: "Se recoge al equipo al terminar el operativo; llega por su cuenta.",
    claseEtiqueta: CLASE_PIDE_VEHICULO,
  },
  {
    valor: "INICIO_Y_FIN",
    nombre: "Dejar y retirar",
    descripcion:
      "Se deja al equipo al inicio y se recoge al terminar; entre medio el conductor queda libre.",
    claseEtiqueta: CLASE_PIDE_VEHICULO,
  },
  {
    valor: "PROPIOS_MEDIOS",
    nombre: "Propios medios",
    descripcion: "No se solicita vehículo a la DAF. Si necesita transporte, elija otra opción.",
    claseEtiqueta: "app-etiqueta-transporte-neutra",
  },
];

/** El texto del macrooperativo (vehículo exclusivo). */
export const DESCRIPCION_MACROOPERATIVO =
  "No comparte vehículo con otros operativos aunque coincidan en hora y zona.";

/** Rótulo de la casilla del macrooperativo. */
export const ROTULO_MACROOPERATIVO = "Requiere vehículo exclusivo (macrooperativo)";

/** Distintivo corto del macrooperativo en tablas, tarjetas y bloques. */
export const DISTINTIVO_EXCLUSIVO = "Exclusivo";

/** La opción de un tipo; lo desconocido cae en «Completo», que es el valor del esquema. */
export const opcionTransporte = (valor: string | undefined | null): OpcionTransporte =>
  OPCIONES_TRANSPORTE.find((opcion) => opcion.valor === valor) ?? OPCIONES_TRANSPORTE[0];

/** «Solo dejar» a partir de «SOLO_INICIO». */
export const nombreTipoTransporte = (valor: string | undefined | null): string =>
  opcionTransporte(valor).nombre;

/** La explicación genérica del tipo. */
export const descripcionTipoTransporte = (valor: string | undefined | null): string =>
  opcionTransporte(valor).descripcion;

/** ¿Pide vehículo a la DAF? Propios medios no. */
export const pideVehiculo = (valor: string | undefined | null): boolean =>
  valor !== "PROPIOS_MEDIOS";

/**
 * ¿Admite «Requiere vehículo exclusivo (macrooperativo)»? SOLO COMPLETO (2026-10-19, a pedido del
 * negocio): el vehículo exclusivo tiene sentido cuando la unidad acompaña TODO el operativo. En
 * «solo dejar», «solo retirar» o «dejar y retirar» la unidad queda libre entre traslados y se puede
 * compartir. Espejo de `macroSegunTipo` del servidor, que lo limpia en cualquier otro tipo.
 */
export const admiteMacrooperativo = (valor: string | undefined | null): boolean =>
  valor === "COMPLETO";

/** El macrooperativo que se envía: solo vale con COMPLETO (espejo del servidor). */
export const macroSegunTipo = (
  tipo: string | undefined | null,
  macro: boolean | undefined,
): boolean => admiteMacrooperativo(tipo) && macro === true;

/**
 * Texto de la sugerencia junto a la etiqueta: «· sugerido para este formulario» si el valor actual
 * es el que propone el formulario, «· sugerido: <opción>» si se eligió otro. Sin propuesta, nada.
 */
export const textoSugerencia = (
  actual: TipoTransporte | undefined,
  sugerido: TipoTransporte | undefined,
): string | null => {
  if (!sugerido) return null;
  return actual === sugerido
    ? "· sugerido para este formulario"
    : `· sugerido: ${nombreTipoTransporte(sugerido)}`;
};

/** Marca de los macrooperativos en «Por cubrir» y «Sin recurso»: se cubren antes que el resto. */
export const TEXTO_PRIORITARIO = "Prioritario · vehículo exclusivo";
