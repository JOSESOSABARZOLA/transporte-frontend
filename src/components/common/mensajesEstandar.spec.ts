/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: mensajesEstandar.spec.ts
 * Responsabilidad: Fallar si los mensajes vuelven a fragmentarse: el regreso de
 *                  `AvisoEfimero` o de sus clases, un aviso hecho a mano con su propio
 *                  temporizador, una alerta de daisyUI fuera de `AvisoEnLinea`, las piezas de
 *                  modal retiradas o un `alert`/`confirm`/`prompt` del navegador.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PRUEBA GUARDIÁN DEL BLOQUE 4 DEL PLAN «mensajes-estandar». Un éxito rutinario es
 * `toast.exito` y un hito es `mensaje.exito` (`utils/mensaje.ts`), los dos pintados por el único
 * `MensajeHost`. Hasta el 2026-10-16 había catorce `AvisoEfimero` —uno por página, que se pisaban—
 * y cinco avisos hechos a mano, uno con su `setTimeout` de 4 s. Esto vigila que no vuelvan:
 *
 *   · ni el archivo ni una importación de `AvisoEfimero`;
 *   · ni sus clases (`app-modules-feedback-region`, `app-modules-page-feedback`);
 *   · ni un temporizador que apaga un aviso propio (`setTimeout(() => setAviso(null), …)`): el
 *     resaltado de una fila sí lleva el suyo, y no es un aviso.
 *
 * Y DEL BLOQUE 5 (avisos en línea y limpieza):
 *
 *   · ninguna clase `alert-error|warning|info|success` (ni `alert alert-…`) fuera de
 *     `components/common/`: un aviso en línea es `AvisoEnLinea`, con la paleta y el icono de los
 *     mensajes estándar;
 *   · ni `ModalProvider`/`useModal`/`interfaces/Modal.ts` ni `common/Alert.tsx`, montados o
 *     escritos y nunca usados;
 *   · ni `window.alert`, `window.confirm` o `window.prompt` (el lint ya los rechaza:
 *     `no-alert` y `no-restricted-globals`; esto es por si no corrió).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest corre desde la raíz del proyecto (`import.meta.url` no es `file:` en jsdom).
const RAIZ = join(process.cwd(), "src") + sep;

/** Los `.ts`, `.tsx` y `.css` de `src/` salvo las pruebas. */
const archivos = (carpeta: string): string[] =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(tsx?|css)$/.test(ruta) && !ruta.includes(".spec.") ? [ruta] : [];
  });

const relativa = (ruta: string) => ruta.slice(RAIZ.length).split(sep).join("/");

const FUENTES = archivos(RAIZ).map((ruta) => ({
  ruta: relativa(ruta),
  texto: readFileSync(ruta, "utf8"),
}));

/** Quita los comentarios: un comentario que cuenta la historia no es un uso. */
const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("mensajes estándar · los avisos breves no se fragmentan", () => {
  it("AvisoEfimero no vuelve: ni su archivo ni una importación", () => {
    const culpables = FUENTES.filter(
      ({ ruta, texto }) =>
        /(^|\/)AvisoEfimero\.tsx$/.test(ruta) ||
        /from\s+["'][^"']*\/AvisoEfimero(\.tsx)?["']/.test(texto),
    ).map(({ ruta }) => ruta);
    expect(culpables).toEqual([]);
  });

  it("las clases del aviso de página retirado no vuelven", () => {
    const culpables = FUENTES.filter(({ texto }) =>
      /app-modules-(feedback-region|page-feedback)/.test(sinComentarios(texto)),
    ).map(({ ruta }) => ruta);
    expect(culpables).toEqual([]);
  });

  it("ninguna alerta de daisyUI fuera de components/common/: los avisos en línea son AvisoEnLinea", () => {
    const alerta = /\balert-(error|warning|info|success)\b|["'`\s]alert\s+alert-/;
    const culpables = FUENTES.filter(
      ({ ruta, texto }) =>
        !ruta.startsWith("components/common/") && alerta.test(sinComentarios(texto)),
    ).map(({ ruta }) => ruta);
    expect(culpables).toEqual([]);
  });

  it("las piezas de modal retiradas no vuelven", () => {
    const retirados =
      /(^|\/)(ModalProvider\.tsx|ModalContext\.tsx|useModal\.ts|interfaces\/Modal\.ts|common\/Alert\.tsx)$/;
    const importados =
      /from\s+["'][^"']*\/(ModalProvider|ModalContext|useModal|interfaces\/Modal|common\/Alert)(\.tsx?)?["']/;
    const culpables = FUENTES.filter(
      ({ ruta, texto }) => retirados.test(ruta) || importados.test(texto),
    ).map(({ ruta }) => ruta);
    expect(culpables).toEqual([]);
  });

  it("no hay alert, confirm ni prompt del navegador", () => {
    // `mensaje.confirmar(` no cuenta: el punto delante lo excluye.
    const nativo = /(^|[^.\w])(window\.)?(alert|confirm|prompt)\s*\(/m;
    const culpables = FUENTES.filter(
      ({ ruta, texto }) => /\.tsx?$/.test(ruta) && nativo.test(sinComentarios(texto)),
    ).map(({ ruta }) => ruta);
    expect(culpables).toEqual([]);
  });

  it("ningún aviso hecho a mano se apaga con su propio temporizador", () => {
    const temporizadorDeAviso =
      /setTimeout\(\s*\(\)\s*=>\s*set\w*(Aviso|Exito|Hecho|Confirmacion|Mensaje)\w*\(\s*null\s*\)/;
    const culpables = FUENTES.filter(({ texto }) =>
      temporizadorDeAviso.test(sinComentarios(texto)),
    ).map(({ ruta }) => ruta);
    expect(culpables).toEqual([]);
  });
});
