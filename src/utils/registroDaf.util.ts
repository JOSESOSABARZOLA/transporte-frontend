/**
 * App: Cuadro de Colores
 * Módulo: Transporte DAF
 * Feature: Registro por zonas del formulario 8
 * Archivo: registroDaf.util.ts
 * Responsabilidad: Cómo nombra la DAF un registro por zonas: sus identificadores como rango y
 *   las zonas que también atiende.
 * Fecha: 2026-10-28
 *
 * El servidor entrega UN operativo por registro por zonas (su representante), con `registro`:
 * todos sus identificadores y las zonas que no son la principal. La DAF lo lee como un solo
 * operativo: «IG-030 a IG-043» y «También atiende: Calderón (AMC Calderón)». Sin `registro`, todo
 * sigue como antes.
 */

import type { RegistroDaf } from "../interfaces/JornadaDaf.ts";
import { compactarIdentificadores } from "./rangoIdentificadores.util.ts";

/** El identificador que ve la DAF: el rango del registro o el del operativo. */
export function identificadorParaDaf(operativo: {
  identificador: string;
  registro?: RegistroDaf | null;
}): string {
  return operativo.registro && operativo.registro.identificadores.length > 0
    ? compactarIdentificadores(operativo.registro.identificadores)
    : operativo.identificador;
}

/** «También atiende: Calderón (AMC Calderón)», o `null` si no atiende otras zonas. */
export function tambienAtiende(registro: RegistroDaf | null | undefined): string | null {
  if (!registro || registro.tambienAtiende.length === 0) return null;
  return `También atiende: ${registro.tambienAtiende
    .map((zona) => (zona.punto ? `${zona.zonal} (${zona.punto})` : zona.zonal))
    .join(", ")}`;
}

/** Lo que el cajón de candidatos dice de un registro por zonas, o `null` si no lo es. */
export function avisoAsignacionDelRegistro(
  registro: RegistroDaf | null | undefined,
): string | null {
  if (!registro || registro.identificadores.length < 2) return null;
  return `El conductor y el vehículo se asignan a los ${registro.identificadores.length} identificadores del registro.`;
}
