/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cuadro diario
 * Archivo: CuadroDiario.ts
 * Responsabilidad: Declarar la jornada tal como la entrega el backend.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ESTAS INTERFACES SON EL CONTRATO DE M-13, NO UN MODELO PROPIO. Se escriben con los
 * nombres y las formas que responde el servidor: cualquier traducción intermedia
 * obligaría a mantener dos vocabularios y a decidir cuál manda cuando difieran.
 */

/** Los cuatro estados de la jornada. INV-03 los recorre en este orden. */
export type EstadoCuadro =
  | "BORRADOR"
  | "EN_TRANSPORTE"
  | "APROBADO"
  | "CERRADO";

/** Respuesta de `GET /cuadros/:fecha`. */
export interface CuadroDiario {
  fecha: string;
  ordenTrabajo: string;
  nroSemana: number;
  anioSemana: number;
  estado: EstadoCuadro;
  /** RN-58. Lo consulta la cabecera de todas las pantallas antes de habilitar nada. */
  admiteEscritura: boolean;
  cerradoPor: number | null;
  cerradoEn: string | null;
  reaperturas: number;
}

/**
 * Cuerpo de `POST /cuadros`. **Una sola propiedad.**
 *
 * La semana se deriva en el servidor (RN-06) y **la orden de trabajo también**, con el
 * formato `AMC-AAAA-MM-DD`, desde que se resolvió PV-28 el 2026-08-07. Enviarla produce
 * `400 CAMPOS_NO_PERMITIDOS`: el servidor la genera, y dos códigos para el mismo día no
 * pueden convivir.
 */
export interface AbrirCuadro {
  fecha: string;
}

/** Etiqueta legible del estado, para el distintivo de la cabecera. */
export const nombreEstadoCuadro: Record<EstadoCuadro, string> = {
  BORRADOR: "Borrador",
  EN_TRANSPORTE: "En transporte",
  APROBADO: "Aprobado",
  CERRADO: "Cerrado",
};
