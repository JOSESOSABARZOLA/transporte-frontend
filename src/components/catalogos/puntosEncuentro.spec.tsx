/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: puntosEncuentro.spec.tsx
 * Responsabilidad: Fijar lo que el panel de puntos decide, no cómo se ve.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE PRUEBA AQUÍ ES QUE NADA SE PIERDA DE VISTA.
 *
 * Agrupar por zonal mejora la lectura y, mal hecho, esconde cosas: un punto cuya zonal no
 * esté en el catálogo del formulario se quedaría sin tarjeta, y una zonal sin puntos —que
 * es justo la que hay que rellenar, PV-01— desaparecería sin decir nada.
 *
 * Que haya tres columnas a 1440 px se comprueba mirando. Que ningún punto se quede fuera,
 * no. FASE5 §2.2 y la sección «qué se prueba y qué no» de CLAUDE.md.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PanelPuntosEncuentro from "./PanelPuntosEncuentro.tsx";
import type { PuntoEncuentro, Zonal } from "../../interfaces/Formulario.ts";

const zonal = (id: number, nombre: string): Zonal => ({
  id,
  codigo: `Z${id}`,
  nombre,
});

const punto = (
  id: number,
  nombre: string,
  zonalId: number,
): PuntoEncuentro => ({ id, nombre, zonalId });

const ZONALES = [
  zonal(1, "Zonal Eugenio Espejo"),
  zonal(2, "Zonal Quitumbe"),
  zonal(3, "Zonal Calderón"),
];

const PUNTOS = [
  punto(10, "Tejar", 2),
  punto(11, "HCAM", 1),
  punto(12, "Estación Río Coca", 1),
];

const propiedades = {
  puntos: PUNTOS,
  zonales: ZONALES,
  cargando: false,
  procesando: false,
  onAgregar: vi.fn(),
  onEditar: vi.fn(),
  onDesactivar: vi.fn(),
};

describe("los puntos se leen por zonal", () => {
  it("el nombre de la zonal se dice una vez, no una por punto", () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    // Dos puntos en Eugenio Espejo y un solo encabezado. Antes la columna «Zonal»
    // repetía el nombre en cada fila.
    expect(screen.getAllByText("Zonal Eugenio Espejo")).toHaveLength(1);
    expect(screen.getByText("HCAM")).toBeInTheDocument();
    expect(screen.getByText("Estación Río Coca")).toBeInTheDocument();
  });

  it("cada zonal dice cuántos puntos ofrece, con palabras", () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    expect(screen.getByText("2 puntos")).toBeInTheDocument();
    expect(screen.getByText("1 punto")).toBeInTheDocument();
  });

  it("un punto cuya zonal no está en el catálogo NO se pierde", () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[...PUNTOS, punto(13, "Parque de Pifo", 99)]}
      />,
    );

    expect(screen.getByText("Sin zonal reconocida")).toBeInTheDocument();
    expect(screen.getByText("Parque de Pifo")).toBeInTheDocument();
  });
});

describe("la zonal sin puntos se nombra, que es lo que hay que rellenar", () => {
  it("dice cuál es y qué pasará en el registro", () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    expect(
      screen.getByText(/la lista de puntos saldrá vacía/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar a Zonal Calderón" }),
    ).toBeInTheDocument();
  });

  it("desde ahí el alta nace situada en esa zonal", async () => {
    const agregar = vi.fn();
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        onAgregar={agregar}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Agregar a Zonal Calderón" }),
    );

    expect(agregar).toHaveBeenCalledWith(3);
  });

  it("el «Agregar» de la cabecera no sitúa en ninguna", async () => {
    const agregar = vi.fn();
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        onAgregar={agregar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(agregar).toHaveBeenCalledWith(null);
  });

  it("cuando todas tienen puntos, lo dice en lugar de callarse", () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        zonales={[ZONALES[0], ZONALES[1]]}
      />,
    );

    expect(
      screen.getByText(/tienen al menos un punto/),
    ).toBeInTheDocument();
  });
});

describe("la búsqueda", () => {
  it("por zonal muestra la zonal entera", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    // Sin tildes ni mayúsculas: quien busca escribe deprisa.
    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "eugenio",
    );

    expect(screen.getByText("HCAM")).toBeInTheDocument();
    expect(screen.getByText("Estación Río Coca")).toBeInTheDocument();
    expect(screen.queryByText("Tejar")).toBeNull();
  });

  it("por punto deja solo ese, y dice cuántos de cuántos", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "rio coca",
    );

    expect(screen.getByText("Estación Río Coca")).toBeInTheDocument();
    expect(screen.queryByText("HCAM")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("1 de 3 puntos");
  });

  it("sin coincidencias lo dice, con lo que se escribió", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "aeropuerto",
    );

    expect(
      screen.getByText(/Ningún punto ni zonal coincide con «aeropuerto»/),
    ).toBeInTheDocument();
  });

  it("mientras se filtra no se habla de cobertura", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "tejar",
    );

    // La cobertura es del catálogo entero: dicha sobre una lista filtrada haría creer
    // que faltan zonales que sí tienen puntos.
    expect(screen.queryByText(/la lista de puntos saldrá vacía/)).toBeNull();
  });
});

describe("obrar sobre un punto", () => {
  it("el botón dice «Desactivar», no «Eliminar»", () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[punto(10, "Tejar", 2)]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Desactivar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it("entrega el punto completo, para poder nombrarlo al confirmar", async () => {
    const desactivar = vi.fn();
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[punto(10, "Tejar", 2)]}
        onDesactivar={desactivar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(desactivar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, nombre: "Tejar" }),
    );
  });

  it("mientras se procesa no se puede obrar dos veces", () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[punto(10, "Tejar", 2)]}
        procesando
      />,
    );

    expect(screen.getByRole("button", { name: "Agregar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDisabled();
  });
});

describe("el catálogo vacío", () => {
  it("explica su consecuencia sobre P-01, no dice «sin datos»", () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[]}
      />,
    );

    expect(
      screen.getByText(/la cascada de P-01 no ofrece nada/),
    ).toBeInTheDocument();
  });

  it("sin puntos no se ofrece el buscador", () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[]}
      />,
    );

    expect(screen.queryByLabelText("Buscar punto o zonal")).toBeNull();
  });
});
