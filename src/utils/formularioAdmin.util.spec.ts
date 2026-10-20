/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: formularioAdmin.util.spec.ts
 * Responsabilidad: Verificar las reglas puras del alta y la edición de un formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 */

import { describe, expect, it } from "vitest";

import type { FormularioAdmin } from "../interfaces/Formulario.ts";
import {
  cambiosDeEdicion,
  colorEnUso,
  cuerpoDeAlta,
  ejemploIdentificador,
  erroresDe,
  etiquetasComportamiento,
  numeroLibre,
  opcionDePolitica,
  politicaAGuardar,
  repetidosDe,
  rutaCatalogosConAreas,
  seccionesPendientes,
  textoEjemploIdentificador,
  valoresIniciales,
} from "./formularioAdmin.util.ts";

const fila = (parcial: Partial<FormularioAdmin> = {}): FormularioAdmin => ({
  id: 239,
  numero: 1,
  codigo: "FIJOS",
  nombre: "OPERATIVOS DE CONTROL FIJOS",
  colorFondo: "#A2C4C9",
  colorAcento: "#000000",
  colorNombre: "Verde azulado",
  rolDueno: "DMIP_OPERATIVOS",
  politicaVehiculo: "NO_APLICA",
  condicionanteNoct: false,
  esPatrulla: false,
  capturaLibrePunto: false,
  capturaLibreTipo: true,
  puntoManual: true,
  filtraPersonalPorRol: true,
  tipoControlMultiple: true,
  variosPorPersona: false,
  cantidadPorPersona: false,
  orden: 1,
  activo: true,
  areas: ["OPERATIVOS"],
  prefijo: "OCF",
  prefijoMostrado: "OCF",
  prefijos: [{ prefijo: "OCF", area: null, predeterminado: false, adicional: false }],
  tipoTransportePorDefecto: "PROPIOS_MEDIOS",
  ...parcial,
});

const LIMPIA = fila({
  id: 241,
  numero: 3,
  codigo: "LIMPIA",
  nombre: "OPERATIVOS DE CONTROL LIMPIAPARABRISAS",
  colorFondo: "#B4C6E7",
  colorNombre: "Azul",
  prefijo: "OCL",
  prefijoMostrado: "OCL",
  prefijos: [{ prefijo: "OCL", area: null, predeterminado: false, adicional: false }],
});

const INSP = fila({
  id: 246,
  numero: 8,
  codigo: "INSP",
  nombre: "INSPECCIONES TÉCNICAS Y GENERALES",
  colorFondo: "#CCCCFF",
  colorNombre: "Morado",
  prefijo: null,
  prefijoMostrado: "IG",
  prefijos: [
    { prefijo: "IG", area: "GENERAL", predeterminado: false, adicional: false },
    { prefijo: "IGA", area: "GENERAL", predeterminado: false, adicional: true },
  ],
});

describe("número libre", () => {
  it("es el más bajo que nadie ocupa, activos e inactivos incluidos", () => {
    expect(numeroLibre([{ numero: 1 }, { numero: 2 }, { numero: 4 }])).toBe(3);
    expect(numeroLibre([])).toBe(1);
    expect(numeroLibre(Array.from({ length: 99 }, (_, i) => ({ numero: i + 1 })))).toBeNull();
  });
});

describe("ejemplo del identificador", () => {
  it("usa el prefijo en mayúsculas y la fecha con el mes de tres letras del servidor", () => {
    expect(ejemploIdentificador("ocf", new Date(2026, 9, 9))).toBe("OCF-001-09-OCT-2026");
    expect(ejemploIdentificador("IG", new Date(2026, 8, 30))).toBe("IG-001-30-SEP-2026");
  });

  it("sin prefijo pide escribirlo; con prefijo muestra el ejemplo completo", () => {
    const hoy = new Date(2026, 9, 13);
    expect(textoEjemploIdentificador("", hoy)).toBe("Escriba el prefijo para ver el ejemplo.");
    expect(textoEjemploIdentificador("   ", hoy)).toBe("Escriba el prefijo para ver el ejemplo.");
    expect(textoEjemploIdentificador("ocf", hoy)).toBe("Los operativos se numerarán OCF-001-13-OCT-2026.");
  });
});

describe("repetidos en vivo", () => {
  const todos = [fila(), LIMPIA, INSP];

  it("en un alta, número, código y prefijo de otro formulario se avisan con el texto del servidor", () => {
    const repetidos = repetidosDe({ numero: "3", codigo: "limpia", prefijo: "ig" }, todos, null, true);
    expect(repetidos.numero).toBe("Ya existe un formulario con el número 3.");
    expect(repetidos.codigo).toBe("Ya existe un formulario con el código LIMPIA.");
    // El prefijo se compara contra TODOS los prefijos de los demás, también los de área.
    expect(repetidos.prefijo).toBe(
      "El prefijo IG ya lo usa otro formulario: los identificadores se confundirían.",
    );
  });

  it("al editar, el formulario no choca consigo mismo y número/código ya no se comparan", () => {
    expect(repetidosDe({ numero: "1", codigo: "FIJOS", prefijo: "OCF" }, todos, "FIJOS", true)).toEqual({});
    expect(repetidosDe({ numero: "1", codigo: "FIJOS", prefijo: "OCL" }, todos, "FIJOS", true).prefijo).toMatch(
      /OCL ya lo usa otro formulario/,
    );
  });

  it("un formulario que numera por área no valida prefijo (no se edita)", () => {
    expect(repetidosDe({ numero: "8", codigo: "INSP", prefijo: "OCF" }, todos, "INSP", false)).toEqual({});
  });
});

