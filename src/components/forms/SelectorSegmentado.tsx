/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios
 * Archivo: SelectorSegmentado.tsx
 * Responsabilidad: Elegir un valor entre pocas opciones (2–4) con un control segmentado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * Alternativa al `<select>` cuando hay pocas opciones y conviene verlas todas de un vistazo
 * (p. ej. el tipo de contrato). SIN valor por defecto: si `valor` es "", ninguna va marcada,
 * para no invitar a dar por bueno un dato que decide RN-26. Solo clases del inventario
 * (`join`/`join-item`/`btn`). El error va con TEXTO, no solo color (regla 6), y las opciones
 * llevan `aria-invalid` para que el foco al primer inválido las alcance.
 */

import type { FC } from "react";

type OpcionSegmentada = { valor: string; nombre: string };

type SelectorSegmentadoProps = {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  opciones: OpcionSegmentada[];
  /** Valor elegido; "" = sin elegir (ninguna opción marcada). */
  valor: string;
  onCambiar: (valor: string) => void;
  ayuda?: string;
  error?: string;
};

const SelectorSegmentado: FC<SelectorSegmentadoProps> = ({
  id,
  etiqueta,
  obligatorio = false,
  opciones,
  valor,
  onCambiar,
  ayuda,
  error,
}) => {
  const idError = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <span className="label-text font-medium">
        {etiqueta}
        {obligatorio && (
          <span
            className="text-error ml-1"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </span>

      <div
        className="join"
        role="group"
        aria-label={etiqueta}
      >
        {opciones.map((opcion) => {
          const activa = valor === opcion.valor;
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={activa}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? idError : undefined}
              onClick={() => onCambiar(opcion.valor)}
              className={`join-item btn btn-sm ${activa ? "btn-primary" : "btn-ghost"}`}
            >
              {opcion.nombre}
            </button>
          );
        })}
      </div>

      {ayuda && !error && (
        <span className="text-xs text-base-content/70">{ayuda}</span>
      )}
      {error && (
        <span
          id={idError}
          role="alert"
          className="text-xs text-error"
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default SelectorSegmentado;
