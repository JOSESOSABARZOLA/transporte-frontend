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

/**
 * `08:00` → `08:00 AM`, `13:00` → `13:00 PM`, `22:30` → `22:30 PM`, `00:00` → `00:00 AM`
 * (2026-09-09). MANTIENE la hora de 24 h y solo le añade el meridiano —AM antes del mediodía,
 * PM del mediodía en adelante—, a petición del negocio: las tardes se leen 13, 14… 23, no
 * 01… 11. Solo para MOSTRAR en los selectores; el valor que se envía sigue siendo `HH:MM`
 * (RN-07), así que no cambia el dato, solo cómo se lee.
 */
export const comoHoraConMeridiano = (hora: string): string => {
  const horas = Number(hora.split(":")[0]);
  return `${hora} ${horas < 12 ? "AM" : "PM"}`;
};

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
 * `7.5` → `7 h 30` · `8` → `8 h` · `0.5` → `0 h 30`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL DECIMAL NO ES DE ESTA FAMILIA. Añadida el 2026-08-26.
 *
 * `duracionEnHoras` devuelve un número —y hace bien: es lo que se calcula—, pero la
 * pantalla lo pintaba tal cual y con `08:00 → 15:30` decía **«7.5 h»**. El sistema
 * escribe horarios como `08H00 A 15H30` en la matriz, en la orden de servicio y en la
 * tabla del cuadro; «7.5» es la única cifra de todo el módulo que se lee en decimal.
 *
 * VA AQUÍ Y NO EN EL COMPONENTE porque es la forma de decir una duración, no una
 * decisión de una pantalla: el día que la orden de servicio quiera imprimirla, la toma
 * de este archivo en lugar de reinventar el redondeo.
 *
 * RN-07 solo admite horas en punto y medias, así que los minutos son siempre 0 o 30.
 * Se redondea de todos modos: si algún día la granularidad cambia, esto sigue diciendo
 * la verdad en lugar de arrastrar un decimal a la pantalla.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const comoDuracion = (horas: number): string => {
  const totalMinutos = Math.round(horas * MINUTOS_POR_HORA);
  const enteras = Math.floor(totalMinutos / MINUTOS_POR_HORA);
  const minutos = totalMinutos % MINUTOS_POR_HORA;

  return minutos === 0
    ? `${enteras} h`
    : `${enteras} h ${String(minutos).padStart(2, "0")}`;
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
