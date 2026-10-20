/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: AcordeonZonales.tsx
 * Responsabilidad: Las zonales en acordeón, cada una con los puntos de encuentro del formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUSTITUYE A `PanelPuntosEncuentro` (rediseño de P-08, 2026-10-12).
 *
 * CADA ZONAL DICE LO QUE TIENE SIN ABRIRSE: «X de N puntos activos» (de ESTE formulario) y la
 * marca «Inactiva». Sin ningún punto en el formulario lleva un texto gris discreto («Sin puntos en
 * este formulario»): es lo normal en muchas y no es una alarma. El aviso ámbar «Todos sus puntos
 * están inactivos: no aparecerá en el registro» queda para la que TENÍA puntos y todos quedaron
 * desactivados (ajustes del 2026-10-13). Qué zonales llegan aquí —todas o solo las que tienen
 * puntos— lo decide el interruptor de la página.
 *
 * ACORDEÓN DE BOTONES, NO `<details>`. La cabecera lleva acciones (+ Punto, Editar, ⋮) y un botón
 * dentro de `<summary>` también abre y cierra. Por eso el disparador es un botón con
 * `aria-expanded` que gobierna una región, y las acciones van al lado, no dentro. QUÉ ZONALES
 * ESTÁN ABIERTAS lo guarda la página (para «Expandir/Contraer todo», la búsqueda que abre y para
 * recordarlo al cambiar de pestaña); aquí solo se pinta.
 *
 * «ELIMINAR» SE OFRECE APAGADO CUANDO NO PROCEDE, CON EL MOTIVO. El veredicto (`puedeEliminar`,
 * `motivoNoEliminar`) llega del servidor con la lista: es la misma política que su `DELETE`. Se
 * apaga con `aria-disabled` y no con `disabled`, para que el `title` con el motivo se vea al pasar
 * el cursor y el lector de pantalla lo anuncie (regla 6).
 *
 * TODAS LAS ZONALES SE ADMINISTRAN IGUAL, DMQ INCLUIDO (2026-10-13): «Editar», «+ Punto» y ⋮
 * (Desactivar/Activar, Eliminar), con `AccionesFila` (estándar de botones, 2026-10-15). Los
 * puntos: [✎ Editar] [⊘ Desactivar | ↺ Activar] [⋮ 🗑 Eliminar]. La regla «tiene puntos o ya se usó» solo APAGA «Eliminar», con el
 * motivo del servidor; no oculta nada. Sin candados ni marcas de «zonal del sistema».
 *
 * LAS ZONALES Y LOS PUNTOS SON DEL FORMULARIO (2026-10-13): nada se comparte entre formularios, así
 * que la tabla de puntos ya no lleva la columna «Formularios».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, type FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import Iconos from "../common/Iconos.tsx";
import type {
  PuntoEncuentro,
  ZonalAdmin,
} from "../../interfaces/Formulario.ts";
import {
  clave,
  estaActivo,
  MOTIVO_NO_ELIMINAR,
  pasaEstado,
  resumenZonal,
  type FiltroEstado,
} from "../../utils/catalogos.util.ts";

/** Id del grupo de puntos cuya zonal no está en el catálogo (no debería ocurrir; se muestra). */
const SIN_ZONAL = -1;

export type Resaltado = { tipo: "zonal" | "punto"; id: number } | null;

type AcordeonZonalesProps = {
  zonales: ZonalAdmin[];
  /** Los puntos del FORMULARIO elegido, vigentes y desactivados. */
  puntos: PuntoEncuentro[];
  busqueda: string;
  filtro: FiltroEstado;
  abiertas: Set<number>;
  onAlternar: (zonalId: number) => void;
  resaltado: Resaltado;
  procesando: boolean;
  onAgregarPunto: (zonalId: number) => void;
  onEditarZonal: (zonal: ZonalAdmin) => void;
  onDesactivarZonal: (zonal: ZonalAdmin) => void;
  onActivarZonal: (zonal: ZonalAdmin) => void;
  onEliminarZonal: (zonal: ZonalAdmin) => void;
  onEditarPunto: (punto: PuntoEncuentro) => void;
  onDesactivarPunto: (punto: PuntoEncuentro) => void;
  onActivarPunto: (punto: PuntoEncuentro) => void;
  onEliminarPunto: (punto: PuntoEncuentro) => void;
};

