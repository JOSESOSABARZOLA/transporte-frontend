/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: ordenes.util.spec.ts
 * Responsabilidad: Verificar el resumen de estado de las órdenes de un operativo (columna y panel).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-02
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ SE PRUEBA. `resumenEstado(hojas, total)` es la ÚNICA fuente del chip de la columna «Órdenes»
 * y del chip del panel, para que nunca se contradigan ni repitan el defecto de mostrar
 * «0 vigente · 1 borrador». Se prueban los CUATRO casos y el plural, que las reemplazadas no
 * cuentan, y —lo que originó la corrección— que NUNCA aparezca «0 vigente» ni «0 borrador».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from "vitest";

import {
  contarEstados,
  partesResumenCabecera,
  resumenEstado,
} from "./ordenes.util.ts";
import type { OrdenServicio } from "../interfaces/Documento.ts";

/** Una hoja de prueba: al resumen solo le importan `vigente` y `estado`. */
const hoja = (
  estado: OrdenServicio["estado"],
  vigente = estado !== "REEMPLAZADA",
): OrdenServicio =>
  ({
    codigo: "OS-ICNECU-001-1-1",
    emitidaEn: "2026-07-31T18:00:00.000Z",
    vigente,
    estado,
    version: 1,
    numeroOrden: estado === "VIGENTE" ? "AMC-OS-00005572-2026" : null,
    fechaJornada: "2026-07-31",
    datoAislado: {
      horario: "18H00 A 23H30",
      funcionario: "YUNDA JESSICA",
      conductor: { nombre: "VIVANCO JORGE", telefono: "0978631797" },
      placa: "PMA7892",
    },
    faltantes: [],
    firmante: null,
    directorId: 1,
    directorNombre: "DIRECTOR",
    esPropia: true,
    plantillaVersion: 1,
  }) as OrdenServicio;

describe("resumenEstado · el chip único de la columna «Órdenes» y del panel", () => {
  it("no emitido (vig = 0 y bor = 0): «Pendiente · N hoja(s)», en gris", () => {
    const uno = resumenEstado([], 1);
    expect(uno.texto).toBe("Pendiente · 1 hoja");
    expect(uno.clase).toBe("badge-ghost");

    // Plural de «hojas».
    expect(resumenEstado([], 3).texto).toBe("Pendiente · 3 hojas");
  });

  it("todas en firme (bor = 0): «Vigentes vig/total», en verde", () => {
    const resumen = resumenEstado([hoja("VIGENTE"), hoja("VIGENTE")], 3);
    expect(resumen.texto).toBe("Vigentes 2/3");
    expect(resumen.clase).toBe("badge-success");
  });

  it("todas a medias (vig = 0): «Borrador bor/total», en naranja — NUNCA «0 vigente»", () => {
    const resumen = resumenEstado([hoja("BORRADOR")], 1);
    expect(resumen.texto).toBe("Borrador 1/1");
    expect(resumen.clase).toBe("badge-warning");
    expect(resumen.texto).not.toMatch(/0 vigente/);
  });

  it("mixto (vig > 0 y bor > 0): «vig vigente(s) · bor borrador(es)», con plural correcto", () => {
    // Singular de ambos: 1 y 1.
    const singular = resumenEstado([hoja("VIGENTE"), hoja("BORRADOR")], 2);
    expect(singular.texto).toBe("1 vigente · 1 borrador");
    expect(singular.clase).toBe("badge-warning");

    // Plural de ambos: 2 y 2.
    const plural = resumenEstado(
      [hoja("VIGENTE"), hoja("VIGENTE"), hoja("BORRADOR"), hoja("BORRADOR")],
      4,
    );
    expect(plural.texto).toBe("2 vigentes · 2 borradores");
  });

  it("las reemplazadas NO cuentan: solo la versión actual de cada hoja", () => {
    // Dos reemplazadas (no vigentes) y una vigente en firme ⇒ «Vigentes 1/1».
    const resumen = resumenEstado(
      [hoja("REEMPLAZADA"), hoja("REEMPLAZADA"), hoja("VIGENTE")],
      1,
    );
    expect(resumen.texto).toBe("Vigentes 1/1");
    expect(resumen.clase).toBe("badge-success");
  });

  it("nunca aparece «0 vigente» ni «0 borrador» en ninguna combinación", () => {
    const combinaciones: OrdenServicio[][] = [
      [],
      [hoja("VIGENTE")],
      [hoja("BORRADOR")],
      [hoja("VIGENTE"), hoja("BORRADOR")],
      [hoja("REEMPLAZADA")],
      [hoja("BORRADOR"), hoja("BORRADOR")],
    ];
    for (const hojas of combinaciones) {
      const { texto } = resumenEstado(hojas, Math.max(hojas.length, 1));
      expect(texto).not.toMatch(/\b0 vigente/);
      expect(texto).not.toMatch(/\b0 borrador/);
    }
  });

  it("sin personal (total = 0): «Sin personal», en gris", () => {
    const resumen = resumenEstado([], 0);
    expect(resumen.texto).toBe("Sin personal");
    expect(resumen.clase).toBe("badge-ghost");
  });
});

describe("partesResumenCabecera · resumen de la jornada sin estados en 0", () => {
  it("omite los estados en 0 y nunca dice «0 vigente»", () => {
    const partes = partesResumenCabecera({
      pendiente: 0,
      borrador: 2,
      vigente: 0,
      reemplazada: 1,
    });
    const textos = partes.map((parte) => parte.texto);
    expect(textos).toEqual(["2 borradores", "1 reemplazada"]);
    expect(textos.join(" ")).not.toMatch(/\b0 /);
  });

  it("cuenta por estado con el `estado` del servidor", () => {
    const conteo = contarEstados(
      { 1: [hoja("VIGENTE"), hoja("REEMPLAZADA")], 2: [hoja("BORRADOR")] },
      3,
    );
    expect(conteo).toEqual({ pendiente: 3, borrador: 1, vigente: 1, reemplazada: 1 });
    expect(partesResumenCabecera(conteo).map((p) => p.texto)).toEqual([
      "3 pendientes",
      "1 borrador",
      "1 vigente",
      "1 reemplazada",
    ]);
  });

  it("todo en 0 → sin partes", () => {
    expect(
      partesResumenCabecera({ pendiente: 0, borrador: 0, vigente: 0, reemplazada: 0 }),
    ).toEqual([]);
  });
});
