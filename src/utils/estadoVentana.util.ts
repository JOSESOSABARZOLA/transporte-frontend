/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: estadoVentana.util.ts
 * Responsabilidad: Decir si una ventana de carga está abierta AHORA, y cuándo cierra o abre.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * ESPEJO DE `VentanaCargaEvaluador` DEL SERVIDOR (`common/auth/application/ventana-carga.evaluador.ts`)
 * para la pantalla de administración, que muestra las seis ventanas a la vez y no puede pedir el
 * estado de cada rol (`GET /ventanas/estado` solo responde por los roles de quien pregunta). Es
 * TEXTO, no decide nada: la guarda del servidor sigue siendo la autoridad.
 *
 *   · Se mide en la zona de la ventana (`minutosEnZona`), no en la del navegador.
 *   · Apertura vacía = desde las 00H00; cierre vacío = hasta el fin del día.
 *   · Cierre anterior a la apertura = la ventana cruza la medianoche.
 *   · LABORABLE: sábado y domingo cerrada; vuelve a abrir el lunes.
 *   · Una ventana heredada por DÍAS (semanal) no se adivina: `POR_DIAS`.
 */

import type { VentanaCarga } from "../interfaces/Administracion.ts";
import { comoHoraInstitucional } from "./mensajeVentana.util.ts";
import { minutosEnZona } from "./ventanaCarga.util.ts";

const MINUTOS_POR_DIA = 24 * 60;

/** Cuándo vuelve a abrir una ventana cerrada. */
export type CuandoAbre = "hoy" | "mañana" | "el lunes";

export type EstadoEnVivo =
  | { tipo: "SIN_RESTRICCION" }
  | { tipo: "POR_DIAS" }
  /** `cierraA` nulo = abierta hasta el fin del día. */
  | { tipo: "ABIERTA"; cierraA: string | null; faltaMin: number | null }
  | { tipo: "CERRADA"; abreA: string; cuando: CuandoAbre };

/** `HH:MM` a minutos desde medianoche. */
const aMinutos = (hora: string): number => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
};

/** 1 = lunes … 7 = domingo, en la zona dada. */
export const diaIsoEnZona = (zona: string, ahora: Date): number => {
  const nombre = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    weekday: "short",
  }).format(ahora);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(nombre) + 1;
};

/** El mismo `estaDentro` del servidor. */
const estaDentro = (
  actual: number,
  apertura: number | null,
  cierre: number | null,
): boolean => {
  if (apertura === null && cierre === null) return true;
  if (apertura === null) return actual < (cierre as number);
  if (cierre === null) return actual >= apertura;
  return apertura <= cierre
    ? actual >= apertura && actual < cierre
    : actual >= apertura || actual < cierre;
};

const sinRestriccion = (ventana: VentanaCarga): boolean =>
  !ventana.activo || ventana.tipo === "SIN_RESTRICCION";

/** El estado de la ventana en el instante `ahora`. */
export const estadoEnVivo = (
  ventana: VentanaCarga,
  ahora: Date = new Date(),
): EstadoEnVivo => {
  if (sinRestriccion(ventana)) return { tipo: "SIN_RESTRICCION" };
  if (ventana.diaApertura !== null || ventana.diaCierre !== null)
    return { tipo: "POR_DIAS" };

  const dia = diaIsoEnZona(ventana.zonaHoraria, ahora);
  const actual = minutosEnZona(ventana.zonaHoraria, ahora);
  const apertura =
    ventana.horaApertura === null ? null : aMinutos(ventana.horaApertura);
  const cierre =
    ventana.horaCierre === null ? null : aMinutos(ventana.horaCierre);
  const abreA = ventana.horaApertura ?? "00:00";
  const laborable = ventana.tipo === "LABORABLE";

  if (laborable && dia >= 6)
    return { tipo: "CERRADA", abreA, cuando: "el lunes" };

  if (estaDentro(actual, apertura, cierre)) {
    return {
      tipo: "ABIERTA",
      cierraA: ventana.horaCierre,
      faltaMin:
        cierre === null
          ? null
          : (cierre - actual + MINUTOS_POR_DIA) % MINUTOS_POR_DIA,
    };
  }

  // Cerrada: ¿abre más tarde hoy, o mañana? Antes de la apertura de hoy es «hoy».
  const abreHoy = apertura !== null && actual < apertura;
  if (abreHoy) return { tipo: "CERRADA", abreA, cuando: "hoy" };
  return {
    tipo: "CERRADA",
    abreA,
    cuando: laborable && dia === 5 ? "el lunes" : "mañana",
  };
};

/** «50 min», «2 h», «2 h 10 min». */
export const comoLapso = (minutos: number): string => {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
};

/**
 * El estado en dos partes (2026-10-24): la principal («Abierta · cierra 15H00») y el detalle
 * («(en 5 h 3 min)»), que la etiqueta pinta en dos líneas para no salirse de su borde.
 */
export const partesEstado = (
  estado: EstadoEnVivo,
): { principal: string; detalle: string | null } => {
  switch (estado.tipo) {
    case "SIN_RESTRICCION":
      return { principal: "Sin restricción", detalle: null };
    case "POR_DIAS":
      return { principal: "Según sus días", detalle: null };
    case "ABIERTA":
      return estado.cierraA === null
        ? { principal: "Abierta · sin hora de cierre", detalle: null }
        : {
            principal: `Abierta · cierra ${comoHoraInstitucional(estado.cierraA)}`,
            detalle: `(en ${comoLapso(estado.faltaMin ?? 0)})`,
          };
    case "CERRADA": {
      const cuando = estado.cuando === "hoy" ? "" : `${estado.cuando} `;
      return {
        principal: `Cerrada · abre ${cuando}${comoHoraInstitucional(estado.abreA)}`,
        detalle: null,
      };
    }
  }
};

/** «Abierta · cierra 15H00 (en 2 h)», «Cerrada · abre 00H00» o «Sin restricción», en una línea. */
export const textoEstado = (estado: EstadoEnVivo): string => {
  const { principal, detalle } = partesEstado(estado);
  return detalle ? `${principal} ${detalle}` : principal;
};

/**
 * Los tramos del día que pinta la barra de 24 h, en minutos [inicio, fin). Una ventana que cruza
 * la medianoche da dos; sin restricción, ninguno (la barra no pinta franja).
 */
export const franjasDelDia = (ventana: VentanaCarga): [number, number][] => {
  if (sinRestriccion(ventana)) return [];
  const inicio =
    ventana.horaApertura === null ? 0 : aMinutos(ventana.horaApertura);
  const fin =
    ventana.horaCierre === null
      ? MINUTOS_POR_DIA
      : aMinutos(ventana.horaCierre);
  if (inicio < fin) return [[inicio, fin]];
  return [
    [inicio, MINUTOS_POR_DIA],
    [0, fin],
  ];
};

/** «Desde 00H00 hasta 15H00», el detalle bajo el tipo. */
export const detalleDeHorario = (ventana: VentanaCarga): string => {
  if (sinRestriccion(ventana)) return "Sin restricción horaria";
  const desde = comoHoraInstitucional(ventana.horaApertura ?? "00:00");
  const hasta = ventana.horaCierre
    ? comoHoraInstitucional(ventana.horaCierre)
    : "24H00";
  return `Desde ${desde} hasta ${hasta}${ventana.tipo === "LABORABLE" ? ", de lunes a viernes" : ""}`;
};
