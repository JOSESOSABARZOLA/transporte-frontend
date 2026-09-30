/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: confirmacionPersonal.spec.tsx
 * Responsabilidad: Que asignar personal lo diga, y que no lo diga si el servidor rechaza.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-01
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ACIERTO CALLABA Y EL FALLO HABLABA.
 *
 * Este panel mostraba `alert alert-error` con el motivo del servidor cuando algo salía
 * mal, y **nada en absoluto** cuando salía bien. La única señal era que el nombre
 * apareciera en la bandeja de asignados —donde aparecería igual si la petición se hubiera
 * perdido por el camino—.
 *
 * Importa aquí más que en otras pantallas por quién la usa: el departamento que aporta
 * abre este panel para poner a una persona en un operativo **que no es suyo**, y se va.
 * No tiene ninguna pantalla propia donde volver a comprobarlo.
 *
 * LA SEGUNDA PRUEBA ES LA QUE DISCRIMINA. La primera pasaría con un panel que confirmara
 * siempre, incluso sobre un rechazo; ésta exige que el mensaje dependa del resultado.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import PanelPersonalJornada from "./PanelPersonalJornada.tsx";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    obtener: vi.fn(),
    asignarPersonal: vi.fn(),
    retirarPersonal: vi.fn(),
  },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));

/**
 * El operativo tal como lo devuelve el servidor, sin nadie asignado.
 *
 * SE DEVUELVE SIEMPRE EL MISMO OBJETO en los simulacros que no cambian: el panel tiene
 * efectos que dependen de la identidad de lo que reciben, y uno nuevo por pintado los
 * dispararía sin fin. Es la lección que dejó `correccionEnSesion.spec.tsx`.
 */
const OPERATIVO = {
  id: 7,
  identificador: "OCECU-001-02-SEP-2026",
  version: 1,
  horaInicio: "08:00",
  horaFin: "12:00",
  personal: [],
  zonales: [],
  instituciones: [],
  alertas: [],
  formulario: { codigo: "ECU", numero: 4, nombre: "PATRULLA ECU DIURNA" },
} as unknown as Awaited<ReturnType<typeof OperativoService.obtener>>;

/** Una instructora elegible: es lo que el DMIT aporta a la ECU. */
const CANDIDATA = {
  id: 41,
  apellidos: "YUNDA",
  nombres: "JESSICA",
  area: "INSTRUCCION",
  cargo: "Instructora",
  telefono: "97 969 0786",
  elegible: true,
  motivo: null,
} as unknown as Awaited<
  ReturnType<typeof PersonalService.consultarElegibles>
>[number];

const FILA = {
  id: 7,
  identificador: "OCECU-001-02-SEP-2026",
  horario: "08H00 A 12H00",
  personal: [],
  areasPendientesDelRol: [],
  alertas: [],
} as unknown as FilaJornada;

const SECCION = {
  numero: 4,
  codigo: "ECU",
  nombre: "Patrulla ECU Diurna",
  acceso: "APORTA",
  puedeEditarPersonal: true,
  filas: [FILA],
} as unknown as SeccionJornada;

const abrirPanel = () => {
  vi.mocked(OperativoService.obtener).mockResolvedValue(OPERATIVO);
  vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([CANDIDATA]);

  return render(
    <PanelPersonalJornada
      fila={FILA}
      seccion={SECCION}
      fecha="2026-09-02"
      onCerrar={vi.fn()}
      onCambio={vi.fn()}
    />,
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("P-13 · asignar personal lo dice", () => {
  it("tras asignar, confirma y nombra a la persona y al operativo", async () => {
    vi.mocked(OperativoService.asignarPersonal).mockResolvedValue(OPERATIVO);

    abrirPanel();

    const boton = await screen.findByRole("button", {
      name: /YUNDA JESSICA/,
    });
    await userEvent.click(boton);

    await waitFor(() =>
      expect(
        screen.getByText(
          "Se agregó a YUNDA JESSICA al operativo OCECU-001-02-SEP-2026.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("y si el servidor rechaza, muestra su motivo y ninguna confirmación", async () => {
    vi.mocked(OperativoService.asignarPersonal).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: {
            codigo: "CUPO_COMPARTIDO_SUPERADO",
            mensaje: "Su departamento ya asignó las 2 personas de su cupo.",
          },
        },
      },
    });

    abrirPanel();

    const boton = await screen.findByRole("button", {
      name: /YUNDA JESSICA/,
    });
    await userEvent.click(boton);

    // El motivo del servidor se muestra tal cual (regla 7).
    await waitFor(() =>
      expect(screen.getByText(/ya asignó las 2 personas/)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Se agregó a/)).toBeNull();
  });
});
