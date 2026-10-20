/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: estadoPieDrawer.util.spec.ts
 * Responsabilidad: Fijar los estados del pie del cajón estándar y su orden de prioridad.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { describe, expect, it } from "vitest";

import { estadoPieDrawer, motivoSinCambios, textoPorCompletar } from "./estadoPieDrawer.util.ts";

const base = { esEdicion: false, hayCambios: false, intentado: false, faltan: [] as string[] };

describe("estados del pie del cajón estándar", () => {
  it("edición sin cambios: «Sin cambios pendientes» y Guardar apagado", () => {
    expect(estadoPieDrawer({ ...base, esEdicion: true, faltan: ["nombre"] })).toEqual({
      tono: "sinCambios",
      texto: "Sin cambios pendientes",
    });
    expect(motivoSinCambios(true, false)).toBe("Sin cambios");
    expect(motivoSinCambios(true, true)).toBeNull();
    expect(motivoSinCambios(false, false)).toBeNull();
  });

  it("edición con cambios: «Cambios sin guardar»", () => {
    expect(estadoPieDrawer({ ...base, esEdicion: true, hayCambios: true })).toEqual({
      tono: "cambios",
      texto: "Cambios sin guardar",
    });
  });

  it("alta con faltantes: cuenta antes del intento (gris) y nombra después (rojo)", () => {
    expect(estadoPieDrawer({ ...base, faltan: ["sigla", "denominación"] })).toEqual({
      tono: "pendiente",
      texto: "2 campos por completar",
    });
    expect(
      estadoPieDrawer({ ...base, intentado: true, faltan: ["sigla", "denominación"] }),
    ).toEqual({ tono: "error", texto: "Falta: sigla, denominación" });
  });

  it("lo que no es obligatorio vacío queda «por revisar»; completo, «Listo para guardar»", () => {
    expect(estadoPieDrawer({ ...base, porRevisar: ["teléfono"] })).toEqual({
      tono: "pendiente",
      texto: "Por revisar: teléfono",
    });
    expect(estadoPieDrawer(base)).toEqual({ tono: "listo", texto: "Listo para guardar" });
    expect(estadoPieDrawer({ ...base, textoListo: "Listo para registrar" }).texto).toBe(
      "Listo para registrar",
    );
  });

  it("el contexto propio va delante: «1 efectivo · Sin cambios pendientes»", () => {
    expect(
      estadoPieDrawer({ ...base, esEdicion: true, contexto: "1 efectivo" }).texto,
    ).toBe("1 efectivo · Sin cambios pendientes");
    expect(textoPorCompletar(1)).toBe("1 campo por completar");
  });
});
