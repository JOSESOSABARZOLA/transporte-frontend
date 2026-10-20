/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y mantenimiento
 * Archivo: usabilidadDaf.spec.tsx
 * Responsabilidad: Verificar lo que falta para planificar y sus campos señalados en la ficha que abre
 *                  «Planificar el día», y programar mantenimiento desde la fila. Los garajes y la tabla
 *                  de conductores se prueban en `flota.spec.tsx` desde el rediseño del 2026-10-14.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import DrawerConductor from "./DrawerConductor.tsx";
import DrawerMantenimiento, { AVISO_TAREA_TALLER } from "./DrawerMantenimiento.tsx";
import type { Conductor, VehiculoDeLaFlota } from "../../interfaces/Transporte.ts";
import { faltantesDeConductor } from "../../utils/flota.util.ts";

vi.mock("../../services/transporte.service.ts", () => ({
  TransporteService: {
    consultarVehiculos: vi.fn(),
    listarMantenimientos: vi.fn(),
    registrarMantenimiento: vi.fn(),
    retirarMantenimiento: vi.fn(),
    consultarSemanaMantenimiento: vi.fn(),
  },
}));
vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { listarZonales: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../services/planificacion.service.ts", () => ({
  PlanificacionService: { cambiarEstadoMantenimiento: vi.fn() },
}));

import MantenimientoFlotaPage from "../../pages/MantenimientoFlotaPage.tsx";
import { TransporteService } from "../../services/transporte.service.ts";

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
  tipoContrato: "NOMBRAMIENTO",
};

describe("Planificar · lo que falta en la ficha del conductor", () => {
  it("lo que falta sigue la regla del servidor: sector, contrato y acta vigente si guarda en casa", () => {
    expect(faltantesDeConductor(completo, "2026-10-07")).toEqual([]);
    expect(
      faltantesDeConductor(
        { ...completo, sector: null, parqueaderoAutorizado: true, actaParqueaderoNumero: "A-1", actaParqueaderoDesde: "2026-01-01", actaParqueaderoHasta: "2026-06-30" },
        "2026-10-07",
      ),
    ).toEqual(["sector", "parqueadero"]);
  });
});

const VEHICULO: VehiculoDeLaFlota = {
  id: 80,
  placa: "PMA7056",
  descripcion: "Camioneta",
  utilizable: true,
  motivo: null,
};

describe("Mantenimiento · programar", () => {
  it("con hora de la cita avisa que se creará la tarea «Llevar a taller»", async () => {
    const usuario = userEvent.setup();
    render(
      <DrawerMantenimiento abierto vehiculo={VEHICULO} guardando={false} aviso={null} onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    );

    expect(screen.queryByText(AVISO_TAREA_TALLER)).toBeNull();
    await usuario.type(screen.getByLabelText(/Hora de la cita/), "08:00");
    expect(screen.getByText(AVISO_TAREA_TALLER)).toBeInTheDocument();
  });

  it("«Programar mantenimiento» es la acción principal: abre el modal y pide elegir la placa", async () => {
    const usuario = userEvent.setup();
    vi.mocked(TransporteService.consultarVehiculos).mockResolvedValue([VEHICULO]);
    vi.mocked(TransporteService.consultarSemanaMantenimiento).mockResolvedValue([
      {
        vehiculoId: 80,
        placa: "PMA7056",
        dias: Array.from({ length: 7 }, (_, i) => ({
          fecha: `2026-10-${String(7 + i).padStart(2, "0")}`,
          estado: i === 1 ? ("EN_TALLER" as const) : null,
        })),
      },
    ]);
    vi.mocked(TransporteService.registrarMantenimiento).mockResolvedValue(
      {} as Awaited<ReturnType<typeof TransporteService.registrarMantenimiento>>,
    );
    render(
      <MemoryRouter initialEntries={["/?fecha=2026-10-07"]}>
        <MantenimientoFlotaPage />
      </MemoryRouter>,
    );

    // La semana: el estado en palabras.
    expect(await screen.findByText("En taller")).toBeInTheDocument();

    await usuario.click(await screen.findByRole("button", { name: "Programar mantenimiento" }));
    const modal = await screen.findByRole("dialog", { name: "Programar mantenimiento" });
    await usuario.click(within(modal).getByRole("button", { name: /Registrar parada/ }));
    expect(await within(modal).findByText("Elija el vehículo que va al taller.")).toBeInTheDocument();
    expect(TransporteService.registrarMantenimiento).not.toHaveBeenCalled();

    await usuario.selectOptions(within(modal).getByRole("combobox", { name: /^Vehículo/ }), "80");
    await usuario.click(within(modal).getByRole("button", { name: /Registrar parada/ }));
    expect(TransporteService.registrarMantenimiento).toHaveBeenCalledWith(
      80,
      expect.objectContaining({ desde: "2026-10-07", hasta: "2026-10-07" }),
    );
  });
});

