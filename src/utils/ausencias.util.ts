/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: ausencias.util.ts
 * Responsabilidad: Reglas puras de las ausencias: rango, solape, días, estado y formato de fecha.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SON EL ESPEJO DEL SERVIDOR PARA EL MENSAJE EN VIVO, NO LA REGLA. El rango y el solape los
 * vuelve a comprobar el servidor (400 / 409 `AUSENCIA_SOLAPADA`), que conoce también los periodos
 * que otro administrador acabe de registrar; aquí solo se adelanta el aviso mientras se teclea.
 *
 * FECHAS DE CALENDARIO COMO TEXTO `AAAA-MM-DD` (regla 12). Se comparan cadenas —en ese formato el
 * orden alfabético es el cronológico— y los días se cuentan con `Date.UTC`, nunca con la hora
 * local: en Quito (UTC−5) un `new Date("2026-10-09")` cae el día 8.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { TramoAfectado } from "../interfaces/Flota.ts";
import type { MomentoAusencia } from "../interfaces/Personal.ts";

/** Lo mínimo de un periodo para estas reglas: sus dos extremos, incluidos. */
export type Periodo = { desde: string; hasta: string };

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `AAAA-MM-DD` → `dd/mm/aaaa`. Lo que no tenga ese formato se devuelve tal cual. */
export const fechaLarga = (fecha: string): string => {
  const partes = PATRON_FECHA.exec(fecha);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : fecha;
};

/** `AAAA-MM-DD` → `dd/mm`, para el distintivo de la lista («Ausente 12/10–23/10»). */
export const fechaCorta = (fecha: string): string => {
  const partes = PATRON_FECHA.exec(fecha);
  return partes ? `${partes[3]}/${partes[2]}` : fecha;
};

/** Días de calendario entre dos fechas, AMBAS INCLUIDAS. Rango inválido → 0. */
export const diasDelPeriodo = ({ desde, hasta }: Periodo): number => {
  const a = PATRON_FECHA.exec(desde);
  const b = PATRON_FECHA.exec(hasta);
  if (!a || !b || hasta < desde) return 0;
  const inicio = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const fin = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((fin - inicio) / 86_400_000) + 1;
};

/** Si dos periodos comparten al menos un día (extremos incluidos). INV-14. */
export const seSolapan = (a: Periodo, b: Periodo): boolean =>
  a.desde <= b.hasta && b.desde <= a.hasta;

/**
 * Dónde cae una ausencia respecto de `hoy`. Espejo de la política del servidor
 * (`estadoDeAusencia`); la lista usa el `momento` que ya viene calculado y esto cubre lo demás.
 */
export const estadoDeAusencia = (
  { desde, hasta }: Periodo,
  hoy: string,
): MomentoAusencia =>
  hasta < hoy ? "PASADA" : desde > hoy ? "PROXIMA" : "EN_CURSO";

/** Lo que el modal dice bajo el formulario mientras se escriben las fechas. */
export type DiagnosticoRango =
  | { tipo: "incompleto" }
  | { tipo: "invertido" }
  | { tipo: "solapado"; con: Periodo }
  | { tipo: "valido"; dias: number };

/**
 * Diagnóstico del rango que se está capturando contra las ausencias ya registradas.
 * Orden: falta una fecha → termina antes de empezar → se cruza con otra → válido.
 */
export const diagnosticarRango = (
  propuesto: { desde: string; hasta: string },
  registradas: Periodo[],
): DiagnosticoRango => {
  if (!PATRON_FECHA.test(propuesto.desde) || !PATRON_FECHA.test(propuesto.hasta)) {
    return { tipo: "incompleto" };
  }
  if (propuesto.hasta < propuesto.desde) return { tipo: "invertido" };
  const choca = registradas.find((periodo) => seSolapan(periodo, propuesto));
  if (choca) return { tipo: "solapado", con: choca };
  return { tipo: "valido", dias: diasDelPeriodo(propuesto) };
};

/**
 * La ausencia que la lista muestra bajo el estado: la EN CURSO; si no hay, la PRÓXIMA más cercana.
 * Las pasadas no se muestran. `null` si no tiene ninguna.
 */
export const ausenciaAMostrar = <T extends Periodo>(
  ausencias: T[],
  hoy: string,
): T | null => {
  const enCurso = ausencias.find(
    (periodo) => estadoDeAusencia(periodo, hoy) === "EN_CURSO",
  );
  if (enCurso) return enCurso;
  const proximas = ausencias
    .filter((periodo) => estadoDeAusencia(periodo, hoy) === "PROXIMA")
    .sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0));
  return proximas[0] ?? null;
};

/** Nombre visible de cada momento (regla 6: el color del distintivo acompaña al texto). */
export const NOMBRE_MOMENTO: Record<MomentoAusencia, string> = {
  EN_CURSO: "En curso",
  PROXIMA: "Próxima",
  PASADA: "Pasada",
};

/** Variante de distintivo de cada momento: ámbar, azul y gris. */
export const VARIANTE_MOMENTO: Record<MomentoAusencia, string> = {
  EN_CURSO: "badge-warning",
  PROXIMA: "badge-info",
  PASADA: "badge-ghost",
};

/** A5: el aviso de los tramos que la ausencia NO retira. */
export const textoTramosAfectados = (
  tramos: TramoAfectado[],
  desde: string,
  hasta: string,
): string | null => {
  if (tramos.length === 0) return null;
  const lista = tramos
    .map(
      (tramo) =>
        `${tramo.identificador} el ${fechaLarga(tramo.fecha)} (${tramo.horaInicio}–${tramo.horaFin})`,
    )
    .join(", ");
  const cuantos = tramos.length === 1 ? "un tramo asignado" : `${tramos.length} tramos asignados`;
  return `Tiene ${cuantos} entre el ${fechaLarga(desde)} y el ${fechaLarga(hasta)}: ${lista}. La ausencia no ${
    tramos.length === 1 ? "lo retira; reasígnelo" : "los retira; reasígnelos"
  } en Planificar el día.`;
};
