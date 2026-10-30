/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro por zonas del formulario 8
 * Archivo: registroPorZonas.util.ts
 * Responsabilidad: Reglas puras del bloque «3 · Zonas»: zona principal, agregar zona, zonales ya
 *                  usadas, vista previa de los identificadores, lo que falta y el cuerpo del envío.
 * Fecha: 2026-10-28
 *
 * Un registro del 8 es UNA persona de UN tipo que atiende una o más zonales en el mismo horario.
 * Cada zona lleva su zonal, su punto, sus instituciones, su tipo de control y su cantidad de
 * identificadores; persona, horario, transporte y observaciones son comunes. La zona principal
 * (origen del transporte para la DAF) es la de la zonal del Maestro y, si no está, la Zona 1:
 * espejo de `indiceZonaPrincipal` del servidor (operativos/domain/registro-por-zonas.ts).
 */

import type { Operativo, ZonaDelRegistro } from "../interfaces/Operativo.ts";

/** Una zona tal como se captura (puede estar a medias). */
export type ZonaCaptura = {
  zonalId: number | null;
  puntoId: number | null;
  cantidad: number;
  institucionIds: number[];
  tipoControlIds: number[];
};

/** Tope de identificadores por zona: el mismo del servidor. */
export const MAX_CANTIDAD_POR_ZONA = 50;

export const zonaVacia = (): ZonaCaptura => ({
  zonalId: null,
  puntoId: null,
  cantidad: 1,
  institucionIds: [],
  tipoControlIds: [],
});

/** La principal: la de la zonal del Maestro; si no está entre las elegidas, la Zona 1. */
export const indiceZonaPrincipal = (
  zonas: readonly { zonalId: number | null }[],
  zonalDelMaestro: number | null | undefined,
): number => {
  if (zonalDelMaestro == null) return 0;
  const indice = zonas.findIndex((zona) => zona.zonalId === zonalDelMaestro);
  return indice >= 0 ? indice : 0;
};

/** «+ Agregar zona»: cantidad 1 y las instituciones y el tipo de control de la anterior. */
export const agregarZona = (zonas: readonly ZonaCaptura[]): ZonaCaptura[] => {
  const anterior = zonas[zonas.length - 1];
  return [
    ...zonas,
    {
      ...zonaVacia(),
      institucionIds: [...(anterior?.institucionIds ?? [])],
      tipoControlIds: [...(anterior?.tipoControlIds ?? [])],
    },
  ];
};

/** Las zonales que ya usa OTRA zona: en el selector de la zona `indice` se ven deshabilitadas. */
export const zonalesUsadasPorOtras = (
  zonas: readonly ZonaCaptura[],
  indice: number,
): Set<number> =>
  new Set(
    zonas
      .filter((zona, i) => i !== indice && zona.zonalId !== null)
      .map((zona) => zona.zonalId as number),
  );

/** La cantidad, siempre entre 1 y el tope. */
export const cantidadAcotada = (cantidad: number): number =>
  Math.min(MAX_CANTIDAD_POR_ZONA, Math.max(1, Math.trunc(cantidad) || 1));

export const totalDeIdentificadores = (
  zonas: readonly { cantidad: number }[],
): number => zonas.reduce((total, zona) => total + zona.cantidad, 0);

/** `IG` y 30 → `IG-030`. */
export const identificadorDeVista = (prefijo: string, numero: number): string =>
  `${prefijo}-${String(numero).padStart(3, "0")}`;

/** «IG-030 a IG-042» o «IG-043». */
export const textoDeRango = (
  prefijo: string,
  desde: number,
  cantidad: number,
): string =>
  cantidad <= 1
    ? identificadorDeVista(prefijo, desde)
    : `${identificadorDeVista(prefijo, desde)} a ${identificadorDeVista(prefijo, desde + cantidad - 1)}`;

/**
 * Los números de VISTA PREVIA de cada zona: la numeración avanza zona por zona desde `siguiente`.
 * Son orientativos: los asigna el servidor al registrar.
 */
