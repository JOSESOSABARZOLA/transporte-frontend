/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Observaciones como notas
 * Archivo: notasDeTabla.util.ts
 * Responsabilidad: Las notas de la celda «Observaciones» de las tablas de operativos (P-01, P-02).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA TARJETA POR NOTA, NUNCA TEXTO PEGADO (2026-10-19, plan «acciones-icono-notas»). El servidor
 * manda `notas` —las observaciones escritas (`NOTA`) y la solicitud de compartir unidad
 * (`COMPARTIDA`)—, de la más reciente a la más antigua. Un servidor anterior no las trae: entonces
 * se arman aquí con `observaciones` y `compartirCon`, con el mismo orden.
 *
 * El filtro de la columna busca en el texto de TODAS las notas, incluido el identificador del
 * operativo compartido (`textoDeNotas`): se filtra lo que se ve.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { NotaOperativo, Operativo } from "../interfaces/Operativo.ts";

/** Cuántas notas se ven sin desplegar. La compartida cuenta como una más. */
export const NOTAS_VISIBLES = 2;

const ZONA = "America/Guayaquil";

/** El rol en palabras, cuando no hay autor con nombre: «DMIP_OPERATIVOS» → «DMIP OPERATIVOS». */
const rolEnPalabras = (rol: string): string => rol.replace(/_/g, " ");

/** Las notas de la celda: las del servidor, o armadas con los campos de antes. */
export const notasDe = (
  operativo: Pick<Operativo, "id" | "notas" | "observaciones" | "compartirCon" | "creadoPorRol" | "creadoEn">,
): NotaOperativo[] => {
  if (operativo.notas) return operativo.notas;
  const escritas: NotaOperativo[] = operativo.observaciones.map((nota, indice) => ({
    id: `nota-${operativo.id}-${indice}`,
    tipo: "NOTA",
    texto: nota.texto,
    autor: rolEnPalabras(nota.creadoPorRol),
    fecha: nota.creadoEn,
    operativoRelacionadoId: null,
  }));
  const compartida: NotaOperativo[] = operativo.compartirCon
    ? [
        {
          id: `compartida-${operativo.id}`,
          tipo: "COMPARTIDA",
          texto: `Comparte con ${operativo.compartirCon.identificador}`,
          autor: rolEnPalabras(operativo.creadoPorRol),
          fecha: operativo.creadoEn,
          operativoRelacionadoId: operativo.compartirCon.id,
        },
      ]
    : [];
  return [...compartida, ...escritas].sort((a, b) => b.fecha.localeCompare(a.fecha));
};

/** Lo que filtra la columna: el texto de todas las notas, separadas. */
export const textoDeNotas = (notas: NotaOperativo[]): string =>
  notas.map((nota) => nota.texto).join(" · ");

/** Fecha y hora de Quito por partes. */
const partesQuito = (instante: string): Record<string, string> => {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instante));
  return Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
};

/** «20/10 08h30», en Quito: el pie de la tarjeta. */
export const fechaCortaDeNota = (instante: string): string => {
  if (!instante) return "";
  const p = partesQuito(instante);
  return `${p.day}/${p.month} ${p.hour}h${p.minute}`;
};

/** «20/10/2026 08h30», en Quito: el tooltip. */
export const fechaLargaDeNota = (instante: string): string => {
  if (!instante) return "";
  const p = partesQuito(instante);
  return `${p.day}/${p.month}/${p.year} ${p.hour}h${p.minute}`;
};

/** El identificador del operativo compartido, sacado del texto «Comparte con X». */
export const identificadorCompartido = (nota: NotaOperativo): string =>
  nota.texto.replace(/^Comparte con\s+/i, "");

/**
 * Las notas de una fila de la Jornada o de la Matriz (2026-10-19, plan «notas-jornada-matriz»). Un
 * servidor anterior solo manda los textos (`observaciones`): se pintan como notas sin autor ni
 * fecha propios, en el orden en que llegan.
 */
export const notasDeFila = (fila: {
  id: number;
  notas?: NotaOperativo[];
  observaciones: string[];
}): NotaOperativo[] =>
  fila.notas ??
  fila.observaciones.map((texto, indice) => ({
    id: `nota-${fila.id}-${indice}`,
    tipo: "NOTA",
    texto,
    autor: "",
    fecha: "",
    operativoRelacionadoId: null,
  }));