type Grupo = {
  id: number;
  nombre: string;
  zonal: ZonalAdmin | null;
  /** Todos los puntos del formulario en esta zonal (para el conteo). */
  todos: PuntoEncuentro[];
  /** Los que pasan la búsqueda y el filtro (los que se listan). */
  visibles: PuntoEncuentro[];
};

const AcordeonZonales: FC<AcordeonZonalesProps> = ({
  zonales,
  puntos,
  busqueda,
  filtro,
  abiertas,
  onAlternar,
  resaltado,
  procesando,
  onAgregarPunto,
  onEditarZonal,
  onDesactivarZonal,
  onActivarZonal,
  onEliminarZonal,
  onEditarPunto,
  onDesactivarPunto,
  onActivarPunto,
  onEliminarPunto,
}) => {
  const termino = clave(busqueda);

  const grupos = useMemo<Grupo[]>(() => {
    const ordenados = [...puntos].sort((uno, otro) =>
      uno.nombre.localeCompare(otro.nombre, "es"),
    );
    const armar = (
      id: number,
      nombre: string,
      zonal: ZonalAdmin | null,
    ): Grupo => {
      const todos = ordenados.filter((punto) =>
        id === SIN_ZONAL
          ? !zonales.some((z) => z.id === punto.zonalId)
          : punto.zonalId === id,
      );
      const nombreCoincide = termino !== "" && clave(nombre).includes(termino);
      const visibles = todos.filter(
        (punto) =>
          pasaEstado(estaActivo(punto), filtro) &&
          (termino === "" ||
            nombreCoincide ||
            clave(punto.nombre).includes(termino)),
      );
      return { id, nombre, zonal, todos, visibles };
    };

    const lista = zonales.map((zonal) => armar(zonal.id, zonal.nombre, zonal));
    const huerfanos = armar(SIN_ZONAL, "Sin zonal reconocida", null);
    return huerfanos.todos.length > 0 ? [...lista, huerfanos] : lista;
  }, [zonales, puntos, filtro, termino]);

  // Una zonal se muestra si ella o alguno de sus puntos pasa la búsqueda y el filtro de estado.
  const mostrados = grupos.filter((grupo) => {
    const activa = grupo.zonal ? grupo.zonal.activo : true;
    const porNombre = termino === "" || clave(grupo.nombre).includes(termino);
    const porEstado = pasaEstado(activa, filtro);
    return (porNombre && porEstado) || grupo.visibles.length > 0;
  });

  if (mostrados.length === 0) {
    return (
      <p className="text-app-muted px-2 py-6 text-center text-sm">
        {termino
          ? `Ninguna zonal ni punto coincide con «${busqueda.trim()}».`
          : "No hay zonales que mostrar con este filtro."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {mostrados.map((grupo) => {
        const zonal = grupo.zonal;
        const desactivada = zonal?.activo === false;
        const resumen = resumenZonal(
          { id: grupo.id, activo: zonal?.activo },
          puntos,
        );
        const abierta = abiertas.has(grupo.id);
        const idRegion = `zonal-${grupo.id}-puntos`;
        const zonalResaltada =
          resaltado?.tipo === "zonal" && resaltado.id === grupo.id;

        return (
          <li
            key={grupo.id}
            data-resaltado={zonalResaltada || undefined}
            className={`rounded-2xl border border-base-300 transition-colors ${
              zonalResaltada ? "bg-success/10" : "bg-base-100"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
              <button
                type="button"
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className="btn btn-ghost btn-sm min-w-0 flex-1 justify-start gap-2 text-left"
                aria-expanded={abierta}
                aria-controls={idRegion}
                onClick={() => onAlternar(grupo.id)}
              >
                <span
                  data-chevron={abierta ? "abierto" : "cerrado"}
                  className={`inline-flex motion-safe:transition-transform ${abierta ? "rotate-90" : ""}`}
                >
                  <Iconos nombre="acordeon" />
                </span>
                <span
                  className={`truncate font-semibold ${desactivada ? "text-app-muted" : "text-app-strong"}`}
                >
                  {grupo.nombre}
                </span>
              </button>
              <span className="badge badge-ghost badge-sm text-app-strong">
                {resumen.total === 0
                  ? "0 puntos"
                  : `${resumen.activos} de ${resumen.total} puntos activos`}
              </span>
              {desactivada && (
                <span className="badge badge-outline badge-sm">Inactiva</span>
              )}
              {resumen.sinPuntos && zonal !== null && (
                <span className="text-app-muted text-xs">
                  Sin puntos en este formulario
                </span>
              )}
              {resumen.todosInactivos && zonal !== null && (
                <span className="badge badge-warning badge-sm">
                  Todos sus puntos están inactivos: no aparecerá en el registro
                </span>
              )}

              {zonal !== null && (
                <div className="ml-auto">
                  <AccionesFila
                    nombre={zonal.nombre}
                    procesando={procesando}
                    editar={{ onClick: () => onEditarZonal(zonal) }}
                    propia={{
                      texto: "+ Punto",
                      icono: "agregar",
                      etiqueta: "Agregar un punto a",
                      onClick: () => onAgregarPunto(grupo.id),
                      motivo: desactivada
                        ? "Active la zonal para agregarle puntos."
                        : null,
                    }}
                    menu={[
                      desactivada
                        ? {
                            texto: "Activar zonal",
                            icono: "activar",
                            onClick: () => onActivarZonal(zonal),
                          }
                        : {
                            texto: "Desactivar zonal",
                            icono: "desactivar",
                            onClick: () => onDesactivarZonal(zonal),
                          },
                      {
                        texto: "Eliminar",
                        peligro: true,
                        separadorAntes: true,
                        onClick: () => onEliminarZonal(zonal),
                        motivo: zonal.puedeEliminar
                          ? null
                          : (zonal.motivoNoEliminar ?? MOTIVO_NO_ELIMINAR),
                      },
                    ]}
                  />
                </div>
              )}
            </div>

            {abierta && (
              <div
                id={idRegion}
                role="region"
                aria-label={`Puntos de ${grupo.nombre}`}
                className="border-t border-base-300 px-3 pb-3"
              >
                {grupo.todos.length === 0 ? (
                  <p className="text-app-muted py-3 text-sm">
                    Esta zonal todavía no tiene puntos de encuentro. Use «+
                    Punto» para agregar el primero.
                  </p>
                ) : grupo.visibles.length === 0 ? (
                  <p className="text-app-muted py-3 text-sm">
                    Ningún punto de esta zonal coincide con la búsqueda o el
                    filtro.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="app-data-table table table-sm">
                      <thead>
                        <tr>
                          <th scope="col">Punto de encuentro</th>
                          <th scope="col">Estado</th>
                          <th scope="col" className="text-right">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.visibles.map((punto) => {
                          const activo = estaActivo(punto);
                          const filaResaltada =
                            resaltado?.tipo === "punto" &&
                            resaltado.id === punto.id;
                          return (
                            <tr
                              key={punto.id}
                              data-resaltado={filaResaltada || undefined}
                              className={`transition-colors ${filaResaltada ? "bg-success/10" : ""}`}
                            >
                              <td
                                className={
                                  activo && !desactivada ? "" : "text-app-muted"
                                }
                              >
                                {punto.nombre}
                              </td>
                              <td>
                                <span
                                  className={`badge badge-outline badge-sm ${activo ? "badge-success" : ""}`}
                                >
                                  {activo ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td>
                                <AccionesFila
                                  nombre={punto.nombre}
                                  procesando={procesando}
                                  editar={{
                                    onClick: () => onEditarPunto(punto),
                                  }}
                                  estado={
                                    activo
                                      ? {
                                          tipo: "desactivar",
                                          onClick: () =>
                                            onDesactivarPunto(punto),
                                        }
                                      : {
                                          tipo: "activar",
                                          onClick: () => onActivarPunto(punto),
                                          motivo: desactivada
                                            ? "Active primero la zonal."
                                            : null,
                                        }
                                  }
                                  menu={[
                                    {
                                      texto: "Eliminar",
                                      peligro: true,
                                      onClick: () => onEliminarPunto(punto),
                                      motivo:
                                        punto.puedeEliminar === false
                                          ? (punto.motivoNoEliminar ??
                                            MOTIVO_NO_ELIMINAR)
                                          : null,
                                    },
                                  ]}
                                />
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
  );
};

export default AcordeonZonales;
