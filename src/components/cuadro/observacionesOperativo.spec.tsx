/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: observacionesOperativo.spec.tsx
 * Responsabilidad: Que las notas de la sesión se agreguen, se corrijan y se quiten, y que las ya
 *                  guardadas sigan en solo lectura.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * Se prueban DECISIONES: que una nota en blanco no entre, que Enter agregue, que corregir una nota
 * se guarde con Enter y se cancele con Escape, que una nota vacía no se guarde, que solo una se
 * corrija a la vez, que corregir no la marque «editada» (aún no se guardó), y que las guardadas no
 * ofrezcan acciones. El componente es controlado: un envoltorio de prueba guarda su estado.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import ObservacionesOperativo from "./ObservacionesOperativo.tsx";
import type { ObservacionOperativo } from "../../interfaces/Operativo.ts";
import {
  AVISO_NOTA_PENDIENTE,
  conNotaPendiente,
  fechaDeNota,
  type NotasDeSesion,
} from "../../utils/notasOperativo.util.ts";
import { VALORES_INICIALES } from "../../utils/valoresOperativo.util.ts";

const MARCADOR = "Escriba una nota y pulse Agregar";
// 16/10/2026 14:30 en Quito (UTC−5).
const AHORA = new Date("2026-10-16T19:30:00.000Z");

const Envoltorio = ({
  iniciales = [],
  guardadas,
  onCambio = () => undefined,
  distinguirNuevas = false,
}: {
  iniciales?: string[];
  guardadas?: ObservacionOperativo[];
  onCambio?: (sesion: NotasDeSesion) => void;
  distinguirNuevas?: boolean;
}) => {
  const [sesion, setSesion] = useState<NotasDeSesion>({
    notas: iniciales,
    horas: iniciales.map(() => AHORA.toISOString()),
  });
  const [pendiente, setPendiente] = useState("");
  return (
    <ObservacionesOperativo
      notas={sesion.notas}
      horas={sesion.horas}
      onCambio={(nueva) => {
        setSesion(nueva);
        onCambio(nueva);
      }}
      pendiente={pendiente}
      onPendienteCambio={setPendiente}
      guardadas={guardadas}
      autor="ANA PÉREZ"
      distinguirNuevas={distinguirNuevas}
      ahora={() => AHORA}
    />
  );
};

const listaNuevas = () => screen.getByRole("list", { name: "Observaciones por guardar" });

describe("ObservacionesOperativo · agregar", () => {
  it("agrega con el botón, limpia el campo y la nota lleva autor y hora de Quito", async () => {
    const onCambio = vi.fn();
    render(<Envoltorio onCambio={onCambio} />);

    await userEvent.type(screen.getByPlaceholderText(MARCADOR), "Llevar chalecos");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onCambio).toHaveBeenLastCalledWith({
      notas: ["Llevar chalecos"],
      horas: [AHORA.toISOString()],
    });
    expect(screen.getByPlaceholderText(MARCADOR)).toHaveValue("");
    expect(within(listaNuevas()).getByText("ANA PÉREZ · 16/10/2026 14h30")).toBeInTheDocument();
  });

  it("Enter también agrega, y varias notas se apilan", async () => {
    render(<Envoltorio />);

    await userEvent.type(screen.getByPlaceholderText(MARCADOR), "Primera{Enter}");
    await userEvent.type(screen.getByPlaceholderText(MARCADOR), "Segunda{Enter}");

    expect(within(listaNuevas()).getByText("Primera")).toBeInTheDocument();
    expect(within(listaNuevas()).getByText("Segunda")).toBeInTheDocument();
  });

  it("«Agregar» queda apagado con el campo vacío o en blanco, y una nota en blanco no entra", async () => {
    const onCambio = vi.fn();
    render(<Envoltorio onCambio={onCambio} />);

    const agregar = screen.getByRole("button", { name: "Agregar" });
    expect(agregar).toHaveAttribute("aria-disabled", "true");

    await userEvent.type(screen.getByPlaceholderText(MARCADOR), "   {Enter}");
    expect(agregar).toHaveAttribute("aria-disabled", "true");
    expect(onCambio).not.toHaveBeenCalled();
  });

  it("quitar una nota la retira de la lista", async () => {
    render(<Envoltorio iniciales={["Una", "Otra"]} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar la nota: Una" }));

    expect(within(listaNuevas()).queryByText("Una")).toBeNull();
    expect(within(listaNuevas()).getByText("Otra")).toBeInTheDocument();
  });
});

