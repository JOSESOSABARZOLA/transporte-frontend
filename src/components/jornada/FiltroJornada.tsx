/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: FiltroJornada.tsx
 * Responsabilidad: Aislar un formulario de la jornada para trabajar sobre él.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ES UNA COPIA DE `matriz/FiltroFormulario.tsx`, con una diferencia que aquí sí importa:
 * cada opción dice si esa sección es editable o de lectura. En la matriz del Director la
 * distinción no existe —todo es lectura— y por eso allí no hace falta.
 *
 * FILTRA LO YA RECIBIDO, SIN VOLVER A PEDIR. `GET /jornada/:fecha` devuelve las nueve
 * secciones en una respuesta; consultar de nuevo para quedarse con una sería pedirle al
 * servidor que rehiciera la jornada entera para descartar ocho novenas partes.
 *
 * SIGUE MOSTRANDO LOS QUE NO SE CARGARON. Un formulario vacío también es una opción: su
 * fila de evidencia es lo único que ese formulario tiene que decir.
 */

import type { FC } from "react";

import type { SeccionJornada } from "../../interfaces/Jornada.ts";

/** Valor que representa «sin filtrar». No es el código de ningún formulario. */
export const TODOS_LOS_FORMULARIOS = "";

type FiltroJornadaProps = {
  secciones: SeccionJornada[];
  seleccionado: string;
  onSeleccionar: (codigo: string) => void;
};

const FiltroJornada: FC<FiltroJornadaProps> = ({
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
        {seccion.numero}. {seccion.nombre} ({seccion.totalOperativos}
        {seccion.acceso === "LECTURA" ? ", solo lectura" : ""})
      </option>
    ))}
  </select>
);

export default FiltroJornada;
