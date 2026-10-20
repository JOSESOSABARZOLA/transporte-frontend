/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Distintivos
 * Archivo: insignia.spec.tsx
 * Responsabilidad: Verificar que el distintivo único comparte estructura y solo cambia la variante.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Insignia from "./Insignia.tsx";

describe("Insignia", () => {
  it.each([
    ["exito", "badge-success"],
    ["neutro", "badge-ghost"],
    ["aviso", "badge-warning"],
    ["suave", "app-insignia-suave"],
  ] as const)("la variante %s lleva su clase sobre la misma base", (variante, clase) => {
    render(<Insignia variante={variante}>Vigente</Insignia>);
    const distintivo = screen.getByText("Vigente");
    expect(distintivo).toHaveClass("badge", "badge-sm", clase);
  });

  it("el texto es la señal y el title amplía", () => {
    render(
      <Insignia
        variante="aviso"
        title="Sin áreas de personal"
      >
        ⚠ Sin áreas
      </Insignia>,
    );
    expect(screen.getByText("⚠ Sin áreas")).toHaveAttribute("title", "Sin áreas de personal");
  });
});
