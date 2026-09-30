/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: parametro.util.ts
 * Responsabilidad: Comprobar el valor contra su rango antes de enviarlo, y describirlo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA COMPROBACIÓN NO DUPLICA UNA REGLA. APLICA LA QUE EL SERVIDOR ACABA DE ENVIAR.
 *
 * La diferencia con el dígito verificador de la cédula —que en M-27 se dejó
 * deliberadamente al servidor— es de fondo: allí la norma vive en el código del
 * servidor y copiarla aquí habría creado dos implementaciones que divergen. Aquí
 * `minimo`, `maximo` y `tipo` **viajan en la respuesta**: lo que se comprueba en el
 * navegador es el rango que el propio servidor declaró para ese parámetro, no una copia
 * escrita a mano. Si mañana el rango cambia en la base, esta función cambia con él sin
 * tocar una línea.
 *
 * El plan lo pide así: «el valor se valida contra su rango **antes de enviarlo** y
 * también en el servidor». No es redundancia: aquí evita el viaje y explica el rango en
 * el momento de escribir; allá es la garantía, y sigue mandando.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParametroPolitica } from "../interfaces/Administracion";
import type { TipoVentana, VentanaCarga } from "../interfaces/Administracion";

/** `HH:MM` de 00:00 a 23:59. El mismo patrón que `PATRON_HORA` en el servidor. */
const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Claves cuyo valor es una hora.
 *
 * El servidor las distingue por un dominio propio —`DOMINIO_TEXTO`— porque su tipo es
 * `TEXTO` y el tipo por sí solo no dice que sea una hora. Aquí se reconocen por el
 * sufijo de la clave, que es lo que hay: si mañana aparece una clave de hora con otro
 * nombre, el servidor la rechazará igual y su mensaje se mostrará tal cual.
 */
const esClaveDeHora = (clave: string): boolean =>
  clave.startsWith("HORA_") || clave.startsWith("FRANJA_");

/** Valores admitidos del período de cómputo. Los declara `PERIODOS_COMPUTO`. */
const PERIODOS_COMPUTO = ["SEMANAL", "QUINCENAL", "MENSUAL"];

/**
 * Motivo por el que el valor no es admisible, o `null` si lo es.
 *
 * Devuelve **el motivo y no un booleano** por la misma razón que en M-24: con un
 * booleano, el texto habría que componerlo aparte y una condición nueva se agregaría al
 * booleano olvidando el mensaje.
 */
export const motivoDeRechazo = (
  parametro: ParametroPolitica,
  valor: string,
): string | null => {
  const limpio = valor.trim();

  if (limpio.length === 0) {
    return `El parámetro ${parametro.clave} no puede quedar vacío.`;
  }

  switch (parametro.tipo) {
    case "ENTERO":
      if (!/^-?\d+$/.test(limpio)) {
        return `${parametro.clave} admite solo números enteros.`;
      }
      return fueraDeRango(parametro, Number(limpio));

    case "DECIMAL":
      if (!/^-?\d+([.,]\d+)?$/.test(limpio)) {
        return `${parametro.clave} admite solo valores numéricos.`;
      }
      return fueraDeRango(parametro, Number(limpio.replace(",", ".")));

    case "BOOLEANO":
      return ["true", "false"].includes(limpio.toLowerCase())
        ? null
        : `${parametro.clave} admite únicamente verdadero o falso.`;

    case "TEXTO":
      if (esClaveDeHora(parametro.clave) && !PATRON_HORA.test(limpio)) {
        return "La hora se escribe en formato HH:MM, por ejemplo 15:00.";
      }
      if (
        parametro.clave === "PERIODO_COMPUTO_SALIDAS" &&
        !PERIODOS_COMPUTO.includes(limpio)
      ) {
        return `El período de cómputo admite estos valores: ${PERIODOS_COMPUTO.join(", ")}.`;
      }
      return null;
  }
};

