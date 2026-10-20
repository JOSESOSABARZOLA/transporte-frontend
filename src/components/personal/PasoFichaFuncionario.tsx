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
 * `useFormikContext`.
 *
 * POR SECCIONES DESDE EL 2026-10-08: Persona · Nombre en el cuadro · Vinculación · Contacto.
 *
 *   · Modo AUTH: la persona va en una tarjeta de solo lectura (iniciales, nombre de Auth, cédula,
 *     correo institucional y dependencia) con «Cambiar». El correo institucional se muestra en
 *     Contacto SOLO LECTURA con «🔒 Viene de Auth central; se corrige allá»: lo toma el SERVIDOR
 *     de Auth por la cédula (`origen: "AUTH"`), no lo que diga el navegador.
 *   · Modo MANUAL: sin Auth; cédula (obligatoria) y los dos correos son campos.
 *   · Modo EDICIÓN: la cédula en solo lectura; los correos editables.
 *   · Tipo de contrato con botones segmentados y SIN valor por defecto (RN-26 se decide mirando).
 *   · Área obligatoria sin precargar; zonal («Sin zonal»), cargo y teléfono opcionales.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Field, useFormikContext } from "formik";
import type { FC } from "react";

import Boton from "../common/Boton.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
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
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

/**
 * Valores de la ficha en el cajón. `area` y `tipoContrato` admiten "" = SIN elegir (no hay valor
 * por defecto). Yup los exige al guardar.
 */
export type ValoresFichaAlta = {
  cedula: string;
  apellidos: string;
  nombres: string;
  telefono: string;
  correoInstitucional: string;
  correoPersonal: string;
  cargo: string;
  area: AreaPersonal | "";
  tipoContrato: TipoContrato | "";
  /** Id de la zonal como texto (valor del `<select>`); "" = sin zonal. */
  zonalId: string;
};

/**
 * Lo que Auth sabe de la persona elegida, para la tarjeta de solo lectura. El correo de Auth es el
 * INSTITUCIONAL (la cuenta AD); el personal no lo conoce Auth y se captura aparte.
 */
export type ResumenAuth = {
  nombre: string;
  cedula: string;
  correoInstitucional: string;
  dependencia?: string | null;
};

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

  // El error del segmentado se muestra tras intentar guardar (como el resto de campos).
  const errorContrato =
    (touched.tipoContrato || submitCount > 0) && errors.tipoContrato
      ? String(errors.tipoContrato)
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      {modo === "auth" && resumen && (
        <div className="rounded-md border border-base-300 bg-base-200 p-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content"
              aria-hidden="true"
            >
              {inicialesDe(resumen.nombre)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{resumen.nombre}</span>
              <span className="text-xs text-app-muted">
                <span className="font-mono">{resumen.cedula}</span>
                {resumen.correoInstitucional
                  ? ` · ${resumen.correoInstitucional}`
                  : ""}
              </span>
              <span className="flex items-center gap-1 text-xs text-app-muted">
                <Iconos nombre="permisos" />
                {resumen.dependencia ? `${resumen.dependencia} · ` : ""}
                datos de Auth central, solo lectura
              </span>
            </div>
            <Boton
              variante="enlace"
              tamano="sm"
              onClick={onCambiar}
            >
              Cambiar
            </Boton>
          </div>
        </div>
      )}

      {modo === "manual" && (
        <AvisoEnLinea variante="advertencia">Registro sin Auth central.</AvisoEnLinea>
      )}

      <SeccionDrawer
        titulo="Nombre en el cuadro"
        rejilla={false}
      >
        {modo === "manual" && (
          <Field
            name="cedula"
            component={TextInput}
            label="Cédula"
            required
          />
        )}
        {modo === "edicion" && (
          <Field
            name="cedula"
            component={TextInput}
            label="Cédula"
            disabled
          />
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
          <span className="text-xs text-app-muted">
            Auth trae el nombre completo; el sistema lo dividió en apellidos y
            nombres. Revise que quedó bien.
          </span>
        )}
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Vinculación"
        rejilla={false}
      >
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
          ayuda="Define si puede salir de noche o en fin de semana (reglas de descanso)."
          error={errorContrato}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            name="area"
            component={SelectInput}
            label="Área"
            required
            opcionVacia="Seleccione…"
            options={areasQueGestiona.map((area) => ({
              value: area,
              label: NOMBRE_AREA[area],
            }))}
          />
          {/*
            ZONAL PARA TODAS LAS ÁREAS (2026-10-08) y siempre visible: es la MISMA columna que
            escribe la matriz de cobertura. Vacía significa «Sin zonal».
          */}
          <Field
            name="zonalId"
            component={SelectInput}
            label="Zonal (opcional)"
            opcionVacia="Sin zonal"
            options={zonales.map((zonal) => ({
              value: String(zonal.id),
              label: zonal.nombre,
            }))}
          />
        </div>
        <Field
          name="cargo"
          component={TextInput}
          label="Cargo (opcional)"
          placeholder="Ej. Agente AMC, Inspector Notificador"
        />
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Contacto"
        rejilla={false}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modo === "auth" ? (
            <div className="form-control w-full">
              <label
                className="label"
                htmlFor="correoInstitucionalAuth"
              >
                <span className="label-text">Correo institucional</span>
              </label>
              <input
                id="correoInstitucionalAuth"
                className="input input-bordered w-full"
                value={values.correoInstitucional}
                readOnly
                aria-describedby="correoInstitucionalAuth-nota"
              />
              <span
                id="correoInstitucionalAuth-nota"
                className="mt-1 flex items-center gap-1 text-xs text-app-muted"
              >
                <Iconos nombre="permisos" />
                Viene de Auth central; se corrige allá.
              </span>
            </div>
          ) : (
            <Field
              name="correoInstitucional"
              component={EmailInput}
              label="Correo institucional (opcional)"
            />
          )}
          <Field
            name="correoPersonal"
            component={EmailInput}
            label="Correo personal (opcional)"
            placeholder="nombre@correo.com"
          />
        </div>
        <Field
          name="telefono"
          component={PhoneInput}
          label="Teléfono (opcional)"
          placeholder="09XXXXXXXX"
        />
      </SeccionDrawer>
    </div>
  );
};

export default PasoFichaFuncionario;
