/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: misOperativos.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * SE PRUEBAN LAS DECISIONES, NO EL MAQUETADO. Que la tabla se desplace a 375 px se
 * comprueba mirando; que el estado lleve **texto además de color**, que la confirmación
 * nombre el operativo que se va a retirar y que el vacío por filtro diga algo distinto
 * del vacío por falta de datos son reglas, y esas sí se afirman aquí.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import TablaOperativos from "./TablaOperativos.tsx";
import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";

// El rango de P-02 viaja en la URL (2026-10-13): cada prueba arranca sin él.
beforeEach(() => window.history.replaceState(null, "", "/"));

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    // Rango de P-02 (2026-10-13): sin respuesta, rige el vigente calculado en la pantalla.
    rango: vi.fn(() => new Promise(() => {})),
    consultar: vi.fn(),
    actualizar: vi.fn(),
    retirar: vi.fn(),
    crearAdicional: vi.fn(),
    obtener: vi.fn(),
    asignarPersonal: vi.fn(),
    retirarPersonal: vi.fn(),
    actualizarTurnoPersonal: vi.fn(),
    editar: vi.fn(),
  },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: ["DMIP_OPERATIVOS"], displayName: "Prueba" } }),
}));
vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => ({ cuadro: null, cargando: false, puedeEscribir: true, sinJornada: false }),
}));
vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({ ventana: null, puedeEscribir: true, mensaje: null, horaCierre: null }),
}));
import {
  COLUMNAS_FILTRABLES,
  COLUMNAS_LISTADO,
  COLUMNAS_SESION,
  MENSAJE_DEL_RETIRO,
  filtrarOperativos,
  tituloDelRetiro,
} from "../../utils/listadoOperativos.util.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";

const operativo = (parcial: Partial<Operativo> = {}): Operativo => ({
    id: 1,
    identificador: "IG-002-31-JUL-2026",
    grupoRegistro: null,
    secuencial: 2,
    cuadroFecha: "2026-07-31",
    // Los tres del operativo adicional. Faltaban, y el `as Operativo` que llevaba esta
    // fixture lo tapaba: se retiró el 2026-08-24 al añadir `politicaVehiculo`.
    esAdicional: false,
    origen: null,
    adicionales: 0,
    formulario: {
      codigo: "IG",
      nombre: "Inspecciones Técnicas y Generales",
      numero: 8,
      colorFondo: "#2e7d32",
      colorAcento: "#000000",
      colorNombre: "verde",
      esPatrulla: false,
      condicionanteNoct: false,
      // 8 · INSP: OBLIGATORIO. Es el formulario que la fixture representa.
      politicaVehiculo: "OBLIGATORIO",
      // 8 · INSP no tiene prefijo de adicional: `IGA` e `ITA` son ordinarios.
      admiteAdicionales: false,
      // El 8 · INSP es de DMIP Inspecciones, pero el usuario de prueba es DMIP
      // Operativos: se pone como responsable para que estas pruebas sigan mirando lo
      // que miran —el listado y sus acciones— y no el permiso, que tiene sus propias
      // pruebas en `aporteCompartido.spec.tsx`.
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
    alertaActiva: true,
    alertas: [],
    observaciones: [],
    creadoPorRol: "DMIP_INSPECCIONES",
    creadoPor: 1,
    modificadoPorRol: "DMIP_INSPECCIONES",
    modificadoPor: 1,
    version: 1,
    creadoEn: "2026-07-31T12:00:00.000Z",
    ...parcial,
  });

describe("caso 6 · el estado de transporte lleva texto además de color", () => {
  it("se lee «Pendiente», no solo un distintivo amarillo", () => {
    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    const distintivo = screen.getByText("Pendiente");

    expect(distintivo).toBeInTheDocument();
    // Regla 6 de CLAUDE.md: el color acompaña a la palabra, nunca la sustituye.
    expect(distintivo.className).toContain("badge");
  });

  it("cada estado tiene su palabra propia", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({ id: 1, estadoTransporte: "ASIGNADO" }),
          operativo({ id: 2, estadoTransporte: "PROPIOS_MEDIOS" }),
        ]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(screen.getByText("Asignado")).toBeInTheDocument();
    expect(screen.getByText("Propios medios")).toBeInTheDocument();
  });
});

