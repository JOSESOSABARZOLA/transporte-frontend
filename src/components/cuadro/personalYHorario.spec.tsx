/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: personalYHorario.spec.tsx
 * Responsabilidad: Verificar la tarjeta «Personal y horario» del rediseño del registro (bloque 3).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ SE PRUEBA (spec §10, Personal y Seleccionados). Las DECISIONES de la tarjeta que comparten el
 * alta de P-01 y el cajón: ocho disponibles por página en dos columnas, el orden (sugeridos y luego
 * carga), que buscar vuelva a la primera página y que agregar retroceda si la página queda vacía, el
 * cupo lleno, «Completar con N» (hasta cuatro), los no disponibles con su motivo, el horario
 * editable y validado por persona, el rechazo del servidor bajo esa persona y el contador.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import SelectorPersonal, { type PersonaAgregada } from "./SelectorPersonal.tsx";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import { cuantosCompletar } from "../../utils/personal.util.ts";

/** `n` candidatos elegibles de una sola unidad, con la carga creciente según su número. */
const crear = (n: number, desde = 1): PersonaElegible[] =>
  Array.from({ length: n }, (_, indice) => {
    const id = desde + indice;
    return {
      id,
      apellidos: `PERSONA${String(id).padStart(2, "0")}`,
      nombres: "PRUEBA",
      area: "OPERATIVOS",
      cargo: "Agente",
      elegible: true,
      motivo: null,
      indiceCarga: id,
      nivelFatiga: "VERDE",
      operativosAsignados: id,
    };
  });

const HORAS = ["08:00", "08:30", "16:00", "16:30", "22:00", "06:00"];

const pintar = (props: Partial<ComponentProps<typeof SelectorPersonal>> = {}) =>
  render(
    <SelectorPersonal
      candidatos={crear(13)}
      cargando={false}
      agregadas={[]}
      onAgregar={vi.fn()}
      onRetirar={vi.fn()}
      deshabilitado={false}
      avisoRechazo={null}
      listaCompacta
      horarioInline
      onCambiarHorario={vi.fn()}
      horasHorario={HORAS}
      {...props}
    />,
  );

/** Los nombres de las tarjetas de disponibles visibles, en orden. */
const nombresDisponibles = (): string[] => {
  const rejilla = document.querySelector('[data-rejilla="disponibles"]');
  return rejilla
    ? within(rejilla as HTMLElement)
        .getAllByText(/^PERSONA/)
        .map((nodo) => nodo.textContent ?? "")
    : [];
};

/** Un selector con estado propio: agregar saca a la persona de la lista, como en la página. */
const ConEstado = ({ candidatos }: { candidatos: PersonaElegible[] }) => {
  const [agregadas, setAgregadas] = useState<PersonaAgregada[]>([]);
  return (
    <SelectorPersonal
      candidatos={candidatos}
      cargando={false}
      agregadas={agregadas}
      onAgregar={(persona) =>
        setAgregadas((antes) => [
          ...antes,
          {
            funcionarioId: persona.id,
            nombre: `${persona.apellidos} ${persona.nombres}`,
            telefono: null,
            horaInicio: "08:00",
            horaFin: "16:00",
          },
        ])
      }
      onRetirar={(id) => setAgregadas((antes) => antes.filter((p) => p.funcionarioId !== id))}
      deshabilitado={false}
      avisoRechazo={null}
      listaCompacta
      horarioInline
      onCambiarHorario={vi.fn()}
      horasHorario={HORAS}
    />
  );
};

