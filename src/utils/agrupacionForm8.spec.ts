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

import {
  agruparPorClave,
  ordenarPorPersona,
  ordenarPorPersonaYZona,
} from "./agrupacionForm8.util";
import { lineasDeZona } from "./zonasDelBloque.util.ts";

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

describe("ordenarPorPersona (2026-10-26)", () => {
  const f = (id: string, persona: string) => ({ id, persona });
  const ordenar = (filas: { id: string; persona: string }[]) =>
    ordenarPorPersona(filas, (x) => x.persona, (x) => x.id).map((x) => x.id);

  it("A, B, A queda A, A, B: cada persona seguida, en el orden de su primera aparición", () => {
    expect(ordenar([f("IG-001", "caiza"), f("IT-001", "aguirre"), f("IG-002", "caiza")])).toEqual([
      "IG-001",
      "IG-002",
      "IT-001",
    ]);
  });

  it("dentro de una persona, por identificador en orden natural (002 antes que 010)", () => {
    expect(ordenar([f("IG-010", "a"), f("IG-002", "a"), f("IT-001", "b")])).toEqual([
      "IG-002",
      "IG-010",
      "IT-001",
    ]);
  });

  it("no pierde ni duplica filas, y no toca la lista original", () => {
    const filas = [f("X-2", "b"), f("X-1", "a"), f("X-3", "b")];
    const copia = [...filas];
    expect(ordenar(filas)).toEqual(["X-2", "X-3", "X-1"]);
    expect(filas).toEqual(copia);
  });
});

describe("registro por zonas del 8 (2026-10-28)", () => {
  // NICOLE: Calderón (la principal, su zonal del Maestro) con IG-043 y La Delicia con IG-030…032.
  const fila = (identificador: string, zonal: string, esPrincipal: boolean) => ({
    identificador,
    persona: "nicole",
    zonal,
    punto: `AMC ${zonal}`,
    tipo: "CCF / ITCC",
    esPrincipal,
  });
  const filas = [
    fila("IG-031", "La Delicia", false),
    fila("IG-043", "Calderón", true),
    fila("IG-030", "La Delicia", false),
    fila("IG-032", "La Delicia", false),
  ];

  it("la zona principal va primero y cada zona con sus identificadores juntos", () => {
    const ordenadas = ordenarPorPersonaYZona(
      filas,
      (f) => f.persona,
      (f) => f.zonal,
      (f) => f.esPrincipal,
      (f) => f.identificador,
    );
    expect(ordenadas.map((f) => f.identificador)).toEqual(["IG-043", "IG-030", "IG-031", "IG-032"]);
  });

  it("una línea por zona con su lugar, su control y su rango, la principal primero", () => {
    const lineas = lineasDeZona(filas, {
      zonal: (f) => f.zonal,
      punto: (f) => f.punto,
      tipo: (f) => f.tipo,
      identificador: (f) => f.identificador,
      esPrincipal: (f) => f.esPrincipal,
    });
    expect(lineas.map((l) => l.texto)).toEqual([
      "Calderón · AMC Calderón · CCF / ITCC · IG-043",
      "La Delicia · AMC La Delicia · CCF / ITCC · IG-030 a IG-032",
    ]);
  });

  it("sin zona principal (los demás formularios) el orden es el de siempre", () => {
    const ordenadas = ordenarPorPersonaYZona(
      filas,
      (f) => f.persona,
      (f) => f.zonal,
      () => null,
      (f) => f.identificador,
    );
    expect(ordenadas.map((f) => f.identificador)).toEqual(["IG-030", "IG-031", "IG-032", "IG-043"]);
  });
});
