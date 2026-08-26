/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: transporte.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LA PRUEBA MÁS IMPORTANTE DE ESTE ARCHIVO ES LA DEL CASO 2: que **todo esté
 * deshabilitado salvo dos controles**. No se afirma nombrando los dos editables, sino
 * contando: si alguien agregara mañana un tercer campo escribible, la cuenta cambiaría y
 * la prueba caería. Nombrarlos habría dejado pasar exactamente esa regresión.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BandejaTransporte from "./BandejaTransporte.tsx";
import IndicadorFlota from "./IndicadorFlota.tsx";
import PanelAsignacionTransporte from "./PanelAsignacionTransporte.tsx";
import {
  SIN_PENDIENTES,
  vehiculosDeLosConductores,
} from "../../utils/flota.util.ts";
import type {
  CapacidadFlota,
  ConductorDisponible,
  OperativoPendiente,
} from "../../interfaces/Transporte.ts";

const pendiente = (
  parcial: Partial<OperativoPendiente> = {},
): OperativoPendiente => ({
  id: 1,
  identificador: "ICNECU-001-31-JUL-2026",
  formularioNombre: "Patrulla de Reacción Nocturna",
  formularioCodigo: "ICNECU",
  colorFondo: "#1b77bb",
  horario: "18H00 A 23H30",
  esNocturno: true,
  requiereConductor: true,
  personasAsignadas: 3,
  puntoEncuentro: "AMC Matriz",
  zonales: ["DMQ"],
  estadoTransporte: "PENDIENTE",
  ...parcial,
});

const conductores: ConductorDisponible[] = [
  {
    id: 10,
    nombreCompleto: "VIVANCO LUIS",
    licenciaTipo: "E",
    vehiculoHabitual: { id: 55, placa: "PMA7892" },
  },
  {
    id: 11,
    nombreCompleto: "TORRES ANA",
    licenciaTipo: "C",
    vehiculoHabitual: null,
  },
];

const propiedadesDelPanel = {
  operativo: pendiente(),
  conductores,
  vehiculos: vehiculosDeLosConductores(conductores),
  cargandoConductores: false,
  soloLectura: false,
  guardando: false,
  aviso: null,
  onAsignar: vi.fn(),
  onPropiosMedios: vi.fn(),
  onCancelar: vi.fn(),
};

describe("caso 2 · todo deshabilitado salvo dos campos", () => {
  it("hay exactamente dos controles editables, y son conductor y placa", () => {
    const { container } = render(
      <PanelAsignacionTransporte {...propiedadesDelPanel} />,
    );

    const controles = [
      ...container.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input, select, textarea",
      ),
    ];
    const editables = controles.filter((control) => !control.disabled);

    // Contar, no nombrar: un tercer campo escribible haría caer esta prueba.
    expect(editables).toHaveLength(2);
    expect(editables.map((control) => control.id).sort()).toEqual([
      "conductor",
      "vehiculo",
    ]);
  });

  it("los dos editables se marcan con el distintivo, y solo esos dos", () => {
    render(<PanelAsignacionTransporte {...propiedadesDelPanel} />);

    expect(screen.getAllByText("Editable")).toHaveLength(2);
  });

  it("los campos del operativo se muestran, deshabilitados", () => {
    render(<PanelAsignacionTransporte {...propiedadesDelPanel} />);

    expect(screen.getByLabelText("Formulario")).toBeDisabled();
    expect(screen.getByLabelText("Horario")).toHaveValue("18H00 A 23H30");
    expect(screen.getByLabelText("Personal asignado")).toHaveValue("3 personas");
  });
});

describe("caso 3 · elegir conductor propone su vehículo habitual", () => {
  it("la placa se completa sola, y sigue siendo cambiable", async () => {
    render(<PanelAsignacionTransporte {...propiedadesDelPanel} />);

    await userEvent.selectOptions(screen.getByLabelText(/Conductor/), "10");

    const placa = screen.getByLabelText(/Placa del vehículo/);
    expect(placa).toHaveValue("55");
    // RN-45 dice de dónde sale la sugerencia, no que sea obligatoria.
    expect(placa).toBeEnabled();
  });

  it("un conductor sin vehículo habitual deja la placa por elegir", async () => {
    render(<PanelAsignacionTransporte {...propiedadesDelPanel} />);

    await userEvent.selectOptions(screen.getByLabelText(/Conductor/), "11");

    expect(screen.getByLabelText(/Placa del vehículo/)).toHaveValue("");
  });

  it("sin conductor y sin placa no se puede guardar", async () => {
    render(<PanelAsignacionTransporte {...propiedadesDelPanel} />);

    const guardar = screen.getByRole("button", { name: "Guardar asignación" });
    expect(guardar).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText(/Conductor/), "10");
    expect(guardar).toBeEnabled();
  });

  it("los vehículos ofrecidos son los habituales, sin repetir", () => {
    const repetidos: ConductorDisponible[] = [
      ...conductores,
      {
        id: 12,
        nombreCompleto: "PAREDES JOSÉ",
        licenciaTipo: "E",
        vehiculoHabitual: { id: 55, placa: "PMA7892" },
      },
    ];

    expect(vehiculosDeLosConductores(repetidos)).toEqual([
      { id: 55, placa: "PMA7892" },
    ]);
  });
});

describe("caso 4 · conductor no elegible", () => {
  it("el motivo del servidor se muestra tal cual y la selección se conserva", () => {
    render(
      <PanelAsignacionTransporte
        {...propiedadesDelPanel}
        aviso="VIVANCO LUIS condujo hasta las 02H00. Necesita doce horas de descanso."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "VIVANCO LUIS condujo hasta las 02H00.",
    );
    // El panel sigue en pie: no se cierra ni se limpia.
    expect(screen.getByLabelText(/Conductor/)).toBeInTheDocument();
  });
});

