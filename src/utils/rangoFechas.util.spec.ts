/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos · rango de fechas
 * Archivo: rangoFechas.util.spec.ts
 * Responsabilidad: Fijar los atajos, la validación, el resumen y la URL del rango.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 */

import { describe, expect, it } from "vitest";

import {
  atajoActivo,
  busquedaConRango,
  diasDelRango,
  errorDelRango,
  rangoDeAtajo,
  rangoDeLaUrl,
  resumenDelRango,
} from "./rangoFechas.util.ts";

// Miércoles 14 de octubre de 2026.
const VIGENTE = "2026-10-14";

describe("atajos anclados al cuadro vigente", () => {
  it("Hoy, Ayer, Esta semana (lunes → vigente), Últimos 7 días y Este mes", () => {
    expect(rangoDeAtajo("hoy", VIGENTE)).toEqual({ desde: VIGENTE, hasta: VIGENTE });
    expect(rangoDeAtajo("ayer", VIGENTE)).toEqual({ desde: "2026-10-13", hasta: "2026-10-13" });
    expect(rangoDeAtajo("semana", VIGENTE)).toEqual({ desde: "2026-10-12", hasta: VIGENTE });
    expect(rangoDeAtajo("ultimos7", VIGENTE)).toEqual({ desde: "2026-10-08", hasta: VIGENTE });
    expect(rangoDeAtajo("mes", VIGENTE)).toEqual({ desde: "2026-10-01", hasta: VIGENTE });
  });

  it("un domingo, la semana empieza el lunes anterior", () => {
    expect(rangoDeAtajo("semana", "2026-10-18")).toEqual({
      desde: "2026-10-12",
      hasta: "2026-10-18",
    });
  });

  it("resalta el atajo que coincide; ninguno si el rango es otro", () => {
    expect(atajoActivo({ desde: "2026-10-01", hasta: VIGENTE }, VIGENTE)).toBe("mes");
    expect(atajoActivo({ desde: VIGENTE, hasta: VIGENTE }, VIGENTE)).toBe("hoy");
    expect(atajoActivo({ desde: "2026-10-02", hasta: VIGENTE }, VIGENTE)).toBeNull();
  });
});

describe("validación", () => {
  it("Hasta anterior a Desde", () => {
    expect(errorDelRango({ desde: VIGENTE, hasta: "2026-10-13" }, 31)).toEqual({
      campo: "hasta",
      mensaje: '"Hasta" no puede ser anterior a "Desde".',
    });
  });

  it("el máximo pasa y un día más no", () => {
    expect(diasDelRango({ desde: "2026-10-01", hasta: "2026-10-31" })).toBe(31);
    expect(errorDelRango({ desde: "2026-10-01", hasta: "2026-10-31" }, 31)).toBeNull();
    expect(errorDelRango({ desde: "2026-10-01", hasta: "2026-11-01" }, 31)?.mensaje).toBe(
      "El rango no puede superar 31 días.",
    );
  });

  it("un campo vacío se señala", () => {
    expect(errorDelRango({ desde: "", hasta: VIGENTE }, 31)?.campo).toBe("desde");
  });
});

it("resumen de varios días", () => {
  expect(resumenDelRango({ desde: "2026-10-01", hasta: VIGENTE }, 8, 5)).toBe(
    "8 operativos entre 01/10 y 14/10 · 5 cuadros",
  );
  expect(resumenDelRango({ desde: "2026-10-01", hasta: VIGENTE }, 1, 1)).toBe(
    "1 operativo entre 01/10 y 14/10 · 1 cuadro",
  );
});

describe("URL", () => {
  it("lee el rango y conserva los demás parámetros al escribirlo", () => {
    expect(rangoDeLaUrl("?desde=2026-10-01&hasta=2026-10-14", VIGENTE)).toEqual({
      desde: "2026-10-01",
      hasta: "2026-10-14",
    });
    expect(busquedaConRango("?formulario=PMO", { desde: "2026-10-01", hasta: VIGENTE })).toBe(
      "?formulario=PMO&desde=2026-10-01&hasta=2026-10-14",
    );
  });

  it("un rango inválido o ausente abre el vigente", () => {
    expect(rangoDeLaUrl("", VIGENTE)).toEqual({ desde: VIGENTE, hasta: VIGENTE });
    expect(rangoDeLaUrl("?desde=2026-10-14&hasta=2026-10-01", VIGENTE)).toEqual({
      desde: VIGENTE,
      hasta: VIGENTE,
    });
    expect(rangoDeLaUrl("?desde=ayer&hasta=hoy", VIGENTE)).toEqual({
      desde: VIGENTE,
      hasta: VIGENTE,
    });
  });
});
