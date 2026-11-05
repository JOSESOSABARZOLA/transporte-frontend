/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Zonas de la ciudad
 * Archivo: zonaCiudad.util.ts
 * Responsabilidad: Reglas puras de «Zonas de la ciudad»: sectores, uso en palabras y nombre repetido.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-05
 *
 * El nombre repetido es espejo del 409 `CATALOGO_DUPLICADO` del servidor (sin tildes ni
 * mayúsculas): se avisa en vivo, pero quien decide sigue siendo el servidor.
 */

import type { SectorCiudad, UsoDeZona, ZonaCiudad } from "../interfaces/ZonaCiudad.ts";
import { normalizar } from "./texto.util.ts";

/** El DMQ es todo el distrito: no se administra (espejo del servidor). */
export const MOTIVO_DMQ =
  "El DMQ es el ámbito distrital: no se edita, no se desactiva ni se elimina.";

export const SECTORES: readonly { valor: SectorCiudad; nombre: string }[] = [
  { valor: "NORTE", nombre: "Norte" },
  { valor: "CENTRO", nombre: "Centro" },
  { valor: "SUR", nombre: "Sur" },
  { valor: "VALLE", nombre: "Valle" },
];

export const nombreSector = (sector: SectorCiudad | null): string =>
  SECTORES.find((s) => s.valor === sector)?.nombre ?? "Todo el distrito";

const plural = (n: number, uno: string, varios: string): string =>
  `${n} ${n === 1 ? uno : varios}`;

/** «3 formularios · 64 puntos · 4 fichas», o «Sin uso». */
export const textoUso = (uso: UsoDeZona): string => {
  const partes = [
    uso.formularios > 0 ? plural(uso.formularios, "formulario", "formularios") : null,
    uso.operativos > 0 ? plural(uso.operativos, "operativo", "operativos") : null,
    uso.puntos > 0 ? plural(uso.puntos, "punto", "puntos") : null,
    uso.personal > 0 ? plural(uso.personal, "ficha", "fichas") : null,
    uso.flota > 0 ? plural(uso.flota, "garaje o taller", "garajes o talleres") : null,
  ].filter((parte): parte is string => parte !== null);
  return partes.length > 0 ? partes.join(" · ") : "Sin uso";
};

/** La zona que ya tiene ese nombre, sin tildes ni mayúsculas, salvo la que se edita. */
export const zonaConNombre = (
  nombre: string,
  zonas: readonly ZonaCiudad[],
  exceptoId?: number,
): ZonaCiudad | null => {
  const clave = normalizar(nombre.trim().replace(/\s+/g, " "));
  if (clave === "") return null;
  return zonas.find((z) => z.id !== exceptoId && normalizar(z.nombre) === clave) ?? null;
};

/** El aviso de cambiar el sector: cuántos traslados toman otro tiempo por defecto. */
export const avisoCambioSector = (zona: ZonaCiudad): string | null =>
  zona.paresSinTiempo > 0
    ? `${plural(zona.paresSinTiempo, "traslado", "traslados")} de la matriz sin tiempo propio tomarán el tiempo por defecto del nuevo sector. Revise «Traslados entre zonales» si hace falta.`
    : null;
