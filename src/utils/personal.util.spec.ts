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

import {
  avisoCargaAlta,
  sugerenciaDeMenorCarga,
  textoModalCargaAlta,
  compararPorCarga,
  conPersonaReemplazada,
} from "./personal.util";
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

describe("«Reemplazar» del formulario de una sola persona (2026-10-28)", () => {
  it("la persona nueva conserva horario y cantidad; nombre, área y trámite se renuevan", () => {
    const lista = [
      {
        funcionarioId: 1,
        nombre: "AGUAS PRUEBA",
        area: "TECNICO" as const,
        telefono: "0999",
        horaInicio: "08:00",
        horaFin: "16:30",
        cantidad: 3,
        tramiteCodigo: "DENUNCIA-1",
      },
    ];
    const entrante = {
      id: 2,
      apellidos: "ALVAREZ",
      nombres: "RENE",
      area: "TECNICO",
      cargo: " Inspector ",
      elegible: true,
      motivo: null,
    } as PersonaElegible;

    expect(conPersonaReemplazada(lista, 1, entrante)).toEqual([
      expect.objectContaining({
        funcionarioId: 2,
        nombre: "ALVAREZ RENE",
        telefono: null,
        cargo: "Inspector",
        horaInicio: "08:00",
        horaFin: "16:30",
        cantidad: 3,
        tramiteCodigo: null,
      }),
    ]);
  });
});

describe("avisoCargaAlta (2026-10-30)", () => {
  it("sin nadie en «Carga Alta» no avisa", () => {
    expect(
      avisoCargaAlta([
        { nombre: "PEREZ JUAN", nivelFatiga: "AMBAR", operativosAsignados: 3 },
        { nombre: "SIN CARGA" },
      ]),
    ).toBeNull();
  });

  it("una persona en «Carga Alta»: su nombre y sus operativos, en singular cuando es uno", () => {
    expect(
      avisoCargaAlta([{ nombre: "PEREZ JUAN", nivelFatiga: "ROJO", operativosAsignados: 1 }]),
    ).toEqual({
      titulo: "Carga alta de operativos",
      texto:
        "PEREZ JUAN tiene una carga alta de operativos (1 operativo esta semana). Considere repartir con quien tenga menos carga.",
    });
  });

  it("varias a la vez dan UN solo aviso con los nombres de las que están en carga alta", () => {
    expect(
      avisoCargaAlta([
        { nombre: "A", nivelFatiga: "ROJO" },
        { nombre: "B", nivelFatiga: "VERDE" },
        { nombre: "C", nivelFatiga: "ROJO" },
      ])?.texto,
    ).toBe(
      "2 de los seleccionados tienen una carga alta de operativos: A, C. Considere repartir con quien tenga menos carga.",
    );
  });
});

describe("sugerenciaDeMenorCarga (2026-10-30)", () => {
  const alta = persona(1, { nivelFatiga: "ROJO", indiceCarga: 14 });

  it("propone a la disponible del mismo tipo con MENOS carga, la menor primero", () => {
    const media = persona(2, { nivelFatiga: "AMBAR", indiceCarga: 7 });
    const baja = persona(3, { nivelFatiga: "VERDE", indiceCarga: 2 });
    expect(sugerenciaDeMenorCarga(alta, [alta, media, baja], [])).toBe(baja);
  });

  it("no propone a quien ya está agregada, no es elegible, es de otro tipo o no tiene menos carga", () => {
    const agregada = persona(2, { nivelFatiga: "VERDE", indiceCarga: 1 });
    const noElegible = persona(3, { nivelFatiga: "VERDE", indiceCarga: 1, elegible: false });
    const otroTipo = persona(4, { area: "TECNICO", nivelFatiga: "VERDE", indiceCarga: 1 });
    const masCarga = persona(5, { nivelFatiga: "ROJO", indiceCarga: 20 });
    expect(
      sugerenciaDeMenorCarga(alta, [alta, agregada, noElegible, otroTipo, masCarga], [2]),
    ).toBeNull();
  });
});

describe("textoModalCargaAlta (2026-10-30)", () => {
  it("título, mensaje con los operativos de la semana y la línea de la sugerida", () => {
    expect(
      textoModalCargaAlta(
        persona(1, { operativosAsignados: 7 }),
        persona(2, { operativosAsignados: 1 }),
      ),
    ).toEqual({
      titulo: "APELLIDO1 Nombre1 tiene carga alta",
      mensaje: "Ya tiene 7 operativos esta semana. Considere repartir con quien tenga menos carga.",
      sugerencia: "Con menos carga: APELLIDO2 Nombre2 (1 op. esta semana)",
    });
  });

  it("sin el conteo del servidor ni sugerida, no inventa números", () => {
    expect(textoModalCargaAlta(persona(1), null)).toEqual({
      titulo: "APELLIDO1 Nombre1 tiene carga alta",
      mensaje: "Ya tiene una carga alta esta semana. Considere repartir con quien tenga menos carga.",
      sugerencia: null,
    });
  });
});
