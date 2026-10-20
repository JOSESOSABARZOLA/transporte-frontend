/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Acciones de fila
 * Archivo: accionesFila.spec.tsx
 * Responsabilidad: Verificar el grupo de acciones de fila del estándar: orden fijo, variantes del
 *                  estado, apagado con motivo y el «⋮» con el borrado en rojo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AccionesFila from "./AccionesFila.tsx";

describe("AccionesFila", () => {
  it("orden fijo: Editar → acción propia → estado → ⋮, todos de 32 px", () => {
    render(
      <AccionesFila
        nombre="ZAMORA ANA"
        editar={{ onClick: vi.fn() }}
        propia={{ texto: "Ausencias", icono: "ausencias", onClick: vi.fn() }}
        estado={{ tipo: "desactivar", onClick: vi.fn() }}
        menu={[{ texto: "Ver detalle", icono: "ver", onClick: vi.fn() }]}
      />,
    );
    const nombres = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(nombres).toEqual([
      "Editar ZAMORA ANA",
      "Ausencias ZAMORA ANA",
      "Desactivar ZAMORA ANA",
      "Más acciones de ZAMORA ANA",
    ]);
    for (const boton of screen.getAllByRole("button")) expect(boton).toHaveClass("btn-sm");
    expect(screen.getByRole("button", { name: "Ausencias ZAMORA ANA" })).toHaveClass(
      "btn-outline",
      "btn-primary",
    );
  });

  it("sacar de uso va en peligro; volver a ponerlo, en éxito", async () => {
    const usuario = userEvent.setup();
    const baja = vi.fn();
    const { rerender } = render(
      <AccionesFila nombre="PBA-1235" estado={{ tipo: "baja", onClick: baja }} />,
    );
    const boton = screen.getByRole("button", { name: "Dar de baja PBA-1235" });
    expect(boton).toHaveClass("btn-outline", "btn-error", "whitespace-nowrap");
    await usuario.click(boton);
    expect(baja).toHaveBeenCalledTimes(1);

    rerender(<AccionesFila nombre="PBA-1235" estado={{ tipo: "reactivar", onClick: vi.fn() }} />);
    expect(screen.getByRole("button", { name: "Reactivar PBA-1235" })).toHaveClass(
      "btn-success",
      "text-[var(--app-text-exito)]",
    );
    expect(screen.queryByRole("button", { name: "Dar de baja PBA-1235" })).toBeNull();
  });

  it("una acción apagada muestra su motivo y no se ejecuta", async () => {
    const usuario = userEvent.setup();
    const ausencias = vi.fn();
    render(
      <AccionesFila
        nombre="ZAMORA ANA"
        propia={{
          texto: "Ausencias",
          icono: "ausencias",
          onClick: ausencias,
          motivo: "Una ficha desactivada no registra ausencias.",
        }}
      />,
    );
    const boton = screen.getByRole("button", { name: "Ausencias ZAMORA ANA" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "Una ficha desactivada no registra ausencias.");
    await usuario.click(boton);
    expect(ausencias).not.toHaveBeenCalled();
  });

  it("el «⋮» guarda el borrado en rojo con su papelera, y apagado conserva el motivo", async () => {
    const usuario = userEvent.setup();
    const eliminar = vi.fn();
    render(
      <AccionesFila
        nombre="Tipo A"
        menu={[
          {
            texto: "Eliminar",
            peligro: true,
            onClick: eliminar,
            motivo: "Ya se usó en un cuadro: solo puede desactivarse",
          },
        ]}
      />,
    );
    await usuario.click(screen.getByRole("button", { name: "Más acciones de Tipo A" }));
    const opcion = screen.getByRole("button", { name: "Eliminar" });
    expect(opcion).toHaveAttribute("title", "Ya se usó en un cuadro: solo puede desactivarse");
    await usuario.click(opcion);
    expect(eliminar).not.toHaveBeenCalled();
    // Sigue abierto: el motivo se lee.
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });
});
