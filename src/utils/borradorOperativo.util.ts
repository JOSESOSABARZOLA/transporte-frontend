/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: borradorOperativo.util.ts
 * Responsabilidad: Conservar lo que se está capturando en P-01 al salir y volver.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-04
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE. Al navegar de Registro de operativo a otra pantalla, React Router
 * desmonta la página y su estado se pierde: al volver, el formulario aparece vacío. El
 * principio del proyecto es «LO CAPTURADO NUNCA SE PIERDE» (CLAUDE.md regla 15,
 * PRODUCT.md principio 2), y aquí no se cumplía. Esto lo conserva.
 *
 * CADA FORMULARIO GUARDA LO SUYO, Y NADIE VE LO DEL OTRO. 2026-09-10. Antes había UN
 * borrador por usuario y teclear en un formulario reaparecía bajo la pestaña de otro. Ahora
 * el borrador de captura se llavea por (usuario, formulario): cada formulario conserva su
 * propia captura y solo la ve él. Aparte va un PUNTERO de sesión —la fecha y el último
 * formulario abierto— para volver a donde estaba el usuario al reabrir la pantalla.
 *
 * `sessionStorage`, NO `localStorage`, Y ES UNA DECISIÓN DE SEGURIDAD. El borrador lleva
 * datos personales —nombres y teléfonos del personal asignado (RN-34)—. `sessionStorage`
 * es por pestaña, vive en memoria y se borra al cerrarla; `localStorage` persistiría en
 * disco y sobreviviría a la sesión. `UserProvider` ya declara que la aplicación no guarda
 * nada sensible de forma persistente en el navegador, y esto lo respeta.
 *
 * NUNCA SALE DE LA PESTAÑA. No se envía a ningún origen —la CSP `connect-src 'self'` lo
 * respalda— ni se comparte entre pestañas. No amplía la superficie de circulación del
 * cuadro (PER-02).
 *
 * SE BORRA AL CERRAR SESIÓN (`limpiarTodos`, desde `UserProvider`) y al registrar con
 * éxito. Lo primero evita que en una máquina compartida el siguiente usuario vea el
 * borrador del anterior.
 *
 * TODO ACCESO VA EN `try/catch`. `sessionStorage` puede lanzar —modo incógnito, o HTTP
 * sobre una IP en algunos navegadores—; si falla, la pantalla funciona igual que antes,
 * sin persistencia. Nunca revienta por esto.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ValoresOperativo } from "./valoresOperativo.util.ts";
import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";

/**
 * VERSIÓN DEL ESQUEMA. Si la forma del borrador cambia, se sube este número y los
 * borradores viejos se descartan al leerlos en lugar de restaurar una forma que el
 * código ya no entiende.
 */
const VERSION = 6;

/** Raíz común a todas las versiones: el barrido de cierre de sesión limpia también las viejas. */
const BASE = "cco.borradorOperativo.";
const PREFIJO = `${BASE}v${VERSION}.`;

/** El puntero de sesión: uno por usuario. Fecha y último formulario abierto, para reabrir donde iba. */
const clavePuntero = (usuarioId: number): string => `${PREFIJO}ptr.${usuarioId}`;

/**
 * El borrador de captura: uno por (usuario, formulario, FECHA). Desde el 2026-09-21 incluye la
 * fecha de la jornada, para que cambiar «Fecha de la jornada» NO borre lo capturado (RN-66: cada
 * captura queda con SU día; al volver a esa fecha se restaura). El de un formulario/día no se ve
 * en otro.
 */
const claveBorrador = (
  usuarioId: number,
  codigo: string,
  fecha: string,
): string => `${PREFIJO}form.${usuarioId}.${fecha}.${codigo}`;

/** Prefijo de TODOS los borradores de captura de un usuario. Para barrerlos al cambiar de jornada. */
const prefijoBorradoresDeUsuario = (usuarioId: number): string =>
  `${PREFIJO}form.${usuarioId}.`;

/** Dónde estaba el usuario: la fecha de la jornada y el formulario abierto. Sin datos personales. */
export interface PunteroSesion {
  fecha: string;
  codigoElegido: string | null;
}

/** Lo que se conserva del alta en curso de UN formulario. Solo el ALTA: una corrección no se persiste. */
export interface BorradorOperativo {
  valores: ValoresOperativo;
  personal: PersonaAgregada[];
}

/**
 * ¿No hay nada que valga la pena conservar? El formulario elegido NO cuenta: tras
 * registrar, el formulario se conserva para encadenar otro del mismo, y eso solo no es
 * captura. Así, al resetear el formulario tras un registro, se retira el borrador en vez
 * de dejar uno «vacío» que al volver repoblaría un formulario ya enviado.
 */
