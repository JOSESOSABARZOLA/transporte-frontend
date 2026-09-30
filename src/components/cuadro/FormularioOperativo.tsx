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
 * El reparto de ahora (2026-09-09), DOS COLUMNAS a partir de `lg`:
 *
 *   Personal asignado │ Zonal · Punto de encuentro
 *                     │ Instituciones · Tipo de control
 *                     │ Observaciones
 *
 * **Izquierda:** «Cantidad de operativos» ARRIBA (su propia caja, a lo ancho) y debajo el
 * bloque de Personal asignado; en edición/aporte no hay Cantidad y solo queda Personal.
 * **Derecha:** una pila —(Zonal, Punto), (Instituciones, Tipo de control) y Observaciones a lo
 * ancho—. Por debajo de `lg` las dos columnas macro se apilan; la pila derecha usa
 * `sm:grid-cols-2`.
 *
 * EL «TIPO DE CONTROL» SE SACÓ DE `SelectorZonalPunto` (`renderTipo={false}`) para poder
 * ponerlo junto a Instituciones: es el componente `SelectorTipoControl`. `SelectorZonalPunto`
 * lo sigue pintando por omisión, así que sus pruebas y los paneles no cambian.
 *
 * Ninguna fila queda huérfana en sm/lg/xl, ni con Cantidad ni sin ella.
 *
 * **La lista interna del personal va a dos columnas, y eso no es cosmético.** A media fila
 * con tres columnas la celda queda en 291 px y el motivo que redacta el servidor pasa a
 * tres renglones —el defecto que D-3 corrigió—; con dos columnas mide 436 px y ocupa los
 * mismos dos renglones que ocupaba antes. Está medido en `SelectorPersonal`.
 *
 * **Observaciones se queda a media fila, y la rejilla termina con dos columnas libres.**
 * A fila entera su renglón pasaría de 229 caracteres; el 26-AGO ya se bajó de fila entera
 * a media porque 190 estaba «muy por encima de la medida en que se lee cómodo». El hueco
 * va al final, justo encima del pie de acción, y no parte ninguna fila por la mitad.
 * ─────────────────────────────────────────────────────────────────────────────────
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ FALTA SE DICE AL INTENTAR ENVIAR, Y DÓNDE FALLÓ SE SEÑALA DESPUÉS. D-10 y D-11,
 * 2026-08-26 (el resumen pasó a mostrarse solo tras el primer envío el 2026-09-23).
 *
 * Con siete campos repartidos en cuatro columnas, quien pulsaba «Registrar» y fallaba
 * no recibía más que un formulario que no se movía: los mensajes estaban ahí, en rojo,
 * pero **había que encontrarlos recorriendo la rejilla con la vista**. Y para un lector
 * de pantalla ni eso: el mensaje era un `<span>` de color, sin `role`, sin que el control
 * dijera estar inválido y sin que lo citara.
 *
 * Tres piezas, y ninguna toca las reglas de validación:
 *
 *   1. Cada control declara `aria-required`, `aria-invalid` y `aria-describedby` con el
 *      `id` de su mensaje, que va con `role="alert"`. El color deja de ser la única
 *      señal, que es lo que la regla 6 no admite.
 *   2. `ResumenDeEnvio` dice **en palabras** qué falta —«Falta zonal, punto de
 *      encuentro»— junto al botón, no al final de la rejilla, y solo **tras el primer
 *      intento de envío** (`submitCount > 0`): un resumen colgado desde que se abre el
 *      formulario en blanco es ruido permanente, no una ayuda (regla 14).
 *   3. `FocoAlPrimerError` lleva el cursor al primer campo inválido cuando el envío se
 *      detiene.
 *
 * EL RESUMEN LE PREGUNTA AL MISMO ESQUEMA, no a una lista paralela. `camposConFallo`
 * llama a `esquemaOperativo.validateSync`: si mañana un campo deja de ser obligatorio,
 * el resumen se entera solo. Una segunda lista de obligatorios acabaría discrepando de
 * la primera, y la que se lee en pantalla sería la equivocada.
 *
 * NO SE MIRA `errors` DE FORMIK PARA EL RESUMEN, y es deliberado: Formik no valida al
 * montar, así que hasta el primer cambio `errors` está vacío y el resumen anunciaría
 * «listo» sobre un formulario en blanco.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * FORMIK ES LA ÚNICA FUENTE DE VERDAD del formulario, incluidos los selectores en
 * cascada. Con la mitad de los valores en Formik y la otra mitad en estado propio de la
 * página, limpiar el formulario tras registrar habría que hacerlo dos veces, y la segunda
 * se olvida.
 */

import {
  Form,
  Formik,
  useFormikContext,
  type FormikErrors,
  type FormikHelpers,
  type FormikProps,
} from "formik";
import { useEffect, useMemo, useRef, type FC, type Ref } from "react";
import { ValidationError } from "yup";

