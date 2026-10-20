/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: formularioFlota.util.spec.ts
 * Responsabilidad: Verificar la validación y el cuerpo de envío de los tres cajones, y el pie.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 */

import { describe, expect, it } from "vitest";

import type { Conductor, UbicacionFlota, Vehiculo } from "../interfaces/Transporte.ts";
import {
  cuerpoAltaConductor,
  cuerpoVehiculo,
  erroresConductor,
  erroresGaraje,
  cuerpoGaraje,
  erroresVehiculo,
  estadoDelPie,
  placaCambio,
  valoresConductor,
  valoresVehiculo,
} from "./formularioFlota.util.ts";

const ANTIGUO: Vehiculo = { id: 2, placa: "PMA7056", descripcion: "Camioneta", activo: true };
const FLOTA: Vehiculo[] = [ANTIGUO, { id: 3, placa: "ABM-999", descripcion: null, activo: false }];

describe("cajón de vehículo", () => {
  it("la placa repetida bloquea aunque una lleve guion y la otra no, y nombra a la de baja", () => {
    const nueva = { ...valoresVehiculo(null), placa: "PMA-7056" };
    expect(erroresVehiculo(nueva, null, FLOTA).placa).toBe("Ya existe un vehículo con esa placa.");
    for (const escrita of ["pma7056", "PMA 7056", "pma-7056"]) {
      expect(erroresVehiculo({ ...valoresVehiculo(null), placa: escrita }, null, FLOTA).placa).toBe(
        "Ya existe un vehículo con esa placa.",
      );
    }
    const deBaja = { ...valoresVehiculo(null), placa: "ABM999" };
    expect(erroresVehiculo(deBaja, null, FLOTA).placa).toMatch(/dado de baja: reactívelo/);
  });

  it("el formato se exige al crear y al cambiar la placa, no a una placa anterior sin tocar (D4)", () => {
    expect(erroresVehiculo({ ...valoresVehiculo(null), placa: "XY-12" }, null, FLOTA).placa).toBe(
      "La placa se escribe AAA-999 o AAA-9999.",
    );
    const sinTocar = { ...valoresVehiculo(ANTIGUO), descripcion: "Camioneta blanca" };
    expect(erroresVehiculo(sinTocar, ANTIGUO, FLOTA)).toEqual({});
    // Ponerle el guion a su propia placa no choca consigo misma.
    expect(erroresVehiculo({ ...valoresVehiculo(ANTIGUO), placa: "PMA-7056" }, ANTIGUO, FLOTA)).toEqual({});
  });

  it("la placa viaja siempre normalizada, también la que estaba guardada sin guion", () => {
    expect(cuerpoVehiculo(valoresVehiculo(ANTIGUO)).placa).toBe("PMA-7056");
    expect(cuerpoVehiculo({ ...valoresVehiculo(null), placa: "gye 233" }).placa).toBe("GYE-233");
  });

  it("la misma placa escrita de otra forma no es un cambio (no se le exige el formato)", () => {
    expect(placaCambio("pma 7056", ANTIGUO)).toBe(false);
    expect(placaCambio("PMA-7057", ANTIGUO)).toBe(true);
    expect(placaCambio("PMA-7056", null)).toBe(true);
  });

  it("el kilometraje no supera DAF_KM_MAXIMO al crear o al cambiarlo", () => {
    const alta = { ...valoresVehiculo(null), placa: "GYE-233", kilometraje: "1000000" };
    expect(erroresVehiculo(alta, null, FLOTA, 999_999).kilometraje).toBe(
      "Revise el kilometraje: parece demasiado alto.",
    );
    expect(erroresVehiculo({ ...alta, kilometraje: "999999" }, null, FLOTA, 999_999).kilometraje).toBeUndefined();
    // Sin el resumen, el tope es el de la migración.
    expect(erroresVehiculo(alta, null, FLOTA).kilometraje).toBeDefined();
  });

  it("un vehículo que ya supera el tope se edita sin tocar el kilometraje", () => {
    const alto: Vehiculo = { ...ANTIGUO, kilometraje: 1_100_000 };
    const otroCampo = { ...valoresVehiculo(alto), descripcion: "Camioneta blanca" };
    expect(erroresVehiculo(otroCampo, alto, [alto], 999_999)).toEqual({});
    const tocado = { ...valoresVehiculo(alto), kilometraje: "1200000" };
    expect(erroresVehiculo(tocado, alto, [alto], 999_999).kilometraje).toBe(
      "Revise el kilometraje: parece demasiado alto.",
    );
  });

  it("asientos de 1 a 60 y kilometraje entero", () => {
    const errores = erroresVehiculo(
      { ...valoresVehiculo(null), placa: "GYE-233", asientos: "61", kilometraje: "85.000" },
      null,
      FLOTA,
    );
    expect(errores.asientos).toBeDefined();
    expect(errores.kilometraje).toBeDefined();
  });
});

const CONDUCTOR: Conductor = {
  id: 10,
  cedula: "1712345678",
  nombreCompleto: "SOSA JOSE",
  telefono: null,
  licenciaTipo: null,
  vehiculoHabitual: null,
  activo: false,
  sector: null,
  parqueaderoAutorizado: false,
  tipoContrato: null,
};

