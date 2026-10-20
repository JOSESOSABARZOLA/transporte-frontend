/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Trámites de Inspección
 * Archivo: comboTramiteInspeccion.spec.tsx
 * Responsabilidad: Verificar el combo del trámite: opciones, «Sin trámite» y cada estado en palabras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ComboTramiteInspeccion from "./ComboTramiteInspeccion.tsx";
import type { TramiteInspeccion } from "../../interfaces/TramiteInspeccion.ts";

const TRAMITES: TramiteInspeccion[] = [
  {
    codigoTramite: "DENUNCIA-26-3415",
    nroSitra: "AMC-ECU9500",
    predio: null,
    zonal: "Los Chillos",
    materia: "Espacio público",
    tipoTramite: "DENUNCIA",
  },
  {
    codigoTramite: "ESCRITO-26-0489",
    nroSitra: null,
    predio: null,
    zonal: "Eugenio Espejo",
    materia: null,
    tipoTramite: "ESCRITOS",
  },
];

const pintar = (
  cambios: Partial<Parameters<typeof ComboTramiteInspeccion>[0]> = {},
) => {
  const onCambiar = vi.fn();
  render(
    <ComboTramiteInspeccion
      nombrePersona="VIZCAINO MAYRA"
      valor={null}
      tramites={TRAMITES}
      cargando={false}
      disponible
      motivo={null}
      deshabilitado={false}
      onCambiar={onCambiar}
      {...cambios}
    />,
  );
  return { onCambiar };
};

describe("ComboTramiteInspeccion", () => {
  it("ofrece «Sin trámite» y cada trámite con su código, materia (o tipo) y zonal", () => {
    pintar();

    const combo = screen.getByRole("combobox", {
      name: "Trámite de Inspección de VIZCAINO MAYRA",
    });
    const opciones = Array.from(combo.querySelectorAll("option")).map(
      (opcion) => opcion.textContent,
    );
    expect(opciones).toEqual([
      "Sin trámite de Inspección",
      "DENUNCIA-26-3415 · Espacio público · Los Chillos",
      "ESCRITO-26-0489 · ESCRITOS · Eugenio Espejo",
    ]);
  });

  it("elegir un trámite avisa su código; volver a «Sin trámite» avisa null", async () => {
    const { onCambiar } = pintar({ valor: "DENUNCIA-26-3415" });
    const combo = screen.getByRole("combobox");

    await userEvent.selectOptions(combo, "ESCRITO-26-0489");
    expect(onCambiar).toHaveBeenLastCalledWith("ESCRITO-26-0489");

    await userEvent.selectOptions(combo, "");
    expect(onCambiar).toHaveBeenLastCalledWith(null);
  });

  it("si Inspección no está disponible, lo dice con el motivo del servidor tal cual", () => {
    pintar({
      disponible: false,
      tramites: [],
      motivo: "El sistema de Inspección no respondió.",
    });

    expect(
      screen.getByText(
        "Inspección no disponible: El sistema de Inspección no respondió.",
      ),
    ).toBeInTheDocument();
    // Sigue pudiendo elegirse «Sin trámite»: el registro no depende de Inspección.
    expect(screen.getByRole("combobox")).toBeEnabled();
  });

  it("sin trámites ese día, lo dice en palabras", () => {
    pintar({ tramites: [] });

    expect(
      screen.getByText("Sin trámites asignados en Inspección para esta fecha."),
    ).toBeInTheDocument();
  });

  it("mientras consulta, lo anuncia", () => {
    pintar({ cargando: true });

    expect(
      screen.getByText("Consultando trámites de Inspección…"),
    ).toBeInTheDocument();
  });

  it("un trámite ya guardado que hoy no llega en la lista se conserva como opción", () => {
    pintar({ valor: "DENUNCIA-26-9999", tramites: [] });

    expect(screen.getByRole("combobox")).toHaveValue("DENUNCIA-26-9999");
  });

  it("si Inspección respondió y el guardado ya no figura, lo rotula y pide elegir otro", () => {
    pintar({ valor: "DENUNCIA-26-9999" });

    expect(
      screen.getByRole("option", {
        name: "DENUNCIA-26-9999 (ya no figura en Inspección)",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ya no figura en Inspección para esta fecha: elija otro/),
    ).toBeInTheDocument();
  });

  it("si Inspección no respondió, no afirma que el guardado ya no figura", () => {
    pintar({
      valor: "DENUNCIA-26-9999",
      tramites: [],
      disponible: false,
      motivo: "Sin conexión.",
    });

    expect(
      screen.getByRole("option", { name: "DENUNCIA-26-9999" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ya no figura/)).not.toBeInTheDocument();
  });

  it("form 8 por lote: avisa que el trámite se aplica a todas las copias, ligado al combo", () => {
    pintar({ avisoLote: true });

    const aviso = screen.getByText(
      "Se aplica a todas las copias de esta persona en este registro.",
    );
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-describedby",
      aviso.id,
    );
  });

  it("sin lote no hay aviso de copias", () => {
    pintar();

    expect(screen.queryByText(/todas las copias/)).not.toBeInTheDocument();
  });
});
