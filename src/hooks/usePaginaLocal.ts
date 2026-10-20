/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Paginado
 * Archivo: usePaginaLocal.ts
 * Responsabilidad: La página visible de una tabla que se pagina en el navegador.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTÁNDAR DE TABLAS (2026-10-15): de a 10 filas, con `Paginacion`. Dos reglas comunes a todas:
 *
 *   · Si cambia el número de filas (otra búsqueda, otro filtro), vuelve a la primera página.
 *   · Si cambia la fila resaltada (recién guardada o reactivada), salta a la página donde quedó.
 *
 * Se resuelve DURANTE el render (estado anterior guardado junto al número de página), no con un
 * efecto: así la tabla nunca pinta un instante la página equivocada. El recorte lo hace `paginar`,
 * que además nunca deja la página fuera de rango.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";

import { paginar } from "../utils/listadoOperativos.util.ts";

export const TAMANO_PAGINA = 10;

export function usePaginaLocal<T, K>(
  filas: T[],
  resaltado: K | null,
  claveDe: (fila: T) => K,
  tamano: number = TAMANO_PAGINA,
) {
  const [estado, setEstado] = useState({ numero: 0, total: filas.length, resaltado });

  if (estado.total !== filas.length || estado.resaltado !== resaltado) {
    const indice = resaltado === null ? -1 : filas.findIndex((fila) => claveDe(fila) === resaltado);
    setEstado({
      numero:
        estado.resaltado !== resaltado && indice >= 0
          ? Math.floor(indice / tamano)
          : estado.total !== filas.length
            ? 0
            : estado.numero,
      total: filas.length,
      resaltado,
    });
  }

  const pagina = paginar(filas, estado.numero, tamano);
  return {
    ...pagina,
    tamano,
    irA: (numero: number) => setEstado((antes) => ({ ...antes, numero })),
  };
}
