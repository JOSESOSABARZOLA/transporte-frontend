/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas de carga
 * Archivo: ventanaCarga.spec.ts
 * Responsabilidad: Verificar que «todavía no» y «ya no» no se confundan.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * SON LOS CASOS 7 Y 8 DEL PLAN DE M-24, y el motivo por el que esta lógica es una función
 * pura y no unas líneas dentro de la pantalla: depende de la hora, y una prueba puede
 * fijar la hora mientras que abrir el navegador a las 14H30 no es un plan de verificación.
 *
 * La hora se construye siempre en UTC y se compara contra `America/Guayaquil`, que es
 * UTC−5: 20H00 UTC son las 15H00 en Quito. Escribirlo así deja la prueba a salvo del huso
 * de la máquina donde se ejecute.
 */

import { describe, expect, it } from "vitest";

import {
  cuentaAtrasDeVentana,
  momentoRespectoDeVentana,
} from "./ventanaCarga.util";
import type { EstadoVentana } from "../interfaces/Formulario";

/** La ventana de la DAF: de 15H00 a 16H30, hora de Quito. */
const ventanaDaf = (parcial: Partial<EstadoVentana> = {}): EstadoVentana => ({
  rol: "DAF",
  abierta: false,
  activo: true,
  zonaHoraria: "America/Guayaquil",
  horaApertura: "15:00",
  horaCierre: "16:30",
  diaApertura: null,
  diaCierre: null,
  mensaje: "La ventana de la DAF va de 15H00 a 16H30.",
  evaluadoEn: "2026-07-31T19:00:00.000Z",
  ...parcial,
});

/** `hora` y `minuto` en hora de Quito, convertidos a UTC. */
const enQuito = (hora: number, minuto = 0): Date =>
  new Date(Date.UTC(2026, 6, 31, hora + 5, minuto));

describe("caso 7 · antes de las 15H00", () => {
  it("a las 14H30 aún no es su turno", () => {
    expect(momentoRespectoDeVentana(ventanaDaf(), enQuito(14, 30))).toBe(
      "ANTES",
    );
  });

  it("a las 00H15 tampoco: falta todo el día", () => {
    expect(momentoRespectoDeVentana(ventanaDaf(), enQuito(0, 15))).toBe("ANTES");
  });
});

describe("caso 8 · después de las 16H30", () => {
  it("a las 17H00 la ventana ya cerró", () => {
    expect(momentoRespectoDeVentana(ventanaDaf(), enQuito(17))).toBe("DESPUES");
  });

  it("a las 16H30 en punto ya cerró: el cierre no se incluye", () => {
    // El servidor evalúa `actual < cierre`; esta función acompaña ese criterio.
    expect(momentoRespectoDeVentana(ventanaDaf(), enQuito(16, 30))).toBe(
      "DESPUES",
    );
  });
});

describe("quién decide es el servidor", () => {
  it("si dice que está abierta, se cree, sin mirar el reloj", () => {
    // Aunque sean las 03H00: el reloj del navegador puede ir mal y manda el servidor.
    expect(
      momentoRespectoDeVentana(ventanaDaf({ abierta: true }), enQuito(3)),
    ).toBe("DENTRO");
  });

  it("una ventana desactivada no restringe nada", () => {
    expect(
      momentoRespectoDeVentana(ventanaDaf({ activo: false }), enQuito(23)),
    ).toBe("SIN_RESTRICCION");
  });

  it("sin estado todavía, no se afirma nada", () => {
    expect(momentoRespectoDeVentana(null, enQuito(14))).toBe("SIN_RESTRICCION");
  });
});

describe("los casos que no se pueden decidir se callan", () => {
  it("una ventana semanal deja hablar solo al servidor", () => {
    // De lunes a viernes: comparar solo la hora daría un aviso equivocado el sábado.
    const semanal = ventanaDaf({ diaApertura: 1, diaCierre: 5 });

    expect(momentoRespectoDeVentana(semanal, enQuito(14))).toBe("FUERA");
  });

  it("sin horas declaradas tampoco se adivina", () => {
    const sinHoras = ventanaDaf({ horaApertura: null, horaCierre: null });

    expect(momentoRespectoDeVentana(sinHoras, enQuito(14))).toBe("FUERA");
  });

  it("si la ventana cruza la medianoche, lo útil es cuándo vuelve a abrir", () => {
    const nocturna = ventanaDaf({ horaApertura: "20:00", horaCierre: "05:00" });

    expect(momentoRespectoDeVentana(nocturna, enQuito(12))).toBe("ANTES");
  });
});

