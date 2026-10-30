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
