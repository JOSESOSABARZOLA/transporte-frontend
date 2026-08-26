/**
 * App: Cuadro de Colores
 * M�dulo: N/A
 * Feature: Botones de accion
 * Archivo: ActionButton.tsx
 * Responsabilidad: Renderizar los botones definidos como principales para que se presenten directamente en la fila
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 */

import { memo, type FC } from "react";
import type { UserActions } from "../../interfaces/User";
import Boton from "../common/Boton";
import type { ModalType } from "../../hooks/useModal";

type ActionButtonProps = {
  items: UserActions[];
  onClick?: (modalType: ModalType) => void;
  // disabled: boolean;
};

const ActionButton: FC<ActionButtonProps> = memo(
  ({ items, onClick }) => {

    return (
      <div className="flex flex-row">
        {items.map((prioritario) => (
          <div
            key={prioritario.actiId}
            className="tooltip tooltip-bottom"
            data-tip={
              (prioritario?.actiIsDisabled ?? false)
                ? ""
                : `${prioritario.actiLabel}`
            }
          >
            <Boton
              onClick={() => onClick?.(prioritario.actiName)}
              estilos="btn btn-soft btn-primary btn-md mr-1"
              icono={prioritario.actiIconName}
              deshabilitado={prioritario?.actiIsDisabled ?? false}
              texto=""
            />
          </div>
        ))}
      </div>
    );
  },
);

export default ActionButton;