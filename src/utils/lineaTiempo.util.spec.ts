/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Asignación de transporte (línea de tiempo por conductor)
 * Archivo: lineaTiempo.util.spec.ts
 * Responsabilidad: Verificar los cálculos puros de la línea de tiempo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Se prueban las DECISIONES: el cruce de medianoche sobre la línea 05H00, quién aparece en la
 * línea (los de libre solo con la opción activa) y cuándo un traslado «no llega».
 */

import { describe, expect, it } from "vitest";

import type { HuecoLibre } from "../interfaces/JornadaDaf.ts";
import type { Planificacion, TramoPlanificado } from "../interfaces/Planificacion.ts";
import {
  anchoDeLinea,
  COLUMNA_NOMBRE_PX,
  desplazamientoDeRotulo,
  franjaEnLinea,
  MIN_PX_POR_HORA,
  horaDeMinuto,
  minutosTraslado,
  operativosExclusivos,
  textoDuracion,
  textoHueco,
  trasladosDe,
  visibleEnLinea,
} from "./lineaTiempo.util.ts";

const zonal = (id: number, sector: string) => ({ id, nombre: `Z${id}`, sector });

const tramo = (parcial: Partial<TramoPlanificado>): TramoPlanificado => ({
  id: 1,
  operativoId: 1,
  identificador: "ID-1",
  tipo: "COMPLETO",
  horaInicio: "08:00",
  horaFin: "10:00",
  cruzaMedianoche: false,
  conductorId: null,
  conductor: null,
  vehiculoId: null,
  placa: null,
  zonalOrigen: zonal(1, "NORTE"),
  zonalDestino: zonal(1, "NORTE"),
  compartidoConTramoId: null,
  descripcion: null,
  ...parcial,
});

const plan = (parcial: Partial<Planificacion> = {}): Planificacion => ({
  fecha: "2026-10-07",
  inicioJornada: "05:00",
  operativos: [],
  bloques: [],
  tramos: [],
  conductores: [],
  vehiculos: [],
  ...parcial,
});

const operativo = (id: number, inicio: string, fin: string, zonalId = 1) => ({
  id,
  identificador: `ID-${id}`,
  formulario: "8. Inspecciones",
  horaInicio: inicio,
  horaFin: fin,
  tipoTransporte: "COMPLETO" as const,
  esMacrooperativo: false,
  estadoTransporte: "PENDIENTE",
  departamento: "DMIP_INSPECCIONES",
  zonal: zonal(zonalId, "NORTE"),
  funcionarios: [{ id: 9, nombre: "PÉREZ ANA" }],
  bloque: null,
});

describe("franjaEnLinea", () => {
  it("las 02H00 de la madrugada caen al final de la línea 05H00 (cruce de medianoche)", () => {
    expect(franjaEnLinea("05:00", "06:00", "05:00")).toEqual({ inicio: 0, fin: 60 });
    expect(franjaEnLinea("23:00", "02:00", "05:00")).toEqual({ inicio: 1080, fin: 1260 });
  });

  it("hora local: el turno D 06:00–17:00 es {60, 720} y se lee 06H00–17H00", () => {
    const franja = franjaEnLinea("06:00", "17:00", "05:00");
    expect(franja).toEqual({ inicio: 60, fin: 720 });
    expect(horaDeMinuto(franja.inicio, "05:00")).toBe("06H00");
    expect(horaDeMinuto(franja.fin, "05:00")).toBe("17H00");
  });

  it("hora local: el tramo 22:00–01:00 cruza la medianoche y se lee 22H00–01H00", () => {
    const franja = franjaEnLinea("22:00", "01:00", "05:00");
    expect(franja).toEqual({ inicio: 1020, fin: 1200 });
    expect(horaDeMinuto(franja.inicio, "05:00")).toBe("22H00");
    expect(horaDeMinuto(franja.fin, "05:00")).toBe("01H00");
  });
});

describe("trasladosDe", () => {
  const tabla = {
    pares: [],
    reglaGeneral: { mismaZona: 15, mismoSector: 30, otroSector: 60 },
  };

  it("no llega si el hueco es menor que el traslado de otro sector", () => {
    const [segmento] = trasladosDe(
      [
        tramo({ id: 1, horaInicio: "08:00", horaFin: "10:00", zonalDestino: zonal(1, "NORTE") }),
        tramo({ id: 2, horaInicio: "10:30", horaFin: "11:00", zonalOrigen: zonal(5, "SUR") }),
      ],
      "05:00",
      tabla,
    );
    expect(segmento.hueco).toBe(30);
    expect(segmento.requerido).toBe(60);
    expect(segmento.noLlega).toBe(true);
  });

  it("sin tabla, solo el cruce de horarios se marca como «no llega»", () => {
    const segmentos = trasladosDe(
      [
        tramo({ id: 1, horaInicio: "08:00", horaFin: "10:00" }),
        tramo({ id: 2, horaInicio: "09:30", horaFin: "11:00" }),
      ],
      "05:00",
      null,
    );
    expect(segmentos[0].noLlega).toBe(true);
    expect(minutosTraslado(zonal(1, "NORTE"), zonal(2, "NORTE"), null)).toBeNull();
  });
});

