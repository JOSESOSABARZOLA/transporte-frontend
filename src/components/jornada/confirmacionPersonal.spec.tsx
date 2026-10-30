/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: confirmacionPersonal.spec.tsx
 * Responsabilidad: Que asignar personal lo diga, y que no lo diga si el servidor rechaza.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-01
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ACIERTO CALLABA Y EL FALLO HABLABA.
 *
 * Este panel mostraba `alert alert-error` con el motivo del servidor cuando algo salía
 * mal, y **nada en absoluto** cuando salía bien. La única señal era que el nombre
 * apareciera en la bandeja de asignados —donde aparecería igual si la petición se hubiera
 * perdido por el camino—.
 *
 * Importa aquí más que en otras pantallas por quién la usa: el departamento que aporta
 * abre este panel para poner a una persona en un operativo **que no es suyo**, y se va.
 * No tiene ninguna pantalla propia donde volver a comprobarlo.
 *
 * LA SEGUNDA PRUEBA ES LA QUE DISCRIMINA. La primera pasaría con un panel que confirmara
 * siempre, incluso sobre un rechazo; ésta exige que el mensaje dependa del resultado.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import PanelPersonalJornada from "./PanelPersonalJornada.tsx";
import { resumenCajon } from "../../pruebas/resumenCajon.ts";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    obtener: vi.fn(),
    asignarPersonal: vi.fn(),
    retirarPersonal: vi.fn(),
    guardarPersonal: vi.fn(),
  },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));
// Los catálogos solo aportan el prefijo de cada área (patrulla): aquí no responden.
vi.mock("../../services/catalogoCuadro.service", () => ({
  CatalogoCuadroService: { obtenerCatalogos: vi.fn(() => new Promise(() => {})) },
}));

/**
 * El operativo tal como lo devuelve el servidor, sin nadie asignado.
 *
 * SE DEVUELVE SIEMPRE EL MISMO OBJETO en los simulacros que no cambian: el panel tiene
 * efectos que dependen de la identidad de lo que reciben, y uno nuevo por pintado los
 * dispararía sin fin. Es la lección que dejó `correccionEnSesion.spec.tsx`.
 */
