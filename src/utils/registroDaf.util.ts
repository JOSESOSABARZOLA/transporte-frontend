/**
 * App: Cuadro de Colores
 * Módulo: Transporte DAF
 * Feature: Registro agrupado (patrulla 5/6 y registro por zonas del 8)
 * Archivo: registroDaf.util.ts
 * Responsabilidad: Cómo nombra la DAF un registro agrupado: sus identificadores como rango, las
 *   zonas que también atiende, sus personas y sus avisos.
 * Fecha: 2026-10-28
 *
 * El servidor entrega UN operativo por registro agrupado (su representante), con `registro`: todos
 * sus identificadores, las zonas que no son la principal y, desde el 2026-11-04, sus personas y
 * avisos. La DAF lo lee como un solo operativo: «IGECU-001 · ITECU-001-05-NOV-2026», «2 personas» y
 * «También atiende: Calderón (AMC Calderón)». El id del registro (UUID) no se muestra nunca. Sin
 * `registro`, todo sigue como antes.
 */

import type { RegistroDaf } from "../interfaces/JornadaDaf.ts";
import { compactarIdentificadores } from "./rangoIdentificadores.util.ts";

/** `IGECU-001-05-NOV-2026` → `-05-NOV-2026`: la fecha que el rango le quita a cada código. */
const FECHA_DEL_IDENTIFICADOR = /^[A-Z]+-\d+(-.+)$/;

/** El identificador que ve la DAF: el rango del registro con su fecha una vez, o el del operativo. */
export function identificadorParaDaf(operativo: {
  identificador: string;
  registro?: RegistroDaf | null;
}): string {
  if (!operativo.registro || operativo.registro.identificadores.length === 0) {
    return operativo.identificador;
  }
  const fecha =
    FECHA_DEL_IDENTIFICADOR.exec(operativo.registro.identificadores[0])?.[1] ?? "";
  return `${compactarIdentificadores(operativo.registro.identificadores)}${fecha}`;
}

/** «También atiende: Calderón (AMC Calderón)», o `null` si no atiende otras zonas. */
export function tambienAtiende(registro: RegistroDaf | null | undefined): string | null {
  if (!registro || registro.tambienAtiende.length === 0) return null;
  return `También atiende: ${registro.tambienAtiende
    .map((zona) => (zona.punto ? `${zona.zonal} (${zona.punto})` : zona.zonal))
    .join(", ")}`;
}

/** «3 personas» del registro agrupado, o `null` si no lo es. */
export function personasDelRegistro(registro: RegistroDaf | null | undefined): string | null {
  if (!registro || registro.personas === undefined) return null;
  return `${registro.personas} ${registro.personas === 1 ? "persona" : "personas"}`;
}

/** Los avisos del registro para la DAF (asientos, horario); vacío si no hay. */
export function avisosDelRegistro(registro: RegistroDaf | null | undefined): string[] {
  return registro?.avisos ?? [];
}

/** Lo que el cajón de candidatos dice de un registro agrupado, o `null` si no lo es. */
export function avisoAsignacionDelRegistro(
  registro: RegistroDaf | null | undefined,
): string | null {
  if (!registro || registro.identificadores.length < 2) return null;
  return `El conductor y el vehículo se asignan a los ${registro.identificadores.length} identificadores del registro.`;
}
