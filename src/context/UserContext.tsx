/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Contexto de usuario
 * Archivo: UserContext.tsx
 * Responsabilidad: Declarar el contexto de identidad y su contrato.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04 · sesión real el 2026-08-18
 */

import { createContext } from "react";

import type { User } from "../interfaces/User";
import type { PerfilSesion } from "../services/sesion.service";

/** Fase en que se encuentra la resolución de la sesión al arrancar la aplicación. */
export type EstadoSesion = "resolviendo" | "conSesion" | "sinSesion";

export interface UserContextProps {
  user: User | null;
  /**
   * Establece la sesión recién canjeada, moviendo `user` y `estado` **a la vez**.
   *
   * SUSTITUYE AL `setUser` CRUDO QUE HABÍA AQUÍ, y no es una cuestión de estilo. Aquél
   * cambiaba `user` y dejaba `estado` como estuviera, de modo que los dos podían
   * contradecirse — y se contradecían justo en el caso que importa.
   *
   * Al llegar del portal la aplicación arranca en `/auth/callback` **sin cookie**, así
   * que el arranque fijaba `estado = "sinSesion"`. El canje llamaba luego a
   * `setUser(perfil)` y `estado` se quedaba atrás; `RutaConSesion`, que pregunta por
   * `estado`, devolvía al usuario al portal. Había que pulsar el rol **dos veces**: la
   * segunda entraba porque al arrancar ya existía la cookie que dejó la primera.
   *
   * Recibe el perfil del servidor y no un `User` armado fuera: construirlo era trabajo
   * duplicado en la página de callback, y una segunda copia es una segunda ocasión de
   * que las dos difieran.
   */
  establecerSesion: (perfil: PerfilSesion) => void;
  /**
   * Mientras vale `resolviendo` NO se debe decidir nada sobre el usuario.
   *
   * Es la distinción que evita el fallo más molesto de este patrón: sin ella, «todavía
   * no sé quién eres» y «no eres nadie» se confunden, y la aplicación manda al portal a
   * quien sí tenía sesión, en cada recarga.
   */
  estado: EstadoSesion;
  /** Cierra la sesión del módulo y devuelve al portal institucional. */
  cerrarSesion: () => Promise<void>;
}

/** Contexto global de identidad. El provider vive en providers/UserProvider.tsx. */
export const UserContext = createContext<UserContextProps | undefined>(
  undefined,
);
