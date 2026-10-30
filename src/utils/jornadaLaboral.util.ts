/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: jornadaLaboral.util.ts
 * Responsabilidad: Nombrar una jornada laboral y validar su captura, en UN solo lugar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 *
 * ESPEJO DE `talento-operativo/domain/jornada-laboral.ts` DEL SERVIDOR para los textos (los mismos
 * días en palabras) y de `jornadas-laborales.service.ts` para la validación del cajón. El servidor
 * sigue siendo la autoridad: esto solo evita ofrecer lo que rechazaría.
 */

import type { GuardarJornadaLaboral, JornadaLaboral } from "../interfaces/JornadaLaboral.ts";

/** Los días, en orden ISO (1 = lunes … 7 = domingo), con su letra y su nombre. */
export const DIAS_SEMANA: readonly { dia: number; letra: string; nombre: string }[] = [
  { dia: 1, letra: "L", nombre: "lunes" },
  { dia: 2, letra: "M", nombre: "martes" },
  { dia: 3, letra: "X", nombre: "miércoles" },
  { dia: 4, letra: "J", nombre: "jueves" },
  { dia: 5, letra: "V", nombre: "viernes" },
  { dia: 6, letra: "S", nombre: "sábado" },
  { dia: 7, letra: "D", nombre: "domingo" },
];

const nombreDia = (dia: number): string => DIAS_SEMANA.find((d) => d.dia === dia)?.nombre ?? "";

/** `08:00` → `08H00`. */
const institucional = (hora: string): string => hora.replace(":", "H");

/** «lunes a viernes», «sábado y domingo», «lunes, miércoles y viernes». */
export function textoDias(dias: readonly number[]): string {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b);
  if (ordenados.length === 0) return "";
  const seguidos = ordenados.every((dia, i) => i === 0 || dia === ordenados[i - 1] + 1);
  if (seguidos && ordenados.length > 2) {
    return `${nombreDia(ordenados[0])} a ${nombreDia(ordenados[ordenados.length - 1])}`;
  }
  const nombres = ordenados.map(nombreDia);
  return nombres.length === 1
    ? nombres[0]
    : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** «08H00 a 16H00», o «Sin horario · a cualquier hora». */
export const textoHorario = (jornada: Pick<JornadaLaboral, "horaInicio" | "horaFin">): string =>
  jornada.horaInicio && jornada.horaFin
    ? `${institucional(jornada.horaInicio)} a ${institucional(jornada.horaFin)}`
    : "Sin horario · a cualquier hora";

/** La jornada en una línea, bajo el combo: «Lunes a viernes, de 08H00 a 16H00». */
export function textoJornada(jornada: Pick<JornadaLaboral, "dias" | "horaInicio" | "horaFin">): string {
  const dias = textoDias(jornada.dias);
  const conMayuscula = dias.charAt(0).toUpperCase() + dias.slice(1);
  return jornada.horaInicio && jornada.horaFin
    ? `${conMayuscula}, de ${institucional(jornada.horaInicio)} a ${institucional(jornada.horaFin)}`
    : `${conMayuscula}, a cualquier hora`;
}

/** El nombre de la jornada de un id, o `null` si no tiene (o si el catálogo aún no llegó). */
export const nombreDeJornada = (
  id: number | null | undefined,
  jornadas: readonly JornadaLaboral[],
): string | null => (id == null ? null : (jornadas.find((j) => j.id === id)?.nombre ?? null));

/** Las que se pueden elegir: las activas, más la actual de la ficha aunque se haya desactivado. */
export const jornadasElegibles = (
  jornadas: readonly JornadaLaboral[],
  actualId?: number | null,
): JornadaLaboral[] => jornadas.filter((j) => j.activo || j.id === actualId);

const PATRON_HORA = /^([01]\d|2[0-3]):(00|30)$/;

/** Los errores de captura del cajón, por campo. Vacío = se puede guardar. */
export function erroresDeJornada(
  datos: GuardarJornadaLaboral,
  otras: readonly JornadaLaboral[],
  idActual?: number,
): Partial<Record<"nombre" | "dias" | "horario", string>> {
  const errores: Partial<Record<"nombre" | "dias" | "horario", string>> = {};
  const nombre = datos.nombre.trim().replace(/\s+/g, " ");
  if (nombre.length < 3 || nombre.length > 80) {
    errores.nombre = "El nombre de la jornada tiene de 3 a 80 caracteres.";
  } else if (
    otras.some((j) => j.id !== idActual && j.nombre.toLowerCase() === nombre.toLowerCase())
  ) {
    errores.nombre = "Ya existe una jornada laboral con ese nombre.";
  }
  if (datos.dias.length === 0) errores.dias = "Elija al menos un día de la semana.";
  const { horaInicio, horaFin } = datos;
  if ((horaInicio === null) !== (horaFin === null)) {
    errores.horario = "Indique las dos horas del horario.";
  } else if (horaInicio && horaFin) {
    if (!PATRON_HORA.test(horaInicio) || !PATRON_HORA.test(horaFin)) {
      errores.horario = "Las horas se escriben HH:MM, en punto o y media.";
    } else if (horaInicio === horaFin) {
      errores.horario = "La hora de inicio y la de fin no pueden ser la misma.";
    }
  }
  return errores;
}
