/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración de pruebas
 * Archivo: resumenCajon.ts
 * Responsabilidad: Reducir un cajón estándar abierto a su ESTRUCTURA (ancho, cabecera, secciones,
 *                  campos y pie) para fijarla con una instantánea.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ UN RESUMEN Y NO EL HTML. La instantánea del marcado entero cambia con cada clase de
 * Tailwind y con los `useId` (dependen del orden de las pruebas), y una instantánea que se
 * regenera a ciegas no vigila nada. Lo que el cajón estándar promete es la FORMA: qué ancho,
 * qué título y subtítulo, qué secciones con qué campos, qué dice el pie y qué botones ofrece y
 * si están apagados. Eso es lo que se fija aquí (plan «drawer-estandar», revisión 2, R10).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** El texto visible de un nodo, con los espacios colapsados. */
const texto = (nodo: Element | null | undefined): string =>
  (nodo?.textContent ?? "").replace(/\s+/g, " ").trim();

export type ResumenCajon = {
  ancho: "lg" | "md" | "otro";
  titulo: string;
  subtitulo: string;
  secciones: { titulo: string; campos: string[] }[];
  estadoPie: string;
  botonesPie: string[];
};

/** El resumen del cajón (`role="dialog"` de `DrawerLateral`). */
export const resumenCajon = (dialogo: HTMLElement): ResumenCajon => {
  const clases = dialogo.className;
  const ancho = clases.includes("clamp(") ? "lg" : clases.includes("37.5rem") ? "md" : "otro";

  const [cabecera, cuerpo, pie] = Array.from(dialogo.children);

  const secciones = Array.from(cuerpo?.querySelectorAll("section") ?? []).map((seccion) => ({
    titulo: texto(seccion.querySelector("h3")),
    campos: Array.from(seccion.querySelectorAll("label"))
      .map((etiqueta) => texto(etiqueta))
      .filter(Boolean),
  }));

  const botonesPie =
    pie && pie !== cuerpo
      ? Array.from(pie.querySelectorAll("button")).map((boton) => {
          const apagado = boton.getAttribute("aria-disabled") === "true";
          const motivo = boton.getAttribute("title");
          return `${texto(boton)}${apagado ? ` (apagado${motivo ? `: ${motivo}` : ""})` : ""}`;
        })
      : [];

  return {
    ancho,
    titulo: texto(cabecera?.querySelector("h2")),
    subtitulo: texto(cabecera?.querySelector("h2")?.nextElementSibling),
    secciones,
    estadoPie: texto(pie?.querySelector('[role="status"]')),
    botonesPie,
  };
};
