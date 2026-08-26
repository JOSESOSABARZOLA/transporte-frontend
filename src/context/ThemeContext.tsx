/**
 * App: Administraci�n
 * M�dulo: App Shell
 * Feature: Providers
 * Archivo: themeContext.ts
 * Responsabilidad: Define los tipos y el contexto del sistema de temas de la aplicaci�n.
 * Desarrollador: Cristian Alberto Proa�o Est�vez
 * Fecha: 2026-03-30
 */

import { createContext } from "react";

export type AppTheme = "light" | "dark";

export type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

export const THEME_STORAGE_KEY = "sigoc-theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);