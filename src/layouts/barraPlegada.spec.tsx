/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Barra lateral
 * Archivo: barraPlegada.spec.tsx
 * Responsabilidad: Verificar que Mis operativos (<1700 px) y Registro (<1840 px) pliegan la barra lateral.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * Se aísla el armazón: la barra, la barra superior y el aviso global se sustituyen por piezas
 * mínimas —lo que se prueba es la decisión de plegar y el botón «Menú», no su contenido—. El botón
 * es el `MenuDropdown` real.
 */

import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import MainLayout from "./MainLayout.tsx";
import { esRutaPlegable, umbralDeRuta, useBarraPlegada } from "../hooks/useBarraPlegada.ts";

vi.mock("../components/navbar/Sidebar.tsx", () => ({
  default: () => (
    <aside aria-label="Menú principal">
      <a href="/home/cuadro/registro">Registro de operativo</a>
    </aside>
  ),
}));
vi.mock("../components/jornada/AvisoPersonalPendiente.tsx", () => ({
  default: () => null,
}));
vi.mock("../components/navbar/Navbar.tsx", async () => {
  const { default: MenuDropdown } = await vi.importActual<
    typeof import("../components/navbar/MenuDropdown.tsx")
  >("../components/navbar/MenuDropdown.tsx");
  return {
    default: (props: {
      isSidebarOpen: boolean;
      onToggleSidebar: () => void;
      menuPlegado?: boolean;
    }) => (
      <MenuDropdown
        open={props.isSidebarOpen}
        onToggle={props.onToggleSidebar}
        plegado={props.menuPlegado}
      />
    ),
  };
});

/** `matchMedia` de jsdom no existe: se simula un ancho de ventana fijo. */
const conAncho = (ancho: number) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (consulta: string) => {
      const maximo = /max-width:\s*([\d.]+)px/.exec(consulta);
      const minimo = /min-width:\s*([\d.]+)px/.exec(consulta);
      const matches =
        (maximo ? ancho <= Number(maximo[1]) : true) &&
        (minimo ? ancho >= Number(minimo[1]) : true);
      return {
        matches,
        media: consulta,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    },
  });
};

const abrirEn = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/home/*" element={<MainLayout />}>
          <Route path="*" element={<p>Contenido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

/** El botón de la barra superior (el fondo del menú también se llama «Cerrar menú lateral»). */
const botonMenu = (): HTMLElement => {
  const boton = document.getElementById("boton-menu-lateral");
  if (!boton) throw new Error("No está el botón del menú");
  return boton;
};

afterEach(() => {
  // @ts-expect-error -- se retira el simulacro para no contaminar otras pruebas.
  delete window.matchMedia;
});

describe("esRutaPlegable / umbralDeRuta", () => {
  it("Mis operativos y Registro pliegan la barra; las demás rutas no", () => {
    expect(esRutaPlegable("/home/cuadro/mis-operativos")).toBe(true);
    expect(esRutaPlegable("/home/cuadro/mis-operativos/")).toBe(true);
    expect(esRutaPlegable("/home/cuadro/registro")).toBe(true);
    expect(esRutaPlegable("/home/administracion/catalogos")).toBe(false);
  });

  it("cada ruta tiene su propio umbral", () => {
    expect(umbralDeRuta("/home/cuadro/mis-operativos")).toBe(1700);
    expect(umbralDeRuta("/home/cuadro/registro/")).toBe(1840);
    expect(umbralDeRuta("/home/cuadro/jornada")).toBeNull();
  });
});

