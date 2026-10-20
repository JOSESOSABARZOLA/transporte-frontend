/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos · compartir unidad
 * Archivo: compartirUnidad.util.spec.ts
 * Responsabilidad: Las reglas puras de «compartir unidad»: la envolvente del personal (espejo del
 *                  servidor), los distintivos, lo que se dice a la DAF y la línea de tiempo con un
 *                  solo viaje por unidad.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("./mensaje.ts", () => ({ toast: { advertencia: vi.fn() } }));

import {
  accionCompartir,
  avisarCompartirRetirado,
  compartidoConDe,
  detalleMismaUnidad,
  estadoMismaUnidad,
  intencionParaLaDaf,
  invitadosDe,
  notaMismaUnidad,
  rotuloCompartir,
  textoAsientos,
  textoCompartirRetirado,
  textoAsignacionAutomatica,
} from "./compartirUnidad.util.ts";
import { envolventeDeHorarios } from "./horario.util.ts";
import { fundirCompartidos } from "./lineaTiempo.util.ts";
import { toast } from "./mensaje.ts";

describe("envolventeDeHorarios · espejo de RangoHorario.envolvente", () => {
  it("una franja es su propia ventana; varias, del primer inicio al último fin", () => {
    expect(envolventeDeHorarios([{ horaInicio: "08:00", horaFin: "16:30" }])).toEqual({
      horaInicio: "08:00",
      horaFin: "16:30",
    });
    expect(
      envolventeDeHorarios([
        { horaInicio: "07:00", horaFin: "16:00" },
        { horaInicio: "09:00", horaFin: "18:00" },
      ]),
    ).toEqual({ horaInicio: "07:00", horaFin: "18:00" });
  });

  it("respeta el cruce de medianoche: el arco más corto que cubre a todos", () => {
    expect(
      envolventeDeHorarios([
        { horaInicio: "22:00", horaFin: "02:00" },
        { horaInicio: "23:00", horaFin: "06:00" },
      ]),
    ).toEqual({ horaInicio: "22:00", horaFin: "06:00" });
  });

  it("sin horario válido no hay ventana (no se pregunta)", () => {
    expect(envolventeDeHorarios([])).toBeNull();
    expect(envolventeDeHorarios([{ horaInicio: "", horaFin: "" }])).toBeNull();
    expect(envolventeDeHorarios([{ horaInicio: "08:15", horaFin: "10:00" }])).toBeNull();
  });
});

describe("distintivos y textos", () => {
  it("la DAF lee lo que pidió quien registró", () => {
    expect(
      intencionParaLaDaf({ compartirCon: { identificador: "OCPMO-001" }, esMacrooperativo: false }),
    ).toBe("Pide compartir con OCPMO-001");
    expect(
      intencionParaLaDaf({ esMacrooperativo: true, justificacionExclusivo: "Equipo pesado" }),
    ).toBe("Exclusivo: Equipo pesado");
    // Un macrooperativo sin justificación ya lo dice su distintivo MACRO.
    expect(intencionParaLaDaf({ esMacrooperativo: true })).toBeNull();
  });

  it("el aviso de la intención retirada nombra con quién ya no coincide, y solo sale si el servidor la retiró", () => {
    expect(textoCompartirRetirado("OCPMO-001")).toMatch(/Ya no coincide con OCPMO-001/);

    avisarCompartirRetirado({}, "OCPMO-001");
    expect(toast.advertencia).not.toHaveBeenCalled();
    avisarCompartirRetirado({ avisos: ["COMPARTIR_RETIRADO"] }, "OCPMO-001");
    expect(toast.advertencia).toHaveBeenCalledWith("Se retiró la solicitud de compartir", {
      texto: textoCompartirRetirado("OCPMO-001"),
    });
  });
});

