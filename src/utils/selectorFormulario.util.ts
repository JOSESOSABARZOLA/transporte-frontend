/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: selectorFormulario.util.ts
 * Responsabilidad: Reglas puras del selector de formulario de P-01: qué se ofrece, cómo se busca y
 *                  se agrupa, los recientes y la línea de ayuda de cada formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SELECTOR ÚNICO EN LUGAR DE LA REJILLA DE BOTONES (R10 del plan «registro-operativo-rediseno»).
 * La rejilla crecía con cada formulario nuevo; el selector se busca por número, nombre o código y
 * agrupa por el departamento dueño.
 *
 * LOS RECIENTES VAN EN `localStorage`, Y SOLO SUS IDENTIFICADORES (R5). Es la única excepción a la
 * regla de no persistir en disco de esta pantalla (regla 15): un número de formulario no es un dato
 * personal ni operativo. El borrador, que sí lo es, sigue en `sessionStorage`.
 *
 * LA LÍNEA DE AYUDA SE ARMA CON DATOS DEL FORMULARIO, no con textos por formulario: nada se dice que
 * el servidor no declare (condicionante nocturno, política de vehículo, transporte sugerido).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Formulario } from "../interfaces/Formulario.ts";
import type { RolDepartamental } from "../config/env.ts";
import { NOMBRE_DIRECCION } from "./personal.util.ts";
import { normalizar } from "./texto.util.ts";
import { nombreTipoTransporte } from "./tipoTransporte.util.ts";

/** Cuántos recientes se muestran junto al selector. */
export const MAXIMO_RECIENTES = 3;

/** El departamento dueño, como lo nombra el cuadro («DMIP · Unidad de Operativos»). */
const ETIQUETA_DEPARTAMENTO: Partial<Record<RolDepartamental, string>> = {
  DMIP_OPERATIVOS: "DMIP · Unidad de Operativos",
  DMIP_INSPECCIONES: "DMIP · Inspecciones Técnicas y Generales",
  DMIT_INSTRUCTOR: "DMIT · Instrucción",
};

export const etiquetaDepartamento = (rol: RolDepartamental): string =>
  ETIQUETA_DEPARTAMENTO[rol] ?? NOMBRE_DIRECCION[rol];

/**
 * Lo que se ofrece: lo que el rol registra (`ESCRITURA`) y aquello a lo que aporta personal
 * (`COMPARTIDO`, PER-06). `LECTURA` no se pinta. El orden es el del servidor (el del cuadro).
 */
export const formulariosOfrecidos = (formularios: Formulario[]): Formulario[] =>
  formularios.filter(
    (formulario) => formulario.acceso === "ESCRITURA" || formulario.acceso === "COMPARTIDO",
  );

/**
 * Lo que se le explica a quien no tiene nada que registrar: ningún formulario, o solo compartidos
 * (aporta personal y no registra). Con algún propio, nada.
 */
export const avisoDeOfrecidos = (formularios: Formulario[]): string | null => {
  const ofrecidos = formulariosOfrecidos(formularios);
  if (ofrecidos.length === 0) {
    return "Su perfil no registra operativos en ningún formulario del cuadro.";
  }
  if (!ofrecidos.some((formulario) => formulario.acceso === "ESCRITURA")) {
    return "Su perfil no registra operativos, pero aporta personal a los formularios marcados «Aporta personal». Elíjalos en el selector para asignar a su gente.";
  }
  return null;
};

/** Búsqueda por número, nombre o código, sin tildes ni mayúsculas. Vacía: todos. */
export const filtrarFormularios = (formularios: Formulario[], texto: string): Formulario[] => {
  const buscado = normalizar(texto.trim());
  if (buscado === "") return formularios;
  return formularios.filter((formulario) =>
    [String(formulario.numero), formulario.nombre, formulario.codigo].some((campo) =>
      normalizar(campo).includes(buscado),
    ),
  );
};

export type GrupoFormularios = {
  dueno: RolDepartamental;
  etiqueta: string;
  formularios: Formulario[];
};

/** Agrupa por departamento dueño, en el orden en que aparece el primero de cada uno. */
export const agruparPorDueno = (formularios: Formulario[]): GrupoFormularios[] => {
  const grupos: GrupoFormularios[] = [];
  for (const formulario of formularios) {
    let grupo = grupos.find((candidato) => candidato.dueno === formulario.rolDueno);
    if (!grupo) {
      grupo = {
        dueno: formulario.rolDueno,
        etiqueta: etiquetaDepartamento(formulario.rolDueno),
        formularios: [],
      };
      grupos.push(grupo);
    }
    grupo.formularios.push(formulario);
  }
  return grupos;
};

/** El conteo «N hoy» por formulario, a partir de `GET /operativos/conteo`. */
export const mapaDeConteos = (
  filas: { formularioId: number; total: number }[],
): Map<number, number> => new Map(filas.map((fila) => [fila.formularioId, fila.total]));

const claveRecientes = (usuarioId: number) => `sigoc.cuadro.recientes.v1.${usuarioId}`;

/** Los recientes guardados, del más nuevo al más viejo. Si el almacenamiento falla, ninguno. */
export const leerRecientes = (usuarioId: number): number[] => {
  try {
    const crudo = window.localStorage.getItem(claveRecientes(usuarioId));
    if (!crudo) return [];
    const ids: unknown = JSON.parse(crudo);
    return Array.isArray(ids) ? ids.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
};

/**
 * Anota un formulario como el más reciente y devuelve la lista nueva. Se guardan uno más que los
 * que se muestran, porque el actual no se muestra.
 */
export const anotarReciente = (usuarioId: number, actuales: number[], id: number): number[] => {
  const lista = [id, ...actuales.filter((otro) => otro !== id)].slice(0, MAXIMO_RECIENTES + 1);
  try {
    window.localStorage.setItem(claveRecientes(usuarioId), JSON.stringify(lista));
  } catch {
    // Sin almacenamiento (navegación privada, cuota): los recientes viven solo en memoria.
  }
  return lista;
};

/** Los recientes que se pintan: sin el actual, solo los que el rol aún puede abrir, hasta tres. */
export const recientesVisibles = (
  ids: number[],
  ofrecidos: Formulario[],
  actualId: number | null,
): Formulario[] =>
  ids
    .filter((id) => id !== actualId)
    .map((id) => ofrecidos.find((formulario) => formulario.id === id))
    .filter((formulario): formulario is Formulario => formulario !== undefined)
    .slice(0, MAXIMO_RECIENTES);

/** La línea de ayuda del formulario, con lo que declara el servidor. Sin nada que decir, vacía. */
export const lineaDeAyuda = (formulario: Formulario): string[] => {
  const frases: string[] = [];
  if (formulario.condicionanteNocturno) {
    frases.push(
      "Este formulario exige conductor si el horario entra en la franja nocturna. La DAF lo asignará antes del cierre.",
    );
  }
  if (formulario.politicaVehiculo === "REQUERIDO" || formulario.politicaVehiculo === "OBLIGATORIO") {
    frases.push("Este formulario siempre requiere vehículo.");
  }
  if (formulario.tipoTransportePorDefecto) {
    frases.push(`Transporte sugerido: ${nombreTipoTransporte(formulario.tipoTransportePorDefecto)}.`);
  }
  return frases;
};
