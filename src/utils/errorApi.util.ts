/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Manejo de errores de la API
 * Archivo: errorApi.util.ts
 * Responsabilidad: Traducir la respuesta de error del servidor a una decisión de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL `mensaje` DEL SERVIDOR SE MUESTRA TAL CUAL.
 *
 * Está redactado para el funcionario y nombra a la persona o el recurso implicado:
 * «BENAVIDES FERNANDO salió en patrulla ayer. No puede tener patrulla dos días
 * seguidos». Reescribirlo aquí lo convertiría en «error de validación», que es
 * exactamente lo que el backend se prohíbe a sí mismo (regla 8 de su CLAUDE.md).
 *
 * Esta utilidad **no redacta**: decide qué hacer con el mensaje que ya viene escrito.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { HttpClientError } from "../api/httpClient";

/** Cuerpo de error del backend. FASE4 §13 e IMPLEMENTATION_GUIDE §11.2. */
export interface ErrorApi {
  statusCode: number;
  codigo: string;
  mensaje: string;
  detalles?: unknown;
  correlacionId?: string;
  timestamp?: string;
  ruta?: string;
}

/** Qué debe hacer la pantalla con este error. */
export type TratoDeError =
  | "campo"
  | "permiso"
  | "conflicto"
  | "ventana"
  | "generico";

export interface ErrorPresentado {
  trato: TratoDeError;
  /** El texto del servidor, sin retocar. */
  mensaje: string;
  codigo: string;
  estado: number;
  /** Campos implicados, cuando el servidor los nombra. Para marcarlos en el formulario. */
  campos: string[];
  /** Solo se muestra en el trato genérico: es lo que permite rastrear el fallo. */
  correlacionId?: string;
  /** El formulario queda bloqueado hasta que la ventana vuelva a abrirse. */
  bloquea: boolean;
  /** `true` en 409: lo capturado NO se descarta. */
  conservaCaptura: boolean;
}

const MENSAJE_GENERICO =
  "No se pudo completar la operación. Vuelva a intentarlo; si persiste, informe al administrador con el código de seguimiento.";

const MENSAJE_SIN_RED =
  "No hay comunicación con el servidor. Verifique su conexión y vuelva a intentarlo.";

/**
 * Traduce el error del cliente HTTP a una decisión de interfaz.
 *
 * La tabla es la del plan de M-21:
 *
 * | Código | Comportamiento |
 * |---|---|
 * | 400 | Marca el campo implicado y muestra el mensaje junto a él |
 * | 403 | Aviso de que el perfil no tiene permiso |
 * | 409 | Aviso destacado, **sin perder lo capturado** |
 * | 423 | Bloquea el formulario y muestra la hora de reapertura |
 * | 500 | Mensaje genérico más el identificador de correlación |
 */
export const presentarError = (error: unknown): ErrorPresentado => {
  const httpError = error as HttpClientError;
  const cuerpo = cuerpoDeError(httpError);
  const estado = cuerpo?.statusCode ?? httpError?.status ?? 0;

  // Sin respuesta no hay mensaje del servidor que respetar: el error es de red.
  if (estado === 0) {
    return {
      trato: "generico",
      mensaje: MENSAJE_SIN_RED,
      codigo: httpError?.code ?? "SIN_RESPUESTA",
      estado: 0,
      campos: [],
      correlacionId: httpError?.correlationId,
      bloquea: false,
      conservaCaptura: true,
    };
  }

  const base = {
    mensaje: cuerpo?.mensaje ?? MENSAJE_GENERICO,
    codigo: cuerpo?.codigo ?? "ERROR_INTERNO",
    estado,
    campos: camposImplicados(cuerpo),
  };

  // 422 (2026-10-16, mensajes estándar): datos que el servidor no puede procesar. Es un error de
  // la captura, no del servidor: su texto se conserva, como el del 400.
  if (estado === 400 || estado === 422) {
    return { ...base, trato: "campo", bloquea: false, conservaCaptura: true };
  }

  if (estado === 401 || estado === 403) {
    return { ...base, trato: "permiso", bloquea: false, conservaCaptura: true };
  }

  if (estado === 404 || estado === 409) {
    return {
      ...base,
      trato: "conflicto",
      bloquea: false,
      conservaCaptura: true,
    };
  }

  if (estado === 423) {
    return { ...base, trato: "ventana", bloquea: true, conservaCaptura: true };
  }

  // 500 y cualquier otro: el mensaje del servidor puede ser un volcado interno, así que
  // aquí sí se sustituye por uno genérico, acompañado del identificador de correlación
  // con el que se rastrea el fallo en el registro.
  return {
    ...base,
    mensaje: MENSAJE_GENERICO,
    trato: "generico",
    correlacionId: cuerpo?.correlacionId ?? httpError?.correlationId,
    bloquea: false,
    conservaCaptura: true,
  };
};

