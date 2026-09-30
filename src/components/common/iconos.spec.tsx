/**
 * App: Cuadro de Colores
 * Módulo: N/A
 * Feature: Iconografía
 * Archivo: iconos.spec.tsx
 * Responsabilidad: Que ninguna entrada del menú caiga en el respaldo ni repita figura.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-27 · reescrita el 2026-09-03
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA BATERÍA CAMBIÓ DE TRABAJO, Y CONVIENE DECIR POR QUÉ.
 *
 * Nació el 2026-08-27 para vigilar a mano un defecto conocido: `Iconos` recibía
 * `nombre: string`, de modo que una errata no fallaba —caía en el respaldo `sinIcono` y
 * **pintaba un interrogante sin registrar nada**—. Su cabecera decía «mientras eso siga
 * así, cada icono nuevo trae aquí su línea».
 *
 * Eso dejó de ser así el 2026-09-03: `nombre` es `NombreIcono`, derivado de las claves
 * del propio mapa, y `navigation.ts` declara su `icon` con ese mismo tipo. **La errata
 * la dice ahora el compilador**, que es donde debía decirse. La prueba que comprobaba
 * que un nombre inventado cae en el respaldo ya ni siquiera compila, y esa es la señal
 * de que el problema se cerró en el sitio correcto.
 *
 * LO QUE EL COMPILADOR NO PUEDE DECIR, Y SE PRUEBA AQUÍ. Que un nombre exista no
 * significa que informe. Dieciséis de las entradas del menú compartían la misma carpeta y
 * todas compilaban perfectamente: la regla 13 —«un icono repetido no informa»— es
 * semántica, no de tipos. Estas dos pruebas la sostienen recorriendo la navegación de
 * verdad, no una lista copiada.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Iconos, { type NombreIcono } from "./Iconos.tsx";
import {
  shellNavigationItems,
  type NavigationItem,
} from "../../config/navigation.ts";

/** El `data-icon` que FontAwesome deja en el SVG. Es el nombre real del dibujo. */
const dibujoDe = (nombre: NombreIcono | undefined): string | null => {
  const { container } = render(<Iconos nombre={nombre} />);

  return container.querySelector("svg")?.getAttribute("data-icon") ?? null;
};

/** Las diecisiete entradas, padres e hijas, en una sola lista. */
const todasLasEntradas = (items: NavigationItem[]): NavigationItem[] =>
  items.flatMap((item) => [item, ...todasLasEntradas(item.children ?? [])]);

const ENTRADAS = todasLasEntradas(shellNavigationItems);

describe("el menú lateral", () => {
  /**
   * ES LA QUE HABRÍA CANTADO EL DEFECTO DEL INTERRUPTOR DE TEMA. Un icono que no está en
   * el mapa se dibuja como interrogante, y eso es lo que se veía en el panel de perfil.
   */
  it("ninguna entrada cae en el respaldo", () => {
    const conInterrogante = ENTRADAS.filter(
      (entrada) => dibujoDe(entrada.icon) === "circle-question",
    ).map((entrada) => entrada.id);

    expect(conInterrogante).toEqual([]);
  });

  /**
   * Y ÉSTA ES LA QUE DISCRIMINA. La anterior pasaba en verde cuando dieciséis entradas
   * compartían `faFolderOpen`: existían todas, y ninguna decía nada.
   */
  it("cada entrada lleva su propia figura, sin repetir (regla 13)", () => {
    const dibujos = ENTRADAS.map((entrada) => dibujoDe(entrada.icon));
    const repetidos = dibujos.filter(
      (dibujo, indice) => dibujos.indexOf(dibujo) !== indice,
    );

    expect(repetidos).toEqual([]);
    expect(dibujos).toHaveLength(19);
  });
});

describe("los iconos que se piden por su nombre", () => {
  /** Los dos que faltaban hasta el 2026-09-03 y pintaban sendos interrogantes. */
  it("el interruptor de tema tiene sol y luna, no interrogantes", () => {
    expect(dibujoDe("temaClaro")).toBe("sun");
    expect(dibujoDe("temaOscuro")).toBe("moon");
  });

  /** Acompaña al rótulo «Eliminar» de P-02 y de las ausencias de P-07. */
  it("«eliminar» es un tacho de basura", () => {
    expect(dibujoDe("eliminar")).toBe("trash-can");
  });

  it("sin nombre cae en el respaldo, y no revienta", () => {
    expect(dibujoDe(undefined)).toBe("circle-question");
  });
});
