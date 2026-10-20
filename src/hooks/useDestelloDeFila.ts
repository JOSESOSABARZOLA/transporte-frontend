/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Observaciones como notas
 * Archivo: useDestelloDeFila.ts
 * Responsabilidad: Llevar la vista a la fila de un operativo y hacerla destellar un momento.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA NOTA «COMPARTE CON X» LLEVA A SU FILA (2026-10-19, plan «notas-jornada-matriz», J5). Igual en
 * las cuatro tablas —Registro, Mis operativos, Jornada del Día y Matriz—: la fila del operativo
 * lleva `data-operativo-id`; al destacarla, la vista se centra en ella (`scrollIntoView`, sin
 * animación si el usuario lo pide) y se pinta con `app-fila-destello` 1,5 s, un amarillo que se
 * desvanece. Destacar la misma fila otra vez vuelve a disparar el destello.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";

/** Lo que dura el destello: el de la animación de `app-fila-destello`. */
export const MS_DESTELLO = 1500;

/** El atributo que marca la fila de un operativo, para encontrarla. */
export const ATRIBUTO_FILA = "data-operativo-id";

const prefiereSinMovimiento = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useDestelloDeFila = () => {
  const [destacado, setDestacado] = useState<{ id: number; vez: number } | null>(null);

  useEffect(() => {
    if (destacado === null) return undefined;
    const fila = document.querySelector<HTMLElement>(`[${ATRIBUTO_FILA}="${destacado.id}"]`);
    fila?.scrollIntoView?.({
      block: "center",
      behavior: prefiereSinMovimiento() ? "auto" : "smooth",
    });
    const apagar = window.setTimeout(() => setDestacado(null), MS_DESTELLO);
    return () => window.clearTimeout(apagar);
  }, [destacado]);

  /** Lleva la vista a la fila del operativo y la hace destellar. */
  const destacar = useCallback((id: number) => {
    setDestacado((actual) => ({ id, vez: (actual?.vez ?? 0) + 1 }));
  }, []);

  return { destacadoId: destacado?.id ?? null, destacar };
};
