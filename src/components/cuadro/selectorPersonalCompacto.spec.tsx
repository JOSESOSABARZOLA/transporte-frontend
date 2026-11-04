/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: selectorPersonalCompacto.spec.tsx
 * Responsabilidad: Verificar la LISTA COMPACTA de asignados del cajón de edición (P-02, Fase C).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ SE PRUEBA. La variante `listaCompacta` de `SelectorPersonal` es la que ve el cajón de
 * edición de P-02: una lista de una columna, con el guardado inmediato dicho en palabras, el
 * distintivo de carga tomado de los candidatos, «Cambiar turno» en línea y «Quitar». Se prueban
 * las DECISIONES —qué llama al servidor y con qué—, no el maquetado.
 *
 * NO SE PRUEBA P-01 aquí: su bandeja de distintivos y sus dos columnas de horario viven en
 * `registro.spec`. Esta variante es un añadido por propiedad y no las toca.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

import SelectorPersonal, { type PersonaAgregada } from "./SelectorPersonal.tsx";
import { resumenCajon } from "../../pruebas/resumenCajon.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import { toast } from "../../utils/mensaje.ts";

/** Dos de Instrucción: la primera ya asignada, la segunda disponible y sugerida. */
const CANDIDATOS: PersonaElegible[] = [
  {
    id: 1,
    apellidos: "YUNDA",
    nombres: "JESSICA",
    area: "INSTRUCCION",
    cargo: "Instructora",
    elegible: true,
    motivo: null,
    nivelFatiga: "VERDE",
    nivelCarga: "VERDE",
    sugerido: true,
  },
  {
    id: 2,
    apellidos: "BAUTISTA",
    nombres: "LUIS",
    area: "INSTRUCCION",
    cargo: "Inspector",
    elegible: true,
    motivo: null,
    nivelFatiga: "AMBAR",
    nivelCarga: "AMBAR",
    sugerido: true,
  },
];

const AGREGADAS: PersonaAgregada[] = [
  {
    funcionarioId: 1,
    nombre: "YUNDA JESSICA",
    telefono: null,
    horaInicio: "08:00",
    horaFin: "16:00",
  },
];

const HORAS = ["08:00", "08:30", "14:00", "14:30"];

const pintar = (
  props: Partial<ComponentProps<typeof SelectorPersonal>> = {},
) =>
  render(
    <SelectorPersonal
      candidatos={CANDIDATOS}
      cargando={false}
      agregadas={AGREGADAS}
      onAgregar={vi.fn()}
      onRetirar={vi.fn()}
      deshabilitado={false}
      avisoRechazo={null}
      listaCompacta
      conGuardarCambios
      onCambiarHorario={vi.fn()}
      horasHorario={HORAS}
      {...props}
    />,
  );

