/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: ordenes.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PRUEBA DEL CASO 3 ES LA RAZÓN DE SER DE ESTE ARCHIVO.
 *
 * Se emiten tres órdenes y se comprueba que **la hoja de cada persona no menciona a las
 * otras dos**. RN-51: la filtración del cuadro permitía a los intervenidos anticiparse al
 * operativo, y este módulo es el punto por donde la información sale del sistema hacia
 * papel. Una prueba que solo mirara que el nombre propio aparece habría pasado igual con
 * una hoja que los nombra a los tres.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import OrdenesServicioPage from "../../pages/OrdenesServicioPage.tsx";
import { DocumentoService } from "../../services/documento.service.ts";

vi.mock("../../services/documento.service.ts", () => ({
  DocumentoService: {
    consultarMatriz: vi.fn(),
    emitirOrdenes: vi.fn(),
    consultarOrdenesDeOperativo: vi.fn(),
    verOrdenMemorando: vi.fn(),
    obtenerDatosMemorando: vi.fn(),
    generarMemorandoEditado: vi.fn(),
    // La página consulta la plantilla PROPIA para el aviso de datos incompletos (2026-10-05). Por
    // omisión queda pendiente: el aviso no aparece y no interfiere con las demás pruebas.
    obtenerPlantilla: vi.fn(() => new Promise(() => {})),
  },
}));
// El visor real monta react-pdf (worker de pdf.js), que no corre en jsdom. Se sustituye por un
// doble que respeta los estados visibles (cargando/error): así se prueban el aviso de borrador y las
// acciones del cajón sin depender del render del PDF, que se comprueba a mano.
// El editor de plantilla tiene sus propias pruebas (editorPlantillaOrden.spec); aquí basta un doble
// con su salida «← Órdenes de servicio» para comprobar que la página recarga al volver (H35).
vi.mock("./EditorPlantillaOrden.tsx", () => ({
  default: ({ onVolver }: { onVolver: () => void }) => (
    <button type="button" onClick={onVolver}>
      ← Órdenes de servicio
    </button>
  ),
}));
vi.mock("./VisorPdf.tsx", () => ({
  default: ({
    pdf,
    cargando,
    error,
    vacio,
  }: {
    pdf: Blob | null;
    cargando?: boolean;
    error?: string | null;
    vacio?: string;
  }) =>
    error ? (
      <div role="alert">{error}</div>
    ) : cargando ? (
      <p>Cargando el documento…</p>
    ) : !pdf ? (
      <p>{vacio ?? "Sin documento."}</p>
    ) : (
      <div data-testid="visor-pdf-listo" />
    ),
}));
vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: { obtener: vi.fn(), crearAdicional: vi.fn() },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import CamposDeLaOrden from "./CamposDeLaOrden.tsx";
import TarjetaOrden from "./TarjetaOrden.tsx";
import VistaPreviaOrden from "./VistaPreviaOrden.tsx";
import {
  motivoParaNoEmitir,
  operativosDeLaMatriz,
  type OperativoEmisible,
} from "../../utils/ordenes.util.ts";
import type {
  Faltante,
  FilaMatriz,
  Matriz,
  OrdenServicio,
  SeccionMatriz,
} from "../../interfaces/Documento.ts";

/** Un dato faltante de prueba; el origen agrupa el aviso de borrador (E21). */
const falta = (
  etiqueta: string,
  origen: Faltante["origen"],
  token = etiqueta,
): Faltante => ({ token, etiqueta, origen });

const orden = (
  funcionario: string,
  parcial: Partial<OrdenServicio> = {},
): OrdenServicio => {
  const base: OrdenServicio = {
    codigo: `OS-ICNECU-001-31-JUL-2026-1-1`,
    emitidaEn: "2026-07-31T18:00:00.000Z",
    vigente: true,
    estado: "VIGENTE",
    version: 1,
    numeroOrden: "AMC-OS-00005572-2026",
    fechaJornada: "2026-07-31",
    datoAislado: {
      horario: "18H00 A 23H30",
      funcionario,
      conductor: { nombre: "VIVANCO JORGE", telefono: "0978631797" },
      placa: "PMA7892",
    },
    faltantes: [],
    firmante: {
      nombre: "DE LA GUERRA FRANKLIN",
      cargo: "Director Metropolitano",
      dependencia: "Dirección Metropolitana de Inspección",
      usuarioId: 1,
      fecha: "2026-07-31T18:00:00.000Z",
    },
    // Plantilla por Director (2026-10-05): por defecto la generó el Director en sesión.
    directorId: 1,
    directorNombre: "DE LA GUERRA FRANKLIN",
    esPropia: true,
    plantillaVersion: 1,
    ...parcial,
  };
  // Coherencia: sin número o con faltantes ⇒ no está Vigente; reemplazada si no es vigente.
  const estado: OrdenServicio["estado"] = !base.vigente
    ? "REEMPLAZADA"
    : base.faltantes.length > 0
      ? "BORRADOR"
      : "VIGENTE";
  return {
    ...base,
    estado: parcial.estado ?? estado,
    numeroOrden:
      parcial.numeroOrden !== undefined
        ? parcial.numeroOrden
        : estado === "VIGENTE"
          ? base.numeroOrden
          : null,
  };
};

const LAS_TRES = [
  orden("YUNDA JESSICA", { codigo: "OS-ICNECU-001-1-1" }),
  orden("CAMPAÑA JUAN", { codigo: "OS-ICNECU-001-2-1" }),
  orden("NARVAEZ IVAN", { codigo: "OS-ICNECU-001-3-1" }),
];