describe("la alerta de conductor se explica con texto (RN-40)", () => {
  // Compacta desde el 2026-10-13: el distintivo «Sin conductor» (sin icono) y la explicación en el `title`.
  it("sin conductor, un distintivo ámbar con su explicación, no el texto largo", () => {
    const conAlerta = operativo({
      alertas: [
        {
          codigo: "ALV-02",
          campo: "conductor",
          mensaje: "Falta asignar conductor. Lo hace la DAF.",
          critica: false,
        },
      ],
    });

    render(
      <TablaOperativos
        operativos={[conAlerta]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    const distintivo = screen.getByText("Sin conductor");
    expect(distintivo).toHaveClass("badge-warning");
    // Sin icono de alarma (2026-10-13): solo la palabra.
    expect(distintivo.textContent).toBe("Sin conductor");
    expect(distintivo).toHaveAttribute(
      "title",
      "La DAF todavía no ha asignado conductor a este operativo.",
    );
    expect(screen.queryByText("Falta asignar conductor. Lo hace la DAF.")).toBeNull();
    // Sin fondo de celda: el color está en el distintivo.
    expect(distintivo.closest("td")?.className).not.toContain("bg-warning");
  });

  it("con conductor asignado, nombre y placa en dos líneas", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            estadoTransporte: "ASIGNADO",
            transporteAsignado: [{ conductor: "PÉREZ JUAN", placa: "PEA-1234" }],
          }),
        ]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(screen.getByText("PÉREZ JUAN")).toHaveClass("block");
    expect(screen.getByText("PEA-1234")).toHaveClass("block");
    expect(screen.queryByText("Sin conductor")).toBeNull();
  });
});

