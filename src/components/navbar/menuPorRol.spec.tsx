/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Navegación por rol
 * Archivo: menuPorRol.spec.tsx
 * Responsabilidad: Verificar que el menú atenúa lo que no corresponde al perfil.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA SUITE EXISTE POR UN DEFECTO REAL, reportado el 2026-08-20 al entrar con los roles
 * Dirección y DMIP Operativos: **el grupo «Administración» se pintaba habilitado.**
 *
 * Los hijos sí se atenuaban —`opacity-40`, sin enlace y con su explicación— pero la
 * cabecera del grupo no comprobaba nada: se veía igual para un Director que para un
 * Administrador, y solo al desplegarla se descubría que las cinco opciones estaban
 * apagadas. El propio archivo afirmaba en un comentario que los grupos se atenuaban.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL MENÚ NO SE FILTRA, SE ATENÚA, y es una regla de diseño (FASE5 §3.2): quien busca
 * «Matriz Consolidada» sin encontrarla acaba preguntando por teléfono. Por eso lo que se
 * comprueba es que aparezca **y** que se vea inaccesible, no que desaparezca.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Content } from "./MenuDropdownParts.tsx";
import { UserContext } from "../../context/UserContext.tsx";
import type { RolDepartamental } from "../../config/env.ts";
import type { User } from "../../interfaces/User.ts";

const conRoles = (rolCodes: RolDepartamental[]) => {
  const user: User = {
    userid: 0,
    usuFullName: "Persona de prueba",
    usuEmail: "prueba",
    rolCodes,
    rolName: "Persona de prueba",
    token: "",
    actividades: [],
  };

  return render(
    <UserContext.Provider
      value={{
        user,
        establecerSesion: vi.fn(),
        estado: "conSesion",
        cerrarSesion: vi.fn(),
      }}
    >
      <MemoryRouter>
        <Content onNavigate={vi.fn()} />
      </MemoryRouter>
    </UserContext.Provider>,
  );
};

/** La cabecera del grupo, que es un `<summary>` y no un enlace. */
const grupo = (etiqueta: string) =>
  screen.getByText(etiqueta).closest("summary");

describe("el menú lateral según el perfil", () => {
  /** El caso reportado, con los roles exactos de quien lo encontró. */
  it("atenúa Administración para quien es Dirección y Operativos", () => {
    conRoles(["DIRECTOR", "DMIP_OPERATIVOS"]);

    const administracion = grupo("Administración");

    expect(administracion).not.toBeNull();
    expect(administracion?.className).toContain("opacity-40");
    expect(administracion).toHaveAttribute("aria-disabled", "true");
  });

  it("no atenúa Administración para el Administrador", () => {
    conRoles(["ADMINISTRADOR"]);

    const administracion = grupo("Administración");

    expect(administracion?.className).not.toContain("opacity-40");
    expect(administracion).not.toHaveAttribute("aria-disabled");
  });

  /**
   * BASTA CON UN ROL. La unión es la semántica acordada el 2026-08-19: quien tenga varios
   * alcanza lo de todos ellos.
   */
  it("basta con que UNO de sus roles alcance el grupo", () => {
    conRoles(["DIRECTOR", "ADMINISTRADOR"]);

    expect(grupo("Administración")?.className).not.toContain("opacity-40");
  });

  /** No se oculta: la regla es atenuar, para que se entienda que existe y no le toca. */
  it("el grupo sigue estando visible aunque no corresponda", () => {
    conRoles(["FUNCIONARIO"]);

    expect(screen.getByText("Administración")).toBeInTheDocument();
  });
});
