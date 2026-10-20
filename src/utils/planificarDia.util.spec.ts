/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: planificarDia.util.spec.ts
 * Responsabilidad: Verificar las decisiones puras del flujo: el paso inicial, a qué pasos se puede
 *                  ir, la cuenta regresiva de la ventana y el acta del parqueadero.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * `derivarPaso` es el espejo de la política del servidor: estos casos son la tabla del contrato
 * (`CONTRATO-planificar-dia.md` §1). Si el servidor cambia la regla, esta prueba debe cambiar con él.
 */

import { describe, expect, it } from "vitest";

import { RESUMEN_REAL_HOJAS_EMITIDAS } from "../components/transporte/planificar/resumenReal.fixture.ts";
import {
  datosDelPaso,
  derivarPaso,
  detalleOperativo,
  faltaActa,
  faltaParaAbrir,
  guardasCompletas,
  lineaDeDetalle,
  nombreDeGaraje,
  PARQUEADERO,
  pasoAlcanzable,
  motivoPlacaNoElegible,
  textoConductor,
  textoOpcionVehiculo,
  type DatosDelPaso,
} from "./planificarDia.util.ts";

const datos = (parcial: Partial<DatosDelPaso> = {}): DatosDelPaso => ({
  requisitosListos: true,
  operativos: 8,
  cubiertos: 0,
  vehiculosEnUso: 0,
  vehiculosConGuarda: 0,
  hojasEmitidas: false,
  ...parcial,
});

describe("derivarPaso · con la respuesta REAL del servidor", () => {
  it("las hojas emitidas abren en Emitir, igual que `pasos.pasoInicial` del servidor", () => {
    const espejo = derivarPaso(datosDelPaso(RESUMEN_REAL_HOJAS_EMITIDAS));
    expect(espejo.pasoInicial).toBe(4);
    expect(espejo.pasoInicial).toBe(RESUMEN_REAL_HOJAS_EMITIDAS.pasos.pasoInicial);
    expect(espejo.completos).toEqual(RESUMEN_REAL_HOJAS_EMITIDAS.pasos.completos);
  });
});

describe("nombreDeGaraje · un garaje no se confunde con su zona", () => {
  it("antepone «Garaje» solo si el nombre no lo trae (sin mirar tildes ni mayúsculas)", () => {
    expect(nombreDeGaraje("Calderón")).toBe("Garaje Calderón");
    expect(nombreDeGaraje("Garaje Centro")).toBe("Garaje Centro");
    expect(nombreDeGaraje("GARAJE NORTE")).toBe("GARAJE NORTE");
    expect(nombreDeGaraje("  Quitumbe ")).toBe("Garaje Quitumbe");
  });
});

