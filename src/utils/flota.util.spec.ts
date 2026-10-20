/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: flota.util.spec.ts
 * Responsabilidad: Verificar las reglas puras de «Flota y garajes»: estado de documentos, placa,
 *                  patrón, faltantes, filtros, el día de Quito y el kilometraje a revisar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 */

import { describe, expect, it } from "vitest";

import type { Conductor, UbicacionFlota, Vehiculo } from "../interfaces/Transporte.ts";
import {
  clavePlaca,
  descripcionVisible,
  esCedulaConFormato,
  esPatronValido,
  esPlacaValida,
  estadoDocumentos,
  filtrarConductores,
  filtrarGarajes,
  filtrarVehiculos,
  formatoKilometraje,
  hoyEnGuayaquil,
  kmSospechoso,
  normalizarPlaca,
  secuenciaPatron,
  textoDocumentos,
  textoFaltantes,
  ultimaVez,
  varianteDocumentos,
} from "./flota.util.ts";

const HOY = "2026-10-14";

describe("estadoDocumentos (espejo del servidor)", () => {
  it("vencido: el documento con fecha pasada, con días negativos", () => {
    expect(estadoDocumentos("2026-09-30", "2027-01-01", HOY, 30)).toEqual({
      estado: "VENCIDO",
      documento: "MATRICULA",
      vence: "2026-09-30",
      dias: -14,
    });
  });

  it("por vencer: dentro de la anticipación, incluido el día de hoy", () => {
    expect(estadoDocumentos(null, "2026-11-02", HOY, 30)).toMatchObject({
      estado: "POR_VENCER",
      documento: "SOAT",
      dias: 19,
    });
    expect(estadoDocumentos("2026-10-14", null, HOY, 30)).toMatchObject({ estado: "POR_VENCER", dias: 0 });
  });

  it("al día: con fechas y ninguna alerta; sin fechas: ninguna de las dos", () => {
    expect(estadoDocumentos("2027-06-01", "2027-06-01", HOY, 30)).toEqual({
      estado: "AL_DIA",
      documento: null,
      vence: null,
      dias: null,
    });
    expect(estadoDocumentos(null, "", HOY, 30).estado).toBe("SIN_FECHAS");
  });

  it("lo más crítico gana: vencido pesa más que por vencer, y entre iguales el que vence antes", () => {
    expect(estadoDocumentos("2026-10-20", "2026-10-01", HOY, 30).documento).toBe("SOAT");
    expect(estadoDocumentos("2026-11-01", "2026-10-20", HOY, 30).documento).toBe("SOAT");
  });

  it("la anticipación es la del parámetro, no un número fijo", () => {
    expect(estadoDocumentos("2026-11-02", "2027-01-01", HOY, 10).estado).toBe("AL_DIA");
    expect(estadoDocumentos("2026-11-02", "2027-01-01", HOY, 19).estado).toBe("POR_VENCER");
  });
});

describe("el estado de documentos en palabras", () => {
  it("dice el documento y el plazo, y la variante acompaña", () => {
    expect(textoDocumentos({ estado: "VENCIDO", documento: "MATRICULA", vence: "2026-09-30", dias: -14 })).toBe(
      "Matrícula vencida",
    );
    expect(textoDocumentos({ estado: "VENCIDO", documento: "SOAT", vence: "2026-09-30", dias: -14 })).toBe(
      "SOAT vencido",
    );
    expect(textoDocumentos({ estado: "POR_VENCER", documento: "SOAT", vence: "2026-11-02", dias: 19 })).toBe(
      "SOAT vence en 19 d",
    );
    expect(textoDocumentos({ estado: "POR_VENCER", documento: "SOAT", vence: HOY, dias: 0 })).toBe("SOAT vence hoy");
    expect(textoDocumentos({ estado: "AL_DIA", documento: null, vence: null, dias: null })).toBe("Al día");
    expect(textoDocumentos({ estado: "SIN_FECHAS", documento: null, vence: null, dias: null })).toBe("Sin fechas");
    expect(varianteDocumentos("VENCIDO")).toBe("error");
    expect(varianteDocumentos("POR_VENCER")).toBe("aviso");
    expect(varianteDocumentos("AL_DIA")).toBe("exito");
    // Sin fechas es un dato que falta: ámbar de contorno, no neutro (2026-10-15).
    expect(varianteDocumentos("SIN_FECHAS")).toBe("avisoSuave");
  });
});

