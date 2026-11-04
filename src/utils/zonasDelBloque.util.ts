/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro por zonas del formulario 8 · listados
 * Archivo: zonasDelBloque.util.ts
 * Responsabilidad: Las líneas por zona del bloque de una persona en Mis operativos, la Jornada y
 *   la Matriz: «La Delicia · AMC La Delicia · CCF / ITCC · IG-030 a IG-042».
 * Fecha: 2026-10-28
 *
 * Un registro por zonas del 8 es UN bloque en la tabla: persona, horario, transporte, conductor y
 * placa una sola vez. Lo que cambia por zona —zonal, punto y tipo de control— se dice en una línea
 * por zona, la principal primero, con sus identificadores como rango. Lo reconoce
 * `esRegistroPorZonas`: el servidor manda `esZonaPrincipal` (verdadero o falso) solo en esos
 * registros; en los demás llega nulo o ausente y nada cambia.
 */

import { compactarIdentificadores } from "./rangoIdentificadores.util.ts";

/** ¿Es una fila de un registro por zonas? Lo dice el servidor con `esZonaPrincipal`. */
export function esRegistroPorZonas(fila: {
  esLote: boolean;
  esZonaPrincipal?: boolean | null;
}): boolean {
  return fila.esLote && fila.esZonaPrincipal != null;
}

/** Una zona del bloque, lista para pintar. */
export interface LineaDeZona {
  clave: string;
  esPrincipal: boolean;
  zonal: string;
  punto: string;
  tipo: string;
  identificadores: string;
  /** «La Delicia · AMC La Delicia · CCF / ITCC · IG-030 a IG-042», sin partes vacías. */
  texto: string;
}

/** Cómo leer cada dato de una fila: cada tabla tiene su forma. */
export interface CamposDeZona<T> {
  zonal: (fila: T) => string;
  punto: (fila: T) => string;
  tipo: (fila: T) => string;
  identificador: (fila: T) => string;
  esPrincipal: (fila: T) => boolean | null | undefined;
}

/**
 * Las zonas del bloque, una por zonal, en el orden de su primera fila con la principal adelante.
 * Las filas ya deberían llegar ordenadas por `ordenarPorPersonaYZona`; aun así la principal se
 * adelanta aquí, para que la línea nunca dependa del orden de llegada.
 */
