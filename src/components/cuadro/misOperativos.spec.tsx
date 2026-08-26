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

import { render, screen, within } from "@testing-library/react";
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

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    consultar: vi.fn(),
    actualizar: vi.fn(),
    retirar: vi.fn(),
    crearAdicional: vi.fn(),
    obtener: vi.fn(),
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
  COLUMNAS_LISTADO,
  COLUMNAS_SESION,
  descripcionDelRetiro,
} from "../../utils/listadoOperativos.util.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";

const operativo = (parcial: Partial<Operativo> = {}): Operativo => ({
    id: 1,
    identificador: "IG-002-31-JUL-2026",
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
    observaciones: null,
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
  it("el mensaje del servidor se muestra tal cual en la celda vacía", () => {
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

    expect(
      screen.getByText("Falta asignar conductor. Lo hace la DAF."),
    ).toBeInTheDocument();
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

  it("conductor dice «Propios medios» y vehículo «No se activa»", () => {
    render(
      <TablaOperativos
        operativos={[fijos()]}
        columnas={COLUMNAS_SESION}
      />,
    );

    expect(screen.getByText("Propios medios")).toBeInTheDocument();
    expect(screen.getByText("No se activa")).toBeInTheDocument();
  });

  it("un formulario que sí habilita vehículo no dice ninguna de las dos", () => {
    // La fixture por defecto es 8 · INSP, `OBLIGATORIO`: ahí la DAF sí asigna, y lo que
    // corresponde es la alerta o el guion, nunca «no se activa».
    render(
      <TablaOperativos
        operativos={[operativo()]}
        columnas={COLUMNAS_SESION}
      />,
    );

    expect(screen.queryByText("Propios medios")).toBeNull();
    expect(screen.queryByText("No se activa")).toBeNull();
  });

  /**
   * No es un nombre ni una placa: `Operativo` no los trae. Se pinta como distintivo para
   * que no se confunda con un dato capturado, igual que los campos calculados.
   */
  it("las dos son condiciones derivadas, no datos capturados", () => {
    render(
      <TablaOperativos
        operativos={[fijos()]}
        columnas={COLUMNAS_SESION}
      />,
    );

    expect(screen.getByText("Propios medios")).toHaveClass("badge");
    expect(screen.getByText("No se activa")).toHaveClass("badge");
  });

  it("la columna de vehículo existe en P-01 y se llama «Vehículo»", () => {
    render(
      <TablaOperativos
        operativos={[fijos()]}
        columnas={COLUMNAS_SESION}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Vehículo" }),
    ).toBeInTheDocument();
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
  it("sin `onFiltroChange` no se dibuja: P-01 no filtra", () => {
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
              Retirar
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
    expect(screen.getByRole("button", { name: "Retirar" })).toBeDisabled();
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

describe("caso 2 · la confirmación nombra el operativo que se retira", () => {
  it("incluye identificador, punto, horario y formulario", () => {
    expect(descripcionDelRetiro(operativo())).toContain(
      "IG-002-31-JUL-2026, AMC Matriz, 09H00 A 18H00, del formulario 8. Inspecciones Técnicas y Generales.",
    );
  });

  /**
   * PV-10 pasó a borrado real el 2026-08-07. Una confirmación que dice «se quitará» ante
   * una operación que borra la fila **le miente a quien la acepta**, y es la última
   * pantalla donde puede arrepentirse.
   */
  it("advierte que el borrado es real y no se deshace", () => {
    const aviso = descripcionDelRetiro(operativo());

    expect(aviso).toContain("Se eliminará");
    expect(aviso).toContain("no se puede deshacer");
    expect(aviso).toContain("órdenes");
  });

  it("con punto adicional, nombra el texto libre", () => {
    const libre = operativo({
      puntoEncuentro: null,
      puntoLibre: "Frente al mercado",
    });

    expect(descripcionDelRetiro(libre)).toContain("Frente al mercado");
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
        expect.objectContaining({ fecha: "2026-08-22" }),
      ),
    );
  });

  it("la víspera de fin de año propone el uno de enero", async () => {
    vi.setSystemTime(new Date(2026, 11, 31, 14, 0));

    render(<MisOperativosPage />);

    await vi.waitFor(() =>
      expect(OperativoService.consultar).toHaveBeenCalledWith(
        expect.objectContaining({ fecha: "2027-01-01" }),
      ),
    );
  });
});
