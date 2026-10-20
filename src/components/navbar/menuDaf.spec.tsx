/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Navegación de la DAF
 * Archivo: menuDaf.spec.tsx
 * Responsabilidad: Verificar el grupo «Transporte · DAF», sus redirecciones y la fecha compartida.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * EXCEPCIÓN ACOTADA A PER-07: dentro del grupo «Transporte · DAF» lo que el perfil no puede abrir
 * se OCULTA (decisión del negocio, 2026-10-06); el resto del menú sigue atenuando, y eso lo
 * guarda `menuPorRol.spec`. Aquí se prueba solo lo nuevo.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Content } from "./MenuDropdownParts.tsx";
import RedireccionDaf from "../common/RedireccionDaf.tsx";
import { UserContext } from "../../context/UserContext.tsx";
import { FechaDafProvider, useFechaDaf } from "../../context/FechaDafContext.tsx";
import type { RolDepartamental } from "../../config/env.ts";
import type { User } from "../../interfaces/User.ts";
import { permisosDeRoles } from "../../pruebas/permisos.ts";

const usuario = (rolCodes: RolDepartamental[]): User => ({
  userid: 0,
  usuFullName: "Persona de prueba",
  usuEmail: "prueba",
  rolCodes,
  permisos: permisosDeRoles(rolCodes),
  rolName: "Persona de prueba",
  token: "",
  actividades: [],
});

