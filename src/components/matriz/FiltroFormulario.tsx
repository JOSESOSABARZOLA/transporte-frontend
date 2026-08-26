/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: FiltroFormulario.tsx
 * Responsabilidad: Aislar un formulario de la matriz para revisarlo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * FILTRA LO YA RECIBIDO, SIN VOLVER A PEDIR. `GET /matriz/:fecha` devuelve las nueve
 * secciones en una respuesta; consultar de nuevo para quedarse con una sería pedir al
 * servidor que rehiciera la matriz entera —nueve formularios, sus operativos, su personal
 * y sus alertas— para descartar ocho novenas partes.
 *
 * SIGUE MOSTRANDO LOS QUE NO SE CARGARON. Un formulario vacío también es una opción del
 * desplegable: su fila de evidencia es justamente lo que la Dirección necesita revisar,
 * y esconderlo dejaría fuera del filtro lo único que ese formulario tiene que decir.
 */

import type { FC } from "react";

import type { SeccionMatriz } from "../../interfaces/Documento.ts";

/** Valor que representa «sin filtrar». No es el código de ningún formulario. */
export const TODOS_LOS_FORMULARIOS = "";

type FiltroFormularioProps = {
  secciones: SeccionMatriz[];
  seleccionado: string;
  onSeleccionar: (codigo: string) => void;
};

const FiltroFormulario: FC<FiltroFormularioProps> = ({
  secciones,
  seleccionado,
  onSeleccionar,
}) => (
  <select
    className="select select-bordered select-sm"
    aria-label="Filtrar por formulario"
    value={seleccionado}
    onChange={(evento) => onSeleccionar(evento.target.value)}
  >
    <option value={TODOS_LOS_FORMULARIOS}>Todos los formularios</option>
    {secciones.map((seccion) => (
      <option
        key={seccion.codigo}
        value={seccion.codigo}
      >
        {seccion.numero}. {seccion.nombre} ({seccion.totalOperativos})
      </option>
    ))}
  </select>
);

export default FiltroFormulario;