describe("cajón de conductor", () => {
  const alta = (parcial: Partial<ReturnType<typeof valoresConductor>>) => ({
    ...valoresConductor(null),
    cedula: "1799999999",
    nombreCompleto: "PÉREZ JUAN",
    ...parcial,
  });

  it("la cédula repetida bloquea, también si el otro está de baja", () => {
    expect(erroresConductor(alta({ cedula: "1712345678" }), null, [CONDUCTOR]).cedula).toBe(
      "Ya existe un conductor con esa cédula: SOSA JOSE (dado de baja: reactívelo).",
    );
  });

  it("cédula de 10 dígitos y teléfono 09 + ocho dígitos (admite espacios)", () => {
    expect(erroresConductor(alta({ cedula: "17123" }), null, []).cedula).toMatch(/10 dígitos/);
    expect(erroresConductor(alta({ telefono: "0291234567" }), null, []).telefono).toBeDefined();
    expect(erroresConductor(alta({ telefono: "099 123 4567" }), null, []).telefono).toBeUndefined();
  });

  it("el patrón, si se arma, son de 2 a 14 letras", () => {
    expect(erroresConductor(alta({ patronRotacion: "D" }), null, []).patronRotacion).toBeDefined();
    expect(erroresConductor(alta({ patronRotacion: "DDNNL" }), null, []).patronRotacion).toBeUndefined();
  });

  it("con parqueadero, el acta es obligatoria y su vigencia ordenada", () => {
    const errores = erroresConductor(
      alta({ parqueaderoAutorizado: true, actaParqueaderoDesde: "2026-10-10", actaParqueaderoHasta: "2026-10-01" }),
      null,
      [],
    );
    expect(errores.actaParqueaderoNumero).toBeDefined();
    expect(errores.actaParqueaderoHasta).toBe("La vigencia del acta termina antes de empezar.");
  });

  it("al editar, la cédula no se valida: es la llave natural", () => {
    expect(erroresConductor(valoresConductor(CONDUCTOR), CONDUCTOR, [CONDUCTOR])).toEqual({});
  });

  it("el alta no envía los null que solo sirven para borrar", () => {
    const cuerpo = cuerpoAltaConductor(alta({ telefono: "099 123 4567" }));
    expect(cuerpo).toMatchObject({ cedula: "1799999999", telefono: "0991234567" });
    expect(cuerpo.actaParqueaderoNumero).toBeUndefined();
    expect(cuerpo.patronRotacion).toBeUndefined();
  });
});

describe("cajón de garaje", () => {
  it("el nombre repetido se compara sin tildes ni mayúsculas", () => {
    const garajes: UbicacionFlota[] = [{ id: 3, nombre: "CALDERÓN", activo: true }];
    expect(erroresGaraje({ nombre: " calderon ", zonalId: "" }, null, garajes).nombre).toBe(
      "Ya existe un garaje con ese nombre.",
    );
    expect(erroresGaraje({ nombre: "CALDERÓN", zonalId: "4" }, garajes[0], garajes)).toEqual({});
  });
});

describe("el pie del cajón", () => {
  it("antes de intentar: cuántos obligatorios; después: qué falta; si nada, listo", () => {
    expect(estadoDelPie(false, ["nombre"], 1)).toEqual({ tono: "pendiente", texto: "1 campo por completar" });
    expect(estadoDelPie(false, ["nombre", "placa"], 2)).toEqual({ tono: "pendiente", texto: "2 campos por completar" });
    expect(estadoDelPie(false, ["teléfono"], 0)).toEqual({ tono: "pendiente", texto: "Por revisar: teléfono" });
    expect(estadoDelPie(true, ["placa"], 1, true, false)).toEqual({ tono: "sinCambios", texto: "Sin cambios pendientes" });
    expect(estadoDelPie(false, [], 0, true, true)).toEqual({ tono: "cambios", texto: "Cambios sin guardar" });
    expect(estadoDelPie(true, ["placa", "asientos"], 0)).toEqual({ tono: "error", texto: "Falta: placa, asientos" });
    expect(estadoDelPie(false, [], 0)).toEqual({ tono: "listo", texto: "Listo para guardar" });
  });
});

describe("nombre del garaje (A3, 2026-10-15)", () => {
  const garajes: UbicacionFlota[] = [{ id: 2, nombre: "Eloy Alfaro", activo: true }];

  it("se guarda tal cual, sin los espacios de los bordes", () => {
    expect(cuerpoGaraje({ nombre: "  Garaje Eloy Alfaro Norte ", zonalId: "" }).nombre).toBe(
      "Garaje Eloy Alfaro Norte",
    );
  });

  it("la unicidad no distingue mayúsculas ni tildes", () => {
    for (const nombre of ["eloy alfaro", "ELOY ALFARO", "Elóy Álfaro"]) {
      expect(erroresGaraje({ nombre, zonalId: "" }, null, garajes).nombre).toBe(
        "Ya existe un garaje con ese nombre.",
      );
    }
    expect(erroresGaraje({ nombre: "Eloy Alfaro Sur", zonalId: "" }, null, garajes)).toEqual({});
  });
});
