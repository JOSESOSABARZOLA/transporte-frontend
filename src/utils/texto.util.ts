/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Transversal
 * Archivo: texto.util.ts
 * Responsabilidad: Comparar texto escrito por personas, sin tildes ni mayúsculas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-07
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
