/**
 * App: Cuadro de Colores
 * Módulo: Flota
 * Feature: Mantenimiento de vehículos (Fase 5)
 * Archivo: mantenimientoEstado.spec.tsx
 * Responsabilidad: Verificar el estado de la cita de taller (Programado / En taller / Listo) y
 *                  que la zonal del taller viaje al registrarla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Se prueban las DECISIONES: las transiciones que se ofrecen según el estado (LISTO es final) y que
 * el cambio vaya al endpoint propio. El estado se lee en palabras (regla 6).
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MantenimientoFlotaPage from "../../pages/MantenimientoFlotaPage.tsx";
import { resumenCajon } from "../../pruebas/resumenCajon.ts";

vi.mock("../../services/transporte.service.ts", () => ({
  TransporteService: {
    consultarVehiculos: vi.fn(),
    listarMantenimientos: vi.fn(),
    registrarMantenimiento: vi.fn(),
    retirarMantenimiento: vi.fn(),
    // La vista semanal (2026-10-06).
    consultarSemanaMantenimiento: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { listarZonales: vi.fn() },
}));

vi.mock("../../services/planificacion.service.ts", () => ({
  PlanificacionService: { cambiarEstadoMantenimiento: vi.fn() },
}));

import { CatalogoCuadroService } from "../../services/catalogoCuadro.service.ts";
import { PlanificacionService } from "../../services/planificacion.service.ts";
import { TransporteService } from "../../services/transporte.service.ts";

const VEHICULO = {
  id: 7,
  placa: "PMA7056",
  descripcion: "Camioneta",
  utilizable: true,
  motivo: null,
};

const parada = (estado: "PROGRAMADO" | "EN_TALLER" | "LISTO") => ({
  id: 70,
  vehiculoId: 7,
  desde: "2026-10-08",
  hasta: "2026-10-08",
  taller: "AMBACAR",
  hora: "08:00",
  motivo: "Frenos",
  estado,
  zonalTallerId: 2,
});

const abrirParadas = async () => {
  const usuario = userEvent.setup();
  // La página usa la fecha de trabajo de la DAF (URL): necesita un enrutador (2026-10-06).
  render(
    <MemoryRouter>
      <MantenimientoFlotaPage />
    </MemoryRouter>,
  );
  await usuario.click(await screen.findByRole("button", { name: "Ver paradas" }));
  return { usuario, modal: await screen.findByRole("dialog", { name: "Paradas de PMA7056" }) };
};

describe("Fase 5 · estado de la cita de taller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TransporteService.consultarVehiculos).mockResolvedValue([
      VEHICULO,
    ] as never);
    vi.mocked(CatalogoCuadroService.listarZonales).mockResolvedValue([
      { id: 2, nombre: "Calderón" },
    ] as never);
  });

  it("una cita PROGRAMADA ofrece pasar a «En taller» y el cambio va a su endpoint", async () => {
    vi.mocked(TransporteService.listarMantenimientos).mockResolvedValue([
      parada("PROGRAMADO"),
    ]);
    vi.mocked(PlanificacionService.cambiarEstadoMantenimiento).mockResolvedValue();
    const { usuario, modal } = await abrirParadas();

    expect(await within(modal).findByText("Programado")).toBeInTheDocument();
    await usuario.click(within(modal).getByRole("button", { name: "Marcar en taller" }));

    await waitFor(() =>
      expect(PlanificacionService.cambiarEstadoMantenimiento).toHaveBeenCalledWith(
        7,
        70,
        "EN_TALLER",
      ),
    );
  });

  it("una cita LISTA es final: no ofrece transiciones", async () => {
    vi.mocked(TransporteService.listarMantenimientos).mockResolvedValue([
      parada("LISTO"),
    ]);
    const { modal } = await abrirParadas();

    expect(await within(modal).findByText("Listo")).toBeInTheDocument();
    expect(within(modal).queryByRole("button", { name: "Marcar listo" })).toBeNull();
    expect(within(modal).queryByRole("button", { name: "Marcar en taller" })).toBeNull();
  });
});

/**
 * UN CAJÓN A LA VEZ (D7, 2026-10-15). Antes «Registrar parada» se abría ENCIMA de «Ver paradas» y
 * un solo Escape cerraba las dos capas. Ahora lo reemplaza, y al cerrarse vuelve a las paradas.
 */
describe("Cajón estándar · Paradas → Registrar parada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TransporteService.consultarVehiculos).mockResolvedValue([VEHICULO] as never);
    vi.mocked(CatalogoCuadroService.listarZonales).mockResolvedValue([] as never);
    vi.mocked(TransporteService.listarMantenimientos).mockResolvedValue([]);
  });

  it("«Registrar parada» reemplaza al cajón de paradas: queda un solo diálogo", async () => {
    const { usuario, modal } = await abrirParadas();

    await usuario.click(within(modal).getByRole("button", { name: "Registrar parada" }));

    expect(await screen.findByRole("dialog", { name: "Registrar parada" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Paradas de PMA7056" })).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("Escape cierra solo el registro y vuelve a las paradas", async () => {
    const { usuario, modal } = await abrirParadas();
    await usuario.click(within(modal).getByRole("button", { name: "Registrar parada" }));
    await screen.findByRole("dialog", { name: "Registrar parada" });

    await usuario.keyboard("{Escape}");

    expect(await screen.findByRole("dialog", { name: "Paradas de PMA7056" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Registrar parada" })).toBeNull();
  });

  it("el cajón de paradas es de consulta: [Cerrar] y ningún «Guardar»", async () => {
    const { modal } = await abrirParadas();

    expect(within(modal).queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(within(modal).getAllByRole("button", { name: "Cerrar" }).length).toBeGreaterThan(0);
    // La estructura del cajón estándar (R10): ancho, cabecera, secciones y pie.
    expect(resumenCajon(modal)).toMatchSnapshot();
  });
});