describe("caso 2 · la hoja tiene cuatro campos, y solo cuatro", () => {
  it("horario, funcionario, conductor y placa", () => {
    const { container } = render(
      <CamposDeLaOrden dato={LAS_TRES[0].datoAislado} />,
    );

    const rotulos = [...container.querySelectorAll("dt")].map(
      (celda) => celda.textContent,
    );

    // Contar, no enumerar: un quinto campo agregado «para que sepa a dónde ir» haría caer
    // esta prueba, que es exactamente lo que INV-24 necesita.
    expect(rotulos).toEqual(["Horario", "Funcionario", "Conductor", "Placa"]);
  });

  it("el teléfono del conductor acompaña al nombre, sin ser un campo aparte", () => {
    const { container } = render(
      <CamposDeLaOrden dato={LAS_TRES[0].datoAislado} />,
    );

    expect(screen.getByText("0978631797")).toBeInTheDocument();
    expect(container.querySelectorAll("dt")).toHaveLength(4);
  });

  it("sin conductor ni placa lo dice, en lugar de dejar el hueco en blanco", () => {
    render(
      <CamposDeLaOrden
        dato={{
          horario: "08H00 A 12H00",
          funcionario: "SEGOVIA MARIA",
          conductor: null,
          placa: null,
        }}
      />,
    );

    expect(screen.getByText("Sin conductor asignado")).toBeInTheDocument();
    expect(screen.getByText("Sin vehículo asignado")).toBeInTheDocument();
  });
});

