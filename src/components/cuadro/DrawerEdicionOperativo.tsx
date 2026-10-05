/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: DrawerEdicionOperativo.tsx
 * Responsabilidad: Alojar la edición de un operativo (P-02) en el cajón lateral accesible.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE PANEL EN LÍNEA A CAJÓN LATERAL (2026-09-30). Antes la edición era un bloque de tarjeta que
 * aparecía encima de la tabla y la empujaba hacia abajo, sin foco atrapado ni cierre por Escape.
 * Ahora vive en `DrawerLateral` (el mismo primitivo del alta de Personal): velo, foco atrapado,
 * Escape, retorno de foco al botón «Editar» y pie fijo, sin duplicar nada de esa mecánica.
 *
 * ES UN ENVOLTORIO DELGADO: no conoce el formulario ni el servicio. La página compone el cuerpo
 * (el `PanelEdicionOperativo` sin marco) y el pie (Cancelar / Guardar cambios), y este solo los
 * coloca en el cajón. El contrato con el backend no lo toca nadie de aquí.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import DrawerLateral from "../common/DrawerLateral.tsx";

type DrawerEdicionOperativoProps = {
  abierto: boolean;
  /** Título del cajón, p. ej. «Editar operativo OCF-001-…». Es el nombre accesible del diálogo. */
  titulo: string;
  /** Subtítulo con el contexto del operativo: «formulario · horario». */
  subtitulo?: string;
  onCerrar: () => void;
  /** Pie fijo con las acciones (Cancelar / Guardar cambios). */
  pie: ReactNode;
  children: ReactNode;
};

const DrawerEdicionOperativo: FC<DrawerEdicionOperativoProps> = ({
  abierto,
  titulo,
  subtitulo,
  onCerrar,
  pie,
  children,
}) => (
  <DrawerLateral
    abierto={abierto}
    antetitulo="Mis operativos"
    titulo={titulo}
    subtitulo={subtitulo}
    onCerrar={onCerrar}
    pie={pie}
  >
    {children}
  </DrawerLateral>
);

export default DrawerEdicionOperativo;