describe("Personal y horario · disponibles", () => {
  it("muestra ocho por página en dos columnas, con el pie «Mostrando 1–8 de 13»", () => {
    pintar();

    const rejilla = document.querySelector('[data-rejilla="disponibles"]');
    expect(rejilla).toHaveClass("md:grid-cols-2");
    expect(nombresDisponibles()).toHaveLength(8);
    expect(screen.getByText("Disponibles (13)")).toBeInTheDocument();
    expect(screen.getByText(/Mostrando/).textContent).toContain("1–8");
  });

  it("sin más de una página, no hay paginador", () => {
    pintar({ candidatos: crear(5) });
    expect(screen.queryByText(/Mostrando/)).toBeNull();
  });

  it("ordena a los sugeridos primero y luego de menor a mayor carga", () => {
    const candidatos = crear(4).map((persona) =>
      persona.id === 4 ? { ...persona, sugerido: true } : persona,
    );
    pintar({ candidatos });

    expect(nombresDisponibles()).toEqual([
      "PERSONA04 PRUEBA",
      "PERSONA01 PRUEBA",
      "PERSONA02 PRUEBA",
      "PERSONA03 PRUEBA",
    ]);
  });

  it("la tarjeta dice «Cargo · N op. esta semana» y recorta el nombre con su `title`", () => {
    pintar({ candidatos: crear(1) });

    expect(screen.getByText("Agente · 1 op. esta semana")).toBeInTheDocument();
    expect(screen.getByText("PERSONA01 PRUEBA")).toHaveAttribute("title", "PERSONA01 PRUEBA");
    expect(screen.getByText("PERSONA01 PRUEBA")).toHaveClass("truncate");
  });

  it("buscar vuelve a la primera página", async () => {
    const usuario = userEvent.setup();
    pintar();

    await usuario.click(screen.getByRole("button", { name: "Siguiente ›" }));
    expect(nombresDisponibles()).toHaveLength(5);

    fireEvent.change(screen.getByPlaceholderText(/Buscar por apellido/), {
      target: { value: "persona1" },
    });
    // PERSONA10 a PERSONA13: cuatro, en la primera página.
    expect(nombresDisponibles()).toEqual([
      "PERSONA10 PRUEBA",
      "PERSONA11 PRUEBA",
      "PERSONA12 PRUEBA",
      "PERSONA13 PRUEBA",
    ]);
  });

  it("agregar a la única de la última página la saca y la página retrocede", async () => {
    const usuario = userEvent.setup();
    render(<ConEstado candidatos={crear(9)} />);

    await usuario.click(screen.getByRole("button", { name: "Siguiente ›" }));
    expect(nombresDisponibles()).toEqual(["PERSONA09 PRUEBA"]);

    await usuario.click(screen.getByRole("button", { name: "+ Agregar" }));

    // La persona pasó a seleccionados y la vista volvió a la primera página, ya sin paginador.
    expect(nombresDisponibles()).toHaveLength(8);
    expect(screen.queryByText(/Mostrando/)).toBeNull();
    expect(screen.getByText("Seleccionados (1)")).toBeInTheDocument();
  });

  it("con el cupo lleno, «+ Agregar» se apaga con «Cupo completo»", () => {
    pintar({
      candidatos: crear(3),
      cupo: 1,
      agregadas: [{ funcionarioId: 99, nombre: "YA ASIGNADA", telefono: null }],
    });

    for (const boton of screen.getAllByRole("button", { name: "+ Agregar" })) {
      expect(boton).toHaveAttribute("aria-disabled", "true");
      expect(boton).toHaveAttribute("title", "Cupo completo");
    }
    expect(screen.getByText(/1 de 1 efectivos/)).toBeInTheDocument();
  });
});

describe("Personal y horario · «Completar con N de menor carga»", () => {
  it("agrega hasta cuatro, en el orden de la lista", async () => {
    const usuario = userEvent.setup();
    const onAgregar = vi.fn();
    pintar({ onAgregar });

    await usuario.click(screen.getByRole("button", { name: "Completar con 4 de menor carga" }));

    expect(onAgregar.mock.calls.map(([persona]) => persona.id)).toEqual([1, 2, 3, 4]);
  });

  it("nunca pasa de los elegibles ni de los cupos libres", () => {
    expect(cuantosCompletar(13, 0, null)).toBe(4);
    expect(cuantosCompletar(2, 0, null)).toBe(2);
    expect(cuantosCompletar(13, 3, 5)).toBe(2);
    expect(cuantosCompletar(13, 5, 5)).toBe(0);
  });

  it("sin nadie que completar, se apaga con su motivo", () => {
    pintar({ candidatos: [] });

    const boton = screen.getByRole("button", { name: "Completar con 0 de menor carga" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "No hay personal disponible para completar");
  });
});

describe("Personal y horario · no disponibles", () => {
  it("van plegados aparte, con el motivo del servidor y el «+ Agregar» apagado", async () => {
    const usuario = userEvent.setup();
    const candidatos: PersonaElegible[] = [
      ...crear(2),
      {
        ...crear(1, 3)[0],
        elegible: false,
        motivo: "Ya está asignada al operativo OCF-001-17-OCT-2026 de 08H00 A 16H00.",
      },
    ];
    pintar({ candidatos });

    // Fuera de la caja de disponibles.
    expect(screen.getByText("Disponibles (2)")).toBeInTheDocument();
    expect(screen.queryByText(/Ya está asignada/)).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "No disponibles (1)" }));

    const motivo = screen.getByText(/Ya está asignada al operativo OCF-001/);
    expect(motivo).toHaveClass("text-warning");
    const rejilla = document.querySelector('[data-rejilla="no-disponibles"]') as HTMLElement;
    const boton = within(rejilla).getByRole("button", { name: "+ Agregar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton.getAttribute("title")).toMatch(/Ya está asignada/);
  });
});

