/**
 * App: Cuadro de Colores
 * M�dulo: N/A
 * Feature: Menu desplegable
 * Archivo: MenuDropdown.tsx
 * Responsabilidad: Renderizar condicionalmente si es que el usuario clickea el boton de menu en el navbar
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 */


type MenuDropdownProps = {
  open: boolean;
  onToggle: () => void;
};

const MenuDropdown = ({ open, onToggle }: MenuDropdownProps) => {
  return (
    <button
      type="button"
      aria-label={open ? "Cerrar menú lateral" : "Abrir menú lateral"}
      aria-expanded={open}
      className={`app-topbar-icon-button app-topbar-menu-button btn btn-circle ${
        open ? "app-topbar-menu-button-open" : ""
      }`}
      onClick={onToggle}
    >
      {open ? (
        <svg
          className="fill-current"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 512 512"
        >
          <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
        </svg>
      ) : (
        <svg
          className="fill-current"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 512 512"
        >
          <path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
        </svg>
      )}
    </button>
  );
};

export default MenuDropdown;
