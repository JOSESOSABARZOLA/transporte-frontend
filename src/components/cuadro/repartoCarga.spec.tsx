/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Reparto de carga
 * Archivo: repartoCarga.spec.tsx
 * Responsabilidad: Verificar el contenido compartido del reparto: orden, barra, texto y grupos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-01
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE PRUEBA LA DECISIÓN, NO EL MAQUETADO: que los disponibles salgan de menor a mayor carga, que la
 * barra lleve el ANCHO (dato) y el COLOR según la desviación, que el estado vaya SIEMPRE en texto
 * (regla 6), y que agregar/quitar llame a los manejadores y mueva de grupo según el modo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import RepartoCarga from "./RepartoCarga.tsx";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import { clasificarReparto } from "../../utils/personal.util.ts";

const persona = (parcial: Partial<PersonaElegible>): PersonaElegible => ({
  id: 1,
  apellidos: "PEREZ",
  nombres: "JUAN",
  area: "OPERATIVOS",
  cargo: null,
  elegible: true,
  motivo: null,
  ...parcial,
});

describe("RepartoCarga · contenido compartido", () => {
  it("ordena a los disponibles de menor a mayor carga (mejores candidatos arriba)", () => {
    render(
      <RepartoCarga
        personas={[
          persona({ id: 1, apellidos: "ALTO", indiceCarga: 25 }),
          persona({ id: 2, apellidos: "BAJO", indiceCarga: 5 }),
          persona({ id: 3, apellidos: "MEDIO", indiceCarga: 15 }),
        ]}
        cuota={15}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    const nombres = screen
      .getAllByText(/ALTO|BAJO|MEDIO/)
      .map((nodo) => nodo.textContent);
    // ALTO → "ALTO JUAN", etc. El primero debe ser el de menor índice.
    expect(nombres[0]).toContain("BAJO");
    expect(nombres[1]).toContain("MEDIO");
    expect(nombres[2]).toContain("ALTO");
  });

  it("la barra lleva el ancho por dato y el color por FATIGA (mismo token que el badge)", () => {
    const { container } = render(
      <RepartoCarga
        personas={[
          persona({
            id: 1,
            apellidos: "MEDIA",
            indiceCarga: 11,
            cuotaJusta: 22,
            desviacionCarga: -11,
            nivelEquidad: "DEBAJO",
            nivelFatiga: "AMBAR",
          }),
        ]}
        cuota={22}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    // Ancho (dato): 11 / (max(22,11)*1.1 = 24.2) ≈ 45.45 %. El relleno es el div `absolute`.
    const relleno = container.querySelector<HTMLDivElement>(".absolute.bg-warning");
    expect(relleno).not.toBeNull();
    expect(relleno?.style.width).toMatch(/^45\.4/);
    // Color = fatiga AMBAR → `warning`, el MISMO tono que el badge «Carga media».
    expect(screen.getByText("Carga Media").className).toContain("badge-warning");
  });

  it("el color de la barra = la fatiga y coincide con el badge de la persona", () => {
    const { container } = render(
      <RepartoCarga
        personas={[
          persona({ id: 1, apellidos: "BAJA", indiceCarga: 5, nivelFatiga: "VERDE" }),
          persona({ id: 2, apellidos: "ALTA", indiceCarga: 30, nivelFatiga: "ROJO" }),
        ]}
        cuota={15}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    // Barras: VERDE→success, ROJO→error (el swatch de la leyenda es `inline-block`, no `absolute`).
    expect(container.querySelector(".absolute.bg-success")).not.toBeNull();
    expect(container.querySelector(".absolute.bg-error")).not.toBeNull();
    // Los badges de la fila usan el mismo tono que la barra.
    expect(screen.getByText("Carga Baja").className).toContain("badge-success");
    expect(screen.getByText("Carga Alta").className).toContain("badge-error");
  });

  it("pone el estado SIEMPRE en texto: «+X sobre su parte» / «-X bajo su parte»", () => {
    render(
      <RepartoCarga
        personas={[
          persona({
            id: 1,
            apellidos: "SOBRE",
            indiceCarga: 25,
            desviacionCarga: 11.5,
            nivelEquidad: "ENCIMA",
            nivelFatiga: "ROJO",
          }),
          persona({
            id: 2,
            apellidos: "BAJO",
            indiceCarga: 5,
            desviacionCarga: -13.5,
            nivelEquidad: "DEBAJO",
          }),
        ]}
        cuota={18}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    // La fatiga YA NO va en el texto (vive en el badge): solo índice + posición vs cuota.
    expect(
      screen.getByText("Índice 25 · +11.5 sobre su parte"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Índice 5 · -13.5 bajo su parte"),
    ).toBeInTheDocument();
  });

  it("agrupa disponibles y agregados; «+ Agregar» y «Quitar» llaman a sus manejadores (borrador)", async () => {
    const onAgregar = vi.fn();
    const onQuitar = vi.fn();
    render(
      <RepartoCarga
        personas={[
          persona({ id: 1, apellidos: "LIBRE", indiceCarga: 10 }),
          persona({ id: 2, apellidos: "PUESTO", indiceCarga: 20 }),
        ]}
        cuota={15}
        idsAgregados={[2]}
        onAgregar={onAgregar}
        onQuitar={onQuitar}
        modo="borrador"
      />,
    );

    expect(
      screen.getByText("Agregados a este operativo (1)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Disponibles (1)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "+ Agregar" }));
    expect(onAgregar).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onQuitar).toHaveBeenCalledWith(2);
  });

  it("en modo diferido usa «+ Asignar», «Asignado aquí» y agrupa los no disponibles con su motivo", () => {
    render(
      <RepartoCarga
        personas={[
          persona({ id: 1, apellidos: "LIBRE", indiceCarga: 10 }),
          persona({ id: 2, apellidos: "PUESTO", indiceCarga: 20 }),
          persona({
            id: 3,
            apellidos: "CRUZADO",
            indiceCarga: 8,
            elegible: false,
            motivo: "ya está asignada al operativo X, que se cruza con este horario",
          }),
        ]}
        cuota={15}
        idsAgregados={[2]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="diferido"
      />,
    );

    expect(screen.getByRole("button", { name: "+ Asignar" })).toBeInTheDocument();
    expect(screen.getByText("Asignado aquí")).toBeInTheDocument();
    expect(
      screen.getByText("Asignados aquí o no disponibles (2)"),
    ).toBeInTheDocument();
    // El no disponible muestra el motivo y NO tiene botón.
    expect(
      screen.getByText(/No disponible:.*se cruza con este horario/),
    ).toBeInTheDocument();
    // Solo hay UN «+ Asignar» (el disponible); el cruzado no lo tiene.
    expect(screen.getAllByRole("button", { name: "+ Asignar" })).toHaveLength(1);
  });

  it("«en su parte» con desviación pequeña usa el color NEUTRO, no naranja (bug corregido)", () => {
    const { container } = render(
      <RepartoCarga
        personas={[
          persona({
            id: 1,
            apellidos: "JUSTO",
            indiceCarga: 20,
            cuotaJusta: 18,
            // El servidor lo tiene «en su parte» aunque la desviación sea +2.
            desviacionCarga: 2,
            nivelEquidad: "EQUILIBRADO",
          }),
        ]}
        cuota={18}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    // La barra NO es naranja (warning) ni azul (primary): es el neutro de «en su parte».
    expect(container.querySelector(".absolute.bg-warning")).toBeNull();
    expect(container.querySelector(".absolute.bg-primary")).toBeNull();
    expect(screen.getByText(/Índice 20 · en su parte/)).toBeInTheDocument();
  });

  it("los conteos de las 4 tarjetas suman el total de personas con carga", () => {
    render(
      <RepartoCarga
        personas={[
          persona({ id: 1, apellidos: "A", indiceCarga: 5, nivelEquidad: "DEBAJO" }),
          persona({ id: 2, apellidos: "B", indiceCarga: 18, nivelEquidad: "EQUILIBRADO" }),
          persona({ id: 3, apellidos: "C", indiceCarga: 19, nivelEquidad: "EQUILIBRADO" }),
          persona({ id: 4, apellidos: "D", indiceCarga: 30, nivelEquidad: "ENCIMA" }),
        ]}
        cuota={18}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    const tarjeta = (titulo: string) =>
      screen.getByText(titulo).closest("div") as HTMLElement;
    // bajo=1, en=2, sobre=1 → suman 4 (el total).
    expect(within(tarjeta("Bajo su parte")).getByText("1")).toBeInTheDocument();
    expect(within(tarjeta("En su parte")).getByText("2")).toBeInTheDocument();
    expect(within(tarjeta("Sobre su parte")).getByText("1")).toBeInTheDocument();
  });

  it("un grupo vacío no se renderiza (sin agregados no muestra «Agregados»)", () => {
    render(
      <RepartoCarga
        personas={[persona({ id: 1, apellidos: "LIBRE", indiceCarga: 10 })]}
        cuota={12}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    expect(screen.getByText("Disponibles (1)")).toBeInTheDocument();
    expect(
      screen.queryByText(/Agregados a este operativo/),
    ).toBeNull();
  });

  it("escribe el plural de operativos: «1 operativo» / «N operativos»", () => {
    render(
      <RepartoCarga
        personas={[
          persona({ id: 1, apellidos: "UNO", indiceCarga: 5, operativosAsignados: 1 }),
          persona({ id: 2, apellidos: "DOS", indiceCarga: 6, operativosAsignados: 2 }),
        ]}
        cuota={6}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    // Misma unidad en todos → la unidad NO se repite en la fila; solo queda el conteo.
    expect(screen.getByText("1 operativo")).toBeInTheDocument();
    expect(screen.getByText("2 operativos")).toBeInTheDocument();
  });

  it("muestra la unidad en la fila cuando hay más de una unidad", () => {
    render(
      <RepartoCarga
        personas={[
          persona({ id: 1, apellidos: "UNO", area: "OPERATIVOS", indiceCarga: 5 }),
          persona({ id: 2, apellidos: "DOS", area: "GENERAL", indiceCarga: 6 }),
        ]}
        cuota={6}
        idsAgregados={[]}
        onAgregar={vi.fn()}
        onQuitar={vi.fn()}
        modo="borrador"
      />,
    );

    // Con unidades distintas, cada fila nombra su unidad.
    expect(screen.getByText(/· Unidad de Operativos/)).toBeInTheDocument();
  });
});

describe("clasificarReparto", () => {
  it("respeta el veredicto del servidor (nivelEquidad)", () => {
    expect(clasificarReparto(30, 18, "DEBAJO")).toBe("bajo");
    expect(clasificarReparto(18, 18, "EQUILIBRADO")).toBe("en");
    expect(clasificarReparto(30, 18, "ENCIMA")).toBe("sobre");
  });

  it("«en su parte» aunque la desviación no sea cero: no lo cuenta como «sobre»", () => {
    expect(clasificarReparto(20, 18, "EQUILIBRADO")).toBe("en");
  });

  it("sin nivelEquidad, compara índice vs cuota con tolerancia pequeña (±5 %, mín ±1)", () => {
    expect(clasificarReparto(5, 20)).toBe("bajo");
    expect(clasificarReparto(20, 20)).toBe("en");
    expect(clasificarReparto(40, 20)).toBe("sobre");
    // 20.5 está dentro de la tolerancia de 20 → «en».
    expect(clasificarReparto(20.5, 20)).toBe("en");
  });
});
