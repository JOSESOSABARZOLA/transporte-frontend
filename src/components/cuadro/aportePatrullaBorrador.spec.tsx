/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Aporte de personal
 * Archivo: aportePatrullaBorrador.spec.tsx
 * Responsabilidad: Fijar que el aporte a la PATRULLA (Form 6) también se confirma con «Guardar
 *                  cambios», en Mis operativos y en la Jornada, y que todo formulario con Personal
 *                  de Instrucción aportado (4 y 6) abre el mismo cajón con borrador.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-29
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HASTA EL 2026-10-29 LA PATRULLA GUARDABA CADA CÓDIGO EN SU CLIC. «+ Agregar» era un `POST` que
 * creaba el INECU al instante, el cajón solo tenía «Cerrar» y su título era el `grupoRegistro` (un
 * UUID). Ahora agregar toca el borrador, la persona dice qué código tendrá («Nuevo código INECU… al
 * guardar») y «Guardar cambios» envía el registro entero en una llamada (`guardarPersonal`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import PanelPersonalJornada from "../jornada/PanelPersonalJornada.tsx";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
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
// El prefijo de cada área sale de los catálogos: Instrucción → INECU.
vi.mock("../../services/catalogoCuadro.service", () => ({
  CatalogoCuadroService: {
    obtenerCatalogos: vi.fn(() =>
      Promise.resolve({
        zonales: [],
        puntos: [],
        tiposControl: [],
        instituciones: [],
        capturaLibrePunto: false,
        capturaLibreTipo: false,
        tipoControlMultiple: false,
        variosPorPersona: true,
        cantidadPorPersona: false,
        puntoManual: false,
        prefijosPorArea: [
          { area: "GENERAL", prefijo: "IGNECU" },
          { area: "INSTRUCCION", prefijo: "INECU" },
        ],
      }),
    ),
    obtenerPuntos: vi.fn(() => Promise.resolve([])),
  },
}));
// Quien mira es el DMIT: APORTA al Form 6, que registra DMIP Inspecciones.
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: ["DMIT_INSTRUCTOR"], displayName: "Prueba" } }),
}));
vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => ({ cuadro: null, cargando: false, puedeEscribir: true, sinJornada: false }),
}));
vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({ ventana: null, puedeEscribir: true, mensaje: null, horaCierre: null }),
}));

const GRUPO = "5f0c1d7e-9a7b-4c1e-8d6a-3b2f1e0a9c11";

const persona = (
  funcionarioId: number,
  nombre: string,
  area: string,
  asignadoPorRol: string,
): PersonaAsignada =>
  ({
    funcionarioId,
    nombre,
    area,
    telefono: null,
    cargo: null,
    esResponsable: false,
    asignadoPorRol,
    horaInicio: "18:00",
    horaFin: "23:00",
  }) as PersonaAsignada;

const formulario = (numero: number, codigo: string, esPatrulla: boolean, rolDueno: string) => ({
  codigo,
  nombre: codigo === "REACN" ? "PATRULLA ECU NOCTURNA" : "PATRULLA ECU DIURNA",
  numero,
  colorFondo: "#c62828",
  colorAcento: "#000000",
  colorNombre: "rojo",
  esPatrulla,
  condicionanteNoct: false,
  politicaVehiculo: "CONDICIONAL",
  admiteAdicionales: false,
  rolDueno,
  roles: [
    { rol: rolDueno, acceso: "ESCRITURA" },
    { rol: "DMIT_INSTRUCTOR", acceso: "APORTA" },
  ],
});

/** Un código de la patrulla, con su única persona. */
const codigo = (
  id: number,
  identificador: string,
  ocupante: PersonaAsignada,
  creadoPorRol: string,
): Operativo =>
  ({
    id,
    identificador,
    grupoRegistro: GRUPO,
    esLote: true,
    secuencial: 1,
    cuadroFecha: "2026-10-30",
    esAdicional: false,
    origen: null,
    adicionales: 0,
    formulario: formulario(6, "REACN", true, "DMIP_INSPECCIONES"),
    horaInicio: "18:00",
    horaFin: "23:00",
    horario: "18H00 A 23H00",
    duracionHoras: 5,
    esNocturno: true,
    cruzaMedianoche: false,
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntoEncuentro: { id: 4, nombre: "AMC Matriz", zonalNombre: "La Delicia" },
    puntoLibre: null,
    tipoControl: { id: 30, nombre: "ALERTAS ECU 911" },
    tipoLibre: null,
    instituciones: [{ id: 7, sigla: "AMC", nombre: "AMC" }],
    personal: [ocupante],
    composicion: { esPatrulla: true, completa: true, areasPendientes: [] },
    estadoTransporte: "PENDIENTE",
    alertaActiva: false,
    alertas: [],
    observaciones: [],
    creadoPorRol,
    creadoPor: 1,
    modificadoPorRol: creadoPorRol,
    modificadoPor: 1,
    version: 1,
    creadoEn: "2026-10-29T12:00:00.000Z",
  }) as unknown as Operativo;