import { esquemaOperativo } from "../../config/validationSchemas.ts";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type { ObservacionOperativo } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import SelectorTokens from "../forms/SelectorTokens.tsx";
import CapturadorNotas from "./CapturadorNotas.tsx";
import { horasSeleccionables } from "../../utils/horario.util.ts";
import {
  OPCION_ADICIONALES,
  OPCION_PUNTO_NUEVO,
  VALORES_INICIALES,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";
import SelectorPersonal, {
  type PersonaAgregada,
} from "./SelectorPersonal.tsx";
import SelectorZonalPunto from "./SelectorZonalPunto.tsx";
import SelectorTipoControl from "./SelectorTipoControl.tsx";

type Institucion = CatalogosFormulario["instituciones"][number];

/**
 * Los errores del formulario, más el del personal.
 *
 * `personal` NO ES UNA CLAVE DE `ValoresOperativo`, y no puede serlo: las personas
 * asignadas viven fuera de Formik. Formik admite que `validate` devuelva claves que no
 * están en los valores —las trata como cualquier otro error y bloquea el envío— pero su
 * tipo `FormikErrors<T>` solo conoce las de `T`.
 *
 * SE DECLARA AQUÍ EN LUGAR DE FORZAR EL ACCESO en los dos sitios que lo leen: un `as` con
 * un tipo con nombre dice **qué** se está afirmando; uno anónimo repetido dos veces solo
 * silencia al compilador.
 */
type ErroresDelOperativo = FormikErrors<ValoresOperativo> & {
  personal?: string;
};

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

/**
 * LOS CAMPOS EN EL ORDEN DEL DOM, que es el orden en que se leen y en que los recorre
 * el tabulador. De él salen dos cosas: el orden del resumen y **cuál es «el primero» al
 * que va el foco**. Mover un campo en la rejilla obliga a moverlo aquí, o el foco
 * saltará a uno que está más abajo.
 *
 * El HORARIO del operativo salió de esta lista el 2026-09-08 (RN-66): el operativo ya no
 * tiene horario propio —lo toma de las personas—, así que no hay campo que anunciar aquí.
 * El horario obligatorio pasó a ser POR PERSONA y lo vigila `validate`, no el esquema.
 *
 * `formularioCodigo` no tiene control en esta pantalla —lo elige el selector de
 * formularios, fuera— y por eso no lleva `id`. Sigue en la lista porque si falla es lo
 * que hay que decir; sin él el resumen anunciaría «listo» ante un envío que se detiene.
 */
const CAMPOS_DEL_FORMULARIO: ReadonlyArray<{
  campo: keyof ValoresOperativo;
  nombre: string;
  id: string | null;
}> = [
  { campo: "formularioCodigo", nombre: "formulario", id: null },
  { campo: "zonalesIds", nombre: "zonal", id: "zonales" },
  { campo: "punto", nombre: "punto de encuentro", id: "punto" },
  {
    campo: "puntoLibre",
    nombre: "punto de encuentro adicional",
    id: "puntoLibre",
  },
  { campo: "tipoControl", nombre: "tipo de control", id: "tipoControl" },
  { campo: "tipoLibre", nombre: "tipo de control adicional", id: "tipoLibre" },
  { campo: "institucionesIds", nombre: "instituciones", id: "instituciones" },
  { campo: "observaciones", nombre: "observaciones", id: "observaciones" },
];

/**
 * Los campos que el esquema rechaza, preguntándole a él y no a una copia de sus reglas.
 *
 * `abortEarly: false` es lo que hace que devuelva **todos** los fallos y no solo el
 * primero: con el valor por omisión el resumen nombraría un campo cada vez, y harían
 * falta tres envíos para enterarse de los tres que faltan.
 */
const camposConFallo = (valores: ValoresOperativo): Set<string> => {
  try {
    esquemaOperativo.validateSync(valores, { abortEarly: false });
    return new Set();
  } catch (fallo) {
    // Lo que no sea un rechazo de validación es un defecto nuestro, y debe salir.
    if (!(fallo instanceof ValidationError)) throw fallo;

    // `inner` viene vacío cuando el rechazo es del objeto entero y no de un campo.
    const fallos = fallo.inner.length > 0 ? fallo.inner : [fallo];

    return new Set(
      fallos.map((uno) => uno.path ?? "").filter((ruta) => ruta !== ""),
    );
  }
};

/**
 * Qué falta para poder enviar, en palabras y junto al botón. D-11.
 *
 * El pie era `justify-end` con dos botones y nada más. Con siete campos en cuatro
 * columnas, quien pulsaba y fallaba tenía que buscar visualmente cuál se había quedado
 * atrás.
 *
 * SOLO APARECE TRAS EL PRIMER INTENTO DE ENVÍO (`submitCount > 0`), no antes. El operador
 * registra decenas de operativos al día (regla 14) y un «Falta zonal, punto de encuentro…»
 * colgado desde que se abre el formulario —cuando aún no ha tecleado nada— es ruido
 * permanente, no una ayuda. Es el mismo criterio que los errores de campo: aparecen al
 * primer envío, no antes. Hasta entonces no se pinta nada.
 *
 * VA EN `role="status"` Y NO EN `role="alert"`, y la diferencia importa: una vez visible se
 * lee mientras se corrige y cambia con cada campo que se completa. Un `alert` interrumpiría
 * al lector de pantalla en mitad de la frase; `status` espera a que termine.
 *
 * EL COLOR NO ES LA SEÑAL (regla 6). La frase dice lo mismo en blanco y negro; el tono
 * solo la acompaña.
 */
const ResumenDeEnvio: FC<{
  faltaPersonal: boolean;
  faltaHorarioPersonal: boolean;
}> = ({ faltaPersonal, faltaHorarioPersonal }) => {
  const { values, submitCount } = useFormikContext<ValoresOperativo>();

  const faltantes = useMemo(() => {
    const fallidos = camposConFallo(values);
    const nombres: string[] = [];

    for (const { campo, nombre } of CAMPOS_DEL_FORMULARIO) {
      if (fallidos.has(campo) && !nombres.includes(nombre)) {
        nombres.push(nombre);
      }
    }

    /*
      EL PERSONAL ENTRA APARTE, Y ES LA ÚNICA EXCEPCIÓN A «EL RESUMEN LE PREGUNTA AL MISMO
      ESQUEMA». No puede salir de `camposConFallo` porque **no es un campo de Formik**: las
      personas asignadas viven en un estado de la página —y en modo edición, en el propio
      operativo—, no en `values`. Meterlas en Formik para poder validarlas ahí obligaría a
      reescribir el camino de asignación inmediata de P-02 y del modo aporte.

      VA AL FINAL DE LA FRASE a propósito: los campos de arriba se corrigen tecleando y
      éstos exigen elegir gente y su horario, que es el paso más largo. Son dos faltas
      distintas: no hay nadie asignado, o hay gente sin su horario (RN-66, 2026-09-08).
    */
    if (faltaPersonal) nombres.push("personal asignado");
    else if (faltaHorarioPersonal) nombres.push("horario del personal");

    return nombres;
  }, [values, faltaPersonal, faltaHorarioPersonal]);

  // Antes del primer intento de envío no se dice nada: no se molesta al operador con lo
  // que aún no ha intentado registrar. Los hooks de arriba se llaman siempre (orden fijo).
  if (submitCount === 0) return null;

  return (
    <p
      role="status"
      className={`text-sm ${
        faltantes.length > 0 ? "text-error" : "text-base-content/70"
      }`}
    >
      {faltantes.length > 0
        ? `Falta ${faltantes.join(", ")}`
        : "Listo para enviar: no falta ningún campo"}
    </p>
  );
};

/**
 * Al detenerse el envío, el cursor va al primer campo inválido.
 *
 * NO PINTA NADA: existe por su efecto. Se monta dentro de `<Formik>` porque necesita su
 * contexto, y devolver `null` es más honesto que colgarle el efecto a un componente que
 * sí dibuja algo.
 *
 * SE ACTÚA UNA VEZ POR INTENTO, y de ahí el `useRef`. `errors` está en las dependencias
 * —el lint lo exige, y con razón—, así que sin ese guardián el foco saltaría al primer
 * campo inválido **con cada tecla** pulsada después de un envío fallido, y corregir el
 * segundo campo sería imposible.
 *
 * Y SE ESPERA A QUE LA VALIDACIÓN TERMINE: Formik incrementa `submitCount` antes de
 * validar, así que mirar `errors` mientras `isValidating` es leer el resultado anterior.
 */
/**
 * Avisa a la página del valor actual del formulario en cada cambio, para que P-01
 * conserve la captura en `sessionStorage`.
 *
 * NO PINTA NADA, como `FocoAlPrimerError`: vive dentro de `<Formik>` porque necesita su
 * contexto y devolver `null` es más honesto que colgar el efecto de algo que sí dibuja.
 *
 * SOLO SE MONTA CUANDO HAY A QUIÉN AVISAR: P-01 pasa `onValoresCambian` en alta y lo omite
 * en edición y en los demás usos, y sin él este componente no se pinta.
 */
const ReporteroDeValores: FC<{
  onValoresCambian: (valores: ValoresOperativo) => void;
}> = ({ onValoresCambian }) => {
  const { values } = useFormikContext<ValoresOperativo>();

  useEffect(() => {
    onValoresCambian(values);
  }, [values, onValoresCambian]);

  return null;
};

const FocoAlPrimerError: FC = () => {
  const { submitCount, isValidating, errors } =
    useFormikContext<ValoresOperativo>();
  const intentoAtendido = useRef(0);

  useEffect(() => {
    if (isValidating || submitCount === intentoAtendido.current) return;
    intentoAtendido.current = submitCount;

    const primero = CAMPOS_DEL_FORMULARIO.find(({ campo }) => errors[campo]);
    if (!primero?.id) return;

    document.getElementById(primero.id)?.focus();
  }, [submitCount, isValidating, errors]);

  return null;
};

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
  /** VARIAS zonales (2026-09-21): recarga la UNIÓN de los puntos de las elegidas. */
  onZonalesElegidas: (zonalesIds: number[]) => void;
  /**
   * AGREGAR UN PUNTO AL CATÁLOGO desde el registro (Unidad de Operativos, 2026-09-24). Habilita el
   * «Agregar punto de encuentro»: al teclearlo NO se crea nada todavía —queda pendiente en el
   * formulario (`punto = OPCION_PUNTO_NUEVO`, `puntoNuevo`)— y el servidor lo crea al REGISTRAR,
   * dentro de la misma transacción del operativo, de modo que si el operativo no se crea el punto
   * tampoco queda. Solo el ALTA lo enciende (`true`); en edición y aporte el punto ya existe. Se
   * combina además con la bandera `puntoManual` del catálogo (hoy los formularios 1-4).
   */
  permiteAgregarPunto?: boolean;

  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  personalAgregado: PersonaAgregada[];
  onAgregarPersona: (persona: PersonaElegible) => void;
  onRetirarPersona: (funcionarioId: number) => void;
  /** Turno propio por persona (2026-09-08). Sin él, la bandeja es la de siempre. */
  onCambiarHorarioPersona?: (
    funcionarioId: number,
    horaInicio: string,
    horaFin: string,
  ) => void;
  avisoPersonal: string | null;
  /**
   * Que la asignación se guardó, dicho en palabras. Ver `SelectorPersonal.confirmacion`.
   *
   * OPCIONAL PORQUE NO APLICA AL ALTA. Al componer un operativo nuevo el personal viaja
   * con él al pulsar «Registrar»: no hay nada guardado que confirmar hasta entonces, y
   * decir que sí lo hay sería mentir sobre el estado del servidor.
   */
  confirmacionPersonal?: string | null;

  /**
   * Notas YA ESCRITAS del operativo (bitácora, 2026-09-09), para mostrarlas en solo lectura
   * al corregir. En el alta no hay ninguna: llega vacío. No se editan ni se borran; en
   * corrección solo se agregan nuevas.
   */
  observacionesExistentes?: ObservacionOperativo[];

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
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * PARA LEER LO TECLEADO SIN HABERLO ENVIADO. 2026-09-01.
   *
   * Lo pide P-01 desde que registrar y corregir comparten una sola instancia de este
   * formulario: al pulsar «Editar» hay que guardar el borrador de la captura antes de
   * que los valores del operativo ocupen los mismos campos, y devolverlo al salir. La
   * promesa de la cabecera de P-01 —«LO CAPTURADO NUNCA SE PIERDE»— depende de esto.
   *
   * ES UNA REFERENCIA, NO UN `onChange`. Avisar del valor en cada pulsación obligaría a
   * la página a guardar estado en cada tecla y a repintar el formulario entero con ella;
   * aquí solo se lee, y solo en el instante en que se cambia de modo.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  refFormik?: Ref<FormikProps<ValoresOperativo>>;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * PARA CONSERVAR LA CAPTURA AL SALIR DE LA PANTALLA. 2026-09-04.
   *
   * Distinto de `refFormik`: aquél se lee UNA vez, al cambiar de modo; esto avisa del
   * valor en cada cambio para que P-01 lo guarde en `sessionStorage`. Hace falta porque
   * al navegar a otra pantalla React Router DESMONTA la página —y con ella el `innerRef`,
   * que queda a `null`—, así que no hay un «al salir» donde leer los valores: se guardan
   * sobre la marcha y al salir ya están guardados.
   *
   * OPCIONAL Y SOLO EN ALTA. En edición no se persiste (la captura está aparte, a salvo),
   * así que P-01 no pasa esta prop en ese modo y el reportero no se monta. Los demás usos
   * —P-02, modo aporte— tampoco la pasan y siguen igual que antes.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  onValoresCambian?: (valores: ValoresOperativo) => void;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * «CANTIDAD DE OPERATIVOS» POR PERSONA · SOLO EN EL FORMULARIO QUE LO ADMITE (form 8). 2026-09-10.
   *
   * Cada persona asignada lleva su propia cantidad (columna en el bloque de Personal) y
   * genera SUS PROPIOS N operativos independientes, todos con SU MISMA hora general (desde
   * 2026-09-14 el horario ya NO se segmenta en tramos).
   * `permiteCantidadPorPersona` viene del catálogo del formulario (`cantidadPorPersona`), y
   * `onCambiarCantidadPersona` fija la cantidad de una persona. NO se ofrece en edición ni
   * en el adicional: la página lo enciende solo en el alta del formulario que lo admite.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  permiteCantidadPorPersona?: boolean;
  onCambiarCantidadPersona?: (funcionarioId: number, cantidad: number) => void;
  /**
   * PERSONAL EN SOLO LECTURA (2026-09-14). En el formulario 8, al EDITAR un operativo el
   * personal no se toca: sus identificadores ya están generados y no son modificables, así que
   * solo se pueden cambiar zonal, punto, instituciones y tipo. Deshabilita el bloque de personal
   * (agregar, retirar, horario y cantidad) sin bloquear el resto del formulario.
   */
  personalBloqueado?: boolean;
  /**
   * OCULTA por completo el bloque de personal (2026-09-18). En la PATRULLA (Form 5/6), al editar,
   * el personal se gestiona con el «roster» de la patrulla —cada código de área con su «Cambiar»/
   * «Agregar»— que vive en el panel, no aquí; este formulario solo edita los GENERALES. Con esto la
   * columna de campos ocupa todo el ancho.
   */
  personalOculto?: boolean;
  /**
   * AL ASIGNAR UNA PERSONA, PROPONE SU ZONAL COMO ZONAL DEL OPERATIVO (2026-09-24). Solo lo
   * enciende el ALTA del registro (P-01): en edición y en aporte el operativo ya tiene su zonal.
   * No se puede deducir de `valoresIniciales` porque el alta también los pasa (el borrador).
   */
  proponerZonalDePersona?: boolean;
};

