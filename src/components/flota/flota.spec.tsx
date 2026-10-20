/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: flota.spec.tsx
 * Responsabilidad: Verificar las decisiones de «Flota y garajes»: indicadores, pestañas, filtros,
 *                  distintivos, cajones, constructor de patrón, baja y reactivación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE PRUEBAN DECISIONES, NO MAQUETADO (rediseño del 2026-10-14). Lo que aquí se afirma es lo
 * que, de romperse, **no daría ningún error**:
 *
 *   · que el filtro arranque en Activos y la pestaña viva en la URL;
 *   · que cada indicador lleve a su pestaña con su filtro;
 *   · que un vehículo sin conductor habitual, un conductor sin vehículo o sin contrato y un
 *     garaje sin zonal se señalen, con su porqué;
 *   · que los garajes ya no tengan el combo en línea ni dos bajas;
 *   · que una placa o una cédula repetida no se envíen;
 *   · que la baja se confirme, nombre a quienes quedan sin vehículo, y no se ofrezca cuando el
 *     servidor la rechazaría;
 *   · (ajustes finales, 2026-10-15) que las acciones se vean como botones según el estado, que la
 *     cédula tenga su columna, que lo que falta en documentos sea ámbar suave y lo vencido rojo, y
 *     que un kilometraje inusual pida revisión.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ConstructorPatron from "./ConstructorPatron.tsx";
import Paginacion from "../common/Paginacion.tsx";
import TablaConductores from "./TablaConductores.tsx";
import TablaGarajes from "./TablaGarajes.tsx";
import TablaVehiculos from "./TablaVehiculos.tsx";
import AdminFlotaPage from "../../pages/AdminFlotaPage.tsx";
import { UserContext } from "../../context/UserContext.tsx";
import type { ResumenFlota } from "../../interfaces/Flota.ts";
import type { User } from "../../interfaces/User.ts";
import { permisosDeRoles } from "../../pruebas/permisos.ts";
import type { Conductor, UbicacionFlota, Vehiculo } from "../../interfaces/Transporte.ts";

vi.mock("../../services/flota.service.ts", () => ({
  FlotaService: {
    resumen: vi.fn(),
    impactoBaja: vi.fn(),
    listarConductores: vi.fn(),
    crearConductor: vi.fn(),
    actualizarConductor: vi.fn(),
    desactivarConductor: vi.fn(),
    reactivarConductor: vi.fn(),
    listarVehiculos: vi.fn(),
    crearVehiculo: vi.fn(),
    actualizarVehiculo: vi.fn(),
    desactivarVehiculo: vi.fn(),
    reactivarVehiculo: vi.fn(),
    listarUbicaciones: vi.fn(),
    crearUbicacion: vi.fn(),
    actualizarUbicacion: vi.fn(),
    darDeBajaUbicacion: vi.fn(),
    reactivarUbicacion: vi.fn(),
    ausenciasDeLaFlota: vi.fn(),
    ausenciasDeConductor: vi.fn(),
    registrarAusenciaConductor: vi.fn(),
    retirarAusenciaConductor: vi.fn(),
  },
}));
vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: {
    listarZonales: vi.fn().mockResolvedValue([{ id: 4, nombre: "Zonal Eloy Alfaro" }]),
  },
}));

import { FlotaService } from "../../services/flota.service.ts";

const vehiculo = (parcial: Partial<Vehiculo> = {}): Vehiculo => ({
  id: 1,
  placa: "PBA-1235",
  descripcion: "Camioneta doble cabina blanca",
  activo: true,
  tipo: "Camioneta",
  asientos: 4,
  kilometraje: 85000,
  matriculaVencimiento: "2027-03-10",
  soatVencimiento: "2026-11-02",
  documentos: { estado: "POR_VENCER", documento: "SOAT", vence: "2026-11-02", dias: 19 },
  ...parcial,
});

const conductor = (parcial: Partial<Conductor> = {}): Conductor => ({
  id: 10,
  cedula: "1720476900",
  nombreCompleto: "ESCALERAS KEVIN ANDRES",
  telefono: "0989801469",
  licenciaTipo: "C",
  vehiculoHabitual: { id: 1, placa: "PBA-1235", descripcion: "Camioneta doble cabina blanca", activo: true },
  activo: true,
  sector: "SUR",
  parqueaderoAutorizado: false,
  tipoContrato: "OCASIONAL",
  patronRotacion: "DDDDDLL",
  faltantes: [],
  ...parcial,
});

const garaje = (parcial: Partial<UbicacionFlota> = {}): UbicacionFlota => ({
  id: 2,
  nombre: "Garaje Eloy Alfaro",
  activo: true,
  garajeAutorizado: true,
  vigente: true,
  zonalId: 4,
  zonal: { id: 4, nombre: "Zonal Eloy Alfaro" },
  usos: [],
  ...parcial,
});

const RESUMEN: ResumenFlota = {
  vehiculos: { activos: 2, deBaja: 1, documentosPorVencer: 1, sinFechas: 0, sinConductorHabitual: 1 },
  conductores: { activos: 2, deBaja: 0, incompletos: 1 },
  garajes: { vigentes: 1, deBaja: 1 },
  diasAviso: 30,
  kmMaximo: 999_999,
};

const FLOTA: Vehiculo[] = [
  vehiculo(),
  vehiculo({
    id: 2,
    placa: "PMA7056",
    descripcion: "Auto",
    documentos: { estado: "AL_DIA", documento: null, vence: null, dias: null },
  }),
  vehiculo({ id: 3, placa: "ABM-999", descripcion: "Retirado", activo: false }),
];

const PERSONAS: Conductor[] = [
  conductor(),
  conductor({
    id: 11,
    cedula: "1712345678",
    nombreCompleto: "QUISHPE JORGE",
    telefono: null,
    vehiculoHabitual: null,
    tipoContrato: null,
    patronRotacion: null,
    faltantes: ["VEHICULO_HABITUAL", "TIPO_CONTRATO", "PATRON_ROTACION"],
  }),
];

const GARAJES: UbicacionFlota[] = [
  garaje(),
  garaje({ id: 3, nombre: "Garaje Calderón", garajeAutorizado: false, vigente: false }),
];

/** Pinta la URL actual para comprobar que la pestaña vive en ella. */
const VerUrl = () => {
  const ubicacion = useLocation();
  return <output data-testid="url">{ubicacion.search}</output>;
};

