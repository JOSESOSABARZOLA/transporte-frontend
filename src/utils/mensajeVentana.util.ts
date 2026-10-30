/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: mensajeVentana.util.ts
 * Responsabilidad: Resolver los marcadores del mensaje de una ventana.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * COPIA DEL SERVIDOR (`common/auth/application/mensaje-ventana.ts`) de `resolverMensajeVentana`.
 * El modal «Editar ventana de carga» la necesita en vivo, mientras se escribe, sin ir al servidor.
 * La detección de horas fijas que no coinciden se retiró de la pantalla el 2026-10-08 y VOLVIÓ el
 * 2026-10-24 (rediseño de «Ventanas y parámetros»): `detectarHoraInconsistente`, copia de la del
 * servidor, marca el mensaje «no coincide con el horario» y ofrece `mensajeSugerido`.
 * La autoridad sigue siendo el servidor: lo que el funcionario lee lo resuelve él.
 *
 * `{cierre}` y `{apertura}` se reemplazan por la hora configurada en formato institucional
 * (19H25), así el texto sigue a la hora cuando alguien la mueve.
 */

/** Marcador de la hora de cierre. */
export const MARCADOR_CIERRE = "{cierre}";
/** Marcador de la hora de apertura. */
export const MARCADOR_APERTURA = "{apertura}";

/** Apertura vacía = se puede cargar desde el inicio del día. */
const INICIO_DEL_DIA = "00:00";

/** `19:25` → `19H25`, el formato de lectura del cuadro. */
export const comoHoraInstitucional = (hora: string): string =>
  hora.replace(":", "H");

/**
 * El mensaje con los marcadores reemplazados por las horas reales.
 *
 *   · `{cierre}`   → la hora de cierre (19H25). Sin cierre, el marcador se quita.
 *   · `{apertura}` → la hora de apertura; sin apertura, 00H00.
 */
export const resolverMensajeVentana = (
  mensaje: string,
  apertura: string | null,
  cierre: string | null,
): string => {
  const textoCierre = cierre === null ? "" : comoHoraInstitucional(cierre);
  const textoApertura = comoHoraInstitucional(apertura ?? INICIO_DEL_DIA);
  return mensaje
    .split(MARCADOR_CIERRE)
    .join(textoCierre)
    .split(MARCADOR_APERTURA)
    .join(textoApertura);
};

/** Una hora escrita en el texto: «18H25», «18h25» o «18:25» (con o sin cero inicial). */
const PATRON_HORA_FIJA = /(?<![0-9])((?:[01]?[0-9]|2[0-3]))[Hh:]([0-5][0-9])(?![0-9])/g;

/** Una hora fija del mensaje que no coincide con la ventana. */
export interface HoraInconsistente {
  /** Tal como está escrita en el mensaje («18H25», «18:25»). */
  texto: string;
  /** Normalizada a `HH:MM`. */
  hora: string;
}

/**
 * La PRIMERA hora fija del mensaje que no es ni la de apertura ni la de cierre, o `null` si no
 * hay horas fijas o todas coinciden. Espejo de `detectarHoraInconsistente` del servidor, que con
 * esa hora deja de usar el texto y le muestra al funcionario el mensaje calculado.
 */
export const detectarHoraInconsistente = (
  mensaje: string,
  apertura: string | null,
  cierre: string | null,
): HoraInconsistente | null => {
  for (const coincidencia of mensaje.matchAll(PATRON_HORA_FIJA)) {
    const hora = `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`;
    if (hora !== apertura && hora !== cierre) return { texto: coincidencia[0], hora };
  }
  return null;
};

/**
 * El mensaje que se ofrece con «Usar mensaje sugerido», con los marcadores en lugar de horas: así
 * nunca vuelve a desalinearse. Es el mismo texto con que la migración `20261024090000` corrigió
 * los mensajes guardados.
 */
export const mensajeSugerido = (
  rol: string,
  tipo: string,
): string => {
  if (rol === "DAF") {
    return "La ventana de asignación de transporte va de {apertura} a {cierre}. Fuera de ese intervalo no se puede asignar conductor ni vehículo.";
  }
  const cuando = tipo === "LABORABLE" ? "el siguiente día laborable" : "mañana";
  return `La ventana de carga de su departamento cerró a las {cierre}. Vuelve a abrirse ${cuando} a las {apertura}.`;
};
