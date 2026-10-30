/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: jornadasLaborales.spec.tsx
 * Responsabilidad: Fijar el catálogo de jornadas laborales de «Ventanas y parámetros».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 */

import { screen, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Quien mira puede abrir Personal: «Asignada a» lleva el enlace (2026-10-24). */
vi.mock("../../hooks/usePermiso.ts", () => ({ usePermiso: () => true }));

import PanelJornadasLaborales from "./PanelJornadasLaborales.tsx";
import { JORNADA_24_7, JORNADA_LV } from "../../pruebas/jornadasDePrueba.ts";
import { JornadasLaboralesService } from "../../services/jornadasLaborales.service.ts";

/**
 * «+ Nueva jornada» vive en la cabecera de la página desde el 2026-10-24 (plantilla visual): aquí
 * se reproduce ese botón, que solo abre el alta del panel.
 */
const ConAlta = () => {
  const [alta, setAlta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAlta(true)}>
        + Nueva jornada
      </button>
      <PanelJornadasLaborales
        altaAbierta={alta}
        onCerrarAlta={() => setAlta(false)}
      />
    </>
  );
};

describe("Jornadas laborales · el catálogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista las jornadas con sus días, su horario y a cuántos está asignada", async () => {
    vi.mocked(JornadasLaboralesService.listar).mockResolvedValueOnce([
      { ...JORNADA_LV, funcionarios: 12, conductores: 3 },
      JORNADA_24_7,
    ]);
    render(
      <MemoryRouter>
        <ConAlta />
      </MemoryRouter>,
    );

    const fila = (await screen.findByText("Lunes a Viernes 8 horas")).closest(
      "tr",
    )!;
    expect(within(fila).getByText("08H00 a 16H00")).toBeInTheDocument();
    // Las fichas llevan a Personal filtrada por la jornada; los conductores van como texto.
    const enlace = within(fila).getByRole("link", {
      name: /Ver las 12 fichas de personal/,
    });
    expect(enlace).toHaveAttribute(
      "href",
      "/administracion/personal?jornada=1",
    );
    expect(enlace).toHaveTextContent("12 fichas de personal →");
    expect(within(fila).getByText(/y 3 conductores/)).toBeInTheDocument();
    // Los días se leen sin depender del color (regla 6).
    expect(within(fila).getByText(": sábado, no")).toBeInTheDocument();
    // Inactivo: gris con borde, del mismo ancho que el activo (2026-10-24).
    const sabado = within(fila).getByText(": sábado, no").closest(".badge")!;
    const lunes = within(fila).getByText(": lunes").closest(".badge")!;
    expect(sabado).toHaveClass("badge-outline", "text-app-muted", "w-7");
    expect(lunes).toHaveClass("badge-primary", "w-7");

    const otra = screen.getByText("Lunes a Domingo 24/7").closest("tr")!;
    expect(
      within(otra).getByText("Sin horario · a cualquier hora"),
    ).toBeInTheDocument();
    expect(
      within(otra).getByText("Nadie la tiene asignada"),
    ).toBeInTheDocument();
  });

  it("crear una jornada sin horario envía sus días y vacía la caché", async () => {
    vi.mocked(JornadasLaboralesService.crear).mockResolvedValueOnce({
      ...JORNADA_24_7,
      id: 3,
      nombre: "Fin de semana",
    });
    render(
      <MemoryRouter>
        <ConAlta />
      </MemoryRouter>,
    );
    await screen.findByText("Lunes a Viernes 8 horas");

    await userEvent.click(
      screen.getByRole("button", { name: "+ Nueva jornada" }),
    );
    await userEvent.type(screen.getByLabelText(/^Nombre/), "Fin de semana");
    for (const dia of [
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
      "domingo",
    ]) {
      const casilla = screen.getByRole("checkbox", { name: dia });
      const debe = dia === "sábado" || dia === "domingo";
      if ((casilla as HTMLInputElement).checked !== debe)
        await userEvent.click(casilla);
    }
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Con horario/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(JornadasLaboralesService.crear).toHaveBeenCalledWith({
        nombre: "Fin de semana",
        dias: [6, 7],
        horaInicio: null,
        horaFin: null,
      }),
    );
  });

  it("no deja guardar un nombre repetido, y lo dice", async () => {
    render(
      <MemoryRouter>
        <ConAlta />
      </MemoryRouter>,
    );
    await screen.findByText("Lunes a Viernes 8 horas");

    await userEvent.click(
      screen.getByRole("button", { name: "+ Nueva jornada" }),
    );
    await userEvent.type(
      screen.getByLabelText(/^Nombre/),
      "lunes a domingo 24/7",
    );

    expect(
      screen.getByText("Ya existe una jornada laboral con ese nombre."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(JornadasLaboralesService.crear).not.toHaveBeenCalled();
  });

  it("desactivar pregunta antes y dice que quien la tiene la conserva", async () => {
    vi.mocked(JornadasLaboralesService.listar).mockResolvedValueOnce([
      { ...JORNADA_LV, funcionarios: 1, conductores: 0 },
    ]);
    vi.mocked(JornadasLaboralesService.cambiarActivo).mockResolvedValueOnce({
      ...JORNADA_LV,
      activo: false,
    });
    render(
      <MemoryRouter>
        <ConAlta />
      </MemoryRouter>,
    );
    await screen.findByText("Lunes a Viernes 8 horas");

    await userEvent.click(
      screen.getByRole("button", {
        name: /Desactivar la jornada Lunes a Viernes 8 horas/,
      }),
    );

    // Asignada: advertencia (no peligro), con cuántos la usan.
    const dialogo = await screen.findByRole("alertdialog");
    expect(
      within(dialogo).getByText(
        /Quien ya la tiene la conserva: 1 ficha de personal/,
      ),
    ).toBeInTheDocument();
    expect(dialogo.outerHTML).not.toMatch(/peligro/);
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Desactivar" }),
    );

    await waitFor(() =>
      expect(JornadasLaboralesService.cambiarActivo).toHaveBeenCalledWith(
        1,
        false,
      ),
    );
  });
});
