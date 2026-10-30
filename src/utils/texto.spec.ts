/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Transversal
 * Archivo: texto.spec.ts
 * Responsabilidad: Verificar la fecha en palabras y el horario legible de las cabeceras y tablas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-07
 *
 * SE PRUEBA LA DECISIÓN, NO EL FORMATO: que la fecha del cuadro se lea igual en todas las
 * pantallas —día con mayúscula, mes en minúscula, sin correrse de día por el huso— y que el
 * horario lleve la «a» en minúscula.
 *
 * PLANTILLA VISUAL (2026-10-24): `conDiaYMesEnMayuscula` se retiró con sus pruebas; las de
 * `fechaEnPalabras` y `horarioLegible` ocupan su lugar.
 */
import { describe, expect, it } from "vitest";

import { fechaEnPalabras, horarioLegible, normalizar } from "./texto.util.ts";

describe("fechaEnPalabras", () => {
  it("dice el día de la semana con mayúscula y el mes en minúscula", () => {
    expect(fechaEnPalabras("2026-10-24")).toBe("Sábado 24 de octubre de 2026");
  });

  it("no se corre de día: el 1 de enero sigue siendo el 1 de enero", () => {
    expect(fechaEnPalabras("2027-01-01")).toBe("Viernes 1 de enero de 2027");
  });

  it("una fecha que no es AAAA-MM-DD se devuelve tal cual", () => {
    expect(fechaEnPalabras("")).toBe("");
    expect(fechaEnPalabras("mañana")).toBe("mañana");
  });
});

describe("horarioLegible", () => {
  it("pone la «a» del rango en minúscula", () => {
    expect(horarioLegible("08H00 A 16H30")).toBe("08H00 a 16H30");
  });

  it("también en varios horarios unidos por coma", () => {
    expect(horarioLegible("08H00 A 12H00, 14H00 A 18H00")).toBe("08H00 a 12H00, 14H00 a 18H00");
  });

  it("un horario ya legible no cambia", () => {
    expect(horarioLegible("18H00 a 23H30")).toBe("18H00 a 23H30");
  });
});

describe("normalizar", () => {
  it("compara sin tildes ni mayúsculas", () => {
    expect(normalizar("  REDROVÁN ")).toBe("redrovan");
  });
});
