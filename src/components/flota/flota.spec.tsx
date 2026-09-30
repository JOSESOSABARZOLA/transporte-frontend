/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: flota.spec.tsx
 * Responsabilidad: Verificar las decisiones de la pantalla de conductores y vehículos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE PRUEBAN DECISIONES, NO MAQUETADO. Que la tabla se desplace a 375 px se comprueba
 * mirando. Lo que aquí se afirma es lo que, de romperse, **no daría ningún error**:
 *
 *   · que un conductor sin vehículo habitual se señale, porque el alta parece correcta y
 *     el problema aparece el día del operativo, cuando la DAF no tiene placa que proponer;
 *   · que la baja advierta que no se deshace, porque el contrato del servidor no admite
 *     reactivar y la única corrección sería tocar la base;
 *   · que la cédula no sea un campo al editar, porque es la llave natural del conductor;
 *   · que el desplegable no ofrezca vehículos dados de baja.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ModalConductor from "./ModalConductor.tsx";
import TablaConductores from "./TablaConductores.tsx";
import TablaVehiculos from "./TablaVehiculos.tsx";
import AdminFlotaPage from "../../pages/AdminFlotaPage.tsx";
import {
  filtrarConductores,
  filtrarVehiculos,
  hayFiltrosDeFlota,
} from "../../utils/flota.util.ts";
import type { Conductor, Vehiculo } from "../../interfaces/Transporte.ts";

vi.mock("../../services/flota.service.ts", () => ({
  FlotaService: {
    listarConductores: vi.fn(),
    crearConductor: vi.fn(),
    actualizarConductor: vi.fn(),
    desactivarConductor: vi.fn(),
    listarVehiculos: vi.fn(),
    crearVehiculo: vi.fn(),
    actualizarVehiculo: vi.fn(),
    desactivarVehiculo: vi.fn(),
    // RN-DAF-03, agregadas el 2026-08-31. Van en el doble aunque estas pruebas no las
    // afirmen: la pantalla las pide dentro del mismo `Promise.all` que los dos maestros,
    // y una sola ausente rechaza la promesa entera y deja la tabla vacía. El síntoma
    // aparecía a cinco pruebas de distancia, como «no encuentro PBA-1234».
    listarUbicaciones: vi.fn(),
    crearUbicacion: vi.fn(),
    actualizarUbicacion: vi.fn(),
  },
}));

import { FlotaService } from "../../services/flota.service.ts";

const vehiculo = (parcial: Partial<Vehiculo> = {}): Vehiculo => ({
  id: 1,
  placa: "PBA-1234",
  descripcion: "Camioneta doble cabina blanca",
  activo: true,
  ...parcial,
});

const conductor = (parcial: Partial<Conductor> = {}): Conductor => ({
  id: 10,
  cedula: "1712345678",
  nombreCompleto: "REDROVÁN MENDOZA LUIS",
  telefono: "0999999999",
  licenciaTipo: "C",
  vehiculoHabitual: { id: 1, placa: "PBA-1234" },
  activo: true,
  // Los tres del 2026-08-31 nacen sin registrar, que es como llega un conductor recién
  // cargado a mano: cada regla comprueba primero si el dato consta.
  sector: null,
  parqueaderoAutorizado: false,
  tipoContrato: null,
  ...parcial,
});

const props = {
  procesando: false,
  onEditar: vi.fn(),
  onDarDeBaja: vi.fn(),
  mensajeVacio: "Sin datos",
};