export const rangosDeVistaPrevia = (
  zonas: readonly { cantidad: number }[],
  prefijo: string,
  siguiente: number,
): string[] => {
  let desde = siguiente;
  return zonas.map((zona) => {
    const texto = textoDeRango(prefijo, desde, zona.cantidad);
    desde += zona.cantidad;
    return texto;
  });
};

/**
 * «Se generarán 14 identificadores: La Delicia 13 (IG-030 a IG-042) · Calderón 1 (IG-043).»
 * Sin la vista previa (no llegó el número), solo las cantidades.
 */
export const resumenDeZonas = (
  zonas: readonly ZonaCaptura[],
  nombreDeZonal: (zonalId: number | null) => string,
  rangos: readonly string[] | null,
): string => {
  const total = totalDeIdentificadores(zonas);
  const partes = zonas.map(
    (zona, i) =>
      `${nombreDeZonal(zona.zonalId)} ${zona.cantidad}${rangos ? ` (${rangos[i]})` : ""}`,
  );
  return `Se generarán ${total} ${total === 1 ? "identificador" : "identificadores"}: ${partes.join(" · ")}.`;
};

/** Lo que le falta a cada zona, nombrado por su número: «Zona 2: tipo de control». */
export const faltantesDeZonas = (zonas: readonly ZonaCaptura[]): string[] =>
  zonas.flatMap((zona, i) => {
    const falta: string[] = [];
    if (zona.zonalId === null) falta.push("zonal");
    if (zona.puntoId === null) falta.push("punto de encuentro");
    if (zona.institucionIds.length === 0) falta.push("instituciones");
    if (zona.tipoControlIds.length === 0) falta.push("tipo de control");
    return falta.length === 0 ? [] : [`Zona ${i + 1}: ${falta.join(", ")}`];
  });

/** Texto del faltante cuando no hay persona elegida. */
export const FALTA_PERSONA = "tipo de personal y persona";

/** «Listo para registrar · 1 persona · Completo · 2 zonas · 14 identificadores». */
export const textoListoPorZonas = (
  transporte: string,
  zonas: readonly ZonaCaptura[],
): string => {
  const total = totalDeIdentificadores(zonas);
  return `Listo para registrar · 1 persona · ${transporte} · ${zonas.length} ${
    zonas.length === 1 ? "zona" : "zonas"
  } · ${total} ${total === 1 ? "identificador" : "identificadores"}`;
};

/** Las zonas completas, en el cuerpo que espera el servidor. */
export const comoZonasDelRegistro = (
  zonas: readonly ZonaCaptura[],
): ZonaDelRegistro[] =>
  zonas.map((zona) => ({
    zonalId: zona.zonalId as number,
    puntoId: zona.puntoId as number,
    cantidad: zona.cantidad,
    institucionIds: [...zona.institucionIds],
    tipoControlIds: [...zona.tipoControlIds],
  }));

/**
 * LAS ZONAS DE UN REGISTRO YA GUARDADO, para editarlo (2026-10-28). Un identificador lleva una
 * sola zonal; se agrupan por ella en el orden de su primer número (así la Zona 1 sigue siendo la
 * primera que se numeró), con el punto, las instituciones y los tipos del primero.
 */
export const zonasDeLosOperativos = (
  operativos: readonly Operativo[],
): ZonaCaptura[] => {
  const porNumero = [...operativos].sort((a, b) => a.secuencial - b.secuencial);
  const zonas = new Map<number | null, ZonaCaptura>();
  for (const operativo of porNumero) {
    const zonalId = operativo.zonales[0]?.id ?? null;
    const existente = zonas.get(zonalId);
    if (existente) {
      existente.cantidad += 1;
      continue;
    }
    zonas.set(zonalId, {
      zonalId,
      puntoId: operativo.puntoEncuentro?.id ?? null,
      cantidad: 1,
      institucionIds: operativo.instituciones.map(
        (institucion) => institucion.id,
      ),
      tipoControlIds: (operativo.tiposControl ?? []).map((tipo) => tipo.id),
    });
  }
  return [...zonas.values()];
};