/** Ajustes menores de anchos (2026-10-13): nada se parte ni desborda su cápsula. */
describe("anchos de Mis operativos · una sola línea donde corresponde", () => {
  const conPersona = (telefono: string | null): Operativo => {
    const base = operativo();
    const [persona] = base.personal;
    return operativo({
      personal: [{ ...persona, nombre: "AGUIRRE NOVILLO FLAVIO", telefono }],
    });
  };

  it("«Sin conductor» va en una línea, con su relleno, y la columna tiene mínimo de 130 px", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            alertas: [
              { codigo: "ALV-02", campo: "conductor", mensaje: "x", critica: false },
            ],
          }),
        ]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    const distintivo = screen.getByText("Sin conductor");
    expect(distintivo).toHaveClass("whitespace-nowrap", "px-2", "py-0.5");
    expect(screen.getByRole("columnheader", { name: "Conductor" })).toHaveClass(
      "min-w-[130px]",
    );
  });

  it("el identificador va en una línea y su columna tiene mínimo de 170 px", () => {
    render(
      <TablaOperativos
        operativos={[operativo({ identificador: "OCPMO-002-13-OCT-2026" })]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(screen.getByText("OCPMO-002-13-OCT-2026")).toHaveClass("whitespace-nowrap");
    expect(screen.getByRole("columnheader", { name: "Identificador" })).toHaveClass(
      "min-w-[170px]",
    );
  });

  /** Teléfono en su columna (2026-10-13): debajo del nombre no se distinguía. */
  it("P-02 lleva la columna Teléfono, justo después de Personal", () => {
    render(
      <TablaOperativos operativos={[conPersona("0991234567")]} columnas={COLUMNAS_LISTADO} />,
    );

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.trim());
    expect(encabezados[encabezados.indexOf("Personal") + 1]).toBe("Teléfono");
    expect(screen.getByRole("columnheader", { name: "Teléfono" })).toHaveClass("w-24");
  });

  it("el teléfono va en su celda, no debajo del nombre, a 12 px y monoespaciado", () => {
    render(
      <TablaOperativos operativos={[conPersona("0991234567")]} columnas={COLUMNAS_LISTADO} />,
    );

    const numero = screen.getByText("0991234567");
    expect(screen.getAllByText("0991234567")).toHaveLength(1);
    expect(numero).toHaveClass("font-mono");
    expect(numero.closest("td")).toHaveClass("text-xs", "whitespace-nowrap");
    expect(numero.closest("td")).not.toBe(
      screen.getByText("AGUIRRE NOVILLO FLAVIO").closest("td"),
    );
  });

  it("sin teléfono dice «Sin teléfono» en gris, en la columna Teléfono", () => {
    render(
      <TablaOperativos operativos={[conPersona(null)]} columnas={COLUMNAS_LISTADO} />,
    );

    const falta = screen.getByText("Sin teléfono");
    expect(falta).toHaveClass("text-app-muted");
    expect(falta).not.toHaveClass("font-mono");
    expect(falta.closest("td")).toHaveClass("text-xs");
    expect(falta.closest("td")).not.toBe(
      screen.getByText("AGUIRRE NOVILLO FLAVIO").closest("td"),
    );
  });

  it("el teléfono se filtra en su columna; Personal filtra solo por el nombre", () => {
    expect(COLUMNAS_FILTRABLES).toContain("telefono");
    expect(
      filtrarOperativos([conPersona("0991234567")], { telefono: "0991234" }),
    ).toHaveLength(1);
    expect(
      filtrarOperativos([conPersona("0991234567")], { personal: "0991234" }),
    ).toHaveLength(0);
    expect(filtrarOperativos([conPersona(null)], { personal: "aguirre" })).toHaveLength(1);
  });

  it("el horario va en dos líneas: «08H00 a» arriba y «15H00» abajo", () => {
    render(
      <TablaOperativos
        operativos={[operativo({ horario: "08H00 a 15H00" })]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    const inicio = screen.getByText("08H00 a");
    const fin = screen.getByText("15H00");
    expect(inicio).toHaveClass("block", "whitespace-nowrap");
    expect(fin).toHaveClass("block", "whitespace-nowrap");
    expect(inicio.closest("td")).toBe(fin.closest("td"));
    // El filtro sigue usando el texto de una línea.
    expect(
      filtrarOperativos([operativo({ horario: "08H00 a 15H00" })], { horario: "08h00 a 15" }),
    ).toHaveLength(1);
  });

  it("la columna Formulario se parte con un ancho menor", () => {
    render(<TablaOperativos operativos={[operativo()]} columnas={COLUMNAS_LISTADO} />);

    expect(screen.getByRole("columnheader", { name: "Formulario" })).toHaveClass(
      "w-28",
      "min-w-24",
    );
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL FORMULARIO QUE NO HABILITA VEHÍCULO LO DICE. RN-41 y RN-42, 2026-08-24.
 *
 * Lo que se prueba es una **distinción**, no un texto: «pendiente de asignar» y «no se
 * va a asignar nunca» eran la misma celda vacía. El servidor no emite alerta sobre estos
 * operativos —y hace bien: nadie podría resolverla—, así que si la pantalla no lo dice,
 * no lo dice nadie.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("los formularios que operan por propios medios lo dicen (RN-41, RN-42)", () => {
  const fijos = (): Operativo =>
    operativo({
      formulario: {
        codigo: "FIJOS",
        nombre: "OPERATIVOS DE CONTROL FIJOS",
        numero: 1,
        colorFondo: "#A2C4C9",
        colorAcento: "#000000",
        colorNombre: "Verde azulado",
        esPatrulla: false,
        condicionanteNoct: false,
        politicaVehiculo: "NO_APLICA",
        admiteAdicionales: false,
        rolDueno: "DMIP_OPERATIVOS",
        roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" }],
      },
    });

  /*
    SIN COLUMNA TRANSPORTE (P-02): el conductor lo dice, en gris corriente y SIN FONDO (2026-10-13:
    el distintivo gris se leía como otra celda dentro de la fila).
  */
  it("sin la columna Transporte, el conductor dice «Propios medios» en gris, sin fondo", () => {
    render(
      <TablaOperativos
        operativos={[fijos()]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    const propios = screen.getByText("Propios medios");
    expect(propios).toHaveClass("text-app-muted");
    expect(propios).not.toHaveClass("badge");
  });

  /*
    CON COLUMNA TRANSPORTE (P-01, tabla única 2026-10-13): Transporte ya lo dice, así que el
    conductor pone «—», y que el formulario no pide vehículo va en el `title` de la etiqueta. La
    columna «Vehículo · No se activa» se retiró.
  */
  it("con la columna Transporte, el conductor dice «—» y Transporte explica que no pide vehículo", () => {
    render(
      <TablaOperativos
        operativos={[fijos()]}
        columnas={COLUMNAS_SESION}
      />,
    );

    const encabezados = screen.getAllByRole("columnheader").map((th) => th.textContent?.trim());
    const fila = screen.getAllByRole("row")[1];
    const conductor = within(fila).getAllByRole("cell")[encabezados.indexOf("Conductor")];
    expect(conductor).toHaveTextContent(/^—$/);

    const transporte = within(fila).getAllByRole("cell")[encabezados.indexOf("Transporte")];
    expect(within(transporte).getByTitle("Este formulario no pide vehículo a la DAF.")).toHaveClass(
      "badge",
    );
    expect(screen.queryByText("No se activa")).toBeNull();
  });

  it("un formulario que sí habilita vehículo no dice «Propios medios» en el conductor", () => {
    // La fixture por defecto es 8 · INSP, `OBLIGATORIO`: ahí la DAF sí asigna, y lo que
    // corresponde es «Sin conductor» o el guion.
    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(screen.queryByText("Propios medios")).toBeNull();
  });
});

describe("P-01 · la tabla de Mis operativos, con sus columnas (2026-10-13)", () => {
  it("mismo orden y estilo que P-02, sin Vehículo y con Observaciones al final", () => {
    render(<TablaOperativos operativos={[operativo()]} columnas={COLUMNAS_SESION} />);

    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent?.trim()),
    ).toEqual([
      "Identificador",
      "Horario",
      "Personal",
      "Teléfono",
      "Zonal",
      "Punto",
      "Tipo de control",
      "Transporte",
      "Conductor",
      "Estado",
      "Observaciones",
    ]);
  });

  it("P-02 conserva las suyas: con Formulario, sin Transporte, y con Observaciones (2026-10-19)", () => {
    render(<TablaOperativos operativos={[operativo()]} columnas={COLUMNAS_LISTADO} />);

    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent?.trim()),
    ).toEqual([
      "Identificador",
      "Formulario",
      "Horario",
      "Personal",
      "Teléfono",
      "Zonal",
      "Punto",
      "Tipo de control",
      "Conductor",
      "Estado",
      "Observaciones",
    ]);
  });

  it("el tipo de control va sin fondo ni negrita aunque el libre traiga alerta, y el libre dice «(libre)»", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            tipoControl: null,
            tiposControl: [],
            tipoLibre: "Pruebas técnicas",
            alertas: [
              {
                codigo: "ALV-06",
                campo: "tipoControl",
                mensaje: "El tipo de control se capturó como adicional.",
                critica: false,
              },
            ],
          }),
        ]}
        columnas={COLUMNAS_SESION}
      />,
    );

    const libre = screen.getByText("(libre)");
    const celda = libre.closest("td") as HTMLElement;
    expect(celda).toHaveTextContent("Pruebas técnicas (libre)");
    expect(celda.className).not.toMatch(/bg-warning|font-semibold/);
  });

  it("las notas van en su columna, una tarjeta por nota, y no como icono junto al identificador", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            observaciones: [
              { texto: "Llevar chalecos", creadoPorRol: "DMIP_OPERATIVOS", creadoEn: "2026-10-13T12:00:00Z" },
              { texto: "Coordinar con la zonal", creadoPorRol: "DMIP_OPERATIVOS", creadoEn: "2026-10-13T12:05:00Z" },
            ],
          }),
        ]}
        columnas={COLUMNAS_SESION}
      />,
    );

    const celda = screen.getByText("Llevar chalecos").closest("td") as HTMLElement;
    // Cada observación es su propia tarjeta: nunca texto pegado.
    expect(celda.querySelectorAll(".app-nota")).toHaveLength(2);
    expect(within(celda).getByText("Coordinar con la zonal")).toBeInTheDocument();
    expect(celda).not.toHaveTextContent("·  Coordinar");
    expect(celda).not.toHaveTextContent("IG-002-31-JUL-2026");
    const identificador = screen.getByText("IG-002-31-JUL-2026").closest("td") as HTMLElement;
    expect(identificador).not.toHaveTextContent(/Notas|Llevar chalecos/);
    expect(identificador.querySelector("svg")).toBeNull();
  });

  it("Mis operativos también lleva la columna Observaciones (2026-10-19)", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            observaciones: [
              { texto: "Llevar chalecos", creadoPorRol: "DMIP_OPERATIVOS", creadoEn: "2026-10-13T12:00:00Z" },
            ],
          }),
        ]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Observaciones" })).toBeInTheDocument();
    expect(screen.getByText("Llevar chalecos")).toBeInTheDocument();
  });
});