const INSPECTOR = persona(3, "PEREZ ANA", "GENERAL", "DMIP_INSPECCIONES");
const INSTRUCTOR = persona(4, "LOPEZ LUIS", "INSTRUCCION", "DMIT_INSTRUCTOR");
const IGNECU = codigo(10, "IGNECU-001-30-OCT-2026", INSPECTOR, "DMIP_INSPECCIONES");
const INECU = codigo(11, "INECU-001-30-OCT-2026", INSTRUCTOR, "DMIT_INSTRUCTOR");

const INSTRUCTORA = {
  id: 41,
  apellidos: "YUNDA",
  nombres: "JESSICA",
  area: "INSTRUCCION",
  cargo: "Instructora",
  elegible: true,
  motivo: null,
};

const META = { total: 2, pagina: 1, tamanio: 200, totalPaginas: 1 };

/** Abre «Agregar personal» de la patrulla en Mis operativos y devuelve el cajón. */
const abrirAporte = async (operativos: Operativo[] = [IGNECU, INECU]) => {
  vi.mocked(OperativoService.consultar).mockResolvedValue({ datos: operativos, meta: META });
  vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([INSTRUCTORA] as never);
  render(<MisOperativosPage />);
  // La acción principal de la fila (puede repetirse en el menú de la fila).
  await userEvent.click((await screen.findAllByRole("button", { name: /^Agregar personal/ }))[0]);
  return screen.findByRole("dialog", { name: /^Personal de/ });
};

describe("Aporte a la patrulla · se confirma con «Guardar cambios» (2026-10-29)", () => {
  it("el título es «Personal de patrulla» con sus códigos, sin el grupoRegistro", async () => {
    const cajon = await abrirAporte();

    expect(cajon).toHaveAccessibleName("Personal de patrulla");
    expect(cajon.textContent).not.toContain(GRUPO);
    expect(
      within(cajon).getByText("IGNECU-001-30-OCT-2026 · INECU-001-30-OCT-2026"),
    ).toBeInTheDocument();
    // La persona del dueño llega en lectura; la del DMIT, editable.
    expect(within(cajon).getByText("Del dueño del formulario · lectura")).toBeInTheDocument();
    expect(within(cajon).queryByRole("button", { name: "Retirar a PEREZ ANA" })).toBeNull();
    expect(within(cajon).getByRole("button", { name: "Retirar a LOPEZ LUIS" })).toBeInTheDocument();
  });

  it("agregar NO llama al servidor: la persona dice qué código tendrá al guardar", async () => {
    const cajon = await abrirAporte();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));

    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    expect(OperativoService.guardarPersonal).not.toHaveBeenCalled();
    expect(within(cajon).getByText("Nuevo código INECU… al guardar")).toBeInTheDocument();
    expect(within(cajon).getByText("1 cambio sin guardar · +1 persona")).toBeInTheDocument();
    expect(within(cajon).queryByText(/se guarda (al instante|en el momento)/i)).toBeNull();
  });

  it("sin cambios, «Guardar cambios» está apagado", async () => {
    const cajon = await abrirAporte();

    expect(within(cajon).getByText("Sin cambios pendientes")).toBeInTheDocument();
    expect(within(cajon).getByRole("button", { name: "Guardar cambios" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("«Guardar cambios» envía el registro entero en UNA llamada y nombra a la patrulla", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockResolvedValue({
      ...IGNECU,
      identificadoresDelRegistro: [
        "IGNECU-001-30-OCT-2026",
        "INECU-001-30-OCT-2026",
        "INECU-002-30-OCT-2026",
      ],
    } as Operativo);
    const cajon = await abrirAporte();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(OperativoService.guardarPersonal).toHaveBeenCalledTimes(1));
    expect(OperativoService.guardarPersonal).toHaveBeenCalledWith(
      10,
      [
        { funcionarioId: 3, horaInicio: "18:00", horaFin: "23:00" },
        { funcionarioId: 4, horaInicio: "18:00", horaFin: "23:00" },
        { funcionarioId: 41, horaInicio: "18:00", horaFin: "23:00" },
      ],
      false,
    );
    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Personal guardado: 3 personas en la patrulla IGNECU-001-30-OCT-2026 · INECU-001-30-OCT-2026 · INECU-002-30-OCT-2026",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Personal de patrulla" })).toBeNull(),
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

    const motivo = await within(cajon).findByText(
      "YUNDA JESSICA ya tiene un operativo a esa hora.",
    );
    expect(motivo.closest("li")).toHaveTextContent("YUNDA JESSICA");
    expect(within(cajon).getByText("Nuevo código INECU… al guardar")).toBeInTheDocument();
    expect(screen.queryByText(/Personal guardado/)).toBeNull();
  });

  it("cerrar con cambios pide confirmación", async () => {
    const cajon = await abrirAporte();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("¿Descartar cambios?")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Personal de patrulla" })).toBeInTheDocument();
  });
});

