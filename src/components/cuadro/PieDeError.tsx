/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: PieDeError.tsx
 * Responsabilidad: El pie de error de un control, anunciado a los lectores de pantalla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-09
 *
 * VIVE EN SU PROPIO ARCHIVO para que `SelectorZonalPunto` y `SelectorTipoControl` —que se
 * separaron el 2026-09-09— lo compartan sin depender uno del otro (evita el import circular).
 * Recibe el mensaje ya resuelto: cuándo mostrarlo lo decide el formulario, no este pie.
 */

import type { FC } from "react";

export const PieDeError: FC<{ id: string; mensaje?: string }> = ({
  id,
  mensaje,
}) =>
  mensaje ? (
    <label className="label">
      <span
        id={id}
        className="label-text-alt text-error"
        role="alert"
      >
        {mensaje}
      </span>
    </label>
  ) : null;

export default PieDeError;
