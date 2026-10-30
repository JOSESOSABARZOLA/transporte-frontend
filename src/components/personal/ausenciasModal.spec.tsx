/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: ausenciasModal.spec.tsx
 * Responsabilidad: Verificar el modal de ausencias rediseñado (2026-10-08).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * Se prueban DECISIONES: el estado del pie y los errores en línea (días, rango, solape, faltan
 * fechas), el aviso de los operativos que la ausencia NO retira, que no se registre un rango
 * inválido y que una ausencia pasada no se quite («Historial»).
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { operativosDe: vi.fn() },
}));

import PanelAusencias from "./PanelAusencias.tsx";
import { PersonalService } from "../../services/personal.service.ts";
import type { Disponibilidad, Funcionario } from "../../interfaces/Personal.ts";

const HOY = "2026-10-08";

const FUNCIONARIO: Funcionario = {
  id: 7,
  cedula: "0602526907",
  apellidos: "AGUAS MORA",
  nombres: "FEDERICO SANTIAGO",
  telefono: null,
  correoInstitucional: null,
  correoPersonal: null,
  cargo: null,
  area: "TECNICO",
  jornadaLaboralId: 2,
  direccion: "DMIP_INSPECCIONES",
  activo: true,
};

const registrada = (parcial: Partial<Disponibilidad> = {}): Disponibilidad => ({
  id: 1,
  estado: "VACACIONES",
  desde: "2026-10-12",
  hasta: "2026-10-23",
  motivo: null,
  registradoPor: 1,
  momento: "PROXIMA",
  ...parcial,
});

const montar = (
  ausencias: Disponibilidad[] = [],
  onRegistrar = vi.fn().mockResolvedValue(true),
  onRetirar = vi.fn(),
) => {
  render(
    <PanelAusencias
      funcionario={FUNCIONARIO}
      ausencias={ausencias}
      cargando={false}
      guardando={false}
      hoy={HOY}
      aviso={null}
      onRegistrar={onRegistrar}
      onRetirar={onRetirar}
      onCerrar={vi.fn()}
    />,
  );
  return { onRegistrar, onRetirar };
};

/** Los controles de fecha nativos se llenan con su valor `AAAA-MM-DD`. */
const fechas = (desde: string, hasta: string) => {
  const [campoDesde, campoHasta] = screen
    .getAllByDisplayValue("")
    .filter((el) => (el as HTMLInputElement).type === "date");
  fireEvent.change(campoDesde, { target: { value: desde } });
  fireEvent.change(campoHasta, { target: { value: hasta } });
};

beforeEach(() => {
  vi.mocked(PersonalService.operativosDe).mockReset();
  vi.mocked(PersonalService.operativosDe).mockResolvedValue([]);
});

describe("Ausencias · cabecera y vacío", () => {
  it("dice de quién son (nombre · cédula) y el vacío va en una caja", () => {
    montar();
    expect(screen.getByRole("heading", { name: "Ausencias" })).toBeInTheDocument();
    expect(screen.getByText(/AGUAS MORA FEDERICO SANTIAGO/)).toBeInTheDocument();
    expect(screen.getByText("0602526907")).toBeInTheDocument();
    expect(screen.getByText("No tiene ausencias registradas.")).toBeInTheDocument();
    expect(screen.getByText("Registradas (0)")).toBeInTheDocument();
  });
});

