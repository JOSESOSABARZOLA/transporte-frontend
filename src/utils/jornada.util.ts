/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cuadro diario
 * Archivo: jornada.util.ts
 * Responsabilidad: Proponer qué jornada se está armando cuando nadie ha elegido una.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-11
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA JORNADA QUE SE ARMA HOY ES LA DE MAÑANA.
 *
 * El cuadro es el compilado de los operativos que la AMC ejecutará **al día siguiente**:
 * el administrador abre el cuadro del día siguiente y los tres departamentos lo cargan
 * esa misma tarde, hasta las 15H00. La DAF asigna transporte a continuación, sobre ese
 * mismo cuadro. Fuentes: `CLAUDE.md` §1 del backend, `docs/final/02_Manual_Operativo.md`
 * §1 y FASE2 §5.
 *
 * El modelo lo confirma: `t_operativo` **no tiene fecha propia**, cuelga de `cuad_id`.
 * La fecha del cuadro ES el día en que el operativo se ejecuta, no el día en que se
 * capturó. Proponer hoy pedía una jornada que nadie abre.
 *
 * ES UN VALOR POR DEFECTO, NO UNA IMPOSICIÓN, y por eso las pantallas dejan cambiarlo.
 * Qué jornada corresponde la víspera de un sábado o de un feriado **no está definido**:
 * el calendario laboral de la AMC no consta en ninguna fuente. Adelantar al lunes por
 * nuestra cuenta sería inventar una regla; proponer mañana y dejar elegir, no.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { DatetimeUtil } from "./datetime.util.ts";

/**
 * La fecha de la jornada que se propone al abrir una pantalla de captura, `AAAA-MM-DD`.
 *
 * SE CALCULA EN HORA LOCAL, y es deliberado. `setDate` sobre una copia resuelve el fin
 * de mes y el fin de año sin aritmética propia, y `DatetimeUtil.formatDate` formatea en
 * el huso del navegador: con `toISOString()` la fecha saltaría un día a partir de las
 * 19H00 en Quito —UTC−5— y el operativo entraría en el cuadro equivocado.
 */
export const fechaDeJornadaPorDefecto = (hoy: Date = new Date()): string => {
  const jornada = new Date(hoy);
  jornada.setDate(jornada.getDate() + 1);

  return DatetimeUtil.formatDate(jornada);
};

/** Hoy, `AAAA-MM-DD`, en hora local. Mismo criterio que la función anterior. */
export const fechaDeHoy = (ahora: Date = new Date()): string =>
  DatetimeUtil.formatDate(ahora);

/**
 * Si esa jornada se abrirá sola al registrar el primer operativo.
 *
 * REGLA DEL 2026-08-11. El servidor abre la jornada al registrar, salvo que la fecha ya
 * haya pasado. La pantalla necesita saberlo **antes** de guardar: hasta esta fecha una
 * jornada inexistente deshabilitaba el formulario, de modo que el registro que iba a
 * abrirla no se podía llegar a hacer. La comprobación se repite aquí porque es la que
 * decide si los campos se habilitan; la que manda sigue siendo la del servidor.
 *
 * Se comparan cadenas `AAAA-MM-DD`, donde el orden alfabético es el cronológico.
 */
export const laJornadaSeAbriraSola = (
  fecha: string,
  hoy: string = fechaDeHoy(),
): boolean => fecha >= hoy;

/** «AAAA-MM-DD» bien formada (regla 12: la fecha de calendario viaja como texto). 2026-10-06. */
export const esFechaDeCalendario = (valor: string | null | undefined): valor is string =>
  typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);

/**
 * «2026-10-07» + 7 → «2026-10-14». En UTC a propósito: la fecha de calendario no tiene huso y
 * así no se desplaza un día en Quito (regla 12). 2026-10-06.
 */
export const sumarDias = (fecha: string, dias: number): string => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
};
