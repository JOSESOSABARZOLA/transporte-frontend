/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: DrawerLateral.tsx
 * Responsabilidad: El cajón derecho a toda la altura —velo, panel, cabecera y pie— con el
 *                  comportamiento accesible de una ventana modal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES EL HERMANO LATERAL DE `MarcoModal`. 2026-09-30.
 *
 * Comparte su accesibilidad —foco atrapado, Escape, devolución de foco, bloqueo del fondo— vía
 * `usePanelAccesible`, así que aquí no se reimplementa nada de eso. Lo único propio es la POSICIÓN:
 * un panel anclado a la derecha, a toda la altura, con un velo que lo cubre. El armazón del cajón
 * (velo + panel deslizante con utilidades) es el mismo patrón que `MainLayout` usa para la barra
 * lateral en móvil, así que no introduce clases nuevas (regla 1).
 *
 * EL CLIC EN EL VELO CIERRA, y enruta por `onCerrar` —igual que Escape y el aspa—. Quien monta el
 * cajón decide en `onCerrar` si hay que confirmar el descarte de lo capturado; el cajón no lo sabe.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useId, useRef, type FC, type ReactNode } from "react";
import { createPortal } from "react-dom";

import Iconos from "./Iconos.tsx";
import { usePanelAccesible } from "../../hooks/usePanelAccesible.ts";

type DrawerLateralProps = {
  abierto: boolean;
  /** Versalita de contexto sobre el título (p. ej. «Nuevo funcionario · paso 1 de 2»). */
  antetitulo?: string;
  /** Título del cajón; es el nombre accesible del diálogo (`aria-labelledby`). */
  titulo: string;
  /** Subtítulo opcional bajo el título (contexto secundario, p. ej. «formulario · horario»). */
  subtitulo?: string;
  /** Sin `onCerrar` no se pinta el aspa ni cierra con Escape/velo (p. ej. mientras se guarda). */
  onCerrar?: () => void;
  /** Pie de acción persistente, anclado al fondo con separador; el cuerpo se desplaza aparte. */
  pie?: ReactNode;
  /**
   * Ancho máximo del panel. Por omisión «2xl» (el de edición de P-01/P-02). «3xl» (~768px) lo usa
   * el VISOR del documento de una orden, que necesita más espacio para el PDF. 2026-10-01.
   */
  ancho?: "2xl" | "3xl";
  children: ReactNode;
};

/** Clase de ancho máximo del panel por variante (del inventario; «3xl» es la excepción del visor). */
const MAX_ANCHO: Record<NonNullable<DrawerLateralProps["ancho"]>, string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

const DrawerLateral: FC<DrawerLateralProps> = ({
  abierto,
  antetitulo,
  titulo,
  subtitulo,
  onCerrar,
  pie,
  ancho = "2xl",
  children,
}) => {
  const tarjeta = useRef<HTMLDivElement>(null);
  const idTitulo = useId();

  usePanelAccesible(abierto, onCerrar, tarjeta);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      {/*
        VELO. Es un `<button>` para ser operable con teclado y llevar nombre accesible; cerrar por
        aquí enruta por `onCerrar`, que quien monta el cajón decide si confirma.
      */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-slate-950/38"
      />

      <div
        ref={tarjeta}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        // `-1` la hace enfocable por código sin meterla en el recorrido del tabulador.
        tabIndex={-1}
        className={`absolute inset-y-0 right-0 flex w-full ${MAX_ANCHO[ancho]} flex-col border-l border-base-300 bg-base-100 shadow-[0_20px_45px_rgba(15,23,42,0.20)] focus:outline-none`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300 px-6 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            {antetitulo && (
              <p className="text-xs font-semibold uppercase text-base-content/70">
                {antetitulo}
              </p>
            )}
            <h2
              id={idTitulo}
              className="text-lg font-semibold"
            >
              {titulo}
            </h2>
            {subtitulo && (
              <p className="text-sm text-base-content/70">{subtitulo}</p>
            )}
          </div>

          {/* El aspa hace lo mismo que Escape y que «Cancelar»; solo si hay `onCerrar`. */}
          {onCerrar && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onCerrar}
              aria-label="Cerrar"
            >
              <Iconos nombre="cerrar" />
            </button>
          )}
        </div>

        {/*
          El cuerpo es lo único que se desplaza; la cabecera y el pie quedan fijos. Es una COLUMNA
          flex para que su contenido (p. ej. la lista del paso 1) pueda ocupar todo el alto hasta el
          pie con su propio scroll, en vez de quedarse corto.
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
          {children}
        </div>

        {pie && (
          <div className="shrink-0 border-t border-base-300 px-6 py-4">
            {pie}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default DrawerLateral;
