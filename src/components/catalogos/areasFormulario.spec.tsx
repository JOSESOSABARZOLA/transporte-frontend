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

/**
 * Monta la barra y la DESPLIEGA (arranca plegada desde el rediseño del 2026-10-12): las áreas son
 * chips con `aria-pressed`.
 */
const montar = async (areas: AreaFormulario[] = LAS_DOS, procesando = false) => {
  const onGuardar = vi.fn();
  const onCambiosPendientes = vi.fn();

  render(
    <PanelAreasFormulario
      areas={areas}
      cargando={false}
      procesando={procesando}
      onGuardar={onGuardar}
      onCambiosPendientes={onCambiosPendientes}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /Cambiar/ }));

  return { onGuardar, onCambiosPendientes };
};

const casilla = (nombre: string | RegExp) =>
  screen.getByRole("button", { name: nombre, pressed: undefined });

const marcada = (nombre: RegExp) =>
  expect(casilla(nombre)).toHaveAttribute("aria-pressed", "true");
const sinMarcar = (nombre: RegExp) =>
  expect(casilla(nombre)).toHaveAttribute("aria-pressed", "false");

const guardar = () => screen.getByRole("button", { name: /Guardar áreas/ });

describe("las áreas se marcan por su descripción y viajan por su código", () => {
  it("ofrece las cuatro con el nombre que usa la institución", async () => {
    await montar();

    expect(casilla(/Unidad de Operativos/)).toBeInTheDocument();
    expect(casilla(/Personal de Instrucción/)).toBeInTheDocument();
    expect(casilla(/Inspector Técnico - DMIP/)).toBeInTheDocument();
    expect(casilla(/Inspector General - DMIP/)).toBeInTheDocument();
  });

  it("llegan marcadas las que el formulario admite hoy, y solo esas", async () => {
    await montar();

    marcada(/Inspector General - DMIP/);
    marcada(/Inspector Técnico - DMIP/);
    sinMarcar(/Unidad de Operativos/);
    sinMarcar(/Personal de Instrucción/);
  });

  /**
   * ES LA PRUEBA QUE DISCRIMINA. Las dos anteriores pasarían con un panel que pintara los
   * rótulos correctos y enviara cualquier cosa; esta exige que lo que sale sea el código
   * del enumerado y no la descripción que se marcó.
   */
  it("al guardar se envía el CÓDIGO, no el rótulo que se marcó", async () => {
    const { onGuardar } = await montar();

    await userEvent.click(casilla(/Unidad de Operativos/));
    await userEvent.click(guardar());

    expect(onGuardar).toHaveBeenCalledWith(["GENERAL", "TECNICO", "OPERATIVOS"]);
  });

  it("desmarcar retira esa área del conjunto que se envía", async () => {
    const { onGuardar } = await montar();

    await userEvent.click(casilla(/Inspector Técnico - DMIP/));
    await userEvent.click(guardar());

    expect(onGuardar).toHaveBeenCalledWith(["GENERAL"]);
  });
});

describe("el panel no deja llegar al servidor lo que este va a rechazar", () => {
  it("sin cambios, no hay nada que guardar", async () => {
    await montar();

    expect(guardar()).toHaveAttribute("aria-disabled", "true");
  });

  it("sin ninguna marcada el botón se apaga, y dice por qué", async () => {
    // Un botón apagado sin explicación es lo que este sistema evita en todas partes: el
    // servidor rechazaría el conjunto vacío, y aquí se dice antes y con la consecuencia.
    await montar();

    await userEvent.click(casilla(/Inspector General - DMIP/));
    await userEvent.click(casilla(/Inspector Técnico - DMIP/));

    expect(guardar()).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(/el selector de personal de este formulario queda vacío/),
    ).toBeInTheDocument();
    // Y la línea plegada lo dice también.
    expect(
      screen.getByText("Ninguna área: el formulario no ofrecerá personal"),
    ).toBeInTheDocument();
  });
});

describe("el cupo del departamento invitado se ve antes de retirarlo", () => {
  it("la marca de compartida se dice con palabras, no con un color", async () => {
    // PER-06: `esCompartida` es de donde el rol invitado saca su gente. El panel no la
    // edita, pero quien retire esa área tiene que saber qué se lleva por delante.
    await montar([
      { area: "GENERAL", esCompartida: false },
      { area: "INSTRUCCION", esCompartida: true },
    ]);

    expect(
      screen.getByText("Aporta el departamento invitado"),
    ).toBeInTheDocument();
  });

  it("y no se pinta sobre un área que no la tiene", async () => {
    await montar();

    expect(screen.queryByText("Aporta el departamento invitado")).toBeNull();
  });
});

describe("barra plegable (rediseño 2026-10-12)", () => {
  it("plegada dice en una línea cuántas y cuáles, sin mostrar los chips", () => {
    render(
      <PanelAreasFormulario
        areas={LAS_DOS}
        cargando={false}
        procesando={false}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByText("2 de 4")).toBeInTheDocument();
    expect(
      screen.getByText("Inspector General - DMIP, Inspector Técnico - DMIP"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cambiar/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("button", { name: /Guardar áreas/ })).toBeNull();
  });

  it("al cambiar algo dice «Cambios sin guardar» y avisa a la página", async () => {
    const { onCambiosPendientes } = await montar();

    expect(screen.queryByText("Cambios sin guardar")).toBeNull();
    await userEvent.click(casilla(/Unidad de Operativos/));

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    expect(onCambiosPendientes).toHaveBeenLastCalledWith(true);
    expect(guardar()).not.toHaveAttribute("aria-disabled");
  });
});