/** Las cuatro familias de un aviso en línea (`AvisoEnLinea`): las de los mensajes estándar. */
export type VarianteAviso = "advertencia" | "error" | "exito" | "info";

/** Un aviso de página o de cajón: su texto y su familia. */
export type AvisoTexto = { texto: string; variante: VarianteAviso };

/**
 * Familia del aviso en línea según el trato (mensajes estándar, 2026-10-16). Reemplaza a la vieja
 * `claseDeAviso`, que devolvía una clase de daisyUI.
 *
 * El 403 (`permiso`) es un ERROR: «no se permite» no es una advertencia de campo, y en ámbar se
 * leía como algo que el usuario podía corregir.
 */
export const varianteDeAviso = (trato: TratoDeError): VarianteAviso => {
  const variantes: Record<TratoDeError, VarianteAviso> = {
    campo: "advertencia",
    permiso: "error",
    conflicto: "error",
    ventana: "info",
    generico: "error",
  };

  return variantes[trato];
};

/** El fallo como aviso en línea: el texto del servidor (regla 7) y su familia. */
export const avisoDeFallo = (fallo: unknown): AvisoTexto => {
  const error = presentarError(fallo);
  return { texto: error.mensaje, variante: varianteDeAviso(error.trato) };
};

/** Extrae el cuerpo del error de Axios sin recurrir a `any`. */
export const cuerpoDeError = (error: HttpClientError | undefined): ErrorApi | null => {
  const original = error?.originalError as
    | { response?: { data?: unknown } }
    | undefined;
  const data = original?.response?.data;

  if (typeof data !== "object" || data === null) return null;

  const posible = data as Partial<ErrorApi>;

  return typeof posible.mensaje === "string" &&
    typeof posible.codigo === "string"
    ? (posible as ErrorApi)
    : null;
};

/**
 * Campos que el servidor nombra en `detalles`.
 *
 * `CAMPOS_NO_PERMITIDOS` los devuelve en `campos`; las validaciones de coherencia
 * nombran la propiedad implicada —`puntoId`, `zonalIds`—. Con eso el formulario marca el
 * control correcto en lugar de mostrar el aviso suelto arriba.
 */
const camposImplicados = (cuerpo: ErrorApi | null): string[] => {
  if (!cuerpo || typeof cuerpo.detalles !== "object" || cuerpo.detalles === null) {
    return [];
  }

  const detalles = cuerpo.detalles as Record<string, unknown>;

  if (Array.isArray(detalles.campos)) {
    return detalles.campos.filter(
      (campo): campo is string => typeof campo === "string",
    );
  }

  return Object.keys(detalles);
};

/**
 * ¿El fallo es una CANCELACIÓN pedida por la propia app (AbortController), no un error? (2026-10-05)
 *
 * La vista previa del editor aborta la petición anterior cuando llega una edición nueva; ese aborto
 * NO es un fallo del servidor y no debe mostrarse. `httpClient` normaliza el error conservando el
 * `code` de axios (`ERR_CANCELED`); se mira también el nombre por si llega sin normalizar.
 */
export const esCancelacion = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const { code, name } = error as { code?: unknown; name?: unknown };
  return code === "ERR_CANCELED" || name === "CanceledError" || name === "AbortError";
};

/**
 * A QUIÉN SE REFIERE UN RECHAZO DE PERSONAL (2026-10-16, R2): el servidor adjunta
 * `detalles.funcionarioId` cuando rechaza a una persona concreta (descanso, cruce de horario…). El
 * registro lo usa para pintar el motivo bajo el horario de esa persona. Sin el dato, `null`.
 */
export const funcionarioDelRechazo = (error: unknown): number | null => {
  const cuerpo = cuerpoDeError(error as HttpClientError);
  if (!cuerpo || typeof cuerpo.detalles !== "object" || cuerpo.detalles === null) {
    return null;
  }
  const id = (cuerpo.detalles as { funcionarioId?: unknown }).funcionarioId;
  return typeof id === "number" ? id : null;
};

/**
 * Los MOTIVOS que el servidor adjunta a un rechazo de asignación (2026-10-06): un 409
 * `ASIGNACION_NO_VIABLE` trae en `detalles.motivos` la lista `{ codigo, mensaje }` de la política.
 * Se devuelven los mensajes tal cual (regla 7); sin motivos, lista vacía.
 */
export const motivosDelServidor = (error: unknown): string[] => {
  const cuerpo = cuerpoDeError(error as HttpClientError);
  if (!cuerpo || typeof cuerpo.detalles !== "object" || cuerpo.detalles === null) {
    return [];
  }
  const motivos = (cuerpo.detalles as { motivos?: unknown }).motivos;
  if (!Array.isArray(motivos)) return [];
  return motivos
    .map((motivo) =>
      typeof motivo === "object" && motivo !== null
        ? (motivo as { mensaje?: unknown }).mensaje
        : undefined,
    )
    .filter((mensaje): mensaje is string => typeof mensaje === "string");
};
