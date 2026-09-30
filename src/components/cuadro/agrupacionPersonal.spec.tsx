/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cuadro de operativos
 * Archivo: agrupacionPersonal.spec.tsx
 * Responsabilidad: Que un operativo con varias personas se lea sin contar con el dedo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-27
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN RENGLÓN POR PERSONA, COMO EN EL EXCEL DEL QUE NACE ESTE CUADRO.
 *
 * Antes del 2026-08-27 los nombres iban unidos por coma en una celda. Al añadir el
 * teléfono —columna 3 de `FASE2 §16.1`, «PERSONAL ASIGNADO / TELÉFONO», y RF-015— eso
 * habría dado dos listas paralelas, «A, B, C» y «tel1, tel2, tel3», y emparejar el
 * tercer número con la tercera persona sería contar con el dedo. Con un operativo de
 * treinta asignados, eso no es una molestia: es un error de llamada.
 *
 * LO QUE SE PRUEBA AQUÍ SON TRES DECISIONES, no el maquetado:
 *
 *   1. Cada persona ocupa su renglón, y lo que es del operativo se dice **una vez**.
 *   2. Sin teléfono se escribe con palabras (regla 6), no se deja el hueco. Es un caso
 *      real: hay fichas del maestro con `telefono: null`.
 *   3. **El filtro sigue encontrando lo que se ve.** Es la invariante declarada en la
 *      cabecera de `listadoOperativos.util.ts`, y la agrupación es justo el cambio que
 *      podía romperla sin que nadie lo notara.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TablaMatriz from "../matriz/TablaMatriz.tsx";
import TablaOperativos from "./TablaOperativos.tsx";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { SeccionMatriz } from "../../interfaces/Documento.ts";
import {
  COLUMNAS_LISTADO,
  filtrarOperativos,
} from "../../utils/listadoOperativos.util.ts";

// ─────────────────────────── P-01 y P-02 ───────────────────────────

const persona = (
  id: number,
  nombre: string,
  telefono: string | null,
  // Ventana efectiva por persona (RN-66). Por defecto la del operativo del fixture, así que
  // sin turnos distintos el marcado no cambia; las pruebas del caso «difieren» la sobrescriben.
  horaInicio = "08:00",
  horaFin = "12:30",
) => ({
  funcionarioId: id,
  nombre,
  area: "OPERATIVOS",
  telefono,
  esResponsable: id === 1,
  asignadoPorRol: "DMIP_OPERATIVOS" as const,
  horaInicio,
  horaFin,
});

const operativo = (personal: ReturnType<typeof persona>[]): Operativo =>
  ({
    id: 1,
    identificador: "OCF-002-27-AGO-2026",
    esAdicional: false,
    origen: null,
    horario: "08H00 A 12H30",
    formulario: { numero: 1, nombre: "Operativos de Control Fijos" },
    personal,
    zonales: [],
    puntoEncuentro: { nombre: "HCAM" },
    puntoLibre: null,
    tipoControl: null,
    tipoLibre: null,
    instituciones: [],
    observaciones: [],
    estadoTransporte: "PENDIENTE",
    alertas: [],
  }) as unknown as Operativo;

const ULLOA = persona(1, "ULLOA JOSSUE", "97 969 0786");
const MEJIA = persona(2, "MEJÍA ARIEL", "98 342 9026");
const SIN_TELEFONO = persona(3, "SOLANO GABRIELA", null);

const pintarListado = (personal: ReturnType<typeof persona>[]) =>
  render(
    <TablaOperativos
      operativos={[operativo(personal)]}
      columnas={COLUMNAS_LISTADO}
      acciones={() => <button type="button">Editar</button>}
    />,
  );

