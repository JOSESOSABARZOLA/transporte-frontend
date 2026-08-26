/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: PanelAusencias.tsx
 * Responsabilidad: Registrar y retirar los periodos de ausencia de una persona.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES DE UNA PERSONA, NO DE TODAS, Y ESO LO DECIDE EL CONTRATO.
 *
 * `GET /administracion/personal/:id/disponibilidad` devuelve los periodos **de un
 * funcionario**. No existe ningún endpoint que liste las ausencias de la institución, así
 * que el listado global que dibuja FASE5 §4.5 exigiría una petición por ficha. Se muestra
 * el de la persona elegida, que es además el contexto en el que se registra una ausencia.
 * Registrado como PV-35.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL SOLAPE NO SE COMPRUEBA AQUÍ. INV-14 depende de los demás periodos de esa persona en
 * el servidor, incluidos los que otro administrador acabe de registrar. Llega como `409`
 * con su mensaje, y se muestra tal cual.
 */

import { ErrorMessage, Field, Form, Formik } from "formik";
import type { FC } from "react";

import { SelectInput, TextInput } from "../forms/FormikField.tsx";
import { esquemaAusencia } from "../../config/validationSchemas.ts";
import type {
  Disponibilidad,
  EstadoDisponibilidad,
  Funcionario,
} from "../../interfaces/Personal.ts";
import {
  NOMBRE_ESTADO_DISPONIBILIDAD,
  SITUACIONES_DE_AUSENCIA,
  ausenciaVigente,
  nombreCompleto,
} from "../../utils/personal.util.ts";

type ValoresAusencia = {
  estado: EstadoDisponibilidad;
  desde: string;
  hasta: string;
  motivo: string;
};

const VALORES_INICIALES: ValoresAusencia = {
  estado: "VACACIONES",
  desde: "",
  hasta: "",
  motivo: "",
};

type PanelAusenciasProps = {
  funcionario: Funcionario;
  ausencias: Disponibilidad[];
  cargando: boolean;
  guardando: boolean;
  hoy: string;
  aviso: string | null;
  onRegistrar: (valores: ValoresAusencia) => void;
  onRetirar: (periodoId: number) => void;
  onCerrar: () => void;
};

/**
 * Fecha de calendario, como texto `AAAA-MM-DD`.
 *
 * **No usa `DateInput` de `FormikField`**, y es deliberado: aquel convierte a `Date` para
 * entregarlo al formulario, y `disp_desde` y `disp_hasta` son `@db.Date` —fechas de
 * calendario, sin hora ni huso—. Convertirlas a `Date` en Quito, que está en UTC−5, las
 * desplazaría un día al volver a formatearlas. El control nativo ya trabaja con el texto
 * que el servidor espera; convertirlo y desconvertirlo solo añade sitios donde perder un día.
 */
const CampoFecha: FC<{ nombre: string; etiqueta: string }> = ({
  nombre,
  etiqueta,
}) => (
  <div className="form-control w-full">
    <label
      className="label"
      htmlFor={nombre}
    >
      <span className="label-text font-medium">
        {etiqueta}
        <span className="text-error ml-1">*</span>
      </span>
    </label>
    <Field
      id={nombre}
      name={nombre}
      type="date"
      className="input input-bordered input-sm w-full"
    />
    <ErrorMessage
      name={nombre}
      component="span"
      className="label-text-alt text-error mt-1"
    />
  </div>
);

const PanelAusencias: FC<PanelAusenciasProps> = ({
  funcionario,
  ausencias,
  cargando,
  guardando,
  hoy,
  aviso,
  onRegistrar,
  onRetirar,
  onCerrar,
}) => {
  const vigente = ausenciaVigente(ausencias, hoy);

  return (
    <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
      <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
          Ausencias de {nombreCompleto(funcionario)}
        </h2>
        <button
          type="button"
          className="btn btn-sm app-modules-panel-action"
          onClick={onCerrar}
          disabled={guardando}
        >
          Cerrar
        </button>
      </div>

      <div className="app-data-panel-body flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6">
        {vigente && (
          <div className="alert alert-warning">
            <span>
              Hoy está en {NOMBRE_ESTADO_DISPONIBILIDAD[vigente.estado]} hasta el{" "}
              {vigente.hasta}: no se ofrece en los desplegables de personal.
            </span>
          </div>
        )}

        {aviso && (
          <div
            className="alert alert-error"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        <Formik<ValoresAusencia>
          initialValues={VALORES_INICIALES}
          validationSchema={esquemaAusencia}
          onSubmit={(valores, ayudas) => {
            onRegistrar(valores);
            ayudas.resetForm();
          }}
        >
          <Form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field
              name="estado"
              component={SelectInput}
              label="Situación"
              required
              options={SITUACIONES_DE_AUSENCIA.map((estado) => ({
                value: estado,
                label: NOMBRE_ESTADO_DISPONIBILIDAD[estado],
              }))}
            />
            <CampoFecha
              nombre="desde"
              etiqueta="Desde"
            />
            <CampoFecha
              nombre="hasta"
              etiqueta="Hasta"
            />
            <Field
              name="motivo"
              component={TextInput}
              label="Motivo"
              placeholder="Opcional"
            />

            <div className="sm:col-span-2 xl:col-span-4 flex justify-end">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={guardando}
              >
                {guardando ? "Registrando…" : "Registrar ausencia"}
              </button>
            </div>
          </Form>
        </Formik>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-base-content/70">
                <th scope="col">Situación</th>
                <th scope="col">Desde</th>
                <th scope="col">Hasta</th>
                <th scope="col">Motivo</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-base-content/70"
                  >
                    Consultando sus ausencias…
                  </td>
                </tr>
              ) : ausencias.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-base-content/70"
                  >
                    No tiene ausencias registradas.
                  </td>
                </tr>
              ) : (
                ausencias.map((periodo) => (
                  <tr key={periodo.id}>
                    <td className="px-3 py-1 align-top">
                      {NOMBRE_ESTADO_DISPONIBILIDAD[periodo.estado]}
                    </td>
                    <td className="px-3 py-1 align-top">{periodo.desde}</td>
                    <td className="px-3 py-1 align-top">{periodo.hasta}</td>
                    {/* El motivo puede describir una condición de salud: no sale de
                        esta pantalla, que es la única del ADMINISTRADOR. */}
                    <td className="px-3 py-1 align-top">
                      {periodo.motivo ?? "—"}
                    </td>
                    <td className="px-3 py-1 align-top">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => onRetirar(periodo.id)}
                        disabled={guardando}
                      >
                        Retirar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PanelAusencias;
