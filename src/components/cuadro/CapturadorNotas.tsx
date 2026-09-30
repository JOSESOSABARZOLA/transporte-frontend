/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: CapturadorNotas.tsx
 * Responsabilidad: Capturar las observaciones del operativo como NOTAS independientes.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-09
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS OBSERVACIONES SON NOTAS, NO UN CAMPO DE TEXTO. Cada una se guarda por separado, con
 * su autor y su fecha (bitácora append-only). Aquí se ESCRIBEN las nuevas —se teclea una y
 * se agrega—, y en corrección se MUESTRAN las ya escritas en solo lectura: no se editan ni
 * se borran, quedan como constancia.
 *
 * Solo clases del inventario (regla 1): `input input-bordered`, `btn`, `border-base-300`,
 * `bg-base-200/40`, las mismas de `PanelAdicionalOperativo`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import type { RolDepartamental } from "../../config/env.ts";
import type { ObservacionOperativo } from "../../interfaces/Operativo.ts";
import { NOMBRE_DIRECCION } from "../../utils/personal.util.ts";

/** El departamento que escribió la nota, en palabras. Si no se reconoce, el código tal cual. */
const autorDe = (rol: string): string =>
  NOMBRE_DIRECCION[rol as RolDepartamental] ?? rol;

/** Fecha corta y legible de una nota: «09/09/2026 14:30». */
const fechaDe = (iso: string): string =>
  new Date(iso).toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const CapturadorNotas: FC<{
  /** Notas nuevas que se están capturando (aún no guardadas). Editable. */
  notasNuevas: string[];
  onCambio: (notas: string[]) => void;
  /** Notas ya escritas (bitácora). Solo lectura; solo en corrección. */
  notasExistentes?: ObservacionOperativo[];
  deshabilitado?: boolean;
}> = ({
  notasNuevas,
  onCambio,
  notasExistentes = [],
  deshabilitado = false,
}) => {
  const [borrador, setBorrador] = useState("");

  const agregar = (): void => {
    const texto = borrador.trim();
    if (!texto) return;
    onCambio([...notasNuevas, texto]);
    setBorrador("");
  };

  const quitar = (indice: number): void => {
    onCambio(notasNuevas.filter((_, i) => i !== indice));
  };

  return (
    <div className="form-control w-full">
      <label
        className="label"
        htmlFor="observacion-nueva"
      >
        <span className="label-text font-medium">Observaciones</span>
      </label>

      {/* Las ya escritas: bitácora en solo lectura, con quién y cuándo. */}
      {notasExistentes.length > 0 && (
        <ul className="mb-2 flex max-h-32 flex-col gap-1 overflow-y-auto">
          {notasExistentes.map((nota, indice) => (
            <li
              key={indice}
              className="rounded-md border border-base-300 bg-base-200/40 px-3 py-1"
            >
              <span className="text-sm">{nota.texto}</span>
              <span className="block text-xs text-base-content/70">
                {autorDe(nota.creadoPorRol)} · {fechaDe(nota.creadoEn)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Las nuevas por agregar: aún no guardadas, se pueden quitar. */}
      {notasNuevas.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {notasNuevas.map((texto, indice) => (
            <li
              key={indice}
              className="flex items-center gap-2 rounded-md border border-base-300 px-3 py-1"
            >
              <span className="min-w-0 flex-1 text-sm">{texto}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label={`Quitar la nota: ${texto}`}
                disabled={deshabilitado}
                onClick={() => quitar(indice)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          id="observacion-nueva"
          className="input input-bordered w-full min-w-0"
          placeholder="Escriba una nota y pulse Agregar"
          value={borrador}
          disabled={deshabilitado}
          onChange={(evento) => setBorrador(evento.target.value)}
          onKeyDown={(evento) => {
            // Enter agrega la nota sin enviar el formulario.
            if (evento.key === "Enter") {
              evento.preventDefault();
              agregar();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          disabled={deshabilitado || borrador.trim() === ""}
          onClick={agregar}
        >
          Agregar
        </button>
      </div>
    </div>
  );
};

export default CapturadorNotas;
