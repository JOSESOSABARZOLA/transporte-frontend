/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: FormularioOperativo.tsx
 * Responsabilidad: Capturar el operativo en disposición horizontal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DISPOSICIÓN HORIZONTAL, EN CUATRO COLUMNAS. FASE5 §4.1.
 *
 * La meta declarada por el Product Owner es **registrar un operativo en dos o tres
 * minutos**. Un formulario en una sola columna obliga a desplazarse para ver lo que ya se
 * escribió, y a 1440 px desperdicia dos tercios de la pantalla.
 *
 * La rejilla es `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`: a 375 px los
 * campos se apilan sin desbordamiento, y a 1440 px caben las cuatro columnas sin
 * desplazamiento horizontal.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CADA CAMPO OCUPA LO QUE PIDE SU CONTENIDO. Repartido el 2026-08-26.
 *
 * Hasta entonces los siete campos ocupaban lo mismo, y el ancho de una caja no decía
 * nada sobre lo que cabía dentro. Al subir el contenedor a 110rem la columna pasó de
 * 296 a 373 px y el desajuste se volvió visible: **dos cajas de 373 px para `08:00` y
 * `18:00`**, y media rejilla vacía en las dos últimas filas.
 *
 * El reparto de ahora, a `xl`, no deja ni un hueco:
 *
 *   Horario · Zonal · Punto de encuentro · Tipo de control      ← cuándo y dónde
 *   Personal asignado                                    ×4     ← quién
 *   Instituciones ×2 · Observaciones ×2                         ← apoyo y notas
 *
 * A `lg` son tres columnas y a `sm` dos; los tramos se declaran por punto de ruptura
 * para que **ninguna fila quede a medias en ninguno de los tres**. Cambiar el orden de
 * un campo cambia el reparto: la rejilla se llena en el orden del DOM.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * FORMIK ES LA ÚNICA FUENTE DE VERDAD del formulario, incluidos los selectores en
 * cascada. Con la mitad de los valores en Formik y la otra mitad en estado propio de la
 * página, limpiar el formulario tras registrar habría que hacerlo dos veces, y la segunda
 * se olvida.
 */

import { Field, Form, Formik, type FormikHelpers } from "formik";
import type { FC } from "react";

