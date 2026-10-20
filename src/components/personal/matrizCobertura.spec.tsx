/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: matrizCobertura.spec.tsx
 * Responsabilidad: Verificar la edición de la matriz de cobertura: rotar, rango, deshacer, patrón,
 *                  rotación, zona y el 404 sin alcance.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * EL SERVIDOR SE DOBLA CON UN ALMACÉN EN MEMORIA: las escrituras (celda y lote) lo modifican y la
 * relectura silenciosa que hace la matriz tras escribir devuelve lo mismo que se ve. Así se prueba
 * la edición optimista sin que la reconciliación con el GET la deshaga a destiempo.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MatrizCobertura from "./MatrizCobertura.tsx";
import AdminPersonalPage from "../../pages/AdminPersonalPage.tsx";
import { CoberturaService } from "../../services/cobertura.service.ts";
import { PersonalService } from "../../services/personal.service.ts";
import type {
  CambioCelda,
  MatrizCobertura as Matriz,
  PersonaCobertura,
} from "../../interfaces/Cobertura.ts";

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

vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: {
    listarZonales: vi.fn().mockResolvedValue([
      { id: 1, codigo: "N", nombre: "Norte" },
      { id: 2, codigo: "S", nombre: "Sur" },
    ]),
  },
}));

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: {
    listar: vi.fn(),
    areasQueGestiona: vi.fn(),
    consultarAusencias: vi.fn().mockResolvedValue([]),
    consultarDirectorio: vi.fn(),
  },
}));

