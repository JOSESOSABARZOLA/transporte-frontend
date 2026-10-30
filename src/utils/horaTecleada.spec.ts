/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: horaTecleada.spec.ts
 * Responsabilidad: Fijar el campo de hora de 24 h: cómo se teclea y qué se admite.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 */

import { describe, expect, it } from "vitest";

import type { ParametroPolitica } from "../interfaces/Administracion.ts";
import { comoHoraTecleada, motivoDeRechazo } from "./parametro.util.ts";

const hora: ParametroPolitica = {
  clave: "HORA_LIMITE_CUADRO",
  valor: "16:30",
  tipo: "TEXTO",
  descripcion: "RN-57.",
  unidad: null,
  minimo: null,
  maximo: null,
  valorSiembra: "16:30",
  opciones: null,
  modificadoPor: null,
  modificadoPorNombre: null,
  modificadoEn: "2026-08-18T12:00:00.000Z",
};

describe("comoHoraTecleada", () => {
  it("pone los dos puntos tras la segunda cifra y descarta lo que no es cifra", () => {
    expect(comoHoraTecleada("1630")).toBe("16:30");
    expect(comoHoraTecleada("16")).toBe("16");
    expect(comoHoraTecleada("163")).toBe("16:3");
    expect(comoHoraTecleada("16h30")).toBe("16:30");
    expect(comoHoraTecleada("163099")).toBe("16:30");
    expect(comoHoraTecleada("16:3a0")).toBe("16:30");
  });
});

describe("la hora se valida de 00:00 a 23:59", () => {
  it("admite 00:00 y 23:59; rechaza 24:00 y 7:5", () => {
    expect(motivoDeRechazo(hora, "00:00")).toBeNull();
    expect(motivoDeRechazo(hora, "23:59")).toBeNull();
    expect(motivoDeRechazo(hora, "24:00")).toContain("HH:MM");
    expect(motivoDeRechazo(hora, "7:5")).toContain("HH:MM");
  });
});