describe("placa", () => {
  it("se normaliza como en el servidor: mayúsculas, sin espacios y con guion", () => {
    expect(normalizarPlaca("gye 233")).toBe("GYE-233");
    expect(normalizarPlaca("pba1235")).toBe("PBA-1235");
    expect(normalizarPlaca("PBA-1235")).toBe("PBA-1235");
  });

  it("AAA-999 y AAA-9999 son válidas; lo demás no", () => {
    expect(esPlacaValida("PBA-1235")).toBe(true);
    expect(esPlacaValida("gye233")).toBe(true);
    expect(esPlacaValida("PB-1235")).toBe(false);
    expect(esPlacaValida("PBA-12345")).toBe(false);
    expect(esPlacaValida("1234-PBA")).toBe(false);
  });

  it("se compara sin guion: PMA-7056 es la misma que PMA7056", () => {
    expect(clavePlaca("PMA-7056")).toBe(clavePlaca("pma7056"));
  });

  it("con y sin guion, en minúsculas y con espacios dan la misma placa normalizada", () => {
    for (const escrita of ["PMA3370", "pma-3370", "PMA 3370", " pma 3370 ", "Pma - 3370"]) {
      expect(normalizarPlaca(escrita)).toBe("PMA-3370");
    }
    // Lo que no es una placa queda en mayúsculas y sin espacios, para que el formato lo rechace.
    expect(normalizarPlaca("xy 12")).toBe("XY12");
    expect(esPlacaValida("xy 12")).toBe(false);
  });
});

describe("cédula y patrón", () => {
  it("la cédula son diez dígitos", () => {
    expect(esCedulaConFormato("1712345678")).toBe(true);
    expect(esCedulaConFormato("171234567")).toBe(false);
    expect(esCedulaConFormato("17123456-8")).toBe(false);
  });

  it("el patrón son de 2 a 14 letras D, N, E, L o A", () => {
    expect(esPatronValido("DD")).toBe(true);
    expect(esPatronValido("DNELADNELADNEL")).toBe(true);
    expect(esPatronValido("D")).toBe(false);
    expect(esPatronValido("DNELADNELADNELA")).toBe(false);
    expect(esPatronValido("DDXL")).toBe(false);
  });

  it("el patrón se lee en palabras", () => {
    expect(secuenciaPatron("NNL")).toBe("Noche → Noche → Libre");
  });
});

describe("conductor incompleto", () => {
  it("dice lo que falta, en el orden del servidor; completo no dice nada", () => {
    expect(textoFaltantes(["VEHICULO_HABITUAL", "PATRON_ROTACION"])).toBe("Falta: vehículo habitual, patrón");
    expect(textoFaltantes([])).toBe("");
    expect(textoFaltantes(undefined)).toBe("");
  });
});

describe("celdas", () => {
  it("el kilometraje lleva punto de miles", () => {
    expect(formatoKilometraje(85000)).toBe("85.000 km");
    expect(formatoKilometraje(1234567)).toBe("1.234.567 km");
    expect(formatoKilometraje(900)).toBe("900 km");
  });

  it("la última vez en un garaje: hoy, ayer o la fecha", () => {
    expect(ultimaVez(HOY, HOY)).toBe("hoy");
    expect(ultimaVez("2026-10-13", HOY)).toBe("ayer");
    expect(ultimaVez("2026-10-09", HOY)).toBe("09/10/2026");
  });

  it("hoy es el día de Quito, no el de Greenwich", () => {
    // 2026-10-15 03:00 UTC son las 22:00 del 14 en Quito.
    expect(hoyEnGuayaquil(new Date("2026-10-15T03:00:00Z"))).toBe("2026-10-14");
  });
});

