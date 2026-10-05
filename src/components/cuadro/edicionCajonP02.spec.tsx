/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: edicionCajonP02.spec.tsx
 * Responsabilidad: Verificar el CIERRE y el GUARDADO del cajón de edición de P-02 (Fase D).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ SE PRUEBA. Las decisiones del cierre del cajón, no el maquetado:
 *   · el pie dice si hay «Cambios sin guardar» o «Sin cambios» (Formik `dirty`);
 *   · descartar con cambios AVISA de que el personal ya se guardó (se guarda al instante);
 *   · un 409 al guardar conserva lo capturado y ofrece «Recargar datos» (vuelve a pedir el
 *     operativo), en vez de perder el trabajo.
 *
 * SE MOCKEA `FormularioOperativo`: es la hoja con Formik y sus campos, y tiene su propia
 * cobertura. Aquí interesa la lógica de la PÁGINA alrededor del cajón, así que el doble solo
 * publica `refFormik` (con `dirty`), un `<form>` que al enviarse llama a `onGuardar`, y un botón
 * que dispara `onCambiosSinGuardar`, que es lo que la página necesita para decidir.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MutableRefObject, Ref } from "react";
import type { FormikProps } from "formik";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { ValoresOperativo } from "../../utils/valoresOperativo.util.ts";

/** Estado del doble del formulario: si tiene cambios sin guardar (`dirty`). Se ajusta por prueba. */
const estadoForm = { dirty: false };

/**
 * Catálogo que ve la página. Por omisión null; la prueba del payload lo fija a un formulario de
 * tipos MÚLTIPLES, porque `guardarEdicion` decide enviar `tipoControlIds`/`tipoLibre` por el flag
 * `tipoControlMultiple` (igual que el alta de P-01), no por si el arreglo trae datos.
 */
const { catalogosRef } = vi.hoisted(() => ({
  catalogosRef: { current: null as unknown },
}));

const VALORES: ValoresOperativo = {
  formularioCodigo: "PMO",
  horaInicio: "09:00",
  horaFin: "18:00",
  zonalesIds: [1],
  punto: "4",
  puntoLibre: "",
  puntoNuevo: null,
  tipoControl: "30",
  tiposControlIds: [],
  tipoLibre: "",
  institucionesIds: [] as number[],
  observaciones: [],
};

vi.mock("../../components/cuadro/FormularioOperativo.tsx", () => ({
  default: ({
    idForm,
    onGuardar,
    onCambiosSinGuardar,
    refFormik,
  }: {
    idForm?: string;
    onGuardar: (valores: unknown, ayudas: unknown) => void;
    onCambiosSinGuardar?: (hayCambios: boolean) => void;
    refFormik?: Ref<FormikProps<ValoresOperativo>>;
  }) => {
    if (refFormik && typeof refFormik === "object") {
      (
        refFormik as MutableRefObject<FormikProps<ValoresOperativo> | null>
      ).current = {
        values: VALORES,
        dirty: estadoForm.dirty,
      } as FormikProps<ValoresOperativo>;
    }

    return (
      <form
        id={idForm}
        onSubmit={(evento) => {
          evento.preventDefault();
          onGuardar(VALORES, { resetForm: vi.fn() });
        }}
      >
        <p>formulario simulado</p>
        <button
          type="button"
          onClick={() => onCambiosSinGuardar?.(true)}
        >
          ensuciar formulario
        </button>
      </form>
    );
  },
}));

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    consultar: vi.fn(),
    crearAdicional: vi.fn(),
    editar: vi.fn(),
    editarPatrulla: vi.fn(),
    obtener: vi.fn(),
    retirar: vi.fn(),
    asignarPersonal: vi.fn(),
    retirarPersonal: vi.fn(),
    actualizarTurnoPersonal: vi.fn(),
  },
}));

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));

vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({
    user: { rolName: "DMIP Operativos", rolCodes: ["DMIP_OPERATIVOS"] },
  }),
}));

vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => ({
    cuadro: {
      id: 9,
      fecha: "2026-07-31",
      admiteEscritura: true,
      estado: "APROBADO",
    },
    cargando: false,
    error: null,
    puedeEscribir: true,
    sinJornada: false,
    recargar: vi.fn(),
  }),
}));

vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({
    ventana: null,
    cargando: false,
    error: null,
    puedeEscribir: true,
    mensaje: "Su ventana de carga está cerrada.",
    horaCierre: "14H50",
    recargar: vi.fn(),
  }),
}));

vi.mock("../../hooks/useCatalogosFormulario.ts", () => ({
  useCatalogosFormulario: () => ({
    catalogos: catalogosRef.current,
    cargando: false,
    error: null,
    recargar: vi.fn(),
    puntos: [],
    cargandoPuntos: false,
    errorPuntos: null,
    cargarPuntosDeZonal: vi.fn(),
    cargarPuntosDeZonales: vi.fn(),
    limpiarPuntos: vi.fn(),
  }),
}));

import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";

