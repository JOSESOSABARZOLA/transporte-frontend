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
