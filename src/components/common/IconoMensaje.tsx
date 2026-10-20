/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: IconoMensaje.tsx
 * Responsabilidad: Los cuatro iconos de LÍNEA de los mensajes —triángulo, X en círculo, check en
 *                  círculo, i en círculo—, iguales en el modal, el aviso breve y el aviso en línea.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * POR QUÉ NO SALEN DE `Iconos.tsx` (M3 del plan «mensajes-estandar»). FontAwesome `free-solid` es
 * RELLENO y la especificación pide iconos de línea con trazo de 2 px. No hay librería nueva: son
 * cuatro trazados SVG escritos aquí, con `currentColor`, así que el color lo pone quien los contiene
 * (el círculo de la variante). Son decorativos (`aria-hidden`): el mensaje siempre lleva título y
 * texto (regla 6).
 */

import type { FC } from "react";

export type FamiliaMensaje = "advertencia" | "error" | "exito" | "info";

type IconoMensajeProps = {
  familia: FamiliaMensaje;
  /** Lado en píxeles; 28 por omisión (el del modal). */
  tamano?: number;
  className?: string;
};

/** Los trazos de cada familia, en una caja de 24 × 24. */
const TRAZOS: Record<FamiliaMensaje, string[]> = {
  advertencia: [
    "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  error: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m15 9-6 6", "m9 9 6 6"],
  exito: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m8.5 12.5 2.5 2.5 4.5-5"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 16v-4", "M12 8h.01"],
};

const IconoMensaje: FC<IconoMensajeProps> = ({ familia, tamano = 28, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={tamano}
    height={tamano}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    data-icono={familia}
    className={className}
  >
    {TRAZOS[familia].map((trazo) => (
      <path key={trazo} d={trazo} />
    ))}
  </svg>
);

export default IconoMensaje;
