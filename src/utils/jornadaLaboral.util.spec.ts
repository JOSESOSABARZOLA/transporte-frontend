/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: jornadaLaboral.util.spec.ts
 * Responsabilidad: Fijar cómo se nombra una jornada y qué se le exige al capturarla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 */

import { describe, expect, it } from "vitest";

import { JORNADA_24_7, JORNADA_LV, JORNADAS_DE_PRUEBA } from "../pruebas/jornadasDePrueba.ts";
import {
  erroresDeJornada,
  jornadasElegibles,
  nombreDeJornada,
  textoDias,
  textoHorario,
  textoJornada,
} from "./jornadaLaboral.util.ts";

describe("textos de la jornada laboral", () => {
  it("los días seguidos se dicen como rango; los sueltos, uno por uno (espejo del servidor)", () => {
    expect(textoDias([1, 2, 3, 4, 5])).toBe("lunes a viernes");
    expect(textoDias([6, 7])).toBe("sábado y domingo");
    expect(textoDias([1, 3, 5])).toBe("lunes, miércoles y viernes");
  });

  it("con y sin horario", () => {
    expect(textoJornada(JORNADA_LV)).toBe("Lunes a viernes, de 08H00 a 16H00");
    expect(textoJornada(JORNADA_24_7)).toBe("Lunes a domingo, a cualquier hora");
    expect(textoHorario(JORNADA_24_7)).toBe("Sin horario · a cualquier hora");
  });

  it("el nombre de un id, o null sin jornada", () => {
    expect(nombreDeJornada(2, JORNADAS_DE_PRUEBA)).toBe("Lunes a Domingo 24/7");
    expect(nombreDeJornada(null, JORNADAS_DE_PRUEBA)).toBeNull();
  });

  it("se ofrecen las activas, y la actual aunque se haya desactivado", () => {
    const inactiva = { ...JORNADA_LV, id: 9, activo: false };
    expect(jornadasElegibles([...JORNADAS_DE_PRUEBA, inactiva]).map((j) => j.id)).toEqual([1, 2]);
    expect(jornadasElegibles([...JORNADAS_DE_PRUEBA, inactiva], 9).map((j) => j.id)).toEqual([
      1, 2, 9,
    ]);
  });
});

describe("erroresDeJornada (espejo del servidor)", () => {
  const base = { nombre: "Fin de semana", dias: [6, 7], horaInicio: null, horaFin: null };

  it("una jornada completa no tiene errores", () => {
    expect(erroresDeJornada(base, JORNADAS_DE_PRUEBA)).toEqual({});
  });

  it("nombre repetido (sin distinguir mayúsculas), salvo la propia al editar", () => {
    const repetida = { ...base, nombre: "lunes a domingo 24/7" };
    expect(erroresDeJornada(repetida, JORNADAS_DE_PRUEBA).nombre).toMatch(/Ya existe/);
    expect(erroresDeJornada(repetida, JORNADAS_DE_PRUEBA, 2)).toEqual({});
  });

  it("sin días, con una sola hora, o con inicio igual a fin", () => {
    expect(erroresDeJornada({ ...base, dias: [] }, []).dias).toBeDefined();
    expect(erroresDeJornada({ ...base, horaInicio: "08:00" }, []).horario).toMatch(/dos horas/);
    expect(
      erroresDeJornada({ ...base, horaInicio: "08:00", horaFin: "08:00" }, []).horario,
    ).toMatch(/misma/);
  });
});
