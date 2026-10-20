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
 * REDISEÑO DEL PASO 1 (2026-09-30, ampliado el 2026-10-08).
 *
 *   · Una línea «N resultados · M ya tienen {ficha|cuenta}». Cada fila es un botón con radio
 *     visual; se ELIGE (borde azul + ✓) y el botón de avanzar vive en el pie del cajón. Con
 *     `onAvanzar`, el DOBLE CLIC elige y avanza de una vez.
 *   · Para la FICHA (`proposito.ocultaQuienesLoTienen`): quien ya la tiene VIGENTE se oculta por
 *     omisión y la línea dice «(ocultos)»; la casilla «Mostrar quienes ya tienen ficha» los trae,
 *     atenuados y sin poder elegirlos. Una ficha DADA DE BAJA se ve siempre, con su distintivo, y
 *     tampoco se elige: se reactiva desde el maestro. Ver `tieneFichaActiva`.
 *   · Para la FICHA también hay chips por DEPENDENCIA (Todas + las que traiga Auth).
 *   · La CUENTA (P-11) conserva su comportamiento: nada se oculta y no hay chips.
 *   · Estado vacío / Auth caído con salida a «Registro manual» (estilo enlace).
 *
 * Es GENÉRICO por `proposito`: cambian las palabras y a qué campo mira, no la mecánica. El motivo
 * de un impedimento se muestra tal cual (regla 7).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, type FC } from "react";

import Boton from "../common/Boton.tsx";
import Iconos from "../common/Iconos.tsx";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { PropositoDirectorio } from "./propositoDirectorio.ts";
import { normalizar } from "../../utils/texto.util.ts";
import { rotuloDeDependencia } from "../../utils/personal.util.ts";

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
  /** Doble clic: elige y pasa al paso 2. Sin él, el doble clic solo elige. */
  onAvanzar?: (fila: FilaDirectorio) => void;
  onRegistroManual: () => void;
  /**
   * La búsqueda la conserva el contenedor (2026-10-08): «Cambiar» en el paso 2 vuelve aquí con lo
   * que se había escrito, y «Actualizar» no la borra. Sin ellas, el paso la guarda por su cuenta.
   */
  busqueda?: string;
  onBuscar?: (texto: string) => void;
};

/** Busca sobre lo que la fila enseña: cédula, nombre, usuario, correo y dependencia. Sin tildes. */
const coincide = (fila: FilaDirectorio, texto: string): boolean =>
  normalizar(
    [fila.cedula, fila.nombre, fila.usuario, fila.correo, fila.dependencia ?? ""].join(
      " ",
    ),
  ).includes(texto);

const TODAS = "";

