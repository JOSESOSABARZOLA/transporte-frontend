/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: banner.util.ts
 * Responsabilidad: Elegir un texto legible sobre el color que entrega el servidor, y descargar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTO NO DEFINE NINGÚN COLOR. Elige entre blanco y negro para que se lea.
 *
 * La regla 3 de CLAUDE.md dice que los colores del banner los entrega el backend y el
 * frontend no los define ni los interpreta. El **fondo** sigue siendo íntegramente del
 * servidor; lo único que se decide aquí es el color del texto encima, y se decide por
 * luminancia, no por gusto.
 *
 * Sin esto, el caso 9 del plan —«tema oscuro, todas las combinaciones legibles»— no se
 * puede cumplir: un banner amarillo con texto blanco es ilegible en cualquier tema, y hay
 * nueve colores institucionales distintos que nadie ha comprobado uno por uno (PV-23).
 *
 * `colorAcento` SERÍA EL CAMPO CORRECTO PARA ESTO, y por eso conviene decirlo aquí: un
 * «color complementario del banner» es exactamente la decisión que esta función está
 * tomando por su cuenta. Pero PV-25 sigue abierto y la columna lleva un valor de relleno
 * declarado como tal en M-07, así que usarlo pintaría texto negro sobre fondo negro.
 * Cuando la DNP lo entregue, esta función debería ceder el paso.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Convierte `#RRGGBB` a sus tres componentes. Devuelve `null` si no lo es. */
const componentes = (hex: string): [number, number, number] | null => {
  const limpio = hex.trim().replace(/^#/, "");

  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return null;

  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ];
};

/**
 * Luminancia relativa según WCAG 2.1 §1.4.3.
 *
 * No es el promedio de los tres canales: el ojo percibe el verde mucho más que el azul, y
 * promediar declararía legible un texto blanco sobre verde institucional.
 */
export const luminancia = (hex: string): number | null => {
  const rgb = componentes(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb.map((canal) => {
    const proporcion = canal / 255;
    return proporcion <= 0.03928
      ? proporcion / 12.92
      : Math.pow((proporcion + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Color de texto legible sobre un fondo dado.
 *
 * El umbral 0.179 es el punto donde el contraste contra blanco y contra negro se igualan
 * según WCAG. Un color que no se entienda devuelve blanco: los nueve banners del Excel
 * son oscuros, así que es la respuesta que menos daño hace si algún día llega basura.
 */
export const colorDeTextoSobre = (fondo: string): "#ffffff" | "#000000" => {
  const valor = luminancia(fondo);

  if (valor === null) return "#ffffff";

  return valor > 0.179 ? "#000000" : "#ffffff";
};

/**
 * Descarga un `Blob` con el nombre indicado.
 *
 * El PDF llega por `httpClient` —con su identidad y su correlación— y no como un enlace
 * directo al endpoint: un `<a href>` al servidor abriría una petición sin la cabecera de
 * identidad y recibiría un `401`. Por eso se descarga desde memoria.
 */
export const descargarArchivo = (contenido: Blob, nombre: string): void => {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  // Sin revocar, cada exportación deja el PDF entero retenido en memoria.
  URL.revokeObjectURL(url);
};
