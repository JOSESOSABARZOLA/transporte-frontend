/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Trámites de Inspección
 * Archivo: selectorPersonalTramite.spec.tsx
 * Responsabilidad: Verificar que el combo del trámite aparece solo para inspectores y avisa la elección.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/tramitesInspeccion.service.ts", () => ({
  TramitesInspeccionService: { consultar: vi.fn() },
}));

import SelectorPersonal, { type PersonaAgregada } from "./SelectorPersonal.tsx";
import { TramitesInspeccionService } from "../../services/tramitesInspeccion.service.ts";

/** Una inspectora General y una persona de Unidad de Operativos, ya agregadas en el alta. */
const AGREGADAS: PersonaAgregada[] = [
  {
    funcionarioId: 4,
    nombre: "VIZCAINO MAYRA",
    telefono: null,
    area: "GENERAL",
    horaInicio: "08:00",
    horaFin: "12:00",
  },
  {
    funcionarioId: 9,
    nombre: "PEREZ JUAN",
    telefono: null,
    area: "OPERATIVOS",
    horaInicio: "08:00",
    horaFin: "12:00",
  },
];

const pintar = (onCambiarTramite = vi.fn(), tramitePorLote = false) => {
  render(
    <SelectorPersonal
      candidatos={[]}
      cargando={false}
      agregadas={AGREGADAS}
      onAgregar={vi.fn()}
      onRetirar={vi.fn()}
      deshabilitado={false}
      avisoRechazo={null}
      listaCompacta
      horarioInline
      onCambiarHorario={vi.fn()}
      horasHorario={["08:00", "12:00"]}
      fechaTramites="2026-09-29"
      onCambiarTramite={onCambiarTramite}
      tramitePorLote={tramitePorLote}
    />,
  );
  return { onCambiarTramite };
};

describe("SelectorPersonal · trámite de Inspección (2026-10-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TramitesInspeccionService.consultar).mockResolvedValue({
      disponible: true,
      motivo: null,
      personas: [
        {
          funcionarioId: 4,
          esInspector: true,
          tramites: [
            {
              codigoTramite: "DENUNCIA-26-3415",
              nroSitra: null,
              predio: null,
              zonal: "Los Chillos",
              materia: "Espacio público",
              tipoTramite: "DENUNCIA",
            },
          ],
        },
      ],
    });
  });

  it("solo consulta y ofrece combo a los inspectores (General/Técnico)", async () => {
    pintar();

    expect(
      await screen.findByRole("option", {
        name: "DENUNCIA-26-3415 · Espacio público · Los Chillos",
      }),
    ).toBeInTheDocument();
    expect(TramitesInspeccionService.consultar).toHaveBeenCalledWith(
      "2026-09-29",
      [4],
    );
    expect(
      screen.getByRole("combobox", {
        name: "Trámite de Inspección de VIZCAINO MAYRA",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", {
        name: "Trámite de Inspección de PEREZ JUAN",
      }),
    ).not.toBeInTheDocument();
  });

  it("elegir un trámite avisa a la página con el funcionario y el código", async () => {
    const { onCambiarTramite } = pintar();

    await screen.findByRole("option", {
      name: "DENUNCIA-26-3415 · Espacio público · Los Chillos",
    });
    await userEvent.selectOptions(
      screen.getByRole("combobox", {
        name: "Trámite de Inspección de VIZCAINO MAYRA",
      }),
      "DENUNCIA-26-3415",
    );

    expect(onCambiarTramite).toHaveBeenCalledWith(4, "DENUNCIA-26-3415");
  });

  it("pinta UN combo por inspector (no se duplica en la fila)", async () => {
    pintar();

    await screen.findByRole("option", {
      name: "DENUNCIA-26-3415 · Espacio público · Los Chillos",
    });
    expect(
      screen.getAllByRole("combobox", {
        name: "Trámite de Inspección de VIZCAINO MAYRA",
      }),
    ).toHaveLength(1);
  });

  it("en la edición por lote del form 8, el combo avisa que alcanza a todas las copias", async () => {
    pintar(vi.fn(), true);

    expect(
      await screen.findByText(
        "Se aplica a todas las copias de esta persona en este registro.",
      ),
    ).toBeInTheDocument();
  });
});
