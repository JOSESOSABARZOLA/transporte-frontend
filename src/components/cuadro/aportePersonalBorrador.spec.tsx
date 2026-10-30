/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: aportePersonalBorrador.spec.tsx
 * Responsabilidad: Fijar que el cajón «Personal de operativo» de quien APORTA se confirma con
 *                  «Guardar cambios»: agregar no llama al servidor, guardar envía el lote en una
 *                  llamada, un rechazo no guarda nada y se dice en la persona, y cerrar con
 *                  cambios pregunta.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-28
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HASTA EL 2026-10-28 CADA PERSONA SE GUARDABA EN SU CLIC. El DMIT abría el cajón de un operativo
 * ajeno (Form 4 ECU) y cada «+ Agregar», cada «×» y cada hora era un `POST`/`DELETE`/`PATCH`. Ahora
 * tocan el borrador y «Guardar cambios» envía el conjunto final (`PUT /operativos/:id/personal/lote`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import type { Operativo, PersonaAsignada } from "../../interfaces/Operativo.ts";
import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";

beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => vi.clearAllMocks());

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    rango: vi.fn(() => new Promise(() => {})),
    consultar: vi.fn(),
    obtener: vi.fn(),
    asignarPersonal: vi.fn(),
    retirarPersonal: vi.fn(),
    actualizarTurnoPersonal: vi.fn(),
    guardarPersonal: vi.fn(),
    editar: vi.fn(),
  },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));
// Quien mira es el DMIT: APORTA al Form 4, que registra DMIP Operativos.
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: ["DMIT_INSTRUCTOR"], displayName: "Prueba" } }),
}));
vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => ({ cuadro: null, cargando: false, puedeEscribir: true, sinJornada: false }),
}));
vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({ ventana: null, puedeEscribir: true, mensaje: null, horaCierre: null }),
}));

/** Una persona de Operativos que puso el dueño: llega en lectura para quien aporta. */
const DEL_DUENO: PersonaAsignada = {
  funcionarioId: 3,
  nombre: "PEREZ ANA",
  area: "OPERATIVOS",
  telefono: null,
  cargo: null,
  esResponsable: false,
  asignadoPorRol: "DMIP_OPERATIVOS",
  horaInicio: "08:00",
  horaFin: "16:00",
};