describe("Flota · «Incompleto» abre la edición con lo que falta señalado (2026-10-06)", () => {
  it("borde de error y «Falta este dato» en cada faltante, foco en el primero; se apaga al completarlo", async () => {
    const usuario = userEvent.setup();
    render(
      <DrawerConductor
        conductor={{ ...completo, sector: null, tipoContrato: null }}
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
    const contrato = screen.getByLabelText("Tipo de contrato");
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

describe("Mantenimiento · «Programar» desde la fila (2026-10-06)", () => {
  it("abre el formulario con la placa de esa fila ya elegida", async () => {
    const usuario = userEvent.setup();
    const otro: VehiculoDeLaFlota = { ...VEHICULO, id: 81, placa: "PMA7057" };
    vi.mocked(TransporteService.consultarVehiculos).mockResolvedValue([VEHICULO, otro]);
    vi.mocked(TransporteService.consultarSemanaMantenimiento).mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={["/?fecha=2026-10-07"]}>
        <MantenimientoFlotaPage />
      </MemoryRouter>,
    );

    await usuario.click(
      await screen.findByRole("button", { name: "Programar mantenimiento de PMA7057" }),
    );
    const modal = await screen.findByRole("dialog", { name: "Programar mantenimiento" });
    expect(within(modal).getByRole("combobox", { name: /^Vehículo/ })).toHaveValue("81");
  });

  it("las flechas de semana se leen: «Anterior» y «Siguiente»", async () => {
    vi.mocked(TransporteService.consultarVehiculos).mockResolvedValue([VEHICULO]);
    vi.mocked(TransporteService.consultarSemanaMantenimiento).mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={["/?fecha=2026-10-07"]}>
        <MantenimientoFlotaPage />
      </MemoryRouter>,
    );

    const anterior = await screen.findByRole("button", { name: "Semana anterior" });
    expect(anterior).toHaveTextContent("Anterior");
    expect(anterior).toHaveClass("btn", "app-accion-secundaria");
    expect(screen.getByRole("button", { name: "Semana siguiente" })).toHaveTextContent("Siguiente");
  });
});

describe("Mantenimiento · estándar de botones (2026-10-15)", () => {
  it("la fila lleva «Programar» acento y «Ver paradas» secundario, ambos de 32 px", async () => {
    vi.mocked(TransporteService.consultarVehiculos).mockResolvedValue([VEHICULO]);
    vi.mocked(TransporteService.consultarSemanaMantenimiento).mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={["/?fecha=2026-10-07"]}>
        <MantenimientoFlotaPage />
      </MemoryRouter>,
    );

    const programar = await screen.findByRole("button", {
      name: "Programar mantenimiento de PMA7056",
    });
    expect(programar).toHaveClass("btn-outline", "btn-primary", "btn-sm");
    expect(screen.getByRole("button", { name: "Ver paradas" })).toHaveClass(
      "app-accion-secundaria",
      "btn-sm",
    );
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toHaveClass("text-right");
  });

  it("la flota se pagina de a 10 y la parada se ELIMINA (borra la fila) con confirmación", async () => {
    const usuario = userEvent.setup();
    const flota = Array.from({ length: 12 }, (_, i) => ({
      ...VEHICULO,
      id: 100 + i,
      placa: `PMA-${7000 + i}`,
    }));
    vi.mocked(TransporteService.consultarVehiculos).mockResolvedValue(flota);
    vi.mocked(TransporteService.consultarSemanaMantenimiento).mockResolvedValue([]);
    vi.mocked(TransporteService.listarMantenimientos).mockResolvedValue([
      {
        id: 5,
        vehiculoId: 100,
        desde: "2026-10-07",
        hasta: "2026-10-08",
        taller: null,
        hora: null,
        motivo: null,
        estado: "PROGRAMADO",
      },
    ]);
    render(
      <MemoryRouter initialEntries={["/?fecha=2026-10-07"]}>
        <MantenimientoFlotaPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Mostrando/)).toHaveTextContent("Mostrando 1–10 de 12");
    expect(screen.getAllByRole("button", { name: "Ver paradas" })).toHaveLength(10);

    await usuario.click(screen.getAllByRole("button", { name: "Ver paradas" })[0]);
    const eliminar = await screen.findByRole("button", {
      name: "Eliminar la parada del 2026-10-07 al 2026-10-08",
    });
    expect(eliminar).toHaveTextContent("Eliminar");
    await usuario.click(eliminar);
    expect(await screen.findByText("¿Eliminar la parada?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sí, eliminar" })).toHaveClass("btn-error");
  });
});