describe("casos 4 y 5 · los dos vacíos no dicen lo mismo", () => {
  it("sin operativos, invita a registrar", () => {
    render(
      <TablaOperativos
        operativos={[]}
        columnas={COLUMNAS_LISTADO}
        mensajeVacio="No hay operativos registrados en esta fecha. Regístrelos desde «Registro de operativo»."
      />,
    );

    expect(screen.getByText(/Regístrelos desde/)).toBeInTheDocument();
  });

  it("con filtro sin coincidencias, ofrece limpiarlo", async () => {
    const limpiar = vi.fn();

    render(
      <TablaOperativos
        operativos={[]}
        columnas={COLUMNAS_LISTADO}
        mensajeVacio={
          <button
            type="button"
            onClick={limpiar}
          >
            Limpiar filtros
          </button>
        }
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(limpiar).toHaveBeenCalled();
  });

  it("la fila vacía ocupa todas las columnas: la tabla no se descuadra", () => {
    const { container } = render(
      <TablaOperativos
        operativos={[]}
        columnas={COLUMNAS_LISTADO}
        acciones={() => <span>x</span>}
        mensajeVacio="Sin datos"
      />,
    );

    const celda = container.querySelector("tbody td");
    expect(celda).toHaveAttribute(
      "colspan",
      String(COLUMNAS_LISTADO.length + 1),
    );
  });
});

describe("la fila de filtros solo aparece cuando la pantalla la maneja", () => {
  it("sin `onFiltroChange` no se dibuja", () => {
    render(<TablaOperativos operativos={[operativo()]} />);

    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("con ella, cada columna filtrable tiene su caja rotulada", async () => {
    const cambiar = vi.fn();

    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_LISTADO}
        filtros={{}}
        onFiltroChange={cambiar}
      />,
    );

    // El conductor no se filtra: su celda muestra una alerta, no un texto propio.
    expect(screen.queryByLabelText("Filtrar por conductor")).toBeNull();

    await userEvent.type(screen.getByLabelText("Filtrar por punto"), "m");
    expect(cambiar).toHaveBeenCalledWith("punto", "m");
  });
});

describe("columna Zonal · lo que el usuario eligió en «Zonales»", () => {
  const varias = [
    { id: 1, codigo: "Z1", nombre: "Zonal Eloy Alfaro" },
    { id: 2, codigo: "Z2", nombre: "Zonal Quitumbe" },
    { id: 3, codigo: "Z3", nombre: "Zonal Calderón" },
  ];

  it("va entre Teléfono y Punto", () => {
    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.trim());
    const posicion = encabezados.indexOf("Zonal");
    expect(posicion).toBeGreaterThan(-1);
    expect(encabezados[posicion - 1]).toBe("Teléfono");
    expect(encabezados[posicion + 1]).toBe("Punto");
  });

  it("muestra TODAS las zonales elegidas, con su nombre tal cual", () => {
    render(
      <TablaOperativos
        operativos={[operativo({ zonales: varias })]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    expect(
      screen.getByText("Zonal Eloy Alfaro, Zonal Quitumbe, Zonal Calderón"),
    ).toBeInTheDocument();
  });

  it("sin zonal dice «—»", () => {
    render(
      <TablaOperativos
        operativos={[operativo({ zonales: [] })]}
        columnas={["identificador", "zonal"]}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("filtra por cualquiera de sus zonales, sin tildes ni mayúsculas", async () => {
    const cambiar = vi.fn();
    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_LISTADO}
        filtros={{}}
        onFiltroChange={cambiar}
      />,
    );
    await userEvent.type(screen.getByLabelText("Filtrar por zonal"), "q");
    expect(cambiar).toHaveBeenCalledWith("zonal", "q");

    const conVarias = operativo({ zonales: varias });
    const otro = operativo({ id: 2, zonales: [] });
    expect(
      filtrarOperativos([conVarias, otro], { zonal: "calderon" }),
    ).toEqual([conVarias]);
  });
});

describe("caso 3 · con la ventana cerrada no se puede editar ni retirar", () => {
  it("los dos botones quedan deshabilitados y explican por qué", () => {
    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_LISTADO}
        acciones={() => (
          <>
            <button
              type="button"
              disabled
              title="La ventana de carga está cerrada o el cuadro fue cerrado."
            >
              Editar
            </button>
            <button
              type="button"
              disabled
              title="La ventana de carga está cerrada o el cuadro fue cerrado."
            >
              Eliminar
            </button>
          </>
        )}
      />,
    );

    const editar = screen.getByRole("button", { name: "Editar" });

    expect(editar).toBeDisabled();
    expect(editar).toHaveAttribute(
      "title",
      expect.stringContaining("ventana de carga"),
    );
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDisabled();
  });

  it("las acciones van en su propia columna, una por fila", () => {
    render(
      <TablaOperativos
        operativos={[operativo({ id: 1 }), operativo({ id: 2 })]}
        columnas={COLUMNAS_LISTADO}
        acciones={(fila) => <button type="button">Editar {fila.id}</button>}
      />,
    );

    const filas = screen.getAllByRole("row");
    // Cabecera más dos filas de datos.
    expect(filas).toHaveLength(3);
    expect(
      within(filas[1]).getByRole("button", { name: "Editar 1" }),
    ).toBeInTheDocument();
  });
});

/*
  La confirmación es la misma en P-01 y P-02 desde el 2026-10-13: el título nombra el operativo y el
  mensaje dice lo que pasa. La excepción de PV-10 (órdenes emitidas) se explica al terminar.
*/
describe("caso 2 · la confirmación nombra el operativo que se retira", () => {
  it("el título lleva el identificador", () => {
    expect(tituloDelRetiro(operativo())).toBe("¿Eliminar IG-002-31-JUL-2026?");
  });

  it("el mensaje dice que se quita el operativo, que su personal queda libre y que no se deshace", () => {
    expect(MENSAJE_DEL_RETIRO).toBe(
      "Se quitará el operativo y su personal quedará libre. Esta acción no se puede deshacer.",
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   LA JORNADA QUE SE PROPONE AL ABRIR · 2026-08-21 · RN-01

   El cuadro se elabora la víspera. Hasta esta fecha P-02 listaba HOY mientras P-01
   registraba en MAÑANA, así que **lo que se acababa de registrar no aparecía aquí**: el
   listado salía vacío y eso se lee como un fallo de guardado, no como otro día.

   Se afirma sobre la consulta al servidor, que es lo que decide qué se ve.
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("P-02 abre en la jornada que se está armando", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(OperativoService.consultar).mockResolvedValue({
      datos: [],
      meta: { total: 0, pagina: 1, tamanio: 200, totalPaginas: 0 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("consulta los operativos de mañana, no los de hoy", async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 11, 0));

    render(<MisOperativosPage />);

    await vi.waitFor(() =>
      expect(OperativoService.consultar).toHaveBeenCalledWith(
        expect.objectContaining({ desde: "2026-08-22", hasta: "2026-08-22" }),
      ),
    );
  });

  it("la víspera de fin de año propone el uno de enero", async () => {
    vi.setSystemTime(new Date(2026, 11, 31, 14, 0));

    render(<MisOperativosPage />);

    await vi.waitFor(() =>
      expect(OperativoService.consultar).toHaveBeenCalledWith(
        expect.objectContaining({ desde: "2027-01-01", hasta: "2027-01-01" }),
      ),
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   BUG #9 · LA FILA REFLEJA EL PERSONAL TRAS ASIGNAR · 2026-09-30

   Una mutación de personal (`asignarPersonal`/`retirarPersonal`) devuelve el operativo
   COMPLETO —con su personal al día—, mientras que el endpoint de LISTA puede devolverlo sin
   ese detalle. La fila seguía diciendo «todavía no tiene personal asignado» aun con gente
   asignada, porque se repintaba con la versión delgada de la lista. `empalmarEnLaLista`
   reemplaza en la lista, por su `id`, ese operativo por el completo que trae la mutación.

   Se afirma sobre la DECISIÓN —la fila deja de mentir tras asignar—, no sobre el maquetado.
   ═══════════════════════════════════════════════════════════════════════════════ */
describe("BUG #9 · la fila de la tabla refleja el personal tras asignar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("al asignar en el cajón, la fila deja de decir «sin personal» y muestra al asignado", async () => {
    // La LISTA trae el operativo sin personal y con la alerta ALV-01, como el endpoint de lista.
    // `creadoPorRol` coincide con el rol del usuario de prueba: así la fila es PROPIA y ofrece
    // «Editar» (accesoAlOperativo), no «Agregar Personal».
    // Con una institución, para que los GENERALES pasen la validación al «Guardar cambios»
    // (`institucionesIds` exige al menos una).
    const instituciones = [{ id: 7, sigla: "AMC", nombre: "AMC" }];
    const sinPersonal = operativo({
      creadoPorRol: "DMIP_OPERATIVOS",
      personal: [],
      instituciones,
      alertas: [
        {
          codigo: "ALV-01",
          campo: "personal",
          mensaje: "Este operativo todavía no tiene personal asignado.",
          critica: false,
        },
      ],
    });
    // La MUTACIÓN devuelve el operativo COMPLETO: con su personal y ya sin la alerta.
    const conPersonal = operativo({
      creadoPorRol: "DMIP_OPERATIVOS",
      instituciones,
      personal: [
        {
          funcionarioId: 7,
          nombre: "REDROVAN JUAN",
          area: "OPERATIVOS",
          telefono: null,
          esResponsable: false,
          asignadoPorRol: "DMIP_OPERATIVOS",
          horaInicio: "09:00",
          horaFin: "18:00",
        },
      ],
      alertas: [],
    });

    const meta = { total: 1, pagina: 1, tamanio: 200, totalPaginas: 1 };
    // La LISTA arranca sin personal; tras guardar, la recarga la trae con el asignado.
    vi.mocked(OperativoService.consultar)
      .mockResolvedValueOnce({ datos: [sinPersonal], meta })
      .mockResolvedValue({ datos: [conPersonal], meta });
    vi.mocked(OperativoService.asignarPersonal).mockResolvedValue(conPersonal);
    vi.mocked(OperativoService.actualizarTurnoPersonal).mockResolvedValue(
      conPersonal,
    );
    vi.mocked(OperativoService.editar).mockResolvedValue(conPersonal);
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([
      {
        id: 7,
        apellidos: "REDROVAN",
        nombres: "JUAN",
        area: "OPERATIVOS",
        cargo: null,
        elegible: true,
        motivo: null,
      },
    ]);

    render(<MisOperativosPage />);

    // La fila arranca diciendo que no tiene a nadie.
    const editar = await screen.findByRole("button", { name: /^Editar\b/ });
    const tabla = () => screen.getByRole("table");
    expect(
      within(tabla()).getByText(
        "Este operativo todavía no tiene personal asignado.",
      ),
    ).toBeInTheDocument();
    expect(within(tabla()).queryByText(/REDROVAN JUAN/)).toBeNull();

    // Se abre el cajón de edición y se asigna al candidato.
    await userEvent.click(editar);
    // Por secciones (2026-10-08) el cajón usa el verbo del borrador: «+ Agregar», con el horario a la vista.
    const candidato = await screen.findByRole("button", { name: "+ Agregar" });
    await userEvent.click(candidato);

    // DIFERIDO (2026-10-01): «+ Asignar» NO llama al servidor ni toca la fila de la tabla todavía.
    // El cambio se acumula en el borrador y se aplica al pulsar «Guardar cambios».
    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    expect(within(tabla()).queryByText(/REDROVAN JUAN/)).toBeNull();
    expect(
      within(tabla()).getByText(
        "Este operativo todavía no tiene personal asignado.",
      ),
    ).toBeInTheDocument();

    // Al «Guardar cambios» se aplica la asignación y la fila deja de mentir.
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(OperativoService.asignarPersonal).toHaveBeenCalledWith(1, {
        funcionarioId: 7,
      }),
    );
    await waitFor(() =>
      expect(within(tabla()).getByText(/REDROVAN JUAN/)).toBeInTheDocument(),
    );
    expect(
      within(tabla()).queryByText(
        "Este operativo todavía no tiene personal asignado.",
      ),
    ).toBeNull();
  });
});
