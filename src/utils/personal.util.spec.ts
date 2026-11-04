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
  compararPorCarga,
  conPersonaReemplazada,
  conteoSemaforo,
  nivelDeCargaPersonal,
  pideConfirmarCarga,
  sugerenciasDeMenorCarga,
  textoModalCargaAlta,
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

describe("compararPorCarga · orden del selector por carga (por operativos, 2026-10-30)", () => {
  it("ordena por nivel de carga: baja (VERDE) → media (AMBAR) → alta (ROJO)", () => {
    const lista = [
      persona(1, { nivelCarga: "ROJO" }),
      persona(2, { nivelCarga: "VERDE" }),
      persona(3, { nivelCarga: "AMBAR" }),
    ];

    expect(ordenar(lista)).toEqual([2, 3, 1]);
  });

  it("el nivel es el de OPERATIVOS, no la fatiga por horas", () => {
    const lista = [
      persona(1, { nivelCarga: "AMBAR", nivelFatiga: "VERDE" }),
      persona(2, { nivelCarga: "VERDE", nivelFatiga: "ROJO" }),
    ];

    expect(ordenar(lista)).toEqual([2, 1]);
  });

  it("pone a los elegibles primero, aunque el no elegible tenga menos carga", () => {
    const lista = [
      persona(1, { elegible: false, motivo: "ausente", nivelCarga: "VERDE" }),
      persona(2, { elegible: true, nivelCarga: "ROJO" }),
    ];

    // El de carga alta pero asignable encabeza; el de carga baja no convocable queda detrás.
    expect(ordenar(lista)).toEqual([2, 1]);
  });

  it("a igual nivel: menos operativos arriba; a igual operativos, menor índice; al final, el apellido", () => {
    const lista = [
      persona(1, { nivelCarga: "ROJO", operativosAsignados: 4, indiceCarga: 33 }),
      persona(2, { nivelCarga: "ROJO", operativosAsignados: 3, indiceCarga: 25.5 }),
      persona(3, { nivelCarga: "ROJO", operativosAsignados: 3, indiceCarga: 25 }),
      persona(4, { nivelCarga: "AMBAR", operativosAsignados: 2, indiceCarga: 17 }),
      persona(5, { nivelCarga: "AMBAR", operativosAsignados: 2, indiceCarga: 16.5 }),
      persona(6, { nivelCarga: "AMBAR", operativosAsignados: 2, indiceCarga: 16.5 }),
    ];

    // 5 y 6 empatan en todo menos el apellido: APELLIDO5 antes que APELLIDO6.
    expect(ordenar(lista)).toEqual([5, 6, 4, 3, 2, 1]);
  });

  it("quien no trae carga calculada va al final", () => {
    const lista = [
      persona(1, {}),
      persona(2, { nivelCarga: "ROJO" }),
      persona(3, { nivelCarga: "VERDE" }),
    ];

    expect(ordenar(lista)).toEqual([3, 2, 1]);
  });
});

