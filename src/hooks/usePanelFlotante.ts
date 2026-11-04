/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Paneles flotantes
 * Archivo: usePanelFlotante.ts
 * Responsabilidad: Posicionar un panel flotante (lista o ayuda) bajo su disparador y cerrarlo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07 · `seguir`, `medida` y `altoMaximo` desde el 2026-11-04
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
 *
 * EL PORTAL TAMBIÉN SALVA EL CONTEXTO DE APILAMIENTO (2026-11-04). Los paneles con `backdrop-blur`
 * crean uno cada uno: una lista `absolute` con `z-30` solo vale dentro de su panel, y la cabecera
 * fija de la tabla que viene después en el DOM se pintaba encima («Operativos de este formulario»
 * sobre el selector de FORMULARIO). La capa es la de los menús del sistema (9999): sobre los
 * paneles y los cajones —hay listas que se abren DENTRO de un cajón—, bajo los avisos breves, los
 * modales y el tooltip.
 *
 * `seguir` (2026-11-04): en vez de cerrar al desplazar o redimensionar, el panel se RECOLOCA pegado
 * al disparador. Se cierra solo cuando el disparador deja de verse —fuera de la ventana o tapado,
 * por la barra superior fija o la cabecera de un cajón—, para no quedar flotando sobre ellas.
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

type MedidasPanel = {
  anchoDelDisparador?: boolean;
  anchoMinimo?: number;
  /** Tope del alto aunque haya más espacio (la lista corta de un campo). */
  altoMaximo?: number;
};

type OpcionesPanel = MedidasPanel & {
  /** Recolocar al desplazar o redimensionar, en vez de cerrar. */
  seguir?: boolean;
  /** Cualquier valor que cambie con el contenido: al cambiar se vuelve a medir. */
  medida?: unknown;
};

/** Coloca el panel bajo el disparador (o encima, si abajo no cabe). Escribe en el elemento. */
const colocar = (
  elemento: HTMLElement,
  contenido: HTMLElement,
  { anchoDelDisparador = false, anchoMinimo, altoMaximo }: MedidasPanel,
) => {
  const r = elemento.getBoundingClientRect();
  const altoContenido = contenido.scrollHeight;
  const espacioAbajo = window.innerHeight - r.bottom - MARGEN - SEPARACION;
  const espacioArriba = r.top - MARGEN - SEPARACION;
  const abajo =
    espacioAbajo >= Math.min(altoContenido, ALTO_MINIMO) || espacioAbajo >= espacioArriba;
  const disponible = Math.max(ALTO_MINIMO, abajo ? espacioAbajo : espacioArriba);
  const maxHeight = altoMaximo ? Math.min(altoMaximo, disponible) : disponible;
  const alto = Math.min(altoContenido, maxHeight);
  // El ancho que ocupará el panel, para que no se salga por la derecha.
  const ancho = Math.max(anchoDelDisparador ? r.width : contenido.offsetWidth, anchoMinimo ?? 0);
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
};

/**
 * ¿Se ve el disparador? Fuera de la ventana, no. Dentro, se mira qué hay en su centro: si es otra
 * cosa (la barra superior, la cabecera del cajón, el borde de un contenedor con desplazamiento), está
 * tapado. Sin `elementFromPoint` (jsdom) se da por visible.
 */
const seVe = (elemento: HTMLElement, panel: HTMLElement) => {
  const r = elemento.getBoundingClientRect();
  if (r.bottom <= 0 || r.top >= window.innerHeight) return false;
  if (typeof document.elementFromPoint !== "function") return true;
  const x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1);
  const y = Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight - 1);
  const encima = document.elementFromPoint(x, y);
  return !encima || elemento.contains(encima) || panel.contains(encima);
};

export const usePanelFlotante = (
  abierto: boolean,
  disparador: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  onCerrar: () => void,
  opciones: OpcionesPanel = {},
): CSSProperties => {
  const { anchoDelDisparador = false, anchoMinimo, altoMaximo, seguir = false, medida } = opciones;

  // La posición se escribe en el propio elemento, sin pasar por el estado: depende de dónde está el
  // campo en este instante y no debe provocar otro render. `medida` solo dispara la nueva medición.
  useLayoutEffect(() => {
    if (!abierto || !disparador.current || !panel.current) return;
    colocar(disparador.current, panel.current, { anchoDelDisparador, anchoMinimo, altoMaximo });
  }, [abierto, disparador, panel, anchoDelDisparador, anchoMinimo, altoMaximo, medida]);

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
    const recolocar = () => {
      const elemento = disparador.current;
      const contenido = panel.current;
      if (!elemento || !contenido) return;
      if (!seVe(elemento, contenido)) {
        onCerrar();
        return;
      }
      colocar(elemento, contenido, { anchoDelDisparador, anchoMinimo, altoMaximo });
    };
    // Desplazar dentro del panel (su lista larga) no lo cierra ni lo mueve; desplazar la página, sí.
    // El destino puede ser `window`, que no es un `Node`: `contains` lanzaría.
    const desplazar = (evento: Event) => {
      const objetivo = evento.target;
      if (objetivo instanceof Node && panel.current?.contains(objetivo)) return;
      if (seguir) recolocar();
      else onCerrar();
    };
    const redimensionar = seguir ? recolocar : onCerrar;
    const enCapturaYPasivo = { capture: true, passive: true } as const;
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera, enCapturaYPasivo);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", desplazar, enCapturaYPasivo);
    window.addEventListener("resize", redimensionar);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera, { capture: true });
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", desplazar, { capture: true });
      window.removeEventListener("resize", redimensionar);
    };
  }, [abierto, disparador, panel, onCerrar, seguir, anchoDelDisparador, anchoMinimo, altoMaximo]);

  return ESTILO_INICIAL;
};