describe("color en uso", () => {
  it("solo cuenta otro formulario VIGENTE con ese color", () => {
    const inactivo = fila({ codigo: "VIEJO", numero: 20, activo: false, colorFondo: "#FFCCCC" });
    expect(colorEnUso("#b4c6e7", [fila(), LIMPIA], null)?.codigo).toBe("LIMPIA");
    expect(colorEnUso("#A2C4C9", [fila(), LIMPIA], "FIJOS")).toBeNull();
    expect(colorEnUso("#FFCCCC", [inactivo], null)).toBeNull();
    expect(colorEnUso("", [LIMPIA], null)).toBeNull();
  });
});

describe("secciones pendientes", () => {
  it("un alta en blanco tiene pendientes Identificación, Color y Responsable", () => {
    const valores = valoresIniciales(null, 11);
    expect(seccionesPendientes(erroresDe(valores, true), {})).toEqual([
      "Identificación",
      "Color",
      "Responsable y transporte",
    ]);
  });

  it("un repetido deja pendiente la Identificación aunque los campos estén llenos", () => {
    const valores = valoresIniciales(fila(), null);
    expect(seccionesPendientes(erroresDe(valores, true), { prefijo: "repetido" })).toEqual(["Identificación"]);
    expect(seccionesPendientes(erroresDe(valores, true), {})).toEqual([]);
  });

  it("sin prefijo general, el prefijo no se exige", () => {
    expect(erroresDe({ ...valoresIniciales(INSP, null), prefijo: "" }, false).prefijo).toBeUndefined();
  });
});

describe("etiquetas de comportamiento", () => {
  it("reflejan las banderas activas en orden fijo", () => {
    expect(etiquetasComportamiento(fila())).toEqual(["Varios tipos"]);
    expect(
      etiquetasComportamiento(
        fila({ esPatrulla: true, condicionanteNoct: true, variosPorPersona: true, tipoControlMultiple: false }),
      ),
    ).toEqual(["Patrulla", "Nocturno", "Uno por persona"]);
  });
});

describe("política de vehículo en tres opciones", () => {
  it("REQUERIDO y OBLIGATORIO se leen «Siempre», y se conservan si no se toca la opción", () => {
    expect(opcionDePolitica("OBLIGATORIO")).toBe("SIEMPRE");
    expect(opcionDePolitica("REQUERIDO")).toBe("SIEMPRE");
    expect(politicaAGuardar("SIEMPRE", "OBLIGATORIO")).toBe("OBLIGATORIO");
    expect(politicaAGuardar("SIEMPRE", "CONDICIONAL")).toBe("REQUERIDO");
    expect(politicaAGuardar("SIEMPRE", null)).toBe("REQUERIDO");
    expect(politicaAGuardar("NO_APLICA", "OBLIGATORIO")).toBe("NO_APLICA");
  });
});

describe("lo que viaja al servidor", () => {
  it("el alta lleva el nombre en mayúsculas y NO lleva áreas", () => {
    const cuerpo = cuerpoDeAlta({
      ...valoresIniciales(null, 11),
      codigo: "nuevo",
      prefijo: "ocn",
      nombre: "operativo nuevo",
      colorFondo: "#B4C6E7",
      colorAcento: "#000000",
      colorNombre: "Azul",
      rolDueno: "DMIP_OPERATIVOS",
    });
    expect(cuerpo).toMatchObject({ numero: 11, codigo: "NUEVO", prefijo: "OCN", nombre: "OPERATIVO NUEVO" });
    expect(cuerpo).not.toHaveProperty("areas");
  });

  it("la edición manda solo lo que cambió, nunca número, código ni áreas", () => {
    const original = fila({ politicaVehiculo: "OBLIGATORIO" });
    const sinCambios = valoresIniciales(original, null);
    expect(cambiosDeEdicion(original, sinCambios)).toEqual({});

    const cambios = cambiosDeEdicion(original, { ...sinCambios, colorFondo: "#B4C6E7", colorNombre: "Azul", esPatrulla: true });
    expect(cambios).toEqual({
      colorFondo: "#B4C6E7",
      colorAcento: "#000000",
      colorNombre: "Azul",
      esPatrulla: true,
    });
    expect(cambios).not.toHaveProperty("numero");
    expect(cambios).not.toHaveProperty("codigo");
    expect(cambios).not.toHaveProperty("areas");
  });

  it("un formulario que numera por área nunca manda prefijo", () => {
    expect(cambiosDeEdicion(INSP, { ...valoresIniciales(INSP, null), prefijo: "XX" })).toEqual({});
  });
});

describe("enlace a Catálogos", () => {
  it("lleva el formulario y la barra de áreas abierta", () => {
    expect(rutaCatalogosConAreas("FIJOS")).toBe(
      "/home/administracion/catalogos-cuadro?formulario=FIJOS&areas=abierto",
    );
  });
});
