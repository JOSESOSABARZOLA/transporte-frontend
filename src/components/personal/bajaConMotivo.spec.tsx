/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: bajaConMotivo.spec.tsx
 * Responsabilidad: Verificar el modal de baja con motivo (obligatorio; detalle solo con «Otro»).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ModalBajaConMotivo from "./ModalBajaConMotivo.tsx";
import type { Funcionario } from "../../interfaces/Personal.ts";

const FUNCIONARIO: Funcionario = {
  id: 1,
  cedula: "1712345678",
  apellidos: "PEREZ LOPEZ",
  nombres: "JUAN",
  telefono: "0987654321",
  correo: null,
  cargo: null,
  area: "OPERATIVOS",
  tipoContrato: "NOMBRAMIENTO",
  direccion: "DMIP_OPERATIVOS",
  zonalId: null,
  denominacion: null,
  activo: true,
};

const montar = (onConfirmar = vi.fn()) => {
  render(
    <ModalBajaConMotivo
      abierto
      funcionario={FUNCIONARIO}
      procesando={false}
      onConfirmar={onConfirmar}
      onCancelar={vi.fn()}
    />,
  );
  return onConfirmar;
};

describe("ModalBajaConMotivo", () => {
  it("no confirma sin motivo: exige elegirlo", async () => {
    const onConfirmar = montar();

    await userEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(screen.getByText("Indique el motivo de la baja.")).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("con «Otro» exige el detalle", async () => {
    const onConfirmar = montar();

    await userEvent.selectOptions(
      screen.getByLabelText("Motivo de la baja"),
      "OTRO",
    );
    await userEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(
      screen.getByText("Con motivo «Otro», escriba el detalle."),
    ).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("con «Otro» y detalle, confirma enviando código y detalle", async () => {
    const onConfirmar = montar();

    await userEvent.selectOptions(
      screen.getByLabelText("Motivo de la baja"),
      "OTRO",
    );
    await userEvent.type(
      screen.getByLabelText("Detalle del motivo de la baja"),
      "Cambio de ciudad",
    );
    await userEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      motivo: "OTRO",
      detalle: "Cambio de ciudad",
    });
  });

  it("con un motivo estándar confirma sin detalle", async () => {
    const onConfirmar = montar();

    await userEvent.selectOptions(
      screen.getByLabelText("Motivo de la baja"),
      "RENUNCIA",
    );
    await userEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      motivo: "RENUNCIA",
      detalle: undefined,
    });
  });
});
