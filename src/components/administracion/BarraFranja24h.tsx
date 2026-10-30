/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: BarraFranja24h.tsx
 * Responsabilidad: Pintar en una barra de 00H00 a 24H00 la franja en que un rol puede cargar y
 *                  la marca de «ahora».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * Solo clases del inventario (regla 1): la posición y el ancho de cada tramo, y el rayado de
 * «Sin restricción», van en `style`, que no es una clase. No depende del color (regla 6): el
 * `aria-label` dice la franja y la hora con palabras, y la celda de al lado repite el estado.
 *
 * AJUSTES (2026-10-24):
 *   · la pista es `bg-base-300`: con `bg-base-200` desaparecía en las filas sombreadas;
 *   · «Sin restricción» se pinta LLENA con un rayado gris claro y el tooltip «Todo el día»;
 *   · las etiquetas 00H…24H se CENTRAN sobre su hora (0, 25, 50, 75 y 100 %), con una rayita en
 *     la pista; el `px-3` del contenedor deja sitio a la primera y a la última.
 */

import type { FC } from "react";

import Tooltip from "../common/Tooltip.tsx";

const MINUTOS_POR_DIA = 24 * 60;
const MARCAS = [
  { texto: "00H", en: 0 },
  { texto: "06H", en: 25 },
  { texto: "12H", en: 50 },
  { texto: "18H", en: 75 },
  { texto: "24H", en: 100 },
];

/** El rayado gris claro de «Sin restricción», con los tokens del tema. */
const RAYADO =
  "repeating-linear-gradient(135deg, var(--color-base-300) 0 4px, var(--color-base-100) 4px 8px)";

const porcentaje = (minutos: number): string =>
  `${(minutos / MINUTOS_POR_DIA) * 100}%`;

type BarraFranja24hProps = {
  /** Tramos permitidos, en minutos [inicio, fin). */
  franjas: [number, number][];
  /** Sin restricción: la barra va llena y rayada. */
  todoElDia?: boolean;
  /** Minutos del día en la zona de la ventana. */
  ahora: number;
  /** La franja y la hora en palabras, para el lector de pantalla. */
  descripcion: string;
};

const BarraFranja24h: FC<BarraFranja24hProps> = ({
  franjas,
  todoElDia = false,
  ahora,
  descripcion,
}) => {
  const barra = (
    <div
      className="flex w-full flex-col gap-1 px-3"
      style={{ minWidth: "10rem" }}
      role="img"
      aria-label={descripcion}
      tabIndex={todoElDia ? 0 : undefined}
    >
      <div
        className="relative h-2 rounded-full bg-base-300"
        style={todoElDia ? { backgroundImage: RAYADO } : undefined}
        data-todo-el-dia={todoElDia || undefined}
      >
        {!todoElDia &&
          franjas.map(([inicio, fin]) => (
            <span
              key={inicio}
              className="absolute inset-y-0 rounded-full bg-primary"
              style={{
                left: porcentaje(inicio),
                width: porcentaje(fin - inicio),
                opacity: 0.45,
              }}
            />
          ))}
        {MARCAS.slice(1, -1).map((marca) => (
          <span
            key={marca.texto}
            className="absolute inset-y-0 bg-base-100"
            style={{ left: `${marca.en}%`, width: "1px" }}
          />
        ))}
        <span
          className="absolute w-0.5 bg-error"
          style={{
            left: porcentaje(ahora),
            top: "-0.25rem",
            bottom: "-0.25rem",
          }}
        />
      </div>
      <div className="relative h-4 text-xs text-app-muted" aria-hidden="true">
        {MARCAS.map((marca) => (
          <span
            key={marca.texto}
            className="absolute"
            style={{ left: `${marca.en}%`, transform: "translateX(-50%)" }}
            data-marca={marca.en}
          >
            {marca.texto}
          </span>
        ))}
      </div>
    </div>
  );

  return todoElDia ? <Tooltip texto="Todo el día" bloque>{barra}</Tooltip> : barra;
};

export default BarraFranja24h;
