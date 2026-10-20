/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (línea de tiempo por conductor)
 * Archivo: filaConductorLinea.spec.tsx
 * Responsabilidad: Verificar que un tramo asignado sin placa se dice en palabras («Sin vehículo»)
 *                  y que una tarea de taller no lo dispara.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FilaConductorLinea from "./FilaConductorLinea.tsx";
import type { ConductorPlanificado, TramoPlanificado } from "../../../interfaces/Planificacion.ts";

const CONDUCTOR: ConductorPlanificado = {
  id: 52,
  nombre: "SOSA JOSE LUIS",
  sector: "NORTE",
  tipoContrato: "OCASIONAL",
  parqueaderoAutorizado: false,
  actaVigente: false,
  turno: "DIA",
  activado: false,
  ausente: false,
  ultimoFinAyer: null,
  vehiculoHabitualId: null,
};

const tramo = (parcial: Partial<TramoPlanificado> = {}): TramoPlanificado => ({
  id: 19,
  operativoId: 41,
  identificador: "OCDMIT-001",
  tipo: "COMPLETO",
  horaInicio: "08:00",
  horaFin: "12:00",
  cruzaMedianoche: false,
  conductorId: 52,
  conductor: "SOSA JOSE LUIS",
  vehiculoId: null,
  placa: null,
  zonalOrigen: null,
  zonalDestino: null,
  compartidoConTramoId: null,
  descripcion: null,
  ...parcial,
});

const fila = (tramos: TramoPlanificado[]) =>
  render(
    <ul>
      <FilaConductorLinea
        conductor={CONDUCTOR}
        tramos={tramos}
        placa={null}
        avisos={[]}
        inicioJornada="05:00"
        ventanaTurno={null}
        ventanaNombramiento={null}
        tabla={null}
        soloLectura={false}
        onTramo={vi.fn()}
        onHojaRuta={vi.fn()}
        onOperacion={vi.fn()}
        onQuitarActivacion={vi.fn()}
      />
    </ul>,
  );

describe("Fila de la línea de tiempo · sin vehículo", () => {
  it("un tramo asignado sin placa lleva «Sin vehículo», con el tramo en el title y en la barra", () => {
    fila([tramo()]);

    const distintivo = screen.getByText("Sin vehículo");
    expect(distintivo).toHaveClass("badge", "badge-warning");
    expect(distintivo).toHaveAttribute(
      "title",
      "Asignado sin vehículo: falta la placa (OCDMIT-001 08:00–12:00).",
    );
    expect(screen.getByRole("button", { name: /OCDMIT-001/ })).toHaveAttribute(
      "title",
      expect.stringContaining("sin vehículo"),
    );
  });

  it("con placa, o si es una tarea de taller, no hay distintivo", () => {
    fila([
      tramo({ vehiculoId: 60, placa: "PMA-3370" }),
      tramo({ id: 20, operativoId: null, identificador: null, tipo: "TAREA", descripcion: "Llevar a taller" }),
    ]);

    expect(screen.queryByText("Sin vehículo")).not.toBeInTheDocument();
  });
});
