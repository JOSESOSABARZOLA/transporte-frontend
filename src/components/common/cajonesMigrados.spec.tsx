/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: cajonesMigrados.spec.tsx
 * Responsabilidad: Verificar lo que el cajón estándar AGREGÓ a los cajones que ya existían
 *                  (2026-10-15, bloque 2): descarte donde faltaba, la ficha del conductor de
 *                  «Planificar el día» en el mismo cajón que Flota y el pie en modo lectura.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Conductor } from "../../interfaces/Transporte.ts";

vi.mock("../../services/planificacion.service.ts", () => ({
  PlanificacionService: {
    registrarChecklist: vi.fn(),
    registrarKilometraje: vi.fn().mockResolvedValue(undefined),
    registrarVale: vi.fn(),
  },
}));
vi.mock("../../services/flota.service.ts", () => ({
  FlotaService: {
    listarConductores: vi.fn(),
    listarVehiculos: vi.fn().mockResolvedValue([]),
    actualizarConductor: vi.fn(),
  },
}));

import DrawerOperacionVehiculo from "../transporte/linea/DrawerOperacionVehiculo.tsx";
import CompletarConductor from "../transporte/planificar/CompletarConductor.tsx";
import { FlotaService } from "../../services/flota.service.ts";

const pintarOperacion = (onCerrar = vi.fn()) => {
  render(
    <DrawerOperacionVehiculo
      fecha="2026-10-15"
      vehiculoId={80}
      placa="PMA-7056"
      conductorId={10}
      conductor="LOOR ANA"
      avisoCombustible={false}
      onCerrar={onCerrar}
    />,
  );
  return onCerrar;
};

describe("Operación del vehículo · cajón estándar en lectura", () => {
  it("sin nada escrito, «Cerrar» cierra sin preguntar", async () => {
    const onCerrar = pintarOperacion();
    const cajon = screen.getByRole("dialog", { name: "Operación del vehículo" });
    expect(cajon).toHaveTextContent("PMA-7056");
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();

    await userEvent.click(screen.getByText("Cerrar"));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("con un kilometraje escrito y sin registrar, cerrar pregunta; registrado, ya no", async () => {
    const onCerrar = pintarOperacion();
    await userEvent.type(screen.getByLabelText("Lectura del odómetro"), "85000");

    await userEvent.click(screen.getByText("Cerrar"));
    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(onCerrar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Registrar kilometraje" }));
    expect(await screen.findByText("Kilometraje registrado.")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Cerrar"));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});

const INCOMPLETO: Conductor = {
  id: 10,
  cedula: "1712345678",
  nombreCompleto: "LOOR ANA",
  telefono: null,
  licenciaTipo: "C",
  vehiculoHabitual: { id: 1, placa: "PBA-1234" },
  activo: true,
  sector: null,
  parqueaderoAutorizado: false,
  tipoContrato: "NOMBRAMIENTO",
};

describe("Planificar el día · «Completar» abre el cajón de Flota, no un modal", () => {
  it("es el cajón «Editar conductor» con lo que falta señalado y el pie estándar", async () => {
    vi.mocked(FlotaService.listarConductores).mockResolvedValue([INCOMPLETO]);
    render(
      <CompletarConductor
        conductorId={10}
        onCerrar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

    // El cajón de carga y el de la ficha llevan el mismo título; la ficha trae el subtítulo.
    expect(await screen.findByText("LOOR ANA · C.I. 1712345678")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Sector donde vive")).toHaveFocus());
    expect(screen.getByText("Falta este dato")).toBeInTheDocument();
    // Sin cambios, «Guardar» queda apagado con su motivo.
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute("title", "Sin cambios");
  });

  it("si la ficha no aparece lo dice en el cajón, que solo ofrece cerrar", async () => {
    vi.mocked(FlotaService.listarConductores).mockResolvedValue([]);
    render(
      <CompletarConductor
        conductorId={99}
        onCerrar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("No se encontró la ficha de este conductor."),
    ).toBeInTheDocument();
    expect(screen.getByText("Cerrar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
  });
});
