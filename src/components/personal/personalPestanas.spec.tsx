/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: personalPestanas.spec.tsx
 * Responsabilidad: Verificar las dos pestañas de P-07 (Maestro · Cobertura) y sus enlaces: URL,
 *                  filtros que se conservan, sin alcance de Instrucción, «Ver turnos», «Ausente …»,
 *                  el nombre → Ausencias y la matriz que se relee al registrar o quitar una ausencia.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: {
    listar: vi.fn(),
    areasQueGestiona: vi.fn(),
    listarAusenciasDelMaestro: vi.fn(),
    consultarDirectorio: vi.fn(),
    listarAusencias: vi.fn(),
    registrarAusencia: vi.fn(),
    retirarAusencia: vi.fn(),
    operativosDe: vi.fn(),
  },
}));
vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { listarZonales: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../services/cobertura.service.ts", () => ({
  CoberturaService: {
    obtenerMatriz: vi.fn(),
    editarCelda: vi.fn(),
    aplicarLote: vi.fn(),
    proponerRotacion: vi.fn(),
    publicar: vi.fn(),
    exportar: vi.fn(),
    fijarDatosInstruccion: vi.fn(),
  },
}));

import AdminPersonalPage from "../../pages/AdminPersonalPage.tsx";
import { CoberturaService } from "../../services/cobertura.service.ts";
import { PersonalService } from "../../services/personal.service.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import type { MatrizCobertura as Matriz } from "../../interfaces/Cobertura.ts";
import type { Funcionario } from "../../interfaces/Personal.ts";

const ficha = (id: number, parcial: Partial<Funcionario>): Funcionario => ({
  id,
  cedula: String(1700000000 + id),
  apellidos: "",
  nombres: "",
  telefono: null,
  correoInstitucional: null,
  correoPersonal: null,
  cargo: null,
  area: "INSTRUCCION",
  jornadaLaboralId: 2,
  direccion: "DMIT_INSTRUCTOR",
  activo: true,
  ...parcial,
});

/** RUIZ es de Instrucción (tiene turnos); MORA, de Operativos (no). */
const MAESTRO = [
  ficha(1, { apellidos: "RUIZ", nombres: "ANA" }),
  ficha(2, { apellidos: "MORA", nombres: "LUIS", area: "OPERATIVOS" }),
];

const DIAS = ["2026-10-01", "2026-10-02"];
const matriz = (mes: string): Matriz => ({
  mes,
  dias: DIAS,
  personas: [
    {
      funcionarioId: 1,
      nombre: "RUIZ ANA",
      cargo: null,
      zonalId: 1,
      zona: "Norte",
      denominacion: null,
      avisos: 0,
      celdas: [
        { fecha: DIAS[0], estado: "DIURNO", esAusencia: false },
        { fecha: DIAS[1], estado: "VACACIONES", esAusencia: true },
      ],
    },
  ],
  totales: [],
  estadoMes: "BORRADOR",
  avisosConfigurados: false,
});

/** Una ausencia próxima (en un año lejano, para no depender de la fecha de hoy). */
const AUSENCIA = {
  id: 9,
  funcionarioId: 1,
  estado: "VACACIONES" as const,
  desde: "2099-01-10",
  hasta: "2099-01-12",
  momento: "PROXIMA" as const,
};

/** Lo que dice la URL, para comprobar `?tab=`. */
const Ubicacion = () => <output data-testid="ubicacion">{useLocation().search}</output>;

const abrir = async (entrada = "/", areas: AreaPersonal[] = ["INSTRUCCION"]) => {
  vi.mocked(PersonalService.areasQueGestiona).mockResolvedValue(areas);
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <AdminPersonalPage />
      <Ubicacion />
    </MemoryRouter>,
  );
  await screen.findByText("RUIZ ANA");
};

