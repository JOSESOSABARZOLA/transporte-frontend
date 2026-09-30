/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: capturadorNotas.spec.tsx
 * Responsabilidad: Que las observaciones se capturen como NOTAS independientes.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-09
 *
 * Se prueban DECISIONES, no el maquetado: que agregar una nota avise con la lista nueva,
 * que quitar una la retire, que las notas en blanco no entren, y que las ya escritas
 * (bitácora) se muestren en SOLO LECTURA —sin «×»—, con su autor.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CapturadorNotas from "./CapturadorNotas.tsx";

const marcador = "Escriba una nota y pulse Agregar";

describe("CapturadorNotas · notas independientes", () => {
  it("agregar una nota avisa con la lista nueva, y limpia el campo", async () => {
    const onCambio = vi.fn();
    render(<CapturadorNotas notasNuevas={[]} onCambio={onCambio} />);

    await userEvent.type(screen.getByPlaceholderText(marcador), "Primera");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onCambio).toHaveBeenCalledWith(["Primera"]);
    expect(screen.getByPlaceholderText(marcador)).toHaveValue("");
  });

  it("una nota en blanco no entra", async () => {
    const onCambio = vi.fn();
    render(<CapturadorNotas notasNuevas={[]} onCambio={onCambio} />);

    await userEvent.type(screen.getByPlaceholderText(marcador), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onCambio).not.toHaveBeenCalled();
  });

  it("quitar una nota nueva la retira de la lista", async () => {
    const onCambio = vi.fn();
    render(
      <CapturadorNotas notasNuevas={["Una", "Otra"]} onCambio={onCambio} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Quitar la nota: Una" }),
    );

    expect(onCambio).toHaveBeenCalledWith(["Otra"]);
  });

  it("las notas ya escritas se muestran en solo lectura, con su autor", () => {
    render(
      <CapturadorNotas
        notasNuevas={[]}
        onCambio={vi.fn()}
        notasExistentes={[
          {
            texto: "Coordinado con la AMT.",
            creadoPorRol: "DMIP_INSPECCIONES",
            creadoEn: "2026-09-09T14:30:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Coordinado con la AMT.")).toBeInTheDocument();
    // El autor, en palabras (bitácora). No lleva «×»: no se edita ni se borra.
    expect(screen.getByText(/DMIP Inspecciones/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Quitar la nota/ }),
    ).toBeNull();
  });
});