describe("casos 1 y 3 · una hoja por persona, y ninguna nombra a las otras", () => {
  it("tres personas producen tres hojas", () => {
    render(<VistaPreviaOrden ordenes={LAS_TRES} />);

    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("la hoja de cada quien NO menciona a los otros dos", () => {
    render(<VistaPreviaOrden ordenes={LAS_TRES} />);

    const hojas = screen.getAllByRole("article");
    const nombres = ["YUNDA JESSICA", "CAMPAÑA JUAN", "NARVAEZ IVAN"];

    hojas.forEach((hoja, indice) => {
      // El dueño aparece en el campo «Funcionario» de la hoja: al menos una vez.
      expect(
        within(hoja).getAllByText(nombres[indice]).length,
      ).toBeGreaterThan(0);

      // RN-51. Lo que no está es lo que importa.
      nombres
        .filter((_, otro) => otro !== indice)
        .forEach((ajeno) => {
          expect(within(hoja).queryByText(ajeno)).toBeNull();
        });
    });
  });

  it("una orden reemplazada se distingue de la vigente", () => {
    // Reemitir no borra la anterior (M-20): entregar una hoja ya reemplazada por
    // equivocación es el error que este distintivo evita.
    render(
      <VistaPreviaOrden
        ordenes={[orden("YUNDA JESSICA", { vigente: false })]}
      />,
    );

    expect(screen.getByText(/Reemplazada/)).toBeInTheDocument();
  });

  it("una orden vigente con datos sin completar es «Borrador» y resume lo que falta, agrupado (B9)", () => {
    render(
      <VistaPreviaOrden
        ordenes={[
          orden("YUNDA JESSICA", {
            faltantes: [
              falta("Dependencia del destinatario", "persona", "dependencia"),
              falta("Número de memorando", "plantilla"),
              falta("Elaborado por", "plantilla", "elaboradoPor"),
            ],
          }),
        ]}
      />,
    );

    // El chip del estado (no el aviso, que también dice «Borrador:»).
    expect(screen.getByText(/Borrador · v/)).toBeInTheDocument();
    expect(screen.queryByText(/Vigente/)).toBeNull();
    // La tarjeta RESUME por quién completa el dato, con los MISMOS cuatro orígenes que el visor
    // (funcionario / plantilla / firmante / configuración); el detalle vive en «Ver documento».
    // Aquí: 1 del funcionario y 2 de la plantilla (memorando y la tabla de control, 2026-10-08).
    expect(
      screen.getByText(/faltan 1 del funcionario y 2 de la plantilla/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/del cuadro/)).toBeNull();
  });

  it("el firmante es su propio grupo, «del firmante» (2026-10-05)", () => {
    render(
      <VistaPreviaOrden
        ordenes={[
          orden("YUNDA JESSICA", {
            faltantes: [
              falta("Dependencia del destinatario", "persona", "dependencia"),
              // El firmante vive en la plantilla del Director, pero se agrupa aparte.
              falta("Cargo del firmante", "firmante", "firmanteCargo"),
              falta("Dependencia del firmante", "firmante", "firmanteDependencia"),
              falta("Dirección responsable", "plantilla", "direccionResponsable"),
            ],
          }),
        ]}
      />,
    );

    // 1 del funcionario, 1 de la plantilla (dirección) y 2 del firmante (cargo y dependencia).
    expect(
      screen.getByText(/faltan 1 del funcionario, 1 de la plantilla y 2 del firmante/),
    ).toBeInTheDocument();
  });

  it("«Ver documento» abre el cajón del memorando con código, funcionario y estado", async () => {
    // El memorando queda «cargando» a propósito: la prueba comprueba el CABLEADO —que el
    // botón abre el cajón y pide el PDF— sin ejercitar el render de react-pdf en jsdom.
    vi.mocked(DocumentoService.verOrdenMemorando).mockReturnValue(
      new Promise<Blob>(() => {}),
    );
    render(<VistaPreviaOrden ordenes={[orden("YUNDA JESSICA")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Ver documento" }));

    // Es el DrawerLateral (role=dialog), con «Orden de servicio · <funcionario>» y su estado.
    const cajon = screen.getByRole("dialog", {
      name: /Orden de servicio · YUNDA JESSICA/,
    });
    expect(cajon).toBeInTheDocument();
    expect(within(cajon).getByText("Vigente")).toBeInTheDocument();
    expect(
      within(cajon).getByRole("button", { name: "Descargar PDF" }),
    ).toBeInTheDocument();
    expect(
      within(cajon).getByRole("button", { name: "Imprimir" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cargando el documento…")).toBeInTheDocument();
    expect(DocumentoService.verOrdenMemorando).toHaveBeenCalled();
  });

  it("al cerrar «Ver documento» el foco vuelve al botón que lo abrió", async () => {
    vi.mocked(DocumentoService.verOrdenMemorando).mockReturnValue(
      new Promise<Blob>(() => {}),
    );
    render(<VistaPreviaOrden ordenes={[orden("YUNDA JESSICA")]} />);

    const abrir = screen.getByRole("button", { name: "Ver documento" });
    await userEvent.click(abrir);
    // Escape cierra el cajón; el foco debe volver al botón que lo abrió (usePanelAccesible).
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(abrir).toHaveFocus();
  });

  it("si falta conductor o placa, «Asignar transporte» ENLAZA a transporte (RN-40), no edita aquí", () => {
    // RN-40: conductor y placa son los dos campos de la DAF. La tarjeta no los escribe; cuando
    // faltan, ofrece un enlace a «Planificar el día», donde la DAF los completa.
    render(
      <MemoryRouter>
        <VistaPreviaOrden
          ordenes={[
            orden("YUNDA JESSICA", {
              datoAislado: {
                horario: "08H00 A 12H00",
                funcionario: "YUNDA JESSICA",
                conductor: null,
                placa: null,
              },
            }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Asignar transporte" }),
    ).toHaveAttribute("href", "/home/cuadro/transporte");
    // No hay un botón «Editar» que abra un editor en esta pantalla (se retiró en B9).
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("con conductor y placa asignados NO ofrece «Asignar transporte»", () => {
    render(
      <MemoryRouter>
        <VistaPreviaOrden ordenes={[orden("YUNDA JESSICA")]} />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("link", { name: "Asignar transporte" }),
    ).toBeNull();
  });
});

describe("E21 · el aviso de borrador agrupa los faltantes por quién los completa", () => {
  const pendiente = () => new Promise<Blob>(() => {});

  const borradorConTodo = () =>
    orden("YUNDA JESSICA", {
      faltantes: [
        falta("Dependencia del destinatario", "persona", "dependencia"),
        // El firmante, los demás datos generales y la tabla de control se completan en la plantilla.
        falta("Número de memorando", "plantilla", "numeroMemorando"),
        falta("Siglas de la unidad", "plantilla", "siglasUnidad"),
      ],
    });

  const abrirVisor = async (
    ordenBorrador: OrdenServicio,
    onEditarPlantilla = vi.fn(),
  ) => {
    render(
      <MemoryRouter>
        <VistaPreviaOrden
          ordenes={[ordenBorrador]}
          onEditarPlantilla={onEditarPlantilla}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ver documento" }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentoService.verOrdenMemorando).mockReturnValue(pendiente());
  });

  it("muestra un grupo por origen, cada uno con su acción en línea", async () => {
    await abrirVisor(borradorConTodo());

    const cajon = screen.getByRole("dialog");
    expect(within(cajon).getByText(/faltan 3 datos/)).toBeInTheDocument();
    // «Completar datos» (el cargo en línea) se retiró el 2026-10-08: el cargo sale de la ficha y,
    // sin dato, va en blanco. El grupo del funcionario se muestra, sin acción.
    expect(
      within(cajon).queryByRole("button", { name: "Completar datos" }),
    ).toBeNull();
    // El grupo «Cuadro» (NUT y «elaborado por» del día) se retiró el 2026-10-08.
    expect(
      within(cajon).queryByRole("button", { name: "Completar cuadro" }),
    ).toBeNull();
    // Los datos generales de la plantilla (dirección, memorando, designado y FIRMANTE) se completan
    // en el editor de la plantilla: su grupo ofrece «Completar en la plantilla», no un formulario.
    expect(
      within(cajon).getByRole("button", { name: "Completar en la plantilla" }),
    ).toBeInTheDocument();
    // Ya no existe «Completar mi perfil»: el firmante se completa en la plantilla.
    expect(
      within(cajon).queryByRole("button", { name: "Completar mi perfil" }),
    ).toBeNull();
  });

  it("el grupo «Datos generales de la plantilla» ofrece «Completar en la plantilla» y abre el editor", async () => {
    const onEditarPlantilla = vi.fn();
    render(
      <MemoryRouter>
        <VistaPreviaOrden
          ordenes={[
            orden("YUNDA JESSICA", {
              faltantes: [
                falta("Número de memorando", "plantilla", "numeroMemorando"),
                falta("Funcionario designado", "plantilla", "designado"),
              ],
            }),
          ]}
          onEditarPlantilla={onEditarPlantilla}
        />
      </MemoryRouter>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Ver documento" }),
    );

    const cajon = screen.getByRole("dialog");
    expect(
      within(cajon).getByText(/Datos generales de la plantilla/),
    ).toBeInTheDocument();
    await userEvent.click(
      within(cajon).getByRole("button", { name: "Completar en la plantilla" }),
    );
    expect(onEditarPlantilla).toHaveBeenCalled();
  });

  it("descargar un BORRADOR pide confirmación: no es un documento válido (E22)", async () => {
    vi.mocked(DocumentoService.verOrdenMemorando).mockResolvedValue(
      new Blob(["%PDF-"], { type: "application/pdf" }),
    );
    render(
      <MemoryRouter>
        <VistaPreviaOrden ordenes={[borradorConTodo()]} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ver documento" }));

    // Con el PDF cargado, el botón de descarga está activo; en un borrador avisa antes.
    await userEvent.click(
      await screen.findByRole("button", { name: "Descargar PDF" }),
    );

    expect(
      screen.getByText(/¿Descargar el borrador?/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sí, descargar" }),
    ).toBeInTheDocument();
  });
});

describe("caso 4 · el botón deshabilitado siempre dice por qué", () => {
  const emisible = (personal: string[]): OperativoEmisible => ({
    id: 1,
    identificador: "ICNECU-001-31-JUL-2026",
    formulario: "6. Patrulla de Reacción Nocturna",
    horario: "18H00 A 23H30",
    personal,
    admiteAdicionales: false,
    esAdicional: false,
    origen: null,
  });

  it("sin personal, el motivo nombra la causa", () => {
    expect(motivoParaNoEmitir(emisible([]), true)).toContain(
      "no tiene personal asignado",
    );
  });

  it("con el cuadro sin cerrar, el motivo es otro", () => {
    expect(motivoParaNoEmitir(emisible(["YUNDA JESSICA"]), false)).toContain(
      "Disponible cuando el cuadro esté cerrado",
    );
  });

  it("con personal y el cuadro cerrado, no hay motivo: se puede emitir", () => {
    expect(motivoParaNoEmitir(emisible(["YUNDA JESSICA"]), true)).toBeNull();
  });

  it("la falta de personal manda sobre el estado del cuadro", () => {
    // Sin personal no hay a quién entregar, esté el cuadro como esté: decir «ciérrelo
    // primero» mandaría a cerrar el cuadro para chocar después con el mismo bloqueo.
    expect(motivoParaNoEmitir(emisible([]), false)).toContain(
      "no tiene personal asignado",
    );
  });
});

describe("la lista de operativos sale de la matriz", () => {
  const seccion = (parcial: Partial<SeccionMatriz>): SeccionMatriz =>
    ({
      numero: 6,
      codigo: "ICNECU",
      nombre: "Patrulla de Reacción Nocturna",
      colorFondo: "#1b3a5c",
      colorAcento: "#000000",
      colorNombre: "azul",
      responsable: "DMIP Inspecciones",
      esPatrulla: true,
      totalOperativos: 0,
      filas: [],
      evidencia: null,
      ...parcial,
    }) as SeccionMatriz;

  const matriz = (secciones: SeccionMatriz[]): Matriz =>
    ({ cabecera: {}, secciones }) as unknown as Matriz;

  it("aplana las secciones y conserva el formulario de cada fila", () => {
    const filas = operativosDeLaMatriz(
      matriz([
        seccion({
          totalOperativos: 1,
          filas: [
            {
              id: 7,
              identificador: "ICNECU-001-31-JUL-2026",
              horario: "18H00 A 23H30",
              personal: [
                { funcionarioId: 1, nombre: "YUNDA JESSICA", esResponsable: true },
              ],
            },
          ],
        } as unknown as Partial<SeccionMatriz>),
      ]),
    );

    expect(filas).toEqual([
      {
        id: 7,
        identificador: "ICNECU-001-31-JUL-2026",
        formulario: "6. Patrulla de Reacción Nocturna",
        horario: "18H00 A 23H30",
        personal: ["YUNDA JESSICA"],
      },
    ]);
  });

  it("un formulario que nadie cargó no aporta operativos", () => {
    expect(operativosDeLaMatriz(matriz([seccion({})]))).toEqual([]);
    expect(operativosDeLaMatriz(null)).toEqual([]);
  });
});

describe("caso 6 · P-06 entrega la orden en el teléfono", () => {
  it("la tarjeta lleva sus cuatro campos y el botón de descarga", async () => {
    const descargar = vi.fn();

    render(
      <TarjetaOrden
        orden={LAS_TRES[0]}
        descargando={false}
        onDescargar={descargar}
      />,
    );

    expect(screen.getByText("18H00 A 23H30")).toBeInTheDocument();
    expect(screen.getByText("PMA7892")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Descargar PDF" }),
    );
    expect(descargar).toHaveBeenCalledWith("OS-ICNECU-001-1-1");
  });

  it("mientras descarga, el botón lo dice y no se puede repetir", () => {
    render(
      <TarjetaOrden
        orden={LAS_TRES[0]}
        descargando
        onDescargar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Descargando…" })).toHaveAttribute("aria-disabled", "true");
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ADICIONAL EN LA MATRIZ Y EN P-05 · 2026-08-20
 *
 * Desde que la Dirección puede disponer un adicional sobre un cuadro **ya cerrado**,
 * existen dos versiones del mismo documento firmado. Lo que se protege aquí es que la
 * segunda diga qué se añadió: si esto cayera, el adicional seguiría apareciendo, pero
 * indistinguible de lo planificado salvo por tres letras del prefijo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el adicional en la lista de emisión", () => {
  /**
   * SE CONSTRUYE COMPLETA, SIN `as SeccionMatriz`. La conversión que llevaba antes apagaba
   * al compilador, y al añadir `admiteAdicionales` el 2026-08-24 habría dejado la fixture
   * con el campo ausente sin que nadie protestara.
   */
  const seccion = (
    filas: FilaMatriz[],
    admiteAdicionales = true,
  ): SeccionMatriz => ({
    numero: 2,
    codigo: "PMO",
    nombre: "PLANIFICACIÓN Y MONITOREO",
    colorFondo: "#2e7d32",
    colorAcento: "#000000",
    colorNombre: "verde",
    responsable: "DMIP Operativos",
    esPatrulla: false,
    // 2 · PMO es hoy el único formulario con prefijo de adicional (`OCAPMO`).
    admiteAdicionales,
    totalOperativos: filas.length,
    filas,
    evidencia: null,
  });

  const matrizCon = (filas: FilaMatriz[], admite = true): Matriz =>
    ({ secciones: [seccion(filas, admite)] }) as Matriz;

  const ordinario: FilaMatriz = {
    id: 1,
    identificador: "OCPMO-001-21-AGO-2026",
    grupoRegistro: null,
    esAdicional: false,
    origen: null,
    horario: "08H00 A 12H00",
    personal: [
      {
        funcionarioId: 1,
        nombre: "YUNDA JESSICA",
        telefono: null,
        esResponsable: true,
        horaInicio: "08:00",
        horaFin: "12:00",
      },
    ],
    zonales: [],
    puntoEncuentro: "",
    tipoControl: "",
    instituciones: [],
    conductor: null,
    placa: null,
    observaciones: [],
    estadoTransporte: "ASIGNADO",
    esNocturno: false,
    alertas: [],
  };

  const adicional: FilaMatriz = {
    ...ordinario,
    id: 2,
    identificador: "OCAPMO-001-21-AGO-2026",
    esAdicional: true,
    origen: "OCPMO-001-21-AGO-2026",
  };

  it("cada operativo llega con si es adicional y de cuál nace", () => {
    const [uno, otro] = operativosDeLaMatriz(matrizCon([ordinario, adicional]));

    expect(uno.esAdicional).toBe(false);
    expect(uno.origen).toBeNull();
    expect(otro.esAdicional).toBe(true);
    expect(otro.origen).toBe("OCPMO-001-21-AGO-2026");
  });

  /**
   * ES LA MISMA REGLA QUE EN LA TABLA: sin personal no se emite. Que un operativo sea
   * adicional no lo exime, y comprobarlo evita que la excepción de RN-58 se extienda por
   * descuido a reglas que no tienen nada que ver con ella.
   */
  it("un adicional sin personal tampoco se puede emitir", () => {
    const [fila] = operativosDeLaMatriz(
      matrizCon([{ ...adicional, personal: [] }]),
    );

    expect(motivoParaNoEmitir(fila, true)).toContain("personal");
  });

  it("un adicional con personal y el cuadro cerrado sí se emite", () => {
    const [fila] = operativosDeLaMatriz(matrizCon([adicional]));

    expect(motivoParaNoEmitir(fila, true)).toBeNull();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * SOLO EL 2 · PMO ADMITE ADICIONALES. RN-61, fijado el 2026-08-24.
   *
   * Y no está escrito en el código: un formulario los admite **si tiene un prefijo
   * marcado para ellos**, y hoy lo tiene uno solo, `OCAPMO`. Las «A» de `ICA`, `OCA`,
   * `IGA` e `ITA` —DMIT e INSP— están marcadas como ordinarias.
   *
   * El servidor ya lo rechazaba —«el formulario X no admite operativos adicionales»—,
   * pero P-05 ofrecía el botón en los nueve formularios: se pulsaba y fallaba en ocho.
   * Ofrecer lo que va a fallar enseña a desconfiar de lo que se lee.
   *
   * La condición viaja en el dato, no se deduce aquí. Si mañana el negocio habilita
   * otro formulario, es un `UPDATE` sobre `t_formulario_prefijo` y esta prueba sigue
   * valiendo tal cual.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("cada fila sabe si su formulario admite adicionales", () => {
    const [dePmo] = operativosDeLaMatriz(matrizCon([ordinario]));
    const [deOtro] = operativosDeLaMatriz(matrizCon([ordinario], false));

    expect(dePmo.admiteAdicionales).toBe(true);
    expect(deOtro.admiteAdicionales).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   LA JORNADA QUE SE PROPONE AL ABRIR · 2026-08-21 · RN-01

   P-05 propone la jornada del día siguiente, como el resto de las pantallas. Es su flujo
   normal: la Dirección consolida la matriz de mañana, cierra el cuadro y emite las órdenes
   de esa misma jornada.

   NOTA PARA QUIEN LEA ESTAS PRUEBAS. El **adicional de urgencia** también se dispone desde
   esta pantalla, y RN-62 dice que se dispone «el mismo día en que se ejecuta». El adicional
   entra en la jornada de su operativo padre, no en la que muestre el selector, así que para
   disponer uno hay que retroceder un día. Se decidió así a sabiendas.
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("P-05 abre en la jornada que se está armando", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(DocumentoService.consultarMatriz).mockRejectedValue(
      new Error("sin jornada"),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("pide la matriz de mañana, que es la que se acaba de consolidar", async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 16, 45));

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalledWith(
        "2026-08-22",
      ),
    );
    expect(DocumentoService.consultarMatriz).not.toHaveBeenCalledWith(
      "2026-08-21",
    );
  });

  it("a última hora de la tarde no suma dos días", async () => {
    // Con `toISOString()` la fecha ya habría saltado un día a partir de las 19H00 en
    // Quito —UTC−5—, y se sumaría dos. Es la hora a la que se emiten las órdenes.
    vi.setSystemTime(new Date(2026, 7, 21, 23, 40));

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalledWith(
        "2026-08-22",
      ),
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   EMITIR TODA LA JORNADA CON UN SOLO CLIC · 2026-09-23

   Un botón «Emitir todas» reemplaza el ir operativo por operativo. Abarca solo los
   EMISIBLES —los que cada fila ofrecería—: con personal y el cuadro cerrado. Lo hace de
   uno en uno con el mismo endpoint por operativo (el servidor no tiene uno masivo).
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("emitir todas las órdenes de la jornada con un solo clic", () => {
  const fila = (
    id: number,
    identificador: string,
    nombres: string[],
  ): FilaMatriz => ({
    id,
    identificador,
    grupoRegistro: null,
    esAdicional: false,
    origen: null,
    horario: "08H00 A 12H00",
    personal: nombres.map((nombre, indice) => ({
      funcionarioId: id * 10 + indice,
      nombre,
      telefono: null,
      esResponsable: indice === 0,
      horaInicio: "08:00",
      horaFin: "12:00",
    })),
    zonales: [],
    puntoEncuentro: "",
    tipoControl: "",
    instituciones: [],
    conductor: null,
    placa: null,
    observaciones: [],
    estadoTransporte: "ASIGNADO",
    esNocturno: false,
    alertas: [],
  });

  const matrizDeLaJornada = (
    filas: FilaMatriz[],
    estado: "CERRADO" | "BORRADOR" = "CERRADO",
  ): Matriz =>
    ({
      cabecera: {
        estado,
        ordenTrabajo: "AMC-2026-08-22",
        fechaNatural: "viernes 22 de agosto de 2026",
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
          totalOperativos: filas.length,
          filas,
          evidencia: null,
        },
      ],
    }) as unknown as Matriz;

  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto ningún operativo tiene órdenes aún (los chips de la tabla lo consultan por fila).
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockResolvedValue(
      [],
    );
  });

  it("emite cada operativo con personal —y no el que no lo tiene— tras confirmar", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizDeLaJornada([
        fila(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"]),
        fila(2, "OCPMO-002-22-AGO-2026", ["CAMPAÑA JUAN"]),
        fila(3, "OCPMO-003-22-AGO-2026", []),
      ]),
    );
    vi.mocked(DocumentoService.emitirOrdenes).mockResolvedValue([]);

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    // Dos pendientes (los que tienen personal); el sin personal no es emisible.
    const boton = await screen.findByRole("button", {
      name: /Emitir pendientes \(2\)/,
    });

    await userEvent.click(boton);
    await userEvent.click(
      await screen.findByRole("button", { name: "Sí, emitir pendientes" }),
    );

    await vi.waitFor(() => {
      expect(DocumentoService.emitirOrdenes).toHaveBeenCalledWith(1);
      expect(DocumentoService.emitirOrdenes).toHaveBeenCalledWith(2);
    });
    expect(DocumentoService.emitirOrdenes).not.toHaveBeenCalledWith(3);
    expect(DocumentoService.emitirOrdenes).toHaveBeenCalledTimes(2);
  });

  it("avisa cuántas hojas quedaron en borrador por datos faltantes (B4)", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizDeLaJornada([fila(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])]),
    );
    // La orden emitida nace en BORRADOR: le faltan datos (no consume número).
    vi.mocked(DocumentoService.emitirOrdenes).mockResolvedValue([
      orden("YUNDA JESSICA", {
        faltantes: [falta("Dependencia del destinatario", "persona")],
        numeroOrden: null,
      }),
    ]);

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });
    await userEvent.click(
      await screen.findByRole("button", { name: /Emitir pendientes \(1\)/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Sí, emitir pendientes" }),
    );

    // Emitir es un HITO (M7): modal de éxito, que dice también lo que quedó en borrador.
    const exito = await screen.findByRole("alertdialog", { name: "Órdenes emitidas" });
    expect(exito).toHaveTextContent(/1 hoja quedó en borrador por datos faltantes/);
    expect(within(exito).getByRole("button", { name: "Aceptar" })).toBeInTheDocument();
  });

  it("fila tipo (estándar de botones): «Revisar y emitir» primario sm con su motivo y «+ Adicional» acento", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizDeLaJornada(
        [fila(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])],
        "BORRADOR",
      ),
    );

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    const revisar = await screen.findByRole("button", { name: "Revisar y emitir" });
    expect(revisar).toHaveClass("btn", "btn-primary", "btn-sm");
    // Apagado con aria-disabled, para que el motivo se vea al pasar el mouse.
    expect(revisar).toHaveAttribute("aria-disabled", "true");
    expect(revisar.getAttribute("title")).toContain("Disponible cuando el cuadro esté cerrado");

    const adicional = screen.getByRole("button", { name: "Adicional" });
    expect(adicional).toHaveClass("btn", "btn-outline", "btn-primary", "btn-sm");
    // El orden: la acción propia de la pantalla y después el «+ Adicional».
    expect(
      revisar.compareDocumentPosition(adicional) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("no se ofrece «Emitir pendientes» mientras el cuadro no esté cerrado", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizDeLaJornada(
        [fila(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])],
        "BORRADOR",
      ),
    );

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    // La fila ya está, pero sin cierre no hay nada emisible: el botón se oculta (N=0).
    await screen.findByText("OCPMO-001-22-AGO-2026");
    expect(
      screen.queryByRole("button", { name: /Emitir pendientes/ }),
    ).toBeNull();
  });

  it("la orden que falla se muestra como «no generada» y se puede reenviar", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizDeLaJornada([
        fila(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"]),
        fila(2, "OCPMO-002-22-AGO-2026", ["CAMPAÑA JUAN"]),
      ]),
    );
    // El segundo falla al emitir en bloque; el primero sale.
    vi.mocked(DocumentoService.emitirOrdenes).mockImplementation(
      (id: number) =>
        id === 2 ? Promise.reject(new Error("boom")) : Promise.resolve([]),
    );

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    await userEvent.click(
      await screen.findByRole("button", { name: /Emitir pendientes/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Sí, emitir pendientes" }),
    );

    // La emisión PARCIAL es una advertencia, no un error: lo emitido quedó emitido.
    const parcial = await screen.findByRole("alertdialog", { name: "Emisión parcial" });
    expect(parcial).toHaveTextContent("Se emitieron 1 de 2 operativos");
    await userEvent.click(within(parcial).getByRole("button", { name: "Entendido" }));

    // Aparece el panel con la orden no generada del operativo que falló.
    await screen.findByText("Órdenes no generadas (1)");
    expect(screen.getByText("Orden no generada")).toBeInTheDocument();

    // El reenvío de esa —y solo esa— sí sale: desaparece de la lista.
    vi.mocked(DocumentoService.emitirOrdenes).mockResolvedValue([]);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await vi.waitFor(() =>
      expect(screen.queryByText("Órdenes no generadas (1)")).toBeNull(),
    );
    // Se volvió a emitir el operativo 2 (dos veces en total: el bloque y el reenvío).
    expect(DocumentoService.emitirOrdenes).toHaveBeenCalledWith(2);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   LA COLUMNA «ÓRDENES» Y EL PANEL · 2026-10-01

   Cada fila dice de un vistazo si sus hojas están emitidas (chip «Emitidas N/N» verde) o
   pendientes («Pendiente · N hojas» naranja). El botón de acción es uno solo —«Revisar y
   emitir» / «Ver órdenes» / «Mostrando»—, y reemitir advierte que genera una versión nueva.
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("la columna «Órdenes» y el panel de emisión", () => {
  const filaCon = (
    id: number,
    identificador: string,
    nombres: string[],
  ): FilaMatriz => ({
    id,
    identificador,
    grupoRegistro: null,
    esAdicional: false,
    origen: null,
    horario: "08H00 A 12H00",
    personal: nombres.map((nombre, indice) => ({
      funcionarioId: id * 10 + indice,
      nombre,
      telefono: null,
      esResponsable: indice === 0,
      horaInicio: "08:00",
      horaFin: "12:00",
    })),
    zonales: [],
    puntoEncuentro: "",
    tipoControl: "",
    instituciones: [],
    conductor: null,
    placa: null,
    observaciones: [],
    estadoTransporte: "ASIGNADO",
    esNocturno: false,
    alertas: [],
  });

  const matrizCerrada = (filas: FilaMatriz[]): Matriz =>
    ({
      cabecera: {
        estado: "CERRADO",
        ordenTrabajo: "AMC-2026-08-22",
        fechaNatural: "viernes 22 de agosto de 2026",
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
          totalOperativos: filas.length,
          filas,
          evidencia: null,
        },
      ],
    }) as unknown as Matriz;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("el chip dice «Vigentes N/N» si ya están, y «Pendiente · N hojas» si no", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizCerrada([
        filaCon(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"]),
        filaCon(2, "OCPMO-002-22-AGO-2026", ["CAMPAÑA JUAN"]),
      ]),
    );
    // El 1 ya tiene su hoja vigente; el 2 todavía no.
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockImplementation(
      (id: number) =>
        Promise.resolve(id === 1 ? [orden("YUNDA JESSICA")] : []),
    );

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    expect(await screen.findByText("Vigentes 1/1")).toBeInTheDocument();
    expect(screen.getByText("Pendiente · 1 hoja")).toBeInTheDocument();
    // Resumen del encabezado: 1 de 2 con todas sus órdenes vigentes.
    expect(
      screen.getByText("1 de 2 con todas sus órdenes vigentes"),
    ).toBeInTheDocument();
  });

  it("al abrir un operativo, su botón pasa a «Mostrando»", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizCerrada([filaCon(2, "OCPMO-002-22-AGO-2026", ["CAMPAÑA JUAN"])]),
    );
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockResolvedValue(
      [],
    );

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    await userEvent.click(
      await screen.findByRole("button", { name: "Revisar y emitir" }),
    );

    expect(
      await screen.findByRole("button", { name: "Mostrando" }),
    ).toBeInTheDocument();
  });

  it("reemitir pide confirmación avisando de la versión nueva y «Reemplazada»", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizCerrada([filaCon(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])]),
    );
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockResolvedValue([
      orden("YUNDA JESSICA"),
    ]);

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    // Ya emitida → el botón de la fila dice «Ver órdenes».
    await userEvent.click(
      await screen.findByRole("button", { name: "Ver órdenes" }),
    );
    // En el panel, «Reemitir órdenes» pide confirmación con el texto de la versión nueva.
    await userEvent.click(
      await screen.findByRole("button", { name: "Reemitir órdenes" }),
    );

    expect(
      screen.getByText(
        /Se genera una versión nueva con la plantilla y los datos actuales\. La anterior queda como «Reemplazada»\./,
      ),
    ).toBeInTheDocument();
  });

  // ─────────── Plantilla por Director (2026-10-05) ───────────

  it("al VOLVER del editor de plantilla, la página re-pide las órdenes (H35)", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizCerrada([filaCon(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])]),
    );
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockResolvedValue([
      orden("YUNDA JESSICA"),
    ]);

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });
    await screen.findByText("Vigentes 1/1");
    const antes = vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mock
      .calls.length;

    await userEvent.click(screen.getByRole("button", { name: "Editar plantilla" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "← Órdenes de servicio" }),
    );

    await vi.waitFor(() =>
      expect(
        vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mock.calls.length,
      ).toBeGreaterThan(antes),
    );
  });

  it("el resumen de la cabecera cuenta por estado y OMITE los que están en 0", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizCerrada([
        filaCon(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"]),
        filaCon(2, "OCPMO-002-22-AGO-2026", ["CAMPAÑA JUAN"]),
      ]),
    );
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockImplementation(
      (id: number) => Promise.resolve(id === 1 ? [orden("YUNDA JESSICA")] : []),
    );

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    // Se espera al estado FINAL: antes de llegar las órdenes, ambos operativos cuentan como pendientes.
    await screen.findByText("Vigentes 1/1");
    const resumen = await screen.findByLabelText(
      "Resumen de la jornada por estado",
    );
    expect(await within(resumen).findByText("1 pendiente")).toBeInTheDocument();
    expect(within(resumen).getByText("1 vigente")).toBeInTheDocument();
    // Nunca «0 vigente», «0 borradores»…
    expect(within(resumen).queryByText(/^0 /)).toBeNull();
    expect(within(resumen).queryByText(/borrador/)).toBeNull();
  });

  it("si la plantilla PROPIA tiene datos generales vacíos, avisa con «Editar plantilla»", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizCerrada([filaCon(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])]),
    );
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockResolvedValue([]);
    vi.mocked(DocumentoService.obtenerPlantilla).mockResolvedValueOnce({
      apartados: [],
      datosGenerales: {
        direccionResponsable: "Dirección Metropolitana de Inspección",
        numeroMemorando: "",
        fechaMemorando: "",
        designado: "",
        firmante: "Lider Franklin",
        firmanteCargo: "",
        firmanteDependencia: "",
        accion: "Elaborado por",
        elaboradoPor: "",
        siglasUnidad: "",
      },
      version: 1,
      directorId: 14,
    });

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });

    expect(
      await screen.findByText(
        "Completa los datos de tu plantilla para emitir órdenes.",
      ),
    ).toBeInTheDocument();
  });

  it("si el operativo tiene órdenes de OTRO Director, «Reemitir» queda apagado con su motivo", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizCerrada([filaCon(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])]),
    );
    vi.mocked(DocumentoService.consultarOrdenesDeOperativo).mockResolvedValue([
      orden("YUNDA JESSICA", {
        esPropia: false,
        directorNombre: "Lider De La Guerra Portugal",
      }),
    ]);

    render(<OrdenesServicioPage />, { wrapper: MemoryRouter });
    await userEvent.click(
      await screen.findByRole("button", { name: "Ver órdenes" }),
    );

    const reemitir = await screen.findByRole("button", {
      name: "Reemitir órdenes",
    });
    expect(reemitir).toHaveAttribute("aria-disabled", "true");
    expect(reemitir).toHaveAttribute(
      "title",
      "Estas órdenes las generó Lider De La Guerra Portugal: solo él puede reemitirlas.",
    );
  });
});

