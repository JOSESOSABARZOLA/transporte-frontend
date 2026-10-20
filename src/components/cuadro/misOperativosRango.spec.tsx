/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos · rango de fechas y tipo de control
 * Archivo: misOperativosRango.spec.tsx
 * Responsabilidad: Fijar la columna «Tipo de control», el filtro Desde–Hasta, sus atajos y
 *                  validaciones, la URL y las acciones por fila según su cuadro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import TablaOperativos from "./TablaOperativos.tsx";
import { OperativoService } from "../../services/operativo.service.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import { COLUMNAS_LISTADO, filtrarOperativos } from "../../utils/listadoOperativos.util.ts";
import { fechaDeJornadaPorDefecto, sumarDias } from "../../utils/jornada.util.ts";

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    rango: vi.fn(),
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
  PersonalService: { consultarElegibles: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: ["DMIP_OPERATIVOS"], displayName: "Prueba" } }),
}));
vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: (fecha: string) => ({
    cuadro: {
      fecha,
      ordenTrabajo: `AMC-${fecha}`,
      nroSemana: 42,
      anioSemana: 2026,
      estado: "BORRADOR",
      admiteEscritura: true,
      cerradoPor: null,
      cerradoEn: null,
      reaperturas: 0,
    },
    cargando: false,
    puedeEscribir: true,
    sinJornada: false,
  }),
}));
vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({
    ventana: null,
    puedeEscribir: true,
    mensaje: null,
    horaCierre: null,
    cargando: false,
    cuentaAtras: { urgencia: "HOLGADA", tiempo: "06:39", texto: "para cerrar la ventana." },
  }),
}));

const VIGENTE = fechaDeJornadaPorDefecto();

const operativo = (parcial: Partial<Operativo> = {}): Operativo => ({
  id: 1,
  identificador: "OCF-001",
  grupoRegistro: null,
  secuencial: 1,
  cuadroFecha: VIGENTE,
  cuadroEstado: "BORRADOR",
  admiteEdicion: true,
  esAdicional: false,
  origen: null,
  adicionales: 0,
  formulario: {
    codigo: "PMO",
    nombre: "Control de PMO",
    numero: 2,
    colorFondo: "#fce5cd",
    colorAcento: "#000000",
    colorNombre: "naranja",
    esPatrulla: false,
    condicionanteNoct: false,
    politicaVehiculo: "NO_APLICA",
    admiteAdicionales: true,
    rolDueno: "DMIP_OPERATIVOS",
    roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" }],
  },
  horaInicio: "08:00",
  horaFin: "15:00",
  horario: "08H00 A 15H00",
  duracionHoras: 7,
  esNocturno: false,
  cruzaMedianoche: false,
  zonales: [{ id: 1, codigo: "Z1", nombre: "Zonal Calderón" }],
  puntoEncuentro: { id: 4, nombre: "Estación Río Coca", zonalNombre: "Zonal Calderón" },
  puntoLibre: null,
  tipoControl: null,
  tiposControl: [],
  tipoLibre: null,
  instituciones: [],
  personal: [],
  composicion: { esPatrulla: false, completa: true, areasPendientes: [] },
  estadoTransporte: "PENDIENTE",
  alertaActiva: false,
  alertas: [],
  observaciones: [],
  creadoPorRol: "DMIP_OPERATIVOS",
  creadoPor: 1,
  modificadoPorRol: "DMIP_OPERATIVOS",
  modificadoPor: 1,
  version: 1,
  creadoEn: "2026-10-13T12:00:00.000Z",
  ...parcial,
});

const respuesta = (datos: Operativo[]) => ({
  datos,
  meta: { total: datos.length, pagina: 1, tamanio: 200, totalPaginas: 1 },
});

