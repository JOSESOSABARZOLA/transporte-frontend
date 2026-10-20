/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Edición de operativos
 * Archivo: edicionOperativo.util.spec.ts
 * Responsabilidad: Verificar qué cuenta como cambio del borrador y qué avisa a la DAF.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 */

import { describe, expect, it } from "vitest";

import type { PersonaAsignada } from "../interfaces/Operativo.ts";
import {
  cambiaronZonales,
  cambioDeHorario,
  hayCambiosDePersonal,
} from "./edicionOperativo.util.ts";

const persona = (
  funcionarioId: number,
  horaInicio = "09:00",
  horaFin = "18:00",
): PersonaAsignada =>
  ({
    funcionarioId,
    nombre: `P${funcionarioId}`,
    horaInicio,
    horaFin,
  }) as PersonaAsignada;

describe("el borrador de una edición frente al servidor", () => {
  it("un alta, una baja o un turno distinto son cambios; lo mismo, no", () => {
    const original = [persona(1), persona(2)];
    expect(hayCambiosDePersonal([persona(1), persona(2)], original)).toBe(false);
    expect(hayCambiosDePersonal([persona(1)], original)).toBe(true);
    expect(
      hayCambiosDePersonal([persona(1), persona(2, "10:00")], original),
    ).toBe(true);
  });

  it("solo un turno distinto de quien ya iba descuadra el transporte; un alta no", () => {
    const original = [persona(1)];
    expect(cambioDeHorario([persona(1), persona(2, "06:00")], original)).toBe(
      false,
    );
    expect(cambioDeHorario([persona(1, "08:00")], original)).toBe(true);
  });

  it("las zonales cambian si son otras, no si solo cambia el orden", () => {
    expect(cambiaronZonales([2, 1], [1, 2])).toBe(false);
    expect(cambiaronZonales([1], [1, 2])).toBe(true);
    expect(cambiaronZonales([1, 3], [1, 2])).toBe(true);
  });
});
