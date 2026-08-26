/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Horarios
 * Archivo: horario.util.ts
 * Responsabilidad: Espejo de RangoHorario, **solo para experiencia de usuario**.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTE ARCHIVO NO DECIDE NADA. Es un espejo, y el original está en el servidor.
 *
 * `RangoHorario` de M-09 es el archivo de mayor riesgo del sistema: un defecto en el
 * cruce de medianoche no produce un error visible, produce un funcionario asignado a
 * dieciséis horas seguidas. La versión autorizada vive allí y **la verificación real
 * ocurre allí**.
 *
 * Lo que hace este archivo es evitarle al funcionario un viaje al servidor para
 * enterarse de que 08:15 no es una hora válida. Si alguna vez discrepan, **manda el
 * servidor**: aquí no se toma ninguna decisión que el backend no vuelva a tomar.
 *
 * Por eso no se copia el solapamiento ni la condición nocturna: son las dos operaciones
 * de las que depende una regla de descanso, y tenerlas aquí invitaría a usarlas para
 * decidir en lugar de para adelantar un aviso.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** RN-07. Horas completas y medias horas, nada más. */
const PATRON_HORA = /^([01][0-9]|2[0-3]):(00|30)$/;

const MINUTOS_POR_DIA = 1440;
const MINUTOS_POR_HORA = 60;

/** Si la hora respeta la granularidad de treinta minutos. */
export const esHoraValida = (hora: string): boolean => PATRON_HORA.test(hora);

/** `18:00` → `18H00`. La notación institucional del cuadro. */
export const comoHoraInstitucional = (hora: string): string =>
  hora.replace(":", "H");

/** `18:00` y `23:30` → `18H00 A 23H30`. */
export const comoHorario = (horaInicio: string, horaFin: string): string =>
  `${comoHoraInstitucional(horaInicio)} A ${comoHoraInstitucional(horaFin)}`;

/** La hora de fin es menor que la de inicio: el operativo termina al día siguiente. */
export const cruzaMedianoche = (horaInicio: string, horaFin: string): boolean =>
  aMinutos(horaFin) < aMinutos(horaInicio);

/**
 * Horas efectivas, contemplando el cruce de medianoche.
 *
 * Se muestra mientras el funcionario escribe, para que vea la duración antes de guardar.
 * El valor que se persiste es **el que calcula el servidor**.
 */
export const duracionEnHoras = (horaInicio: string, horaFin: string): number => {
  if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) return 0;

  const inicio = aMinutos(horaInicio);
  const fin = aMinutos(horaFin);

  if (inicio === fin) return 0;

  const minutos = inicio < fin ? fin - inicio : MINUTOS_POR_DIA - inicio + fin;

  return minutos / MINUTOS_POR_HORA;
};

/**
 * Motivo por el que el horario no sirve, o `null` si está bien.
 *
 * El texto acompaña al campo mientras se escribe; el rechazo definitivo, con su mensaje
 * definitivo, lo emite el servidor.
 */
export const motivoDeHorarioInvalido = (
  horaInicio: string,
  horaFin: string,
): string | null => {
  if (!esHoraValida(horaInicio)) {
    return "La hora de inicio debe ser una hora en punto o y media.";
  }

  if (!esHoraValida(horaFin)) {
    return "La hora de fin debe ser una hora en punto o y media.";
  }

  if (horaInicio === horaFin) {
    return "El horario no tiene duración: indique una hora de fin distinta a la de inicio.";
  }

  return null;
};

/** Las horas seleccionables, de 00:00 a 23:30. Para los desplegables de M-22. */
export const horasSeleccionables = (): string[] => {
  const horas: string[] = [];

  for (let minuto = 0; minuto < MINUTOS_POR_DIA; minuto += 30) {
    const hora = String(Math.floor(minuto / MINUTOS_POR_HORA)).padStart(2, "0");
    const resto = String(minuto % MINUTOS_POR_HORA).padStart(2, "0");
    horas.push(`${hora}:${resto}`);
  }

  return horas;
};

const aMinutos = (hora: string): number => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * MINUTOS_POR_HORA + minutos;
};
