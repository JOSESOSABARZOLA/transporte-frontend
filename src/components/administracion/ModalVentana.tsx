/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: ModalVentana.tsx
 * Responsabilidad: Editar la ventana de carga de un rol, en el cajón lateral estándar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06 · rediseño 2026-10-07 · cajón estándar 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE EDITA AQUÍ DECIDE A QUÉ HORA DEJA DE TRABAJAR UN DEPARTAMENTO ENTERO.
 *
 * Por eso el cajón muestra, junto a los campos, **lo que el funcionario leerá** cuando su
 * ventana esté cerrada («Así lo verá el funcionario»), con los marcadores `{cierre}` y
 * `{apertura}` ya resueltos, para que el administrador vea el texto antes de guardarlo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SOLO SE VALIDA ESTA VENTANA (2026-10-08). La pantalla solo parametriza; la coherencia entre
 * ventanas la aplica el sistema en ejecución. Los marcadores y la vista previa se quedan.
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` centrado con cabecera, pie y pregunta de
 * descarte propios; ahora es `DrawerLateral` `ancho="md"`, que pone la cabecera, el pie con su
 * estado y la confirmación «¿Descartar cambios?» (✕, Cancelar, Esc o clic en el fondo, con cambios):
 *
 *   · Tipo de ventana: Diario · Solo días laborables · Sin restricción. El servidor deriva
 *     `activo` del tipo. Con «Sin restricción», las horas y el mensaje quedan deshabilitados.
 *   · La casilla «Ventana vigente» (2026-10-07) NO es un dato aparte: es otra forma de decir el
 *     tipo. Desmarcarla pone «Sin restricción»; marcarla devuelve el tipo que había (o «Diario»).
 *   · El error del servidor se muestra tal cual (regla 7), sobre el pie, sin cerrar.
 *
 * LA HORA VACÍA SE ENVÍA COMO `null`, NO SE OMITE. En este contrato son cosas distintas: lo que
 * no viene no se toca, y lo que viene nulo se limpia.
 */

import { Formik } from "formik";
import { useRef, type FC } from "react";

import AvisoVentanaCerrada from "../common/AvisoVentanaCerrada.tsx";
import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";

import type {
  ActualizarVentana,
  TipoVentana,
  VentanaCarga,
} from "../../interfaces/Administracion.ts";
import { esquemaVentana } from "../../config/validationSchemas.ts";
import { useCatalogoRoles } from "../../hooks/useCatalogoRoles.ts";
import {
  comoHoraInstitucional,
  resolverMensajeVentana,
} from "../../utils/mensajeVentana.util.ts";
import {
  AYUDA_TIPO_VENTANA,
  NOMBRE_TIPO_VENTANA,
  TIPOS_VENTANA_ELEGIBLES,
} from "../../utils/parametro.util.ts";

/** El id del formulario: el pie del cajón (fuera del `<form>`) lo envía con `formId`. */
const ID_FORMULARIO = "form-ventana-carga";

/** Etiqueta de campo: la misma de `CampoDrawer`. */
const CLASE_ETIQUETA = "text-sm font-semibold text-app-label";
/** Ayuda de campo: 12 px, gris, interlineado normal, en un solo bloque. */
const CLASE_AYUDA = "text-xs leading-normal text-app-muted";

/** La zona en que se evalúan todas las ventanas. La UI no convierte a UTC. */
const ZONA = "America/Guayaquil";

type ValoresVentana = {
  tipo: TipoVentana;
  horaApertura: string;
  horaCierre: string;
  mensajeCierre: string;
};

/**
 * Quien lo monta le pasa `key={ventana.rol}`: cambiar de ventana lo vuelve a montar y el
 * formulario parte de la nueva.
 */
type ModalVentanaProps = {
  ventana: VentanaCarga | null;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual. */
  aviso: string | null;
  onGuardar: (cambios: ActualizarVentana) => void;
  onCancelar: () => void;
};

/** El tipo con que abre el selector: una ventana inactiva (o heredada) es «Sin restricción». */
const tipoInicial = (ventana: VentanaCarga): TipoVentana => {
  if (!ventana.activo) return "SIN_RESTRICCION";
  return TIPOS_VENTANA_ELEGIBLES.includes(ventana.tipo) ? ventana.tipo : "DIARIO";
};

/** La línea de ayuda bajo las horas, con las horas reales. */
const ayudaDeHoras = (apertura: string, cierre: string): string => {
  if (!apertura) return "Apertura vacía = puede cargar desde las 00H00 hasta el cierre.";
  if (!cierre) return `Se puede cargar desde las ${comoHoraInstitucional(apertura)}.`;
  return `Se puede cargar de ${comoHoraInstitucional(apertura)} a ${comoHoraInstitucional(cierre)}.`;
};

/** Lo que viaja al servidor. «Sin restricción» solo cambia el tipo: las horas no se tocan. */
const comoCambios = (valores: ValoresVentana): ActualizarVentana => {
  if (valores.tipo === "SIN_RESTRICCION") return { tipo: valores.tipo };
  const mensaje = valores.mensajeCierre.trim();
  return {
    tipo: valores.tipo,
    horaApertura: valores.horaApertura || null,
    horaCierre: valores.horaCierre || null,
    mensajeCierre: mensaje.length > 0 ? mensaje : undefined,
  };
};

const ModalVentana: FC<ModalVentanaProps> = ({
  ventana,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}) => {
  const { nombreDe } = useCatalogoRoles();
  /** El tipo que había antes de desmarcar «Ventana vigente», para devolverlo al marcarla. */
  const tipoAntesDeSuspender = useRef<TipoVentana>("DIARIO");

  if (!ventana) return null;

  const iniciales: ValoresVentana = {
    tipo: tipoInicial(ventana),
    horaApertura: ventana.horaApertura ?? "",
    horaCierre: ventana.horaCierre ?? "",
    mensajeCierre: ventana.mensajeCierre ?? "",
  };

  return (
    <Formik<ValoresVentana>
      initialValues={iniciales}
      validationSchema={esquemaVentana}
      validateOnMount
      onSubmit={(valores) => onGuardar(comoCambios(valores))}
    >
      {({
        values,
        errors,
        dirty,
        isValid,
        handleSubmit,
        handleChange,
        handleBlur,
        setFieldValue,
      }) => {
        const sinRestriccion = values.tipo === "SIN_RESTRICCION";

        // Un error de hora se muestra en cuanto el campo cambió: reemplaza a la línea de ayuda.
        const errorDeHora =
          !sinRestriccion &&
          ((values.horaApertura !== iniciales.horaApertura && errors.horaApertura) ||
            ((values.horaCierre !== iniciales.horaCierre ||
              values.horaApertura !== iniciales.horaApertura) &&
              errors.horaCierre));
        const errorDeMensaje =
          !sinRestriccion &&
          values.mensajeCierre !== iniciales.mensajeCierre &&
          errors.mensajeCierre;

        const vistaPrevia = resolverMensajeVentana(
          values.mensajeCierre.trim(),
          values.horaApertura || null,
          values.horaCierre || null,
        );

        const estadoPie = !dirty
          ? { tono: "sinCambios" as const, texto: "Sin cambios pendientes" }
          : !isValid
            ? { tono: "error" as const, texto: "Revise los campos marcados" }
            : { tono: "cambios" as const, texto: "Cambios sin guardar" };

        return (
          <DrawerLateral
            abierto
            ancho="md"
            titulo="Editar ventana de carga"
            subtitulo={
              <span className="block truncate" title={`${nombreDe(ventana.rol)} · Hora local ${ZONA}`}>
                {nombreDe(ventana.rol)} · Hora local {ZONA}
              </span>
            }
            onCerrar={onCancelar}
            sucio={dirty}
            guardando={guardando}
            formId={ID_FORMULARIO}
            estadoPie={estadoPie}
            motivoGuardar={
              !dirty ? "Sin cambios" : !isValid ? "Revise los campos marcados." : null
            }
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
              <SeccionDrawer titulo="Horario" rejilla={false}>
                {/* a) TIPO DE VENTANA · ayuda debajo según el tipo. */}
                <CampoDrawer
                  etiqueta="Tipo de ventana"
                  id="ventana-tipo"
                  ayuda={AYUDA_TIPO_VENTANA[values.tipo]}
                >
                  <select
                    name="tipo"
                    className="select select-bordered select-sm w-full"
                    value={values.tipo}
                    onChange={handleChange}
                    disabled={guardando}
                  >
                    {TIPOS_VENTANA_ELEGIBLES.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {NOMBRE_TIPO_VENTANA[tipo]}
                      </option>
                    ))}
                  </select>
                </CampoDrawer>

                {/* b) HORAS · dos columnas, una sola línea de ayuda (o el error) bajo ambas. */}
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label htmlFor="ventana-apertura" className={CLASE_ETIQUETA}>
                        Hora de apertura
                      </label>
                      <input
                        id="ventana-apertura"
                        name="horaApertura"
                        type="time"
                        className={`input input-bordered input-sm w-full ${
                          errorDeHora && errors.horaApertura ? "input-error" : ""
                        }`}
                        value={values.horaApertura}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={guardando || sinRestriccion}
                        aria-describedby="ventana-horas-ayuda"
                        aria-invalid={Boolean(errorDeHora && errors.horaApertura)}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label htmlFor="ventana-cierre" className={CLASE_ETIQUETA}>
                        Hora de cierre
                      </label>
                      <input
                        id="ventana-cierre"
                        name="horaCierre"
                        type="time"
                        className={`input input-bordered input-sm w-full ${
                          errorDeHora && errors.horaCierre ? "input-error" : ""
                        }`}
                        value={values.horaCierre}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={guardando || sinRestriccion}
                        aria-describedby="ventana-horas-ayuda"
                        aria-invalid={Boolean(errorDeHora && errors.horaCierre)}
                      />
                    </div>
                  </div>
                  {errorDeHora ? (
                    <span id="ventana-horas-ayuda" className="text-xs text-error" role="alert">
                      {errorDeHora}
                    </span>
                  ) : (
                    <span id="ventana-horas-ayuda" className={CLASE_AYUDA}>
                      {sinRestriccion
                        ? "Sin restricción: no se usan horas."
                        : ayudaDeHoras(values.horaApertura, values.horaCierre)}
                    </span>
                  )}
                </div>

              </SeccionDrawer>

              <SeccionDrawer titulo="Mensaje y vigencia" rejilla={false}>
                {/* c) MENSAJE · a todo el ancho; el error reemplaza a la ayuda. */}
                <CampoDrawer
                  etiqueta="Mensaje que verá el funcionario"
                  id="ventana-mensaje"
                  error={errorDeMensaje || null}
                  ayuda={
                    errorDeMensaje ? undefined : (
                      <>
                        Aparece cuando intenta cargar fuera de horario. Use {"{cierre}"} o{" "}
                        {"{apertura}"} para que la hora se actualice sola.
                      </>
                    )
                  }
                >
                  <textarea
                    name="mensajeCierre"
                    className={`textarea textarea-bordered w-full ${
                      errorDeMensaje ? "textarea-error" : ""
                    }`}
                    rows={3}
                    value={values.mensajeCierre}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={guardando || sinRestriccion}
                  />
                </CampoDrawer>

                {/* d) ASÍ LO VERÁ EL FUNCIONARIO · el mismo aviso que ve en P-01. */}
                <div className="flex flex-col gap-1.5">
                  <p className={CLASE_ETIQUETA}>Así lo verá el funcionario</p>
                  <div
                    className="rounded-md border border-dashed border-base-300 bg-base-200 p-3"
                    aria-live="polite"
                  >
                    {sinRestriccion ? (
                      <p className="text-sm text-app-muted">
                        Sin restricción: no se muestra mensaje.
                      </p>
                    ) : (
                      <AvisoVentanaCerrada>
                        {vistaPrevia || "Escriba el mensaje para verlo aquí."}
                      </AvisoVentanaCerrada>
                    )}
                  </div>
                </div>
                {/* e) VENTANA VIGENTE · otra forma de decir el tipo (ver la cabecera del archivo). */}
                <label className="flex cursor-pointer items-start gap-3" htmlFor="ventana-vigente">
                  <input
                    id="ventana-vigente"
                    type="checkbox"
                    className="checkbox checkbox-sm mt-0.5"
                    checked={!sinRestriccion}
                    disabled={guardando}
                    aria-describedby="ventana-vigente-ayuda"
                    onChange={(evento) => {
                      if (evento.target.checked) {
                        void setFieldValue("tipo", tipoAntesDeSuspender.current);
                        return;
                      }
                      tipoAntesDeSuspender.current = values.tipo;
                      void setFieldValue("tipo", "SIN_RESTRICCION");
                    }}
                  />
                  <span className="flex min-w-0 flex-col whitespace-normal">
                    <span className="text-sm font-semibold text-app-strong">Ventana vigente</span>
                    <span id="ventana-vigente-ayuda" className={CLASE_AYUDA}>
                      Si la desactiva, el rol queda sin restricción horaria y puede cargar a
                      cualquier hora.
                    </span>
                  </span>
                </label>
              </SeccionDrawer>
            </form>
          </DrawerLateral>
        );
      }}
    </Formik>
  );
};

export default ModalVentana;