const OPERATIVO = {
  id: 7,
  identificador: "OCECU-001-02-SEP-2026",
  version: 1,
  horaInicio: "08:00",
  horaFin: "12:00",
  personal: [],
  zonales: [],
  instituciones: [],
  alertas: [],
  esLote: false,
  creadoPorRol: "DMIP_OPERATIVOS",
  formulario: {
    codigo: "ECU",
    numero: 4,
    nombre: "PATRULLA ECU DIURNA",
    esPatrulla: true,
    rolDueno: "DMIP_OPERATIVOS",
    roles: [
      { rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" },
      { rol: "DMIT_INSTRUCTOR", acceso: "APORTA" },
    ],
  },
} as unknown as Awaited<ReturnType<typeof OperativoService.obtener>>;

/** Una instructora elegible: es lo que el DMIT aporta a la ECU. */
const CANDIDATA = {
  id: 41,
  apellidos: "YUNDA",
  nombres: "JESSICA",
  area: "INSTRUCCION",
  cargo: "Instructora",
  telefono: "97 969 0786",
  elegible: true,
  motivo: null,
} as unknown as Awaited<
  ReturnType<typeof PersonalService.consultarElegibles>
>[number];

const FILA = {
  id: 7,
  identificador: "OCECU-001-02-SEP-2026",
  horario: "08H00 A 12H00",
  personal: [],
  areasPendientesDelRol: [],
  composicionPorInformar: [],
  alertas: [],
} as unknown as FilaJornada;

const SECCION = {
  numero: 4,
  codigo: "ECU",
  nombre: "Patrulla ECU Diurna",
  acceso: "APORTA",
  puedeEditarPersonal: true,
  filas: [FILA],
} as unknown as SeccionJornada;

const abrirPanel = () => {
  vi.mocked(OperativoService.obtener).mockResolvedValue(OPERATIVO);
  vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([CANDIDATA]);

  return render(
    <PanelPersonalJornada
      fila={FILA}
      seccion={SECCION}
      fecha="2026-09-02"
      roles={["DMIT_INSTRUCTOR"]}
      motivoBloqueo={null}
      onCerrar={vi.fn()}
      onCambio={vi.fn()}
    />,
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

/** El cajón abierto, ya con el operativo cargado. */
const cajonAbierto = () =>
  screen.findByRole("dialog", { name: "Personal de OCECU-001-02-SEP-2026" });

/**
 * Agrega a la candidata con su «+ Agregar». Desde el 2026-10-29 la Jornada usa la misma lista
 * compacta que el resto de cajones de aporte, con el horario de cada persona en línea.
 */
const agregarCandidata = async () =>
  userEvent.click(await screen.findByRole("button", { name: "+ Agregar" }));

/**
 * «GUARDAR CAMBIOS» (2026-10-28). Agregar y quitar ya no viajan solos: tocan el borrador y el lote va
 * en una llamada. La confirmación sigue hablando, pero al guardar; y un rechazo no guarda nada.
 */
describe("P-13 · el personal se confirma con «Guardar cambios» (2026-10-28)", () => {
  it("agregar NO llama al servidor: marca «Nuevo» y el pie cuenta el cambio", async () => {
    abrirPanel();
    const cajon = await cajonAbierto();

    await agregarCandidata();

    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();
    expect(OperativoService.guardarPersonal).not.toHaveBeenCalled();
    expect(within(cajon).getByText("Nuevo")).toBeInTheDocument();
    expect(within(cajon).getByText("1 cambio sin guardar · +1 persona")).toBeInTheDocument();
  });

  it("sin cambios, «Guardar cambios» está apagado", async () => {
    abrirPanel();
    const cajon = await cajonAbierto();

    expect(within(cajon).getByText("Sin cambios pendientes")).toBeInTheDocument();
    expect(within(cajon).getByRole("button", { name: "Guardar cambios" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("«Guardar cambios» envía el conjunto completo en UNA llamada y lo confirma", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockResolvedValue({
      ...OPERATIVO,
      personal: [{ funcionarioId: 41, nombre: "YUNDA JESSICA" }],
    } as never);
    const onCambio = vi.fn();
    const onCerrar = vi.fn();
    vi.mocked(OperativoService.obtener).mockResolvedValue(OPERATIVO);
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([CANDIDATA]);
    render(
      <PanelPersonalJornada
        fila={FILA}
        seccion={SECCION}
        fecha="2026-09-02"
        roles={["DMIT_INSTRUCTOR"]}
        motivoBloqueo={null}
        onCerrar={onCerrar}
        onCambio={onCambio}
      />,
    );
    const cajon = await cajonAbierto();

    await agregarCandidata();
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
    expect(OperativoService.guardarPersonal).toHaveBeenCalledTimes(1);
    expect(OperativoService.guardarPersonal).toHaveBeenCalledWith(
      7,
      [{ funcionarioId: 41, horaInicio: "08:00", horaFin: "12:00" }],
      false,
    );
    expect(onCambio).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Personal guardado: 1 persona en OCECU-001-02-SEP-2026"),
    ).toBeInTheDocument();
  });

  it("si el servidor rechaza, no se guarda nada: el motivo nombra a la persona y el borrador queda", async () => {
    vi.mocked(OperativoService.guardarPersonal).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: {
            codigo: "CUPO_COMPARTIDO_SUPERADO",
            mensaje: "Su departamento ya asignó las 2 personas de su cupo.",
            detalles: { funcionarioId: 41 },
          },
        },
      },
    });

    abrirPanel();
    const cajon = await cajonAbierto();
    await agregarCandidata();
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar cambios" }));

    // El motivo del servidor se muestra tal cual (regla 7), en la fila de esa persona.
    const motivo = await within(cajon).findByText(
      "Su departamento ya asignó las 2 personas de su cupo.",
    );
    expect(motivo.closest("li")).toHaveTextContent("YUNDA JESSICA");
    expect(screen.queryByText(/Personal guardado/)).toBeNull();
    // El borrador sigue: la persona y su «Nuevo».
    expect(within(cajon).getByText("Nuevo")).toBeInTheDocument();
  });

  it("cerrar con cambios pide confirmación; sin cambios cierra directo", async () => {
    const onCerrar = vi.fn();
    vi.mocked(OperativoService.obtener).mockResolvedValue(OPERATIVO);
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([CANDIDATA]);
    render(
      <PanelPersonalJornada
        fila={FILA}
        seccion={SECCION}
        fecha="2026-09-02"
        roles={["DMIT_INSTRUCTOR"]}
        motivoBloqueo={null}
        onCerrar={onCerrar}
        onCambio={vi.fn()}
      />,
    );
    const cajon = await cajonAbierto();
    await agregarCandidata();

    await userEvent.click(within(cajon).getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("¿Descartar cambios?")).toBeInTheDocument();
    expect(onCerrar).not.toHaveBeenCalled();
  });
});

/**
 * H7 (2026-10-15). «Reparto de carga» era un cajón aparte (z-40) que se abría DETRÁS del modal de la
 * jornada (z-10002). Ahora el personal de la jornada es un cajón estándar y el reparto se abre DENTRO
 * de él, como una vista: no hay un segundo diálogo que pueda quedar debajo.
 */
describe("P-13 · cajón estándar y reparto de carga (H7)", () => {
  it("es un cajón estándar con [Cancelar] [Guardar cambios] (2026-10-28)", async () => {
    abrirPanel();

    const cajon = await screen.findByRole("dialog", {
      name: "Personal de OCECU-001-02-SEP-2026",
    });
    expect(within(cajon).getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(within(cajon).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    // El texto común del aporte (2026-10-29), el mismo que en Mis operativos y Registro.
    expect(
      screen.getByText(
        "Su departamento aporta personal a este operativo. El resto de los datos los mantiene el departamento dueño del formulario y llega en lectura.",
      ),
    ).toBeInTheDocument();
    // La estructura del cajón estándar (R10): ancho, cabecera, secciones y pie.
    expect(resumenCajon(cajon)).toMatchSnapshot();
  });

  it("«Ver reparto de carga» se abre dentro del mismo cajón, delante", async () => {
    vi.mocked(OperativoService.obtener).mockResolvedValue(OPERATIVO);
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([
      { ...CANDIDATA, indiceCarga: 1, cuotaJusta: 2 },
    ] as never);
    render(
      <PanelPersonalJornada
        fila={FILA}
        seccion={SECCION}
        fecha="2026-09-02"
        roles={["DMIT_INSTRUCTOR"]}
        motivoBloqueo={null}
        onCerrar={vi.fn()}
        onCambio={vi.fn()}
      />,
    );

    await userEvent.click(await screen.findByRole("button", { name: /Ver reparto de carga/ }));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    const cajon = screen.getByRole("dialog", { name: "Personal de OCECU-001-02-SEP-2026" });
    expect(within(cajon).getByRole("button", { name: /Volver al operativo/ })).toBeInTheDocument();
  });
});
