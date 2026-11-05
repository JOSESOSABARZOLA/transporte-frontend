/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Editar patrulla (Form 5/6)
 * Archivo: editarPatrulla.spec.tsx
 * Responsabilidad: «Editar» de una patrulla propia en el cajón estándar (2026-10-31): personal en
 *   borrador y datos comunes, guardados juntos con «Guardar cambios».
 *
 * Patrulla 5 de SALAZAR (IGECU-001, General) y ÁLVAREZ (ITECU-001, Técnico), registrada por el mismo
 * departamento de quien mira. Antes el «Editar» montaba un roster que guardaba cada persona al
 * instante; ahora nada se guarda hasta «Guardar cambios»: primero el personal (`guardarPersonal`, el
 * lote) y después, si cambiaron, los datos comunes (`editarPatrulla`).
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import type { Operativo, PersonaAsignada } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
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
    reemplazarPersonal: vi.fn(),
    guardarPersonal: vi.fn(),
    editarPatrulla: vi.fn(),
    editar: vi.fn(),
  },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));
// El prefijo de cada área sale de los catálogos: General → IGECU, Técnico → ITECU.
vi.mock("../../services/catalogoCuadro.service", () => ({
  CatalogoCuadroService: {
    obtenerCatalogos: vi.fn(() =>
      Promise.resolve({
        zonales: [{ id: 1, codigo: "Z1", nombre: "La Mariscal" }],
        puntos: [{ id: 4, formularioId: 5, nombre: "AMC La Mariscal", zonalId: 1 }],
        tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 5 }],
        instituciones: [{ id: 7, sigla: "AMC", nombre: "AMC", formularioId: 5 }],
        capturaLibrePunto: false,
        capturaLibreTipo: false,
        tipoControlMultiple: false,
        variosPorPersona: true,
        cantidadPorPersona: false,
        puntoManual: false,
        prefijosPorArea: [
          { area: "GENERAL", prefijo: "IGECU" },
          { area: "TECNICO", prefijo: "ITECU" },
        ],
      }),
    ),
    obtenerPuntos: vi.fn(() =>
      Promise.resolve([{ id: 4, formularioId: 5, nombre: "AMC La Mariscal", zonalId: 1 }]),
    ),
  },
}));
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: ["DMIP_INSPECCIONES"], displayName: "Prueba" } }),
}));
vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => ({ cuadro: null, cargando: false, puedeEscribir: true, sinJornada: false }),
}));
vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({ ventana: null, puedeEscribir: true, mensaje: null, horaCierre: null }),
}));

const GRUPO = "8b2e4c1d-3f5a-4e6b-9c7d-1a2b3c4d5e6f";

const persona = (funcionarioId: number, nombre: string, area: string): PersonaAsignada =>
  ({
    funcionarioId,
    nombre,
    area,
    telefono: null,
    cargo: null,
    esResponsable: false,
    asignadoPorRol: "DMIP_INSPECCIONES",
    horaInicio: "08:00",
    horaFin: "16:00",
  }) as PersonaAsignada;