const ubicacion = () => screen.getByTestId("ubicacion").textContent;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PersonalService.listar).mockResolvedValue(MAESTRO);
  vi.mocked(PersonalService.listarAusenciasDelMaestro).mockResolvedValue([AUSENCIA]);
  vi.mocked(PersonalService.listarAusencias).mockResolvedValue([]);
  vi.mocked(PersonalService.operativosDe).mockResolvedValue([]);
  vi.mocked(PersonalService.registrarAusencia).mockResolvedValue(undefined as never);
  vi.mocked(PersonalService.retirarAusencia).mockResolvedValue(undefined as never);
  vi.mocked(CoberturaService.obtenerMatriz).mockImplementation((mes) =>
    Promise.resolve(matriz(mes)),
  );
});

describe("P-07 · dos pestañas en un panel", () => {
  it("abre en el Maestro; la Cobertura cambia el subtítulo, el encabezado, la cabecera y la URL", async () => {
    const usuario = userEvent.setup();
    await abrir();

    const pestanas = screen.getByRole("tablist", { name: "Personal y disponibilidad" });
    expect(within(pestanas).getByRole("tab", { name: "Maestro de personal" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Es la única pantalla que muestra cédulas y teléfonos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Nuevo funcionario" })).toBeInTheDocument();
    // Un solo encabezado: sin el segundo «Cobertura por turnos».
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    await usuario.click(within(pestanas).getByRole("tab", { name: "Cobertura por turnos" }));

    expect(ubicacion()).toBe("?tab=cobertura");
    expect(
      screen.getByText("Qué días y en qué turno puede salir cada persona de Instrucción. Se guarda solo al editar."),
    ).toBeInTheDocument();
    const encabezado = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    const chips = encabezado.querySelector("[data-chips-encabezado]") as HTMLElement;
    expect(within(chips).getByText("Borrador")).toBeInTheDocument();
    expect(within(encabezado).getByRole("button", { name: "Mes anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar mes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Nuevo funcionario" })).not.toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("con ?tab=cobertura abre en la Cobertura", async () => {
    await abrir("/?tab=cobertura");
    expect(await screen.findByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cobertura por turnos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("cada pestaña conserva sus filtros al ir y volver", async () => {
    const usuario = userEvent.setup();
    await abrir();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar en el maestro" }), {
      target: { value: "RUIZ" },
    });
    await usuario.click(screen.getByRole("tab", { name: "Cobertura por turnos" }));
    const buscador = await screen.findByRole("searchbox", {
      name: "Buscar persona por apellido o nombre",
    });
    fireEvent.change(buscador, { target: { value: "ANA" } });

    await usuario.click(screen.getByRole("tab", { name: "Maestro de personal" }));
    expect(screen.getByRole("searchbox", { name: "Buscar en el maestro" })).toHaveValue("RUIZ");
    await usuario.click(screen.getByRole("tab", { name: "Cobertura por turnos" }));
    expect(
      screen.getByRole("searchbox", { name: "Buscar persona por apellido o nombre" }),
    ).toHaveValue("ANA");
  });

  it("sin alcance de Instrucción no hay pestañas ni cobertura: la cabecera dice «Maestro de personal»", async () => {
    await abrir("/?tab=cobertura", ["OPERATIVOS"]);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Maestro de personal" })).toBeInTheDocument();
    expect(CoberturaService.obtenerMatriz).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Ver turnos/ })).not.toBeInTheDocument();
  });
});

describe("P-07 · enlaces entre las pestañas", () => {
  it("«Ver turnos» (solo Instrucción) abre la Cobertura con la persona en el buscador", async () => {
    const usuario = userEvent.setup();
    await abrir();

    expect(screen.queryByRole("button", { name: "Ver turnos de MORA LUIS" })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ver turnos de RUIZ ANA" }));

    expect(ubicacion()).toBe("?tab=cobertura");
    expect(
      await screen.findByRole("searchbox", { name: "Buscar persona por apellido o nombre" }),
    ).toHaveValue("RUIZ ANA");
  });

  it("«Ausente dd/mm–dd/mm» abre la Cobertura en el mes de la ausencia, con la persona filtrada", async () => {
    const usuario = userEvent.setup();
    await abrir();

    await usuario.click(
      screen.getByRole("button", { name: "Ver la ausencia de RUIZ ANA en Cobertura por turnos" }),
    );

    await waitFor(() => expect(CoberturaService.obtenerMatriz).toHaveBeenCalledWith("2099-01"));
    expect(
      screen.getByRole("searchbox", { name: "Buscar persona por apellido o nombre" }),
    ).toHaveValue("RUIZ ANA");
  });

  it("en la Cobertura, el nombre abre las Ausencias de la persona y la celda bloqueada lo dice", async () => {
    const usuario = userEvent.setup();
    await abrir("/?tab=cobertura");
    await screen.findByRole("grid");

    expect(
      screen.getByRole("gridcell", { name: /^RUIZ ANA · \S+ 02 · / }),
    ).toHaveAttribute("title", "Vacaciones (toque el nombre para ver sus ausencias)");
    expect(screen.getByText(/se cargan en Ausencias/).textContent).toContain("(toque el nombre)");

    await usuario.click(screen.getByRole("button", { name: "RUIZ ANA" }));
    expect(await screen.findByRole("dialog", { name: "Ausencias" })).toBeInTheDocument();
    expect(PersonalService.listarAusencias).toHaveBeenCalledWith(1);
  });

  it("registrar una ausencia relee la matriz (el candado aparece)", async () => {
    const usuario = userEvent.setup();
    await abrir("/?tab=cobertura");
    await screen.findByRole("grid");
    await usuario.click(screen.getByRole("button", { name: "RUIZ ANA" }));
    const cajon = await screen.findByRole("dialog", { name: "Ausencias" });
    const lecturas = vi.mocked(CoberturaService.obtenerMatriz).mock.calls.length;

    const [desde, hasta] = within(cajon)
      .getAllByDisplayValue("")
      .filter((campo) => (campo as HTMLInputElement).type === "date");
    fireEvent.change(desde, { target: { value: "2026-10-01" } });
    fireEvent.change(hasta, { target: { value: "2026-10-02" } });
    await usuario.click(within(cajon).getByRole("button", { name: "Registrar ausencia" }));

    await waitFor(() => expect(PersonalService.registrarAusencia).toHaveBeenCalled());
    await waitFor(() =>
      expect(vi.mocked(CoberturaService.obtenerMatriz).mock.calls.length).toBeGreaterThan(lecturas),
    );
    expect(
      await screen.findByText("Ausencia registrada: esos días quedan bloqueados en la cobertura"),
    ).toBeInTheDocument();
  });

  it("quitar una ausencia relee la matriz (el candado se va)", async () => {
    const usuario = userEvent.setup();
    vi.mocked(PersonalService.listarAusencias).mockResolvedValue([
      { ...AUSENCIA, motivo: null, registradoPor: 1 },
    ]);
    await abrir("/?tab=cobertura");
    await screen.findByRole("grid");
    await usuario.click(screen.getByRole("button", { name: "RUIZ ANA" }));
    const cajon = await screen.findByRole("dialog", { name: "Ausencias" });
    const lecturas = vi.mocked(CoberturaService.obtenerMatriz).mock.calls.length;

    await usuario.click(await within(cajon).findByRole("button", { name: "Quitar" }));
    await usuario.click(within(cajon).getByRole("button", { name: "Sí, quitar" }));

    await waitFor(() => expect(PersonalService.retirarAusencia).toHaveBeenCalledWith(1, 9));
    await waitFor(() =>
      expect(vi.mocked(CoberturaService.obtenerMatriz).mock.calls.length).toBeGreaterThan(lecturas),
    );
    expect(
      await screen.findByText("Ausencia quitada: los turnos de esos días vuelven a verse"),
    ).toBeInTheDocument();
  });
});