describe("la tabla de conductores", () => {
  /**
   * Sin vehículo habitual, la DAF no tiene placa que proponer (RF-032) **y además ese
   * vehículo no existe para ella** (PV-33). El alta no da ningún error: el problema
   * aparece el día del operativo.
   */
  it("señala en la fila al conductor sin vehículo habitual", () => {
    render(
      <TablaConductores
        {...props}
        conductores={[conductor({ vehiculoHabitual: null })]}
      />,
    );

    expect(
      screen.getByText("Sin vehículo: la DAF no podrá proponerle placa"),
    ).toBeInTheDocument();
  });

  it("con vehículo habitual muestra la placa y no señala nada", () => {
    render(
      <TablaConductores
        {...props}
        conductores={[conductor()]}
      />,
    );

    expect(screen.getByText("PBA-1234")).toBeInTheDocument();
    expect(screen.queryByText(/Sin vehículo/)).toBeNull();
  });

  /** Regla 6 de CLAUDE.md: el estado lleva color **y** palabra. */
  it("el dado de baja se atenúa Y se rotula, y no se le puede volver a dar de baja", () => {
    const { container } = render(
      <TablaConductores
        {...props}
        conductores={[conductor({ activo: false })]}
      />,
    );

    expect(screen.getByText("Dado de baja")).toBeInTheDocument();
    expect(container.querySelector("tbody tr")?.className).toContain(
      "opacity-60",
    );
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeDisabled();
  });
});

describe("la tabla de vehículos", () => {
  /**
   * Un vehículo que no es habitual de nadie **no se puede asignar** desde P-03 (PV-33).
   * Un cero en esa columna es una advertencia, no un dato neutro, y por eso se escribe
   * con palabras en lugar de con un guion.
   */
  it("avisa de que un vehículo sin conductor habitual no se podrá asignar", () => {
    render(
      <TablaVehiculos
        {...props}
        vehiculos={[vehiculo()]}
        conductores={[]}
      />,
    );

    expect(
      screen.getByText("Ninguno: la DAF no podrá asignarlo"),
    ).toBeInTheDocument();
  });

  it("nombra a los conductores que lo llevan", () => {
    render(
      <TablaVehiculos
        {...props}
        vehiculos={[vehiculo()]}
        conductores={[conductor()]}
      />,
    );

    expect(screen.getByText("REDROVÁN MENDOZA LUIS")).toBeInTheDocument();
  });

  /**
   * UN CONDUCTOR DADO DE BAJA NO CUENTA. Sumarlo haría creer que el vehículo sigue
   * cubierto cuando ya no lo lleva nadie a ningún operativo.
   */
  it("no cuenta a los conductores dados de baja", () => {
    render(
      <TablaVehiculos
        {...props}
        vehiculos={[vehiculo()]}
        conductores={[conductor({ activo: false })]}
      />,
    );

    expect(
      screen.getByText("Ninguno: la DAF no podrá asignarlo"),
    ).toBeInTheDocument();
  });
});

describe("el modal de conductor", () => {
  const delModal = {
    abierto: true,
    guardando: false,
    aviso: null,
    onGuardar: vi.fn(),
    onCancelar: vi.fn(),
  };

  /**
   * Llave natural del conductor: cambiarla sería crear otro registro, no corregir éste.
   *
   * SE CONSULTA POR EL MARCADOR Y NO POR LA ETIQUETA, y no es un capricho de la prueba:
   * `FormikField` pinta la etiqueta en un `<label>` **hermano** del control, sin `htmlFor`,
   * así que `getByLabelText` no lo encuentra. Es un defecto de accesibilidad anterior a
   * esta pantalla y común a todos los formularios del sistema; queda reportado, no
   * corregido aquí.
   */
  it("al editar, la cédula no es un campo", () => {
    render(
      <ModalConductor
        {...delModal}
        conductor={conductor()}
        vehiculos={[vehiculo()]}
      />,
    );

    expect(screen.queryByPlaceholderText("1712345678")).toBeNull();
    expect(screen.getByText("1712345678")).toBeInTheDocument();
  });

  it("al dar de alta, la cédula sí se captura", () => {
    render(
      <ModalConductor
        {...delModal}
        conductor={null}
        vehiculos={[vehiculo()]}
      />,
    );

    expect(screen.getByPlaceholderText("1712345678")).toBeInTheDocument();
  });

  /**
   * Ofrecer un vehículo dado de baja dejaría al conductor con una placa que la DAF nunca
   * verá: su desplegable solo mira los vigentes.
   */
  it("el desplegable no ofrece vehículos dados de baja", () => {
    render(
      <ModalConductor
        {...delModal}
        conductor={null}
        vehiculos={[
          vehiculo({ id: 1, placa: "PBA-1234" }),
          vehiculo({ id: 2, placa: "PCC-9999", activo: false }),
        ]}
      />,
    );

    // Hasta el 2026-08-31 este era el único `<select>` del modal y bastaba con
    // `getByRole("combobox")`. Ahora hay tres —sector y tipo de contrato se sumaron con
    // los campos del levantamiento con la DAF— y hay que nombrar el que se comprueba.
    const desplegable = screen.getByLabelText(/Vehículo habitual/);

    expect(within(desplegable).getByText(/PBA-1234/)).toBeInTheDocument();
    expect(within(desplegable).queryByText(/PCC-9999/)).toBeNull();
  });

  /**
   * SIN VEHÍCULOS NO SE MUESTRA UN DESPLEGABLE VACÍO Y YA. Se explica por qué está vacío
   * y qué consecuencia tiene, o quien da de alta supone que el sistema falla.
   */
  it("sin ningún vehículo activo, dice por qué y qué implica", () => {
    render(
      <ModalConductor
        {...delModal}
        conductor={null}
        vehiculos={[]}
      />,
    );

    expect(
      screen.getByText(/No hay ningún vehículo activo en el maestro/),
    ).toBeInTheDocument();
  });

  it("muestra el rechazo del servidor tal cual", () => {
    const delServidor = "Ya existe un conductor con la cédula 1712345678.";

    render(
      <ModalConductor
        {...delModal}
        conductor={null}
        vehiculos={[]}
        aviso={delServidor}
      />,
    );

    expect(screen.getByText(delServidor)).toBeInTheDocument();
  });
});

