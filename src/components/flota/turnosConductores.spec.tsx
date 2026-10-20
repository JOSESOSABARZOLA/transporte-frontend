/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Turnos de conductores
 * Archivo: turnosConductores.spec.tsx
 * Responsabilidad: Verificar la matriz de turnos de conductores (la matriz común con su configuración):
 *                  rotación de cinco turnos, rango + tecla, deshacer, ausencias y publicar con vacías.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Como en `matrizCobertura.spec`, el servidor se dobla con un almacén en memoria: las escrituras lo
 * modifican y la relectura silenciosa devuelve lo mismo que se ve.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TurnosConductoresPage from "../../pages/TurnosConductoresPage.tsx";
import { TurnosConductoresService } from "../../services/turnosConductores.service.ts";
import { aMatrizComun } from "../../services/turnosConductores.service.ts";
import { CatalogoCuadroService } from "../../services/catalogoCuadro.service.ts";
import type {
  CambioCelda,
  MatrizCobertura as Matriz,
  PersonaCobertura,
} from "../../interfaces/Cobertura.ts";

vi.mock("../../services/turnosConductores.service.ts", async (original) => ({
  ...(await original<typeof import("../../services/turnosConductores.service.ts")>()),
  TurnosConductoresService: {
    obtenerMatriz: vi.fn(),
    editarCelda: vi.fn(),
    aplicarLote: vi.fn(),
    proponerRotacion: vi.fn(),
    proponerMes: vi.fn(),
    publicar: vi.fn(),
    exportar: vi.fn(),
  },
}));

vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { listarZonales: vi.fn().mockResolvedValue([]) },
}));