import { esquemaOperativo } from "../../config/validationSchemas.ts";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import { TextAreaInput } from "../forms/FormikField.tsx";
import SelectorTokens from "../forms/SelectorTokens.tsx";
import {
  duracionEnHoras,
  horasSeleccionables,
} from "../../utils/horario.util.ts";
import {
  OPCION_ADICIONALES,
  VALORES_INICIALES,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";
import SelectorPersonal, {
  type PersonaAgregada,
} from "./SelectorPersonal.tsx";
import SelectorZonalPunto from "./SelectorZonalPunto.tsx";

type Institucion = CatalogosFormulario["instituciones"][number];

/**
 * ETIQUETAS DEL SELECTOR DE INSTITUCIONES, FUERA DEL COMPONENTE A PROPÓSITO.
 *
 * `SelectorTokens` las lleva en las dependencias de su filtro memoizado. Declaradas en
 * línea serían funciones nuevas en cada pintado y el filtro se recalcularía siempre, que
 * es tanto como no haberlo memoizado.
 */
const siglaDeInstitucion = (institucion: Institucion): string =>
  institucion.sigla;

/**
 * En la semilla actual varias instituciones traen `sigla` y `nombre` iguales —«AMC · AMC»,
 * «Secretaría de Seguridad · Secretaría de Seguridad»—. Repetirlo no informa de nada y
 * duplica el ancho de la fila, así que cuando coinciden se escribe una sola vez.
 */
const nombreDeInstitucion = (institucion: Institucion): string =>
  institucion.sigla === institucion.nombre
    ? institucion.nombre
    : `${institucion.sigla} · ${institucion.nombre}`;

type FormularioOperativoProps = {
  /**
   * Solo el código, no el formulario entero: es lo único que este componente necesita
   * —viaja en el cuerpo de la petición— y pedir el objeto completo obligaría a P-02 a
   * fabricar uno para editar, cuando lo que tiene es el operativo.
   */
  formularioCodigo: string;
  catalogos: CatalogosFormulario | null;
  puntos: CatalogosFormulario["puntos"];
  cargandoPuntos: boolean;
  onZonalElegida: (zonalId: number | null) => void;
  /**
   * Avisa del horario en cuanto se elige, para que la lista de personal se pida con él.
   *
   * SIN ESTO EL SERVIDOR NO PUEDE FILTRAR. `GET /personal/elegible` aplica las seis
   * reglas de descanso **solo si recibe el horario**; sin él únicamente puede descartar
   * por área y por ausencia. La pantalla lo pedía sin horario, así que ofrecía a gente
   * ya ocupada y el cruce solo aparecía al asignar, con el operativo ya creado.
   */
  onHorarioElegido: (horaInicio: string, horaFin: string) => void;

  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  personalAgregado: PersonaAgregada[];
  onAgregarPersona: (persona: PersonaElegible) => void;
  onRetirarPersona: (funcionarioId: number) => void;
  avisoPersonal: string | null;

  /**
   * Valores de partida. Sin ellos el formulario nace vacío, que es el registro (P-01);
   * con ellos, edita un operativo existente (P-02) con las mismas validaciones.
   */
  valoresIniciales?: ValoresOperativo;
  /** Texto del botón principal. «Registrar operativo» al crear; otro al editar. */
  textoAccion?: string;
  /** Acción secundaria, para cancelar la edición. Sin ella no se dibuja el botón. */
  onCancelar?: () => void;

  /** RN-56 y RN-58: la ventana cerrada o el cuadro cerrado bloquean la captura. */
  bloqueado: boolean;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * TODO EN LECTURA MENOS EL PERSONAL. 2026-08-25, PER-06.
   *
   * Es el caso del departamento que **aporta** al formulario compartido: el DMIT en la
   * patrulla ECU y en la reacción nocturna. Puede poner y quitar su gente; el horario,
   * el punto, el tipo y las instituciones son del departamento dueño.
   *
   * ES OTRA VARA QUE `bloqueado`, y hay que mantenerlas separadas. `bloqueado` es
   * horario —la ventana cerró, el cuadro se cerró— y **también apaga el personal**; esto
   * es de permiso y **deja el personal vivo**. Fundirlas dejaría al DMIT sin poder
   * asignar, que es lo único que se le abrió.
   *
   * El botón de guardar **no se pinta**, no se pinta apagado: no hay nada que enviar,
   * porque el personal se guarda solo. Un botón apagado insinuaría que en otro momento
   * serviría, y aquí no serviría nunca.
   *
   * Es el mismo patrón de la regla 9 con la DAF en P-03: llega todo deshabilitado menos
   * lo que a ese perfil le toca.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  soloPersonal?: boolean;
  guardando: boolean;
  onGuardar: (
    valores: ValoresOperativo,
    ayudas: FormikHelpers<ValoresOperativo>,
  ) => void | Promise<void>;
};

const FormularioOperativo: FC<FormularioOperativoProps> = ({
  formularioCodigo,
  catalogos,
  puntos,
  cargandoPuntos,
  onZonalElegida,
  onHorarioElegido,
  candidatos,
  cargandoPersonal,
  personalAgregado,
  onAgregarPersona,
  onRetirarPersona,
  avisoPersonal,
  valoresIniciales,
  textoAccion = "Registrar operativo",
  onCancelar,
  bloqueado,
  soloPersonal = false,
  guardando,
  onGuardar,
}) => (
  <Formik<ValoresOperativo>
    initialValues={
      valoresIniciales ?? { ...VALORES_INICIALES, formularioCodigo }
    }
    enableReinitialize
    validationSchema={esquemaOperativo}
    onSubmit={onGuardar}
  >
    {({ values, setFieldValue, errors, touched }) => {
      const duracion = duracionEnHoras(values.horaInicio, values.horaFin);

      return (
        <Form className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/*
              ═══════════════════════════════════════════════════════════════════
              EL HORARIO ES UN RANGO, Y DESDE EL 2026-08-26 SE PINTA COMO UNO.

              Eran dos campos independientes, cada uno en su columna. A 1440 px no
              se notaba; al ensanchar el contenedor a 110rem cada columna pasó a
              373 px y quedaron **dos cajas de 373 px conteniendo cinco
              caracteres**: `08:00` y `18:00`. El ancho de una caja es una promesa
              sobre lo que cabe dentro, y ésas prometían un párrafo.

              Van juntos en UNA celda, separados por la palabra «a» — que es
              exactamente como el sistema escribe un horario en todas partes:
              «08H00 A 14H30» en la matriz, en la orden de servicio y en la tabla.

              LA ETIQUETA VISIBLE ES UNA, «Horario», pero cada select conserva su
              nombre accesible por `aria-label`. Un lector de pantalla sigue
              anunciando «Hora de inicio» y «Hora de fin», y las pruebas los
              siguen encontrando por ese texto.
              ═══════════════════════════════════════════════════════════════════
            */}
            <div className="form-control w-full">
              <label
                className="label"
                htmlFor="horaInicio"
              >
                <span className="label-text font-medium">
                  Horario<span className="text-error ml-1">*</span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="horaInicio"
                  aria-label="Hora de inicio"
                  className={`select select-bordered w-full ${
                    touched.horaInicio && errors.horaInicio ? "select-error" : ""
                  }`}
                  value={values.horaInicio}
                  disabled={bloqueado || soloPersonal}
                  onChange={(e) => {
                    void setFieldValue("horaInicio", e.target.value);
                    onHorarioElegido(e.target.value, values.horaFin);
                  }}
                >
                  <option value="">Inicio…</option>
                  {horasSeleccionables().map((hora) => (
                    <option
                      key={hora}
                      value={hora}
                    >
                      {hora}
                    </option>
                  ))}
                </select>

                <span
                  aria-hidden="true"
                  className="text-sm text-base-content/70"
                >
                  a
                </span>

                <select
                  id="horaFin"
                  aria-label="Hora de fin"
                  className={`select select-bordered w-full ${
                    touched.horaFin && errors.horaFin ? "select-error" : ""
                  }`}
                  value={values.horaFin}
                  disabled={bloqueado || soloPersonal}
                  onChange={(e) => {
                    void setFieldValue("horaFin", e.target.value);
                    onHorarioElegido(values.horaInicio, e.target.value);
                  }}
                >
                  <option value="">Fin…</option>
                  {horasSeleccionables().map((hora) => (
                    <option
                      key={hora}
                      value={hora}
                    >
                      {hora}
                    </option>
                  ))}
                </select>
              </div>

              {/*
                UN SOLO RENGLÓN DE ERROR PARA LOS DOS, y el del inicio manda cuando
                los dos fallan: es el que se corrige primero. Dos renglones
                apilados empujaban el resto de la fila hacia abajo y descuadraban
                la rejilla entera por un campo de cinco caracteres.
              */}
              {((touched.horaInicio && errors.horaInicio) ||
                (touched.horaFin && errors.horaFin)) && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {(touched.horaInicio && errors.horaInicio) ||
                      (touched.horaFin && errors.horaFin)}
                  </span>
                </label>
              )}

              {duracion > 0 && (
                <span className="mt-1 text-xs text-base-content/70">
                  Duración: {duracion} h
                </span>
              )}
            </div>

            <SelectorZonalPunto
              zonales={catalogos?.zonales ?? []}
              zonalSeleccionada={values.zonalId === "" ? null : values.zonalId}
              onZonalChange={(zonalId) => {
                void setFieldValue("zonalId", zonalId ?? "");
                // Cambiar de zonal invalida el punto elegido: pertenecía a la anterior
                // y el servidor lo rechazaría por INV-07.
                void setFieldValue("punto", "");
                void setFieldValue("puntoLibre", "");
                onZonalElegida(zonalId);
              }}
              puntos={puntos}
              cargandoPuntos={cargandoPuntos}
              puntoSeleccionado={values.punto}
              onPuntoChange={(valor) => {
                void setFieldValue("punto", valor);
                if (valor !== OPCION_ADICIONALES) {
                  void setFieldValue("puntoLibre", "");
                }
              }}
              puntoLibre={values.puntoLibre}
              onPuntoLibreChange={(texto) =>
                void setFieldValue("puntoLibre", texto)
              }
              tiposControl={catalogos?.tiposControl ?? []}
              tipoSeleccionado={values.tipoControl}
              onTipoChange={(valor) => {
                void setFieldValue("tipoControl", valor);
                if (valor !== OPCION_ADICIONALES) {
                  void setFieldValue("tipoLibre", "");
                }
              }}
              tipoLibre={values.tipoLibre}
              onTipoLibreChange={(texto) =>
                void setFieldValue("tipoLibre", texto)
              }
              capturaLibrePunto={catalogos?.capturaLibrePunto ?? false}
              capturaLibreTipo={catalogos?.capturaLibreTipo ?? false}
              deshabilitado={bloqueado || soloPersonal}
              /*
               * Un error se muestra cuando el campo se tocó, y al enviar Formik marca
               * como tocados todos: es el momento en que hacen falta. Mismo criterio
               * que `horaInicio` y `horaFin`, unas líneas más arriba.
               */
              errores={{
                zonal: touched.zonalId ? errors.zonalId : undefined,
                punto: touched.punto ? errors.punto : undefined,
                puntoLibre: touched.puntoLibre ? errors.puntoLibre : undefined,
                tipoControl: touched.tipoControl
                  ? errors.tipoControl
                  : undefined,
                tipoLibre: touched.tipoLibre ? errors.tipoLibre : undefined,
              }}
            />

            {/*
              ═══════════════════════════════════════════════════════════════════
              EL PERSONAL OCUPA LA FILA ENTERA DESDE EL 2026-08-26, y es el campo
              que más lo agradece: cada candidato muestra nombre, área, cargo y
              —cuando no es elegible— **el motivo redactado por el servidor**, que
              es una frase larga: «SOSA BARZOLA JOSE LUIS ya está asignada al
              operativo OCF-001-12-AGO-2026 de 08H00 A 14H30, que se cruza con
              este horario». A media fila se partía en tres renglones.

              Va ANTES de instituciones, que es el orden de la tarea: cuándo,
              dónde, qué, **quién**, con qué apoyo, y las notas al final.

              NO MIRA `soloPersonal`: es lo único que ese modo deja abierto. Sigue
              mirando `bloqueado`, porque la ventana y el cuadro cerrado sí lo
              frenan —también al departamento que aporta—.
              ═══════════════════════════════════════════════════════════════════
            */}
            <div className="sm:col-span-2 xl:col-span-4">
              <SelectorPersonal
                candidatos={candidatos}
                cargando={cargandoPersonal}
                agregadas={personalAgregado}
                onAgregar={onAgregarPersona}
                onRetirar={onRetirarPersona}
                deshabilitado={bloqueado}
                avisoRechazo={avisoPersonal}
              />
            </div>

            {/*
              VAL-09. Era un `<select multiple>` de 6 rem hasta el 2026-08-07: los nombres
              largos se partían dentro de la caja y añadir la quinta institución exigía
              Ctrl+clic. La validación y el valor que sube a Formik no cambiaron: sigue
              siendo `institucionesIds: number[]`.

              VUELVE A DOS COLUMNAS el 2026-08-26. Estuvo a dos el 11-AGO y se bajó a una
              porque «descuadraba la rejilla»: con el reparto de entonces sobraba una
              celda al final. Con el de ahora **la cuadra**, porque comparte fila con
              observaciones y las dos suman las cuatro columnas exactas. Y los distintivos
              de las instituciones elegidas caben en una línea en lugar de dos.
            */}
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
              <SelectorTokens
                id="instituciones"
                etiqueta="Instituciones"
                obligatorio
                opciones={catalogos?.instituciones ?? []}
                seleccionadas={values.institucionesIds}
                onCambio={(ids) => void setFieldValue("institucionesIds", ids)}
                etiquetaCorta={siglaDeInstitucion}
                etiquetaLarga={nombreDeInstitucion}
                marcador="Escriba para buscar una institución…"
                deshabilitado={bloqueado || soloPersonal}
                error={
                  touched.institucionesIds && errors.institucionesIds
                    ? String(errors.institucionesIds)
                    : null
                }
              />
            </div>

            {/*
              LAS NOTAS AL FINAL, y a media fila y no entera: a 1528 px una línea de
              texto libre pasa de 190 caracteres, muy por encima de la medida en que se
              lee cómodo. A dos columnas son unos 95, que es lo que quiere un campo de
              coordinaciones y novedades.
            */}
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
              <Field
                name="observaciones"
                component={TextAreaInput}
                label="Observaciones"
                placeholder="Coordinaciones, novedades o detalles del operativo"
                disabled={bloqueado || soloPersonal}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {onCancelar && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onCancelar}
                disabled={guardando}
              >
                Cancelar
              </button>
            )}
            {!soloPersonal && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={bloqueado || guardando}
              >
                {guardando ? "Guardando…" : textoAccion}
              </button>
            )}
          </div>
        </Form>
      );
    }}
  </Formik>
);

export default FormularioOperativo;
