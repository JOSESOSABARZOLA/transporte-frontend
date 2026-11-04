/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: ocupacionDelDia.util.spec.ts
 * Responsabilidad: Verificar el cruce de horarios y los textos de la ocupación del día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-31
 *
 * `seCruzan` es el espejo de `RangoHorario.seSolapaCon` (RN-28): intervalos semiabiertos partidos
 * en la medianoche, así que tocarse en el borde no es cruce y 22H00 a 02H00 sí choca con 01H00 a 05H00.
 */

import { describe, expect, it } from "vitest";

import { seCruzan } from "./horario.util.ts";
import {
  avisoCruceSeleccionado,
  cierreOcupacion,
  etiquetaOcupacion,
  horarioMasComun,
  lineaOperativoDelDia,
  motivoCruces,
  ocupacionDe,
} from "./personal.util.ts";
import type { OperativoDelDia } from "../interfaces/Personal.ts";

const h = (horaInicio: string, horaFin: string) => ({ horaInicio, horaFin });

const OCF: OperativoDelDia = {
  ajeno: false,
  identificador: "OCF-001-31-OCT-2026",
  formulario: { numero: 1, codigo: "OCF" },
  horaInicio: "08:00",
  horaFin: "16:30",
  zonal: "Zonal Calderón",
  punto: "Estación Río Coca",
};
const AJENO: OperativoDelDia = { ajeno: true, horaInicio: "18:00", horaFin: "22:00" };

describe("seCruzan (espejo de RN-28)", () => {
  it("tocarse en el borde no es cruce; pisarse sí", () => {
    expect(seCruzan(h("08:00", "16:30"), h("16:30", "22:00"))).toBe(false);
    expect(seCruzan(h("08:00", "16:30"), h("16:00", "22:00"))).toBe(true);
    expect(seCruzan(h("10:00", "14:00"), h("08:00", "16:30"))).toBe(true);
  });

  it("detecta el cruce de medianoche", () => {
    expect(seCruzan(h("22:00", "02:00"), h("01:00", "05:00"))).toBe(true);
    expect(seCruzan(h("22:00", "02:00"), h("02:00", "05:00"))).toBe(false);
    expect(seCruzan(h("18:00", "03:00"), h("08:00", "16:30"))).toBe(false);
  });

  it("una hora mal escrita no se juzga", () => {
    expect(seCruzan(h("8", "16:30"), h("08:00", "16:30"))).toBe(false);
  });
});

describe("ocupacionDe y sus textos", () => {
  it("libre, ocupado sin cruce y cruce", () => {
    expect(ocupacionDe({}, h("18:00", "22:00")).estado).toBe("LIBRE");

    const ocupado = ocupacionDe({ operativosDelDia: [OCF] }, h("18:00", "22:00"));
    expect(ocupado.estado).toBe("OCUPADO");
    expect(etiquetaOcupacion(ocupado)).toBe("Ocupado 08H00–16H30");
    expect(cierreOcupacion(ocupado, h("18:00", "22:00"))).toBe(
      "No choca con 18H00 a 22H00: se puede agregar",
    );
    expect(avisoCruceSeleccionado(ocupado)).toBeNull();

    const cruce = ocupacionDe({ operativosDelDia: [OCF, AJENO] }, h("10:00", "20:00"));
    expect(cruce.estado).toBe("CRUCE");
    expect(etiquetaOcupacion(cruce)).toBe("Se cruza 08H00–16H30 +1");
    expect(cierreOcupacion(cruce, h("10:00", "20:00"))).toBe(
      "Choca con 10H00 a 20H00: si lo agrega, cambie el horario",
    );
    expect(avisoCruceSeleccionado(cruce)).toBe(
      "⚠ Se cruza con OCF-001 (08H00 a 16H30). Cambie el horario o quítelo.",
    );
  });

  it("sin horario no se juzga el cruce", () => {
    const sinHorario = ocupacionDe({ operativosDelDia: [OCF] }, null);
    expect(sinHorario.estado).toBe("OCUPADO");
    expect(cierreOcupacion(sinHorario, null)).toBeNull();
  });

  it("el operativo ajeno solo dice su horario (RN-48)", () => {
    expect(lineaOperativoDelDia(AJENO)).toBe("18H00 a 22H00 · otro departamento");
    expect(avisoCruceSeleccionado(ocupacionDe({ operativosDelDia: [AJENO] }, h("19:00", "21:00")))).toBe(
      "⚠ Se cruza con un operativo de otro departamento (18H00 a 22H00). Cambie el horario o quítelo.",
    );
    expect(lineaOperativoDelDia(OCF)).toBe(
      "OCF-001-31-OCT-2026 · 1. OCF · 08H00 a 16H30 · Zonal Calderón · Estación Río Coca",
    );
  });

  it("el motivo del pie y el horario más común", () => {
    expect(motivoCruces(0)).toBeNull();
    expect(motivoCruces(1)).toBe("Revise los horarios · 1 persona se cruza con otro operativo");
    expect(motivoCruces(2)).toBe("Revise los horarios · 2 personas se cruzan con otro operativo");

    expect(
      horarioMasComun([h("08:00", "16:30"), h("18:00", "22:00"), h("18:00", "22:00"), {}]),
    ).toEqual(h("18:00", "22:00"));
    expect(horarioMasComun([])).toBeNull();
  });
});
