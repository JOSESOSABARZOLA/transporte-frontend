/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: CamposFormulario.tsx
 * Responsabilidad: Los campos del alta/edición de un formulario, dentro del modal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-29
 *
 * EL COLOR SE ELIGE DE LA PALETA, no se teclea (manual de marca, regla 13): cada muestra
 * lleva su nombre en palabras (regla 6) y fija los tres campos de color a la vez. Las áreas
 * son casillas —al menos una—; las banderas de comportamiento, casillas también. Número y
 * código quedan deshabilitados al editar: son la identidad del formulario y no cambian.
 */

import { Field, useFormikContext } from "formik";
import type { FC } from "react";

import type { RolDepartamental } from "../../config/env.ts";
import {
  CheckboxInput,
  NumberInput,
  SelectInput,
  TextInput,
} from "../forms/FormikField.tsx";
import type {
  AreaPersonal,
  ColorPaleta,
  PoliticaVehiculo,
} from "../../interfaces/Formulario.ts";
import { NOMBRE_AREA, NOMBRE_DIRECCION } from "../../utils/personal.util.ts";

/** Los campos de color y áreas que este componente controla por fuera de `<Field>`. */
interface ValoresConColorYAreas {
  colorFondo?: string;
  colorAcento?: string;
  colorNombre?: string;
  areas?: AreaPersonal[];
}

/** Departamentos que pueden ser DUEÑOS de un formulario (registran en él). */
const ROLES_DUENO: RolDepartamental[] = [
  "DMIP_OPERATIVOS",
  "DMIP_INSPECCIONES",
  "DMIT_INSTRUCTOR",
];

/** Áreas de personal que un formulario puede admitir. */
const AREAS: AreaPersonal[] = ["OPERATIVOS", "GENERAL", "TECNICO", "INSTRUCCION"];

const POLITICAS: { valor: PoliticaVehiculo; etiqueta: string }[] = [
  { valor: "NO_APLICA", etiqueta: "No aplica" },
  { valor: "CONDICIONAL", etiqueta: "Condicional" },
  { valor: "REQUERIDO", etiqueta: "Requerido" },
  { valor: "OBLIGATORIO", etiqueta: "Obligatorio" },
];

/** Las banderas de comportamiento, con una etiqueta legible cada una. */
const BANDERAS: { nombre: string; etiqueta: string }[] = [
  { nombre: "esPatrulla", etiqueta: "Es patrulla" },
  { nombre: "condicionanteNoct", etiqueta: "Condicionante nocturno" },
  { nombre: "tipoControlMultiple", etiqueta: "Admite varios tipos de control" },
  { nombre: "capturaLibreTipo", etiqueta: "Tipo de control libre (adicionales)" },
  { nombre: "capturaLibrePunto", etiqueta: "Punto de encuentro libre (adicionales)" },
  { nombre: "puntoManual", etiqueta: "Agregar punto al catálogo al registrar" },
  { nombre: "filtraPersonalPorRol", etiqueta: "Filtra el personal por el rol que consulta" },
  { nombre: "variosPorPersona", etiqueta: "Un operativo por persona (split)" },
  { nombre: "cantidadPorPersona", etiqueta: "Ofrece fijar cantidad de operativos por persona" },
];

