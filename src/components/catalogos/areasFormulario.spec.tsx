/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: areasFormulario.spec.tsx
 * Responsabilidad: Verificar qué se envía al cambiar las áreas y qué se dice al hacerlo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-27
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE VE ES LA DESCRIPCIÓN, LO QUE VIAJA ES EL CÓDIGO.
 *
 * Es la decisión que gobierna todo este cambio: en pantalla se lee «Unidad de Operativos»
 * y al servidor va `OPERATIVOS`, porque renombrar el enumerado habría exigido una
 * migración irreversible sobre cuatro columnas para no ganar nada.
 *
 * Aquí se prueban las dos mitades a la vez —el rótulo que se marca y el código que sale—
 * porque son el punto donde una traducción mal hecha se convertiría en un formulario
 * configurado al revés y nadie lo notaría hasta que faltara personal en pantalla.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PanelAreasFormulario from "./PanelAreasFormulario.tsx";
import type { AreaFormulario } from "../../interfaces/Formulario.ts";

const LAS_DOS: AreaFormulario[] = [
  { area: "GENERAL", esCompartida: false },
  { area: "TECNICO", esCompartida: false },
];

const montar = (areas: AreaFormulario[] = LAS_DOS, procesando = false) => {
  const onGuardar = vi.fn();

  render(
    <PanelAreasFormulario
      areas={areas}
      cargando={false}
      procesando={procesando}
      onGuardar={onGuardar}
    />,
  );

  return { onGuardar };
};

const casilla = (nombre: string | RegExp) =>
  screen.getByRole("checkbox", { name: nombre });

const guardar = () => screen.getByRole("button", { name: /Guardar áreas/ });

describe("las áreas se marcan por su descripción y viajan por su código", () => {
  it("ofrece las cuatro con el nombre que usa la institución", () => {
    montar();

    expect(casilla(/Unidad de Operativos/)).toBeInTheDocument();
    expect(casilla(/Personal de Instrucción/)).toBeInTheDocument();
    expect(casilla(/Inspector Técnico - DMIP/)).toBeInTheDocument();
    expect(casilla(/Inspector General - DMIP/)).toBeInTheDocument();
  });

  it("llegan marcadas las que el formulario admite hoy, y solo esas", () => {
    montar();

    expect(casilla(/Inspector General - DMIP/)).toBeChecked();
    expect(casilla(/Inspector Técnico - DMIP/)).toBeChecked();
    expect(casilla(/Unidad de Operativos/)).not.toBeChecked();
    expect(casilla(/Personal de Instrucción/)).not.toBeChecked();
  });

  /**
   * ES LA PRUEBA QUE DISCRIMINA. Las dos anteriores pasarían con un panel que pintara los
   * rótulos correctos y enviara cualquier cosa; esta exige que lo que sale sea el código
   * del enumerado y no la descripción que se marcó.
   */
  it("al guardar se envía el CÓDIGO, no el rótulo que se marcó", async () => {
    const { onGuardar } = montar();

    await userEvent.click(casilla(/Unidad de Operativos/));
    await userEvent.click(guardar());

    expect(onGuardar).toHaveBeenCalledWith(["GENERAL", "TECNICO", "OPERATIVOS"]);
  });

  it("desmarcar retira esa área del conjunto que se envía", async () => {
    const { onGuardar } = montar();

    await userEvent.click(casilla(/Inspector Técnico - DMIP/));
    await userEvent.click(guardar());

    expect(onGuardar).toHaveBeenCalledWith(["GENERAL"]);
  });
});

describe("el panel no deja llegar al servidor lo que este va a rechazar", () => {
  it("sin cambios, no hay nada que guardar", () => {
    montar();

    expect(guardar()).toBeDisabled();
  });

  it("sin ninguna marcada el botón se apaga, y dice por qué", async () => {
    // Un botón apagado sin explicación es lo que este sistema evita en todas partes: el
    // servidor rechazaría el conjunto vacío, y aquí se dice antes y con la consecuencia.
    montar();

    await userEvent.click(casilla(/Inspector General - DMIP/));
    await userEvent.click(casilla(/Inspector Técnico - DMIP/));

    expect(guardar()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "el selector de personal de este formulario queda vacío",
    );
  });
});

describe("el cupo del departamento invitado se ve antes de retirarlo", () => {
  it("la marca de compartida se dice con palabras, no con un color", () => {
    // PER-06: `esCompartida` es de donde el rol invitado saca su gente. El panel no la
    // edita, pero quien retire esa área tiene que saber qué se lleva por delante.
    montar([
      { area: "GENERAL", esCompartida: false },
      { area: "INSTRUCCION", esCompartida: true },
    ]);

    expect(
      screen.getByText("Aporta el departamento invitado"),
    ).toBeInTheDocument();
  });

  it("y no se pinta sobre un área que no la tiene", () => {
    montar();

    expect(screen.queryByText("Aporta el departamento invitado")).toBeNull();
  });
});