const conRoles = (rolCodes: RolDepartamental[], ruta = "/home/cuadro/transporte") =>
  render(
    <UserContext.Provider
      value={{
        user: usuario(rolCodes),
        establecerSesion: vi.fn(),
        estado: "conSesion",
        cerrarSesion: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[ruta]}>
        <FechaDafProvider>
          <Content onNavigate={vi.fn()} />
        </FechaDafProvider>
      </MemoryRouter>
    </UserContext.Provider>,
  );

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("menú · grupo «Transporte · DAF»", () => {
  it("la DAF ve las cinco opciones, sin títulos de grupo (mismo patrón que el resto del menú)", () => {
    conRoles(["DAF"]);

    expect(screen.getByText("Transporte · DAF")).toBeInTheDocument();
    expect(screen.queryByText("Uso diario")).toBeNull();
    expect(screen.queryByText("Configuración")).toBeNull();
    expect(screen.getByRole("link", { name: /Planificar el día/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Turnos del mes/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Traslados entre zonales/ })).toBeInTheDocument();
  });

  it("un solo divisor fino, justo antes de «Flota…»", () => {
    conRoles(["DAF"]);

    const divisores = screen.getAllByRole("separator", { hidden: true });
    expect(divisores).toHaveLength(1);
    // El divisor y el enlace de Flota comparten la misma sublista.
    const lista = divisores[0].closest("ul");
    expect(lista).not.toBeNull();
    expect(lista?.textContent).toContain("Flota");
  });

  it("dentro del grupo, lo no permitido se OCULTA (no se atenúa)", () => {
    // El Administrador DAF administra la flota pero no asigna transporte.
    conRoles(["ADMINISTRADOR_DAF"]);

    expect(screen.queryByText("Planificar el día")).toBeNull();
    expect(screen.getByRole("link", { name: /Mantenimiento/ })).toBeInTheDocument();
  });

  it("sin ninguna opción, el grupo entero desaparece", () => {
    conRoles(["DMIP_OPERATIVOS"]);

    expect(screen.queryByText("Transporte · DAF")).toBeNull();
  });

  it("los enlaces llevan la fecha de trabajo compartida", () => {
    window.sessionStorage.setItem("sigoc.transporte.fechaDaf", "2026-10-09");
    conRoles(["DAF"]);

    // El enlace es relativo (en la aplicación cuelga de /home); aquí el enrutador no tiene padre.
    expect(screen.getByRole("link", { name: /Turnos del mes/ })).toHaveAttribute(
      "href",
      "/administracion/turnos-conductores?fecha=2026-10-09",
    );
  });

  it("«Flota y garajes» no la lleva: es un maestro, no depende de ninguna jornada (2026-10-15)", () => {
    window.sessionStorage.setItem("sigoc.transporte.fechaDaf", "2026-10-09");
    conRoles(["DAF"]);

    expect(screen.getByRole("link", { name: /Flota y garajes/ })).toHaveAttribute(
      "href",
      "/administracion/flota",
    );
  });
});

/** Muestra dónde terminó la navegación. */
const Destino = () => {
  const { pathname, search } = useLocation();
  return <p>{`${pathname}${search}`}</p>;
};

const redirigir = (desde: string) =>
  render(
    <MemoryRouter initialEntries={[desde]}>
      <FechaDafProvider>
        <Routes>
          <Route path="/home/cuadro/jornada-conductores" element={<RedireccionDaf vista="tabla" />} />
          <Route path="/home/cuadro/capacidad" element={<RedireccionDaf />} />
          <Route path="/home/cuadro/transporte" element={<Destino />} />
        </Routes>
      </FechaDafProvider>
    </MemoryRouter>,
  );

describe("redirecciones de las pantallas absorbidas", () => {
  it("«Jornada de los conductores» abre Planificar el día en la vista de tabla, con su fecha", () => {
    redirigir("/home/cuadro/jornada-conductores?fecha=2026-10-08");

    expect(
      screen.getByText("/home/cuadro/transporte?fecha=2026-10-08&vista=tabla"),
    ).toBeInTheDocument();
  });

  it("«Capacidad de flota» abre Planificar el día conservando la fecha", () => {
    redirigir("/home/cuadro/capacidad?fecha=2026-10-08");

    expect(screen.getByText("/home/cuadro/transporte?fecha=2026-10-08")).toBeInTheDocument();
  });
});

/** Una pantalla DAF mínima: muestra su fecha y permite cambiarla. */
const PantallaDaf = ({ nombre }: { nombre: string }) => {
  const { fecha, setFecha } = useFechaDaf();
  return (
    <div>
      <p>{`${nombre}: ${fecha}`}</p>
      <button type="button" onClick={() => setFecha("2026-10-12")}>
        Elegir 12
      </button>
    </div>
  );
};

describe("fecha de trabajo compartida", () => {
  it("la fecha elegida en una pantalla DAF se conserva al pasar a otra", async () => {
    const usuarioEvt = userEvent.setup();
    const { unmount } = render(
      <MemoryRouter initialEntries={["/a"]}>
        <FechaDafProvider>
          <Routes>
            <Route path="/a" element={<PantallaDaf nombre="Planificar" />} />
          </Routes>
        </FechaDafProvider>
      </MemoryRouter>,
    );
    await usuarioEvt.click(screen.getByRole("button", { name: "Elegir 12" }));
    expect(screen.getByText("Planificar: 2026-10-12")).toBeInTheDocument();
    unmount();

    // Otra pantalla, sin `?fecha=`: hereda la de la sesión.
    render(
      <MemoryRouter initialEntries={["/b"]}>
        <FechaDafProvider>
          <Routes>
            <Route path="/b" element={<PantallaDaf nombre="Turnos" />} />
          </Routes>
        </FechaDafProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Turnos: 2026-10-12")).toBeInTheDocument();
  });

  it("la `?fecha=` de la URL manda sobre la recordada", () => {
    window.sessionStorage.setItem("sigoc.transporte.fechaDaf", "2026-10-12");
    render(
      <MemoryRouter initialEntries={["/b?fecha=2026-10-20"]}>
        <FechaDafProvider>
          <Routes>
            <Route path="/b" element={<PantallaDaf nombre="Turnos" />} />
          </Routes>
        </FechaDafProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Turnos: 2026-10-20")).toBeInTheDocument();
  });
});
