/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos · columna Acciones
 * Archivo: accionesOperativo.spec.tsx
 * Responsabilidad: Fijar el grupo de acciones único de P-02 (solo icono desde el 2026-10-19):
 *                  cuatro botones en orden fijo y sin «⋮», el tooltip, «Agregar adicional»
 *                  apagado con su motivo, «Eliminar» con confirmación y aviso, y las filas de
 *                  consulta con solo «Ver detalle».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 */

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import { OperativoService } from "../../services/operativo.service.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import { fechaDeJornadaPorDefecto, sumarDias } from "../../utils/jornada.util.ts";
import { RETRASO_TOOLTIP_MS } from "../common/Tooltip.tsx";

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    rango: vi.fn(),
    consultar: vi.fn(),
    actualizar: vi.fn(),
    retirar: vi.fn(),
    retirarRegistro: vi.fn(),
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

const FORMULARIO_PMO: Operativo["formulario"] = {
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
};

const operativo = (parcial: Partial<Operativo> = {}): Operativo => ({
  id: 1,
  identificador: "OCPMO-001",
  grupoRegistro: "registro-suelto",
  esLote: false,
  secuencial: 1,
  cuadroFecha: VIGENTE,
  cuadroEstado: "BORRADOR",
  admiteEdicion: true,
  esAdicional: false,
  origen: null,
  adicionales: 0,
  formulario: FORMULARIO_PMO,
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
  version: 3,
  creadoEn: "2026-10-13T12:00:00.000Z",
  ...parcial,
});

/** Una patrulla de dos personas (Form 5): la registró el mismo departamento del usuario. */
const patrulla = (): Operativo[] => {
  const formulario = {
    ...FORMULARIO_PMO,
    codigo: "REACD",
    nombre: "Patrulla reacción diurna",
    numero: 5,
    esPatrulla: true,
    admiteAdicionales: false,
  };
  return [
    operativo({ id: 11, identificador: "IGECU-001", grupoRegistro: "lote-1", esLote: true, formulario }),
    operativo({ id: 12, identificador: "ITECU-001", grupoRegistro: "lote-1", esLote: true, formulario }),
  ];
};

/** Anteayer respecto del vigente, y cerrado: una fila de consulta. */
const cerrado = (): Operativo =>
  operativo({
    id: 3,
    identificador: "OCPMO-009",
    cuadroFecha: sumarDias(VIGENTE, -2),
    cuadroEstado: "CERRADO",
    admiteEdicion: false,
  });

const pintar = async (datos: Operativo[]) => {
  vi.mocked(OperativoService.consultar).mockResolvedValue({
    datos,
    meta: { total: datos.length, pagina: 1, tamanio: 200, totalPaginas: 1 },
  });
  render(<MisOperativosPage />);
  await screen.findByText(datos[0].identificador);
};

const filaDe = (identificador: string): HTMLElement =>
  screen.getByText(identificador).closest("tr") as HTMLElement;

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

/** El botón de una acción en la fila: su nombre accesible lleva el identificador. */
const boton = (fila: HTMLElement, accion: string, identificador: string) =>
  within(fila).queryByRole("button", { name: `${accion} ${identificador}` });

