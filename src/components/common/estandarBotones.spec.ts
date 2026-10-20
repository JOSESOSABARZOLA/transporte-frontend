/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Estándar único de botones
 * Archivo: estandarBotones.spec.ts
 * Responsabilidad: Fallar si alguna pantalla estiliza un botón a mano (clase `btn` en un
 *                  `className` fuera de `components/common/`) sin declararlo control de selección.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA RED DEL LINT (decisión D6). La regla `no-restricted-syntax` de `eslint.config.js` ya lo
 * rechaza, pero el lint puede quedar fuera de un `npm test` apurado; esta prueba recorre el
 * código y exige lo mismo: la clase `btn` ENTERA en un `className` solo vive en
 * `components/common/`, o va precedida de
 * `// eslint-disable-next-line no-restricted-syntax -- <motivo>` (controles de selección:
 * segmentados, pestañas, pastillas de filtro, letras de turno, fichas, cantidad).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest corre desde la raíz del proyecto (`import.meta.url` no es `file:` en jsdom).
const RAIZ = join(process.cwd(), "src") + sep;
const COMUNES = join(RAIZ, "components", "common");

/** Todos los `.tsx` de `src/` salvo los comunes y las pruebas. */
const archivos = (carpeta: string): string[] =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return ruta === COMUNES ? [] : archivos(ruta);
    return ruta.endsWith(".tsx") && !ruta.includes(".spec.") ? [ruta] : [];
  });

/** Un literal de clases que contiene `btn` como clase entera (no `btn-primary`). */
const LITERAL_CON_BTN = /["'`]([^"'`]*\s)?btn(\s[^"'`]*)?["'`$]/;
// Fuera de un `className` (el `estilos` del armazón) el lint no mira: basta el marcador escrito.
const EXCEPCION = /eslint-disable-next-line no-restricted-syntax -- \S|excepción D6:/;

describe("Estándar único de botones (D6)", () => {
  it("ningún botón se estiliza a mano fuera de components/common", () => {
    const sinMarcar: string[] = [];
    for (const ruta of archivos(RAIZ)) {
      const lineas = readFileSync(ruta, "utf8").split(/\r?\n/);
      let enComentario = false;
      lineas.forEach((linea, indice) => {
        const codigo = linea.trim();
        // Los comentarios de bloque (también los `{/* … */}` de JSX) hablan de clases, no las usan.
        if (enComentario || codigo.startsWith("/*") || codigo.startsWith("{/*")) {
          enComentario = !codigo.includes("*/");
          return;
        }
        if (codigo.startsWith("*") || codigo.startsWith("//")) return;
        if (!LITERAL_CON_BTN.test(linea)) return;
        // El marcador va justo encima; si el literal parte una propiedad («estilos:»), dos arriba.
        const anteriores = [lineas[indice - 1], lineas[indice - 2]].join(" ");
        if (!EXCEPCION.test(anteriores)) {
          sinMarcar.push(`${ruta.slice(RAIZ.length)}:${indice + 1}`);
        }
      });
    }
    expect(sinMarcar).toEqual([]);
  });
});