describe("quién aparece en la línea (2026-10-08)", () => {
  const conductor = (parcial: Partial<Planificacion["conductores"][number]>) => ({
    id: 7,
    nombre: "QUISHPE JORGE",
    sector: "NORTE",
    tipoContrato: "OCASIONAL",
    parqueaderoAutorizado: false,
    actaVigente: false,
    turno: "DIA" as const,
    activado: false,
    ausente: false,
    ultimoFinAyer: null,
    vehiculoHabitualId: null,
    ...parcial,
  });

  it("el de libre sin tramos solo aparece con «Usar conductores de libre»", () => {
    const libre = conductor({ turno: "LIBRE" });
    expect(visibleEnLinea(libre, [], false)).toBe(false);
    expect(visibleEnLinea(libre, [], true)).toBe(true);
  });

  it("el de libre con un tramo asignado aparece aunque la opción esté apagada", () => {
    const libre = conductor({ turno: "LIBRE" });
    expect(visibleEnLinea(libre, [tramo({ conductorId: 7 })], false)).toBe(true);
  });

  it("el ausente no aparece nunca", () => {
    expect(visibleEnLinea(conductor({ ausente: true }), [], true)).toBe(false);
  });

  it("marca los macrooperativos", () => {
    const p = plan({
      operativos: [{ ...operativo(1, "07:00", "09:00"), esMacrooperativo: true }, operativo(2, "08:00", "10:00")],
    });
    expect([...operativosExclusivos(p)]).toEqual([1]);
  });
});

describe("desplazamientoDeRotulo · ningún rótulo horario sobresale de la pista", () => {
  it("el primero se apoya a la izquierda, el último a la derecha y el resto se centra", () => {
    expect(desplazamientoDeRotulo(0, 11)).toBe("none");
    expect(desplazamientoDeRotulo(5, 11)).toBe("translateX(-50%)");
    expect(desplazamientoDeRotulo(10, 11)).toBe("translateX(-100%)");
  });
});

describe("anchoDeLinea · el ancho por hora sale del contenedor", () => {
  // 06H00–02H00 con la jornada a las 05H00: del minuto 60 al 1260, 20 h.
  const eje = { desde: 60, hasta: 1260 };

  /*
    Ancho real de la línea (2026-10-08), con «Sin conductor» ARRIBA y no en columna: pantalla −
    barra vertical (~15) − menú lateral (`w-65.5` = 262) − márgenes del contenido (`lg:px-8` = 64) −
    borde de la tarjeta (2) − márgenes de su cuerpo (`md:px-6` = 48). A 1280 → 889 px; a 1440 → 1049.
  */
  it("a 1280 px (889 px de línea) 06H00–02H00 cabe sin scroll, a 36 px por hora", () => {
    const ancho = anchoDeLinea(889, eje);
    expect(ancho.conScroll).toBe(false);
    expect(Math.floor(ancho.pxPorHora)).toBe(36);
    expect(COLUMNA_NOMBRE_PX + 8 + ancho.anchoPista).toBeLessThanOrEqual(889);
  });

  it("a 1440 px (1049 px de línea) cabe a 44 px por hora", () => {
    const ancho = anchoDeLinea(1049, eje);
    expect(ancho.conScroll).toBe(false);
    expect(Math.floor(ancho.pxPorHora)).toBe(44);
  });

  it("en una pantalla angosta fija el mínimo legible y pide scroll", () => {
    const ancho = anchoDeLinea(360, eje);
    expect(ancho.pxPorHora).toBe(MIN_PX_POR_HORA);
    expect(ancho.anchoPista).toBe(20 * MIN_PX_POR_HORA);
    expect(ancho.conScroll).toBe(true);
  });

  it("las columnas de la fila son nombre | pista en px", () => {
    expect(anchoDeLinea(1000, eje).columnas).toBe(`${COLUMNA_NOMBRE_PX}px 832px`);
  });
});

describe("textoHueco · las horas libres del servidor en palabras (2026-10-14)", () => {
  const hueco = (parcial: Partial<HuecoLibre> = {}): HuecoLibre => ({
    horaInicio: "08:30",
    horaFin: "14:30",
    franja: { inicio: 210, fin: 570 },
    brutoMin: 360,
    utilMinimoMin: 300,
    aprovechableMin: null,
    desde: null,
    hacia: null,
    horasExtra: false,
    ...parcial,
  });

  it("dice la franja en notación institucional y lo útil", () => {
    expect(textoHueco(hueco())).toBe("Libre 08H30 a 14H30 (útil 5 h)");
  });

  it("las horas extra lo dicen en el texto, no solo con el borde", () => {
    expect(textoHueco(hueco({ horasExtra: true, utilMinimoMin: 330 }))).toBe(
      "Libre 08H30 a 14H30 (útil 5 h 30 min) · horas extra",
    );
  });

  it("menos de una hora se dice en minutos", () => {
    expect(textoDuracion(45)).toBe("45 min");
    expect(textoDuracion(120)).toBe("2 h");
  });
});
