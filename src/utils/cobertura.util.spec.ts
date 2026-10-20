/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: cobertura.util.spec.ts
 * Responsabilidad: Verificar la lógica pura de la matriz: rotación, patrones y totales.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 */

import { describe, expect, it } from "vitest";

import type { PersonaCobertura } from "../interfaces/Cobertura";
import {
  calcularTotales,
  expandirPatron,
  planificarPatron,
  resumirSinTurno,
  siguienteEnRotacion,
} from "./cobertura.util";

const DIAS = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];

const persona = (
  funcionarioId: number,
  estados: (string | null | "AUS")[],
): PersonaCobertura => ({
  funcionarioId,
  nombre: `P${funcionarioId}`,
  cargo: null,
  zonalId: null,
  zona: null,
  denominacion: null,
  avisos: 0,
  celdas: estados.map((estado, i) => ({
    fecha: DIAS[i],
    estado: estado === "AUS" ? "VACACIONES" : estado,
    esAusencia: estado === "AUS",
  })),
});

describe("cobertura.util", () => {
  it("la rotación por clic recorre D → N → — → vacía → D", () => {
    expect(siguienteEnRotacion(null)).toBe("DIURNO");
    expect(siguienteEnRotacion("DIURNO")).toBe("NOCTURNO");
    expect(siguienteEnRotacion("NOCTURNO")).toBe("DESCANSO");
    expect(siguienteEnRotacion("DESCANSO")).toBeNull();
  });

  it("el patrón libre admite solo D, N y - de 2 a 14 letras", () => {
    expect(expandirPatron("dd-")).toEqual(["DIURNO", "DIURNO", "DESCANSO"]);
    expect(expandirPatron("D—N")).toEqual(["DIURNO", "DESCANSO", "NOCTURNO"]);
    expect(expandirPatron("D")).toBeNull();
    expect(expandirPatron("DXN")).toBeNull();
    expect(expandirPatron("D".repeat(15))).toBeNull();
  });

  it("«solo celdas vacías» no toca lo planificado y nunca las ausencias", () => {
    const plan = planificarPatron({
      personas: [persona(1, [null, "NOCTURNO", "AUS", null])],
      indicesDias: [0, 1, 2, 3],
      desdeIndice: 0,
      patron: ["DIURNO", "DESCANSO"],
      soloVacias: true,
    });
    expect(plan.cambios).toEqual([
      { funcionarioId: 1, fecha: "2026-10-01", estado: "DIURNO" },
      { funcionarioId: 1, fecha: "2026-10-04", estado: "DESCANSO" },
    ]);
    expect(plan.yaTenianTurno).toBe(0);
    expect(plan.omitidasAusencia).toBe(1);
  });

  it("«Sobrescribir» reescribe lo planificado y lo cuenta como «ya tenían turno»", () => {
    const plan = planificarPatron({
      personas: [persona(1, [null, "NOCTURNO", "AUS", null])],
      indicesDias: [0, 1, 2, 3],
      desdeIndice: 1,
      patron: ["DIURNO"],
      soloVacias: false,
    });
    expect(plan.cambios.map((c) => c.fecha)).toEqual([
      "2026-10-02",
      "2026-10-04",
    ]);
    expect(plan.yaTenianTurno).toBe(1);
  });

  it("los totales cuentan diurno, nocturno, descanso, ausencias y sin turno", () => {
    const totales = calcularTotales(
      [persona(1, ["DIURNO", "AUS", null, "DESCANSO"]), persona(2, ["NOCTURNO", null, null, null])],
      DIAS.length,
    );
    expect(totales[0]).toEqual({
      diurno: 1,
      nocturno: 1,
      descanso: 0,
      ausencias: 0,
      sinTurno: 0,
    });
    expect(totales[1]).toMatchObject({ ausencias: 1, sinTurno: 1 });
    expect(totales[3]).toMatchObject({ descanso: 1, sinTurno: 1 });
  });

  it("resume el mes sin planificar: personas, días y rango", () => {
    expect(
      resumirSinTurno(
        [persona(1, ["DIURNO", null, "AUS", null]), persona(2, ["DIURNO", "DIURNO", "DIURNO", "DIURNO"])],
        DIAS,
      ),
    ).toEqual({ personas: 1, dias: 2, desde: "2026-10-02", hasta: "2026-10-04" });
  });
});
