/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: estadoPieDrawer.util.ts
 * Responsabilidad: Lo que dice el pie del cajón estándar y el motivo del «Guardar» apagado, iguales
 *                  en todos los cajones de formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOS ESTADOS DEL PIE (plan «drawer-estandar», revisión 2), en este orden de prioridad:
 *
 *   · Edición sin cambios          «Sin cambios pendientes»   sinCambios  Guardar apagado: «Sin cambios»
 *   · Tras intentar, con errores   «Falta: a, b»              error       (el cajón lleva al primero)
 *   · Obligatorios vacíos          «N campos por completar»   pendiente   (gris, nunca naranja)
 *       (con `nombrarFaltantes`, «Falta: a, b» en gris desde el principio: el alta de P-01)
 *   · Algo por revisar             «Por revisar: a»           pendiente
 *   · Edición con cambios          «Cambios sin guardar»      cambios
 *   · Alta completa                «Listo para guardar»       listo
 *
 * `contexto` antepone lo propio del cajón: «1 efectivo · Sin cambios pendientes». Los errores no
 * se nombran antes del primer intento: hasta entonces el pie solo cuenta lo que falta.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EstadoPie } from "../components/common/DrawerLateral.tsx";

export type EntradaEstadoPie = {
  /** Se edita un registro que ya existe (no es un alta). */
  esEdicion: boolean;
  /** El formulario difiere de lo guardado. */
  hayCambios: boolean;
  /** Ya se pulsó «Guardar» una vez. */
  intentado: boolean;
  /** Los nombres de los campos con error, en el orden del formulario. */
  faltan: string[];
  /** Obligatorios vacíos antes del intento; por omisión, cuántos `faltan`. */
  porCompletar?: number;
  /** Avisos que no son obligatorios vacíos («teléfono» con formato a medias). */
  porRevisar?: string[];
  /** «Listo para guardar» por omisión («Listo para registrar»). */
  textoListo?: string;
  /** Prefijo propio del cajón: «1 efectivo». */
  contexto?: string;
  /**
   * Antes del intento, NOMBRAR lo que falta en gris («Falta: personal, zonal») en vez de contarlo.
   * Lo pide el alta del registro de operativo (2026-10-16): su pie está a la vista desde que se
   * abre y la lista de lo pendiente es la guía del registro. Los cajones siguen contando.
   */
  nombrarFaltantes?: boolean;
};

/** «1 campo por completar» / «3 campos por completar». */
export const textoPorCompletar = (n: number): string =>
  `${n} ${n === 1 ? "campo" : "campos"} por completar`;

export const estadoPieDrawer = ({
  esEdicion,
  hayCambios,
  intentado,
  faltan,
  porCompletar = faltan.length,
  porRevisar = [],
  textoListo = "Listo para guardar",
  contexto,
  nombrarFaltantes = false,
}: EntradaEstadoPie): EstadoPie => {
  const con = (texto: string) => (contexto ? `${contexto} · ${texto}` : texto);

  if (esEdicion && !hayCambios) return { tono: "sinCambios", texto: con("Sin cambios pendientes") };
  if (intentado && faltan.length > 0) {
    return { tono: "error", texto: con(`Falta: ${faltan.join(", ")}`) };
  }
  if (nombrarFaltantes && faltan.length > 0) {
    return { tono: "pendiente", texto: con(`Falta: ${faltan.join(", ")}`) };
  }
  if (porCompletar > 0) return { tono: "pendiente", texto: con(textoPorCompletar(porCompletar)) };
  if (porRevisar.length > 0) {
    return { tono: "pendiente", texto: con(`Por revisar: ${porRevisar.join(", ")}`) };
  }
  if (esEdicion) return { tono: "cambios", texto: con("Cambios sin guardar") };
  return { tono: "listo", texto: con(textoListo) };
};

/** El motivo del «Guardar» apagado al editar sin cambios; `null` si se puede guardar. */
export const motivoSinCambios = (esEdicion: boolean, hayCambios: boolean): string | null =>
  esEdicion && !hayCambios ? "Sin cambios" : null;
