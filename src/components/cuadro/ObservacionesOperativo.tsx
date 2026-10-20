/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: ObservacionesOperativo.tsx
 * Responsabilidad: Las observaciones del operativo como notas: agregar, corregir y quitar las de la
 *                  sesión, y mostrar en lectura las ya guardadas. Igual en el alta y en el cajón.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUSTITUYE A `CapturadorNotas` Y AL `textarea` DEL ALTA (2026-10-16). Las observaciones siguen
 * siendo NOTAS independientes (bitácora, 2026-09-09): se teclea una y se Agrega. Lo nuevo es que
 * una nota AGREGADA y aún no guardada se puede CORREGIR —«me faltó una palabra»— en línea, o
 * quitar. Es solo interfaz: lo que viaja al servidor no cambia.
 *
 *   · Las ya guardadas (en el cajón de edición) siguen en SOLO LECTURA, con su autor y fecha: no se
 *     editan ni se borran, quedan como constancia.
 *   · Una nota en edición a la vez. Enter guarda, Mayús+Enter salta de línea, Escape cancela.
 *     Como aún no se guardó, corregirla no la marca «editada».
 *   · Lo escrito sin agregar (`pendiente`) lo controla quien monta el componente: al registrar o
 *     guardar se suma solo (`conNotaPendiente`), para que una nota tecleada no se pierda.
 *
 * Solo clases del inventario (regla 1): `input input-bordered`, `textarea textarea-bordered`,
 * `border-primary`, `border-base-300`, `bg-base-200/40`, `<Boton>`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC, type KeyboardEvent } from "react";

import Boton from "../common/Boton.tsx";
import type { RolDepartamental } from "../../config/env.ts";
import type { ObservacionOperativo } from "../../interfaces/Operativo.ts";
import {
  agregarNota,
  editarNota,
  fechaDeNota,
  horasAlineadas,
  quitarNota,
  type NotasDeSesion,
} from "../../utils/notasOperativo.util.ts";
import { NOMBRE_DIRECCION } from "../../utils/personal.util.ts";

/** El departamento que escribió una nota guardada, en palabras. Si no se reconoce, el código. */
const autorDe = (rol: string): string =>
  NOMBRE_DIRECCION[rol as RolDepartamental] ?? rol;

type Props = {
  /** Las notas de la sesión, aún no guardadas. */
  notas: string[];
  /** La hora en que se agregó cada una (alineada por posición). */
  horas?: (string | null)[];
  onCambio: (sesion: NotasDeSesion) => void;
  /** Lo escrito en el campo y aún no agregado. */
  pendiente: string;
  onPendienteCambio: (texto: string) => void;
  /** Las ya guardadas (bitácora), en solo lectura. Solo en el cajón de edición. */
  guardadas?: ObservacionOperativo[];
  /** Quién escribe en esta sesión: el autor de las notas nuevas. */
  autor: string;
  deshabilitado?: boolean;
  /**
   * EN EL CAJÓN DE EDICIÓN cada nota nueva se marca «nueva, sin guardar» para distinguirla de la
   * bitácora de arriba, que ya está guardada. En el alta todo es nuevo y el rótulo sobraría.
   */
  distinguirNuevas?: boolean;
  /** Para las pruebas: el reloj con que se fecha cada nota agregada. */
  ahora?: () => Date;
};

