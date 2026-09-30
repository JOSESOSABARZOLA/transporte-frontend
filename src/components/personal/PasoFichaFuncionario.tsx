/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Alta desde el directorio de Auth central
 * Archivo: PasoFichaFuncionario.tsx
 * Responsabilidad: Paso 2 del alta — completar la ficha, dentro del cajón (sin modal propio).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO LOS CAMPOS: el `<Formik>` y el pie los provee `DrawerFlujoAlta`. Lee los valores por
 * `useFormikContext`, igual que hacía `CampoZonal` en el modal.
 *
 *   · Modo AUTH: cédula y correo llegan de Auth y NO se editan — van en una tarjeta-resumen de
 *     solo lectura, con «Cambiar» para volver al paso 1. Se retira el banner azul del modal.
 *   · Modo MANUAL: sin Auth; cédula (obligatoria) y correo (opcional) sí son campos.
 *   · Tipo de contrato PRIMERO, segmentado y SIN valor por defecto (RN-26 se decide mirando).
 *   · Área obligatoria sin precargar; zonal/cargo/teléfono opcionales, marcados «(opcional)».
 *   · Sin placeholders que parezcan datos reales.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Field, useFormikContext } from "formik";
import type { FC } from "react";

import Iconos from "../common/Iconos.tsx";
import SelectorSegmentado from "../forms/SelectorSegmentado.tsx";
import {
  EmailInput,
  PhoneInput,
  SelectInput,
  TextInput,
} from "../forms/FormikField.tsx";
import type { AreaPersonal, Zonal } from "../../interfaces/Formulario.ts";
import type { TipoContrato } from "../../interfaces/Personal.ts";
import { NOMBRE_AREA, NOMBRE_CONTRATO } from "../../utils/personal.util.ts";

/**
 * Valores de la ficha en el cajón. `area` y `tipoContrato` admiten "" = SIN elegir (no hay valor
 * por defecto, a diferencia del viejo modal). Yup los exige al guardar.
 */
export type ValoresFichaAlta = {
  cedula: string;
  apellidos: string;
  nombres: string;
  telefono: string;
  correo: string;
  cargo: string;
  area: AreaPersonal | "";
  tipoContrato: TipoContrato | "";
  /** Id de la zonal como texto (valor del `<select>`); "" = sin elegir. */
  zonalId: string;
};

/** Lo que Auth sabe de la persona elegida, para la tarjeta-resumen de solo lectura. */
export type ResumenAuth = { nombre: string; cedula: string; correo: string };

/** Áreas de la DMIP que capturan zonal en la ficha; Instrucción no (la fija su matriz). */
const AREAS_CON_ZONAL: AreaPersonal[] = ["OPERATIVOS", "GENERAL", "TECNICO"];
const CONTRATOS = Object.keys(NOMBRE_CONTRATO) as TipoContrato[];

/** Iniciales para la tarjeta: primeras letras de las dos primeras palabras del nombre. */
const inicialesDe = (nombre: string): string =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0] ?? "")
    .join("")
    .toUpperCase();

type PasoFichaFuncionarioProps = {
  /** «auth»/«manual» son ALTA; «edicion» corrige una ficha existente (cédula en solo lectura). */
  modo: "auth" | "manual" | "edicion";
  resumen: ResumenAuth | null;
  areasQueGestiona: AreaPersonal[];
  zonales: Zonal[];
  /** «Cambiar» / volver al paso 1 a elegir otra persona (conserva lo escrito). */
  onCambiar: () => void;
};

const PasoFichaFuncionario: FC<PasoFichaFuncionarioProps> = ({
  modo,
  resumen,
  areasQueGestiona,
  zonales,
  onCambiar,
}) => {
  const { values, errors, touched, submitCount, setFieldValue, setFieldTouched } =
    useFormikContext<ValoresFichaAlta>();

  const mostrarZonal =
    values.area !== "" && AREAS_CON_ZONAL.includes(values.area);

  // El error del segmentado se muestra tras tocar el campo o intentar enviar (como FormikField).
  const errorContrato =
    (touched.tipoContrato || submitCount > 0) && errors.tipoContrato
      ? String(errors.tipoContrato)
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      {modo === "auth" && resumen ? (
        <div className="rounded-md border border-base-300 bg-base-200 p-3">
          <div className="flex items-center gap-3">
            <span
              className="badge badge-primary badge-lg"
              aria-hidden="true"
            >
              {inicialesDe(resumen.nombre)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="font-medium">{resumen.nombre}</span>
              <span className="text-xs text-base-content/70">
                <span className="font-mono">{resumen.cedula}</span>
                {resumen.correo ? ` · ${resumen.correo}` : ""}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto"
              onClick={onCambiar}
            >
              Cambiar
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-base-content/70">
            <Iconos nombre="permisos" />
            Datos de Auth central · solo lectura
          </p>
        </div>
      ) : modo === "edicion" ? (
        // EDICIÓN: la cédula es la identidad de la ficha, no se cambia (solo lectura); el correo sí.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            name="cedula"
            component={TextInput}
            label="Cédula"
            disabled
          />
          <Field
            name="correo"
            component={EmailInput}
            label="Correo (opcional)"
          />
        </div>
      ) : (
        <>
          <div
            className="alert alert-warning"
            role="status"
          >
            <span className="text-xs">Registro sin Auth central.</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              name="cedula"
              component={TextInput}
              label="Cédula"
              required
            />
            <Field
              name="correo"
              component={EmailInput}
              label="Correo (opcional)"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          name="apellidos"
          component={TextInput}
          label="Apellidos"
          required
        />
        <Field
          name="nombres"
          component={TextInput}
          label="Nombres"
          required
        />
      </div>
      {modo === "auth" && (
        <span className="text-xs text-base-content/70">
          Auth trae el nombre completo: revise que la división quedó bien.
        </span>
      )}

      {/* Tipo de contrato PRIMERO, segmentado, sin valor por defecto (RN-26). */}
      <SelectorSegmentado
        id="tipoContrato"
        etiqueta="Tipo de contrato"
        obligatorio
        opciones={CONTRATOS.map((contrato) => ({
          valor: contrato,
          nombre: NOMBRE_CONTRATO[contrato],
        }))}
        valor={values.tipoContrato}
        onCambiar={(valor) => {
          void setFieldValue("tipoContrato", valor);
          void setFieldTouched("tipoContrato", true, false);
        }}
        ayuda="Define si la persona puede salir de noche o en fin de semana."
        error={errorContrato}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          name="area"
          component={SelectInput}
          label="Área"
          required
          options={areasQueGestiona.map((area) => ({
            value: area,
            label: NOMBRE_AREA[area],
          }))}
        />
        {mostrarZonal && (
          <Field
            name="zonalId"
            component={SelectInput}
            label="Zonal (opcional)"
            options={zonales.map((zonal) => ({
              value: String(zonal.id),
              label: zonal.nombre,
            }))}
          />
        )}
        <Field
          name="cargo"
          component={TextInput}
          label="Cargo (opcional)"
        />
        <Field
          name="telefono"
          component={PhoneInput}
          label="Teléfono (opcional)"
        />
      </div>
    </div>
  );
};

export default PasoFichaFuncionario;
