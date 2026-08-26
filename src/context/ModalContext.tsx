/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Contexto de modales
 * Archivo: ModalContext.tsx
 * Responsabilidad: Re-exportar tipos y contexto de modales para compatibilidad
 * Desarrollador: Johan Freire
 * Fecha: 2026-04-07
 */

import { createContext } from "react";
import type { ModalContextProps } from "../interfaces/Modal";

/**
 * Contexto global de modales
 */
const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export { ModalContext };

