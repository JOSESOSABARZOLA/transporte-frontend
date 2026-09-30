/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: SelectorFormularioAdmin.tsx
 * Responsabilidad: Elegir qué formulario se está administrando.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO ES `SelectorFormulario`, Y LA DIFERENCIA ES DE SIGNIFICADO.
 *
 * Aquel distingue dueño de compartido y **deshabilita** los que el rol no puede escribir,
 * porque en P-01 elegir un formulario ajeno sería registrar donde no corresponde (PER-06).
 * Aquí los nueve son administrables: el `ADMINISTRADOR` es un rol transversal y
 * `GET /formularios/permitidos` se los devuelve todos, con `acceso: LECTURA`.
 *
 * Reutilizar aquel componente con una excepción habría dejado que el mismo control
 * significara «puede escribir» en una pantalla y «existe» en otra, que es la clase de
 * ambigüedad que después nadie recuerda.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ES UN DESPLEGABLE Y NO NUEVE BOTONES DE COLOR. Administrar catálogos no es una tarea
 * que se repita decenas de veces al día como el registro: se entra, se corrige un punto y
 * se sale. Nueve botones ocuparían el alto de la pantalla que necesitan las tres tablas.
 */

import type { FC } from "react";

import type { Formulario } from "../../interfaces/Formulario.ts";

type SelectorFormularioAdminProps = {
  formularios: Formulario[];
  seleccionado: string;
  onSeleccionar: (codigo: string) => void;
  deshabilitado?: boolean;
};

const SelectorFormularioAdmin: FC<SelectorFormularioAdminProps> = ({
  formularios,
  seleccionado,
  onSeleccionar,
  deshabilitado = false,
}) => (
  // Columna EXPLÍCITA, no `form-control`. En daisyUI 5 esa clase dejó de forzar la
  // dirección de columna, y la etiqueta, el desplegable y el texto de ayuda se pintaban
  // en línea —«Formulario [desplegable] Los tres catálogos…», con «Los» encallado a la
  // derecha del control—. `flex flex-col gap-1` lo apila sea cual sea la versión.
  <div className="flex w-full flex-col gap-1 sm:max-w-md">
    <label
      className="label-text font-medium"
      htmlFor="formularioAdministrado"
    >
      Formulario
    </label>
    <select
      id="formularioAdministrado"
      className="select select-bordered select-sm w-full"
      value={seleccionado}
      disabled={deshabilitado || formularios.length === 0}
      onChange={(evento) => onSeleccionar(evento.target.value)}
    >
      {formularios.length === 0 && (
        <option value="">No hay formularios disponibles</option>
      )}
      {formularios.map((formulario) => (
        <option
          key={formulario.codigo}
          value={formulario.codigo}
        >
          {formulario.numero}. {formulario.nombre}
        </option>
      ))}
    </select>
    <span className="mt-1 text-xs text-base-content/70">
      Los tres catálogos de abajo son los de este formulario. Un mismo punto puede
      pertenecer a varios: al crearlo aquí queda vinculado a este.
    </span>
  </div>
);

export default SelectorFormularioAdmin;
