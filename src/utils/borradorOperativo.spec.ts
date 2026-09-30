/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: borradorOperativo.spec.ts
 * Responsabilidad: Verificar que el borrador de P-01 se conserva, se lee y se retira bien.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-04
 *
 * Se prueban DECISIONES, no el maquetado: que la captura de un formulario NO se vea en otro
 * (2026-09-10), que un borrador de otra versión de esquema se descarte, que un borrador vacío
 * se reconozca como tal, y que los barridos no toquen claves ajenas. La promesa que sostiene
 * es «LO CAPTURADO NUNCA SE PIERDE», ahora aislada por formulario.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  esBorradorVacio,
  guardarBorrador,
  guardarPuntero,
  leerBorrador,
  leerPuntero,
  limpiarBorrador,
  limpiarBorradoresDeUsuario,
  limpiarTodosLosBorradores,
  type BorradorOperativo,
} from "./borradorOperativo.util.ts";
import {
  VALORES_INICIALES,
  type ValoresOperativo,
} from "./valoresOperativo.util.ts";
import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";

const USUARIO = 7;
const FORM_A = "OCAPMO";
const FORM_B = "INSP";
const FECHA = "2026-09-11";
const CLAVE_A = `cco.borradorOperativo.v6.form.7.${FECHA}.${FORM_A}`;
const CLAVE_PTR = "cco.borradorOperativo.v6.ptr.7";

const persona: PersonaAgregada = {
  funcionarioId: 41,
  nombre: "Ana Pérez",
  telefono: "0999999999",
};

const conDatos: ValoresOperativo = {
  ...VALORES_INICIALES,
  formularioCodigo: FORM_A,
  zonalesIds: [3],
  punto: "12",
  observaciones: ["Control en el mercado"],
};

const borradorLleno: BorradorOperativo = {
  personal: [persona],
  valores: conDatos,
};

afterEach(() => {
  window.sessionStorage.clear();
});

describe("esBorradorVacio", () => {
  it("es vacío cuando no hay personal ni campos, aunque haya formulario", () => {
    const soloFormulario: ValoresOperativo = {
      ...VALORES_INICIALES,
      formularioCodigo: FORM_A,
    };
    expect(esBorradorVacio(soloFormulario, [])).toBe(true);
  });

  it("no es vacío si hay al menos una persona asignada", () => {
    expect(esBorradorVacio(VALORES_INICIALES, [persona])).toBe(false);
  });

  it("no es vacío si un campo del formulario tiene contenido", () => {
    expect(esBorradorVacio(conDatos, [])).toBe(false);
  });

  it("una nota cuenta como contenido; sin notas, no", () => {
    // Desde el 2026-09-09 las observaciones son notas (una lista). Sin notas capturadas es
    // vacío; con al menos una, no.
    expect(esBorradorVacio(VALORES_INICIALES, [])).toBe(true);
    expect(
      esBorradorVacio(
        { ...VALORES_INICIALES, observaciones: ["Una nota"] },
        [],
      ),
    ).toBe(false);
  });
});

describe("guardar y leer un borrador de formulario", () => {
  it("lo que se guarda se recupera con la misma forma", () => {
    guardarBorrador(USUARIO, FORM_A, FECHA, borradorLleno);
    const leido = leerBorrador(USUARIO, FORM_A, FECHA);

    expect(leido).not.toBeNull();
    expect(leido?.personal).toEqual([persona]);
    expect(leido?.valores.zonalesIds).toEqual([3]);
  });

  it("sin borrador guardado, leer devuelve null", () => {
    expect(leerBorrador(USUARIO, FORM_A, FECHA)).toBeNull();
  });

  it("descarta y retira un borrador de otra versión de esquema", () => {
    window.sessionStorage.setItem(
      CLAVE_A,
      JSON.stringify({ ...borradorLleno, v: 999 }),
    );

    expect(leerBorrador(USUARIO, FORM_A, FECHA)).toBeNull();
    // Además lo retira, para no reintentar leer una forma que ya no se entiende.
    expect(window.sessionStorage.getItem(CLAVE_A)).toBeNull();
  });

  it("un contenido corrupto no revienta: devuelve null", () => {
    window.sessionStorage.setItem(CLAVE_A, "{ esto no es json");
    expect(leerBorrador(USUARIO, FORM_A, FECHA)).toBeNull();
  });

  it("el borrador de un usuario no se lee en la sesión de otro", () => {
    guardarBorrador(USUARIO, FORM_A, FECHA, borradorLleno);
    expect(leerBorrador(USUARIO + 1, FORM_A, FECHA)).toBeNull();
  });
});

