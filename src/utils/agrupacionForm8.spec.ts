/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Listados y matriz
 * Archivo: agrupacionForm8.spec.ts
 * Responsabilidad: Verificar el agrupado por clave (copias del 8 y patrulla del 5/6).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-14
 */

import { describe, expect, it } from "vitest";

import { agruparPorClave } from "./agrupacionForm8.util";

describe("agruparPorClave", () => {
  it("junta los de la misma clave y respeta el orden de aparición", () => {
    const grupos = agruparPorClave(
      [
        { id: 1, k: "a" },
        { id: 2, k: "a" },
        { id: 3, k: "a" },
        { id: 4, k: "b" },
      ],
      (x) => x.k,
    );

    expect(grupos.map((g) => g.map((x) => x.id))).toEqual([[1, 2, 3], [4]]);
  });

  /**
   * EL CAMBIO DEL 2026-09-21. El servidor entrega los códigos de una patrulla INTERCALADOS con los
   * de otra; antes, un código que no llegaba pegado a los suyos quedaba suelto y se pintaba como un
   * operativo aparte. Ahora se junta con su grupo esté donde esté, conservando el orden del grupo.
   */
  it("junta claves iguales AUNQUE no estén consecutivas, en el sitio del primero", () => {
    const grupos = agruparPorClave(
      [
        { id: 1, k: "a" },
        { id: 2, k: "b" },
        { id: 3, k: "a" },
      ],
      (x) => x.k,
    );

    // El grupo «a» ocupa la posición de su primer elemento y recoge al tercero.
    expect(grupos.map((g) => g.map((x) => x.id))).toEqual([[1, 3], [2]]);
  });

  it("un elemento con clave `null` queda en su propio grupo y no arrastra vecinos", () => {
    // Dos `null` seguidos NO se agrupan entre sí: cada uno es un grupo.
    const grupos = agruparPorClave(
      [
        { id: 1, k: null },
        { id: 2, k: null },
        { id: 3, k: "a" },
        { id: 4, k: "a" },
      ],
      (x) => x.k,
    );

    expect(grupos.map((g) => g.map((x) => x.id))).toEqual([[1], [2], [3, 4]]);
  });

  it("lista vacía devuelve ningún grupo", () => {
    expect(agruparPorClave([], () => "a")).toEqual([]);
  });
});
