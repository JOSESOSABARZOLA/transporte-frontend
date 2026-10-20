/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Sistema visual
 * Archivo: tipografia.spec.tsx
 * Responsabilidad: Fijar que etiquetas y encabezados usan los tokens de texto y no grises sueltos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * DOS MITADES, PORQUE jsdom NO CALCULA ESTILOS. La primera monta un formulario y una tabla
 * comunes y comprueba el MARCADO: ninguna clase de gris suelto y el asterisco en rojo. La
 * segunda lee las HOJAS y comprueba que la corrección de daisyUI apunta a los tokens, y que
 * los cuatro tokens existen en los dos temas. Ver docs/estilos.md.
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import { Field, Formik } from "formik";
import { describe, expect, it } from "vitest";

import { SelectInput, TextInput } from "../components/forms/FormikField.tsx";
import Boton, { type VarianteBoton } from "../components/common/Boton.tsx";

// Las hojas se leen del disco: con `css: false` (vitest.config.ts) un import `?raw` llega vacío.
const leer = (ruta: string): string =>
  readFileSync(new URL(ruta, import.meta.url), "utf8");
const tokens = leer("./foundation/design-tokens.css");
const hoja = leer("./ui/tipografia.css");
const plugin = leer("./ui/tipografia.plugin.js");

/** Un gris suelto: `text-base-content/NN` u opacidad sobre texto (salvo 0 y 100, de transición). */
const GRIS_SUELTO =
  /(?:^| )(?:text-base-content[/][0-9]+|opacity-(?!0(?: |$)|100(?: |$))[0-9]+)/;

const clasesCon = (raiz: HTMLElement): string[] =>
  [...raiz.querySelectorAll("[class]")]
    .map((nodo) => nodo.getAttribute("class") ?? "")
    .filter((clase) => GRIS_SUELTO.test(clase));

describe("Tipografía · el marcado común no usa grises sueltos", () => {
  it("un formulario de FormikField: etiquetas sin opacidad y asterisco en rojo", () => {
    const { container } = render(
      <Formik initialValues={{ nombre: "", area: "" }} onSubmit={() => {}}>
        <form>
          <Field name="nombre" component={TextInput} label="Nombre" required />
          <Field
            name="area"
            component={SelectInput}
            label="Área"
            required
            options={[{ value: "A", label: "Área A" }]}
          />
        </form>
      </Formik>,
    );

    expect(clasesCon(container)).toEqual([]);
    // La etiqueta es `label-text`: su color y peso los fija la corrección única.
    expect(screen.getByText("Nombre")).toHaveClass("label-text");
    // El asterisco de requerido conserva su rojo propio.
    for (const asterisco of screen.getAllByText("*")) {
      expect(asterisco).toHaveClass("text-error");
    }
  });

  it("el botón único: ninguna variante lleva grises sueltos, ni apagada", () => {
    const variantes: VarianteBoton[] = [
      "primario", "secundario", "acento", "peligro", "exito", "peligroTexto", "enlace", "peligroRelleno",
    ];
    const { container } = render(
      <div>
        {variantes.map((variante) => (
          <Boton key={variante} variante={variante} motivoDeshabilitado="Sin cambios">
            {variante}
          </Boton>
        ))}
      </div>,
    );
    expect(container.querySelectorAll("button")).toHaveLength(variantes.length);
    expect(clasesCon(container)).toEqual([]);
  });
});

