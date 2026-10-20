/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro y edición de operativo
 * Archivo: politicasOperativo.util.spec.ts
 * Responsabilidad: Las reglas puras que comparten el alta y el cajón del operativo: qué falta y en
 *                  qué orden, qué tarjeta se marca, el pie del alta y el horario de cada persona.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 */

import { describe, expect, it } from "vitest";

import {
  estadoPieAlta,
  faltaDelPersonal,
  hayDatosCapturados,
  motivoHorarioPersona,
  nombresQueFaltan,
  seccionesConFalta,
  textoListoParaRegistrar,
  transporteInicial,
} from "./politicasOperativo.util.ts";
import { VALORES_INICIALES, type ValoresOperativo } from "./valoresOperativo.util.ts";

const EN_BLANCO: ValoresOperativo = { ...VALORES_INICIALES, formularioCodigo: "OCFIJ" };
const COMPLETO: ValoresOperativo = {
  ...EN_BLANCO,
  zonalesIds: [1],
  punto: "4",
  tipoControl: "30",
  institucionesIds: [7],
};

describe("nombresQueFaltan", () => {
  it("en el orden de las tarjetas, con el personal delante", () => {
    expect(nombresQueFaltan(EN_BLANCO, "personal")).toEqual([
      "personal",
      "zonal",
      "punto de encuentro",
      "institución",
      "tipo de control",
    ]);
  });

  it("completo y con personal, no falta nada", () => {
    expect(nombresQueFaltan(COMPLETO, null)).toEqual([]);
  });

  it("un «otro tipo» basta como tipo de control", () => {
    expect(
      nombresQueFaltan({ ...COMPLETO, tipoControl: "", tipoLibre: "PATRULLA ESPECIAL" }, null),
    ).toEqual([]);
  });
});

describe("faltaDelPersonal", () => {
  it("nadie asignado, o alguien sin las dos horas donde se exigen", () => {
    expect(faltaDelPersonal([], true)).toBe("personal");
    expect(faltaDelPersonal([{ horaInicio: "08:00", horaFin: "" }], true)).toBe(
      "horario del personal",
    );
    expect(faltaDelPersonal([{ horaInicio: "08:00", horaFin: "" }], false)).toBeNull();
    expect(faltaDelPersonal([{ horaInicio: "08:00", horaFin: "16:30" }], true)).toBeNull();
  });
});

describe("motivoHorarioPersona", () => {
  it("vacío, sin duración o fuera de :00/:30; el cruce de medianoche vale", () => {
    expect(motivoHorarioPersona("", "16:00")).toMatch(/Indique el horario/);
    expect(motivoHorarioPersona("08:00", "08:00")).toMatch(/no tiene duración/);
    expect(motivoHorarioPersona("08:15", "16:00")).toMatch(/en punto o y media/);
    expect(motivoHorarioPersona("22:00", "02:00")).toBeNull();
  });
});

describe("seccionesConFalta", () => {
  it("marca la tarjeta de cada hueco", () => {
    expect([...seccionesConFalta(["personal", "zonal", "tipo de control"])].sort()).toEqual([
      "control",
      "lugar",
      "personal",
    ]);
    expect(seccionesConFalta(["horario del personal"]).has("personal")).toBe(true);
  });
});

describe("estadoPieAlta", () => {
  it("antes de intentar nombra lo que falta en gris; tras intentar, en rojo", () => {
    const faltantes = ["personal", "zonal"];
    expect(
      estadoPieAlta({ faltantes, intentado: false, efectivos: 0, tipoTransporte: "COMPLETO" }),
    ).toEqual({ tono: "pendiente", texto: "Falta: personal, zonal" });
    expect(
      estadoPieAlta({ faltantes, intentado: true, efectivos: 0, tipoTransporte: "COMPLETO" }),
    ).toEqual({ tono: "error", texto: "Falta: personal, zonal" });
  });

  it("completo dice los efectivos y el transporte", () => {
    expect(
      estadoPieAlta({
        faltantes: [],
        intentado: false,
        efectivos: 2,
        tipoTransporte: "PROPIOS_MEDIOS",
      }),
    ).toEqual({ tono: "listo", texto: "Listo para registrar · 2 efectivos · Propios medios" });
    expect(textoListoParaRegistrar(1, "INICIO_Y_FIN")).toBe(
      "Listo para registrar · 1 efectivo · Dejar y retirar",
    );
  });
});

describe("transporteInicial y hayDatosCapturados", () => {
  it("el transporte nace con la sugerencia del formulario, o «Completo»", () => {
    expect(transporteInicial("PROPIOS_MEDIOS")).toBe("PROPIOS_MEDIOS");
    expect(transporteInicial(undefined)).toBe("COMPLETO");
  });

  it("el transporte solo no cuenta como captura; el personal y los campos sí", () => {
    expect(hayDatosCapturados({ ...EN_BLANCO, tipoTransporte: "PROPIOS_MEDIOS" }, 0)).toBe(false);
    expect(hayDatosCapturados(EN_BLANCO, 1)).toBe(true);
    expect(hayDatosCapturados({ ...EN_BLANCO, observaciones: ["nota"] }, 0)).toBe(true);
    expect(hayDatosCapturados({ ...EN_BLANCO, observaciones: ["   "] }, 0)).toBe(false);
  });
});