describe("useBarraPlegada · ancho de la ventana", () => {
  it("pliega bajo 1700 px en Mis operativos", () => {
    conAncho(1440);
    const { result } = renderHook(() =>
      useBarraPlegada("/home/cuadro/mis-operativos"),
    );
    expect(result.current).toBe(true);
  });

  it("no pliega desde 1700 px", () => {
    conAncho(1700);
    const { result } = renderHook(() =>
      useBarraPlegada("/home/cuadro/mis-operativos"),
    );
    expect(result.current).toBe(false);
  });

  it("Registro pliega bajo 1840 px, también entre 1700 y 1839", () => {
    conAncho(1440);
    expect(renderHook(() => useBarraPlegada("/home/cuadro/registro")).result.current).toBe(true);
    conAncho(1839);
    expect(renderHook(() => useBarraPlegada("/home/cuadro/registro")).result.current).toBe(true);
    // A 1800 Mis operativos ya va con la barra fija: los umbrales son independientes.
    conAncho(1800);
    expect(
      renderHook(() => useBarraPlegada("/home/cuadro/mis-operativos")).result.current,
    ).toBe(false);
  });

  it("Registro no pliega desde 1840 px", () => {
    conAncho(1840);
    expect(renderHook(() => useBarraPlegada("/home/cuadro/registro")).result.current).toBe(false);
  });

  it("no pliega en otra ruta, aunque la ventana sea estrecha", () => {
    conAncho(1280);
    const { result } = renderHook(() =>
      useBarraPlegada("/home/cuadro/jornada"),
    );
    expect(result.current).toBe(false);
  });
});

describe("armazón · barra plegada en Mis operativos", () => {
  it("bajo 1700 px la barra no ocupa columna y el botón dice «Menú», cerrado", () => {
    conAncho(1440);
    const { container } = abrirEn("/home/cuadro/mis-operativos");

    expect(container.querySelector("[data-barra-fija]")).toBeNull();
    const boton = botonMenu();
    expect(boton).toHaveTextContent("Menú");
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(boton).toHaveAttribute("aria-controls", "menu-lateral-flotante");
  });

  it("el botón abre el menú flotante, el foco entra y Esc lo cierra devolviendo el foco", async () => {
    conAncho(1440);
    abrirEn("/home/cuadro/mis-operativos");
    const usuario = userEvent.setup();

    await usuario.click(botonMenu());
    expect(botonMenu()).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getAllByRole("link", { name: "Registro de operativo" }),
    ).toContain(document.activeElement);

    await act(async () => {
      await usuario.keyboard("{Escape}");
    });
    expect(botonMenu()).toHaveAttribute("aria-expanded", "false");
    expect(botonMenu()).toHaveFocus();
  });

  it("clic fuera del menú (en el fondo) lo cierra", async () => {
    conAncho(1440);
    abrirEn("/home/cuadro/mis-operativos");
    const usuario = userEvent.setup();

    await usuario.click(botonMenu());
    // El fondo también se llama «Cerrar menú lateral»; es el que no es el botón de la barra.
    const fondo = screen
      .getAllByRole("button", { name: "Cerrar menú lateral" })
      .find((boton) => boton.id !== "boton-menu-lateral");
    await usuario.click(fondo!);
    expect(botonMenu()).toHaveAttribute("aria-expanded", "false");
  });

  it("desde 1700 px, y en otras rutas, la barra sigue fija como siempre", () => {
    conAncho(1800);
    const { container, unmount } = abrirEn("/home/cuadro/mis-operativos");
    expect(container.querySelector("[data-barra-fija]")).not.toBeNull();
    expect(botonMenu()).not.toHaveTextContent("Menú");
    unmount();

    conAncho(1280);
    const otra = abrirEn("/home/cuadro/jornada");
    expect(otra.container.querySelector("[data-barra-fija]")).not.toBeNull();
    expect(botonMenu()).not.toHaveAttribute("aria-controls");
  });
});

describe("armazón · barra plegada en Registro de operativo", () => {
  it("bajo 1840 px la barra no ocupa columna y el botón «Menú» abre el menú flotante", async () => {
    conAncho(1700);
    const { container } = abrirEn("/home/cuadro/registro");
    const usuario = userEvent.setup();

    expect(container.querySelector("[data-barra-fija]")).toBeNull();
    expect(botonMenu()).toHaveTextContent("Menú");
    expect(botonMenu()).toHaveAttribute("aria-controls", "menu-lateral-flotante");

    await usuario.click(botonMenu());
    expect(botonMenu()).toHaveAttribute("aria-expanded", "true");
    await act(async () => {
      await usuario.keyboard("{Escape}");
    });
    expect(botonMenu()).toHaveAttribute("aria-expanded", "false");
    expect(botonMenu()).toHaveFocus();
  });

  it("desde 1840 px la barra sigue fija", () => {
    conAncho(1920);
    const { container } = abrirEn("/home/cuadro/registro");
    expect(container.querySelector("[data-barra-fija]")).not.toBeNull();
    expect(botonMenu()).not.toHaveTextContent("Menú");
  });
});
