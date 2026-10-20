/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mantenimiento de vehículos
 * Archivo: DrawerMantenimiento.tsx
 * Responsabilidad: Capturar una parada de taller, en el cajón lateral estándar. RN-DAF-05.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31 · cajón estándar 2026-10-15
 *
 * TRES DE LOS CINCO CAMPOS SON OPCIONALES, y es una decisión de uso, no un descuido.
 *
 * El taller llama y dice «me traen la 7056 el jueves». En ese momento se sabe la placa y
 * las fechas; el taller concreto, la hora de la cita y el motivo llegan después. Exigirlos
 * retrasaría el registro justo cuando más urge que la placa deje de ofrecerse a la DAF.
 *
 * LAS FECHAS SON `input type="date"` DIRECTOS, NO `DateInput` de Formik: aquél convierte a
 * `Date` y en Quito —UTC−5— eso desplaza la fecha un día. Regla 12 de CLAUDE.md.
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era `ModalMantenimiento`, un `MarcoModal` sin aspa ni pie fijo.
 * Ahora es `DrawerLateral` `ancho="lg"`: pie con su estado («N campos por completar» → «Falta: …»
 * → «Listo para registrar») y «¿Descartar cambios?» si se cierra con algo escrito. Abierto desde
 * «Ver paradas», REEMPLAZA a ese cajón y vuelve a él al cerrar (D7: un cajón a la vez); lo
 * decide la página.
 */

import { Field, Formik } from "formik";
import type { FC } from "react";

import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral, { type EstadoPie } from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import { DateTextInput, TextInput } from "../forms/FormikField.tsx";
import EnfocarPrimerError from "../forms/EnfocarPrimerError.tsx";
import { esquemaMantenimiento } from "../../config/validationSchemas.ts";
import type { VehiculoDeLaFlota } from "../../interfaces/Transporte.ts";
import { textoPorCompletar } from "../../utils/estadoPieDrawer.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

export type ValoresMantenimiento = {
  desde: string;
  hasta: string;
  taller: string;
  hora: string;
  motivo: string;
  /**
   * Zonal del taller (Fase 5, 2026-10-06). Con hora, la cita genera la TAREA «Llevar a taller»
   * hacia esta zonal, asignable en la línea de tiempo como un bloque más.
   */
  zonalTallerId: string;
  /**
   * El vehículo, cuando el cajón se abre desde «Programar mantenimiento» sin uno elegido
   * (2026-10-06). Con `vehiculo` dado, va vacío y no se pide.
   */
  vehiculoId?: string;
};

/** Aviso de la tarea que generará la cita: el texto exacto que se ve en el cajón. */
export const AVISO_TAREA_TALLER =
  "Se creará la tarea “Llevar a taller” en la planificación de ese día.";

/** El id del formulario: el pie del cajón (fuera del `<form>`) lo envía con `formId`. */
const ID_FORMULARIO = "form-mantenimiento";

type DrawerMantenimientoProps = {
  abierto: boolean;
  vehiculo: VehiculoDeLaFlota | null;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  /** Zonales para ubicar el taller (destino de la tarea). */
  zonales?: { id: number; nombre: string }[];
  /** Flota para elegir el vehículo cuando `vehiculo` es nulo («Programar mantenimiento»). */
  vehiculos?: VehiculoDeLaFlota[];
  /** Fecha con la que nace «Desde» (la fecha de trabajo de la DAF). */
  desdeInicial?: string;
  /**
   * Vehículo con el que nace el selector (2026-10-06): «Programar» desde la fila de la flota llega
   * con la placa ya elegida, y se puede cambiar.
   */
  vehiculoInicialId?: number;
  onGuardar: (valores: ValoresMantenimiento) => void;
  onCancelar: () => void;
};

