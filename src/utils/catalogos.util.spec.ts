/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: catalogos.util.spec.ts
 * Responsabilidad: Verificar las decisiones puras de P-08: duplicados, puntos activos por zonal,
 *                  aviso «sin puntos», filtros y el resumen de las zonales sin puntos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * EL DUPLICADO TIENE QUE DECIR LO MISMO QUE EL SERVIDOR. Si el aviso en vivo fuera más laxo, el
 * administrador vería «Guardar» encendido y recibiría un 409; si fuera más estricto, bloquearía
 * algo que el servidor acepta. Por eso se prueba con tildes, mayúsculas y espacios.
 */

import { describe, expect, it } from "vitest";

import type {
  Institucion,
  PuntoEncuentro,
  TipoControl,
} from "../interfaces/Formulario.ts";
import {
  buscarDuplicado,
  clave,
  contadorPuntos,
  formularioPedido,
  leerPedidoCatalogos,
  pasaEstado,
  resumenZonal,
  textoSinPuntos,
  tienePuntos,
  zonalesQueCoinciden,
  type ExistentesCatalogo,
} from "./catalogos.util.ts";

const punto = (id: number, nombre: string, zonalId: number, activo = true): PuntoEncuentro => ({
  id,
  formularioId: 1,
  nombre,
  zonalId,
  activo,
});

const EXISTENTES: ExistentesCatalogo = {
  zonales: [
    { id: 1, nombre: "Zonal Calderón" },
    { id: 2, nombre: "Zonal Quitumbe" },
  ],
  puntos: [punto(10, "Parque Central", 1), punto(11, "Mercado", 2, false)],
  tiposControl: [{ id: 20, nombre: "CONTROL DE OBRAS", formularioId: 1 } as TipoControl],
  instituciones: [
    { id: 30, formularioId: 1, sigla: "AMC", nombre: "Agencia Metropolitana de Control" } as Institucion,
  ],
};

describe("clave · la regla de comparación del servidor", () => {
  it("ignora tildes, mayúsculas y espacios sobrantes, también los de en medio", () => {
    expect(clave("  Zonal   CALDERÓN ")).toBe("zonal calderon");
  });
});

describe("buscarDuplicado", () => {
  it("zonal: el mismo nombre sin tildes ni mayúsculas es duplicado", () => {
    expect(buscarDuplicado({ tipo: "zonal", nombre: "zonal calderon" }, EXISTENTES)).toBe(
      "Ya existe una zonal con ese nombre en este formulario.",
    );
  });

  it("zonal: editarse a sí misma no es duplicado", () => {
    expect(
      buscarDuplicado({ tipo: "zonal", nombre: "Zonal Calderón" }, EXISTENTES, 1),
    ).toBeNull();
  });

  it("punto: duplicado solo dentro de SU zonal, y nombra la zonal", () => {
    expect(
      buscarDuplicado({ tipo: "punto", nombre: "PARQUE  central", zonalId: 1 }, EXISTENTES),
    ).toBe("Ya existe 'Parque Central' en Zonal Calderón.");
    expect(
      buscarDuplicado({ tipo: "punto", nombre: "Parque Central", zonalId: 2 }, EXISTENTES),
    ).toBeNull();
  });

  it("punto: un desactivado también cuenta (el servidor lo rechaza igual)", () => {
    expect(
      buscarDuplicado({ tipo: "punto", nombre: "mercado", zonalId: 2 }, EXISTENTES),
    ).toContain("Ya existe 'Mercado'");
  });

  it("tipo de control: por nombre dentro del formulario", () => {
    expect(
      buscarDuplicado({ tipo: "tipoControl", nombre: "control de obras" }, EXISTENTES),
    ).toBe("Ya existe un tipo de control con ese nombre en este formulario.");
  });

  it("institución: por sigla y, aparte, por denominación", () => {
    expect(
      buscarDuplicado({ tipo: "institucion", sigla: "amc", nombre: "Otra" }, EXISTENTES),
    ).toBe("Ya existe la sigla AMC en este formulario.");
    expect(
      buscarDuplicado(
        { tipo: "institucion", sigla: "AMC2", nombre: "agencia metropolitana de control" },
        EXISTENTES,
      ),
    ).toContain("denominación «Agencia Metropolitana de Control»");
  });

  it("vacío no es duplicado (lo dice el campo obligatorio)", () => {
    expect(buscarDuplicado({ tipo: "zonal", nombre: "  " }, EXISTENTES)).toBeNull();
  });
});

