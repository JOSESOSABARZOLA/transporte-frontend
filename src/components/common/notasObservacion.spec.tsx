/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Observaciones como notas
 * Archivo: notasObservacion.spec.tsx
 * Responsabilidad: Fijar `NotasObservacion`, el componente único de las notas de las cuatro tablas
 *                  (Registro, Mis operativos, Jornada y Matriz): una tarjeta por nota, la compartida
 *                  aparte y navegable, como mucho dos con «+ N más» / «Ver menos», «—» sin notas,
 *                  solo lectura, y el filtro por el texto de todas. Y la columna Formulario compacta.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import NotasObservacion, { FUERA_DE_LA_VISTA } from "./NotasObservacion.tsx";
import PanelOperativos from "../cuadro/PanelOperativos.tsx";
import TablaOperativos from "../cuadro/TablaOperativos.tsx";
import { useTablaOperativos } from "../../hooks/useTablaOperativos.ts";
import type { NotaOperativo, Operativo } from "../../interfaces/Operativo.ts";
import {
  COLUMNAS_LISTADO,
  coincideConFiltros,
  valorDeColumna,
} from "../../utils/listadoOperativos.util.ts";

const operativo = (parcial: Partial<Operativo> = {}): Operativo =>
  ({
    id: 62,
    identificador: "OCPMO-002-20-OCT-2026",
    cuadroFecha: "2026-10-20",
    formulario: {
      codigo: "PMO",
      nombre: "CONTROL DE PUNTO DE MANDO OPERATIVO (PMO)",
      numero: 2,
      colorFondo: "#fce5cd",
      colorAcento: "#000000",
      colorNombre: "naranja",
      esPatrulla: false,
      condicionanteNoct: false,
    },
    horaInicio: "08:00",
    horaFin: "16:30",
    horario: "08H00 A 16H30",
    zonales: [],
    puntoEncuentro: null,
    puntoLibre: null,
    tipoControl: null,
    tipoLibre: null,
    instituciones: [],
    personal: [],
    composicion: { esPatrulla: false, completa: true, areasPendientes: [] },
    estadoTransporte: "PENDIENTE",
    alertaActiva: false,
    alertas: [],
    observaciones: [],
    creadoPorRol: "DMIP_OPERATIVOS",
    creadoEn: "2026-10-19T13:00:00.000Z",
    ...parcial,
  }) as Operativo;

const nota = (parcial: Partial<NotaOperativo>): NotaOperativo => ({
  id: "nota-1",
  tipo: "NOTA",
  texto: "Pruebas técnicas 3",
  autor: "De La Guerra Portugal Lider Franklin",
  fecha: "2026-10-19T13:30:00.000Z",
  operativoRelacionadoId: null,
  ...parcial,
});

const COMPARTIDA = nota({
  id: "compartida-62",
  tipo: "COMPARTIDA",
  texto: "Comparte con OCPMO-001-20-OCT-2026",
  fecha: "2026-10-19T14:00:00.000Z",
  operativoRelacionadoId: 61,
});

