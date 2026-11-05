import { describe, expect, it } from "vitest";

import { compactarIdentificadores, identificadorCorto } from "./rangoIdentificadores.util.ts";

const ig = (n: number) => `IG-${String(n).padStart(3, "0")}-28-OCT-2026`;

describe("rangos de identificadores (2026-10-28)", () => {
  it("13 consecutivos se escriben como un rango", () => {
    expect(compactarIdentificadores(Array.from({ length: 13 }, (_, i) => ig(30 + i)))).toBe(
      "IG-030 a IG-042",
    );
  });

  it("uno solo queda como está, sin fecha", () => {
    expect(compactarIdentificadores([ig(43)])).toBe("IG-043");
  });

  it("un hueco parte la racha, y el orden de llegada no importa", () => {
    expect(compactarIdentificadores([ig(37), ig(30), ig(31), ig(32)])).toBe(
      "IG-030 a IG-032, IG-037",
    );
  });

  it("el corto quita la fecha", () => {
    expect(identificadorCorto(ig(30))).toBe("IG-030");
  });
});

describe("rangos de un registro agrupado (2026-11-04)", () => {
  it("prefijos distintos de la patrulla van con punto medio", () => {
    expect(
      compactarIdentificadores(["ITECU-001-05-NOV-2026", "IGECU-001-05-NOV-2026"]),
    ).toBe("IGECU-001 · ITECU-001");
  });

  it("dentro de un prefijo el hueco sigue con coma", () => {
    expect(
      compactarIdentificadores([
        "IGECU-001-05-NOV-2026",
        "IGECU-003-05-NOV-2026",
        "ITECU-001-05-NOV-2026",
      ]),
    ).toBe("IGECU-001, IGECU-003 · ITECU-001");
  });
});