describe("Tipografía · las hojas apuntan a los tokens", () => {
  it("la corrección de daisyUI usa los tokens de etiqueta y de encabezado", () => {
    expect(plugin).toMatch(
      /"\.label, \.label-text, \.fieldset-legend":\s*\{\s*color: "var\(--app-text-label\)"/,
    );
    expect(plugin).toMatch(
      /"\.label-text-alt":\s*\{\s*color: "var\(--app-text-muted\)"/,
    );
    expect(plugin).toMatch(
      /"\.table thead th, \.table thead td, \.app-data-table thead th":\s*\{\s*color: "var\(--app-text-strong\)"/,
    );
  });

  it("las cuatro utilidades se declaran sobre sus tokens", () => {
    for (const [utilidad, token] of [
      ["text-app-strong", "--app-text-strong"],
      ["text-app-label", "--app-text-label"],
      ["text-app-muted", "--app-text-muted"],
      ["text-app-disabled", "--app-text-disabled"],
    ]) {
      expect(hoja).toMatch(
        new RegExp(`@utility ${utilidad} \\{\\s*color: var\\(${token}\\)`),
      );
    }
  });

  it("los cuatro tokens existen y cubren los dos temas", () => {
    const bloque =
      /:root,\s*\[data-theme="light"\],\s*\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(
        tokens,
      );
    expect(bloque).not.toBeNull();
    const cuerpo = bloque?.[1] ?? "";
    for (const token of [
      "--app-text-strong",
      "--app-text-label",
      "--app-text-muted",
      "--app-text-disabled",
    ]) {
      expect(cuerpo).toContain(`${token}:`);
    }
    // El secundario es la mezcla del 78 %, la que da ≥ 5,6:1 en claro.
    expect(cuerpo).toMatch(
      /--app-text-muted: color-mix\(in srgb, var\(--color-base-content\) 78%/,
    );
  });
});

/* ──────────────────────────────────────────────────────────────────────────────
   CUERPO DE TABLAS, ACCIONES, DESHABILITADOS Y SUBTÍTULO (2026-10-08).
   ────────────────────────────────────────────────────────────────────────────── */

const indice = leer("../index.css");
const cabecera = leer("./ui/page-header.css");

/** Colores de un tema de daisyUI, tal como los declara `index.css`. */
const coloresDelTema = (tema: "light" | "dark"): Record<string, string> => {
  const bloque =
    new RegExp(`name: "${tema}";([\\s\\S]*?)\\}`).exec(indice)?.[1] ?? "";
  const colores: Record<string, string> = { white: "#ffffff" };
  for (const [, nombre, valor] of bloque.matchAll(
    /--color-([a-z0-9-]+):\s*(#[0-9a-f]{3,6})/gi,
  )) {
    colores[nombre] =
      valor.length === 4
        ? `#${[...valor.slice(1)].map((c) => c + c).join("")}`
        : valor;
  }
  return colores;
};

const rgb = (hex: string): number[] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Resuelve `var(--color-x)`, `white` o `color-mix(in srgb, A N%, B)` a un color sRGB. */
const resolver = (valor: string, colores: Record<string, string>): number[] => {
  const color = (texto: string): number[] => {
    const nombre =
      /var\(--color-([a-z0-9-]+)\)/.exec(texto)?.[1] ?? texto.trim();
    return rgb(colores[nombre]);
  };
  const mezcla = /color-mix\(in srgb, (.+?) (\d+)%, (.+)\)$/.exec(valor.trim());
  if (!mezcla) return color(valor);
  const [a, b, p] = [
    color(mezcla[1]),
    color(mezcla[3]),
    Number(mezcla[2]) / 100,
  ];
  return a.map((canal, i) => Math.round(canal * p + b[i] * (1 - p)));
};

const luminancia = ([r, g, b]: number[]): number => {
  const lineal = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
};

const contraste = (a: number[], b: number[]): number => {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Declaraciones de un token en el bloque de un tema de `design-tokens.css`. */
const tokenDelTema = (tema: "light" | "dark", token: string): string => {
  const selector =
    tema === "light"
      ? ':root,\\s*\\[data-theme="light"\\]\\s*\\{'
      : '\\[data-theme="dark"\\]\\s*\\{';
  const bloques = [
    ...tokens.matchAll(new RegExp(`${selector}([^}]*)\\}`, "g")),
  ];
  for (const [, cuerpo] of bloques) {
    const valor = new RegExp(`${token}:\\s*([^;]+);`).exec(cuerpo)?.[1];
    if (valor) return valor;
  }
  return "";
};

describe("Tipografía · cuerpo de tablas y acciones de fila", () => {
  it("la celda usa el token pleno a 13 px y CEDE ante utilidades (envuelta en :where)", () => {
    expect(plugin).toMatch(
      /":where\(\.table, \.app-data-table\) tbody td":\s*\{\s*color: "var\(--app-text-strong\)",\s*"font-size": "0\.8125rem"/,
    );
  });

  it("la acción de fila: color de acción, 600 y 32 px; la de peligro conserva su rojo salvo deshabilitada", () => {
    expect(plugin).toMatch(
      /:where\(tbody td\) \.btn-ghost":\s*\{\s*"--size": "2rem",\s*"--fontsize": "0\.8125rem",\s*color: "var\(--app-text-accion\)",\s*"font-weight": "600"/,
    );
    expect(plugin).toMatch(
      /\.btn-ghost\.text-error:not\(:disabled, \[disabled\], \.btn-disabled\)":\s*\{\s*color: "var\(--app-text-peligro\)"/,
    );
  });

  it("los tokens de acción llegan a 4,5:1 sobre la fila normal y la rayada, en los dos temas", () => {
    for (const tema of ["light", "dark"] as const) {
      const colores = coloresDelTema(tema);
      for (const token of [
        "--app-text-accion",
        "--app-text-peligro",
        "--app-text-exito",
      ]) {
        const valor = tokenDelTema(tema, token);
        expect(valor, `${token} en ${tema}`).not.toBe("");
        const texto = resolver(valor, colores);
        for (const fondo of ["base-100", "base-200"]) {
          expect(
            contraste(texto, rgb(colores[fondo])),
            `${token} sobre ${fondo} (${tema})`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  // El `disabled` nativo (botones que aún no pasan por `<Boton>`): token, base-200 y borde.
  it("el botón deshabilitado nativo lleva su token, fondo base-200 y un borde visible", () => {
    expect(plugin).toMatch(
      /"\.btn:is\(:disabled, \[disabled\], \.btn-disabled\)":\s*\{\s*"--btn-fg": "var\(--app-text-disabled\)",\s*color: "var\(--app-text-disabled\)"/,
    );
    expect(plugin).toMatch(
      /:not\(\.btn-link, \.btn-ghost\)":\s*\{\s*"background-color": "var\(--color-base-200\)",\s*"border-color":/,
    );
  });

  // Estándar de botones (2026-10-15): apagado con motivo = su variante al 50 %, sin cambiar al pasar.
  it("el botón apagado con aria-disabled conserva su variante al 50 % y el cursor no permitido", () => {
    expect(plugin).toMatch(
      /'\.btn\[aria-disabled="true"\]':\s*\{\s*opacity: "0\.5",\s*cursor: "not-allowed"/,
    );
    expect(plugin).toMatch(/'\.btn\[aria-disabled="true"\]:hover'/);
  });

  it("los distintivos de éxito, aviso y error llegan a 4,5:1 con su relleno tenue, en los dos temas", () => {
    expect(plugin).toMatch(/".badge-success, .badge-warning, .badge-error":/);
    expect(plugin).toMatch(
      /"--badge-bg":\s*"color-mix\(in srgb, var\(--badge-color\) 18%, var\(--color-base-100\)\)"/,
    );
    expect(plugin).toMatch(
      /"--badge-fg":\s*"color-mix\(in srgb, var\(--badge-color\) 40%, var\(--color-base-content\)\)"/,
    );
    for (const tema of ["light", "dark"] as const) {
      const colores = coloresDelTema(tema);
      for (const color of ["success", "warning", "error"]) {
        const fondo = resolver(
          `color-mix(in srgb, var(--color-${color}) 18%, var(--color-base-100))`,
          colores,
        );
        const texto = resolver(
          `color-mix(in srgb, var(--color-${color}) 40%, var(--color-base-content))`,
          colores,
        );
        expect(
          contraste(texto, fondo),
          `${color} (${tema})`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("Tipografía · acciones de la fila de Mis operativos (2026-10-13)", () => {
  // Desde el estándar de botones (2026-10-15) el tamaño lo da `<Boton tamano="sm">`; aquí quedan el
  // grupo de ancho fijo y la base del secundario.
  it("el grupo mide lo mismo en todas las filas y el secundario es blanco con borde neutro", () => {
    expect(plugin).toMatch(/"\.app-acciones-operativo":\s*\{[^}]*width: "13\.25rem"/);
    expect(plugin).not.toMatch(/"\.app-accion-fila"/);
    expect(plugin).toMatch(/"\.app-accion-secundaria":\s*\{\s*"--btn-color": "var\(--color-base-100\)"/);
  });
});

describe("Tipografía · interruptor e insignia suave (2026-10-13)", () => {
  it("el interruptor mide 36×20, apagado relleno con su token y encendido en primario", () => {
    expect(plugin).toMatch(/"\.app-interruptor":\s*\{[^}]*width: "2\.25rem",\s*height: "1\.25rem"/);
    expect(plugin).toMatch(/"background-color": "var\(--app-interruptor-apagado\)"/);
    expect(plugin).toMatch(/"\.app-interruptor:checked":\s*\{\s*"background-color": "var\(--color-primary\)"/);
    expect(plugin).toMatch(/"\.app-interruptor::before":\s*\{[^}]*"background-color": "#ffffff"/);
    expect(plugin).toMatch(/"\.app-interruptor-fila:has\(\.app-interruptor:focus-visible\)":\s*\{\s*outline:/);
    expect(tokenDelTema("light", "--app-interruptor-apagado")).toBe("#c9d0de");
    expect(tokenDelTema("dark", "--app-interruptor-apagado")).not.toBe("");
  });

  it("la insignia suave es 11 px y su texto llega a 7:1 sobre su fondo, en los dos temas", () => {
    expect(plugin).toMatch(/"\.app-insignia-suave":\s*\{[^}]*"font-size": "0\.6875rem"/);
    for (const tema of ["light", "dark"] as const) {
      const colores = coloresDelTema(tema);
      const fondo = resolver(tokenDelTema(tema, "--app-insignia-suave-bg"), colores);
      const texto = resolver(tokenDelTema(tema, "--app-insignia-suave-fg"), colores);
      expect(contraste(texto, fondo), tema).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("Tipografía · descripciones", () => {
  it("el subtítulo de página no tiene colores por tema: manda el token secundario", () => {
    expect(cabecera).toMatch(
      /\.page-heading-subtitle \{\s*font-size: 0\.875rem;\s*color: var\(--app-text-muted\);/,
    );
    expect(cabecera).not.toMatch(
      /\[data-theme="[a-z]+"\] \.page-heading-subtitle/,
    );
  });

  it("la ayuda y la nota al pie de un panel suben a 13 px", () => {
    expect(plugin).toMatch(
      /"\.app-data-panel-body > p\.text-app-muted":\s*\{\s*"font-size": "0\.8125rem"/,
    );
  });
});
