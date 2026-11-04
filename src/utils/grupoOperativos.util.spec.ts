/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Listado de operativos · registro por zonas
 * Archivo: grupoOperativos.util.spec.ts
 * Responsabilidad: Los textos del retiro del registro por zonas COMPLETO (2026-10-31).
 */

import { describe, expect, it } from "vitest";

import type { Operativo } from "../interfaces/Operativo.ts";
import {
  avisoAportadosEnRetiro,
  avisoRetiroDelRegistro,
  codigosDelRetiro,
  textoRetiroDelRegistro,
} from "./grupoOperativos.util.ts";

const codigo = (n: number, zonal: string, principal: boolean): Operativo =>
  ({
    identificador: `IG-${String(n).padStart(3, "0")}`,
    esLote: true,
    esZonaPrincipal: principal,
    zonales: [{ id: principal ? 1 : 2, codigo: "Z", nombre: zonal }],
    personal: [{ nombre: "SALAZAR SOTO ANA" }],
  }) as unknown as Operativo;

describe("retiro del registro por zonas", () => {
  it("nombra los códigos, la persona y las zonas, la principal primero", () => {
    const grupo = [
      ...[5, 6, 7, 8, 9, 10, 11].map((n) => codigo(n, "Zonal Manuela Sáenz", false)),
      ...[1, 2, 3, 4].map((n) => codigo(n, "Zonal La Mariscal", true)),
    ];

    expect(textoRetiroDelRegistro(grupo)).toBe(
      "Se quitarán los 11 códigos (IG-001 a IG-011) de SALAZAR SOTO ANA en Zonal La Mariscal y Zonal Manuela Sáenz. Esta acción no se puede deshacer.",
    );
  });

  it("el aviso dice si todo se eliminó o si alguno quedó retirado por tener órdenes", () => {
    const todos = Array.from({ length: 11 }, (_, i) => `IG-${String(i + 1).padStart(3, "0")}`);

    expect(
      avisoRetiroDelRegistro({
        retirados: 11,
        eliminados: 11,
        desactivados: 0,
        identificadores: todos,
        identificadoresDesactivados: [],
      }),
    ).toEqual({ variante: "exito", texto: "Operativo eliminado · 11 códigos retirados" });

    expect(
      avisoRetiroDelRegistro({
        retirados: 11,
        eliminados: 10,
        desactivados: 1,
        identificadores: todos,
        identificadoresDesactivados: ["IG-004"],
      }),
    ).toEqual({
      variante: "info",
      texto:
        "Operativo eliminado · 11 códigos retirados · 1 queda desactivado por tener órdenes emitidas (IG-004)",
    });
  });
});

describe("retiro de la patrulla 5/6 (2026-10-31)", () => {
  const patrulla = (
    identificador: string,
    nombre: string,
    creadoPorRol: string,
  ): Operativo =>
    ({
      identificador,
      esLote: true,
      creadoPorRol,
      formulario: { esPatrulla: true, rolDueno: "DMIP_INSPECCIONES" },
      personal: [{ nombre }],
    }) as unknown as Operativo;
  const grupo = [
    patrulla("ITECU-001-31-OCT-2026", "ALVAREZ CASAS RENE ALIRIO", "DMIP_INSPECCIONES"),
    patrulla("IGECU-001-31-OCT-2026", "SALAZAR SOTO TATIANA PILAR", "DMIP_INSPECCIONES"),
  ];

  it("dice cuántos códigos salen y que su personal queda libre", () => {
    expect(textoRetiroDelRegistro(grupo)).toBe(
      "Se quitarán los 2 códigos del operativo y su personal quedará libre. Esta acción no se puede deshacer.",
    );
  });

  it("lista cada código con su persona, por identificador", () => {
    expect(codigosDelRetiro(grupo)).toEqual([
      { identificador: "IGECU-001-31-OCT-2026", persona: "SALAZAR SOTO TATIANA PILAR" },
      { identificador: "ITECU-001-31-OCT-2026", persona: "ALVAREZ CASAS RENE ALIRIO" },
    ]);
  });

  it("avisa de las personas que aportó el DMIT; sin ellas, nada", () => {
    expect(avisoAportadosEnRetiro(grupo)).toBeNull();
    expect(
      avisoAportadosEnRetiro([
        ...grupo,
        patrulla("INECU-001-31-OCT-2026", "ESPINOZA MARIAM", "DMIT_INSTRUCTOR"),
      ]),
    ).toBe("Incluye 1 persona aportada por DMIT · Instrucción");
  });
});
