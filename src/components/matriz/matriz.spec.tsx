/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: matriz.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * TODAS LAS PRUEBAS DE ESTE ARCHIVO COMPRUEBAN LO MISMO DESDE ÁNGULOS DISTINTOS: que en un
 * sistema llamado *cuadro de colores* **ninguna información dependa solo del color**. El
 * banner lleva número y nombre; la celda amarilla lleva su motivo; el borde crítico lleva
 * el suyo. Es la regla 6 de CLAUDE.md y son los casos 2, 4 y 5 del plan.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import MatrizConsolidadaPage from "../../pages/MatrizConsolidadaPage.tsx";
import { DocumentoService } from "../../services/documento.service.ts";

vi.mock("../../services/documento.service.ts", () => ({
  DocumentoService: { consultarMatriz: vi.fn(), exportarMatriz: vi.fn() },
}));
vi.mock("../../services/cuadroDiario.service.ts", () => ({
  CuadroDiarioService: { cerrar: vi.fn(), reabrir: vi.fn() },
}));
// Por defecto, la Dirección: tiene `cuadro:cerrar-reabrir`. Cada prueba puede quitárselo.
const permiso = vi.hoisted(() => ({ reabrir: true }));
vi.mock("../../hooks/usePermiso.ts", () => ({
  usePermiso: () => permiso.reabrir,
  useTieneRol: () => true,
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

import { CuadroDiarioService } from "../../services/cuadroDiario.service.ts";
import FiltroFormulario from "./FiltroFormulario.tsx";
import TablaMatriz from "./TablaMatriz.tsx";
import type { FilaMatriz, SeccionMatriz } from "../../interfaces/Documento.ts";

const fila = (parcial: Partial<FilaMatriz> = {}): FilaMatriz => ({
  id: 1,
  identificador: "ICNECU-001-31-JUL-2026",
  grupoRegistro: null,
  // Adicional del día · 2026-08-20. La fila ordinaria no nace de ninguno.
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
  alertas: [],
  ...parcial,
});

const seccion = (parcial: Partial<SeccionMatriz> = {}): SeccionMatriz => ({
  numero: 6,
  codigo: "ICNECU",
  nombre: "Patrulla de Reacción Nocturna",
  // 6 · REACN no tiene prefijo de adicional: hoy solo lo tiene el 2 · PMO.
  colorFondo: "#1b3a5c",
  colorAcento: "#000000",
  colorNombre: "azul",
  responsable: "DMIP Inspecciones + DMIT",
  esPatrulla: true,
  // 6 · REACN no tiene prefijo de adicional: hoy solo lo tiene el 2 · PMO.
  admiteAdicionales: false,
  totalOperativos: 1,
  filas: [fila()],
  evidencia: null,
  ...parcial,
});

/** Dónde dejó la navegación: ruta y consulta. */
const DestinoOrdenes = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="destino">{pathname + search}</p>;
};

describe("caso 2 · el banner no es solo color", () => {
  it("lleva número y nombre en el texto", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    expect(
      screen.getByText("6. Patrulla de Reacción Nocturna"),
    ).toBeInTheDocument();
  });

  it("el color se aplica en línea, tal como llega del servidor", () => {
    const { container } = render(
      <TablaMatriz
        secciones={[seccion({ colorFondo: "#1b3a5c" })]}
        mensajeVacio="Sin datos"
      />,
    );

    // Doce desde el 2026-08-27, con la columna de teléfono. El banner las abarca todas.
    const banner = container.querySelector<HTMLElement>("td[colspan='12']");

    expect(banner).not.toBeNull();
    // Regla 3: no existe una clase por formulario, el color es un dato.
    expect(banner?.style.backgroundColor).toBe("rgb(27, 58, 92)");
    // Fondo oscuro: el texto tiene que salir blanco para leerse.
    expect(banner?.style.color).toBe("rgb(255, 255, 255)");
  });

  it("muestra el responsable, el conteo y el nombre del color del Excel", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    expect(
      screen.getByText(/DMIP Inspecciones \+ DMIT · 1 operativo · azul/),
    ).toBeInTheDocument();
  });
});

