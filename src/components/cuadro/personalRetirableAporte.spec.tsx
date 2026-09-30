/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: personalRetirableAporte.spec.tsx
 * Responsabilidad: Fijar que quien APORTA solo puede retirar SU personal (el de Instrucción).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-18
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORMULARIO 4 (ECU): el DMIT solo edita el personal de Instrucción.
 *
 * El operativo lo registra DMIP Operativos y el DMIT solo APORTA una persona de
 * Instrucción. En «Operativos registrados», al abrir el panel de personal, el DMIT ve
 * a todo el personal del operativo, pero el del dueño llega en LECTURA —sin «×»— y solo
 * el suyo se puede retirar. Ofrecer la «×» sobre el personal ajeno sería ofrecer un 403:
 * el servidor lo rechaza con `asignadoPorRol`. La bandeja lo refleja con `editable`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SelectorPersonal, {
  type PersonaAgregada,
} from "./SelectorPersonal.tsx";

/** Dos ya asignados: uno lo puso el dueño (lectura) y otro lo aportó quien edita. */
const AGREGADAS: PersonaAgregada[] = [
  { funcionarioId: 1, nombre: "PEREZ (Operativos)", telefono: null, editable: false },
  { funcionarioId: 2, nombre: "LOPEZ (Instrucción)", telefono: null, editable: true },
];

const props = {
  candidatos: [],
  cargando: false,
  onAgregar: vi.fn(),
  onRetirar: vi.fn(),
  deshabilitado: false,
  avisoRechazo: null,
};

describe("la bandeja de personal en el aporte (Form 4 ECU)", () => {
  it("solo el personal de Instrucción —el que aportó quien edita— trae «×»", () => {
    render(
      <SelectorPersonal
        {...props}
        agregadas={AGREGADAS}
      />,
    );

    // El personal del dueño se ve, pero SIN botón de retirar.
    expect(screen.getByText("PEREZ (Operativos)")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retirar a PEREZ (Operativos)" }),
    ).toBeNull();

    // El de Instrucción sí se puede retirar.
    expect(
      screen.getByRole("button", { name: "Retirar a LOPEZ (Instrucción)" }),
    ).toBeInTheDocument();
  });

  it("«Quitar todos» cuenta solo lo retirable, no el personal ajeno", () => {
    render(
      <SelectorPersonal
        {...props}
        agregadas={AGREGADAS}
      />,
    );

    // Dos asignados en total, pero solo uno es del departamento que aporta.
    expect(screen.getByText("2 asignados")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar todos (1)" }),
    ).toBeInTheDocument();
  });

  it("sin `editable`, todo el personal es retirable (registro y edición del dueño)", () => {
    render(
      <SelectorPersonal
        {...props}
        agregadas={[
          { funcionarioId: 1, nombre: "PEREZ", telefono: null },
          { funcionarioId: 2, nombre: "LOPEZ", telefono: null },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Retirar a PEREZ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retirar a LOPEZ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar todos (2)" }),
    ).toBeInTheDocument();
  });
});