const operativo = (parcial: Partial<Operativo> = {}): Operativo => ({
  id: 1,
  identificador: "OCPMO-004-31-JUL-2026",
  grupoRegistro: null,
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
    politicaVehiculo: "CONDICIONAL",
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
  observaciones: [],
  creadoPorRol: "DMIP_OPERATIVOS",
  creadoPor: 1,
  modificadoPorRol: "DMIP_OPERATIVOS",
  modificadoPor: 1,
  version: 1,
  creadoEn: "2026-07-31T12:00:00.000Z",
  ...parcial,
});

/** Renderiza la página, espera la fila y abre el cajón de edición del operativo. */
const abrirEdicion = async () => {
  vi.mocked(OperativoService.consultar).mockResolvedValue({
    datos: [operativo()],
    meta: { pagina: 1, tamanio: 200, total: 1, totalPaginas: 1 },
  });

  render(<MisOperativosPage />);
  await screen.findByText("OCPMO-004-31-JUL-2026");

  await userEvent.click(screen.getByRole("button", { name: "Editar" }));

  return screen.getByRole("dialog", {
    name: /Editar operativo OCPMO-004-31-JUL-2026/,
  });
};

describe("P-02 · cierre y guardado del cajón de edición (Fase D)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estadoForm.dirty = false;
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([]);
  });

  it("el pie indica «Sin cambios» y pasa a «Cambios sin guardar» al editar", async () => {
    const dialogo = await abrirEdicion();

    expect(
      within(dialogo).getByText("Sin cambios pendientes"),
    ).toBeInTheDocument();

    await userEvent.click(
      within(dialogo).getByRole("button", { name: "ensuciar formulario" }),
    );

    expect(
      within(dialogo).getByText("Cambios sin guardar"),
    ).toBeInTheDocument();
  });

  it("descartar con cambios avisa de que nada se guardó todavía (personal incluido)", async () => {
    // EDICIÓN DIFERIDA (2026-10-01): el operativo propio no guarda el personal al instante, así que
    // descartar también pierde los cambios de personal. El texto lo dice en palabras.
    estadoForm.dirty = true;
    const dialogo = await abrirEdicion();

    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );

    expect(
      screen.getByText(/Nada se ha guardado todavía\./),
    ).toBeInTheDocument();
    // El texto nombra qué se pierde: el personal y los generales (punto, zonales, instituciones…).
    expect(screen.getByText(/personal asignado/)).toBeInTheDocument();
    expect(
      screen.getByText(/punto de encuentro, zonales, instituciones, tipo de control/),
    ).toBeInTheDocument();
  });

  it("un 409 al guardar conserva la captura y ofrece «Recargar datos»", async () => {
    // El servidor rechaza por bloqueo optimista: otro guardó entre medias.
    vi.mocked(OperativoService.editar).mockRejectedValue({
      originalError: {
        response: {
          data: {
            statusCode: 409,
            codigo: "CONFLICTO_VERSION",
            mensaje:
              "El operativo cambió mientras lo editaba. Recárguelo antes de guardar.",
          },
        },
      },
    });
    vi.mocked(OperativoService.obtener).mockResolvedValue(
      operativo({ version: 2 }),
    );

    const dialogo = await abrirEdicion();

    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Guardar cambios" }),
    );

    // El aviso va DENTRO del cajón, con el mensaje del servidor tal cual (regla 7), y el cajón NO
    // se cierra: lo capturado se conserva.
    expect(
      await within(dialogo).findByText(
        "El operativo cambió mientras lo editaba. Recárguelo antes de guardar.",
      ),
    ).toBeInTheDocument();

    const recargar = within(dialogo).getByRole("button", {
      name: "Recargar datos",
    });
    await userEvent.click(recargar);

    // «Recargar datos» vuelve a pedir el operativo al servidor (trae la versión al día).
    await waitFor(() =>
      expect(OperativoService.obtener).toHaveBeenCalledWith(1),
    );
  });

  it("al guardar, el payload lleva los tipos del catálogo y el «otro tipo» libre", async () => {
    // Form de tipos MÚLTIPLES (p. ej. el 8): es la condición que hace viajar `tipoControlIds`.
    catalogosRef.current = { tipoControlMultiple: true };
    // Varios tipos elegidos + un «otro tipo» libre (lo que produce el combobox del cajón).
    VALORES.tipoControl = "";
    VALORES.tiposControlIds = [30, 31];
    VALORES.tipoLibre = "Patrullaje mixto";
    vi.mocked(OperativoService.editar).mockResolvedValue(operativo());

    const dialogo = await abrirEdicion();
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(OperativoService.editar).toHaveBeenCalled());
    // La CLAVE del contrato es `tipoControlIds` (no `tiposControlIds`, que es el valor local).
    expect(OperativoService.editar).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        tipoControlIds: [30, 31],
        tipoLibre: "Patrullaje mixto",
      }),
    );

    // Se restaura el fixture compartido para no contaminar otras pruebas.
    catalogosRef.current = null;
    VALORES.tipoControl = "30";
    VALORES.tiposControlIds = [];
    VALORES.tipoLibre = "";
  });
});
