/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Alta desde el directorio de Auth central
 * Archivo: pasoBuscarPersona.spec.tsx
 * Responsabilidad: Verificar el paso 1 rediseñado y su cajón (elegir persona / registro manual).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PasoBuscarPersona from "./PasoBuscarPersona.tsx";
import DrawerFlujoAlta from "./DrawerFlujoAlta.tsx";
import { PARA_FICHA } from "./propositoDirectorio.ts";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { AreaPersonal, Zonal } from "../../interfaces/Formulario.ts";

const fila = (over?: Partial<FilaDirectorio>): FilaDirectorio => ({
  authId: 1,
  cedula: "1712345678",
  nombre: "PEREZ LOPEZ JUAN",
  usuario: "jperez",
  correo: "jperez@amc.gob.ec",
  dependencia: "DMIP",
  roles: [],
  inspector: null,
  ficha: null,
  cuenta: null,
  ...over,
});

const conFicha = (): FilaDirectorio =>
  fila({
    authId: 2,
    nombre: "RIOS ANA",
    cedula: "0912345678",
    ficha: {
      id: 9,
      apellidos: "RIOS",
      nombres: "ANA",
      area: "GENERAL",
      tipoContrato: "NOMBRAMIENTO",
      activo: true,
    },
  });

const propsPaso = {
  proposito: PARA_FICHA,
  filas: [fila(), conFicha()],
  disponible: true,
  motivo: null,
  cargando: false,
  onActualizar: vi.fn(),
  elegidaId: null as number | null,
  onSeleccionar: vi.fn(),
  onRegistroManual: vi.fn(),
};

describe("PasoBuscarPersona · elegir del directorio", () => {
  it("cuenta resultados y cuántos ya tienen ficha", () => {
    render(<PasoBuscarPersona {...propsPaso} />);
    expect(
      screen.getByText(/2 resultados.*1 ya tienen\s*ficha/),
    ).toBeInTheDocument();
  });

  it("filtra por la búsqueda", async () => {
    render(<PasoBuscarPersona {...propsPaso} />);
    await userEvent.type(
      screen.getByLabelText("Buscar en el directorio de Auth"),
      "rios",
    );

    expect(screen.getByText("RIOS ANA")).toBeInTheDocument();
    expect(screen.queryByText("PEREZ LOPEZ JUAN")).toBeNull();
  });

  it("quien ya tiene ficha aparece deshabilitado con su distintivo", () => {
    render(<PasoBuscarPersona {...propsPaso} />);
    expect(screen.getByText("Ya tiene ficha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /RIOS ANA/ })).toBeDisabled();
  });

  it("elegir una fila la selecciona (la avanza el pie del cajón, no la fila)", async () => {
    const onSeleccionar = vi.fn();
    render(
      <PasoBuscarPersona
        {...propsPaso}
        onSeleccionar={onSeleccionar}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /PEREZ LOPEZ JUAN/ }),
    );
    expect(onSeleccionar).toHaveBeenCalledWith(
      expect.objectContaining({ authId: 1 }),
    );
  });

  it("«¿No aparece? Registro manual» sale por el handler cuando no hay resultados", async () => {
    const onRegistroManual = vi.fn();
    render(
      <PasoBuscarPersona
        {...propsPaso}
        filas={[]}
        onRegistroManual={onRegistroManual}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "¿No aparece? Registro manual" }),
    );
    expect(onRegistroManual).toHaveBeenCalled();
  });
});

const propsDrawer = {
  abierto: true,
  proposito: PARA_FICHA,
  filas: [fila()],
  disponible: true,
  motivo: null,
  cargando: false,
  onActualizar: vi.fn(),
  onCerrar: vi.fn(),
  areasQueGestiona: ["OPERATIVOS"] as AreaPersonal[],
  zonales: [] as Zonal[],
  onGuardar: vi.fn().mockResolvedValue({ ok: true, nombre: "PEREZ JUAN" }),
};

describe("DrawerFlujoAlta · el pie gobierna el avance al paso 2", () => {
  it("«Continuar» está deshabilitado sin selección; al elegir y continuar, entra al paso 2", async () => {
    render(<DrawerFlujoAlta {...propsDrawer} />);

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: /PEREZ LOPEZ JUAN/ }),
    );
    const continuar = screen.getByRole("button", { name: "Continuar" });
    expect(continuar).toBeEnabled();

    await userEvent.click(continuar);
    // Paso 2 dentro del cajón: aparece su pie con «Guardar ficha».
    expect(
      screen.getByRole("button", { name: "Guardar ficha" }),
    ).toBeInTheDocument();
  });

  it("«¿No aparece? Registro manual» entra al paso 2 en modo manual", async () => {
    render(<DrawerFlujoAlta {...propsDrawer} />);

    await userEvent.click(
      screen.getByRole("button", { name: "¿No aparece? Registro manual" }),
    );
    expect(screen.getByText("Registro sin Auth central.")).toBeInTheDocument();
  });
});