const codigo = (id: number, identificador: string, ocupante: PersonaAsignada): Operativo =>
  ({
    id,
    identificador,
    grupoRegistro: GRUPO,
    esLote: true,
    secuencial: 1,
    cuadroFecha: "2026-10-31",
    esAdicional: false,
    origen: null,
    adicionales: 0,
    formulario: {
      codigo: "ECU",
      nombre: "PATRULLA ECU DIURNA",
      numero: 5,
      colorFondo: "#c62828",
      colorAcento: "#000000",
      colorNombre: "rojo",
      esPatrulla: true,
      condicionanteNoct: false,
      politicaVehiculo: "CONDICIONAL",
      admiteAdicionales: false,
      rolDueno: "DMIP_INSPECCIONES",
      roles: [{ rol: "DMIP_INSPECCIONES", acceso: "ESCRITURA" }],
    },
    horaInicio: "08:00",
    horaFin: "16:00",
    horario: "08H00 A 16H00",
    duracionHoras: 8,
    esNocturno: false,
    cruzaMedianoche: false,
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Mariscal" }],
    puntoEncuentro: { id: 4, nombre: "AMC La Mariscal", zonalNombre: "La Mariscal" },
    puntoLibre: null,
    tipoControl: { id: 30, nombre: "CONTROL DE VENTAS" },
    tipoLibre: null,
    instituciones: [{ id: 7, sigla: "AMC", nombre: "AMC" }],
    personal: [ocupante],
    composicion: { esPatrulla: true, completa: true, areasPendientes: [] },
    estadoTransporte: "PENDIENTE",
    alertaActiva: false,
    alertas: [],
    observaciones: [],
    creadoPorRol: "DMIP_INSPECCIONES",
    creadoPor: 1,
    modificadoPorRol: "DMIP_INSPECCIONES",
    modificadoPor: 1,
    version: 1,
    creadoEn: "2026-10-31T12:00:00.000Z",
  }) as unknown as Operativo;

const SALAZAR = persona(10, "SALAZAR SOTO ANA", "GENERAL");
const ALVAREZ = persona(20, "ALVAREZ RUIZ LUIS", "TECNICO");
const PATRULLA = [
  codigo(1, "IGECU-001-31-OCT-2026", SALAZAR),
  codigo(2, "ITECU-001-31-OCT-2026", ALVAREZ),
];

const candidato = (
  id: number,
  apellidos: string,
  nombres: string,
  area: PersonaElegible["area"],
): PersonaElegible => ({
  id,
  apellidos,
  nombres,
  area,
  cargo: null,
  elegible: true,
  motivo: null,
});

const abrirEdicion = async () => {
  vi.mocked(OperativoService.consultar).mockResolvedValue({
    datos: PATRULLA,
    meta: { total: 2, pagina: 1, tamanio: 200, totalPaginas: 1 },
  });
  vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([
    candidato(30, "MORA", "PEDRO", "GENERAL"),
  ]);
  render(<MisOperativosPage />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Editar IGECU-001 · ITECU-001" }),
  );
  return screen.findByRole("dialog", { name: /Editar operativo/ });
};