describe("Mis operativos · acciones con icono (2026-10-19)", () => {
  it("cuatro botones de 32 px, en orden fijo y sin «⋮»: Editar, Agregar adicional, Ver detalle, Eliminar", async () => {
    await pintar([operativo()]);

    const fila = filaDe("OCPMO-001");
    const editar = boton(fila, "Editar", "OCPMO-001");
    const adicional = boton(fila, "Agregar adicional", "OCPMO-001");
    const ver = boton(fila, "Ver detalle", "OCPMO-001");
    const eliminar = boton(fila, "Eliminar", "OCPMO-001");

    expect(editar).toHaveClass("btn", "btn-sm", "btn-square", "app-accion-secundaria");
    expect(adicional).toHaveClass("btn", "btn-sm", "btn-square", "btn-outline", "btn-primary");
    expect(ver).toHaveClass("btn", "btn-sm", "btn-square", "app-accion-secundaria");
    expect(eliminar).toHaveClass("btn", "btn-sm", "btn-square", "btn-outline", "btn-error");
    // Solo icono: el nombre lo dan el tooltip y el aria-label, no un texto visible.
    expect(editar).toHaveTextContent("");
    const orden = [editar, adicional, ver, eliminar] as HTMLElement[];
    for (let i = 1; i < orden.length; i += 1) {
      expect(
        orden[i - 1].compareDocumentPosition(orden[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(within(fila).queryByRole("button", { name: /Más acciones/ })).toBeNull();
    // La columna mide lo mismo en todas las filas y va a la derecha.
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toHaveClass(
      "w-[9.5rem]",
      "text-right",
    );
    expect(fila.querySelector("[data-acciones-operativo]")).toHaveClass("app-acciones-icono");
  });

  it("el tooltip aparece a los 300 ms con el ratón, al instante con el foco, y Escape lo cierra", async () => {
    await pintar([operativo()]);
    const editar = boton(filaDe("OCPMO-001"), "Editar", "OCPMO-001") as HTMLElement;
    // El rótulo es la descripción accesible, abierto o cerrado.
    expect(editar).toHaveAccessibleDescription("Editar");

    vi.useFakeTimers();
    try {
      fireEvent.mouseEnter(editar.parentElement as HTMLElement);
      expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
      act(() => {
        vi.advanceTimersByTime(RETRASO_TOOLTIP_MS);
      });
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Editar");
      fireEvent.mouseLeave(editar.parentElement as HTMLElement);
      expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    } finally {
      vi.useRealTimers();
    }

    act(() => editar.focus());
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Editar");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("«Agregar adicional» se apaga con su motivo cuando no aplica", async () => {
    await pintar([
      operativo(),
      operativo({ id: 2, identificador: "OCAPMO-001", esAdicional: true }),
      ...patrulla(),
    ]);

    const delAdicional = boton(filaDe("OCAPMO-001"), "Agregar adicional", "OCAPMO-001");
    expect(delAdicional).toHaveAttribute("aria-disabled", "true");
    expect(delAdicional).toHaveAccessibleDescription(
      "Es un operativo adicional: los adicionales no se encadenan.",
    );

    const deLaPatrulla = boton(filaDe("IGECU-001"), "Agregar adicional", "IGECU-001 · ITECU-001");
    expect(deLaPatrulla).toHaveAttribute("aria-disabled", "true");
    expect(deLaPatrulla).toHaveAccessibleDescription(
      "Este formulario no admite operativos adicionales.",
    );

    expect(boton(filaDe("OCPMO-001"), "Agregar adicional", "OCPMO-001")).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  /*
    LA PATRULLA 5/6 ES UN OPERATIVO (2026-10-31): sus acciones van UNA vez, en una celda combinada
    sobre todos sus códigos —«Todo el operativo»— y actúan sobre toda la patrulla. Ya no hay
    «Eliminar» por persona: quitar a una sola se hace en «Editar operativo».
  */
  it("la patrulla lleva sus acciones UNA vez, en una celda «Todo el operativo» sobre sus dos códigos", async () => {
    await pintar(patrulla());

    const celda = screen.getByText("Todo el operativo").closest("td") as HTMLTableCellElement;
    expect(celda.rowSpan).toBe(2);
    for (const accion of ["Editar", "Ver detalle", "Eliminar"]) {
      expect(screen.getAllByRole("button", { name: new RegExp(`^${accion} `) })).toHaveLength(1);
    }
    expect(boton(filaDe("ITECU-001"), "Eliminar", "ITECU-001")).toBeNull();
  });

  it("«Eliminar» de la patrulla confirma el operativo completo, con sus códigos y personas, y retira todo en una llamada", async () => {
    const usuario = userEvent.setup();
    vi.mocked(OperativoService.retirarRegistro).mockResolvedValue({
      retirados: 2,
      eliminados: 2,
      desactivados: 0,
      identificadores: ["IGECU-001", "ITECU-001"],
      identificadoresDesactivados: [],
    });
    const [ig, it_] = patrulla();
    await pintar([
      { ...ig, personal: [{ ...ig.personal[0], nombre: "SALAZAR SOTO TATIANA PILAR" }] },
      { ...it_, personal: [{ ...it_.personal[0], nombre: "ALVAREZ CASAS RENE ALIRIO" }] },
    ] as Operativo[]);

    await usuario.click(screen.getByRole("button", { name: "Eliminar IGECU-001 · ITECU-001" }));
    const modal = screen.getByRole("alertdialog", { name: "¿Eliminar el operativo completo?" });
    expect(
      within(modal).getByText(
        "Se quitarán los 2 códigos del operativo y su personal quedará libre. Esta acción no se puede deshacer.",
      ),
    ).toBeInTheDocument();
    const lista = within(modal).getByRole("list", { name: "Códigos que se retiran" });
    expect(within(lista).getAllByRole("listitem").map((fila) => fila.textContent)).toEqual([
      "IGECU-001 · SALAZAR SOTO TATIANA PILAR",
      "ITECU-001 · ALVAREZ CASAS RENE ALIRIO",
    ]);
    expect(within(modal).getByText("Para quitar a una sola persona, use Editar operativo.")).toBeInTheDocument();
    await usuario.click(within(modal).getByRole("button", { name: "Eliminar operativo" }));

    await waitFor(() => expect(OperativoService.retirarRegistro).toHaveBeenCalledWith("lote-1"));
    expect(OperativoService.retirarRegistro).toHaveBeenCalledTimes(1);
    expect(OperativoService.retirar).not.toHaveBeenCalled();
    expect(await screen.findByText("Operativo eliminado · 2 códigos retirados")).toBeInTheDocument();
  });

  it("quien solo APORTA a la patrulla ve «Agregar personal» y «Ver detalle», sin Eliminar", async () => {
    const ajena = patrulla().map((codigo) => ({
      ...codigo,
      creadoPorRol: "DMIP_INSPECCIONES",
      formulario: {
        ...codigo.formulario,
        rolDueno: "DMIP_INSPECCIONES",
        roles: [
          { rol: "DMIP_INSPECCIONES", acceso: "ESCRITURA" },
          { rol: "DMIP_OPERATIVOS", acceso: "APORTA" },
        ],
      },
    })) as Operativo[];
    await pintar(ajena);

    expect(screen.getByRole("button", { name: "Agregar personal IGECU-001 · ITECU-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle IGECU-001 · ITECU-001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Eliminar / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Editar / })).toBeNull();
  });

  it("«Eliminar» pide confirmación en rojo y, al confirmar, avisa", async () => {
    vi.mocked(OperativoService.retirar).mockResolvedValue({
      identificador: "OCPMO-001",
      eliminado: true,
      ordenesEmitidas: 0,
    } as Awaited<ReturnType<typeof OperativoService.retirar>>);
    const usuario = userEvent.setup();
    await pintar([operativo()]);

    await usuario.click(boton(filaDe("OCPMO-001"), "Eliminar", "OCPMO-001") as HTMLElement);

    const modal = await screen.findByRole("alertdialog", { name: "¿Eliminar OCPMO-001?" });
    expect(
      within(modal).getByText(
        "Se quitará el operativo y su personal quedará libre. Esta acción no se puede deshacer.",
      ),
    ).toBeInTheDocument();
    const confirmar = within(modal).getByRole("button", { name: "Eliminar" });
    expect(confirmar).toHaveClass("btn-error");
    expect(OperativoService.retirar).not.toHaveBeenCalled();

    await usuario.click(confirmar);
    await waitFor(() => expect(OperativoService.retirar).toHaveBeenCalledWith(1, 3));
    expect(await screen.findByText(/OCPMO-001 eliminado/)).toBeInTheDocument();
  });

  it("una fila de cuadro cerrado: solo «Ver detalle»", async () => {
    await pintar([cerrado()]);

    const fila = filaDe("OCPMO-009");
    expect(boton(fila, "Ver detalle", "OCPMO-009")).not.toHaveAttribute("aria-disabled");
    expect(boton(fila, "Editar", "OCPMO-009")).toBeNull();
    expect(boton(fila, "Agregar adicional", "OCPMO-009")).toBeNull();
    expect(boton(fila, "Eliminar", "OCPMO-009")).toBeNull();
  });

  it("una fila de otro departamento: «Agregar personal» en lugar de Editar, y «Eliminar» apagado con su motivo", async () => {
    await pintar([operativo({ creadoPorRol: "DMIP_INSPECCIONES" })]);

    const fila = filaDe("OCPMO-001");
    expect(boton(fila, "Editar", "OCPMO-001")).toBeNull();
    expect(boton(fila, "Agregar personal", "OCPMO-001")).toBeInTheDocument();
    const eliminar = boton(fila, "Eliminar", "OCPMO-001");
    expect(eliminar).toHaveAttribute("aria-disabled", "true");
    expect(eliminar).not.toHaveAccessibleDescription("Eliminar");
    expect(boton(fila, "Ver detalle", "OCPMO-001")).not.toHaveAttribute("aria-disabled");
  });

  it("«Ver detalle» abre el DETALLE aunque la fila admita edición; «Editar» abre la edición", async () => {
    const usuario = userEvent.setup();
    await pintar([operativo()]);

    await usuario.click(boton(filaDe("OCPMO-001"), "Ver detalle", "OCPMO-001") as HTMLElement);

    // El detalle de solo lectura (2026-10-27), no el formulario de edición apagado.
    const cajon = await screen.findByRole("dialog", { name: "Detalle del operativo" });
    expect(cajon.querySelector("[data-detalle-operativo]")).not.toBeNull();
    expect(cajon.querySelector("[data-drawer-operativo]")).toBeNull();
    expect(within(cajon).queryByRole("button", { name: "Guardar cambios" })).toBeNull();

    // Fila propia con la ventana abierta: «Editar» abre el cajón de edición de siempre.
    await usuario.click(within(cajon).getByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("dialog", { name: "Editar operativo" })).toBeInTheDocument();
  });

  it("el detalle de una fila de otro departamento no ofrece «Editar»", async () => {
    const usuario = userEvent.setup();
    await pintar([operativo({ creadoPorRol: "DMIP_INSPECCIONES" })]);

    await usuario.click(boton(filaDe("OCPMO-001"), "Ver detalle", "OCPMO-001") as HTMLElement);

    const cajon = await screen.findByRole("dialog", { name: "Detalle del operativo" });
    expect(within(cajon).queryByRole("button", { name: "Editar" })).toBeNull();
    expect(within(cajon).getAllByRole("button", { name: "Cerrar" }).length).toBeGreaterThan(0);
  });
});

/*
  REGISTRO POR ZONAS DEL 8 (2026-10-31): el operativo es UNO aunque tenga varios códigos. SALAZAR SOTO
  con 11 códigos en 2 zonas —La Mariscal (principal) IG-001 a IG-004 y Manuela Sáenz IG-005 a IG-011—.
  Las acciones van una vez, en la celda combinada, y actúan sobre todo el registro.
*/
describe("Mis operativos · acciones del registro por zonas (2026-10-31)", () => {
  const FORMULARIO_8: Operativo["formulario"] = {
    ...FORMULARIO_PMO,
    codigo: "INSP",
    nombre: "Inspecciones técnicas y generales",
    numero: 8,
    rolDueno: "DMIP_OPERATIVOS",
  };
  const SALAZAR = {
    funcionarioId: 300,
    nombre: "SALAZAR SOTO ANA",
    area: "GENERAL",
    telefono: null,
    cargo: null,
    esResponsable: false,
    asignadoPorRol: "DMIP_OPERATIVOS",
    horaInicio: "08:00",
    horaFin: "15:00",
  } as unknown as Operativo["personal"][number];
  const numero = (n: number) => `IG-${String(n).padStart(3, "0")}`;
  const codigo = (n: number, parcial: Partial<Operativo> = {}) =>
    operativo({
      id: 100 + n,
      identificador: numero(n),
      grupoRegistro: "registro-salazar",
      esLote: true,
      esZonaPrincipal: n <= 4,
      formulario: FORMULARIO_8,
      zonales:
        n <= 4
          ? [{ id: 1, codigo: "MAR", nombre: "Zonal La Mariscal" }]
          : [{ id: 2, codigo: "SAE", nombre: "Zonal Manuela Sáenz" }],
      personal: [SALAZAR],
      ...parcial,
    });
  const registro = (parcial: Partial<Operativo> = {}) =>
    Array.from({ length: 11 }, (_, i) => codigo(i + 1, parcial));
  const RANGO = "IG-001 a IG-011";

  it("las acciones van UNA vez, nombradas con el rango del registro", async () => {
    await pintar(registro());

    for (const accion of ["Editar", "Agregar adicional", "Ver detalle", "Eliminar"]) {
      expect(screen.getAllByRole("button", { name: new RegExp(`^${accion} IG-`) })).toHaveLength(1);
      expect(screen.getByRole("button", { name: `${accion} ${RANGO}` })).toBeInTheDocument();
    }
  });

  it("«Eliminar» pide confirmar el operativo completo y retira los 11 códigos en una llamada", async () => {
    const usuario = userEvent.setup();
    vi.mocked(OperativoService.retirarRegistro).mockResolvedValue({
      retirados: 11,
      eliminados: 11,
      desactivados: 0,
      identificadores: Array.from({ length: 11 }, (_, i) => numero(i + 1)),
      identificadoresDesactivados: [],
    });
    await pintar(registro());

    await usuario.click(screen.getByRole("button", { name: `Eliminar ${RANGO}` }));
    const modal = screen.getByRole("alertdialog", { name: "¿Eliminar el operativo completo?" });
    expect(
      within(modal).getByText(
        "Se quitarán los 11 códigos (IG-001 a IG-011) de SALAZAR SOTO ANA en Zonal La Mariscal y Zonal Manuela Sáenz. Esta acción no se puede deshacer.",
      ),
    ).toBeInTheDocument();
    await usuario.click(within(modal).getByRole("button", { name: "Eliminar operativo" }));

    await waitFor(() =>
      expect(OperativoService.retirarRegistro).toHaveBeenCalledWith("registro-salazar"),
    );
    expect(OperativoService.retirarRegistro).toHaveBeenCalledTimes(1);
    expect(OperativoService.retirar).not.toHaveBeenCalled();
  });

  it("«Ver detalle» muestra el registro completo: el rango y una sección por zona, la principal primero", async () => {
    const usuario = userEvent.setup();
    await pintar(registro());

    await usuario.click(screen.getByRole("button", { name: `Ver detalle ${RANGO}` }));

    const cajon = await screen.findByRole("dialog", { name: /Detalle del operativo/ });
    expect(within(cajon).getByText(RANGO)).toBeInTheDocument();
    expect(within(cajon).queryByText("registro-salazar")).toBeNull();
    const zonas = within(cajon)
      .getAllByRole("region", { name: /^Zona \d · / })
      .map((seccion) => seccion.getAttribute("aria-label"));
    expect(zonas).toEqual(["Zona 1 · Zonal La Mariscal", "Zona 2 · Zonal Manuela Sáenz"]);
    expect(within(cajon).getByText("IG-005 a IG-011 · 7 códigos")).toBeInTheDocument();
    expect(within(cajon).getByText("11 códigos · 2 zonas")).toBeInTheDocument();
  });

  it("de otro departamento: Editar y Eliminar apagados con su motivo", async () => {
    await pintar(registro({ creadoPorRol: "DMIP_INSPECCIONES" }));

    expect(screen.getByRole("button", { name: `Editar ${RANGO}` })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: `Eliminar ${RANGO}` })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("en consulta (cuadro cerrado): solo «Ver detalle»", async () => {
    await pintar(
      registro({
        cuadroFecha: sumarDias(VIGENTE, -2),
        cuadroEstado: "CERRADO",
        admiteEdicion: false,
      }),
    );

    expect(screen.getByRole("button", { name: `Ver detalle ${RANGO}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Editar ${RANGO}` })).toBeNull();
    expect(screen.queryByRole("button", { name: `Eliminar ${RANGO}` })).toBeNull();
  });
});
