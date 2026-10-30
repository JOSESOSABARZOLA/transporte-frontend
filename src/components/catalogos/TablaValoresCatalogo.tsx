/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: TablaValoresCatalogo.tsx
 * Responsabilidad: La tabla de tipos de control o de instituciones de una pestaña de P-08.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * EL MISMO ESTILO QUE LA TABLA DE PUNTOS (rediseño del 2026-10-12): estado en distintivo con
 * texto y nombre en gris si está desactivado.
 *
 * ESTÁNDAR DE BOTONES (2026-10-15): `AccionesFila` con [✎ Editar] [⊘ Desactivar | ↺ Reactivar]
 * [🗑 Eliminar], con texto y sin «⋮» desde el 2026-10-24. «Eliminar» va visible al final, apagado con
 * el motivo del servidor (o «Ya se usó en un cuadro: solo se puede desactivar») en su tooltip. Pagina de a 10 en el navegador (`Paginacion`): vuelve a la
 * primera cuando cambia el número de filas (búsqueda o filtro) y salta a la de la fila resaltada. La búsqueda y el
 * filtro los hace la página: aquí llegan las filas ya filtradas. La antigua `TablaCatalogo` se
 * retiró el 2026-10-13, cuando «Formularios del cuadro» pasó a su propia `TablaFormularios`.
 *
 * PLANTILLA VISUAL (2026-10-24): `table table-sm table-zebra` con la cabecera de las demás tablas,
 * el estado con `EtiquetaEstado`.
 */

import type { ReactNode } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import EtiquetaEstado from "../common/EtiquetaEstado.tsx";
import Paginacion from "../common/Paginacion.tsx";
import { usePaginaLocal } from "../../hooks/usePaginaLocal.ts";
import type { DatosDeAdministracion } from "../../interfaces/Formulario.ts";
import { estaActivo, MOTIVO_NO_ELIMINAR } from "../../utils/catalogos.util.ts";


type Fila = DatosDeAdministracion & { id: number; activo?: boolean };

export type ColumnaValor<T> = {
  titulo: string;
  valor: (fila: T) => ReactNode;
  /** La columna principal va en negrita. */
  fuerte?: boolean;
};

type TablaValoresCatalogoProps<T extends Fila> = {
  etiqueta: string;
  filas: T[];
  columnas: ColumnaValor<T>[];
  nombreDe: (fila: T) => string;
  mensajeVacio: string;
  resaltadoId: number | null;
  procesando: boolean;
  onEditar: (fila: T) => void;
  onDesactivar: (fila: T) => void;
  onActivar: (fila: T) => void;
  onEliminar: (fila: T) => void;
};

const TablaValoresCatalogo = <T extends Fila>({
  etiqueta,
  filas,
  columnas,
  nombreDe,
  mensajeVacio,
  resaltadoId,
  procesando,
  onEditar,
  onDesactivar,
  onActivar,
  onEliminar,
}: TablaValoresCatalogoProps<T>) => {
  const pagina0 = usePaginaLocal(filas, resaltadoId, (fila) => fila.id);

  if (filas.length === 0) {
    return (
      <p className="text-app-muted px-2 py-6 text-center text-sm">
        {mensajeVacio}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="table table-sm table-zebra w-full text-sm" aria-label={etiqueta}>
          <thead>
            <tr className="text-xs uppercase tracking-wider text-app-label">
              {columnas.map((columna) => (
                <th key={columna.titulo} scope="col">
                  {columna.titulo}
                </th>
              ))}
              <th scope="col">Estado</th>
              <th scope="col" className="text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {pagina0.filas.map((fila) => {
              const activo = estaActivo(fila);
              const resaltada = fila.id === resaltadoId;
              const nombre = nombreDe(fila);
              return (
                <tr
                  key={fila.id}
                  data-resaltado={resaltada || undefined}
                  className={`transition-colors ${resaltada ? "bg-success/10" : "hover:bg-primary/5"}`}
                >
                  {columnas.map((columna) => (
                    <td
                      key={columna.titulo}
                      className={`${columna.fuerte ? "font-semibold" : ""} ${activo ? "" : "text-app-muted"}`}
                    >
                      {columna.valor(fila)}
                    </td>
                  ))}
                  <td>
                    <EtiquetaEstado tono={activo ? "activo" : "inactivo"}>
                      {activo ? "Activo" : "Inactivo"}
                    </EtiquetaEstado>
                  </td>
                  <td>
                    <AccionesFila
                      nombre={nombre}
                      procesando={procesando}
                      editar={{ onClick: () => onEditar(fila) }}
                      estado={
                        activo
                          ? {
                              tipo: "desactivar",
                              onClick: () => onDesactivar(fila),
                            }
                          : { tipo: "activar", onClick: () => onActivar(fila) }
                      }
                      eliminar={{
                        onClick: () => onEliminar(fila),
                        motivo:
                          fila.puedeEliminar === false
                            ? (fila.motivoNoEliminar ?? MOTIVO_NO_ELIMINAR)
                            : null,
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacion
        page={pagina0.pagina}
        pageSize={pagina0.tamano}
        total={pagina0.total}
        onPage={pagina0.irA}
        etiqueta={etiqueta.toLowerCase()}
      />
    </div>
  );
};

export default TablaValoresCatalogo;