describe("caso 3 · el formulario sin carga deja constancia", () => {
  it("dice el departamento y la hora de cierre de su ventana", () => {
    const vacia = seccion({
      numero: 7,
      codigo: "DMIT",
      nombre: "Operativo DMIT",
      totalOperativos: 0,
      filas: [],
      evidencia: {
        leyenda: "La información de este formulario no fue ingresada.",
        responsable: "DMIT Instrucción",
        horaCierre: "15:00",
      },
    });

    render(
      <TablaMatriz
        secciones={[vacia]}
        mensajeVacio="Sin datos"
      />,
    );

    expect(
      screen.getByText("La información de este formulario no fue ingresada."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Responsable: DMIT Instrucción · cierre 15H00/),
    ).toBeInTheDocument();
  });

  it("sin evidencia no se inventa ninguna fila", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    expect(screen.queryByText(/no fue ingresada/)).toBeNull();
  });
});

describe("casos 4 y 5 · la celda alertada lleva siempre su motivo", () => {
  const conAlerta = (critica: boolean) =>
    seccion({
      filas: [
        fila({
          alertas: [
            {
              codigo: critica ? "ALV-04" : "ALV-02",
              campo: "conductor",
              mensaje: critica
                ? "Operativo nocturno sin conductor: impide cerrar la jornada."
                : "Falta asignar conductor. Lo hace la DAF.",
              critica,
            },
          ],
        }),
      ],
    });

  it("caso 4 · el Amarillo de Alerta va acompañado del texto", () => {
    const { container } = render(
      <TablaMatriz
        secciones={[conAlerta(false)]}
        mensajeVacio="Sin datos"
      />,
    );

    const celda = container.querySelector<HTMLElement>("td.bg-warning\\/25");

    expect(celda).not.toBeNull();
    expect(celda).toHaveAttribute(
      "title",
      "Falta asignar conductor. Lo hace la DAF.",
    );
    // La celda está vacía, así que el motivo se lee sin apuntar con el ratón.
    expect(
      screen.getByText("Falta asignar conductor. Lo hace la DAF."),
    ).toBeInTheDocument();
  });

  it("caso 5 · la crítica se distingue con `ring`, y no con `border`", () => {
    const { container } = render(
      <TablaMatriz
        secciones={[conAlerta(true)]}
        mensajeVacio="Sin datos"
      />,
    );

    const celda = container.querySelector<HTMLElement>("td.ring-error");

    // FASE5 §5.3. La crítica se marca con `ring`, no con un `border` DE COLOR propio, que
    // desplazaría el contenido y desalinearía la fila. El `border-t` que la celda pueda
    // llevar es el SEPARADOR DE OPERATIVO (`BORDE_OPERATIVO` de TablaMatriz): va en todas las
    // celdas del renglón por igual y no desalinea, así que se excluye solo el borde de color.
    expect(celda?.className).toContain("ring-1");
    expect(celda?.className).toContain("ring-inset");
    expect(celda?.className).not.toMatch(/border-(error|warning)/);
    expect(celda).toHaveAttribute(
      "title",
      "Operativo nocturno sin conductor: impide cerrar la jornada.",
    );
  });
});

describe("agrupación de las copias del formulario 8", () => {
  it("junta los operativos idénticos de una persona: identificador por fila, personal fusionado con «(n)»", () => {
    const persona = {
      funcionarioId: 9,
      nombre: "SOSA JOSE",
      telefono: null,
      esResponsable: false,
      horaInicio: "08:00",
      horaFin: "12:00",
    };
    // Tres operativos idénticos salvo el identificador: las copias que genera el 8.
    const comun = {
      horario: "08H00 A 12H00",
      personal: [persona],
      zonales: ["DMQ"],
      puntoEncuentro: "AMC",
      tipoControl: "X",
      instituciones: ["AMC"],
      conductor: null,
      placa: null,
      observaciones: [],
      estadoTransporte: "PENDIENTE" as const,
      esNocturno: false,
      esAdicional: false,
      origen: null,
      alertas: [],
    };
    render(
      <TablaMatriz
        secciones={[
          seccion({
            totalOperativos: 3,
            filas: [
              fila({ ...comun, id: 1, identificador: "IG-001" }),
              fila({ ...comun, id: 2, identificador: "IG-002" }),
              fila({ ...comun, id: 3, identificador: "IG-003" }),
            ],
          }),
        ]}
        mensajeVacio="Sin datos"
      />,
    );

    // Los tres identificadores, cada uno en su fila.
    expect(screen.getByText("IG-001")).toBeInTheDocument();
    expect(screen.getByText("IG-002")).toBeInTheDocument();
    expect(screen.getByText("IG-003")).toBeInTheDocument();
    // El personal aparece UNA sola vez, con el conteo de operativos del grupo.
    const celdaPersonal = screen.getByText("SOSA JOSE (3)").closest("td");
    expect(celdaPersonal).toBeInTheDocument();
    // La celda fusionada va CENTRADA en el bloque (vertical y horizontal).
    expect(celdaPersonal?.className).toContain("align-middle");
    expect(celdaPersonal?.className).toContain("text-center");
  });
});