describe("Ausencias · el pie y los errores en línea", () => {
  it("«Registrar ausencia» va en el pie, junto a «Cerrar», y no dentro del formulario", () => {
    montar();
    // El «Cerrar» del pie (el aspa de la cabecera se llama igual, sin texto visible).
    const cerrar = screen
      .getAllByRole("button", { name: "Cerrar" })
      .find((boton) => boton.textContent === "Cerrar") as HTMLElement;
    const pie = cerrar.parentElement as HTMLElement;
    expect(within(pie).getByRole("button", { name: "Registrar ausencia" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Registrar ausencia" })).toHaveLength(1);
  });

  it("con un rango válido el pie dice «Se bloquearán N días (dd/mm al dd/mm)», y registra", async () => {
    const { onRegistrar } = montar();
    fechas("2026-10-01", "2026-10-05");

    expect(screen.getByText("Se bloquearán 5 días (01/10 al 05/10)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registrar ausencia" }));
    expect(onRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({ estado: "VACACIONES", desde: "2026-10-01", hasta: "2026-10-05" }),
    );
  });

  it("«hasta» antes de «desde»: «Revise las fechas», el texto del servidor en línea y el botón apagado", async () => {
    const { onRegistrar } = montar();
    fechas("2026-10-05", "2026-10-01");

    expect(screen.getByText("Revise las fechas")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "La ausencia no puede terminar antes de empezar.",
    );
    const boton = screen.getByRole("button", { name: "Registrar ausencia" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(boton);
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it("se cruza con una ya registrada: el texto del 409 en línea y no registra", async () => {
    const { onRegistrar } = montar([registrada()]);
    fechas("2026-10-20", "2026-10-28");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La persona ya tiene registrado un período del 12/10/2026 al 23/10/2026, que se cruza con el que intenta registrar. Retire el anterior o ajuste las fechas.",
    );
    expect(screen.getByText("Revise las fechas")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registrar ausencia" }));
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it("sin fechas, el botón queda apagado y el pie pide «Indique desde y hasta»", async () => {
    const { onRegistrar } = montar();
    const boton = screen.getByRole("button", { name: "Registrar ausencia" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Indique desde y hasta")).toBeInTheDocument();

    await userEvent.click(boton);
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it("bajo las fechas, la ayuda de Personal", () => {
    montar();
    expect(
      screen.getByText(
        "Ambas fechas se incluyen. Esos días se bloquean en la Cobertura por turnos y la persona no se ofrece al registrar operativos.",
      ),
    ).toBeInTheDocument();
  });
});

describe("Ausencias · operativos ya asignados", () => {
  it("con un rango válido, avisa del operativo que la ausencia NO retira", async () => {
    vi.mocked(PersonalService.operativosDe).mockResolvedValue([
      { operativoId: 35, identificador: "OCPMO-001-09-OCT-2026", fecha: "2026-10-09" },
    ]);
    montar();
    fechas("2026-10-09", "2026-10-10");

    expect(
      await screen.findByText(
        "Tiene un operativo asignado el 09/10/2026 (OCPMO-001-09-OCT-2026). La ausencia no lo retira: avise al responsable para reemplazarlo.",
      ),
    ).toBeInTheDocument();
    expect(PersonalService.operativosDe).toHaveBeenCalledWith(7, "2026-10-09", "2026-10-10");
  });

  it("con un rango inválido no pregunta", () => {
    montar();
    fechas("2026-10-10", "2026-10-09");
    expect(PersonalService.operativosDe).not.toHaveBeenCalled();
  });
});

describe("Ausencias · registradas", () => {
  it("muestra el estado de cada una y «Quitar» pide confirmación", async () => {
    const { onRetirar } = montar([
      registrada({ id: 1, momento: "EN_CURSO", desde: "2026-10-07", hasta: "2026-10-09" }),
      registrada({ id: 2, momento: "PROXIMA" }),
    ]);

    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByText("Próxima")).toBeInTheDocument();

    const fila = screen.getByText("En curso").closest("tr")!;
    await userEvent.click(within(fila).getByRole("button", { name: "Quitar" }));
    expect(onRetirar).not.toHaveBeenCalled();
    await userEvent.click(within(fila).getByRole("button", { name: "Sí, quitar" }));
    expect(onRetirar).toHaveBeenCalledWith(1);
  });

  it("una ausencia PASADA no ofrece «Quitar»: dice «Historial»", () => {
    montar([
      registrada({ id: 3, momento: "PASADA", desde: "2026-09-01", hasta: "2026-09-05" }),
    ]);
    expect(screen.getByText("Pasada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar" })).not.toBeInTheDocument();
    expect(screen.getByText("Historial")).toBeInTheDocument();
  });
});

describe("Ausencias · tras registrar", () => {
  it("si se registró, el formulario vuelve a vacío", async () => {
    montar();
    fechas("2026-10-01", "2026-10-02");
    await userEvent.click(screen.getByRole("button", { name: "Registrar ausencia" }));
    await waitFor(() =>
      expect(screen.getByText("Indique desde y hasta")).toBeInTheDocument(),
    );
  });
});
