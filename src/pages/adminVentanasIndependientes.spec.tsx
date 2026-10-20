/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: adminVentanasIndependientes.spec.tsx
 * Responsabilidad: Verificar que cada ventana se guarda por su cuenta, sin validaciones cruzadas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06 · reescrito 2026-10-08
 *
 * LA PANTALLA SOLO PARAMETRIZA (2026-10-08). Hasta esa fecha el servidor rechazaba guardar la DAF
 * abriendo antes de que cerrara el registro de operativos (RN-56), la página pintaba una franja
 * «Error de configuración» y el modal de la DAF decía desde qué hora podía empezar. Se retiró todo:
 * la coherencia entre ventanas la aplica el sistema en ejecución. Estas pruebas fijan que no vuelva.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../hooks/useCatalogoRoles.ts", () => ({
  useCatalogoRoles: () => ({ nombreDe: (rol: string) => rol }),
}));

vi.mock("../hooks/usePermiso.ts", () => ({
  usePermiso: () => true,
}));

vi.mock("../services/administracion.service.ts", () => ({
  AdministracionService: {
    listarParametros: vi.fn(),
    listarVentanas: vi.fn(),
    actualizarParametro: vi.fn(),
    actualizarVentana: vi.fn(),
  },
}));

import AdminVentanasPage from "./AdminVentanasPage.tsx";
import ModalVentana from "../components/administracion/ModalVentana.tsx";
import type { VentanaCarga } from "../interfaces/Administracion.ts";
import { AdministracionService } from "../services/administracion.service.ts";

const ventana = (parcial: Partial<VentanaCarga> = {}): VentanaCarga =>
  ({
    rol: "DAF",
    tipo: "DIARIO",
    diaApertura: null,
    horaApertura: "11:44",
    diaCierre: null,
    horaCierre: "11:50",
    zonaHoraria: "America/Guayaquil",
    mensajeCierre: "La ventana de asignación de transporte va de {apertura} a {cierre}.",
    activo: true,
    ...parcial,
  }) as VentanaCarga;

const DMIP = ventana({
  rol: "DMIP_OPERATIVOS",
  horaApertura: null,
  horaCierre: "11:44",
  mensajeCierre: "La ventana de carga cerró a las {cierre}.",
});

/** Abre la página con las ventanas dadas y edita la del rol indicado. */
const editar = async (filas: VentanaCarga[], indice: number) => {
  vi.mocked(AdministracionService.listarVentanas).mockResolvedValue(filas);
  await act(async () => {
    render(<AdminVentanasPage />);
  });
  const botones = await screen.findAllByRole("button", { name: /^Editar/ });
  await userEvent.click(botones[indice]);
};

describe("Ventanas y parámetros · parametrización independiente (2026-10-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AdministracionService.listarParametros).mockResolvedValue([]);
  });

  it("guarda DMIP con cierre 12:55 aunque la DAF abra a las 11:44, sin avisos", async () => {
    vi.mocked(AdministracionService.actualizarVentana).mockResolvedValue({
      ventana: { ...DMIP, horaCierre: "12:55" },
    });
    await editar([DMIP, ventana()], 0);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Hora de cierre"), {
        target: { value: "12:55" },
      });
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(AdministracionService.actualizarVentana).toHaveBeenCalledWith(
      "DMIP_OPERATIVOS",
      expect.objectContaining({ horaCierre: "12:55" }),
    );
    expect(await screen.findByText("Ventana de DMIP_OPERATIVOS actualizada")).toBeInTheDocument();
    expect(screen.queryByText(/Error de configuración/)).toBeNull();
    expect(screen.queryByText(/RN-56|RN-57/)).toBeNull();
    expect(document.querySelector(".alert-warning")).toBeNull();
  });

  it("guarda la DAF con cualquier horario válido", async () => {
    vi.mocked(AdministracionService.actualizarVentana).mockResolvedValue({
      ventana: ventana({ horaApertura: "09:00", horaCierre: "10:00" }),
    });
    await editar([DMIP, ventana()], 1);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Hora de apertura"), {
        target: { value: "09:00" },
      });
      fireEvent.change(screen.getByLabelText("Hora de cierre"), {
        target: { value: "10:00" },
      });
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(AdministracionService.actualizarVentana).toHaveBeenCalledWith(
      "DAF",
      expect.objectContaining({ horaApertura: "09:00", horaCierre: "10:00" }),
    );
    expect(await screen.findByText("Ventana de DAF actualizada")).toBeInTheDocument();
  });

  it("actualiza la fila, la resalta en verde y cierra el modal", async () => {
    vi.mocked(AdministracionService.actualizarVentana).mockResolvedValue({
      ventana: ventana({ horaCierre: "18:40", mensajeResuelto: "Hasta las 18H40." }),
    });
    await editar([ventana()], 0);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Hora de cierre"), {
        target: { value: "18:40" },
      });
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const aviso = await screen.findByText("Ventana de DAF actualizada");
    expect(aviso.closest("[role=status]")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Hasta las 18H40.").closest("tr")).toHaveClass("bg-success/10");
  });
});

describe("ModalVentana · sin ayuda RN-56", () => {
  const pintar = (aviso: string | null) =>
    render(
      <ModalVentana
        ventana={ventana()}
        guardando={false}
        aviso={aviso}
        onGuardar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

  it("la DAF ya no dice desde qué hora puede empezar", () => {
    pintar(null);

    expect(screen.queryByText(/Debe empezar cuando cierra el registro/)).toBeNull();
  });

  it("un rechazo de forma del servidor se muestra tal cual (regla 7)", () => {
    const rechazo = "La hora de cierre debe ser posterior a la de apertura.";
    pintar(rechazo);

    expect(screen.getByText(rechazo)).toBeInTheDocument();
  });
});
