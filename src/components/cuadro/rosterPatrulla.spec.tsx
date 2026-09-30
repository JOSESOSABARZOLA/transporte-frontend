/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: rosterPatrulla.spec.tsx
 * Responsabilidad: Editar el personal de la patrulla: cambiar (misma área), quitar y agregar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-18
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE PRUEBA SON LAS DECISIONES (CLAUDE.md §3), no el maquetado:
 *   · «Cambiar» ofrece SOLO personas de la MISMA área del código (lo exige el servidor).
 *   · «Quitar» y «Cambiar» aparecen SOLO en los códigos que el registrante creó; el INECU
 *     del DMIT llega en lectura.
 *   · «Agregar persona» ofrece a los inspectores (no Instrucción, que aporta el DMIT).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RosterPatrulla, { type MiembroPatrulla } from "./RosterPatrulla.tsx";
import type { Operativo, PersonaAsignada } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import type { RolDepartamental } from "../../config/env";

const elegible = (
  id: number,
  apellidos: string,
  area: AreaPersonal,
): PersonaElegible => ({
  id,
  apellidos,
  nombres: "N",
  area,
  cargo: null,
  elegible: true,
  motivo: null,
});

const asignada = (nombre: string, area: AreaPersonal): PersonaAsignada => ({
  funcionarioId: 1,
  nombre,
  area,
  telefono: null,
  esResponsable: false,
  asignadoPorRol: "DMIP_INSPECCIONES" as RolDepartamental,
  horaInicio: "20:00",
  horaFin: "02:00",
});

const miembro = (
  id: number,
  identificador: string,
  persona: PersonaAsignada,
  editable: boolean,
): MiembroPatrulla => ({
  operativo: { id, identificador } as unknown as Operativo,
  persona,
  editable,
});

/** IGNECU (Gral., editable), ITNECU (Téc., editable), INECU (Instr., del DMIT: lectura). */
const MIEMBROS: MiembroPatrulla[] = [
  miembro(1, "IGNECU-001", asignada("BENAVIDES", "GENERAL"), true),
  miembro(2, "ITNECU-001", asignada("CAMPAÑA", "TECNICO"), true),
  miembro(3, "INECU-001", asignada("DIAZ", "INSTRUCCION"), false),
];

/** Dos por área, para comprobar el filtrado. */
const CANDIDATOS: PersonaElegible[] = [
  elegible(10, "GONZALEZ", "GENERAL"),
  elegible(11, "HERRERA", "GENERAL"),
  elegible(20, "TORRES", "TECNICO"),
  elegible(30, "INSTRU", "INSTRUCCION"),
];

const props = {
  miembros: MIEMBROS,
  candidatos: CANDIDATOS,
  aviso: null,
  bloqueado: false,
};

describe("el roster de la patrulla", () => {
  it("«Cambiar» del General ofrece SOLO candidatos de área GENERAL", () => {
    render(
      <RosterPatrulla
        {...props}
        onCambiar={vi.fn()}
        onQuitar={vi.fn()}
        onAgregar={vi.fn()}
      />,
    );

    const cambiarGeneral = screen.getByRole("combobox", {
      name: "Cambiar a BENAVIDES",
    });
    const opciones = within(cambiarGeneral)
      .getAllByRole("option")
      .map((opcion) => opcion.textContent);

    // El marcador y los dos generales; nunca el técnico ni la instrucción.
    expect(opciones).toEqual(["Cambiar por…", "GONZALEZ N", "HERRERA N"]);
  });

  it("elegir un reemplazo llama a onCambiar con el código y la persona", () => {
    const onCambiar = vi.fn();
    render(
      <RosterPatrulla
        {...props}
        onCambiar={onCambiar}
        onQuitar={vi.fn()}
        onAgregar={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Cambiar a CAMPAÑA" }),
      { target: { value: "20" } },
    );

    // operativo 2 (ITNECU), persona 20 (TORRES, del área TECNICO).
    expect(onCambiar).toHaveBeenCalledWith(2, 20);
  });

  it("el INECU del DMIT llega en lectura: sin «Cambiar» ni «Quitar»", () => {
    render(
      <RosterPatrulla
        {...props}
        onCambiar={vi.fn()}
        onQuitar={vi.fn()}
        onAgregar={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("combobox", { name: "Cambiar a DIAZ" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Quitar a DIAZ" }),
    ).toBeNull();
    expect(screen.getByText("La gestiona su departamento")).toBeInTheDocument();
  });

  it("«Quitar» del General llama a onQuitar con su operativo", () => {
    const onQuitar = vi.fn();
    render(
      <RosterPatrulla
        {...props}
        onCambiar={vi.fn()}
        onQuitar={onQuitar}
        onAgregar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Quitar a BENAVIDES" }));

    expect(onQuitar).toHaveBeenCalledWith(MIEMBROS[0].operativo);
  });

  it("«Agregar persona» ofrece a los inspectores, NO a Instrucción, y avisa a onAgregar", () => {
    const onAgregar = vi.fn();
    render(
      <RosterPatrulla
        {...props}
        onCambiar={vi.fn()}
        onQuitar={vi.fn()}
        onAgregar={onAgregar}
      />,
    );

    const agregar = screen.getByRole("combobox", {
      name: "Agregar persona a la patrulla",
    });
    const opciones = within(agregar)
      .getAllByRole("option")
      .map((opcion) => opcion.textContent);

    // Marcador + los tres inspectores (2 generales, 1 técnico); nunca el de Instrucción.
    expect(opciones).toEqual([
      "Elegir persona…",
      "Inspector General - DMIP · GONZALEZ N",
      "Inspector General - DMIP · HERRERA N",
      "Inspector Técnico - DMIP · TORRES N",
    ]);

    fireEvent.change(agregar, { target: { value: "11" } });
    expect(onAgregar).toHaveBeenCalledWith(11);
  });
});
