/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: banner.spec.ts
 * Responsabilidad: Verificar que el texto del banner se lea sobre cualquier color.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ES EL CASO 9 DEL PLAN —«tema oscuro, todas las combinaciones legibles»— reducido a lo
 * único que se puede afirmar sin abrir el navegador: que sobre un fondo claro el texto
 * salga negro y sobre uno oscuro salga blanco. Que el resultado **se vea** bien sigue
 * exigiendo mirarlo, y así queda declarado.
 */

import { describe, expect, it } from "vitest";

import { colorDeTextoSobre, luminancia } from "./banner.util";

describe("el texto se elige por luminancia, no por gusto", () => {
  it("sobre un fondo oscuro, texto blanco", () => {
    // Azul institucional del tema.
    expect(colorDeTextoSobre("#1b77bb")).toBe("#ffffff");
    expect(colorDeTextoSobre("#000000")).toBe("#ffffff");
  });

  it("sobre un fondo claro, texto negro", () => {
    expect(colorDeTextoSobre("#ffffff")).toBe("#000000");
    // Amarillo: es el caso que un promedio de canales resolvería mal.
    expect(colorDeTextoSobre("#ffee58")).toBe("#000000");
  });

  it("el verde pesa más que el azul, como pesa en el ojo", () => {
    // Con un promedio simple los tres darían lo mismo; con luminancia, no.
    const verde = luminancia("#00ff00") ?? 0;
    const rojo = luminancia("#ff0000") ?? 0;
    const azul = luminancia("#0000ff") ?? 0;

    expect(verde).toBeGreaterThan(rojo);
    expect(rojo).toBeGreaterThan(azul);
  });

  it("un color que no se entiende no rompe la pantalla", () => {
    // Los nueve banners del Excel son oscuros: el blanco es lo que menos daño hace.
    expect(colorDeTextoSobre("")).toBe("#ffffff");
    expect(colorDeTextoSobre("verde")).toBe("#ffffff");
    expect(colorDeTextoSobre("#12345")).toBe("#ffffff");
    expect(luminancia("no es un color")).toBeNull();
  });

  it("acepta el color con y sin almohadilla, y en cualquier caja", () => {
    expect(colorDeTextoSobre("2E7D32")).toBe(colorDeTextoSobre("#2e7d32"));
  });
});