export const esBorradorVacio = (
  valores: ValoresOperativo,
  personal: PersonaAgregada[],
): boolean =>
  personal.length === 0 &&
  valores.zonalesIds.length === 0 &&
  valores.punto === "" &&
  valores.puntoLibre === "" &&
  valores.tipoControl === "" &&
  valores.tipoLibre === "" &&
  valores.institucionesIds.length === 0 &&
  valores.observaciones.length === 0 &&
  (valores.notaPendiente ?? "").trim() === "";

/** Guarda el puntero de sesión. Silencioso ante un fallo de `sessionStorage`. */
export const guardarPuntero = (
  usuarioId: number,
  puntero: PunteroSesion,
): void => {
  try {
    window.sessionStorage.setItem(
      clavePuntero(usuarioId),
      JSON.stringify({ v: VERSION, ...puntero }),
    );
  } catch {
    // Sin persistencia, la pantalla sigue funcionando como antes.
  }
};

/** Lee el puntero de sesión. `null` si no hay, no se puede leer, o es de otra versión de esquema. */
export const leerPuntero = (usuarioId: number): PunteroSesion | null => {
  try {
    const crudo = window.sessionStorage.getItem(clavePuntero(usuarioId));
    if (!crudo) return null;

    const dato = JSON.parse(crudo) as Partial<PunteroSesion> & { v?: number };
    if (dato?.v !== VERSION) {
      window.sessionStorage.removeItem(clavePuntero(usuarioId));
      return null;
    }
    return {
      fecha: dato.fecha ?? "",
      codigoElegido: dato.codigoElegido ?? null,
    };
  } catch {
    return null;
  }
};

/** Guarda el borrador de un formulario. Silencioso ante un fallo de `sessionStorage`. */
export const guardarBorrador = (
  usuarioId: number,
  codigo: string,
  fecha: string,
  borrador: BorradorOperativo,
): void => {
  try {
    window.sessionStorage.setItem(
      claveBorrador(usuarioId, codigo, fecha),
      JSON.stringify({ v: VERSION, ...borrador }),
    );
  } catch {
    // Sin persistencia, la pantalla sigue funcionando como antes.
  }
};

/**
 * Lee el borrador de un usuario para UN formulario. Devuelve `null` si no hay, si no se
 * puede leer, o si es de una versión de esquema distinta —en cuyo caso además se retira,
 * para no reintentar—.
 */
export const leerBorrador = (
  usuarioId: number,
  codigo: string,
  fecha: string,
): BorradorOperativo | null => {
  try {
    const crudo = window.sessionStorage.getItem(
      claveBorrador(usuarioId, codigo, fecha),
    );
    if (!crudo) return null;

    const dato = JSON.parse(crudo) as Partial<BorradorOperativo> & { v?: number };
    if (dato?.v !== VERSION || !dato.valores) {
      window.sessionStorage.removeItem(claveBorrador(usuarioId, codigo, fecha));
      return null;
    }
    return { valores: dato.valores, personal: dato.personal ?? [] };
  } catch {
    return null;
  }
};

/** Retira el borrador de un usuario para UN formulario. Tras registrar con éxito ese formulario. */
export const limpiarBorrador = (
  usuarioId: number,
  codigo: string,
  fecha: string,
): void => {
  try {
    window.sessionStorage.removeItem(claveBorrador(usuarioId, codigo, fecha));
  } catch {
    // Nada que hacer: si no se puede escribir, tampoco se pudo guardar.
  }
};

/**
 * Retira TODOS los borradores de captura de un usuario —los de todos sus formularios—, sin
 * tocar su puntero de sesión. Al cambiar de JORNADA: el personal se evaluó contra las
 * reglas de descanso de un día y no vale para otro, así que ninguna captura del día que se
 * abandona debe reaparecer al cambiar de formulario en el día nuevo.
 */
export const limpiarBorradoresDeUsuario = (usuarioId: number): void => {
  try {
    const prefijo = prefijoBorradoresDeUsuario(usuarioId);
    const claves: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k?.startsWith(prefijo)) claves.push(k);
    }
    for (const k of claves) window.sessionStorage.removeItem(k);
  } catch {
    // Silencioso, por lo mismo que los demás.
  }
};

/**
 * Retira TODOS los borradores y punteros, de cualquier versión de esquema. Al cerrar
 * sesión: quien entre después en la misma pestaña no debe ver lo que capturaba el anterior.
 * No se sabe el id de usuario en ese momento —o puede ser otro—, así que se barren todas
 * las claves con la raíz común.
 */
export const limpiarTodosLosBorradores = (): void => {
  try {
    const claves: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k?.startsWith(BASE)) claves.push(k);
    }
    for (const k of claves) window.sessionStorage.removeItem(k);
  } catch {
    // Silencioso, por lo mismo que los demás.
  }
};
