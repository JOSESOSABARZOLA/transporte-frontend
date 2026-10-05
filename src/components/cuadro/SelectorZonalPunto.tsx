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

import { useState, type FC } from "react";

import type {
  PuntoEncuentro,
  TipoControl,
  Zonal,
} from "../../interfaces/Formulario.ts";
import {
  OPCION_ADICIONALES,
  OPCION_PUNTO_NUEVO,
} from "../../utils/valoresOperativo.util.ts";
import SelectorTokens from "../forms/SelectorTokens.tsx";
import SelectorTipoControl from "./SelectorTipoControl.tsx";
import { PieDeError } from "./PieDeError.tsx";

// Etiqueta del token y de la lista de zonales. Fuera del componente: son dependencias del filtro
// memoizado de `SelectorTokens` (regla 2 de CLAUDE.md), y recrearlas cada render lo invalidaría.
const nombreDeZonal = (zonal: Zonal): string => zonal.nombre;

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

type SelectorZonalPuntoProps = {
  zonales: Zonal[];
  /** VARIAS zonales (RN-19), desde el 2026-09-21. El punto pertenece a alguna de ellas. */
  zonalesSeleccionadas: number[];
  onZonalesChange: (ids: number[]) => void;

  puntos: PuntoEncuentro[];
  cargandoPuntos: boolean;
  puntoSeleccionado: string;
  onPuntoChange: (valor: string) => void;
  puntoLibre: string;
  onPuntoLibreChange: (texto: string) => void;

  tiposControl: TipoControl[];
  tipoSeleccionado: string;
  onTipoChange: (valor: string) => void;
  /** Selección múltiple de tipos, donde el formulario lo admite (los nueve desde 2026-09-14). */
  tipoMultiple: boolean;
  tiposSeleccionadosIds: number[];
  onTiposChange: (ids: number[]) => void;
  tipoLibre: string;
  onTipoLibreChange: (texto: string) => void;

  /** RN-20, por catálogo: cada desplegable consulta el suyo. */
  capturaLibrePunto: boolean;
  capturaLibreTipo: boolean;
  /**
   * AGREGAR UN PUNTO AL CATÁLOGO desde aquí (Unidad de Operativos, 1-4). Con esto se ofrece un
   * «Agregar punto de encuentro» que deja pendiente un punto nuevo ligado a una de las zonales
   * elegidas. NO se crea al teclearlo: se crea al REGISTRAR el operativo (misma transacción), de
   * modo que si el operativo no se crea, el punto tampoco.
   */
  permiteAgregarPunto?: boolean;
  /** Deja pendiente el punto nuevo (nombre + zonal elegida). Lo registra el formulario al enviar. */
  onAgregarPunto?: (nombre: string, zonalId: number) => void;
  /** Nombre del punto nuevo pendiente, para mostrarlo como opción elegida del desplegable. */
  puntoNuevoNombre?: string;
  deshabilitado: boolean;
  errores: ErroresZonalPunto;
  /**
   * Si pinta el campo «Tipo de control» junto a zonal y punto (2026-09-09). Por omisión sí
   * —es como funcionaba y como lo usan las pruebas y los paneles—; P-01 lo apaga para
   * colocarlo por separado, junto a Instituciones, con `SelectorTipoControl`.
   */
  renderTipo?: boolean;
  /**
   * Variante en el cajón de edición (2026-09-30): zonales con desplegable flotante y chips con
   * wrap; punto/tipo con la opción «Otro…» (en vez de «ADICIONALES…»). Por omisión, P-01 no cambia.
   */
  enCajon?: boolean;
  /**
   * Solo los selectores flotantes (2026-10-01), sin el «Otro…» ni el resto del cajón: `zonalesFlotante`
   * activa la variante `flotante` de los chips de zonales; `tiposFlotante` la del tipo interno (cuando
   * `renderTipo`). Se usan en la ventana principal (P-01) para igualar el aspecto del cajón sin lo demás.
   */
  zonalesFlotante?: boolean;
  tiposFlotante?: boolean;
};

