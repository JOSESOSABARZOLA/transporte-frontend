/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Listados y matriz
 * Archivo: agrupacionForm8.util.ts
 * Responsabilidad: Agrupar los operativos «copia» que genera el formulario 8 (varios por
 *   persona con la misma hora) en un solo bloque visual.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ Y QUÉ AGRUPA. 2026-09-14, a petición del negocio.
 *
 * El formulario 8 genera N operativos por persona (uno por unidad de su cantidad), todos con
 * la MISMA hora general y de UNA sola persona: solo cambia el identificador (IG-002, IG-003…).
 * Sin agrupar, la lista muestra N filas casi idénticas y el cuadro se vuelve ilegible.
 *
 * La agrupación junta **operativos idénticos salvo el identificador**: la misma —y única—
 * persona, y el mismo valor en todo lo que se fusiona (punto, zonal, tipo, instituciones,
 * conductor, placa, estado y observaciones). No hace falta que lleguen seguidos. Así:
 *
 *   · el IDENTIFICADOR se mantiene por operativo (una fila por código),
 *   · y TODO lo demás se fusiona en una celda que abarca el grupo (`rowSpan`),
 *   · con el personal mostrando «Nombre (n)», donde n es cuántos operativos abarca.
 *
 * NO SE CABLEA NINGÚN NÚMERO DE FORMULARIO: la condición «varios operativos consecutivos de la
 * misma persona, idénticos» solo la cumplen las copias del 8 (el 5 nunca repite persona, porque
 * no ofrece cantidad). Si dos operativos difieren en algo que se fusiona —otro conductor, otro
 * punto—, quedan en grupos distintos, y la celda fusionada nunca miente.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Agrupa TODOS los elementos que comparten `clave`, conservando el orden de PRIMERA APARICIÓN de
 * cada grupo. `clave` devuelve `null` para un elemento que no se agrupa (p. ej. con más de una
 * persona): ese elemento queda en un grupo propio. Dos `null` NO se agrupan entre sí.
 *
 * NO EXIGE QUE LOS MIEMBROS DE UN GRUPO LLEGUEN SEGUIDOS (2026-09-21). El servidor entrega los
 * códigos de una misma patrulla (mismo `grupoRegistro`) INTERCALADOS con los de otra; con el
 * criterio anterior —solo consecutivos— un código que no llegaba pegado a los suyos quedaba
 * suelto, pintado como un operativo aparte. Aquí se juntan estén donde estén. El orden DENTRO de
 * cada grupo es el de aparición; la pantalla lo reordena si lo necesita.
 */
export function agruparPorClave<T>(
  items: readonly T[],
  clave: (item: T) => string | null,
): T[][] {
  const grupos: T[][] = [];
  const porClave = new Map<string, T[]>();

  for (const item of items) {
    const k = clave(item);
    if (k === null) {
      grupos.push([item]);
      continue;
    }
    const existente = porClave.get(k);
    if (existente) {
      existente.push(item);
    } else {
      const nuevo = [item];
      porClave.set(k, nuevo);
      grupos.push(nuevo);
    }
  }

  return grupos;
}