describe("Personal y horario · seleccionados y contador", () => {
  it("sin personal, la franja lo explica y el contador va en ámbar; tras intentar, en rojo", () => {
    const { unmount } = pintar({ candidatos: crear(2) });
    expect(screen.getByText(/^Aún no agrega personal\./)).toBeInTheDocument();
    expect(screen.getByText("0 de 2 efectivos")).toHaveClass("text-warning");
    unmount();

    pintar({ candidatos: crear(2), faltaTrasIntento: true });
    const contador = screen.getByText(/0 de 2 efectivos/);
    expect(contador).toHaveClass("text-error");
    // Y lo dice en palabras, no solo en color (regla 6).
    expect(contador).toHaveTextContent("agregue al menos una persona");
  });

  it("el horario por defecto es el de la primera persona", () => {
    pintar({
      agregadas: [
        { funcionarioId: 1, nombre: "PERSONA01 PRUEBA", telefono: null, horaInicio: "08:00", horaFin: "16:30" },
      ],
    });
    expect(screen.getByText("Horario por defecto: 08H00 a 16H30")).toBeInTheDocument();
  });

  it("un horario mal escrito se explica bajo esa persona; cruzar la medianoche es válido", () => {
    const { unmount } = pintar({
      agregadas: [
        { funcionarioId: 1, nombre: "PERSONA01 PRUEBA", telefono: null, horaInicio: "08:00", horaFin: "08:00" },
      ],
    });
    expect(screen.getByText(/El horario no tiene duración/)).toBeInTheDocument();
    expect(screen.getByLabelText("Hora de fin de PERSONA01 PRUEBA")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    unmount();

    pintar({
      agregadas: [
        { funcionarioId: 1, nombre: "PERSONA01 PRUEBA", telefono: null, horaInicio: "22:00", horaFin: "06:00" },
      ],
    });
    expect(screen.queryByText(/El horario no tiene duración/)).toBeNull();
    expect(screen.getByText(/Termina al día siguiente/)).toBeInTheDocument();
  });

  it("el rechazo del servidor se pinta bajo la persona rechazada, no sobre el bloque", () => {
    pintar({
      agregadas: [
        { funcionarioId: 1, nombre: "PERSONA01 PRUEBA", telefono: null, horaInicio: "08:00", horaFin: "16:00" },
        { funcionarioId: 2, nombre: "PERSONA02 PRUEBA", telefono: null, horaInicio: "08:00", horaFin: "16:00" },
      ],
      avisoRechazo: "PERSONA02 PRUEBA ya está asignada al operativo OCF-001, que se cruza con este horario.",
      idPersonaRechazada: 2,
    });

    const aviso = screen.getByText(/ya está asignada al operativo OCF-001/);
    const fila = aviso.closest("li") as HTMLElement;
    expect(within(fila).getByLabelText("Hora de inicio de PERSONA02 PRUEBA")).toBeInTheDocument();
    expect(screen.getAllByText(/ya está asignada al operativo OCF-001/)).toHaveLength(1);
  });

  it("cambiar una hora avisa con el id de esa persona; «✕» la quita", async () => {
    const usuario = userEvent.setup();
    const onCambiarHorario = vi.fn();
    const onRetirar = vi.fn();
    pintar({
      onCambiarHorario,
      onRetirar,
      agregadas: [
        { funcionarioId: 7, nombre: "PERSONA07 PRUEBA", telefono: null, horaInicio: "08:00", horaFin: "16:00" },
      ],
    });

    fireEvent.change(screen.getByLabelText("Hora de inicio de PERSONA07 PRUEBA"), {
      target: { value: "08:30" },
    });
    expect(onCambiarHorario).toHaveBeenCalledWith(7, "08:30", "16:00");

    await usuario.click(screen.getByRole("button", { name: "Retirar a PERSONA07 PRUEBA" }));
    expect(onRetirar).toHaveBeenCalledWith(7);
  });
});
