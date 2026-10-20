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
 * La detección de horas fijas que no coinciden (aviso «Usar {cierre}») se retiró de la pantalla el
 * 2026-10-08; el servidor la sigue usando en ejecución para el mensaje del funcionario.
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
