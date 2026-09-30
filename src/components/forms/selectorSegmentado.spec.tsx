/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios
 * Archivo: selectorSegmentado.spec.tsx
 * Responsabilidad: Verificar el control segmentado — sin valor por defecto, cambio y error.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SelectorSegmentado from "./SelectorSegmentado.tsx";

const opciones = [
  { valor: "NOMBRAMIENTO", nombre: "Nombramiento" },
  { valor: "OCASIONAL", nombre: "Ocasional" },
];

describe("SelectorSegmentado", () => {
  it("sin valor no marca ninguna opción (no hay default)", () => {
    render(
      <SelectorSegmentado
        id="c"
        etiqueta="Tipo de contrato"
        opciones={opciones}
        valor=""
        onCambiar={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Nombramiento" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Ocasional" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("al pulsar una opción avisa su valor", async () => {
    const onCambiar = vi.fn();
    render(
      <SelectorSegmentado
        id="c"
        etiqueta="Tipo de contrato"
        opciones={opciones}
        valor=""
        onCambiar={onCambiar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ocasional" }));
    expect(onCambiar).toHaveBeenCalledWith("OCASIONAL");
  });

  it("marca la opción activa con aria-pressed", () => {
    render(
      <SelectorSegmentado
        id="c"
        etiqueta="Tipo de contrato"
        opciones={opciones}
        valor="NOMBRAMIENTO"
        onCambiar={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Nombramiento" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra el error con texto y marca las opciones inválidas", () => {
    render(
      <SelectorSegmentado
        id="c"
        etiqueta="Tipo de contrato"
        opciones={opciones}
        valor=""
        onCambiar={vi.fn()}
        error="Indique el tipo de contrato."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Indique el tipo de contrato.",
    );
    expect(
      screen.getByRole("button", { name: "Nombramiento" }),
    ).toHaveAttribute("aria-invalid", "true");
  });
});