describe("los filtros", () => {
  const flota = [
    conductor({ id: 10, nombreCompleto: "REDROVÁN MENDOZA LUIS" }),
    conductor({
      id: 11,
      cedula: "1799999999",
      nombreCompleto: "PAREDES SOLÍS ANA",
      vehiculoHabitual: { id: 2, placa: "PCC-9999" },
      activo: false,
    }),
  ];

  /** Se busca sin tildes ni mayúsculas, igual que en el resto del sistema. */
  it("encuentra por nombre sin tildes", () => {
    expect(filtrarConductores(flota, { busqueda: "redrovan" })).toHaveLength(1);
  });

  /** Quien llega con una placa en la mano no siempre sabe de quién es. */
  it("encuentra un conductor por la placa de su vehículo habitual", () => {
    const hallados = filtrarConductores(flota, { busqueda: "PCC-9999" });

    expect(hallados).toHaveLength(1);
    expect(hallados[0].nombreCompleto).toBe("PAREDES SOLÍS ANA");
  });

  it("separa activos de dados de baja", () => {
    expect(filtrarConductores(flota, { estado: "activos" })).toHaveLength(1);
    expect(filtrarConductores(flota, { estado: "inactivos" })).toHaveLength(1);
  });

  it("los vehículos se filtran por placa y por descripción", () => {
    const parque = [
      vehiculo({ id: 1, placa: "PBA-1234", descripcion: "Camioneta blanca" }),
      vehiculo({ id: 2, placa: "PCC-9999", descripcion: "Motocicleta" }),
    ];

    expect(filtrarVehiculos(parque, { busqueda: "moto" })).toHaveLength(1);
    expect(filtrarVehiculos(parque, { busqueda: "PBA" })).toHaveLength(1);
  });

  it("sin filtros no descarta nada", () => {
    expect(filtrarConductores(flota, {})).toHaveLength(2);
    expect(hayFiltrosDeFlota({})).toBe(false);
    expect(hayFiltrosDeFlota({ estado: "activos" })).toBe(true);
  });
});

