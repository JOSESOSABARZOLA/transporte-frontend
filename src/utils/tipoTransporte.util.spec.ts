/**
 * App: Cuadro de Colores
 * Módulo: Cuadro
 * Feature: Transporte requerido
 * Archivo: tipoTransporte.util.spec.ts
 * Responsabilidad: Fijar qué tipos piden vehículo a la DAF, incluido «Vehículo de otra institución».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 */

import { describe, expect, it } from "vitest";

import { OPCIONES_TRANSPORTE, pideVehiculo } from "./tipoTransporte.util.ts";

describe("tipo de transporte · vehículo de otra institución", () => {
  it("ni propios medios ni otra institución piden vehículo a la DAF (espejo del servidor)", () => {
    expect(pideVehiculo("COMPLETO")).toBe(true);
    expect(pideVehiculo("INICIO_Y_FIN")).toBe(true);
    expect(pideVehiculo("PROPIOS_MEDIOS")).toBe(false);
    expect(pideVehiculo("OTRA_INSTITUCION")).toBe(false);
  });

  it("es la sexta opción", () => {
    expect(OPCIONES_TRANSPORTE.map((opcion) => opcion.valor)).toEqual([
      "COMPLETO",
      "SOLO_INICIO",
      "SOLO_FIN",
      "INICIO_Y_FIN",
      "PROPIOS_MEDIOS",
      "OTRA_INSTITUCION",
    ]);
  });
});
