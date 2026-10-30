/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: CuadroFormulario.tsx
 * Responsabilidad: El cuadro con el color y el número de un formulario (tabla y cajón).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * El color llega del servidor por `style` (regla 3) y el número se pinta con el color de texto
 * legible sobre ese fondo (`colorDeTextoSobre`, nunca `text-white` fijo). Sin color, el borde
 * va PUNTEADO: el alta todavía no lo eligió. Es decorativo (`aria-hidden`): el número y el
 * nombre van escritos al lado.
 */

import type { FC } from "react";

import { colorDeTextoSobre } from "../../utils/banner.util.ts";

type CuadroFormularioProps = {
  numero: string | number;
  colorFondo: string;
  /** `md` (36 px, tabla y cajón) por omisión; `lg` (40 px, en negrita) junto al selector de Catálogos. */
  tamano?: "md" | "lg";
};

const CuadroFormulario: FC<CuadroFormularioProps> = ({ numero, colorFondo, tamano = "md" }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center rounded-md ${
      tamano === "lg" ? "h-10 w-10 text-base font-bold" : "h-9 w-9 text-sm font-semibold"
    } ${
      colorFondo ? "border border-base-300" : "border-2 border-dashed border-base-300 text-app-muted"
    }`}
    style={colorFondo ? { backgroundColor: colorFondo, color: colorDeTextoSobre(colorFondo) } : undefined}
  >
    {numero}
  </span>
);

export default CuadroFormulario;