describe("la pantalla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue([vehiculo()]);
    vi.mocked(FlotaService.listarConductores).mockResolvedValue([conductor()]);
    // El catálogo de zonales nace vacío —es Q-01— y así es como lo encuentra la pantalla
    // hasta que el administrador lo cargue.
    vi.mocked(FlotaService.listarUbicaciones).mockResolvedValue([]);
  });

  /**
   * EL MAESTRO SE PIDE CON LOS INACTIVOS. Esconderlos hace que quien busca un conductor
   * que no aparece lo vuelva a dar de alta; entonces la cédula choca contra el índice
   * único y el sistema parece averiado.
   */
  it("pide los dos maestros incluyendo los dados de baja", async () => {
    render(<AdminFlotaPage />);

    await screen.findAllByText("PBA-1234");

    expect(FlotaService.listarVehiculos).toHaveBeenCalledWith(true);
    expect(FlotaService.listarConductores).toHaveBeenCalledWith(true);
  });

  it("avisa en la cabecera cuántos conductores activos no podrán recibir placa", async () => {
    vi.mocked(FlotaService.listarConductores).mockResolvedValue([
      conductor({ vehiculoHabitual: null }),
    ]);

    render(<AdminFlotaPage />);

    expect(
      await screen.findByText(
        /Hay un conductor activo sin vehículo habitual/,
      ),
    ).toBeInTheDocument();
  });

  it("no avisa cuando todos tienen vehículo", async () => {
    render(<AdminFlotaPage />);

    await screen.findAllByText("PBA-1234");
    expect(screen.queryByText(/sin vehículo habitual/)).toBeNull();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * LA BAJA NO SE PUEDE DESHACER, Y HAY QUE DECIRLO ANTES.
   *
   * `ActualizarConductorDto` y `ActualizarVehiculoDto` no admiten `activo`, a diferencia
   * del contrato de personal: una baja por error solo se corrige tocando la base. Ésta es
   * la última pantalla donde quien confirma puede enterarse.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  it("la confirmación nombra el registro y advierte que no se deshace", async () => {
    render(<AdminFlotaPage />);

    await screen.findAllByText("PBA-1234");

    // SE BUSCA POR LA CÉDULA Y NO POR EL NOMBRE: el nombre del conductor aparece también
    // en la tabla de vehículos, en la columna de conductores habituales, y esa fila se
    // pinta antes. Buscar por el nombre pulsaría la baja del vehículo.
    const filaDelConductor = screen
      .getAllByRole("row")
      .find((fila) => within(fila).queryByText("1712345678"));

    await userEvent.click(
      within(filaDelConductor as HTMLElement).getByRole("button", {
        name: "Dar de baja",
      }),
    );

    expect(
      screen.getByText(/Se dará de baja a REDROVÁN MENDOZA LUIS/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/NO se puede deshacer desde la aplicación/),
    ).toBeInTheDocument();
  });

  /** El servidor redacta el motivo y cuenta los operativos: se muestra tal cual. */
  it("tras la baja muestra el mensaje del servidor sin reescribirlo", async () => {
    const delServidor =
      "PBA-1234 deja de ofrecerse en el desplegable. Sigue figurando en 3 operativos ya registrados.";
    vi.mocked(FlotaService.desactivarVehiculo).mockResolvedValue({
      registro: vehiculo({ activo: false }),
      operativosHistoricos: 3,
      mensaje: delServidor,
    });

    render(<AdminFlotaPage />);
    await screen.findAllByText("PBA-1234");

    const filaDelVehiculo = screen
      .getAllByRole("row")
      .find((fila) => within(fila).queryByText("PBA-1234"));

    await userEvent.click(
      within(filaDelVehiculo as HTMLElement).getByRole("button", {
        name: "Dar de baja",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Sí, dar de baja" }),
    );

    expect(await screen.findByText(delServidor)).toBeInTheDocument();
  });

  /** El vacío del maestro dice por dónde empezar, no solo que está vacío. */
  it("sin vehículos, explica que hay que empezar por ahí", async () => {
    vi.mocked(FlotaService.listarVehiculos).mockResolvedValue([]);
    vi.mocked(FlotaService.listarConductores).mockResolvedValue([]);

    render(<AdminFlotaPage />);

    expect(
      await screen.findByText(/Empiece por aquí: sin vehículos/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sin conductores, la DAF no puede asignar transporte/),
    ).toBeInTheDocument();
  });
});
