/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Observaciones como notas
 * Archivo: NotasDeFila.tsx
 * Responsabilidad: Las notas de una fila de la Jornada del Día o de la Matriz, con su navegación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA JORNADA Y LA MATRIZ PINTAN LAS NOTAS IGUAL QUE MIS OPERATIVOS (2026-10-19, plan
 * «notas-jornada-matriz»). La tabla provee `NavegacionNotas` —qué operativos tiene, cuál destella y
 * cómo llevar a una fila— y cada celda pinta `NotasObservacion` con las notas de su fila.
 *
 * Estas dos pantallas no tienen cajón de detalle: la nota «Comparte con X» solo lleva a la fila de
 * X cuando X está en la tabla; si no, la tarjeta no se pulsa y dice «No está en esta vista».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useContext, useMemo, type FC, type ReactNode } from "react";

import NotasObservacion from "../common/NotasObservacion.tsx";
import type { NotaOperativo } from "../../interfaces/Operativo.ts";
import { useDestelloDeFila } from "../../hooks/useDestelloDeFila.ts";
import { NavegacionNotas, type NavegacionDeNotas } from "../../hooks/useAnclaDeFila.ts";
import { notasDeFila } from "../../utils/notasDeTabla.util.ts";

/** Provee la navegación de las notas a una tabla que muestra los operativos `ids`. */
export const ProveedorNotas: FC<{ ids: number[]; children: ReactNode }> = ({ ids, children }) => {
  const { destacadoId, destacar } = useDestelloDeFila();
  const clave = ids.join(",");
  const valor = useMemo<NavegacionDeNotas>(() => {
    const visibles = new Set(clave ? clave.split(",").map(Number) : []);
    return { destacadoId, irA: destacar, esVisible: (id) => visibles.has(id) };
  }, [clave, destacadoId, destacar]);
  return <NavegacionNotas.Provider value={valor}>{children}</NavegacionNotas.Provider>;
};

/** Las notas de una fila, como tarjetas. */
const NotasDeFila: FC<{
  fila: { id: number; identificador: string; notas?: NotaOperativo[]; observaciones: string[] };
}> = ({ fila }) => {
  const { irA, esVisible } = useContext(NavegacionNotas);
  return (
    <NotasObservacion
      notas={notasDeFila(fila)}
      onIrA={irA}
      esVisible={esVisible}
      etiqueta={`Observaciones de ${fila.identificador}`}
    />
  );
};

export default NotasDeFila;
