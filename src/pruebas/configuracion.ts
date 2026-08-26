/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración de pruebas
 * Archivo: configuracion.ts
 * Responsabilidad: Preparar el entorno de cada archivo de prueba.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cada prueba parte de un documento limpio. Sin esto, un componente montado en una
// prueba seguiría en el DOM durante la siguiente y las consultas por texto
// encontrarían dos coincidencias.
afterEach(() => {
  cleanup();
});
