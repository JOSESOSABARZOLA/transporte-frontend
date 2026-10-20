/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Tooltip
 * Archivo: tooltip.spec.tsx
 * Responsabilidad: Fijar el tooltip único: retraso con el ratón, al instante con el foco, Escape lo
 *                  cierra, el texto como descripción accesible y las acciones de fila con icono.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AccionesFila from "./AccionesFila.tsx";
import Boton from "./Boton.tsx";
import Tooltip, { RETRASO_TOOLTIP_MS } from "./Tooltip.tsx";

afterEach(() => {
  vi.useRealTimers();
});

const burbuja = () => screen.queryByRole("tooltip", { hidden: true });

describe("Tooltip", () => {
  it("con el ratón espera 300 ms; al salir se cierra", () => {
    vi.useFakeTimers();
    render(
      <Tooltip texto="Editar">
        <Boton icono="editar" aria-label="Editar OCPMO-001" />
      </Tooltip>,
    );
    const ancla = screen.getByRole("button").parentElement as HTMLElement;

    fireEvent.mouseEnter(ancla);
    act(() => {
      vi.advanceTimersByTime(RETRASO_TOOLTIP_MS - 1);
    });
    expect(burbuja()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(burbuja()).toHaveTextContent("Editar");
    // Va en un portal, fuera de la celda: ningún `overflow` lo corta.
    expect(burbuja()?.parentElement).toBe(document.body);

    fireEvent.mouseLeave(ancla);
    expect(burbuja()).toBeNull();
  });

  it("con el teclado aparece al instante, y Escape lo cierra", () => {
    render(
      <Tooltip texto="Ver detalle">
        <Boton icono="ver" aria-label="Ver detalle OCPMO-001" />
      </Tooltip>,
    );
    const boton = screen.getByRole("button", { name: "Ver detalle OCPMO-001" });

    act(() => boton.focus());
    expect(burbuja()).toHaveTextContent("Ver detalle");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(burbuja()).toBeNull();
  });

  it("el texto es la descripción accesible del control, abierto o cerrado", () => {
    render(
      <Tooltip texto="No tiene permiso para eliminar">
        <Boton icono="eliminar" aria-label="Eliminar OCPMO-001" />
      </Tooltip>,
    );
    const boton = screen.getByRole("button", { name: "Eliminar OCPMO-001" });
    expect(boton).toHaveAttribute("aria-describedby");
    expect(boton).toHaveAccessibleDescription("No tiene permiso para eliminar");
  });

  it("sin texto, el control se pinta solo, sin tooltip", () => {
    render(
      <Tooltip texto={null}>
        <Boton aria-label="Algo">Algo</Boton>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "Algo" })).not.toHaveAttribute("aria-describedby");
  });
});

describe("AccionesFila en modo icono (tablas densas)", () => {
  it("botones cuadrados sin texto, con el registro en el nombre y el motivo en el tooltip", () => {
    render(
      <AccionesFila
        modo="icono"
        nombre="PBA-1235"
        editar={{ onClick: vi.fn() }}
        estado={{ tipo: "desactivar", onClick: vi.fn(), motivo: "Tiene operativos hoy" }}
      />,
    );
    const editar = screen.getByRole("button", { name: "Editar PBA-1235" });
    expect(editar).toHaveClass("btn-square", "btn-sm");
    expect(editar).toHaveTextContent("");
    expect(editar).toHaveAccessibleDescription("Editar");

    const desactivar = screen.getByRole("button", { name: "Desactivar PBA-1235" });
    expect(desactivar).toHaveAttribute("aria-disabled", "true");
    expect(desactivar).toHaveAccessibleDescription("Tiene operativos hoy");
  });

  it("en modo texto (por omisión) sigue con su rótulo visible", () => {
    render(<AccionesFila nombre="PBA-1235" editar={{ onClick: vi.fn() }} />);
    expect(screen.getByRole("button", { name: "Editar PBA-1235" })).toHaveTextContent("Editar");
  });
});
