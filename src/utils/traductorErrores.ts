/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: traductorErrores.ts
 * Responsabilidad: Convertir cualquier fallo (del servidor, de la red o del propio navegador) en lo
 *                  que muestra un mensaje de error: título, texto para el funcionario, detalle técnico
 *                  y si tiene sentido reintentar. Es el ÚNICO sitio donde un código se vuelve texto.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL MENSAJE DEL SERVIDOR SIGUE MANDANDO (regla 7). El backend redacta cada rechazo de negocio para
 * el funcionario y nombra a la persona o la placa implicada («PMA-3370 tiene transporte asignado el
 * 16/10/2026… Libere esa asignación en «Planificar el día»…»). Reescribirlo aquí lo empobrecería.
 * Lo que el traductor AÑADE es el TÍTULO —verbo + objeto, o la causa— por código de negocio
 * (`transporte-backend/src/common/errors/codigos-error.ts`), y el DETALLE técnico colapsable.
 *
 *   · Código conocido   → su título (o el que pide la pantalla) + el mensaje del servidor.
 *   · Código desconocido 4xx con mensaje → «No se pudo completar la acción» + el mensaje del servidor.
 *   · 500, tiempo agotado, fallo del propio navegador → el texto genérico, NUNCA el volcado técnico.
 *   · Sin red → «No hay comunicación con el servidor…».
 *   · El detalle lleva siempre el estado HTTP, el código y el identificador de seguimiento.
 *
 * El título que pasa la pantalla (`titulo`) gana al del código: dice QUÉ acción falló («No se pudo
 * dar de baja»), y el mensaje del servidor ya dice por qué.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { HttpClientError } from "../api/httpClient.ts";
import { cuerpoDeError, presentarError } from "./errorApi.util.ts";

export interface ErrorTraducido {
  titulo: string;
  /** Para el funcionario: qué pasó y qué puede hacer. Nunca un texto técnico. */
  mensaje: string;
  /** Para soporte: estado HTTP, código y seguimiento. Va colapsado. */
  detalle: string;
  /** Reintentar puede salir bien (red, servidor caído, dependencia externa); una regla de negocio, no. */
  reintentable: boolean;
  codigo: string;
  estado: number;
}

export const TITULO_ERROR_GENERICO = "No se pudo completar la acción";

export const MENSAJE_ERROR_GENERICO =
  "No se pudo completar la acción. Intente de nuevo; si persiste, avise al administrador.";

/** Los códigos de negocio del servidor y el título con que se presentan. */
const TITULOS: Record<string, string> = {
  VENTANA_CARGA_CERRADA: "La ventana de carga está cerrada",
  FORMULARIO_NO_AUTORIZADO: "Sin permiso sobre este formulario",
  ROL_NO_AUTORIZADO: "Sin permiso para esta acción",
  PERMISO_INSUFICIENTE: "Sin permiso para esta acción",
  CAMPOS_NO_PERMITIDOS: "No se pudo guardar",
  PERSONA_NO_DISPONIBLE: "La persona no está disponible",
  PERSONA_EN_DESCANSO: "La persona está de descanso",
  TURNO_FUERA_DE_RANGO: "El horario no cabe en el turno",
  CONTRATO_NO_ADMITE_TURNO: "El contrato no admite este turno",
  PATRULLA_CONSECUTIVA: "Salió en patrulla el día anterior",
  TOPE_SALIDAS_PESADAS: "Alcanzó el tope de salidas",
  SOLAPAMIENTO_HORARIO: "El horario se cruza con otro operativo",
  JORNADA_MAXIMA_SUPERADA: "Se supera la jornada máxima",
  CUPO_COMPARTIDO_SUPERADO: "Se superó el cupo compartido",
  AREA_NO_ADMITIDA: "El área no se admite en este formulario",
  CONDUCTOR_PATRULLA_CONSECUTIVA: "El conductor condujo en patrulla ayer",
  CONDICIONANTE_NOCTURNO: "Falta el conductor del operativo nocturno",
  APORTE_COMPARTIDO_PENDIENTE: "Falta el aporte de personal",
  CUADRO_CERRADO: "El cuadro está cerrado",
  ADICIONAL_NO_ENCADENABLE: "No se pudo registrar el adicional",
  OPERATIVO_CON_ADICIONALES: "No se pudo retirar el operativo",
  AUTH_NO_DISPONIBLE: "Auth central no responde",
  CONFLICTO_CONCURRENCIA: "Otra persona cambió estos datos",
  VEHICULO_OCUPADO: "El vehículo está ocupado",
  SERVICIO_FIRMA_NO_DISPONIBLE: "La firma digital no responde",
  CATALOGO_EN_USO: "No se puede eliminar",
  CATALOGO_DUPLICADO: "Ya existe un valor igual",
  FORMULARIO_DUPLICADO: "Ya existe un formulario igual",
  NOMBRE_DUPLICADO: "Ya existe un registro con ese nombre",
  ASIGNACION_NO_VIABLE: "No se pudo asignar",
  MES_NO_PUBLICADO: "El mes no está publicado",
  INSPECCION_NO_DISPONIBLE: "Inspección no responde",
  TRAMITE_INSPECCION_NO_VALIDO: "El trámite no es válido",
  CAMBIO_TIPO_CON_TRANSPORTE: "El cambio libera el transporte",
  CAMBIO_CON_TRANSPORTE: "El cambio libera el transporte",
  COMPARTIR_CON_EXCLUSIVO: "No se puede compartir el vehículo",
  CEDULA_CON_FICHA: "La cédula ya tiene ficha",
  AUSENCIA_SOLAPADA: "La ausencia se cruza con otra",
  AUSENCIA_PASADA: "La ausencia ya terminó",
  PERSONA_NO_ENCONTRADA_EN_AUTH: "La persona no está en Auth central",
  RECURSO_CON_ASIGNACION: "No se pudo dar de baja",
  NO_AUTENTICADO: "La sesión terminó",
  "APP-UNAUTHORIZED-001": "La sesión terminó",
  RECURSO_NO_ENCONTRADO: "No se encontró el registro",
  VALIDACION: "Revise los datos",
};

