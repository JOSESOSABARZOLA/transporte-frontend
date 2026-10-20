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
import { PARA_CUENTA, PARA_FICHA } from "./propositoDirectorio.ts";
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

const deBaja = (): FilaDirectorio =>
  fila({
    authId: 3,
    nombre: "VERA LUIS",
    cedula: "1102345678",
    dependencia: "Dirección Metropolitana de Instrucción",
    ficha: {
      id: 10,
      apellidos: "VERA",
      nombres: "LUIS",
      area: "OPERATIVOS",
      tipoContrato: "OCASIONAL",
      activo: false,
    },
  });

describe("PasoBuscarPersona · elegir del directorio (rediseño 2026-10-08)", () => {
  it("oculta por omisión a quien tiene ficha VIGENTE y lo cuenta como «(ocultos)»", () => {
    render(<PasoBuscarPersona {...propsPaso} />);
    expect(
      screen.getByText(/1 resultados · 1 ya tienen\s*ficha \(ocultos\)/),
    ).toBeInTheDocument();
    expect(screen.queryByText("RIOS ANA")).toBeNull();
  });

  it("con «Mostrar quienes ya tienen ficha» aparece, atenuado y sin poder elegirlo", async () => {
    render(<PasoBuscarPersona {...propsPaso} />);
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Mostrar quienes ya tienen ficha" }),
    );
    expect(screen.getByText("Ya tiene ficha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /RIOS ANA/ })).toBeDisabled();
  });

  it("una ficha DADA DE BAJA se ve siempre, con su distintivo, y no se elige (no cuenta como oculta)", () => {
    render(
      <PasoBuscarPersona
        {...propsPaso}
        filas={[fila(), deBaja()]}
      />,
    );
    expect(screen.getByText("Ficha dada de baja")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /VERA LUIS/ })).toBeDisabled();
    expect(screen.getByText(/2 resultados · 0 ya tienen\s*ficha/)).toBeInTheDocument();
  });

  it("filtra por la búsqueda", async () => {
    render(<PasoBuscarPersona {...propsPaso} filas={[fila(), deBaja()]} />);
    await userEvent.type(
      screen.getByLabelText("Buscar en el directorio de Auth"),
      "vera",
    );

    expect(screen.getByText("VERA LUIS")).toBeInTheDocument();
    expect(screen.queryByText("PEREZ LOPEZ JUAN")).toBeNull();
  });

  it("los chips de dependencia filtran, con el rótulo corto", async () => {
    render(<PasoBuscarPersona {...propsPaso} filas={[fila(), deBaja()]} />);
    const grupo = screen.getByRole("group", { name: "Filtrar por dependencia" });
    expect(grupo).toHaveTextContent("Todas");
    await userEvent.click(screen.getByRole("button", { name: "Instrucción" }));

    expect(screen.getByText("VERA LUIS")).toBeInTheDocument();
    expect(screen.queryByText("PEREZ LOPEZ JUAN")).toBeNull();
  });

  it("elegir una fila la selecciona; el DOBLE CLIC elige y avanza", async () => {
    const onSeleccionar = vi.fn();
    const onAvanzar = vi.fn();
    render(
      <PasoBuscarPersona
        {...propsPaso}
        onSeleccionar={onSeleccionar}
        onAvanzar={onAvanzar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /PEREZ LOPEZ JUAN/ }));
    expect(onSeleccionar).toHaveBeenCalledWith(expect.objectContaining({ authId: 1 }));
    expect(onAvanzar).not.toHaveBeenCalled();

    await userEvent.dblClick(screen.getByRole("button", { name: /PEREZ LOPEZ JUAN/ }));
    expect(onAvanzar).toHaveBeenCalledWith(expect.objectContaining({ authId: 1 }));
  });

  it("la CUENTA (P-11) conserva su comportamiento: no oculta ni ofrece chips", () => {
    render(
      <PasoBuscarPersona
        {...propsPaso}
        proposito={PARA_CUENTA}
        filas={[fila(), fila({ authId: 2, nombre: "RIOS ANA", cuenta: { id: 4, roles: [], activo: true } })]}
      />,
    );
    expect(screen.getByText("RIOS ANA")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtrar por dependencia" })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
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

    expect(screen.getByRole("button", { name: "Continuar →" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /PEREZ LOPEZ JUAN/ }),
    );
    const continuar = screen.getByRole("button", { name: "Continuar →" });
    expect(continuar).toBeEnabled();

    await userEvent.click(continuar);
    // Paso 2 dentro del cajón: aparece su pie con «Guardar ficha».
    expect(
      screen.getByRole("button", { name: "Guardar ficha" }),
    ).toBeInTheDocument();
  });

  it("el doble clic en una persona pasa directo al paso 2", async () => {
    render(<DrawerFlujoAlta {...propsDrawer} />);
    await userEvent.dblClick(screen.getByRole("button", { name: /PEREZ LOPEZ JUAN/ }));
    expect(screen.getByRole("button", { name: "Guardar ficha" })).toBeInTheDocument();
  });

  it("«¿No aparece? Registro manual» entra al paso 2 en modo manual", async () => {
    render(<DrawerFlujoAlta {...propsDrawer} />);

    await userEvent.click(
      screen.getByRole("button", { name: "¿No aparece? Registro manual" }),
    );
    expect(screen.getByText("Registro sin Auth central.")).toBeInTheDocument();
  });
});