describe("agrupación de la patrulla (formulario 6)", () => {
  it("junta las personas del mismo grupoRegistro, cada una con su código, y fusiona el resto", () => {
    // A diferencia del 8, son personas DISTINTAS de una misma patrulla: cada una con su código por
    // área (IGNECU/ITNECU/INECU), sin «(n)», y el resto del operativo fusionado con `rowSpan`.
    const persona = (funcionarioId: number, nombre: string) => ({
      funcionarioId,
      nombre,
      telefono: null,
      esResponsable: false,
      horaInicio: "20:00",
      horaFin: "02:00",
    });
    const comun = {
      grupoRegistro: "lote-1",
      horario: "20H00 A 02H00",
      zonales: ["DMQ"],
      puntoEncuentro: "AMC Matriz",
      tipoControl: "Alertas ECU 911",
      instituciones: ["AMC"],
      conductor: null,
      placa: null,
      observaciones: [],
      estadoTransporte: "PENDIENTE" as const,
      esNocturno: true,
      esAdicional: false,
      origen: null,
      alertas: [],
    };

    render(
      <TablaMatriz
        secciones={[
          seccion({
            totalOperativos: 3,
            filas: [
              fila({
                ...comun,
                id: 1,
                identificador: "IGNECU-001",
                personal: [persona(1, "BENAVIDES FERNANDO")],
              }),
              fila({
                ...comun,
                id: 2,
                identificador: "ITNECU-001",
                personal: [persona(2, "CAMPAÑA JUAN")],
              }),
              fila({
                ...comun,
                id: 3,
                identificador: "INECU-001",
                personal: [persona(3, "DIAZ ANA")],
              }),
            ],
          }),
        ]}
        mensajeVacio="Sin datos"
      />,
    );

    // Cada persona con su propio código, uno por fila; y su nombre, sin «(n)».
    for (const codigo of ["IGNECU-001", "ITNECU-001", "INECU-001"]) {
      expect(screen.getByText(codigo)).toBeInTheDocument();
    }
    for (const nombre of ["BENAVIDES FERNANDO", "CAMPAÑA JUAN", "DIAZ ANA"]) {
      expect(screen.getByText(nombre)).toBeInTheDocument();
    }

    // El resto se fusiona: el punto de encuentro aparece UNA vez, abarcando las tres filas.
    const puntos = screen.getAllByText("AMC Matriz");
    expect(puntos).toHaveLength(1);
    expect(puntos[0].closest("td")?.getAttribute("rowspan")).toBe("3");
  });

  it("el registro del 8 (varias personas con copias) agrupa cada nombre con su «(n)»", () => {
    // Cada inspector con sus copias, todos en el mismo lote: el nombre se fusiona por persona con
    // el total de operativos de esa persona, y su celda abarca sus códigos.
    const persona = (funcionarioId: number, nombre: string) => ({
      funcionarioId,
      nombre,
      telefono: null,
      esResponsable: false,
      horaInicio: "08:00",
      horaFin: "12:30",
    });
    const comun = {
      grupoRegistro: "lote-8",
      horario: "08H00 A 12H30",
      zonales: ["DMQ"],
      puntoEncuentro: "AMC Matriz",
      tipoControl: "Alertas ECU 911",
      instituciones: ["AMC"],
      conductor: null,
      placa: null,
      observaciones: [],
      estadoTransporte: "PENDIENTE" as const,
      esNocturno: false,
      esAdicional: false,
      origen: null,
      alertas: [],
    };

    render(
      <TablaMatriz
        secciones={[
          seccion({
            totalOperativos: 4,
            filas: [
              fila({ ...comun, id: 1, identificador: "IG-001", personal: [persona(1, "VILLAVICENCIO VACA MIGUEL ANGEL")] }),
              fila({ ...comun, id: 2, identificador: "IG-002", personal: [persona(1, "VILLAVICENCIO VACA MIGUEL ANGEL")] }),
              fila({ ...comun, id: 3, identificador: "IT-001", personal: [persona(2, "ALVARADO")] }),
              fila({ ...comun, id: 4, identificador: "IT-002", personal: [persona(2, "ALVARADO")] }),
            ],
          }),
        ]}
        mensajeVacio="Sin datos"
      />,
    );

    // Un nombre por persona con «(2)», cada celda abarcando sus dos códigos y CENTRADA.
    const villa = screen.getByText("VILLAVICENCIO VACA MIGUEL ANGEL (2)");
    const celdaVilla = villa.closest("td");
    expect(celdaVilla?.getAttribute("rowspan")).toBe("2");
    expect(celdaVilla?.className).toContain("align-middle");
    expect(celdaVilla?.className).toContain("text-center");
    const alv = screen.getByText("ALVARADO (2)");
    expect(alv.closest("td")?.getAttribute("rowspan")).toBe("2");
    // Los cuatro identificadores siguen visibles, uno por fila.
    for (const codigo of ["IG-001", "IG-002", "IT-001", "IT-002"]) {
      expect(screen.getByText(codigo)).toBeInTheDocument();
    }
  });
});

