/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Traslados entre zonales
 * Archivo: traslados.util.ts
 * Responsabilidad: Escala de color de la matriz de traslados (corto / medio / largo) y el texto
 *                  de su cobertura.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * ESCALA FIJA, NO RELATIVA A LA REGLA GENERAL (2026-10-06). Antes el corte salía de los parámetros
 * (mismo sector / otro sector), así que la misma cifra cambiaba de color al mover un parámetro. La
 * DAF pidió una lectura estable: hasta 30 min es corto (verde), de 31 a 60 es medio (sin color) y
 * más de 60 es largo (rojo). El color va en el borde, con tokens del tema, y SIEMPRE con su texto
 * en el `title` y en la leyenda (regla 6).
 */

export type RangoTraslado = "corto" | "medio" | "largo";

/** Hasta aquí (inclusive) es corto. */
export const LIMITE_CORTO_MIN = 30;
/** Hasta aquí (inclusive) es medio; por encima, largo. */
export const LIMITE_MEDIO_MIN = 60;

export const rangoTraslado = (minutos: number): RangoTraslado =>
  minutos <= LIMITE_CORTO_MIN
    ? "corto"
    : minutos <= LIMITE_MEDIO_MIN
      ? "medio"
      : "largo";

/** Borde de cada rango. El medio no lleva color: es lo normal y no pide atención. */
export const CLASE_RANGO_TRASLADO: Record<RangoTraslado, string> = {
  corto: "border-success",
  medio: "",
  largo: "border-error",
};

/**
 * Cobertura de la matriz (2026-10-15), con los minutos de la regla general que usan los pares sin
 * tiempo: «72 de 90 pares sin tiempo registrado: usan el tiempo por defecto (15/30/60 min).».
 */
export const textoCobertura = (
  cobertura: { posibles: number; sinTiempo: number },
  regla: { mismaZona: number; mismoSector: number; otroSector: number },
): string =>
  `${cobertura.sinTiempo} de ${cobertura.posibles} ${
    cobertura.posibles === 1 ? "par" : "pares"
  } sin tiempo registrado: usan el tiempo por defecto (${regla.mismaZona}/${regla.mismoSector}/${regla.otroSector} min).`;