/**
 * TODO FORMULARIO CON PERSONAL DE INSTRUCCIÓN APORTADO abre el mismo cajón: hoy el 4 (operativo
 * simple) y el 6 (patrulla). La variante la deciden las banderas del registro, no el número.
 */
describe.each([
  {
    caso: "Form 4 · operativo simple",
    operativos: [
      {
        ...IGNECU,
        id: 20,
        identificador: "OCECU-001-30-OCT-2026",
        grupoRegistro: "registro-suelto",
        esLote: false,
        formulario: formulario(4, "ECU", true, "DMIP_OPERATIVOS"),
        creadoPorRol: "DMIP_OPERATIVOS",
        personal: [{ ...INSPECTOR, asignadoPorRol: "DMIP_OPERATIVOS" }],
      } as unknown as Operativo,
    ],
    titulo: "Personal de operativo OCECU-001-30-OCT-2026",
  },
  { caso: "Form 6 · patrulla", operativos: [IGNECU, INECU], titulo: "Personal de patrulla" },
])("$caso admite Instrucción aportada", ({ operativos, titulo }) => {
  it("el cajón muestra «Guardar cambios» y no guarda al instante", async () => {
    const cajon = await abrirAporte(operativos);

    expect(cajon).toHaveAccessibleName(titulo);
    expect(within(cajon).getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(within(cajon).queryByText(/Se guarda al instante/)).toBeNull();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
  });
});

describe("Jornada · el aporte a la patrulla también va al borrador (2026-10-29)", () => {
  const fila = (operativo: Operativo) =>
    ({
      id: operativo.id,
      identificador: operativo.identificador,
      grupoRegistro: GRUPO,
      esLote: true,
      horario: "18H00 A 23H00",
      personal: [],
      areasPendientesDelRol: [],
      composicionPorInformar: [],
      alertas: [],
    }) as unknown as FilaJornada;
  const SECCION = {
    numero: 6,
    codigo: "REACN",
    nombre: "Patrulla ECU Nocturna",
    acceso: "APORTA",
    puedeEditarPersonal: true,
    filas: [fila(IGNECU), fila(INECU)],
  } as unknown as SeccionJornada;

  it("pinta a todo el registro y guarda los códigos nuevos en UNA llamada", async () => {
    vi.mocked(OperativoService.obtener).mockImplementation((id: number) =>
      Promise.resolve(id === 10 ? IGNECU : INECU),
    );
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([INSTRUCTORA] as never);
    vi.mocked(OperativoService.guardarPersonal).mockResolvedValue({
      ...IGNECU,
      identificadoresDelRegistro: ["IGNECU-001-30-OCT-2026", "INECU-001-30-OCT-2026", "INECU-002-30-OCT-2026"],
    } as Operativo);
    const onCerrar = vi.fn();
    render(
      <PanelPersonalJornada
        fila={fila(IGNECU)}
        seccion={SECCION}
        fecha="2026-10-30"
        roles={["DMIT_INSTRUCTOR"]}
        motivoBloqueo={null}
        onCerrar={onCerrar}
        onCambio={vi.fn()}
      />,
    );

    const cajon = await screen.findByRole("dialog", { name: "Personal de patrulla" });
    expect(cajon.textContent).not.toContain(GRUPO);
    expect(await within(cajon).findByText("LOPEZ LUIS")).toBeInTheDocument();

    await userEvent.click(await within(cajon).findByRole("button", { name: "+ Agregar" }));
    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
    expect(OperativoService.guardarPersonal).toHaveBeenCalledTimes(1);
    expect(OperativoService.guardarPersonal).toHaveBeenCalledWith(
      10,
      expect.arrayContaining([expect.objectContaining({ funcionarioId: 41 })]),
      false,
    );
  });
});
