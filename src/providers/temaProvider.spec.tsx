/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Providers
 * Archivo: temaProvider.spec.tsx
 * Responsabilidad: Fijar que el cambio de tema no se anima.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO SE PRUEBA EL MAQUETADO, SE PRUEBA LA DECISIÓN.
 *
 * `CLAUDE.md` §3 dice que el maquetado se comprueba mirando, y el contraste se mide con
 * el arnés del navegador. Lo que sí es una decisión —y se puede afirmar aquí— es que
 * `ThemeProvider` **marque el documento mientras cambia** y **retire la marca después**.
 *
 * Sin esa marca, `design-tokens.css` no puede apagar las transiciones y vuelve el fallo
 * que este cambio corrige: los fondos saltan de golpe, dieciocho selectores animan
 * `color` durante 180 ms, y en ese lapso convive el fondo nuevo con el texto viejo. Se
 * midió un botón secundario cayendo a **1,60:1** en el instante del cambio.
 *
 * Y SIN LA RETIRADA EL FALLO ES EL CONTRARIO Y PEOR, porque es silencioso: la aplicación
 * entera se quedaría sin fundidos de hover y de foco, y nada lo explicaría.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "./ThemeProvider.tsx";
import { useTheme } from "../hooks/useTheme.ts";

const ATRIBUTO = "data-cambiando-tema";

/** Un interruptor mínimo: lo que hace el panel de perfil de la barra superior. */
const Interruptor = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      Cambiar tema
    </button>
  );
};

const raiz = () => document.documentElement;

describe("el cambio de tema no se anima", () => {
  beforeEach(() => {
    /*
      `matchMedia` no existe en jsdom, y `getInitialTheme` lo consulta para respetar la
      preferencia del sistema cuando no hay nada guardado. Se declara aquí y no en
      `pruebas/configuracion.ts` a propósito: es el único archivo que lo necesita, y
      ponerlo en la configuración compartida se lo daría por hecho a las otras
      veintiocho tandas, que hoy fallarían si alguna empezara a usarlo sin querer.
    */
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (consulta: string) => ({
        matches: false,
        media: consulta,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    window.localStorage.clear();
    raiz().removeAttribute("data-theme");
    raiz().removeAttribute(ATRIBUTO);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * EL ORDEN ES LO QUE SE PRUEBA, y es frágil: si la marca se pusiera **después** de
   * `data-theme`, el navegador ya habría empezado a interpolar y el arreglo no serviría
   * de nada. Se comprueba interceptando `setAttribute` y mirando la secuencia.
   */
  it("marca el documento ANTES de cambiar el tema", async () => {
    const orden: string[] = [];
    const original = raiz().setAttribute.bind(raiz());

    vi.spyOn(raiz(), "setAttribute").mockImplementation((nombre, valor) => {
      orden.push(nombre);
      original(nombre, valor);
    });

    render(
      <ThemeProvider>
        <Interruptor />
      </ThemeProvider>,
    );

    const puestos = orden.filter(
      (nombre) => nombre === ATRIBUTO || nombre === "data-theme",
    );

    expect(puestos[0]).toBe(ATRIBUTO);
    expect(puestos[1]).toBe("data-theme");
  });

  /**
   * Y SE RETIRA. `requestAnimationFrame` no corre solo en jsdom con temporizadores
   * simulados, así que se espera a que el atributo desaparezca de verdad en lugar de
   * dar por hecho que el fotograma ocurrió.
   */
  it("retira la marca cuando el fotograma ya se pintó", async () => {
    render(
      <ThemeProvider>
        <Interruptor />
      </ThemeProvider>,
    );

    await vi.waitFor(() => {
      expect(raiz().hasAttribute(ATRIBUTO)).toBe(false);
    });
  });

  it("vuelve a marcar en cada cambio, no solo en el primero", async () => {
    render(
      <ThemeProvider>
        <Interruptor />
      </ThemeProvider>,
    );

    await vi.waitFor(() => {
      expect(raiz().hasAttribute(ATRIBUTO)).toBe(false);
    });

    const puesto = vi.fn();
    const original = raiz().setAttribute.bind(raiz());
    vi.spyOn(raiz(), "setAttribute").mockImplementation((nombre, valor) => {
      if (nombre === ATRIBUTO) puesto();
      original(nombre, valor);
    });

    await userEvent.click(screen.getByRole("button", { name: "Cambiar tema" }));

    expect(puesto).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(raiz().hasAttribute(ATRIBUTO)).toBe(false);
    });
  });

  /** Y el tema sigue haciendo lo suyo: eso no debe romperse por el camino. */
  it("el tema se aplica y se recuerda", async () => {
    render(
      <ThemeProvider>
        <Interruptor />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cambiar tema" }));

    const elegido = raiz().getAttribute("data-theme");
    expect(elegido === "dark" || elegido === "light").toBe(true);
    expect(window.localStorage.getItem("sigoc-theme")).toBe(elegido);
  });
});
