/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Menu de acciones
 * Archivo: RowActionMenu.tsx
 * Responsabilidad: Renderizar un menu escondido si se da click para desplegarlo, son considerados como acciones secundarias para la fila
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 * Modificado: 2026-04-07 - Pasar nombre de acción al onClick
 */
import { memo, useMemo, type FC } from "react";
import type { UserActions } from "../../interfaces/User";
import Iconos from "../common/Iconos";
import SubMenuDropdown from "../common/SubMenuDropdown";
import type { ModalType } from "../../interfaces/Modal";

type RowActionMenuProps = {
  items: UserActions[];
  onClick?: (modalType: ModalType) => void;
};

const RowActionMenu: FC<RowActionMenuProps> = memo(({ items, onClick }) => {
  // Valor derivado de las acciones recibidas: no requiere estado ni efecto.
  const allDisabled = useMemo(
    () => items.every((item) => item?.actiIsDisabled),
    [items],
  );

  // Propiedades para el menu desplegable, se actualizan dinámicamente según las acciones que se le pasen al componente y si estas están deshabilitadas o no
  const propsAcciones = {
    botonProps: {
      estilos: "btn btn-soft btn-primary btn-md mr-2",
      icono: "subMenu",
      deshabilitado: allDisabled,
    },
    renderItem: (items: UserActions[]) => (
      <>
        {items.map((item, index) => (
          <li
            key={index}
            // Si la acción está deshabilitada NO se dispara (la clase menu-disabled solo la pinta gris,
            // no bloquea el clic). Sin este guard, una acción gris igual abría su modal (p. ej. "Revisión
            // y aprobación" en un estado donde no aplica hacía retroceder el expediente).
            onClick={() => { if (!item?.actiIsDisabled) onClick?.(item.actiName); }}
            className={`${item?.actiIsDisabled ? "menu-disabled" : ""}`}
          >
            <span>
              <Iconos
                nombre={item.actiIconName}
                estilo="text-primary"
              />
              {item.actiLabel}
            </span>
          </li>
        ))}
      </>
    ),
  };

  return (
    <SubMenuDropdown
      {...propsAcciones}
      items={items}
    />
  );
});

export default RowActionMenu;