describe("derivarPaso · en qué paso abre la jornada", () => {
  it("sin requisitos listos abre en Preparar", () => {
    expect(derivarPaso(datos({ requisitosListos: false })).pasoInicial).toBe(1);
  });

  it("con requisitos y nada cubierto abre en Asignar", () => {
    expect(derivarPaso(datos()).pasoInicial).toBe(2);
  });

  it("sigue en Asignar mientras quedan pendientes y no hay ninguna guarda", () => {
    expect(derivarPaso(datos({ cubiertos: 7, vehiculosEnUso: 5 })).pasoInicial).toBe(2);
  });

  it("todo cubierto, sin guardas: Fin del día", () => {
    expect(derivarPaso(datos({ cubiertos: 8, vehiculosEnUso: 5 })).pasoInicial).toBe(3);
  });

  it("con alguna guarda ya declarada pasa a Fin del día aunque falten operativos", () => {
    expect(
      derivarPaso(datos({ cubiertos: 7, vehiculosEnUso: 5, vehiculosConGuarda: 2 })).pasoInicial,
    ).toBe(3);
  });

  it("todos los vehículos en uso con garaje confirmado: Emitir", () => {
    const { pasoInicial, completos } = derivarPaso(
      datos({ cubiertos: 7, vehiculosEnUso: 5, vehiculosConGuarda: 5 }),
    );
    expect(pasoInicial).toBe(4);
    expect(completos).toEqual({ 1: true, 2: true, 3: true, 4: false });
  });

  it("asignaciones hechas aunque falte confirmar vehículos: Fin del día, no Preparar", () => {
    const { pasoInicial, completos } = derivarPaso(
      datos({ requisitosListos: false, cubiertos: 8, vehiculosEnUso: 5 }),
    );
    expect(pasoInicial).toBe(3);
    expect(completos[1]).toBe(false);
  });

  it("algo cubierto con un requisito pendiente: Asignar", () => {
    expect(derivarPaso(datos({ requisitosListos: false, cubiertos: 3 })).pasoInicial).toBe(2);
  });

  it("hojas emitidas abre en Emitir aunque falte alguna guarda", () => {
    expect(
      derivarPaso(
        datos({ cubiertos: 8, vehiculosEnUso: 5, vehiculosConGuarda: 3, hojasEmitidas: true }),
      ).pasoInicial,
    ).toBe(4);
  });

  it("el paso 4 se completa cuando todas las hojas están emitidas", () => {
    const { completos } = derivarPaso(
      datos({ cubiertos: 8, vehiculosEnUso: 5, vehiculosConGuarda: 5, hojasEmitidas: true }),
    );
    expect(completos[4]).toBe(true);
  });
});

describe("pasoAlcanzable · el stepper no salta pasos", () => {
  const completos = { 1: true, 2: false, 3: false, 4: false } as const;

  it("se puede volver al 1 y entrar al 2, no al 3 ni al 4", () => {
    expect(pasoAlcanzable(1, completos)).toBe(true);
    expect(pasoAlcanzable(2, completos)).toBe(true);
    expect(pasoAlcanzable(3, completos)).toBe(false);
    expect(pasoAlcanzable(4, completos)).toBe(false);
  });

  it("sin requisitos solo el 1 es alcanzable", () => {
    expect(pasoAlcanzable(2, { 1: false, 2: false, 3: false, 4: false })).toBe(false);
  });

  it("los pasos hasta el derivado son alcanzables aunque el 1 tenga un pendiente", () => {
    const sinVehiculos = { 1: false, 2: true, 3: false, 4: false } as const;
    expect(pasoAlcanzable(1, sinVehiculos, 3)).toBe(true);
    expect(pasoAlcanzable(3, sinVehiculos, 3)).toBe(true);
    expect(pasoAlcanzable(4, sinVehiculos, 3)).toBe(false);
  });
});

describe("faltaParaAbrir · cuenta regresiva de la ventana", () => {
  // 14H07 en Quito (UTC−5) = 19:07 UTC.
  const ahora = new Date("2026-10-08T19:07:00Z");

  it("dice cuánto falta en HH:MM, en la hora de Quito", () => {
    expect(faltaParaAbrir("15:55", "America/Guayaquil", ahora)).toBe("01:48");
  });

  it("sin hora de apertura o ya pasada, no hay cuenta", () => {
    expect(faltaParaAbrir(null, "America/Guayaquil", ahora)).toBeNull();
    expect(faltaParaAbrir("13:00", "America/Guayaquil", ahora)).toBeNull();
  });
});

describe("acta del parqueadero (Art. 8)", () => {
  it("con parqueadero y sin número, falta el acta y no se puede confirmar", () => {
    const guarda = { destino: PARQUEADERO, actaNumero: "  " };
    expect(faltaActa(guarda)).toBe(true);
    expect(guardasCompletas([guarda])).toBe(false);
  });

  it("un garaje no pide acta; sin destino tampoco se confirma", () => {
    expect(faltaActa({ destino: "3", actaNumero: "" })).toBe(false);
    expect(guardasCompletas([{ destino: "3", actaNumero: "" }])).toBe(true);
    expect(guardasCompletas([{ destino: "", actaNumero: "" }])).toBe(false);
  });
});

