/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: RosterPatrulla.tsx
 * Responsabilidad: Editar el personal de una patrulla (Form 5/6): cambiar y agregar personas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-18
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PATRULLA ES UN GRUPO DE OPERATIVOS DE UNA PERSONA, cada uno con su código por área
 * (IGNECU/ITNECU/INECU). Al pulsar «Editar», el REGISTRANTE ve a toda su gente y, sobre la
 * que él creó (Inspector General y Técnico), puede:
 *   · CAMBIAR la persona CONSERVANDO el código —el servidor exige la MISMA área— (RF-063).
 *   · QUITARLA (retira ese código de la patrulla).
 *   · AGREGAR una persona nueva: nace como un código más de SU área en la misma patrulla.
 *
 * La persona que aporta el DMIT (INECU) se muestra en LECTURA: la gestiona su departamento
 * (cada departamento su gente). El servidor reafirma todo con 403/reglas de composición.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import Boton from "../common/Boton.tsx";
import type { Operativo, PersonaAsignada } from "../../interfaces/Operativo.ts";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../../interfaces/Personal.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import { NOMBRE_AREA } from "../../utils/personal.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

/** Un código de la patrulla: su operativo de una persona y si quien mira lo puede tocar. */
export type MiembroPatrulla = {
  operativo: Operativo;
  persona: PersonaAsignada;
  /** El que mira creó este código (Inspector General/Técnico): puede cambiar o quitar. */
  editable: boolean;
};

type RosterPatrullaProps = {
  miembros: MiembroPatrulla[];
  candidatos: PersonaElegible[];
  /** Reemplaza a la persona del código conservándolo (misma área). */
  onCambiar: (operativoId: number, funcionarioId: number) => void;
  /** Quita el código de la patrulla. */
  onQuitar: (operativo: Operativo) => void;
  /** Agrega una persona nueva: nace como un código más de su área en la misma patrulla. */
  onAgregar: (funcionarioId: number) => void;
  /** Rechazo del servidor (misma área, descanso, cupo…). Se muestra tal cual. */
  aviso: string | null;
  bloqueado: boolean;
};

const RosterPatrulla: FC<RosterPatrullaProps> = ({
  miembros,
  candidatos,
  onCambiar,
  onQuitar,
  onAgregar,
  aviso,
  bloqueado,
}) => {
  /** Candidatos de un área concreta: «Cambiar» exige que la persona nueva sea de esa área. */
  const deArea = (area: AreaPersonal) =>
    candidatos.filter((persona) => persona.area === area);

  /** «Agregar» ofrece a los inspectores del registrante (no Instrucción, que aporta el DMIT). */
  const paraAgregar = candidatos.filter(
    (persona) => persona.area !== "INSTRUCCION",
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="app-modules-modal-label label-text">
        Personal de la patrulla
      </span>

      {aviso && (
        <AvisoEnLinea variante="error">{aviso}</AvisoEnLinea>
      )}

      <ul className="flex flex-col gap-2">
        {miembros.map(({ operativo, persona, editable }) => (
          <li
            key={operativo.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-base-300 px-3 py-2"
          >
            <span className="badge badge-ghost badge-sm">
              {NOMBRE_AREA[persona.area as AreaPersonal]}
            </span>
            <span className="font-mono text-xs">{operativo.identificador}</span>
            <span className="min-w-0 flex-1 truncate">{persona.nombre}</span>

            {editable ? (
              <>
                {/*
                  «Cambiar por…» ofrece SOLO personas de la misma área: es lo que el servidor
                  exige para conservar el código. Al elegir se aplica y el selector vuelve a su
                  marcador.
                */}
                <select
                  aria-label={`Cambiar a ${persona.nombre}`}
                  className="select select-bordered select-sm"
                  value=""
                  disabled={bloqueado}
                  onChange={(evento) => {
                    const id = Number(evento.target.value);
                    if (id) onCambiar(operativo.id, id);
                    evento.target.value = "";
                  }}
                >
                  <option value="">Cambiar por…</option>
                  {deArea(persona.area as AreaPersonal).map((candidato) => (
                    <option
                      key={candidato.id}
                      value={candidato.id}
                    >
                      {nombreDePersona(candidato)}
                    </option>
                  ))}
                </select>
                <Boton
                  variante="peligro"
                  tamano="sm"
                  icono="desactivar"
                  aria-label={`Quitar a ${persona.nombre}`}
                  deshabilitado={bloqueado}
                  onClick={() => onQuitar(operativo)}
                >
                  Quitar
                </Boton>
              </>
            ) : (
              <span className="text-xs text-app-muted">
                La gestiona su departamento
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* AGREGAR una persona nueva: nace como un código más de su área en esta patrulla. */}
      <label className="flex flex-wrap items-center gap-2">
        <span className="label-text">Agregar persona</span>
        <select
          aria-label="Agregar persona a la patrulla"
          className="select select-bordered select-sm"
          value=""
          disabled={bloqueado}
          onChange={(evento) => {
            const id = Number(evento.target.value);
            if (id) onAgregar(id);
            evento.target.value = "";
          }}
        >
          <option value="">Elegir persona…</option>
          {paraAgregar.map((candidato) => (
            <option
              key={candidato.id}
              value={candidato.id}
            >
              {NOMBRE_AREA[candidato.area]} · {nombreDePersona(candidato)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default RosterPatrulla;
