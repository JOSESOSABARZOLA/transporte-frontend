/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: notasOperativo.util.ts
 * Responsabilidad: Reglas puras de las observaciones del operativo: fecha de cada nota, agregar,
 *                  editar y quitar una nota de la sesión, y sumar la nota escrita sin agregar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS NOTAS DE LA SESIÓN SE EDITAN; LAS GUARDADAS, NO (2026-10-16). Hasta registrar u guardar, una
 * nota agregada es solo captura: se corrige si le faltó una palabra, o se quita. Las ya guardadas
 * siguen siendo bitácora (2026-09-09) y se muestran en lectura. Nada cambia en lo que viaja al
 * servidor: `observaciones[]` en el alta y `observacionesNuevas[]` en la edición.
 *
 * La HORA de cada nota (`observacionesHoras`, alineada por posición con `observaciones`) y lo
 * escrito sin agregar (`notaPendiente`) viajan en el borrador y NO se envían. Un borrador anterior
 * no los trae: se leen como `?? []` y `?? ""`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ValoresOperativo } from "./valoresOperativo.util.ts";

/** El huso de la AMC: la hora de una nota es la de Quito, cualquiera que sea el navegador. */
const ZONA = "America/Guayaquil";

/** «16/10/2026 14h30», en Quito. */
export const fechaDeNota = (instante: string | Date): string => {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instante));
  const parte = (tipo: string) => partes.find((una) => una.type === tipo)?.value ?? "";
  return `${parte("day")}/${parte("month")}/${parte("year")} ${parte("hour")}h${parte("minute")}`;
};

/** Las notas de la sesión y la hora en que se agregó cada una (`null` si no se sabe). */
export type NotasDeSesion = { notas: string[]; horas: (string | null)[] };

/** Alinea las horas con las notas: un borrador anterior no trae horas. */
export const horasAlineadas = (
  notas: string[],
  horas: (string | null)[] | undefined,
): (string | null)[] => notas.map((_, indice) => horas?.[indice] ?? null);

/** Agrega una nota al final. Una en blanco no entra. */
export const agregarNota = (
  actual: NotasDeSesion,
  texto: string,
  ahora: Date,
): NotasDeSesion => {
  const limpio = texto.trim();
  if (!limpio) return actual;
  return {
    notas: [...actual.notas, limpio],
    horas: [...horasAlineadas(actual.notas, actual.horas), ahora.toISOString()],
  };
};

/** Cambia el texto de una nota y conserva su hora. Vacía, no cambia nada. */
export const editarNota = (
  actual: NotasDeSesion,
  indice: number,
  texto: string,
): NotasDeSesion => {
  const limpio = texto.trim();
  if (!limpio || indice < 0 || indice >= actual.notas.length) return actual;
  return {
    notas: actual.notas.map((nota, i) => (i === indice ? limpio : nota)),
    horas: horasAlineadas(actual.notas, actual.horas),
  };
};

/** Quita una nota (aún no se guardó: no hay nada que conservar). */
export const quitarNota = (actual: NotasDeSesion, indice: number): NotasDeSesion => {
  const horas = horasAlineadas(actual.notas, actual.horas);
  return {
    notas: actual.notas.filter((_, i) => i !== indice),
    horas: horas.filter((_, i) => i !== indice),
  };
};

/**
 * AL REGISTRAR O GUARDAR, LO ESCRITO SIN «AGREGAR» TAMBIÉN VIAJA. Quien teclea una nota y pulsa
 * «Registrar operativo» espera que la nota se guarde; perderla en silencio sería peor que un clic
 * de más. Devuelve los valores con la nota sumada y si hubo que sumarla, para que el aviso lo diga.
 */
export const conNotaPendiente = (
  valores: ValoresOperativo,
  ahora: Date,
): { valores: ValoresOperativo; agregada: boolean } => {
  const pendiente = (valores.notaPendiente ?? "").trim();
  if (!pendiente) return { valores, agregada: false };
  const sesion = agregarNota(
    { notas: valores.observaciones, horas: valores.observacionesHoras ?? [] },
    pendiente,
    ahora,
  );
  return {
    valores: {
      ...valores,
      observaciones: sesion.notas,
      observacionesHoras: sesion.horas,
      notaPendiente: "",
    },
    agregada: true,
  };
};

/** La frase que el aviso de éxito suma cuando se agregó la nota escrita. */
export const AVISO_NOTA_PENDIENTE = "Se agregó también la nota que estaba escrita.";
