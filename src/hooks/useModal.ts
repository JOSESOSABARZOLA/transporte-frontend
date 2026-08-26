/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Hook de modales
 * Archivo: useModal.ts
 * Responsabilidad: Exponer el contexto de modales a cualquier componente.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import { useContext } from "react";
import { ModalContext } from "../context/ModalContext";
import type { ModalContextProps } from "../interfaces/Modal";

export { type ModalType } from "../interfaces/Modal";

/**
 * Hook para acceder al contexto de modales.
 * @throws {Error} Si se usa fuera de un ModalProvider.
 */
export const useModal = (): ModalContextProps => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal debe usarse dentro de ModalProvider");
  }
  return context;
};
