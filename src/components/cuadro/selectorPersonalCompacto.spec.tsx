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

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

import SelectorPersonal, { type PersonaAgregada } from "./SelectorPersonal.tsx";
import type { PersonaElegible } from "../../interfaces/Personal.ts";

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
      guardadoInmediato
      onCambiarHorario={vi.fn()}
      horasHorario={HORAS}
      {...props}
    />,
  );

describe("SelectorPersonal · lista compacta (P-02)", () => {
  it("cuenta los efectivos y avisa del guardado inmediato", () => {
    pintar();

    expect(screen.getByText("1 de 2 efectivos")).toBeInTheDocument();
    expect(screen.getByText(/Se guarda al instante/)).toBeInTheDocument();
    // El distintivo de carga y «Sugerido» salen de los candidatos por id.
    expect(screen.getByText("Carga baja")).toBeInTheDocument();
  });

  it("sin guardado inmediato (adicional) NO promete «Se guarda al instante»", () => {
    pintar({ guardadoInmediato: false });

    expect(screen.getByText("1 de 2 efectivos")).toBeInTheDocument();
    expect(screen.queryByText(/Se guarda al instante/)).toBeNull();
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
    pintar({ onRetirar });

    // Abre la confirmación (no retira todavía).
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar todos (1)" }),
    );
    expect(onRetirar).not.toHaveBeenCalled();
    expect(
      screen.getByText(/¿Quitar a los 1 asignados\?/),
    ).toBeInTheDocument();

    // Confirmar retira a cada asignado.
    await userEvent.click(screen.getByRole("button", { name: "Quitar todos" }));
    expect(onRetirar).toHaveBeenCalledWith(1);
  });

  it("«Cambiar turno» despliega las horas y «Guardar turno» las envía", async () => {
    const usuario = userEvent.setup();
    const onCambiarHorario = vi.fn();
    pintar({ onCambiarHorario });

    // Antes de abrir, no hay campos de hora.
    expect(
      screen.queryByLabelText("Hora de inicio de YUNDA JESSICA"),
    ).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Cambiar turno" }));

    const inicio = screen.getByLabelText("Hora de inicio de YUNDA JESSICA");
    const fin = screen.getByLabelText("Hora de fin de YUNDA JESSICA");
    // Arrancan sembrados con el turno actual.
    expect(inicio).toHaveValue("08:00");
    expect(fin).toHaveValue("16:00");

    await usuario.clear(inicio);
    await usuario.type(inicio, "14:00");
    await usuario.clear(fin);
    await usuario.type(fin, "14:30");

    await usuario.click(screen.getByRole("button", { name: "Guardar turno" }));

    // Una sola llamada al servidor, con las dos horas nuevas.
    expect(onCambiarHorario).toHaveBeenCalledTimes(1);
    expect(onCambiarHorario).toHaveBeenCalledWith(1, "14:00", "14:30");
    // El editor se cierra al guardar.
    expect(
      screen.queryByRole("button", { name: "Guardar turno" }),
    ).toBeNull();
  });

  it("«Guardar turno» se apaga si falta alguna de las dos horas", async () => {
    const usuario = userEvent.setup();
    pintar();

    await usuario.click(screen.getByRole("button", { name: "Cambiar turno" }));
    await usuario.clear(screen.getByLabelText("Hora de fin de YUNDA JESSICA"));

    expect(screen.getByRole("button", { name: "Guardar turno" })).toBeDisabled();
  });

  it("«Quitar» retira a la persona", async () => {
    const usuario = userEvent.setup();
    const onRetirar = vi.fn();
    pintar({ onRetirar });

    await usuario.click(
      screen.getByRole("button", { name: "Quitar a YUNDA JESSICA" }),
    );

    expect(onRetirar).toHaveBeenCalledWith(1);
  });

  it("sin `onCambiarHorario` no ofrece cambiar el turno, pero sí quitar", () => {
    pintar({ onCambiarHorario: undefined });

    expect(
      screen.queryByRole("button", { name: "Cambiar turno" }),
    ).toBeNull();
    const lista = screen.getByRole("list");
    expect(
      within(lista).getByRole("button", { name: "Quitar a YUNDA JESSICA" }),
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
      name: "← Volver al operativo",
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
      guardadoInmediato: false,
    });

    const boton = screen.getByRole("button", { name: "Ver reparto de carga" });
    expect(boton).toHaveAttribute("aria-haspopup", "dialog");
    expect(boton).toHaveAttribute("aria-expanded", "false");
    // El resumen sale de los mismos datos del reparto: 1 baja (VERDE) y 1 media (AMBAR).
    expect(boton).toHaveAccessibleDescription(
      "Carga baja: 1; media: 1; alta: 0.",
    );

    await usuario.click(boton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cuota justa")).toBeInTheDocument();
    expect(boton).toHaveAttribute("aria-expanded", "true");
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
      guardadoInmediato: false,
    });

    const boton = screen.getByRole("button", { name: "Ver reparto de carga" });
    await usuario.click(boton);
    // Se cierra con «Listo»; el foco vuelve al botón (usePanelAccesible lo devuelve).
    await usuario.click(screen.getByRole("button", { name: "Listo" }));
    expect(document.activeElement).toBe(boton);
  });
});
