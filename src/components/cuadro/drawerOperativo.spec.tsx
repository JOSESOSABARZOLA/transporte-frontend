/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Edición y adicional de operativos
 * Archivo: drawerOperativo.spec.tsx
 * Responsabilidad: Verificar las decisiones del cajón único de un operativo (adicional y editar).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * Lo que se prueba son DECISIONES, no el maquetado:
 *
 *   · cerrar sin cambios no pregunta; con cambios, sí, por los cuatro caminos;
 *   · el pie dice qué falta, y «Registrar adicional» se ve apagado PERO recibe el clic y lleva al
 *     primer error;
 *   · el error del servidor queda dentro del cajón;
 *   · los selectores no nacen como listas abiertas;
 *   · en Órdenes de servicio el cajón no empuja la tabla y el foco vuelve a «+ Adicional».
 *
 * El registro completo desde la página (cierra, avisa y resalta la fila) está en
 * `adicionalOperativo.spec.tsx`, que ya monta Mis operativos con sus dobles.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DrawerOperativo, {
  type DrawerOperativoProps,
} from "./DrawerOperativo.tsx";
import OrdenesServicioPage from "../../pages/OrdenesServicioPage.tsx";
import { MemoryRouter } from "react-router-dom";
import { DocumentoService } from "../../services/documento.service.ts";
import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type { Matriz } from "../../interfaces/Documento.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { PersonaAgregada } from "./SelectorPersonal.tsx";
import { resumenCajon } from "../../pruebas/resumenCajon.ts";

vi.mock("../../services/documento.service.ts", () => ({
  DocumentoService: {
    consultarMatriz: vi.fn(),
    emitirOrdenes: vi.fn(),
    consultarOrdenesDeOperativo: vi.fn(),
    obtenerPlantilla: vi.fn(() => new Promise(() => {})),
  },
}));
vi.mock("../ordenes/EditorPlantillaOrden.tsx", () => ({ default: () => null }));
vi.mock("../ordenes/VisorPdf.tsx", () => ({ default: () => null }));
vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: { obtener: vi.fn(), crearAdicional: vi.fn() },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));