/**
 * La sesión de la pantalla: por omisión el Administrador DAF, con los permisos que le da la semilla
 * del servidor (incluido `flota:ausencias`). `permisos` permite probar sin ese permiso.
 */
const usuario = (permisos: string[] = permisosDeRoles(["ADMINISTRADOR_DAF"])): User => ({
  userid: 0,
  usuFullName: "Administración de Transportes",
  usuEmail: "prueba",
  rolCodes: ["ADMINISTRADOR_DAF"],
  permisos,
  rolName: "Administración de Transportes",
  token: "",
  actividades: [],
});

const montar = (ruta = "/", sesion: User = usuario()) =>
  render(
    <UserContext.Provider
      value={{ user: sesion, establecerSesion: vi.fn(), estado: "conSesion", cerrarSesion: vi.fn() }}
    >
      <MemoryRouter initialEntries={[ruta]}>
        <AdminFlotaPage />
        <VerUrl />
      </MemoryRouter>
    </UserContext.Provider>,
  );

const filaCon = (texto: string): HTMLElement => {
  const fila = screen.getAllByRole("row").find((una) => within(una).queryByText(texto));
  if (!fila) throw new Error(`No hay fila con ${texto}`);
  return fila;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(FlotaService.resumen).mockResolvedValue(RESUMEN);
  vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(FLOTA);
  vi.mocked(FlotaService.listarConductores).mockResolvedValue(PERSONAS);
  vi.mocked(FlotaService.listarUbicaciones).mockResolvedValue(GARAJES);
  vi.mocked(FlotaService.ausenciasDeLaFlota).mockResolvedValue([]);
  vi.mocked(FlotaService.ausenciasDeConductor).mockResolvedValue([]);
});

describe("indicadores", () => {
  it("muestran el resumen del servidor y piden atención en palabras, no solo en ámbar", async () => {
    montar();
    expect(
      await screen.findByRole("button", {
        name: "Documentos por vencer: 1. Matrícula o SOAT en ≤ 30 días o vencidos. Requiere atención",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Vehículos activos: 2\. 1 dado de baja$/ })).toBeInTheDocument();
  });

  it("cada uno abre su pestaña con su filtro, y la ficha del filtro lo quita", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("PBA-1235");

    await usuario.click(screen.getByRole("button", { name: /^Documentos por vencer/ }));
    expect(screen.getByTestId("url")).toHaveTextContent("tab=vehiculos&filtro=alertas-documentos");
    expect(screen.queryByText("PMA-7056")).toBeNull();
    expect(screen.getByText("PBA-1235")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /^Conductores con datos incompletos/ }));
    expect(screen.getByRole("tab", { name: /Conductores/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("QUISHPE JORGE")).toBeInTheDocument();
    expect(screen.queryByText("ESCALERAS KEVIN ANDRES")).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Quitar el filtro «Datos incompletos»" }));
    expect(screen.getByText("ESCALERAS KEVIN ANDRES")).toBeInTheDocument();
    expect(screen.getByTestId("url")).not.toHaveTextContent("filtro=");
  });

  it("sin resumen, la flota se administra igual", async () => {
    vi.mocked(FlotaService.resumen).mockRejectedValue(new Error("caído"));
    montar();
    expect(await screen.findByText("PBA-1235")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Vehículos activos: sin dato/ })).toBeInTheDocument();
  });
});

