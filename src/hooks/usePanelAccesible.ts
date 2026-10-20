/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Accesibilidad de ventanas superpuestas
 * Archivo: usePanelAccesible.ts
 * Responsabilidad: La mecánica de accesibilidad común a toda ventana superpuesta —modal o cajón—:
 *                  trampa de foco, Escape que cierra, devolución del foco al cerrar y bloqueo del
 *                  desplazamiento de fondo, con una PILA de capas para que solo responda la de arriba.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE EXTRAJO DEL MODAL CENTRADO PARA QUE EL DRAWER NO LA DUPLIQUE.
 *
 * `MensajeModal` (mensaje centrado; antes `MarcoModal`, retirado el 2026-10-16) y `DrawerLateral`
 * (cajón derecho) comparten exactamente el mismo comportamiento accesible; lo que cambia es la
 * POSICIÓN de la tarjeta, no cómo atrapa el foco ni cómo bloquea el fondo. Tener dos copias las
 * separaría al primer arreglo. Este hook es esa única copia.
 *
 * PILA DE CAPAS (2026-10-15, D7 del cajón estándar). Cada ventana escuchaba Escape en `document`
 * y `stopPropagation` no detiene a otro escucha del MISMO nodo: un Escape cerraba todas las capas
 * abiertas a la vez («Ver paradas» + «Registrar parada»). Ahora cada ventana abierta se apila y
 * solo la de ARRIBA atiende Escape, el tabulador y el velo (`esCapaSuperior`). El bloqueo del
 * desplazamiento también es de la pila: se pone con la primera capa y se quita con la última, así
 * el orden en que React limpia dos capas que se cierran juntas no deja la página bloqueada.
 *
 * UN CAJÓN A LA VEZ (D7). `DrawerLateral` se apila con `{ cajon: true }`; si al abrirse ya hay
 * otro cajón en la pila, avisa en desarrollo (`console.warn`). No lo impide: es una señal para quien
 * programa, porque el estándar pide reemplazar el cajón y volver a él, no apilar dos.
 *
 * `onCerrar` se lee por referencia: un llamador que lo pasa en línea no vuelve a suscribir el
 * efecto en cada render (lo que, además, sacaba a la capa de su sitio en la pila).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, type RefObject } from "react";

/** Lo que el navegador considera enfocable dentro de la ventana. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Las ventanas abiertas, de la más antigua a la de arriba. */
const capas: symbol[] = [];

/** Cuáles de esas capas son cajones laterales (para el aviso de «un cajón a la vez»). */
const cajones = new Set<symbol>();

type OpcionesPanel = {
  /** Es un `DrawerLateral`: abrir otro encima avisa en desarrollo. */
  cajon?: boolean;
};

/** Lo que había en el contenedor que desplaza antes de bloquearlo, mientras haya capas. */
let bloqueo: { scroller: HTMLElement; overflow: string; relleno: string } | null = null;

const bloquearFondo = () => {
  if (bloqueo) return;
  // La página de detrás deja de desplazarse. Se bloquea el contenedor que de verdad desplaza
  // (`.app-shell-main-content`), no el `body`, y se compensa el ancho de su barra para que el
  // contenido no salte al ocultarla.
  const scroller =
    document.querySelector<HTMLElement>(".app-shell-main-content") ??
    document.body;
  const anchoBarra = scroller.offsetWidth - scroller.clientWidth;
  bloqueo = {
    scroller,
    overflow: scroller.style.overflow,
    relleno: scroller.style.paddingRight,
  };
  scroller.style.overflow = "hidden";
  if (anchoBarra > 0) scroller.style.paddingRight = `${anchoBarra}px`;
};

const liberarFondo = () => {
  if (!bloqueo) return;
  bloqueo.scroller.style.overflow = bloqueo.overflow;
  bloqueo.scroller.style.paddingRight = bloqueo.relleno;
  bloqueo = null;
};

/**
 * Dota a la tarjeta que apunta `tarjetaRef` de la conducta de una ventana modal mientras `abierto`:
 *
 *  · Bloquea el desplazamiento del contenedor real (`.app-shell-main-content`, con respaldo al
 *    `body`) y compensa el ancho de su barra con `padding-right` para que nada salte.
 *  · Lleva el foco a la tarjeta al abrir, salvo que un hijo ya lo haya tomado (avisos con `autoFocus`).
 *  · Escape llama `onCerrar` (si lo hay), SOLO si es la capa de arriba.
 *  · El tabulador da la vuelta DENTRO de la tarjeta (no se escapa a los controles bajo el velo).
 *  · Al cerrar, devuelve el foco a quien lo tenía antes de abrir.
 *
 * Devuelve `esCapaSuperior`, para que el velo del llamador solo cierre si es el de arriba.
 */
export function usePanelAccesible(
  abierto: boolean,
  onCerrar: (() => void) | undefined,
  tarjetaRef: RefObject<HTMLElement | null>,
  { cajon = false }: OpcionesPanel = {},
): { esCapaSuperior: () => boolean } {
  /** Quién tenía el foco antes de abrir, para devolvérselo al cerrar. */
  const enfocadoAntes = useRef<Element | null>(null);
  const capa = useRef(Symbol("capa"));
  const refOnCerrar = useRef(onCerrar);
  useEffect(() => {
    refOnCerrar.current = onCerrar;
  }, [onCerrar]);

  const esCapaSuperior = useCallback(
    () => capas[capas.length - 1] === capa.current,
    [],
  );

  useEffect(() => {
    if (!abierto) return;

    const propia = capa.current;
    enfocadoAntes.current = document.activeElement;
    if (cajon) {
      if (import.meta.env.DEV && capas.some((otra) => cajones.has(otra))) {
        console.warn(
          "DrawerLateral: se abrió un segundo cajón sobre otro. El estándar pide uno a la vez: reemplace el cajón y vuelva a él al cerrar.",
        );
      }
      cajones.add(propia);
    }
    capas.push(propia);
    bloquearFondo();

    // El foco entra en la ventana, salvo que algo dentro ya lo haya tomado por su cuenta.
    const dentro = tarjetaRef.current?.contains(document.activeElement) ?? false;
    if (!dentro) tarjetaRef.current?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (capas[capas.length - 1] !== propia) return;

      if (evento.key === "Escape") {
        const cerrar = refOnCerrar.current;
        if (!cerrar) return;
        evento.stopPropagation();
        cerrar();
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
      const indice = capas.indexOf(propia);
      if (indice >= 0) capas.splice(indice, 1);
      cajones.delete(propia);
      if (capas.length === 0) liberarFondo();

      // El foco vuelve a donde estaba. Sin esto queda en el `<body>` y el siguiente tabulador
      // empieza desde el principio de la página. Si ese elemento ya no está (era de otra capa que
      // se cerró a la vez), no se toca.
      const previo = enfocadoAntes.current;
      if (previo instanceof HTMLElement && previo.isConnected) previo.focus();
    };
  }, [abierto, tarjetaRef, cajon]);

  return { esCapaSuperior };
}
