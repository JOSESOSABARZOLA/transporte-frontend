/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral y stepper
 * Archivo: drawerYstepper.spec.tsx
 * Responsabilidad: Verificar la accesibilidad del cajón y que el stepper marca el paso hecho.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DrawerLateral from "./DrawerLateral.tsx";
import Stepper from "./Stepper.tsx";

describe("DrawerLateral · cajón accesible", () => {
  it("es un diálogo con nombre accesible (aria-labelledby) y aspa para cerrar", () => {
    render(
      <DrawerLateral
        abierto
        titulo="Buscar persona"
        onCerrar={vi.fn()}
      >
        <p>cuerpo</p>
      </DrawerLateral>,
    );

    expect(
      screen.getByRole("dialog", { name: "Buscar persona" }),
    ).toBeInTheDocument();
    // El velo y el aspa se llaman ambos «Cerrar».
    expect(screen.getAllByRole("button", { name: "Cerrar" }).length).toBe(2);
  });

  it("no se pinta cuando está cerrado", () => {
    render(
      <DrawerLateral
        abierto={false}
        titulo="X"
      >
        <p>c</p>
      </DrawerLateral>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape cierra (por el hook de accesibilidad compartido)", async () => {
    const cerrar = vi.fn();
    render(
      <DrawerLateral
        abierto
        titulo="X"
        onCerrar={cerrar}
      >
        <p>c</p>
      </DrawerLateral>,
    );

    await userEvent.keyboard("{Escape}");
    expect(cerrar).toHaveBeenCalled();
  });

  it("el clic en el velo cierra", async () => {
    const cerrar = vi.fn();
    render(
      <DrawerLateral
        abierto
        titulo="X"
        onCerrar={cerrar}
      >
        <p>c</p>
      </DrawerLateral>,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Cerrar" })[0]);
    expect(cerrar).toHaveBeenCalled();
  });
});

describe("Stepper · el paso hecho se marca", () => {
  it("pinta los títulos y sustituye por un check el número del paso completado", () => {
    render(
      <Stepper
        pasos={[
          { numero: 1, titulo: "Buscar persona" },
          { numero: 2, titulo: "Completar ficha" },
        ]}
        actual={2}
        completados={[1]}
      />,
    );

    expect(screen.getByText("Buscar persona")).toBeInTheDocument();
    expect(screen.getByText("Completar ficha")).toBeInTheDocument();
    // El paso 1 (hecho) muestra check, no su número; el 2 (actual) muestra su número.
    expect(screen.queryByText("1")).toBeNull();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("Stepper · el paso no alcanzado dice por qué (estándar de botones)", () => {
  it("queda apagado con `aria-disabled` y su motivo en el `title`, y no navega", async () => {
    const usuario = userEvent.setup();
    const onIr = vi.fn();
    render(
      <Stepper
        pasos={[
          { numero: 1, titulo: "Preparar" },
          { numero: 2, titulo: "Asignar" },
        ]}
        actual={1}
        completados={[]}
        alcanzables={[1]}
        onIr={onIr}
      />,
    );

    const asignar = screen.getByRole("button", { name: /Asignar/ });
    expect(asignar).toHaveAttribute("aria-disabled", "true");
    expect(asignar).toHaveAttribute("title", "Complete los pasos anteriores para llegar aquí.");
    await usuario.click(asignar);
    expect(onIr).not.toHaveBeenCalled();
  });
});
