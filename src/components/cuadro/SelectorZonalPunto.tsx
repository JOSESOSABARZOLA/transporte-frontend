/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: SelectorZonalPunto.tsx
 * Responsabilidad: Filtrado en cascada formulario → zonal → punto, con ADICIONALES.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA CASCADA LA RESUELVE EL SERVIDOR. RN-17: el punto pertenece a la zonal y al
 * formulario, y esa correspondencia es la matriz que sigue pendiente de validación
 * (PV-01). Aquí no se filtra en memoria: al elegir zonal se **pide** la lista.
 *
 * Filtrarla en el cliente exigiría tener la matriz completa, que es justo el dato que
 * nadie ha entregado todavía.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `ADICIONALES` NO ES UNA FILA DEL CATÁLOGO. INV-08 lo dice explícitamente, y por eso no
 * llega en la lista: es una opción habilitada por el dato (RN-20).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CORREGIDO EL 2026-08-11 · CADA DESPLEGABLE CONSULTA LA BANDERA DE SU CATÁLOGO.
 *
 * RN-20 dice «los **catálogos que lo prevén**»: es propiedad de cada catálogo. En el
 * insumo aprobado —`catalogos-hoja2.json`— `ADICIONALES` aparece **únicamente en
 * `tiposControl`**, y solo de los formularios 2 (PMO) y 8 (INSP). En `puntosEncuentro`
 * no aparece en ninguno de los nueve.
 *
 * El esquema tenía **una sola columna por formulario** y esta pantalla la aplicaba a los
 * dos desplegables: ofrecía captura libre de un punto de encuentro que ningún catálogo
 * prevé, justo en los formularios cuyos puntos no están cargados por PV-01.
 *
 * Se corrigió en el modelo, no solo aquí: `form_captura_libre_punto` y
 * `form_captura_libre_tipo`. **Esta pantalla ya no decide nada**, pregunta al dato. Hoy
 * la bandera del punto es falsa en los nueve, pero eso es un valor, no una regla escrita
 * en el código: el día que el negocio habilite un catálogo, se siembra y funciona.
 *
 * EL CAMPO DE TEXTO DEL PUNTO SE CONSERVA aunque hoy no haya formulario que lo ofrezca:
 * el panel de edición reutiliza este formulario, y un operativo capturado con punto
 * libre debe poder abrirse y editarse sin perder su valor.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CORREGIDO EL 2026-08-11 · LOS CINCO CAMPOS MOSTRABAN SU ASTERISCO PERO NO SU ERROR.
 *
 * Marcaban el campo como obligatorio y no decían nada cuando faltaba: Formik detenía el
 * envío, la petición no llegaba a salir del navegador y **en pantalla no cambiaba nada**.
 * Apareció al registrar en un formulario sin puntos de encuentro cargados —PMO, y con él
 * los ocho que dependen de PV-01—, donde la única forma de rellenar el punto es la
 * captura libre: quien no la encontraba se quedaba pulsando Guardar sin respuesta.
 *
 * Los mensajes llegan **ya resueltos** desde el formulario, en `errores`. Este componente
 * no conoce Formik y no debe conocerlo: recibe valores y devuelve cambios.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import type {
  PuntoEncuentro,
  TipoControl,
  Zonal,
} from "../../interfaces/Formulario.ts";
import { OPCION_ADICIONALES } from "../../utils/valoresOperativo.util.ts";

/**
 * Mensaje a mostrar bajo cada control, o `undefined` si no hay nada que decir.
 *
 * Se reciben resueltos y no como `errors` y `touched` de Formik para que el componente
 * siga siendo presentacional: la decisión de cuándo un error es visible pertenece al
 * formulario, que es quien sabe si el campo se tocó o si ya se intentó enviar.
 */
export type ErroresZonalPunto = {
  zonal?: string;
  punto?: string;
  puntoLibre?: string;
  tipoControl?: string;
  tipoLibre?: string;
};

/** El pie de error de un control, con el papel que lo anuncia a los lectores. */
const PieDeError: FC<{ id: string; mensaje?: string }> = ({ id, mensaje }) =>
  mensaje ? (
    <label className="label">
      <span
        id={id}
        className="label-text-alt text-error"
        role="alert"
      >
        {mensaje}
      </span>
    </label>
  ) : null;

