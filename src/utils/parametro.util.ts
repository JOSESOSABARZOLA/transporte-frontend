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
import type { TipoVentana } from "../interfaces/Administracion";

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
export const esClaveDeHora = (clave: string): boolean =>
  clave.startsWith("HORA_") ||
  clave.startsWith("FRANJA_") ||
  // Transporte (2026-10-24): dos horas que no siguen el prefijo.
  clave === "INICIO_JORNADA_TRANSPORTE" ||
  clave === "GUARDA_HORA_TARDE";

/**
 * Lo tecleado en un campo de hora (`CampoHora24`, 2026-10-24), en forma HH:MM mientras se
 * escribe: solo cifras y los dos puntos, que se ponen solos tras la segunda cifra («1630» →
 * «16:30»). Como mucho cinco caracteres. Validar es cosa de `motivoDeRechazo`.
 */
export const comoHoraTecleada = (texto: string): string => {
  if (texto.includes(":")) {
    const [horas, minutos = ""] = texto.split(":");
    return `${horas.replace(/\D/g, "").slice(0, 2)}:${minutos.replace(/\D/g, "").slice(0, 2)}`;
  }
  const cifras = texto.replace(/\D/g, "").slice(0, 4);
  return cifras.length > 2 ? `${cifras.slice(0, 2)}:${cifras.slice(2)}` : cifras;
};

/**
 * Parámetros de la DAF con valor por DÍA DE LA SEMANA (versión consolidada, 2026-10-06): siete
 * números L,M,X,J,V,S,D, o `SIN_CONFIGURAR` mientras el negocio no los fije.
 */
const CLAVES_POR_DIA = ["DAF_MIN_CONDUCTORES_DIA", "DAF_MIN_CONDUCTORES_NOCHE"];
const AYUDA_POR_DIA = "7 números L,M,X,J,V,S,D o SIN_CONFIGURAR";
const PATRON_POR_DIA = /^\d+(,\d+){6}$/;

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
        CLAVES_POR_DIA.includes(parametro.clave) &&
        limpio !== "SIN_CONFIGURAR" &&
        !PATRON_POR_DIA.test(limpio.replace(/\s+/g, ""))
      ) {
        return `${parametro.clave} admite ${AYUDA_POR_DIA}.`;
      }
      // Las listas (períodos, SI/NO/SIN_CONFIGURAR) las declara el servidor en `opciones` (2026-10-24).
      if (parametro.opciones && !parametro.opciones.includes(limpio)) {
        return `${parametro.clave} admite estos valores: ${parametro.opciones.join(", ")}.`;
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
  if (parametro.opciones) return parametro.opciones.join(" · ");
  if (CLAVES_POR_DIA.includes(parametro.clave)) return AYUDA_POR_DIA;
  if (parametro.tipo === "BOOLEANO") return "Verdadero o falso";

  return "Sin rango definido";
};

// ─────────────────────────── Ventanas ───────────────────────────

export const NOMBRE_TIPO_VENTANA: Record<TipoVentana, string> = {
  DIARIO: "Diario (todos los días)",
  LABORABLE: "Solo días laborables",
  SIN_RESTRICCION: "Sin restricción",
  // Heredados: el servidor ya no los ofrece, pero una ventana antigua podría traerlos.
  SEMANAL: "Semanal",
  INTERVALO: "Intervalo",
};

/** Los tipos que se pueden ELEGIR (2026-10-07), en el orden del selector. */
export const TIPOS_VENTANA_ELEGIBLES: TipoVentana[] = [
  "DIARIO",
  "LABORABLE",
  "SIN_RESTRICCION",
];

/** La ayuda bajo el selector de tipo, que cambia según el tipo elegido. */
export const AYUDA_TIPO_VENTANA: Partial<Record<TipoVentana, string>> = {
  DIARIO: "Aplica todos los días, incluidos fines de semana.",
  // Sin calendario de feriados en el sistema (2026-10-07): solo sábado y domingo quedan sin carga.
  LABORABLE: "Aplica de lunes a viernes; fines de semana sin carga.",
  SIN_RESTRICCION:
    "El rol puede cargar a cualquier hora; no se usan horas ni mensaje.",
};

// `horarioDeVentana` y `nombreDeDia` se retiraron el 2026-10-24: la tabla de ventanas dice su
// horario con `detalleDeHorario` y su estado en vivo con `estadoVentana.util.ts`.

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
