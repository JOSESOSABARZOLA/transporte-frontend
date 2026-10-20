/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: traductorErrores.spec.ts
 * Responsabilidad: Fijar cómo un fallo se vuelve mensaje: el código conocido con su título y el texto
 *                  del servidor, el desconocido con el título genérico, y el 500, el tiempo agotado y
 *                  el fallo del navegador con el texto genérico y el detalle técnico aparte.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 */

import { describe, expect, it } from "vitest";

import {
  MENSAJE_ERROR_GENERICO,
  TITULO_ERROR_GENERICO,
  traducirError,
} from "./traductorErrores.ts";

/** Un error del cliente HTTP con el sobre del servidor. */
const delServidor = (statusCode: number, codigo: string, mensaje: string, correlacionId?: string) => ({
  isHttpClientError: true,
  status: statusCode,
  originalError: { response: { data: { statusCode, codigo, mensaje, correlacionId } } },
});

describe("traductorErrores", () => {
  it("un código conocido lleva su título y el mensaje del servidor tal cual (regla 7)", () => {
    const texto =
      "PMA-3370 tiene transporte asignado el 16/10/2026 a las 08H00 (operativo OC-1). Libere esa asignación en «Planificar el día» antes de darlo de baja.";
    const traducido = traducirError(delServidor(409, "RECURSO_CON_ASIGNACION", texto, "abc-123"));

    expect(traducido.titulo).toBe("No se pudo dar de baja");
    expect(traducido.mensaje).toBe(texto);
    expect(traducido.detalle).toBe("HTTP 409 · RECURSO_CON_ASIGNACION · Seguimiento: abc-123");
    expect(traducido.reintentable).toBe(false);
  });

  it("el título que pide la pantalla gana al del código", () => {
    const traducido = traducirError(delServidor(409, "CATALOGO_EN_USO", "Ya se usó."), {
      titulo: "No se pudo eliminar",
    });
    expect(traducido.titulo).toBe("No se pudo eliminar");
    expect(traducido.mensaje).toBe("Ya se usó.");
  });

  it("un código desconocido con mensaje: título genérico y el texto del servidor", () => {
    const traducido = traducirError(delServidor(409, "ALGO_NUEVO", "El servidor lo explica."));
    expect(traducido.titulo).toBe(TITULO_ERROR_GENERICO);
    expect(traducido.mensaje).toBe("El servidor lo explica.");
    expect(traducido.detalle).toContain("ALGO_NUEVO");
  });

  it("un 500 nunca muestra el texto técnico: va el genérico y el detalle aparte", () => {
    const traducido = traducirError(
      delServidor(500, "ERROR_INTERNO", "TypeError: cannot read 'x' of undefined", "id-500"),
    );
    expect(traducido.titulo).toBe(TITULO_ERROR_GENERICO);
    expect(traducido.mensaje).toBe(MENSAJE_ERROR_GENERICO);
    expect(traducido.mensaje).not.toContain("TypeError");
    expect(traducido.detalle).toBe("HTTP 500 · ERROR_INTERNO · Seguimiento: id-500");
    expect(traducido.reintentable).toBe(true);
  });

  it("el tiempo agotado es el genérico, con la causa en el detalle", () => {
    const traducido = traducirError({
      isHttpClientError: true,
      code: "ECONNABORTED",
      correlationId: "id-t",
      originalError: {},
    });
    expect(traducido.mensaje).toBe(MENSAJE_ERROR_GENERICO);
    expect(traducido.detalle).toContain("tiempo de espera agotado");
    expect(traducido.detalle).toContain("Seguimiento: id-t");
    expect(traducido.reintentable).toBe(true);
  });

  it("sin red, dice que no hay comunicación", () => {
    const traducido = traducirError({ isHttpClientError: true, code: "ERR_NETWORK", originalError: {} });
    expect(traducido.mensaje).toMatch(/No hay comunicación con el servidor/);
  });

  it("un 403 es un error de permiso y conserva el texto del servidor", () => {
    const traducido = traducirError(
      delServidor(403, "PERMISO_INSUFICIENTE", "Su perfil no puede administrar permisos."),
    );
    expect(traducido.titulo).toBe("Sin permiso para esta acción");
    expect(traducido.mensaje).toBe("Su perfil no puede administrar permisos.");
  });

  it("un 422 tiene trato propio: conserva el texto del servidor", () => {
    const traducido = traducirError(delServidor(422, "DATOS_INVALIDOS", "La fecha no es válida."));
    expect(traducido.titulo).toBe("Revise los datos");
    expect(traducido.mensaje).toBe("La fecha no es válida.");
  });

  it("un fallo del navegador va al detalle, nunca al mensaje", () => {
    const traducido = traducirError(new Error("Failed to load PDF document"));
    expect(traducido.mensaje).toBe(MENSAJE_ERROR_GENERICO);
    expect(traducido.detalle).toContain("Failed to load PDF document");
  });

  it("una dependencia externa caída se puede reintentar", () => {
    const traducido = traducirError(delServidor(503, "AUTH_NO_DISPONIBLE", "Auth central no respondió."));
    expect(traducido.titulo).toBe("Auth central no responde");
    expect(traducido.reintentable).toBe(true);
  });
});
