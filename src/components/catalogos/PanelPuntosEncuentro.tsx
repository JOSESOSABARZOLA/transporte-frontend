/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: PanelPuntosEncuentro.tsx
 * Responsabilidad: Administrar zonales y sus puntos de encuentro, en una sola tabla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN PUNTO DE ENCUENTRO NO ES UN ELEMENTO DE UNA LISTA: ES UN LUGAR DENTRO DE UNA ZONAL.
 *
 * Los puntos no se listan en plano —el formulario 7 tiene 34 puntos en 10 zonales—: se
 * agrupan por zonal, que es como se usan. La pregunta de quien administra es «¿qué ofrece
 * Quitumbe?», y se contesta abriendo Quitumbe.
 *
 * DESDE EL 2026-09-04 TODO VIVE EN UNA SOLA TABLA: «ZONALES DEL CUADRO». Cada zonal es una
 * fila; se administra ahí (renombrar, desactivar, reactivar) y su botón «Ver» despliega sus
 * puntos de encuentro en una tabla, desde la que se agrega uno más. La zonal es global
 * —transversal a los nueve formularios— y el punto es de este formulario; conviven aquí
 * porque el punto no existe sin su zonal. Por eso el «Agregar» de puntos ya no está en la
 * cabecera del panel: vive dentro, situado en la zonal a la que se agrega.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Y LA ZONAL VACÍA SE NOMBRA, QUE ES LA RAZÓN DE SER DE ESTA PANTALLA. La matriz zonal ↔
 * punto no se entregó nunca (PV-01) y se está cargando a mano: lo que falta importa más
 * que lo que hay. Una zonal sin puntos no produce ningún error, simplemente no ofrece nada
 * en la cascada de P-01. Se dice con palabras —en su fila y al pie— y desde ahí se le
 * agrega el primero.
 */

import { useMemo, useState, type FC } from "react";

import PanelCatalogo from "./PanelCatalogo.tsx";
import Iconos from "../common/Iconos.tsx";
import type { PuntoEncuentro, Zonal } from "../../interfaces/Formulario.ts";
import { normalizar } from "../../utils/texto.util.ts";

/** Los puntos cuya zonal no está en el catálogo del formulario. No se ocultan. */
const SIN_ZONAL = -1;

type GrupoZonal = {
  id: number;
  nombre: string;
  puntos: PuntoEncuentro[];
};

type PanelPuntosEncuentroProps = {
  puntos: PuntoEncuentro[];
  zonales: Zonal[];
  cargando: boolean;
  procesando: boolean;
  /** Con zonal, el alta se abre ya situada en ella; sin ella, en la primera. */
  onAgregar: (zonalId: number | null) => void;
  onEditar: (punto: PuntoEncuentro) => void;
  onDesactivar: (punto: PuntoEncuentro) => void;
  /** PV-36. Reactivar un punto desactivado. Sin él, la lista es de solo-vigentes. */
  onActivar?: (punto: PuntoEncuentro) => void;
  /** Baja FÍSICA del punto (2026-09-24). Solo si nunca se usó; si no, el servidor lo bloquea. */
  onEliminar?: (punto: PuntoEncuentro) => void;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * GESTIÓN DEL CATÁLOGO DE ZONALES. 2026-09-04.
   *
   * La zonal dejó de ser un catálogo cerrado: se puede crear, renombrar y desactivar. Vive
   * en la tabla que encabeza el panel, porque la zonal es **global** —transversal a los
   * nueve formularios—, mientras que el punto es de este formulario. El ámbito distrital
   * (DMQ) no se administra —es único y ya existe—, aunque sus puntos sí se ven y editan.
   *
   * Sin estas propiedades, el panel funciona como antes: solo puntos. Las cuatro van
   * juntas o ninguna.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  onAgregarZonal?: () => void;
  onEditarZonal?: (zonal: Zonal) => void;
  onDesactivarZonal?: (zonal: Zonal) => void;
  onActivarZonal?: (zonal: Zonal) => void;
  /** Baja FÍSICA de la zonal (2026-09-24). Solo si nunca se usó y no tiene puntos. */
  onEliminarZonal?: (zonal: Zonal) => void;
};

