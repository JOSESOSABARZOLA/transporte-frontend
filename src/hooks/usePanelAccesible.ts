/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Accesibilidad de ventanas superpuestas
 * Archivo: usePanelAccesible.ts
 * Responsabilidad: La mecánica de accesibilidad común a toda ventana superpuesta —modal o cajón—:
 *                  trampa de foco, Escape que cierra, devolución del foco al cerrar y bloqueo del
 *                  desplazamiento de fondo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE EXTRAJO DE `MarcoModal` PARA QUE EL DRAWER NO LA DUPLIQUE.
 *
 * `MarcoModal` (modal centrado) y `DrawerLateral` (cajón derecho) comparten exactamente el mismo
 * comportamiento accesible; lo que cambia es la POSICIÓN de la tarjeta, no cómo atrapa el foco ni
 * cómo bloquea el fondo. Tener dos copias las separaría al primer arreglo. Este hook es esa única
 * copia; `MarcoModal` conserva su conducta al byte (lo fija `marcoModal.spec.tsx`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, type RefObject } from "react";

/** Lo que el navegador considera enfocable dentro de la ventana. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dota a la tarjeta que apunta `tarjetaRef` de la conducta de una ventana modal mientras `abierto`:
 *
 *  · Bloquea el desplazamiento del contenedor real (`.app-shell-main-content`, con respaldo al
 *    `body`) y compensa el ancho de su barra con `padding-right` para que nada salte.
 *  · Lleva el foco a la tarjeta al abrir, salvo que un hijo ya lo haya tomado (avisos con `autoFocus`).
 *  · Escape llama `onCerrar` (si lo hay), con `stopPropagation` para no disparar otros escuchas.
 *  · El tabulador da la vuelta DENTRO de la tarjeta (no se escapa a los controles bajo el velo).
 *  · Al cerrar, devuelve el foco a quien lo tenía antes de abrir.
 */
export function usePanelAccesible(
  abierto: boolean,
  onCerrar: (() => void) | undefined,
  tarjetaRef: RefObject<HTMLElement | null>,
): void {
  /** Quién tenía el foco antes de abrir, para devolvérselo al cerrar. */
  const enfocadoAntes = useRef<Element | null>(null);

  useEffect(() => {
    if (!abierto) return;

    enfocadoAntes.current = document.activeElement;

    // La página de detrás deja de desplazarse. Se bloquea el contenedor que de verdad desplaza
    // (`.app-shell-main-content`), no el `body`, y se compensa el ancho de su barra para que el
    // contenido no salte al ocultarla.
    const scroller =
      document.querySelector<HTMLElement>(".app-shell-main-content") ??
      document.body;
    const anchoBarra = scroller.offsetWidth - scroller.clientWidth;
    const desplazamiento = scroller.style.overflow;
    const rellenoPrevio = scroller.style.paddingRight;
    scroller.style.overflow = "hidden";
    if (anchoBarra > 0) scroller.style.paddingRight = `${anchoBarra}px`;

    // El foco entra en la ventana, salvo que algo dentro ya lo haya tomado por su cuenta.
    const dentro = tarjetaRef.current?.contains(document.activeElement) ?? false;
    if (!dentro) tarjetaRef.current?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && onCerrar) {
        evento.stopPropagation();
        onCerrar();
        return;
      }

      if (evento.key !== "Tab" || !tarjetaRef.current) return;

      const enfocables =
        tarjetaRef.current.querySelectorAll<HTMLElement>(ENFOCABLES);
      if (enfocables.length === 0) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alPulsar);

    return () => {
      document.removeEventListener("keydown", alPulsar);
      scroller.style.overflow = desplazamiento;
      scroller.style.paddingRight = rellenoPrevio;

      // El foco vuelve a donde estaba. Sin esto queda en el `<body>` y el siguiente tabulador
      // empieza desde el principio de la página.
      if (enfocadoAntes.current instanceof HTMLElement) {
        enfocadoAntes.current.focus();
      }
    };
  }, [abierto, onCerrar, tarjetaRef]);
}
