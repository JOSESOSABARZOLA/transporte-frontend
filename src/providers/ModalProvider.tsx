/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Provider de modales
 * Archivo: ModalProvider.tsx
 * Responsabilidad: Gestionar el estado centralizado de los modales.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import { useState, useCallback, useMemo, type FC, type ReactNode } from "react";
import type {
  ModalType,
  ModalCallbacks,
  ModalState,
} from "../interfaces/Modal";
import { ModalContext } from "../context/ModalContext";

/**
 * Provider de modales. Gestiona el estado centralizado del modal abierto.
 * El hook de acceso vive en hooks/useModal.ts.
 */
export const ModalProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    data: null,
    callbacks: undefined,
  });

  /** Abre un modal del tipo indicado, con datos y callbacks opcionales. */
  const openModal = useCallback(
    (type: ModalType, data?: unknown, callbacks?: ModalCallbacks) => {
      setModal({
        isOpen: true,
        type,
        data,
        callbacks,
      });
    },
    [],
  );

  /** Cierra el modal actual. */
  const closeModal = useCallback(() => {
    setModal({
      isOpen: false,
      type: null,
      data: null,
      callbacks: undefined,
    });
  }, []);

  /** Dispara el callback de éxito y cierra el modal. */
  const triggerSuccess = useCallback(
    (datos?: unknown) => {
      if (modal.callbacks?.onSuccess) {
        modal.callbacks.onSuccess(datos);
      }
      closeModal();
    },
    [modal.callbacks, closeModal],
  );

  /** Dispara el callback de error y mantiene el modal abierto. */
  const triggerError = useCallback(
    (error?: unknown) => {
      if (modal.callbacks?.onError) {
        modal.callbacks.onError(error);
      }
    },
    [modal.callbacks],
  );

  // Valor memorizado (2026-10-05): sin esto, cada render entregaba un objeto nuevo a los consumidores.
  const valor = useMemo(
    () => ({ modal, openModal, closeModal, triggerSuccess, triggerError }),
    [modal, openModal, closeModal, triggerSuccess, triggerError],
  );

  return (
    <ModalContext.Provider value={valor}>
      {children}
    </ModalContext.Provider>
  );
};