describe("ObservacionesOperativo · corregir una nota de la sesión", () => {
  it("«Editar» abre la nota en un texto precargado; Enter guarda y conserva la hora", async () => {
    const onCambio = vi.fn();
    render(<Envoltorio iniciales={["Llevar chaleco"]} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar la nota: Llevar chaleco" }));
    const texto = screen.getByRole("textbox", { name: "Corregir la nota: Llevar chaleco" });
    expect(texto).toHaveValue("Llevar chaleco");

    await userEvent.type(texto, "s reflectivos{Enter}");

    expect(onCambio).toHaveBeenLastCalledWith({
      notas: ["Llevar chalecos reflectivos"],
      horas: [AHORA.toISOString()],
    });
    expect(within(listaNuevas()).getByText("Llevar chalecos reflectivos")).toBeInTheDocument();
    // Aún no se guardó: corregirla no la marca «editada».
    expect(screen.queryByText(/editada/)).toBeNull();
  });

  it("Mayús+Enter es un salto de línea, no guarda", async () => {
    const onCambio = vi.fn();
    render(<Envoltorio iniciales={["Línea"]} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar la nota: Línea" }));
    const texto = screen.getByRole("textbox", { name: "Corregir la nota: Línea" });
    await userEvent.type(texto, "{Shift>}{Enter}{/Shift}otra");

    expect(texto).toHaveValue("Línea\notra");
    expect(onCambio).not.toHaveBeenCalled();
  });

  it("Escape cancela y deja la nota como estaba", async () => {
    const onCambio = vi.fn();
    render(<Envoltorio iniciales={["Sin cambios"]} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar la nota: Sin cambios" }));
    const texto = screen.getByRole("textbox", { name: "Corregir la nota: Sin cambios" });
    await userEvent.type(texto, " más{Escape}");

    expect(screen.queryByRole("textbox", { name: /Corregir la nota/ })).toBeNull();
    expect(within(listaNuevas()).getByText("Sin cambios")).toBeInTheDocument();
    expect(onCambio).not.toHaveBeenCalled();
  });

  it("vacía no se guarda: «Guardar» se apaga y Enter no hace nada", async () => {
    const onCambio = vi.fn();
    render(<Envoltorio iniciales={["Borrar"]} onCambio={onCambio} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar la nota: Borrar" }));
    const texto = screen.getByRole("textbox", { name: "Corregir la nota: Borrar" });
    await userEvent.clear(texto);
    await userEvent.type(texto, "{Enter}");

    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(onCambio).not.toHaveBeenCalled();
  });

  it("solo una nota se corrige a la vez", async () => {
    render(<Envoltorio iniciales={["Una", "Otra"]} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar la nota: Una" }));

    expect(screen.getByRole("button", { name: "Editar la nota: Otra" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getAllByRole("textbox", { name: /Corregir la nota/ })).toHaveLength(1);
  });
});

describe("ObservacionesOperativo · en el cajón de edición", () => {
  it("las guardadas van en solo lectura, sin acciones; las nuevas se corrigen y se quitan", () => {
    render(
      <Envoltorio
        distinguirNuevas
        iniciales={["Nueva de hoy"]}
        guardadas={[
          {
            texto: "Coordinado con la AMT.",
            creadoPorRol: "DMIP_INSPECCIONES",
            creadoEn: "2026-09-09T14:30:00.000Z",
          },
        ]}
      />,
    );

    const guardadas = screen.getByRole("list", { name: "Observaciones guardadas" });
    expect(within(guardadas).getByText("Coordinado con la AMT.")).toBeInTheDocument();
    expect(within(guardadas).getByText(/DMIP Inspecciones · 09\/09\/2026 09h30/)).toBeInTheDocument();
    expect(within(guardadas).queryByRole("button")).toBeNull();

    expect(
      within(listaNuevas()).getByRole("button", { name: "Editar la nota: Nueva de hoy" }),
    ).toBeInTheDocument();
    expect(
      within(listaNuevas()).getByRole("button", { name: "Quitar la nota: Nueva de hoy" }),
    ).toBeInTheDocument();
    expect(within(listaNuevas()).getByText("nueva, sin guardar")).toBeInTheDocument();
  });
});

describe("conNotaPendiente · lo escrito sin «Agregar» viaja", () => {
  it("suma la nota escrita al final, la fecha y vacía el campo", () => {
    const { valores, agregada } = conNotaPendiente(
      {
        ...VALORES_INICIALES,
        observaciones: ["Primera"],
        observacionesHoras: [null],
        notaPendiente: "  Segunda  ",
      },
      AHORA,
    );

    expect(agregada).toBe(true);
    expect(valores.observaciones).toEqual(["Primera", "Segunda"]);
    expect(valores.observacionesHoras).toEqual([null, AHORA.toISOString()]);
    expect(valores.notaPendiente).toBe("");
  });

  it("sin nada escrito, no cambia nada", () => {
    const entrada = { ...VALORES_INICIALES, observaciones: ["Una"] };
    const { valores, agregada } = conNotaPendiente(entrada, AHORA);
    expect(agregada).toBe(false);
    expect(valores).toBe(entrada);
  });

  it("la fecha de una nota es la de Quito, en «dd/mm/aaaa HHhMM»", () => {
    expect(fechaDeNota("2026-10-17T03:05:00.000Z")).toBe("16/10/2026 22h05");
    expect(AVISO_NOTA_PENDIENTE).toMatch(/nota que estaba escrita/);
  });
});