const DIAS = Array.from(
  { length: 7 },
  (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`,
);

/** El «servidor»: dos personas de Norte; YUNDA tiene D el 02 y vacaciones el 04. */
let almacen: PersonaCobertura[];

const nuevoAlmacen = (): PersonaCobertura[] => [
  {
    funcionarioId: 1,
    nombre: "YUNDA JESSICA",
    cargo: "Instructora",
    zonalId: 1,
    zona: "Norte",
    denominacion: "INSTRUCTOR_METROPOLITANO",
    avisos: 0,
    celdas: DIAS.map((fecha, i) => ({
      fecha,
      estado: i === 1 ? "DIURNO" : i === 3 ? "VACACIONES" : null,
      esAusencia: i === 3,
    })),
  },
  {
    funcionarioId: 2,
    nombre: "BAUTISTA LUIS",
    cargo: null,
    zonalId: 1,
    zona: "Norte",
    denominacion: "LIDER_ZONAL",
    avisos: 0,
    celdas: DIAS.map((fecha, i) => ({
      fecha,
      estado: i === 0 ? "NOCTURNO" : null,
      esAusencia: false,
    })),
  },
];

const escribir = (cambio: CambioCelda): boolean => {
  const celda = almacen
    .find((p) => p.funcionarioId === cambio.funcionarioId)
    ?.celdas.find((c) => c.fecha === cambio.fecha);
  if (!celda || celda.esAusencia) return false;
  celda.estado = cambio.estado;
  return true;
};

const matrizDelAlmacen = (): Matriz => ({
  mes: "2026-10",
  dias: DIAS,
  personas: structuredClone(almacen),
  totales: [],
  estadoMes: "BORRADOR",
  avisosConfigurados: false,
});

/** La celda de una persona en un día, por su nombre accesible. */
const celda = (nombre: string, dia: string): HTMLElement =>
  screen.getByRole("gridcell", {
    name: new RegExp(`^${nombre} · \\S+ ${dia} · `),
  });

const pintar = async () => {
  render(<MatrizCobertura />);
  await screen.findByRole("grid");
};

beforeEach(() => {
  vi.clearAllMocks();
  almacen = nuevoAlmacen();
  vi.mocked(CoberturaService.obtenerMatriz).mockImplementation(() =>
    Promise.resolve(matrizDelAlmacen()),
  );
  vi.mocked(CoberturaService.editarCelda).mockImplementation(
    (funcionarioId, fecha, estado) => {
      escribir({ funcionarioId, fecha, estado });
      return Promise.resolve();
    },
  );
  vi.mocked(CoberturaService.aplicarLote).mockImplementation((celdas) => {
    const omitidas = celdas
      .filter((c) => !escribir(c))
      .map((c) => ({ ...c, motivo: "ausencia registrada" }));
    return Promise.resolve({
      aplicadas: celdas.length - omitidas.length,
      omitidas,
    });
  });
  vi.mocked(CoberturaService.fijarDatosInstruccion).mockResolvedValue();
});

describe("MatrizCobertura · Instrucción", () => {
  it("la rotación por clic llega a vacía: D → N → — → vacía", async () => {
    const usuario = userEvent.setup();
    await pintar();

    for (const esperado of ["Diurno", "Nocturno", "Descanso", "sin turno"]) {
      await usuario.click(celda("YUNDA JESSICA", "01"));
      expect(celda("YUNDA JESSICA", "01")).toHaveAttribute(
        "aria-label",
        expect.stringMatching(new RegExp(`· ${esperado}$`)),
      );
    }

    await waitFor(() =>
      expect(CoberturaService.editarCelda).toHaveBeenCalledTimes(4),
    );
    expect(
      vi.mocked(CoberturaService.editarCelda).mock.calls.map((c) => c[2]),
    ).toEqual(["DIURNO", "NOCTURNO", "DESCANSO", null]);
  });

  it("los totales del pie cambian al editar", async () => {
    const usuario = userEvent.setup();
    await pintar();
    const totalDiurno = () =>
      document.querySelector('[data-total="diurno-2026-10-01"]');

    expect(totalDiurno()).toHaveTextContent("0");
    await usuario.click(celda("YUNDA JESSICA", "01"));
    expect(totalDiurno()).toHaveTextContent("1");
  });

  it("selección de rango + tecla D asigna diurno con UN lote", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(screen.getByRole("button", { name: "Seleccionar rango" }));
    await usuario.click(celda("YUNDA JESSICA", "05"));
    await usuario.keyboard("{Shift>}");
    await usuario.click(celda("BAUTISTA LUIS", "06"));
    await usuario.keyboard("{/Shift}");
    expect(screen.getByText("4 celdas:")).toBeInTheDocument();

    await usuario.keyboard("d");

    await waitFor(() =>
      expect(CoberturaService.aplicarLote).toHaveBeenCalledTimes(1),
    );
    const lote = vi.mocked(CoberturaService.aplicarLote).mock.calls[0][0];
    expect(lote).toHaveLength(4);
    expect(lote).toEqual(
      expect.arrayContaining([
        { funcionarioId: 1, fecha: "2026-10-05", estado: "DIURNO" },
        { funcionarioId: 1, fecha: "2026-10-06", estado: "DIURNO" },
        { funcionarioId: 2, fecha: "2026-10-05", estado: "DIURNO" },
        { funcionarioId: 2, fecha: "2026-10-06", estado: "DIURNO" },
      ]),
    );
    expect(CoberturaService.editarCelda).not.toHaveBeenCalled();
  });

  it("Ctrl+Z deshace el último cambio", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(celda("YUNDA JESSICA", "01"));
    await waitFor(() =>
      expect(CoberturaService.editarCelda).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByRole("button", { name: "Deshacer (1)" })).toBeEnabled();

    await usuario.keyboard("{Control>}z{/Control}");

    await waitFor(() =>
      expect(CoberturaService.aplicarLote).toHaveBeenCalledWith([
        { funcionarioId: 1, fecha: "2026-10-01", estado: null },
      ]),
    );
    await waitFor(() =>
      expect(celda("YUNDA JESSICA", "01")).toHaveAttribute(
        "aria-label",
        expect.stringMatching(/· sin turno$/),
      ),
    );
  });

  it("las ausencias no son editables", async () => {
    const usuario = userEvent.setup();
    await pintar();

    const ausencia = celda("YUNDA JESSICA", "04");
    expect(ausencia).toHaveAttribute("aria-readonly", "true");
    expect(ausencia).toHaveAttribute(
      "aria-label",
      expect.stringContaining("(de Ausencias)"),
    );

    await usuario.click(ausencia);
    expect(CoberturaService.editarCelda).not.toHaveBeenCalled();
    expect(CoberturaService.aplicarLote).not.toHaveBeenCalled();
  });

  it("«Aplicar patrón» con «Solo celdas vacías» no toca lo planificado ni las ausencias", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(screen.getByRole("button", { name: "Aplicar patrón" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByLabelText("Solo celdas vacías")).toBeChecked();
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Aplicar patrón" }),
    );

    await waitFor(() =>
      expect(CoberturaService.aplicarLote).toHaveBeenCalledTimes(1),
    );
    const lote = vi.mocked(CoberturaService.aplicarLote).mock.calls[0][0];
    const claves = lote.map((c) => `${c.funcionarioId}|${c.fecha}`);
    // Lo planificado (D de YUNDA el 02, N de BAUTISTA el 01) y la ausencia (04) quedan fuera.
    expect(claves).not.toContain("1|2026-10-02");
    expect(claves).not.toContain("2|2026-10-01");
    expect(claves).not.toContain("1|2026-10-04");
    expect(lote).toContainEqual({
      funcionarioId: 1,
      fecha: "2026-10-01",
      estado: "DIURNO",
    });
  });

  it("«Continuar rotación» solo aplica sobre celdas vacías (no toca lo planificado)", async () => {
    const usuario = userEvent.setup();
    vi.mocked(CoberturaService.proponerRotacion).mockResolvedValue({
      propuestas: [
        // La primera cae sobre lo ya planificado: el cliente la descarta.
        { funcionarioId: 1, fecha: "2026-10-02", estado: "NOCTURNO" },
        { funcionarioId: 1, fecha: "2026-10-01", estado: "DIURNO" },
      ],
      personas: 1,
      omitidas: 0,
    });
    await pintar();

    await usuario.click(
      screen.getByRole("button", { name: "Continuar rotación" }),
    );
    const dialogo = await screen.findByRole("dialog");
    expect(
      await within(dialogo).findByText(/Se llenarán 1 celdas/),
    ).toBeInTheDocument();
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Completar 1 celdas" }),
    );

    await waitFor(() =>
      expect(CoberturaService.aplicarLote).toHaveBeenCalledWith([
        { funcionarioId: 1, fecha: "2026-10-01", estado: "DIURNO" },
      ]),
    );
  });

  it("«Cambiar zona» pide confirmación antes de escribir", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(
      screen.getByRole("button", { name: "Cambiar zona de YUNDA JESSICA" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await usuario.selectOptions(
      within(dialogo).getByRole("combobox", { name: "Zona" }),
      "2",
    );
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Cambiar zona" }),
    );

    // Todavía no se escribió: primero la confirmación.
    expect(CoberturaService.fijarDatosInstruccion).not.toHaveBeenCalled();
    expect(await screen.findByText("¿Cambiar la zona?")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Sí, cambiar" }));
    await waitFor(() =>
      expect(CoberturaService.fijarDatosInstruccion).toHaveBeenCalledWith(1, {
        zonalId: 2,
        denominacion: "INSTRUCTOR_METROPOLITANO",
      }),
    );
  });
});

describe("Personal y disponibilidad · cobertura sin alcance", () => {
  it("un 404 de la matriz no rompe la página: el panel simplemente no se muestra", async () => {
    vi.mocked(PersonalService.listar).mockResolvedValue([]);
    vi.mocked(PersonalService.areasQueGestiona).mockResolvedValue([
      "INSTRUCCION",
    ]);
    vi.mocked(CoberturaService.obtenerMatriz).mockRejectedValue({
      status: 404,
    });

    render(<AdminPersonalPage />);

    await waitFor(() =>
      expect(CoberturaService.obtenerMatriz).toHaveBeenCalled(),
    );
    // La página sigue en pie (el alta está) y el panel de cobertura no aparece.
    expect(
      await screen.findByRole("button", { name: "+ Nuevo funcionario" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText("Cobertura por turnos · Personal de Instrucción"),
      ).toBeNull(),
    );
  });
});
