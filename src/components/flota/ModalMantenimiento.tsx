/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mantenimiento de vehículos
 * Archivo: ModalMantenimiento.tsx
 * Responsabilidad: Capturar una parada de taller. RN-DAF-05.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * TRES DE LOS CINCO CAMPOS SON OPCIONALES, y es una decisión de uso, no un descuido.
 *
 * El taller llama y dice «me traen la 7056 el jueves». En ese momento se sabe la placa y
 * las fechas; el taller concreto, la hora de la cita y el motivo llegan después. Exigirlos
 * retrasaría el registro justo cuando más urge que la placa deje de ofrecerse a la DAF.
 *
 * LAS FECHAS SON `input type="date"` DIRECTOS, NO `DateInput` de Formik: aquél convierte a
 * `Date` y en Quito —UTC−5— eso desplaza la fecha un día. Regla 12 de CLAUDE.md.
 */

import { Field, Form, Formik } from "formik";
import type { FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";
import { DateTextInput, TextInput } from "../forms/FormikField.tsx";
import EnfocarPrimerError from "../forms/EnfocarPrimerError.tsx";
import { esquemaMantenimiento } from "../../config/validationSchemas.ts";
import type { VehiculoDeLaFlota } from "../../interfaces/Transporte.ts";

export type ValoresMantenimiento = {
  desde: string;
  hasta: string;
  taller: string;
  hora: string;
  motivo: string;
};

type ModalMantenimientoProps = {
  abierto: boolean;
  vehiculo: VehiculoDeLaFlota | null;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  onGuardar: (valores: ValoresMantenimiento) => void;
  onCancelar: () => void;
};

const ModalMantenimiento: FC<ModalMantenimientoProps> = ({
  abierto,
  vehiculo,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}) => {
  if (!abierto || !vehiculo) return null;

  const iniciales: ValoresMantenimiento = {
    desde: "",
    hasta: "",
    taller: "",
    hora: "",
    motivo: "",
  };

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta={`Registrar mantenimiento de ${vehiculo.placa}`}
      ancho="lg"
      onCerrar={guardando ? undefined : onCancelar}
    >
      <h3 className="mb-1 text-lg font-semibold">
        Mantenimiento de {vehiculo.placa}
      </h3>
      <p className="mb-4 text-xs text-base-content/70">
        Mientras dure la parada, esta placa se ofrecerá inhabilitada en la
        asignación de transporte y no se podrá asignar.
      </p>

      {aviso && (
        <div
          className="alert alert-error mb-4"
          role="alert"
        >
          <span>{aviso}</span>
        </div>
      )}

      <Formik<ValoresMantenimiento>
        initialValues={iniciales}
        enableReinitialize
        validationSchema={esquemaMantenimiento}
        onSubmit={onGuardar}
      >
        <Form className="flex flex-col gap-3">
          <EnfocarPrimerError />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              name="desde"
              component={DateTextInput}
              label="Desde"
              required
            />
            <Field
              name="hasta"
              component={DateTextInput}
              label="Hasta"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              name="taller"
              component={TextInput}
              label="Taller"
              placeholder="AMBACAR"
            />
            <Field
              name="hora"
              component={TextInput}
              label="Hora de la cita"
              placeholder="08:00"
            />
          </div>

          <Field
            name="motivo"
            component={TextInput}
            label="Motivo"
            placeholder="Cambio de frenos"
          />

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onCancelar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <span
                    className="loading loading-spinner loading-sm"
                    aria-hidden="true"
                  />
                  Guardando…
                </>
              ) : (
                "Registrar parada"
              )}
            </button>
          </div>
        </Form>
      </Formik>
    </MarcoModal>
  );
};

export default ModalMantenimiento;