const DrawerMantenimiento: FC<DrawerMantenimientoProps> = ({
  abierto,
  vehiculo,
  guardando,
  aviso,
  zonales = [],
  vehiculos,
  desdeInicial = "",
  vehiculoInicialId,
  onGuardar,
  onCancelar,
}) => {
  const elegirVehiculo = !vehiculo && (vehiculos?.length ?? 0) > 0;
  if (!abierto || (!vehiculo && !elegirVehiculo)) return null;

  const iniciales: ValoresMantenimiento = {
    desde: desdeInicial,
    hasta: desdeInicial,
    vehiculoId: vehiculoInicialId === undefined ? "" : String(vehiculoInicialId),
    taller: "",
    hora: "",
    motivo: "",
    zonalTallerId: "",
  };

  return (
    <Formik<ValoresMantenimiento>
      initialValues={iniciales}
      enableReinitialize
      validationSchema={esquemaMantenimiento}
      validate={(valores) =>
        elegirVehiculo && !valores.vehiculoId
          ? { vehiculoId: "Elija el vehículo que va al taller." }
          : {}
      }
      onSubmit={onGuardar}
    >
      {({ values, errors, dirty, submitCount, handleSubmit }) => {
        const faltan = [
          elegirVehiculo && !values.vehiculoId ? "vehículo" : null,
          values.desde ? null : "desde",
          values.hasta ? null : "hasta",
        ].filter((campo): campo is string => campo !== null);
        const conErrores = Object.keys(errors).length > 0;

        const estadoPie: EstadoPie =
          faltan.length > 0
            ? submitCount > 0
              ? { tono: "error", texto: `Falta: ${faltan.join(", ")}` }
              : { tono: "pendiente", texto: textoPorCompletar(faltan.length) }
            : submitCount > 0 && conErrores
              ? { tono: "error", texto: "Revise los campos marcados" }
              : { tono: "listo", texto: "Listo para registrar" };

        return (
          <DrawerLateral
            abierto
            ancho="lg"
            titulo={vehiculo ? "Registrar parada" : "Programar mantenimiento"}
            subtitulo={
              vehiculo ? (
                <>
                  <span className="font-mono font-semibold">{vehiculo.placa}</span>
                  {vehiculo.descripcion ? ` · ${vehiculo.descripcion}` : ""}
                </>
              ) : (
                "Elija la placa que va al taller"
              )
            }
            ayuda={`Mientras dure la parada, ${vehiculo ? "esta placa" : "la placa"} se ofrecerá inhabilitada en la asignación de transporte y no se podrá asignar.`}
            onCerrar={onCancelar}
            sucio={dirty}
            guardando={guardando}
            formId={ID_FORMULARIO}
            textoGuardar="Registrar parada"
            estadoPie={estadoPie}
            guardarPendiente={faltan.length > 0}
            errorServidor={aviso}
          >
            <form
              id={ID_FORMULARIO}
              className="flex flex-col gap-4"
              noValidate
              onSubmit={(evento) => {
                evento.preventDefault();
                handleSubmit();
              }}
            >
              <EnfocarPrimerError />
              <SeccionDrawer titulo="Vehículo y fechas">
                {elegirVehiculo && (
                  <CampoDrawer
                    etiqueta="Vehículo"
                    requerido
                    ancha
                    error={submitCount > 0 ? (errors.vehiculoId ?? null) : null}
                  >
                    <Field
                      as="select"
                      name="vehiculoId"
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="">Elija la placa…</option>
                      {vehiculos?.map((opcion) => (
                        <option key={opcion.id} value={opcion.id}>
                          {opcion.placa}
                          {opcion.descripcion ? ` · ${opcion.descripcion}` : ""}
                        </option>
                      ))}
                    </Field>
                  </CampoDrawer>
                )}
                <Field name="desde" component={DateTextInput} label="Desde" required />
                <Field name="hasta" component={DateTextInput} label="Hasta" required />
              </SeccionDrawer>

              <SeccionDrawer
                titulo="Cita en el taller"
                descripcion="Opcional: el taller, la hora y el motivo se pueden completar después."
              >
                <Field name="taller" component={TextInput} label="Taller" placeholder="AMBACAR" />
                <Field
                  name="hora"
                  component={TextInput}
                  label="Hora de la cita"
                  placeholder="08:00"
                />
                <div className="md:col-span-2">
                  <Field
                    name="motivo"
                    component={TextInput}
                    label="Motivo"
                    placeholder="Cambio de frenos"
                  />
                </div>
                <CampoDrawer
                  etiqueta="Zonal del taller"
                  ancha
                  ayuda="Con hora de la cita, se crea la tarea «Llevar a taller» para asignarla a un conductor."
                >
                  <Field
                    as="select"
                    name="zonalTallerId"
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="">Sin zonal</option>
                    {zonales.map((zonal) => (
                      <option key={zonal.id} value={zonal.id}>
                        {zonal.nombre}
                      </option>
                    ))}
                  </Field>
                </CampoDrawer>

                {/* Con hora, se avisa EN EL MOMENTO de lo que va a pasar (2026-10-06). */}
                {values.hora.trim() !== "" && (
                  <AvisoEnLinea variante="info" className="md:col-span-2">{AVISO_TAREA_TALLER}</AvisoEnLinea>
                )}
              </SeccionDrawer>
            </form>
          </DrawerLateral>
        );
      }}
    </Formik>
  );
};

export default DrawerMantenimiento;
