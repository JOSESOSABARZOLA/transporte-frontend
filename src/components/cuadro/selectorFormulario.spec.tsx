/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: selectorFormulario.spec.tsx
 * Responsabilidad: Fijar las decisiones del selector de formulario de P-01 (2026-10-16): qué se
 *                  ofrece, cómo se busca y agrupa, el aporte, el teclado y los recientes.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUSTITUYE A LAS PRUEBAS DE LA REJILLA DE BOTONES de `registro.spec.tsx` («caso 1», «el formulario
 * compartido se abre aquí» y «el aporte no pinta un formulario de alta vacío»), y conserva sus
 * decisiones: solo se ofrece lo que el rol registra o a lo que aporta (`LECTURA` no se pinta, 24-AGO);
 * el compartido se ve con «Aporta personal» y abre el formulario aquí (25 y 31-AGO); sin manejador de
 * aporte queda apagado; y quien no registra recibe una explicación, no una lista vacía.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import SelectorFormulario from "./SelectorFormulario.tsx";
import type { AccesoFormulario, Formulario } from "../../interfaces/Formulario.ts";
import type { RolDepartamental } from "../../config/env.ts";
import {
  agruparPorDueno,
  anotarReciente,
  avisoDeOfrecidos,
  filtrarFormularios,
  leerRecientes,
  lineaDeAyuda,
  recientesVisibles,
} from "../../utils/selectorFormulario.util.ts";

/** Un `Formulario` completo, sin `as`: si le falta o le sobra un campo, no compila. */
const formulario = (
  numero: number,
  codigo: string,
  acceso: AccesoFormulario,
  nombre = `FORMULARIO ${numero}`,
  rolDueno: RolDepartamental = "DMIP_OPERATIVOS",
): Formulario => ({
  id: numero,
  numero,
  codigo,
  nombre,
  colorFondo: "#2e7d32",
  colorAcento: "#000000",
  colorNombre: "verde",
  rolDueno,
  roles: [{ rol: rolDueno, acceso: "ESCRITURA", cupo: null }],
  politicaVehiculo: "NO_APLICA",
  condicionanteNocturno: false,
  esPatrulla: false,
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  orden: numero,
  areas: [{ area: "OPERATIVOS", esCompartida: false }],
  acceso,
});

const LISTA = [
  formulario(1, "OCF", "ESCRITURA", "OPERATIVOS DE CONTROL FIJOS"),
  formulario(2, "PMO", "ESCRITURA", "CONTROL DE PUNTO DE MANDO OPERATIVO"),
  formulario(5, "UIG", "LECTURA", "PATRULLA ECU DIURNA (UIG - UIT)", "DMIP_INSPECCIONES"),
  formulario(7, "OCA", "ESCRITURA", "OPERATIVOS DMIT/UO", "DMIT_INSTRUCTOR"),
  formulario(8, "INS", "ESCRITURA", "INSPECCIONES TÉCNICAS Y GENERALES", "DMIP_INSPECCIONES"),
  formulario(6, "REACN", "COMPARTIDO", "PATRULLA REACCIÓN NOCTURNA", "DMIP_INSPECCIONES"),
];

const abrir = async () => {
  await userEvent.click(screen.getByRole("button", { name: /^Formulario/ }));
  return screen.getByRole("listbox", { name: "Formularios" });
};

afterEach(() => {
  window.localStorage.clear();
});

