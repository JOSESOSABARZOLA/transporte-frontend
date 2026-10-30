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
 * DAF pidió una lectura estable: hasta 30 min es corto (verde), de 31 a 60 es medio (turquesa,
 * desde el 2026-10-20; antes sin color) y más de 60 es largo (naranja). El color va en el borde,
 * con tokens propios, y SIEMPRE con su texto en el `title` y en la leyenda (regla 6).
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

/**
 * Borde de cada rango (2026-10-20): corto verde, medio turquesa, largo naranja, con los tokens
 * `--app-traslado-*`. El texto va siempre al lado (`NOMBRE_RANGO_TRASLADO`, regla 6).
 */
export const CLASE_RANGO_TRASLADO: Record<RangoTraslado, string> = {
  corto: "app-traslado-corto",
  medio: "app-traslado-medio",
  largo: "app-traslado-largo",
};

export const NOMBRE_RANGO_TRASLADO: Record<RangoTraslado, string> = {
  corto: "Corto",
  medio: "Medio",
  largo: "Largo",
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

/** «AAAA-MM-DD» → «dd/mm», sin pasar por `Date` (regla 12). */
const diaCorto = (fecha: string): string => {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
};

/**
 * Una asignación que dejaría de llegar con la matriz propuesta (2026-10-20), en una línea:
 * «21/10 · Jose Luis Sosa · OCPMO-001 (dejar) → OCPMO-005 (completo): hueco 20 min, necesita 45
 * (faltan 25)».
 */
export const textoParAfectado = (par: {
  fecha: string;
  conductor: string;
  desde: string;
  hacia: string;
  huecoMin: number;
  despuesMin: number;
  faltanMin: number;
}): string =>
  `${diaCorto(par.fecha)} · ${par.conductor} · ${par.desde} → ${par.hacia}: hueco ${par.huecoMin} min, necesita ${par.despuesMin} (faltan ${par.faltanMin})`;

/** El rango del aviso de impacto: «para hoy (20/10)» o «entre hoy (20/10) y el 18/12». */
export const textoRangoImpacto = (desde: string, hasta: string): string =>
  desde === hasta
    ? `para hoy (${diaCorto(desde)})`
    : `entre hoy (${diaCorto(desde)}) y el ${diaCorto(hasta)}`;