/** El Form 4 ECU: un operativo suelto (sin grupo), del DMIP, al que aporta el DMIT. */
const ECU = {
  id: 1,
  identificador: "OCECU-001-28-OCT-2026",
  grupoRegistro: "registro-suelto",
  esLote: false,
  secuencial: 1,
  cuadroFecha: "2026-10-28",
  esAdicional: false,
  origen: null,
  adicionales: 0,
  formulario: {
    codigo: "ECU",
    nombre: "PATRULLA ECU DIURNA",
    numero: 4,
    colorFondo: "#c62828",
    colorAcento: "#000000",
    colorNombre: "rojo",
    esPatrulla: true,
    condicionanteNoct: false,
    politicaVehiculo: "CONDICIONAL",
    admiteAdicionales: false,
    rolDueno: "DMIP_OPERATIVOS",
    roles: [
      { rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" },
      { rol: "DMIT_INSTRUCTOR", acceso: "APORTA" },
    ],
  },
  horaInicio: "08:00",
  horaFin: "16:00",
  horario: "08H00 A 16H00",
  duracionHoras: 8,
  esNocturno: false,
  cruzaMedianoche: false,
  zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
  puntoEncuentro: { id: 4, nombre: "AMC Matriz", zonalNombre: "La Delicia" },
  puntoLibre: null,
  tipoControl: { id: 30, nombre: "ALERTAS ECU 911" },
  tipoLibre: null,
  instituciones: [{ id: 7, sigla: "AMC", nombre: "AMC" }],
  personal: [DEL_DUENO],
  composicion: { esPatrulla: true, completa: false, areasPendientes: ["INSTRUCCION"] },
  estadoTransporte: "PENDIENTE",
  alertaActiva: false,
  alertas: [],
  observaciones: [],
  creadoPorRol: "DMIP_OPERATIVOS",
  creadoPor: 1,
  modificadoPorRol: "DMIP_OPERATIVOS",
  modificadoPor: 1,
  version: 1,
  creadoEn: "2026-10-27T12:00:00.000Z",
} as unknown as Operativo;

const INSTRUCTORA = {
  id: 41,
  apellidos: "YUNDA",
  nombres: "JESSICA",
  area: "INSTRUCCION",
  cargo: "Instructora",
  elegible: true,
  motivo: null,
};

const META = { total: 1, pagina: 1, tamanio: 200, totalPaginas: 1 };

/** Abre «Agregar personal» de la fila y devuelve el cajón. */
const abrirAporte = async () => {
  vi.mocked(OperativoService.consultar).mockResolvedValue({ datos: [ECU], meta: META });
  vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([INSTRUCTORA] as never);
  render(<MisOperativosPage />);
  await userEvent.click(await screen.findByRole("button", { name: /^Agregar personal/ }));
  return screen.findByRole("dialog", { name: "Personal de operativo OCECU-001-28-OCT-2026" });
};

describe("Aporte de personal · se confirma con «Guardar cambios» (2026-10-28)", () => {
  it("agregar NO llama al servidor: la persona entra al borrador con «Nuevo»", async () => {
    const cajon = await abrirAporte();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));

    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    expect(OperativoService.guardarPersonal).not.toHaveBeenCalled();
    expect(within(cajon).getByText("Nuevo")).toBeInTheDocument();
    expect(within(cajon).getByText("1 cambio sin guardar · +1 persona")).toBeInTheDocument();
    // Los textos del guardado al instante se fueron.
    expect(within(cajon).queryByText(/Se guarda al instante/)).toBeNull();
    expect(within(cajon).queryByText(/se guarda en el momento/)).toBeNull();
    expect(
      within(cajon).getByText(
        "Su departamento aporta personal a este operativo. El resto de los datos los mantiene el departamento dueño del formulario y llega en lectura.",
      ),
    ).toBeInTheDocument();
  });

  it("sin cambios, «Guardar cambios» está apagado", async () => {
    const cajon = await abrirAporte();

    expect(within(cajon).getByText("Sin cambios pendientes")).toBeInTheDocument();
    expect(within(cajon).getByRole("button", { name: "Guardar cambios" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("«Guardar cambios» envía el conjunto COMPLETO en una sola llamada", async () => {
    const guardado = {
      ...ECU,
      personal: [
        DEL_DUENO,
        { ...DEL_DUENO, funcionarioId: 41, nombre: "YUNDA JESSICA", area: "INSTRUCCION" },
      ],
    } as Operativo;
    vi.mocked(OperativoService.guardarPersonal).mockResolvedValue(guardado);
    const cajon = await abrirAporte();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(OperativoService.guardarPersonal).toHaveBeenCalledTimes(1));
    // Quien ya estaba (del dueño) y la nueva, cada una con su turno.
    expect(OperativoService.guardarPersonal).toHaveBeenCalledWith(
      1,
      [
        { funcionarioId: 3, horaInicio: "08:00", horaFin: "16:00" },
        { funcionarioId: 41, horaInicio: "08:00", horaFin: "16:00" },
      ],
      false,
    );
    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Personal guardado: 2 personas en OCECU-001-28-OCT-2026"),
    ).toBeInTheDocument();
    // El cajón se cierra.
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Personal de operativo OCECU-001-28-OCT-2026" }),
      ).toBeNull(),
    );
  });

  it("si el servidor rechaza a una persona, no se guarda nada y el motivo va en ella", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: {
            codigo: "PERSONA_NO_DISPONIBLE",
            mensaje: "YUNDA JESSICA ya tiene un operativo a esa hora.",
            detalles: { funcionarioId: 41 },
          },
        },
      },
    });
    const cajon = await abrirAporte();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    // El texto del servidor, tal cual, en la fila de esa persona; el borrador sigue.
    const motivo = await within(cajon).findByText(
      "YUNDA JESSICA ya tiene un operativo a esa hora.",
    );
    expect(motivo.closest("li")).toHaveTextContent("YUNDA JESSICA");
    expect(within(cajon).getByText("Nuevo")).toBeInTheDocument();
    expect(screen.queryByText(/Personal guardado/)).toBeNull();
  });

  it("cerrar con cambios pide confirmación", async () => {
    const cajon = await abrirAporte();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("¿Descartar cambios?")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Personal de operativo OCECU-001-28-OCT-2026" }),
    ).toBeInTheDocument();
  });

  it("sin cambios, cerrar no pregunta", async () => {
    const cajon = await abrirAporte();

    await userEvent.click(within(cajon).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("¿Descartar cambios?")).toBeNull();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Personal de operativo OCECU-001-28-OCT-2026" }),
      ).toBeNull(),
    );
  });
});
