/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: ModalConductor.tsx
 * Responsabilidad: Dar de alta o editar un conductor del maestro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * LA CÉDULA NO SE EDITA. Es la llave natural del conductor —lleva índice único— y
 * cambiarla no sería corregir este registro, sería crear otro. Al editar se muestra como
 * `badge badge-ghost badge-sm`, no como campo deshabilitado: regla 5 de CLAUDE.md, los
 * campos calculados no son campos. Mismo criterio que el correo en P-11.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL VEHÍCULO HABITUAL IMPORTA MÁS DE LO QUE PARECE, y por eso lleva su explicación al
 * lado en vez de en un manual que nadie abre.
 *
 * De él sale la placa que P-03 propone al elegir al conductor (RF-032). Pero además es
 * **la única vía por la que la DAF llega a conocer un vehículo**: su desplegable se compone
 * con los habituales de los conductores disponibles, así que un vehículo que no sea
 * habitual de nadie no se puede asignar (PV-33). Dejarlo vacío no da ningún error hoy y
 * aparece el día del operativo.
 *
 * SE PUEDE CAMBIAR PERO NO QUITAR: el contrato del servidor declara `vehiculoHabitualId`
 * como entero y rechaza nulo. Es una limitación heredada, no una decisión de esta
 * pantalla, y se dice donde se nota.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Field, Form, Formik } from "formik";
import type { FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";

import { SelectInput, TextInput } from "../forms/FormikField.tsx";
import { esquemaConductor } from "../../config/validationSchemas.ts";
import type { Conductor, Vehiculo } from "../../interfaces/Transporte.ts";

/**
 * Lo que el formulario maneja. `vehiculoHabitualId` viaja como **texto** porque un
 * `<select>` de HTML solo tiene cadenas; la pantalla lo convierte antes de enviarlo.
 */
export type ValoresConductor = {
  cedula: string;
  nombreCompleto: string;
  telefono: string;
  licenciaTipo: string;
  vehiculoHabitualId: string;
};

type ModalConductorProps = {
  abierto: boolean;
  /** Con conductor se edita; sin él se da de alta. */
  conductor: Conductor | null;
  /** Vehículos del maestro. Solo se ofrecen los activos. */
  vehiculos: Vehiculo[];
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  onGuardar: (valores: ValoresConductor) => void;
  onCancelar: () => void;
};

const ModalConductor: FC<ModalConductorProps> = ({
  abierto,
  conductor,
  vehiculos,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}) => {
  if (!abierto) return null;

  const esAlta = conductor === null;

  // Un vehículo dado de baja no se ofrece: asignarlo dejaría al conductor con una placa
  // que la DAF nunca verá, porque su desplegable solo mira los vehículos vigentes.
  const disponibles = vehiculos.filter((vehiculo) => vehiculo.activo);

  const iniciales: ValoresConductor = {
    cedula: conductor?.cedula ?? "",
    nombreCompleto: conductor?.nombreCompleto ?? "",
    telefono: conductor?.telefono ?? "",
    licenciaTipo: conductor?.licenciaTipo ?? "",
    vehiculoHabitualId: conductor?.vehiculoHabitual
      ? String(conductor.vehiculoHabitual.id)
      : "",
  };

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta={esAlta ? "Nuevo conductor" : `Editar a ${conductor.nombreCompleto}`}
      ancho="2xl"
      onCerrar={guardando ? undefined : onCancelar}
    >
        <h3 className="mb-1 text-lg font-bold">
          {esAlta ? "Nuevo conductor" : `Editar a ${conductor.nombreCompleto}`}
        </h3>
        <p className="mb-4 text-xs text-base-content/70">
          Los conductores no son funcionarios del cuadro: viven en su propio
          maestro y solo la DAF los asigna, en P-03.
        </p>

        {aviso && (
          <div
            className="alert alert-error mb-4"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        {/* Sin vehículos activos no hay nada que elegir, y conviene decir por qué antes
            de que alguien busque el desplegable vacío. */}
        {disponibles.length === 0 && (
          <div
            className="alert alert-warning mb-4"
            role="alert"
          >
            <span className="text-xs">
              No hay ningún vehículo activo en el maestro. Puede dar de alta al
              conductor igualmente, pero la DAF no podrá proponerle placa hasta
              que registre un vehículo y se lo asigne aquí.
            </span>
          </div>
        )}

        <Formik<ValoresConductor>
          initialValues={iniciales}
          enableReinitialize
          validationSchema={esquemaConductor}
          onSubmit={onGuardar}
        >
          <Form className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {esAlta ? (
                <Field
                  name="cedula"
                  component={TextInput}
                  label="Cédula"
                  required
                  placeholder="1712345678"
                />
              ) : (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Cédula</span>
                  </label>
                  {/* Llave natural del conductor: no se edita. */}
                  <span className="badge badge-ghost badge-sm w-fit font-mono">
                    {conductor.cedula}
                  </span>
                </div>
              )}

              <Field
                name="telefono"
                component={TextInput}
                label="Teléfono"
                placeholder="0999999999"
              />
              <Field
                name="nombreCompleto"
                component={TextInput}
                label="Nombre completo"
                required
                placeholder="Apellidos Nombres"
              />
              <Field
                name="licenciaTipo"
                component={TextInput}
                label="Tipo de licencia"
                placeholder="C"
              />

              <div className="flex flex-col sm:col-span-2">
                <Field
                  name="vehiculoHabitualId"
                  component={SelectInput}
                  label="Vehículo habitual"
                  options={[
                    { value: "", label: "Sin asignar" },
                    ...disponibles.map((vehiculo) => ({
                      value: String(vehiculo.id),
                      label: vehiculo.descripcion
                        ? `${vehiculo.placa} · ${vehiculo.descripcion}`
                        : vehiculo.placa,
                    })),
                  ]}
                />
                <span className="text-xs text-base-content/70">
                  De aquí sale la placa que la DAF propone al elegir a este
                  conductor, y es la única vía por la que llega a conocer un
                  vehículo: uno que no sea habitual de nadie no podrá asignarlo.
                  {!esAlta && conductor.vehiculoHabitual && (
                    <>
                      {" "}
                      <strong>
                        Puede cambiarlo por otro, pero no dejarlo sin asignar.
                      </strong>
                    </>
                  )}
                </span>
              </div>
            </div>

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

export default ModalConductor;
