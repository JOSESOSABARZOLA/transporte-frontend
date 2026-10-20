/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: catalogos.util.ts
 * Responsabilidad: Las decisiones puras de P-08: duplicados, puntos activos por zonal, filtros y
 *                  el resumen de las zonales sin puntos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL DUPLICADO SE AVISA EN VIVO, PERO LO DECIDE EL SERVIDOR.
 *
 * `buscarDuplicado` compara contra lo que la pantalla ya tiene cargado, con la MISMA regla que el
 * servidor (sin tildes, mayúsculas ni espacios sobrantes) y el MISMO ámbito, que desde el
 * 2026-10-13 es SIEMPRE EL FORMULARIO: zonal, tipo e institución dentro de él, punto dentro de su
 * zonal. En formularios distintos el mismo nombre sí se permite. Sirve para que
 * «Guardar» se apague antes de enviar; el 409 `CATALOGO_DUPLICADO` sigue siendo la garantía
 * (otra persona pudo crear el mismo valor un minuto antes).
 *
 * «X DE N PUNTOS ACTIVOS» ES DEL FORMULARIO ELEGIDO, como todo lo de P-08: cada formulario tiene
 * su configuración propia y nada se comparte, copia ni vincula entre formularios (2026-10-13).
 *
 * AJUSTES DEL 2026-10-13: «sin puntos» deja de ser una alarma (texto gris) y el ámbar queda para la
 * zonal que tenía puntos y todos quedaron desactivados (`todosInactivos`). El interruptor «Solo
 * zonales con puntos en este formulario» filtra con `tienePuntos`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  Institucion,
  PuntoEncuentro,
  TipoControl,
} from "../interfaces/Formulario.ts";
import { normalizar } from "./texto.util.ts";

/** Sin tildes, mayúsculas ni espacios sobrantes, también los de en medio. Espejo del servidor. */
export const clave = (texto: string): string =>
  normalizar(texto).replace(/\s+/g, " ");

/** Vigente salvo que el servidor diga lo contrario (el registro no envía `activo`). */
export const estaActivo = (valor: { activo?: boolean }): boolean =>
  valor.activo !== false;

export type FiltroEstado = "todos" | "activos" | "inactivos";

/**
 * El orden de TODA la aplicación (estándar, 2026-10-15): lo vigente primero, lo retirado después y
 * «Todos» al final; la pantalla arranca en «Activos». Igual que Personal, Formularios y Flota.
 */
export const OPCIONES_ESTADO: { valor: FiltroEstado; nombre: string }[] = [
  { valor: "activos", nombre: "Activos" },
  { valor: "inactivos", nombre: "Inactivos" },
  { valor: "todos", nombre: "Todos" },
];

export const pasaEstado = (activo: boolean, filtro: FiltroEstado): boolean =>
  filtro === "todos" || (filtro === "activos" ? activo : !activo);

/** Lo que una zonal tiene EN ESTE FORMULARIO y si hay que avisar de que no aparecerá. */
export type ResumenZonal = {
  total: number;
  activos: number;
  /** Ningún punto en este formulario: se dice en gris, no es una alarma (es lo normal en muchas). */
  sinPuntos: boolean;
  /**
   * Activa, TENÍA puntos en este formulario y todos quedaron desactivados: el registro dejó de
   * ofrecerla sin que nadie lo decidiera. Es el único caso que lleva el aviso ámbar.
   */
  todosInactivos: boolean;
};

export const resumenZonal = (
  zonal: { id: number; activo?: boolean },
  puntos: PuntoEncuentro[],
): ResumenZonal => {
  const suyos = puntos.filter((punto) => punto.zonalId === zonal.id);
  const activos = suyos.filter(estaActivo).length;
  return {
    total: suyos.length,
    activos,
    sinPuntos: suyos.length === 0,
    todosInactivos: estaActivo(zonal) && suyos.length > 0 && activos === 0,
  };
};

/** Si la zonal tiene algún punto (vigente o no) en este formulario: lo que mira el interruptor. */
export const tienePuntos = (zonalId: number, puntos: PuntoEncuentro[]): boolean =>
  puntos.some((punto) => punto.zonalId === zonalId);

/**
 * «11 zonales con puntos · 55 de 63 puntos activos» con el interruptor «Solo zonales con puntos»
 * encendido; «13 zonales · …» apagado. Los puntos son siempre los del formulario.
 */
export const contadorPuntos = (
  zonales: number,
  puntos: PuntoEncuentro[],
  soloConPuntos = false,
): string => {
  const activos = puntos.filter(estaActivo).length;
  const rotulo = zonales === 1 ? "zonal" : "zonales";
  return `${zonales} ${rotulo}${soloConPuntos ? " con puntos" : ""} · ${activos} de ${puntos.length} puntos activos`;
};

/**
 * El resumen único sobre la lista: «2 zonales no tienen puntos en este formulario y están ocultas»
 * con el interruptor encendido; sin «y están ocultas» cuando se ven.
 */
export const textoSinPuntos = (cuantas: number, ocultas: boolean): string =>
  `${cuantas} ${cuantas === 1 ? "zonal no tiene" : "zonales no tienen"} puntos en este formulario${
    ocultas ? (cuantas === 1 ? " y está oculta" : " y están ocultas") : ""
  }`;