const contarPuntos = (cuantos: number): string =>
  cuantos === 1 ? "1 punto" : `${cuantos} puntos`;

const PanelPuntosEncuentro: FC<PanelPuntosEncuentroProps> = ({
  puntos,
  zonales,
  cargando,
  procesando,
  onAgregar,
  onEditar,
  onDesactivar,
  onActivar,
  onEliminar,
  onAgregarZonal,
  onEditarZonal,
  onDesactivarZonal,
  onActivarZonal,
  onEliminarZonal,
}) => {
  const [busqueda, setBusqueda] = useState("");

  /**
   * QUÉ ZONAL ESTÁ ABIERTA. Una sola, y por omisión ninguna.
   *
   * DMIT tiene 34 puntos en cada una de las diez zonales: 340 filas seguidas. Con todo
   * desplegado la pregunta de quien administra —«¿qué tiene Quitumbe?»— se contestaba
   * desplazándose. Cerradas, las zonales caben de una vez y se abre la que interesa.
   */
  const [abierta, setAbierta] = useState<number | null>(null);

  // Las zonales mandan el orden —es el del catálogo, no el alfabético—, y dentro de cada
  // una los puntos van por nombre: la lista se lee buscando, no recorriendo.
  const grupos = useMemo<GrupoZonal[]>(() => {
    const ordenados = [...puntos].sort((uno, otro) =>
      uno.nombre.localeCompare(otro.nombre, "es"),
    );

    const porZonal = zonales.map((zonal) => ({
      id: zonal.id,
      nombre: zonal.nombre,
      puntos: ordenados.filter((punto) => punto.zonalId === zonal.id),
    }));

    const huerfanos = ordenados.filter(
      (punto) => !zonales.some((zonal) => zonal.id === punto.zonalId),
    );

    return huerfanos.length === 0
      ? porZonal
      : [
          ...porZonal,
          { id: SIN_ZONAL, nombre: "Sin zonal reconocida", puntos: huerfanos },
        ];
  }, [puntos, zonales]);

  const termino = normalizar(busqueda);

  // Si lo buscado es el nombre de la zonal, se muestra la zonal entera: quien escribe
  // «quitumbe» quiere ver qué tiene Quitumbe, no filtrar dentro.
  const visibles = useMemo(
    () =>
      grupos
        .map((grupo) =>
          !termino || normalizar(grupo.nombre).includes(termino)
            ? grupo
            : {
                ...grupo,
                puntos: grupo.puntos.filter((punto) =>
                  normalizar(punto.nombre).includes(termino),
                ),
              },
        )
        .filter((grupo) => grupo.puntos.length > 0),
    [grupos, termino],
  );

  const mostrados = visibles.reduce(
    (suma, grupo) => suma + grupo.puntos.length,
    0,
  );

  // Con el camino de administración la lista trae desactivados; el contador los separa.
  const vigentes = puntos.filter((punto) => punto.activo !== false).length;
  const inactivos = puntos.length - vigentes;
  const conteo =
    inactivos > 0
      ? `${vigentes} vigentes · ${inactivos} inactivos`
      : `${vigentes} vigentes`;

  // Cada zonal es una fila. Sin búsqueda salen todas —también las vacías, para poder
  // sembrarles el primer punto—; con búsqueda, solo lo que coincide.
  const filas = termino === "" ? grupos : visibles;
  const zonalDe = (id: number): Zonal | undefined =>
    zonales.find((zonal) => zonal.id === id);

  return (
    <PanelCatalogo
      titulo="Puntos de encuentro"
      distintivo={
        <span className="badge badge-ghost badge-sm">
          {cargando ? "Cargando…" : conteo}
        </span>
      }
      procesando={procesando}
    >
      <div className="flex flex-col gap-3 px-1 pt-1">
        {/*
          TABLA ÚNICA: ZONALES DEL CUADRO. Cada zonal es una fila; «Ver» despliega sus
          puntos de encuentro en una tabla, y desde ahí se agrega uno. La tabla SIEMPRE se
          pinta; los botones de gestión de la zonal —«Agregar zonal», «Editar»,
          «Desactivar», «Activar»— solo cuando la pantalla los conecta (van los cuatro
          juntos, y la seña es `onAgregarZonal`).
        */}
        <div className="overflow-hidden rounded-md border border-base-300">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-3 py-2 text-primary-content">
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Zonales del cuadro
            </h3>
            {onAgregarZonal && (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-primary-content"
                onClick={onAgregarZonal}
                disabled={procesando}
              >
                <Iconos nombre="agregar" />
                Agregar zonal
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 p-2">
              {puntos.length > 0 && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    type="search"
                    className="input input-bordered input-sm w-full sm:max-w-md"
                    placeholder="Buscar punto o zonal…"
                    aria-label="Buscar punto o zonal"
                    value={busqueda}
                    onChange={(evento) => setBusqueda(evento.target.value)}
                  />
                  {termino !== "" && (
                    <span
                      className="text-xs text-base-content/70"
                      role="status"
                    >
                      {mostrados} de {contarPuntos(puntos.length)}
                    </span>
                  )}
                </div>
              )}

              {filas.length === 0 ? (
                <p className="py-6 text-center text-sm text-base-content/70">
                  {cargando
                    ? "Cargando el catálogo…"
                    : termino !== ""
                      ? `Ningún punto ni zonal coincide con «${busqueda.trim()}».`
                      : "No hay zonales en el catálogo."}
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {filas.map((grupo) => {
                    // Al buscar se abren solas las que coinciden: si no, escribir
                    // «quitumbe» dejaría la fila cerrada y la búsqueda no serviría.
                    const desplegada = termino !== "" || abierta === grupo.id;
                    const esReal = grupo.id !== SIN_ZONAL;
                    const zonal = esReal ? zonalDe(grupo.id) : undefined;
                    const desactivada = zonal?.activo === false;
                    // Administrable: zonal de verdad y no el ámbito distrital (DMQ).
                    const administrable =
                      esReal && zonal !== undefined && zonal.esDmq !== true;
                    // Un punto no se agrega a una zonal desactivada: primero se reactiva.
                    const puedeAgregarPunto = esReal && !desactivada;

                    return (
                      <li
                        key={grupo.id}
                        className="overflow-hidden rounded-md border border-base-300"
                      >
                        {/*
                          El estado de despliegue se dice con `aria-expanded` y con una
                          palabra —«Ver» u «Ocultar»—, nunca solo con una figura (regla 6).
                          «Ver» va aparte de las acciones de la zonal para no anidar botones.
                        */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5">
                          <span
                            className={`flex min-w-0 items-center gap-2 text-sm font-medium${
                              desactivada ? " opacity-55" : ""
                            }`}
                          >
                            <span className="truncate">{grupo.nombre}</span>
                            {desactivada && (
                              <span className="badge badge-ghost badge-sm normal-case">
                                inactiva
                              </span>
                            )}
                            <span className="badge badge-ghost badge-sm font-normal">
                              {contarPuntos(grupo.puntos.length)}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-wrap gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              aria-expanded={desplegada}
                              aria-label={`${
                                desplegada ? "Ocultar" : "Ver"
                              } puntos de ${grupo.nombre}`}
                              onClick={() =>
                                setAbierta(
                                  abierta === grupo.id ? null : grupo.id,
                                )
                              }
                            >
                              {desplegada ? "Ocultar" : "Ver"}
                            </button>
                            {administrable && onAgregarZonal && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={() =>
                                    zonal && onEditarZonal?.(zonal)
                                  }
                                  disabled={procesando || !onEditarZonal}
                                >
                                  <Iconos nombre="editar" />
                                  Editar
                                </button>
                                {desactivada ? (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs text-success"
                                    onClick={() =>
                                      zonal && onActivarZonal?.(zonal)
                                    }
                                    disabled={procesando || !onActivarZonal}
                                  >
                                    <Iconos nombre="activar" />
                                    Activar
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs text-error"
                                    onClick={() =>
                                      zonal && onDesactivarZonal?.(zonal)
                                    }
                                    disabled={procesando || !onDesactivarZonal}
                                  >
                                    <Iconos nombre="desactivar" />
                                    Desactivar
                                  </button>
                                )}
                                {onEliminarZonal && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs text-error"
                                    onClick={() =>
                                      zonal && onEliminarZonal(zonal)
                                    }
                                    disabled={procesando}
                                    title="Eliminar definitivamente. Solo si nunca se usó y no tiene puntos."
                                  >
                                    <Iconos nombre="eliminar" />
                                    Eliminar
                                  </button>
                                )}
                              </>
                            )}
                          </span>
                        </div>

                        {desplegada && (
                          <div className="flex flex-col gap-2 border-t border-base-300 p-2">
                            {desactivada && (
                              <p className="rounded-md bg-warning/10 px-2 py-1 text-xs text-base-content/80">
                                Zonal desactivada. Reactívela (arriba, en su fila) para
                                poder activar sus puntos.
                              </p>
                            )}

                            {puedeAgregarPunto && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => onAgregar(grupo.id)}
                                  disabled={procesando}
                                >
                                  <Iconos nombre="agregar" />
                                  Agregar punto
                                </button>
                              </div>
                            )}

                            {grupo.puntos.length === 0 ? (
                              <p className="px-1 text-xs text-base-content/70">
                                Sin puntos en esta zonal. Al registrar un operativo aquí,
                                la lista de puntos saldrá vacía.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="app-data-table table table-sm table-zebra">
                                  <thead>
                                    <tr>
                                      <th>Punto de encuentro</th>
                                      <th className="text-right">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {grupo.puntos.map((punto) => {
                                      const desactivado =
                                        punto.activo === false;
                                      return (
                                        <tr key={punto.id}>
                                          <td
                                            className={
                                              desactivado ? "opacity-55" : ""
                                            }
                                          >
                                            {punto.nombre}
                                            {desactivado && (
                                              <span className="badge badge-ghost badge-sm ml-2">
                                                inactivo
                                              </span>
                                            )}
                                          </td>
                                          <td className="text-right">
                                            <span className="flex justify-end gap-1">
                                              <button
                                                type="button"
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => onEditar(punto)}
                                                disabled={procesando}
                                              >
                                                <Iconos nombre="editar" />
                                                Editar
                                              </button>
                                              {desactivado ? (
                                                /*
                                                  PV-36. El punto retirado se vuelve a
                                                  ofrecer, PERO NO SI SU ZONAL ESTÁ
                                                  INACTIVA: primero se reactiva la zonal.
                                                */
                                                <button
                                                  type="button"
                                                  className="btn btn-ghost btn-xs text-success"
                                                  onClick={() =>
                                                    onActivar?.(punto)
                                                  }
                                                  disabled={
                                                    procesando ||
                                                    !onActivar ||
                                                    desactivada
                                                  }
                                                >
                                                  <Iconos nombre="activar" />
                                                  Activar
                                                </button>
                                              ) : (
                                                /*
                                                  Dice «Desactivar» y no «Eliminar»,
                                                  porque es lo que hace: RF-058 e INV-22.
                                                */
                                                <button
                                                  type="button"
                                                  className="btn btn-ghost btn-xs text-error"
                                                  onClick={() =>
                                                    onDesactivar(punto)
                                                  }
                                                  disabled={procesando}
                                                >
                                                  <Iconos nombre="desactivar" />
                                                  Desactivar
                                                </button>
                                              )}
                                              {onEliminar && (
                                                <button
                                                  type="button"
                                                  className="btn btn-ghost btn-xs text-error"
                                                  onClick={() =>
                                                    onEliminar(punto)
                                                  }
                                                  disabled={procesando}
                                                  title="Eliminar definitivamente. Solo si nunca se usó en un operativo."
                                                >
                                                  <Iconos nombre="eliminar" />
                                                  Eliminar
                                                </button>
                                              )}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

      </div>
    </PanelCatalogo>
  );
};

export default PanelPuntosEncuentro;