describe("Editar patrulla en el cajón estándar (2026-10-31)", () => {
  it("abre el cajón con las dos personas y su código; los códigos en el subtítulo, nunca el grupo", async () => {
    const cajon = await abrirEdicion();

    expect(within(cajon).getByText("IGECU-001-31-OCT-2026 · ITECU-001-31-OCT-2026")).toBeInTheDocument();
    expect(within(cajon).queryByText(GRUPO, { exact: false })).toBeNull();
    expect(within(cajon).getByText("SALAZAR SOTO ANA")).toBeInTheDocument();
    expect(within(cajon).getByText("IGECU-001")).toBeInTheDocument();
    expect(within(cajon).getByText("ITECU-001")).toBeInTheDocument();
    // Con gente, el pie nunca dice «Falta: personal».
    expect(within(cajon).queryByText(/Falta: personal/)).toBeNull();
    expect(within(cajon).getByText(/Sin cambios pendientes/)).toBeInTheDocument();
  });

  it("agregar a una persona no guarda nada hasta «Guardar cambios», y entonces van juntos: primero el lote, después la patrulla", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockResolvedValue({
      ...PATRULLA[0],
      identificadoresDelRegistro: [
        "IGECU-001-31-OCT-2026",
        "IGECU-002-31-OCT-2026",
        "ITECU-001-31-OCT-2026",
      ],
    });
    vi.mocked(OperativoService.editarPatrulla).mockResolvedValue([
      PATRULLA[0],
      codigo(3, "IGECU-002-31-OCT-2026", persona(30, "MORA PEDRO", "GENERAL")),
      PATRULLA[1],
    ]);
    const cajon = await abrirEdicion();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    expect(within(cajon).getByText("Nuevo código IGECU… al guardar")).toBeInTheDocument();
    expect(within(cajon).getByText(/1 cambio sin guardar · \+1 persona/)).toBeInTheDocument();

    // Un cambio en los datos comunes: una nota nueva.
    await userEvent.type(
      within(cajon).getByPlaceholderText("Escriba una nota y pulse Agregar"),
      "Llevar chalecos",
    );
    await userEvent.click(within(cajon).getByRole("button", { name: "Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(OperativoService.editarPatrulla).toHaveBeenCalled());
    expect(OperativoService.guardarPersonal).toHaveBeenCalledWith(
      1,
      [
        { funcionarioId: 10, horaInicio: "08:00", horaFin: "16:00" },
        { funcionarioId: 20, horaInicio: "08:00", horaFin: "16:00" },
        { funcionarioId: 30, horaInicio: "08:00", horaFin: "16:00" },
      ],
      false,
    );
    expect(OperativoService.editarPatrulla).toHaveBeenCalledWith(
      GRUPO,
      expect.objectContaining({ observacionesNuevas: ["Llevar chalecos"] }),
    );
    expect(vi.mocked(OperativoService.guardarPersonal).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(OperativoService.editarPatrulla).mock.invocationCallOrder[0],
    );
    expect(
      await screen.findByText(
        "Operativo actualizado: IGECU-001 · IGECU-002 · ITECU-001",
      ),
    ).toBeInTheDocument();
  });

  it("solo con cambios de personal no se envía el PATCH de la patrulla", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockResolvedValue({
      ...PATRULLA[0],
      identificadoresDelRegistro: ["IGECU-001-31-OCT-2026"],
    });
    const cajon = await abrirEdicion();

    await userEvent.click(within(cajon).getByRole("button", { name: "Retirar a ALVAREZ RUIZ LUIS" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(OperativoService.guardarPersonal).toHaveBeenCalled());
    expect(OperativoService.editarPatrulla).not.toHaveBeenCalled();
    expect(await screen.findByText("Operativo actualizado: IGECU-001")).toBeInTheDocument();
  });

  it("«Cambiar por…» conserva el código: viaja con `reemplazaA`", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockResolvedValue({
      ...PATRULLA[0],
      identificadoresDelRegistro: ["IGECU-001-31-OCT-2026", "ITECU-001-31-OCT-2026"],
    });
    const cajon = await abrirEdicion();

    await userEvent.selectOptions(
      await within(cajon).findByRole("combobox", { name: "Cambiar a SALAZAR SOTO ANA" }),
      "30",
    );
    expect(within(cajon).getByText("IGECU-001 · cambio")).toBeInTheDocument();
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(OperativoService.guardarPersonal).toHaveBeenCalledWith(
        1,
        [
          { funcionarioId: 30, horaInicio: "08:00", horaFin: "16:00", reemplazaA: 10 },
          { funcionarioId: 20, horaInicio: "08:00", horaFin: "16:00" },
        ],
        false,
      ),
    );
  });

  it("si el servidor rechaza a una persona, el motivo va bajo ella, el cajón sigue abierto y no se envía la patrulla", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: {
            codigo: "PERSONA_NO_DISPONIBLE",
            mensaje: "MORA PEDRO ya tiene un operativo a esa hora.",
            detalles: { funcionarioId: 30 },
          },
        },
      },
    });
    const cajon = await abrirEdicion();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    const motivo = await within(cajon).findByText("MORA PEDRO ya tiene un operativo a esa hora.");
    expect(motivo.closest("li")).toHaveTextContent("MORA PEDRO");
    expect(OperativoService.editarPatrulla).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /Editar operativo/ })).toBeInTheDocument();
  });

  it("cerrar con cambios pregunta «¿Descartar cambios?»", async () => {
    const cajon = await abrirEdicion();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("¿Descartar cambios?")).toBeInTheDocument();
  });
});
