/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Barra lateral
 * Archivo: useBarraPlegada.ts
 * Responsabilidad: Decir si la barra lateral debe ir plegada (como menú flotante) en la ruta actual.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * LAS TABLAS DE OPERATIVOS NO CABEN CON LA BARRA ABIERTA. Por debajo del umbral de su ruta, la
 * barra deja de ocupar columna en ESA pantalla y se abre como menú flotante, igual que en el
 * móvil. En las demás rutas nada cambia. Cada umbral sale de MEDIR en Chrome contra la pantalla
 * real: con la barra fija el panel deja `ancho − 375` px (262 de barra, 64 de márgenes y ~49 del
 * panel), así que el umbral es el ancho mínimo de la tabla + 375, con margen.
 *
 *  - Mis operativos (P-02), 1700 (opción B): la tabla mide ~1310 con un día y con la cabecera por
 *    día; con 1500 volvía a desplazarse entre 1500 y 1700 px.
 *  - Registro de operativo (P-01), 1840 (opción A, 2026-10-13): con la columna Observaciones la
 *    tabla mide 1433 px → cabe con la barra fija desde ~1808; 1840 deja 32 px de margen para
 *    nombres algo más largos que los de desarrollo. Plegada, cabe desde ~1550 (panel =
 *    `ancho − 113`); a 1440 sigue el desplazamiento DENTRO del panel, aceptado.
 */
import { useSyncExternalStore } from "react";

/** Ids que enlazan el botón «Menú» con el panel flotante (`aria-controls`) y le devuelven el foco. */
export const ID_BOTON_MENU = "boton-menu-lateral";
export const ID_MENU_FLOTANTE = "menu-lateral-flotante";

/** Ruta (final del `pathname`) → ancho desde el que la barra vuelve a ir fija. */
export const UMBRALES_PLEGADO: Readonly<Record<string, number>> = {
  "/cuadro/mis-operativos": 1700,
  "/cuadro/registro": 1840,
};

/** Umbral de la ruta, o `null` si la ruta no pliega la barra. Pura, para probarla aparte. */
export const umbralDeRuta = (ruta: string): number | null => {
  const limpia = ruta.replace(/\/+$/, "");
  const sufijo = Object.keys(UMBRALES_PLEGADO).find((s) => limpia.endsWith(s));
  return sufijo ? UMBRALES_PLEGADO[sufijo] : null;
};

/** `true` si la ruta está entre las que pliegan la barra. */
export const esRutaPlegable = (ruta: string): boolean => umbralDeRuta(ruta) !== null;

const hayMatchMedia = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

const consultaDe = (umbral: number): string => `(max-width: ${umbral - 0.02}px)`;

/** `true` mientras la barra deba plegarse en `ruta` con el ancho actual de la ventana. */
export const useBarraPlegada = (ruta: string): boolean => {
  const umbral = umbralDeRuta(ruta);

  // Se suscribe a la consulta del umbral de ESTA ruta: al navegar cambia el umbral y React
  // vuelve a suscribirse con la consulta nueva.
  const estrecho = useSyncExternalStore(
    (avisar) => {
      if (umbral === null || !hayMatchMedia()) return () => undefined;
      const consulta = window.matchMedia(consultaDe(umbral));
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => umbral !== null && hayMatchMedia() && window.matchMedia(consultaDe(umbral)).matches,
    () => false,
  );

  return estrecho;
};
