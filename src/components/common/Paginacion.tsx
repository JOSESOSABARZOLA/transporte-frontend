/**
 * Módulo: Común
 * Feature: Paginación reutilizable para listas/bandejas
 * Archivo: Paginacion.tsx
 * Responsabilidad: Controles de paginación en cliente (info "X–Y de Z", anterior/siguiente,
 *                  tamaño de página) para bandejas con muchos registros. Ver skill `tablas-amc`.
 * Desarrollador: David
 * Fecha: 2026-07-28
 */

import type { FC } from "react";

interface PaginacionProps {
  page: number;                 // página actual (0-based)
  pageSize: number;
  total: number;                // total de registros (ya filtrados)
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
  opciones?: number[];          // opciones de tamaño de página
  etiqueta?: string;            // "expedientes", "documentos"… (para el texto)
}

const Paginacion: FC<PaginacionProps> = ({
  page, pageSize, total, onPage, onPageSize, opciones = [10, 25, 50], etiqueta = "registros",
}) => {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : page * pageSize + 1;
  const hasta = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="mt-3 flex flex-col items-center justify-between gap-2 px-2 sm:flex-row">
      <span className="text-xs text-base-content/70">
        Mostrando <b>{desde}–{hasta}</b> de <b>{total}</b> {etiqueta}
      </span>
      <div className="flex items-center gap-2">
        {onPageSize && (
          <select className="select select-bordered select-xs" value={pageSize}
            onChange={(e) => { onPageSize(Number(e.target.value)); onPage(0); }}
            aria-label="Registros por página">
            {opciones.map((n) => <option key={n} value={n}>{n} / pág.</option>)}
          </select>
        )}
        <div className="join">
          <button type="button" className="join-item btn btn-xs" onClick={() => onPage(0)} disabled={page <= 0}>«</button>
          <button type="button" className="join-item btn btn-xs" onClick={() => onPage(page - 1)} disabled={page <= 0}>‹</button>
          <span className="join-item btn btn-xs pointer-events-none">Pág. {page + 1} / {totalPaginas}</span>
          <button type="button" className="join-item btn btn-xs" onClick={() => onPage(page + 1)} disabled={page >= totalPaginas - 1}>›</button>
          <button type="button" className="join-item btn btn-xs" onClick={() => onPage(totalPaginas - 1)} disabled={page >= totalPaginas - 1}>»</button>
        </div>
      </div>
    </div>
  );
};

export default Paginacion;
