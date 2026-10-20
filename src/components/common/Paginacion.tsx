/**
 * Módulo: Común
 * Feature: Paginación reutilizable para listas/bandejas
 * Archivo: Paginacion.tsx
 * Responsabilidad: Controles de paginación en cliente (info "X–Y de Z", anterior/siguiente,
 *                  tamaño de página) para bandejas con muchos registros. Ver skill `tablas-amc`.
 * Desarrollador: David
 * Fecha: 2026-07-28
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO PAGINADOR (estándar de botones, 2026-10-15). El de «Flota y garajes» en todas las tablas:
 * «Filas por página», «‹ Anterior», las páginas con elipsis (`rangoPaginas`: 1 … 4 5 6 … 12) y
 * «Siguiente ›», todos `<Boton tamano="sm">` (32 px, 13 px), números de al menos 32 px de ancho y
 * 4 px entre botones. La página actual va en `primario` (y `aria-current`). Si todo cabe en una
 * página, solo queda el texto «Mostrando…»; sin registros no se pinta nada (la tabla ya dice que
 * está vacía). El paginador viejo («« ‹ Pág. 1 / 4 › »» y «10 / pág.») se retiró.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useId, type FC } from "react";

import { rangoPaginas } from "../../utils/listadoOperativos.util.ts";
import Boton from "./Boton.tsx";

interface PaginacionProps {
  page: number;                 // página actual (0-based)
  pageSize: number;
  total: number;                // total de registros (ya filtrados)
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
  opciones?: number[];          // opciones de tamaño de página
  etiqueta?: string;            // "funcionarios", "operativos"… (para el texto)
}

/** 13 px: el texto del paginador. */
const TEXTO_13 = "text-[0.8125rem]";

const Paginacion: FC<PaginacionProps> = ({
  page, pageSize, total, onPage, onPageSize, opciones = [10, 25, 50], etiqueta = "registros",
}) => {
  const idTamano = useId();
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : page * pageSize + 1;
  const hasta = Math.min(total, (page + 1) * pageSize);

  if (total === 0) return null;

  return (
    <nav
      aria-label="Paginación"
      className="mt-3 flex flex-col flex-wrap items-center justify-between gap-2 px-2 sm:flex-row"
    >
      <span className={`min-w-0 text-app-muted ${TEXTO_13}`}>
        Mostrando <b>{desde}–{hasta}</b> de <b>{total}</b>{etiqueta ? ` ${etiqueta}` : ""}
      </span>
      {totalPaginas > 1 && (
        <div className="flex max-w-full flex-wrap items-center justify-end gap-3">
          {onPageSize && (
            <span className="flex items-center gap-2">
              <label htmlFor={idTamano} className={`${TEXTO_13} text-app-muted`}>
                Filas por página
              </label>
              <select
                id={idTamano}
                className={`select select-bordered select-sm w-auto ${TEXTO_13}`}
                value={pageSize}
                onChange={(e) => { onPageSize(Number(e.target.value)); onPage(0); }}
              >
                {opciones.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1">
            <Boton tamano="sm" deshabilitado={page <= 0} onClick={() => onPage(page - 1)}>
              ‹ Anterior
            </Boton>
            {rangoPaginas(page + 1, totalPaginas).map((casilla, indice) =>
              casilla === "…" ? (
                <span
                  key={`elipsis-${indice}`}
                  className={`inline-flex min-w-8 justify-center text-app-muted ${TEXTO_13}`}
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <Boton
                  key={casilla}
                  variante={casilla === page + 1 ? "primario" : "secundario"}
                  tamano="sm"
                  className="min-w-8"
                  aria-label={`Página ${casilla}`}
                  aria-current={casilla === page + 1 ? "page" : undefined}
                  onClick={() => onPage(casilla - 1)}
                >
                  {casilla}
                </Boton>
              ),
            )}
            <Boton tamano="sm" deshabilitado={page >= totalPaginas - 1} onClick={() => onPage(page + 1)}>
              Siguiente ›
            </Boton>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Paginacion;