const SelectorZonalPunto: FC<SelectorZonalPuntoProps> = ({
  zonales,
  zonalesSeleccionadas,
  onZonalesChange,
  puntos,
  cargandoPuntos,
  puntoSeleccionado,
  onPuntoChange,
  puntoLibre,
  onPuntoLibreChange,
  tiposControl,
  tipoSeleccionado,
  onTipoChange,
  tipoMultiple,
  tiposSeleccionadosIds,
  onTiposChange,
  tipoLibre,
  onTipoLibreChange,
  capturaLibrePunto,
  capturaLibreTipo,
  permiteAgregarPunto = false,
  onAgregarPunto,
  puntoNuevoNombre,
  deshabilitado,
  errores,
  renderTipo = true,
  enCajon = false,
  zonalesFlotante = false,
  tiposFlotante = false,
}) => {
  // Formulario en línea para agregar un punto al catálogo (Unidad de Operativos).
  const [agregando, setAgregando] = useState(false);
  const [nombrePunto, setNombrePunto] = useState("");
  // A qué zonal se liga. Con una sola elegida se usa esa; con varias, se elige aquí.
  const [zonalPunto, setZonalPunto] = useState<number | "">("");

  const zonalDestino =
    zonalesSeleccionadas.length === 1
      ? zonalesSeleccionadas[0]
      : typeof zonalPunto === "number"
        ? zonalPunto
        : null;

  const abrirAgregar = (): void => {
    setNombrePunto("");
    setZonalPunto(
      zonalesSeleccionadas.length === 1 ? zonalesSeleccionadas[0] : "",
    );
    setAgregando(true);
  };

  const guardarPunto = (): void => {
    const nombre = nombrePunto.trim();
    if (nombre.length < 3 || zonalDestino === null || !onAgregarPunto) return;
    onAgregarPunto(nombre, zonalDestino);
    setAgregando(false);
    setNombrePunto("");
  };

  const nombreZonalDe = (id: number): string => {
    const zonal = zonales.find((z) => z.id === id);
    return zonal ? zonal.nombre : `Zonal ${id}`;
  };
  /**
   * Zonal elegida, consulta terminada, el catálogo no trajo ninguno **y el formulario
   * tampoco admite capturarlo a mano**: entonces no hay nada que elegir y decirlo es lo
   * único útil. Con la captura libre habilitada sí queda salida, así que no se bloquea.
   */
  const sinZonal = zonalesSeleccionadas.length === 0;
  const sinPuntos =
    !sinZonal && !cargandoPuntos && puntos.length === 0 && !capturaLibrePunto;

  return (
  <>
    {/* VARIAS zonales (RN-19, 2026-09-21): tokens con buscador, como Instituciones. El punto de
        encuentro pertenece a alguna de las elegidas (lo valida el servidor). */}
    <SelectorTokens
      id="zonales"
      etiqueta="Zonales"
      obligatorio
      opciones={zonales}
      seleccionadas={zonalesSeleccionadas}
      onCambio={onZonalesChange}
      etiquetaCorta={nombreDeZonal}
      etiquetaLarga={nombreDeZonal}
      marcador="Buscar zonal…"
      flotante={zonalesFlotante || enCajon}
      cajaUnica={enCajon}
      deshabilitado={deshabilitado}
      error={errores.zonal}
    />

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
        // Con un punto NUEVO pendiente hay al menos una opción elegible, así que el «sin puntos»
        // no debe deshabilitar el desplegable.
        disabled={
          deshabilitado ||
          sinZonal ||
          cargandoPuntos ||
          (sinPuntos && !puntoNuevoNombre)
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
          {sinZonal
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
        {/* Punto NUEVO pendiente (Unidad de Operativos): se registra al crear el operativo. */}
        {puntoNuevoNombre && (
          <option value={OPCION_PUNTO_NUEVO}>
            Nuevo: {puntoNuevoNombre} (se registra al guardar)
          </option>
        )}
        {capturaLibrePunto && (
          <option value={OPCION_ADICIONALES}>
            {enCajon ? "Otro…" : "ADICIONALES…"}
          </option>
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
      {sinPuntos && !puntoNuevoNombre && (
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

      {/*
        AGREGAR UN PUNTO AL CATÁLOGO (Unidad de Operativos, 2026-09-24). Solo con al menos una
        zonal elegida: el punto pertenece a una zonal. Con varias, se elige a cuál. Al agregar, el
        punto queda PENDIENTE (no se crea todavía) y se registra al guardar el operativo, en la
        misma transacción: si el operativo no se crea, el punto tampoco.
      */}
      {permiteAgregarPunto && !sinZonal && (
        <div className="mt-2">
          {!agregando ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={deshabilitado}
              onClick={abrirAgregar}
            >
              + Agregar punto de encuentro
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-md border border-base-300 p-2">
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder="Nombre del punto de encuentro"
                aria-label="Nombre del nuevo punto de encuentro"
                maxLength={200}
                value={nombrePunto}
                onChange={(e) => setNombrePunto(e.target.value)}
              />
              {zonalesSeleccionadas.length > 1 && (
                <select
                  className="select select-bordered select-sm w-full"
                  aria-label="Zonal a la que pertenece el punto"
                  value={zonalPunto === "" ? "" : String(zonalPunto)}
                  onChange={(e) =>
                    setZonalPunto(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                >
                  <option value="">Elija la zonal del punto…</option>
                  {zonalesSeleccionadas.map((id) => (
                    <option
                      key={id}
                      value={String(id)}
                    >
                      {nombreZonalDe(id)}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={
                    deshabilitado ||
                    nombrePunto.trim().length < 3 ||
                    zonalDestino === null
                  }
                  onClick={guardarPunto}
                >
                  Agregar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAgregando(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {puntoSeleccionado === OPCION_ADICIONALES && (
        <>
          <input
            id="puntoLibre"
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

    {/*
      El «Tipo de control» se extrajo a `SelectorTipoControl` (2026-09-09) para poder colocarlo
      por separado. Aquí se pinta por omisión —como siempre—; P-01 lo apaga (`renderTipo`) y lo
      pone junto a Instituciones.
    */}
    {renderTipo && (
      <SelectorTipoControl
        enCajon={enCajon}
        tiposFlotante={tiposFlotante || enCajon}
        tiposControl={tiposControl}
        tipoSeleccionado={tipoSeleccionado}
        onTipoChange={onTipoChange}
        tipoMultiple={tipoMultiple}
        tiposSeleccionadosIds={tiposSeleccionadosIds}
        onTiposChange={onTiposChange}
        tipoLibre={tipoLibre}
        onTipoLibreChange={onTipoLibreChange}
        capturaLibreTipo={capturaLibreTipo}
        deshabilitado={deshabilitado}
        errorTipoControl={errores.tipoControl}
        errorTipoLibre={errores.tipoLibre}
      />
    )}
  </>
  );
};

export default SelectorZonalPunto;
