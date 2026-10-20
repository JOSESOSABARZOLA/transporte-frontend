/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: maestroPersonal.spec.tsx
 * Responsabilidad: Verificar la PÁGINA rediseñada (2026-10-08): filtro inicial, contador,
 *                  paginación, ausencias del maestro, baja/reactivación y el aviso tras guardar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: {
    listar: vi.fn(),
    areasQueGestiona: vi.fn(),
    listarAusenciasDelMaestro: vi.fn(),
    consultarDirectorio: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
    reactivar: vi.fn(),
    listarAusencias: vi.fn(),
    registrarAusencia: vi.fn(),
    retirarAusencia: vi.fn(),
    operativosDe: vi.fn(),
  },
}));
vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { listarZonales: vi.fn().mockResolvedValue([]) },
}));

import AdminPersonalPage from "../../pages/AdminPersonalPage.tsx";
import { PersonalService } from "../../services/personal.service.ts";
import type { Funcionario } from "../../interfaces/Personal.ts";

const ficha = (id: number, parcial: Partial<Funcionario> = {}): Funcionario => ({
  id,
  cedula: String(1700000000 + id),
  apellidos: `APELLIDO${String(id).padStart(2, "0")}`,
  nombres: "NOMBRE",
  telefono: null,
  correoInstitucional: null,
  correoPersonal: null,
  cargo: null,
  area: "OPERATIVOS",
  tipoContrato: "OCASIONAL",
  direccion: "DMIP_OPERATIVOS",
  activo: true,
  ...parcial,
});

/** 13 activas y 2 de baja: «13 funcionarios · 13 activos de 15 en el maestro». */
const MAESTRO = [
  ...Array.from({ length: 13 }, (_, i) => ficha(i + 1)),
  ficha(14, { activo: false }),
  ficha(15, { activo: false }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PersonalService.listar).mockResolvedValue(MAESTRO);
  vi.mocked(PersonalService.areasQueGestiona).mockResolvedValue(["OPERATIVOS"]);
  vi.mocked(PersonalService.listarAusenciasDelMaestro).mockResolvedValue([]);
});

const abrir = async () => {
  render(<AdminPersonalPage />);
  await screen.findByText(/en el maestro/);
};

describe("P-07 · filtro inicial, contador y paginación", () => {
  it("abre en «Activos» y el contador distingue lo filtrado del maestro", async () => {
    await abrir();
    expect(screen.getByRole("button", { name: "Activos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByText("13 funcionarios · 13 activos de 15 en el maestro"),
    ).toBeInTheDocument();
    expect(screen.queryByText("APELLIDO14 NOMBRE")).toBeNull();
  });

  it("10 por página: la segunda página trae las 3 restantes", async () => {
    await abrir();
    // Cabecera + 10 filas.
    expect(screen.getAllByRole("row")).toHaveLength(11);
    await userEvent.click(screen.getByRole("button", { name: "Siguiente ›" }));
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("APELLIDO13 NOMBRE")).toBeInTheDocument();
  });

  it("«Inactivos» muestra solo las bajas", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Inactivos" }));
    expect(
      screen.getByText("2 funcionarios · 13 activos de 15 en el maestro"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Inactivo")).toHaveLength(2);
  });
});

describe("P-07 · ausencias del maestro en UNA consulta", () => {
  it("pide las ausencias una vez y pinta «Ausente dd/mm–dd/mm» en su fila", async () => {
    vi.mocked(PersonalService.listarAusenciasDelMaestro).mockResolvedValue([
      {
        id: 60,
        funcionarioId: 2,
        estado: "LICENCIA",
        desde: "2099-10-12",
        hasta: "2099-10-23",
        momento: "PROXIMA",
      },
    ]);
    await abrir();
    expect(await screen.findByText("Ausente 12/10–23/10")).toBeInTheDocument();
    expect(PersonalService.listarAusenciasDelMaestro).toHaveBeenCalledTimes(1);
    // Ya no hay una petición por fila.
    expect(PersonalService.listarAusencias).not.toHaveBeenCalled();
  });
});

describe("P-07 · baja y reactivación con confirmación", () => {
  it("«Desactivar» (visible en la fila) abre «¿Desactivar a NOMBRE?», exige el motivo y avisa al terminar", async () => {
    vi.mocked(PersonalService.desactivar).mockResolvedValue({
      mensaje: "APELLIDO01 NOMBRE dejó el maestro; conserva 3 operativos.",
      operativosHistoricos: 3,
    });
    await abrir();

    await userEvent.click(
      screen.getByRole("button", { name: "Desactivar APELLIDO01 NOMBRE" }),
    );

    const dialogo = screen.getByRole("alertdialog", {
      name: "¿Desactivar a APELLIDO01 NOMBRE?",
    });
    expect(
      within(dialogo).getByText(/Su historial se conserva y puede activarse después/),
    ).toBeInTheDocument();
    const confirmar = within(dialogo).getByRole("button", { name: "Desactivar" });
    expect(confirmar.className).toContain("btn-error");

    await userEvent.selectOptions(
      within(dialogo).getByLabelText("Motivo de la baja"),
      "RENUNCIA",
    );
    await userEvent.click(confirmar);

    expect(PersonalService.desactivar).toHaveBeenCalledWith(1, {
      motivo: "RENUNCIA",
      detalle: undefined,
    });
    expect(
      await screen.findByText("APELLIDO01 NOMBRE dejó el maestro; conserva 3 operativos"),
    ).toBeInTheDocument();
  });

  it("«Activar» pide confirmación antes de llamar al servidor", async () => {
    vi.mocked(PersonalService.reactivar).mockResolvedValue(ficha(14));
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Inactivos" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Activar APELLIDO14 NOMBRE" }),
    );
    expect(PersonalService.reactivar).not.toHaveBeenCalled();

    const dialogo = screen.getByRole("alertdialog", { name: "¿Activar a APELLIDO14 NOMBRE?" });
    await userEvent.click(within(dialogo).getByRole("button", { name: "Activar" }));
    await waitFor(() => expect(PersonalService.reactivar).toHaveBeenCalledWith(14));
    expect(
      await screen.findByText("APELLIDO14 NOMBRE vuelve al maestro"),
    ).toBeInTheDocument();
  });
});

