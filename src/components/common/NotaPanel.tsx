/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Plantilla visual
 * Archivo: NotaPanel.tsx
 * Responsabilidad: La nota de ayuda al pie de un panel: icono de información y texto gris pequeño.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * PLANTILLA VISUAL (2026-10-24): las ayudas que ya existían arriba de las tablas (Roles, Cuentas,
 * Ventanas, Jornadas) o fuera del panel (Mis operativos) van todas aquí, al pie, con el mismo
 * aspecto. El icono acompaña; el texto lo dice (regla 6).
 */

import type { FC, ReactNode } from "react";

import Iconos from "./Iconos.tsx";

const NotaPanel: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="flex items-start gap-2 text-xs text-app-muted" data-nota-panel>
    <span aria-hidden="true">
      <Iconos nombre="informacion" />
    </span>
    <span className="min-w-0">{children}</span>
  </p>
);

export default NotaPanel;