describe("caso 6 · propios medios no asigna vehículo", () => {
  it("el botón se puede pulsar sin haber elegido conductor ni placa", async () => {
    const propiosMedios = vi.fn();

    render(
      <PanelAsignacionTransporte
        {...propiedadesDelPanel}
        onPropiosMedios={propiosMedios}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Marcar propios medios" }),
    );
    expect(propiosMedios).toHaveBeenCalled();
  });
});

describe("RN-43 · el nocturno con condicionante se distingue", () => {
  it("el panel avisa de que impide cerrar la jornada", () => {
    render(<PanelAsignacionTransporte {...propiedadesDelPanel} />);

    expect(
      screen.getByText(/no se puede cerrar mientras siga sin asignar/),
    ).toBeInTheDocument();
  });

  it("en la bandeja se lee «Obligatorio, pendiente», no solo el amarillo", () => {
    render(
      <BandejaTransporte
        operativos={[
          pendiente({ id: 1, requiereConductor: true }),
          pendiente({
            id: 2,
            identificador: "IG-002-31-JUL-2026",
            requiereConductor: false,
            esNocturno: false,
          }),
        ]}
        seleccionadoId={null}
        onSeleccionar={vi.fn()}
        soloLectura={false}
        mensajeVacio="Sin pendientes"
      />,
    );

    // Regla 6 de CLAUDE.md: el Amarillo de Alerta lleva siempre su equivalente textual.
    expect(screen.getByText("Obligatorio, pendiente")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });
});

describe("casos 7 y 8 · fuera de la ventana, la bandeja se consulta pero no se escribe", () => {
  it("el botón de asignar queda deshabilitado y explica por qué", () => {
    render(
      <BandejaTransporte
        operativos={[pendiente()]}
        seleccionadoId={null}
        onSeleccionar={vi.fn()}
        soloLectura
        mensajeVacio="Sin pendientes"
      />,
    );

    const asignar = screen.getByRole("button", { name: "Asignar" });

    expect(asignar).toBeDisabled();
    expect(asignar).toHaveAttribute(
      "title",
      expect.stringContaining("ventana de asignación"),
    );
    // Pero la fila se sigue viendo: la consulta nunca se restringe.
    expect(screen.getByText("ICNECU-001-31-JUL-2026")).toBeInTheDocument();
  });

  it("en solo lectura, el panel deshabilita también sus dos editables", () => {
    const { container } = render(
      <PanelAsignacionTransporte
        {...propiedadesDelPanel}
        soloLectura
      />,
    );

    const editables = [
      ...container.querySelectorAll<HTMLSelectElement>("select"),
    ].filter((control) => !control.disabled);

    expect(editables).toHaveLength(0);
  });
});

describe("caso 10 · sin pendientes", () => {
  /**
   * Se afirma **el mensaje de la pantalla**, no un literal escrito aquí. Con un literal
   * propio la prueba pasaba dijera lo que dijera P-03, que es justamente lo que dejó
   * suelto que «no hay pendientes» fuera indistinguible de «no hay nada registrado».
   */
  it("se dice que no queda nada por resolver, y por qué puede estar vacía", () => {
    render(
      <BandejaTransporte
        operativos={[]}
        seleccionadoId={null}
        onSeleccionar={vi.fn()}
        soloLectura={false}
        mensajeVacio={SIN_PENDIENTES}
      />,
    );

    expect(screen.getByText(SIN_PENDIENTES)).toBeInTheDocument();
    expect(SIN_PENDIENTES).toContain("propios medios");
  });

  it("la fila seleccionada se distingue", () => {
    render(
      <BandejaTransporte
        operativos={[pendiente({ id: 1 })]}
        seleccionadoId={1}
        onSeleccionar={vi.fn()}
        soloLectura={false}
        mensajeVacio="Sin pendientes"
      />,
    );

    const fila = screen.getAllByRole("row")[1];
    expect(fila.className).toContain("bg-primary/5");
    expect(
      within(fila).getByRole("button", { name: "Asignar" }),
    ).toBeEnabled();
  });
});

describe("caso 9 · flota excedida avisa pero no bloquea", () => {
  const capacidad = (parcial: Partial<CapacidadFlota> = {}): CapacidadFlota => ({
    fecha: "2026-07-31",
    declarada: {
      vehiculosHabiles: 15,
      conductoresHabiles: 15,
      observacion: null,
      declaradoPor: 1,
      declaradoEn: "2026-07-31T13:00:00.000Z",
    },
    demanda: { vehiculos: 18, conductores: 18 },
    vehiculos: {
      declarados: 15,
      requeridos: 18,
      excedente: -3,
      suficiente: false,
    },
    conductores: {
      declarados: 15,
      requeridos: 12,
      excedente: 3,
      suficiente: true,
    },
    hayAdvertencia: true,
    advertencia: "La jornada requiere 18 vehículos y hay 15 hábiles.",
    ...parcial,
  });

  it("el distintivo excedido es de error; el que alcanza, no", () => {
    render(
      <IndicadorFlota
        capacidad={capacidad()}
        cargando={false}
      />,
    );

    expect(screen.getByText("Vehículos 18/15").className).toContain(
      "badge-error",
    );
    expect(screen.getByText("Conductores 12/15").className).not.toContain(
      "badge-error",
    );
  });

  it("sin declarar no se dice «0/0»: se dice que falta declararla", () => {
    render(
      <IndicadorFlota
        capacidad={capacidad({ declarada: null })}
        cargando={false}
      />,
    );

    expect(screen.getByText("Flota sin declarar")).toBeInTheDocument();
  });
});