describe("aislamiento entre formularios (2026-09-10)", () => {
  it("lo capturado en un formulario NO se ve en otro", () => {
    guardarBorrador(USUARIO, FORM_A, FECHA, borradorLleno);

    // El otro formulario del mismo usuario nace vacío: no ve la captura del primero.
    expect(leerBorrador(USUARIO, FORM_B, FECHA)).toBeNull();
    // Y el suyo, cuando lo tenga, es independiente.
    const soloB: BorradorOperativo = {
      personal: [],
      valores: { ...VALORES_INICIALES, formularioCodigo: FORM_B, zonalesIds: [9] },
    };
    guardarBorrador(USUARIO, FORM_B, FECHA, soloB);

    expect(leerBorrador(USUARIO, FORM_A, FECHA)?.valores.zonalesIds).toEqual([3]);
    expect(leerBorrador(USUARIO, FORM_B, FECHA)?.valores.zonalesIds).toEqual([9]);
  });

  it("retirar el de un formulario no toca el del otro", () => {
    guardarBorrador(USUARIO, FORM_A, FECHA, borradorLleno);
    guardarBorrador(USUARIO, FORM_B, FECHA, borradorLleno);

    limpiarBorrador(USUARIO, FORM_A, FECHA);

    expect(leerBorrador(USUARIO, FORM_A, FECHA)).toBeNull();
    expect(leerBorrador(USUARIO, FORM_B, FECHA)).not.toBeNull();
  });
});

describe("aislamiento entre FECHAS (2026-09-21)", () => {
  it("lo capturado un día NO se ve en otro, y cada día conserva el suyo", () => {
    const OTRA_FECHA = "2026-09-12";
    guardarBorrador(USUARIO, FORM_A, FECHA, borradorLleno);

    // El mismo formulario, otra fecha de jornada: nace vacío (no arrastra la captura del otro día).
    expect(leerBorrador(USUARIO, FORM_A, OTRA_FECHA)).toBeNull();
    // Y al volver a la fecha original, la captura sigue ahí: cambiar la fecha ya no la pierde.
    expect(leerBorrador(USUARIO, FORM_A, FECHA)).not.toBeNull();

    // Cada día guarda lo suyo, independiente.
    const otroDia: BorradorOperativo = {
      personal: [],
      valores: { ...VALORES_INICIALES, formularioCodigo: FORM_A, zonalesIds: [7] },
    };
    guardarBorrador(USUARIO, FORM_A, OTRA_FECHA, otroDia);
    expect(leerBorrador(USUARIO, FORM_A, FECHA)?.valores.zonalesIds).toEqual([3]);
    expect(leerBorrador(USUARIO, FORM_A, OTRA_FECHA)?.valores.zonalesIds).toEqual([7]);
  });
});

describe("puntero de sesión", () => {
  it("guarda y recupera fecha y último formulario", () => {
    guardarPuntero(USUARIO, { fecha: "2026-09-11", codigoElegido: FORM_A });
    const leido = leerPuntero(USUARIO);

    expect(leido?.fecha).toBe("2026-09-11");
    expect(leido?.codigoElegido).toBe(FORM_A);
  });

  it("descarta un puntero de otra versión de esquema", () => {
    window.sessionStorage.setItem(
      CLAVE_PTR,
      JSON.stringify({ v: 999, fecha: "2026-09-11", codigoElegido: FORM_A }),
    );
    expect(leerPuntero(USUARIO)).toBeNull();
  });

  it("sin puntero, leer devuelve null", () => {
    expect(leerPuntero(USUARIO)).toBeNull();
  });
});

describe("limpiar", () => {
  it("limpiarBorradoresDeUsuario retira todos los formularios de un usuario, y conserva su puntero", () => {
    guardarBorrador(USUARIO, FORM_A, FECHA, borradorLleno);
    guardarBorrador(USUARIO, FORM_B, FECHA, borradorLleno);
    guardarPuntero(USUARIO, { fecha: "2026-09-11", codigoElegido: FORM_A });
    guardarBorrador(USUARIO + 1, FORM_A, FECHA, borradorLleno);

    limpiarBorradoresDeUsuario(USUARIO);

    expect(leerBorrador(USUARIO, FORM_A, FECHA)).toBeNull();
    expect(leerBorrador(USUARIO, FORM_B, FECHA)).toBeNull();
    // El puntero se queda: la fecha y el formulario abierto no son captura del día.
    expect(leerPuntero(USUARIO)).not.toBeNull();
    // Y el de otro usuario, intacto.
    expect(leerBorrador(USUARIO + 1, FORM_A, FECHA)).not.toBeNull();
  });

  it("limpiarTodosLosBorradores barre todo lo del prefijo —incluidas versiones viejas y punteros— y nada más", () => {
    guardarBorrador(USUARIO, FORM_A, FECHA, borradorLleno);
    guardarPuntero(USUARIO, { fecha: "2026-09-11", codigoElegido: FORM_A });
    // Un borrador de una versión anterior debe barrerse también.
    window.sessionStorage.setItem("cco.borradorOperativo.v4.7", "{}");
    window.sessionStorage.setItem("otra.cosa", "no tocar");

    limpiarTodosLosBorradores();

    expect(leerBorrador(USUARIO, FORM_A, FECHA)).toBeNull();
    expect(leerPuntero(USUARIO)).toBeNull();
    expect(window.sessionStorage.getItem("cco.borradorOperativo.v4.7")).toBeNull();
    expect(window.sessionStorage.getItem("otra.cosa")).toBe("no tocar");
  });
});
