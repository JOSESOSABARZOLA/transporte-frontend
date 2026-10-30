/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y mantenimiento
 * Archivo: usabilidadDaf.spec.tsx
 * Responsabilidad: Verificar lo que falta para planificar y sus campos señalados en la ficha que abre
 *                  «Planificar el día». Los garajes y la tabla de conductores se prueban en
 *                  `flota.spec.tsx` desde el rediseño del 2026-10-14, y programar mantenimiento en
 *                  `mantenimiento.spec.tsx` desde el 2026-10-20.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DrawerConductor from "./DrawerConductor.tsx";
import type { Conductor } from "../../interfaces/Transporte.ts";
import { faltantesDeConductor } from "../../utils/flota.util.ts";

const completo: Conductor = {
  id: 10,
  cedula: "1712345678",
  nombreCompleto: "LOOR ANA",
  telefono: null,
  licenciaTipo: "C",
  vehiculoHabitual: { id: 1, placa: "PBA-1234" },
  activo: true,
  sector: "NORTE",
  parqueaderoAutorizado: false,
  jornadaLaboralId: 1,
};

describe("Planificar · lo que falta en la ficha del conductor", () => {
  it("lo que falta sigue la regla del servidor: sector, jornada y acta vigente si guarda en casa", () => {
    expect(faltantesDeConductor(completo, "2026-10-07")).toEqual([]);
    expect(
      faltantesDeConductor(
        { ...completo, sector: null, parqueaderoAutorizado: true, actaParqueaderoNumero: "A-1", actaParqueaderoDesde: "2026-01-01", actaParqueaderoHasta: "2026-06-30" },
        "2026-10-07",
      ),
    ).toEqual(["sector", "parqueadero"]);
  });
});

describe("Flota · «Incompleto» abre la edición con lo que falta señalado (2026-10-06)", () => {
  it("borde de error y «Falta este dato» en cada faltante, foco en el primero; se apaga al completarlo", async () => {
    const usuario = userEvent.setup();
    render(
      <DrawerConductor
        conductor={{ ...completo, sector: null, jornadaLaboralId: null }}
        conductores={[]}
        vehiculos={[]}
        guardando={false}
        errorServidor={null}
        onGuardar={vi.fn()}
        onCerrar={vi.fn()}
        senalarFaltantes
      />,
    );

    const sector = screen.getByLabelText("Sector donde vive");
    const contrato = screen.getByLabelText("Jornada laboral");
    expect(sector).toHaveClass("select-error");
    expect(contrato).toHaveClass("select-error");
    expect(screen.getAllByText("Falta este dato")).toHaveLength(2);
    await waitFor(() => expect(sector).toHaveFocus());

    await usuario.selectOptions(sector, "SUR");
    expect(sector).not.toHaveClass("select-error");
    expect(screen.getAllByText("Falta este dato")).toHaveLength(1);
  });

  it("un conductor completo no señala nada", () => {
    render(
      <DrawerConductor conductor={completo} conductores={[]} vehiculos={[]} guardando={false} errorServidor={null} onGuardar={vi.fn()} onCerrar={vi.fn()} senalarFaltantes />,
    );
    expect(screen.queryByText("Falta este dato")).toBeNull();
  });
});
