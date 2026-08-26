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

import MatrizConsolidadaPage from "../../pages/MatrizConsolidadaPage.tsx";
import { DocumentoService } from "../../services/documento.service.ts";

vi.mock("../../services/documento.service.ts", () => ({
  DocumentoService: { consultarMatriz: vi.fn(), exportarMatriz: vi.fn() },
}));
vi.mock("../../services/cuadroDiario.service.ts", () => ({
  CuadroDiarioService: { cerrar: vi.fn() },
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

import FiltroFormulario from "./FiltroFormulario.tsx";
import TablaMatriz from "./TablaMatriz.tsx";
import type { FilaMatriz, SeccionMatriz } from "../../interfaces/Documento.ts";

const fila = (parcial: Partial<FilaMatriz> = {}): FilaMatriz => ({
  id: 1,
  identificador: "ICNECU-001-31-JUL-2026",
  // Adicional del día · 2026-08-20. La fila ordinaria no nace de ninguno.
  esAdicional: false,
  origen: null,
  horario: "18H00 A 23H30",
  personal: [
    { funcionarioId: 1, nombre: "YUNDA JESSICA", esResponsable: true },
    { funcionarioId: 2, nombre: "CAMPAÑA JUAN", esResponsable: false },
  ],
  zonales: ["DMQ"],
  puntoEncuentro: "AMC Matriz",
  tipoControl: "Alertas ECU 911",
  instituciones: ["AMC"],
  conductor: null,
  placa: null,
  observaciones: null,
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

    const banner = container.querySelector<HTMLElement>("td[colspan='11']");

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

    // FASE5 §5.3. `border` desplazaría el contenido de las celdas vecinas y dejaría la
    // fila crítica desalineada respecto de las demás.
    expect(celda?.className).toContain("ring-1");
    expect(celda?.className).toContain("ring-inset");
    expect(celda?.className).not.toContain("border");
    expect(celda).toHaveAttribute(
      "title",
      "Operativo nocturno sin conductor: impide cerrar la jornada.",
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

    expect(
      screen.getByText("YUNDA JESSICA (R), CAMPAÑA JUAN"),
    ).toBeInTheDocument();
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

  it("las once columnas están, y en el orden del esquema", () => {
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

    render(<MatrizConsolidadaPage />);

    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalledWith(
        "2026-08-22",
      ),
    );
  });

  /** El fin de mes es donde una aritmética casera se equivocaría. */
  it("la víspera de fin de mes pide el día uno del mes siguiente", async () => {
    vi.setSystemTime(new Date(2026, 7, 31, 22, 30));

    render(<MatrizConsolidadaPage />);

    await vi.waitFor(() =>
      expect(DocumentoService.consultarMatriz).toHaveBeenCalledWith(
        "2026-09-01",
      ),
    );
  });

  it("es una propuesta: el selector sigue admitiendo otra fecha", async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 9, 0));

    render(<MatrizConsolidadaPage />);
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
