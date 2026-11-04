/**
 * App: Cuadro de Colores
 * Archivo: registroPorZonas.util.spec.ts
 * Responsabilidad: Las decisiones del bloque «3 · Zonas» del formulario 8 (2026-10-28).
 */

import { describe, expect, it } from "vitest";

import type { Operativo } from "../interfaces/Operativo.ts";
import {
  agregarZona,
  cantidadAcotada,
  comoZonasDelRegistro,
  faltantesDeZonas,
  indiceZonaPrincipal,
  rangosDeVistaPrevia,
  resumenDeZonas,
  textoListoPorZonas,
  zonalesUsadasPorOtras,
  zonasDeLosOperativos,
  type ZonaCaptura,
} from "./registroPorZonas.util.ts";

const DELICIA = 4;
const CALDERON = 7;
const zona = (
  zonalId: number | null,
  cantidad = 1,
  extra: Partial<ZonaCaptura> = {},
): ZonaCaptura => ({
  zonalId,
  puntoId: zonalId === null ? null : zonalId * 10,
  cantidad,
  institucionIds: [1],
  tipoControlIds: [2],
  ...extra,
});
const nombre = (id: number | null) =>
  id === DELICIA ? "La Delicia" : id === CALDERON ? "Calderón" : "—";

describe("registro por zonas · zona principal", () => {
  it("es la zonal del Maestro", () => {
    expect(indiceZonaPrincipal([zona(CALDERON), zona(DELICIA)], DELICIA)).toBe(
      1,
    );
  });

  it("si no está entre las elegidas, o la persona no tiene zonal, es la Zona 1", () => {
    expect(indiceZonaPrincipal([zona(CALDERON), zona(DELICIA)], 99)).toBe(0);
    expect(indiceZonaPrincipal([zona(CALDERON)], null)).toBe(0);
  });
});

describe("registro por zonas · agregar zona", () => {
  it("suma una tarjeta con cantidad 1 que copia instituciones y tipo de control de la anterior", () => {
    const zonas = agregarZona([
      zona(DELICIA, 13, { institucionIds: [5, 6], tipoControlIds: [8] }),
    ]);
    expect(zonas).toHaveLength(2);
    expect(zonas[1]).toEqual({
      zonalId: null,
      puntoId: null,
      cantidad: 1,
      institucionIds: [5, 6],
      tipoControlIds: [8],
    });
  });

  it("no repite una zonal: la de otra zona se ve como usada", () => {
    const zonas = [zona(DELICIA), zona(null)];
    expect(zonalesUsadasPorOtras(zonas, 1).has(DELICIA)).toBe(true);
    expect(zonalesUsadasPorOtras(zonas, 0).has(DELICIA)).toBe(false);
  });

  it("la cantidad mínima es 1", () => {
    expect(cantidadAcotada(0)).toBe(1);
    expect(cantidadAcotada(-3)).toBe(1);
    expect(cantidadAcotada(80)).toBe(50);
  });
});

describe("registro por zonas · vista previa y resumen", () => {
  it("la numeración avanza zona por zona: La Delicia 13 y Calderón 1", () => {
    const rangos = rangosDeVistaPrevia(
      [zona(DELICIA, 13), zona(CALDERON, 1)],
      "IG",
      30,
    );
    expect(rangos).toEqual(["IG-030 a IG-042", "IG-043"]);
    expect(
      resumenDeZonas([zona(DELICIA, 13), zona(CALDERON, 1)], nombre, rangos),
    ).toBe(
      "Se generarán 14 identificadores: La Delicia 13 (IG-030 a IG-042) · Calderón 1 (IG-043).",
    );
  });

  it("el pie listo dice persona, transporte, zonas e identificadores", () => {
    expect(
      textoListoPorZonas("Completo", [zona(DELICIA, 13), zona(CALDERON, 1)]),
    ).toBe(
      "Listo para registrar · 1 persona · Completo · 2 zonas · 14 identificadores",
    );
  });

  it("lo que falta se nombra por zona", () => {
    expect(
      faltantesDeZonas([
        zona(DELICIA),
        zona(CALDERON, 1, { tipoControlIds: [] }),
      ]),
    ).toEqual(["Zona 2: tipo de control"]);
  });

  it("el cuerpo lleva cada zona con su lugar, control y cantidad", () => {
    expect(comoZonasDelRegistro([zona(DELICIA, 13)])).toEqual([
      {
        zonalId: DELICIA,
        puntoId: 40,
        cantidad: 13,
        institucionIds: [1],
        tipoControlIds: [2],
      },
    ]);
  });
});

describe("registro por zonas · edición", () => {
  const operativo = (secuencial: number, zonalId: number): Operativo =>
    ({
      secuencial,
      zonales: [{ id: zonalId, codigo: "Z", nombre: nombre(zonalId) }],
      puntoEncuentro: { id: zonalId * 10, nombre: "P", zonalNombre: "" },
      instituciones: [{ id: 1, sigla: "AMC", nombre: "AMC" }],
      tiposControl: [{ id: 2, nombre: "CCF" }],
    }) as unknown as Operativo;

  it("agrupa los identificadores por zonal, en el orden de su primer número", () => {
    const zonas = zonasDeLosOperativos([
      operativo(43, CALDERON),
      operativo(31, DELICIA),
      operativo(30, DELICIA),
    ]);
    expect(zonas.map((z) => [z.zonalId, z.cantidad])).toEqual([
      [DELICIA, 2],
      [CALDERON, 1],
    ]);
  });

  it("SALAZAR SOTO (2026-10-31): 11 códigos en 2 zonas; cambiar el tipo de la Zona 2 viaja con sus 7", () => {
    const zonas = zonasDeLosOperativos([
      ...[5, 6, 7, 8, 9, 10, 11].map((n) => operativo(n, CALDERON)),
      ...[1, 2, 3, 4].map((n) => operativo(n, DELICIA)),
    ]);
    expect(zonas.map((z) => [z.zonalId, z.cantidad])).toEqual([
      [DELICIA, 4],
      [CALDERON, 7],
    ]);

    // El cajón edita la Zona 2 y guarda el registro completo (`editarPorZonas`): el servidor aplica
    // el tipo nuevo a los 7 códigos de esa zona.
    const cuerpo = comoZonasDelRegistro(
      zonas.map((zona, indice) => (indice === 1 ? { ...zona, tipoControlIds: [9] } : zona)),
    );
    expect(cuerpo[1]).toMatchObject({ zonalId: CALDERON, cantidad: 7, tipoControlIds: [9] });
    expect(cuerpo[0]).toMatchObject({ zonalId: DELICIA, cantidad: 4, tipoControlIds: [2] });
  });
});