const CamposFormulario: FC<{ paleta: ColorPaleta[]; esEdicion: boolean }> = ({
  paleta,
  esEdicion,
}) => {
  const { values, errors, touched, setFieldValue, setFieldTouched } =
    useFormikContext<ValoresConColorYAreas>();

  const areasElegidas = values.areas ?? [];
  const errorColor =
    touched.colorFondo && typeof errors.colorFondo === "string"
      ? errors.colorFondo
      : "";
  const errorAreas =
    touched.areas && typeof errors.areas === "string" ? errors.areas : "";

  const alternarArea = (area: AreaPersonal): void => {
    const siguiente = areasElegidas.includes(area)
      ? areasElegidas.filter((otra) => otra !== area)
      : [...areasElegidas, area];
    void setFieldValue("areas", siguiente);
    void setFieldTouched("areas", true);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          name="numero"
          component={NumberInput}
          label="Número"
          required
          disabled={esEdicion}
          placeholder="10"
        />
        <Field
          name="codigo"
          component={TextInput}
          label="Código"
          required
          disabled={esEdicion}
          placeholder="OCFIJ"
        />
      </div>

      <Field
        name="nombre"
        component={TextInput}
        label="Nombre del formulario"
        required
        placeholder="OPERATIVOS DE CONTROL FIJOS"
      />

      <div className="app-modules-modal-field form-control w-full">
        <label className="label">
          <span className="app-modules-modal-label label-text font-medium">
            Color
            <span className="text-error ml-1" aria-hidden="true">
              *
            </span>
          </span>
        </label>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Color del formulario"
        >
          {paleta.map((color) => {
            const activo =
              (values.colorFondo ?? "").toUpperCase() ===
              color.fondo.toUpperCase();
            return (
              <button
                key={color.fondo}
                type="button"
                title={color.nombre}
                aria-pressed={activo}
                onClick={() => {
                  void setFieldValue("colorFondo", color.fondo);
                  void setFieldValue("colorAcento", color.acento);
                  void setFieldValue("colorNombre", color.nombre);
                  void setFieldTouched("colorFondo", true);
                }}
                className={`btn btn-sm gap-2 ${activo ? "btn-primary" : "btn-outline"}`}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full border border-base-300"
                  style={{ backgroundColor: color.fondo }}
                  aria-hidden="true"
                />
                {color.nombre}
              </button>
            );
          })}
        </div>
        {values.colorNombre && (
          <span className="mt-1 text-xs text-base-content/70">
            Color elegido: {values.colorNombre}
          </span>
        )}
        {errorColor && (
          <div className="label whitespace-normal">
            <span role="alert" className="label-text-alt text-error min-w-0">
              {errorColor}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          name="rolDueno"
          component={SelectInput}
          label="Departamento dueño"
          required
          options={ROLES_DUENO.map((rol) => ({
            value: rol,
            label: NOMBRE_DIRECCION[rol],
          }))}
        />
        <Field
          name="prefijo"
          component={TextInput}
          label="Prefijo del identificador"
          required
          placeholder="OCF"
        />
      </div>

      <Field
        name="politicaVehiculo"
        component={SelectInput}
        label="Política de vehículo"
        options={POLITICAS.map((politica) => ({
          value: politica.valor,
          label: politica.etiqueta,
        }))}
      />

      <div className="app-modules-modal-field form-control w-full">
        <label className="label">
          <span className="app-modules-modal-label label-text font-medium">
            Áreas de personal
            <span className="text-error ml-1" aria-hidden="true">
              *
            </span>
          </span>
        </label>
        <div className="flex flex-col gap-1">
          {AREAS.map((area) => (
            <label
              key={area}
              className="label cursor-pointer justify-start gap-2"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm"
                checked={areasElegidas.includes(area)}
                onChange={() => alternarArea(area)}
              />
              <span className="label-text">{NOMBRE_AREA[area]}</span>
            </label>
          ))}
        </div>
        {errorAreas && (
          <div className="label whitespace-normal">
            <span role="alert" className="label-text-alt text-error min-w-0">
              {errorAreas}
            </span>
          </div>
        )}
      </div>

      <div className="app-modules-modal-field form-control w-full">
        <label className="label">
          <span className="app-modules-modal-label label-text font-medium">
            Comportamiento
          </span>
        </label>
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {BANDERAS.map((bandera) => (
            <Field
              key={bandera.nombre}
              name={bandera.nombre}
              component={CheckboxInput}
              label={bandera.etiqueta}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default CamposFormulario;
