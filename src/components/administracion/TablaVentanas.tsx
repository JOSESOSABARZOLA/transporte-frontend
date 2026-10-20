/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: TablaVentanas.tsx
 * Responsabilidad: Mostrar las seis ventanas de carga y su estado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * «SIN RESTRICCIÓN HORARIA» NO ES LO MISMO QUE «SIN DATOS».
 *
 * Una ventana desactivada, o con la hora de apertura nula, **no está incompleta**: dice
 * que ese rol no tiene esa restricción. Es lo único que las fuentes permiten afirmar de
 * los departamentos, cuyo horario define solo el cierre; y la Dirección y la
 * Administración quedaron inactivas a propósito, porque ninguna fuente define su ventana.
 *
 * Escribir «—» en esas celdas las haría parecer datos que alguien olvidó cargar, y el
 * siguiente administrador «los completaría» cerrando una ventana que nadie pidió cerrar.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO HAY BOTÓN DE AGREGAR NI DE ELIMINAR, y no falta ninguno: hay exactamente una ventana
 * por rol y el contrato no expone `POST` ni `DELETE`. Borrar una **abriría** la carga de
 * ese rol las veinticuatro horas, porque el evaluador trata la ausencia como «sin
 * restricción». Desactivar dice lo mismo de forma explícita y deja rastro.
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";

import type { VentanaCarga } from "../../interfaces/Administracion.ts";
import {
  NOMBRE_TIPO_VENTANA,
  horarioDeVentana,
} from "../../utils/parametro.util.ts";
import { resolverMensajeVentana } from "../../utils/mensajeVentana.util.ts";
import type { RolDepartamental } from "../../config/env.ts";

type TablaVentanasProps = {
  /**
   * Nombre legible de un rol. **Llega como propiedad y no se consulta aquí**: esta tabla
   * es presentacional, y quien habla con el servidor es la página. Sale del catálogo de
   * , no de un mapa escrito en el navegador.
   */
  nombreDe: (rol: RolDepartamental) => string;
  ventanas: VentanaCarga[];
  cargando: boolean;
  procesando: boolean;
  onEditar: (ventana: VentanaCarga) => void;
  /** La fila recién guardada, resaltada en verde unos segundos (2026-10-07). */
  resaltado?: RolDepartamental | null;
};

/**
 * El mensaje como lo leerá el funcionario: el resuelto por el servidor, o resuelto aquí si la
 * respuesta no lo trae. Sin marca de «hora que no coincide» desde el 2026-10-08: la pantalla solo
 * parametriza.
 */
const mensajeDe = (ventana: VentanaCarga): string =>
  ventana.mensajeResuelto ??
  resolverMensajeVentana(ventana.mensajeCierre, ventana.horaApertura, ventana.horaCierre);

const TablaVentanas: FC<TablaVentanasProps> = ({
  ventanas,
  cargando,
  procesando,
  onEditar,
  nombreDe,
  resaltado = null,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm table-zebra">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-app-label">
          <th scope="col">Rol</th>
          <th scope="col">Tipo</th>
          <th scope="col">Horario</th>
          <th scope="col">Mensaje</th>
          <th scope="col">Zona horaria</th>
          <th scope="col">Estado</th>
          <th
            scope="col"
            className="text-right"
          >
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {ventanas.length === 0 ? (
          <tr>
            <td
              colSpan={7}
              className="px-3 py-6 text-center text-sm text-app-muted"
            >
              {cargando
                ? "Cargando las ventanas…"
                : "No hay ventanas de carga registradas."}
            </td>
          </tr>
        ) : (
          ventanas.map((ventana) => (
            <tr
              key={ventana.rol}
              // Sin opacidad en las inactivas (2026-10-07): el estado ya lo dice su distintivo.
              className={
                ventana.rol === resaltado ? "bg-success/10" : "hover:bg-primary/5"
              }
            >
              <td className="px-3 py-2 align-top font-medium">
                {nombreDe(ventana.rol)}
              </td>
              <td className="px-3 py-2 align-top">
                {NOMBRE_TIPO_VENTANA[ventana.tipo]}
              </td>
              <td className="px-3 py-2 align-top">
                {horarioDeVentana(ventana)}
              </td>
              <td className="px-3 py-2 align-top text-sm">
                {ventana.activo ? (
                  <span>{mensajeDe(ventana)}</span>
                ) : (
                  <span className="text-app-muted">
                    Sin restricción: no se muestra mensaje.
                  </span>
                )}
              </td>
              <td className="px-3 py-2 align-top text-xs text-app-muted">
                {ventana.zonaHoraria}
              </td>

              {/* El estado lleva color **y** palabra (regla 6 de CLAUDE.md). */}
              <td className="px-3 py-2 align-top">
                <span
                  className={`badge badge-sm ${
                    ventana.activo ? "badge-success" : "badge-ghost"
                  }`}
                >
                  {ventana.activo ? "Vigente" : "Inactiva"}
                </span>
              </td>

              <td className="px-3 py-2 align-top">
                <AccionesFila
                  nombre={`la ventana de ${nombreDe(ventana.rol)}`}
                  procesando={procesando}
                  editar={{ onClick: () => onEditar(ventana) }}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default TablaVentanas;
