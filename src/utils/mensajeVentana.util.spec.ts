/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: mensajeVentana.util.spec.ts
 * Responsabilidad: Fijar la resolución de marcadores.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * Los mismos casos de `resolverMensajeVentana` que `mensaje-ventana.spec.ts` del servidor: las dos
 * copias no deben divergir.
 */

import { describe, expect, it } from "vitest";

import { resolverMensajeVentana } from "./mensajeVentana.util.ts";

describe("resolverMensajeVentana", () => {
  it("reemplaza {cierre} y {apertura} por las horas en formato 19H25", () => {
    expect(
      resolverMensajeVentana(
        "Se carga de {apertura} a {cierre}.",
        "07:00",
        "19:25",
      ),
    ).toBe("Se carga de 07H00 a 19H25.");
  });

  it("sin marcadores devuelve el mensaje tal cual", () => {
    expect(
      resolverMensajeVentana("La ventana está cerrada.", null, "19:25"),
    ).toBe("La ventana está cerrada.");
  });

  it("sin apertura, {apertura} es 00H00", () => {
    expect(
      resolverMensajeVentana("Abre a las {apertura}.", null, "19:25"),
    ).toBe("Abre a las 00H00.");
  });

  it("reemplaza todas las apariciones", () => {
    expect(resolverMensajeVentana("{cierre} · {cierre}", null, "16:30")).toBe(
      "16H30 · 16H30",
    );
  });
});
