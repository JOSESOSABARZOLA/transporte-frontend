/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: ModalVehiculo.tsx
 * Responsabilidad: Dar de alta o corregir un vehículo del maestro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * LA PLACA SÍ SE PUEDE CORREGIR, a diferencia de la cédula de un conductor o del correo de
 * una cuenta. El servidor lo admite y tiene sentido: una placa mal digitada es un error de
 * captura y el vehículo sigue siendo el mismo. La cédula, en cambio, identifica a otra
 * persona, y cambiarla no sería corregir el registro sino crear otro.
 *
 * NO SE VALIDA CONTRA UN PATRÓN DE PLACA, y es deliberado: `vehi_placa` es `VarChar(10)` y
 * **ninguna fuente define el formato**. La flota de la AMC incluye motocicletas y vehículos
 * con placa institucional, y ninguna transcripción dice cómo se escriben. Inventar aquí un
 * `AAA-0000` rechazaría placas legítimas el primer día.
 */

import { Field, Form, Formik } from "formik";
import type { FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";

import { TextInput } from "../forms/FormikField.tsx";
import { esquemaVehiculo } from "../../config/validationSchemas.ts";
import type { Vehiculo } from "../../interfaces/Transporte.ts";

/** Los dos campos que el contrato admite, con la descripción siempre presente. */
export type ValoresVehiculo = { placa: string; descripcion: string };

type ModalVehiculoProps = {
  abierto: boolean;
  /** Con vehículo se edita; sin él se da de alta. */
  vehiculo: Vehiculo | null;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  onGuardar: (valores: ValoresVehiculo) => void;
  onCancelar: () => void;
};

const ModalVehiculo: FC<ModalVehiculoProps> = ({
  abierto,
  vehiculo,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}) => {
  if (!abierto) return null;

  const iniciales: ValoresVehiculo = {
    placa: vehiculo?.placa ?? "",
    descripcion: vehiculo?.descripcion ?? "",
  };

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta={vehiculo ? "Editar vehículo" : "Nuevo vehículo"}
      ancho="lg"
      onCerrar={guardando ? undefined : onCancelar}
    >
        <h3 className="mb-1 text-lg font-bold">
          {vehiculo ? `Editar ${vehiculo.placa}` : "Nuevo vehículo"}
        </h3>
        <p className="mb-4 text-xs text-base-content/70">
          La descripción es lo que distingue dos placas parecidas cuando la DAF
          asigna con prisa. Conviene escribirla.
        </p>

        {aviso && (
          <div
            className="alert alert-error mb-4"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        <Formik<ValoresVehiculo>
          initialValues={iniciales}
          enableReinitialize
          validationSchema={esquemaVehiculo}
          onSubmit={onGuardar}
        >
          <Form className="flex flex-col gap-3">
            <Field
              name="placa"
              component={TextInput}
              label="Placa"
              required
              placeholder="PBA-1234"
            />
            <Field
              name="descripcion"
              component={TextInput}
              label="Descripción"
              placeholder="Camioneta doble cabina blanca"
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
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </Form>
        </Formik>
    </MarcoModal>
  );
};

export default ModalVehiculo;
