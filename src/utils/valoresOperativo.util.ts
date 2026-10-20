/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos
 * Archivo: valoresOperativo.util.ts
 * Responsabilidad: Declarar los valores del formulario de operativo y su conversión.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * VIVE FUERA DE `FormOperativo.tsx` PORQUE LO USAN DOS PANTALLAS. P-01 parte de
 * los valores vacíos y P-02 parte de un operativo existente; dejar la conversión dentro
 * del componente obligaba a exportar una función desde un archivo de componentes, que es
 * justo lo que rompe el refresco rápido de Vite.
 */

import type { Operativo, TipoTransporte } from "../interfaces/Operativo";
import { macroSegunTipo } from "./tipoTransporte.util.ts";

/**
 * Opción del desplegable que activa la captura libre.
 *
 * **No es una fila del catálogo** (INV-08): es una elección del formulario, y por eso su
 * valor es una palabra y no un identificador. El servidor recibe `puntoLibre` en lugar de
 * `puntoEncuentroId` cuando llega esta opción.
 */
export const OPCION_ADICIONALES = "ADICIONALES";

/**
 * Opción del desplegable de punto que representa un PUNTO NUEVO tecleado al registrar (Unidad de
 * Operativos, 2026-09-24). Como `OPCION_ADICIONALES`, no es una fila del catálogo: es una elección
 * del formulario, y por eso su valor es una palabra y no un identificador. Cuando el punto vale
 * esto, `puntoNuevo` lleva el nombre y la zonal, y el servidor CREA el punto al registrar —dentro
 * de la misma transacción del operativo—, de modo que si el operativo no se crea, el punto tampoco.
 */
export const OPCION_PUNTO_NUEVO = "PUNTO_NUEVO";

export type ValoresOperativo = {
  formularioCodigo: string;
  horaInicio: string;
  horaFin: string;
  /**
   * VARIAS zonales (RN-19), desde el 2026-09-21. Antes era una sola (`zonalId`); ahora el operativo
   * puede abarcar varias. El punto de encuentro pertenece a alguna de ellas (el servidor lo valida).
   */
  zonalesIds: number[];
  punto: string;
  puntoLibre: string;
  /**
   * PUNTO NUEVO a crear al registrar (Unidad de Operativos, 2026-09-24). Solo tiene contenido cuando
   * `punto === OPCION_PUNTO_NUEVO`; en cualquier otro caso es `null`. NO se crea al teclearlo: viaja
   * con el registro y el servidor lo crea en la misma transacción del operativo.
   */
  puntoNuevo: { nombre: string; zonalId: number } | null;
  tipoControl: string;
  /** Varios tipos, SOLO en el formulario que lo admite (form 8). */
  tiposControlIds: number[];
  tipoLibre: string;
  institucionesIds: number[];
  /**
   * Notas NUEVAS que se van capturando (bitácora, 2026-09-09). En registro son todas; en
   * edición son solo las que se AGREGAN (las ya escritas se muestran aparte, en lectura).
   */
  observaciones: string[];
  /**
   * Hora en que se agregó cada nota nueva (ISO), alineada por posición con `observaciones`
   * (2026-10-16). Viaja en el borrador; no se envía al servidor. Opcional: un borrador anterior no
   * la trae y entonces la nota se muestra sin hora.
   */
  observacionesHoras?: (string | null)[];
  /**
   * Lo escrito en «Escriba una nota…» y aún no agregado (2026-10-16). Al registrar o guardar se
   * agrega solo (`conNotaPendiente`). Viaja en el borrador; no se envía al servidor.
   */
  notaPendiente?: string;
  /**
   * Cómo se moviliza y si es macrooperativo (2026-10-06). Opcionales en el TIPO porque un borrador
   * guardado antes de esa fecha no los trae: quien los lee usa `?? "COMPLETO"` / `?? false`.
   */
  tipoTransporte?: TipoTransporte;
  esMacrooperativo?: boolean;
  /**
   * Transporte requerido (2026-10-07). Verdadero en cuanto quien registra elige el tipo A MANO: desde
   * ahí la sugerencia del formulario ya no lo pisa. Viaja en el borrador; no se envía al servidor.
   */
  tipoTransporteManual?: boolean;
  /**
   * COMPARTIR UNIDAD (2026-10-19). «COMPARTIR» si quien registra marcó «Solicitar compartir unidad
   * con X» ante una coincidencia del mismo punto y horario; sin marcar, decide la DAF. Solo de la
   * interfaz: viaja en el borrador, no al servidor. Opcional: un borrador anterior no la trae, y uno
   * con las opciones retiradas («PROPIOS», «EXCLUSIVO», «DAF») se lee como «sin solicitud».
   */
  eleccionCompartir?: EleccionCompartir;
  /** El operativo con el que pide compartir unidad (la intención; la ejecuta la DAF). */
  compartirConOperativoId?: number | null;
  /** Identificador de ese operativo, para decirlo en el pie y en el aviso. Solo de la interfaz. */
  compartirConIdentificador?: string | null;
};

