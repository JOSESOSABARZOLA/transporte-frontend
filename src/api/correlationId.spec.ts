/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: HTTP
 * Archivo: correlationId.spec.ts
 * Responsabilidad: Verificar que el identificador se genera también fuera de contexto seguro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-18
 *
 * ESTA PRUEBA EXISTE POR UN FALLO REAL. `createCorrelationId` llamaba a
 * `crypto.randomUUID()` sin respaldo, y esa función **solo existe en contextos seguros**.
 * Servida por HTTP desde una IP —como llega el usuario cuando el portal de Auth le
 * redirige— el navegador no la expone, y como esto corre en el interceptor de CADA
 * petición, la aplicación entera fallaba con `crypto.randomUUID is not a function`.
 *
 * No lo detectó nadie porque las dos formas en que se probaba lo ocultaban: `curl` no
 * ejecuta JavaScript, y `localhost` **sí** es contexto seguro.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCorrelationId } from "./correlationId";

/** El formato que el middleware del servidor admite. Fuera de él, la traza se pierde. */
const FORMATO_DEL_SERVIDOR = /^[A-Za-z0-9._:-]{8,60}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createCorrelationId", () => {
  const original = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: original,
    });
    vi.restoreAllMocks();
  });

  /** Sustituye la API de cifrado por la que tendría el navegador en cada situación. */
  const conCrypto = (valor: unknown) =>
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: valor,
    });

  it("usa randomUUID cuando el contexto es seguro", () => {
    const id = createCorrelationId();
    expect(id).toMatch(UUID_V4);
    expect(id).toMatch(FORMATO_DEL_SERVIDOR);
  });

  /** El caso que rompía la aplicación: HTTP contra una IP. */
  it("sin randomUUID compone el identificador con getRandomValues", () => {
    conCrypto({ getRandomValues: original.getRandomValues.bind(original) });

    const id = createCorrelationId();

    expect(id).toMatch(UUID_V4);
    expect(id).toMatch(FORMATO_DEL_SERVIDOR);
  });

  it("sin ninguna API de cifrado sigue devolviendo un identificador válido", () => {
    conCrypto(undefined);

    const id = createCorrelationId();

    expect(id).toMatch(UUID_V4);
    expect(id).toMatch(FORMATO_DEL_SERVIDOR);
  });

  it("no repite el identificador entre peticiones", () => {
    conCrypto({ getRandomValues: original.getRandomValues.bind(original) });

    const generados = new Set(
      Array.from({ length: 200 }, () => createCorrelationId()),
    );

    expect(generados.size).toBe(200);
  });
});