describe("resumenZonal · puntos activos de ESTE formulario y aviso «sin puntos»", () => {
  it("cuenta los de la zonal y cuántos están activos", () => {
    expect(resumenZonal({ id: 1, activo: true }, EXISTENTES.puntos)).toEqual({
      total: 1,
      activos: 1,
      sinPuntos: false,
      todosInactivos: false,
    });
  });

  it("activa con todos sus puntos desactivados: el aviso ámbar (no aparecerá en el registro)", () => {
    const resumen = resumenZonal({ id: 2, activo: true }, EXISTENTES.puntos);
    expect(resumen.todosInactivos).toBe(true);
    expect(resumen.sinPuntos).toBe(false);
  });

  it("sin ningún punto en el formulario: «sin puntos», pero NO el aviso ámbar", () => {
    const resumen = resumenZonal({ id: 9, activo: true }, EXISTENTES.puntos);
    expect(resumen.sinPuntos).toBe(true);
    expect(resumen.todosInactivos).toBe(false);
  });

  it("una zonal desactivada no lleva el aviso (ya se ve como «Inactiva»)", () => {
    expect(resumenZonal({ id: 2, activo: false }, EXISTENTES.puntos).todosInactivos).toBe(false);
  });

  it("tienePuntos cuenta también los desactivados", () => {
    expect(tienePuntos(2, EXISTENTES.puntos)).toBe(true);
    expect(tienePuntos(9, EXISTENTES.puntos)).toBe(false);
  });

  it("el contador de la pestaña, con y sin el interruptor", () => {
    expect(contadorPuntos(11, EXISTENTES.puntos)).toBe("11 zonales · 1 de 2 puntos activos");
    expect(contadorPuntos(2, EXISTENTES.puntos, true)).toBe(
      "2 zonales con puntos · 1 de 2 puntos activos",
    );
    expect(textoSinPuntos(1, true)).toBe(
      "1 zonal no tiene puntos en este formulario y está oculta",
    );
    expect(textoSinPuntos(2, true)).toBe(
      "2 zonales no tienen puntos en este formulario y están ocultas",
    );
    expect(textoSinPuntos(3, false)).toBe("3 zonales no tienen puntos en este formulario");
  });
});

describe("filtros y búsqueda", () => {
  it("pasaEstado", () => {
    expect(pasaEstado(true, "todos")).toBe(true);
    expect(pasaEstado(false, "activos")).toBe(false);
    expect(pasaEstado(false, "inactivos")).toBe(true);
  });

  it("al buscar se abren las zonales con puntos que coinciden y la que coincide por nombre", () => {
    expect([...zonalesQueCoinciden(EXISTENTES.zonales, EXISTENTES.puntos, "parque")]).toEqual([1]);
    expect([...zonalesQueCoinciden(EXISTENTES.zonales, EXISTENTES.puntos, "QUITUMBE")]).toEqual([
      2,
    ]);
    expect(zonalesQueCoinciden(EXISTENTES.zonales, EXISTENTES.puntos, "").size).toBe(0);
  });
});

describe("pedido por la dirección · ?formulario=…&areas=abierto", () => {
  it("lee el formulario y si la barra de áreas va abierta", () => {
    expect(leerPedidoCatalogos("?formulario=FIJOS&areas=abierto")).toEqual({
      formulario: "FIJOS",
      areasAbiertas: true,
    });
    expect(leerPedidoCatalogos("")).toEqual({ formulario: null, areasAbiertas: false });
  });

  it("el formulario se busca por código o por id; uno ajeno se ignora", () => {
    const lista = [
      { id: 239, codigo: "FIJOS" },
      { id: 240, codigo: "PMO" },
    ];
    expect(formularioPedido("pmo", lista)).toBe("PMO");
    expect(formularioPedido("239", lista)).toBe("FIJOS");
    expect(formularioPedido("OTRO", lista)).toBeNull();
    expect(formularioPedido(null, lista)).toBeNull();
  });
});
