/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada de los conductores y capacidad de flota
 * Archivo: jornadaConductores.spec.tsx
 * Responsabilidad: Verificar P-14 y P-15, y el panel de destinos de P-03.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRES DECISIONES, UNA POR PANTALLA. No se prueba maquetado.
 *
 *   · P-14: que un conductor con varios operativos los muestre TODOS. Es el hallazgo
 *     central del levantamiento —el 38 % de las asignaciones reales encadenan más de
 *     uno— y el motivo de que la pantalla exista.
 *   · P-15: que «sin declarar» no se escriba como «0». El servidor distingue
 *     `declarada: null` de un cero explícito, y perder esa distinción convertiría una
 *     ausencia de afirmación en una afirmación de la DAF.
 *   · P-03: que el destino se pueda declarar y que sin catálogo se explique por qué no.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import FilaJornadaConductor from "./FilaJornadaConductor.tsx";
import PanelDestinos from "./PanelDestinos.tsx";
import type {
  DestinoVehiculo,
  JornadaDeConductor,
  UbicacionFlota,
  VehiculoDeLaFlota,
} from "../../interfaces/Transporte.ts";

// ─────────────────────────── P-14 ───────────────────────────

const tramo = (identificador: string, horario: string) => ({
  identificador,
  horario,
  horaInicio: "08:00",
  horaFin: "10:00",
  esNocturno: false,
  placa: "PMA7056",
  punto: "AMC Matriz",
});

const jornada = (
  parcial: Partial<JornadaDeConductor> = {},
): JornadaDeConductor => ({
  conductorId: 10,
  nombreCompleto: "VIVANCO JORGE",
  sector: null,
  parqueaderoAutorizado: false,
  tipoContrato: null,
  tramos: [],
  horasAcumuladas: 0,
  disponible: true,
  ...parcial,
});

/**
 * Se monta el componente REAL dentro de una tabla, porque una fila necesita su tbody.
 *
 * La primera version de este archivo reimplementaba la fila aqui y la probaba. Pasaba en
 * verde sin proteger nada: verificaba la copia, no el codigo que se ejecuta. Es el mismo
 * defecto que se corrigió el 2026-08-28 en `config/env.spec.ts`.
 */
const montar = (fila: JornadaDeConductor) =>
  render(
    <table>
      <tbody>
        <FilaJornadaConductor jornada={fila} />
      </tbody>
    </table>,
  );
describe("P-14 · la jornada encadenada se ve entera", () => {
  /** EL CASO QUE JUSTIFICA LA PANTALLA. El sistema modelaba un operativo, un conductor. */
  it("un conductor con tres operativos los muestra los tres", () => {
    montar(
      jornada({
          tramos: [
            tramo("PMO-001", "08H00 A 10H00"),
            tramo("PMO-007", "12H00 A 14H00"),
            tramo("PMO-011", "17H00 A 18H30"),
          ],
      }),
    );

    expect(screen.getByText(/PMO-001/)).toBeInTheDocument();
    expect(screen.getByText(/PMO-007/)).toBeInTheDocument();
    expect(screen.getByText(/PMO-011/)).toBeInTheDocument();
  });

  it("uno sin nada asignado lo dice en palabras, no con una celda vacía", () => {
    montar(jornada());

    expect(screen.getByText("Sin asignación")).toBeInTheDocument();
  });

  /**
   * Regla 6: el estado se lee. Y los ausentes se MUESTRAN, al revés que en el desplegable
   * de P-03: saber que cinco conductores están de vacaciones es lo que explica por qué no
   * alcanza la flota.
   */
  it("el conductor ausente aparece, marcado como no disponible", () => {
    montar(jornada({ disponible: false }));

    expect(screen.getByText("VIVANCO JORGE")).toBeInTheDocument();
    expect(screen.getByText("No disponible")).toBeInTheDocument();
  });

  /** RN-DAF-04. Es lo primero que la analista mira al repetir una placa. */
  it("el parqueadero autorizado se distingue con su leyenda", () => {
    montar(jornada({ parqueaderoAutorizado: true }));

    expect(screen.getByText("Parqueadero autorizado")).toBeInTheDocument();
  });
});

// ─────────────────────────── P-03 · destinos ───────────────────────────

const FLOTA: VehiculoDeLaFlota[] = [
  {
    id: 80,
    placa: "PMA7056",
    descripcion: null,
    utilizable: true,
    motivo: null,
  },
  {
    id: 81,
    placa: "PMA3368",
    descripcion: null,
    utilizable: false,
    motivo: "En mantenimiento (AMBACAR) hasta el 2026-09-03.",
  },
];

const ZONALES: UbicacionFlota[] = [
  { id: 3, nombre: "ELOY ALFARO", activo: true },
  { id: 4, nombre: "QUITUMBE", activo: true },
];

const delPanel = {
  vehiculos: FLOTA,
  ubicaciones: ZONALES,
  destinos: new Map<number, DestinoVehiculo>(),
  soloLectura: false,
  guardando: false,
  aviso: null,
  onDeclarar: vi.fn(),
};

describe("RN-DAF-03 · declarar dónde queda el vehículo", () => {
  it("ofrece las zonales del catálogo y la opción de llevárselo", () => {
    render(<PanelDestinos {...delPanel} />);

    const desplegable = screen.getByLabelText("Destino de PMA7056");
    const opciones = within(desplegable)
      .getAllByRole("option")
      .map((opcion) => opcion.textContent ?? "");

    expect(opciones).toContain("ELOY ALFARO");
    expect(opciones).toContain("QUITUMBE");
    expect(opciones).toContain("Se lo lleva el conductor");
  });

  it("al elegir una zonal avisa con el vehículo y el valor", async () => {
    const onDeclarar = vi.fn();

    render(
      <PanelDestinos
        {...delPanel}
        onDeclarar={onDeclarar}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText("Destino de PMA7056"),
      "3",
    );

    expect(onDeclarar).toHaveBeenCalledWith(80, "3");
  });

  it("lo ya declarado llega seleccionado, para poder corregirlo", () => {
    render(
      <PanelDestinos
        {...delPanel}
        destinos={
          new Map([
            [
              80,
              {
                vehiculoId: 80,
                placa: "PMA7056",
                fecha: "2026-09-10",
                ubicacion: { id: 4, nombre: "QUITUMBE" },
                domicilio: false,
                observacion: null,
              },
            ],
          ])
        }
      />,
    );

    expect(screen.getByLabelText("Destino de PMA7056")).toHaveValue("4");
  });

  /**
   * LA QUE DE VERDAD DISCRIMINA. El catálogo nace vacío porque la evidencia se
   * contradice —cinco zonales en el Excel, cuatro en la reunión, es Q-01—. Un desplegable
   * con una sola opción inútil haría pensar que el sistema falla.
   */
  it("sin catálogo cargado se explica por qué no se puede declarar", () => {
    render(
      <PanelDestinos
        {...delPanel}
        ubicaciones={[]}
      />,
    );

    expect(
      screen.getByText(/no hay zonales de reposo registradas/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Destino de PMA7056")).toBeNull();
  });

  it("la placa en taller sigue apareciendo, con su motivo en palabras", () => {
    render(<PanelDestinos {...delPanel} />);

    expect(screen.getByText(/En mantenimiento \(AMBACAR\)/)).toBeInTheDocument();
  });

  it("fuera de la ventana se consulta pero no se declara", () => {
    render(
      <PanelDestinos
        {...delPanel}
        soloLectura
      />,
    );

    expect(screen.getByLabelText("Destino de PMA7056")).toBeDisabled();
  });
});
