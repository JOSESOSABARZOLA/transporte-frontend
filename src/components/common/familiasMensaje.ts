/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: familiasMensaje.ts
 * Responsabilidad: Las clases de color de cada familia de mensaje —fondo suave, color del icono y
 *                  borde— en un solo mapa, para que el modal, el aviso breve y el aviso en línea
 *                  hablen el mismo lenguaje visual.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * Los colores son los tokens `--app-msg-*` de `foundation/design-tokens.css` (M1): aquí no hay
 * ningún hexadecimal. Las cadenas van escritas enteras para que Tailwind las encuentre al compilar.
 */

import type { FamiliaMensaje } from "./IconoMensaje.tsx";

type ClasesFamilia = {
  /** El círculo del icono y la caja del aviso en línea. */
  fondo: string;
  /** El icono. */
  color: string;
  /** El borde izquierdo de 4 px del aviso breve. */
  bordeIzquierdo: string;
  /** El borde fino del aviso en línea. */
  borde: string;
};

export const CLASES_FAMILIA: Record<FamiliaMensaje, ClasesFamilia> = {
  advertencia: {
    fondo: "bg-[var(--app-msg-advertencia-bg)]",
    color: "text-[var(--app-msg-advertencia-fg)]",
    bordeIzquierdo: "border-l-[color:var(--app-msg-advertencia-fg)]",
    borde: "border-[color:color-mix(in_srgb,var(--app-msg-advertencia-fg)_35%,transparent)]",
  },
  error: {
    fondo: "bg-[var(--app-msg-error-bg)]",
    color: "text-[var(--app-msg-error-fg)]",
    bordeIzquierdo: "border-l-[color:var(--app-msg-error-fg)]",
    borde: "border-[color:color-mix(in_srgb,var(--app-msg-error-fg)_35%,transparent)]",
  },
  exito: {
    fondo: "bg-[var(--app-msg-exito-bg)]",
    color: "text-[var(--app-msg-exito-fg)]",
    bordeIzquierdo: "border-l-[color:var(--app-msg-exito-fg)]",
    borde: "border-[color:color-mix(in_srgb,var(--app-msg-exito-fg)_35%,transparent)]",
  },
  info: {
    fondo: "bg-[var(--app-msg-info-bg)]",
    color: "text-[var(--app-msg-info-fg)]",
    bordeIzquierdo: "border-l-[color:var(--app-msg-info-fg)]",
    borde: "border-[color:color-mix(in_srgb,var(--app-msg-info-fg)_35%,transparent)]",
  },
};