const DIAS = Array.from(
  { length: 7 },
  (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`,
);

/** Dos conductores del Norte; PÉREZ tiene vacaciones el 03. */
let almacen: PersonaCobertura[];

const nuevoAlmacen = (): PersonaCobertura[] =>
  aMatrizComun({
    mes: "2026-11",
    dias: DIAS,
    conductores: [
      {
        conductorId: 10,
        nombre: "PÉREZ JUAN",
        sector: "NORTE",
        tipoContrato: "NOMBRAMIENTO",
        celdas: DIAS.map((fecha, i) => ({
          fecha,
          estado: i === 2 ? "VACACIONES" : null,
          esAusencia: i === 2,
        })),
      },
      {
        conductorId: 11,
        nombre: "LOOR ANA",
        sector: "NORTE",
        tipoContrato: "OCASIONAL",
        celdas: DIAS.map((fecha) => ({ fecha, estado: null, esAusencia: false })),
      },
    ],
    totales: [],
    estadoMes: "BORRADOR",
  }).personas;

const escribir = (cambio: CambioCelda): boolean => {
  const celda = almacen
    .find((p) => p.funcionarioId === cambio.funcionarioId)
    ?.celdas.find((c) => c.fecha === cambio.fecha);
  if (!celda || celda.esAusencia) return false;
  celda.estado = cambio.estado;
  return true;
};

const matrizDelAlmacen = (): Matriz => ({
  mes: "2026-11",
  dias: DIAS,
  personas: structuredClone(almacen),
  totales: [],
  estadoMes: "BORRADOR",
  avisosConfigurados: false,
});

const celda = (nombre: string, dia: string): HTMLElement =>
  screen.getByRole("gridcell", {
    name: new RegExp(`^${nombre} · \\S+ ${dia} · `),
  });

const pintar = async () => {
  // La página lee la fecha de trabajo de la DAF de la URL (2026-10-06): necesita un enrutador.
  render(
    <MemoryRouter initialEntries={["/?fecha=2026-11-05"]}>
      <TurnosConductoresPage />
    </MemoryRouter>,
  );
  await screen.findByRole("grid");
};

beforeEach(() => {
  vi.clearAllMocks();
  almacen = nuevoAlmacen();
  vi.mocked(TurnosConductoresService.obtenerMatriz).mockImplementation(() =>
    Promise.resolve(matrizDelAlmacen()),
  );
  vi.mocked(TurnosConductoresService.editarCelda).mockImplementation(
    (funcionarioId, fecha, estado) => {
      escribir({ funcionarioId, fecha, estado });
      return Promise.resolve();
    },
  );
  vi.mocked(TurnosConductoresService.aplicarLote).mockImplementation(
    (celdas) => {
      const omitidas = celdas
        .filter((c) => !escribir(c))
        .map((c) => ({ ...c, motivo: "ausencia registrada" }));
      return Promise.resolve({
        aplicadas: celdas.length - omitidas.length,
        omitidas,
      });
    },
  );
  vi.mocked(TurnosConductoresService.publicar).mockResolvedValue({
    estadoMes: "PUBLICADO",
    celdasVacias: 0,
  });
});

describe("Turnos de conductores", () => {
  it("lleva su título, la nota de la DAF y agrupa por sector (sin «Cambiar zona»)", async () => {
    await pintar();

    expect(
      screen.getByRole("heading", { level: 1, name: "Turnos de conductores" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La carga el jefe de la DAF antes de fin de mes."),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Norte/).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Cambiar zona/ }),
    ).not.toBeInTheDocument();
    // Sin «Cambiar grupo», la matriz ni siquiera pide el catálogo de zonales.
    expect(CatalogoCuadroService.listarZonales).not.toHaveBeenCalled();
  });

  it("la rotación por clic recorre los cinco turnos y llega a vacía", async () => {
    const usuario = userEvent.setup();
    await pintar();

    for (const esperado of [
      "Día",
      "Noche",
      "ECU noche",
      "Libre",
      "Administrativo",
      "sin turno",
    ]) {
      await usuario.click(celda("LOOR ANA", "01"));
      expect(celda("LOOR ANA", "01")).toHaveAttribute(
        "aria-label",
        expect.stringMatching(new RegExp(`· ${esperado}$`)),
      );
    }

    await waitFor(() =>
      expect(TurnosConductoresService.editarCelda).toHaveBeenCalledTimes(6),
    );
    expect(
      vi.mocked(TurnosConductoresService.editarCelda).mock.calls.map((c) => c[2]),
    ).toEqual(["DIA", "NOCHE", "ECU_NOCHE", "LIBRE", "ADMINISTRATIVO", null]);
  });

  it("selección de rango + tecla E asigna ECU noche con UN lote", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(screen.getByRole("button", { name: "Seleccionar rango" }));
    await usuario.click(celda("PÉREZ JUAN", "05"));
    await usuario.keyboard("{Shift>}");
    await usuario.click(celda("LOOR ANA", "06"));
    await usuario.keyboard("{/Shift}");

    await usuario.keyboard("e");

    await waitFor(() =>
      expect(TurnosConductoresService.aplicarLote).toHaveBeenCalledTimes(1),
    );
    const lote = vi.mocked(TurnosConductoresService.aplicarLote).mock.calls[0][0];
    expect(lote).toHaveLength(4);
    expect(lote).toEqual(
      expect.arrayContaining([
        { funcionarioId: 10, fecha: "2026-11-05", estado: "ECU_NOCHE" },
        { funcionarioId: 11, fecha: "2026-11-06", estado: "ECU_NOCHE" },
      ]),
    );
    expect(TurnosConductoresService.editarCelda).not.toHaveBeenCalled();
  });

  it("Ctrl+Z deshace el último cambio", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(celda("LOOR ANA", "02"));
    await waitFor(() =>
      expect(TurnosConductoresService.editarCelda).toHaveBeenCalledTimes(1),
    );

    await usuario.keyboard("{Control>}z{/Control}");

    await waitFor(() =>
      expect(TurnosConductoresService.aplicarLote).toHaveBeenCalledWith([
        { funcionarioId: 11, fecha: "2026-11-02", estado: null },
      ]),
    );
  });

  it("las ausencias no son editables", async () => {
    const usuario = userEvent.setup();
    await pintar();

    const ausencia = celda("PÉREZ JUAN", "03");
    expect(ausencia).toHaveAttribute("aria-readonly", "true");

    await usuario.click(ausencia);
    expect(TurnosConductoresService.editarCelda).not.toHaveBeenCalled();
    expect(TurnosConductoresService.aplicarLote).not.toHaveBeenCalled();
  });

  it("publicar con celdas vacías pide confirmación antes de escribir", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(screen.getByRole("button", { name: "Publicar mes" }));

    const dialogo = await screen.findByRole("alertdialog");
    expect(
      within(dialogo).getByText(/esos días el conductor queda sin turno cargado/),
    ).toBeInTheDocument();
    expect(TurnosConductoresService.publicar).not.toHaveBeenCalled();

    await usuario.click(
      within(dialogo).getByRole("button", { name: "Publicar igual" }),
    );
    await waitFor(() =>
      expect(TurnosConductoresService.publicar).toHaveBeenCalledTimes(1),
    );
    // Publicar el mes es un HITO (M7): modal de éxito con [Aceptar].
    const exito = await screen.findByRole("alertdialog", { name: /^Mes publicado/ });
    await usuario.click(within(exito).getByRole("button", { name: "Aceptar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
  /**
   * «COPIAR MES ANTERIOR» (2026-10-06): no hay importación de Excel; con el mes vacío se ofrece
   * partir del anterior. Día N → día N, sin copiar ausencias (ni las de allá ni sobre las de acá),
   * y con vista previa del número de celdas ANTES de escribir.
   */
  it("con el mes vacío ofrece «Copiar mes anterior» y escribe solo lo que la vista previa anunció", async () => {
    const usuario = userEvent.setup();
    const OCTUBRE = Array.from({ length: 7 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    const anterior: Matriz = {
      mes: "2026-10",
      dias: OCTUBRE,
      personas: [
        {
          ...almacen[0],
          celdas: OCTUBRE.map((fecha, i) => ({
            fecha,
            estado: i === 1 ? "VACACIONES" : "DIA",
            esAusencia: i === 1,
          })),
        },
        {
          ...almacen[1],
          celdas: OCTUBRE.map((fecha, i) => ({ fecha, estado: i === 0 ? "NOCHE" : null, esAusencia: false })),
        },
      ],
      totales: [],
      estadoMes: "PUBLICADO",
      avisosConfigurados: false,
    };
    vi.mocked(TurnosConductoresService.obtenerMatriz).mockImplementation((mes) =>
      Promise.resolve(mes === "2026-10" ? anterior : matrizDelAlmacen()),
    );
    await pintar();

    expect(screen.getByText(/Aún no hay turnos cargados para/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar patrón" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar rotación" })).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Copiar mes anterior" }));
    const dialogo = await screen.findByRole("alertdialog");
    // PÉREZ: 7 días − el 02 (ausencia de octubre) − el 03 (su ausencia de noviembre) = 5; LOOR: 1.
    expect(within(dialogo).getByText(/Se escribirán 6 celdas/)).toBeInTheDocument();
    expect(TurnosConductoresService.aplicarLote).not.toHaveBeenCalled();

    await usuario.click(within(dialogo).getByRole("button", { name: "Copiar" }));
    await waitFor(() => expect(TurnosConductoresService.aplicarLote).toHaveBeenCalledTimes(1));
    const lote = vi.mocked(TurnosConductoresService.aplicarLote).mock.calls[0][0];
    expect(lote).toHaveLength(6);
    expect(lote).toEqual(
      expect.arrayContaining([
        { funcionarioId: almacen[0].funcionarioId, fecha: "2026-11-01", estado: "DIA" },
        { funcionarioId: almacen[1].funcionarioId, fecha: "2026-11-01", estado: "NOCHE" },
      ]),
    );
    expect(lote.some((c) => c.fecha === "2026-11-02" && c.funcionarioId === almacen[0].funcionarioId)).toBe(false);
  });

  /** VERSIÓN CONSOLIDADA (2026-10-06): la importación salió a «Carga inicial». */
  it("la pantalla ya no ofrece «Importar Excel», ni con el mes vacío", async () => {
    await pintar();

    expect(screen.getByText(/Aún no hay turnos cargados para/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar Excel/ })).not.toBeInTheDocument();
  });

  it("«Generar propuesta del mes»: resumen, parámetros sin configurar, rehacer todo y aplicar con el lote (entra en Deshacer)", async () => {
    const usuario = userEvent.setup();
    vi.mocked(TurnosConductoresService.proponerMes).mockImplementation(
      (_mes, rehacerTodo) =>
        Promise.resolve({
          propuestas: [
            { funcionarioId: 11, fecha: "2026-11-01", estado: "DIA" },
            { funcionarioId: 11, fecha: "2026-11-02", estado: "NOCHE" },
            // Una ausencia nunca se escribe, aunque el servidor la propusiera.
            { funcionarioId: 10, fecha: "2026-11-03", estado: "DIA" },
          ],
          resumen: {
            celdasALlenar: rehacerTodo ? 12 : 2,
            diasBajoMinimo: [{ fecha: "2026-11-04", turno: "NOCHE", hay: 1, minimo: 2 }],
            avisos: [{ funcionarioId: 11, fecha: "2026-11-02", mensaje: "Pasa de noche a día sin descanso" }],
            parametrosSinConfigurar: ["DAF_MIN_CONDUCTORES_DIA"],
          },
        }),
    );
    await pintar();

    await usuario.click(screen.getByRole("button", { name: "Generar propuesta del mes" }));
    const dialogo = await screen.findByRole("dialog", { name: "Generar propuesta del mes" });
    expect(await within(dialogo).findByText("Celdas a llenar: 2")).toBeInTheDocument();
    expect(within(dialogo).getByText("Días bajo el mínimo: 1")).toBeInTheDocument();
    expect(within(dialogo).getByText("04 · Noche: 1 de 2")).toBeInTheDocument();
    expect(within(dialogo).getByText(/LOOR ANA · 02: Pasa de noche a día sin descanso/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/Parámetros sin configurar: DAF_MIN_CONDUCTORES_DIA/)).toBeInTheDocument();
    expect(within(dialogo).getByRole("link", { name: "Ir a Ventanas y parámetros" })).toHaveAttribute(
      "href",
      "/home/administracion/ventanas",
    );
    expect(TurnosConductoresService.proponerMes).toHaveBeenLastCalledWith("2026-11", false);

    await usuario.click(within(dialogo).getByRole("checkbox", { name: "Rehacer todo (no toca ausencias)" }));
    expect(await within(dialogo).findByText("Celdas a llenar: 12")).toBeInTheDocument();
    expect(TurnosConductoresService.proponerMes).toHaveBeenLastCalledWith("2026-11", true);
    expect(TurnosConductoresService.aplicarLote).not.toHaveBeenCalled();

    await usuario.click(within(dialogo).getByRole("button", { name: "Aplicar" }));
    await waitFor(() => expect(TurnosConductoresService.aplicarLote).toHaveBeenCalledTimes(1));
    expect(vi.mocked(TurnosConductoresService.aplicarLote).mock.calls[0][0]).toEqual([
      { funcionarioId: 11, fecha: "2026-11-01", estado: "DIA" },
      { funcionarioId: 11, fecha: "2026-11-02", estado: "NOCHE" },
    ]);
    expect(await screen.findByRole("button", { name: "Deshacer (1)" })).not.toHaveAttribute("aria-disabled");
  });

  it("«Exportar» Excel / PDF se apaga con el mes sin publicar y dice por qué", async () => {
    await pintar();

    expect(screen.getByRole("button", { name: "Exportar Excel" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Exportar PDF" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Publique el mes para exportar el reporte")).toBeInTheDocument();
  });

  it("con el mes publicado exporta el PDF", async () => {
    const usuario = userEvent.setup();
    vi.mocked(TurnosConductoresService.obtenerMatriz).mockImplementation(() =>
      Promise.resolve({ ...matrizDelAlmacen(), estadoMes: "PUBLICADO" }),
    );
    vi.mocked(TurnosConductoresService.exportar).mockResolvedValue(new Blob(["x"]));
    const crear = vi.fn(() => "blob:x");
    const revocar = vi.fn();
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar });
    await pintar();

    expect(screen.queryByText("Publique el mes para exportar el reporte")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Exportar PDF" }));
    await waitFor(() =>
      expect(TurnosConductoresService.exportar).toHaveBeenCalledWith("2026-11", "pdf"),
    );
  });

  it("subtotal compacto del sector («D1 · N1», «—» sin nadie) y el día bajo el mínimo resaltado con su texto", async () => {
    almacen[1].celdas[0].estado = "DIA";
    almacen[0].celdas[0].estado = "NOCHE";
    vi.mocked(TurnosConductoresService.obtenerMatriz).mockImplementation(() =>
      Promise.resolve({
        ...matrizDelAlmacen(),
        bajoMinimo: { "2026-11-02": { dia: true, noche: false } },
      }),
    );
    await pintar();

    const subtotal = screen.getByTitle(/^Subtotal Norte · 01:/);
    expect(subtotal).toHaveTextContent("D1 · N1");
    expect(screen.getByTitle(/^Subtotal Norte · 02:/)).toHaveTextContent("—");

    const dia02 = document.querySelector('[data-total="dia-2026-11-02"]');
    expect(dia02).toHaveAttribute("title", "bajo el mínimo");
    expect(document.querySelector('[data-total="noche-2026-11-02"]')).not.toHaveAttribute("title");
    expect(document.querySelector('[data-total="dia-2026-11-03"]')).not.toHaveAttribute("title");
  });
});