/** El operativo del que nace el adicional: con zonal, punto, tipo e institución ya elegidos. */
const origen = (parcial: Partial<Operativo> = {}): Operativo =>
  ({
    id: 1,
    identificador: "OCPMO-001-09-OCT-2026",
    grupoRegistro: null,
    secuencial: 1,
    cuadroFecha: "2026-10-09",
    esAdicional: false,
    origen: null,
    adicionales: 0,
    formulario: {
      codigo: "PMO",
      nombre: "Control de Punto de Mando Operativo (PMO)",
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
    instituciones: [{ id: 7, sigla: "AMC", nombre: "AMC" }],
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
    creadoEn: "2026-10-09T12:00:00.000Z",
    ...parcial,
  }) as Operativo;

const CATALOGOS = {
  zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
  puntos: [],
  tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS" }],
  instituciones: [{ id: 7, formularioId: 2, sigla: "AMC", nombre: "AMC" }],
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  tipoControlMultiple: false,
  variosPorPersona: false,
  cantidadPorPersona: false,
  puntoManual: false,
} as unknown as CatalogosFormulario;

const conHorario: PersonaAgregada = {
  funcionarioId: 5,
  nombre: "YUNDA JESSICA",
  telefono: null,
  horaInicio: "08:00",
  horaFin: "12:00",
};

const pintar = (
  parcial: Partial<Extract<DrawerOperativoProps, { modo: "adicional" }>> = {},
) => {
  const onCerrar = vi.fn();
  const onGuardar = vi.fn();
  render(
    <DrawerOperativo
      modo="adicional"
      origen={origen()}
      catalogos={CATALOGOS}
      puntos={[]}
      cargandoPuntos={false}
      onZonalesElegidas={vi.fn()}
      candidatos={[]}
      cargandoPersonal={false}
      personalAgregado={[]}
      onAgregarPersona={vi.fn()}
      onRetirarPersona={vi.fn()}
      onCambiarHorarioPersona={vi.fn()}
      avisoPersonal={null}
      bloqueado={false}
      ventanaCerrada={false}
      guardando={false}
      onGuardar={onGuardar}
      onCerrar={onCerrar}
      {...parcial}
    />,
  );
  return { onCerrar, onGuardar };
};

const dialogo = () => screen.getByRole("dialog", { name: "Operativo adicional" });

describe("el cajón del adicional se cierra sin perder lo capturado", () => {
  it("sin cambios, Escape, ✕ y el velo cierran sin preguntar", async () => {
    const { onCerrar } = pintar();

    await userEvent.keyboard("{Escape}");
    expect(onCerrar).toHaveBeenCalledTimes(1);

    // El velo y el aspa se llaman igual («Cerrar»): el primero es el velo, el segundo el aspa.
    const [velo, aspa] = screen.getAllByRole("button", { name: "Cerrar" });
    await userEvent.click(aspa);
    await userEvent.click(velo);
    expect(onCerrar).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByText("¿Descartar cambios?"),
    ).toBeNull();
  });

  it("con cambios pide confirmar: «Seguir editando» lo conserva y «Descartar» cierra", async () => {
    // Fijarle un horario a una persona es un cambio de quien captura (los heredados nacen sin él).
    const { onCerrar } = pintar({ personalAgregado: [conHorario] });

    await userEvent.keyboard("{Escape}");
    expect(onCerrar).not.toHaveBeenCalled();
    expect(
      screen.getByText("¿Descartar cambios?"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(
      screen.queryByText("¿Descartar cambios?"),
    ).toBeNull();
    expect(dialogo()).toBeInTheDocument();

    await userEvent.click(
      within(dialogo()).getByRole("button", { name: "Cancelar" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});

describe("el pie dice qué falta y lleva al primer error", () => {
  it("con algo pendiente, «Registrar adicional» se ve apagado pero recibe el clic", async () => {
    const { onGuardar } = pintar();

    expect(
      within(dialogo()).getByText("0 efectivos · 1 campo por completar").closest("[role=status]"),
    ).not.toBeNull();

    const registrar = within(dialogo()).getByRole("button", {
      name: "Registrar adicional",
    });
    expect(registrar).toHaveAttribute("aria-disabled", "true");
    expect(registrar).toBeEnabled();

    await userEvent.click(registrar);

    // No se envía, y el foco (con el desplazamiento) va al bloque de personal, que es lo que falta.
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("bloque-personal"),
    );
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("dice cuántos efectivos lleva respecto del original y cuándo está listo", async () => {
    const { onGuardar } = pintar({
      origen: origen({
        personal: [
          {
            funcionarioId: 5,
            nombre: "YUNDA JESSICA",
            area: "OPERATIVOS",
            telefono: null,
            esResponsable: true,
            asignadoPorRol: "DMIP_OPERATIVOS",
          },
          {
            funcionarioId: 6,
            nombre: "CAMPAÑA JUAN",
            area: "OPERATIVOS",
            telefono: null,
            esResponsable: false,
            asignadoPorRol: "DMIP_OPERATIVOS",
          },
        ] as Operativo["personal"],
      }),
      personalAgregado: [conHorario],
    });

    await waitFor(() =>
      expect(
        within(dialogo()).getByText(/1 de 2 efectivos · Listo para registrar/),
      ).toBeInTheDocument(),
    );
    const registrar = within(dialogo()).getByRole("button", {
      name: "Registrar adicional",
    });
    expect(registrar).not.toHaveAttribute("aria-disabled");

    await userEvent.click(registrar);
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
  });

  it("el error del servidor queda dentro del cajón, sobre el pie", () => {
    pintar({
      errorServidor: {
        texto: "YUNDA JESSICA ya tiene un operativo a esa hora.",
        variante: "error",
      },
    });

    expect(within(dialogo()).getByRole("alert")).toHaveTextContent(
      "YUNDA JESSICA ya tiene un operativo a esa hora.",
    );
  });
});

describe("el cuerpo va por secciones y sin listas abiertas", () => {
  it("rotula las cuatro secciones del adicional", () => {
    pintar();

    for (const seccion of [
      "Personal y horario",
      "Lugar",
      "Control",
      "Transporte y observaciones",
    ]) {
      expect(within(dialogo()).getByText(seccion)).toBeInTheDocument();
    }
    // La estructura del cajón estándar (R10): ancho, cabecera, secciones y pie.
    expect(resumenCajon(dialogo())).toMatchSnapshot();
  });

  it("zonales, instituciones y tipos no nacen como listas fijas abiertas", async () => {
    pintar();

    // Se espera al foco inicial: el cajón baja al primer campo, y ese no puede ser un combobox
    // (abriría su lista).
    await new Promise((resolver) => window.setTimeout(resolver, 0));
    expect(within(dialogo()).queryByRole("listbox")).toBeNull();
  });
});

describe("en Órdenes de servicio el adicional abre el cajón", () => {
  const matriz = {
    cabecera: {
      estado: "CERRADO",
      ordenTrabajo: "AMC-2026-10-09",
      fechaNatural: "viernes 9 de octubre de 2026",
    },
    secciones: [
      {
        numero: 2,
        codigo: "PMO",
        nombre: "PLANIFICACIÓN Y MONITOREO",
        colorFondo: "#2e7d32",
        colorAcento: "#000000",
        colorNombre: "verde",
        responsable: "DMIP Operativos",
        esPatrulla: false,
        admiteAdicionales: true,
        totalOperativos: 1,
        evidencia: null,
        filas: [
          {
            id: 1,
            identificador: "OCPMO-001-09-OCT-2026",
            grupoRegistro: null,
            esAdicional: false,
            origen: null,
            horario: "09H00 A 18H00",
            personal: [],
            zonales: [],
            puntoEncuentro: "",
            tipoControl: "",
            instituciones: [],
            conductor: null,
            placa: null,
            observaciones: [],
            estadoTransporte: "PENDIENTE",
            esNocturno: false,
            alertas: [],
          },
        ],
      },
    ],
  } as unknown as Matriz;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(matriz);
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockResolvedValue(
      [],
    );
    vi.mocked(OperativoService.obtener).mockResolvedValue(origen());
    vi.mocked(PersonalService.consultarElegibles).mockResolvedValue([]);
  });

  it("«+ Adicional» abre el cajón sin mover la tabla, y al cerrar el foco vuelve al botón", async () => {
    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    const boton = await screen.findByRole("button", { name: "Adicional" });
    expect(boton).toHaveAttribute(
      "title",
      "Registrar un operativo adicional a partir de OCPMO-001-09-OCT-2026",
    );
    const tabla = screen.getByRole("table");

    await userEvent.click(boton);
    const cajon = await screen.findByRole("dialog", {
      name: "Operativo adicional",
    });

    // El cajón va en un portal sobre la página: la tabla no lo contiene ni tiene nada encima
    // que la empuje (antes el formulario se insertaba en la página, arriba de ella).
    expect(tabla.contains(cajon)).toBe(false);
    expect(cajon.closest("section")).toBeNull();
    expect(screen.getByRole("table")).toBe(tabla);
    // Es el cajón único, en su modo «adicional» (el mismo componente que la edición).
    expect(
      cajon.querySelector('[data-drawer-operativo="adicional"]'),
    ).not.toBeNull();

    const [, aspa] = within(cajon.parentElement as HTMLElement).getAllByRole(
      "button",
      { name: "Cerrar" },
    );
    await userEvent.click(aspa);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Adicional" })).toHaveFocus();
  });
});

/*
  ═══════════════════════════════════════════════════════════════════════════════
  MODO «EDITAR» (2026-10-08). El MISMO componente que el adicional: solo cambia el contenido.
  Se prueban sus decisiones propias —título, pie, solo lectura, aviso de la DAF, descarte— y que
  no es otro marcado: el atributo `data-drawer-operativo` lo dice en las dos.
  ═══════════════════════════════════════════════════════════════════════════════
*/
const PERSONA = {
  funcionarioId: 5,
  nombre: "YUNDA JESSICA",
  area: "OPERATIVOS",
  telefono: null,
  esResponsable: false,
  asignadoPorRol: "DMIP_OPERATIVOS",
  horaInicio: "09:00",
  horaFin: "18:00",
} as Operativo["personal"][number];

const pintarEdicion = (
  parcial: Partial<Extract<DrawerOperativoProps, { modo: "editar" }>> = {},
) => {
  const onCerrar = vi.fn();
  const onGuardar = vi.fn();
  render(
    <DrawerOperativo
      modo="editar"
      soloLectura={false}
      personalPendiente={false}
      horarioCambiado={false}
      operativo={origen({ personal: [PERSONA] })}
      catalogos={CATALOGOS}
      puntos={[]}
      cargandoPuntos={false}
      onZonalesElegidas={vi.fn()}
      candidatos={[]}
      cargandoPersonal={false}
      onAgregarPersona={vi.fn()}
      onRetirarPersona={vi.fn()}
      onCambiarHorarioPersona={vi.fn()}
      avisoPersonal={null}
      bloqueado={false}
      personalInmediato={false}
      guardando={false}
      onGuardar={onGuardar}
      onCerrar={onCerrar}
      {...parcial}
    />,
  );
  return { onCerrar, onGuardar };
};

const cajonEdicion = () =>
  screen.getByRole("dialog", { name: "Editar operativo" });

describe("el modo «editar» del cajón único", () => {
  it("es el mismo cajón: título, identificador con el chip del formulario y «Guardar cambios»", () => {
    pintarEdicion();

    const cajon = cajonEdicion();
    expect(within(cajon).getByText("OCPMO-001-09-OCT-2026")).toBeInTheDocument();
    expect(
      within(cajon).getByText("2. Control de Punto de Mando Operativo (PMO)"),
    ).toBeInTheDocument();
    expect(
      within(cajon).getByRole("button", { name: "Guardar cambios" }),
    ).toBeInTheDocument();
    // Sin avisos de herencia: eso es del adicional.
    expect(within(cajon).queryByText(/Heredadas de/)).toBeNull();
    expect(
      cajon.querySelector('[data-drawer-operativo="editar"]'),
    ).not.toBeNull();
    // Las mismas secciones que el adicional.
    for (const seccion of ["Personal y horario", "Lugar", "Control"]) {
      expect(within(cajon).getByText(seccion)).toBeInTheDocument();
    }
    expect(resumenCajon(cajon)).toMatchSnapshot();
  });

  it("con la ventana cerrada se abre en solo lectura: sin «Guardar cambios» y con «Cerrar»", () => {
    pintarEdicion({ soloLectura: true, bloqueado: true });

    const cajon = cajonEdicion();
    expect(
      within(cajon).queryByRole("button", { name: "Guardar cambios" }),
    ).toBeNull();
    expect(within(cajon).getByText(/Solo lectura/)).toBeInTheDocument();
  });

  it("con personal sin aplicar, cerrar pregunta «¿Descartar los cambios?»", async () => {
    const { onCerrar } = pintarEdicion({ personalPendiente: true });

    await userEvent.keyboard("{Escape}");
    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("avisa a la DAF solo si hay transporte asignado y cambia un horario", () => {
    pintarEdicion({
      operativo: origen({ personal: [PERSONA], estadoTransporte: "ASIGNADO" }),
      horarioCambiado: true,
    });
    expect(
      screen.getByText(/pendiente de reasignación por la DAF/),
    ).toBeInTheDocument();
  });

  it("sin transporte asignado, cambiar el horario no avisa a la DAF", () => {
    pintarEdicion({ horarioCambiado: true });
    expect(screen.queryByText(/pendiente de reasignación por la DAF/)).toBeNull();
  });

  it("el error del servidor queda dentro del cajón, sobre el pie", () => {
    pintarEdicion({
      errorServidor: { texto: "El servidor dijo que no.", variante: "error" },
    });
    expect(
      within(cajonEdicion()).getByRole("alert"),
    ).toHaveTextContent("El servidor dijo que no.");
  });
});
