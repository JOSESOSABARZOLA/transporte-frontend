/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Indicador de pasos
 * Archivo: Stepper.tsx
 * Responsabilidad: Mostrar en qué paso de un flujo va el usuario, con el paso hecho marcado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * EL ESTADO NO DEPENDE DEL COLOR (regla 6): cada paso lleva su número o un check, y SIEMPRE su
 * título en texto. El color acompaña —primario el actual, éxito el hecho, neutro el pendiente—,
 * no sustituye. Solo distintivos y utilidades del inventario (regla 1): sin la clase daisyUI
 * `steps`, que no está en el inventario.
 */

import type { FC } from "react";

import Iconos from "./Iconos.tsx";

export type PasoStepper = { numero: number; titulo: string };

type StepperProps = {
  pasos: PasoStepper[];
  /** Número del paso en curso. */
  actual: number;
  /** Números de los pasos ya completados (muestran un check). */
  completados: number[];
};

const Stepper: FC<StepperProps> = ({ pasos, actual, completados }) => {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {pasos.map((paso) => {
        const hecho = completados.includes(paso.numero);
        const esActual = paso.numero === actual;
        const clase = hecho
          ? "badge-success"
          : esActual
            ? "badge-primary"
            : "badge-ghost";

        return (
          <li
            key={paso.numero}
            className="flex items-center gap-2"
            aria-current={esActual ? "step" : undefined}
          >
            <span className={`badge badge-lg ${clase}`}>
              {hecho ? <Iconos nombre="check" /> : paso.numero}
            </span>
            <span
              className={`text-sm ${esActual ? "font-semibold" : "text-base-content/70"}`}
            >
              {paso.titulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
