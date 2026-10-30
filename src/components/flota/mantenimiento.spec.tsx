/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mantenimiento de vehículos
 * Archivo: mantenimiento.spec.tsx
 * Responsabilidad: Verificar RN-DAF-05 al programar el mantenimiento de un vehículo desde Flota.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31 · «Programar mantenimiento» en la pestaña Vehículos 2026-10-20
 *
 * SE PRUEBAN DECISIONES, NO MAQUETADO:
 *
 *   1. Que las fechas se comparen COMO CADENAS. En `AAAA-MM-DD` el orden alfabético es el
 *      cronológico, y convertirlas a `Date` en Quito —UTC−5— las desplaza un día (regla 12).
 *   2. Que el motivo sea obligatorio y el resto de la cita opcional (2026-10-20): se elige de una
 *      lista; el taller, la hora y su zonal llegan después.
 *   3. Que un cruce con otra parada del mismo vehículo se diga ANTES de guardar y apague Guardar.
 *   4. Que si la placa ya tiene traslados en el rango se avise con un `MensajeModal` de advertencia
 *      («la parada no los retira») y solo «Programar igual» la guarde.
 *   5. Que el estado de una parada (Programado → En taller → Listo) y su eliminación sigan
 *      vivos dentro del mismo cajón, que reemplaza a «Ver paradas».
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/transporte.service.ts", () => ({
  TransporteService: {
    listarMantenimientos: vi.fn(),
    impactoMantenimiento: vi.fn(),
    registrarMantenimiento: vi.fn(),
    retirarMantenimiento: vi.fn(),
  },
}));
vi.mock("../../services/planificacion.service.ts", () => ({
  PlanificacionService: { cambiarEstadoMantenimiento: vi.fn() },
}));

import DrawerMantenimiento, { AVISO_TAREA_TALLER, AYUDA_PARADA } from "./DrawerMantenimiento.tsx";
import MensajeHost from "../common/MensajeHost.tsx";
import { esquemaMantenimiento } from "../../config/validationSchemas.ts";
import type { MantenimientoVehiculo, Vehiculo } from "../../interfaces/Transporte.ts";
import { PlanificacionService } from "../../services/planificacion.service.ts";
import { TransporteService } from "../../services/transporte.service.ts";

const VEHICULO: Vehiculo = {
  id: 54,
  placa: "PMA7057",
  descripcion: "Camioneta",
  activo: true,
  tipo: "Camioneta",
  asientos: 4,
};

const PARADA: MantenimientoVehiculo = {
  id: 9,
  vehiculoId: 54,
  desde: "2026-10-20",
  hasta: "2026-10-23",
  taller: "AMBACAR",
  hora: null,
  motivo: "Cambio de frenos",
  estado: "PROGRAMADO",
};

/** `true` si el esquema acepta esos valores. */
const acepta = async (valores: Record<string, string>): Promise<boolean> =>
  esquemaMantenimiento
    .validate(valores)
    .then(() => true)
    .catch(() => false);

const montar = (props: Partial<Parameters<typeof DrawerMantenimiento>[0]> = {}) => {
  const onCambio = vi.fn();
  const onCerrar = vi.fn();
  render(
    <>
      <DrawerMantenimiento
        vehiculo={VEHICULO}
        desdeInicial="2026-10-27"
        onCambio={onCambio}
        onCerrar={onCerrar}
        {...props}
      />
      <MensajeHost />
    </>,
  );
  return { onCambio, onCerrar };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(TransporteService.listarMantenimientos).mockResolvedValue([PARADA]);
  vi.mocked(TransporteService.impactoMantenimiento).mockResolvedValue([]);
  vi.mocked(TransporteService.registrarMantenimiento).mockResolvedValue(PARADA);
});

