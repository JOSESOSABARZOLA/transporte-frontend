/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Alta desde el directorio de Auth central
 * Archivo: PasoBuscarPersona.tsx
 * Responsabilidad: Paso 1 del alta — buscar a la persona en el directorio de Auth y elegirla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REDISEÑO DEL PASO 1 (2026-09-30). Sustituye la lista de tarjetas del modal.
 *
 *   · Sin el interruptor «Solo quienes no tienen ficha» ni los recuentos duplicados: una sola
 *     línea «N resultados · M ya tienen {ficha|cuenta}».
 *   · Cada fila es un botón con radio visual; se ELIGE, no se «crea» desde la fila. El botón de
 *     avanzar vive en el pie del cajón.
 *   · Quien ya lo tiene aparece deshabilitado con su distintivo; sin roles de Auth a la vista.
 *   · Estado vacío / Auth caído con salida a «Registro manual».
 *
 * Es GENÉRICO por `proposito` (P-07 ficha, P-11 cuenta): cambian las palabras y a qué campo mira,
 * no la mecánica. El motivo de un impedimento se muestra tal cual (regla 7).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, type FC } from "react";

import Iconos from "../common/Iconos.tsx";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { PropositoDirectorio } from "./propositoDirectorio.ts";
import { normalizar } from "../../utils/texto.util.ts";

type PasoBuscarPersonaProps = {
  proposito: PropositoDirectorio;
  filas: FilaDirectorio[];
  disponible: boolean;
  /** Redactado por el servidor cuando Auth no está. Se muestra tal cual (regla 7). */
  motivo: string | null;
  cargando: boolean;
  onActualizar: () => void;
  /** `authId` de la fila elegida, o `null`. La selección la conserva el contenedor. */
  elegidaId: number | null;
  onSeleccionar: (fila: FilaDirectorio) => void;
  onRegistroManual: () => void;
};

/** Busca sobre lo que la fila enseña: cédula, nombre, usuario, correo y dependencia. Sin tildes. */
const coincide = (fila: FilaDirectorio, texto: string): boolean =>
  normalizar(
    [fila.cedula, fila.nombre, fila.usuario, fila.correo, fila.dependencia ?? ""].join(
      " ",
    ),
  ).includes(texto);

const PasoBuscarPersona: FC<PasoBuscarPersonaProps> = ({
  proposito,
  filas,
  disponible,
  motivo,
  cargando,
  onActualizar,
  elegidaId,
  onSeleccionar,
  onRegistroManual,
}) => {
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);
    return texto === "" ? filas : filas.filter((fila) => coincide(fila, texto));
  }, [filas, busqueda]);

  const yaLoTienen = useMemo(
    () => visibles.filter((fila) => proposito.loSuyo(fila) != null).length,
    [visibles, proposito],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          // Autofoco: el paso 1 se abre para buscar; el operador teclea sin tocar el ratón.
          autoFocus
          aria-label="Buscar en el directorio de Auth"
          className="input input-bordered input-sm w-full"
          placeholder="Cédula, nombre, correo o dependencia…"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onActualizar}
        >
          Actualizar
        </button>
      </div>

      {cargando ? (
        <p className="px-1 py-2 text-sm text-base-content/70">Buscando…</p>
      ) : !disponible ? (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-sm text-base-content/70">
            {motivo ?? "El directorio de Auth no está disponible ahora."}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm self-start"
            onClick={onRegistroManual}
          >
            ¿No aparece? Registro manual
          </button>
        </div>
      ) : (
        <>
          <p className="px-1 text-sm text-base-content/70">
            {visibles.length} resultados · {yaLoTienen} ya tienen{" "}
            {proposito.nombre}
          </p>

          {visibles.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="px-1 text-sm text-base-content/70">
                Ninguna persona coincide con la búsqueda.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm self-start"
                onClick={onRegistroManual}
              >
                ¿No aparece? Registro manual
              </button>
            </div>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {visibles.map((fila) => {
                const suyo = proposito.loSuyo(fila);
                const impedimento = proposito.impedimento(fila);
                const bloqueada = suyo != null || impedimento != null;
                const seleccionada = fila.authId === elegidaId;
                const distintivo = suyo
                  ? suyo.activo
                    ? proposito.yaTiene
                    : proposito.dadoDeBaja
                  : null;

                return (
                  <li key={fila.authId}>
                    <button
                      type="button"
                      disabled={bloqueada}
                      aria-pressed={seleccionada}
                      onClick={() => onSeleccionar(fila)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${
                        seleccionada ? "bg-primary/5" : "hover:bg-primary/5"
                      }`}
                    >
                      {/* Radio visual: punto lleno cuando está elegida (más el `aria-pressed`). */}
                      <span
                        aria-hidden="true"
                        className={`badge badge-xs ${seleccionada ? "badge-primary" : "badge-ghost"}`}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium">{fila.nombre}</span>
                        <span className="text-xs text-base-content/70">
                          <span className="font-mono">
                            {fila.cedula || "Sin cédula en Auth"}
                          </span>
                          {fila.dependencia ? ` · ${fila.dependencia}` : ""}
                        </span>
                        {impedimento && (
                          <span className="text-xs text-warning">
                            {impedimento}
                          </span>
                        )}
                      </span>
                      {distintivo && (
                        <span className="badge badge-ghost badge-sm">
                          {distintivo}
                        </span>
                      )}
                      {seleccionada && <Iconos nombre="check" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default PasoBuscarPersona;