/**
 * La respuesta a «¿Desea solicitar esta movilización en la misma unidad?»: solo «COMPARTIR». Las
 * otras tres opciones (propios medios, vehículo exclusivo, dejar que decida la DAF) se retiraron el
 * 2026-10-19 porque repetían «Transporte requerido» y el check del macrooperativo.
 */
export type EleccionCompartir = "COMPARTIR";

export const VALORES_INICIALES: ValoresOperativo = {
  formularioCodigo: "",
  horaInicio: "",
  horaFin: "",
  zonalesIds: [],
  punto: "",
  puntoLibre: "",
  puntoNuevo: null,
  tipoControl: "",
  tiposControlIds: [],
  tipoLibre: "",
  institucionesIds: [],
  observaciones: [],
  tipoTransporte: "COMPLETO",
  esMacrooperativo: false,
};

/**
 * Valores de un operativo existente, para editarlo con el mismo formulario y las mismas
 * validaciones con que se registró (lo que pide M-23).
 *
 * `zonalesIds` toma TODAS las zonales del operativo (2026-09-21): la interfaz ya ofrece varias, así
 * que se dejan de descartar las adicionales (cierra PV-31).
 */
export const comoValoresDeFormulario = (
  operativo: Operativo,
): ValoresOperativo => ({
  formularioCodigo: operativo.formulario.codigo,
  horaInicio: operativo.horaInicio,
  horaFin: operativo.horaFin,
  zonalesIds: operativo.zonales.map((zonal) => zonal.id),
  punto: operativo.puntoEncuentro
    ? String(operativo.puntoEncuentro.id)
    : operativo.puntoLibre
      ? OPCION_ADICIONALES
      : "",
  puntoLibre: operativo.puntoLibre ?? "",
  // Al EDITAR nunca hay un punto nuevo pendiente: los puntos ya existen. La creación de un punto
  // solo ocurre en el ALTA (Unidad de Operativos), y ya quedó hecha si el operativo existe.
  puntoNuevo: null,
  tipoControl: operativo.tipoControl
    ? String(operativo.tipoControl.id)
    : operativo.tipoLibre
      ? OPCION_ADICIONALES
      : "",
  tiposControlIds: (operativo.tiposControl ?? []).map((tipo) => tipo.id),
  tipoLibre: operativo.tipoLibre ?? "",
  institucionesIds: operativo.instituciones.map((institucion) => institucion.id),
  // En edición las notas NUEVAS arrancan vacías: las ya escritas no se editan (bitácora),
  // se muestran aparte en lectura. Solo se agregan.
  observaciones: [],
  tipoTransporte: operativo.tipoTransporte ?? "COMPLETO",
  // Solo COMPLETO admite el macrooperativo (2026-10-19): un dato viejo con otro tipo no se arrastra.
  esMacrooperativo: macroSegunTipo(operativo.tipoTransporte, operativo.esMacrooperativo),
  // Compartir unidad (2026-10-19): la intención guardada vuelve como el check marcado.
  eleccionCompartir: operativo.compartirCon ? "COMPARTIR" : undefined,
  compartirConOperativoId: operativo.compartirCon?.id ?? null,
  compartirConIdentificador: operativo.compartirCon?.identificador ?? null,
});

/**
 * LO QUE VIAJA DE «COMPARTIR UNIDAD» (2026-10-19). En el ALTA, la solicitud tal cual. En la EDICIÓN
 * solo lo que CAMBIÓ respecto de lo guardado (`iniciales`): lo que no viene, el servidor lo
 * conserva, y reenviar una intención que no se tocó la volvería un pedido nuevo —y un destino que ya
 * no coincide pasaría de «se retira con aviso» a error—.
 *
 * La justificación del vehículo exclusivo ya no sale del formulario (2026-10-19, opción A del
 * usuario): la de un operativo que la trae de antes no se toca, y el servidor la limpia sola si se
 * quita el macrooperativo.
 */
export const camposCompartirParaEnvio = (
  valores: ValoresOperativo,
  iniciales?: ValoresOperativo,
): { compartirConOperativoId?: number | null } => {
  const compartirCon =
    valores.eleccionCompartir === "COMPARTIR" ? (valores.compartirConOperativoId ?? null) : null;

  if (!iniciales) {
    return compartirCon !== null ? { compartirConOperativoId: compartirCon } : {};
  }

  const compartirAntes = iniciales.compartirConOperativoId ?? null;
  return compartirCon !== compartirAntes ? { compartirConOperativoId: compartirCon } : {};
};
