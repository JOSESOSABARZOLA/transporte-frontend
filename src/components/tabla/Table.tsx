/**
 * App: Cuadro de Colores
 * M�dulo: N/A
 * Feature: Tabla dinamica
 * Archivo: Table.tsx
 * Responsabilidad: Renderizar de diferentes conjuntos de datos seg�n las confiuraciones enviadas
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 */

import { useCallback, useEffect, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import FilterByColumn from "./FilterByColumn";
import type { UserActions } from "../../interfaces/User";
import RowActions from "./RowActions";

export type PaginationAndFilters = {
  pageIndex: number;
  pageSize: number;
  filterParams: Record<string, unknown>;
};

type PaginatedResponse<T> = {
  data: T[];
  total: number;
};

type StylesComponents = {
  containerStyle: string;
  tableStyle: string;
};

type TablaProps<T> = {
  styles: StylesComponents;
  dataT: T[];
  columns: ColumnDef<T>[];
  resolveActionsPerRow: (row: T, options: UserActions[]) => UserActions[];
  tableOptions: UserActions[];
  findRecordsFn: (
    params: PaginationAndFilters,
  ) => Promise<PaginatedResponse<T>>;

};

//TODO: Separar por componentes la tabla
const Table = <T,>({
  dataT,
  columns,
  findRecordsFn,
  styles,
  resolveActionsPerRow,
  tableOptions,
}: TablaProps<T>) => {
  //Estado para la información que será presentada en la tabla
  const [data, setData] = useState<T[]>(dataT);

  //Total de registros que sirve en conjunto con la paginación
  const [totalData, setTotalData] = useState<number>(0);

  //Estado para manejar el filtrado de columnas
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  //Estado para manejo de paginación
  const [paginationFilters, setPaginationFilters] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  //Funcion que retorna el header para presentarlo en los filtro aplicados para una mejor lectura del usuario, para no presentar los ids de las columnas
  const getHeaderByColumnId = (columnId: string): string => {
    const column = columns.find((col) => col.id === columnId);
    if (!column) return columnId;
    if (typeof column.header === "string") return column.header;
    return columnId;
  };

  /**
   * Función para refrescar los datos de la tabla
   * Ejecuta la búsqueda con los filtros y paginación actuales y actualiza los estados setData y setTotalData
   * Se expone para ser llamada desde modales o componentes externos
   */
  const refetchData = useCallback(async () => {
    const filterParams = columnFilters.reduce((acc, filter) => {
      return {
        ...acc,
        [filter.id]: filter.value,
      };
    }, {});

    const params = { ...paginationFilters, filterParams };
    const response = await findRecordsFn(params);
    setData(response.data);
    setTotalData(response.total);
  }, [paginationFilters, columnFilters, findRecordsFn]);


  // Se recargan los datos al cambiar de página o de filtro.
  // Se observan solo esos disparadores y no `refetchData` completo: `findRecordsFn`
  // la define el componente padre y, si no está memoizada, incluirla provocaría un
  // bucle de peticiones. La lógica de consulta vive en refetchData, sin duplicar.
  useEffect(() => {
    void refetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationFilters.pageIndex, paginationFilters.pageSize, columnFilters]);

  /**
   * Crear columna de numeración con acceso a paginación
   */
  const numberColumn: ColumnDef<T> = {
    header: "Nro.",
    id: "nro",
    enableColumnFilter: false,
    size: 60,
    cell: (info) => {
      const rowIndex = info.row.index;
      const pageIndex = table.getState().pagination.pageIndex;
      const pageSize = table.getState().pagination.pageSize;
      const globalIndex = pageIndex * pageSize + rowIndex + 1;

      return <span className="font-semibold text-center">{globalIndex}</span>;
    },
  };

  //Columna de acciones, se renderizan botones o un menú dependiendo de la configuración enviada, además se evalúan las características de cada fila para decidir que acciones mostrar o deshabilitar
  const actionColumn: ColumnDef<T> = {
    id: "acciones",
    header: "Acciones",
    size: 200,
    cell: (row) => (
      <RowActions
        actions={resolveActionsPerRow(row.row.original, tableOptions)}
        data={row.row.original}
        refetchFn={refetchData}
      />
    ),
  };


  // Crear array de columnas con numeración en posición correcta
  // Si existe columna "semaforo", insertar numberColumn después de ella (posición 1)
  // Si no existe, insertar al inicio (posición 0)
  const hasSemaforoColumn = columns.some((col) => col.id === "semaforo");
  const insertPosition = hasSemaforoColumn ? 1 : 0;
  const columnsWithNumber = [
    ...columns.slice(0, insertPosition),
    numberColumn,
    ...columns.slice(insertPosition),
    actionColumn,
  ];

  //Configuración de la tabla, actualmente tiene paginaci�n y filtrado por columna del lado del servidor
  const table = useReactTable({
    data,
    columns: columnsWithNumber,
    getCoreRowModel: getCoreRowModel(),

    //Filtrado de columnas
    manualFiltering: true,
    onColumnFiltersChange: setColumnFilters,

    //Paginacion
    manualPagination: true,
    rowCount: totalData,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function" ? updater(paginationFilters) : updater;
      setPaginationFilters((prev) => ({ ...prev, ...newPagination }));
    },

    state: {
      columnFilters,
      pagination: {
        pageIndex: paginationFilters.pageIndex,
        pageSize: paginationFilters.pageSize,
      },
    },
  });

  return (
    <>
      {/* Funcionalidades de cabecera como limpieza de filtros y exportación de CSV o PDF */}
      <div className="flex flex-row justify-between mb-2">
        {/* Limpieza de todos los filtros */}
        <div className="stats bg-base-100 border-base-300 border">
          <div className="stat">
            <div className="stat-title">Filtros</div>
            <div className="flex flex-row gap-2">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setColumnFilters([]); // Limpiar filtros
                  setPaginationFilters((prev) => ({ ...prev, pageIndex: 0 })); // Ir a página 1
                }}
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Presentación de cada filtro implementado, además que se puede quitar */}
        {table.getState().columnFilters.length > 0 && (
          <div className="stats bg-base-100 border-base-300 border">
            <div className="stat">
              <div className="stat-title">Filtros aplicados:</div>
              <div className="flex gap-2 flex-wrap">
                {columnFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="badge badge-dash badge-primary"
                  >
                    {getHeaderByColumnId(filter.id)}: {filter?.value as string}
                    <button
                      onClick={() => {
                        setColumnFilters(
                          columnFilters.filter((f) => f.id !== filter.id),
                        );
                      }}
                      className="btn btn-xs btn-warning btn-ghost"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exportación de archivos externos CSV - PDF */}
        <div className="stats bg-base-100 border-base-300 border">
          <div className="stat">
            <div className="stat-title">Exportar</div>
            {/* <div className="stat-value">Formatos</div> */}
            <div className="flex flex-row gap-2">
              <button className="btn btn-primary btn-xs">CSV</button>
              <button className="btn btn-primary btn-xs">PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* div propiamente de la tabla de presentación de datos */}
      <div className={`app-data-table-shell ${styles.containerStyle}`}>
        <table className={`app-data-table ${styles.tableStyle}`}>
          {/* Cabecera de la tabla */}
          <thead className="text-xs uppercase tracking-[0.16em] text-base-content">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}

                    {header.column.getCanFilter() ? (
                      <div>
                        <FilterByColumn column={header.column} />
                        {/* <FilterByColumn column={header.column} /> */}
                      </div>
                    ) : null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Cuerpo de la tabla */}
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                className={`border-b border-base-300 ${row.index % 2 === 0 ? "bg-base-100" : "bg-base-200"
                  } hover:bg-primary/5`}
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="overflow-visible py-4 text-sm text-base-content md:text-[0.95rem]"
                    style={{ width: `${cell.column.getSize()}px` }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* Pie de tabla */}
          <tfoot>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id}>
                {footerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.footer,
                        header.getContext(),
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
      </div>

      {/* Interaccion con la paginación */}
      <div className="join flex items-center justify-center">
        {/* Botones de direccion de paginas */}
        <button
          className="join-item btn btn-soft btn-primary"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<<"}
        </button>
        <button
          className="join-item btn btn-soft btn-primary"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<"}
        </button>
        <button
          className="join-item btn btn-soft btn-primary"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {">"}
        </button>
        <button
          className="join-item btn btn-soft btn-primary"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          {">>"}
        </button>
        {/* Indicadores de paginas, input para pagina y cantidad de registros mostrados */}
        <div className="flex flex-row gap-3 ml-3">
          <span className="flex items-center gap-1">
            <div>Pagina</div>
            <strong>
              {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </strong>
          </span>
          <span className="flex items-center gap-1">
            | Ir a la pagina:
            <input
              type="number"
              min="1"
              max={table.getPageCount()}
              defaultValue={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
              className="border p-1 rounded w-16"
            />
          </span>
          <select
            className="join-item btn btn-soft btn-primary"
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[5, 10, 20, 30, 40, 50].map((pageSize) => (
              <option
                key={pageSize}
                value={pageSize}
              >
                Mostar {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};

export default Table;