describe("plantilla por Director · orden AJENA y los cinco orígenes (2026-10-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentoService.verOrdenMemorando).mockReturnValue(
      new Promise<Blob>(() => {}),
    );
  });

  const ajena = () =>
    orden("YUNDA JESSICA", {
      esPropia: false,
      directorNombre: "Lider De La Guerra Portugal",
      faltantes: [
        falta("Dependencia del destinatario", "persona", "dependencia"),
        falta("Número de memorando", "plantilla", "numeroMemorando"),
        falta("Cargo del firmante", "firmante", "firmanteCargo"),
        falta("Siglas de la unidad", "configuracion", "siglasUnidad"),
      ],
    });

  it("la tarjeta dice «Generada por …», es de solo lectura y resume los 4 orígenes", () => {
    render(
      <MemoryRouter>
        <VistaPreviaOrden ordenes={[ajena()]} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Generada por Lider De La Guerra Portugal/),
    ).toBeInTheDocument();
    expect(screen.getByText(/solo lectura/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /faltan 1 del funcionario, 1 de la plantilla, 1 del firmante y 1 de configuración/,
      ),
    ).toBeInTheDocument();
    // Solo lectura: no ofrece «Asignar transporte» aunque falten conductor o placa.
    expect(screen.queryByRole("link", { name: "Asignar transporte" })).toBeNull();
  });

  it("el visor de una orden ajena: sin «Completar en la plantilla», dice de quién es la plantilla y no tiene formularios", async () => {
    render(
      <MemoryRouter>
        <VistaPreviaOrden ordenes={[ajena()]} onEditarPlantilla={vi.fn()} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ver documento" }));
    const cajon = screen.getByRole("dialog");

    // Los cuatro grupos, con sus títulos (el de «Cuadro» se retiró el 2026-10-08).
    for (const grupo of [
      "Datos del funcionario:",
      "Datos generales de la plantilla:",
      "Firmante:",
      "Configuración:",
    ]) {
      expect(within(cajon).getByText(grupo)).toBeInTheDocument();
    }
    expect(
      within(cajon).queryByRole("button", { name: "Completar en la plantilla" }),
    ).toBeNull();
    expect(
      within(cajon).getAllByText(
        "Faltan datos en la plantilla de Lider De La Guerra Portugal",
      ).length,
    ).toBeGreaterThan(0);
    expect(within(cajon).queryByRole("button", { name: "Completar datos" })).toBeNull();
  });

  it("una orden PROPIA sí ofrece «Completar en la plantilla» en datos generales y firmante", async () => {
    render(
      <MemoryRouter>
        <VistaPreviaOrden
          ordenes={[{ ...ajena(), esPropia: true }]}
          onEditarPlantilla={vi.fn()}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ver documento" }));
    const cajon = screen.getByRole("dialog");

    expect(
      within(cajon).getAllByRole("button", { name: "Completar en la plantilla" }),
    ).toHaveLength(2);
    // Ni siquiera una orden propia ofrece ya «Completar datos» (cargo desde la ficha, 2026-10-08).
    expect(
      within(cajon).queryByRole("button", { name: "Completar datos" }),
    ).toBeNull();
  });
});
