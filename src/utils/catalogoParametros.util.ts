/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: catalogoParametros.util.ts
 * Responsabilidad: Agrupar, buscar y filtrar los parámetros de política, y decir cuáles están
 *                  modificados o sin configurar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * Funciones puras sobre lo que devuelve el servidor y el catálogo de `config/catalogoParametros.ts`.
 * Los filtros miran el valor GUARDADO, no el borrador: «Modificados» son los que difieren de su
 * siembra en la base, y un cambio a medio escribir no hace aparecer ni desaparecer una fila.
 */

import {
  CATALOGO_PARAMETROS,
  GRUPOS_PARAMETROS,
  type EntradaCatalogo,
  type GrupoParametros,
} from "../config/catalogoParametros.ts";
import type { ParametroPolitica } from "../interfaces/Administracion.ts";

export type FiltroParametros = "todos" | "modificados" | "sinConfigurar";

const SIN_CONFIGURAR = "SIN_CONFIGURAR";

/** Orden de las claves dentro de su grupo: el del catálogo. */
const ORDEN = new Map(
  Object.keys(CATALOGO_PARAMETROS).map((clave, indice) => [clave, indice]),
);

/** La entrada del catálogo; sin ella, «Otros» con el código como etiqueta. */
export const entradaDe = (clave: string): EntradaCatalogo =>
  CATALOGO_PARAMETROS[clave] ?? { grupo: "otros", etiqueta: clave, afecta: [] };

/** ¿Difiere de su siembra? Sin siembra conocida, nunca está «modificado». */
export const estaModificado = (
  parametro: ParametroPolitica,
  valor: string = parametro.valor,
): boolean =>
  parametro.valorSiembra !== null && valor.trim() !== parametro.valorSiembra;

/** «Sin configurar»: el valor que apaga una regla mientras el negocio no la fija. */
export const sinConfigurar = (valor: string): boolean =>
  valor.trim().toUpperCase() === SIN_CONFIGURAR;

/** Minúsculas y sin tildes, para buscar como escribe la gente. */
const normalizar = (texto: string): string =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca en la etiqueta, el código y la descripción; y aplica el filtro. */
export const filtrarParametros = (
  parametros: readonly ParametroPolitica[],
  texto: string,
  filtro: FiltroParametros,
): ParametroPolitica[] => {
  const buscado = normalizar(texto.trim());
  return parametros.filter((parametro) => {
    if (filtro === "modificados" && !estaModificado(parametro)) return false;
    if (filtro === "sinConfigurar" && !sinConfigurar(parametro.valor))
      return false;
    if (!buscado) return true;
    const donde = `${entradaDe(parametro.clave).etiqueta} ${parametro.clave} ${parametro.descripcion}`;
    return normalizar(donde).includes(buscado);
  });
};

export interface GrupoConParametros {
  grupo: GrupoParametros;
  parametros: ParametroPolitica[];
}

/** Los grupos con al menos un parámetro, en el orden del catálogo; «Otros», al final. */
export const agruparParametros = (
  parametros: readonly ParametroPolitica[],
): GrupoConParametros[] =>
  GRUPOS_PARAMETROS.map((grupo) => ({
    grupo,
    parametros: parametros
      .filter((parametro) => entradaDe(parametro.clave).grupo === grupo.id)
      .sort(
        (a, b) =>
          (ORDEN.get(a.clave) ?? Number.MAX_SAFE_INTEGER) -
            (ORDEN.get(b.clave) ?? Number.MAX_SAFE_INTEGER) ||
          a.clave.localeCompare(b.clave),
      ),
  })).filter((grupo) => grupo.parametros.length > 0);

/**
 * «Nombre · dd/mm/aaaa», o «Valor de siembra» si nadie lo tocó. El nombre lo resuelve el servidor
 * con `t_usuario`; si esa cuenta no existe (la siembra de agosto firmó con una cuenta de prueba que
 * esta base no tiene), «Autor no registrado»: nunca «Cuenta N» (2026-10-24).
 */
export const textoUltimaModificacion = (
  parametro: ParametroPolitica,
): string => {
  if (parametro.modificadoPor === null) return "Valor de siembra";
  // La fecha de Quito, no la UTC: un cambio a las 20H00 es de ese día, no del siguiente.
  const fecha = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(parametro.modificadoEn));
  const quien =
    parametro.modificadoPorNombre ?? "Autor no registrado";
  return `${quien} · ${fecha}`;
};
