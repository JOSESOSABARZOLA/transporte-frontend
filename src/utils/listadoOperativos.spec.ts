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
  cabeceraDeFecha,
  coincideConFiltros,
  filtrarOperativos,
  hayFiltrosActivos,
  paginar,
  rangoPaginas,
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
  // Compacto en la celda (2026-10-19), pero el filtro busca por número, código o nombre.
  it("el formulario se filtra por número, código o nombre", () => {
    expect(valorDeColumna(operativo(), "formulario")).toBe(
      "8 · IG · Inspecciones Técnicas y Generales",
    );
    const filtrar = (texto: string) =>
      coincideConFiltros(operativo(), { formulario: texto } as Parameters<typeof coincideConFiltros>[1]);
    expect(filtrar("8")).toBe(true);
    expect(filtrar("ig")).toBe(true);
    expect(filtrar("inspecciones tecnicas")).toBe(true);
    expect(filtrar("PMO")).toBe(false);
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

describe("columna «Transporte» (2026-10-07)", () => {
  it("dice el tipo con el mismo nombre que en todo el sistema, y «· Exclusivo» si aplica", () => {
    expect(valorDeColumna(operativo({ tipoTransporte: "SOLO_INICIO" }), "transporte")).toBe(
      "Solo dejar",
    );
    expect(
      valorDeColumna(
        operativo({ tipoTransporte: "INICIO_Y_FIN", esMacrooperativo: true }),
        "transporte",
      ),
    ).toBe("Dejar y retirar · Exclusivo");
    expect(valorDeColumna(operativo({ tipoTransporte: "PROPIOS_MEDIOS" }), "transporte")).toBe(
      "Propios medios",
    );
  });
});

describe("cabecera de un día en P-02 con varios días (2026-10-13)", () => {
  it("dice el día de la semana, la fecha y cuántos operativos tiene", () => {
    expect(cabeceraDeFecha("2026-10-14", 3)).toBe("Miércoles 14/10/2026 · 3 operativos");
    expect(cabeceraDeFecha("2026-10-13", 1)).toBe("Martes 13/10/2026 · 1 operativo");
    // El 1 de enero de 2027 es viernes: el día no depende de la zona del navegador.
    expect(cabeceraDeFecha("2027-01-01", 2)).toBe("Viernes 01/01/2027 · 2 operativos");
  });
});

describe("columnas de P-01 (2026-10-13)", () => {
  it("Transporte y Observaciones se filtran, y el conductor no", () => {
    expect(COLUMNAS_FILTRABLES).toContain("transporte");
    expect(COLUMNAS_FILTRABLES).toContain("observaciones");
    expect(COLUMNAS_FILTRABLES).not.toContain("conductor");
    for (const columna of COLUMNAS_SESION) {
      expect([...COLUMNAS_LISTADO, "transporte", "observaciones"]).toContain(columna);
    }
  });

  it("Observaciones es la última columna de P-01 y, desde el 2026-10-19, también de P-02", () => {
    expect(COLUMNAS_SESION.at(-1)).toBe("observaciones");
    expect(COLUMNAS_LISTADO.at(-1)).toBe("observaciones");
  });
});

describe("rangoPaginas (paginador numerado, 2026-10-15)", () => {
  it("hasta siete páginas, todas; sin registros, una", () => {
    expect(rangoPaginas(1, 2)).toEqual([1, 2]);
    expect(rangoPaginas(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rangoPaginas(1, 0)).toEqual([1]);
  });

  it("con muchas, siempre siete casillas: primera, última, la actual con sus vecinas y la elipsis", () => {
    expect(rangoPaginas(5, 12)).toEqual([1, "…", 4, 5, 6, "…", 12]);
    expect(rangoPaginas(1, 12)).toEqual([1, 2, 3, 4, 5, "…", 12]);
    expect(rangoPaginas(4, 12)).toEqual([1, 2, 3, 4, 5, "…", 12]);
    expect(rangoPaginas(12, 12)).toEqual([1, "…", 8, 9, 10, 11, 12]);
    expect(rangoPaginas(9, 12)).toEqual([1, "…", 8, 9, 10, 11, 12]);
  });

  it("una página fuera de rango se acota", () => {
    expect(rangoPaginas(40, 12)).toEqual(rangoPaginas(12, 12));
    expect(rangoPaginas(0, 12)).toEqual(rangoPaginas(1, 12));
  });
});
