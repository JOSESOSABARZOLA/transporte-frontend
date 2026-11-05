/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Zonas de la ciudad
 * Archivo: adminZonasCiudad.spec.tsx
 * Responsabilidad: Fijar las decisiones de «Zonas de la ciudad»: alta, DMQ intocable y motivos del servidor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-05
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/zonasCiudad.service.ts", () => ({
  ZonasCiudadService: {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
    reactivar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

import AdminZonasCiudadPage from "./AdminZonasCiudadPage.tsx";
import type { ZonaCiudad } from "../interfaces/ZonaCiudad.ts";
import { ZonasCiudadService } from "../services/zonasCiudad.service.ts";
import {
  avisoCambioSector,
  nombreSector,
  textoUso,
  zonaConNombre,
} from "../utils/zonaCiudad.util.ts";

const SIN_USO = { operativos: 0, formularios: 0, puntos: 0, personal: 0, flota: 0 };

const zona = (cambios: Partial<ZonaCiudad> = {}): ZonaCiudad => ({
  id: 3,
  codigo: "CALDERON",
  nombre: "Zonal Calderón",
  sector: "NORTE",
  orden: 3,
  esDmq: false,
  activo: true,
  uso: { ...SIN_USO, formularios: 2, operativos: 8, puntos: 5, personal: 4 },
  formulariosActivos: [1, 4],
  paresSinTiempo: 0,
  puedeDesactivar: false,
  motivoNoDesactivar: "La usan los formularios 1, 4. Desactive primero su zonal en Catálogos del cuadro.",
  puedeEliminar: false,
  motivoNoEliminar: "Ya se usó en operativos: solo puede desactivarse.",
  ...cambios,
});

const DMQ = zona({
  id: 11,
  codigo: "DMQ",
  nombre: "DMQ",
  sector: null,
  orden: 11,
  esDmq: true,
});

const montar = () =>
  render(
    <MemoryRouter>
      <AdminZonasCiudadPage />
    </MemoryRouter>,
  );

/** El nombre puede repetirse en el código (el DMQ): basta la primera aparición. */
const filaDe = async (nombre: string) =>
  (await screen.findAllByText(nombre))[0].closest("tr") as HTMLElement;

describe("zonaCiudad.util", () => {
  it("nombra el sector y el DMQ como todo el distrito", () => {
    expect(nombreSector("VALLE")).toBe("Valle");
    expect(nombreSector(null)).toBe("Todo el distrito");
  });

  it("dice el uso en palabras, o «Sin uso»", () => {
    expect(textoUso(SIN_USO)).toBe("Sin uso");
    expect(textoUso({ ...SIN_USO, formularios: 1, puntos: 3 })).toBe("1 formulario · 3 puntos");
  });

  it("encuentra el nombre repetido sin tildes ni mayúsculas, salvo la propia", () => {
    const zonas = [zona()];
    expect(zonaConNombre("  ZONAL  calderon ", zonas)?.id).toBe(3);
    expect(zonaConNombre("Zonal Calderón", zonas, 3)).toBeNull();
    expect(zonaConNombre("Matriz", zonas)).toBeNull();
  });

  it("solo avisa del cambio de sector si hay traslados sin tiempo propio", () => {
    expect(avisoCambioSector(zona())).toBeNull();
    expect(avisoCambioSector(zona({ paresSinTiempo: 4 }))).toMatch(/^4 traslados de la matriz/);
  });
});

describe("Zonas de la ciudad", () => {
  beforeEach(() => {
    vi.mocked(ZonasCiudadService.listar).mockResolvedValue([zona(), DMQ]);
  });

  it("el DMQ no se edita, y desactivar y eliminar llegan apagados con el motivo del servidor", async () => {
    montar();

    const dmq = await filaDe("DMQ");
    expect(within(dmq).getByText("Todo el distrito")).toBeInTheDocument();
    expect(within(dmq).getByRole("button", { name: /Editar/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    const calderon = await filaDe("Zonal Calderón");
    expect(within(calderon).getByText("Activa en los formularios 1, 4")).toBeInTheDocument();
    expect(within(calderon).getByRole("button", { name: /Desactivar/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(within(calderon).getByRole("button", { name: /Eliminar/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("crea una zona con nombre y sector, y avisa el nombre repetido antes de enviar", async () => {
    vi.mocked(ZonasCiudadService.crear).mockResolvedValue(
      zona({ id: 12, codigo: "MATRIZ", nombre: "Matriz", sector: "CENTRO", orden: 12 }),
    );
    montar();
    await filaDe("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "+ Nueva zona" }));
    const nombre = screen.getByLabelText(/Nombre/);
    await userEvent.type(nombre, "zonal calderon");
    expect(screen.getByText("Ya existe una zona de la ciudad con ese nombre.")).toBeInTheDocument();

    await userEvent.clear(nombre);
    await userEvent.type(nombre, "MATRIZ");
    await userEvent.selectOptions(screen.getByLabelText(/Sector de la ciudad/), "CENTRO");
    expect(screen.getByLabelText(/Orden/)).toHaveValue(12);
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(ZonasCiudadService.crear).toHaveBeenCalledWith({
      nombre: "MATRIZ",
      sector: "CENTRO",
      orden: 12,
    });
  });

  it("cambiar el sector de una zona con traslados sin tiempo propio lo advierte", async () => {
    vi.mocked(ZonasCiudadService.listar).mockResolvedValue([zona({ paresSinTiempo: 6 })]);
    montar();
    const calderon = await filaDe("Zonal Calderón");

    await userEvent.click(within(calderon).getByRole("button", { name: /Editar/ }));
    expect(screen.queryByText(/traslados de la matriz/)).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText(/Sector de la ciudad/), "SUR");
    expect(screen.getByText(/^6 traslados de la matriz sin tiempo propio/)).toBeInTheDocument();
  });
});
