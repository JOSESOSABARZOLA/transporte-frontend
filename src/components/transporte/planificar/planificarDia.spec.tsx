/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: planificarDia.spec.tsx
 * Responsabilidad: Verificar las decisiones de los cuatro pasos y del stepper.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * Se prueban DECISIONES, no maquetado: qué bloquea «Continuar», qué se envía al servidor y con qué,
 * qué se ofrece a cada candidato según su categoría, cuándo se exige el acta y cuándo una hoja de
 * ruta vuelve a quedar pendiente. Los textos del servidor se pintan tal cual (regla 7).
 */

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DrawerCandidatos from "./DrawerCandidatos.tsx";
import PasoAsignar from "./PasoAsignar.tsx";
import PasoEmitir from "./PasoEmitir.tsx";
import PasoFinDelDia from "./PasoFinDelDia.tsx";
import PasoPreparar from "./PasoPreparar.tsx";
import { RESUMEN_REAL_HOJAS_EMITIDAS } from "./resumenReal.fixture.ts";
import { FechaDafProvider } from "../../../context/FechaDafContext.tsx";
import type {
  ConductorJornada,
  OperativoJornada,
  RespuestaCandidatos,
  ResumenJornadaDaf,
  SugerenciaGuarda,
} from "../../../interfaces/JornadaDaf.ts";
import type { Planificacion } from "../../../interfaces/Planificacion.ts";
import AsignacionTransportePage from "../../../pages/AsignacionTransportePage.tsx";

const permisos = vi.hoisted(() => ({ concedidos: new Set<string>(["flota:capacidad:declarar"]) }));
vi.mock("../../../hooks/usePermiso.ts", () => ({
  usePermiso: (...requeridos: string[]) => requeridos.some((p) => permisos.concedidos.has(p)),
}));

vi.mock("../../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({
    ventana: null,
    cargando: false,
    error: null,
    puedeEscribir: true,
    mensaje: "",
    horaCierre: null,
    cuentaAtras: null,
    recargar: vi.fn(),
  }),
}));

vi.mock("../../../services/jornadaDaf.service.ts", () => ({
  JornadaDafService: {
    resumen: vi.fn(),
    candidatos: vi.fn(),
    simular: vi.fn(),
    vehiculos: vi.fn(),
    confirmarVehiculos: vi.fn(),
    emitir: vi.fn(),
    huecos: vi.fn(),
  },
}));

vi.mock("../../../services/planificacion.service.ts", () => ({
  PlanificacionService: {
    consultar: vi.fn(),
    asignar: vi.fn(),
    evaluarVehiculos: vi.fn(),
    asignarTarea: vi.fn(),
    quitar: vi.fn(),
    compartir: vi.fn(),
    compartibles: vi.fn(),
    activar: vi.fn(),
    desactivar: vi.fn(),
    optimizar: vi.fn(),
    confirmar: vi.fn(),
    pedirPriorizacion: vi.fn(),
    guardarFinDelDia: vi.fn(),
    hojaDeRuta: vi.fn(),
    registrarChecklist: vi.fn(),
    registrarKilometraje: vi.fn(),
    registrarVale: vi.fn(),
    cambiarEstadoMantenimiento: vi.fn(),
  },
}));

vi.mock("../../../services/traslados.service.ts", () => ({
  TrasladosService: { obtener: vi.fn(), guardar: vi.fn() },
}));

vi.mock("../../../services/transporte.service.ts", () => ({
  TransporteService: {
    declararPropiosMedios: vi.fn(),
  },
}));

vi.mock("../../../utils/banner.util.ts", () => ({ descargarArchivo: vi.fn() }));

import { JornadaDafService } from "../../../services/jornadaDaf.service.ts";
import { PlanificacionService } from "../../../services/planificacion.service.ts";
import { TrasladosService } from "../../../services/traslados.service.ts";
import { TransporteService } from "../../../services/transporte.service.ts";

const FECHA = "2026-10-09";

const operativo = (parcial: Partial<OperativoJornada> = {}): OperativoJornada => ({
  id: 1,
  identificador: "OCDMIT-001",
  formulario: "7. Operativos DMIT/UO",
  horaInicio: "14:00",
  horaFin: "18:00",
  zonal: "Quitumbe",
  zonalId: 4,
  tipoTransporte: "COMPLETO",
  esMacrooperativo: false,
  transporteLiberado: false,
  personas: 2,
  cubierto: false,
  parcial: false,
  tramos: [],
  conductores: [],
  placas: [],
  ...parcial,
});

const conductor = (parcial: Partial<ConductorJornada> = {}): ConductorJornada => ({
  id: 10,
  nombre: "ESCALERAS KEVIN",
  turno: "DIA",
  activado: false,
  ausente: false,
  vehiculoId: 100,
  placa: "PMA7056",
  vehiculoIds: [100],
  tramoIds: [500],
  avisos: [],
  hojaRuta: { estado: "PENDIENTE", emitidaEn: null },
  ...parcial,
});

const guarda = (parcial: Partial<SugerenciaGuarda> = {}): SugerenciaGuarda => ({
  vehiculoId: 100,
  placa: "PMA7056",
  tipo: "GARAJE",
  ubicacionId: 3,
  ubicacion: "Garaje Centro",
  conductorId: 10,
  conductor: "ESCALERAS KEVIN",
  tarde: false,
  motivo: "Garaje autorizado más cercano a su último operativo.",
  continuidad: "",
  avisoCombustible: false,
  ultimoOperativo: { identificador: "OCFIJ-002", horaFin: "17:00", lugar: "Centro" },
  parqueadero: { autorizado: true, actaVigente: true },
  declarada: null,
  ...parcial,
});

const resumen = (parcial: Partial<ResumenJornadaDaf> = {}): ResumenJornadaDaf => ({
  fecha: FECHA,
  pasos: { pasoInicial: 2, completos: { 1: true, 2: false, 3: false, 4: false } },
  preparacion: {
    requisitos: [
      {
        clave: "CUADRO",
        estado: "OK",
        titulo: "Cuadro del día aprobado",
        detalle: "8 operativos de 7 formularios necesitan transporte.",
        accion: null,
      },
      {
        clave: "VEHICULOS",
        estado: "OK",
        titulo: "Vehículos confirmados: 2 salen hoy",
        detalle: "PMA7058 queda en taller.",
        accion: null,
      },
      {
        clave: "VENTANA",
        estado: "OK",
        titulo: "Ventana de asignación abierta",
        detalle: "Abierta hasta las 16H50.",
        accion: null,
      },
    ],
    listos: true,
    pendientes: 0,
    conductoresIncompletos: [],
  },
  ventana: {
    abierta: true,
    horaApertura: "15:55",
    horaCierre: "16:50",
    mensaje: "",
    zonaHoraria: "America/Guayaquil",
  },
  totales: {
    operativos: 2,
    cubiertos: 0,
    sinConductor: 2,
    propiosMedios: 0,
    conductoresEnUso: 0,
    libresEnUso: 0,
    vehiculosDisponibles: 2,
    vehiculosEnUso: 0,
    enTaller: 1,
    avisos: 0,
  },
  operativos: [operativo(), operativo({ id: 2, identificador: "OCPMO-001" })],
  conductores: [conductor({ hojaRuta: null, tramoIds: [], vehiculoIds: [] })],
  vehiculos: {
    flota: 3,
    confirmada: true,
    confirmadaEn: null,
    lista: [
      { id: 100, placa: "PMA7056", tipo: "Camioneta", enTaller: false, sale: true },
      { id: 101, placa: "PMA3375", tipo: "Camioneta", enTaller: false, sale: true },
      { id: 102, placa: "PMA7058", tipo: "Camioneta", enTaller: true, sale: false },
    ],
  },
  finDelDia: [],
  garajes: [
    { id: 3, nombre: "Garaje Centro" },
    { id: 4, nombre: "Garaje Sur" },
  ],
  ...parcial,
});

const PLAN: Planificacion = {
  fecha: FECHA,
  inicioJornada: "05:00",
  ventanasTurno: {
    DIA: { inicio: 60, fin: 780 },
    NOCHE: { inicio: 780, fin: 1500 },
    ECU_NOCHE: { inicio: 900, fin: 1440 },
  },
  operativos: [],
  bloques: [],
  tramos: [],
  conductores: [
    {
      id: 10,
      nombre: "ESCALERAS KEVIN",
      sector: "CENTRO",
      tipoContrato: "OCASIONAL",
      parqueaderoAutorizado: false,
      actaVigente: false,
      turno: "DIA",
      activado: false,
      ausente: false,
      ultimoFinAyer: null,
      vehiculoHabitualId: 100,
    },
  ],
  vehiculos: [],
};

const enRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  permisos.concedidos = new Set(["flota:capacidad:declarar"]);
  vi.mocked(PlanificacionService.consultar).mockResolvedValue(PLAN);
  vi.mocked(TrasladosService.obtener).mockRejectedValue(new Error("sin permiso"));
  vi.mocked(JornadaDafService.simular).mockRejectedValue(new Error("423"));
  vi.mocked(JornadaDafService.huecos).mockRejectedValue(new Error("sin huecos"));
  // Compartir unidad (2026-10-19): sin anfitriones, la sección no aparece.
  vi.mocked(PlanificacionService.compartibles).mockResolvedValue({
    operativoId: 0,
    identificador: "",
    solicitado: null,
    anfitriones: [],
  });
});

