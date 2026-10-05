/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Partes del menu
 * Archivo: MenuDropdownParts.tsx
 * Responsabilidad: Proveer los diferentes componentes que formará parte del menu principal del navbar
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 */
import { NavLink, useLocation } from "react-router-dom";
import Iconos from "../common/Iconos";
import logoQuito from "../../assets/logo_quito.png";
import type { FC } from "react";
import {
  shellNavigationItems,
  type NavigationItem,
} from "../../config/navigation";
import { useUser } from "../../hooks/useUser";
import { tieneRol } from "../../hooks/usePermiso";

const resolveNavigationPath = (path: string, parentPath = "") => {
  const resolvedPath = path || parentPath;

  if (!resolvedPath) {
    return "";
  }

  if (resolvedPath.startsWith("/")) {
    return resolvedPath;
  }

  return `/home/${resolvedPath}`;
};

const isPathActive = (pathname: string, path: string) => {
  if (!path) {
    return false;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
};

// Cabecera del menu
const Header = () => (
  <div className="app-sidebar-header">
    <div className="app-sidebar-brand">
      <div className="app-sidebar-brand-logo-wrap">
        <img
          src={logoQuito}
          alt="Logo Quito"
          className="app-sidebar-brand-logo"
        />
      </div>

      <div className="app-sidebar-brand-copy">
        <p className="app-sidebar-title app-sidebar-brand-acronym">SIGOC</p>
        <h2 className="app-sidebar-title app-sidebar-brand-name">
          <span className="block">Sistema de Gestión</span>
          <span className="block">Orden y Control</span>
        </h2>
      </div>
    </div>
  </div>
);

type ContentProps = {
  onNavigate?: () => void;
};

//Contenido del menu desplegable
//TODO: Utilizar las rutas que configuremos para presentar los menus disponibles??
const Content: FC<ContentProps> = ({ onNavigate }) => {
  const { user } = useUser();
  const { pathname } = useLocation();

  /**
   * PER-07 · los ítems ajenos se muestran ATENUADOS, NO OCULTOS.
   *
   * Hasta M-21 se filtraban, y eso contradice la regla: el usuario tiene que comprender
   * que la opción existe y no le corresponde. Un menú que cambia de tamaño según el
   * perfil hace pensar que la aplicación es distinta para cada quien, y quien busca
   * «Matriz Consolidada» sin encontrarla acaba preguntando por teléfono.
   *
   * Ver docs/FASE5-diseno-interfaz.md §3.2.
   */
  const puedeEntrar = (item: NavigationItem) =>
    (!item.requiredPermissions ||
      (user != null &&
        item.requiredPermissions.some((permiso) =>
          user.permisos.includes(permiso),
        ))) &&
    // Rol exigido además del permiso (Órdenes de servicio → DIRECTOR, igual que la ruta).
    (!item.requiredRoles ||
      (user != null && tieneRol(user.rolCodes, item.requiredRoles)));

  /**
   * Un grupo es útil cuando ALGO de dentro es alcanzable.
   *
   * SE MIRA A LOS HIJOS Y NO AL PROPIO GRUPO. La cabecera no es un destino —es el tirador
   * de un `<details>`— así que lo que decide si sirve es si hay algo dentro que abrir.
   * Con `allowedRoles` del grupo bastaría hoy, porque coincide con el de sus hijos, pero
   * el día que un grupo tenga hijos de roles distintos esa comprobación mentiría.
   *
   * HASTA HOY LA CABECERA NO COMPROBABA NADA. Los hijos sí se atenuaban, pero
   * «Administración» se pintaba a plena opacidad para cualquiera: un Director la veía
   * igual que un Administrador y solo al desplegarla descubría que las cinco opciones
   * estaban apagadas. Detectado el 2026-08-20 al entrar con Dirección y Operativos.
   */
  const grupoUtil = (item: NavigationItem) =>
    item.children ? item.children.some(puedeEntrar) : puedeEntrar(item);
  const menuItems = shellNavigationItems;

  return (
    <ul className="app-sidebar-menu app-sidebar-menu-list menu">
      {menuItems.map((item) => {
        const hasActiveChild = item.children?.some((subitem) =>
          isPathActive(
            pathname,
            resolveNavigationPath(subitem.path, item.path),
          ),
        );

        return (
          <li
            key={item.id}
            className="app-sidebar-group rounded-[1.35rem] border border-transparent bg-base-200 p-1.5"
          >
            {item.children ? (
              <details
                open={hasActiveChild || item.defaultOpen}
                className="app-sidebar-details"
              >
                  <summary
                    className={[
                      "app-sidebar-summary",
                      hasActiveChild ? "app-sidebar-summary-current" : "",
                      // Atenuado, pero SIN `pointer-events-none`: se sigue pudiendo
                      // desplegar. Ver que hay dentro y por que esta apagado es
                      // justamente lo que evita la llamada por telefono.
                      grupoUtil(item) ? "" : "opacity-40",
                    ].join(" ")}
                    aria-disabled={grupoUtil(item) ? undefined : "true"}
                    title={
                      grupoUtil(item)
                        ? undefined
                        : "Ninguna opción de este grupo corresponde a su perfil."
                    }
                  >
                  <span className="app-sidebar-summary-main">
                    <span className="app-sidebar-summary-leading">
                      <Iconos
                        nombre={item.icon}
                        estilo="text-current"
                      />
                    </span>
                    <span className="app-sidebar-summary-label">
                      {item.label}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="app-sidebar-summary-icon"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7.5 5.5L12 10L7.5 14.5"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </summary>
                {item.children.map((subitem) => (
                  <ul
                    key={subitem.id}
                    className="app-sidebar-sublist"
                  >
                    <li>
                      {puedeEntrar(subitem) ? (
                        <NavLink
                          to={subitem.path || item.path}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            [
                              "app-sidebar-link app-sidebar-subitem-link",
                              isActive
                                ? "menu-active app-sidebar-subitem-active"
                                : "",
                            ].join(" ")
                          }
                        >
                          <Iconos
                            nombre={subitem.icon}
                            estilo="text-current"
                          />
                          {subitem.label}
                        </NavLink>
                      ) : (
                        <span
                          className="app-sidebar-link app-sidebar-subitem-link pointer-events-none opacity-40"
                          aria-disabled="true"
                          title="Esta opción no corresponde a su perfil."
                        >
                          <Iconos
                            nombre={subitem.icon}
                            estilo="text-current"
                          />
                          {subitem.label}
                        </span>
                      )}
                    </li>
                  </ul>
                ))}
              </details>
            ) : puedeEntrar(item) ? (
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    "app-sidebar-link app-sidebar-root-link",
                    isActive ? "menu-active" : "",
                  ].join(" ")
                }
              >
                <Iconos
                  nombre={item.icon}
                  estilo="text-current"
                />
                {item.label}
              </NavLink>
            ) : (
              <span
                className="app-sidebar-link app-sidebar-root-link pointer-events-none opacity-40"
                aria-disabled="true"
                title="Esta opción no corresponde a su perfil."
              >
                <Iconos
                  nombre={item.icon}
                  estilo="text-current"
                />
                {item.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

// Pie del menu para evaluar si se alcanza a poner opciones de configuracion
const Footer = () => null;

export { Header, Content, Footer };