const tipos = (...nombres: string[]) =>
  nombres.map((nombre, i) => ({ id: i + 1, nombre }));

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.mocked(OperativoService.rango).mockResolvedValue({
    fechaVigente: VIGENTE,
    rangoMaxDias: 31,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("columna «Tipo de control»", () => {
  const pintar = (op: Operativo) =>
    render(
      <TablaOperativos
        operativos={[op]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

  it("va entre Punto y Conductor", () => {
    const i = COLUMNAS_LISTADO.indexOf("tipoControl");
    expect(COLUMNAS_LISTADO[i - 1]).toBe("punto");
    expect(COLUMNAS_LISTADO[i + 1]).toBe("conductor");
  });

  it("muestra hasta dos tipos separados por coma, sin «+N»", () => {
    pintar(operativo({ tiposControl: tipos("CONTROL ESPACIO PÚBLICO", "CONTROL LIBADORES") }));
    expect(screen.getByText("CONTROL ESPACIO PÚBLICO, CONTROL LIBADORES")).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it("con más de dos, agrega «+N» y el tooltip los lista todos", () => {
    pintar(operativo({ tiposControl: tipos("A1", "B2", "C3", "D4") }));
    const mas = screen.getByText("+2");
    expect(mas).toHaveAttribute("title", "A1, B2, C3, D4");
    expect(screen.getByText(/A1, B2/)).toBeInTheDocument();
  });

  it("el texto libre va en una segunda línea marcada «(libre)»", () => {
    pintar(
      operativo({
        tipoControl: { id: 9, nombre: "CONTROL LICENCIAMIENTO" },
        tipoLibre: "Pruebas técnicas USIT",
      }),
    );
    expect(screen.getByText("CONTROL LICENCIAMIENTO")).toBeInTheDocument();
    const libre = screen.getByText(/Pruebas técnicas USIT/);
    expect(within(libre).getByText("(libre)")).toBeInTheDocument();
  });

  it("sin ningún tipo dice «—»", () => {
    pintar(operativo());
    const celdas = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(celdas[COLUMNAS_LISTADO.indexOf("tipoControl")]).toHaveTextContent(/^—$/);
  });

  it("el filtro encuentra por cualquier tipo y por el texto libre, sin tildes ni mayúsculas", () => {
    const conVarios = operativo({ id: 1, tiposControl: tipos("A1", "B2", "CONTROL PÚBLICO") });
    const conLibre = operativo({ id: 2, tipoLibre: "Pruebas técnicas" });
    const lista = [conVarios, conLibre];

    expect(filtrarOperativos(lista, { tipoControl: "control publico" })).toEqual([conVarios]);
    expect(filtrarOperativos(lista, { tipoControl: "TECNICAS" })).toEqual([conLibre]);
  });
});

describe("P-02 · filtro Desde–Hasta", () => {
  it("abre en el cuadro vigente: chips del cuadro, aviso de la ventana y todas las acciones", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(respuesta([operativo()]));

    render(<MisOperativosPage />);

    await waitFor(() =>
      expect(OperativoService.consultar).toHaveBeenCalledWith(
        expect.objectContaining({ desde: VIGENTE, hasta: VIGENTE }),
      ),
    );
    expect(await screen.findByText(`AMC-${VIGENTE}`)).toBeInTheDocument();
    expect(screen.getByText(/para cerrar la ventana/)).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toHaveValue(VIGENTE);
    expect(screen.getByLabelText("Hasta")).toHaveValue(VIGENTE);
    expect(screen.getByRole("button", { name: "Hoy" })).toHaveAttribute("aria-pressed", "true");

    expect(await screen.findByRole("button", { name: /^Editar\b/ })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.getByRole("button", { name: /^Agregar adicional\b/ })).not.toHaveAttribute(
      "aria-disabled",
    );
    // «Eliminar» vuelve a la fila, solo con icono (2026-10-19).
    expect(screen.getByRole("button", { name: /^Eliminar\b/ })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.queryByRole("columnheader", { name: "Fecha" })).not.toBeInTheDocument();
  });

  it("con varios días: una fila de cabecera por día, resumen en la cabecera y orden del servidor", async () => {
    const ayer = sumarDias(VIGENTE, -1);
    vi.mocked(OperativoService.consultar).mockResolvedValue(
      respuesta([
        operativo({ id: 1, identificador: "OCF-001" }),
        operativo({
          id: 2,
          identificador: "OCF-009",
          cuadroFecha: ayer,
          admiteEdicion: false,
        }),
      ]),
    );
    const usuario = userEvent.setup();

    render(<MisOperativosPage />);
    await usuario.click(await screen.findByRole("button", { name: "Últimos 7 días" }));

    await waitFor(() =>
      expect(OperativoService.consultar).toHaveBeenCalledWith(
        expect.objectContaining({ desde: sumarDias(VIGENTE, -6), hasta: VIGENTE }),
      ),
    );
    // Sin columna «Fecha» (2026-10-13): una fila de cabecera por día, en el orden del servidor.
    const encabezados = await screen.findAllByRole("columnheader");
    expect(encabezados[0]).toHaveTextContent("Identificador");
    expect(encabezados.map((th) => th.textContent)).not.toContain("Fecha");
    const cabecerasDeDia = await screen.findAllByRole("columnheader", { name: /operativo$/ });
    expect(cabecerasDeDia.map((th) => th.closest("tr")?.getAttribute("data-cabecera-fecha"))).toEqual([
      VIGENTE,
      ayer,
    ]);
    expect(cabecerasDeDia[0]).toHaveAttribute("scope", "colgroup");
    expect(
      screen.getByText(
        `2 operativos entre ${sumarDias(VIGENTE, -6).slice(8, 10)}/${sumarDias(VIGENTE, -6).slice(5, 7)} y ${VIGENTE.slice(8, 10)}/${VIGENTE.slice(5, 7)} · 2 cuadros`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(`AMC-${VIGENTE}`)).not.toBeInTheDocument();
    expect(screen.getByText("Ordenado por fecha (más reciente primero)")).toBeInTheDocument();

    // El orden lo da el servidor (fecha descendente): la fila del vigente va antes.
    const identificadores = screen.getAllByText(/^OCF-00/).map((nodo) => nodo.textContent);
    expect(identificadores).toEqual(["OCF-001", "OCF-009"]);
    expect(screen.getByRole("button", { name: "Últimos 7 días" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("una fila de un cuadro cerrado o pasado solo ofrece «Ver detalle»", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(
      respuesta([
        // Anteayer respecto del vigente: un cuadro pasado (hoy es la víspera del vigente).
        operativo({
          cuadroFecha: sumarDias(VIGENTE, -2),
          cuadroEstado: "CERRADO",
          admiteEdicion: false,
        }),
      ]),
    );

    render(<MisOperativosPage />);

    // Cuadro cerrado (2026-10-19): solo «Ver detalle»; lo demás se oculta.
    expect(await screen.findByRole("button", { name: /^Ver detalle\b/ })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(screen.queryByRole("button", { name: /^Editar\b/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adicional/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Eliminar\b/ })).not.toBeInTheDocument();
  });

  it("«Hasta» anterior a «Desde» marca el campo, avisa y no consulta", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(respuesta([]));
    const usuario = userEvent.setup();

    render(<MisOperativosPage />);
    await waitFor(() => expect(OperativoService.consultar).toHaveBeenCalledTimes(1));

    const hasta = screen.getByLabelText("Hasta");
    await usuario.clear(hasta);
    await usuario.type(hasta, sumarDias(VIGENTE, -3));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      '"Hasta" no puede ser anterior a "Desde".',
    );
    expect(hasta).toHaveClass("input-error");
    await new Promise((fin) => setTimeout(fin, 500));
    expect(OperativoService.consultar).toHaveBeenCalledTimes(1);
  });

  it("más de 31 días avisa y no consulta", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(respuesta([]));
    const usuario = userEvent.setup();

    render(<MisOperativosPage />);
    await waitFor(() => expect(OperativoService.consultar).toHaveBeenCalledTimes(1));

    const desde = screen.getByLabelText("Desde");
    await usuario.clear(desde);
    await usuario.type(desde, sumarDias(VIGENTE, -31));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El rango no puede superar 31 días.",
    );
    await new Promise((fin) => setTimeout(fin, 500));
    expect(OperativoService.consultar).toHaveBeenCalledTimes(1);
  });

  it("guarda el rango en la URL y lo restaura al volver a cargar", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(respuesta([]));
    const usuario = userEvent.setup();

    const { unmount } = render(<MisOperativosPage />);
    await usuario.click(await screen.findByRole("button", { name: "Ayer" }));
    const ayer = sumarDias(VIGENTE, -1);

    await waitFor(() =>
      expect(window.location.search).toBe(`?desde=${ayer}&hasta=${ayer}`),
    );
    unmount();
    vi.mocked(OperativoService.consultar).mockClear();

    render(<MisOperativosPage />);
    expect(screen.getByLabelText("Desde")).toHaveValue(ayer);
    await waitFor(() =>
      expect(OperativoService.consultar).toHaveBeenCalledWith(
        expect.objectContaining({ desde: ayer, hasta: ayer }),
      ),
    );
  });

  it("al cambiar el rango espera y vuelve a la página 1; «Limpiar filtros» vuelve al vigente", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(respuesta([]));
    const usuario = userEvent.setup();

    render(<MisOperativosPage />);
    await waitFor(() => expect(OperativoService.consultar).toHaveBeenCalledTimes(1));

    await usuario.click(screen.getByRole("button", { name: "Este mes" }));
    // La consulta no sale al instante: espera al último cambio.
    expect(OperativoService.consultar).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(OperativoService.consultar).toHaveBeenLastCalledWith(
        expect.objectContaining({ desde: `${VIGENTE.slice(0, 8)}01`, pagina: 1 }),
      ),
    );

    await usuario.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByLabelText("Desde")).toHaveValue(VIGENTE);
    expect(screen.getByLabelText("Hasta")).toHaveValue(VIGENTE);
  });
});
