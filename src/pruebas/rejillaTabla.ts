/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración de pruebas
 * Archivo: rejillaTabla.ts
 * Responsabilidad: Contar cuántas columnas ocupa de verdad cada fila de una tabla, sumando las
 *                  celdas que bajan de filas anteriores por `rowSpan`.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ. Una fila con celdas de más (o de menos) no rompe nada que jsdom vea: el navegador las
 * empuja fuera de la tabla o deja un hueco, y todo se corre una columna. Es el defecto de la
 * patrulla con códigos intercalados (2026-10-26). Aquí se arma la rejilla como la arma el
 * navegador, y cada fila tiene que sumar exactamente las columnas de la cabecera.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Una fila del cuerpo con las columnas que ocupa (las suyas y las que le bajan de arriba). */
export type OcupacionDeFila = { texto: string; columnas: number };

/** Las columnas de la cabecera: la primera fila de `<thead>`, contando `colSpan`. */
export const columnasDeCabecera = (tabla: HTMLTableElement): number =>
  Array.from(tabla.tHead?.rows[0]?.cells ?? []).reduce((suma, celda) => suma + celda.colSpan, 0);

/** Recorre el cuerpo y devuelve, por fila, cuántas columnas quedan ocupadas. */
export const ocupacionPorFila = (tabla: HTMLTableElement): OcupacionDeFila[] => {
  // Por columna: cuántas filas MÁS sigue cubriendo una celda de arriba.
  const restantes: number[] = [];
  const resultado: OcupacionDeFila[] = [];

  for (const fila of Array.from(tabla.tBodies).flatMap((cuerpo) => Array.from(cuerpo.rows))) {
    const ocupadas = new Set<number>();
    restantes.forEach((filasQueQuedan, columna) => {
      if (filasQueQuedan > 0) ocupadas.add(columna);
    });

    let columna = 0;
    for (const celda of Array.from(fila.cells)) {
      while (ocupadas.has(columna)) columna += 1;
      for (let k = 0; k < celda.colSpan; k += 1) {
        ocupadas.add(columna + k);
        // `rowSpan` cuenta la fila actual: le quedan rowSpan - 1 por debajo.
        restantes[columna + k] = Math.max(restantes[columna + k] ?? 0, celda.rowSpan);
      }
      columna += celda.colSpan;
    }

    resultado.push({ texto: fila.textContent ?? "", columnas: ocupadas.size });
    for (let i = 0; i < restantes.length; i += 1) {
      if ((restantes[i] ?? 0) > 0) restantes[i] -= 1;
    }
  }

  return resultado;
};
