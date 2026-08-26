/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Barra de navegación
 * Archivo: Navbar.tsx
 * Responsabilidad: Presentar la barra superior con avisos, tema y selector de perfil.
 * Desarrollador: Johan Freire · adaptado por Jose Sosa
 * Fecha: 2026-08-04
 */
import { useRef } from "react";

import MenuDropdown from "./MenuDropdown";
import SubMenuDropdown from "../common/SubMenuDropdown";
import Iconos from "../common/Iconos";
import AlertList from "./AlertList";
import type { Alert } from "../../interfaces/Alert";
import { useTheme } from "../../hooks/useTheme";
import { useUser } from "../../hooks/useUser";

type NavbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function Navbar({
  isSidebarOpen,
  onToggleSidebar,
}: NavbarProps) {
  // Los canales de notificación (NOT-01 a NOT-07) están pendientes de definición del
  // negocio, así que la campana no consulta nada todavía y la lista llega vacía.
  // Ver docs/PENDIENTES-VALIDACION.md y docs/FASE2-documentacion-funcional.md §18.
  const alerts: Alert[] = [];
  const totalAlerts = 0;
  const { theme, setTheme } = useTheme();
  const { cerrarSesion } = useUser();
  /**
   * Evita el doble cierre, que pide el contrato compartido.
   *
   * Sin esto, dos clics seguidos lanzan dos POST de cierre y la segunda respuesta puede
   * llegar despues de la redireccion, con la cookie ya borrada. Se ignora el segundo en
   * lugar de deshabilitar el boton: el menu se cierra al pulsar y el usuario no vuelve a
   * verlo, asi que un estado deshabilitado no se llegaria a percibir.
   */
  const cerrando = useRef(false);
  const cerrarUnaVez = () => {
    if (cerrando.current) return;
    cerrando.current = true;
    void cerrarSesion();
  };
  const isDarkTheme = theme === "dark";

  const alertProps = {
    botonProps: {
      estilos:
        "app-topbar-icon-button btn btn-ghost btn-circle text-primary hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary focus-visible:outline-none active:bg-primary/10 active:text-primary",
      icono: "notificaciones",
      deshabilitado: false,
      indicativo: { activo: true, cantidad: totalAlerts },
    },
    menuClassName:
      "app-shell-overlay-panel app-alert-panel mt-4 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md p-0",
    renderItem: (items: Alert[]) => <AlertList items={items} />,
  };

  // Opciones del submenú de perfil.
  type PerfilItem = {
    label: string;
    onClick?: () => void;
  };

  /**
   * CERRAR SESIÓN LLEGÓ CON LA IDENTIDAD REAL (etapa E12). Hasta entonces no existía
   * porque no había sesión que cerrar: el perfil se elegía en un desplegable de pruebas,
   * retirado junto con este cambio.
   *
   * CAMBIAR LA CONTRASEÑA NO SE INCORPORA, y es deliberado: se hace en el portal
   * institucional. Ofrecerlo aquí sugeriría que este módulo custodia credenciales, que
   * es justo lo que el patrón de cookie existe para evitar.
   */
  const itemsPerfil: PerfilItem[] = [
    {
      label: "Acerca de",
    },
    {
      label: "Versión",
    },
    {
      label: "Cerrar sesión",
      onClick: cerrarUnaVez,
    },
  ];

  const propsPerfil = {
    items: itemsPerfil,
    menuClassName:
      "app-shell-overlay-panel app-profile-panel mt-4 w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md p-0",
    renderItem: (items: PerfilItem[]) => (
      <>
        <li className="!m-0 !list-none !p-0">
          <div className="app-profile-panel-theme">
            <div className="app-profile-panel-theme-copy">
              <p className="app-profile-panel-theme-label">Tema</p>
              <p className="app-profile-panel-theme-value">
                {isDarkTheme ? "Oscuro" : "Claro"}
              </p>
            </div>
            <button
              type="button"
              aria-label={
                isDarkTheme ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
              }
              aria-pressed={isDarkTheme}
              onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
              data-state={isDarkTheme ? "dark" : "light"}
              className="app-profile-panel-switch"
            >
              <span className="sr-only">Cambiar tema</span>
              <span
                aria-hidden="true"
                className="app-profile-panel-switch-mark app-profile-panel-switch-mark-light"
              >
                <Iconos
                  nombre="temaClaro"
                  estilo="app-profile-panel-switch-mark-icon"
                />
              </span>
              <span
                aria-hidden="true"
                className="app-profile-panel-switch-mark app-profile-panel-switch-mark-dark"
              >
                <Iconos
                  nombre="temaOscuro"
                  estilo="app-profile-panel-switch-mark-icon"
                />
              </span>
              <span
                aria-hidden="true"
                className="app-profile-panel-switch-thumb"
              >
                <Iconos
                  nombre={isDarkTheme ? "temaOscuro" : "temaClaro"}
                  estilo="app-profile-panel-switch-thumb-icon"
                />
              </span>
            </button>
          </div>
        </li>

        <li className="!m-0 !list-none !p-0">
          <ul className="app-profile-panel-list">
            {items.map((item, index) => (
              <li
                key={item.label}
                className={`app-profile-panel-item-shell !m-0 !list-none !p-0 ${index === 0 ? "app-profile-panel-list-start" : ""
                  }`}
              >
                <button
                  type="button"
                  onClick={item.onClick}
                  aria-disabled={item.onClick ? undefined : true}
                  className="app-profile-panel-item"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </li>
      </>
    ),
  };

  return (
    <>
      <div className="app-topbar navbar sticky top-0 z-30 min-h-16 border-b border-base-300 bg-base-100 px-4 text-base-content shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur md:px-6">
        {/* Botón del menú desplegable */}
        <div className="navbar-start gap-2">
          <MenuDropdown
            open={isSidebarOpen}
            onToggle={onToggleSidebar}
          />
        </div>
        {/* Título del navbar */}
        <div className="navbar-center">
          <a className="app-topbar-brand text-xl font-bold tracking-wide text-primary">
            SIGOC
          </a>
        </div>
        {/* Botones finales para alertas y perfil de usuario */}
        <div className="navbar-end gap-1">


          {/* Botón para visualización rápida de alertas del usuario */}
          <SubMenuDropdown
            {...alertProps}
            items={alerts}
          />

          {/* Botón para visualización del estado del perfil de usuario que está logeado */}
          <SubMenuDropdown {...propsPerfil} />
        </div>
      </div>

      {/* Sidebar desplegable */}
      {/* {isSidebarOpen && (
        <div className="flex">
          <div 
            className="fixed inset-0 top-16 bg-black/20 z-10"
            onClick={onToggleSidebar}
          ></div>
          <aside className="app-sidebar fixed top-16 left-0 h-[calc(100vh-4rem)] z-50 flex flex-col overflow-hidden">
            <div className="app-shell-sidebar-scroll flex flex-col">
              <Header />
              <Content onNavigate={onToggleSidebar} />
            </div>
            <div className="mt-auto">
              <Footer />
            </div>
          </aside>
        </div>
      )} */}
    </>
  );
}
