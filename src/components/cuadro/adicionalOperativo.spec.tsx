/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: adicionalOperativo.spec.tsx
 * Responsabilidad: Verificar las decisiones del operativo adicional del día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA SUITE PROTEGE UNA EXCEPCIÓN, Y ESO ES LO DELICADO.
 *
 * Un adicional es la ÚNICA escritura del sistema que funciona con la ventana de carga
 * cerrada: se dispone por urgencia el mismo día en que se ejecuta. Lo que aquí se afirma
 * no es que la excepción exista —eso se ve—, sino **dónde termina**:
 *
 *   · la ventana no lo bloquea, pero el cuadro cerrado sí;
 *   · un adicional no engendra adicionales, y el botón desaparece en lugar de apagarse;
 *   · quien lo registra fuera de ventana **se entera de que es una excepción**, porque un
 *     formulario que simplemente funciona a deshora enseña que la ventana no significa nada.
 *
 * Si alguna de estas cae, no habrá ningún error visible: habrá una puerta abierta.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO SE PRUEBA EL MAQUETADO. Que el panel ocupe cuatro columnas a 1440 px se comprueba
 * mirando.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TablaOperativos from "./TablaOperativos.tsx";
import PanelAdicionalOperativo from "./PanelAdicionalOperativo.tsx";
import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import {
  COLUMNAS_LISTADO,
  coincideConFiltros,
} from "../../utils/listadoOperativos.util.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    consultar: vi.fn(),
    crearAdicional: vi.fn(),
    editar: vi.fn(),
    retirar: vi.fn(),
    asignarPersonal: vi.fn(),
    retirarPersonal: vi.fn(),
  },
}));

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));

/**
 * `rolCodes` llegó el 2026-08-25, y no es adorno: desde que P-02 distingue al dueño del
 * formulario de quien solo aporta personal, el botón «Adicional» solo se pinta para el
 * dueño. Sin este código el usuario de prueba no sería dueño de nada y la mitad de estas
 * pruebas fallaría por un motivo que no tiene que ver con lo que comprueban.
 *
 * Es `DMIP_OPERATIVOS` porque el formulario de la fixture es el 2 · PMO, que es suyo.
 */
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({
    user: { rolName: "DMIP Inspecciones", rolCodes: ["DMIP_OPERATIVOS"] },
  }),
}));

/** El cuadro y la ventana se gobiernan desde aquí: son las dos varas del adicional. */
const estado = { cuadroAbierto: true, ventanaAbierta: true };

vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => ({
    cuadro: {
      id: 9,
      fecha: "2026-07-31",
      admiteEscritura: estado.cuadroAbierto,
      estado: estado.cuadroAbierto ? "APROBADO" : "CERRADO",
    },
    cargando: false,
    error: null,
    puedeEscribir: estado.cuadroAbierto,
    sinJornada: false,
    recargar: vi.fn(),
  }),
}));

vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({
    ventana: null,
    cargando: false,
    error: null,
    puedeEscribir: estado.ventanaAbierta,
    mensaje: "Su ventana de carga está cerrada.",
    horaCierre: "14H50",
    recargar: vi.fn(),
  }),
}));

vi.mock("../../hooks/useCatalogosFormulario.ts", () => ({
  useCatalogosFormulario: () => ({
    catalogos: null,
    cargando: false,
    error: null,
    recargar: vi.fn(),
    puntos: [],
    cargandoPuntos: false,
    errorPuntos: null,
    cargarPuntosDeZonal: vi.fn(),
    limpiarPuntos: vi.fn(),
  }),
}));

import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";