describe("RN-DAF-05 · el esquema de una parada de taller", () => {
  it("pide las dos fechas y el motivo; el taller y la hora son opcionales (2026-10-20)", async () => {
    expect(await acepta({ desde: "2026-09-10", hasta: "2026-09-12", motivo: "Reparación" })).toBe(true);
    expect(await acepta({ desde: "2026-09-10", hasta: "2026-09-12" })).toBe(false);
    expect(await acepta({ hasta: "2026-09-12", motivo: "Reparación" })).toBe(false);
  });

  /**
   * LA QUE DE VERDAD DISCRIMINA. Se comparan cadenas, no fechas: si alguien cambiara el
   * esquema a `Yup.date()`, en Quito una parada del día 10 al 10 empezaría a fallar.
   */
  it("rechaza que el fin sea anterior al inicio y admite el mismo día y el cruce de mes", async () => {
    expect(await acepta({ desde: "2026-09-12", hasta: "2026-09-10", motivo: "Reparación" })).toBe(false);
    expect(await acepta({ desde: "2026-09-10", hasta: "2026-09-10", motivo: "Reparación" })).toBe(true);
    expect(await acepta({ desde: "2026-09-30", hasta: "2026-10-02", motivo: "Reparación" })).toBe(true);
  });

  it("la hora va en HH:MM, con cualquier minuto", async () => {
    const base = { desde: "2026-09-10", hasta: "2026-09-10", motivo: "Reparación" };
    expect(await acepta({ ...base, hora: "08:15" })).toBe(true);
    expect(await acepta({ ...base, hora: "8am" })).toBe(false);
  });
});

describe("Programar mantenimiento · el cajón (2026-10-20)", () => {
  it("nombra la placa y el tipo, explica la consecuencia y lista las paradas del vehículo", async () => {
    montar();
    const cajon = screen.getByRole("dialog", { name: "Programar mantenimiento" });
    expect(cajon).toHaveTextContent("PMA-7057 · Camioneta");
    expect(within(cajon).getByText(AYUDA_PARADA)).toBeInTheDocument();
    const lista = await within(cajon).findByRole("list", { name: "Paradas de PMA-7057" });
    expect(lista).toHaveTextContent("20/10/2026 al 23/10/2026");
    expect(lista).toHaveTextContent("Cambio de frenos · AMBACAR");
  });

  it("sin motivo no guarda y lo dice en el pie", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByRole("list", { name: "Paradas de PMA-7057" });

    await usuario.click(screen.getByRole("button", { name: "Programar" }));
    expect(await screen.findByText("Falta: motivo")).toBeInTheDocument();
    expect(TransporteService.registrarMantenimiento).not.toHaveBeenCalled();
  });

  it("un cruce con otra parada se dice en rojo y apaga Guardar", async () => {
    const usuario = userEvent.setup();
    montar({ desdeInicial: "2026-10-22" });
    await screen.findByRole("list", { name: "Paradas de PMA-7057" });
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "Reparación");

    expect(screen.getByText(/^Se cruza con la parada/)).toHaveAttribute("role", "alert");
    expect(screen.getByText(/^Se cruza con la parada/)).toHaveTextContent("Se cruza con la parada del 20/10/2026 al 23/10/2026 (Cambio de frenos)");
    expect(screen.getByRole("button", { name: "Programar" })).toHaveAttribute("aria-disabled", "true");
    await usuario.click(screen.getByRole("button", { name: "Programar" }));
    expect(TransporteService.impactoMantenimiento).not.toHaveBeenCalled();
  });

  it("guarda con el motivo, avisa «Mantenimiento de PMA-7057 programado» y pide refrescar", async () => {
    const usuario = userEvent.setup();
    const { onCambio, onCerrar } = montar();
    await screen.findByRole("list", { name: "Paradas de PMA-7057" });
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "Mantenimiento preventivo");

    await usuario.click(screen.getByRole("button", { name: "Programar" }));

    await waitFor(() =>
      expect(TransporteService.registrarMantenimiento).toHaveBeenCalledWith(54, {
        desde: "2026-10-27",
        hasta: "2026-10-27",
        motivo: "Mantenimiento preventivo",
        taller: undefined,
        hora: undefined,
        zonalTallerId: undefined,
      }),
    );
    expect(TransporteService.impactoMantenimiento).toHaveBeenCalledWith(54, "2026-10-27", "2026-10-27");
    expect((await screen.findAllByText("Mantenimiento de PMA-7057 programado")).length).toBeGreaterThan(0);
    expect(onCambio).toHaveBeenCalled();
    expect(onCerrar).toHaveBeenCalled();
  });

  it("con traslados asignados en el rango avisa antes; solo «Programar igual» la guarda", async () => {
    const usuario = userEvent.setup();
    vi.mocked(TransporteService.impactoMantenimiento).mockResolvedValue([
      {
        operativoId: 66,
        identificador: "OCPMO-001-27-OCT-2026",
        fecha: "2026-10-27",
        horaInicio: "08:00",
        horaFin: "16:30",
      },
    ]);
    montar();
    await screen.findByRole("list", { name: "Paradas de PMA-7057" });
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "Reparación");
    await usuario.click(screen.getByRole("button", { name: "Programar" }));

    const aviso = await screen.findByRole("alertdialog", { name: "¿Programar la parada de PMA-7057?" });
    expect(aviso).toHaveTextContent("Tiene 1 traslado asignado en esas fechas. La parada no los retira");
    expect(aviso).toHaveTextContent("OCPMO-001-27-OCT-2026 · 27/10/2026 de 08H00 a 16H30");
    expect(TransporteService.registrarMantenimiento).not.toHaveBeenCalled();

    await usuario.click(within(aviso).getByRole("button", { name: "Programar igual" }));
    await waitFor(() => expect(TransporteService.registrarMantenimiento).toHaveBeenCalled());
  });

  it("el rechazo del servidor queda en el cajón, tal cual", async () => {
    const usuario = userEvent.setup();
    const delServidor = "El vehículo PMA-7057 ya tiene un mantenimiento registrado del 27/10/2026 al 28/10/2026.";
    vi.mocked(TransporteService.registrarMantenimiento).mockRejectedValue({
      status: 409,
      originalError: { response: { data: { codigo: "VEHICULO_OCUPADO", mensaje: delServidor } } },
    });
    montar();
    await screen.findByRole("list", { name: "Paradas de PMA-7057" });
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "Reparación");
    await usuario.click(screen.getByRole("button", { name: "Programar" }));

    expect(await screen.findByText(delServidor)).toBeInTheDocument();
  });

  it("con hora de la cita avisa que se creará la tarea «Llevar a taller»", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("button", { name: "Agregar cita" }));
    expect(screen.queryByText(AVISO_TAREA_TALLER)).toBeNull();
    await usuario.type(screen.getByLabelText("Hora de la cita"), "08:00");
    expect(screen.getByText(AVISO_TAREA_TALLER)).toBeInTheDocument();
  });
});

