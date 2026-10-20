/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Botones
 * Archivo: BotonEnlace.tsx
 * Responsabilidad: Un enlace de navegación con el aspecto de `<Boton>` (misma variante y tamaño).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NAVEGAR NO ES ACCIONAR: «Ver la Jornada del Día» o «Ir a Mis operativos» llevan a otra ruta, así
 * que siguen siendo un `<Link>` (se abren en otra pestaña, el lector los anuncia como enlace). Lo
 * único que comparten con `<Boton>` es el aspecto, y lo toman de sus dos mapas: aquí no se escribe
 * ninguna clase de daisyUI propia.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";

import { clasesBoton, type TamanoBoton, type VarianteBoton } from "./Boton.tsx";
import Iconos, { type NombreIcono } from "./Iconos.tsx";

type BotonEnlaceProps = {
  to: string;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  icono?: NombreIcono;
  /** Dentro de una cabecera azul (el primario suma el borde claro). */
  enBarraOscura?: boolean;
  title?: string;
  /** Solo para el acomodo, nunca para el aspecto. */
  className?: string;
  children: ReactNode;
};

const BotonEnlace: FC<BotonEnlaceProps> = ({
  to,
  variante = "secundario",
  tamano = "md",
  icono,
  enBarraOscura = false,
  title,
  className,
  children,
}) => (
  <Link
    to={to}
    title={title}
    className={[clasesBoton(variante, tamano, enBarraOscura), className ?? ""]
      .filter(Boolean)
      .join(" ")}
  >
    {icono && <Iconos nombre={icono} />}
    {children}
  </Link>
);

export default BotonEnlace;
