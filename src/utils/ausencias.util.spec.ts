/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: ausencias.util.spec.ts
 * Responsabilidad: Fijar las reglas puras de las ausencias: rango, solape, días, estado y formato.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 */

import { describe, expect, it } from "vitest";

import {
  ausenciaAMostrar,
  diagnosticarRango,
  diasDelPeriodo,
  estadoDeAusencia,
  fechaCorta,
  fechaLarga,
  seSolapan,
} from "./ausencias.util.ts";

const HOY = "2026-10-08";

describe("formato de fecha · dd/mm/aaaa en pantalla", () => {
  it("convierte sin pasar por Date (no se mueve un día en Quito)", () => {
    expect(fechaLarga("2026-10-09")).toBe("09/10/2026");
    expect(fechaCorta("2026-10-09")).toBe("09/10");
    expect(fechaLarga("")).toBe("");
  });
});

describe("días del periodo · ambas fechas incluidas", () => {
  it("un solo día cuenta 1", () => {
    expect(diasDelPeriodo({ desde: HOY, hasta: HOY })).toBe(1);
  });

  it("cruza el fin de mes y el de año", () => {
    expect(diasDelPeriodo({ desde: "2026-10-30", hasta: "2026-11-02" })).toBe(4);
    expect(diasDelPeriodo({ desde: "2026-12-31", hasta: "2027-01-01" })).toBe(2);
  });

  it("un rango invertido no tiene días", () => {
    expect(diasDelPeriodo({ desde: "2026-10-10", hasta: "2026-10-09" })).toBe(0);
  });
});

describe("solape · INV-14, extremos incluidos", () => {
  const registrada = { desde: "2026-10-12", hasta: "2026-10-23" };

  it("compartir un solo día ya es solaparse", () => {
    expect(seSolapan(registrada, { desde: "2026-10-23", hasta: "2026-10-25" })).toBe(
      true,
    );
  });

  it("el día siguiente ya no", () => {
    expect(seSolapan(registrada, { desde: "2026-10-24", hasta: "2026-10-25" })).toBe(
      false,
    );
  });
});

describe("diagnóstico del rango que se captura", () => {
  const registradas = [{ desde: "2026-10-12", hasta: "2026-10-23" }];

  it("sin las dos fechas está incompleto", () => {
    expect(diagnosticarRango({ desde: "2026-10-01", hasta: "" }, registradas)).toEqual({
      tipo: "incompleto",
    });
  });

  it("«hasta» antes de «desde» es inválido", () => {
    expect(
      diagnosticarRango({ desde: "2026-10-05", hasta: "2026-10-01" }, registradas).tipo,
    ).toBe("invertido");
  });

  it("si se cruza con una registrada, la nombra", () => {
    expect(
      diagnosticarRango({ desde: "2026-10-20", hasta: "2026-10-28" }, registradas),
    ).toEqual({ tipo: "solapado", con: registradas[0] });
  });

  it("válido, con sus días", () => {
    expect(
      diagnosticarRango({ desde: "2026-10-01", hasta: "2026-10-05" }, registradas),
    ).toEqual({ tipo: "valido", dias: 5 });
  });
});

describe("estado de la ausencia · espejo del servidor", () => {
  it("en curso, próxima y pasada respecto de hoy (extremos incluidos)", () => {
    expect(estadoDeAusencia({ desde: HOY, hasta: "2026-10-10" }, HOY)).toBe(
      "EN_CURSO",
    );
    expect(estadoDeAusencia({ desde: "2026-10-01", hasta: HOY }, HOY)).toBe(
      "EN_CURSO",
    );
    expect(estadoDeAusencia({ desde: "2026-10-09", hasta: "2026-10-10" }, HOY)).toBe(
      "PROXIMA",
    );
    expect(estadoDeAusencia({ desde: "2026-10-01", hasta: "2026-10-07" }, HOY)).toBe(
      "PASADA",
    );
  });

  it("la lista muestra la en curso; si no hay, la próxima más cercana; nunca una pasada", () => {
    const pasada = { desde: "2026-09-01", hasta: "2026-09-05" };
    const lejana = { desde: "2026-12-01", hasta: "2026-12-05" };
    const cercana = { desde: "2026-10-20", hasta: "2026-10-22" };
    const enCurso = { desde: "2026-10-07", hasta: "2026-10-09" };

    expect(ausenciaAMostrar([lejana, cercana, enCurso], HOY)).toBe(enCurso);
    expect(ausenciaAMostrar([lejana, cercana], HOY)).toBe(cercana);
    expect(ausenciaAMostrar([pasada], HOY)).toBeNull();
  });
});