const PasoBuscarPersona: FC<PasoBuscarPersonaProps> = ({
  proposito,
  filas,
  disponible,
  motivo,
  cargando,
  onActualizar,
  elegidaId,
  onSeleccionar,
  onAvanzar,
  onRegistroManual,
  busqueda: busquedaExterna,
  onBuscar,
}) => {
  const [busquedaPropia, setBusquedaPropia] = useState("");
  const busqueda = busquedaExterna ?? busquedaPropia;
  const buscar = onBuscar ?? setBusquedaPropia;

  const [dependencia, setDependencia] = useState<string>(TODAS);
  const [mostrarConFicha, setMostrarConFicha] = useState(false);

  /** Las dependencias distintas que trae Auth, en orden alfabético. */
  const dependencias = useMemo(
    () =>
      [
        ...new Set(
          filas
            .map((fila) => fila.dependencia)
            .filter((valor): valor is string => Boolean(valor)),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [filas],
  );

  /** Lo que coincide con la búsqueda y el chip, antes de ocultar a quien ya lo tiene. */
  const coincidentes = useMemo(() => {
    const texto = normalizar(busqueda);
    return filas.filter(
      (fila) =>
        (texto === "" || coincide(fila, texto)) &&
        (!proposito.porDependencia ||
          dependencia === TODAS ||
          fila.dependencia === dependencia),
    );
  }, [filas, busqueda, dependencia, proposito]);

  /** Quien ya lo tiene VIGENTE: lo que se oculta (ficha) y lo que cuenta «M ya tienen». */
  const vigentes = useMemo(
    () => coincidentes.filter((fila) => proposito.loSuyo(fila)?.activo === true),
    [coincidentes, proposito],
  );

  const ocultando = proposito.ocultaQuienesLoTienen && !mostrarConFicha;

  const visibles = useMemo(() => {
    const base = ocultando
      ? coincidentes.filter((fila) => proposito.loSuyo(fila)?.activo !== true)
      : coincidentes;
    // Quienes YA lo tienen van AL FINAL. `sort` es estable: el resto conserva el orden del servidor.
    return [...base].sort(
      (a, b) =>
        (proposito.loSuyo(a) != null ? 1 : 0) -
        (proposito.loSuyo(b) != null ? 1 : 0),
    );
  }, [coincidentes, ocultando, proposito]);

  /** En la cuenta se cuentan todos los que la tienen (vigente o no), como antes. */
  const yaLoTienen = proposito.ocultaQuienesLoTienen
    ? vigentes.length
    : coincidentes.filter((fila) => proposito.loSuyo(fila) != null).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="input input-bordered flex w-full items-center gap-2">
          <Iconos nombre="buscar" />
          <input
            type="search"
            // Autofoco: el paso 1 se abre para buscar; el operador teclea sin tocar el ratón.
            autoFocus
            aria-label="Buscar en el directorio de Auth"
            className="min-w-0 flex-1"
            placeholder="Cédula, nombre o correo…"
            value={busqueda}
            onChange={(evento) => buscar(evento.target.value)}
          />
        </label>
        <Boton
          tamano="sm"
          icono="actualizar"
          aria-label="Actualizar el directorio"
          title="Vuelve a consultar Auth central"
          onClick={onActualizar}
        >
          Actualizar
        </Boton>
      </div>

      {proposito.porDependencia && dependencias.length > 0 && (
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Filtrar por dependencia"
        >
          {[TODAS, ...dependencias].map((valor) => {
            const activa = dependencia === valor;
            return (
              <button
                key={valor || "todas"}
                type="button"
                aria-pressed={activa}
                title={valor || undefined}
                onClick={() => setDependencia(valor)}
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`btn btn-sm rounded-full ${activa ? "btn-primary" : "btn-outline"}`}
              >
                {valor ? rotuloDeDependencia(valor) : "Todas"}
              </button>
            );
          })}
        </div>
      )}

      {cargando ? (
        <p className="px-1 py-2 text-sm text-app-muted">Buscando…</p>
      ) : !disponible ? (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-sm text-app-muted">
            {motivo ?? "El directorio de Auth no está disponible ahora."}
          </p>
          <Boton
            variante="enlace"
            tamano="sm"
            className="self-start"
            onClick={onRegistroManual}
          >
            ¿No aparece? Registro manual
          </Boton>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-sm text-app-muted">
              {visibles.length} resultados · {yaLoTienen} ya tienen{" "}
              {proposito.nombre}
              {ocultando && yaLoTienen > 0 ? " (ocultos)" : ""}
            </p>
            {proposito.ocultaQuienesLoTienen && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={mostrarConFicha}
                  onChange={(evento) => setMostrarConFicha(evento.target.checked)}
                />
                Mostrar quienes ya tienen {proposito.nombre}
              </label>
            )}
          </div>

          {visibles.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="px-1 text-sm text-app-muted">
                Ninguna persona coincide con la búsqueda.
              </p>
              <Boton
                variante="enlace"
                tamano="sm"
                className="self-start"
                onClick={onRegistroManual}
              >
                ¿No aparece? Registro manual
              </Boton>
            </div>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
                      onDoubleClick={() => {
                        if (bloqueada) return;
                        onSeleccionar(fila);
                        onAvanzar?.(fila);
                      }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left ${
                        seleccionada
                          ? "border-2 border-primary bg-primary/5"
                          : "border-b border-base-300 hover:bg-base-200"
                      } ${bloqueada ? "text-app-disabled" : ""}`}
                    >
                      {/* Radio visual con borde de contraste; ✓ dentro cuando está elegida. */}
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          seleccionada
                            ? "border-primary bg-primary text-primary-content"
                            : "border-base-300"
                        }`}
                      >
                        {seleccionada && <Iconos nombre="check" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold">{fila.nombre}</span>
                        <span className="text-xs text-app-muted">
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
                        <span className="badge badge-ghost badge-sm whitespace-nowrap">
                          {distintivo}
                        </span>
                      )}
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