describe("pestañas y filtro", () => {
  it("el filtro arranca en Activos: lo dado de baja no se ve hasta pedirlo", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("PBA-1235");

    expect(screen.getByRole("button", { name: "Activos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("ABM-999")).toBeNull();
    expect(screen.getByText("2 de 3")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "De baja" }));
    expect(screen.getByText("ABM-999")).toBeInTheDocument();
  });

  it("la pestaña vive en la URL: se abre desde ella y cambiarla la reescribe", async () => {
    const usuario = userEvent.setup();
    montar("/?tab=garajes");
    expect(await screen.findByRole("tab", { name: /Garajes autorizados/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // «Vigentes» en garajes: Calderón (activo pero no autorizado) no aparece.
    expect(screen.getByRole("button", { name: "Vigentes" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Garaje Eloy Alfaro")).toBeInTheDocument();
    expect(screen.queryByText("Garaje Calderón")).toBeNull();

    await usuario.click(screen.getByRole("tab", { name: /Vehículos/ }));
    expect(screen.getByTestId("url")).toHaveTextContent("tab=vehiculos");
  });

  it("`?conductor=<id>` abre la ficha de ese conductor (el enlace desde Planificar el día)", async () => {
    montar("/?conductor=11");
    const cajon = await screen.findByRole("dialog", { name: "Editar conductor" });
    expect(within(cajon).getByLabelText("Cédula")).toHaveValue("1712345678");
    // Detrás del cajón queda la pestaña de conductores, y la URL ya no lleva el enlace.
    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("tab=conductores"));
    expect(screen.getByTestId("url")).not.toHaveTextContent("conductor=11");
  });
});

const propsTabla = {
  procesando: false,
  resaltado: null,
  mensajeVacio: "Sin datos",
  onEditar: vi.fn(),
  onDarDeBaja: vi.fn(),
  onReactivar: vi.fn(),
};

describe("distintivos", () => {
  it("vehículo sin conductor habitual, con el porqué; el de baja no cuenta como habitual", () => {
    render(
      <TablaVehiculos
        {...propsTabla}
        kmMaximo={999_999}
        vehiculos={[vehiculo({ id: 2, placa: "PMA7056" })]}
        conductores={[conductor({ activo: false, vehiculoHabitual: { id: 2, placa: "PMA7056" } })]}
      />,
    );
    const distintivo = screen.getByText(/⚠ Sin conductor habitual/);
    expect(distintivo).toHaveAttribute(
      "title",
      "Ningún conductor lo tiene como habitual: no se propondrá automáticamente al planificar el día.",
    );
    expect(screen.getByText("SOAT vence en 19 d")).toBeInTheDocument();
    expect(screen.getByText("85.000 km")).toBeInTheDocument();
  });

  it("conductor sin vehículo (o con uno de baja) y sin contrato, con su efecto", () => {
    render(
      <TablaConductores
        {...propsTabla}
        conductores={[
          conductor({
            vehiculoHabitual: { id: 3, placa: "ABM-999", activo: false },
            tipoContrato: null,
            patronRotacion: null,
          }),
        ]}
      />,
    );
    expect(screen.getByText(/⚠ Sin vehículo/)).toBeInTheDocument();
    expect(screen.getByText(/⚠ Sin contrato/)).toHaveAttribute(
      "title",
      "La regla de nocturnidad por nombramiento no se aplica.",
    );
    expect(screen.getByText("Sin patrón")).toBeInTheDocument();
  });

  it("el patrón se pinta en fichas por letra y se lee en palabras", () => {
    render(<TablaConductores {...propsTabla} conductores={[conductor({ patronRotacion: "NNL" })]} />);
    expect(screen.getByRole("img", { name: "Patrón: Noche → Noche → Libre" })).toBeInTheDocument();
  });

  it("garaje sin zonal: no se sugerirá", () => {
    render(
      <TablaGarajes
        {...propsTabla}
        hoy="2026-10-14"
        garajes={[
          garaje({ zonal: null, zonalId: null, usos: [{ vehiculoId: 1, placa: "PBA-1235", ultimaFecha: "2026-10-13" }] }),
        ]}
      />,
    );
    expect(screen.getByText("⚠ Sin zonal: no se sugerirá")).toBeInTheDocument();
    expect(screen.getByText("PBA-1235 (ayer)")).toBeInTheDocument();
  });
});

describe("garajes", () => {
  it("sin combo de zonal en la fila y una sola acción de baja", () => {
    render(<TablaGarajes {...propsTabla} hoy="2026-10-14" garajes={[garaje()]} />);

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Dar de baja Garaje Eloy Alfaro" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quitar autorización/ })).toBeNull();
    expect(screen.queryByTitle("Más acciones de Garaje Eloy Alfaro")).toBeNull();
  });

  it("dar de baja un garaje pide confirmación con su efecto y usa su propia ruta", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.darDeBajaUbicacion).mockResolvedValue(garaje({ activo: false, vigente: false }));
    montar("/?tab=garajes");
    await screen.findByText("Garaje Eloy Alfaro");

    await usuario.click(screen.getByRole("button", { name: "Dar de baja Garaje Eloy Alfaro" }));
    expect(
      screen.getByText("Ya no podrá elegirse como destino de la flota al terminar la jornada."),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Sí, dar de baja" }));
    expect(FlotaService.darDeBajaUbicacion).toHaveBeenCalledWith(2);
    expect(FlotaService.actualizarUbicacion).not.toHaveBeenCalled();
  });
});

describe("cajones", () => {
  it("una placa repetida (con o sin guion) bloquea el alta y lo dice en vivo", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("PBA-1235");

    await usuario.click(screen.getByRole("button", { name: "+ Nuevo vehículo" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo vehículo" });
    await usuario.type(within(cajon).getByLabelText(/Placa/), "pma-7056");
    expect(within(cajon).getByText("Ya existe un vehículo con esa placa.")).toBeInTheDocument();

    await usuario.click(within(cajon).getByRole("button", { name: "Guardar" }));
    expect(FlotaService.crearVehiculo).not.toHaveBeenCalled();
  });

  it("una placa guardada sin guion se muestra normalizada y se guarda normalizada, sin exigir el formato", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.actualizarVehiculo).mockResolvedValue(FLOTA[1]);
    montar();
    await screen.findByText("PMA-7056");

    await usuario.click(within(filaCon("PMA-7056")).getByRole("button", { name: "Editar PMA-7056" }));
    const cajon = screen.getByRole("dialog", { name: "Editar vehículo" });
    await usuario.type(within(cajon).getByLabelText("Descripción"), " gris");
    await usuario.click(within(cajon).getByRole("button", { name: "Guardar" }));

    expect(FlotaService.actualizarVehiculo).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ placa: "PMA-7056", descripcion: "Auto gris" }),
    );
    expect(await screen.findByText("El vehículo PMA-7056 quedó guardado")).toBeInTheDocument();
  });

  it("una cédula repetida bloquea el alta del conductor", async () => {
    const usuario = userEvent.setup();
    montar("/?tab=conductores");
    await screen.findByText("ESCALERAS KEVIN ANDRES");

    await usuario.click(screen.getByRole("button", { name: "+ Nuevo conductor" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo conductor" });
    await usuario.type(within(cajon).getByLabelText(/Cédula/), "1712345678");
    await usuario.type(within(cajon).getByLabelText(/Apellidos y nombres/), "otro");
    expect(within(cajon).getByText(/Ya existe un conductor con esa cédula: QUISHPE JORGE/)).toBeInTheDocument();
    expect(within(cajon).getByLabelText(/Apellidos y nombres/)).toHaveValue("OTRO");

    await usuario.click(within(cajon).getByRole("button", { name: "Guardar" }));
    expect(FlotaService.crearConductor).not.toHaveBeenCalled();
  });

  it("los errores aparecen solo después de intentar guardar, y el pie dice qué falta", async () => {
    const usuario = userEvent.setup();
    montar("/?tab=garajes");
    await screen.findByText("Garaje Eloy Alfaro");

    await usuario.click(screen.getByRole("button", { name: "+ Nuevo garaje" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo garaje autorizado" });
    expect(within(cajon).getByText("1 campo por completar")).toBeInTheDocument();
    expect(within(cajon).queryByText("Indique el nombre del garaje.")).toBeNull();

    await usuario.click(within(cajon).getByRole("button", { name: "Guardar" }));
    expect(within(cajon).getByText("Indique el nombre del garaje.")).toBeInTheDocument();
    expect(within(cajon).getByText("Falta: nombre")).toBeInTheDocument();
    expect(FlotaService.crearUbicacion).not.toHaveBeenCalled();
  });

  it("cerrar con cambios pregunta antes de descartar", async () => {
    const usuario = userEvent.setup();
    montar("/?tab=garajes");
    await screen.findByText("Garaje Eloy Alfaro");

    await usuario.click(screen.getByRole("button", { name: "+ Nuevo garaje" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo garaje autorizado" });
    await usuario.type(within(cajon).getByLabelText(/Nombre del garaje/), "Quitumbe");
    await usuario.click(within(cajon).getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nuevo garaje autorizado" })).toBeNull());
  });
});

describe("constructor del patrón", () => {
  it("agrega, borra la última y limpia", async () => {
    const usuario = userEvent.setup();
    const onCambiar = vi.fn();
    const { rerender } = render(
      <ConstructorPatron
        id="patron"
        patron="DD"
        onCambiar={onCambiar}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: "Agregar Noche" }));
    expect(onCambiar).toHaveBeenLastCalledWith("DDN");
    await usuario.click(screen.getByRole("button", { name: "Borrar la última letra" }));
    expect(onCambiar).toHaveBeenLastCalledWith("D");
    await usuario.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onCambiar).toHaveBeenLastCalledWith("");
    expect(screen.getByText("Se repite: Día → Día.")).toBeInTheDocument();

    rerender(
      <ConstructorPatron
        id="patron"
        patron="DDDDDDDDDDDDDD"
        onCambiar={onCambiar}
      />,
    );
    expect(screen.getByRole("button", { name: "Agregar Día" })).toBeDisabled();
  });
});

describe("baja y reactivación", () => {
  it("la baja de un vehículo se confirma y nombra a quienes quedan sin vehículo (D3)", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.impactoBaja).mockResolvedValue({
      asignacionesVigentes: 0,
      primeraAsignacion: null,
      conductoresHabituales: [{ id: 10, nombreCompleto: "ESCALERAS KEVIN ANDRES" }],
    });
    vi.mocked(FlotaService.desactivarVehiculo).mockResolvedValue({
      registro: vehiculo({ activo: false }),
      operativosHistoricos: 4,
      mensaje: "El vehículo de placa PBA-1235 dejó de ofrecerse en la asignación de transporte.",
      conductoresSinVehiculo: [{ id: 10, nombreCompleto: "ESCALERAS KEVIN ANDRES" }],
    });
    montar();
    await screen.findByText("PBA-1235");

    await usuario.click(screen.getByRole("button", { name: "Dar de baja PBA-1235" }));

    expect(FlotaService.impactoBaja).toHaveBeenCalledWith("vehiculos", 1);
    expect(
      await screen.findByText(
        "Dejará de ofrecerse en la asignación de transporte. Su historial se conserva. Quedarán sin vehículo habitual: ESCALERAS KEVIN ANDRES.",
      ),
    ).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Sí, dar de baja" }));
    expect(FlotaService.desactivarVehiculo).toHaveBeenCalledWith(1);
    expect(
      await screen.findByText("El vehículo de placa PBA-1235 dejó de ofrecerse en la asignación de transporte"),
    ).toBeInTheDocument();
  });

  it("con transporte asignado desde hoy no se ofrece confirmar: se dice por qué", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.impactoBaja).mockResolvedValue({
      asignacionesVigentes: 2,
      primeraAsignacion: { fecha: "2026-10-15", horaInicio: "07:30", identificador: "F5-2026-10-15-003" },
      conductoresHabituales: [],
    });
    montar("/?tab=conductores");
    await screen.findByText("ESCALERAS KEVIN ANDRES");

    await usuario.click(screen.getByRole("button", { name: "Dar de baja ESCALERAS KEVIN ANDRES" }));

    // Un mensaje estándar de error (no se permite), con el porqué y qué hacer.
    const error = await screen.findByRole("alertdialog", { name: "No se puede dar de baja" });
    expect(error).toHaveTextContent(
      "ESCALERAS KEVIN ANDRES tiene transporte asignado el 15/10/2026 a las 07H30 (operativo F5-2026-10-15-003) y 1 operativo más. Libere esa asignación en «Planificar el día» antes de darlo de baja.",
    );
    expect(screen.queryByRole("button", { name: "Sí, dar de baja" })).toBeNull();
    expect(FlotaService.desactivarConductor).not.toHaveBeenCalled();
  });

  it("si el servidor la rechaza al confirmar (409), su mensaje se muestra tal cual", async () => {
    const usuario = userEvent.setup();
    const delServidor = "QUISHPE JORGE tiene transporte asignado el 15/10/2026 a las 07H30 (operativo X).";
    vi.mocked(FlotaService.impactoBaja).mockResolvedValue({
      asignacionesVigentes: 0,
      primeraAsignacion: null,
      conductoresHabituales: [],
    });
    vi.mocked(FlotaService.desactivarConductor).mockRejectedValue({
      status: 409,
      originalError: {
        response: { data: { codigo: "RECURSO_CON_ASIGNACION", mensaje: delServidor } },
      },
    });
    montar("/?tab=conductores");
    await screen.findByText("QUISHPE JORGE");

    await usuario.click(screen.getByRole("button", { name: "Dar de baja QUISHPE JORGE" }));
    await usuario.click(await screen.findByRole("button", { name: "Sí, dar de baja" }));

    expect(await screen.findByText(delServidor)).toBeInTheDocument();
  });

  it("un dado de baja se reactiva con su botón, sin confirmación", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.reactivarVehiculo).mockResolvedValue(FLOTA[2]);
    montar();
    await screen.findByText("PBA-1235");

    await usuario.click(screen.getByRole("button", { name: "De baja" }));
    await usuario.click(screen.getByRole("button", { name: "Reactivar ABM-999" }));

    expect(FlotaService.reactivarVehiculo).toHaveBeenCalledWith(3);
    expect(await screen.findByText("ABM-999 quedó reactivado")).toBeInTheDocument();
  });
});

describe("documentos sin fechas (A5)", () => {
  it("la tarjeta dice cuántos no tienen fechas; con solo eso, pide revisión con el borde suave", async () => {
    vi.mocked(FlotaService.resumen).mockResolvedValue({
      ...RESUMEN,
      vehiculos: { ...RESUMEN.vehiculos, documentosPorVencer: 0, sinFechas: 3 },
    });
    montar();
    const tarjeta = await screen.findByRole("button", {
      name: "Documentos por vencer: 0. Matrícula o SOAT en ≤ 30 días o vencidos. 3 con fechas faltantes. Requiere revisión",
    });
    expect(tarjeta).toHaveAttribute("data-atencion", "suave");
    expect(within(tarjeta).getByText("3 con fechas faltantes")).toBeInTheDocument();
  });

  it("con vencidos o por vencer, la tarjeta es ámbar aunque también falten fechas", async () => {
    vi.mocked(FlotaService.resumen).mockResolvedValue({
      ...RESUMEN,
      vehiculos: { ...RESUMEN.vehiculos, documentosPorVencer: 1, sinFechas: 2 },
    });
    montar();
    const tarjeta = await screen.findByRole("button", { name: /^Documentos por vencer: 1\..*Requiere atención$/ });
    expect(tarjeta).toHaveAttribute("data-atencion", "fuerte");
  });

  it("el clic abre «Con alertas de documentos» (también los sin fechas), como ficha junto al buscador", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue([
      ...FLOTA,
      vehiculo({
        id: 4,
        placa: "GYE-233",
        matriculaVencimiento: null,
        soatVencimiento: null,
        documentos: { estado: "SIN_FECHAS", documento: null, vence: null, dias: null },
      }),
    ]);
    montar();
    await screen.findByText("PBA-1235");

    await usuario.click(screen.getByRole("button", { name: /^Documentos por vencer/ }));
    const ficha = screen.getByRole("button", { name: "Quitar el filtro «Con alertas de documentos»" });
    // La ficha va justo después del buscador.
    expect(screen.getByRole("searchbox").nextElementSibling).toBe(ficha);
    expect(screen.getByText("PBA-1235")).toBeInTheDocument();
    expect(screen.getByText("GYE-233")).toBeInTheDocument();
    expect(screen.queryByText("PMA-7056")).toBeNull();
  });

  it("«Sin fechas» es un distintivo ámbar suave, no gris", () => {
    render(
      <TablaVehiculos
        {...propsTabla}
        kmMaximo={999_999}
        conductores={[]}
        vehiculos={[
          vehiculo({
            matriculaVencimiento: null,
            soatVencimiento: null,
            documentos: { estado: "SIN_FECHAS", documento: null, vence: null, dias: null },
          }),
        ]}
      />,
    );
    const distintivo = screen.getByText("Sin fechas");
    expect(distintivo).toHaveClass("badge-warning", "badge-soft");
    expect(distintivo).not.toHaveClass("badge-ghost");
  });
});

describe("descripción y placa en la tabla", () => {
  it("bajo la placa solo va la descripción real: vacía o igual al tipo, no se pinta", () => {
    render(
      <TablaVehiculos
        {...propsTabla}
        kmMaximo={999_999}
        conductores={[]}
        vehiculos={[
          vehiculo({ id: 1, placa: "PMA3370", tipo: "Camioneta", descripcion: "Camioneta" }),
          vehiculo({ id: 2, placa: "PMA-7056", tipo: "Auto", descripcion: null }),
        ]}
      />,
    );
    // «Camioneta» solo una vez: la columna Tipo, no repetida bajo la placa.
    expect(screen.getAllByText("Camioneta")).toHaveLength(1);
    expect(screen.queryByText("—")).toBeNull();
    // La placa guardada sin guion se muestra normalizada.
    expect(screen.getByText("PMA-3370")).toBeInTheDocument();
  });
});

describe("cajones (ajustes del 2026-10-15)", () => {
  it("el kilometraje sobre DAF_KM_MAXIMO bloquea con su mensaje", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("PBA-1235");

    await usuario.click(screen.getByRole("button", { name: "+ Nuevo vehículo" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo vehículo" });
    await usuario.type(within(cajon).getByLabelText(/Placa/), "gye233");
    await usuario.type(within(cajon).getByLabelText("Kilometraje"), "1000000");
    await usuario.click(within(cajon).getByRole("button", { name: "Guardar" }));

    expect(within(cajon).getByText("Revise el kilometraje: parece demasiado alto.")).toBeInTheDocument();
    expect(FlotaService.crearVehiculo).not.toHaveBeenCalled();
  });

  it("el pie: gris antes de intentar, rojo con lo que falta después, verde cuando está listo", async () => {
    const usuario = userEvent.setup();
    montar("/?tab=garajes");
    await screen.findByText("Garaje Eloy Alfaro");

    await usuario.click(screen.getByRole("button", { name: "+ Nuevo garaje" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo garaje autorizado" });
    expect(within(cajon).getByText("1 campo por completar")).toHaveClass("text-app-muted");
    expect(within(cajon).getByText("1 campo por completar")).not.toHaveClass("text-warning");

    await usuario.click(within(cajon).getByRole("button", { name: "Guardar" }));
    expect(within(cajon).getByText("Falta: nombre")).toHaveClass("text-[var(--app-cajon-estado-error)]");

    await usuario.type(within(cajon).getByLabelText(/Nombre del garaje/), "Quitumbe");
    expect(within(cajon).getByText("Listo para guardar")).toHaveClass("text-[var(--app-cajon-estado-listo)]");
  });

  it("el nombre del garaje: sin «Se guarda en mayúsculas», y el repetido sin distinguir mayúsculas", async () => {
    const usuario = userEvent.setup();
    montar("/?tab=garajes");
    await screen.findByText("Garaje Eloy Alfaro");

    await usuario.click(screen.getByRole("button", { name: "+ Nuevo garaje" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo garaje autorizado" });
    expect(within(cajon).queryByText("Se guarda en mayúsculas.")).toBeNull();
    expect(within(cajon).getByLabelText(/Nombre del garaje/)).toHaveAttribute("placeholder", "Eloy Alfaro");

    await usuario.type(within(cajon).getByLabelText(/Nombre del garaje/), "GARAJE ELOY ALFARO");
    expect(within(cajon).getByText("Ya existe un garaje con ese nombre.")).toBeInTheDocument();
  });
});

/** `n` vehículos activos al día, con placas AAA-101, AAA-102… */
const flotaDe = (n: number): Vehiculo[] =>
  Array.from({ length: n }, (_, i) =>
    vehiculo({
      id: 100 + i,
      placa: `AAA-${101 + i}`,
      descripcion: null,
      documentos: { estado: "AL_DIA", documento: null, vence: null, dias: null },
    }),
  );

/** El texto «Mostrando X–Y de Z» del paginador. */
const textoPaginador = async (): Promise<string> =>
  (await screen.findByText(/^Mostrando/)).textContent ?? "";

const filasDeDatos = () => screen.getAllByRole("row").length - 1;

describe("paginado (A8)", () => {
  it("con 19 registros: 10 por página, «Mostrando 1–10 de 19» y el contador cuenta lo filtrado", async () => {
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(flotaDe(19));
    montar();
    expect(await textoPaginador()).toBe("Mostrando 1–10 de 19");
    expect(filasDeDatos()).toBe(10);
    expect(screen.getByText("19 de 19")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Página 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "‹ Anterior" })).toHaveAttribute("aria-disabled", "true");
  });

  it("pasar de página la escribe en la URL y muestra el resto", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(flotaDe(19));
    montar();
    await textoPaginador();

    await usuario.click(screen.getByRole("button", { name: "Siguiente ›" }));
    expect(await textoPaginador()).toBe("Mostrando 11–19 de 19");
    expect(filasDeDatos()).toBe(9);
    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("page=2"));
  });

  it("con 23 y 25 filas por página cabe en una: solo el texto, sin controles", async () => {
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(flotaDe(23));
    montar("/?tab=vehiculos&size=25");
    expect(await textoPaginador()).toBe("Mostrando 1–23 de 23");
    expect(screen.queryByRole("button", { name: "Siguiente ›" })).toBeNull();
    expect(screen.queryByLabelText("Filas por página")).toBeNull();
  });

  it("con 23 y 10 por página: tres páginas y el selector 10 / 25 / 50", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(flotaDe(23));
    montar();
    expect(await textoPaginador()).toBe("Mostrando 1–10 de 23");
    expect(screen.getByRole("button", { name: "Página 3" })).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText("Filas por página"), "25");
    expect(await textoPaginador()).toBe("Mostrando 1–23 de 23");
    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("size=25"));
  });

  it("sin registros no hay paginador: la tabla ya dice que está vacía", async () => {
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue([]);
    montar();
    expect(await screen.findByText(/No hay ningún vehículo registrado/)).toBeInTheDocument();
    expect(screen.queryByText(/^Mostrando/)).toBeNull();
  });

  it("page y size se restauran desde la URL", async () => {
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(flotaDe(23));
    montar("/?tab=vehiculos&page=3&size=10");
    expect(await textoPaginador()).toBe("Mostrando 21–23 de 23");
    expect(screen.getByRole("button", { name: "Página 3" })).toHaveAttribute("aria-current", "page");
  });

  it("buscar o cambiar el segmentado vuelve a la página 1", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(flotaDe(23));
    montar("/?tab=vehiculos&page=2");
    expect(await textoPaginador()).toBe("Mostrando 11–20 de 23");

    await usuario.type(screen.getByRole("searchbox"), "AAA");
    expect(await textoPaginador()).toBe("Mostrando 1–10 de 23");
    await waitFor(() => expect(screen.getByTestId("url")).not.toHaveTextContent("page="));

    await usuario.click(screen.getByRole("button", { name: "Página 2" }));
    expect(await textoPaginador()).toBe("Mostrando 11–20 de 23");
    await usuario.click(screen.getByRole("button", { name: "Todos" }));
    expect(await textoPaginador()).toBe("Mostrando 1–10 de 23");
  });

  it("cada pestaña recuerda su página", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(flotaDe(23));
    montar("/?tab=vehiculos&page=2");
    expect(await textoPaginador()).toBe("Mostrando 11–20 de 23");

    await usuario.click(screen.getByRole("tab", { name: /Conductores/ }));
    await waitFor(() => expect(screen.getByTestId("url")).not.toHaveTextContent("page="));
    await usuario.click(screen.getByRole("tab", { name: /Vehículos/ }));
    expect(await textoPaginador()).toBe("Mostrando 11–20 de 23");
    await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("page=2"));
  });

  it("dar de baja la única fila de la última página retrocede a la anterior", async () => {
    const usuario = userEvent.setup();
    const antes = flotaDe(11);
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValueOnce(antes);
    vi.mocked(FlotaService.impactoBaja).mockResolvedValue({
      asignacionesVigentes: 0,
      primeraAsignacion: null,
      conductoresHabituales: [],
    });
    vi.mocked(FlotaService.desactivarVehiculo).mockResolvedValue({
      registro: { ...antes[10], activo: false },
      operativosHistoricos: 0,
      mensaje: "El vehículo de placa AAA-111 dejó de ofrecerse en la asignación de transporte.",
      conductoresSinVehiculo: [],
    });
    montar("/?tab=vehiculos&page=2");
    expect(await textoPaginador()).toBe("Mostrando 11–11 de 11");

    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue(
      antes.map((uno) => (uno.id === antes[10].id ? { ...uno, activo: false } : uno)),
    );
    await usuario.click(screen.getByRole("button", { name: "Dar de baja AAA-111" }));
    await usuario.click(await screen.findByRole("button", { name: "Sí, dar de baja" }));

    await waitFor(async () => expect(await textoPaginador()).toBe("Mostrando 1–10 de 10"));
    // La página corregida pasa al estado y de ahí a la URL.
    await waitFor(() => expect(screen.getByTestId("url")).not.toHaveTextContent("page="));
  });

  it("al guardar desde el cajón se abre la página donde quedó la fila, resaltada", async () => {
    const usuario = userEvent.setup();
    const flota = flotaDe(15);
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValueOnce(flota);
    const nuevo = vehiculo({
      id: 999,
      placa: "ZZZ-999",
      descripcion: null,
      documentos: { estado: "AL_DIA", documento: null, vence: null, dias: null },
    });
    vi.mocked(FlotaService.crearVehiculo).mockResolvedValue(nuevo);
    montar();
    expect(await textoPaginador()).toBe("Mostrando 1–10 de 15");

    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue([...flota, nuevo]);
    await usuario.click(screen.getByRole("button", { name: "+ Nuevo vehículo" }));
    const cajon = screen.getByRole("dialog", { name: "Nuevo vehículo" });
    await usuario.type(within(cajon).getByLabelText(/Placa/), "zzz999");
    await usuario.click(within(cajon).getByRole("button", { name: "Guardar" }));

    expect(FlotaService.crearVehiculo).toHaveBeenCalledWith(expect.objectContaining({ placa: "ZZZ-999" }));
    await waitFor(async () => expect(await textoPaginador()).toBe("Mostrando 11–16 de 16"));
    expect(filaCon("ZZZ-999")).toHaveAttribute("data-resaltado", "true");
  });
});

