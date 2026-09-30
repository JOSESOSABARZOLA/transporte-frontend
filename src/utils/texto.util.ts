/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Transversal
 * Archivo: texto.util.ts
 * Responsabilidad: Utilidades de texto — comparar sin tildes ni mayúsculas, y capitalizar
 *   el día y el mes de una fecha en palabras para las cabeceras.
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

/**
 * Inicial en mayúscula de cada palabra salvo los conectores —«martes 8 de septiembre de
 * 2026» → «Martes 8 de Septiembre de 2026»—, para las cabeceras del cuadro. El servidor
 * entrega `fechaNatural` en minúscula, que es la norma del español; poner la mayúscula es
 * una preferencia de presentación del negocio y NO altera el dato: solo la vista cambia.
 */
const CONECTORES_DE_FECHA = new Set(["de", "del", "y"]);
export const conDiaYMesEnMayuscula = (fecha: string): string =>
  fecha.replace(/\p{L}+/gu, (palabra) =>
    CONECTORES_DE_FECHA.has(palabra.toLowerCase())
      ? palabra
      : palabra.charAt(0).toUpperCase() + palabra.slice(1),
  );
