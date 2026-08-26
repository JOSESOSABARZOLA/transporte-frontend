/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: TablaCatalogo.tsx
 * Responsabilidad: Listar un catálogo del formulario y dejar obrar sobre cada valor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA TABLA PARA LOS CATÁLOGOS DE UNA SOLA COORDENADA, PARAMETRIZADA POR SUS COLUMNAS.
 *
 * Tipos de control e instituciones se administran igual: se listan, se dan de alta, se
 * corrigen y se desactivan. Lo único que cambia son las columnas —la institución lleva
 * sigla y denominación—.
 *
 * Dos tablas casi idénticas es exactamente el hallazgo D-01 que costó una refactorización
 * en M-22. Aquí se evita desde el principio: el día que haya que cambiar cómo se avisa una
 * baja, hay un solo sitio donde hacerlo.
 *
 * **Los puntos de encuentro salieron de aquí el 2026-08-24** y viven en
 * `PanelPuntosEncuentro`: no son una lista, son lugares dentro de una zonal, y listarlos en
 * plano obligaba a repetir el nombre de la zonal en cada fila. El marco que los tres siguen
 * compartiendo se extrajo a `PanelCatalogo`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ReactNode } from "react";

import PanelCatalogo from "./PanelCatalogo.tsx";

/** Un valor de catálogo, sea del tipo que sea. Todos tienen identificador. */
export interface FilaCatalogo {
  id: number;
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
  onAgregar: () => void;
  onEditar: (fila: T) => void;
  onDesactivar: (fila: T) => void;
};

const TablaCatalogo = <T extends FilaCatalogo>({
  titulo,
  filas,
  columnas,
  cargando,
  procesando,
  mensajeVacio,
  onAgregar,
  onEditar,
  onDesactivar,
}: TablaCatalogoProps<T>) => (
  <PanelCatalogo
    titulo={titulo}
    distintivo={
      <span className="badge badge-ghost badge-sm">
        {cargando ? "Cargando…" : `${filas.length} vigentes`}
      </span>
    }
    procesando={procesando}
    onAgregar={onAgregar}
  >
    <div className="overflow-x-auto">
      <table className="table table-sm">
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
          {filas.length === 0 ? (
            <tr>
              <td
                colSpan={columnas.length + 1}
                className="px-3 py-6 text-center text-sm text-base-content/70"
              >
                {cargando ? "Cargando el catálogo…" : mensajeVacio}
              </td>
            </tr>
          ) : (
            filas.map((fila) => (
              <tr
                key={fila.id}
                className="hover:bg-info/10"
              >
                {columnas.map((columna) => (
                  <td
                    key={columna.titulo}
                    className="px-3 py-1 align-top"
                  >
                    {columna.valor(fila)}
                  </td>
                ))}
                <td className="px-3 py-1 align-top">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onEditar(fila)}
                      disabled={procesando}
                    >
                      Editar
                    </button>
                    {/*
                      Dice «Desactivar» y no «Eliminar», porque es lo que hace: RF-058
                      e INV-22. Un botón que promete borrar y desactiva enseña al
                      administrador a desconfiar de lo que lee.
                    */}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => onDesactivar(fila)}
                      disabled={procesando}
                    >
                      Desactivar
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </PanelCatalogo>
);

export default TablaCatalogo;
