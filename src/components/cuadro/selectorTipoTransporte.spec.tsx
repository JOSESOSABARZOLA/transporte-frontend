/**
 * App: Cuadro de Colores
 * Módulo: Cuadro
 * Feature: Transporte requerido
 * Archivo: selectorTipoTransporte.spec.tsx
 * Responsabilidad: Fijar las tres ayudas del combo de transporte y su manejo con ratón, teclado y toque.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import SelectorTipoTransporte from "./SelectorTipoTransporte.tsx";
import type { TipoTransporte } from "../../interfaces/Operativo.ts";
import { OPCIONES_TRANSPORTE } from "../../utils/tipoTransporte.util.ts";

/** El combo con su estado, como lo usa el formulario. */
const ConEstado = ({ inicial = "COMPLETO" as TipoTransporte, onCambiar = vi.fn() }) => {
  const [valor, setValor] = useState<TipoTransporte>(inicial);
  return (
    <SelectorTipoTransporte
      valor={valor}
      onCambiar={(nuevo) => {
        setValor(nuevo);
        onCambiar(nuevo);
      }}
    />
  );
};

const combo = () => screen.getByRole("combobox", { name: /Transporte requerido/ });

/** La explicación visible de la opción activa: flota AL LADO de la lista (2026-10-07). */
const explicacionVisible = () =>
  document.querySelector<HTMLElement>("[data-explicacion-opcion]");

describe("SelectorTipoTransporte · el combo", () => {
  it("es una lista ARIA: combobox, listbox y una opción por tipo, con su descripción", async () => {
    render(<ConEstado />);

    await userEvent.click(combo());

    expect(combo()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const opciones = screen.getAllByRole("option");
    expect(opciones).toHaveLength(5);
    OPCIONES_TRANSPORTE.forEach((opcion, indice) => {
      expect(opciones[indice]).toHaveAccessibleDescription(opcion.descripcion);
    });
  });

  it("con el ratón, la opción bajo el puntero muestra su explicación", async () => {
    render(<ConEstado />);
    await userEvent.click(combo());

    const soloDejar = screen.getByRole("option", { name: /^Solo dejar/ });
    await userEvent.hover(soloDejar);

    expect(explicacionVisible()).toHaveTextContent(
      "Se deja al equipo en el punto de encuentro al inicio del operativo; regresa por su cuenta.",
    );
  });

  it("con ↑/↓ se recorre, la activa se anuncia y Enter elige", async () => {
    const onCambiar = vi.fn();
    render(<ConEstado onCambiar={onCambiar} />);

    combo().focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(combo()).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");

    const activa = document.getElementById(combo().getAttribute("aria-activedescendant") ?? "");
    expect(activa).toHaveTextContent("Solo retirar");
    expect(explicacionVisible()).toHaveTextContent(
      "Se recoge al equipo al terminar el operativo; llega por su cuenta.",
    );

    await userEvent.keyboard("{Enter}");
    expect(onCambiar).toHaveBeenCalledWith("SOLO_FIN");
    expect(combo()).toHaveAttribute("aria-expanded", "false");
    expect(combo()).toHaveTextContent("Solo retirar");
  });

  /**
   * MAQUETACIÓN (2026-10-07, segunda vuelta). En jsdom no hay diseño, así que se fija lo que lo
   * provocaba: la lista copiaba el ancho del combo (35 px) y el combo se encogía.
   */
  it("la lista no hereda el ancho del combo: mínimo propio de 260 px y sin ancho fijo", async () => {
    render(<ConEstado />);
    await userEvent.click(combo());

    const lista = screen.getByRole("listbox");
    expect(lista.style.minWidth).toBe("260px");
    expect(lista.style.width).toBe("");
    // Cada opción en una línea.
    screen.getAllByRole("option").forEach((opcion) =>
      expect(opcion.firstElementChild).toHaveClass("whitespace-nowrap"),
    );
    // La explicación se abre al lado, con 320 px como máximo.
    expect(explicacionVisible()?.style.maxWidth).toBe("320px");
  });

  it("el combo muestra el nombre completo, no se encoge y tiene ancho mínimo", () => {
    render(<ConEstado inicial="INICIO_Y_FIN" />);

    expect(combo()).toHaveTextContent("Dejar y retirar");
    expect(combo()).toHaveClass("shrink-0");
    expect(combo()).not.toHaveClass("w-full");
    expect(combo().style.minWidth).toBe("220px");
  });

  it("lo que llega en «junto» va en la fila del combo, no en la de la etiqueta", () => {
    render(
      <SelectorTipoTransporte
        valor="COMPLETO"
        onCambiar={vi.fn()}
        junto={<span data-testid="casilla">casilla</span>}
      />,
    );

    const casilla = screen.getByTestId("casilla");
    // Hermana del combo, en su misma fila…
    expect(casilla.parentElement).toBe(combo().parentElement);
    // …y fuera de la fila de la etiqueta.
    const etiqueta = screen.getByText(/^Transporte requerido/).closest(".label");
    expect(etiqueta).not.toBeNull();
    expect(etiqueta?.contains(casilla)).toBe(false);
  });

  it("Esc cierra la lista sin cambiar el valor", async () => {
    const onCambiar = vi.fn();
    render(<ConEstado onCambiar={onCambiar} />);

    combo().focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onCambiar).not.toHaveBeenCalled();
  });

  it("la línea fija bajo el combo explica lo elegido y cambia al seleccionar", async () => {
    render(<ConEstado />);
    expect(combo()).toHaveAccessibleDescription(
      "El vehículo se queda con el equipo durante todo el operativo.",
    );

    await userEvent.click(combo());
    await userEvent.click(screen.getByRole("option", { name: /^Propios medios/ }));

    expect(combo()).toHaveAccessibleDescription(
      "No se solicita vehículo a la DAF. Si necesita transporte, elija otra opción.",
    );
    // Propios medios en estilo neutro.
    expect(
      screen.getByText("No se solicita vehículo a la DAF. Si necesita transporte, elija otra opción."),
    ).toHaveClass("text-app-muted");
  });
});

describe("SelectorTipoTransporte · la ayuda ⓘ", () => {
  const ayuda = () =>
    screen.getByRole("button", { name: "Qué significa cada opción de transporte" });

  it("con el ratón abre las cinco opciones con la actual resaltada", async () => {
    render(<ConEstado inicial="INICIO_Y_FIN" />);

    await userEvent.click(ayuda());

    const panel = screen.getByRole("dialog", { name: "Opciones de transporte" });
    OPCIONES_TRANSPORTE.forEach((opcion) =>
      expect(panel).toHaveTextContent(opcion.descripcion),
    );
    const actual = panel.querySelector('[aria-current="true"]');
    expect(actual).toHaveTextContent("Dejar y retirar");
    expect(actual).toHaveTextContent("· opción actual");
  });

  it("con el teclado se abre (Enter) y Esc la cierra devolviendo el foco", async () => {
    render(<ConEstado />);

    ayuda().focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(ayuda()).toHaveFocus();
  });

  it("al tocar fuera se cierra (pantallas táctiles)", async () => {
    render(
      <>
        <ConEstado />
        <p>fuera</p>
      </>,
    );

    await userEvent.click(ayuda());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.touchStart(screen.getByText("fuera"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("al hacer clic fuera también se cierra", async () => {
    render(
      <>
        <ConEstado />
        <p>fuera</p>
      </>,
    );

    await userEvent.click(ayuda());
    fireEvent.mouseDown(screen.getByText("fuera"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
