/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral estándar
 * Archivo: cajonEstandar.spec.ts
 * Responsabilidad: Fallar si el cajón estándar se vuelve a fragmentar: anchos fuera de lg|md,
 *                  versalita o pie propio en un cajón, el regreso de `MarcoModal` (retirado el
 *                  2026-10-16), `ModalExito`, `PieDrawer` o las piezas retiradas del formulario del
 *                  operativo (`FormularioOperativo`, `CampoOtroTipo`, `ResumenDeEnvio`, `CapturadorNotas`).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PRUEBA GUARDIÁN DEL PLAN «drawer-estandar» (bloque 4). TypeScript ya rechaza un ancho o
 * una propiedad que `DrawerLateral` no declara; esto vigila lo que el tipo no ve:
 *
 *   · que nadie vuelva a declarar un ancho propio (p. ej. con un `as`), ni pase `antetitulo`,
 *     `marca` o `pie`, ni ponga `uppercase` en el título o el subtítulo del cajón;
 *   · que `MarcoModal` no vuelva: desde el 2026-10-16 un formulario es un cajón y una confirmación
 *     es `MensajeModal` (mensajes estándar, M4);
 *   · que `ModalExito` y `PieDrawer` no reaparezcan: el éxito es un aviso breve (`toast.exito`)
 *     y el pie lo arma `DrawerLateral`;
 *   · (revisión 2) que ningún archivo que pinta un cajón use márgenes negativos, anchos sobre el
 *     100 % ni `w-screen`: es lo que dibujaba el rectángulo sobre la curva del pie.
 *
 * Una ventana nueva se decide: ¿es un formulario (cajón) o un mensaje (`MensajeModal`)?
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

// Vitest corre desde la raíz del proyecto (`import.meta.url` no es `file:` en jsdom).
const RAIZ = join(process.cwd(), "src") + sep;

/** Todos los `.ts`/`.tsx` de `src/` salvo las pruebas. */
const archivos = (carpeta: string): string[] =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(ruta) && !ruta.includes(".spec.") ? [ruta] : [];
  });

const relativa = (ruta: string) => ruta.slice(RAIZ.length).split(sep).join("/");

const FUENTES = archivos(RAIZ).map((ruta) => ({
  ruta: relativa(ruta),
  texto: readFileSync(ruta, "utf8"),
}));

/**
 * Las etiquetas de apertura `<Componente …>` de un archivo, con sus atributos. Recorre llaves y
 * comillas para no cortar en el `>` de una flecha (`() => …`) dentro de un atributo.
 */
const etiquetas = (texto: string, componente: string): string[] => {
  const encontradas: string[] = [];
  const inicio = new RegExp(`<${componente}\\b`, "g");
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = inicio.exec(texto))) {
    let profundidad = 0;
    let comilla: string | null = null;
    let fin = coincidencia.index + coincidencia[0].length;
    for (; fin < texto.length; fin += 1) {
      const caracter = texto[fin];
      if (comilla) {
        if (caracter === comilla) comilla = null;
      } else if (caracter === '"' || caracter === "'" || caracter === "`") {
        comilla = caracter;
      } else if (caracter === "{") {
        profundidad += 1;
      } else if (caracter === "}") {
        profundidad -= 1;
      } else if (caracter === ">" && profundidad === 0) {
        break;
      }
    }
    encontradas.push(texto.slice(coincidencia.index, fin));
  }
  return encontradas;
};

