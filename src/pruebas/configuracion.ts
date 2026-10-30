/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración de pruebas
 * Archivo: configuracion.ts
 * Responsabilidad: Preparar el entorno de cada archivo de prueba.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * EL HOST DE MENSAJES VA MONTADO EN TODAS LAS PRUEBAS (2026-10-16). En la aplicación lo monta
 * `AppProviders` una sola vez; una pantalla probada sola no pasa por ahí, y sus avisos breves
 * (`toast.*`) y sus hitos (`mensaje.exito`) no se pintarían. Se monta aquí, antes de cada prueba,
 * para que una pantalla se pruebe como se ve en el navegador. Ninguna prueba debe montar el suyo:
 * habría dos y cada mensaje saldría repetido.
 */

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";

import MensajeHost from "../components/common/MensajeHost.tsx";
import { olvidarJornadasLaborales } from "../hooks/useJornadasLaborales.ts";
import { reiniciarMensajes } from "../utils/mensaje.ts";
import { JORNADAS_DE_PRUEBA } from "./jornadasDePrueba.ts";

/*
  EL CATÁLOGO DE JORNADAS LABORALES (2026-10-23), EL MISMO EN TODAS LAS PRUEBAS. Personal, Flota y
  sus cajones lo leen con `useJornadasLaborales`; sin esto, cada pantalla probada pediría al
  servidor real. Son las dos que siembra la migración. Una prueba que necesite otras lo cambia con
  `vi.mocked(JornadasLaboralesService.listar)`.
*/
vi.mock("../services/jornadasLaborales.service.ts", () => ({
  JornadasLaboralesService: {
    listar: vi.fn(() => Promise.resolve(JORNADAS_DE_PRUEBA)),
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarActivo: vi.fn(),
  },
}));

beforeEach(() => {
  render(createElement(MensajeHost));
});

// Cada prueba parte de un documento limpio. Sin esto, un componente montado en una
// prueba seguiría en el DOM durante la siguiente y las consultas por texto
// encontrarían dos coincidencias. La cola de mensajes y los avisos también se vacían.
afterEach(() => {
  act(() => reiniciarMensajes());
  cleanup();
  olvidarJornadasLaborales();
});
