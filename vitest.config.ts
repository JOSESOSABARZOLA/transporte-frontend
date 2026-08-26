/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración de pruebas
 * Archivo: vitest.config.ts
 * Responsabilidad: Configurar el ejecutor de pruebas unitarias del frontend.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * APARTE DE `vite.config.ts`, a propósito. La configuración de construcción no necesita
 * saber que existen pruebas, y mezclarlas obliga a cargar `jsdom` y los complementos de
 * prueba en cada `npm run build`.
 *
 * `jsdom` y no un navegador real: lo que se prueba aquí son componentes y funciones, no
 * el sistema completo. La comprobación en navegador de la navegación por rol sigue
 * siendo manual, y así está declarado en la documentación de M-21.
 */

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/pruebas/configuracion.ts"],
    include: ["src/**/*.spec.{ts,tsx}"],
    css: false,
  },
});
