/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Hook de identidad
 * Archivo: useUser.ts
 * Responsabilidad: Exponer la identidad y el rol activo a cualquier componente.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04
 */

import { useContext } from "react";
import { UserContext, type UserContextProps } from "../context/UserContext";

/**
 * Hook para acceder al usuario y su rol.
 * @throws {Error} Si se usa fuera de un UserProvider.
 */
export const useUser = (): UserContextProps => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser debe usarse dentro de UserProvider");
  return context;
};
