/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: HTTP
 * Archivo: correlationId.ts
 * Responsabilidad: Genera y resuelve identificadores de correlación para solicitudes HTTP.
 * Desarrollador: Johan Freire · corregido por Jose Sosa
 * Fecha: 2026-03-27 · 2026-08-18
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO BASTA `crypto.randomUUID()`, QUE ES LO QUE HABÍA.
 *
 * Solo existe en **contextos seguros**: HTTPS, o `localhost`. Servida por HTTP desde una
 * dirección IP —`http://<IP_EQUIPO_DESARROLLO>:5176`, que era como llegaba el usuario cuando el
 * portal de Auth le redirigía— el navegador **no expone esa función**, y la llamada lanza
 * `crypto.randomUUID is not a function`.
 *
 * El regreso del portal se movió después a `localhost:5180`, que **sí** es contexto seguro,
 * pero el respaldo se queda: en producción sobre HTTP en cualquier origen que no sea
 * `localhost` el fallo vuelve, y esto corre en cada petición.
 *
 * Y esto se ejecuta en el interceptor de CADA petición, así que el fallo no afectaba a
 * una pantalla: **rompía la aplicación entera** en ese contexto. Se descubrió al abrir el
 * ingreso desde el portal, porque `curl` no ejecuta JavaScript y `localhost` sí es
 * contexto seguro: las dos formas en que se había probado lo ocultaban.
 *
 * `crypto.getRandomValues()` **sí** está disponible sin contexto seguro, así que el
 * respaldo compone el identificador con la misma calidad de aleatoriedad. El último
 * respaldo, `Math.random()`, no es criptográfico y no necesita serlo: esto identifica una
 * petición en el registro, no autentica nada.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const CORRELATION_ID_HEADER = "x-correlation-id";

/** UUID v4 a partir de dieciséis octetos, con sus bits de versión y variante. */
function componerUuid(octetos: Uint8Array): string {
  octetos[6] = (octetos[6] & 0x0f) | 0x40; // versión 4
  octetos[8] = (octetos[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(octetos, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/**
 * Identificador de correlación de una petición.
 *
 * El formato debe encajar en `/^[A-Za-z0-9._:-]{8,60}$/`, que es lo que valida el
 * middleware del servidor: un valor fuera de ese alfabeto se descarta y se reemplaza,
 * y con él se pierde la traza. Un UUID lo cumple por construcción.
 */
export function createCorrelationId(): string {
  const api = globalThis.crypto as Crypto | undefined;

  if (typeof api?.randomUUID === "function") {
    return api.randomUUID();
  }

  if (typeof api?.getRandomValues === "function") {
    return componerUuid(api.getRandomValues(new Uint8Array(16)));
  }

  // Sin API de cifrado. No es criptográfico y no hace falta que lo sea: esto solo
  // enlaza una petición con sus líneas de registro.
  const octetos = new Uint8Array(16);
  for (let i = 0; i < octetos.length; i += 1) {
    octetos[i] = Math.floor(Math.random() * 256);
  }
  return componerUuid(octetos);
}