describe("la unidad compartida en «Planificar el día»", () => {
  const tramo = (id: number, identificador: string, compartidoConTramoId: number | null = null) => ({
    id,
    identificador,
    compartidoConTramoId,
  });

  it("anfitrión e invitado son UN viaje: el invitado se funde en su anfitrión de la misma fila", () => {
    const fundidos = fundirCompartidos([
      tramo(30, "OCPMO-001"),
      tramo(31, "OCPMO-004", 30),
      tramo(32, "OCPMO-005", 30),
      tramo(40, "OCF-002"),
    ]);
    expect(fundidos.map((t) => t.id)).toEqual([30, 40]);
    expect(fundidos[0].invitados).toEqual(["OCPMO-004", "OCPMO-005"]);
  });

  it("un invitado cuyo anfitrión no está en la fila se deja como está", () => {
    expect(fundirCompartidos([tramo(31, "OCPMO-004", 99)]).map((t) => t.id)).toEqual([31]);
  });

  it("los invitados de un anfitrión salen de los tramos del resumen", () => {
    const operativos = [
      { identificador: "OCPMO-001", tramos: [{ compartidoCon: null }] },
      { identificador: "OCPMO-004", tramos: [{ compartidoCon: "OCPMO-001" }] },
      { identificador: "OCF-002", tramos: [] },
    ];
    expect(invitadosDe("OCPMO-001", operativos)).toEqual(["OCPMO-004"]);
    expect(compartidoConDe(operativos[1])).toBe("OCPMO-001");
    expect(compartidoConDe(operativos[0])).toBeNull();
  });
});

describe("«La misma unidad» (2026-10-19)", () => {
  it("notaMismaUnidad: juntos para dejar, y el retiro con la misma unidad si su agenda lo permite", () => {
    expect(notaMismaUnidad(["dejar"], ["retirar"])).toBe(
      "Viajarán juntos para dejar al personal; el mismo conductor y vehículo harán también el retiro si su agenda lo permite (lo confirma la DAF).",
    );
    expect(notaMismaUnidad(["dejar"], [])).toBe(
      "Viajarán juntos para dejar al personal. Es una solicitud: la DAF la ejecuta al planificar el día.",
    );
  });

  it("notaMismaUnidad: sin traslado en común, la misma unidad hace el retiro DESPUÉS (no viajan juntos)", () => {
    expect(notaMismaUnidad([], ["retirar"], { anfitrion: "OCPMO-001" })).toBe(
      "No viajan juntos: el mismo conductor y vehículo pueden hacer el retiro después del traslado de OCPMO-001, si su agenda lo permite (lo confirma la DAF).",
    );
  });

  it("notaMismaUnidad: en el grupo dice con quién va cada traslado si no es el anfitrión", () => {
    expect(
      notaMismaUnidad(["retirar"], [], {
        anfitrion: "OCPMO-001",
        comparteCon: [{ tipo: "retirar", con: "OCPMO-002" }],
      }),
    ).toBe("Viajarán juntos para retirar al personal con OCPMO-002. Es una solicitud: la DAF la ejecuta al planificar el día.");
  });

  it("rotuloCompartir y accionCompartir: «Usar la misma unidad» si solo la hace después", () => {
    expect(rotuloCompartir("X", ["dejar"], true, [])).toBe("Solicitar compartir unidad con X");
    expect(rotuloCompartir("X", [], true, ["retirar"])).toBe("Solicitar usar la misma unidad que X");
    expect(rotuloCompartir("X", [], false, [])).toBe("Solicitar compartir unidad con X");
    expect(accionCompartir({ compatible: true, comparte: [], propios: ["retirar"] })).toBe("Usar la misma unidad");
    expect(accionCompartir({ compatible: true, comparte: ["dejar"], propios: [] })).toBe("Compartir unidad");
    expect(
      detalleMismaUnidad({ compatible: true, comparte: [], propios: ["retirar"], propiosViables: true }),
    ).toBe("No viajan juntos · Retiro con la misma unidad: viable");
  });

  it("estadoMismaUnidad: «Dejar compartido con X · falta el retiro», o sin «falta» si ya está todo", () => {
    expect(
      estadoMismaUnidad({
        tramos: [
          { tipo: "DEJAR", conductorId: 7, compartidoCon: "OCPMO-001" },
          { tipo: "RETIRAR", conductorId: null },
        ],
      }),
    ).toBe("Dejar compartido con OCPMO-001 · falta el retiro");
    expect(
      estadoMismaUnidad({
        tramos: [
          { tipo: "DEJAR", conductorId: 7, compartidoCon: "OCPMO-001" },
          { tipo: "RETIRAR", conductorId: 7 },
        ],
      }),
    ).toBe("Dejar compartido con OCPMO-001");
    expect(estadoMismaUnidad({ tramos: [{ tipo: "DEJAR", conductorId: null }] })).toBeNull();
  });

  it("detalleMismaUnidad: «Comparte: dejar · Retiro con la misma unidad: viable / no viable (motivo)»", () => {
    expect(
      detalleMismaUnidad({
        compatible: true,
        comparte: ["dejar"],
        propios: ["retirar"],
        propiosViables: true,
      }),
    ).toBe("Comparte: dejar · Retiro con la misma unidad: viable");
    expect(
      detalleMismaUnidad({
        compatible: true,
        comparte: ["dejar"],
        propios: ["retirar"],
        propiosViables: false,
        motivoPropios: "Ya tiene un tramo a esa hora.",
      }),
    ).toBe("Comparte: dejar · Retiro con la misma unidad: no viable (Ya tiene un tramo a esa hora.)");
    expect(detalleMismaUnidad({ compatible: false })).toBeNull();
  });
});

