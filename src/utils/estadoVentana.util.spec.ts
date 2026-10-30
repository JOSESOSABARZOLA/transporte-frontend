/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: estadoVentana.util.spec.ts
 * Responsabilidad: Fijar el estado en vivo de una ventana, su franja de 24 h, el mensaje
 *                  inconsistente y el mensaje sugerido.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 */

import { describe, expect, it } from "vitest";

import type { VentanaCarga } from "../interfaces/Administracion.ts";
import {
  comoLapso,
  partesEstado,
  detalleDeHorario,
  estadoEnVivo,
  franjasDelDia,
  textoEstado,
} from "./estadoVentana.util.ts";
import {
  detectarHoraInconsistente,
  mensajeSugerido,
} from "./mensajeVentana.util.ts";

const ventana = (parcial: Partial<VentanaCarga> = {}): VentanaCarga => ({
  rol: "DMIP_OPERATIVOS",
  tipo: "DIARIO",
  diaApertura: null,
  horaApertura: null,
  diaCierre: null,
  horaCierre: "15:00",
  zonaHoraria: "America/Guayaquil",
  mensajeCierre: "",
  activo: true,
  ...parcial,
});

/** Una hora de Quito (UTC-5) de un día de octubre de 2026: el 21 es miércoles. */
const quito = (dia: number, hora: string): Date =>
  new Date(`2026-10-${String(dia).padStart(2, "0")}T${hora}:00-05:00`);

describe("estadoEnVivo", () => {
  it("abierta, con lo que falta para el cierre", () => {
    const estado = estadoEnVivo(ventana(), quito(21, "12:50"));
    expect(estado).toEqual({
      tipo: "ABIERTA",
      cierraA: "15:00",
      faltaMin: 130,
    });
    expect(textoEstado(estado)).toBe("Abierta · cierra 15H00 (en 2 h 10 min)");
    expect(textoEstado(estadoEnVivo(ventana(), quito(21, "13:00")))).toBe(
      "Abierta · cierra 15H00 (en 2 h)",
    );
  });

  it("cerrada antes de abrir hoy, y después del cierre abre mañana", () => {
    const daf = ventana({
      rol: "DAF",
      horaApertura: "15:00",
      horaCierre: "15:30",
    });
    expect(textoEstado(estadoEnVivo(daf, quito(21, "14:10")))).toBe(
      "Cerrada · abre 15H00",
    );
    expect(textoEstado(estadoEnVivo(daf, quito(21, "16:00")))).toBe(
      "Cerrada · abre mañana 15H00",
    );
    expect(textoEstado(estadoEnVivo(ventana(), quito(21, "15:00")))).toBe(
      "Cerrada · abre mañana 00H00",
    );
  });

  it("una ventana que cruza la medianoche", () => {
    const nocturna = ventana({ horaApertura: "22:00", horaCierre: "02:00" });
    expect(estadoEnVivo(nocturna, quito(21, "23:30")).tipo).toBe("ABIERTA");
    expect(estadoEnVivo(nocturna, quito(21, "01:00")).tipo).toBe("ABIERTA");
    expect(textoEstado(estadoEnVivo(nocturna, quito(21, "10:00")))).toBe(
      "Cerrada · abre 22H00",
    );
    expect(franjasDelDia(nocturna)).toEqual([
      [22 * 60, 24 * 60],
      [0, 2 * 60],
    ]);
  });

  it("LABORABLE: el sábado cerrada hasta el lunes, y el viernes tras el cierre también", () => {
    const laborable = ventana({ tipo: "LABORABLE" });
    expect(textoEstado(estadoEnVivo(laborable, quito(24, "10:00")))).toBe(
      "Cerrada · abre el lunes 00H00",
    );
    expect(textoEstado(estadoEnVivo(laborable, quito(23, "16:00")))).toBe(
      "Cerrada · abre el lunes 00H00",
    );
    expect(estadoEnVivo(laborable, quito(23, "10:00")).tipo).toBe("ABIERTA");
  });

  it("sin restricción no restringe ni pinta franja", () => {
    const libre = ventana({
      rol: "DIRECTOR",
      tipo: "SIN_RESTRICCION",
      activo: false,
    });
    expect(textoEstado(estadoEnVivo(libre))).toBe("Sin restricción");
    expect(franjasDelDia(libre)).toEqual([]);
  });

  it("los lapsos y el detalle del horario", () => {
    expect(comoLapso(50)).toBe("50 min");
    expect(comoLapso(120)).toBe("2 h");
    expect(detalleDeHorario(ventana())).toBe("Desde 00H00 hasta 15H00");
    expect(
      detalleDeHorario(ventana({ tipo: "LABORABLE", horaApertura: "08:00" })),
    ).toBe("Desde 08H00 hasta 15H00, de lunes a viernes");
  });
});

describe("mensaje inconsistente y mensaje sugerido (espejo del servidor)", () => {
  it("una hora escrita que no es la apertura ni el cierre", () => {
    expect(
      detectarHoraInconsistente("cerró a las 18H25.", null, "15:00"),
    ).toEqual({
      texto: "18H25",
      hora: "18:25",
    });
    expect(
      detectarHoraInconsistente("va de {cierre} a 18:28", "15:00", "15:30")
        ?.hora,
    ).toBe("18:28");
  });

  it("una hora que coincide, o los marcadores, no se marcan", () => {
    expect(
      detectarHoraInconsistente("cerró a las 15H00.", null, "15:00"),
    ).toBeNull();
    expect(
      detectarHoraInconsistente("cerró a las 9h05", "09:05", null),
    ).toBeNull();
    expect(
      detectarHoraInconsistente("cerró a las {cierre}.", null, "15:00"),
    ).toBeNull();
  });

  it("el sugerido usa {apertura} y {cierre}, sin horas", () => {
    expect(mensajeSugerido("DAF", "DIARIO")).toBe(
      "La ventana de asignación de transporte va de {apertura} a {cierre}. Fuera de ese intervalo no se puede asignar conductor ni vehículo.",
    );
    expect(mensajeSugerido("DMIT_INSTRUCTOR", "LABORABLE")).toContain(
      "Vuelve a abrirse el siguiente día laborable a las {apertura}.",
    );
    expect(
      detectarHoraInconsistente(
        mensajeSugerido("DMIP_OPERATIVOS", "DIARIO"),
        null,
        "15:00",
      ),
    ).toBeNull();
  });
});

describe("partesEstado (2026-10-24)", () => {
  it("la principal arriba y el detalle aparte; sin detalle cuando no hay cuenta atrás", () => {
    expect(partesEstado({ tipo: "ABIERTA", cierraA: "15:00", faltaMin: 303 })).toEqual({
      principal: "Abierta · cierra 15H00",
      detalle: "(en 5 h 3 min)",
    });
    expect(partesEstado({ tipo: "CERRADA", abreA: "00:00", cuando: "mañana" })).toEqual({
      principal: "Cerrada · abre mañana 00H00",
      detalle: null,
    });
    expect(partesEstado({ tipo: "SIN_RESTRICCION" })).toEqual({
      principal: "Sin restricción",
      detalle: null,
    });
  });
});