describe("Programar mantenimiento · paradas programadas (Fase 5)", () => {
  it("una parada PROGRAMADA pasa a «En taller» por su endpoint; LISTO no ofrece transiciones", async () => {
    const usuario = userEvent.setup();
    vi.mocked(TransporteService.listarMantenimientos).mockResolvedValue([
      PARADA,
      { ...PARADA, id: 10, desde: "2026-09-01", hasta: "2026-09-02", estado: "LISTO" },
    ]);
    vi.mocked(PlanificacionService.cambiarEstadoMantenimiento).mockResolvedValue();
    const { onCambio } = montar();
    const lista = await screen.findByRole("list", { name: "Paradas de PMA-7057" });

    const [programada, lista2] = within(lista).getAllByRole("listitem");
    expect(within(lista2).queryByRole("button", { name: /Marcar/ })).toBeNull();
    await usuario.click(within(programada).getByRole("button", { name: "Marcar en taller" }));
    expect(PlanificacionService.cambiarEstadoMantenimiento).toHaveBeenCalledWith(54, 9, "EN_TALLER");
    await waitFor(() => expect(onCambio).toHaveBeenCalled());
  });

  it("Eliminar pide confirmación y borra la parada", async () => {
    const usuario = userEvent.setup();
    vi.mocked(TransporteService.retirarMantenimiento).mockResolvedValue();
    montar();
    await screen.findByRole("list", { name: "Paradas de PMA-7057" });

    await usuario.click(screen.getByRole("button", { name: "Eliminar la parada del 2026-10-20 al 2026-10-23" }));
    const confirmacion = await screen.findByRole("alertdialog", { name: "¿Eliminar la parada?" });
    await usuario.click(within(confirmacion).getByRole("button", { name: "Sí, eliminar" }));
    expect(TransporteService.retirarMantenimiento).toHaveBeenCalledWith(54, 9);
  });
});
