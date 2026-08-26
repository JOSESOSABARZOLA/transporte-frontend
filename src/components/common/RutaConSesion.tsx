/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Guard de sesión
 * Archivo: RutaConSesion.tsx
 * Responsabilidad: Impedir que el marco de la aplicación se pinte sin sesión.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-18
 *
 * POR QUÉ NO BASTABA `RutaProtegida`. Aquella protege cada PANTALLA, y se declara
 * dentro del marco. El marco —barra lateral, barra superior, menú de perfil— se pintaba
 * antes y sin comprobar nada: quien llegara a `/home` sin sesión veía la estructura
 * completa del módulo, con el nombre de las nueve pantallas y de las áreas que las
 * poseen, aunque no pudiera abrir ninguna.
 *
 * **En un sistema que existe porque el cuadro se filtraba, la lista de lo que hay
 * también es información.** Detectado el 2026-08-18, al preguntar por qué `/` dejaba
 * entrar sin credenciales.
 *
 * NO COMPRUEBA EL ROL, a propósito: eso es de cada pantalla y lo sigue haciendo
 * `RutaProtegida`. Aquí solo se responde a «¿hay sesión?».
 */

import type { ReactNode } from "react";

import Loading from "./Loading";
import { useUser } from "../../hooks/useUser";
import { urlDelPortal } from "../../services/sesion.service";

const RutaConSesion = ({ children }: { children: ReactNode }) => {
  const { user, estado } = useUser();

  // «Todavía no sé quién eres» no es «no eres nadie». Sin esta espera, cada recarga
  // expulsaría al portal a quien sí tenía sesión.
  if (estado === "resolviendo") return <Loading />;

  if (estado === "sinSesion" || !user) {
    window.location.replace(urlDelPortal());
    return <Loading />;
  }

  return <>{children}</>;
};

export default RutaConSesion;
