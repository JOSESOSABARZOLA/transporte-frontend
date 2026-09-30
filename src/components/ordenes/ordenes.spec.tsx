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
  },
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
  FilaMatriz,
  Matriz,
  OrdenServicio,
  SeccionMatriz,
} from "../../interfaces/Documento.ts";

const orden = (
  funcionario: string,
  parcial: Partial<OrdenServicio> = {},
): OrdenServicio => ({
  codigo: `OS-ICNECU-001-31-JUL-2026-1-1`,
  emitidaEn: "2026-07-31T18:00:00.000Z",
  vigente: true,
  fechaJornada: "2026-07-31",
  datoAislado: {
    horario: "18H00 A 23H30",
    funcionario,
    conductor: { nombre: "VIVANCO JORGE", telefono: "0978631797" },
    placa: "PMA7892",
  },
  ...parcial,
});

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
      expect(within(hoja).getByText(nombres[indice])).toBeInTheDocument();

      // RN-51. Lo que no está es lo que importa.
      nombres
        .filter((_, otro) => otro !== indice)
        .forEach((ajeno) => {
          expect(within(hoja).queryByText(ajeno)).toBeNull();
        });
    });
  });

  it("una orden sustituida se distingue de la vigente", () => {
    // Reemitir no borra la anterior (M-20): entregar una hoja ya sustituida por
    // equivocación es el error que este distintivo evita.
    render(
      <VistaPreviaOrden
        ordenes={[orden("YUNDA JESSICA", { vigente: false })]}
      />,
    );

    expect(screen.getByText("Sustituida")).toBeInTheDocument();
  });

  it("«Ver PDF» abre el visor del memorando (ya no descarga)", async () => {
    // El memorando queda «cargando» a propósito: la prueba comprueba el CABLEADO —que el
    // botón abre el visor y pide el PDF— sin ejercitar el render de react-pdf en jsdom.
    vi.mocked(DocumentoService.verOrdenMemorando).mockReturnValue(
      new Promise<Blob>(() => {}),
    );
    render(<VistaPreviaOrden ordenes={[orden("YUNDA JESSICA")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Ver PDF" }));

    expect(
      screen.getByRole("dialog", { name: /Orden de servicio/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cargando el documento…")).toBeInTheDocument();
    expect(DocumentoService.verOrdenMemorando).toHaveBeenCalled();
  });

  it("«Editar» abre el editor con vista previa (editar → previsualizar → generar)", async () => {
    vi.mocked(DocumentoService.obtenerDatosMemorando).mockResolvedValue({
      numeroMemorando: "XXXX",
      ciudadFecha: "Quito, D.M., 22 de septiembre de 2026",
      para: { nombre: "YUNDA JESSICA", cargo: "Agente", dependencia: "XXXX" },
      numeroOrden: "XXXX",
      fechaEmision: "22/09/2026",
      direccionResponsable: "DMI",
      operativos: [],
      firmante: { nombre: "XXXX", cargo: "XXXX", dependencia: "XXXX" },
      nut: "XXXX",
      elaboradoPor: "XXXX",
      siglasUnidad: "XXXX",
      apartados: [],
    });
    render(<VistaPreviaOrden ordenes={[orden("YUNDA JESSICA")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    // El editor ofrece «Previsualizar» y muestra el hueco de la vista previa (aún sin PDF).
    expect(
      await screen.findByRole("button", { name: "Previsualizar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vista previa")).toBeInTheDocument();
    expect(
      screen.getByText(/Pulse «Previsualizar» para ver el documento/),
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
      "todavía no está cerrado",
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

    expect(screen.getByRole("button", { name: "Descargando…" })).toBeDisabled();
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

    render(<OrdenesServicioPage />);

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

    render(<OrdenesServicioPage />);

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

    render(<OrdenesServicioPage />);

    const boton = await screen.findByRole("button", { name: /Emitir todas/ });
    expect(boton).toBeEnabled();

    await userEvent.click(boton);
    await userEvent.click(
      await screen.findByRole("button", { name: "Sí, emitir todas" }),
    );

    // Uno por operativo con personal; el que no tiene personal no es emisible.
    await vi.waitFor(() => {
      expect(DocumentoService.emitirOrdenes).toHaveBeenCalledWith(1);
      expect(DocumentoService.emitirOrdenes).toHaveBeenCalledWith(2);
    });
    expect(DocumentoService.emitirOrdenes).not.toHaveBeenCalledWith(3);
    expect(DocumentoService.emitirOrdenes).toHaveBeenCalledTimes(2);
  });

  it("está deshabilitado mientras el cuadro no esté cerrado", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizDeLaJornada(
        [fila(1, "OCPMO-001-22-AGO-2026", ["YUNDA JESSICA"])],
        "BORRADOR",
      ),
    );

    render(<OrdenesServicioPage />);

    const boton = await screen.findByRole("button", { name: /Emitir todas/ });
    expect(boton).toBeDisabled();
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

    render(<OrdenesServicioPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Emitir todas/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Sí, emitir todas" }),
    );

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