describe("filtros", () => {
  const vehiculo = (parcial: Partial<Vehiculo>): Vehiculo => ({
    id: 1,
    placa: "PBA-1235",
    descripcion: null,
    activo: true,
    ...parcial,
  });
  const conductor = (parcial: Partial<Conductor>): Conductor => ({
    id: 10,
    cedula: "1712345678",
    nombreCompleto: "SOSA JOSE",
    telefono: null,
    licenciaTipo: null,
    vehiculoHabitual: null,
    activo: true,
    sector: null,
    parqueaderoAutorizado: false,
    tipoContrato: null,
    ...parcial,
  });

  const flota = [
    vehiculo({ id: 1, placa: "PBA-1235", documentos: { estado: "POR_VENCER", documento: "SOAT", vence: "2026-11-02", dias: 19 } }),
    vehiculo({ id: 2, placa: "PMA7056" }),
    vehiculo({ id: 3, placa: "ABM-999", activo: false }),
  ];
  const personas = [
    conductor({ id: 10, vehiculoHabitual: { id: 1, placa: "PBA-1235" } }),
    // Un conductor DE BAJA con la placa 2 no cuenta como habitual.
    conductor({ id: 11, activo: false, vehiculoHabitual: { id: 2, placa: "PMA7056" } }),
  ];

  it("Activos por omisión deja fuera a los de baja; De baja, al revés", () => {
    expect(filtrarVehiculos(flota, { busqueda: "", estado: "activos" }, personas)).toHaveLength(2);
    expect(filtrarVehiculos(flota, { busqueda: "", estado: "inactivos" }, personas)).toHaveLength(1);
    expect(filtrarVehiculos(flota, { busqueda: "", estado: "todos" }, personas)).toHaveLength(3);
  });

  it("los filtros de indicador: documentos y sin conductor habitual (solo cuentan los activos)", () => {
    const docs = filtrarVehiculos(flota, { busqueda: "", estado: "activos", indicador: "alertas-documentos" }, personas);
    expect(docs.map((uno) => uno.id)).toEqual([1]);
    const sin = filtrarVehiculos(flota, { busqueda: "", estado: "activos", indicador: "sin-conductor" }, personas);
    expect(sin.map((uno) => uno.id)).toEqual([2]);
  });

  it("se busca la placa con o sin guion", () => {
    expect(filtrarVehiculos(flota, { busqueda: "pma-7056", estado: "todos" }, personas)).toHaveLength(1);
  });

  it("conductores incompletos: los que el servidor marca con faltantes", () => {
    const lista = [conductor({ id: 1, faltantes: ["TIPO_CONTRATO"] }), conductor({ id: 2, faltantes: [] })];
    expect(
      filtrarConductores(lista, { busqueda: "", estado: "activos", indicador: "incompletos" }).map((uno) => uno.id),
    ).toEqual([1]);
  });

  it("un garaje activo pero no autorizado cuenta como de baja (D2)", () => {
    const garajes: UbicacionFlota[] = [
      { id: 1, nombre: "MATRIZ", activo: true, garajeAutorizado: true },
      { id: 2, nombre: "CALDERÓN", activo: true, garajeAutorizado: false },
    ];
    expect(filtrarGarajes(garajes, { busqueda: "", estado: "activos" }).map((uno) => uno.id)).toEqual([1]);
    expect(filtrarGarajes(garajes, { busqueda: "calderon", estado: "inactivos" })).toHaveLength(1);
  });
});

