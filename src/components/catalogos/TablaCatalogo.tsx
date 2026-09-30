/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: TablaCatalogo.tsx
 * Responsabilidad: Tabla genérica de un catálogo, con alta, edición y baja lógica.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06 · buscador y densidad del sistema el 2026-09-03
 *
 * Sirve a tipos de control y a instituciones; los puntos de encuentro tienen su propio
 * panel porque se agrupan por zonal (`PanelPuntosEncuentro`).
 *
 * EL BUSCADOR ES EL MISMO DE LOS PUNTOS, y llegó tarde a propósito de nadie: el panel de
 * puntos lo tenía desde M-28 y estas dos tablas no, de modo que buscar «HCAM» funcionaba
 * en un catálogo y en los otros dos obligaba a leer. INSPECCIONES tiene 22 tipos de
 * control. Mismo control, misma comparación sin tildes, mismo contador.
 *
 * La búsqueda necesita texto y las columnas pintan nodos, así que el texto lo entrega
 * quien usa la tabla (`textoDe`): la tabla no adivina qué campos son buscables.
 */

import { useMemo, useState, type ReactNode } from "react";

import PanelCatalogo from "./PanelCatalogo.tsx";
import Iconos from "../common/Iconos.tsx";
import { normalizar } from "../../utils/texto.util.ts";

/**
 * Un valor de catálogo, sea del tipo que sea. Todos tienen identificador, y en el camino
 * de administración (PV-36) traen `activo`: si es `false`, la fila está desactivada y su
 * acción es reactivarla.
 */
export interface FilaCatalogo {
  id: number;
  activo?: boolean;
}

export interface ColumnaCatalogo<T extends FilaCatalogo> {
  titulo: string;
  valor: (fila: T) => ReactNode;
}

type TablaCatalogoProps<T extends FilaCatalogo> = {
  titulo: string;
  filas: T[];
  columnas: ColumnaCatalogo<T>[];
  cargando: boolean;
  procesando: boolean;
  mensajeVacio: string;
  /** Texto por el que se busca una fila. Sin él, la tabla no ofrece buscador. */
  textoDe?: (fila: T) => string;
  onAgregar: () => void;
  onEditar: (fila: T) => void;
  onDesactivar: (fila: T) => void;
  /** PV-36. Sin él, la tabla es de solo-vigentes y no ofrece reactivar. */
  onActivar?: (fila: T) => void;
  /**
   * BAJA FÍSICA (2026-09-24). Sin él, la tabla no ofrece «Eliminar». El servidor solo lo
   * permite si el valor nunca se usó; si está en uso, responde 409 y hay que desactivar.
   */
  onEliminar?: (fila: T) => void;
};

const TablaCatalogo = <T extends FilaCatalogo>({
  titulo,
  filas,
  columnas,
  cargando,
  procesando,
  mensajeVacio,
  textoDe,
  onAgregar,
  onEditar,
  onDesactivar,
  onActivar,
  onEliminar,
}: TablaCatalogoProps<T>) => {
  const [busqueda, setBusqueda] = useState("");
  const termino = normalizar(busqueda);

  const visibles = useMemo(
    () =>
      !termino || !textoDe
        ? filas
        : filas.filter((fila) => normalizar(textoDe(fila)).includes(termino)),
    [filas, termino, textoDe],
  );

  // El contador dice cuántas están vigentes, y cuántas desactivadas si las hay. Sin el
  // camino de administración —cuando ningún valor trae `activo`— todas son vigentes.
  const vigentes = filas.filter((fila) => fila.activo !== false).length;
  const inactivas = filas.length - vigentes;
  const conteo =
    inactivas > 0 ? `${vigentes} vigentes · ${inactivas} inactivas` : `${vigentes} vigentes`;

  return (
    <PanelCatalogo
      titulo={titulo}
      distintivo={
        <span className="badge badge-ghost badge-sm">
          {cargando ? "Cargando…" : conteo}
        </span>
      }
      procesando={procesando}
      onAgregar={onAgregar}
    >
      {textoDe && filas.length > 0 && (
        <div className="flex flex-col gap-1 px-1 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            className="input input-bordered input-sm w-full sm:max-w-md"
            placeholder={`Buscar en ${titulo.toLowerCase()}…`}
            aria-label={`Buscar en ${titulo.toLowerCase()}`}
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          {termino !== "" && (
            <span
              className="text-xs text-base-content/70"
              role="status"
            >
              {visibles.length} de {filas.length}
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        {/*
          `app-data-table` es lo que ata la altura de fila a la densidad del sistema
          (`--app-table-row-padding-y`). Antes llevaba un `py-1` a mano, más apretado
          que todas las demás tablas de la aplicación sin que nadie lo decidiera.
        */}
        <table className="app-data-table table table-sm table-zebra">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-base-content/70">
              {columnas.map((columna) => (
                <th
                  key={columna.titulo}
                  scope="col"
                >
                  {columna.titulo}
                </th>
              ))}
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td
                  colSpan={columnas.length + 1}
                  className="px-3 py-6 text-center text-sm text-base-content/70"
                >
                  {cargando
                    ? "Cargando el catálogo…"
                    : termino !== ""
                      ? `Nada coincide con «${busqueda.trim()}».`
                      : mensajeVacio}
                </td>
              </tr>
            ) : (
              visibles.map((fila) => {
                const desactivada = fila.activo === false;
                return (
                  <tr
                    key={fila.id}
                    className="hover:bg-primary/5"
                  >
                    {columnas.map((columna, indice) => (
                      <td
                        key={columna.titulo}
                        // La fila desactivada se atenúa —pero NO solo con color: la
                        // primera celda lleva el distintivo «inactivo» en palabras
                        // (regla 6)—.
                        className={`px-3 align-top${desactivada ? " opacity-55" : ""}`}
                      >
                        {columna.valor(fila)}
                        {indice === 0 && desactivada && (
                          <span className="badge badge-ghost badge-sm ml-2">
                            inactivo
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => onEditar(fila)}
                          disabled={procesando}
                        >
                          <Iconos nombre="editar" />
                          Editar
                        </button>
                        {desactivada ? (
                          /*
                            PV-36. La misma columna que retira es la que devuelve: un valor
                            desactivado se vuelve a ofrecer. El icono es un giro de vuelta y
                            el color pasa a `success` —lo que estaba apagado se enciende—.
                          */
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-success"
                            onClick={() => onActivar?.(fila)}
                            disabled={procesando || !onActivar}
                          >
                            <Iconos nombre="activar" />
                            Activar
                          </button>
                        ) : (
                          /*
                            Dice «Desactivar» y no «Eliminar», porque es lo que hace: RF-058
                            e INV-22. Un botón que promete borrar y desactiva enseña al
                            administrador a desconfiar de lo que lee.
                          */
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => onDesactivar(fila)}
                            disabled={procesando}
                          >
                            <Iconos nombre="desactivar" />
                            Desactivar
                          </button>
                        )}
                        {/*
                          ELIMINAR (baja física). Solo si el valor NUNCA se usó; el servidor
                          lo hace cumplir y responde 409 con el motivo si está en uso, que se
                          muestra tal cual. Distinto de «Desactivar», que conserva el historial.
                        */}
                        {onEliminar && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => onEliminar(fila)}
                            disabled={procesando}
                            title="Eliminar definitivamente. Solo se puede si nunca se usó en un operativo."
                          >
                            <Iconos nombre="eliminar" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </PanelCatalogo>
  );
};

export default TablaCatalogo;
