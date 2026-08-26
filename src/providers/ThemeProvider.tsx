/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Providers
 * Archivo: ThemeProvider.tsx
 * Responsabilidad: Gestiona el tema activo y su persistencia visual en la aplicación.
 * Desarrollador: Cristian Alberto Proaño Estévez
 * Fecha: 2026-03-30
 */

import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type AppTheme,
  type ThemeContextValue,
} from "../context/ThemeContext";

const getInitialTheme = (): AppTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/** Marca de «estoy cambiando de tema». La lee `design-tokens.css`. */
const ATRIBUTO_TRANSITO = "data-cambiando-tema";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    const raiz = document.documentElement;

    /*
      ═══════════════════════════════════════════════════════════════════════════
      SE APAGAN LAS TRANSICIONES DURANTE UN FOTOGRAMA. 2026-08-26.

      Los fondos cambian de golpe —`data-theme` no se anima— mientras que dieciocho
      selectores animan `color` durante 180 ms. En ese lapso convive el fondo nuevo
      con el color de texto viejo, y el texto desaparece: medido, un botón
      secundario baja a **1,60:1** en el instante del cambio y tarda 180 ms en
      volver a 17,10.

      No se retiran las transiciones, se **suspenden**: en hover y foco hacen su
      trabajo, y el cambio de tema solo las disparaba de rebote.

      EL ORDEN IMPORTA Y ES FRÁGIL. El atributo tiene que estar puesto **antes** de
      tocar `data-theme`, o el navegador ya habrá empezado a interpolar. Y se
      retira en el `requestAnimationFrame` siguiente, cuando el fotograma con los
      colores nuevos ya se pintó.

      SE LIMPIA TAMBIÉN AL DESMONTAR. Si el componente muere entre el atributo y el
      fotograma —una navegación, una recarga en caliente—, el atributo se quedaría
      puesto y la aplicación perdería los fundidos de hover sin que nada lo
      explicara. Es un fallo silencioso, y por eso lleva `cancelAnimationFrame`.
      ═══════════════════════════════════════════════════════════════════════════
    */
    raiz.setAttribute(ATRIBUTO_TRANSITO, "");
    raiz.setAttribute("data-theme", theme);

    /*
      ═══════════════════════════════════════════════════════════════════════════
      ESTA LÍNEA NO SOBRA, Y SIN ELLA EL ARREGLO NO ARREGLA NADA.

      Leer `offsetHeight` obliga al navegador a **recalcular los estilos ahora**,
      con el atributo puesto y las transiciones apagadas. Sin ella puede juntar los
      tres cambios —marca, tema, retirada de la marca— en un solo recálculo al
      final, cuando el atributo ya no está: entonces ve un color viejo y uno nuevo,
      con las transiciones vivas, y **anima igual**.

      Se comprobó midiendo: sin esta línea el botón secundario seguía cayendo a
      1,60:1 aunque la regla CSS estuviera en el artefacto compilado. Con ella no
      baja de 17,10.
      ═══════════════════════════════════════════════════════════════════════════
    */
    void raiz.offsetHeight;

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);

    const fotograma = window.requestAnimationFrame(() => {
      raiz.removeAttribute(ATRIBUTO_TRANSITO);
    });

    return () => {
      window.cancelAnimationFrame(fotograma);
      raiz.removeAttribute(ATRIBUTO_TRANSITO);
    };
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
