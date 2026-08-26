/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: listadoOperativos.spec.ts
 * Responsabilidad: Verificar el texto de cada columna, el filtrado y la paginación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ES LA PARTE DEL LISTADO QUE **NO** NECESITA NAVEGADOR: qué texto muestra una columna,
 * qué filas sobreviven a un filtro y qué página se recorta. Al ser funciones puras se
 * pueden afirmar los casos incómodos —el filtro que se queda sin resultados en la página
 * tres, el nombre con tilde— sin montar la pantalla entera.
 */

import { describe, expect, it } from "vitest";

import {
  COLUMNAS_FILTRABLES,
  COLUMNAS_LISTADO,
  COLUMNAS_SESION,
  coincideConFiltros,
  filtrarOperativos,
  hayFiltrosActivos,
  paginar,
  valorDeColumna,
} from "./listadoOperativos.util";
import type { Operativo } from "../interfaces/Operativo";

const operativo = (parcial: Partial<Operativo> = {}): Operativo =>
  ({
    id: 1,
    identificador: "IG-002-31-JUL-2026",
    secuencial: 2,
    cuadroFecha: "2026-07-31",
    formulario: {
      codigo: "IG",
      nombre: "Inspecciones Técnicas y Generales",
      numero: 8,
      colorFondo: "#2e7d32",
      colorAcento: "#000000",
      colorNombre: "verde",
      esPatrulla: false,
      condicionanteNoct: false,
    },
    horaInicio: "09:00",
    horaFin: "18:00",
    horario: "09H00 A 18H00",
    duracionHoras: 9,
    esNocturno: false,
    cruzaMedianoche: false,
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntoEncuentro: { id: 4, nombre: "AMC Matriz", zonalNombre: "La Delicia" },
    puntoLibre: null,
    tipoControl: { id: 30, nombre: "CONTROL DE VENTAS" },
    tipoLibre: null,
    instituciones: [],
    personal: [
      {
        funcionarioId: 7,
        nombre: "REDROVÁN CARLA",
        area: "GENERAL",
        telefono: "0999999999",
        esResponsable: true,
        asignadoPorRol: "DMIP_INSPECCIONES",
      },
    ],
    composicion: { esPatrulla: false, completa: true, areasPendientes: [] },
    estadoTransporte: "PENDIENTE",
    alertaActiva: true,
    alertas: [],
    observaciones: null,
    creadoPorRol: "DMIP_INSPECCIONES",
    creadoPor: 1,
    modificadoPorRol: "DMIP_INSPECCIONES",
    modificadoPor: 1,
    version: 1,
    creadoEn: "2026-07-31T12:00:00.000Z",
    ...parcial,
  }) as Operativo;

describe("valorDeColumna · lo que se ve es lo que se filtra", () => {
  it("el formulario se lee como en el cuadro: número y nombre", () => {
    expect(valorDeColumna(operativo(), "formulario")).toBe(
      "8. Inspecciones Técnicas y Generales",
    );
  });

  it("el personal se enumera por nombre", () => {
    expect(valorDeColumna(operativo(), "personal")).toBe("REDROVÁN CARLA");
  });

  it("el punto libre ocupa el lugar del punto de catálogo", () => {
    const libre = operativo({
      puntoEncuentro: null,
      puntoLibre: "Frente al mercado",
    });

    expect(valorDeColumna(libre, "punto")).toBe("Frente al mercado");
  });

  it("el estado se traduce a la palabra que lleva el distintivo", () => {
    expect(valorDeColumna(operativo(), "estado")).toBe("Pendiente");
    expect(
      valorDeColumna(operativo({ estadoTransporte: "PROPIOS_MEDIOS" }), "estado"),
    ).toBe("Propios medios");
  });

  it("RN-40 · el conductor no tiene texto propio: lo pone la alerta", () => {
    expect(valorDeColumna(operativo(), "conductor")).toBe("");
  });

  it("todas las columnas filtrables se pueden pintar", () => {
    // Si alguien agregara un filtro sobre una columna que la tabla no dibuja, el
    // funcionario escribiría en una caja que no corresponde a nada de lo que ve.
    const pintables = new Set([...COLUMNAS_SESION, ...COLUMNAS_LISTADO]);

    for (const columna of COLUMNAS_FILTRABLES) {
      expect(pintables.has(columna)).toBe(true);
    }
  });
});

describe("el filtro compara sin distinguir mayúsculas ni tildes", () => {
  it("«redrovan» encuentra a «REDROVÁN CARLA»", () => {
    expect(coincideConFiltros(operativo(), { personal: "redrovan" })).toBe(true);
  });

  it("los filtros se acumulan: deben cumplirse todos", () => {
    const uno = operativo();

    expect(coincideConFiltros(uno, { personal: "redrovan", punto: "matriz" })).toBe(
      true,
    );
    expect(coincideConFiltros(uno, { personal: "redrovan", punto: "quitumbe" })).toBe(
      false,
    );
  });

  it("un filtro en blanco no descarta nada", () => {
    expect(coincideConFiltros(operativo(), { punto: "   " })).toBe(true);
    expect(hayFiltrosActivos({ punto: "   " })).toBe(false);
    expect(hayFiltrosActivos({ punto: "matriz" })).toBe(true);
  });

  it("filtrar por estado usa la palabra, no el código del servidor", () => {
    const filas = [
      operativo({ id: 1, estadoTransporte: "PENDIENTE" }),
      operativo({ id: 2, estadoTransporte: "ASIGNADO" }),
    ];

    expect(filtrarOperativos(filas, { estado: "asignado" })).toHaveLength(1);
    // «PROPIOS_MEDIOS» es el código interno: nadie lo escribiría en la caja.
    expect(filtrarOperativos(filas, { estado: "PROPIOS_MEDIOS" })).toHaveLength(0);
  });
});

describe("paginar", () => {
  const filas = Array.from({ length: 23 }, (_, indice) =>
    operativo({ id: indice + 1 }),
  );

  it("recorta la página pedida", () => {
    const segunda = paginar(filas, 1, 10);

    expect(segunda.filas).toHaveLength(10);
    expect(segunda.filas[0].id).toBe(11);
    expect(segunda.total).toBe(23);
    expect(segunda.totalPaginas).toBe(3);
  });

  it("la última página puede estar incompleta", () => {
    expect(paginar(filas, 2, 10).filas).toHaveLength(3);
  });

  it("si la página pedida ya no existe, devuelve la última y **lo dice**", () => {
    // Es el caso de filtrar desde la página 3: sin esta corrección se vería una tabla
    // vacía habiendo resultados.
    const corregida = paginar(filas.slice(0, 5), 2, 10);

    expect(corregida.pagina).toBe(0);
    expect(corregida.filas).toHaveLength(5);
  });

  it("sin filas hay una página, no cero", () => {
    const vacia = paginar([], 0, 10);

    expect(vacia.totalPaginas).toBe(1);
    expect(vacia.total).toBe(0);
    expect(vacia.filas).toEqual([]);
  });
});