describe("Cajón lateral estándar", () => {
  const cajones = FUENTES.flatMap(({ ruta, texto }) =>
    etiquetas(texto, "DrawerLateral").map((etiqueta) => ({ ruta, etiqueta })),
  );

  it("hay cajones que vigilar (la búsqueda no se quedó vacía)", () => {
    expect(cajones.length).toBeGreaterThan(10);
  });

  it("todo cajón es lg o md", () => {
    const fuera = cajones
      .map(({ ruta, etiqueta }) => ({ ruta, ancho: /\bancho=(?:"([^"]*)"|\{)/.exec(etiqueta) }))
      .filter(({ ancho }) => ancho && ancho[1] !== "lg" && ancho[1] !== "md")
      .map(({ ruta, ancho }) => `${ruta}: ancho=${ancho?.[1] ?? "{…}"}`);
    expect(fuera).toEqual([]);
  });

  it("ningún cajón lleva versalita, distintivo ni pie propios", () => {
    const fuera = cajones
      .filter(({ etiqueta }) => /\b(antetitulo|marca|pie)=|\buppercase\b/.test(etiqueta))
      .map(({ ruta }) => ruta);
    expect(fuera).toEqual([]);
  });

  it("la cabecera de DrawerLateral no tiene versalita", () => {
    const fuente = FUENTES.find(({ ruta }) => ruta === "components/common/DrawerLateral.tsx");
    expect(fuente?.texto).not.toMatch(/className="[^"]*\buppercase\b/);
  });

  it("nadie pinta un MarcoModal: formularios en cajón, mensajes en MensajeModal (M4)", () => {
    const fuera = FUENTES.filter(({ texto }) => etiquetas(texto, "MarcoModal").length > 0).map(
      ({ ruta }) => ruta,
    );
    expect(fuera).toEqual([]);
  });

  it("ningún cajón rompe la curva: sin márgenes negativos ni anchos sobre el 100 %", () => {
    const RIESGO = /(?:^|[\s"'`{])(-m[xylrtb]?-[\w[\]./]+|w-\[1\d{2}%\]|w-screen)(?![\w-])/;
    const fuera = FUENTES.filter(
      ({ ruta, texto }) =>
        ruta !== "components/common/DrawerLateral.tsx" && etiquetas(texto, "DrawerLateral").length > 0,
    ).flatMap(({ ruta, texto }) =>
      texto
        .split("\n")
        .map((linea, indice) => ({ linea, indice }))
        .filter(({ linea }) => /className|clase/i.test(linea) && RIESGO.test(linea))
        .map(({ linea, indice }) => `${ruta}:${indice + 1}: ${RIESGO.exec(linea)?.[1]}`),
    );
    expect(fuera).toEqual([]);
  });

  it("MarcoModal, ModalExito, PieDrawer, ModalConfirmacion, ModalReactivarFicha y ModalCandidatos no vuelven", () => {
    const RETIRADOS =
      "MarcoModal|ModalExito|PieDrawer|ModalConfirmacion|ModalReactivarFicha|ModalCandidatos";
    const archivo = new RegExp(`(^|/)(${RETIRADOS})\\.tsx$`);
    const importacion = new RegExp(`from\\s+["'][^"']*/(${RETIRADOS})(\\.tsx)?["']`);
    const fuera = FUENTES.filter(
      ({ ruta, texto }) => archivo.test(ruta) || importacion.test(texto),
    ).map(({ ruta }) => ruta);
    expect(fuera).toEqual([]);
  });

  /**
   * El formulario del operativo es UNO (plan «registro-operativo-rediseno», 2026-10-16):
   * `FormOperativo` con `modo`. No vuelven el nombre anterior, el campo aparte del «otro tipo» ni
   * el resumen de envío del alta (lo dice la `BarraPie`). Ni `CapturadorNotas`: las notas son
   * `ObservacionesOperativo` en el alta y en el cajón (2026-10-16).
   */
  it("FormularioOperativo, CampoOtroTipo, ResumenDeEnvio y CapturadorNotas no vuelven", () => {
    const RETIRADOS = "FormularioOperativo|CampoOtroTipo|ResumenDeEnvio|CapturadorNotas";
    const archivo = new RegExp(`(^|/)(${RETIRADOS})\\.tsx$`);
    const importacion = new RegExp(`from\\s+["'][^"']*/(${RETIRADOS})(\\.tsx)?["']`);
    const pintado = new RegExp(`<(${RETIRADOS})\\b`);
    const fuera = FUENTES.filter(
      ({ ruta, texto }) =>
        archivo.test(ruta) || importacion.test(texto) || pintado.test(texto),
    ).map(({ ruta }) => ruta);
    expect(fuera).toEqual([]);
  });
});
