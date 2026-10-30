/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal del operativo
 * Archivo: borradorPersonal.util.spec.ts
 * Responsabilidad: Fijar cómo se cuentan los cambios del borrador de personal y qué dice el pie.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-28
 */

import { describe, expect, it } from "vitest";

import {
  comoLoteDePersonal,
  estadoPieDelBorrador,
  hayHorariosInvalidos,
  motivoGuardarBorrador,
  resumenDelBorrador,
  textoDelBorrador,
} from "./borradorPersonal.util.ts";

const persona = (funcionarioId: number, horaInicio = "08:00", horaFin = "16:00") => ({
  funcionarioId,
  horaInicio,
  horaFin,
});

const ORIGINAL = [persona(1), persona(2)];

describe("borrador de personal (2026-10-28)", () => {
  it("cuenta altas, bajas y horarios; las altas llevan «Nuevo»", () => {
    const resumen = resumenDelBorrador(ORIGINAL, [persona(1, "09:00"), persona(3)]);

    expect(resumen).toMatchObject({ altas: 1, bajas: 1, horarios: 1, total: 3 });
    expect([...resumen.idsNuevos]).toEqual([3]);
    expect(textoDelBorrador(resumen)).toBe(
      "3 cambios sin guardar · +1 persona · −1 persona · 1 horario",
    );
  });

  it("sin diferencias no hay nada que guardar", () => {
    const resumen = resumenDelBorrador(ORIGINAL, ORIGINAL);

    expect(resumen.total).toBe(0);
    expect(estadoPieDelBorrador(resumen, false)).toEqual({
      tono: "sinCambios",
      texto: "Sin cambios pendientes",
    });
    expect(motivoGuardarBorrador(resumen, false, false)).toBe("Sin cambios");
  });

  it("un horario a medio escribir pide revisarlo y apaga «Guardar»", () => {
    const borrador = [persona(1, "08:00", "1")];
    const resumen = resumenDelBorrador(ORIGINAL, borrador);

    expect(hayHorariosInvalidos(borrador)).toBe(true);
    expect(estadoPieDelBorrador(resumen, true)).toEqual({
      tono: "error",
      texto: "Revise los horarios",
    });
    expect(motivoGuardarBorrador(resumen, true, false)).toBe("Revise los horarios");
  });

  it("con la ventana o el cuadro cerrados, «Guardar» se apaga con su motivo", () => {
    const resumen = resumenDelBorrador(ORIGINAL, [persona(1)]);

    expect(motivoGuardarBorrador(resumen, false, true)).toBe(
      "No se puede guardar: el cuadro o la ventana de carga están cerrados.",
    );
  });

  it("lo que viaja es el conjunto final con su turno", () => {
    expect(comoLoteDePersonal([persona(1), persona(3, "10:00", "12:00")])).toEqual([
      { funcionarioId: 1, horaInicio: "08:00", horaFin: "16:00" },
      { funcionarioId: 3, horaInicio: "10:00", horaFin: "12:00" },
    ]);
  });
});