// ─────────────────────────── Paso 1 ───────────────────────────

describe("Paso 1 · Preparar", () => {
  const pendiente = resumen({
    preparacion: {
      requisitos: [
        {
          clave: "CUADRO",
          estado: "PENDIENTE",
          titulo: "Cuadro del día sin aprobar",
          detalle: "La Dirección aún no aprueba el cuadro.",
          accion: { tipo: "VER_MATRIZ" },
        },
        {
          clave: "VEHICULOS",
          estado: "PENDIENTE",
          titulo: "¿Salen hoy estos 2 vehículos?",
          detalle: "Flota 3 · 1 en taller (PMA7058)",
          accion: { tipo: "CONFIRMAR_VEHICULOS" },
        },
      ],
      listos: false,
      pendientes: 2,
      conductoresIncompletos: [],
    },
  });

  it("bloquea «Continuar» hasta completar los requisitos y cuenta los pendientes", () => {
    enRouter(
      <PasoPreparar
        fecha={FECHA}
        resumen={pendiente}
        onRecargar={vi.fn()}
        onContinuar={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Continuar a asignar →" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("2 pendientes")).toBeInTheDocument();
  });

  it("con todo listo, «Continuar» lleva al paso 2", async () => {
    const usuario = userEvent.setup();
    const onContinuar = vi.fn();
    enRouter(
      <PasoPreparar
        fecha={FECHA}
        resumen={resumen()}
        onRecargar={vi.fn()}
        onContinuar={onContinuar}
        onAviso={vi.fn()}
      />,
    );

    expect(screen.getByText("Listo para asignar")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Continuar a asignar →" }));
    expect(onContinuar).toHaveBeenCalled();
  });

  it("sin `matriz:ver` no ofrece el enlace a la matriz: dice quién aprueba", () => {
    enRouter(
      <PasoPreparar
        fecha={FECHA}
        resumen={pendiente}
        onRecargar={vi.fn()}
        onContinuar={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    expect(screen.queryByRole("link", { name: "Ver Matriz Consolidada" })).not.toBeInTheDocument();
    expect(screen.getByText("Pendiente de aprobación por la Dirección")).toBeInTheDocument();
  });

  it("con los vehículos ya confirmados solo ofrece «Cambiar», que abre la grilla y pide confirmar", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.confirmarVehiculos).mockResolvedValue({
      fecha: FECHA,
      confirmada: true,
      vehiculos: [],
    });
    // El servidor manda CORREGIR_VEHICULOS cuando ya están confirmados.
    const confirmados = resumen({
      preparacion: {
        ...resumen().preparacion,
        requisitos: resumen().preparacion.requisitos.map((r) =>
          r.clave === "VEHICULOS" ? { ...r, accion: { tipo: "CORREGIR_VEHICULOS" as const } } : r,
        ),
      },
    });
    enRouter(
      <PasoPreparar
        fecha={FECHA}
        resumen={confirmados}
        onRecargar={vi.fn().mockResolvedValue(undefined)}
        onContinuar={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Corregir" })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cambiar" }));

    await usuario.click(screen.getByRole("checkbox", { name: /PMA3375/ }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar 1 vehículos" }));
    expect(JornadaDafService.confirmarVehiculos).toHaveBeenCalledWith(FECHA, [100]);
  });

  it("«Corregir» abre la grilla, desmarcar actualiza el conteo y confirma solo los que salen", async () => {
    const usuario = userEvent.setup();
    const onAviso = vi.fn();
    vi.mocked(JornadaDafService.confirmarVehiculos).mockResolvedValue({
      fecha: FECHA,
      confirmada: true,
      vehiculos: [],
    });
    enRouter(
      <PasoPreparar
        fecha={FECHA}
        resumen={pendiente}
        onRecargar={vi.fn().mockResolvedValue(undefined)}
        onContinuar={vi.fn()}
        onAviso={onAviso}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: "Corregir" }));
    expect(screen.getByText(/\(2 de 3\)/)).toBeInTheDocument();
    // El del taller no se puede marcar.
    expect(screen.getByRole("checkbox", { name: /PMA7058/ })).toBeDisabled();

    await usuario.click(screen.getByRole("checkbox", { name: /PMA3375/ }));
    expect(screen.getByText(/\(1 de 3\)/)).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Confirmar 1 vehículos" }));
    expect(JornadaDafService.confirmarVehiculos).toHaveBeenCalledWith(FECHA, [100]);
    await waitFor(() =>
      expect(onAviso).toHaveBeenCalledWith("Vehículos confirmados: 1 sale hoy."),
    );
  });
});

// ─────────────────────────── Paso 2 ───────────────────────────

const pasoAsignar = (
  datos: ResumenJornadaDaf,
  props: Partial<React.ComponentProps<typeof PasoAsignar>> = {},
) =>
  enRouter(
    <PasoAsignar
      fecha={FECHA}
      resumen={datos}
      soloLectura={false}
      motivoBloqueo={null}
      vista="linea"
      onVista={vi.fn()}
      onRecargar={vi.fn().mockResolvedValue(datos)}
      onVolver={vi.fn()}
      onContinuar={vi.fn()}
      onAviso={vi.fn()}
      {...props}
    />,
  );

describe("Paso 2 · Asignar", () => {
  it("«Asignar automáticamente» propone y confirma, y avisa cuántos cubrió", async () => {
    const usuario = userEvent.setup();
    const onAviso = vi.fn();
    const propuesta = {
      estrategia: "DIFICULTAD",
      cubiertos: 2,
      total: 2,
      avisos: 0,
      asignaciones: [
        {
          tramoIds: [1],
          operativoIds: [1],
          identificadores: ["OCDMIT-001"],
          conductorId: 10,
          conductor: "ESCALERAS KEVIN",
          vehiculoId: 100,
          placa: "PMA7056",
          avisos: [],
        },
      ],
      activaciones: [],
      compartidos: [],
      sinRecurso: [],
    };
    vi.mocked(PlanificacionService.optimizar).mockResolvedValue(propuesta);
    vi.mocked(PlanificacionService.confirmar).mockResolvedValue({
      aplicadas: 1,
      omitidas: [],
      activados: [],
      compartidos: 0,
      compartidosOmitidos: [],
      correlacionId: "c0ffee00-0000-4000-8000-000000000001",
    });
    const despues = resumen({ totales: { ...resumen().totales, cubiertos: 2, sinConductor: 0 } });

    pasoAsignar(resumen(), { onAviso, onRecargar: vi.fn().mockResolvedValue(despues) });
    await usuario.click(screen.getByRole("button", { name: /Asignar automáticamente/ }));

    // Solo pendientes: el optimizador ya deja fijo lo asignado a mano. Libres apagado por defecto.
    expect(PlanificacionService.optimizar).toHaveBeenCalledWith(FECHA, false, true);
    await waitFor(() =>
      expect(PlanificacionService.confirmar).toHaveBeenCalledWith(FECHA, propuesta),
    );
    await waitFor(() =>
      expect(onAviso).toHaveBeenCalledWith("2 operativos asignados automáticamente."),
    );
  });

  it("la cabecera lleva la descripción fija y el detalle va solo bajo la barra", () => {
    pasoAsignar(
      resumen({
        totales: { ...resumen().totales, cubiertos: 1, sinConductor: 1, conductoresEnUso: 1 },
      }),
    );

    expect(
      screen.getByText("El sistema reparte los operativos y usted ajusta lo que haga falta."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("1 conductor en uso · 2 vehículos disponibles · sin avisos"),
    ).toHaveLength(1);
  });

  it("sin pendientes, «Asignar automáticamente» está deshabilitado", () => {
    pasoAsignar(
      resumen({
        totales: { ...resumen().totales, cubiertos: 2, sinConductor: 0 },
        operativos: [operativo({ cubierto: true })],
      }),
    );

    expect(screen.getByRole("button", { name: /Asignar automáticamente/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("✓ Todos los operativos tienen conductor.")).toBeInTheDocument();
  });

  it("sugiere los libres solo si la simulación cubre más, y al aceptarla reasigna con libres", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.simular).mockResolvedValue({
      simulacion: true,
      total: 2,
      cubiertosSinLibres: 1,
      cubiertosConLibres: 2,
      sugerencia: {
        aplica: true,
        pendientesSinLibres: 1,
        operativosExtra: 1,
        libres: [{ conductorId: 11, nombre: "QUISHPE JORGE" }],
      },
    });
    vi.mocked(PlanificacionService.optimizar).mockResolvedValue({
      estrategia: "HORA",
      cubiertos: 0,
      total: 0,
      avisos: 0,
      asignaciones: [],
      activaciones: [],
      compartidos: [],
      sinRecurso: [],
    });

    pasoAsignar(resumen());

    expect(await screen.findByText(/No alcanzan los conductores de turno para 1 operativo/))
      .toHaveTextContent("QUISHPE JORGE");
    await usuario.click(screen.getByRole("button", { name: "Usar conductor de libre" }));
    expect(PlanificacionService.optimizar).toHaveBeenCalledWith(FECHA, true, true);
  });

  it("si la simulación no mejora la cobertura, no muestra la sugerencia", async () => {
    vi.mocked(JornadaDafService.simular).mockResolvedValue({
      simulacion: true,
      total: 2,
      cubiertosSinLibres: 1,
      cubiertosConLibres: 1,
      sugerencia: { aplica: false, pendientesSinLibres: 1, operativosExtra: 0, libres: [] },
    });

    pasoAsignar(resumen());

    await waitFor(() => expect(JornadaDafService.simular).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Usar conductor de libre" })).not.toBeInTheDocument();
  });

  it("la tarjeta «Sin conductor» marca el macrooperativo y el transporte liberado", () => {
    pasoAsignar(
      resumen({
        operativos: [operativo({ esMacrooperativo: true, transporteLiberado: true })],
      }),
    );

    const tarjeta = screen.getByTestId("sin-conductor-1");
    expect(within(tarjeta).getByText("MACRO")).toHaveAttribute(
      "title",
      expect.stringContaining("Prioritario"),
    );
    expect(within(tarjeta).getByText("Transporte liberado")).toBeInTheDocument();
    expect(within(tarjeta).getByText("14H00–18H00 · Quitumbe · Completo")).toBeInTheDocument();
  });

  it("los avisos del conductor van como chips bajo su nombre en la línea de tiempo", async () => {
    pasoAsignar(
      resumen({
        conductores: [
          conductor({
            avisos: [
              {
                codigo: "FUERA_DE_TURNO",
                mensaje: "Fuera de su turno (Día 06H00–18H00)",
                tipo: "AVISO",
              },
            ],
          }),
        ],
      }),
    );

    const avisos = await screen.findByRole("list", { name: "Avisos de ESCALERAS KEVIN" });
    expect(within(avisos).getByText(/Fuera de su turno/)).toBeInTheDocument();
    expect(screen.getByText("Turno día · PMA7056")).toBeInTheDocument();
  });

  it("con la ventana cerrada no se asigna: modo lectura", () => {
    pasoAsignar(resumen(), { soloLectura: true, motivoBloqueo: "Disponible a las 15H55" });

    expect(screen.getByRole("button", { name: /Asignar automáticamente/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/Modo lectura: Disponible a las 15H55/)).toBeInTheDocument();
  });

  // ── Tarea de taller en su cajón (2026-10-16): era un MarcoModal con el error DETRÁS ──
  const TAREA = {
    id: 50,
    operativoId: null,
    identificador: null,
    tipo: "TAREA" as const,
    horaInicio: "09:00",
    horaFin: "10:00",
    cruzaMedianoche: false,
    conductorId: null,
    conductor: null,
    vehiculoId: 100,
    placa: "PMA7056",
    zonalOrigen: null,
    zonalDestino: null,
    compartidoConTramoId: null,
    descripcion: "Llevar PMA7056 a taller",
  };

  it("la tarea de taller abre su cajón, exige el conductor y el error del servidor queda en el cajón", async () => {
    const usuario = userEvent.setup();
    vi.mocked(PlanificacionService.consultar).mockResolvedValue({ ...PLAN, tramos: [TAREA] });
    vi.mocked(PlanificacionService.asignarTarea).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: { codigo: "SOLAPAMIENTO_HORARIO", mensaje: "ESCALERAS KEVIN ya tiene un tramo a esa hora." },
        },
      },
    });
    pasoAsignar(resumen());

    const tarjeta = (await screen.findByText("Llevar PMA7056 a taller")).closest("li")!;
    await usuario.click(within(tarjeta as HTMLElement).getByRole("button", { name: "Asignar conductor" }));

    const cajon = screen.getByRole("dialog", { name: "Llevar PMA7056 a taller" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    // Sin conductor, «Asignar» valida: no envía nada y dice qué falta.
    await usuario.click(within(cajon).getByRole("button", { name: "Asignar" }));
    expect(PlanificacionService.asignarTarea).not.toHaveBeenCalled();
    expect(within(cajon).getByText("Falta: conductor")).toBeInTheDocument();

    await usuario.selectOptions(within(cajon).getByRole("combobox", { name: /Conductor/ }), "10");
    await usuario.click(within(cajon).getByRole("button", { name: "Asignar" }));

    expect(PlanificacionService.asignarTarea).toHaveBeenCalledWith(50, 10);
    expect(await within(cajon).findByText("ESCALERAS KEVIN ya tiene un tramo a esa hora.")).toBeInTheDocument();
  });

  it("quitar el conductor de una tarea confirma antes y avisa al terminar", async () => {
    const usuario = userEvent.setup();
    const onAviso = vi.fn();
    vi.mocked(PlanificacionService.consultar).mockResolvedValue({
      ...PLAN,
      tramos: [{ ...TAREA, conductorId: 10, conductor: "ESCALERAS KEVIN" }],
    });
    vi.mocked(PlanificacionService.quitar).mockResolvedValue({ liberados: [], aviso: null });
    pasoAsignar(resumen(), { onAviso });

    // Asignada, la tarea se abre desde su tramo en la línea de tiempo.
    await usuario.click(await screen.findByRole("button", { name: /Llevar PMA7056 a taller/ }));
    const cajon = screen.getByRole("dialog", { name: "Llevar PMA7056 a taller" });
    expect(within(cajon).getByText("Asignada a ESCALERAS KEVIN.")).toBeInTheDocument();

    await usuario.click(within(cajon).getByRole("button", { name: "Quitar asignación" }));
    expect(PlanificacionService.quitar).not.toHaveBeenCalled();
    await usuario.click(
      within(screen.getByRole("alertdialog", { name: "¿Quitar el conductor de la tarea?" })).getByRole(
        "button",
        { name: "Sí, quitar" },
      ),
    );

    await waitFor(() => expect(PlanificacionService.quitar).toHaveBeenCalledWith(50));
    await waitFor(() => expect(onAviso).toHaveBeenCalledWith("Se quitó el conductor de la tarea."));
  });

  it("el pie dice cuántos quedan y solo deja continuar con al menos uno cubierto", () => {
    pasoAsignar(resumen());
    expect(screen.getByRole("button", { name: "Continuar con 2 sin cubrir →" })).toHaveAttribute("aria-disabled", "true");
  });

  it("la línea pinta las horas libres del servidor, y las de horas extra lo dicen en palabras", async () => {
    vi.mocked(JornadaDafService.huecos).mockResolvedValue({
      fecha: FECHA,
      inicioJornada: "05:00",
      minimoMin: 60,
      zonalDestino: null,
      conductores: [
        {
          conductorId: 10,
          nombre: "ESCALERAS KEVIN",
          turno: "DIA",
          ventana: { inicio: 0, fin: 1440 },
          ventanaTurno: { inicio: 60, fin: 780 },
          huecos: [
            {
              horaInicio: "08:30",
              horaFin: "14:30",
              franja: { inicio: 210, fin: 570 },
              brutoMin: 360,
              utilMinimoMin: 300,
              aprovechableMin: null,
              desde: null,
              hacia: null,
              horasExtra: false,
            },
            {
              horaInicio: "18:00",
              horaFin: "20:00",
              franja: { inicio: 780, fin: 900 },
              brutoMin: 120,
              utilMinimoMin: 105,
              aprovechableMin: null,
              desde: null,
              hacia: null,
              horasExtra: true,
            },
          ],
        },
      ],
      vehiculos: [],
    });

    pasoAsignar(resumen());

    const libres = await screen.findByRole("list", { name: "Horas libres de ESCALERAS KEVIN" });
    expect(within(libres).getByText("Libre 08H30 a 14H30 (útil 5 h)")).toBeInTheDocument();
    expect(
      within(libres).getByText("Libre 18H00 a 20H00 (útil 1 h 45 min) · horas extra"),
    ).toBeInTheDocument();
    expect(JornadaDafService.huecos).toHaveBeenCalledWith(FECHA);
    expect(screen.getAllByTestId("banda-hueco")).toHaveLength(2);
    expect(screen.getByText(/Hora libre \(desde 60 min útiles/)).toBeInTheDocument();
  });

  it("si las horas libres no se pueden leer, la línea se dibuja igual, sin ellas", async () => {
    pasoAsignar(resumen());

    expect(await screen.findByTestId("fila-conductor-10")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /Horas libres de/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Hora libre \(desde/)).not.toBeInTheDocument();
  });
});

// ─────────────────────── Diálogo de candidatos ───────────────────────

const CANDIDATOS: RespuestaCandidatos = {
  operativo: {
    id: 1,
    identificador: "OCDMIT-001",
    formulario: "7. Operativos DMIT/UO",
    horaInicio: "14:00",
    horaFin: "18:00",
    zonal: "Quitumbe",
    tipoTransporte: "COMPLETO",
    esMacrooperativo: false,
  },
  actual: null,
  candidatos: [
    {
      conductorId: 10,
      nombre: "ESCALERAS KEVIN",
      turno: "DIA",
      vehiculoId: 100,
      placa: "PMA7056",
      categoria: "DISPONIBLE",
      motivo: "Disponible en ese horario",
      avisos: [],
      actual: false,
      asignable: true,
    },
    {
      conductorId: 12,
      nombre: "TOAPANTA MARCO",
      turno: "NOCHE",
      vehiculoId: 103,
      placa: "PMA9213",
      categoria: "FUERA_TURNO",
      motivo: "Fuera de su turno (Noche 18H00–07H00)",
      avisos: [],
      actual: false,
      asignable: true,
    },
    {
      conductorId: 13,
      nombre: "ANAGUANO DARWIN",
      turno: "DIA",
      vehiculoId: 101,
      placa: "PMA3375",
      categoria: "OCUPADO",
      motivo: "Ocupado 08H00–16H30 con OCPMO-001",
      avisos: [],
      actual: false,
      asignable: false,
    },
    {
      conductorId: 11,
      nombre: "QUISHPE JORGE",
      turno: "LIBRE",
      vehiculoId: 104,
      placa: "PMA4410",
      categoria: "LIBRE_INACTIVO",
      motivo: "De libre hoy · active «Usar conductores de libre»",
      avisos: [],
      actual: false,
      asignable: false,
    },
  ],
};

const dialogo = (
  props: Partial<React.ComponentProps<typeof DrawerCandidatos>> = {},
  op: OperativoJornada = operativo(),
) =>
  render(
    <DrawerCandidatos
      fecha={FECHA}
      operativo={op}
      soloLectura={false}
      motivoBloqueo={null}
      usarLibres={false}
      onCerrar={vi.fn()}
      onHecho={vi.fn()}
      {...props}
    />,
  );

describe("Cajón «Asignar / Cambiar conductor»", () => {
  it("muestra el motivo de cada uno y deshabilita a los ocupados y a los libres sin activar", async () => {
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    dialogo();

    const ocupado = await screen.findByTestId("candidato-13");
    expect(within(ocupado).getByText("Ocupado 08H00–16H30 con OCPMO-001")).toBeInTheDocument();
    // Apagado CON su motivo en el `title` (estándar de botones): ya no es un rótulo «No disponible».
    const asignarOcupado = within(ocupado).getByRole("button", { name: "Asignar a ANAGUANO DARWIN" });
    expect(asignarOcupado).toHaveAttribute("aria-disabled", "true");
    expect(asignarOcupado).toHaveAttribute("title", "Ocupado 08H00–16H30 con OCPMO-001");
    expect(
      within(screen.getByTestId("candidato-11")).getByRole("button", {
        name: "Asignar a QUISHPE JORGE",
      }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(JornadaDafService.candidatos).toHaveBeenCalledWith(FECHA, 1);
  });

  it("«Asignar» envía el operativo, el conductor y el vehículo que propone el servidor", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.asignar).mockResolvedValue();
    dialogo({ onHecho });

    await usuario.click(await screen.findByRole("button", { name: "Asignar a ESCALERAS KEVIN" }));

    expect(PlanificacionService.asignar).toHaveBeenCalledWith({
      fecha: FECHA,
      operativoIds: [1],
      conductorId: 10,
      vehiculoId: 100,
    });
    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith("OCDMIT-001 asignado a ESCALERAS KEVIN."),
    );
  });

  /*
    REGLA 9 · RN-40: LA DAF ESCRIBE EXACTAMENTE DOS CAMPOS DEL OPERATIVO, conductor y placa.
    Hasta el 2026-10-08 lo vigilaba una prueba que CONTABA los controles habilitados del panel
    clásico de dos campos; ese panel se retiró con el rediseño de «Planificar el día». Ésta es su
    sucesora en el diálogo que lo reemplaza: no ofrece ningún control de captura del operativo
    (solo botones de acción), y lo que envía al asignar solo identifica el operativo y lleva
    conductor y vehículo. Si alguien agrega un campo —al diálogo o al cuerpo—, cae, y debe.
    El servidor sigue siendo la garantía (`ActualizarTransporteDto`, 2 propiedades).
  */
  it("RN-40 · la DAF solo escribe conductor y placa: sin campos del operativo y sin otros datos en el envío", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.asignar).mockResolvedValue();
    dialogo();

    const boton = await screen.findByRole("button", { name: "Asignar a ESCALERAS KEVIN" });
    const dialog = screen.getByRole("dialog");
    for (const rol of ["textbox", "combobox", "spinbutton", "checkbox", "radio", "listbox"] as const) {
      expect(within(dialog).queryAllByRole(rol)).toHaveLength(0);
    }

    await usuario.click(boton);

    const enviado = vi.mocked(PlanificacionService.asignar).mock.calls[0][0];
    // Lo que identifica el operativo (fecha, operativos, tramos) + los DOS campos de la DAF.
    const permitidas = ["fecha", "operativoIds", "tramoIds", "conductorId", "vehiculoId"];
    expect(Object.keys(enviado).every((clave) => permitidas.includes(clave))).toBe(true);
    expect(enviado).toHaveProperty("conductorId");
    expect(enviado).toHaveProperty("vehiculoId");
  });

  it("fuera de turno ofrece «Asignar igual» y asigna igual (el aviso queda en su carril)", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.asignar).mockResolvedValue();
    dialogo();

    const fuera = await screen.findByTestId("candidato-12");
    expect(within(fuera).getByText("Fuera de su turno (Noche 18H00–07H00)")).toBeInTheDocument();
    await usuario.click(within(fuera).getByRole("button", { name: /Asignar igual/ }));

    expect(PlanificacionService.asignar).toHaveBeenCalledWith(
      expect.objectContaining({ conductorId: 12, vehiculoId: 103 }),
    );
  });

  it("con «Usar conductores de libre», el de libre se activa con su motivo y se asigna", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.activar).mockResolvedValue();
    vi.mocked(PlanificacionService.asignar).mockResolvedValue();
    dialogo({ usarLibres: true });

    const libre = await screen.findByTestId("candidato-11");
    await usuario.click(within(libre).getByRole("button", { name: "Activar y asignar" }));
    const confirmar = within(libre).getByRole("button", { name: "Confirmar activación" });
    expect(confirmar).toHaveAttribute("aria-disabled", "true");
    await usuario.type(within(libre).getByRole("textbox"), "Faltan conductores");
    await usuario.click(confirmar);

    expect(PlanificacionService.activar).toHaveBeenCalledWith(FECHA, 11, "Faltan conductores");
    await waitFor(() =>
      expect(PlanificacionService.asignar).toHaveBeenCalledWith(
        expect.objectContaining({ conductorId: 11 }),
      ),
    );
  });

  it("«Quitar asignación» suelta cada tramo con conductor y lo devuelve a pendientes", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue({
      ...CANDIDATOS,
      actual: { conductorId: 10, nombre: "ESCALERAS KEVIN" },
    });
    vi.mocked(PlanificacionService.quitar).mockResolvedValue({ liberados: [], aviso: null });
    dialogo(
      { onHecho },
      operativo({
        cubierto: true,
        tramos: [
          { id: 7, tipo: "DEJAR", horaInicio: "13:30", horaFin: "14:00", conductorId: 10, conductor: "ESCALERAS KEVIN", vehiculoId: 100, placa: "PMA7056" },
          { id: 8, tipo: "RETIRAR", horaInicio: "18:00", horaFin: "18:30", conductorId: 10, conductor: "ESCALERAS KEVIN", vehiculoId: 100, placa: "PMA7056" },
        ],
      }),
    );

    expect(await screen.findByText("Asignado hoy a ESCALERAS KEVIN")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Quitar asignación" }));

    // Confirma antes (peligro): nada se suelta hasta «Sí, quitar».
    const confirmacion = screen.getByRole("alertdialog", {
      name: "¿Quitar la asignación de OCDMIT-001?",
    });
    expect(PlanificacionService.quitar).not.toHaveBeenCalled();
    await usuario.click(within(confirmacion).getByRole("button", { name: "Sí, quitar" }));

    await waitFor(() => expect(PlanificacionService.quitar).toHaveBeenCalledTimes(2));
    expect(PlanificacionService.quitar).toHaveBeenCalledWith(7);
    expect(PlanificacionService.quitar).toHaveBeenCalledWith(8);
    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith("OCDMIT-001 vuelve a quedar sin conductor."),
    );
  });

  it("si el servidor rechaza «Quitar asignación», el error queda en la misma confirmación", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue({
      ...CANDIDATOS,
      actual: { conductorId: 10, nombre: "ESCALERAS KEVIN" },
    });
    vi.mocked(PlanificacionService.quitar).mockRejectedValue({
      status: 423,
      originalError: {
        response: {
          data: { codigo: "VENTANA_CARGA_CERRADA", mensaje: "La ventana de asignación está cerrada." },
        },
      },
    });
    dialogo(
      { onHecho },
      operativo({
        cubierto: true,
        tramos: [
          { id: 7, tipo: "DEJAR", horaInicio: "13:30", horaFin: "14:00", conductorId: 10, conductor: "ESCALERAS KEVIN", vehiculoId: 100, placa: "PMA7056" },
        ],
      }),
    );

    await usuario.click(await screen.findByRole("button", { name: "Quitar asignación" }));
    await usuario.click(screen.getByRole("button", { name: "Sí, quitar" }));

    const error = await screen.findByRole("alertdialog", { name: "No se pudo quitar la asignación" });
    expect(error).toBeInTheDocument();
    expect(onHecho).not.toHaveBeenCalled();
    // El cajón sigue abierto detrás: no se cerró para avisar en otra parte.
    expect(screen.getByRole("dialog", { name: /Cambiar conductor · OCDMIT-001/ })).toBeInTheDocument();
  });

  it("es un cajón: un solo diálogo, en consulta, con «Cerrar» en el pie", async () => {
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    dialogo();

    await screen.findByTestId("candidato-10");
    const cajon = screen.getByRole("dialog", { name: "Asignar conductor · OCDMIT-001" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(cajon).getAllByRole("button", { name: "Cerrar" }).length).toBeGreaterThan(0);
    expect(within(cajon).queryByRole("button", { name: /Guardar/ })).not.toBeInTheDocument();
  });

  // ── Sustitución de flota (2026-10-15) ──
  const PLACAS = {
    conductorId: 10,
    propuestoId: 100,
    vehiculos: [
      {
        vehiculoId: 100,
        placa: "PMA-7056",
        descripcion: null,
        tipo: "Camioneta",
        asientos: 4,
        propuesto: true,
        estado: "OK" as const,
        motivos: [],
        ocupadaPor: null,
      },
      {
        vehiculoId: 105,
        placa: "PMA-7895",
        descripcion: "Camioneta doble cabina",
        tipo: "Camioneta",
        asientos: 5,
        propuesto: false,
        estado: "AVISO" as const,
        motivos: [
          { codigo: "ARRANQUE_LEJOS", mensaje: "El vehículo amanece en otro sector.", tipo: "AVISO" as const },
        ],
        ocupadaPor: null,
      },
      {
        vehiculoId: 106,
        placa: "PMA-7058",
        descripcion: null,
        tipo: "Camioneta",
        asientos: 4,
        propuesto: false,
        estado: "DURO" as const,
        motivos: [
          { codigo: "VEHICULO_EN_TALLER", mensaje: "El vehículo está en el taller ese día.", tipo: "DURO" as const },
        ],
        ocupadaPor: null,
      },
      {
        vehiculoId: 107,
        placa: "PMA-9212",
        descripcion: null,
        tipo: "Camioneta",
        asientos: 4,
        propuesto: false,
        estado: "DURO" as const,
        motivos: [
          { codigo: "PLACA_OCUPADA", mensaje: "La placa PMA-9212 ya está con ZAMORA ANA de 09:00 a 11:00.", tipo: "DURO" as const },
        ],
        ocupadaPor: { conductorId: 8, nombre: "ZAMORA ANA", horaInicio: "09:00", horaFin: "11:00" },
      },
    ],
  };

  it("«Cambiar vehículo» pide las placas SOLO de ese candidato y el desplegable arranca en la propuesta", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.evaluarVehiculos).mockResolvedValue(PLACAS);
    dialogo();

    const kevin = await screen.findByTestId("candidato-10");
    // Al abrir no se pide ninguna placa: una llamada por candidato solo si se pulsa.
    expect(PlanificacionService.evaluarVehiculos).not.toHaveBeenCalled();
    await usuario.click(within(kevin).getByRole("button", { name: "Cambiar vehículo de ESCALERAS KEVIN" }));

    expect(PlanificacionService.evaluarVehiculos).toHaveBeenCalledWith({
      fecha: FECHA,
      operativoIds: [1],
      conductorId: 10,
    });
    const select = await within(kevin).findByRole("combobox", { name: "Vehículo de ESCALERAS KEVIN" });
    expect(select).toHaveValue("100");
  });

  it("la placa en taller u ocupada va deshabilitada con su motivo; la de aviso se elige y su aviso se lee", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.evaluarVehiculos).mockResolvedValue(PLACAS);
    dialogo();

    const kevin = await screen.findByTestId("candidato-10");
    await usuario.click(within(kevin).getByRole("button", { name: "Cambiar vehículo de ESCALERAS KEVIN" }));
    await within(kevin).findByRole("combobox", { name: "Vehículo de ESCALERAS KEVIN" });

    expect(within(kevin).getByRole("option", { name: "PMA-7058 (4 asientos) — en taller" })).toBeDisabled();
    expect(
      within(kevin).getByRole("option", { name: "PMA-9212 (4 asientos) — ocupada por ZAMORA ANA 09H00–11H00" }),
    ).toBeDisabled();
    const conAviso = within(kevin).getByRole("option", { name: "PMA-7895 · Camioneta doble cabina (5 asientos)" });
    expect(conAviso).toBeEnabled();

    await usuario.selectOptions(within(kevin).getByRole("combobox"), "105");
    expect(within(kevin).getByText("⚠ El vehículo amanece en otro sector.")).toBeInTheDocument();
  });

  it("asignar envía la placa elegida (RN-40: solo conductor y placa)", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.evaluarVehiculos).mockResolvedValue(PLACAS);
    vi.mocked(PlanificacionService.asignar).mockResolvedValue();
    dialogo({ onHecho });

    const kevin = await screen.findByTestId("candidato-10");
    await usuario.click(within(kevin).getByRole("button", { name: "Cambiar vehículo de ESCALERAS KEVIN" }));
    await usuario.selectOptions(
      await within(kevin).findByRole("combobox", { name: "Vehículo de ESCALERAS KEVIN" }),
      "105",
    );
    // El único control de captura del diálogo es la placa (uno de los dos campos de la DAF).
    expect(within(screen.getByRole("dialog")).getAllByRole("combobox")).toHaveLength(1);
    await usuario.click(within(kevin).getByRole("button", { name: "Asignar a ESCALERAS KEVIN" }));

    expect(PlanificacionService.asignar).toHaveBeenCalledWith({
      fecha: FECHA,
      operativoIds: [1],
      conductorId: 10,
      vehiculoId: 105,
    });
    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith("OCDMIT-001 asignado a ESCALERAS KEVIN."),
    );
  });

  it("«Sin vehículo» envía null y el mensaje dice que falta la placa", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.evaluarVehiculos).mockResolvedValue(PLACAS);
    vi.mocked(PlanificacionService.asignar).mockResolvedValue();
    dialogo({ onHecho });

    const kevin = await screen.findByTestId("candidato-10");
    await usuario.click(within(kevin).getByRole("button", { name: "Cambiar vehículo de ESCALERAS KEVIN" }));
    await usuario.selectOptions(
      await within(kevin).findByRole("combobox", { name: "Vehículo de ESCALERAS KEVIN" }),
      "",
    );
    expect(
      within(kevin).getByText("⚠ Sin vehículo: el operativo sigue pendiente hasta tener placa."),
    ).toBeInTheDocument();
    await usuario.click(within(kevin).getByRole("button", { name: "Asignar a ESCALERAS KEVIN" }));

    expect(PlanificacionService.asignar).toHaveBeenCalledWith(
      expect.objectContaining({ conductorId: 10, vehiculoId: null }),
    );
    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith(
        "OCDMIT-001 asignado a ESCALERAS KEVIN sin vehículo: falta la placa.",
      ),
    );
  });

  it("un candidato sin placa propuesta asigna sin vehículo y el mensaje lo dice", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue({
      ...CANDIDATOS,
      candidatos: [{ ...CANDIDATOS.candidatos[0], vehiculoId: null, placa: null }],
    });
    vi.mocked(PlanificacionService.asignar).mockResolvedValue();
    dialogo({ onHecho });

    await usuario.click(await screen.findByRole("button", { name: "Asignar a ESCALERAS KEVIN" }));

    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith(
        "OCDMIT-001 asignado a ESCALERAS KEVIN sin vehículo: falta la placa.",
      ),
    );
  });

  it("si la evaluación de placas falla, el mensaje del servidor se muestra tal cual", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.evaluarVehiculos).mockRejectedValue({
      isAxiosError: true,
      response: { status: 423, data: { codigo: "VENTANA_CARGA_CERRADA", mensaje: "La ventana de la DAF está cerrada." } },
    });
    dialogo();

    const kevin = await screen.findByTestId("candidato-10");
    await usuario.click(within(kevin).getByRole("button", { name: "Cambiar vehículo de ESCALERAS KEVIN" }));
    expect(await within(kevin).findByRole("alert")).toBeInTheDocument();
  });

  it("propios medios se conserva como acción secundaria", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(TransporteService.declararPropiosMedios).mockResolvedValue({
      id: 1,
      identificador: "OCDMIT-001",
      estadoTransporte: "PROPIOS_MEDIOS",
      conductor: null,
      vehiculo: null,
      asignadoEn: null,
      alertaActiva: false,
    });
    dialogo();

    await usuario.click(await screen.findByRole("button", { name: "Propios medios" }));
    expect(TransporteService.declararPropiosMedios).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────── Paso 3 ───────────────────────────

describe("Paso 3 · Fin del día", () => {
  const conGuardas = resumen({ finDelDia: [guarda()] });

  it("llega con el garaje sugerido elegido y lo confirma como GARAJE", async () => {
    const usuario = userEvent.setup();
    const onContinuar = vi.fn();
    vi.mocked(PlanificacionService.guardarFinDelDia).mockResolvedValue({
      guardadas: 1,
      errores: [],
    });
    enRouter(
      <PasoFinDelDia
        fecha={FECHA}
        resumen={conGuardas}
        soloLectura={false}
        motivoBloqueo={null}
        onRecargar={vi.fn().mockResolvedValue(conGuardas)}
        onVolver={vi.fn()}
        onContinuar={onContinuar}
        onAviso={vi.fn()}
      />,
    );

    const opciones = within(
      screen.getByRole("combobox", { name: "Dónde se guarda PMA7056" }),
    ).getAllByRole("option");
    // Los garajes del catálogo por su nombre, y el parqueadero: nada de «· sugerido» en el texto.
    expect(opciones.map((o) => o.textContent)).toEqual([
      "Elija…",
      "Garaje Centro",
      "Garaje Sur",
      "Parqueadero autorizado (requiere acta)",
    ]);
    expect(screen.getByRole("combobox", { name: "Dónde se guarda PMA7056" })).toHaveValue("3");
    expect(screen.getByText("Sugerido")).toBeInTheDocument();
    expect(screen.getByText("OCFIJ-002 · termina 17H00 en Centro")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Confirmar y continuar →" }));

    expect(PlanificacionService.guardarFinDelDia).toHaveBeenCalledWith(FECHA, [
      { vehiculoId: 100, tipo: "GARAJE", ubicacionId: 3, conductorId: 10 },
    ]);
    await waitFor(() => expect(onContinuar).toHaveBeenCalled());
  });

  it("con el catálogo REAL, un garaje que se llama como su zona se lee «Garaje …», y avisa «Garajes confirmados»", async () => {
    const usuario = userEvent.setup();
    const onAviso = vi.fn();
    vi.mocked(PlanificacionService.guardarFinDelDia).mockResolvedValue({
      guardadas: 1,
      errores: [],
    });
    enRouter(
      <PasoFinDelDia
        fecha={FECHA}
        resumen={RESUMEN_REAL_HOJAS_EMITIDAS}
        soloLectura={false}
        motivoBloqueo={null}
        onRecargar={vi.fn().mockResolvedValue(RESUMEN_REAL_HOJAS_EMITIDAS)}
        onVolver={vi.fn()}
        onContinuar={vi.fn()}
        onAviso={onAviso}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Dónde se guarda PBA-1235" });
    // Solo los garajes autorizados del catálogo (`resumen.garajes`), nunca «Zonal Calderón».
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Elija…",
      "Garaje Calderón",
      "Garaje Eloy Alfaro",
      "Garaje Los Chillos",
      "Garaje Matriz",
      "Garaje PRUEBA",
      "Garaje Quitumbe",
      "Parqueadero autorizado (requiere acta) · el conductor no lo tiene",
    ]);
    expect(select).toHaveValue("3");
    expect(screen.getByText("Sugerido")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Confirmar y continuar →" }));
    await waitFor(() => expect(onAviso).toHaveBeenCalledWith("Garajes confirmados: 1 vehículo"));
  });

  it("el distintivo «Sugerido» sigue al garaje más cercano, no a cualquiera elegido", async () => {
    const usuario = userEvent.setup();
    enRouter(
      <PasoFinDelDia
        fecha={FECHA}
        resumen={resumen({ finDelDia: [guarda({ ubicacionId: 4, ubicacion: "Garaje Sur" })] })}
        soloLectura={false}
        motivoBloqueo={null}
        onRecargar={vi.fn()}
        onVolver={vi.fn()}
        onContinuar={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Dónde se guarda PMA7056" });
    expect(select).toHaveValue("4");
    expect(screen.getByText("Sugerido")).toBeInTheDocument();
    await usuario.selectOptions(select, "3");
    expect(screen.queryByText("Sugerido")).not.toBeInTheDocument();
  });

  it("el parqueadero exige el número de acta antes de confirmar", async () => {
    const usuario = userEvent.setup();
    vi.mocked(PlanificacionService.guardarFinDelDia).mockResolvedValue({
      guardadas: 1,
      errores: [],
    });
    enRouter(
      <PasoFinDelDia
        fecha={FECHA}
        resumen={conGuardas}
        soloLectura={false}
        motivoBloqueo={null}
        onRecargar={vi.fn().mockResolvedValue(conGuardas)}
        onVolver={vi.fn()}
        onContinuar={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    await usuario.selectOptions(
      screen.getByRole("combobox", { name: "Dónde se guarda PMA7056" }),
      "PARQUEADERO",
    );
    const confirmar = screen.getByRole("button", { name: "Confirmar y continuar →" });
    expect(confirmar).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Falta el número de acta");

    await usuario.type(screen.getByRole("textbox", { name: "N.º de acta de PMA7056" }), "ACTA-9");
    expect(confirmar).not.toHaveAttribute("aria-disabled");
    await usuario.click(confirmar);

    expect(PlanificacionService.guardarFinDelDia).toHaveBeenCalledWith(FECHA, [
      { vehiculoId: 100, tipo: "DOMICILIO", ubicacionId: null, conductorId: 10, actaNumero: "ACTA-9" },
    ]);
  });

  it("un acta que no es la vigente vuelve en la fila del vehículo y no avanza", async () => {
    const usuario = userEvent.setup();
    const onContinuar = vi.fn();
    vi.mocked(PlanificacionService.guardarFinDelDia).mockResolvedValue({
      guardadas: 0,
      errores: [{ vehiculoId: 100, motivo: "El acta N.º ACTA-1 no es la vigente de ESCALERAS KEVIN: revise el número." }],
    });
    enRouter(
      <PasoFinDelDia
        fecha={FECHA}
        resumen={conGuardas}
        soloLectura={false}
        motivoBloqueo={null}
        onRecargar={vi.fn().mockResolvedValue(conGuardas)}
        onVolver={vi.fn()}
        onContinuar={onContinuar}
        onAviso={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: "Confirmar y continuar →" }));

    expect(await screen.findByText(/no es la vigente de ESCALERAS KEVIN/)).toBeInTheDocument();
    expect(onContinuar).not.toHaveBeenCalled();
  });
});

// ─────────────────────────── Paso 4 ───────────────────────────

describe("Paso 4 · Emitir", () => {
  const paraEmitir = (estados: ("PENDIENTE" | "EMITIDA" | "PENDIENTE_CAMBIO")[]) =>
    resumen({
      conductores: estados.map((estado, i) =>
        conductor({
          id: 10 + i,
          nombre: `CONDUCTOR ${i + 1}`,
          hojaRuta: { estado, emitidaEn: null },
        }),
      ),
      finDelDia: [guarda({ declarada: { tipo: "GARAJE", ubicacion: "Garaje Centro", ubicacionId: 3, conductorId: 10, actaNumero: null } })],
    });

  it("«Emitir todas» emite sin conductor; «Emitir» de una fila, con el suyo", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.emitir).mockResolvedValue({ emitidas: 2, hojas: [] });
    const datos = paraEmitir(["PENDIENTE", "PENDIENTE"]);
    render(
      <PasoEmitir
        fecha={FECHA}
        resumen={datos}
        onRecargar={vi.fn().mockResolvedValue(datos)}
        onVolver={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: "Emitir todas las hojas de ruta" }));
    expect(JornadaDafService.emitir).toHaveBeenCalledWith(FECHA, undefined);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Emitir la hoja de CONDUCTOR 2" })).not.toHaveAttribute("aria-disabled"),
    );
    await usuario.click(screen.getByRole("button", { name: "Emitir la hoja de CONDUCTOR 2" }));
    expect(JornadaDafService.emitir).toHaveBeenLastCalledWith(FECHA, 11);
  });

  it("una hoja cambiada después de emitir vuelve a «Pendiente (cambio posterior)»", () => {
    render(
      <PasoEmitir
        fecha={FECHA}
        resumen={paraEmitir(["EMITIDA", "PENDIENTE_CAMBIO"])}
        onRecargar={vi.fn()}
        onVolver={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    const cambiada = screen.getByTestId("hoja-11");
    expect(within(cambiada).getByText("Pendiente (cambio posterior)")).toBeInTheDocument();
    expect(within(cambiada).getByRole("button", { name: /Emitir/ })).not.toHaveAttribute("aria-disabled");
    expect(within(screen.getByTestId("hoja-10")).getByRole("button", { name: /Ver hoja/ }))
      .toBeInTheDocument();
    expect(within(cambiada).getByText("PMA7056 · guarda en Garaje Centro")).toBeInTheDocument();
  });

  it("con el catálogo REAL dice «guarda en Garaje Calderón», no el nombre de la zona a secas", () => {
    render(
      <PasoEmitir
        fecha={FECHA}
        resumen={RESUMEN_REAL_HOJAS_EMITIDAS}
        onRecargar={vi.fn()}
        onVolver={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    expect(
      within(screen.getByTestId("hoja-52")).getByText("PBA-1235 · guarda en Garaje Calderón"),
    ).toBeInTheDocument();
  });

  it("con todas emitidas, el botón principal dice «✓ Hojas emitidas»", () => {
    render(
      <PasoEmitir
        fecha={FECHA}
        resumen={paraEmitir(["EMITIDA", "EMITIDA"])}
        onRecargar={vi.fn()}
        onVolver={vi.fn()}
        onAviso={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "✓ Hojas emitidas" })).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(
        "La orden de movilización oficial y su número se emiten en el sistema de órdenes de movilización.",
      ),
    ).toBeInTheDocument();
  });
});

// ─────────────────────────── Stepper ───────────────────────────

describe("Stepper de «Planificar el día»", () => {
  const pagina = () =>
    render(
      <MemoryRouter initialEntries={[`/home/cuadro/transporte?fecha=${FECHA}`]}>
        <FechaDafProvider>
          <AsignacionTransportePage />
        </FechaDafProvider>
      </MemoryRouter>,
    );

  it("abre en el paso que deriva de la jornada y no deja saltar a uno no alcanzado", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.resumen).mockResolvedValue(resumen());
    pagina();

    expect(await screen.findByRole("heading", { name: "Paso 2 · Asignar conductores" }))
      .toBeInTheDocument();
    const pasos = screen.getByRole("list", { name: "Pasos de la planificación" });
    expect(within(pasos).getByRole("button", { name: /Emitir/ })).toHaveAttribute("aria-disabled", "true");
    expect(within(pasos).getByRole("button", { name: /Fin del día/ })).toHaveAttribute("aria-disabled", "true");

    await usuario.click(within(pasos).getByRole("button", { name: /Preparar/ }));
    expect(screen.getByRole("heading", { name: "Paso 1 · Preparar la jornada" })).toBeInTheDocument();
  });

  it("con las hojas emitidas abre en Emitir, y el paso actual completado lleva ✓", async () => {
    vi.mocked(JornadaDafService.resumen).mockResolvedValue(
      resumen({
        totales: { ...resumen().totales, cubiertos: 2, sinConductor: 0 },
        conductores: [conductor({ hojaRuta: { estado: "EMITIDA", emitidaEn: null } })],
        finDelDia: [
          guarda({
            declarada: {
              tipo: "GARAJE",
              ubicacion: "Garaje Centro",
              ubicacionId: 3,
              conductorId: 10,
              actaNumero: null,
            },
          }),
        ],
      }),
    );
    pagina();

    expect(await screen.findByRole("heading", { name: "Paso 4 · Emitir hojas de ruta" }))
      .toBeInTheDocument();
    const pasos = screen.getByRole("list", { name: "Pasos de la planificación" });
    const actual = within(pasos).getByRole("button", { name: /Emitir/ });
    expect(actual.closest("li")).toHaveAttribute("aria-current", "step");
    // ✓ y no el número: el halo dice «aquí», el ✓ dice «hecho».
    expect(within(actual).getByText("completado")).toBeInTheDocument();
    expect(within(actual).queryByText("4")).not.toBeInTheDocument();
  });

  it("con todo asignado abre en Fin del día aunque falte confirmar los vehículos", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.resumen).mockResolvedValue(
      resumen({
        preparacion: { ...resumen().preparacion, listos: false, pendientes: 1 },
        totales: { ...resumen().totales, cubiertos: 2, sinConductor: 0 },
        finDelDia: [guarda()],
      }),
    );
    pagina();

    expect(await screen.findByRole("heading", { name: "Paso 3 · Dónde se guarda cada vehículo" }))
      .toBeInTheDocument();
    const pasos = screen.getByRole("list", { name: "Pasos de la planificación" });
    expect(within(pasos).getByRole("button", { name: /Emitir/ })).toHaveAttribute("aria-disabled", "true");
    // Se puede volver al 1 a resolver lo pendiente.
    await usuario.click(within(pasos).getByRole("button", { name: /Preparar/ }));
    expect(screen.getByRole("heading", { name: "Paso 1 · Preparar la jornada" })).toBeInTheDocument();
  });

  it("sin requisitos listos abre en Preparar", async () => {
    vi.mocked(JornadaDafService.resumen).mockResolvedValue(
      resumen({ preparacion: { ...resumen().preparacion, listos: false, pendientes: 1 } }),
    );
    pagina();

    expect(await screen.findByRole("heading", { name: "Paso 1 · Preparar la jornada" }))
      .toBeInTheDocument();
    const pasos = screen.getByRole("list", { name: "Pasos de la planificación" });
    expect(within(pasos).getByRole("button", { name: /Asignar/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("con la respuesta REAL del servidor (hojas emitidas) abre en Emitir", async () => {
    vi.mocked(JornadaDafService.resumen).mockResolvedValue(RESUMEN_REAL_HOJAS_EMITIDAS);
    pagina();

    expect(await screen.findByRole("heading", { name: "Paso 4 · Emitir hojas de ruta" }))
      .toBeInTheDocument();
  });

  it("al cambiar la fecha vuelve a derivar el paso de la jornada nueva", async () => {
    vi.mocked(JornadaDafService.resumen).mockImplementation(async (fecha: string) =>
      fecha === FECHA
        ? RESUMEN_REAL_HOJAS_EMITIDAS
        : resumen({ preparacion: { ...resumen().preparacion, listos: false, pendientes: 1 } }),
    );
    pagina();
    expect(await screen.findByRole("heading", { name: "Paso 4 · Emitir hojas de ruta" }))
      .toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fecha de la jornada/), {
      target: { value: "2026-10-10" },
    });

    expect(await screen.findByRole("heading", { name: "Paso 1 · Preparar la jornada" }))
      .toBeInTheDocument();
  });

  it("una respuesta que llega TARDE (fecha abandonada) no pisa la de la fecha elegida", async () => {
    // La primera lectura (otra fecha) tarda; la segunda (la elegida, hojas emitidas) llega antes.
    let soltarLaVieja: (valor: ResumenJornadaDaf) => void = () => undefined;
    vi.mocked(JornadaDafService.resumen).mockImplementation((fecha: string) =>
      fecha === FECHA
        ? Promise.resolve(RESUMEN_REAL_HOJAS_EMITIDAS)
        : new Promise<ResumenJornadaDaf>((resolver) => {
            soltarLaVieja = resolver;
          }),
    );
    render(
      <MemoryRouter initialEntries={["/home/cuadro/transporte?fecha=2026-10-01"]}>
        <FechaDafProvider>
          <AsignacionTransportePage />
        </FechaDafProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/Fecha de la jornada/), { target: { value: FECHA } });
    expect(await screen.findByRole("heading", { name: "Paso 4 · Emitir hojas de ruta" }))
      .toBeInTheDocument();

    // Llega la vieja (sin requisitos): la pantalla sigue en la fecha elegida.
    await act(async () => {
      soltarLaVieja(
        resumen({ preparacion: { ...resumen().preparacion, listos: false, pendientes: 1 } }),
      );
    });
    expect(screen.getByRole("heading", { name: "Paso 4 · Emitir hojas de ruta" })).toBeInTheDocument();
  });
});

// ─────────────────────── Compartir unidad (2026-10-19) ───────────────────────

describe("Compartir unidad · la DAF ejecuta lo que pidió quien registró", () => {
  const ANFITRION = {
    operativoId: 600,
    identificador: "OCPMO-001",
    formulario: "2. CONTROL DE PMO",
    horaInicio: "08:00",
    horaFin: "16:30",
    conductor: { id: 53, nombre: "ESCALERAS KEVIN" },
    vehiculo: { id: 80, placa: "PMA-3370", asientos: 4 },
    asientosLibres: 3,
    solicitado: true,
    compatible: true,
    motivo: null,
  };

  it("los asientos se cuentan por momento: 3 de 3 al dejar y al retirar (PMA-3370 con 3) y, si no cabe, el motivo", async () => {
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.compartibles).mockResolvedValue({
      operativoId: 1,
      identificador: "OCPMO-004",
      solicitado: { operativoId: 600, identificador: "OCPMO-001" },
      anfitriones: [
        {
          ...ANFITRION,
          vehiculo: { id: 80, placa: "PMA-3370", asientos: 3 },
          asientosLibres: 1,
          personasConInvitado: 3,
          asientosPorMomento: [
            { tipo: "DEJAR", hora: "08:00", ocupados: 3 },
            { tipo: "RETIRAR", hora: "16:00", ocupados: 3 },
          ],
        },
        {
          ...ANFITRION,
          operativoId: 602,
          identificador: "OCPMO-007",
          solicitado: false,
          vehiculo: { id: 81, placa: "PMA-7057", asientos: 2 },
          asientosLibres: 0,
          personasConInvitado: null,
          asientosPorMomento: [],
          compatible: false,
          motivo:
            "No caben a las 08:00: la unidad llevaría 3 personas y el vehículo tiene 2 asientos.",
        },
      ],
    });
    dialogo({}, operativo({ compartirCon: { id: 600, identificador: "OCPMO-001" } }));

    const conSitio = await screen.findByTestId("compartible-600");
    expect(
      within(conSitio).getByText(
        /PMA-3370 · Al dejar \(08:00\): 3 de 3 · Al retirar \(16:00\): 3 de 3/,
      ),
    ).toBeInTheDocument();

    const lleno = screen.getByTestId("compartible-602");
    expect(within(lleno).getByText(/PMA-7057 · 0 de 2 asientos libres/)).toBeInTheDocument();
    expect(
      within(lleno).getByText(
        "No caben a las 08:00: la unidad llevaría 3 personas y el vehículo tiene 2 asientos.",
      ),
    ).toBeInTheDocument();
    expect(within(lleno).getByRole("button", { name: /con OCPMO-007/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("el cajón ofrece «Compartir unidad» con el pedido primero, y lo ejecuta con un clic", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.compartibles).mockResolvedValue({
      operativoId: 1,
      identificador: "OCDMIT-001",
      solicitado: { operativoId: 600, identificador: "OCPMO-001" },
      anfitriones: [
        ANFITRION,
        {
          ...ANFITRION,
          operativoId: 601,
          identificador: "OCPMO-003",
          solicitado: false,
          compatible: false,
          motivo: "No piden el mismo traslado.",
        },
      ],
    });
    vi.mocked(PlanificacionService.compartir).mockResolvedValue({
      compartidoCon: { operativoId: 600, identificador: "OCPMO-001" },
    });
    dialogo({ onHecho }, operativo({ compartirCon: { id: 600, identificador: "OCPMO-001" } }));

    // Lo que pidió quien registró, a la vista de la DAF.
    expect(screen.getByText("Pide compartir con OCPMO-001")).toBeInTheDocument();
    const pedido = await screen.findByTestId("compartible-600");
    expect(within(pedido).getByText("Solicitado por el registrante")).toBeInTheDocument();
    expect(within(pedido).getByText(/PMA-3370 · 3 de 4 asientos libres/)).toBeInTheDocument();

    // El incompatible, apagado con su motivo (regla 6).
    const otro = screen.getByTestId("compartible-601");
    expect(within(otro).getByRole("button", { name: "Compartir unidad con OCPMO-003" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await usuario.click(within(pedido).getByRole("button", { name: "Compartir unidad con OCPMO-001" }));
    expect(PlanificacionService.compartir).toHaveBeenCalledWith(1, 600);
    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith(
        "OCDMIT-001 comparte la unidad de OCPMO-001 (ESCALERAS KEVIN · PMA-3370).",
      ),
    );
  });

  it("quitar al anfitrión avisa antes a quién deja sin conductor, y después dice lo que respondió el servidor", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue({
      ...CANDIDATOS,
      actual: { conductorId: 10, nombre: "ESCALERAS KEVIN" },
    });
    vi.mocked(PlanificacionService.quitar).mockResolvedValue({
      liberados: [{ operativoId: 2, identificador: "OCPMO-004" }],
      aviso: "1 operativo que compartía esta unidad quedó sin conductor: OCPMO-004.",
    });
    dialogo(
      { onHecho, invitados: ["OCPMO-004"] },
      operativo({
        cubierto: true,
        tramos: [
          { id: 7, tipo: "DEJAR", horaInicio: "08:00", horaFin: "08:30", conductorId: 10, conductor: "ESCALERAS KEVIN", vehiculoId: 100, placa: "PMA7056" },
        ],
      }),
    );

    await usuario.click(await screen.findByRole("button", { name: "Quitar asignación" }));
    const confirmacion = screen.getByRole("alertdialog", {
      name: "¿Quitar la asignación de OCDMIT-001?",
    });
    expect(confirmacion).toHaveTextContent(
      "1 operativo que comparte esta unidad quedará sin conductor: OCPMO-004.",
    );
    await usuario.click(within(confirmacion).getByRole("button", { name: "Sí, quitar" }));
    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith(
        "OCDMIT-001 vuelve a quedar sin conductor. 1 operativo que compartía esta unidad quedó sin conductor: OCPMO-004.",
      ),
    );
  });

  it("«la misma unidad»: dice qué comparten y si la unidad hace el retiro; si queda pendiente, lo avisa", async () => {
    const usuario = userEvent.setup();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue(CANDIDATOS);
    vi.mocked(PlanificacionService.compartibles).mockResolvedValue({
      operativoId: 1,
      identificador: "OCDMIT-001",
      solicitado: { operativoId: 600, identificador: "OCPMO-001" },
      anfitriones: [
        {
          ...ANFITRION,
          comparte: ["dejar"],
          propios: ["retirar"],
          propiosViables: false,
          motivoPropios: "Ya tiene un tramo a esa hora.",
        },
      ],
    });
    vi.mocked(PlanificacionService.compartir).mockResolvedValue({
      compartidoCon: { operativoId: 600, identificador: "OCPMO-001" },
      tramosPropios: [{ tramoId: 21, tipo: "RETIRAR", asignado: false, motivo: "Ya tiene un tramo a esa hora." }],
      aviso: "El retiro quedó pendiente: Ya tiene un tramo a esa hora. Asígnelo con «Asignar conductor».",
    });
    dialogo({ onHecho: vi.fn() }, operativo({ compartirCon: { id: 600, identificador: "OCPMO-001" } }));

    expect(await screen.findByTestId("misma-unidad-600")).toHaveTextContent(
      "Comparte: dejar · Retiro con la misma unidad: no viable (Ya tiene un tramo a esa hora.)",
    );
    await usuario.click(screen.getByRole("button", { name: "Compartir unidad con OCPMO-001" }));
    expect(await screen.findByText(/El retiro quedó pendiente/)).toBeInTheDocument();
  });

  it("con una asignación ya hecha no se ofrece compartir", async () => {
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue({
      ...CANDIDATOS,
      actual: { conductorId: 10, nombre: "ESCALERAS KEVIN" },
    });
    vi.mocked(PlanificacionService.compartibles).mockResolvedValue({
      operativoId: 1,
      identificador: "OCDMIT-001",
      solicitado: null,
      anfitriones: [ANFITRION],
    });
    dialogo({}, operativo({ cubierto: true }));

    expect(await screen.findByText("Asignado hoy a ESCALERAS KEVIN")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Compartir unidad" })).toBeNull();
  });

  it("la tarjeta del pendiente dice lo que pidió quien registró", async () => {
    pasoAsignar(
      resumen({
        operativos: [
          operativo({ compartirCon: { id: 600, identificador: "OCPMO-001" } }),
          operativo({
            id: 2,
            identificador: "OCPMO-009",
            esMacrooperativo: true,
            justificacionExclusivo: "Traslada equipo pesado",
          }),
        ],
      }),
    );

    expect(await screen.findByTestId("intencion-1")).toHaveTextContent(
      "Pide compartir con OCPMO-001",
    );
    expect(screen.getByTestId("intencion-2")).toHaveTextContent("Exclusivo: Traslada equipo pesado");
  });
});

// ──────────── El «completo» deja y retira en su punto (caso 21-OCT, 2026-10-21) ────────────

describe("El «completo» deja y retira en su punto (2026-10-21)", () => {
  it("«Asignar automáticamente» confirma también una propuesta hecha solo de traslados en una unidad ya asignada", async () => {
    const usuario = userEvent.setup();
    const onAviso = vi.fn();
    const propuesta = {
      estrategia: "por dificultad, sin activar libres",
      cubiertos: 4,
      total: 4,
      avisos: 0,
      asignaciones: [],
      activaciones: [],
      compartidos: [
        { tramoId: 47, compartidoConTramoId: 46 },
        { tramoId: 48, compartidoConTramoId: 46 },
      ],
      sinRecurso: [],
    };
    vi.mocked(PlanificacionService.optimizar).mockResolvedValue(propuesta);
    vi.mocked(PlanificacionService.confirmar).mockResolvedValue({
      aplicadas: 0,
      omitidas: [],
      activados: [],
      compartidos: 2,
      compartidosOmitidos: [],
      correlacionId: "c0ffee00-0000-4000-8000-000000000002",
    });
    const despues = resumen({ totales: { ...resumen().totales, cubiertos: 2, sinConductor: 0 } });

    pasoAsignar(resumen(), { onAviso, onRecargar: vi.fn().mockResolvedValue(despues) });
    await usuario.click(screen.getByRole("button", { name: /Asignar automáticamente/ }));

    await waitFor(() =>
      expect(PlanificacionService.confirmar).toHaveBeenCalledWith(FECHA, propuesta),
    );
    await waitFor(() =>
      expect(onAviso).toHaveBeenCalledWith(
        "2 operativos asignados automáticamente. 2 traslados viajan en una unidad ya asignada (misma unidad, mismo punto).",
      ),
    );
  });

  it("en el cajón, el conductor de la unidad del «completo» dice «Comparte unidad con X» y comparte", async () => {
    const usuario = userEvent.setup();
    const onHecho = vi.fn();
    vi.mocked(JornadaDafService.candidatos).mockResolvedValue({
      ...CANDIDATOS,
      candidatos: [
        {
          conductorId: 53,
          nombre: "SOSA JOSE LUIS",
          turno: "DIA",
          vehiculoId: 60,
          placa: "PMA-3370",
          categoria: "COMPARTE",
          motivo: "Comparte unidad con OCPMO-001",
          avisos: [],
          actual: false,
          asignable: false,
          compartirCon: { operativoId: 66, identificador: "OCPMO-001" },
        },
        ...CANDIDATOS.candidatos,
      ],
    });
    vi.mocked(PlanificacionService.compartir).mockResolvedValue({
      compartidoCon: { operativoId: 66, identificador: "OCPMO-001" },
    });
    dialogo({ onHecho });

    const sosa = await screen.findByTestId("candidato-53");
    expect(within(sosa).getByText("Comparte unidad con OCPMO-001")).toBeInTheDocument();
    expect(within(sosa).getByText("Misma unidad")).toBeInTheDocument();
    await usuario.click(
      within(sosa).getByRole("button", {
        name: "Compartir unidad con OCPMO-001 (SOSA JOSE LUIS)",
      }),
    );

    expect(PlanificacionService.compartir).toHaveBeenCalledWith(1, 66);
    expect(PlanificacionService.asignar).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(onHecho).toHaveBeenCalledWith(
        "OCDMIT-001 comparte la unidad de OCPMO-001 (SOSA JOSE LUIS · PMA-3370).",
      ),
    );
  });
});