describe("SelectorPersonal · lista compacta (P-02)", () => {
  it("cuenta los efectivos y no promete guardar al instante: todo espera a «Guardar cambios»", () => {
    pintar();

    expect(screen.getByText("1 de 2 efectivos")).toBeInTheDocument();
    // Desde el 2026-10-29 ningún cajón guarda al instante (aporte simple y patrulla incluidos).
    expect(screen.queryByText(/Se guarda al instante/)).toBeNull();
    // El distintivo de carga va en la tarjeta del disponible (BAUTISTA, AMBAR).
    expect(screen.getByText("Carga Media")).toBeInTheDocument();
  });

  it("el botón de lista se rotula «Completar con N de menor carga» (no «N sugeridos»)", () => {
    pintar();

    // Solo BAUTISTA (id 2) queda disponible y es elegible: el botón agrega a los elegibles visibles,
    // no solo a los marcados «Sugerido», así que se rotula por lo que de verdad hace.
    expect(
      screen.getByRole("button", { name: "Completar con 1 de menor carga" }),
    ).toBeInTheDocument();
  });

  it("el contador único cambia de color según haya personal o no", () => {
    // Con gente: verde (text-success).
    const { unmount } = pintar();
    expect(screen.getByText("1 de 2 efectivos")).toHaveClass("text-success");
    unmount();

    // Sin gente: naranja (text-warning) y «0 de N efectivos».
    pintar({ agregadas: [] });
    const vacio = screen.getByText("0 de 2 efectivos");
    expect(vacio).toHaveClass("text-warning");
  });

  it("«Quitar todos» pide confirmación y retira a todos al confirmar", async () => {
    const onRetirar = vi.fn();
    // Con una sola persona basta su «✕»: «Quitar todos» aparece desde dos.
    pintar({
      onRetirar,
      agregadas: [
        ...AGREGADAS,
        {
          funcionarioId: 2,
          nombre: "BAUTISTA LUIS",
          telefono: null,
          horaInicio: "08:00",
          horaFin: "16:00",
        },
      ],
    });

    // Abre la confirmación (no retira todavía).
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar todos (2)" }),
    );
    expect(onRetirar).not.toHaveBeenCalled();
    expect(
      screen.getByText(/¿Quitar a los 2 asignados\?/),
    ).toBeInTheDocument();

    // Confirmar retira a cada asignado.
    await userEvent.click(screen.getByRole("button", { name: "Quitar todos" }));
    expect(onRetirar).toHaveBeenCalledWith(1);
    expect(onRetirar).toHaveBeenCalledWith(2);
  });

  it("el horario de cada seleccionado se edita en línea, sin «Cambiar turno»", () => {
    const onCambiarHorario = vi.fn();
    pintar({ onCambiarHorario });

    expect(screen.queryByRole("button", { name: "Cambiar turno" })).toBeNull();
    const fin = screen.getByLabelText("Hora de fin de YUNDA JESSICA");
    expect(fin).toHaveValue("16:00");
    fireEvent.change(fin, { target: { value: "14:30" } });
    expect(onCambiarHorario).toHaveBeenCalledWith(1, "08:00", "14:30");
  });

  it("«✕» retira a la persona", async () => {
    const usuario = userEvent.setup();
    const onRetirar = vi.fn();
    pintar({ onRetirar });

    await usuario.click(
      screen.getByRole("button", { name: "Retirar a YUNDA JESSICA" }),
    );

    expect(onRetirar).toHaveBeenCalledWith(1);
  });

  it("sin `onCambiarHorario` no hay campos de hora, pero sí el «✕»", () => {
    pintar({ onCambiarHorario: undefined });

    expect(screen.queryByLabelText("Hora de inicio de YUNDA JESSICA")).toBeNull();
    const lista = screen.getByRole("list");
    expect(
      within(lista).getByRole("button", { name: "Retirar a YUNDA JESSICA" }),
    ).toBeInTheDocument();
  });

  it("en el cajón, «Ver reparto de carga» abre una VISTA (no un drawer) con «← Volver al operativo»", async () => {
    const usuario = userEvent.setup();
    // Con señales de carga aparece el botón del reparto.
    const conCarga: PersonaElegible[] = CANDIDATOS.map((persona, indice) => ({
      ...persona,
      indiceCarga: indice === 0 ? 20 : 5,
      cuotaJusta: 12,
      desviacionCarga: indice === 0 ? 8 : -7,
      nivelEquidad: indice === 0 ? "ENCIMA" : "DEBAJO",
    }));
    pintar({ candidatos: conCarga, repartoEnCajon: true });

    await usuario.click(
      screen.getByRole("button", { name: "Ver reparto de carga" }),
    );

    // Es una VISTA dentro del cajón, no un diálogo aparte.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Cuota justa")).toBeInTheDocument();
    const volver = screen.getByRole("button", {
      name: "Volver al operativo",
    });

    // «← Volver» regresa al selector (reaparece su buscador).
    await usuario.click(volver);
    expect(
      screen.getByPlaceholderText(/Buscar por apellido/),
    ).toBeInTheDocument();
  });

  it("muestra los candidatos en grilla de 2 columnas (md:grid-cols-2)", () => {
    const { container } = pintar();
    expect(container.querySelector(".md\\:grid-cols-2")).not.toBeNull();
  });

  it("oculta las pestañas de unidad cuando todo el personal es de la misma unidad", () => {
    // Los dos candidatos son de INSTRUCCION: una sola unidad, así que no hay pestañas.
    pintar();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("muestra las pestañas de unidad cuando hay más de una", () => {
    const dosUnidades: PersonaElegible[] = [
      { ...CANDIDATOS[1] },
      {
        id: 3,
        apellidos: "RIVERA",
        nombres: "ANA",
        area: "OPERATIVOS",
        cargo: "Agente",
        elegible: true,
        motivo: null,
      },
    ];
    pintar({ candidatos: dosUnidades, agregadas: [] });
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(1);
  });

  it("P-01: el botón «Ver reparto de carga» abre el drawer del reparto y lo anuncia (aria-expanded)", async () => {
    const usuario = userEvent.setup();
    const conCarga: PersonaElegible[] = CANDIDATOS.map((persona, indice) => ({
      ...persona,
      indiceCarga: indice === 0 ? 20 : 5,
      cuotaJusta: 12,
      nivelEquidad: indice === 0 ? "ENCIMA" : "DEBAJO",
    }));
    pintar({
      candidatos: conCarga,
      repartoEnCajon: false,
      horarioInline: true,
      conGuardarCambios: false,
    });

    const boton = screen.getByRole("button", { name: "Ver reparto de carga" });
    expect(boton).toHaveAttribute("aria-haspopup", "dialog");
    expect(boton).toHaveAttribute("aria-expanded", "false");
    // El resumen sale de los mismos datos del reparto: 1 baja (VERDE) y 1 media (AMBAR).
    expect(boton).toHaveAccessibleDescription(
      "Carga Baja: 1; Carga Media: 1; Carga Alta: 0.",
    );

    await usuario.click(boton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cuota justa")).toBeInTheDocument();
    expect(boton).toHaveAttribute("aria-expanded", "true");
    // La estructura del cajón estándar (R10): ancho, cabecera, secciones y pie.
    expect(resumenCajon(screen.getByRole("dialog"))).toMatchSnapshot();
  });

  it("al cerrar el reparto (P-01) el foco vuelve al botón «Ver reparto de carga»", async () => {
    const usuario = userEvent.setup();
    const conCarga: PersonaElegible[] = CANDIDATOS.map((persona, indice) => ({
      ...persona,
      indiceCarga: indice === 0 ? 20 : 5,
      cuotaJusta: 12,
      nivelEquidad: indice === 0 ? "ENCIMA" : "DEBAJO",
    }));
    // Alta de P-01: fuera del cajón, el reparto abre en DrawerLateral con «Listo».
    pintar({
      candidatos: conCarga,
      repartoEnCajon: false,
      horarioInline: true,
      conGuardarCambios: false,
    });

    const boton = screen.getByRole("button", { name: "Ver reparto de carga" });
    await usuario.click(boton);
    // Se cierra con «Listo»; el foco vuelve al botón (usePanelAccesible lo devuelve).
    await usuario.click(screen.getByRole("button", { name: "Listo" }));
    expect(document.activeElement).toBe(boton);
  });
});

describe("SelectorPersonal · carga por OPERATIVOS de la semana (2026-10-30)", () => {
  /** Los seis de la Unidad de Operativos del 30-oct, como los devuelve ya el servidor. */
  const op = (
    id: number,
    apellidos: string,
    nombres: string,
    operativos: number,
    indiceCarga: number,
    sugerido = false,
  ): PersonaElegible => ({
    id,
    apellidos,
    nombres,
    area: "OPERATIVOS",
    cargo: "Agente",
    elegible: true,
    motivo: null,
    operativosAsignados: operativos,
    indiceCarga,
    nivelFatiga: "ROJO",
    nivelCarga: operativos >= 3 ? "ROJO" : operativos >= 2 ? "AMBAR" : "VERDE",
    sugerido,
  });
  const BAUTISTA = op(161, "BAUTISTA", "JOAN", 2, 16.5, true);
  const BOLANOS = op(162, "BOLANOS", "JHON", 2, 16.5, true);
  const AGUIRRE = op(221, "AGUIRRE", "FLAVIO", 2, 17, true);
  const VELASQUEZ = op(176, "VELASQUEZ", "CHRISTIAN", 3, 25);
  const ABAD = op(224, "ABAD", "VERONICA", 3, 25.5);
  const YUNDA = op(193, "YUNDA", "JESSICA", 4, 38);
  const SEIS = [YUNDA, ABAD, VELASQUEZ, AGUIRRE, BOLANOS, BAUTISTA];

  const pintarSeis = (props: Partial<ComponentProps<typeof SelectorPersonal>> = {}) =>
    pintar({ candidatos: SEIS, agregadas: [], ...props });

  /** La tarjeta de un disponible (lleva el nombre en su `title`). */
  const tarjetaDe = (nombre: string) =>
    screen.getByTitle(nombre).parentElement?.parentElement as HTMLElement;
  const agregarDe = (nombre: string) =>
    within(tarjetaDe(nombre)).getByRole("button", { name: /^\+ (Agregar|Asignar)$/ });

  it("la etiqueta coincide con «N op. esta semana»: 2 op. Media y Sugerido; 3 o más, Alta", () => {
    pintarSeis();

    for (const nombre of ["BAUTISTA JOAN", "BOLANOS JHON", "AGUIRRE FLAVIO"]) {
      const tarjeta = tarjetaDe(nombre);
      expect(within(tarjeta).getByText("Carga Media")).toBeInTheDocument();
      expect(within(tarjeta).getByText("Sugerido")).toBeInTheDocument();
      expect(within(tarjeta).getByText(/2 op\. esta semana/)).toBeInTheDocument();
    }
    for (const nombre of ["VELASQUEZ CHRISTIAN", "ABAD VERONICA", "YUNDA JESSICA"]) {
      const tarjeta = tarjetaDe(nombre);
      expect(within(tarjeta).getByText("Carga Alta")).toBeInTheDocument();
      expect(within(tarjeta).queryByText("Sugerido")).toBeNull();
    }
  });

  it("el contador de «Ver reparto de carga» cuenta por operativos: 0/3/3", () => {
    pintarSeis();

    expect(
      screen.getByText("Carga Baja: 0; Carga Media: 3; Carga Alta: 3."),
    ).toBeInTheDocument();
  });

  it("orden: nivel → operativos → índice → apellido", () => {
    pintarSeis();

    const nombres = screen
      .getAllByTitle(/^(BAUTISTA|BOLANOS|AGUIRRE|VELASQUEZ|ABAD|YUNDA) /)
      .map((nodo) => nodo.getAttribute("title"));
    expect(nombres).toEqual([
      "BAUTISTA JOAN",
      "BOLANOS JHON",
      "AGUIRRE FLAVIO",
      "VELASQUEZ CHRISTIAN",
      "ABAD VERONICA",
      "YUNDA JESSICA",
    ]);
  });

  it("con Carga Media se agrega directo, sin modal", async () => {
    const usuario = userEvent.setup();
    const onAgregar = vi.fn();
    pintarSeis({ onAgregar });

    await usuario.click(agregarDe("BAUTISTA JOAN"));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onAgregar).toHaveBeenCalledWith(BAUTISTA);
  });

  it("con Carga Alta abre el modal y no agrega; lista a Bautista, Bolaños y Aguirre con su etiqueta", async () => {
    const usuario = userEvent.setup();
    const onAgregar = vi.fn();
    pintarSeis({ onAgregar });

    await usuario.click(agregarDe("VELASQUEZ CHRISTIAN"));

    const modal = screen.getByRole("alertdialog", {
      name: "VELASQUEZ CHRISTIAN tiene carga alta",
    });
    expect(onAgregar).not.toHaveBeenCalled();
    expect(
      within(modal).getByText(
        "Ya tiene 3 operativos esta semana. Considere repartir con quien tenga menos carga.",
      ),
    ).toBeInTheDocument();
    const lista = within(modal).getByRole("list", { name: "Con menos carga" });
    const filas = within(lista).getAllByRole("listitem");
    expect(filas.map((fila) => within(fila).getByTitle(/./).getAttribute("title"))).toEqual([
      "BAUTISTA JOAN",
      "BOLANOS JHON",
      "AGUIRRE FLAVIO",
    ]);
    for (const fila of filas) {
      expect(within(fila).getByText("Carga Media")).toBeInTheDocument();
      expect(within(fila).getByText("2 op. esta semana")).toBeInTheDocument();
    }
    expect(within(modal).getByRole("button", { name: "Agregar igual" })).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("«Elegir» agrega a esa persona en su lugar", async () => {
    const usuario = userEvent.setup();
    const onAgregar = vi.fn();
    pintarSeis({ onAgregar });

    await usuario.click(agregarDe("VELASQUEZ CHRISTIAN"));
    await usuario.click(screen.getByRole("button", { name: "Elegir a BOLANOS JHON" }));

    expect(onAgregar).toHaveBeenCalledTimes(1);
    expect(onAgregar).toHaveBeenCalledWith(BOLANOS);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("«Agregar igual» agrega a la persona elegida", async () => {
    const usuario = userEvent.setup();
    const onAgregar = vi.fn();
    pintarSeis({ onAgregar });

    await usuario.click(agregarDe("VELASQUEZ CHRISTIAN"));
    await usuario.click(screen.getByRole("button", { name: "Agregar igual" }));

    expect(onAgregar).toHaveBeenCalledTimes(1);
    expect(onAgregar).toHaveBeenCalledWith(VELASQUEZ);
  });

  it("Cancelar, Escape o el velo no agregan a nadie", async () => {
    const usuario = userEvent.setup();
    const onAgregar = vi.fn();
    pintarSeis({ onAgregar });

    await usuario.click(agregarDe("YUNDA JESSICA"));
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await usuario.click(agregarDe("YUNDA JESSICA"));
    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await usuario.click(agregarDe("YUNDA JESSICA"));
    fireEvent.click(document.querySelector("[data-velo-mensaje]") as Element);
    expect(screen.queryByRole("alertdialog")).toBeNull();

    expect(onAgregar).not.toHaveBeenCalled();
  });

  it("todos en Alta: nadie Sugerido y el modal sin lista (solo «Agregar igual» y «Cancelar»)", async () => {
    const usuario = userEvent.setup();
    pintar({ candidatos: [VELASQUEZ, ABAD, YUNDA], agregadas: [] });

    expect(screen.queryByText("Sugerido")).toBeNull();

    await usuario.click(agregarDe("ABAD VERONICA"));

    const modal = screen.getByRole("alertdialog");
    expect(within(modal).queryByRole("list")).toBeNull();
    expect(within(modal).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Agregar igual",
      "Cancelar",
    ]);
  });

  it("«Completar con N de menor carga» no abre el modal", async () => {
    const usuario = userEvent.setup();
    const onAgregar = vi.fn();
    pintar({ candidatos: [VELASQUEZ], agregadas: [], onAgregar });

    await usuario.click(screen.getByRole("button", { name: "Completar con 1 de menor carga" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onAgregar).toHaveBeenCalledWith(VELASQUEZ);
  });

  it("ya no sale el aviso breve (Toast) de carga alta", async () => {
    const usuario = userEvent.setup();
    const info = vi.spyOn(toast, "info");
    pintarSeis();

    await usuario.click(agregarDe("VELASQUEZ CHRISTIAN"));
    await usuario.click(screen.getByRole("button", { name: "Agregar igual" }));

    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
});
