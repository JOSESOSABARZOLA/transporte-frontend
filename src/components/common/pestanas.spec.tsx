/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Pestañas
 * Archivo: pestanas.spec.tsx
 * Responsabilidad: Verificar que la pestaña elegida se distingue sin depender solo del color y que
 *                  el teclado mueve la selección.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import Pestanas from "./Pestanas.tsx";

type Id = "uno" | "dos" | "tres";

function Prueba({ sobreBarra = false }: { sobreBarra?: boolean }) {
  const [activa, setActiva] = useState<Id>("uno");
  return (
    <Pestanas
      sobreBarra={sobreBarra}
      etiqueta="Maestro"
      pestanas={[
        { id: "uno", titulo: "Vehículos", cuenta: 4, etiquetaCuenta: "activos" },
        { id: "dos", titulo: "Conductores", cuenta: 3, etiquetaCuenta: "activos" },
        { id: "tres", titulo: "Garajes", cuenta: 6, etiquetaCuenta: "vigentes" },
      ]}
      activa={activa}
      onElegir={setActiva}
    />
  );
}

describe("Pestanas", () => {
  it("la elegida va sombreada, en negrita y marcada; las demás, sin fondo y con hover", () => {
    render(<Prueba />);
    const elegida = screen.getByRole("tab", { name: /Vehículos/ });
    const otra = screen.getByRole("tab", { name: /Conductores/ });

    expect(elegida).toHaveAttribute("aria-selected", "true");
    expect(elegida).toHaveClass("tab-active", "bg-primary/10", "font-bold", "rounded-t-lg");
    expect(otra).toHaveAttribute("aria-selected", "false");
    expect(otra).toHaveClass("bg-transparent", "hover:bg-base-200", "cursor-pointer");
    expect(otra).not.toHaveClass("tab-active");
    expect(screen.getByLabelText("6 vigentes")).toBeInTheDocument();
  });

  it("clic y flechas cambian la pestaña elegida", () => {
    render(<Prueba />);
    fireEvent.click(screen.getByRole("tab", { name: /Garajes/ }));
    expect(screen.getByRole("tab", { name: /Garajes/ })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(screen.getByRole("tab", { name: /Garajes/ }), { key: "ArrowRight" });
    const primera = screen.getByRole("tab", { name: /Vehículos/ });
    expect(primera).toHaveAttribute("aria-selected", "true");
    expect(primera).toHaveFocus();

    fireEvent.keyDown(primera, { key: "End" });
    expect(screen.getByRole("tab", { name: /Garajes/ })).toHaveAttribute("aria-selected", "true");
  });
});

/** Sobre la cabecera azul (2026-10-24, «Ventanas y parámetros»). */
describe("Pestanas · sobreBarra", () => {
  it("usa las clases de la barra, con el mismo comportamiento", () => {
    render(<Prueba sobreBarra />);
    const elegida = screen.getByRole("tab", { name: /Vehículos/ });
    const otra = screen.getByRole("tab", { name: /Conductores/ });

    expect(screen.getByRole("tablist")).not.toHaveClass("tabs-border");
    expect(elegida).toHaveClass("app-pestana-barra-activa");
    expect(elegida).toHaveAttribute("aria-selected", "true");
    expect(otra).toHaveClass("app-pestana-barra");
    expect(otra.querySelector(".badge")).toHaveClass("app-pestana-barra-cuenta");

    fireEvent.keyDown(elegida, { key: "ArrowRight" });
    expect(otra).toHaveAttribute("aria-selected", "true");
    expect(otra).toHaveClass("app-pestana-barra-activa");
  });
});