describe("P-07 · tras guardar la ficha", () => {
  it("«Guardar cambios» cierra, avisa «Ficha de … actualizada» y resalta la fila", async () => {
    vi.mocked(PersonalService.actualizar).mockResolvedValue(
      ficha(3, { cargo: "Agente" }),
    );
    await abrir();

    await userEvent.click(
      screen.getByRole("button", { name: "Editar APELLIDO03 NOMBRE" }),
    );
    expect(
      screen.getByRole("heading", { name: "Editar funcionario" }),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Correo personal/), "agente03@gmail.com");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Ficha de APELLIDO03 NOMBRE actualizada"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Editar funcionario" })).toBeNull(),
    );
    const fila = screen.getByText("APELLIDO03 NOMBRE").closest("tr")!;
    expect(fila).toHaveAttribute("data-resaltado");
  });

  it("un 409 CEDULA_CON_FICHA del alta manual aterriza en el campo cédula", async () => {
    vi.mocked(PersonalService.consultarDirectorio).mockResolvedValue({
      disponible: true,
      motivo: null,
      personas: [],
    });
    vi.mocked(PersonalService.crear).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: {
            statusCode: 409,
            codigo: "CEDULA_CON_FICHA",
            mensaje: "La cédula 1712345678 ya está registrada a nombre de PEREZ JUAN.",
          },
        },
      },
    });
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo funcionario" }));
    // Sin resultados hay dos salidas manuales (el estado vacío y el pie): cualquiera sirve.
    const [manual] = await screen.findAllByRole("button", {
      name: "¿No aparece? Registro manual",
    });
    await userEvent.click(manual);
    await userEvent.type(screen.getByLabelText(/Cédula/), "1712345678");
    await userEvent.type(screen.getByLabelText(/^Apellidos/), "PEREZ");
    await userEvent.type(screen.getByLabelText(/^Nombres/), "JUAN");
    await userEvent.click(screen.getByRole("button", { name: "Nombramiento" }));
    await userEvent.selectOptions(screen.getByLabelText(/^Área/), "OPERATIVOS");
    await userEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));

    expect(
      await screen.findByText(/ya está registrada a nombre de PEREZ JUAN/),
    ).toBeInTheDocument();
    expect(PersonalService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ cedula: "1712345678", origen: "MANUAL" }),
    );
  });
});
