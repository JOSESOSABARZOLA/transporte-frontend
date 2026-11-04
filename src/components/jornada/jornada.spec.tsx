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

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import JornadaDiaPage from "../../pages/JornadaDiaPage.tsx";
import TablaJornada from "./TablaJornada.tsx";
import { columnasDeCabecera, ocupacionPorFila } from "../../pruebas/rejillaTabla.ts";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
import { JornadaService } from "../../services/jornada.service.ts";

// La sesión: el chip «Perfil» del encabezado sale de ella (plantilla visual, 2026-10-24).
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: ["DMIT_INSTRUCTOR"], rolName: "DMIT Instrucción", displayName: "Prueba" } }),
}));
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
  grupoRegistro: `registro-${parcial.id ?? 1}`,
  esLote: false,
  esAdicional: false,
  origen: null,
  horario: "18H00 A 23H30",
  personal: [
    {
      funcionarioId: 1,
      nombre: "YUNDA JESSICA",
      telefono: "97 969 0786",
      cargo: null,
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
      cargo: null,
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
  composicionPorInformar: [],
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
      screen.getByRole("button", { name: /^Agregar personal\b/ }),
    ).toBeInTheDocument();
  });

  it("donde no participa, la fila no ofrece nada", () => {
    tabla([seccion({ acceso: "LECTURA", puedeEditarPersonal: false })]);

    expect(screen.queryByRole("button", { name: /^Agregar personal\b/ })).toBeNull();
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

    expect(screen.queryByRole("button", { name: /^Agregar personal\b/ })).toBeNull();
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

    expect(screen.getAllByRole("button", { name: /^Agregar personal\b/ })).toHaveLength(1);
  });

  /**
   * PLANTILLA VISUAL (2026-10-24): si NINGUNA sección de las que se muestran concede el camino, la
   * columna Acciones sobra —era una columna entera vacía para quien solo consulta— y no se pinta.
   * Con una sola que lo conceda, la columna está para todas (las demás, con su celda vacía).
   */
  it("si nadie puede agregar personal, la columna Acciones no se pinta", () => {
    const { container } = tabla([
      seccion({ acceso: "ESCRITURA", puedeEditarPersonal: false }),
    ]);

    expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull();
    expect(screen.getAllByRole("columnheader")).toHaveLength(12);
    // El banner de la sección sigue abarcando la tabla entera.
    expect(container.querySelector("[colspan]")).toHaveAttribute("colspan", "12");
  });

  it("con una sección que lo concede, la columna Acciones está", () => {
    tabla([
      seccion({ numero: 6, codigo: "ICNECU", acceso: "APORTA" }),
      seccion({
        numero: 1,
        codigo: "FIJOS",
        acceso: "LECTURA",
        puedeEditarPersonal: false,
        filas: [fila({ id: 2, identificador: "OCF-001-26-AGO-2026" })],
      }),
    ]);

    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(13);
  });

  it("el bloqueo apaga el botón y dice por qué, no lo esconde", () => {
    // Un botón que desaparece obliga a preguntar por teléfono, que es el canal que este
    // sistema existe para reemplazar.
    tabla([seccion({ acceso: "ESCRITURA" })], true);

    const boton = screen.getByRole("button", { name: /^Agregar personal\b/ });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    // Botón de icono (plantilla visual, 2026-10-24): el motivo va en su tooltip.
    expect(boton).toHaveAccessibleDescription("El cuadro del día ya fue cerrado.");
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
        grupoRegistro: "registro-suelto",
        esLote: false,
        horario: "08H00 A 16H30",
        esNocturno: false,
        observaciones: ["Pruebas tecnicas"],
        areasPendientesDelRol: [],
        composicionPorInformar: [],
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
            cargo: null,
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
    // Desde el 2026-10-19 cada una es su tarjeta (`NotasObservacion`), no un renglón con borde.
    expect(screen.getByText("Primera nota del operativo").closest(".app-nota")).not.toBe(
      screen.getByText("Segunda nota").closest(".app-nota"),
    );
  });

  /*
    NOTAS COMO TARJETAS (2026-10-19, plan «notas-jornada-matriz»): la misma lista del servidor que
    Mis operativos, con la nota «Comparte con X», que lleva a la fila de X.
  */
  const NOTA_ESCRITA = {
    id: "nota-9",
    tipo: "NOTA" as const,
    texto: "Pruebas tecnicas 3",
    autor: "De La Guerra Portugal Lider Franklin",
    fecha: "2026-10-19T13:30:00.000Z",
    operativoRelacionadoId: null,
  };
  const COMPARTIDA = {
    id: "compartida-62",
    tipo: "COMPARTIDA" as const,
    texto: "Comparte con OCPMO-001-20-OCT-2026",
    autor: "De La Guerra Portugal Lider Franklin",
    fecha: "2026-10-19T14:00:00.000Z",
    operativoRelacionadoId: 61,
  };

  it("OCPMO-002 muestra su nota y la de compartir; al pulsarla, la fila de OCPMO-001 se centra y destella", () => {
    const centrar = vi.fn();
    Element.prototype.scrollIntoView = centrar;
    tabla([
      seccion({
        acceso: "LECTURA",
        puedeEditarPersonal: false,
        filas: [
          fila({ id: 61, identificador: "OCPMO-001-20-OCT-2026", observaciones: [], notas: [] }),
          fila({
            id: 62,
            identificador: "OCPMO-002-20-OCT-2026",
            observaciones: ["Pruebas tecnicas 3"],
            notas: [COMPARTIDA, NOTA_ESCRITA],
          }),
        ],
      }),
    ]);

    expect(screen.getByText("Pruebas tecnicas 3").closest(".app-nota")).toBeInTheDocument();
    const compartida = screen.getByRole("button", { name: /Ir al operativo OCPMO-001-20-OCT-2026/ });
    fireEvent.click(compartida);

    expect(document.querySelector('[data-operativo-id="61"]')).toHaveClass("app-fila-destello");
    expect(centrar).toHaveBeenCalledWith(expect.objectContaining({ block: "center" }));
  });

  it("si el operativo compartido no está en la jornada, la tarjeta no se pulsa y lo dice", () => {
    tabla([
      seccion({
        filas: [fila({ id: 62, identificador: "OCPMO-002-20-OCT-2026", notas: [COMPARTIDA] })],
      }),
    ]);
    expect(screen.queryByRole("button", { name: /Ir al operativo/ })).toBeNull();
    expect(document.querySelector(".app-nota-compartida")).toHaveAccessibleDescription(
      "No está en esta vista",
    );
  });

  it("sin notas, «—»", () => {
    tabla([seccion({ filas: [fila({ observaciones: [], notas: [] })] })]);
    expect(screen.getAllByText("—").some((nodo) => nodo.classList.contains("text-app-muted"))).toBe(true);
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

    const boton = screen.getByRole("button", { name: /^Agregar personal\b/ });

    expect(boton.closest("td")).toHaveAttribute("rowspan", "2");
  });

  it("un operativo sin nadie conserva su fila, que es la que lleva la alerta", () => {
    tabla([seccion({ acceso: "APORTA", filas: [fila({ personal: [] })] })]);

    expect(screen.getByText("ICNECU-001-26-AGO-2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Agregar personal\b/ }),
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
                cargo: null,
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

  it("una patrulla de tres códigos se cuenta una vez (2026-10-22)", async () => {
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue({
      ...jornada,
      secciones: [
        seccion({
          acceso: "APORTA",
          filas: [
            fila({ id: 10, grupoRegistro: "P1", esLote: true, areasPendientesDelRol: ["INSTRUCCION"] }),
            fila({ id: 11, grupoRegistro: "P1", esLote: true, areasPendientesDelRol: ["INSTRUCCION"] }),
            fila({ id: 12, grupoRegistro: "P1", esLote: true, areasPendientesDelRol: ["INSTRUCCION"] }),
          ],
        }),
      ],
    });
    render(<JornadaDiaPage />);
    await screen.findAllByText("AMC-2026-AGO-26");

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 operativo espera personal que a su departamento le toca asignar: Personal de Instrucción.",
    );
  });

  it("lo que le falta al registro de quien registra va en Observaciones, como información", async () => {
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue({
      ...jornada,
      secciones: [
        seccion({
          filas: [fila({ id: 10, composicionPorInformar: ["TECNICO"] })],
        }),
      ],
    });
    render(<JornadaDiaPage />);
    await screen.findAllByText("AMC-2026-AGO-26");

    expect(
      screen.getByText("Sin Inspector Técnico - DMIP. Puede agregarlo si corresponde."),
    ).toBeInTheDocument();
    // Y no entra en el aviso de arriba: no es un pendiente.
    expect(screen.queryByRole("status")).toBeNull();
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
      esLote: true,
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
          cargo: null,
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
    expect(screen.getAllByText("08H30 a 16H30")).toHaveLength(1);
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
      esLote: true,
      horario: "08H00 A 12H30",
      esNocturno: false,
      areasPendientesDelRol: [],
      personal: [
        {
          funcionarioId,
          nombre,
          telefono: null,
          cargo: null,
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
    expect(screen.getAllByText("08H00 a 12H30")).toHaveLength(1);
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

/*
  CÓDIGOS INTERCALADOS (2026-10-26). El servidor puede entregar IG-001 (Caiza), IT-001 (Aguirre),
  IG-002 (Caiza). Las filas de una persona se pintan SEGUIDAS y cada fila suma las columnas de la
  cabecera: sin celdas fuera de la tabla ni huecos.
*/
describe("patrulla con los códigos de una persona intercalados", () => {
  const persona = (funcionarioId: number, nombre: string) => ({
    funcionarioId,
    nombre,
    telefono: null,
    cargo: null,
    esResponsable: false,
    horaInicio: "08:00",
    horaFin: "12:30",
  });
  const codigo = (id: number, identificador: string, funcionarioId: number, nombre: string) =>
    fila({
      id,
      identificador,
      grupoRegistro: "lote-mezclado",
      esLote: true,
      horario: "08H00 A 12H30",
      esNocturno: false,
      areasPendientesDelRol: [],
      personal: [persona(funcionarioId, nombre)],
    });

  const pintar = () =>
    tabla([
      seccion({
        numero: 8,
        codigo: "IGECU",
        totalOperativos: 3,
        filas: [
          codigo(1, "IG-001", 1, "CAIZA"),
          codigo(2, "IT-001", 2, "AGUIRRE"),
          codigo(3, "IG-002", 1, "CAIZA"),
        ],
      }),
    ]);

  it("A, B, A se pinta como A, A, B, y el nombre dice «(2)» y abarca sus dos filas", () => {
    pintar();

    const orden = screen.getAllByText(/^I[GT]-00\d$/).map((celda) => celda.textContent);
    expect(orden).toEqual(["IG-001", "IG-002", "IT-001"]);
    expect(screen.getByText("CAIZA (2)").closest("td")).toHaveAttribute("rowspan", "2");
    expect(screen.getByText("AGUIRRE").closest("td")).not.toHaveAttribute("rowspan");
  });

  it("cada fila del grupo suma exactamente las columnas de la cabecera", () => {
    const { container } = pintar();
    const tablaHtml = container.querySelector("table") as HTMLTableElement;
    const esperadas = columnasDeCabecera(tablaHtml);

    const delGrupo = ocupacionPorFila(tablaHtml).filter((fila) => /I[GT]-00\d/.test(fila.texto));
    expect(delGrupo).toHaveLength(3);
    for (const fila of delGrupo) expect(fila.columnas).toBe(esperadas);
  });

  it("el identificador va en una línea y Personal arriba a la izquierda", () => {
    pintar();

    expect(screen.getByText("IG-001").closest("td")).toHaveClass("whitespace-nowrap", "min-w-[170px]");
    const personal = screen.getByText("CAIZA (2)").closest("td");
    expect(personal).toHaveClass("align-top");
    expect(personal).not.toHaveClass("text-center");
  });
});

/* CONDUCTOR Y PLACA SIN ASIGNAR (2026-10-26): «Sin asignar»; el motivo, en el texto emergente. */
describe("la celda de alerta de Conductor dice «Sin asignar»", () => {
  it("con el motivo completo solo en el title", () => {
    const motivo = "La DAF todavía no ha asignado conductor a este operativo.";
    const { container } = tabla([
      seccion({
        filas: [
          fila({
            conductor: null,
            alertas: [{ codigo: "ALV-02", campo: "conductor", mensaje: motivo, critica: false }],
          }),
        ],
      }),
    ]);

    const celda = Array.from(container.querySelectorAll<HTMLElement>("td")).find(
      (td) => td.getAttribute("title") === motivo,
    );
    expect(celda).toBeDefined();
    expect(within(celda as HTMLElement).getByText("Sin asignar")).toBeInTheDocument();
    expect(screen.queryByText(motivo)).toBeNull();
  });
});

/*
  TODOS TIENEN ID DE REGISTRO (2026-10-27). Lo que agrupa es `esLote`, no el id: dos operativos de
  un formulario de un operativo nunca se funden en un bloque de patrulla, aunque compartan id.
*/
describe("un operativo que no es lote va suelto aunque tenga id de registro", () => {
  it("cada uno en su fila, sin celdas fusionadas", () => {
    const persona = (funcionarioId: number, nombre: string) => ({
      funcionarioId,
      nombre,
      telefono: null,
      cargo: null,
      esResponsable: false,
      horaInicio: "08:00",
      horaFin: "12:00",
    });
    const { container } = tabla([
      seccion({
        totalOperativos: 2,
        filas: [
          fila({
            id: 1,
            identificador: "OCF-001",
            grupoRegistro: "mismo-id",
            esLote: false,
            personal: [persona(1, "ABAD VERONICA")],
          }),
          fila({
            id: 2,
            identificador: "OCF-002",
            grupoRegistro: "mismo-id",
            esLote: false,
            personal: [persona(2, "AGUIRRE FLAVIO")],
          }),
        ],
      }),
    ]);

    expect(screen.getByText("OCF-001").closest("tr")).not.toBe(
      screen.getByText("OCF-002").closest("tr"),
    );
    expect(container.querySelectorAll("td[rowspan]")).toHaveLength(0);
  });
});

/*
  CARGO DEL MAESTRO BAJO EL NOMBRE (2026-10-27), con la misma pieza de Mis operativos
  (`nombreConCargo`): 11 px, gris secundario, sin negrita; sin cargo no hay segunda línea.
*/
describe("la celda Personal de la Jornada muestra el cargo del Maestro", () => {
  const persona = (
    funcionarioId: number,
    nombre: string,
    cargo: string | null,
    esResponsable = false,
  ) => ({
    funcionarioId,
    nombre,
    telefono: `09${funcionarioId}`,
    cargo,
    esResponsable,
    horaInicio: "08:00",
    horaFin: "12:30",
  });
  const celdaDe = (texto: string) => screen.getByText(texto).closest("td") as HTMLElement;
  const unaFila = (personal: ReturnType<typeof persona>[]) =>
    tabla([seccion({ filas: [fila({ personal })] })]);

  it("con cargo, dos líneas; el «(R)» sigue en la primera", () => {
    unaFila([persona(1, "ABAD VERONICA", "Agente de control", true)]);

    expect(screen.getByText("ABAD VERONICA (R)")).toHaveClass("block");
    expect(within(celdaDe("ABAD VERONICA (R)")).getByText("Agente de control")).toHaveClass(
      "block",
      "text-[0.6875rem]",
      "font-normal",
      "text-app-muted",
    );
  });

  it("sin cargo (null o vacío), solo el nombre y sin «—»", () => {
    unaFila([persona(1, "ABAD VERONICA", null), persona(2, "AGUIRRE FLAVIO", " ")]);

    expect(celdaDe("ABAD VERONICA").textContent).toBe("ABAD VERONICA");
    expect(celdaDe("AGUIRRE FLAVIO").textContent).toBe("AGUIRRE FLAVIO");
  });

  it("en un operativo de varias personas (Form 4), cada una con su cargo y su teléfono en su fila", () => {
    unaFila([persona(1, "ABAD VERONICA", "Agente"), persona(2, "AGUIRRE FLAVIO", "Instructor")]);

    const filaAbad = celdaDe("ABAD VERONICA").closest("tr") as HTMLElement;
    const filaAguirre = celdaDe("AGUIRRE FLAVIO").closest("tr") as HTMLElement;
    expect(within(filaAbad).getByText("Agente")).toBeInTheDocument();
    expect(within(filaAbad).getByText("091")).toBeInTheDocument();
    expect(within(filaAguirre).getByText("Instructor")).toBeInTheDocument();
    expect(within(filaAguirre).getByText("092")).toBeInTheDocument();
  });

  it("en una patrulla de 4 personas cada una lleva su cargo y las filas siguen alineadas", () => {
    const codigo = (id: number, identificador: string, nombre: string, cargo: string) =>
      fila({
        id,
        identificador,
        grupoRegistro: "patrulla-4",
        esLote: true,
        areasPendientesDelRol: [],
        personal: [persona(id, nombre, cargo)],
      });
    const personas = [
      ["BENAVIDES FERNANDO", "Inspector general"],
      ["CAMPAÑA JUAN", "Inspector general 2"],
      ["DIAZ ANA", "Inspector técnico"],
      ["ESPINOZA MARIAM", "Instructora"],
    ];
    const codigos = ["IGNECU-001", "IGNECU-002", "ITNECU-001", "INECU-001"];
    const { container } = tabla([
      seccion({
        totalOperativos: 4,
        filas: personas.map(([nombre, cargo], i) => codigo(i + 1, codigos[i], nombre, cargo)),
      }),
    ]);

    for (const [nombre, cargo] of personas) {
      expect(within(celdaDe(nombre)).getByText(cargo)).toBeInTheDocument();
    }
    const tablaHtml = container.querySelector("table") as HTMLTableElement;
    const delGrupo = ocupacionPorFila(tablaHtml).filter((f) => /I[GTN]*ECU-00\d/.test(f.texto));
    expect(delGrupo).toHaveLength(4);
    for (const filaDelGrupo of delGrupo) {
      expect(filaDelGrupo.columnas).toBe(columnasDeCabecera(tablaHtml));
    }
  });
});

/*
  REGISTRO POR ZONAS DEL 8 EN LA JORNADA (2026-10-31): la MISMA estructura de la Matriz
  (`GrupoPorZonas`). VIZCAINO TRUJILLO atiende La Mariscal (la principal, IG-001 a IG-010) y Manuela
  Sáenz (IG-011 a IG-016): lo del operativo y la acción abarcan las 16 filas; zonal, punto, tipo e
  instituciones, solo las de su zona.
*/
describe("registro por zonas del formulario 8", () => {
  const vizcaino = {
    funcionarioId: 197,
    nombre: "VIZCAINO TRUJILLO MAYRA ROCIO",
    telefono: "0987471922",
    cargo: "Inspectora General",
    esResponsable: false,
    horaInicio: "08:00",
    horaFin: "13:00",
  };
  const numero = (n: number) => `IG-${String(n).padStart(3, "0")}-31-OCT-2026`;
  const codigo = (n: number, zonal: string, esZonaPrincipal: boolean) =>
    fila({
      id: n,
      identificador: numero(n),
      grupoRegistro: "registro-vizcaino",
      esLote: true,
      esZonaPrincipal,
      horario: "08H00 A 13H00",
      esNocturno: false,
      areasPendientesDelRol: [],
      zonales: [zonal],
      puntoEncuentro: `AMC ${zonal.replace("Zonal ", "")}`,
      tipoControl: "CCF / ITCC",
      instituciones: ["AMC"],
      conductor: "PÉREZ JUAN",
      placa: "PEA-1234",
      personal: [vizcaino],
    });
  // El servidor puede entregarlas en cualquier orden: Manuela Sáenz llega primero.
  const filas = [
    ...[11, 12, 13, 14, 15, 16].map((n) => codigo(n, "Zonal Manuela Sáenz", false)),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => codigo(n, "Zonal La Mariscal", true)),
  ];
  const pintar = () => tabla([seccion({ numero: 8, totalOperativos: 16, filas })]);
  const celdaCon = (texto: string) => screen.getByText(texto).closest("td") as HTMLTableCellElement;

  it("lo del operativo abarca las 16 filas: persona con cargo, (16), resumen y una sola acción", () => {
    pintar();

    expect(celdaCon("VIZCAINO TRUJILLO MAYRA ROCIO (16)").rowSpan).toBe(16);
    expect(screen.getByText("Inspectora General")).toBeInTheDocument();
    expect(screen.getByText("16 controles · 2 zonas")).toBeInTheDocument();
    expect(celdaCon("0987471922").rowSpan).toBe(16);
    expect(screen.getAllByText("PÉREZ JUAN")).toHaveLength(1);
    expect(celdaCon("Prioridad: Zonal La Mariscal").rowSpan).toBe(16);
    const agregar = screen.getAllByRole("button", { name: /Agregar personal/ });
    expect(agregar).toHaveLength(1);
    expect((agregar[0].closest("td") as HTMLTableCellElement).rowSpan).toBe(16);
  });

  it("cada zona es su bloque, la principal primero, sin la celda única de zonas", () => {
    pintar();

    const mariscal = celdaCon("Zonal La Mariscal");
    expect(mariscal.rowSpan).toBe(10);
    expect(within(mariscal).getByText("IG-001 a IG-010 · 10 controles")).toBeInTheDocument();
    expect(within(mariscal).getByText("Zona principal")).toBeInTheDocument();
    expect(celdaCon("Zonal Manuela Sáenz").rowSpan).toBe(6);
    expect(celdaCon("AMC Manuela Sáenz").rowSpan).toBe(6);
    expect(screen.queryByRole("list", { name: "Zonas del registro" })).toBeNull();

    const identificadores = screen
      .getAllByText(/^IG-0\d\d-31-OCT-2026$/, { exact: false })
      .map((nodo) => nodo.closest("td")?.textContent);
    expect(identificadores).toEqual([
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `Z1${numero(n)}`),
      ...[11, 12, 13, 14, 15, 16].map((n) => `Z2${numero(n)}`),
    ]);
  });

  it("el separador abre cada zona en el identificador y en sus columnas de zona", () => {
    pintar();

    const abreZona = (texto: string) =>
      celdaCon(texto).classList.contains("border-t") ? texto : null;
    expect(abreZona("Zonal Manuela Sáenz")).not.toBeNull();
    expect(abreZona("AMC Manuela Sáenz")).not.toBeNull();
    const primeraDeZ2 = screen.getByText(numero(11), { exact: false }).closest("td");
    expect(primeraDeZ2?.classList.contains("border-t")).toBe(true);
    const segundaDeZ2 = screen.getByText(numero(12), { exact: false }).closest("td");
    expect(segundaDeZ2?.classList.contains("border-t")).toBe(false);
  });

  it("cada fila del bloque suma exactamente las columnas de la cabecera", () => {
    const { container } = pintar();
    const tablaHtml = container.querySelector("table") as HTMLTableElement;
    const delGrupo = ocupacionPorFila(tablaHtml).filter((f) => /IG-0\d\d/.test(f.texto));
    expect(delGrupo).toHaveLength(16);
    for (const f of delGrupo) expect(f.columnas).toBe(columnasDeCabecera(tablaHtml));
  });

  it("con una sola zona sigue como antes: una línea en la celda de zonas", () => {
    tabla([
      seccion({
        numero: 8,
        totalOperativos: 2,
        filas: [1, 2].map((n) => codigo(n, "Zonal La Mariscal", true)),
      }),
    ]);

    expect(screen.getByRole("list", { name: "Zonas del registro" })).toBeInTheDocument();
    expect(screen.queryByText("Zona principal")).toBeNull();
  });
});