type SelectorZonalPuntoProps = {
  zonales: Zonal[];
  zonalSeleccionada: number | null;
  onZonalChange: (zonalId: number | null) => void;

  puntos: PuntoEncuentro[];
  cargandoPuntos: boolean;
  puntoSeleccionado: string;
  onPuntoChange: (valor: string) => void;
  puntoLibre: string;
  onPuntoLibreChange: (texto: string) => void;

  tiposControl: TipoControl[];
  tipoSeleccionado: string;
  onTipoChange: (valor: string) => void;
  tipoLibre: string;
  onTipoLibreChange: (texto: string) => void;

  /** RN-20, por catálogo: cada desplegable consulta el suyo. */
  capturaLibrePunto: boolean;
  capturaLibreTipo: boolean;
  deshabilitado: boolean;
  errores: ErroresZonalPunto;
};

const SelectorZonalPunto: FC<SelectorZonalPuntoProps> = ({
  zonales,
  zonalSeleccionada,
  onZonalChange,
  puntos,
  cargandoPuntos,
  puntoSeleccionado,
  onPuntoChange,
  puntoLibre,
  onPuntoLibreChange,
  tiposControl,
  tipoSeleccionado,
  onTipoChange,
  tipoLibre,
  onTipoLibreChange,
  capturaLibrePunto,
  capturaLibreTipo,
  deshabilitado,
  errores,
}) => {
  /**
   * Zonal elegida, consulta terminada, el catálogo no trajo ninguno **y el formulario
   * tampoco admite capturarlo a mano**: entonces no hay nada que elegir y decirlo es lo
   * único útil. Con la captura libre habilitada sí queda salida, así que no se bloquea.
   */
  const sinPuntos =
    zonalSeleccionada !== null &&
    !cargandoPuntos &&
    puntos.length === 0 &&
    !capturaLibrePunto;

  return (
  <>
    <div className="form-control w-full">
      <label
        className="label"
        htmlFor="zonal"
      >
        <span className="label-text font-medium">
          Zonal<span className="text-error ml-1">*</span>
        </span>
      </label>
      <select
        id="zonal"
        className="select select-bordered w-full"
        value={zonalSeleccionada ?? ""}
        disabled={deshabilitado}
        aria-required="true"
        aria-invalid={Boolean(errores.zonal)}
        aria-describedby={errores.zonal ? "zonal-error" : undefined}
        onChange={(e) =>
          onZonalChange(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">Seleccionar…</option>
        {zonales.map((zonal) => (
          <option
            key={zonal.id}
            value={zonal.id}
          >
            {zonal.nombre}
          </option>
        ))}
      </select>
      <PieDeError
        id="zonal-error"
        mensaje={errores.zonal}
      />
    </div>

    <div className="form-control w-full">
      <label
        className="label"
        htmlFor="punto"
      >
        <span className="label-text font-medium">
          Punto de encuentro<span className="text-error ml-1">*</span>
        </span>
      </label>
      <select
        id="punto"
        className="select select-bordered w-full"
        value={puntoSeleccionado}
        disabled={
          deshabilitado ||
          zonalSeleccionada === null ||
          cargandoPuntos ||
          sinPuntos
        }
        aria-required="true"
        aria-invalid={Boolean(errores.punto)}
        aria-describedby={errores.punto ? "punto-error" : undefined}
        onChange={(e) => onPuntoChange(e.target.value)}
      >
        {/* Caso 4 del plan: sin zonal, el desplegable invita a elegirla primero en lugar
            de mostrarse vacío, que parecería que el formulario no tiene puntos. */}
        {/* Caso 4 del plan: sin zonal, el desplegable invita a elegirla primero en lugar
            de mostrarse vacío, que parecería que el formulario no tiene puntos. Y con la
            zonal elegida pero sin puntos, lo dice: un desplegable que solo ofrece
            «Seleccionar…» y nada más deja al funcionario buscando qué hizo mal. */}
        <option value="">
          {zonalSeleccionada === null
            ? "Elija primero una zonal"
            : cargandoPuntos
              ? "Cargando puntos…"
              : sinPuntos
                ? "No hay puntos configurados para esta zonal"
                : "Seleccionar…"}
        </option>
        {puntos.map((punto) => (
          <option
            key={punto.id}
            value={String(punto.id)}
          >
            {punto.nombre}
          </option>
        ))}
        {capturaLibrePunto && (
          <option value={OPCION_ADICIONALES}>ADICIONALES…</option>
        )}
      </select>

      <PieDeError
        id="punto-error"
        mensaje={errores.punto}
      />

      {/*
        MISMA COMPOSICIÓN QUE EL AVISO DE PERSONAL —`alert` con su `<span>`— porque los
        dos explican por qué no se puede seguir. Como pie de campo pasaba desapercibido
        junto al desplegable deshabilitado, que es cuando hace falta leerlo.

        VA DENTRO DE LA CELDA DEL PUNTO, no como hijo de la rejilla. Los campos ocupan
        `horaInicio · horaFin · zonal · punto`, así que un aviso a dos columnas caía en la
        fila siguiente **empezando por la izquierda**, bajo las horas y no bajo el campo
        del que habla. Aquí queda alineado con él en los cuatro tamaños, y sin introducir
        ninguna clase de posicionamiento nueva.

        `alert-warning` y no `alert-error`: no es un fallo de quien captura, es una
        configuración que falta. El color no carga solo con el significado —el texto dice
        qué pasa y a quién acudir—, como exige la regla 6 de CLAUDE.md.
      */}
      {sinPuntos && (
        <div
          className="alert alert-warning mt-2"
          role="status"
        >
          <span>
            Esta zonal no tiene puntos de encuentro en este formulario. El
            administrador puede cargarlos en Catálogos del cuadro.
          </span>
        </div>
      )}

      {puntoSeleccionado === OPCION_ADICIONALES && (
        <>
          <input
            type="text"
            className="input input-bordered mt-2 w-full"
            placeholder="Escriba el punto de encuentro"
            aria-label="Punto de encuentro adicional"
            maxLength={220}
            value={puntoLibre}
            disabled={deshabilitado}
            aria-required="true"
            aria-invalid={Boolean(errores.puntoLibre)}
            aria-describedby={
              errores.puntoLibre ? "puntoLibre-error" : undefined
            }
            onChange={(e) => onPuntoLibreChange(e.target.value)}
          />
          <PieDeError
            id="puntoLibre-error"
            mensaje={errores.puntoLibre}
          />
        </>
      )}
    </div>

    <div className="form-control w-full">
      <label
        className="label"
        htmlFor="tipoControl"
      >
        <span className="label-text font-medium">
          Tipo de control<span className="text-error ml-1">*</span>
        </span>
      </label>
      <select
        id="tipoControl"
        className="select select-bordered w-full"
        value={tipoSeleccionado}
        disabled={deshabilitado}
        aria-required="true"
        aria-invalid={Boolean(errores.tipoControl)}
        aria-describedby={errores.tipoControl ? "tipoControl-error" : undefined}
        onChange={(e) => onTipoChange(e.target.value)}
      >
        <option value="">Seleccionar…</option>
        {tiposControl.map((tipo) => (
          <option
            key={tipo.id}
            value={String(tipo.id)}
          >
            {tipo.nombre}
          </option>
        ))}
        {capturaLibreTipo && (
          <option value={OPCION_ADICIONALES}>ADICIONALES…</option>
        )}
      </select>

      <PieDeError
        id="tipoControl-error"
        mensaje={errores.tipoControl}
      />

      {tipoSeleccionado === OPCION_ADICIONALES && (
        <>
          <input
            type="text"
            className="input input-bordered mt-2 w-full"
            placeholder="Escriba el tipo de control"
            aria-label="Tipo de control adicional"
            maxLength={220}
            value={tipoLibre}
            disabled={deshabilitado}
            aria-required="true"
            aria-invalid={Boolean(errores.tipoLibre)}
            aria-describedby={errores.tipoLibre ? "tipoLibre-error" : undefined}
            onChange={(e) => onTipoLibreChange(e.target.value)}
          />
          <PieDeError
            id="tipoLibre-error"
            mensaje={errores.tipoLibre}
          />
        </>
      )}
    </div>
  </>
  );
};

export default SelectorZonalPunto;