const operativo = (parcial: Partial<Operativo> = {}): Operativo => ({
    id: 1,
    identificador: "OCPMO-004-31-JUL-2026",
    secuencial: 4,
    cuadroFecha: "2026-07-31",
    esAdicional: false,
    origen: null,
    adicionales: 0,
    formulario: {
      codigo: "PMO",
      nombre: "PLANIFICACIÓN Y MONITOREO",
      numero: 2,
      colorFondo: "#2e7d32",
      colorAcento: "#000000",
      colorNombre: "verde",
      esPatrulla: false,
      condicionanteNoct: false,
      // 2 · PMO: CONDICIONAL. La DAF decide, asi que el transporte si le aplica.
      politicaVehiculo: "CONDICIONAL",
      // 2 · PMO es hoy el ÚNICO formulario con prefijo de adicional (`OCAPMO`).
      admiteAdicionales: true,
      rolDueno: "DMIP_OPERATIVOS",
      roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" }],
    },
    horaInicio: "09:00",
    horaFin: "18:00",
    horario: "09H00 A 18H00",
    duracionHoras: 9,
    esNocturno: false,
    cruzaMedianoche: false,
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntoEncuentro: { id: 4, nombre: "AMC Matriz", zonalNombre: "La Delicia" },
    puntoLibre: null,
    tipoControl: { id: 30, nombre: "CONTROL DE VENTAS" },
    tipoLibre: null,
    instituciones: [],
    personal: [],
    composicion: { esPatrulla: false, completa: true, areasPendientes: [] },
    estadoTransporte: "PENDIENTE",
    alertaActiva: false,
    alertas: [],
    observaciones: null,
    creadoPorRol: "DMIP_OPERATIVOS",
    creadoPor: 1,
    modificadoPorRol: "DMIP_OPERATIVOS",
    modificadoPor: 1,
    version: 1,
    creadoEn: "2026-07-31T12:00:00.000Z",
    ...parcial,
  });

/** El adicional que nació del anterior. */
const ADICIONAL = operativo({
  id: 2,
  identificador: "OCAPMO-001-31-JUL-2026",
  secuencial: 1,
  esAdicional: true,
  origen: { id: 1, identificador: "OCPMO-004-31-JUL-2026" },
});

const pintarPantalla = async (filas: Operativo[] = [operativo()]) => {
  vi.mocked(OperativoService.consultar).mockResolvedValue({
    datos: filas,
    meta: {
      pagina: 1,
      tamanio: 200,
      total: filas.length,
      totalPaginas: 1,
    },
  });

  render(<MisOperativosPage />);
  await screen.findByText("OCPMO-004-31-JUL-2026");
};

