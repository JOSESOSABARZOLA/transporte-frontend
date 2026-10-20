/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cambios sin guardar
 * Archivo: useAvisoAlSalir.ts
 * Responsabilidad: Avisar antes de salir de una pantalla con cambios sin guardar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DOS SALIDAS, DOS GUARDAS. Cerrar la pestaña o recargar la cubre `beforeunload` (el navegador
 * muestra su propio aviso). Navegar dentro de la aplicación —el menú lateral, un enlace— no pasa
 * por él: la app monta `<BrowserRouter>`, no un router de datos, así que `useBlocker` no existe.
 * Por eso se escucha el clic en FASE DE CAPTURA sobre los enlaces internos (`<a href="/…">`) y,
 * si hay cambios, se pregunta con `mensaje.confirmar` (el modal estándar, nunca `window.confirm`,
 * 2026-10-16); si la persona acepta, se repite el clic en el mismo enlace dejándolo pasar, para que lo navegue su propio `<Link>` (sin depender del router:
 * el hook sirve también en pruebas que montan la página sola). Lo que no es un enlace —«atrás» del
 * navegador— queda fuera, y está dicho aquí para que nadie lo dé por cubierto.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect } from "react";

import { mensaje as mensajes } from "../utils/mensaje.ts";

export const MENSAJE_SALIR = "Hay cambios sin guardar. Si sale de esta pantalla, se perderán.";

export function useAvisoAlSalir(hayCambios: boolean, mensaje: string = MENSAJE_SALIR): void {
  useEffect(() => {
    if (!hayCambios) return;
    /** El clic que la persona ya confirmó: se deja pasar una vez. */
    let confirmado: HTMLAnchorElement | null = null;

    const antesDeDescargar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      // Algunos navegadores aún piden un valor de retorno para mostrar el aviso.
      evento.returnValue = mensaje;
    };

    const alHacerClic = (evento: MouseEvent) => {
      if (evento.defaultPrevented || evento.button !== 0) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const enlace = (evento.target as Element | null)?.closest?.("a[href]");
      if (!(enlace instanceof HTMLAnchorElement)) return;
      if (enlace === confirmado) {
        confirmado = null;
        return;
      }
      if (enlace.target && enlace.target !== "_self") return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      if (destino.pathname === window.location.pathname) return;

      evento.preventDefault();
      evento.stopPropagation();
      void mensajes
        .confirmar({
          variante: "peligro",
          titulo: "¿Salir sin guardar?",
          mensaje,
          textoPrincipal: "Salir sin guardar",
          textoSecundario: "Seguir editando",
        })
        .then((salir) => {
          if (!salir) return;
          confirmado = enlace;
          enlace.click();
        });
    };

    window.addEventListener("beforeunload", antesDeDescargar);
    document.addEventListener("click", alHacerClic, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeDescargar);
      document.removeEventListener("click", alHacerClic, true);
    };
  }, [hayCambios, mensaje]);
}
