/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Interfaces y registro de modales
 * Archivo: Modal.ts
 * Responsabilidad: Definir tipos, interfaces y el registro de modales del módulo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import type { ComponentType } from "react";

/**
 * Tipos de modal del módulo. Se agrega uno por cada modal que se registre.
 * M-01 (confirmación de retiro) y M-03 (éxito) no pasan por el registro:
 * usan ModalConfirmacion y ModalExito directamente.
 * Ver docs/FASE5-diseno-interfaz.md §3.1.
 */
export type ModalType = "detalleOperativo";

/** Callbacks que se ejecutan cuando un modal completa o falla una acción. */
export interface ModalCallbacks {
  onSuccess?: (datos?: unknown) => void;
  onError?: (error?: unknown) => void;
  refetchFn?: () => Promise<void> | undefined;
}

/** Estado del modal actual. */
export interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  data: unknown;
  callbacks?: ModalCallbacks;
}

/** Interfaz del contexto de modales. */
export interface ModalContextProps {
  modal: ModalState;
  openModal: (
    type: ModalType,
    data?: unknown,
    callbacks?: ModalCallbacks,
  ) => void;
  closeModal: () => void;
  triggerSuccess: (datos?: unknown) => void;
  triggerError: (error?: unknown) => void;
}

/** Propiedades que ModalContainer entrega a cada modal registrado. */
export interface ModalComponentProps {
  caseData?: unknown;
  onClose: () => void;
  refetchFn?: () => Promise<void> | undefined;
}

/**
 * Registro de componentes de modales. Es parcial a propósito: ModalContainer ya
 * contempla que un tipo no esté registrado. Los modales del módulo se incorporan
 * en la etapa E10 de docs/implementacion/IMPLEMENTATION_GUIDE.md §12.
 */
export const modalRegistry: Partial<
  Record<ModalType, ComponentType<ModalComponentProps>>
> = {};
