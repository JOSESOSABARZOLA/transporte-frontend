/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: botonRepartoCarga.spec.tsx
 * Responsabilidad: Verificar el botón «Ver reparto de carga»: rol, nombre accesible, estado y clic.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * Se prueban las DECISIONES de accesibilidad —que sea un botón que abre un diálogo, que diga si
 * está abierto y que el resumen del semáforo se lea en palabras— y que el clic dispare la acción.
 * El aspecto (clases) se comprueba mirando, no aquí.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BotonRepartoCarga from "./BotonRepartoCarga.tsx";

describe("BotonRepartoCarga", () => {
  it("es un botón con nombre accesible estable que anuncia que abre un diálogo", () => {
    render(<BotonRepartoCarga onClick={vi.fn()} expandido={false} />);

    const boton = screen.getByRole("button", { name: "Ver reparto de carga" });
    expect(boton).toHaveAttribute("aria-haspopup", "dialog");
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(boton).toHaveAttribute(
      "title",
      "Ver cómo se distribuye la carga entre el personal",
    );
  });

  it("refleja el reparto abierto con aria-expanded", () => {
    render(<BotonRepartoCarga onClick={vi.fn()} expandido />);

    expect(
      screen.getByRole("button", { name: "Ver reparto de carga" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("el resumen del semáforo se lee en palabras como DESCRIPCIÓN, sin cambiar el nombre", () => {
    render(
      <BotonRepartoCarga
        onClick={vi.fn()}
        expandido={false}
        conteo={{ baja: 3, media: 2, alta: 1 }}
      />,
    );

    const boton = screen.getByRole("button", { name: "Ver reparto de carga" });
    expect(boton).toHaveAccessibleDescription(
      "Carga baja: 3; media: 2; alta: 1.",
    );
  });

  it("sin señales de carga no pinta resumen ni descripción", () => {
    render(
      <BotonRepartoCarga
        onClick={vi.fn()}
        expandido={false}
        conteo={{ baja: 0, media: 0, alta: 0 }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ver reparto de carga" }),
    ).not.toHaveAttribute("aria-describedby");
  });

  it("al pulsarlo llama a onClick", async () => {
    const onClick = vi.fn();
    render(<BotonRepartoCarga onClick={onClick} expandido={false} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Ver reparto de carga" }),
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
