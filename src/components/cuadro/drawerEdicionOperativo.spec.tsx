/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: drawerEdicionOperativo.spec.tsx
 * Responsabilidad: Verificar el envoltorio del cajón de edición (P-02).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * Es un envoltorio delgado sobre `DrawerLateral`: aquí se prueba que expone el cuerpo y el pie
 * como diálogo accesible cuando está abierto, y que no pinta nada cuando está cerrado. La mecánica
 * de foco/Escape/velo la cubre la spec de `DrawerLateral` (`drawerYstepper.spec`).
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DrawerEdicionOperativo from "./DrawerEdicionOperativo.tsx";

describe("DrawerEdicionOperativo", () => {
  it("cerrado no pinta el diálogo", () => {
    render(
      <DrawerEdicionOperativo
        abierto={false}
        titulo="Editar operativo OCF-001"
        onCerrar={vi.fn()}
        pie={<button type="button">Guardar cambios</button>}
      >
        <p>cuerpo de la edición</p>
      </DrawerEdicionOperativo>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("cuerpo de la edición")).toBeNull();
  });

  it("abierto es un diálogo con su título, el cuerpo y el pie de acciones", () => {
    render(
      <DrawerEdicionOperativo
        abierto
        titulo="Editar operativo OCF-001"
        onCerrar={vi.fn()}
        pie={<button type="button">Guardar cambios</button>}
      >
        <p>cuerpo de la edición</p>
      </DrawerEdicionOperativo>,
    );

    const dialogo = screen.getByRole("dialog", {
      name: /Editar operativo OCF-001/,
    });
    expect(within(dialogo).getByText("cuerpo de la edición")).toBeInTheDocument();
    expect(
      within(dialogo).getByRole("button", { name: "Guardar cambios" }),
    ).toBeInTheDocument();
  });
});