describe("ajustes del 2026-10-15", () => {
  const base = (parcial: Partial<Vehiculo>): Vehiculo => ({
    id: 1,
    placa: "PMA-3370",
    descripcion: null,
    activo: true,
    ...parcial,
  });

  it("la búsqueda encuentra la placa escrita de cualquier forma", () => {
    const flota = [base({ id: 1, placa: "PMA-3370" }), base({ id: 2, placa: "PMA-7056" })];
    for (const busqueda of ["PMA3370", "pma-3370", "PMA 3370"]) {
      const halladas = filtrarVehiculos(flota, { busqueda, estado: "todos" }, []);
      expect(halladas.map((uno) => uno.id)).toEqual([1]);
    }
  });

  it("«Con alertas de documentos» reúne vencidos, por vencer, sin fechas y con una que falta; no los al día", () => {
    const flota = [
      base({ id: 1, documentos: { estado: "VENCIDO", documento: "SOAT", vence: "2026-09-30", dias: -14 } }),
      base({ id: 2, documentos: { estado: "POR_VENCER", documento: "SOAT", vence: "2026-11-02", dias: 19 } }),
      base({ id: 3, documentos: { estado: "SIN_FECHAS", documento: null, vence: null, dias: null } }),
      base({ id: 4, documentos: { estado: "AL_DIA", documento: null, vence: null, dias: null } }),
      base({ id: 5, documentos: { estado: "INCOMPLETO", documento: "SOAT", vence: null, dias: null } }),
    ];
    const conAlertas = filtrarVehiculos(
      flota,
      { busqueda: "", estado: "activos", indicador: "alertas-documentos" },
      [],
    );
    expect(conAlertas.map((uno) => uno.id)).toEqual([1, 2, 3, 5]);
  });

  it("la descripción vacía o igual al tipo no se pinta: no se repite el tipo", () => {
    expect(descripcionVisible({ descripcion: null, tipo: "Camioneta" })).toBeNull();
    expect(descripcionVisible({ descripcion: "  ", tipo: "Camioneta" })).toBeNull();
    expect(descripcionVisible({ descripcion: "CAMIONETA", tipo: "Camioneta" })).toBeNull();
    expect(descripcionVisible({ descripcion: "Camioneta doble cabina", tipo: "Camioneta" })).toBe(
      "Camioneta doble cabina",
    );
    expect(descripcionVisible({ descripcion: "Auto sedán gris", tipo: null })).toBe("Auto sedán gris");
  });
});

describe("documentos con una fecha que falta (F1, 2026-10-15)", () => {
  it("con una sola fecha y sin alerta es INCOMPLETO y dice cuál falta", () => {
    expect(estadoDocumentos("2027-03-10", null, HOY, 30)).toEqual({
      estado: "INCOMPLETO",
      documento: "SOAT",
      vence: null,
      dias: null,
    });
    expect(estadoDocumentos(null, "2027-03-10", HOY, 30).documento).toBe("MATRICULA");
  });

  it("si la que está vence o venció, gana la alerta", () => {
    expect(estadoDocumentos("2026-09-30", null, HOY, 30).estado).toBe("VENCIDO");
    expect(estadoDocumentos(null, "2026-11-02", HOY, 30).estado).toBe("POR_VENCER");
  });

  it("se lee «Falta SOAT» / «Falta matrícula», en ámbar suave, y entra en las alertas", () => {
    const falta = { estado: "INCOMPLETO", documento: "SOAT", vence: null, dias: null } as const;
    expect(textoDocumentos(falta)).toBe("Falta SOAT");
    expect(textoDocumentos({ ...falta, documento: "MATRICULA" })).toBe("Falta matrícula");
    expect(varianteDocumentos("INCOMPLETO")).toBe("avisoSuave");
    expect(varianteDocumentos("SIN_FECHAS")).toBe("avisoSuave");
    expect(varianteDocumentos("VENCIDO")).toBe("error");
    expect(varianteDocumentos("POR_VENCER")).toBe("aviso");
  });
});

describe("kmSospechoso", () => {
  it.each([
    [10_000, false],
    [545_555, true],
    [1_000_000, true],
    [999_999, true],
    [499_999, false],
    [500_000, true],
  ])("%i km con tope 999.999 → %s", (km, esperado) => {
    expect(kmSospechoso(km, 999_999)).toBe(esperado);
  });

  it("sobre un tope menor también se marca", () => {
    expect(kmSospechoso(300_000, 250_000)).toBe(true);
  });
});
