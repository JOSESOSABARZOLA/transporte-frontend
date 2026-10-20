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
  correoInstitucional: null,
  correoPersonal: null,
  cargo: null,
  area: "OPERATIVOS",
  tipoContrato: "NOMBRAMIENTO",
  direccion: "DMIP_OPERATIVOS",
  zonalId: null,
  denominacion: null,
  activo: true,
};

const montar = (onConfirmar = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <ModalBajaConMotivo
      abierto
      funcionario={FUNCIONARIO}
      onConfirmar={onConfirmar}
      onCancelar={vi.fn()}
    />,
  );
  return onConfirmar;
};

describe("ModalBajaConMotivo", () => {
  it("no confirma sin motivo: exige elegirlo", async () => {
    const onConfirmar = montar();

    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(screen.getByText("Indique el motivo de la baja.")).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("con «Otro» exige el detalle", async () => {
    const onConfirmar = montar();

    await userEvent.selectOptions(
      screen.getByLabelText("Motivo de la baja"),
      "OTRO",
    );
    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

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
    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

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
    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      motivo: "RENUNCIA",
      detalle: undefined,
    });
  });

  it("es un mensaje de peligro, y si el servidor rechaza la baja el error queda en el mismo modal", async () => {
    montar(
      vi.fn().mockRejectedValue({
        status: 409,
        originalError: { response: { data: { codigo: "X", mensaje: "La ficha tiene operativos de hoy." } } },
      }),
    );
    expect(screen.getByRole("alertdialog", { name: "¿Desactivar a PEREZ LOPEZ JUAN?" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Motivo de la baja"), "RENUNCIA");
    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    const error = await screen.findByRole("alertdialog", { name: "No se pudo desactivar" });
    expect(error).toHaveTextContent("La ficha tiene operativos de hoy.");
  });
});
