/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Acciones de cada fila
 * Archivo: RowActions.tsx
 * Responsabilidad: Renderizar las acciones permitidas sobre una fila y abrir su modal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import { useCallback, useMemo, type FC } from "react";
import RowActionMenu from "./RowActionMenu";
import ActionButton from "./ActionButton";
import type { UserActions } from "../../interfaces/User";
import type { ModalType } from "../../interfaces/Modal";
import { useModal } from "../../hooks/useModal";

type RowActionsProps = {
  actions: UserActions[];
  data: unknown;
  refetchFn: () => Promise<void> | undefined;
};

const RowActions: FC<RowActionsProps> = ({ actions, data, refetchFn }) => {
  const { openModal } = useModal();

  // Acciones que se presentan como botón directo.
  const accionesBoton = useMemo(
    () => actions.filter((item) => item?.actiIsPrioritaly),
    [actions],
  );

  // Acciones secundarias, en menú desplegable, para no sobrecargar la interfaz.
  const accionesMenu = useMemo(
    () => actions.filter((item) => !item?.actiIsPrioritaly),
    [actions],
  );

  // El nombre de la acción es el tipo de modal. Si no está registrado,
  // ModalContainer no renderiza nada.
  const abrirModal = useCallback(
    (accion: string) => {
      openModal(accion as ModalType, data, { refetchFn });
    },
    [data, openModal, refetchFn],
  );

  return (
    <div className="flex flex-row items-center justify-center gap-1">
      <ActionButton
        items={accionesBoton}
        onClick={abrirModal}
      />

      {accionesMenu.length > 0 && (
        <RowActionMenu
          items={accionesMenu}
          onClick={abrirModal}
        />
      )}
    </div>
  );
};

export default RowActions;
