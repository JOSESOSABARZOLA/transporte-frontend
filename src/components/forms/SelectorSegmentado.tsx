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

/**
 * `motivoDeshabilitado` (2026-10-19, compartir unidad): la opción se MUESTRA apagada con su motivo
 * en el `title` y no se puede elegir (`aria-disabled`, regla 17: nunca `disabled`, que pierde el
 * motivo). Sin él, la opción se comporta como siempre.
 */
type OpcionSegmentada = { valor: string; nombre: string; motivoDeshabilitado?: string | null };

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
  /**
   * Rótulo solo para lectores de pantalla (2026-10-08): el filtro «Activos | Inactivos | Todos» de
   * P-07 se entiende por sus opciones y no lleva rótulo visible; el grupo conserva su nombre.
   */
  etiquetaOculta?: boolean;
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
  etiquetaOculta = false,
}) => {
  const idError = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <span className={etiquetaOculta ? "sr-only" : "label-text"}>
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

      {/*
        UN GRUPO DE VERDAD (2026-10-15): contenedor con borde, opciones del mismo alto (`btn-sm`,
        sin borde propio), la activa rellena y las demás con paso del cursor. Antes cada opción era
        un `btn-ghost` suelto y el grupo no se leía como uno. Lo usan Flota, Formularios y Personal.
      */}
      <div
        className="join w-fit rounded-field border border-base-300 bg-base-100"
        role="group"
        aria-label={etiqueta}
      >
        {opciones.map((opcion) => {
          const activa = valor === opcion.valor;
          const apagada = Boolean(opcion.motivoDeshabilitado);
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={activa}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? idError : undefined}
              aria-disabled={apagada || undefined}
              title={opcion.motivoDeshabilitado ?? undefined}
              onClick={() => {
                if (!apagada) onCambiar(opcion.valor);
              }}
              // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
              className={`join-item btn btn-sm border-0 shadow-none ${
                activa ? "btn-primary" : "btn-ghost hover:bg-base-200"
              }${apagada ? " cursor-not-allowed text-app-disabled" : ""}`}
            >
              {opcion.nombre}
            </button>
          );
        })}
      </div>

      {ayuda && !error && (
        <span className="text-xs text-app-muted">{ayuda}</span>
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