const ObservacionesOperativo: FC<Props> = ({
  notas,
  horas,
  onCambio,
  pendiente,
  onPendienteCambio,
  guardadas = [],
  autor,
  deshabilitado = false,
  distinguirNuevas = false,
  ahora = () => new Date(),
}) => {
  // La nota que se está corrigiendo (una a la vez) y su texto en curso.
  const [editando, setEditando] = useState<number | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");

  const sesion: NotasDeSesion = { notas, horas: horasAlineadas(notas, horas) };

  const agregar = (): void => {
    if (pendiente.trim() === "") return;
    onCambio(agregarNota(sesion, pendiente, ahora()));
    onPendienteCambio("");
  };

  const empezarEdicion = (indice: number): void => {
    setEditando(indice);
    setTextoEdicion(notas[indice] ?? "");
  };

  const cancelarEdicion = (): void => {
    setEditando(null);
    setTextoEdicion("");
  };

  const guardarEdicion = (): void => {
    if (editando === null || textoEdicion.trim() === "") return;
    onCambio(editarNota(sesion, editando, textoEdicion));
    cancelarEdicion();
  };

  const quitar = (indice: number): void => {
    if (editando === indice) cancelarEdicion();
    else if (editando !== null && indice < editando) setEditando(editando - 1);
    onCambio(quitarNota(sesion, indice));
  };

  const teclaEdicion = (evento: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Enter guarda sin enviar el formulario; Mayús+Enter es un salto de línea.
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      guardarEdicion();
    } else if (evento.key === "Escape") {
      // Escape cancela SOLO la corrección: no debe llegar al cajón, que se cerraría.
      evento.preventDefault();
      evento.stopPropagation();
      cancelarEdicion();
    }
  };

  return (
    <div className="form-control w-full">
      <label className="label" htmlFor="observacion-nueva">
        <span className="label-text">Observaciones</span>
      </label>

      {/* Las ya guardadas: bitácora en solo lectura, con quién y cuándo. */}
      {guardadas.length > 0 && (
        <ul
          aria-label="Observaciones guardadas"
          className="mb-2 flex max-h-32 flex-col gap-1 overflow-y-auto"
        >
          {guardadas.map((nota, indice) => (
            <li
              key={indice}
              className="rounded-md border border-base-300 bg-base-200/40 px-3 py-1"
            >
              <span className="whitespace-pre-line text-sm">{nota.texto}</span>
              <span className="block text-xs text-app-muted">
                {autorDe(nota.creadoPorRol)} · {fechaDeNota(nota.creadoEn)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Las de la sesión: aún no guardadas, se corrigen o se quitan. */}
      {notas.length > 0 && (
        <ul aria-label="Observaciones por guardar" className="mb-2 flex flex-col gap-1">
          {notas.map((texto, indice) => {
            const hora = sesion.horas[indice];
            const pie = hora ? `${autor} · ${fechaDeNota(hora)}` : autor;

            if (editando === indice) {
              return (
                <li
                  key={indice}
                  className="flex flex-col gap-2 rounded-md border border-base-300 px-3 py-2"
                >
                  <textarea
                    aria-label={`Corregir la nota: ${texto}`}
                    className="textarea textarea-bordered w-full border-primary"
                    rows={2}
                    maxLength={2000}
                    // Se abre para corregir: el foco va al texto, que es lo que se va a tocar.
                    autoFocus
                    value={textoEdicion}
                    onChange={(evento) => setTextoEdicion(evento.target.value)}
                    onKeyDown={teclaEdicion}
                  />
                  <div className="flex justify-end gap-2">
                    <Boton tamano="sm" onClick={cancelarEdicion}>
                      Cancelar
                    </Boton>
                    <Boton
                      variante="primario"
                      tamano="sm"
                      deshabilitado={textoEdicion.trim() === ""}
                      motivoDeshabilitado={
                        textoEdicion.trim() === "" ? "La nota no puede quedar vacía" : null
                      }
                      onClick={guardarEdicion}
                    >
                      Guardar
                    </Boton>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={indice}
                className="flex items-start gap-2 rounded-md border border-base-300 px-3 py-1"
              >
                <div className="min-w-0 flex-1">
                  <span className="whitespace-pre-line text-sm">{texto}</span>
                  <span className="block text-xs text-app-muted">{pie}</span>
                </div>
                {distinguirNuevas && (
                  <span className="badge badge-warning badge-sm shrink-0">
                    nueva, sin guardar
                  </span>
                )}
                <Boton
                  tamano="sm"
                  icono="editar"
                  aria-label={`Editar la nota: ${texto}`}
                  deshabilitado={deshabilitado || editando !== null}
                  motivoDeshabilitado={
                    editando !== null ? "Termine primero la nota que está corrigiendo" : null
                  }
                  onClick={() => empezarEdicion(indice)}
                >
                  Editar
                </Boton>
                <Boton
                  variante="peligro"
                  tamano="sm"
                  icono="cerrar"
                  aria-label={`Quitar la nota: ${texto}`}
                  deshabilitado={deshabilitado}
                  onClick={() => quitar(indice)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          id="observacion-nueva"
          aria-label="Observaciones"
          className="input input-bordered w-full min-w-0"
          placeholder="Escriba una nota y pulse Agregar"
          maxLength={2000}
          value={pendiente}
          disabled={deshabilitado}
          onChange={(evento) => onPendienteCambio(evento.target.value)}
          onKeyDown={(evento) => {
            // Enter agrega la nota sin enviar el formulario.
            if (evento.key === "Enter") {
              evento.preventDefault();
              agregar();
            }
          }}
        />
        <Boton
          tamano="sm"
          deshabilitado={deshabilitado || pendiente.trim() === ""}
          onClick={agregar}
        >
          Agregar
        </Boton>
      </div>
    </div>
  );
};

export default ObservacionesOperativo;