describe("«Completo» comparte unidad (2026-10-20)", () => {
  it("registro: el «completo» que abarca la unidad de X lo dice así", () => {
    expect(
      notaMismaUnidad([], [], { anfitrion: "OCPMO-001", contiene: ["dejar", "retirar"] }),
    ).toBe(
      "La unidad acompaña su operativo todo el día y además deja y retira al personal de OCPMO-001, sin moverse de su punto. Es una solicitud: la DAF la ejecuta al planificar el día.",
    );
    expect(rotuloCompartir("OCPMO-001", [], true, [])).toBe(
      "Solicitar compartir unidad con OCPMO-001",
    );
  });

  it("registro: el traslado que cae dentro del «completo» de X viaja en esa unidad", () => {
    expect(notaMismaUnidad([], [], { anfitrion: "OCPMO-005", contenidoEn: "OCPMO-005" })).toBe(
      "Viajará en la unidad que acompaña a OCPMO-005 todo el día. Es una solicitud: la DAF la ejecuta al planificar el día.",
    );
  });

  it("DAF: el detalle del anfitrión según el sentido de la contención", () => {
    expect(
      detalleMismaUnidad({
        compatible: true,
        identificador: "OCPMO-001",
        completo: "ABARCA",
        contiene: ["dejar", "retirar"],
      }),
    ).toBe(
      "La unidad acompaña su operativo todo el día y además deja y retira al personal de OCPMO-001, sin moverse de su punto.",
    );
    expect(
      detalleMismaUnidad({ compatible: true, identificador: "OCPMO-005", completo: "DENTRO" }),
    ).toBe("Viajará en la unidad que acompaña a OCPMO-005 todo el día.");
    expect(detalleMismaUnidad({ compatible: false, completo: "ABARCA" })).toBeNull();
  });

  it("DAF: con ABARCA manda lo que el servidor dice en «contiene» (no un «comparte» de otro tipo)", () => {
    expect(
      detalleMismaUnidad({
        compatible: true,
        identificador: "OCPMO-001",
        completo: "ABARCA",
        comparte: [],
        contiene: ["retirar"],
      }),
    ).toBe(
      "La unidad acompaña su operativo todo el día y además retira al personal de OCPMO-001, sin moverse de su punto.",
    );
  });

  it("DAF: los asientos se cuentan por momento (PMA-3370 con 3 asientos, 21-OCT)", () => {
    expect(
      textoAsientos({
        asientosLibres: 1,
        vehiculo: { asientos: 3 },
        personasConInvitado: 3,
        asientosPorMomento: [
          { tipo: "DEJAR", hora: "08:00", ocupados: 3 },
          { tipo: "RETIRAR", hora: "16:00", ocupados: 3 },
        ],
      }),
    ).toBe("Al dejar (08:00): 3 de 3 · Al retirar (16:00): 3 de 3");
    expect(
      textoAsientos({
        asientosLibres: 2,
        vehiculo: { asientos: 4 },
        personasConInvitado: 3,
        asientosPorMomento: [{ tipo: "DEJAR", hora: "08:00", ocupados: 3 }],
      }),
    ).toBe("Ocupará 3 de 4 asientos");
    // No cabe (el servidor no da «personasConInvitado»): lo que la unidad deja libre.
    expect(
      textoAsientos({ asientosLibres: 0, vehiculo: { asientos: 3 }, personasConInvitado: null }),
    ).toBe("0 de 3 asientos libres");
    expect(textoAsientos({ asientosLibres: 9, vehiculo: { asientos: 10 } })).toBe(
      "9 de 10 asientos libres",
    );
    expect(textoAsientos({ asientosLibres: null, vehiculo: { asientos: null } })).toBe(
      "Sin asientos registrados",
    );
  });

  it("línea de tiempo: UNA barra de todo el día, rotulada con el «completo», con dejar y retirar marcados", () => {
    const fundidos = fundirCompartidos(
      [
        { id: 10, identificador: "OCPMO-001", compartidoConTramoId: null, tipo: "DEJAR", horaInicio: "08:00", horaFin: "08:30" },
        { id: 20, identificador: "OCPMO-002", compartidoConTramoId: 10, tipo: "RETIRAR", horaInicio: "16:00", horaFin: "16:30" },
        { id: 50, identificador: "OCPMO-005", compartidoConTramoId: 10, tipo: "COMPLETO", horaInicio: "08:00", horaFin: "16:30" },
      ],
      "06:00",
    );
    expect(fundidos).toHaveLength(1);
    expect(fundidos[0]).toMatchObject({
      id: 50,
      identificador: "OCPMO-005",
      horaInicio: "08:00",
      horaFin: "16:30",
      invitados: ["OCPMO-001", "OCPMO-002"],
      marcas: [
        { identificador: "OCPMO-001", tipo: "DEJAR", horaInicio: "08:00", horaFin: "08:30" },
        { identificador: "OCPMO-002", tipo: "RETIRAR", horaInicio: "16:00", horaFin: "16:30" },
      ],
    });
  });

  it("línea de tiempo: si nadie se sale del anfitrión, la barra es la de siempre (sin marcas)", () => {
    const fundidos = fundirCompartidos(
      [
        { id: 10, identificador: "OCPMO-001", compartidoConTramoId: null, tipo: "DEJAR", horaInicio: "08:00", horaFin: "08:30" },
        { id: 11, identificador: "OCPMO-004", compartidoConTramoId: 10, tipo: "DEJAR", horaInicio: "08:00", horaFin: "08:30" },
      ],
      "06:00",
    );
    expect(fundidos[0].marcas).toBeUndefined();
    expect(fundidos[0].invitados).toEqual(["OCPMO-004"]);
  });
});

describe("textoAsignacionAutomatica (2026-10-21)", () => {
  it("sin compartidos dice solo cuántos se cubrieron", () => {
    expect(textoAsignacionAutomatica(1, 0)).toBe("1 operativo asignado automáticamente.");
  });

  it("con compartidos dice cuántos traslados van en una unidad ya asignada", () => {
    expect(textoAsignacionAutomatica(3, 1)).toBe(
      "3 operativos asignados automáticamente. 1 traslado viaja en una unidad ya asignada (misma unidad, mismo punto).",
    );
  });
});