describe("el selector de formulario de P-01", () => {
  it("la caja muestra el elegido con su número, su nombre y su «N hoy»", () => {
    render(
      <SelectorFormulario
        formularios={LISTA}
        seleccionado="PMO"
        onSeleccionar={vi.fn()}
        conteos={new Map([[2, 3]])}
      />,
    );

    const caja = screen.getByRole("button", { name: /^Formulario/ });
    expect(caja).toHaveTextContent("2. CONTROL DE PUNTO DE MANDO OPERATIVO");
    expect(caja).toHaveTextContent("3 hoy");
  });

  it("agrupa por departamento dueño y ofrece solo lo que el rol registra o a lo que aporta", async () => {
    render(<SelectorFormulario formularios={LISTA} seleccionado="OCF" onSeleccionar={vi.fn()} />);

    const lista = await abrir();
    const grupos = within(lista).getAllByRole("group");
    // En el orden en que aparece el primero de cada dueño: Operativos (1, 2), DMIT (7), Inspecciones (8, 6).
    expect(grupos.map((grupo) => within(grupo).getAllByRole("option").length)).toEqual([2, 1, 2]);
    expect(within(lista).getByRole("group", { name: "DMIP · Unidad de Operativos" })).toBeInTheDocument();
    expect(
      within(lista).getByRole("group", { name: "DMIP · Inspecciones Técnicas y Generales" }),
    ).toBeInTheDocument();
    expect(within(lista).getByRole("group", { name: "DMIT · Instrucción" })).toBeInTheDocument();
    // LECTURA no se pinta (criterio del 24-AGO).
    expect(within(lista).queryByRole("option", { name: /UIG - UIT/ })).toBeNull();
    // El elegido va marcado.
    expect(within(lista).getByRole("option", { name: /CONTROL FIJOS/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("busca por número, nombre o código sin tildes ni mayúsculas", async () => {
    render(<SelectorFormulario formularios={LISTA} seleccionado="OCF" onSeleccionar={vi.fn()} />);
    const lista = await abrir();
    const buscador = screen.getByRole("combobox", { name: /Buscar formulario/ });

    await userEvent.type(buscador, "inspecciones tecnicas");
    expect(within(lista).getAllByRole("option")).toHaveLength(1);
    expect(within(lista).getByRole("option", { name: /INSPECCIONES TÉCNICAS/ })).toBeInTheDocument();

    await userEvent.clear(buscador);
    await userEvent.type(buscador, "reacn");
    expect(within(lista).getByRole("option", { name: /REACCIÓN NOCTURNA/ })).toBeInTheDocument();

    await userEvent.clear(buscador);
    await userEvent.type(buscador, "7");
    expect(within(lista).getByRole("option", { name: /DMIT\/UO/ })).toBeInTheDocument();

    await userEvent.clear(buscador);
    await userEvent.type(buscador, "zzz");
    expect(within(lista).queryAllByRole("option")).toHaveLength(0);
    expect(within(lista).getByText("Sin formularios con ese texto.")).toBeInTheDocument();
  });

  it("elegir uno propio avisa con su código y cierra la lista", async () => {
    const elegir = vi.fn();
    render(<SelectorFormulario formularios={LISTA} seleccionado="OCF" onSeleccionar={elegir} />);
    const lista = await abrir();

    await userEvent.click(within(lista).getByRole("option", { name: /PUNTO DE MANDO/ }));

    expect(elegir).toHaveBeenCalledWith("PMO");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("el compartido dice que aporta personal y lleva a aportar, no a registrar", async () => {
    const elegir = vi.fn();
    const aportar = vi.fn();
    render(
      <SelectorFormulario
        formularios={LISTA}
        seleccionado="OCF"
        onSeleccionar={elegir}
        onAportar={aportar}
      />,
    );
    const lista = await abrir();
    const compartido = within(lista).getByRole("option", { name: /REACCIÓN NOCTURNA/ });

    expect(compartido).toHaveTextContent("Aporta personal");
    expect(compartido).toHaveAttribute("title", expect.stringContaining("aporta personal"));
    // El distintivo lo lleva solo el que de verdad aporta.
    expect(within(lista).getAllByText("Aporta personal")).toHaveLength(1);

    await userEvent.click(compartido);
    expect(aportar).toHaveBeenCalledWith("REACN");
    expect(elegir).not.toHaveBeenCalled();
  });

  it("sin manejador de aporte, el compartido queda apagado", async () => {
    const elegir = vi.fn();
    render(<SelectorFormulario formularios={LISTA} seleccionado="OCF" onSeleccionar={elegir} />);
    const lista = await abrir();
    const compartido = within(lista).getByRole("option", { name: /REACCIÓN NOCTURNA/ });

    expect(compartido).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(compartido);
    expect(elegir).not.toHaveBeenCalled();
  });

  it("se maneja con el teclado y Escape devuelve el foco a la caja", async () => {
    const elegir = vi.fn();
    render(<SelectorFormulario formularios={LISTA} seleccionado="OCF" onSeleccionar={elegir} />);
    const caja = screen.getByRole("button", { name: /^Formulario/ });

    caja.focus();
    await userEvent.keyboard("{ArrowDown}");
    const buscador = screen.getByRole("combobox", { name: /Buscar formulario/ });
    expect(buscador).toHaveFocus();
    // Arranca en el elegido (OCF); ↓ pasa al siguiente del grupo (PMO) y Enter lo elige.
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(elegir).toHaveBeenCalledWith("PMO");
    expect(caja).toHaveFocus();

    await userEvent.click(caja);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(caja).toHaveFocus();
  });

  it("los recientes se pintan como fichas «N · CÓDIGO» y cambian al pulsarlos", async () => {
    const elegir = vi.fn();
    render(
      <SelectorFormulario
        formularios={LISTA}
        seleccionado="OCF"
        onSeleccionar={elegir}
        recientes={[LISTA[1], LISTA[3]]}
      />,
    );

    const recientes = screen.getByRole("group", { name: "Formularios recientes" });
    await userEvent.click(within(recientes).getByRole("button", { name: "7 · OCA" }));
    expect(elegir).toHaveBeenCalledWith("OCA");
  });

  it("sin nada que ofrecer no pinta la caja; la página lo explica", () => {
    const { container } = render(
      <SelectorFormulario
        formularios={[formulario(5, "UIG", "LECTURA")]}
        seleccionado={null}
        onSeleccionar={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("reglas puras del selector (selectorFormulario.util)", () => {
  it("la búsqueda vacía devuelve todos y los grupos siguen el orden del servidor", () => {
    expect(filtrarFormularios(LISTA, "  ")).toHaveLength(LISTA.length);
    expect(agruparPorDueno(LISTA).map((grupo) => grupo.dueno)).toEqual([
      "DMIP_OPERATIVOS",
      "DMIP_INSPECCIONES",
      "DMIT_INSTRUCTOR",
    ]);
  });

  it("los recientes: como mucho tres, sin el actual y solo los que el rol aún puede abrir", () => {
    const ofrecidos = LISTA.filter((uno) => uno.acceso !== "LECTURA");
    expect(recientesVisibles([1, 2, 7, 8, 6], ofrecidos, 1).map((uno) => uno.codigo)).toEqual([
      "PMO",
      "OCA",
      "INS",
    ]);
    // 5 es de LECTURA y 99 ya no existe: no se pintan.
    expect(recientesVisibles([5, 99, 2], ofrecidos, null).map((uno) => uno.codigo)).toEqual([
      "PMO",
    ]);
  });

  it("los recientes se guardan por usuario y SOLO con identificadores", () => {
    let lista = anotarReciente(14, [], 1);
    lista = anotarReciente(14, lista, 2);
    lista = anotarReciente(14, lista, 1);
    expect(lista).toEqual([1, 2]);
    expect(leerRecientes(14)).toEqual([1, 2]);
    expect(window.localStorage.getItem("sigoc.cuadro.recientes.v1.14")).toBe("[1,2]");
    // Otro usuario no ve los del primero.
    expect(leerRecientes(15)).toEqual([]);
    // Un valor dañado no rompe la pantalla.
    window.localStorage.setItem("sigoc.cuadro.recientes.v1.14", "{no es json");
    expect(leerRecientes(14)).toEqual([]);
  });

  it("explica la lista vacía y el perfil que solo aporta", () => {
    expect(avisoDeOfrecidos([formulario(5, "UIG", "LECTURA")])).toMatch(
      /no registra operativos en ningún formulario/,
    );
    expect(avisoDeOfrecidos([formulario(6, "REACN", "COMPARTIDO")])).toMatch(
      /no registra operativos, pero aporta personal/,
    );
    expect(avisoDeOfrecidos(LISTA)).toBeNull();
  });

  it("la línea de ayuda solo dice lo que el formulario declara", () => {
    expect(lineaDeAyuda(LISTA[0])).toEqual([]);
    expect(
      lineaDeAyuda({
        ...LISTA[0],
        condicionanteNocturno: true,
        politicaVehiculo: "REQUERIDO",
        tipoTransportePorDefecto: "INICIO_Y_FIN",
      }),
    ).toEqual([
      "Este formulario exige conductor si el horario entra en la franja nocturna. La DAF lo asignará antes del cierre.",
      "Este formulario siempre requiere vehículo.",
      "Transporte sugerido: Dejar y retirar.",
    ]);
  });
});
