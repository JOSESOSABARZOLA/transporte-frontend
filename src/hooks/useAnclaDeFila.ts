/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Observaciones como notas
 * Archivo: useAnclaDeFila.ts
 * Responsabilidad: La navegación de las notas en la Jornada y la Matriz, y el ancla de cada fila.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * La tabla provee `NavegacionNotas` (`ProveedorNotas`, en `components/cuadro/NotasDeFila.tsx`):
 * qué operativos muestra, cuál destella y cómo llevar a una fila. Cada fila lee aquí su ancla.
 */

import { createContext, useContext } from "react";

import { ATRIBUTO_FILA } from "./useDestelloDeFila.ts";

export type NavegacionDeNotas = {
  destacadoId: number | null;
  irA: (operativoId: number) => void;
  esVisible: (operativoId: number) => boolean;
};

export const NavegacionNotas = createContext<NavegacionDeNotas>({
  destacadoId: null,
  irA: () => undefined,
  esVisible: () => false,
});

/**
 * Los atributos de la fila de un operativo: su ancla (`data-operativo-id`) y la clase de destello
 * si es la pedida. Se ponen en la PRIMERA fila del operativo.
 */
export const useAnclaDeFila = () => {
  const { destacadoId } = useContext(NavegacionNotas);
  return (id: number) => ({
    ancla: { [ATRIBUTO_FILA]: id } as Record<string, number>,
    destello: destacadoId === id ? "app-fila-destello " : "",
  });
};