describe("URL sin ?fecha (A10)", () => {
  it("si llega `?fecha=` del menú de la DAF, se quita: esta pantalla no depende de la jornada", async () => {
    montar("/?fecha=2026-10-15&tab=vehiculos");
    await screen.findByText("PBA-1235");
    await waitFor(() => expect(screen.getByTestId("url")).not.toHaveTextContent("fecha="));
    expect(screen.getByTestId("url")).toHaveTextContent("tab=vehiculos");
  });
});

describe("ajustes finales (2026-10-15)", () => {
  it("las tres tablas tienen el encabezado «Acciones» y botones visibles según el estado, sin «⋮»", () => {
    const { unmount } = render(
      <TablaVehiculos
        {...propsTabla}
        kmMaximo={999_999}
        conductores={[]}
        vehiculos={[vehiculo(), vehiculo({ id: 3, placa: "ABM-999", activo: false })]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toHaveClass("text-right");
    expect(screen.getByRole("button", { name: "Editar PBA-1235" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dar de baja PBA-1235" })).toHaveClass("btn-error");
    expect(screen.queryByRole("button", { name: "Reactivar PBA-1235" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reactivar ABM-999" })).toHaveClass("btn-success");
    expect(screen.queryByRole("button", { name: "Dar de baja ABM-999" })).toBeNull();
    expect(screen.queryByTitle(/Más acciones/)).toBeNull();
    unmount();

    const conductores = render(<TablaConductores {...propsTabla} conductores={[conductor()]} />);
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dar de baja ESCALERAS KEVIN ANDRES" })).toBeInTheDocument();
    conductores.unmount();

    render(
      <TablaGarajes {...propsTabla} hoy="2026-10-14" garajes={[garaje({ activo: false, vigente: false })]} />,
    );
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivar Garaje Eloy Alfaro" })).toBeInTheDocument();
    expect(screen.queryByTitle(/Más acciones/)).toBeNull();
  });

  it("Dar de baja abre la confirmación; Reactivar no pregunta y avisa con el toast", async () => {
    const usuario = userEvent.setup();
    vi.mocked(FlotaService.impactoBaja).mockResolvedValue({
      asignacionesVigentes: 0,
      primeraAsignacion: null,
      conductoresHabituales: [],
    });
    vi.mocked(FlotaService.reactivarUbicacion).mockResolvedValue(GARAJES[1]);
    montar("/?tab=garajes");
    await screen.findByText("Garaje Eloy Alfaro");

    await usuario.click(screen.getByRole("button", { name: "Dar de baja Garaje Eloy Alfaro" }));
    expect(await screen.findByRole("button", { name: "Sí, dar de baja" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    await usuario.click(screen.getByRole("button", { name: "De baja" }));
    await usuario.click(screen.getByRole("button", { name: "Reactivar Garaje Calderón" }));
    expect(screen.queryByRole("button", { name: "Sí, dar de baja" })).toBeNull();
    expect(FlotaService.reactivarUbicacion).toHaveBeenCalledWith(3);
    expect(await screen.findByText("Garaje Calderón vuelve a estar vigente")).toBeInTheDocument();
  });

  it("conductores: orden de columnas, la cédula en «Identificación» y solo «Licencia X» bajo el nombre", () => {
    render(<TablaConductores {...propsTabla} conductores={[conductor()]} />);
    expect(screen.getAllByRole("columnheader").map((celda) => celda.textContent)).toEqual([
      "Conductor",
      "Identificación",
      "Teléfono",
      "Vehículo habitual",
      "Sector · contrato",
      "Patrón",
      "Estado",
      "Acciones",
    ]);
    const celdas = within(filaCon("ESCALERAS KEVIN ANDRES")).getAllByRole("cell");
    expect(within(celdas[0]).getByText("Licencia C")).toBeInTheDocument();
    expect(celdas[0]).not.toHaveTextContent("C.I.");
    expect(within(celdas[1]).getByText("1720476900")).toHaveClass("font-mono");
    expect(within(celdas[2]).getByText("0989801469")).toHaveClass("font-mono");
  });

  it("el buscador sigue encontrando por cédula", async () => {
    const usuario = userEvent.setup();
    montar("/?tab=conductores");
    await screen.findByText("ESCALERAS KEVIN ANDRES");
    await usuario.type(screen.getByRole("searchbox"), "1712345");
    expect(screen.getByText("QUISHPE JORGE")).toBeInTheDocument();
    expect(screen.queryByText("ESCALERAS KEVIN ANDRES")).toBeNull();
  });

  it("paginador numerado: 32 px y 13 px, y apagados en la primera y la última página", () => {
    const { rerender } = render(
      <Paginacion page={0} pageSize={10} total={19} onPage={vi.fn()} onPageSize={vi.fn()} />,
    );
    const anterior = screen.getByRole("button", { name: "‹ Anterior" });
    expect(anterior).toHaveClass("btn-sm", "[--fontsize:0.8125rem]");
    expect(anterior).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Siguiente ›" })).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveClass("btn-primary", "min-w-8");
    expect(screen.getByRole("button", { name: "Página 2" })).not.toHaveClass("btn-primary");
    expect(screen.getByLabelText("Filas por página")).toHaveClass("select-sm", "text-[0.8125rem]");
    expect(screen.getByText(/Mostrando/)).toHaveClass("text-[0.8125rem]");

    rerender(
      <Paginacion page={1} pageSize={10} total={19} onPage={vi.fn()} onPageSize={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "‹ Anterior" })).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("button", { name: "Siguiente ›" })).toHaveAttribute("aria-disabled", "true");
  });

  it("documentos: sin fechas o con una que falta en ámbar suave; vencido en rojo; por vencer en ámbar", () => {
    render(
      <TablaVehiculos
        {...propsTabla}
        kmMaximo={999_999}
        conductores={[]}
        vehiculos={[
          vehiculo({ id: 1, placa: "AAA-001", documentos: { estado: "SIN_FECHAS", documento: null, vence: null, dias: null } }),
          vehiculo({ id: 2, placa: "AAA-002", documentos: { estado: "INCOMPLETO", documento: "SOAT", vence: null, dias: null } }),
          vehiculo({ id: 3, placa: "AAA-003", documentos: { estado: "INCOMPLETO", documento: "MATRICULA", vence: null, dias: null } }),
          vehiculo({ id: 4, placa: "AAA-004", documentos: { estado: "VENCIDO", documento: "SOAT", vence: "2026-10-01", dias: -13 } }),
          vehiculo({ id: 5, placa: "AAA-005", documentos: { estado: "POR_VENCER", documento: "SOAT", vence: "2026-11-02", dias: 19 } }),
        ]}
      />,
    );
    for (const texto of ["Sin fechas", "Falta SOAT", "Falta matrícula"]) {
      expect(screen.getByText(texto)).toHaveClass("badge-soft", "badge-warning");
    }
    expect(screen.getByText("SOAT vencido")).toHaveClass("badge-error");
    expect(screen.getByText("SOAT vence en 19 d")).toHaveClass("badge-warning");
    expect(screen.getByText("SOAT vence en 19 d")).not.toHaveClass("badge-soft");
  });

  it("un kilometraje inusual lleva «Revisar» con su porqué; uno normal, no", () => {
    render(
      <TablaVehiculos
        {...propsTabla}
        kmMaximo={999_999}
        conductores={[]}
        vehiculos={[
          vehiculo({ id: 1, placa: "AAA-001", kilometraje: 10000 }),
          vehiculo({ id: 2, placa: "AAA-002", kilometraje: 545555 }),
        ]}
      />,
    );
    expect(within(filaCon("AAA-001")).queryByText("Revisar")).toBeNull();
    const marca = within(filaCon("AAA-002")).getByText("Revisar");
    expect(marca).toHaveAttribute("title", "Kilometraje inusual: confirme el dato.");
    expect(marca).toHaveClass("badge-warning");
  });
});

/**
 * AUSENCIAS DE LOS CONDUCTORES (2026-10-16, plan «ausencias-conductores-flota»). Lo que se fija:
 * que la acción solo exista con `flota:ausencias`, que el distintivo diga en palabras si está
 * ausente o lo estará, que el registro envíe lo capturado, que los tramos que la ausencia NO retira
 * se avisen (A5), y que los rechazos del servidor queden en el cajón.
 */
describe("ausencias de los conductores", () => {
  it("el distintivo dice «Ausente» (en curso) o «Ausencia» (próxima), con las fechas", async () => {
    vi.mocked(FlotaService.ausenciasDeLaFlota).mockResolvedValue([
      { id: 1, conductorId: 10, estado: "VACACIONES", desde: "2000-01-01", hasta: "2099-12-31", momento: "EN_CURSO" },
      { id: 2, conductorId: 11, estado: "PERMISO", desde: "2099-01-01", hasta: "2099-01-05", momento: "PROXIMA" },
    ]);
    montar("/?tab=conductores");
    await screen.findByText("ESCALERAS KEVIN ANDRES");

    expect(await within(filaCon("ESCALERAS KEVIN ANDRES")).findByText("Ausente 01/01–31/12")).toBeInTheDocument();
    expect(within(filaCon("QUISHPE JORGE")).getByText("Ausencia 01/01–05/01")).toBeInTheDocument();
    expect(FlotaService.ausenciasDeLaFlota).toHaveBeenCalledTimes(1);
  });

  it("sin el permiso `flota:ausencias` no se ofrece la acción ni se pregunta nada", async () => {
    const sinPermiso = permisosDeRoles(["ADMINISTRADOR_DAF"]).filter((p) => p !== "flota:ausencias");
    montar("/?tab=conductores", usuario(sinPermiso));
    await screen.findByText("ESCALERAS KEVIN ANDRES");

    expect(screen.queryByRole("button", { name: /^Ausencias de/ })).not.toBeInTheDocument();
    expect(FlotaService.ausenciasDeLaFlota).not.toHaveBeenCalled();
  });

  it("registra con lo capturado, avisa los tramos que no retira y refresca el distintivo", async () => {
    const persona = userEvent.setup();
    vi.mocked(FlotaService.registrarAusenciaConductor).mockResolvedValue({
      id: 7,
      conductorId: 10,
      estado: "VACACIONES",
      desde: "2099-03-10",
      hasta: "2099-03-12",
      motivo: null,
      registradoPor: 1,
      momento: "PROXIMA",
      tramosAfectados: [
        { operativoId: 5, identificador: "OCF-001-10-MAR-2099", fecha: "2099-03-10", horaInicio: "08:00", horaFin: "08:30" },
      ],
    });
    montar("/?tab=conductores");
    await persona.click(await screen.findByRole("button", { name: "Ausencias de ESCALERAS KEVIN ANDRES" }));

    const cajon = await screen.findByRole("dialog", { name: "Ausencias" });
    expect(within(cajon).getByText("1720476900")).toBeInTheDocument();
    expect(FlotaService.ausenciasDeConductor).toHaveBeenCalledWith(10);

    const [desde, hasta] = within(cajon).getAllByLabelText(/^(Desde|Hasta)/);
    await persona.type(desde, "2099-03-10");
    await persona.type(hasta, "2099-03-12");
    await persona.click(within(cajon).getByRole("button", { name: "Registrar ausencia" }));

    await waitFor(() =>
      expect(FlotaService.registrarAusenciaConductor).toHaveBeenCalledWith(10, {
        estado: "VACACIONES",
        desde: "2099-03-10",
        hasta: "2099-03-12",
        motivo: undefined,
      }),
    );
    expect(
      await within(cajon).findByText(/Tiene un tramo asignado .*OCF-001-10-MAR-2099.*La ausencia no lo retira; reasígnelo en Planificar el día\./),
    ).toBeInTheDocument();
    // Una al cargar la pestaña y otra tras registrar.
    await waitFor(() => expect(FlotaService.ausenciasDeLaFlota).toHaveBeenCalledTimes(2));
  });

  it("un 409 de ausencia solapada queda en el cajón, tal cual", async () => {
    const persona = userEvent.setup();
    const delServidor = "El conductor ya tiene una ausencia registrada que se cruza con esas fechas.";
    vi.mocked(FlotaService.registrarAusenciaConductor).mockRejectedValue({
      status: 409,
      originalError: { response: { data: { codigo: "AUSENCIA_SOLAPADA", mensaje: delServidor } } },
    });
    montar("/?tab=conductores");
    await persona.click(await screen.findByRole("button", { name: "Ausencias de ESCALERAS KEVIN ANDRES" }));
    const cajon = await screen.findByRole("dialog", { name: "Ausencias" });

    const [desde, hasta] = within(cajon).getAllByLabelText(/^(Desde|Hasta)/);
    await persona.type(desde, "2099-03-10");
    await persona.type(hasta, "2099-03-12");
    await persona.click(within(cajon).getByRole("button", { name: "Registrar ausencia" }));

    expect(await within(cajon).findByText(delServidor)).toBeInTheDocument();
  });

  it("quitar una ausencia próxima la retira del conductor", async () => {
    const persona = userEvent.setup();
    vi.mocked(FlotaService.ausenciasDeConductor).mockResolvedValue([
      { id: 9, conductorId: 10, estado: "PERMISO", desde: "2099-01-01", hasta: "2099-01-05", motivo: null, registradoPor: 1, momento: "PROXIMA" },
    ]);
    vi.mocked(FlotaService.retirarAusenciaConductor).mockResolvedValue();
    montar("/?tab=conductores");
    await persona.click(await screen.findByRole("button", { name: "Ausencias de ESCALERAS KEVIN ANDRES" }));
    const cajon = await screen.findByRole("dialog", { name: "Ausencias" });

    await persona.click(await within(cajon).findByRole("button", { name: "Quitar" }));
    await persona.click(within(cajon).getByRole("button", { name: "Sí, quitar" }));

    await waitFor(() => expect(FlotaService.retirarAusenciaConductor).toHaveBeenCalledWith(10, 9));
  });
});
