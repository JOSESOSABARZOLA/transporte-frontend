/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Listado de operativos (Registro y Mis operativos)
 * Archivo: grupoOperativos.util.ts
 * Responsabilidad: Qué operativos se pintan como UN bloque (`claveDeFusion`) y la paginación por
 *   bloque, para que un operativo agrupado nunca se parta entre páginas.
 * Fecha: 2026-10-30
 *
 * La clave vivía en `TablaOperativos.tsx`. Salió aquí porque la paginación (`useTablaOperativos`)
 * necesita la MISMA regla: contaba filas, y un registro por zonas de 16 identificadores quedaba con
 * 10 en una página y 6 en la otra —y el «(n)» de la persona decía 10—. Ahora la página cuenta
 * bloques: la patrulla 5/6, las copias del 8 y el registro por zonas cuentan como un operativo.
 */

import type { Operativo, ResultadoBajaDeRegistro } from "../interfaces/Operativo.ts";
import { agruparPorClave } from "./agrupacionForm8.util.ts";
import { valorDeColumna, type ColumnaOperativo } from "./listadoOperativos.util.ts";
import { compactarIdentificadores } from "./rangoIdentificadores.util.ts";
import { bloquesDeZona, esRegistroPorZonas } from "./zonasDelBloque.util.ts";

/**
 * Columnas que se comparan para decidir si dos operativos son «la misma copia» del formulario 8
 * (todas menos identificador y formulario). Se comparan por su TEXTO —lo mismo que ve el usuario—
 * vía `valorDeColumna`, así la celda fusionada nunca miente.
 */
const COLUMNAS_DE_FUSION: readonly ColumnaOperativo[] = [
  "horario",
  "personal",
  "telefono",
  "zonal",
  "punto",
  "tipoControl",
  "transporte",
  "conductor",
  "estado",
  "observaciones",
];

/**
 * Clave de fusión de las copias del formulario 8: operativos de UNA sola persona idénticos salvo
 * el identificador. `null` = no se agrupa (más de una persona). Ver `agrupacionForm8.util.ts`.
 */
export const claveDeFusion = (operativo: Operativo): string | null => {
  // PATRULLA (Form 5/6): los operativos de un mismo registro-lote (`grupoRegistro`) se agrupan como
  // «una sola patrulla», cada persona con su código por área en su fila. Se comparan las columnas
  // fusionadas —SIN personal ni teléfono, que bajan por fila— para que la celda combinada nunca
  // mienta; el UUID evita fusionar patrullas distintas del mismo horario.
  //
  // Y SIN observaciones (2026-09-17): la bitácora es por operativo y la persona que APORTA el DMIT
  // (INECU) nace sin notas propias, mientras el registrante (IGNECU/ITNECU) sí las tiene. Si
  // entrara en la clave, el aportado quedaría siempre en un grupo aparte en cuanto la patrulla
  // tuviera una nota. La celda fusionada muestra las notas de coordinación del registrante.
  // Y SIN horario (2026-09-21): el `grupoRegistro` (UUID) YA identifica a la patrulla —no hace falta
  // el horario para no fundir dos distintas—, y cada persona lleva su ventana EFECTIVA (RN-66), que
  // puede diferir (el aporte del DMIT a otra hora). Si el horario entrara en la clave, ese código se
  // saldría de la patrulla y se pintaría como un operativo aparte —lo reportado—. Baja POR PERSONA
  // cuando difiere (ver `GrupoForm6Operativos`).
  // REGISTRO POR ZONAS DEL 8 (2026-10-28): UN bloque por registro. Zonal, punto y tipo cambian por
  // zona y NO parten el bloque (ver `GrupoPorZonasOperativos`).
  if (esRegistroPorZonas(operativo)) {
    return JSON.stringify([
      "ZONAS",
      operativo.cuadroFecha,
      operativo.grupoRegistro,
      operativo.esAdicional,
      ...(["transporte", "conductor", "estado"] as const).map((columna) =>
        valorDeColumna(operativo, columna),
      ),
    ]);
  }
  if (operativo.esLote) {
    return JSON.stringify([
      "F6",
      // Con un rango de varios días (2026-10-13) nunca se funden filas de cuadros distintos.
      operativo.cuadroFecha,
      operativo.grupoRegistro,
      operativo.esAdicional,
      ...COLUMNAS_DE_FUSION.filter(
        (columna) =>
          columna !== "personal" &&
          columna !== "telefono" &&
          columna !== "observaciones" &&
          columna !== "horario",
      ).map((columna) => valorDeColumna(operativo, columna)),
    ]);
  }
  if (operativo.personal.length !== 1) return null;
  return JSON.stringify([
    "F8",
    operativo.cuadroFecha,
    operativo.personal[0].funcionarioId,
    operativo.esAdicional,
    ...COLUMNAS_DE_FUSION.map((columna) => valorDeColumna(operativo, columna)),
  ]);
};

/** Los bloques del listado, en el orden de su primera fila (ver `agruparPorClave`). */
export const gruposDeOperativos = (operativos: readonly Operativo[]): Operativo[][] =>
  agruparPorClave(operativos, claveDeFusion);

/**
 * Pagina por BLOQUE (2026-10-30): `tamanio` bloques por página, cada uno entero. Devuelve las filas
 * de la página, la página efectiva (si el filtro dejó menos páginas, la última que existe) y el
 * total de bloques, que es lo que el paginador cuenta como «operativos».
 */
