/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: catalogoParametros.util.spec.ts
 * Responsabilidad: Fijar la agrupación, la búsqueda, los filtros y el resumen de los parámetros.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 */

import { describe, expect, it } from "vitest";

import {
  CATALOGO_PARAMETROS,
  GRUPOS_PARAMETROS,
} from "../config/catalogoParametros.ts";
import type { ParametroPolitica } from "../interfaces/Administracion.ts";
import {
  agruparParametros,
  entradaDe,
  estaModificado,
  filtrarParametros,
  textoUltimaModificacion,
} from "./catalogoParametros.util.ts";

const parametro = (
  clave: string,
  parcial: Partial<ParametroPolitica> = {},
): ParametroPolitica => ({
  clave,
  valor: "1",
  tipo: "ENTERO",
  descripcion: `Descripción de ${clave}.`,
  unidad: null,
  minimo: null,
  maximo: null,
  valorSiembra: "1",
  opciones: null,
  modificadoPor: null,
  modificadoPorNombre: null,
  modificadoEn: "2026-10-21T13:47:00.000Z",
  ...parcial,
});

describe("el catálogo", () => {
  it("cada entrada apunta a un grupo que existe, y «Otros» va al final", () => {
    const grupos = new Set(GRUPOS_PARAMETROS.map((grupo) => grupo.id));
    for (const entrada of Object.values(CATALOGO_PARAMETROS)) {
      expect(grupos.has(entrada.grupo)).toBe(true);
    }
    expect(GRUPOS_PARAMETROS.at(-1)?.id).toBe("otros");
  });

  it("los dos nombres que se confunden quedan distinguidos", () => {
    expect(entradaDe("JORNADA_MAXIMA_HORAS").etiqueta).toMatch(
      /personal del cuadro/,
    );
    expect(entradaDe("DAF_MAX_JORNADA_HORAS").etiqueta).toMatch(
      /conductor DAF/,
    );
  });

  it("una clave sin entrada cae en «Otros» con su código", () => {
    expect(entradaDe("NUEVA_CLAVE")).toEqual({
      grupo: "otros",
      etiqueta: "NUEVA_CLAVE",
      afecta: [],
    });
  });
});

describe("agrupar, buscar y filtrar", () => {
  const lista = [
    parametro("NUEVA_CLAVE", {
      valor: "SIN_CONFIGURAR",
      valorSiembra: null,
      tipo: "TEXTO",
    }),
    parametro("TRASLADO_OTRO_SECTOR_MIN"),
    parametro("DIAS_DESCANSO_PATRULLA", { valor: "2" }),
    parametro("JORNADA_MAXIMA_HORAS"),
  ];

  it("agrupa en el orden de los grupos y, dentro, en el del catálogo; vacíos fuera", () => {
    const grupos = agruparParametros(lista);
    expect(grupos.map((uno) => uno.grupo.id)).toEqual([
      "cuadro",
      "dafTraslados",
      "otros",
    ]);
    expect(grupos[0].parametros.map((uno) => uno.clave)).toEqual([
      "JORNADA_MAXIMA_HORAS",
      "DIAS_DESCANSO_PATRULLA",
    ]);
  });

  it("busca sin tildes ni mayúsculas en la etiqueta, el código y la descripción", () => {
    expect(
      filtrarParametros(lista, "TRASLADO ENTRE", "todos").map(
        (uno) => uno.clave,
      ),
    ).toEqual(["TRASLADO_OTRO_SECTOR_MIN"]);
    expect(filtrarParametros(lista, "dias_descanso", "todos")).toHaveLength(1);
    expect(
      filtrarParametros(lista, "descripción de nueva", "todos"),
    ).toHaveLength(1);
  });

  it("Modificados y Sin configurar miran el valor guardado", () => {
    expect(
      filtrarParametros(lista, "", "modificados").map((uno) => uno.clave),
    ).toEqual(["DIAS_DESCANSO_PATRULLA"]);
    expect(
      filtrarParametros(lista, "", "sinConfigurar").map((uno) => uno.clave),
    ).toEqual(["NUEVA_CLAVE"]);
  });

  it("sin siembra conocida nunca está modificado", () => {
    expect(estaModificado(lista[0], "OTRO")).toBe(false);
    expect(estaModificado(lista[3], " 1 ")).toBe(false);
    expect(estaModificado(lista[3], "2")).toBe(true);
  });
});

describe("la última modificación", () => {
  it("con el nombre y la fecha de Quito", () => {
    expect(
      textoUltimaModificacion(
        parametro("X", {
          modificadoPor: 14,
          modificadoPorNombre: "Ana Pérez",
          modificadoEn: "2026-10-22T02:00:00.000Z",
        }),
      ),
    ).toBe("Ana Pérez · 21/10/2026");
  });

  it("sin modificación, «Valor de siembra»; sin nombre, «Autor no registrado», nunca «Cuenta N»", () => {
    expect(textoUltimaModificacion(parametro("X"))).toBe("Valor de siembra");
    const sinNombre = textoUltimaModificacion(parametro("X", { modificadoPor: 6 }));
    expect(sinNombre).toMatch(/^Autor no registrado · /);
    expect(sinNombre).not.toMatch(/Cuenta/);
  });
});