describe("el adicional en el listado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.cuadroAbierto = true;
    estado.ventanaAbierta = true;
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([]);
  });

  /**
   * REGLA 6 DE CLAUDE.md, y en un sistema llamado *cuadro de colores* exige atención
   * deliberada: de qué nació un adicional se escribe con palabras, no con un matiz.
   */
  it("la fila dice de qué operativo nació", () => {
    render(
      <TablaOperativos
        operativos={[ADICIONAL]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(screen.getByText("OCAPMO-001-31-JUL-2026")).toBeInTheDocument();
    expect(
      screen.getByText("Adicional de OCPMO-004-31-JUL-2026"),
    ).toBeInTheDocument();
  });

  /**
   * SE FILTRA EXACTAMENTE LO QUE SE VE, que es la invariante de
   * `listadoOperativos.util.ts`. Como consecuencia útil: buscar el original encuentra
   * también sus adicionales, que es la pregunta que alguien se hace mirando el cuadro.
   */
  it("filtrar por el original encuentra también su adicional", () => {
    const filtro = { identificador: "OCPMO-004" };

    expect(coincideConFiltros(operativo(), filtro)).toBe(true);
    expect(coincideConFiltros(ADICIONAL, filtro)).toBe(true);
  });

  it("un operativo ordinario no dice nada de orígenes", () => {
    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(screen.queryByText(/Adicional de/)).toBeNull();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS DOS VARAS · el corazón del cambio.
 *
 * Editar y retirar exigen ventana abierta **y** cuadro abierto. El adicional solo exige
 * cuadro abierto. Estas cuatro pruebas son las que caerían si alguien «unificara» las dos
 * condiciones, y su caída no produciría ningún error visible en la aplicación.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("la ventana cerrada no bloquea el adicional, el cuadro cerrado sí", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.cuadroAbierto = true;
    estado.ventanaAbierta = true;
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([]);
  });

  it("con la ventana cerrada, «Editar» y «Retirar» se apagan y «Adicional» no", async () => {
    estado.ventanaAbierta = false;
    await pintarPantalla();

    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retirar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adicional" })).toBeEnabled();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * SOLO DONDE EL FORMULARIO LOS ADMITE. RN-61, fijado el 2026-08-24.
   *
   * La fixture de esta tanda es el **2 · PMO**, que es hoy el único formulario con
   * prefijo de adicional (`OCAPMO`). En los otros ocho el servidor rechazaba la creación
   * con un mensaje redactado, y la pantalla ofrecía el botón igual: se pulsaba y fallaba.
   *
   * DESAPARECE, NO SE APAGA. Un botón apagado insinúa que en otras circunstancias se
   * podría, y en un formulario sin prefijo de adicional no se podrá nunca — a diferencia
   * del cuadro cerrado, que sí es una circunstancia.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("en un formulario que no admite adicionales, el botón no está", async () => {
    await pintarPantalla([
      operativo({
        formulario: {
          ...operativo().formulario,
          codigo: "FIJOS",
          nombre: "OPERATIVOS DE CONTROL FIJOS",
          numero: 1,
          admiteAdicionales: false,
        },
      }),
    ]);

    expect(screen.queryByRole("button", { name: "Adicional" })).toBeNull();
    // Y lo demás sigue estando: la restricción es solo del adicional.
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  /**
   * Ventana y cuadro cerrado son cosas distintas. Reabrir el cuadro es potestad de la
   * Dirección, y es quien debe enterarse de que algo se sale de lo que ya aprobó.
   */
  it("con el cuadro cerrado, «Adicional» también se apaga y dice por qué", async () => {
    estado.cuadroAbierto = false;
    await pintarPantalla();

    const boton = screen.getByRole("button", { name: "Adicional" });

    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute(
      "title",
      expect.stringContaining("cerrado por la Dirección"),
    );
  });

  /**
   * NO SE ENCADENAN. El botón DESAPARECE en vez de aparecer apagado: «apagado» insinúa
   * que en otras circunstancias se podría, y aquí nunca.
   */
  it("sobre un adicional no se ofrece crear otro adicional", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue({
      datos: [operativo(), ADICIONAL],
      meta: { pagina: 1, tamanio: 200, total: 2, totalPaginas: 1 },
    });

    render(<MisOperativosPage />);
    await screen.findByText("OCAPMO-001-31-JUL-2026");

    const filas = screen.getAllByRole("row");
    const filaDelAdicional = filas.find((fila) =>
      within(fila).queryByText("OCAPMO-001-31-JUL-2026"),
    );

    expect(filaDelAdicional).toBeDefined();
    expect(
      within(filaDelAdicional as HTMLElement).queryByRole("button", {
        name: "Adicional",
      }),
    ).toBeNull();
    // Y el original sí lo ofrece: la ausencia es del adicional, no de la pantalla.
    expect(screen.getAllByRole("button", { name: "Adicional" })).toHaveLength(1);
  });

  it("abrir el panel lo titula con el operativo del que nace", async () => {
    estado.ventanaAbierta = false;
    await pintarPantalla();

    await userEvent.click(screen.getByRole("button", { name: "Adicional" }));

    expect(
      screen.getByText("Operativo adicional de OCPMO-004-31-JUL-2026"),
    ).toBeInTheDocument();
  });
});

describe("el panel del adicional", () => {
  const propiedades = {
    origen: operativo(),
    catalogos: null,
    puntos: [],
    cargandoPuntos: false,
    onZonalElegida: vi.fn(),
    onHorarioElegido: vi.fn(),
    candidatos: [],
    cargandoPersonal: false,
    personalAgregado: [],
    onAgregarPersona: vi.fn(),
    onRetirarPersona: vi.fn(),
    avisoPersonal: null,
    bloqueado: false,
    guardando: false,
    onGuardar: vi.fn(),
    onCancelar: vi.fn(),
  };

  /**
   * QUE ESTO SEA UNA EXCEPCIÓN SE DICE, y antes de capturar. Un formulario que
   * simplemente funciona a deshora enseña que la ventana no significa nada, y la ventana
   * es lo que sostiene que el cuadro esté armado antes de la jornada.
   */
  it("con la ventana cerrada, avisa de que es una excepción y queda constancia", () => {
    render(
      <PanelAdicionalOperativo
        {...propiedades}
        ventanaCerrada
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /queda\s+constancia en la auditoría/,
    );
  });

  it("con la ventana abierta no hay nada excepcional que avisar", () => {
    render(
      <PanelAdicionalOperativo
        {...propiedades}
        ventanaCerrada={false}
      />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("el botón principal dice lo que hace, no «Guardar»", () => {
    render(
      <PanelAdicionalOperativo
        {...propiedades}
        ventanaCerrada={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Registrar adicional" }),
    ).toBeInTheDocument();
  });

  /**
   * LAS OBSERVACIONES NO SE HEREDAN: describen el operativo original, no éste, y
   * arrastrarlas produciría un adicional que dice cosas que no le corresponden. El resto
   * de los valores sí llega copiado, para no volver a capturarlo con prisa.
   */
  it("no arrastra las observaciones del operativo original", () => {
    render(
      <PanelAdicionalOperativo
        {...propiedades}
        origen={operativo({
          observaciones: "Coordinado con la AMT desde el lunes.",
        })}
        ventanaCerrada={false}
      />,
    );

    expect(
      screen.getByPlaceholderText(
        "Coordinaciones, novedades o detalles del operativo",
      ),
    ).toHaveValue("");
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HEREDAR EL EQUIPO DEL OPERATIVO ORIGINAL · 2026-08-21
 *
 * La primera versión NO heredaba el personal, razonando que cada persona tiene su propio
 * veredicto de descanso. El razonamiento era correcto y la conclusión equivocada: en un
 * adicional lo habitual es que siga el mismo equipo, y volver a elegirlo bajo la prisa de
 * una urgencia es lo que la meta de «dos o tres minutos» quiere evitar.
 *
 * LO QUE SE PROTEGE AQUÍ ES QUE HEREDAR NO SALTE NINGUNA COMPROBACIÓN. Si esto cayera, el
 * panel agregaría a gente que a esa hora no puede salir, el servidor rechazaría el
 * conjunto entero —es todo o nada— y quien captura no entendería por qué.
 *
 * Y sobre todo: que a quien no se puede heredar **se le nombre**. Dejarlo caer en
 * silencio produciría un adicional con menos gente de la que se creía haber puesto, y
 * nadie lo notaría hasta el día del operativo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("heredar el personal del operativo original", () => {
  const elegible = (id: number, apellidos: string) => ({
    id,
    apellidos,
    nombres: "JUAN",
    area: "OPERATIVOS" as const,
    cargo: null,
    elegible: true,
    motivo: null,
  });

  const rechazado = (id: number, apellidos: string, motivo: string) => ({
    ...elegible(id, apellidos),
    elegible: false,
    motivo,
  });

  const conEquipo = (personal: { funcionarioId: number; nombre: string }[]) =>
    operativo({
      personal: personal.map((persona) => ({
        ...persona,
        area: "OPERATIVOS",
        telefono: null,
        esResponsable: false,
        asignadoPorRol: "DMIP_OPERATIVOS" as const,
      })),
    } as Partial<Operativo>);

  const propiedades = {
    catalogos: null,
    puntos: [],
    cargandoPuntos: false,
    onZonalElegida: vi.fn(),
    onHorarioElegido: vi.fn(),
    cargandoPersonal: false,
    personalAgregado: [],
    onRetirarPersona: vi.fn(),
    avisoPersonal: null,
    bloqueado: false,
    ventanaCerrada: false,
    guardando: false,
    onGuardar: vi.fn(),
    onCancelar: vi.fn(),
  };

  it("dice a quién lleva el operativo original, para que se decida con criterio", () => {
    render(
      <PanelAdicionalOperativo
        {...propiedades}
        origen={conEquipo([{ funcionarioId: 1, nombre: "REDROVÁN JUAN" }])}
        candidatos={[elegible(1, "REDROVÁN")]}
        onAgregarPersona={vi.fn()}
      />,
    );

    // El nombre aparece también en el selector de personal de abajo: basta con que el
    // panel de herencia lo nombre, que es lo que se está comprobando.
    expect(screen.getAllByText(/REDROVÁN JUAN/).length).toBeGreaterThan(0);
  });

  /**
   * Fija el horario del adicional, que es lo que dispara la herencia.
   *
   * El horario nace en blanco a propósito: copiarlo del padre haría que el equipo
   * heredado chocara consigo mismo (RN-28). Hasta que se elige, no hay contra qué
   * comprobar la elegibilidad y no se hereda a nadie.
   */
  const elegirHorario = async () => {
    await userEvent.selectOptions(
      screen.getByLabelText(/Hora de inicio/),
      "17:00",
    );
    await userEvent.selectOptions(screen.getByLabelText(/Hora de fin/), "21:00");
  };

  /**
   * ES AUTOMÁTICO, NO UN BOTÓN. Un adicional hereda los recursos del operativo del que
   * nace: es lo que define la figura, no una comodidad. Esta prueba es la que caería si
   * alguien volviera a ponerlo tras una pulsación.
   */
  it("hereda el equipo solo, en cuanto se fija el horario", async () => {
    const agregar = vi.fn();

    render(
      <PanelAdicionalOperativo
        {...propiedades}
        origen={conEquipo([
          { funcionarioId: 1, nombre: "REDROVÁN JUAN" },
          { funcionarioId: 2, nombre: "PAREDES ANA" },
        ])}
        candidatos={[elegible(1, "REDROVÁN"), elegible(2, "PAREDES")]}
        onAgregarPersona={agregar}
      />,
    );

    // Sin horario no se hereda a nadie: no hay contra qué comprobar.
    expect(agregar).not.toHaveBeenCalled();

    await elegirHorario();

    expect(agregar).toHaveBeenCalledTimes(2);
  });

  /**
   * LA COMPROBACIÓN NO SE SALTA. Quien no puede salir a esa hora **no se agrega**, aunque
   * estuviera en el operativo original. Es la prueba que impide que heredar se convierta
   * en un atajo para meter gente que el servidor rechazaría.
   */
  it("NO hereda a quien el servidor declara no elegible, y dice por qué", async () => {
    const agregar = vi.fn();

    render(
      <PanelAdicionalOperativo
        {...propiedades}
        origen={conEquipo([
          { funcionarioId: 1, nombre: "REDROVÁN JUAN" },
          { funcionarioId: 2, nombre: "PAREDES ANA" },
        ])}
        candidatos={[
          elegible(1, "REDROVÁN"),
          rechazado(
            2,
            "PAREDES",
            "PAREDES ANA ya figura en otro operativo de 14H00 a 18H00.",
          ),
        ]}
        onAgregarPersona={agregar}
      />,
    );

    await elegirHorario();

    expect(agregar).toHaveBeenCalledTimes(1);
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    // El motivo del servidor, tal cual (regla 7).
    // El motivo se repite en el selector de abajo; lo que importa es que el aviso de
    // herencia lo diga con el nombre de la persona.
    expect(
      screen.getAllByText(/ya figura en otro operativo de 14H00 a 18H00/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("PAREDES ANA")).toBeInTheDocument();
  });

  /**
   * Quien ya no está en la lista se trata como rechazado y no como ausente: puede haberse
   * dado de baja del maestro o cambiado de área, y callarlo dejaría el equipo incompleto.
   */
  it("a quien ya no figura entre los elegibles también se le nombra", async () => {
    render(
      <PanelAdicionalOperativo
        {...propiedades}
        origen={conEquipo([{ funcionarioId: 9, nombre: "SALAZAR LUIS" }])}
        candidatos={[]}
        onAgregarPersona={vi.fn()}
      />,
    );

    await elegirHorario();

    expect(
      screen.getByText(/Ya no figura entre el personal elegible/),
    ).toBeInTheDocument();
  });

  /** Sin equipo en el original no hay nada que heredar, y el control no aparece. */
  it("si el operativo original no lleva personal, no se ofrece heredar", () => {
    render(
      <PanelAdicionalOperativo
        {...propiedades}
        origen={operativo()}
        candidatos={[]}
        onAgregarPersona={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /heredar/i })).toBeNull();
  });
});