/** Compara con los extremos que el servidor declaró para ese parámetro. */
const fueraDeRango = (
  parametro: ParametroPolitica,
  valor: number,
): string | null => {
  const unidad = parametro.unidad ? ` ${parametro.unidad}` : "";

  if (parametro.minimo !== null && valor < Number(parametro.minimo)) {
    return `${parametro.clave} no puede ser menor que ${parametro.minimo}${unidad}.`;
  }

  if (parametro.maximo !== null && valor > Number(parametro.maximo)) {
    return `${parametro.clave} no puede ser mayor que ${parametro.maximo}${unidad}.`;
  }

  return null;
};

/**
 * Rango admisible en palabras. Caso 4 del plan.
 *
 * Se muestra **siempre**, no solo al equivocarse: quien va a cambiar un umbral necesita
 * saber qué puede poner antes de intentarlo, no después de que se lo rechacen.
 */
export const descripcionDeRango = (parametro: ParametroPolitica): string => {
  const unidad = parametro.unidad ? ` ${parametro.unidad}` : "";

  if (parametro.minimo !== null && parametro.maximo !== null) {
    return `Entre ${parametro.minimo} y ${parametro.maximo}${unidad}`;
  }
  if (parametro.minimo !== null) return `Desde ${parametro.minimo}${unidad}`;
  if (parametro.maximo !== null) return `Hasta ${parametro.maximo}${unidad}`;

  if (parametro.tipo === "TEXTO" && esClaveDeHora(parametro.clave)) {
    return "Hora en formato HH:MM";
  }
  if (parametro.clave === "PERIODO_COMPUTO_SALIDAS") {
    return PERIODOS_COMPUTO.join(" · ");
  }
  if (parametro.tipo === "BOOLEANO") return "Verdadero o falso";

  return "Sin rango definido";
};

// ─────────────────────────── Ventanas ───────────────────────────

export const NOMBRE_TIPO_VENTANA: Record<TipoVentana, string> = {
  SEMANAL: "Semanal",
  DIARIO: "Diario",
  INTERVALO: "Intervalo",
};

const DIAS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

/** El día de la semana en palabras. 1 es lunes, 7 es domingo. */
export const nombreDeDia = (dia: number | null): string =>
  dia === null ? "" : (DIAS[dia - 1] ?? String(dia));

/**
 * El horario de la ventana en una frase.
 *
 * Una hora nula **no es un error ni un dato faltante**: significa «sin restricción de
 * apertura», que es lo único que las fuentes permiten afirmar de los departamentos, cuyo
 * horario solo define el cierre. Escribir «—» lo haría parecer un dato que alguien olvidó
 * cargar.
 */
export const horarioDeVentana = (ventana: VentanaCarga): string => {
  if (!ventana.activo) return "Sin restricción horaria";

  const apertura = ventana.horaApertura
    ? `${ventana.diaApertura ? `${nombreDeDia(ventana.diaApertura)} ` : ""}${ventana.horaApertura}`
    : null;

  const cierre = ventana.horaCierre
    ? `${ventana.diaCierre ? `${nombreDeDia(ventana.diaCierre)} ` : ""}${ventana.horaCierre}`
    : null;

  if (apertura && cierre) return `De ${apertura} a ${cierre}`;
  if (cierre) return `Hasta ${cierre}, sin hora de apertura`;
  if (apertura) return `Desde ${apertura}, sin hora de cierre`;

  return "Sin horas declaradas";
};

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUÍ VIVÍAN `NOMBRE_ROL` Y `ROLES_ASIGNABLES`, Y SE RETIRARON EL 2026-09-01.
 *
 * Eran un mapa de nombres escrito a mano y la lista que de él salía para el desplegable
 * de «Cuentas del cuadro» y de «Roles de Auth central». Con ellos, **añadir un rol
 * exigía tocar el navegador**, y había otras dos copias del mismo mapa en el servidor.
 *
 * Ahora salen de `GET /administracion/roles`, por `useCatalogoRoles`. Ningún rol queda
 * escrito en el frontend.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