export const paginarPorGrupos = (
  operativos: readonly Operativo[],
  pagina: number,
  tamanio: number,
): { pagina: number; filas: Operativo[]; total: number; totalPaginas: number } => {
  const grupos = gruposDeOperativos(operativos);
  const total = grupos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanio));
  const efectiva = Math.min(Math.max(0, pagina), totalPaginas - 1);
  const desde = efectiva * tamanio;
  return {
    pagina: efectiva,
    filas: grupos.slice(desde, desde + tamanio).flat(),
    total,
    totalPaginas,
  };
};

/** En qué página (desde 0) cae el bloque del operativo, o `null` si no está. */
export const paginaDelOperativo = (
  operativos: readonly Operativo[],
  id: number,
  tamanio: number,
): number | null => {
  const indice = gruposDeOperativos(operativos).findIndex((grupo) =>
    grupo.some((operativo) => operativo.id === id),
  );
  return indice < 0 ? null : Math.floor(indice / tamanio);
};

/**
 * Cuántos identificadores tiene cada registro (`grupoRegistro`) en TODO el listado, no en la
 * página ni en lo filtrado: el «(n)» de la persona y «16 controles · 2 zonas» del registro por
 * zonas siempre cuentan el operativo entero.
 */
export const totalPorRegistro = (operativos: readonly Operativo[]): Map<string, number> => {
  const totales = new Map<string, number>();
  for (const operativo of operativos) {
    totales.set(operativo.grupoRegistro, (totales.get(operativo.grupoRegistro) ?? 0) + 1);
  }
  return totales;
};

/** «A», «A y B», «A, B y C». */
const enumerar = (partes: readonly string[]): string =>
  partes.length <= 1
    ? (partes[0] ?? "")
    : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;

/**
 * El texto de «¿Eliminar el operativo completo?» de un registro por zonas (2026-10-31): «Se quitarán
 * los 11 códigos (IG-001 a IG-011) de SALAZAR SOTO ANA en Zonal La Mariscal y Zonal Manuela Sáenz.
 * Esta acción no se puede deshacer.». Las zonas, la principal primero.
 */
export const textoRetiroDelRegistro = (grupo: readonly Operativo[]): string => {
  // PATRULLA 5/6 (2026-10-31): cada código es una persona; la lista va aparte (`codigosDelRetiro`).
  if (grupo[0]?.formulario?.esPatrulla) {
    const codigos = grupo.length === 1 ? "el código" : `los ${grupo.length} códigos`;
    return `Se quitarán ${codigos} del operativo y su personal quedará libre. Esta acción no se puede deshacer.`;
  }
  const zonas = bloquesDeZona(grupo, {
    zonal: (operativo) => valorDeColumna(operativo, "zonal"),
    punto: () => "",
    tipo: () => "",
    instituciones: () => "",
    identificador: (operativo) => operativo.identificador,
    esPrincipal: (operativo) => operativo.esZonaPrincipal,
  }).map((bloque) => bloque.zonal);
  const persona = grupo[0]?.personal[0]?.nombre;
  const rango = compactarIdentificadores(grupo.map((operativo) => operativo.identificador));
  const codigos = grupo.length === 1 ? "el código" : `los ${grupo.length} códigos`;
  return `Se quitarán ${codigos} (${rango})${persona ? ` de ${persona}` : ""}${
    zonas.length > 0 ? ` en ${enumerar(zonas)}` : ""
  }. Esta acción no se puede deshacer.`;
};

/**
 * La patrulla (2026-10-31): cada código con su persona, por identificador, para la lista del modal
 * («IGECU-001-31-OCT-2026 · SALAZAR SOTO TATIANA PILAR»).
 */
export const codigosDelRetiro = (
  grupo: readonly Operativo[],
): { identificador: string; persona: string | null }[] =>
  [...grupo]
    .sort((una, otra) => una.identificador.localeCompare(otra.identificador, "es", { numeric: true }))
    .map((operativo) => ({
      identificador: operativo.identificador,
      persona: operativo.personal[0]?.nombre ?? null,
    }));

/**
 * «Incluye N personas aportadas por DMIT · Instrucción» (2026-10-31): los códigos que creó otro
 * departamento que el dueño del formulario salen con la patrulla, y se dice. `null` si no hay.
 */
export const avisoAportadosEnRetiro = (grupo: readonly Operativo[]): string | null => {
  const aportados = grupo.filter(
    (operativo) => operativo.creadoPorRol !== operativo.formulario?.rolDueno,
  ).length;
  if (aportados === 0) return null;
  return `Incluye ${aportados} ${aportados === 1 ? "persona aportada" : "personas aportadas"} por DMIT · Instrucción`;
};

/**
 * El aviso tras retirar el registro (2026-10-31): «Operativo eliminado · N códigos retirados» y, si
 * alguno quedó desactivado por tener órdenes emitidas, se dice cuál.
 */
export const avisoRetiroDelRegistro = (
  resultado: ResultadoBajaDeRegistro,
): { variante: "exito" | "info"; texto: string } => {
  const retirados = `${resultado.retirados} ${resultado.retirados === 1 ? "código retirado" : "códigos retirados"}`;
  if (resultado.desactivados === 0) {
    return { variante: "exito", texto: `Operativo eliminado · ${retirados}` };
  }
  const desactivados = compactarIdentificadores(resultado.identificadoresDesactivados);
  return {
    variante: "info",
    texto: `Operativo eliminado · ${retirados} · ${resultado.desactivados} ${
      resultado.desactivados === 1 ? "queda" : "quedan"
    } desactivado${resultado.desactivados === 1 ? "" : "s"} por tener órdenes emitidas (${desactivados})`,
  };
};
