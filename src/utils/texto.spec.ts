/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Transversal
 * Archivo: texto.spec.ts
 * Responsabilidad: Verificar la capitalización del día y el mes en las fechas de cabecera.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-07
 *
 * SE PRUEBA LA DECISIÓN, NO EL FORMATO: que el día y el mes lleven inicial mayúscula, que
 * los conectores «de»/«del»/«y» se queden en minúscula y que las tildes se conserven.
 */
import { describe, expect, it } from "vitest";

import { conDiaYMesEnMayuscula } from "./texto.util.ts";

describe("conDiaYMesEnMayuscula", () => {
  it("pone en mayúscula la inicial del día y del mes", () => {
    expect(conDiaYMesEnMayuscula("martes 8 de septiembre de 2026")).toBe(
      "Martes 8 de Septiembre de 2026",
    );
  });

  it("deja los conectores «de» en minúscula", () => {
    expect(conDiaYMesEnMayuscula("lunes 1 de enero de 2027")).toBe(
      "Lunes 1 de Enero de 2027",
    );
  });

  it("conserva las tildes del día y del mes", () => {
    expect(conDiaYMesEnMayuscula("miércoles 3 de diciembre de 2026")).toBe(
      "Miércoles 3 de Diciembre de 2026",
    );
  });

  it("es idempotente: una fecha ya capitalizada no cambia", () => {
    const ya = "Martes 8 de Septiembre de 2026";
    expect(conDiaYMesEnMayuscula(ya)).toBe(ya);
  });
});
