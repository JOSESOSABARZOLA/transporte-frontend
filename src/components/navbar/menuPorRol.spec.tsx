/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Navegación por rol
 * Archivo: menuPorRol.spec.tsx
 * Responsabilidad: Verificar que el menú OCULTA lo que no corresponde al perfil.
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
 * DESDE EL 2026-10-06 EL MENÚ OCULTA, YA NO ATENÚA (decisión del negocio): el atenuado de FASE5
 * §3.2 llenaba el menú de opciones grises que el perfil nunca abre. Ahora un grupo sin ninguna
 * opción alcanzable no se pinta, y dentro de un grupo solo quedan las opciones del perfil. El
 * defecto original (un grupo inútil pintado como útil) sigue cubierto: ese grupo ya no aparece.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Content } from "./MenuDropdownParts.tsx";
import { UserContext } from "../../context/UserContext.tsx";
import type { RolDepartamental } from "../../config/env.ts";
import type { User } from "../../interfaces/User.ts";
import { permisosDeRoles } from "../../pruebas/permisos.ts";

/** Una clase de opacidad sobre texto (no las de transición, 0 y 100). docs/estilos.md. */
const CLASE_OPACIDAD = /(?:^| )opacity-(?!0(?: |$)|100(?: |$))[0-9]/;

const conRoles = (rolCodes: RolDepartamental[]) => {
  const user: User = {
    userid: 0,
    usuFullName: "Persona de prueba",
    usuEmail: "prueba",
    rolCodes,
    // El menú gatea por permisos (RBAC): se derivan de los roles como lo hace el servidor.
    permisos: permisosDeRoles(rolCodes),
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


describe("el menú lateral según el perfil", () => {
  /** El caso reportado, con los roles exactos de quien lo encontró: ahora el grupo no aparece. */
  it("oculta Administración para quien es Dirección y Operativos", () => {
    conRoles(["DIRECTOR", "DMIP_OPERATIVOS"]);

    expect(screen.queryByText("Administración")).toBeNull();
  });

  it("muestra Administración al Administrador, sin opciones atenuadas", () => {
    const { container } = conRoles(["ADMINISTRADOR_DMIP"]);

    expect(screen.getByText("Administración")).toBeInTheDocument();
    expect(
      [...container.querySelectorAll("[class]")].some((nodo) =>
        CLASE_OPACIDAD.test(nodo.getAttribute("class") ?? ""),
      ),
    ).toBe(false);
    expect(container.querySelector('[aria-disabled="true"]')).toBeNull();
  });

  /**
   * BASTA CON UN ROL. La unión es la semántica acordada el 2026-08-19: quien tenga varios
   * alcanza lo de todos ellos.
   */
  it("basta con que UNO de sus roles alcance el grupo", () => {
    conRoles(["DIRECTOR", "ADMINISTRADOR_DMIP"]);

    expect(screen.getByText("Administración")).toBeInTheDocument();
  });

  it("dentro de un grupo solo quedan las opciones del perfil", () => {
    conRoles(["DMIP_OPERATIVOS"]);

    // Operativos registra, pero no abre la Matriz (es de la Dirección).
    expect(screen.getByText("Registro de operativo")).toBeInTheDocument();
    expect(screen.queryByText("Matriz Consolidada")).toBeNull();
  });

  it("un perfil sin ninguna opción de administración no ve el grupo", () => {
    conRoles(["FUNCIONARIO"]);

    expect(screen.queryByText("Administración")).toBeNull();
  });
});