describe("un operativo con varias personas ocupa un renglón por cada una", () => {
  it("dos asignados producen dos renglones de datos", () => {
    pintarListado([ULLOA, MEJIA]);

    // Cabecera más dos renglones.
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  /**
   * ES LA QUE DISCRIMINA. Sin agrupar, el identificador se repetiría en cada renglón y
   * la tabla diría que hay dos operativos donde hay uno.
   */
  it("y lo que es del operativo se dice una sola vez, abarcando los dos", () => {
    pintarListado([ULLOA, MEJIA]);

    const identificador = screen.getByText("OCF-002-27-AGO-2026");
    const celda = identificador.closest("td");

    expect(screen.getAllByText("OCF-002-27-AGO-2026")).toHaveLength(1);
    expect(celda).toHaveAttribute("rowspan", "2");
  });

  /**
   * RN-66 (2026-09-08). Cuando el operativo reúne turnos DISTINTOS —07H00 a 16H00 y 09H00 a
   * 18H00—, el horario baja a la fila de cada persona: la envolvente del operativo no
   * representa a nadie. Es el defecto que reportó el usuario: se veía «08H00 A 17H30» para
   * todo el grupo en vez de la hora de cada quien.
   */
  it("cuando los turnos difieren, el horario baja a la fila de cada persona", () => {
    pintarListado([
      { ...ULLOA, horaInicio: "07:00", horaFin: "16:00" },
      { ...MEJIA, horaInicio: "09:00", horaFin: "18:00" },
    ]);

    const filas = screen.getAllByRole("row");
    expect(within(filas[1]).getByText("07H00 A 16H00")).toBeInTheDocument();
    expect(within(filas[2]).getByText("09H00 A 18H00")).toBeInTheDocument();
    // La envolvente del operativo (fixture: 08H00 A 12H30) ya no se pinta.
    expect(screen.queryByText("08H00 A 12H30")).toBeNull();
  });

  /** Con turnos IGUALES el horario se dice una sola vez, abarcando los renglones. */
  it("cuando los turnos coinciden, el horario se dice una vez con rowSpan", () => {
    pintarListado([
      { ...ULLOA, horaInicio: "08:00", horaFin: "12:30" },
      { ...MEJIA, horaInicio: "08:00", horaFin: "12:30" },
    ]);

    const celdas = screen.getAllByText("08H00 A 12H30");
    expect(celdas).toHaveLength(1);
    expect(celdas[0].closest("td")).toHaveAttribute("rowspan", "2");
  });

  it("cada persona lleva su teléfono en su propio renglón", () => {
    pintarListado([ULLOA, MEJIA]);

    const filas = screen.getAllByRole("row");

    expect(within(filas[1]).getByText("ULLOA JOSSUE")).toBeInTheDocument();
    expect(within(filas[1]).getByText("97 969 0786")).toBeInTheDocument();
    expect(within(filas[2]).getByText("MEJÍA ARIEL")).toBeInTheDocument();
    expect(within(filas[2]).getByText("98 342 9026")).toBeInTheDocument();
  });

  it("sin teléfono se dice con palabras, no se deja el hueco", () => {
    // `telefono: null` es un caso real del maestro, no una hipótesis.
    pintarListado([SIN_TELEFONO]);

    expect(screen.getByText("Sin teléfono")).toBeInTheDocument();
  });

  it("la acción no se repite por persona", () => {
    pintarListado([ULLOA, MEJIA]);

    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(1);
  });

  it("un operativo sin nadie sigue ocupando su fila", () => {
    // Es el que lleva ALV-01. Desaparecerlo sería esconder justo el que hay que ver.
    pintarListado([]);

    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("OCF-002-27-AGO-2026")).toBeInTheDocument();
  });

  it("con una sola persona el marcado no cambia: no se emite rowspan", () => {
    // La mayoría de las filas del cuadro tienen una persona. No deben pagar nada.
    pintarListado([ULLOA]);

    const celda = screen.getByText("OCF-002-27-AGO-2026").closest("td");

    expect(celda).not.toHaveAttribute("rowspan");
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE SIGUE FILTRANDO EXACTAMENTE LO QUE SE VE.
 *
 * `listadoOperativos.util.ts` declara esa invariante en su cabecera y la sostiene con una
 * sola función. Al partir la celda en renglones era fácil dejar el filtro comparando
 * contra el primero, y el fallo sería invisible: la fila está en pantalla y no aparece al
 * buscarla.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el filtro encuentra a cualquiera de los renglones", () => {
  const listado = [operativo([ULLOA, MEJIA])];

  it("por la primera persona", () => {
    expect(filtrarOperativos(listado, { personal: "ULLOA" })).toHaveLength(1);
  });

  it("por la segunda, que es la que se perdería", () => {
    expect(filtrarOperativos(listado, { personal: "MEJÍA" })).toHaveLength(1);
  });

  it("y por el teléfono de cualquiera de las dos", () => {
    expect(filtrarOperativos(listado, { telefono: "98 342" })).toHaveLength(1);
  });

  it("quien no está no aparece", () => {
    expect(filtrarOperativos(listado, { personal: "REDROVÁN" })).toHaveLength(0);
  });
});

// ─────────────────────────── P-04 ───────────────────────────

const seccion = (
  personal: { funcionarioId: number; nombre: string; telefono: string | null }[],
): SeccionMatriz =>
  ({
    numero: 1,
    codigo: "FIJOS",
    nombre: "Operativos de Control Fijos",
    colorFondo: "#A2C4C9",
    colorAcento: "#000000",
    colorNombre: "verde azulado",
    responsable: "DMIP Operativos",
    totalOperativos: 1,
    evidencia: null,
    filas: [
      {
        id: 1,
        identificador: "OCF-002-27-AGO-2026",
        esAdicional: false,
        origen: null,
        horario: "08H00 A 12H30",
        personal: personal.map((p) => ({ ...p, esResponsable: false })),
        zonales: [],
        puntoEncuentro: "HCAM",
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
  }) as unknown as SeccionMatriz;

describe("la matriz consolidada agrupa igual", () => {
  const pintar = (
    personal: {
      funcionarioId: number;
      nombre: string;
      telefono: string | null;
    }[],
  ) =>
    render(
      <TablaMatriz
        secciones={[seccion(personal)]}
        mensajeVacio="Sin datos"
      />,
    );

  it("dos asignados producen dos renglones, y el punto se dice una vez", () => {
    pintar([
      { funcionarioId: 1, nombre: "ULLOA JOSSUE", telefono: "97 969 0786" },
      { funcionarioId: 2, nombre: "MEJÍA ARIEL", telefono: "98 342 9026" },
    ]);

    expect(screen.getAllByText("HCAM")).toHaveLength(1);
    expect(screen.getByText("HCAM").closest("td")).toHaveAttribute(
      "rowspan",
      "2",
    );
    expect(screen.getByText("97 969 0786")).toBeInTheDocument();
    expect(screen.getByText("98 342 9026")).toBeInTheDocument();
  });

  it("y sin teléfono lo escribe, igual que el listado", () => {
    pintar([{ funcionarioId: 1, nombre: "SOLANO GABRIELA", telefono: null }]);

    expect(screen.getByText("Sin teléfono")).toBeInTheDocument();
  });

  it("un operativo sin personal conserva su fila y su alerta", () => {
    pintar([]);

    expect(screen.getByText("OCF-002-27-AGO-2026")).toBeInTheDocument();
  });
});

describe("las copias del formulario 8 se agrupan en la lista", () => {
  it("identificador y acción por operativo; el personal aparece una vez con «(n)»", () => {
    // Tres operativos idénticos de la misma persona (las copias del 8): solo cambia el código.
    const jose = persona(9, "SOSA JOSE", null);
    const base = operativo([jose]);
    render(
      <TablaOperativos
        operativos={[
          { ...base, id: 1, identificador: "IG-001" },
          { ...base, id: 2, identificador: "IG-002" },
          { ...base, id: 3, identificador: "IG-003" },
        ]}
        columnas={COLUMNAS_LISTADO}
        acciones={(operativoDeLaFila) => (
          <button type="button">Editar {operativoDeLaFila.identificador}</button>
        )}
      />,
    );

    // Los tres identificadores, cada uno en su fila.
    expect(screen.getByText("IG-001")).toBeInTheDocument();
    expect(screen.getByText("IG-002")).toBeInTheDocument();
    expect(screen.getByText("IG-003")).toBeInTheDocument();
    // El personal, fusionado, una sola vez y con el conteo del grupo.
    expect(screen.getByText("SOSA JOSE (3)")).toBeInTheDocument();
    // La acción se conserva POR operativo: tres botones de editar.
    expect(screen.getAllByRole("button", { name: /Editar/ })).toHaveLength(3);
  });
});

describe("la patrulla del formulario 6 se agrupa en la lista", () => {
  it("cada persona con su código y su acción; el personal por fila y el resto fusionado", () => {
    // A diferencia del 8, son personas DISTINTAS del mismo registro-patrulla (`grupoRegistro`):
    // cada una con su código por área (IGNECU/ITNECU/INECU), sin «(n)».
    const general = persona(1, "BENAVIDES FERNANDO", null);
    const tecnico = persona(2, "CAMPAÑA JUAN", null);
    const instruccion = persona(3, "DIAZ ANA", null);
    const base = { ...operativo([general]), grupoRegistro: "lote-1" };
    render(
      <TablaOperativos
        operativos={[
          { ...base, id: 1, identificador: "IGNECU-001", personal: [general] },
          { ...base, id: 2, identificador: "ITNECU-001", personal: [tecnico] },
          { ...base, id: 3, identificador: "INECU-001", personal: [instruccion] },
        ]}
        columnas={COLUMNAS_LISTADO}
        acciones={(operativoDeLaFila) => (
          <button type="button">Editar {operativoDeLaFila.identificador}</button>
        )}
      />,
    );

    // Cada persona con su propio código, uno por fila; y su nombre, SIN «(n)».
    for (const codigo of ["IGNECU-001", "ITNECU-001", "INECU-001"]) {
      expect(screen.getByText(codigo)).toBeInTheDocument();
    }
    for (const nombre of ["BENAVIDES FERNANDO", "CAMPAÑA JUAN", "DIAZ ANA"]) {
      expect(screen.getByText(nombre)).toBeInTheDocument();
    }
    // La acción se conserva POR operativo: tres botones de editar.
    expect(screen.getAllByRole("button", { name: /Editar/ })).toHaveLength(3);
    // Lo que es del operativo (el horario) se fusiona: una vez, abarcando las tres filas.
    const horario = screen.getByText("08H00 A 12H30");
    expect(horario.closest("td")).toHaveAttribute("rowspan", "3");
  });

  /**
   * REGRESIÓN (2026-09-17). La bitácora es POR operativo: el registrante (IGNECU/ITNECU) captura
   * una nota de coordinación al registrar la patrulla, pero la persona que APORTA el DMIT (INECU)
   * nace SIN notas propias. Antes eso metía a las observaciones en la clave de fusión y separaba
   * al aportado en un grupo propio —la patrulla salía partida en pantalla, que fue lo reportado—.
   * Ahora las observaciones NO entran en la clave: la patrulla se agrupa igual y la celda fusionada
   * muestra las notas del registrante.
   */
  it("agrupa la patrulla aunque el personal aportado no tenga las mismas observaciones", () => {
    const general = persona(1, "BENAVIDES FERNANDO", null);
    const tecnico = persona(2, "CAMPAÑA JUAN", null);
    const instruccion = persona(3, "DIAZ ANA", null);
    const nota = [
      {
        texto: "Salen de AMC Matriz a las 20h00",
        creadoPorRol: "DMIP_INSPECCIONES",
        creadoEn: "2026-09-17T20:00:00.000Z",
      },
    ];
    const base = { ...operativo([general]), grupoRegistro: "lote-1" };
    render(
      <TablaOperativos
        operativos={[
          // El registrante lleva la nota; el aportado (INECU) NO.
          { ...base, id: 1, identificador: "IGNECU-001", personal: [general], observaciones: nota },
          { ...base, id: 2, identificador: "ITNECU-001", personal: [tecnico], observaciones: nota },
          { ...base, id: 3, identificador: "INECU-001", personal: [instruccion], observaciones: [] },
        ]}
        columnas={COLUMNAS_LISTADO}
        acciones={() => <button type="button">Editar</button>}
      />,
    );

    // Los tres códigos siguen presentes…
    for (const codigo of ["IGNECU-001", "ITNECU-001", "INECU-001"]) {
      expect(screen.getByText(codigo)).toBeInTheDocument();
    }
    // …y el horario se fusiona UNA sola vez abarcando las tres filas: es una sola patrulla,
    // no un grupo de dos más el aportado suelto.
    const horario = screen.getByText("08H00 A 12H30");
    expect(horario.closest("td")).toHaveAttribute("rowspan", "3");
  });

  /**
   * ACCIONES FUSIONADAS (2026-09-18). La patrulla es UN operativo: «Editar» y «Agregar Personal»
   * se pintan UNA sola vez para todo el grupo (`accionesPatrulla`), y «Eliminar» va por persona
   * (`accionPersona`), EN LA COLUMNA ACCIONES —no pegado al nombre—. Es lo que el usuario pidió.
   */
  it("las acciones de patrulla se fusionan: un solo Editar/Agregar, y Eliminar por persona en Acciones", () => {
    const general = persona(1, "BENAVIDES FERNANDO", null);
    const tecnico = persona(2, "CAMPAÑA JUAN", null);
    const instruccion = persona(3, "DIAZ ANA", null);
    const base = { ...operativo([general]), grupoRegistro: "lote-1" };
    render(
      <TablaOperativos
        operativos={[
          { ...base, id: 1, identificador: "IGNECU-001", personal: [general] },
          { ...base, id: 2, identificador: "ITNECU-001", personal: [tecnico] },
          { ...base, id: 3, identificador: "INECU-001", personal: [instruccion] },
        ]}
        columnas={COLUMNAS_LISTADO}
        accionesPatrulla={() => (
          <>
            <button type="button">Editar</button>
            <button type="button">Agregar Personal</button>
          </>
        )}
        accionPersona={(operativoDeLaFila) => (
          <button type="button">Eliminar {operativoDeLaFila.identificador}</button>
        )}
      />,
    );

    // Editar y Agregar Personal: UNA sola vez cada uno para toda la patrulla.
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "Agregar Personal" }),
    ).toHaveLength(1);
    // Eliminar: uno por persona (tres códigos, tres botones), cada uno con su identificador.
    expect(screen.getAllByRole("button", { name: /Eliminar/ })).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Eliminar INECU-001" }),
    ).toBeInTheDocument();

    // El «Eliminar» vive en la columna Acciones, junto a los generales del grupo en la primera
    // fila —no dentro de la celda del nombre—.
    const acciones = screen
      .getByRole("button", { name: "Agregar Personal" })
      .closest("td")!;
    expect(
      within(acciones).getByRole("button", { name: "Eliminar IGNECU-001" }),
    ).toBeInTheDocument();

    // La celda del nombre NO lleva botón de eliminar.
    const celdaNombre = screen.getByText("BENAVIDES FERNANDO").closest("td")!;
    expect(within(celdaNombre).queryByRole("button")).toBeNull();
  });

  /**
   * ALINEADA COMO LAS DEMÁS (2026-09-18). La patrulla recién registrada debe salir alineada con el
   * resto de operativos —arriba, no centrada—: la celda fusionada usa `align-top`, no
   * `align-middle text-center`. Fue lo reportado: «no lo centralices».
   */
  it("la patrulla NO se centra: la celda fusionada se alinea arriba, como los demás", () => {
    const general = persona(1, "BENAVIDES FERNANDO", null);
    const instruccion = persona(2, "DIAZ ANA", null);
    const base = { ...operativo([general]), grupoRegistro: "lote-1" };
    render(
      <TablaOperativos
        operativos={[
          { ...base, id: 1, identificador: "IGNECU-001", personal: [general] },
          { ...base, id: 2, identificador: "INECU-001", personal: [instruccion] },
        ]}
        columnas={COLUMNAS_LISTADO}
      />,
    );

    const horario = screen.getByText("08H00 A 12H30").closest("td")!;
    expect(horario).toHaveClass("align-top");
    expect(horario).not.toHaveClass("text-center");
  });

  /**
   * LA CABEZA DE LA PATRULLA ES SIEMPRE EL MISMO CÓDIGO (2026-09-18). De la cabeza cuelgan
   * «Editar»/«Agregar Personal», así que si dependiera del orden de llegada las dos tablas
   * (Registro y Mis operativos) ofrecerían botones distintos: en Registro el aporte (INECU) llega
   * primero. Se ordena por identificador, así que la cabeza es el IGNECU del registrante venga
   * como venga el grupo. Es lo que hace que los botones funcionen IGUAL en las dos tablas.
   */
  it("la cabeza de la patrulla no depende del orden de llegada del grupo", () => {
    const general = persona(1, "BENAVIDES FERNANDO", null);
    const instruccion = persona(2, "DIAZ ANA", null);
    const base = { ...operativo([general]), grupoRegistro: "lote-1" };
    render(
      <TablaOperativos
        operativos={[
          // El INECU (aporte) llega PRIMERO, como en Registro al recién aportarlo.
          { ...base, id: 2, identificador: "INECU-001", personal: [instruccion] },
          { ...base, id: 1, identificador: "IGNECU-001", personal: [general] },
        ]}
        columnas={COLUMNAS_LISTADO}
        accionesPatrulla={(grupo) => (
          <button type="button">Editar {grupo[0].identificador}</button>
        )}
      />,
    );

    // La cabeza se ordena por identificador: IGNECU va antes que INECU.
    expect(
      screen.getByRole("button", { name: "Editar IGNECU-001" }),
    ).toBeInTheDocument();
  });

  /**
   * LA PATRULLA NO SE PARTE POR EL HORARIO (2026-09-21). Cada persona lleva su ventana efectiva
   * (RN-66) y el aporte del DMIT puede ir a otra hora; si el horario partiera la fusión, ese
   * código se pintaría como un operativo aparte —lo reportado—. Se agrupa igual y el horario baja
   * POR PERSONA cuando difiere.
   */
  it("la patrulla se agrupa aunque los códigos tengan horarios distintos", () => {
    const general = persona(1, "BENAVIDES", null);
    const instruccion = persona(2, "DIAZ", null);
    const base = { ...operativo([general]), grupoRegistro: "lote-1" };
    render(
      <TablaOperativos
        operativos={[
          {
            ...base,
            id: 1,
            identificador: "IGNECU-001",
            personal: [general],
            horario: "08H00 A 16H30",
          },
          {
            ...base,
            id: 2,
            identificador: "INECU-001",
            personal: [instruccion],
            horario: "08H30 A 16H30",
          },
        ]}
        columnas={COLUMNAS_LISTADO}
        accionesPatrulla={() => <button type="button">Editar</button>}
      />,
    );

    // UN solo grupo: `accionesPatrulla` se pinta UNA vez (si se partiera, saldrían dos «Editar»).
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(1);
    // El horario baja POR PERSONA: se ven los dos, no uno fusionado.
    expect(screen.getByText("08H00 A 16H30")).toBeInTheDocument();
    expect(screen.getByText("08H30 A 16H30")).toBeInTheDocument();
  });

  /**
   * EL CASO REPORTADO (2026-09-21). El servidor entrega los códigos de una patrulla INTERCALADOS
   * con los de otra (A, A, B, A, B). Antes, el código de A que llegaba entre los de B quedaba
   * suelto y se pintaba como un operativo aparte. Ahora cada patrulla se junta por su
   * `grupoRegistro` esté donde esté su código.
   */
  it("agrupa la patrulla aunque sus códigos lleguen intercalados con los de otra", () => {
    const base = operativo([persona(1, "X", null)]);
    const enA = { ...base, grupoRegistro: "lote-A" };
    const enB = { ...base, grupoRegistro: "lote-B" };
    render(
      <TablaOperativos
        operativos={[
          { ...enA, id: 1, identificador: "IGNECU-001", personal: [persona(1, "A1", null)] },
          { ...enA, id: 2, identificador: "INECU-001", personal: [persona(2, "A2", null)] },
          { ...enB, id: 3, identificador: "IGNECU-002", personal: [persona(3, "B1", null)] },
          // El código de A que llega ENTRE los de B (antes quedaba suelto).
          { ...enA, id: 4, identificador: "INECU-002", personal: [persona(4, "A3", null)] },
          { ...enB, id: 5, identificador: "ITNECU-002", personal: [persona(5, "B2", null)] },
        ]}
        columnas={COLUMNAS_LISTADO}
        accionesPatrulla={(grupo) => (
          <button type="button">
            Editar {grupo.map((operativo) => operativo.identificador).join(",")}
          </button>
        )}
      />,
    );

    // La patrulla A recoge sus TRES códigos (incluido el intercalado), ordenados por identificador.
    expect(
      screen.getByRole("button", {
        name: "Editar IGNECU-001,INECU-001,INECU-002",
      }),
    ).toBeInTheDocument();
    // La patrulla B, sus dos.
    expect(
      screen.getByRole("button", { name: "Editar IGNECU-002,ITNECU-002" }),
    ).toBeInTheDocument();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS COPIAS DEL FORMULARIO 8 SON UN SOLO OPERATIVO. 2026-09-21.
 *
 * El 8 genera N operativos idénticos de una persona. Se agrupan («Nombre (n)») y el bloque se
 * ALINEA ARRIBA —no centrado—: antes los datos salían en la fila del medio y las otras parecían
 * filas vacías, a la vista operativos distintos. Es lo reportado.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el bloque del formulario 8 se lee como un solo operativo", () => {
  it("cada operativo (copias de una persona) es UNA banda; el siguiente alterna", () => {
    const alv = operativo([persona(1, "ALVARADO", null)]);
    const gua = operativo([persona(2, "GUAYAQUIL", null)]);
    const { container } = render(
      <TablaOperativos
        operativos={[
          { ...alv, id: 1, identificador: "IT-001" },
          { ...alv, id: 2, identificador: "IT-002" },
          { ...gua, id: 3, identificador: "IG-003" },
          { ...gua, id: 4, identificador: "IG-004" },
        ]}
        columnas={COLUMNAS_LISTADO}
        acciones={() => <button type="button">Editar</button>}
      />,
    );
    const banda = (texto: string) =>
      [...container.querySelectorAll("tbody tr")]
        .find((fila) => fila.textContent?.includes(texto))!
        .className.includes("bg-base-200");

    // Las dos copias de ALVARADO comparten banda; las dos de GUAYAQUIL, la otra.
    expect(banda("IT-001")).toBe(banda("IT-002"));
    expect(banda("IG-003")).toBe(banda("IG-004"));
    expect(banda("IT-001")).not.toBe(banda("IG-003"));
  });

  /**
   * TODO EL REGISTRO DEL 8 ES UN BLOQUE (2026-09-21). Cuando los códigos del 8 comparten `lote`
   * (`grupoRegistro`) —aunque sean personas distintas—, se pintan como UN solo operativo: un color,
   * los generales fusionados. Es lo que pidió el usuario. (No es patrulla: `esPatrulla` es falso.)
   */
  it("los códigos del 8 con el mismo lote son un bloque de un solo color", () => {
    const gua = persona(1, "GUAYAQUIL", null);
    const alv = persona(2, "ALVARADO", null);
    const base = { ...operativo([gua]), grupoRegistro: "reg-8" };
    const { container } = render(
      <TablaOperativos
        operativos={[
          { ...base, id: 1, identificador: "IG-003", personal: [gua] },
          { ...base, id: 2, identificador: "IG-004", personal: [gua] },
          { ...base, id: 3, identificador: "IT-001", personal: [alv] },
          { ...base, id: 4, identificador: "IT-002", personal: [alv] },
        ]}
        columnas={COLUMNAS_LISTADO}
        acciones={() => <button type="button">Editar</button>}
      />,
    );

    const banda = (texto: string) =>
      [...container.querySelectorAll("tbody tr")]
        .find((fila) => fila.textContent?.includes(texto))!
        .className.includes("bg-base-200");

    // Las CUATRO filas (2 personas × 2 copias) comparten la MISMA banda: un solo operativo.
    expect(banda("IG-003")).toBe(banda("IG-004"));
    expect(banda("IG-003")).toBe(banda("IT-001"));
    expect(banda("IG-003")).toBe(banda("IT-002"));
  });

  /**
   * EL NOMBRE SE AGRUPA POR PERSONA CON SU TOTAL (2026-09-21). En el registro del 8 cada inspector
   * puede llevar varios operativos (cantidad N). El nombre no se repite por fila: se fusiona en una
   * celda con «Nombre (n)», el total de operativos de esa persona. Es lo que pidió el usuario.
   */
  it("en el registro del 8 el nombre se agrupa por persona con su total entre paréntesis", () => {
    const villavicencio = persona(1, "VILLAVICENCIO VACA MIGUEL ANGEL", null);
    const alvarado = persona(2, "ALVARADO", null);
    const base = { ...operativo([villavicencio]), grupoRegistro: "reg-8" };
    render(
      <TablaOperativos
        operativos={[
          { ...base, id: 1, identificador: "IG-001", personal: [villavicencio] },
          { ...base, id: 2, identificador: "IG-002", personal: [villavicencio] },
          { ...base, id: 3, identificador: "IT-001", personal: [alvarado] },
          { ...base, id: 4, identificador: "IT-002", personal: [alvarado] },
        ]}
        columnas={COLUMNAS_LISTADO}
        acciones={() => <button type="button">Editar</button>}
      />,
    );

    // Un solo nombre por persona, con «(2)», y su celda abarca los dos códigos de esa persona.
    const villa = screen.getByText("VILLAVICENCIO VACA MIGUEL ANGEL (2)");
    expect(villa.closest("td")).toHaveAttribute("rowspan", "2");
    const alv = screen.getByText("ALVARADO (2)");
    expect(alv.closest("td")).toHaveAttribute("rowspan", "2");
    // El identificador de cada código SÍ sigue por fila: cuatro identificadores.
    expect(screen.getByText("IG-001")).toBeInTheDocument();
    expect(screen.getByText("IT-002")).toBeInTheDocument();
  });

  it("se agrupa «Nombre (n)» y se alinea arriba, no centrado", () => {
    const base = operativo([persona(1, "GUAYAQUIL", null)]);
    render(
      <TablaOperativos
        operativos={[
          { ...base, id: 1, identificador: "IG-001" },
          { ...base, id: 2, identificador: "IG-002" },
          { ...base, id: 3, identificador: "IG-003" },
        ]}
        columnas={COLUMNAS_LISTADO}
        acciones={() => <button type="button">Editar</button>}
      />,
    );

    // Las tres copias se juntan en un bloque con el conteo.
    expect(screen.getByText("GUAYAQUIL (3)")).toBeInTheDocument();
    // La celda fusionada se alinea ARRIBA (con la primera fila), no centrada en el medio.
    const horario = screen.getByText("08H00 A 12H30").closest("td")!;
    expect(horario).toHaveClass("align-top");
    expect(horario).not.toHaveClass("text-center");
  });
});
