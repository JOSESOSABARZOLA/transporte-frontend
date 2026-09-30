/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: personal.util.spec.ts
 * Responsabilidad: Verificar el orden por carga del selector de asignación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-25
 *
 * La decisión que se prueba: el personal se ofrece SIEMPRE de menor a mayor carga —carga baja,
 * luego media, luego alta—, con los elegibles primero, para repartir de forma equitativa. No se
 * prueba el maquetado del distintivo, solo el criterio de orden.
 */

import { describe, expect, it } from "vitest";

import { compararPorCarga } from "./personal.util";
import type { PersonaElegible } from "../interfaces/Personal";

/** Construye un candidato con lo justo para el comparador; el resto no influye en el orden. */
const persona = (
  id: number,
  extra: Partial<PersonaElegible> = {},
): PersonaElegible => ({
  id,
  apellidos: `APELLIDO${id}`,
  nombres: `Nombre${id}`,
  area: "GENERAL",
  cargo: null,
  elegible: true,
  motivo: null,
  ...extra,
});

/** Ordena una lista con el comparador y devuelve solo los identificadores, para leer el orden. */
const ordenar = (lista: PersonaElegible[]): number[] =>
  [...lista].sort(compararPorCarga).map((p) => p.id);

describe("compararPorCarga · orden del selector por carga", () => {
  it("ordena de menor a mayor carga: baja (VERDE) → media (AMBAR) → alta (ROJO)", () => {
    const lista = [
      persona(1, { nivelFatiga: "ROJO" }),
      persona(2, { nivelFatiga: "VERDE" }),
      persona(3, { nivelFatiga: "AMBAR" }),
    ];

    expect(ordenar(lista)).toEqual([2, 3, 1]);
  });

  it("pone a los elegibles primero, aunque el no elegible tenga menos carga", () => {
    const lista = [
      persona(1, { elegible: false, motivo: "ausente", nivelFatiga: "VERDE" }),
      persona(2, { elegible: true, nivelFatiga: "ROJO" }),
    ];

    // El de carga alta pero asignable encabeza; el de carga baja no convocable queda detrás.
    expect(ordenar(lista)).toEqual([2, 1]);
  });

  it("a igualdad de nivel, el índice afina: menor carga arriba", () => {
    const lista = [
      persona(1, { nivelFatiga: "AMBAR", indiceCarga: 8 }),
      persona(2, { nivelFatiga: "AMBAR", indiceCarga: 6 }),
    ];

    expect(ordenar(lista)).toEqual([2, 1]);
  });

  it("quien no trae carga calculada va al final", () => {
    const lista = [
      persona(1, {}),
      persona(2, { nivelFatiga: "ROJO" }),
      persona(3, { nivelFatiga: "VERDE" }),
    ];

    expect(ordenar(lista)).toEqual([3, 2, 1]);
  });

  it("es estable: a igualdad de carga conserva el orden que ya traía", () => {
    const lista = [
      persona(10, { nivelFatiga: "VERDE" }),
      persona(20, { nivelFatiga: "VERDE" }),
      persona(30, { nivelFatiga: "VERDE" }),
    ];

    expect(ordenar(lista)).toEqual([10, 20, 30]);
  });
});
