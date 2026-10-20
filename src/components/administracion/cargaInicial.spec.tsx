/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Carga inicial de la DAF
 * Archivo: cargaInicial.spec.tsx
 * Responsabilidad: Verificar la carga inicial: vista previa con filas válidas e inválidas, el
 *                  formato esperado, que se apliquen SOLO las válidas y el resultado en palabras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CargaInicialPage from "../../pages/CargaInicialPage.tsx";
import type { PreviaCargaInicial } from "../../interfaces/CargaInicial.ts";

vi.mock("../../services/cargaInicial.service.ts", () => ({
  CargaInicialService: { previsualizar: vi.fn(), aplicar: vi.fn() },
}));

import { CargaInicialService } from "../../services/cargaInicial.service.ts";

const PREVIA: PreviaCargaInicial = {
  tipo: "conductores",
  formatoEsperado: ["cedula", "nombre", "sector"],
  filas: [
    { fila: 2, valido: true, errores: [], datos: { cedula: "1712345678", nombre: "PÉREZ JUAN", sector: "NORTE" } },
    { fila: 3, valido: false, errores: ["La cédula 123 no tiene 10 dígitos."], datos: { cedula: "123", nombre: "LOOR ANA", sector: "" } },
  ],
  resumen: { validas: 1, invalidas: 1 },
};

const subir = async (usuario: ReturnType<typeof userEvent.setup>) => {
  await usuario.upload(
    screen.getByLabelText("Archivo (.xlsx)"),
    new File(["x"], "conductores.xlsx"),
  );
  await usuario.click(screen.getByRole("button", { name: "Previsualizar" }));
};

describe("Carga inicial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CargaInicialService.previsualizar).mockResolvedValue(PREVIA);
    vi.mocked(CargaInicialService.aplicar).mockResolvedValue({
      creados: 1,
      actualizados: 0,
      omitidos: [],
    });
  });

  it("dice que se usa una sola vez y no previsualiza sin archivo", () => {
    render(<CargaInicialPage />);

    expect(
      screen.getByText("Se usa una sola vez para cargar los datos iniciales de la DAF."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previsualizar" })).toHaveAttribute("aria-disabled", "true");
  });

  it("previsualiza: formato esperado, filas válidas e inválidas con su error tal cual", async () => {
    const usuario = userEvent.setup();
    render(<CargaInicialPage />);
    await subir(usuario);

    expect(CargaInicialService.previsualizar).toHaveBeenCalledWith(
      "conductores",
      expect.any(File),
      undefined,
    );
    expect(await screen.findByText("Columnas: cedula, nombre, sector")).toBeInTheDocument();
    expect(screen.getByText("1 fila válida · 1 fila con errores")).toBeInTheDocument();
    expect(screen.getByText("Válida")).toBeInTheDocument();
    expect(screen.getByText("Con errores")).toBeInTheDocument();
    expect(screen.getByText("La cédula 123 no tiene 10 dígitos.")).toBeInTheDocument();
    expect(CargaInicialService.aplicar).not.toHaveBeenCalled();
  });

  it("«Aplicar 1 fila válida» envía SOLO las válidas y muestra creados/actualizados/omitidos", async () => {
    const usuario = userEvent.setup();
    render(<CargaInicialPage />);
    await subir(usuario);

    await usuario.click(await screen.findByRole("button", { name: "Aplicar 1 fila válida" }));
    await waitFor(() => expect(CargaInicialService.aplicar).toHaveBeenCalledTimes(1));
    const [tipo, filas, mes] = vi.mocked(CargaInicialService.aplicar).mock.calls[0];
    expect(tipo).toBe("conductores");
    expect(filas.map((fila) => fila.fila)).toEqual([2]);
    expect(mes).toBeUndefined();

    // Un hito: modal de éxito con los conteos.
    const exito = await screen.findByRole("alertdialog", { name: "Carga inicial terminada" });
    expect(exito).toHaveTextContent("1 creados · 0 actualizados · 0 omitidos");
  });

  it("los turnos del mes piden el mes y lo envían", async () => {
    const usuario = userEvent.setup();
    vi.mocked(CargaInicialService.previsualizar).mockResolvedValue({ ...PREVIA, tipo: "turnos" });
    render(<CargaInicialPage />);

    await usuario.selectOptions(screen.getByRole("combobox", { name: "Qué se carga" }), "turnos");
    const mes = screen.getByLabelText("Mes");
    await usuario.clear(mes);
    await usuario.type(mes, "2026-11");
    await subir(usuario);

    expect(CargaInicialService.previsualizar).toHaveBeenCalledWith(
      "turnos",
      expect.any(File),
      "2026-11",
    );
    const tabla = await screen.findByRole("table");
    expect(within(tabla).getByText("PÉREZ JUAN")).toBeInTheDocument();
  });
});
