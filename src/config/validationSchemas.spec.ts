/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Esquemas de validación de formularios
 * Archivo: validationSchemas.spec.ts
 * Responsabilidad: Verificar VAL-01 a VAL-11 del registro de operativo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LO QUE **NO** SE PRUEBA AQUÍ ES TAN IMPORTANTE COMO LO QUE SÍ. Las reglas de descanso
 * —VAL-12 a VAL-18— no están en el esquema y no pueden estarlo: dependen de datos que el
 * navegador no posee. La última prueba de este archivo lo afirma explícitamente, para que
 * quien las eche de menos encuentre el motivo escrito.
 */

import { describe, expect, it } from "vitest";

import { esquemaOperativo } from "./validationSchemas.ts";

const VALIDO = {
  formularioCodigo: "OCF",
  horaInicio: "08:00",
  horaFin: "12:00",
  zonalesIds: [1],
  punto: "10",
  puntoLibre: "",
  tipoControl: "30",
  tipoLibre: "",
  institucionesIds: [40],
  observaciones: [],
};

const motivoDeRechazo = async (
  valores: Record<string, unknown>,
): Promise<string | null> => {
  try {
    await esquemaOperativo.validate(valores);
    return null;
  } catch (error: unknown) {
    return (error as { message: string }).message;
  }
};

describe("el operativo completo se admite", () => {
  it("no produce ningún motivo de rechazo", async () => {
    expect(await motivoDeRechazo(VALIDO)).toBeNull();
  });
});

describe("VAL-02 y VAL-03 · el horario del operativo salió del esquema (RN-66)", () => {
  // Desde el 2026-09-08 el operativo ya no tiene horario propio en el registro —lo lleva
  // cada persona— y en el adicional el horario único lo valida `FormularioOperativo`, que
  // sabe en qué modo está. El esquema ya no lo exige: sin horario NO se rechaza aquí.
  it("no rechaza un operativo por no traer horario", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      horaInicio: "",
      horaFin: "",
    });
    expect(motivo).toBeNull();
  });
});

describe("VAL-04 · la zonal", () => {
  it("es obligatoria", async () => {
    const motivo = await motivoDeRechazo({ ...VALIDO, zonalesIds: [] });
    expect(motivo).toContain("al menos una zonal");
  });
});

describe("VAL-05 a VAL-08 · punto y tipo, del catálogo o adicionales", () => {
  it("el punto es obligatorio", async () => {
    const motivo = await motivoDeRechazo({ ...VALIDO, punto: "" });
    expect(motivo).toContain("punto de encuentro");
  });

  it("elegido ADICIONALES, el texto libre pasa a ser obligatorio", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      punto: "ADICIONALES",
      puntoLibre: "",
    });
    expect(motivo).toContain("punto de encuentro adicional");
  });

  it("con el texto escrito, se admite", async () => {
    expect(
      await motivoDeRechazo({
        ...VALIDO,
        punto: "ADICIONALES",
        puntoLibre: "Frente al mercado",
      }),
    ).toBeNull();
  });

  it("el tipo adicional sigue la misma regla", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      tipoControl: "ADICIONALES",
      tipoLibre: "",
    });
    expect(motivo).toContain("tipo de control adicional");
  });

  it("el texto libre no puede superar los 220 caracteres de la columna", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      punto: "ADICIONALES",
      puntoLibre: "C".repeat(221),
    });
    expect(motivo).toContain("220 caracteres");
  });
});

describe("selección múltiple de tipo de control (form 8)", () => {
  it("con al menos un tipo en la lista, el desplegable único deja de ser obligatorio", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      tipoControl: "",
      tiposControlIds: [23, 24],
    });
    expect(motivo).toBeNull();
  });

  it("sin ningún tipo (ni único ni en la lista) se rechaza", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      tipoControl: "",
      tiposControlIds: [],
      tipoLibre: "",
    });
    expect(motivo).toContain("tipo de control");
  });

  it("basta con el adicional: sin tipo de catálogo pero con texto libre, se acepta", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      tipoControl: "",
      tiposControlIds: [],
      tipoLibre: "CONTROL ESPECIAL NO CATALOGADO",
    });
    expect(motivo).toBeNull();
  });
});

describe("VAL-09 y VAL-11 · instituciones y observaciones", () => {
  it("exige al menos una institución", async () => {
    const motivo = await motivoDeRechazo({ ...VALIDO, institucionesIds: [] });
    expect(motivo).toContain("al menos una institución");
  });

  it("las observaciones son opcionales", async () => {
    expect(
      await motivoDeRechazo({ ...VALIDO, observaciones: [] }),
    ).toBeNull();
  });
});

describe("las reglas de descanso NO están en el esquema", () => {
  it("un operativo válido no se rechaza por motivos de personal", async () => {
    // VAL-12 a VAL-18 dependen del historial de la persona, sus otras asignaciones del
    // día y los umbrales configurados: datos que el navegador no posee. Se muestran al
    // recibir el 409, sin perder lo capturado.
    const campos = Object.keys(esquemaOperativo.fields);

    expect(campos).not.toContain("funcionarioId");
    expect(campos).not.toContain("personal");
    expect(await motivoDeRechazo(VALIDO)).toBeNull();
  });

  it("tampoco están el conductor ni el vehículo (RN-40)", () => {
    const campos = Object.keys(esquemaOperativo.fields);

    expect(campos).not.toContain("conductorId");
    expect(campos).not.toContain("vehiculoId");
  });
});
