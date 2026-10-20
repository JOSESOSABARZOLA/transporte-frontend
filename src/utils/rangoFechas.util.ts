/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos · rango de fechas
 * Archivo: rangoFechas.util.ts
 * Responsabilidad: Atajos, validación, resumen y URL del filtro Desde–Hasta de P-02.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOS ATAJOS SE ANCLAN AL CUADRO VIGENTE, no al reloj.
 *
 * El cuadro que se arma hoy es el de mañana (`jornada.util.ts`), y la vista inicial de P-02
 * es ese cuadro. «Hoy» es por eso el vigente, y el resto se cuenta desde él: «Ayer» es el día
 * anterior al vigente, «Esta semana» va del lunes de su semana hasta él, «Últimos 7 días» son
 * los siete que terminan en él y «Este mes», del día 1 de su mes hasta él.
 *
 * Son funciones puras sobre textos AAAA-MM-DD (regla 12): la fecha de calendario no tiene huso.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { esFechaDeCalendario, sumarDias } from "./jornada.util.ts";

/** Rango de fechas del cuadro, ambos extremos inclusive. */
export interface RangoFechas {
  desde: string;
  hasta: string;
}

export type ClaveAtajo = "hoy" | "ayer" | "semana" | "ultimos7" | "mes";

export interface AtajoRango {
  clave: ClaveAtajo;
  nombre: string;
}

/** Atajos en el orden en que se muestran. */
export const ATAJOS_RANGO: readonly AtajoRango[] = [
  { clave: "hoy", nombre: "Hoy" },
  { clave: "ayer", nombre: "Ayer" },
  { clave: "semana", nombre: "Esta semana" },
  { clave: "ultimos7", nombre: "Últimos 7 días" },
  { clave: "mes", nombre: "Este mes" },
];

/** Valor si el servidor aún no respondió el máximo. Es el que siembra la migración. */
export const RANGO_MAX_DIAS_POR_DEFECTO = 31;

/** Día de la semana ISO de una fecha: lunes 1 … domingo 7. */
const diaDeSemana = (fecha: string): number => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const domingoCero = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return domingoCero === 0 ? 7 : domingoCero;
};

/** El rango de un atajo, contado desde el cuadro vigente. */
export const rangoDeAtajo = (clave: ClaveAtajo, vigente: string): RangoFechas => {
  switch (clave) {
    case "hoy":
      return { desde: vigente, hasta: vigente };
    case "ayer": {
      const ayer = sumarDias(vigente, -1);
      return { desde: ayer, hasta: ayer };
    }
    case "semana":
      return { desde: sumarDias(vigente, 1 - diaDeSemana(vigente)), hasta: vigente };
    case "ultimos7":
      return { desde: sumarDias(vigente, -6), hasta: vigente };
    case "mes":
      return { desde: `${vigente.slice(0, 8)}01`, hasta: vigente };
  }
};

/**
 * El atajo que coincide con el rango, para resaltarlo. Si varios coinciden —el lunes, «Hoy» y
 * «Esta semana» son el mismo día—, gana el primero de la lista.
 */
export const atajoActivo = (
  rango: RangoFechas,
  vigente: string,
): ClaveAtajo | null =>
  ATAJOS_RANGO.find(({ clave }) => {
    const candidato = rangoDeAtajo(clave, vigente);
    return candidato.desde === rango.desde && candidato.hasta === rango.hasta;
  })?.clave ?? null;

/** Días del rango, contando los dos extremos: el mismo día es 1. */
export const diasDelRango = ({ desde, hasta }: RangoFechas): number => {
  const [a, b] = [desde, hasta].map((texto) => {
    const [anio, mes, dia] = texto.split("-").map(Number);
    return Date.UTC(anio, mes - 1, dia);
  });
  return Math.round((b - a) / 86_400_000) + 1;
};

/** Por qué el rango no se puede consultar, o `null` si se puede. Mismos textos que el servidor. */
export const errorDelRango = (
  rango: RangoFechas,
  maxDias: number,
): { campo: "desde" | "hasta"; mensaje: string } | null => {
  if (!esFechaDeCalendario(rango.desde)) {
    return { campo: "desde", mensaje: "Indique la fecha «Desde»." };
  }
  if (!esFechaDeCalendario(rango.hasta)) {
    return { campo: "hasta", mensaje: "Indique la fecha «Hasta»." };
  }
  if (rango.hasta < rango.desde) {
    return { campo: "hasta", mensaje: '"Hasta" no puede ser anterior a "Desde".' };
  }
  if (diasDelRango(rango) > maxDias) {
    return { campo: "hasta", mensaje: `El rango no puede superar ${maxDias} días.` };
  }
  return null;
};

export const esUnSoloDia = (rango: RangoFechas): boolean => rango.desde === rango.hasta;

/** Si el rango incluye la fecha (comparación de textos AAAA-MM-DD, que es cronológica). */
export const incluye = (rango: RangoFechas, fecha: string): boolean =>
  rango.desde <= fecha && fecha <= rango.hasta;

/** «2026-10-01» → «01/10». */
const diaYMes = (fecha: string): string => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;

/** «8 operativos entre 01/10 y 14/10 · 5 cuadros». */
export const resumenDelRango = (
  rango: RangoFechas,
  operativos: number,
  cuadros: number,
): string =>
  `${operativos} ${operativos === 1 ? "operativo" : "operativos"} entre ${diaYMes(
    rango.desde,
  )} y ${diaYMes(rango.hasta)} · ${cuadros} ${cuadros === 1 ? "cuadro" : "cuadros"}`;

/**
 * El rango guardado en la URL (`?desde=&hasta=`). Si falta o no es válido, el del cuadro vigente:
 * un enlace viejo o mal copiado abre la vista de siempre en lugar de un error.
 */
export const rangoDeLaUrl = (busqueda: string, vigente: string): RangoFechas => {
  const parametros = new URLSearchParams(busqueda);
  const desde = parametros.get("desde");
  const hasta = parametros.get("hasta");
  return esFechaDeCalendario(desde) && esFechaDeCalendario(hasta) && hasta >= desde
    ? { desde, hasta }
    : { desde: vigente, hasta: vigente };
};

/** La búsqueda de la URL con el rango, conservando los demás parámetros (p. ej. `formulario`). */
export const busquedaConRango = (busqueda: string, rango: RangoFechas): string => {
  const parametros = new URLSearchParams(busqueda);
  parametros.set("desde", rango.desde);
  parametros.set("hasta", rango.hasta);
  return `?${parametros.toString()}`;
};
