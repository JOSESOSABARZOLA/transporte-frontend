/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: CampoHora24.tsx
 * Responsabilidad: Escribir una hora en el formato de 24 h del sistema (HH:MM) y verla como la lee
 *                  el cuadro (16H30).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * NO ES `type="time"`. El control del navegador cambia según el sistema operativo y el idioma:
 * puede mostrar «04:30 p. m.» a un administrador y «16:30» a otro. Aquí siempre se escribe en
 * 24 h; al teclear «1630» se ponen solos los dos puntos y al lado se ve «16H30». La validación de
 * 00:00 a 23:59 la hace quien lo usa (`motivoDeRechazo`); el valor que viaja sigue siendo HH:MM.
 */

import type { FC } from "react";

import { comoHoraInstitucional } from "../../utils/mensajeVentana.util.ts";
import { comoHoraTecleada } from "../../utils/parametro.util.ts";

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

type CampoHora24Props = {
  id: string;
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  error: boolean;
  deshabilitado: boolean;
  describedBy: string;
};

const CampoHora24: FC<CampoHora24Props> = ({
  id,
  etiqueta,
  valor,
  onCambiar,
  error,
  deshabilitado,
  describedBy,
}) => (
  <div className="flex items-center gap-2">
    <input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder="HH:MM"
      aria-label={etiqueta}
      aria-describedby={describedBy}
      aria-invalid={error}
      disabled={deshabilitado}
      className={`input input-bordered input-sm w-24 font-mono ${error ? "input-error" : ""}`}
      value={valor}
      onChange={(evento) => onCambiar(comoHoraTecleada(evento.target.value))}
    />
    {PATRON_HORA.test(valor) && (
      <span
        className="whitespace-nowrap text-xs text-app-muted"
        aria-hidden="true"
      >
        {comoHoraInstitucional(valor)}
      </span>
    )}
  </div>
);

export default CampoHora24;
