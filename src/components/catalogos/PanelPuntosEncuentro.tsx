/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: PanelPuntosEncuentro.tsx
 * Responsabilidad: Administrar los puntos de encuentro de un formulario, por zonal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN PUNTO DE ENCUENTRO NO ES UN ELEMENTO DE UNA LISTA: ES UN LUGAR DENTRO DE UNA ZONAL.
 *
 * Hasta hoy se listaban en plano, con una columna «Zonal» que repetía el mismo nombre
 * decenas de veces —el formulario 7 tiene 34 puntos en 10 zonales— y con las diez zonales
 * mezcladas en un solo bloque. Para responder «¿qué puntos ofrece Quitumbe?», que es la
 * pregunta de quien administra, había que leer las 34 filas.
 *
 * Aquí se agrupan por zonal, que es como se usan: una tarjeta por zonal, el nombre de la
 * zonal dicho **una vez**, y dentro sus puntos.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Y LA ZONAL VACÍA SE NOMBRA, QUE ES LA RAZÓN DE SER DE ESTA PANTALLA. La matriz zonal ↔
 * punto no se entregó nunca (PV-01) y se está cargando a mano: lo que falta importa más
 * que lo que hay. Una zonal sin puntos no produce ningún error, simplemente no aparecía
 * —y el día del registro no ofrece nada en la cascada de P-01—. Ahora se dice con
 * palabras al pie, y desde ahí se le agrega el primero.
 */

import { useMemo, useState, type FC } from "react";

import PanelCatalogo from "./PanelCatalogo.tsx";
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
}) => {
  const [busqueda, setBusqueda] = useState("");

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

  const vacias = grupos.filter(
    (grupo) => grupo.id !== SIN_ZONAL && grupo.puntos.length === 0,
  );

  return (
    <PanelCatalogo
      titulo="Puntos de encuentro"
      distintivo={
        <span className="badge badge-ghost badge-sm">
          {cargando ? "Cargando…" : `${puntos.length} vigentes`}
        </span>
      }
      procesando={procesando}
      onAgregar={() => onAgregar(null)}
    >
      <div className="flex flex-col gap-3 px-1 pt-1">
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

        {visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-base-content/70">
            {cargando
              ? "Cargando el catálogo…"
              : termino !== ""
                ? `Ningún punto ni zonal coincide con «${busqueda.trim()}».`
                : "Este formulario no tiene puntos de encuentro. Sin ellos, la cascada de P-01 no ofrece nada."}
          </p>
        ) : (
          /* Una, dos y tres columnas, como las tarjetas de P-06. FASE5 §9.6. */
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibles.map((grupo) => (
              <article
                key={grupo.id}
                className="rounded-md border border-base-300 bg-base-100 p-3"
              >
                <header className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-base-300 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
                    {grupo.nombre}
                  </h3>
                  <span className="badge badge-ghost badge-sm">
                    {contarPuntos(grupo.puntos.length)}
                  </span>
                </header>

                <ul>
                  {grupo.puntos.map((punto) => (
                    <li
                      key={punto.id}
                      className="flex flex-wrap items-center justify-between gap-1 rounded-md px-1 py-0.5 hover:bg-info/10"
                    >
                      <span className="text-sm">{punto.nombre}</span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => onEditar(punto)}
                          disabled={procesando}
                        >
                          Editar
                        </button>
                        {/*
                          Dice «Desactivar» y no «Eliminar», porque es lo que hace:
                          RF-058 e INV-22.
                        */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => onDesactivar(punto)}
                          disabled={procesando}
                        >
                          Desactivar
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        {/*
          Solo sin búsqueda: la cobertura es del catálogo entero y decirla sobre una lista
          filtrada haría creer que faltan zonales que sí tienen puntos.
        */}
        {!cargando && termino === "" && zonales.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-base-300 pt-3">
            {vacias.length === 0 ? (
              <p className="text-xs text-base-content/70">
                Las {zonales.length} zonales del formulario tienen al menos un punto.
              </p>
            ) : (
              <>
                <p className="text-xs text-base-content/70">
                  Sin puntos todavía. Al registrar un operativo en estas zonales, la
                  lista de puntos saldrá vacía:
                </p>
                <div className="flex flex-wrap gap-1">
                  {vacias.map((zonal) => (
                    <button
                      key={zonal.id}
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onAgregar(zonal.id)}
                      disabled={procesando}
                    >
                      Agregar a {zonal.nombre}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PanelCatalogo>
  );
};

export default PanelPuntosEncuentro;
