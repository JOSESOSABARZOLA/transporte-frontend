/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Guard de rutas por rol
 * Archivo: RutaProtegida.tsx
 * Responsabilidad: Bloquear el acceso a una ruta si no hay sesión o el rol no la admite.
 * Desarrollador: Doris Villavicencio · sesión real por Jose Sosa
 * Fecha: 2026-06-25 · 2026-08-18
 *
 * DOS DECISIONES DISTINTAS, Y ANTES ERAN UNA SOLA:
 *
 *   · **No hay sesión** → al portal institucional. Es salir de la aplicación.
 *   · **Hay sesión pero el rol no admite esta ruta** → a `/home`. Es un desvío interno,
 *     y era el único caso que este componente conocía.
 *
 * Mientras la sesión se está resolviendo NO se decide nada. Sin esa espera, cada
 * recarga mandaría al portal a quien sí tenía sesión, porque el perfil todavía no ha
 * llegado del servidor: «aún no sé quién eres» no es «no eres nadie».
 *
 * NINGUNA DE ESTAS COMPROBACIONES SUSTITUYE AL SERVIDOR, que autoriza de nuevo cada
 * petición con la cadena de cuatro guardas. Aquí se evita mostrar lo que no toca.
 */

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import Loading from "./Loading";
import { useUser } from "../../hooks/useUser";
import { tienePermiso } from "../../hooks/usePermiso";
import { urlDelPortal } from "../../services/sesion.service";

type RutaProtegidaProps = {
  /** Permisos que abren la ruta. Basta tener UNO (semántica OR). */
  permisosPermitidos: string[];
  children: ReactNode;
};

const RutaProtegida = ({ permisosPermitidos, children }: RutaProtegidaProps) => {
  const { user, estado } = useUser();

  if (estado === "resolviendo") {
    return <Loading />;
  }

  if (estado === "sinSesion" || !user) {
    // `replace` y no un componente de navegación: se abandona la aplicación, y el
    // botón de volver no debe reentrar a una ruta privada sin sesión.
    window.location.replace(urlDelPortal());
    return <Loading />;
  }

  // POR PERMISO (RBAC), no por rol: basta con tener UNO de los que abren la ruta. Así un
  // rol nuevo con el permiso otorgado entra sin tocar el frontend. El servidor reautoriza.
  if (!tienePermiso(user.permisos, permisosPermitidos)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default RutaProtegida;