describe("se mide en la zona de la ventana, no en la del navegador", () => {
  it("las 20H00 UTC son las 15H00 en Quito: ya es su turno", () => {
    const momento = new Date("2026-07-31T20:00:00.000Z");

    // A las 15H00 exactas la ventana abre, así que ya no es «antes».
    expect(momentoRespectoDeVentana(ventanaDaf(), momento)).toBe("DESPUES");
  });

  it("las 19H59 UTC son las 14H59 en Quito: todavía no", () => {
    const momento = new Date("2026-07-31T19:59:00.000Z");

    expect(momentoRespectoDeVentana(ventanaDaf(), momento)).toBe("ANTES");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   CUÁNTO QUEDA PARA EL CIERRE · 2026-08-25

   Hasta hoy la ventana **solo se anunciaba cuando ya había cerrado**: quien empezaba a
   capturar un operativo a las 14H55 se enteraba al guardar, con un `423` y el formulario
   entero escrito.

   Lo que se prueba aquí no es el texto sino **los tres saltos de tono** y los dos casos
   en que la cuenta atrás tiene que callarse. Un aviso que se equivoca en cuánto falta es
   peor que no tenerlo: enseña a no fiarse de él justo el día que importa.
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("la cuenta atrás hasta el cierre", () => {
  /** La del DMIP: hasta las 15H00, abierta. Es la que el usuario ve todos los días. */
  const abierta = (parcial: Partial<EstadoVentana> = {}): EstadoVentana =>
    ventanaDaf({
      rol: "DMIP_OPERATIVOS",
      abierta: true,
      horaApertura: "07:00",
      horaCierre: "15:00",
      ...parcial,
    });

  it("a más de una hora informa, sin alarmar", () => {
    const cuenta = cuentaAtrasDeVentana(abierta(), enQuito(12, 40));

    expect(cuenta?.urgencia).toBe("HOLGADA");
    expect(cuenta?.minutosRestantes).toBe(140);
    expect(cuenta?.tiempo).toBe("02:20");
    // La hora de cierre va en el aviso: sin ella, «quedan 2 h» obliga a calcular.
    expect(cuenta?.texto).toContain("15H00");
  });

  it("entre media hora y una hora, amarillo", () => {
    const cuenta = cuentaAtrasDeVentana(abierta(), enQuito(14, 5));

    expect(cuenta?.urgencia).toBe("PROXIMA");
    expect(cuenta?.tiempo).toBe("00:55");
  });

  it("a media hora o menos, rojo, y avisa de que lo no guardado se pierde", () => {
    const cuenta = cuentaAtrasDeVentana(abierta(), enQuito(14, 52));

    expect(cuenta?.urgencia).toBe("INMINENTE");
    expect(cuenta?.tiempo).toBe("00:08");
    expect(cuenta?.texto).toContain("no podrá registrar ni editar");
  });

  /**
   * EL SALTO A ROJO ES A LOS TREINTA, y es el umbral que pidió el negocio. Un minuto
   * antes todavía es amarillo: si esta prueba deja de distinguirlos, el semáforo se
   * habrá corrido sin que nada falle.
   */
  it("los umbrales son inclusivos: 60 ya es amarillo y 30 ya es rojo", () => {
    expect(cuentaAtrasDeVentana(abierta(), enQuito(14))?.urgencia).toBe(
      "PROXIMA",
    );
    expect(cuentaAtrasDeVentana(abierta(), enQuito(14, 29))?.urgencia).toBe(
      "PROXIMA",
    );
    expect(cuentaAtrasDeVentana(abierta(), enQuito(14, 30))?.urgencia).toBe(
      "INMINENTE",
    );
  });

  it("el último minuto también se cuenta, y sin perder el ancho", () => {
    expect(cuentaAtrasDeVentana(abierta(), enQuito(14, 59))?.tiempo).toBe(
      "00:01",
    );
  });

  it("las horas justas llevan los minutos a cero, no se abrevian", () => {
    expect(cuentaAtrasDeVentana(abierta(), enQuito(13))?.tiempo).toBe("02:00");
  });

  /**
   * El texto lo dictó el negocio: «Falta hh:mm para cerrar la ventana, está activa hasta
   * las HH00». La hora va en notación institucional —`15H00`— y la cuenta en `hh:mm`, que
   * es lo que impide leer dos relojes con el mismo formato en la misma frase.
   */
  it("la frase dice hasta cuándo está activa, con la hora institucional", () => {
    const cuenta = cuentaAtrasDeVentana(abierta(), enQuito(14, 5));

    expect(cuenta?.texto).toContain("para cerrar la ventana, está activa hasta las 15H00.");
  });

  /**
   * SE MIDE EN LA ZONA DE LA VENTANA, no en la del navegador. Con la hora de Quito son
   * las 14H30 y quedan treinta minutos; leído en UTC serían las 19H30 y la cuenta atrás
   * daría un número absurdo. Es el mismo motivo por el que `momentoRespectoDeVentana`
   * usa `minutosEnZona`.
   */
  it("cuenta en la zona de la ventana, no en la del navegador", () => {
    const cuenta = cuentaAtrasDeVentana(abierta(), enQuito(14, 30));

    expect(cuenta?.minutosRestantes).toBe(30);
  });

  describe("cuándo se calla, que importa tanto como cuándo habla", () => {
    it("con la ventana cerrada no cuenta nada: de eso ya avisa el servidor", () => {
      expect(cuentaAtrasDeVentana(abierta({ abierta: false }), enQuito(16))).toBeNull();
    });

    it("sin restricción horaria tampoco", () => {
      expect(cuentaAtrasDeVentana(abierta({ activo: false }), enQuito(12))).toBeNull();
    });

    /**
     * Una ventana con días de apertura —de lunes a viernes— no se resuelve comparando
     * horas. Inventar la cuenta atrás daría un número falso el fin de semana.
     */
    it("con días de apertura se calla, porque no puede afirmarlo", () => {
      const semanal = abierta({ diaApertura: 1, diaCierre: 5 });

      expect(cuentaAtrasDeVentana(semanal, enQuito(12))).toBeNull();
    });

    it("sin hora de cierre no hay nada que contar", () => {
      expect(cuentaAtrasDeVentana(abierta({ horaCierre: null }), enQuito(12))).toBeNull();
    });
  });

  /**
   * Ventana nocturna —22H00 a 02H00—: a las 23H00 quedan tres horas, no menos veinte.
   * Sin este caso, la cuenta atrás daría negativo justo mientras se está usando.
   */
  it("una ventana que cruza la medianoche cuenta hasta el cierre del día siguiente", () => {
    const nocturna = abierta({ horaApertura: "22:00", horaCierre: "02:00" });

    expect(cuentaAtrasDeVentana(nocturna, enQuito(23))?.minutosRestantes).toBe(
      180,
    );
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * Y LA VUELTA DE MEDIANOCHE **NO** SE APLICA A UNA VENTANA QUE NO LA CRUZA.
   *
   * Las tres ventanas departamentales cierran a las 15H00 **sin hora de apertura** —así
   * están en `t_ventana_carga`: cargan desde medianoche—. Si el reloj va adelantado o
   * discrepa del servidor, a las 16H00 la resta se iría al día siguiente y diría «Falta
   * 23:00». Se calla: quien manda sobre si se puede escribir es el servidor.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("sin hora de apertura y pasada la de cierre, se calla en vez de inventar", () => {
    const departamental = abierta({ horaApertura: null, horaCierre: "15:00" });

    expect(cuentaAtrasDeVentana(departamental, enQuito(16))).toBeNull();
  });

  it("pero sin hora de apertura y dentro del horario, cuenta normalmente", () => {
    const departamental = abierta({ horaApertura: null, horaCierre: "15:00" });

    expect(
      cuentaAtrasDeVentana(departamental, enQuito(14, 20))?.tiempo,
    ).toBe("00:40");
  });
});