describe("textos de las filas", () => {
  it("operativo: «08H00–16H30 · Calderón · Completo»", () => {
    expect(
      detalleOperativo({
        id: 1,
        identificador: "OCPMO-001",
        formulario: "2. PMO",
        horaInicio: "08:00",
        horaFin: "16:30",
        zonal: "Calderón",
        zonalId: 2,
        tipoTransporte: "COMPLETO",
        esMacrooperativo: false,
        transporteLiberado: false,
        personas: 3,
        cubierto: false,
        parcial: false,
        tramos: [],
        conductores: [],
        placas: [],
      }),
    ).toBe("08H00–16H30 · Calderón · Completo");
  });

  it("conductor: «Turno día · PMA7056» y «De libre»", () => {
    expect(textoConductor({ turno: "DIA", placa: "PMA7056" })).toBe("Turno día · PMA7056");
    expect(textoConductor({ turno: "LIBRE", placa: null })).toBe("De libre");
  });

  it("detalle de la asignación, con avisos o sin ellos", () => {
    const totales = {
      operativos: 8,
      cubiertos: 7,
      sinConductor: 1,
      propiosMedios: 0,
      conductoresEnUso: 5,
      libresEnUso: 0,
      vehiculosDisponibles: 5,
      vehiculosEnUso: 5,
      enTaller: 1,
      avisos: 0,
    };
    expect(lineaDeDetalle(totales)).toBe(
      "5 conductores en uso · 5 vehículos disponibles · sin avisos",
    );
    expect(lineaDeDetalle({ ...totales, avisos: 2 })).toBe(
      "5 conductores en uso · 5 vehículos disponibles · 2 avisos en los conductores",
    );
  });
});

describe("sustitución de flota · opción del desplegable de placas", () => {
  const placa = {
    vehiculoId: 1,
    placa: "PMA-3370",
    descripcion: "Camioneta",
    tipo: "Camioneta",
    asientos: 4,
    propuesto: false,
    estado: "OK" as const,
    motivos: [],
    ocupadaPor: null,
  };

  it("placa, descripción real (no repite el tipo) y asientos", () => {
    expect(textoOpcionVehiculo(placa)).toBe("PMA-3370 (4 asientos)");
    expect(textoOpcionVehiculo({ ...placa, descripcion: "Doble cabina", asientos: 1 })).toBe(
      "PMA-3370 · Doble cabina (1 asiento)",
    );
    expect(textoOpcionVehiculo({ ...placa, asientos: null })).toBe("PMA-3370");
  });

  it("solo una DURA no se elige, y dice por qué: en taller, ocupada o la frase del servidor", () => {
    expect(motivoPlacaNoElegible({ ...placa, estado: "AVISO" })).toBeNull();
    expect(
      motivoPlacaNoElegible({
        ...placa,
        estado: "DURO",
        motivos: [{ codigo: "VEHICULO_EN_TALLER", mensaje: "El vehículo está en el taller ese día.", tipo: "DURO" }],
      }),
    ).toBe("en taller");
    expect(
      textoOpcionVehiculo({
        ...placa,
        estado: "DURO",
        motivos: [{ codigo: "PLACA_OCUPADA", mensaje: "…", tipo: "DURO" }],
        ocupadaPor: { conductorId: 8, nombre: "ZAMORA ANA", horaInicio: "09:00", horaFin: "11:00" },
      }),
    ).toBe("PMA-3370 (4 asientos) — ocupada por ZAMORA ANA 09H00–11H00");
    expect(
      motivoPlacaNoElegible({
        ...placa,
        estado: "DURO",
        motivos: [{ codigo: "ASIENTOS", mensaje: "Son 6 personas y el vehículo tiene 4 asientos.", tipo: "DURO" }],
      }),
    ).toBe("Son 6 personas y el vehículo tiene 4 asientos.");
  });
});
