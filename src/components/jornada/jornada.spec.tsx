/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: jornada.spec.tsx
 * Responsabilidad: Verificar qué se puede tocar, qué no, y que se diga con palabras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA PANTALLA MUESTRA MÁS DE LO QUE DEJA TOCAR, Y ESO ES LO QUE SE PRUEBA.
 *
 * De los nueve formularios, el DMIT participa en cuatro. En los otros cinco solo mira. Si
 * el marcado de secciones se rompiera, la pantalla ofrecería botones que el servidor
 * rechaza con 403 —molesto pero inocuo— o escondería los que sí sirven.
 *
 * Y LO QUE NO ESTÁ SE PRUEBA IGUAL QUE LO QUE ESTÁ: no hay «Exportar PDF» ni «Cerrar
 * cuadro». Las dos son de la Dirección, y la de exportar es el artefacto que circulaba
 * por WhatsApp. Copiar la pantalla del Director las habría arrastrado sin que nadie lo
 * decidiera; la prueba está para que no vuelvan por descuido.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import JornadaDiaPage from "../../pages/JornadaDiaPage.tsx";
import TablaJornada from "./TablaJornada.tsx";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
import { JornadaService } from "../../services/jornada.service.ts";

vi.mock("../../services/jornada.service.ts", () => ({
  JornadaService: { consultarJornada: vi.fn() },
}));
vi.mock("../../hooks/useVentanaCarga.ts", () => ({
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

const fila = (parcial: Partial<FilaJornada> = {}): FilaJornada => ({
  id: 1,
  identificador: "ICNECU-001-26-AGO-2026",
  grupoRegistro: null,
  esAdicional: false,
  origen: null,
  horario: "18H00 A 23H30",
  personal: [
    {
      funcionarioId: 1,
      nombre: "YUNDA JESSICA",
      telefono: "97 969 0786",
      esResponsable: true,
      // Ventana efectiva: heredan el horario del operativo (el caso normal).
      horaInicio: "18:00",
      horaFin: "23:30",
    },
    // Sin teléfono a propósito: el maestro admite `null` y hay fichas reales así.
    {
      funcionarioId: 2,
      nombre: "CAMPAÑA JUAN",
      telefono: null,
      esResponsable: false,
      horaInicio: "18:00",
      horaFin: "23:30",
    },
  ],
  zonales: ["DMQ"],
  puntoEncuentro: "AMC Matriz",
  tipoControl: "Alertas ECU 911",
  instituciones: ["AMC"],
  conductor: null,
  placa: null,
  observaciones: [],
  estadoTransporte: "PENDIENTE",
  esNocturno: true,
  areasPendientesDelRol: [],
  alertas: [],
  ...parcial,
});

const seccion = (parcial: Partial<SeccionJornada> = {}): SeccionJornada => ({
  numero: 6,
  codigo: "ICNECU",
  nombre: "Patrulla de Reacción Nocturna",
  colorFondo: "#1b3a5c",
  colorAcento: "#000000",
  colorNombre: "azul",
  responsable: "DMIP Inspecciones + DMIT",
  acceso: "APORTA",
  /*
    POR OMISIÓN SÍ, PORQUE ESTA SECCIÓN ES LA DEL DEPARTAMENTO QUE APORTA. Es el caso que
    esta batería describe desde que se construyó P-13. Las pruebas que miran lo contrario
    —una sección donde se participa pero no se actúa— lo dicen explícitamente, que es lo
    que las hace legibles.
  */
  puedeEditarPersonal: true,
  totalOperativos: 1,
  filas: [fila()],
  evidencia: null,
  ...parcial,
});

const tabla = (secciones: SeccionJornada[], bloqueado = false) =>
  render(
    <TablaJornada
      secciones={secciones}
      mensajeVacio="No hay nada."
      onEditarPersonal={vi.fn()}
      bloqueado={bloqueado}
      motivoBloqueo={bloqueado ? "El cuadro del día ya fue cerrado." : null}
    />,
  );

describe("la jornada distingue lo editable de lo que solo se mira", () => {
  it("donde el departamento participa, la fila ofrece su personal", () => {
    tabla([seccion({ acceso: "APORTA" })]);

    expect(
      screen.getByRole("button", { name: "Agregar personal" }),
    ).toBeInTheDocument();
  });

  it("donde no participa, la fila no ofrece nada", () => {
    tabla([seccion({ acceso: "LECTURA", puedeEditarPersonal: false })]);

    expect(screen.queryByRole("button", { name: "Agregar personal" })).toBeNull();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * ES LA QUE CIERRA EL DEFECTO DEL 2026-09-01, Y LA ÚNICA QUE LO DETECTA.
   *
   * La condición era `acceso !== "LECTURA"`. Con ella, esta sección —ESCRITURA— llevaría
   * botón, y eso es exactamente lo que les pasaba a los dos departamentos a los que se
   * abrió esta rejilla esa mañana: la decisión decía «solo en lectura» y podían asignar
   * personal desde aquí sobre sus propios formularios.
   *
   * Ninguna de las otras pruebas de este bloque lo habría visto: todas hacen coincidir
   * las dos condiciones, así que pasan con cualquiera de las dos implementaciones. Ésta
   * las separa a propósito.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("con ESCRITURA pero sin el camino, tampoco ofrece nada", () => {
    tabla([seccion({ acceso: "ESCRITURA", puedeEditarPersonal: false })]);

    expect(screen.queryByRole("button", { name: "Agregar personal" })).toBeNull();
  });

  /**
   * Las anteriores pasarían con un botón que dependiera de cualquier otra cosa; esta
   * exige que dependa de la sección, con las dos mitades en la misma tabla.
   */
  it("en la misma jornada conviven las dos, y solo una tiene botón", () => {
    tabla([
      seccion({ numero: 6, codigo: "ICNECU", acceso: "APORTA" }),
      seccion({
        numero: 1,
        codigo: "FIJOS",
        nombre: "Operativos de Control Fijos",
        acceso: "LECTURA",
        puedeEditarPersonal: false,
        filas: [fila({ id: 2, identificador: "OCF-001-26-AGO-2026" })],
      }),
    ]);

    expect(screen.getAllByRole("button", { name: "Agregar personal" })).toHaveLength(1);
  });

  it("el bloqueo apaga el botón y dice por qué, no lo esconde", () => {
    // Un botón que desaparece obliga a preguntar por teléfono, que es el canal que este
    // sistema existe para reemplazar.
    tabla([seccion({ acceso: "ESCRITURA" })], true);

    const boton = screen.getByRole("button", { name: "Agregar personal" });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute("title", "El cuadro del día ya fue cerrado.");
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VARIAS OBSERVACIONES SON VARIAS NOTAS, NO UN BLOQUE. 2026-09-21.
 *
 * La bitácora es una LISTA de notas independientes. Se pintaban seguidas y sin separación, así
 * que dos notas se leían como una sola —lo reportado—. Cada una va en su renglón, separada de la
 * anterior. Mismo criterio que `TablaMatriz`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS COPIAS DEL FORMULARIO 8 SON UN SOLO OPERATIVO. 2026-09-21.
 *
 * El 8 genera N operativos de UNA persona, idénticos salvo el identificador. Se pintan como un
 * bloque —«Nombre (n)», un solo color, los datos fusionados— para que se lea como un operativo.
 * Aquí se prueba que se agrupan; la clave de fusión compara los campos, así que el orden de los
 * arreglos (zonales, instituciones) tiene que ser determinista para no partirlos (lo garantiza el
 * `orderBy` del servidor).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("las copias del formulario 8 se agrupan en un solo bloque", () => {
  it("misma persona y mismos datos: un bloque «Nombre (n)», no filas sueltas", () => {
    const copia = (id: number, identificador: string): FilaJornada =>
      fila({
        id,
        identificador,
        grupoRegistro: null,
        horario: "08H00 A 16H30",
        esNocturno: false,
        observaciones: ["Pruebas tecnicas"],
        areasPendientesDelRol: [],
        zonales: ["DMQ"],
        puntoEncuentro: "HCAM",
        tipoControl: "CONTROL",
        instituciones: ["AMC"],
        conductor: null,
        placa: null,
        estadoTransporte: "PENDIENTE",
        personal: [
          {
            funcionarioId: 1,
            nombre: "GUAYAQUIL",
            telefono: null,
            esResponsable: false,
            horaInicio: "08:00",
            horaFin: "16:30",
          },
        ],
      });
    tabla([
      seccion({
        numero: 8,
        codigo: "IG",
        nombre: "Inspecciones Técnicas y Generales",
        acceso: "LECTURA",
        puedeEditarPersonal: false,
        filas: [copia(1, "IG-001"), copia(2, "IG-002")],
      }),
    ]);

    expect(screen.getByText("GUAYAQUIL (2)")).toBeInTheDocument();
    expect(screen.getByText("IG-001")).toBeInTheDocument();
    expect(screen.getByText("IG-002")).toBeInTheDocument();
  });
});

describe("las observaciones se ven como notas separadas", () => {
  it("cada nota va en su propio elemento, no mezclada con la siguiente", () => {
    tabla([
      seccion({
        acceso: "LECTURA",
        puedeEditarPersonal: false,
        filas: [
          fila({ observaciones: ["Primera nota del operativo", "Segunda nota"] }),
        ],
      }),
    ]);

    // Si estuvieran pegadas, el `<td>` sería «Primera nota…Segunda nota» y estas búsquedas
    // exactas fallarían: que cada texto se encuentre por separado prueba que son notas distintas.
    expect(screen.getByText("Primera nota del operativo")).toBeInTheDocument();
    expect(screen.getByText("Segunda nota")).toBeInTheDocument();
    // La segunda lleva su separador (borde superior), para que se lea aparte.
    expect(screen.getByText("Segunda nota").className).toContain("border-t");
  });
});

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * EL AVISO QUE OCUPA EL SITIO DE UNA NOTIFICACIÓN QUE NO EXISTE.
 *
 * El encargo era que el DMIT se enterara cuando DMIP Operativos registra un operativo que
 * necesita a su gente. No hay subsistema de notificaciones —la campana no consulta nada—,
 * así que el aviso vive en la jornada: un recuento arriba y una línea por fila.
 *
 * SE PRUEBA QUE LO DIGA CON PALABRAS Y CON EL NOMBRE INSTITUCIONAL, no con el código del
 * enumerado: «Personal de Instrucción» y nunca «INSTRUCCION». Es regla 6 y es el defecto
 * que `NOMBRE_AREA` se creó para cerrar.
 * ════════════════════════════════════════════════════════════════════════════════
 */
describe("la jornada avisa de qué personal le toca poner", () => {
  it("la fila que espera su gente lo dice, y con el nombre institucional", () => {
    tabla([
      seccion({
        acceso: "APORTA",
        filas: [fila({ areasPendientesDelRol: ["INSTRUCCION"] })],
      }),
    ]);

    expect(
      screen.getByText(/Falta Personal de Instrucción/),
    ).toBeInTheDocument();
  });

  it("la fila que no espera nada no dice nada", () => {
    tabla([seccion({ acceso: "APORTA", filas: [fila()] })]);

    expect(screen.queryByText(/^Falta /)).toBeNull();
  });

  /**
   * ES LA QUE DISCRIMINA. Una sección ajena no lleva botón, y tampoco debe llevar el
   * aviso: el DMIT ve el formulario entero por decisión del negocio, pero el personal de
   * ese formulario no es asunto suyo. El servidor ya lo devuelve vacío; esto lo fija.
   */
  it("en una sección de solo lectura no reclama personal", () => {
    tabla([
      seccion({
        acceso: "LECTURA",
        puedeEditarPersonal: false,
        filas: [fila({ areasPendientesDelRol: [] })],
      }),
    ]);

    expect(screen.queryByText(/^Falta /)).toBeNull();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN RENGLÓN POR PERSONA, COMO EN LAS OTRAS TRES PANTALLAS DEL CUADRO.
 *
 * Llegó a P-13 dos días después que a P-01, P-02 y P-04. Lo que aquí hay que proteger, y
 * que en las otras no existía, es **la columna de acciones**: «Agregar personal» es del
 * operativo, no de la persona, y repetirlo por renglón ofrecería tres botones que abren
 * el mismo panel.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("la jornada agrupa la fila por persona", () => {
  it("dos asignados ocupan dos renglones, y el identificador se dice una vez", () => {
    tabla([seccion({ acceso: "APORTA" })]);

    expect(screen.getAllByText("ICNECU-001-26-AGO-2026")).toHaveLength(1);
    expect(
      screen.getByText("ICNECU-001-26-AGO-2026").closest("td"),
    ).toHaveAttribute("rowspan", "2");
  });

  it("cada persona lleva su teléfono, y quien no tiene lo dice", () => {
    tabla([seccion({ acceso: "APORTA" })]);

    expect(screen.getByText("97 969 0786")).toBeInTheDocument();
    // `telefono: null` es un caso real del maestro, no una hipótesis.
    expect(screen.getByText("Sin teléfono")).toBeInTheDocument();
  });

  /**
   * ES LA QUE DISCRIMINA, y es propia de esta pantalla: si la acción se pintara en cada
   * renglón habría un botón por persona, todos abriendo el mismo panel.
   */
  it("y la acción sigue siendo una sola, abarcando los dos renglones", () => {
    tabla([seccion({ acceso: "APORTA" })]);

    const boton = screen.getByRole("button", { name: "Agregar personal" });

    expect(boton.closest("td")).toHaveAttribute("rowspan", "2");
  });

  it("un operativo sin nadie conserva su fila, que es la que lleva la alerta", () => {
    tabla([seccion({ acceso: "APORTA", filas: [fila({ personal: [] })] })]);

    expect(screen.getByText("ICNECU-001-26-AGO-2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar personal" }),
    ).toBeInTheDocument();
  });

  it("con una sola persona no se emite rowspan", () => {
    tabla([
      seccion({
        acceso: "APORTA",
        filas: [
          fila({
            personal: [
              {
                funcionarioId: 1,
                nombre: "YUNDA JESSICA",
                telefono: "97 969 0786",
                esResponsable: true,
                horaInicio: "18:00",
                horaFin: "23:30",
              },
            ],
          }),
        ],
      }),
    ]);

    expect(
      screen.getByText("ICNECU-001-26-AGO-2026").closest("td"),
    ).not.toHaveAttribute("rowspan");
  });

  it("la columna de teléfono está en la cabecera, tras la de personal", () => {
    tabla([seccion()]);

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((celda) => celda.textContent);

    expect(encabezados[2]).toBe("Personal");
    expect(encabezados[3]).toBe("Teléfono");
    expect(encabezados).toHaveLength(13);
  });
});

describe("el banner dice el acceso con palabras, no con la ausencia de un botón", () => {
  it("una sección editable lo declara", () => {
    const { container } = tabla([seccion({ acceso: "ESCRITURA" })]);

    expect(container).toHaveTextContent("personal editable");
  });

  it("el cupo del rol que aporta también se nombra", () => {
    const { container } = tabla([seccion({ acceso: "APORTA" })]);

    expect(container).toHaveTextContent("personal editable, con cupo");
  });

  it("una sección ajena dice que es de solo lectura", () => {
    const { container } = tabla([seccion({ acceso: "LECTURA" })]);

    expect(container).toHaveTextContent("solo lectura");
  });

  it("y el banner sigue llevando número y nombre en texto (regla 6)", () => {
    const { container } = tabla([seccion()]);

    expect(container).toHaveTextContent("6. Patrulla de Reacción Nocturna");
  });
});

describe("P-13 no hereda lo que es de la Dirección", () => {
  const jornada = {
    cabecera: {
      ordenTrabajo: "AMC-2026-AGO-26",
      fecha: "2026-08-26",
      fechaNatural: "miércoles 26 de agosto de 2026",
      nroSemana: 35,
      anioSemana: 2026,
      estado: "APROBADO" as const,
      totalOperativos: 1,
      totalAlertas: 0,
      formulariosSinCarga: 0,
    },
    secciones: [seccion({ acceso: "APORTA" }), seccion({
      numero: 1,
      codigo: "FIJOS",
      nombre: "Operativos de Control Fijos",
      acceso: "LECTURA",
      filas: [fila({ id: 2, identificador: "OCF-001-26-AGO-2026" })],
    })],
  };

  const montar = async () => {
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue(jornada);
    render(<JornadaDiaPage />);
    await screen.findByText("AMC-2026-AGO-26");
  };

  it("no ofrece exportar el PDF: es RN-44 y es de la Dirección", async () => {
    await montar();

    expect(screen.queryByRole("button", { name: /Exportar/i })).toBeNull();
  });

  it("no ofrece cerrar el cuadro", async () => {
    await montar();

    expect(screen.queryByRole("button", { name: /Cerrar cuadro/i })).toBeNull();
  });

  it("dice cuántos formularios puede tocar de los que ve", async () => {
    // Regla 6 otra vez: la diferencia entre ver y poder no se deduce contando botones.
    await montar();

    expect(
      screen.getByText(/1 de 2 formularios editables/),
    ).toBeInTheDocument();
  });

  /**
   * EL RECUENTO DE ARRIBA. Es lo que el DMIT ve al entrar sin haber mirado fila a fila, y
   * lo que sustituye a la campana que no consulta nada.
   */
  it("resume cuántos operativos esperan su personal, y de qué área", async () => {
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue({
      ...jornada,
      secciones: [
        seccion({
          acceso: "APORTA",
          filas: [
            fila({ id: 10, areasPendientesDelRol: ["INSTRUCCION"] }),
            fila({ id: 11, areasPendientesDelRol: ["INSTRUCCION"] }),
          ],
        }),
      ],
    });
    render(<JornadaDiaPage />);
    await screen.findByText("AMC-2026-AGO-26");

    const resumen = screen.getByRole("status");
    expect(resumen).toHaveTextContent(
      "2 operativos esperan personal que a su departamento le toca asignar: Personal de Instrucción.",
    );
  });

  it("sin nada pendiente no aparece ningún recuento", async () => {
    // Un aviso permanente deja de ser un aviso. Si no falta personal, no se dice nada.
    await montar();

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("la sección ajena se muestra entera, no se oculta ni se recorta", async () => {
    // Es la decisión de negocio del 2026-08-26. Si alguien volviera a esconder lo ajeno,
    // esta prueba lo diría, y la conversación volvería a la mesa en lugar de ocurrir en
    // un commit.
    await montar();

    const tablaEnPantalla = screen.getByRole("table");
    expect(
      within(tablaEnPantalla).getByText("OCF-001-26-AGO-2026"),
    ).toBeInTheDocument();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PATRULLA DEL FORM 6 ES UN SOLO OPERATIVO, AUNQUE SEAN VARIOS CÓDIGOS. 2026-09-21.
 *
 * Cada código (IGNECU/ITNECU/INECU) es un operativo de una persona, y `areasPendientesDelRol`
 * se calcula POR CÓDIGO: el IGNECU (General) «reclama» Instrucción aunque el INECU ya la cubra.
 * Si ese campo partiera la fusión, la patrulla se pintaría como operativos distintos —lo
 * reportado—. Se agrupa igual, y «Falta …» muestra el pendiente COLECTIVO.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("la patrulla del Form 6 se agrupa como un solo operativo", () => {
  const miembro = (
    id: number,
    identificador: string,
    nombre: string,
    pendientes: FilaJornada["areasPendientesDelRol"],
  ): FilaJornada =>
    fila({
      id,
      identificador,
      grupoRegistro: "lote-6",
      horario: "08H30 A 16H30",
      esNocturno: true,
      zonales: ["DMQ"],
      puntoEncuentro: "AMC Matriz",
      tipoControl: "Alertas ECU 911",
      instituciones: ["EMGIRS"],
      conductor: null,
      placa: null,
      observaciones: [],
      estadoTransporte: "PENDIENTE",
      areasPendientesDelRol: pendientes,
      personal: [
        {
          funcionarioId: id,
          nombre,
          telefono: null,
          esResponsable: false,
          horaInicio: "08:30",
          horaFin: "16:30",
        },
      ],
    });

  it("no se pinta como operativos distintos aunque el pendiente por código difiera", () => {
    tabla([
      seccion({
        filas: [
          miembro(1, "IGNECU-001", "BAUTISTA", ["INSTRUCCION"]),
          miembro(2, "INECU-001", "CONNY", []),
          miembro(3, "ITNECU-001", "AGUAS", ["INSTRUCCION"]),
        ],
      }),
    ]);

    // Un solo operativo: el horario compartido se fusiona y aparece UNA vez, no tres.
    expect(screen.getAllByText("08H30 A 16H30")).toHaveLength(1);
    // Los tres códigos siguen visibles, cada uno en su fila.
    expect(screen.getByText("IGNECU-001")).toBeInTheDocument();
    expect(screen.getByText("INECU-001")).toBeInTheDocument();
    expect(screen.getByText("ITNECU-001")).toBeInTheDocument();
  });

  it("«Falta …» muestra el pendiente COLECTIVO: si un código cubre el área, no la reclama", () => {
    tabla([
      seccion({
        filas: [
          miembro(1, "IGNECU-001", "BAUTISTA", ["INSTRUCCION"]),
          miembro(2, "INECU-001", "CONNY", []),
          miembro(3, "ITNECU-001", "AGUAS", ["INSTRUCCION"]),
        ],
      }),
    ]);

    // El INECU cubre Instrucción → colectivamente no falta nada.
    expect(screen.queryByText(/Falta/)).toBeNull();
  });

  it("«Falta …» sí aparece cuando el área está pendiente en TODOS los códigos", () => {
    tabla([
      seccion({
        filas: [
          miembro(1, "IGNECU-001", "BAUTISTA", ["INSTRUCCION"]),
          miembro(3, "ITNECU-001", "AGUAS", ["INSTRUCCION"]),
        ],
      }),
    ]);

    // Ningún código de Instrucción: la intersección conserva INSTRUCCION.
    expect(screen.getByText(/Falta/)).toHaveTextContent(
      "Personal de Instrucción",
    );
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL REGISTRO DEL 8 = UN SOLO OPERATIVO, CON EL PERSONAL AGRUPADO POR PERSONA. 2026-09-21.
 *
 * Cuando los códigos del 8 comparten `lote` (`grupoRegistro`) —cada inspector con sus copias—,
 * se pintan como un bloque, y el nombre de cada persona se fusiona con «Nombre (n)», el total de
 * operativos de esa persona. Mismo cambio que P-01/P-02.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el registro del Form 8 agrupa el personal por persona con su total", () => {
  const copia = (
    id: number,
    identificador: string,
    funcionarioId: number,
    nombre: string,
  ): FilaJornada =>
    fila({
      id,
      identificador,
      grupoRegistro: "lote-8",
      horario: "08H00 A 12H30",
      esNocturno: false,
      areasPendientesDelRol: [],
      personal: [
        {
          funcionarioId,
          nombre,
          telefono: null,
          esResponsable: false,
          horaInicio: "08:00",
          horaFin: "12:30",
        },
      ],
    });

  it("cada persona muestra «Nombre (n)» y su celda abarca sus códigos", () => {
    tabla([
      seccion({
        numero: 8,
        codigo: "IGECU",
        filas: [
          copia(1, "IG-001", 1, "VILLAVICENCIO VACA MIGUEL ANGEL"),
          copia(2, "IG-002", 1, "VILLAVICENCIO VACA MIGUEL ANGEL"),
          copia(3, "IT-001", 2, "ALVARADO"),
          copia(4, "IT-002", 2, "ALVARADO"),
        ],
      }),
    ]);

    // Un solo nombre por persona, con «(2)», y su celda abarca los dos códigos de esa persona.
    const villa = screen.getByText("VILLAVICENCIO VACA MIGUEL ANGEL (2)");
    expect(villa.closest("td")).toHaveAttribute("rowspan", "2");
    const alv = screen.getByText("ALVARADO (2)");
    expect(alv.closest("td")).toHaveAttribute("rowspan", "2");
    // Los cuatro identificadores siguen visibles, cada uno en su fila.
    expect(screen.getByText("IG-001")).toBeInTheDocument();
    expect(screen.getByText("IT-002")).toBeInTheDocument();
    // El horario compartido se fusiona: aparece UNA vez para todo el bloque.
    expect(screen.getAllByText("08H00 A 12H30")).toHaveLength(1);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA CELDA EN BLANCO NO DICE «NO HAY NADIE». Regla 6, 2026-09-01.
 *
 * Desde que la jornada se abrió a los tres departamentos, el servidor **no envía el
 * personal de las secciones que ese rol solo lee**: es lo que hace defendible la apertura
 * sin devolver el cuadro al WhatsApp.
 *
 * Dejar la celda vacía diría que ese operativo no tiene gente asignada, que es falso y
 * además preocupante: quien lo leyera podría avisar de una falta inexistente.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el personal recortado se explica con palabras", () => {
  it("en una sección de solo lectura dice que no se publica", () => {
    tabla([seccion({ acceso: "LECTURA", filas: [fila({ personal: [] })] })]);

    expect(screen.getByText("No se publica")).toBeInTheDocument();
  });

  /**
   * ES LA QUE DISCRIMINA. La anterior pasaría con un texto puesto en todas partes; ésta
   * exige que dependa del acceso: donde el rol participa, una celda vacía **sí** significa
   * que falta gente, y ALV-01 se emite justamente por eso.
   */
  it("y donde el rol participa, el vacío sigue significando que falta gente", () => {
    tabla([seccion({ acceso: "APORTA", filas: [fila({ personal: [] })] })]);

    expect(screen.queryByText("No se publica")).toBeNull();
  });
});