const FormularioOperativo: FC<FormularioOperativoProps> = ({
  formularioCodigo,
  catalogos,
  puntos,
  cargandoPuntos,
  onZonalesElegidas,
  permiteAgregarPunto = false,
  candidatos,
  cargandoPersonal,
  personalAgregado,
  onAgregarPersona,
  onRetirarPersona,
  onCambiarHorarioPersona,
  avisoPersonal,
  confirmacionPersonal = null,
  observacionesExistentes = [],
  valoresIniciales,
  textoAccion = "Registrar operativo",
  onCancelar,
  bloqueado,
  soloPersonal = false,
  guardando,
  onGuardar,
  refFormik,
  onValoresCambian,
  permiteCantidadPorPersona = false,
  onCambiarCantidadPersona,
  personalBloqueado = false,
  personalOculto = false,
  proponerZonalDePersona = false,
}) => (
  <Formik<ValoresOperativo>
    innerRef={refFormik}
    initialValues={
      valoresIniciales ?? { ...VALORES_INICIALES, formularioCodigo }
    }
    enableReinitialize
    validationSchema={esquemaOperativo}
    /*
      ═══════════════════════════════════════════════════════════════════════════════
      EL PERSONAL ES OBLIGATORIO, Y SE VALIDA AQUÍ Y NO EN YUP. 2026-09-02.

      Lo pidió el negocio, y **es lo que `FASE5` §7 especificaba desde el diseño**: «Personal
      · al menos una persona · al enviar · `alert alert-error` sobre el bloque». Lo que se
      construyó fue lo contrario, y así quedó escrito en la regla 14 de `CLAUDE.md`. Se
      resuelve a favor del wireframe.

      NO PUEDE IR EN `esquemaOperativo` porque el personal **no es un campo de Formik**:
      vive en un estado de la página, y en modo edición en el propio operativo. `validate`
      sí lo alcanza, porque se declara aquí y cierra sobre la propiedad.

      FORMIK LO TRATA COMO CUALQUIER OTRO ERROR: mientras exista, `handleSubmit` no llama a
      `onGuardar`. No hace falta apagar el botón —y no se apaga—, que es el mismo criterio
      que ya sigue el resto del formulario: se pulsa, no sale, y se dice por qué.

      EN MODO APORTE NO APLICA. Allí no hay botón de guardar —el personal se escribe en cada
      clic— y exigir una lista que ya está guardada bloquearía un envío que no existe.

      Y DESDE EL 2026-09-08 EXIGE TAMBIÉN EL HORARIO DE CADA PERSONA (RN-66): el operativo ya
      no tiene horario propio, así que sin la ventana de cada asignado el registro no tiene
      hora. Solo aplica donde se captura el turno por persona —`onCambiarHorarioPersona`—; en
      edición y aporte el turno ya está fijado y no se pide aquí.
      ═══════════════════════════════════════════════════════════════════════════════
    */
    validate={() => {
      if (soloPersonal) return {};

      if (personalAgregado.length === 0) {
        return {
          personal:
            "Asigne al menos una persona al operativo antes de registrarlo.",
        };
      }
      // RN-66: el horario es por persona y obligatorio en cada una.
      if (
        onCambiarHorarioPersona &&
        personalAgregado.some((persona) => !persona.horaInicio || !persona.horaFin)
      ) {
        return {
          personal: "Indique el horario (inicio y fin) de cada persona asignada.",
        };
      }
      return {};
    }}
    onSubmit={onGuardar}
  >
    {({ values, setFieldValue, errors, touched, submitCount }) => {
      /*
        SOLO DESPUÉS DEL PRIMER ENVÍO, como el resto de los errores del formulario: quien
        abre la pantalla no tiene por qué encontrarse un aviso rojo sobre un bloque que
        todavía no ha tenido ocasión de llenar. `submitCount` es lo que distingue «aún no
        lo ha intentado» de «lo intentó y falta».
      */
      /*
        DOS FALTAS DISTINTAS DEL PERSONAL, Y LAS DOS VIVEN EN `errors.personal` (lo pone
        `validate`): no hay nadie asignado, o hay gente sin su horario (RN-66). El aviso
        sobre el bloque muestra el mensaje exacto; el resumen las nombra por separado.
      */
      const errorPersonal = (errors as ErroresDelOperativo).personal;
      const hayErrorPersonal = submitCount > 0 && Boolean(errorPersonal);
      const faltaPersonal = hayErrorPersonal && personalAgregado.length === 0;
      const faltaHorarioPersonal =
        hayErrorPersonal && personalAgregado.length > 0;

      /*
        AL ASIGNAR UNA PERSONA SE PROPONE SU ZONAL COMO ZONAL DEL OPERATIVO (2026-09-24).
        Si la persona gestiona una zona (`zonalId`) y aún no está elegida, se añade a
        `zonalesIds` (unión, no reemplaza) y se recargan los puntos de esa unión —el mismo
        efecto que elegirla a mano—. Si no tiene zonal, no se toca nada. Se envuelve
        `onAgregarPersona` aquí porque `zonalesIds` es un valor de Formik y solo desde el
        render-prop se tiene `setFieldValue`.
      */
      const agregarConZonal = (persona: PersonaElegible): void => {
        onAgregarPersona(persona);
        // SOLO EN EL ALTA (lo enciende la página con `proponerZonalDePersona`). En edición y en
        // aporte el operativo ya tiene su zonal y agregar a alguien no debe cambiarla. No se
        // deduce de `valoresIniciales`: el alta también los pasa (el borrador de la captura).
        if (!proponerZonalDePersona) return;
        const zonal = persona.zonalId;
        if (zonal == null || values.zonalesIds.includes(zonal)) return;
        // SOLO SI EL FORMULARIO OFRECE ESA ZONAL (tiene puntos en ella, RN-16). Si la zonal de
        // la persona no está en el catálogo de este formulario, ponerla dejaría un token que no
        // se puede pintar y un envío inválido (sin punto). En ese caso no se propone nada.
        const laOfrece = (catalogos?.zonales ?? []).some((z) => z.id === zonal);
        if (!laOfrece) return;
        const zonales = [...values.zonalesIds, zonal];
        void setFieldValue("zonalesIds", zonales);
        onZonalesElegidas(zonales);
      };

      return (
        <Form className="flex flex-col gap-4">
          {/*
            ═══════════════════════════════════════════════════════════════════════════
            DOS COLUMNAS: PERSONAL A LA IZQUIERDA, EL RESTO APILADO A LA DERECHA. 2026-09-09.

            Lo pidió el negocio con este esquema:

              Personal asignado │ Zonal · Punto de encuentro
                                │ Instituciones · Tipo de control
                                │ Observaciones

            Izquierda: Personal (alto completo), con el contador «Cantidad» junto a «Horario*»
            en su cabecera. Derecha: una pila —(Zonal, Punto), (Instituciones, Tipo), y
            Observaciones a lo ancho—. A `lg` las dos columnas van lado a lado; por debajo se
            apilan. El «Tipo de control» se sacó de `SelectorZonalPunto` (`renderTipo={false}`)
            para poder ponerlo junto a Instituciones: es `SelectorTipoControl`.
            ═══════════════════════════════════════════════════════════════════════════
          */}
          <div
            className={`grid grid-cols-1 gap-3 ${
              personalOculto ? "" : "lg:grid-cols-2"
            }`}
          >
            {/*
              IZQUIERDA · el bloque de Personal asignado. En el formulario 8 cada persona
              lleva su columna «Cantidad de operativos»; en el resto, solo Persona y Horario.
              En la PATRULLA al editar se OCULTA: su personal se gestiona con el roster del panel.
            */}
            {!personalOculto && (
            <div className="flex flex-col gap-3">
              <SelectorPersonal
                candidatos={candidatos}
                cargando={cargandoPersonal}
                agregadas={personalAgregado}
                onAgregar={agregarConZonal}
                onRetirar={onRetirarPersona}
                /* Form 8 en edición: el personal queda en solo lectura (ids ya generados). */
                deshabilitado={bloqueado || personalBloqueado}
                /*
                  LA MISMA CONDICIÓN QUE `validate`, y por eso se escribe igual: el
                  asterisco y el rechazo del envío tienen que decir lo mismo. Con dos
                  expresiones distintas, el día que una cambie el formulario marcaría como
                  obligatorio algo que deja pasar, o al revés.
                */
                obligatorio={!soloPersonal}
                /*
                  DOS ORÍGENES, UNA SOLA RANURA, Y MANDA EL DEL SERVIDOR. El rechazo de una
                  persona concreta —cupo, descanso, área— lo redacta el servidor y describe
                  algo que acaba de pasar; «asigne al menos una» es local y describe algo
                  que falta. Si coincidieran, el del servidor es el que hay que atender:
                  llegó después y explica por qué la lista no creció.

                  `FASE5` §7 pide para este caso «`alert alert-error` sobre el bloque», que
                  es exactamente lo que `avisoRechazo` pinta desde que existe.
                */
                avisoRechazo={
                  avisoPersonal ??
                  (hayErrorPersonal ? (errorPersonal ?? null) : null)
                }
                confirmacion={confirmacionPersonal}
                onCambiarHorario={onCambiarHorarioPersona}
                horasHorario={horasSeleccionables()}
                permiteCantidadPorPersona={
                  permiteCantidadPorPersona && !soloPersonal
                }
                onCambiarCantidad={onCambiarCantidadPersona}
              />
            </div>
            )}

            {/* DERECHA · la pila de campos del operativo. */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/*
                  Zonal y Punto de encuentro (fila 1 de la pila). El «Tipo de control» NO se
                  pinta aquí (`renderTipo={false}`): baja a la fila de Instituciones.
                */}
                <SelectorZonalPunto
                  renderTipo={false}
                  zonales={catalogos?.zonales ?? []}
                  zonalesSeleccionadas={values.zonalesIds}
                  onZonalesChange={(ids) => {
                    void setFieldValue("zonalesIds", ids);
                    // Sin zonales no hay punto posible; se limpia. Con varias, el punto se
                    // CONSERVA y se recargan los puntos de la UNIÓN: agregar una zonal no invalida
                    // el punto ya elegido. Si se quitó la zonal a la que pertenecía, el servidor
                    // lo rechaza al enviar (INV-07), con su mensaje.
                    if (ids.length === 0) {
                      void setFieldValue("punto", "");
                      void setFieldValue("puntoLibre", "");
                      void setFieldValue("puntoNuevo", null);
                    }
                    // Un PUNTO NUEVO pendiente se descarta si se deselecciona su zonal: el punto
                    // pertenece a esa zonal y crearlo fuera de las elegidas no tendría sentido.
                    if (
                      values.puntoNuevo &&
                      !ids.includes(values.puntoNuevo.zonalId)
                    ) {
                      void setFieldValue("punto", "");
                      void setFieldValue("puntoNuevo", null);
                    }
                    onZonalesElegidas(ids);
                  }}
                  puntos={puntos}
                  cargandoPuntos={cargandoPuntos}
                  puntoSeleccionado={values.punto}
                  onPuntoChange={(valor) => {
                    void setFieldValue("punto", valor);
                    if (valor !== OPCION_ADICIONALES) {
                      void setFieldValue("puntoLibre", "");
                    }
                    // Al elegir otro punto se descarta el punto nuevo pendiente.
                    if (valor !== OPCION_PUNTO_NUEVO) {
                      void setFieldValue("puntoNuevo", null);
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
                  tipoMultiple={catalogos?.tipoControlMultiple ?? false}
                  tiposSeleccionadosIds={values.tiposControlIds}
                  onTiposChange={(ids) =>
                    void setFieldValue("tiposControlIds", ids)
                  }
                  tipoLibre={values.tipoLibre}
                  onTipoLibreChange={(texto) =>
                    void setFieldValue("tipoLibre", texto)
                  }
                  capturaLibrePunto={catalogos?.capturaLibrePunto ?? false}
                  capturaLibreTipo={catalogos?.capturaLibreTipo ?? false}
                  permiteAgregarPunto={
                    (catalogos?.puntoManual ?? false) && permiteAgregarPunto
                  }
                  /*
                    Al teclear un punto nuevo NO se crea nada todavía: queda pendiente en el
                    formulario (`punto = OPCION_PUNTO_NUEVO`, `puntoNuevo`), y el servidor lo crea
                    al REGISTRAR, dentro de la misma transacción del operativo. Así, si el operativo
                    se rechaza, el punto tampoco queda registrado.
                  */
                  onAgregarPunto={(nombre, zonalId) => {
                    void setFieldValue("punto", OPCION_PUNTO_NUEVO);
                    void setFieldValue("puntoNuevo", { nombre, zonalId });
                    void setFieldValue("puntoLibre", "");
                  }}
                  puntoNuevoNombre={values.puntoNuevo?.nombre}
                  deshabilitado={bloqueado || soloPersonal}
                  /*
                   * Un error se muestra cuando el campo se tocó, y al enviar Formik marca
                   * como tocados todos: es el momento en que hacen falta. Mismo criterio
                   * que el resto de los campos del formulario.
                   */
                  errores={{
                    zonal: touched.zonalesIds
                      ? (errors.zonalesIds as string | undefined)
                      : undefined,
                    punto: touched.punto ? errors.punto : undefined,
                    puntoLibre: touched.puntoLibre
                      ? errors.puntoLibre
                      : undefined,
                    tipoControl: touched.tipoControl
                      ? errors.tipoControl
                      : undefined,
                    tipoLibre: touched.tipoLibre ? errors.tipoLibre : undefined,
                  }}
                />

                {/*
                  INSTITUCIONES · fila 2 de la pila, a la izquierda de «Tipo de control».
                  El orden del DOM —punto, Instituciones, tipo— hace que en dos columnas
                  quede Instituciones|Tipo. El valor a Formik no cambió: `institucionesIds`.
                */}
                <div>
                  <SelectorTokens
                    id="instituciones"
                    etiqueta="Instituciones"
                    obligatorio
                    opciones={catalogos?.instituciones ?? []}
                    seleccionadas={values.institucionesIds}
                    onCambio={(ids) =>
                      void setFieldValue("institucionesIds", ids)
                    }
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

                {/* TIPO DE CONTROL · a la derecha de Instituciones. */}
                <SelectorTipoControl
                  tiposControl={catalogos?.tiposControl ?? []}
                  tipoSeleccionado={values.tipoControl}
                  onTipoChange={(valor) => {
                    void setFieldValue("tipoControl", valor);
                    if (valor !== OPCION_ADICIONALES) {
                      void setFieldValue("tipoLibre", "");
                    }
                  }}
                  tipoMultiple={catalogos?.tipoControlMultiple ?? false}
                  tiposSeleccionadosIds={values.tiposControlIds}
                  onTiposChange={(ids) =>
                    void setFieldValue("tiposControlIds", ids)
                  }
                  tipoLibre={values.tipoLibre}
                  onTipoLibreChange={(texto) =>
                    void setFieldValue("tipoLibre", texto)
                  }
                  capturaLibreTipo={catalogos?.capturaLibreTipo ?? false}
                  deshabilitado={bloqueado || soloPersonal}
                  errorTipoControl={
                    touched.tipoControl ? errors.tipoControl : undefined
                  }
                  errorTipoLibre={
                    touched.tipoLibre ? errors.tipoLibre : undefined
                  }
                />
              </div>

              {/*
                LAS OBSERVACIONES SON NOTAS INDEPENDIENTES desde el 2026-09-09 (bitácora): se
                teclea una y se agrega; en corrección se muestran las ya escritas en solo
                lectura. Van a lo ancho, al pie de la pila derecha.
              */}
              <div>
                <CapturadorNotas
                  notasNuevas={values.observaciones}
                  onCambio={(notas) =>
                    void setFieldValue("observaciones", notas)
                  }
                  notasExistentes={observacionesExistentes}
                  deshabilitado={bloqueado || soloPersonal}
                />
              </div>
            </div>
          </div>

          {/*
            EL RESUMEN A LA IZQUIERDA DE LOS BOTONES. D-11.

            Se pinta solo cuando hay algo que enviar: en el modo «solo personal» el
            botón de guardar no existe —el personal se guarda por su cuenta— y un
            resumen de envío junto a un formulario que no se envía es ruido. Y aun con
            botón, `ResumenDeEnvio` no dice nada hasta el primer intento de envío
            (`submitCount > 0`): antes de eso ni siquiera ocupa espacio.
          */}
          <div className="flex flex-wrap items-center gap-3">
            {!soloPersonal && (
              <ResumenDeEnvio
                faltaPersonal={faltaPersonal}
                faltaHorarioPersonal={faltaHorarioPersonal}
              />
            )}

            {/*
              `ml-auto` ANCLA LOS BOTONES A LA DERECHA, SIEMPRE. Antes el pie era
              `justify-between`, que con un solo hijo —cuando el resumen aún no aparece
              (`submitCount === 0`)— empujaba el botón a la IZQUIERDA, y al primer intento
              «Registrar operativo» saltaba a la derecha. Con `ml-auto` los botones quedan
              fijos a la derecha aparezca o no el resumen a su izquierda, y no se mueven.
            */}
            <div className="ml-auto flex gap-2">
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
                  {guardando ? (
                    <>
                      <span
                        className="loading loading-spinner loading-sm"
                        aria-hidden="true"
                      />
                      Guardando…
                    </>
                  ) : (
                    textoAccion
                  )}
                </button>
              )}
            </div>
          </div>

          <FocoAlPrimerError />
          {onValoresCambian && (
            <ReporteroDeValores onValoresCambian={onValoresCambian} />
          )}
        </Form>
      );
    }}
  </Formik>
);

export default FormularioOperativo;
