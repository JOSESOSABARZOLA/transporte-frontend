/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Transversal
 * Archivo: texto.util.ts
 * Responsabilidad: Utilidades de texto — comparar sin tildes ni mayúsculas, la fecha del cuadro
 *   en palabras y el horario legible de las cabeceras y las tablas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-07
 *
 * PLANTILLA VISUAL (2026-10-24): `conDiaYMesEnMayuscula` se retiró. Capitalizaba la `fechaNatural`
 * del servidor para los chips de la Jornada, la Matriz y Órdenes; ahora las cinco pantallas del
 * cuadro dicen la fecha con `fechaEnPalabras`, a partir de la fecha `AAAA-MM-DD`.
 *
 * ESTABA REPETIDA EN DOS SITIOS, Y AL ESCRIBIR EL TERCERO SE EXTRAJO. `personal.util.ts`
 * y `listadoOperativos.util.ts` declaraban cada uno su `normalizar` idéntica. Tres copias
 * de la misma regla son tres sitios donde corregirla el día que aparezca la «ñ» o una
 * diéresis mal descompuesta, y el tercero siempre se olvida.
 *
 * Los nombres del maestro llegan acentuados —«REDROVÁN», «Instrucción»— y quien busca
 * escribe deprisa y sin tildes. Sin esto, «redrovan» no encontraría «REDROVÁN» y el
 * filtro parecería roto.
 */

/** Sin tildes, sin mayúsculas y sin espacios sobrantes. */
export const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * LA FECHA EN UN SOLO FORMATO EN TODAS LAS PANTALLAS (plantilla visual, 2026-10-24): «Sábado 24 de
 * octubre de 2026». Recibe la fecha del cuadro `AAAA-MM-DD` (sin hora, así que no hay zona que la
 * corra de día) y solo pone en mayúscula la primera letra.
 */
export const fechaEnPalabras = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  const texto = new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(anio, mes - 1, dia)))
    .replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** «08H00 A 16H30» → «08H00 a 16H30»: la «a» siempre en minúscula (plantilla visual, 2026-10-24). */
export const horarioLegible = (horario: string): string => horario.replace(/\s+A\s+/g, " a ");