// ─────────────────────────── Duplicados ───────────────────────────

export type PropuestaCatalogo =
  | { tipo: "zonal"; nombre: string }
  | { tipo: "punto"; nombre: string; zonalId: number }
  | { tipo: "tipoControl"; nombre: string }
  | { tipo: "institucion"; sigla: string; nombre: string };

/** Lo que la pantalla tiene cargado para comparar: todo es del formulario que se administra. */
export type ExistentesCatalogo = {
  zonales: { id: number; nombre: string }[];
  puntos: PuntoEncuentro[];
  tiposControl: TipoControl[];
  instituciones: Institucion[];
};

/**
 * El mensaje del duplicado, o `null`. `excluirId` es el valor que se está editando: compararse
 * consigo mismo no es un duplicado. Los textos son los del servidor (409 CATALOGO_DUPLICADO).
 */
export const buscarDuplicado = (
  propuesta: PropuestaCatalogo,
  existentes: ExistentesCatalogo,
  excluirId: number | null = null,
): string | null => {
  const otro = <T extends { id: number }>(fila: T) => fila.id !== excluirId;

  switch (propuesta.tipo) {
    case "zonal": {
      const buscada = clave(propuesta.nombre);
      if (!buscada) return null;
      return existentes.zonales.some(
        (zonal) => otro(zonal) && clave(zonal.nombre) === buscada,
      )
        ? "Ya existe una zonal con ese nombre en este formulario."
        : null;
    }
    case "punto": {
      const buscada = clave(propuesta.nombre);
      if (!buscada) return null;
      const choque = existentes.puntos.find(
        (punto) =>
          otro(punto) &&
          punto.zonalId === propuesta.zonalId &&
          clave(punto.nombre) === buscada,
      );
      if (!choque) return null;
      const zonal = existentes.zonales.find((z) => z.id === propuesta.zonalId);
      return `Ya existe '${choque.nombre}' en ${zonal?.nombre ?? "esa zonal"}.`;
    }
    case "tipoControl": {
      const buscada = clave(propuesta.nombre);
      if (!buscada) return null;
      return existentes.tiposControl.some(
        (tipo) => otro(tipo) && clave(tipo.nombre) === buscada,
      )
        ? "Ya existe un tipo de control con ese nombre en este formulario."
        : null;
    }
    case "institucion": {
      const sigla = clave(propuesta.sigla);
      const nombre = clave(propuesta.nombre);
      const porSigla = sigla
        ? existentes.instituciones.find(
            (inst) => otro(inst) && clave(inst.sigla) === sigla,
          )
        : undefined;
      if (porSigla) return `Ya existe la sigla ${porSigla.sigla} en este formulario.`;
      const porNombre = nombre
        ? existentes.instituciones.find(
            (inst) => otro(inst) && clave(inst.nombre) === nombre,
          )
        : undefined;
      return porNombre
        ? `Ya existe una institución con la denominación «${porNombre.nombre}» en este formulario.`
        : null;
    }
  }
};

// ─────────────────────────── Búsqueda en zonales ───────────────────────────

/**
 * Las zonales que hay que ABRIR al buscar: las que tienen algún punto que coincide. Si coincide
 * el nombre de la zonal, se muestra entera (quien escribe «quitumbe» quiere ver Quitumbe).
 */
export const zonalesQueCoinciden = (
  zonales: { id: number; nombre: string }[],
  puntos: PuntoEncuentro[],
  busqueda: string,
): Set<number> => {
  const termino = clave(busqueda);
  if (!termino) return new Set();
  const ids = new Set<number>();
  for (const zonal of zonales) {
    if (clave(zonal.nombre).includes(termino)) ids.add(zonal.id);
  }
  for (const punto of puntos) {
    if (clave(punto.nombre).includes(termino)) ids.add(punto.zonalId);
  }
  return ids;
};

/** Lo que pide la dirección al entrar: un formulario elegido y, quizá, la barra de áreas abierta. */
export type PedidoCatalogos = { formulario: string | null; areasAbiertas: boolean };

/**
 * Lee `?formulario=<código o id>&areas=abierto` (2026-10-13): «Cambiar en Catálogos del cuadro →»
 * y el «Ir a Catálogos» tras crear un formulario llegan así, con ese formulario elegido y la barra
 * de áreas desplegada, porque aquí es el único sitio donde se editan.
 */
export const leerPedidoCatalogos = (busqueda: string): PedidoCatalogos => {
  const parametros = new URLSearchParams(busqueda);
  const formulario = parametros.get("formulario")?.trim() || null;
  return { formulario, areasAbiertas: parametros.get("areas") === "abierto" };
};

/** El código del formulario pedido, buscado por código o por id; `null` si no es de la lista. */
export const formularioPedido = (
  pedido: string | null,
  formularios: { id: number; codigo: string }[],
): string | null => {
  if (!pedido) return null;
  const encontrado = formularios.find(
    (uno) => uno.codigo.toUpperCase() === pedido.toUpperCase() || String(uno.id) === pedido,
  );
  return encontrado?.codigo ?? null;
};

/** Motivo por omisión cuando el servidor no dice por qué un valor no se puede eliminar. */
export const MOTIVO_NO_ELIMINAR = "Ya se usó en un cuadro: solo puede desactivarse.";