describe("conteoSemaforo (2026-10-30)", () => {
  const lista = [
    persona(1, { nivelCarga: "AMBAR", nivelFatiga: "ROJO" }),
    persona(2, { nivelCarga: "AMBAR", nivelFatiga: "ROJO" }),
    persona(3, { nivelCarga: "ROJO", nivelFatiga: "ROJO" }),
  ];

  it("el personal cuenta por operativos (nivelCarga)", () => {
    expect(conteoSemaforo(lista, nivelDeCargaPersonal)).toEqual({ baja: 0, media: 2, alta: 1 });
  });

  it("sin indicar, cuenta la fatiga (lo que usa la DAF)", () => {
    expect(conteoSemaforo(lista)).toEqual({ baja: 0, media: 0, alta: 3 });
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

describe("pideConfirmarCarga (2026-10-30)", () => {
  it("solo con Carga Alta por operativos, no por la fatiga de horas", () => {
    expect(pideConfirmarCarga(persona(1, { nivelCarga: "ROJO" }))).toBe(true);
    expect(pideConfirmarCarga(persona(1, { nivelCarga: "AMBAR", nivelFatiga: "ROJO" }))).toBe(false);
  });
});

describe("sugerenciasDeMenorCarga (2026-10-30)", () => {
  const velasquez = persona(1, { nivelCarga: "ROJO", operativosAsignados: 3 });

  it("hasta tres, del mismo tipo, con menos operativos y que no estén en Alta, en el orden del selector", () => {
    const lista = [
      velasquez,
      persona(2, { nivelCarga: "AMBAR", operativosAsignados: 2, indiceCarga: 17 }),
      persona(3, { nivelCarga: "AMBAR", operativosAsignados: 2, indiceCarga: 16.5 }),
      persona(4, { nivelCarga: "VERDE", operativosAsignados: 1, indiceCarga: 8.5 }),
      persona(5, { nivelCarga: "VERDE", operativosAsignados: 0 }),
    ];

    expect(sugerenciasDeMenorCarga(velasquez, lista, []).map((p) => p.id)).toEqual([5, 4, 3]);
  });

  it("no propone a quien ya está agregada, no es elegible, es de otro tipo, está en Alta o no tiene menos operativos", () => {
    const lista = [
      velasquez,
      persona(2, { nivelCarga: "VERDE", operativosAsignados: 0 }),
      persona(3, { nivelCarga: "VERDE", operativosAsignados: 0, elegible: false }),
      persona(4, { nivelCarga: "VERDE", operativosAsignados: 0, area: "TECNICO" }),
      persona(5, { nivelCarga: "ROJO", operativosAsignados: 2 }),
      persona(6, { nivelCarga: "ROJO", operativosAsignados: 3 }),
    ];

    expect(sugerenciasDeMenorCarga(velasquez, lista, [2])).toEqual([]);
  });

  it("con el horario del operativo no propone a quien se cruza (2026-10-31)", () => {
    const enOcf = {
      ajeno: false as const,
      identificador: "OCF-001-31-OCT-2026",
      formulario: { numero: 1, codigo: "OCF" },
      horaInicio: "08:00",
      horaFin: "16:30",
      zonal: null,
      punto: null,
    };
    const aguirre = persona(2, { nivelCarga: "AMBAR", operativosAsignados: 2, operativosDelDia: [enOcf] });
    const bolanos = persona(3, { nivelCarga: "VERDE", operativosAsignados: 1, operativosDelDia: [enOcf] });
    const yunda = persona(4, { nivelCarga: "VERDE", operativosAsignados: 0 });
    const horario = { horaInicio: "08:00", horaFin: "16:30" };

    expect(sugerenciasDeMenorCarga(velasquez, [velasquez, aguirre, bolanos], [], horario)).toEqual([]);
    expect(
      sugerenciasDeMenorCarga(velasquez, [velasquez, aguirre, bolanos, yunda], [], horario).map((p) => p.id),
    ).toEqual([4]);
    // Sin horario no se juzga el cruce: se proponen como antes.
    expect(
      sugerenciasDeMenorCarga(velasquez, [velasquez, aguirre, bolanos], []).map((p) => p.id),
    ).toEqual([3, 2]);
  });
});

describe("textoModalCargaAlta (2026-10-30)", () => {
  it("título y mensaje con los operativos de la semana", () => {
    expect(textoModalCargaAlta(persona(1, { operativosAsignados: 3 }))).toEqual({
      titulo: "APELLIDO1 Nombre1 tiene carga alta",
      mensaje: "Ya tiene 3 operativos esta semana. Considere repartir con quien tenga menos carga.",
    });
  });

  it("sin el conteo del servidor no inventa números", () => {
    expect(textoModalCargaAlta(persona(1)).mensaje).toBe(
      "Ya tiene una carga alta esta semana. Considere repartir con quien tenga menos carga.",
    );
  });
});