/** Dependencias externas que fallan y vuelven: ahí sí tiene sentido «Reintentar». */
const REINTENTABLES = new Set([
  "AUTH_NO_DISPONIBLE",
  "SERVICIO_FIRMA_NO_DISPONIBLE",
  "INSPECCION_NO_DISPONIBLE",
]);

/** Título por familia de estado, cuando el código no tiene uno propio. */
const tituloPorEstado = (estado: number): string => {
  if (estado === 401 || estado === 403) return "Sin permiso para esta acción";
  if (estado === 404) return "No se encontró el registro";
  if (estado === 423) return "La ventana de carga está cerrada";
  if (estado === 400 || estado === 422) return "Revise los datos";
  return TITULO_ERROR_GENERICO;
};

const componerDetalle = (partes: (string | undefined)[]): string =>
  partes.filter(Boolean).join(" · ");

type OpcionesTraduccion = {
  /** Qué acción falló, en verbo + objeto («No se pudo guardar»). Gana al título del código. */
  titulo?: string;
};

/** El fallo traducido a un mensaje de error. Ver la cabecera. */
export const traducirError = (
  fallo: unknown,
  { titulo }: OpcionesTraduccion = {},
): ErrorTraducido => {
  const http = fallo as Partial<HttpClientError> | undefined;

  // Un fallo del propio navegador (un error de programación, una librería): su texto es técnico y
  // en inglés, así que va al detalle y el mensaje es el genérico.
  // Se reconoce por la marca de `httpClient` o, si llega sin normalizar, por su forma.
  const esDeLaApi =
    typeof http === "object" &&
    http !== null &&
    (http.isHttpClientError === true ||
      typeof http.status === "number" ||
      http.originalError !== undefined);
  if (!esDeLaApi) {
    const tecnico = fallo instanceof Error ? fallo.message : String(fallo);
    return {
      titulo: titulo ?? TITULO_ERROR_GENERICO,
      mensaje: MENSAJE_ERROR_GENERICO,
      detalle: componerDetalle(["Error en el navegador", tecnico]),
      reintentable: true,
      codigo: "ERROR_NAVEGADOR",
      estado: 0,
    };
  }

  const presentado = presentarError(fallo);
  const cuerpo = cuerpoDeError(fallo as HttpClientError);
  const seguimiento = cuerpo?.correlacionId ?? http.correlationId;
  const textoSeguimiento = seguimiento ? `Seguimiento: ${seguimiento}` : undefined;

  if (presentado.estado === 0) {
    const tiempoAgotado = http.code === "ECONNABORTED" || http.code === "ETIMEDOUT";
    return {
      titulo: titulo ?? TITULO_ERROR_GENERICO,
      mensaje: tiempoAgotado ? MENSAJE_ERROR_GENERICO : presentado.mensaje,
      detalle: componerDetalle([
        tiempoAgotado ? "Sin respuesta del servidor (tiempo de espera agotado)" : "Sin respuesta del servidor",
        presentado.codigo,
        textoSeguimiento,
      ]),
      reintentable: true,
      codigo: presentado.codigo,
      estado: 0,
    };
  }

  const detalle = componerDetalle([
    `HTTP ${presentado.estado}`,
    presentado.codigo,
    textoSeguimiento,
  ]);

  // Un código de negocio conocido conserva su texto aunque venga con 5xx: el servidor lo redactó a
  // propósito (`AUTH_NO_DISPONIBLE`, 503: «el maestro se sigue administrando igual»).
  const conocido = presentado.codigo in TITULOS;

  // Sin cuerpo del servidor (un proxy, un 4xx sin sobre) no hay mensaje que respetar.
  if ((presentado.trato === "generico" && !conocido) || !cuerpo) {
    return {
      titulo:
        titulo ??
        (presentado.trato === "generico" ? TITULO_ERROR_GENERICO : tituloPorEstado(presentado.estado)),
      mensaje: MENSAJE_ERROR_GENERICO,
      detalle,
      reintentable: true,
      codigo: presentado.codigo,
      estado: presentado.estado,
    };
  }

  return {
    titulo: titulo ?? TITULOS[presentado.codigo] ?? tituloPorEstado(presentado.estado),
    mensaje: cuerpo.mensaje,
    detalle,
    reintentable: REINTENTABLES.has(presentado.codigo),
    codigo: presentado.codigo,
    estado: presentado.estado,
  };
};