describe("separación entre operativos", () => {
  it("marca el borde superior en la primera fila del operativo, no en las de sus personas internas", () => {
    // `fila()` trae un operativo de dos personas: la primera abre el operativo (lleva el
    // separador `border-t`); la segunda es un renglón interno del mismo y no debe llevarlo.
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    const celdaIdentificador = screen
      .getByText("ICNECU-001-31-JUL-2026")
      .closest("td");
    expect(celdaIdentificador?.className).toContain("border-t");

    const celdaSegundaPersona = screen.getByText("CAMPAÑA JUAN").closest("td");
    expect(celdaSegundaPersona?.className).not.toContain("border-t");
  });

  it("alterna la banda por operativo: el primero en gris, el segundo en blanco", () => {
    render(
      <TablaMatriz
        secciones={[
          seccion({
            totalOperativos: 2,
            filas: [
              fila({ id: 1, identificador: "OCF-001" }),
              fila({
                id: 2,
                identificador: "OCF-002",
                personal: [fila().personal[0]],
              }),
            ],
          }),
        ]}
        mensajeVacio="Sin datos"
      />,
    );

    // Primer operativo (índice par): su renglón lleva el gris de banda.
    expect(screen.getByText("OCF-001").closest("tr")?.className).toContain(
      "bg-base-200",
    );
    // Segundo operativo (índice impar): blanco, sin la clase de banda.
    expect(screen.getByText("OCF-002").closest("tr")?.className).not.toContain(
      "bg-base-200",
    );
  });
});

