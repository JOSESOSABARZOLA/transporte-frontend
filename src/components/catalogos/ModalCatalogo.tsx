/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: ModalCatalogo.tsx
 * Responsabilidad: Dar de alta o corregir un valor de cualquiera de los tres catálogos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN MODAL PARA LOS TRES, CON EL ESQUEMA Y LOS CAMPOS QUE LE PASE LA PANTALLA.
 *
 * Los tres catálogos se dan de alta igual: un formulario corto, un botón y el mensaje del
 * servidor si algo falla. Lo único que cambia son los campos y su validación. Tres modales
 * casi idénticos serían la misma duplicación que D-01 obligó a deshacer en M-22.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL RECHAZO SE MUESTRA DENTRO DEL MODAL Y NO SE PIERDE LO ESCRITO. El caso 3 del plan es
 * un nombre duplicado: el servidor responde con el nombre del punto que ya existe, y quien
 * lo ve tiene que poder corregir esa palabra, no volver a escribir el formulario entero.
 */

import { Form, Formik, type FormikHelpers } from "formik";
import type { ReactNode } from "react";
import type * as Yup from "yup";

import MarcoModal from "../common/MarcoModal.tsx";
import EnfocarPrimerError from "../forms/EnfocarPrimerError.tsx";

type ModalCatalogoProps<T extends Record<string, unknown>> = {
  abierto: boolean;
  titulo: string;
  valoresIniciales: T;
  esquema: Yup.ObjectSchema<Record<string, unknown>>;
  /** Los campos del formulario. Se reciben ya compuestos por la pantalla. */
  campos: ReactNode;
  guardando: boolean;
  /** Mensaje del servidor tras un rechazo. Se muestra tal cual. */
  aviso: string | null;
  onGuardar: (valores: T, ayudas: FormikHelpers<T>) => void;
  onCancelar: () => void;
};

const ModalCatalogo = <T extends Record<string, unknown>>({
  abierto,
  titulo,
  valoresIniciales,
  esquema,
  campos,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}: ModalCatalogoProps<T>) => {
  if (!abierto) return null;

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta={titulo}
      ancho="lg"
      onCerrar={guardando ? undefined : onCancelar}
    >
        <h3 className="mb-4 text-lg font-semibold">{titulo}</h3>

        {aviso && (
          <div
            className="alert alert-error mb-4"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        <Formik<T>
          initialValues={valoresIniciales}
          enableReinitialize
          validationSchema={esquema}
          onSubmit={onGuardar}
        >
          <Form className="flex flex-col gap-3">
            <EnfocarPrimerError />
            {campos}

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
                  "Guardar"
                )}
              </button>
            </div>
          </Form>
        </Formik>
    </MarcoModal>
  );
};

export default ModalCatalogo;