export function lineasDeZona<T>(filas: readonly T[], campos: CamposDeZona<T>): LineaDeZona[] {
  const porZona = new Map<string, T[]>();
  for (const fila of filas) {
    const clave = campos.zonal(fila);
    porZona.set(clave, [...(porZona.get(clave) ?? []), fila]);
  }
  const lineas = [...porZona.entries()].map(([clave, deLaZona]) => {
    const primera = deLaZona[0];
    const zonal = campos.zonal(primera);
    const punto = campos.punto(primera);
    const tipo = campos.tipo(primera);
    const identificadores = compactarIdentificadores(deLaZona.map(campos.identificador));
    return {
      clave,
      esPrincipal: campos.esPrincipal(primera) === true,
      zonal,
      punto,
      tipo,
      identificadores,
      texto: [zonal, punto, tipo, identificadores].filter(Boolean).join(" · "),
    };
  });
  return [...lineas.filter((l) => l.esPrincipal), ...lineas.filter((l) => !l.esPrincipal)];
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BLOQUES DE ZONA (2026-10-30). La Matriz, Mis operativos (y Registro) y el PDF de la Matriz
 * pintan el registro por zonas en DOS NIVELES con `rowSpan`: lo del operativo —horario, persona,
 * transporte, estado, notas— abarca todas sus filas; lo de la zona —zonal, punto, tipo e
 * instituciones— abarca solo las filas de esa zona. El identificador va por fila, con la marca de
 * su zona (Z1, Z2…). La zona principal (la del Maestro) va primero. El servidor tiene el espejo en
 * `documentos/application/bloques-de-zona.ts` para el PDF.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Una zona del registro con sus filas, lista para pintar con `rowSpan`. */
export interface BloqueDeZona<T> {
  clave: string;
  /** «Z1», «Z2»…: la principal es siempre Z1. */
  marca: string;
  esPrincipal: boolean;
  zonal: string;
  punto: string;
  tipo: string;
  instituciones: string;
  /** Las filas de la zona, por número de identificador. */
  filas: T[];
  /** «IG-001 a IG-010 · 10 controles». */
  rango: string;
}

/** Cómo leer cada dato de una fila para armar sus bloques. */
export interface CamposDeBloque<T> extends CamposDeZona<T> {
  instituciones: (fila: T) => string;
}

/** «1 control» / «10 controles». */
export const textoControles = (cantidad: number): string =>
  `${cantidad} ${cantidad === 1 ? "control" : "controles"}`;

/** Las zonas del registro: la principal primero, luego en el orden de su primera fila. */
export function bloquesDeZona<T>(
  filas: readonly T[],
  campos: CamposDeBloque<T>,
): BloqueDeZona<T>[] {
  const porZona = new Map<string, T[]>();
  for (const fila of filas) {
    const clave = campos.zonal(fila);
    porZona.set(clave, [...(porZona.get(clave) ?? []), fila]);
  }
  const bloques = [...porZona.entries()].map(([clave, deLaZona]) => {
    const ordenadas = [...deLaZona].sort((una, otra) =>
      campos.identificador(una).localeCompare(campos.identificador(otra), "es", { numeric: true }),
    );
    const primera = ordenadas[0];
    return {
      clave,
      esPrincipal: deLaZona.some((fila) => campos.esPrincipal(fila) === true),
      zonal: campos.zonal(primera),
      punto: campos.punto(primera),
      tipo: campos.tipo(primera),
      instituciones: campos.instituciones(primera),
      filas: ordenadas,
      rango: `${compactarIdentificadores(ordenadas.map(campos.identificador))} · ${textoControles(ordenadas.length)}`,
    };
  });
  return [...bloques.filter((b) => b.esPrincipal), ...bloques.filter((b) => !b.esPrincipal)].map(
    (bloque, indice) => ({ ...bloque, marca: `Z${indice + 1}` }),
  );
}

/** Lo que `bloquesDeFilas` lee de una fila de la Matriz o de la Jornada (misma forma). */
interface FilaDeTablaPorZonas {
  identificador: string;
  esLote: boolean;
  esZonaPrincipal?: boolean | null;
  zonales: string[];
  puntoEncuentro: string;
  tipoControl: string;
  instituciones: string[];
}

/** Las zonas de un registro de la Matriz o de la Jornada (ver `GrupoPorZonas`). */
export const bloquesDeFilas = <F extends FilaDeTablaPorZonas>(
  filas: readonly F[],
): BloqueDeZona<F>[] =>
  bloquesDeZona(filas, {
    zonal: (fila) => fila.zonales.join(", "),
    punto: (fila) => fila.puntoEncuentro,
    tipo: (fila) => fila.tipoControl,
    instituciones: (fila) => fila.instituciones.join(", "),
    identificador: (fila) => fila.identificador,
    esPrincipal: (fila) => fila.esZonaPrincipal,
  });

/** ¿Se pinta en dos niveles? Un registro por zonas con más de una zona. */
export const esBloquePorZonas = (filas: readonly FilaDeTablaPorZonas[]): boolean =>
  filas.length > 0 && esRegistroPorZonas(filas[0]) && bloquesDeFilas(filas).length > 1;

/** «16 controles · 2 zonas», bajo el nombre de la persona. */
export function resumenDelRegistro(
  bloques: readonly BloqueDeZona<unknown>[],
  /** Los controles del registro entero, si lo que se pinta es solo una parte (filtro). */
  controles = bloques.reduce((suma, bloque) => suma + bloque.filas.length, 0),
): string {
  return `${textoControles(controles)} · ${bloques.length} ${bloques.length === 1 ? "zona" : "zonas"}`;
}

/** «Prioridad: Zonal La Mariscal»: el transporte es uno y sale de la zona principal. */
export function prioridadDelTransporte(bloques: readonly BloqueDeZona<unknown>[]): string | null {
  const principal = bloques.find((bloque) => bloque.esPrincipal) ?? bloques[0];
  return principal ? `Prioridad: ${principal.zonal}` : null;
}