describe("la fila de datos", () => {
  it("distingue al responsable de la patrulla del resto del personal", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    // Desde la agrupación del 27-AGO cada persona tiene su propio renglón, así que ya no
    // hay un texto unido por comas: lo que se comprueba es que la (R) sigue distinguiendo.
    expect(screen.getByText("YUNDA JESSICA (R)")).toBeInTheDocument();
    expect(screen.getByText("CAMPAÑA JUAN")).toBeInTheDocument();
  });

  /*
    HORARIO POR PERSONA CUANDO LOS TURNOS DIFIEREN. 2026-09-08. Es una decisión, no
    maquetado: si el operativo reúne ventanas distintas, el horario baja a la fila de cada
    quien; si todas heredan la del operativo —el caso normal—, se pinta una sola vez.
  */
  it("cuando los turnos difieren, pinta el horario de cada persona", () => {
    render(
      <TablaMatriz
        secciones={[
          seccion({
            filas: [
              fila({
                personal: [
                  {
                    funcionarioId: 1,
                    nombre: "YUNDA JESSICA",
                    telefono: null,
                    esResponsable: true,
                    horaInicio: "07:00",
                    horaFin: "16:00",
                  },
                  {
                    funcionarioId: 2,
                    nombre: "CAMPAÑA JUAN",
                    telefono: null,
                    esResponsable: false,
                    horaInicio: "09:00",
                    horaFin: "18:00",
                  },
                ],
              }),
            ],
          }),
        ]}
        mensajeVacio="Sin datos"
      />,
    );

    expect(screen.getByText("07H00 A 16H00")).toBeInTheDocument();
    expect(screen.getByText("09H00 A 18H00")).toBeInTheDocument();
  });

  it("cuando todas heredan el horario del operativo, se pinta una sola vez", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    // La fixture da a las dos personas la misma ventana efectiva (18:00–23:30): el
    // horario del operativo aparece una vez, no uno por persona.
    expect(screen.getAllByText("18H00 A 23H30")).toHaveLength(1);
  });

  it("el estado de transporte lleva color y palabra", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    const distintivo = screen.getByText("Pendiente");

    expect(distintivo.className).toContain("badge");
  });

  it("las doce columnas están, y en el orden del esquema", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((celda) => celda.textContent);

    expect(encabezados).toEqual([
      "Identificador",
      "Horario",
      "Personal",
      "Teléfono",
      "Zonal",
      "Punto",
      "Tipo",
      "Instituciones",
      "Conductor",
      "Placa",
      "Estado",
      "Observaciones",
    ]);
  });

  it("no hay columna de acciones: emitir órdenes es M-26", () => {
    render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("caso 8 · el desplazamiento vive dentro del contenedor", () => {
  it("la tabla va envuelta en `overflow-x-auto`", () => {
    const { container } = render(
      <TablaMatriz
        secciones={[seccion()]}
        mensajeVacio="Sin datos"
      />,
    );

    // A 375 px las once columnas no caben; lo que no puede pasar es que se desplace la
    // página entera y arrastre la navegación con ella.
    expect(container.firstElementChild?.className).toContain("overflow-x-auto");
  });
});

describe("el filtro por formulario", () => {
  it("ofrece los nueve más «todos», y avisa de cuántos operativos tiene cada uno", async () => {
    const elegir = vi.fn();

    render(
      <FiltroFormulario
        secciones={[
          seccion({ codigo: "ICNECU", numero: 6, totalOperativos: 1 }),
          seccion({
            codigo: "DMIT",
            numero: 7,
            nombre: "Operativo DMIT",
            totalOperativos: 0,
          }),
        ]}
        seleccionado=""
        onSeleccionar={elegir}
      />,
    );

    const desplegable = screen.getByLabelText("Filtrar por formulario");

    // El vacío también es una opción: su fila de evidencia es lo que hay que revisar.
    expect(
      within(desplegable).getByRole("option", {
        name: "7. Operativo DMIT (0)",
      }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(desplegable, "ICNECU");
    expect(elegir).toHaveBeenCalledWith("ICNECU");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   LA JORNADA QUE SE PROPONE AL ABRIR · 2026-08-21 · RN-01

   El cuadro se elabora la víspera, así que la matriz que la Dirección viene a consolidar
   es la del día siguiente. Hasta esta fecha P-04 abría en HOY, que es la jornada ya
   ejecutada, y P-01 registraba en MAÑANA: dos pantallas del mismo flujo mirando días
   distintos.

   Se afirma sobre la llamada al servidor y no sobre el valor del campo, porque lo que
   importa no es qué dice el selector sino **qué jornada se pide**.
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("P-04 abre en la jornada que se está armando", () => {
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

  it("pide la matriz de mañana, no la de hoy", async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 9, 0));

    render(<MatrizConsolidadaPage />, { wrapper: MemoryRouter });

    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalledWith(
        "2026-08-22",
      ),
    );
  });

  /** El fin de mes es donde una aritmética casera se equivocaría. */
  it("la víspera de fin de mes pide el día uno del mes siguiente", async () => {
    vi.setSystemTime(new Date(2026, 7, 31, 22, 30));

    render(<MatrizConsolidadaPage />, { wrapper: MemoryRouter });

    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalledWith(
        "2026-09-01",
      ),
    );
  });

  it("es una propuesta: el selector sigue admitiendo otra fecha", async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 9, 0));

    render(<MatrizConsolidadaPage />, { wrapper: MemoryRouter });
    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalled(),
    );

    const selector = screen.getByLabelText(/Fecha/i);
    fireEvent.change(selector, { target: { value: "2026-08-13" } });

    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalledWith(
        "2026-08-13",
      ),
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   REABRIR EL CUADRO · 2026-10-08

   El endpoint existía y ninguna pantalla lo llamaba. Con el cuadro cerrado, quien tiene
   `cuadro:cerrar-reabrir` ve «Reabrir cuadro»; quien no, sigue viendo el botón apagado.
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("P-04 reabre un cuadro cerrado", () => {
  const matrizEn = (estado: "APROBADO" | "CERRADO") => ({
    cabecera: {
      ordenTrabajo: "AMC-2026-10-09",
      fecha: "2026-10-09",
      fechaNatural: "jueves 9 de octubre de 2026",
      nroSemana: 41,
      anioSemana: 2026,
      estado,
      totalOperativos: 3,
      totalAlertas: 0,
      formulariosSinCarga: 0,
      flota: null,
    },
    secciones: [],
  });

  beforeEach(() => {
    permiso.reabrir = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("con el cuadro cerrado ofrece «Reabrir cuadro», confirma y lo reabre", async () => {
    vi.mocked(DocumentoService.consultarMatriz)
      .mockResolvedValueOnce(matrizEn("CERRADO"))
      .mockResolvedValueOnce(matrizEn("APROBADO"));
    vi.mocked(CuadroDiarioService.reabrir).mockResolvedValue({
      ordenTrabajo: "AMC-2026-10-09",
    } as Awaited<ReturnType<typeof CuadroDiarioService.reabrir>>);

    render(<MatrizConsolidadaPage />, { wrapper: MemoryRouter });

    await userEvent.click(
      await screen.findByRole("button", { name: "Reabrir cuadro" }),
    );
    // La confirmación dice lo que la reapertura NO hace.
    expect(
      screen.getByText(/órdenes de servicio ya emitidas no se anulan/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sí, reabrir" }));

    expect(CuadroDiarioService.reabrir).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(
      await screen.findByText(/Cuadro AMC-2026-10-09 reabierto/),
    ).toBeInTheDocument();
    // Vuelto a aprobado, el botón vuelve a ser el de cerrar.
    expect(
      await screen.findByRole("button", { name: "Cerrar cuadro" }),
    ).toBeEnabled();
  });

  it("sin el permiso, el cuadro cerrado solo muestra el botón apagado", async () => {
    permiso.reabrir = false;
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizEn("CERRADO"),
    );

    render(<MatrizConsolidadaPage />, { wrapper: MemoryRouter });

    expect(
      await screen.findByRole("button", { name: "Cuadro cerrado" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "Reabrir cuadro" })).toBeNull();
  });

  it("con el cuadro sin cerrar no ofrece reabrir", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizEn("APROBADO"),
    );

    render(<MatrizConsolidadaPage />, { wrapper: MemoryRouter });

    expect(
      await screen.findByRole("button", { name: "Cerrar cuadro" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reabrir cuadro" })).toBeNull();
  });

  it("cerrar el cuadro es un hito: modal de éxito con «Ver órdenes», que lleva a Órdenes de esa fecha", async () => {
    vi.mocked(DocumentoService.consultarMatriz)
      .mockResolvedValueOnce(matrizEn("APROBADO"))
      .mockResolvedValueOnce(matrizEn("CERRADO"));
    vi.mocked(CuadroDiarioService.cerrar).mockResolvedValue({
      ordenTrabajo: "AMC-2026-10-09",
    } as Awaited<ReturnType<typeof CuadroDiarioService.cerrar>>);

    render(
      <MemoryRouter initialEntries={["/home/cuadro/matriz"]}>
        <Routes>
          <Route path="/home/cuadro/matriz" element={<MatrizConsolidadaPage />} />
          <Route path="/home/cuadro/ordenes" element={<DestinoOrdenes />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Cerrar cuadro" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, cerrar" }));

    const exito = await screen.findByRole("alertdialog", {
      name: "Cuadro AMC-2026-10-09 cerrado",
    });
    expect(exito).toHaveTextContent("Ya se pueden emitir las órdenes de servicio.");
    expect(within(exito).getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    await userEvent.click(within(exito).getByRole("button", { name: "Ver órdenes" }));

    expect(await screen.findByTestId("destino")).toHaveTextContent(
      /^\/home\/cuadro\/ordenes\?fecha=\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("si el servidor lo rechaza, muestra su mensaje tal cual", async () => {
    vi.mocked(DocumentoService.consultarMatriz).mockResolvedValue(
      matrizEn("CERRADO"),
    );
    // Forma en que `httpClient` normaliza el error del servidor.
    vi.mocked(CuadroDiarioService.reabrir).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: {
            statusCode: 409,
            codigo: "CUADRO_CERRADO",
            mensaje: "El cuadro del 2026-10-09 no está cerrado.",
          },
        },
      },
    });

    render(<MatrizConsolidadaPage />, { wrapper: MemoryRouter });

    await userEvent.click(
      await screen.findByRole("button", { name: "Reabrir cuadro" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Sí, reabrir" }));

    // Mensajes estándar (2026-10-16): el error queda en el MISMO modal, con el texto del servidor.
    const error = await screen.findByRole("alertdialog", { name: "No se pudo reabrir el cuadro" });
    expect(error).toHaveTextContent(/no está cerrado/);
  });
});

/*
  OBSERVACIONES COMO NOTAS (2026-10-19, plan «notas-jornada-matriz»): las mismas tarjetas que Mis
  operativos, con la nota «Comparte con X», que lleva a la fila de X dentro de la matriz.
*/
describe("las observaciones de la matriz son notas", () => {
  const COMPARTIDA = {
    id: "compartida-62",
    tipo: "COMPARTIDA" as const,
    texto: "Comparte con OCPMO-001-20-OCT-2026",
    autor: "De La Guerra Portugal Lider Franklin",
    fecha: "2026-10-19T14:00:00.000Z",
    operativoRelacionadoId: 61,
  };
  const ESCRITA = {
    id: "nota-9",
    tipo: "NOTA" as const,
    texto: "Pruebas tecnicas 3",
    autor: "De La Guerra Portugal Lider Franklin",
    fecha: "2026-10-19T13:30:00.000Z",
    operativoRelacionadoId: null,
  };

  it("OCPMO-002 muestra la compartida y su nota; al pulsarla, OCPMO-001 se centra y destella", () => {
    const centrar = vi.fn();
    Element.prototype.scrollIntoView = centrar;
    render(
      <TablaMatriz
        secciones={[
          seccion({
            filas: [
              fila({ id: 61, identificador: "OCPMO-001-20-OCT-2026", observaciones: [], notas: [] }),
              fila({
                id: 62,
                identificador: "OCPMO-002-20-OCT-2026",
                observaciones: ["Pruebas tecnicas 3"],
                notas: [COMPARTIDA, ESCRITA],
              }),
            ],
          }),
        ]}
        mensajeVacio="Sin datos"
      />,
    );

    expect(screen.getByText("Pruebas tecnicas 3").closest(".app-nota")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ir al operativo OCPMO-001-20-OCT-2026/ }));
    expect(document.querySelector('[data-operativo-id="61"]')).toHaveClass("app-fila-destello");
    expect(centrar).toHaveBeenCalledWith(expect.objectContaining({ block: "center" }));
  });

  it("un servidor que solo manda los textos: cada uno es una tarjeta; sin notas, «—»", () => {
    render(
      <TablaMatriz
        secciones={[
          seccion({
            filas: [
              fila({ id: 70, identificador: "A-1", observaciones: ["Una", "Dos"] }),
              fila({ id: 71, identificador: "A-2", observaciones: [] }),
            ],
          }),
        ]}
        mensajeVacio="Sin datos"
      />,
    );
    expect(screen.getByText("Una").closest(".app-nota")).not.toBe(screen.getByText("Dos").closest(".app-nota"));
    expect(screen.getAllByText("—").some((nodo) => nodo.classList.contains("text-app-muted"))).toBe(true);
  });
});
