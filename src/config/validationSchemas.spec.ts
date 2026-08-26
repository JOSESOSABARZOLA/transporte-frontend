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
  zonalId: 1,
  punto: "10",
  puntoLibre: "",
  tipoControl: "30",
  tipoLibre: "",
  institucionesIds: [40],
  observaciones: "",
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

describe("VAL-02 y VAL-03 · el horario", () => {
  it("exige la hora de inicio", async () => {
    const motivo = await motivoDeRechazo({ ...VALIDO, horaInicio: "" });
    expect(motivo).toContain("hora de inicio");
  });

  it("RN-07 · rechaza una hora fuera de la media hora", async () => {
    const motivo = await motivoDeRechazo({ ...VALIDO, horaInicio: "08:15" });
    expect(motivo).toContain("en punto o media hora");
  });

  it("rechaza el mismo inicio y fin: no tendría duración", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDO,
      horaInicio: "08:00",
      horaFin: "08:00",
    });
    expect(motivo).toContain("no tiene duración");
  });

  it("ADMITE el cruce de medianoche: 22H00 a 02H00 es válido", async () => {
    // El fin «menor» que el inicio no es un error, es un operativo nocturno. Comprobar
    // aquí que el fin sea posterior habría rechazado la mitad de las patrullas.
    expect(
      await motivoDeRechazo({ ...VALIDO, horaInicio: "22:00", horaFin: "02:00" }),
    ).toBeNull();
  });
});

describe("VAL-04 · la zonal", () => {
  it("es obligatoria", async () => {
    const motivo = await motivoDeRechazo({ ...VALIDO, zonalId: undefined });
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

describe("VAL-09 y VAL-11 · instituciones y observaciones", () => {
  it("exige al menos una institución", async () => {
    const motivo = await motivoDeRechazo({ ...VALIDO, institucionesIds: [] });
    expect(motivo).toContain("al menos una institución");
  });

  it("las observaciones son opcionales", async () => {
    expect(
      await motivoDeRechazo({ ...VALIDO, observaciones: "" }),
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
