/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Providers
 * Archivo: useTheme.ts
 * Responsabilidad: Expone el acceso tipado al contexto de tema global de la aplicación.
 * Desarrollador: Cristian Alberto Proaño Estévez
 * Fecha: 2026-03-30
 */

import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
