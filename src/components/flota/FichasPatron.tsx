/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: FichasPatron.tsx
 * Responsabilidad: Pintar el patrón de rotación de un conductor como fichas de colores por letra.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * La paleta es la de «Turnos del mes» (`paletaTurnos.util.ts`). Cada ficha lleva su LETRA y su
 * `title` con el nombre del turno, y el grupo entero se lee como la secuencia en palabras: el color
 * acompaña, no informa solo (regla 6). Sin patrón, «Sin patrón» en texto atenuado.
 */

import type { FC } from "react";

import { turnoDeLetra } from "../../utils/paletaTurnos.util.ts";
import { secuenciaPatron } from "../../utils/flota.util.ts";

const FichasPatron: FC<{ patron: string | null | undefined }> = ({ patron }) => {
  const letras = (patron ?? "").trim().toUpperCase();
  if (!letras) return <span className="text-app-muted">Sin patrón</span>;

  return (
    <span
      role="img"
      aria-label={`Patrón: ${secuenciaPatron(letras)}`}
      className="inline-flex flex-wrap gap-0.5"
    >
      {[...letras].map((letra, indice) => {
        const turno = turnoDeLetra(letra);
        return (
          <span
            // El orden importa y las letras se repiten: la posición es la identidad.
            key={`${letra}-${indice}`}
            aria-hidden="true"
            title={turno?.nombre ?? letra}
            className={`flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-semibold ${turno?.clase ?? "bg-base-200"}`}
          >
            {letra}
          </span>
        );
      })}
    </span>
  );
};

export default FichasPatron;
