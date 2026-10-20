/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Botones
 * Archivo: boton.spec.tsx
 * Responsabilidad: Verificar el estándar único de botones: clases por variante y tamaño, barra
 *                  oscura, carga y apagado con su motivo (que se lee y no ejecuta).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BarraOscuraContexto } from "./barraOscura.ts";
import Boton, { clasesBoton, type TamanoBoton, type VarianteBoton } from "./Boton.tsx";

describe("Boton · variantes y tamaños", () => {
  it.each<[VarianteBoton, string[]]>([
    ["primario", ["btn-primary"]],
    ["secundario", ["app-accion-secundaria"]],
    ["acento", ["btn-outline", "btn-primary"]],
    ["peligro", ["btn-outline", "btn-error"]],
    ["exito", ["btn-outline", "btn-success"]],
    ["peligroTexto", ["btn-ghost"]],
    ["enlace", ["btn-link"]],
    ["peligroRelleno", ["btn-error"]],
  ])("la variante %s lleva sus clases sobre la base común", (variante, clases) => {
    render(<Boton variante={variante}>Acción</Boton>);
    const boton = screen.getByRole("button", { name: "Acción" });
    expect(boton).toHaveClass("btn", "whitespace-nowrap", ...clases);
    expect(boton).toHaveAttribute("type", "button");
  });

  it.each<[TamanoBoton, string]>([
    ["sm", "btn-sm"],
    ["md", "[--size:2.25rem]"],
    ["lg", "[--fontsize:0.875rem]"],
  ])("el tamaño %s fija su alto y su texto", (tamano, clase) => {
    render(<Boton tamano={tamano}>Acción</Boton>);
    expect(screen.getByRole("button")).toHaveClass(clase);
  });

  it("sin texto es cuadrado y se nombra por su etiqueta", () => {
    render(<Boton icono="subMenu" aria-label="Más acciones" tamano="sm" />);
    expect(screen.getByRole("button", { name: "Más acciones" })).toHaveClass("btn-square");
  });

  it("en barra oscura: primario con borde blanco, secundario blanco, el resto sin cambio", () => {
    render(
      <>
        <Boton variante="primario" enBarraOscura>Cerrar cuadro</Boton>
        <Boton variante="secundario" enBarraOscura>Exportar PDF</Boton>
        <Boton variante="peligro" enBarraOscura>Retirar</Boton>
      </>,
    );
    expect(screen.getByRole("button", { name: "Cerrar cuadro" })).toHaveClass("app-boton-barra-primario");
    expect(screen.getByRole("button", { name: "Exportar PDF" })).toHaveClass("app-boton-barra-secundario");
    expect(screen.getByRole("button", { name: "Retirar" }).className).not.toContain("app-boton-barra");
  });

  it("dentro de BarraOscuraContexto toma el aspecto de barra sin pedirlo", () => {
    render(
      <BarraOscuraContexto.Provider value>
        <Boton variante="fantasma" icono="cerrar" aria-label="Cerrar" />
      </BarraOscuraContexto.Provider>,
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveClass(
      "btn-ghost",
      "app-boton-barra-fantasma",
      "btn-square",
    );
  });
});

describe("Boton · apagado y carga", () => {
  it("con motivo: se ve apagado, el motivo va al title y el clic no ejecuta", () => {
    const alPulsar = vi.fn();
    render(
      <Boton variante="primario" motivoDeshabilitado="Sin cambios" onClick={alPulsar}>
        Guardar
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "Sin cambios");
    // No es `disabled` nativo: el puntero llega y el motivo se muestra al pasar el mouse.
    expect(boton).not.toBeDisabled();
    fireEvent.click(boton);
    expect(alPulsar).not.toHaveBeenCalled();
  });

  it("un envío apagado no envía el formulario", () => {
    const alEnviar = vi.fn((evento: { preventDefault: () => void }) => evento.preventDefault());
    render(
      <form onSubmit={alEnviar}>
        <Boton type="submit" variante="primario" deshabilitado>
          Registrar
        </Boton>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it("cargando: giro junto al texto, ocupado y sin ejecutar", () => {
    const alPulsar = vi.fn();
    const { container } = render(
      <Boton variante="primario" cargando onClick={alPulsar} icono="agregar">
        Guardando…
      </Boton>,
    );
    const boton = screen.getByRole("button", { name: "Guardando…" });
    expect(boton).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".loading-spinner")).not.toBeNull();
    fireEvent.click(boton);
    expect(alPulsar).not.toHaveBeenCalled();
  });

  it("encendido: ejecuta y no lleva aria-disabled", () => {
    const alPulsar = vi.fn();
    render(<Boton onClick={alPulsar}>Editar</Boton>);
    const boton = screen.getByRole("button", { name: "Editar" });
    expect(boton).not.toHaveAttribute("aria-disabled");
    fireEvent.click(boton);
    expect(alPulsar).toHaveBeenCalledTimes(1);
  });
});

describe("clasesBoton · lo que no puede ser <button>", () => {
  it("da las mismas clases que <Boton> (un <summary>, un <a href> externo)", () => {
    render(
      <Boton variante="primario" tamano="sm" enBarraOscura>
        Igual
      </Boton>,
    );
    const delBoton = screen.getByRole("button", { name: "Igual" }).className.split(" ");
    expect(delBoton).toEqual(expect.arrayContaining(clasesBoton("primario", "sm", true).split(" ")));
    expect(clasesBoton()).toContain("app-accion-secundaria");
  });
});
