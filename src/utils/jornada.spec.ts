/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cuadro diario
 * Archivo: jornada.spec.ts
 * Responsabilidad: Verificar que la jornada propuesta es la del día siguiente.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-11
 *
 * LAS FECHAS SE CONSTRUYEN CON `new Date(anio, mes, dia, hora)`, que es hora LOCAL, y no
 * con la cadena `"2026-08-11"`, que JavaScript interpreta como UTC. Con lo segundo la
 * prueba pasaría en Quito y fallaría en un servidor con otro huso, que es exactamente el
 * error que estas pruebas existen para impedir.
 */

import { describe, expect, it } from "vitest";

import {
  fechaDeJornadaPorDefecto,
  laJornadaSeAbriraSola,
} from "./jornada.util.ts";

describe("fechaDeJornadaPorDefecto", () => {
  it("propone el día siguiente, no el de hoy", () => {
    expect(fechaDeJornadaPorDefecto(new Date(2026, 7, 11, 9, 0))).toBe(
      "2026-08-12",
    );
  });

  it("a última hora de la tarde sigue proponiendo el día siguiente", () => {
    // El fallo que motivó la utilidad: con `toISOString()` a partir de las 19H00 en
    // Quito la fecha ya saltaba un día por su cuenta, y se sumaría dos.
    expect(fechaDeJornadaPorDefecto(new Date(2026, 7, 11, 23, 59))).toBe(
      "2026-08-12",
    );
  });

  it("cruza el fin de mes", () => {
    expect(fechaDeJornadaPorDefecto(new Date(2026, 7, 31, 10, 0))).toBe(
      "2026-09-01",
    );
  });

  it("cruza el fin de año", () => {
    expect(fechaDeJornadaPorDefecto(new Date(2026, 11, 31, 10, 0))).toBe(
      "2027-01-01",
    );
  });

  it("resuelve el 29 de febrero de un año bisiesto", () => {
    expect(fechaDeJornadaPorDefecto(new Date(2028, 1, 28, 10, 0))).toBe(
      "2028-02-29",
    );
  });
});

/**
 * REGLA DEL 2026-08-11. De esto depende que el formulario se habilite: si respondiera
 * que no cuando el servidor sí abriría la jornada, la pantalla bloquearía el registro
 * que iba a abrirla, que es exactamente el fallo que la regla vino a corregir.
 */
describe("laJornadaSeAbriraSola", () => {
  const HOY = "2026-08-11";

  it("la jornada del día siguiente se abre sola", () => {
    expect(laJornadaSeAbriraSola("2026-08-12", HOY)).toBe(true);
  });

  it("la de hoy también: el servidor solo rechaza el pasado", () => {
    expect(laJornadaSeAbriraSola(HOY, HOY)).toBe(true);
  });

  it("una fecha lejana en el futuro se admite", () => {
    // La AMC opera de lunes a domingo, así que no hay día inhábil que adelantar; cargar
    // con varios días de antelación es una decisión de quien arma el cuadro.
    expect(laJornadaSeAbriraSola("2026-09-30", HOY)).toBe(true);
  });

  it("la de ayer no", () => {
    expect(laJornadaSeAbriraSola("2026-08-10", HOY)).toBe(false);
  });

  it("compara como calendario, no como texto suelto: el cambio de mes", () => {
    expect(laJornadaSeAbriraSola("2026-09-01", "2026-08-31")).toBe(true);
    expect(laJornadaSeAbriraSola("2026-08-31", "2026-09-01")).toBe(false);
  });
});
