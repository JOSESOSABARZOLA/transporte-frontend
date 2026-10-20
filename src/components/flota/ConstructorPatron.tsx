/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: ConstructorPatron.tsx
 * Responsabilidad: Armar el patrón de rotación con botones D/N/E/L/A, borrar la última letra y
 *                  limpiar, viendo las fichas y la secuencia en palabras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANTES ERA UN CAMPO DE TEXTO donde se tecleaba «DDDDDLL» de memoria, y una «X» o una letra de más
 * solo se descubría al guardar. Con botones no se puede escribir una letra que no exista, y al
 * llegar a 14 se apagan. Lo que el constructor NO impide es dejar una sola letra: eso lo dice el
 * error del cajón al intentar guardar (de 2 a 14, como el servidor).
 *
 * Cada botón dice la letra Y el turno («D Día»); la paleta es la de «Turnos del mes».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import FichasPatron from "./FichasPatron.tsx";
import Boton from "../common/Boton.tsx";
import { TURNOS_PATRON } from "../../utils/paletaTurnos.util.ts";
import { secuenciaPatron } from "../../utils/flota.util.ts";

/** El largo máximo del patrón, el mismo del servidor (`^[DNELA]{2,14}$`). */
const MAXIMO_PATRON = 14;

type ConstructorPatronProps = {
  id: string;
  patron: string;
  onCambiar: (patron: string) => void;
  error?: string | null;
};

const ConstructorPatron: FC<ConstructorPatronProps> = ({ id, patron, onCambiar, error }) => {
  const actual = patron.trim().toUpperCase();
  const lleno = actual.length >= MAXIMO_PATRON;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Agregar turno al patrón"
        className="flex flex-wrap gap-1"
      >
        {TURNOS_PATRON.map((turno) => (
          <button
            key={turno.letra}
            type="button"
            // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
            className={`btn btn-sm ${turno.clase}`}
            disabled={lleno}
            aria-label={`Agregar ${turno.nombre}`}
            onClick={() => onCambiar(actual + turno.letra)}
          >
            <span className="font-mono font-semibold">{turno.letra}</span>
            <span className="text-xs">{turno.nombre}</span>
          </button>
        ))}
        <Boton
          tamano="sm"
          motivoDeshabilitado={!actual ? "El patrón está vacío." : null}
          aria-label="Borrar la última letra"
          onClick={() => onCambiar(actual.slice(0, -1))}
        >
          ⌫
        </Boton>
        <Boton
          variante="enlace"
          tamano="sm"
          motivoDeshabilitado={!actual ? "El patrón está vacío." : null}
          onClick={() => onCambiar("")}
        >
          Limpiar
        </Boton>
      </div>

      <div
        id={id}
        className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-base-300 px-3 py-2"
      >
        <FichasPatron patron={actual} />
        <span className="ml-auto text-xs text-app-muted">
          {actual.length} de {MAXIMO_PATRON}
        </span>
      </div>

      {error ? (
        <span className="text-sm text-error">{error}</span>
      ) : (
        <span className="text-xs text-app-muted">
          {actual
            ? `Se repite: ${secuenciaPatron(actual)}.`
            : "De 2 a 14 turnos que se repiten. La propuesta del mes lo sigue."}
        </span>
      )}
    </div>
  );
};

export default ConstructorPatron;
