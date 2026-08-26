import type { Column } from "@tanstack/react-table";
import React, { useEffect, useState } from "react";

//TODO: Separar en un componente por separado para cada tipo de filtro, puede ser un input para Nombres, direcciones etc. Un select para catalogos como estatus del expedientes, rangos para fojas, o input de fechas para ese mismo proposito.
type DebouncedInputProps = {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
};

/**
 * Input para ingreso de texto para busquedas generales
 * @param DebouncedInputProps
 * @returns
 */
const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: DebouncedInputProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <label className="floating-label mt-2">
      <span>Filtro</span>
      <input
        {...props}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );
};

// const RangeDatesInput = () => {};

const FilterByColumn = <TData,>({
  column,
}: {
  column: Column<TData, unknown>;
}) => {
  const columnFilterValue = column.getFilterValue();

  return (
    <DebouncedInput
      type="text"
      placeholder="buscar..."
      className="input input-xs"
      // className="w-36 border shadow rounded"
      onChange={(value) => column.setFilterValue(value)}
      // placeholder={`Search...`}
      // type="text"
      value={(columnFilterValue ?? "") as string}
    />
  );
};

export default FilterByColumn;
