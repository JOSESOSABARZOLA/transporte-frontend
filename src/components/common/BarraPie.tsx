/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral y formulario de operativo
 * Archivo: BarraPie.tsx
 * Responsabilidad: La barra azul del pie —estado a la izquierda, acciones a la derecha— que comparten
 *                  el cajón estándar y el formulario del registro de operativo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA BARRA PARA LOS DOS PIES (plan «registro-operativo-rediseno», R7).
 *
 * El pie del cajón (`DrawerLateral`) y el del alta de P-01 decían lo mismo con piezas distintas:
 * el cajón con su barra azul y sus tonos, el registro con un resumen suelto junto al botón. Desde
 * hoy los dos pintan ESTA barra: [extraPie · estado] ··· [acciones].
 *
 *   · El estado va en `role="status"` y nunca solo por color (regla 6): lleva su texto y, el error
 *     y el listo, su icono. Mientras se guarda dice «Guardando…» con su indicador.
 *   · La barra provee `BarraOscuraContexto`: los `Boton` de dentro toman solos su aspecto sobre el
 *     azul (Cancelar blanco, el primario con borde blanco, el apagado sin opacidad).
 *   · Las ACCIONES las pone quien la usa (`children`): el cajón sus Cancelar/Guardar o Cerrar/Listo;
 *     el registro sus Limpiar/Registrar.
 *
 * TONO CLARO (`tono="claro"`, 2026-10-16, ajustes visuales del registro). El pie de la PÁGINA de
 * registro deja el azul: fondo blanco con un filete arriba, los estados en los colores de los
 * mensajes (`--app-msg-*`: gris lo que falta, rojo tras intentar, verde listo) y los botones con su
 * aspecto normal (sin `BarraOscuraContexto`, sin borde blanco). El cajón sigue en azul.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import { BarraOscuraContexto } from "./barraOscura.ts";
import Iconos from "./Iconos.tsx";

export type TonoEstadoPie = "sinCambios" | "pendiente" | "cambios" | "error" | "listo";

/**
 * Lo que dice el pie a la izquierda: «Sin cambios pendientes», «N campos por completar»,
 * «Cambios sin guardar», «Falta: …», «Listo para guardar».
 */
export type EstadoPie = { tono: TonoEstadoPie; texto: string };

/** Sobre el azul de la barra (`text-app-muted` ahí es el claro suave de `app-cajon-barra`). */
const CLASE_TONO: Record<TonoEstadoPie, string> = {
  sinCambios: "text-app-muted",
  pendiente: "text-app-muted",
  cambios: "text-[var(--app-cajon-estado-cambios)]",
  error: "text-[var(--app-cajon-estado-error)]",
  listo: "font-semibold text-[var(--app-cajon-estado-listo)]",
};

/** Sobre blanco: los colores de los mensajes estándar (regla 19). */
const CLASE_TONO_CLARO: Record<TonoEstadoPie, string> = {
  sinCambios: "text-app-muted",
  pendiente: "text-app-muted",
  cambios: "text-[var(--app-msg-advertencia-fg)]",
  error: "text-[var(--app-msg-error-fg)]",
  listo: "font-semibold text-[var(--app-msg-exito-fg)]",
};

/** `azul` (cajón, por omisión) o `claro` (pie de la página de registro). */
export type TonoBarraPie = "azul" | "claro";

type BarraPieProps = {
  /** Azul corporativo (por omisión) o blanco con filete superior. */
  tono?: TonoBarraPie;
  estadoPie?: EstadoPie | null;
  /** Se está guardando: el estado dice «Guardando…» con su indicador. */
  guardando?: boolean;
  /** Antes del estado, a la izquierda: «Agregar otro después». */
  extraPie?: ReactNode;
  /** Clases de la barra (relleno, esquinas): cada sitio pone las suyas. */
  className?: string;
  /** Las acciones, a la derecha. */
  children: ReactNode;
};

const BarraPie: FC<BarraPieProps> = ({
  tono = "azul",
  estadoPie,
  guardando = false,
  extraPie,
  className = "",
  children,
}) => {
  const claro = tono === "claro";
  const clasesTono = claro ? CLASE_TONO_CLARO : CLASE_TONO;
  const estado = guardando ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-app-muted">
      <span className="loading loading-spinner loading-sm" aria-hidden="true" />
      Guardando…
    </span>
  ) : (
    estadoPie && (
      <span
        className={`inline-flex items-center gap-1.5 text-sm ${clasesTono[estadoPie.tono]}`}
      >
        {estadoPie.tono === "error" && <Iconos nombre="alerta" />}
        {estadoPie.tono === "listo" && <Iconos nombre="check" />}
        {estadoPie.texto}
      </span>
    )
  );

  return (
    <BarraOscuraContexto.Provider value={!claro}>
      <div
        className={`${claro ? "border-t border-base-200 bg-base-100" : "app-cajon-barra"} ${className}`}
        data-tono={tono}
      >
        <div className="flex flex-wrap items-center gap-3">
          {extraPie}
          <div role="status" aria-live="polite">
            {estado}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">{children}</div>
        </div>
      </div>
    </BarraOscuraContexto.Provider>
  );
};

export default BarraPie;
