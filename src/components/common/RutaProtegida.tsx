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
import type { RolDepartamental } from "../../config/env";
import { useUser } from "../../hooks/useUser";
import { urlDelPortal } from "../../services/sesion.service";

type RutaProtegidaProps = {
  rolesPermitidos: RolDepartamental[];
  children: ReactNode;
};

const RutaProtegida = ({ rolesPermitidos, children }: RutaProtegidaProps) => {
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

  // INTERSECCIÓN, no igualdad: basta con que UNO de sus roles esté permitido. Desde el
  // 2026-08-19 una persona puede tener varios y ve la unión de lo que cada uno abre.
  if (!user.rolCodes.some((rol) => rolesPermitidos.includes(rol))) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default RutaProtegida;