describe("NotasObservacion · una tarjeta por observación", () => {
  it("cada nota es su tarjeta, con «Autor · dd/mm HHhMM» en Quito y el detalle en el tooltip", () => {
    render(<NotasObservacion notas={[nota({})]} />);

    const tarjeta = screen.getByText("Pruebas técnicas 3").closest(".app-nota") as HTMLElement;
    // 13h30 UTC son 08h30 en Quito.
    expect(within(tarjeta).getByText("De La Guerra Portugal Lider Franklin · 19/10 08h30")).toBeInTheDocument();
    expect(tarjeta).toHaveAttribute("title", "De La Guerra Portugal Lider Franklin · 19/10/2026 08h30");
    expect(tarjeta).not.toHaveClass("app-nota-compartida");
  });

  it("la compartida va en su propia tarjeta azul y, al pulsarla, lleva a su operativo", async () => {
    const irA = vi.fn();
    render(<NotasObservacion notas={[COMPARTIDA, nota({})]} onIrA={irA} />);

    const compartida = screen.getByRole("button", {
      name: "Ir al operativo OCPMO-001-20-OCT-2026, con el que comparte unidad",
    });
    expect(compartida).toHaveClass("app-nota", "app-nota-compartida");
    expect(compartida).toHaveTextContent("Comparte con OCPMO-001-20-OCT-2026");
    expect(within(compartida).getByText("OCPMO-001-20-OCT-2026")).toHaveClass("font-mono");

    await userEvent.click(compartida);
    expect(irA).toHaveBeenCalledWith(61);
  });

  it("si su operativo no está en la vista, la tarjeta no se pulsa y lo dice", () => {
    render(<NotasObservacion notas={[COMPARTIDA]} onIrA={vi.fn()} esVisible={() => false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector(".app-nota-compartida")).toHaveAccessibleDescription(FUERA_DE_LA_VISTA);
  });

  it("sin operativo relacionado (otro formulario, RN-48) no se pulsa y dice su texto, sin identificador", () => {
    render(
      <NotasObservacion
        notas={[
          nota({
            tipo: "COMPARTIDA",
            texto: "Comparte unidad con un operativo de otro formulario",
            operativoRelacionadoId: null,
          }),
        ]}
        onIrA={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Comparte unidad con un operativo de otro formulario")).toBeInTheDocument();
    expect(document.querySelector(".font-mono")).toBeNull();
  });

  it("como mucho dos a la vista: «+ N notas más» las despliega y «Ver menos» las recoge", async () => {
    const notas = [
      COMPARTIDA,
      nota({ id: "nota-3", texto: "Tercera" }),
      nota({ id: "nota-2", texto: "Segunda" }),
      nota({ id: "nota-1", texto: "Primera" }),
    ];
    render(<NotasObservacion notas={notas} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("Primera")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "+ 2 notas más" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Primera")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver menos" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("sin notas, «—» en gris", () => {
    render(<NotasObservacion notas={[]} />);
    expect(screen.getByText("—")).toHaveClass("text-app-muted");
  });

  it("solo lectura: no ofrece editar ni quitar notas", () => {
    render(<NotasObservacion notas={[nota({}), nota({ id: "nota-2", texto: "Otra" })]} />);
    expect(screen.queryByRole("button", { name: /editar|quitar|eliminar/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("notas en las tablas de Registro y Mis operativos", () => {
  it("un servidor que no manda `notas`: se arman con las observaciones y la solicitud de compartir", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            observaciones: [
              { texto: "Llevar chalecos", creadoPorRol: "DMIP_OPERATIVOS", creadoEn: "2026-10-19T12:00:00.000Z" },
            ],
            compartirCon: { id: 61, identificador: "OCPMO-001-20-OCT-2026" },
          }),
        ]}
      />,
    );
    expect(document.querySelectorAll(".app-nota")).toHaveLength(2);
    expect(screen.getByText("Llevar chalecos")).toBeInTheDocument();
    expect(document.querySelector(".app-nota-compartida")).toHaveTextContent(
      "Comparte con OCPMO-001-20-OCT-2026",
    );
  });

  it("el filtro de la columna busca en todas las notas, incluido el identificador compartido", () => {
    const conNotas = operativo({ notas: [COMPARTIDA, nota({})] });
    expect(valorDeColumna(conNotas, "observaciones")).toBe(
      "Comparte con OCPMO-001-20-OCT-2026 · Pruebas técnicas 3",
    );
    expect(coincideConFiltros(conNotas, { observaciones: "ocpmo-001" })).toBe(true);
    expect(coincideConFiltros(conNotas, { observaciones: "tecnicas 3" })).toBe(true);
    expect(coincideConFiltros(conNotas, { observaciones: "otra cosa" })).toBe(false);
  });

  /*
    J5 (2026-10-19): la nota «Comparte con X» lleva a la fila de X si está en la tabla —a su página
    si hace falta, centrada y con un destello—; si no, abre su detalle.
  */
  const Panel = ({ operativos, verDetalle }: { operativos: Operativo[]; verDetalle: (id: number) => void }) => {
    const tabla = useTablaOperativos(operativos);
    return (
      <PanelOperativos
        titulo="Operativos"
        tabla={tabla}
        columnas={COLUMNAS_LISTADO}
        mensajeVacio="Nada"
        acciones={() => null}
        accionesFilaPatrulla={() => null}
        porRetirar={null}
        onConfirmarRetiro={async () => undefined}
        onCancelarRetiro={() => undefined}
        onVerOperativo={verDetalle}
      />
    );
  };

  it("si el operativo compartido está en otra página, la tabla salta a ella, lo centra y lo hace destellar", async () => {
    const centrar = vi.fn();
    Element.prototype.scrollIntoView = centrar;
    const verDetalle = vi.fn();
    // El invitado primero; diez operativos de relleno empujan al anfitrión a la página 2.
    const relleno = Array.from({ length: 10 }, (_, indice) =>
      operativo({ id: 100 + indice, identificador: `OCF-${100 + indice}`, notas: [] }),
    );
    const operativos = [
      operativo({ notas: [COMPARTIDA] }),
      ...relleno,
      operativo({ id: 61, identificador: "OCPMO-001-20-OCT-2026", notas: [] }),
    ];
    render(<Panel operativos={operativos} verDetalle={verDetalle} />);

    expect(document.querySelector('[data-operativo-id="61"]')).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: /Ir al operativo OCPMO-001-20-OCT-2026/ }),
    );

    const fila = document.querySelector('[data-operativo-id="61"]');
    expect(fila).not.toBeNull();
    expect(fila).toHaveClass("app-fila-destello");
    expect(centrar).toHaveBeenCalledWith(expect.objectContaining({ block: "center" }));
    expect(verDetalle).not.toHaveBeenCalled();
  });

  it("si el operativo compartido no está en la tabla, abre su detalle", async () => {
    const verDetalle = vi.fn();
    render(<Panel operativos={[operativo({ notas: [COMPARTIDA] })]} verDetalle={verDetalle} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Ir al operativo OCPMO-001-20-OCT-2026/ }),
    );
    expect(verDetalle).toHaveBeenCalledWith(61);
  });
});

describe("columna Formulario compacta (P-02)", () => {
  it("el punto de color y «N · CÓDIGO» en una línea; el nombre completo, en el tooltip", () => {
    render(<TablaOperativos operativos={[operativo()]} columnas={COLUMNAS_LISTADO} />);

    const formulario = screen.getByLabelText("Formulario 2. CONTROL DE PUNTO DE MANDO OPERATIVO (PMO)");
    expect(formulario).toHaveTextContent("2 · PMO");
    expect(formulario).toHaveClass("whitespace-nowrap");
    expect(formulario).toHaveAccessibleDescription("2. CONTROL DE PUNTO DE MANDO OPERATIVO (PMO)");
  });

  it("el filtro busca por número, código o nombre", () => {
    expect(coincideConFiltros(operativo(), { formulario: "pmo" })).toBe(true);
    expect(coincideConFiltros(operativo(), { formulario: "punto de mando" })).toBe(true);
    expect(coincideConFiltros(operativo(), { formulario: "2" })).toBe(true);
    expect(coincideConFiltros(operativo(), { formulario: "FIJOS" })).toBe(false);
  });
});
