/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Paneles flotantes
 * Archivo: usePanelFlotante.ts
 * Responsabilidad: Posicionar un panel flotante (lista o ayuda) bajo su disparador y cerrarlo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL MISMO MECANISMO QUE `SubMenuDropdown`, PARA LO QUE SE ABRE DESDE UN CAMPO (2026-10-07).
 *
 * El panel se monta en un PORTAL con posición fija: así no lo recorta el cajón con desplazamiento ni
 * empuja los campos de abajo, y se dibuja SIEMPRE BAJO el disparador —nunca encima de su propia
 * etiqueta— salvo que abajo no quepa ni lo mínimo. Su alto se limita al espacio disponible con
 * desplazamiento interno. Se cierra con Esc, al tocar o hacer clic fuera, al desplazar (es fijo y no
 * seguiría al campo) y al redimensionar. Sin clases nuevas: la posición va en `style`, como en
 * `SubMenuDropdown`, porque depende de dónde está el campo en ese momento.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useLayoutEffect, type CSSProperties, type RefObject } from "react";

const MARGEN = 8;
const SEPARACION = 4;
/** Lo mínimo que tiene que caber abajo para no abrir hacia arriba. */
const ALTO_MINIMO = 120;

/** Antes de medir, el panel nace fuera de la vista (no parpadea en la esquina). */
const ESTILO_INICIAL: CSSProperties = {
  position: "fixed",
  top: -9999,
  left: 0,
  zIndex: 9999,
  overflowY: "auto",
};

export const usePanelFlotante = (
  abierto: boolean,
  disparador: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  onCerrar: () => void,
  opciones: { anchoDelDisparador?: boolean; anchoMinimo?: number } = {},
): CSSProperties => {
  const { anchoDelDisparador = false, anchoMinimo } = opciones;

  // La posición se escribe en el propio elemento, sin pasar por el estado: depende de dónde está el
  // campo en este instante y no debe provocar otro render.
  useLayoutEffect(() => {
    if (!abierto) return;
    const elemento = disparador.current;
    const contenido = panel.current;
    if (!elemento || !contenido) return;
    const r = elemento.getBoundingClientRect();
    const altoContenido = contenido.scrollHeight;
    const espacioAbajo = window.innerHeight - r.bottom - MARGEN - SEPARACION;
    const espacioArriba = r.top - MARGEN - SEPARACION;
    const abajo =
      espacioAbajo >= Math.min(altoContenido, ALTO_MINIMO) || espacioAbajo >= espacioArriba;
    const maxHeight = Math.max(ALTO_MINIMO, abajo ? espacioAbajo : espacioArriba);
    const alto = Math.min(altoContenido, maxHeight);
    // El ancho que ocupará el panel, para que no se salga por la derecha.
    const ancho = Math.max(
      anchoDelDisparador ? r.width : contenido.offsetWidth,
      anchoMinimo ?? 0,
    );
    const left = Math.max(MARGEN, Math.min(r.left, window.innerWidth - MARGEN - ancho));
    const top = abajo ? r.bottom + SEPARACION : Math.max(MARGEN, r.top - alto - SEPARACION);
    Object.assign(contenido.style, {
      top: `${top}px`,
      left: `${left}px`,
      width: anchoDelDisparador ? `${r.width}px` : "",
      // Un ancho mínimo propio (2026-10-07): la lista no hereda el ancho de un campo angosto.
      minWidth: anchoMinimo ? `${anchoMinimo}px` : "",
      maxWidth: `${window.innerWidth - 2 * MARGEN}px`,
      maxHeight: `${maxHeight}px`,
    });
  }, [abierto, disparador, panel, anchoDelDisparador, anchoMinimo]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: Event) => {
      const objetivo = evento.target as Node;
      if (disparador.current?.contains(objetivo) || panel.current?.contains(objetivo)) return;
      onCerrar();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    // Desplazar dentro del panel (su lista larga) no lo cierra; desplazar la página, sí.
    const desplazar = (evento: Event) => {
      if (panel.current?.contains(evento.target as Node)) return;
      onCerrar();
    };
    const enCapturaYPasivo = { capture: true, passive: true } as const;
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera, enCapturaYPasivo);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", desplazar, enCapturaYPasivo);
    window.addEventListener("resize", onCerrar);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera, { capture: true });
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", desplazar, { capture: true });
      window.removeEventListener("resize", onCerrar);
    };
  }, [abierto, disparador, panel, onCerrar]);

  return ESTILO_INICIAL;
};
