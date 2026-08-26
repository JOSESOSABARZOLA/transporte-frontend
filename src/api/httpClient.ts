/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: HTTP
 * Archivo: httpClient.ts
 * Responsabilidad: Provee el cliente HTTP centralizado para consumo de APIs.
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-27
 */

import axios, { AxiosHeaders } from "axios";
import { env } from "../config/env";
import { CORRELATION_ID_HEADER, createCorrelationId } from "./correlationId";

/** Trazabilidad por peticion que pide el contrato compartido con Auth central. */
export const REQUEST_ID_HEADER = "x-request-id";

export type HttpClientError = Error & {
  isHttpClientError: true;
  status?: number;
  code?: string;
  correlationId?: string;
  originalError: unknown;
};

/**
 * Función para obtener el valor de un header específico, normalizando los headers si es necesario.
 * @param headers headers del request
 * @param headerName nombre del header a obtener
 * @returns valor del header o undefined si no existe
 */
function getHeaderValue(headers: unknown, headerName: string) {
  if (!headers) {
    return undefined;
  }

  const normalizedHeaders = AxiosHeaders.from(headers as AxiosHeaders);
  const headerValue = normalizedHeaders.get(headerName);

  return typeof headerValue === "string" ? headerValue : undefined;
}

/**
 * Función para normalizar errores provenientes del cliente HTTP, asegurando que tengan una estructura consistente y contengan información relevante como el status, código de error y correlation ID para facilitar el manejo de errores en la aplicación.
 * @param error error http client
 * @returns error
 */
function normalizeHttpClientError(error: unknown): HttpClientError {
  if (axios.isAxiosError(error)) {
    const normalizedError = new Error(error.message) as HttpClientError;
    const responseCorrelationId = getHeaderValue(
      error.response?.headers,
      CORRELATION_ID_HEADER,
    );
    const requestCorrelationId = getHeaderValue(
      error.config?.headers,
      CORRELATION_ID_HEADER,
    );

    normalizedError.name = "HttpClientError";
    normalizedError.isHttpClientError = true;
    normalizedError.status = error.response?.status;
    normalizedError.code = error.code;
    normalizedError.correlationId =
      responseCorrelationId ?? requestCorrelationId;
    normalizedError.originalError = error;

    return normalizedError;
  }

  if (error instanceof Error) {
    const normalizedError = error as HttpClientError;

    normalizedError.isHttpClientError = true;
    normalizedError.originalError = error;

    return normalizedError;
  }

  const normalizedError = new Error(
    "Unexpected HTTP client error",
  ) as HttpClientError;

  normalizedError.name = "HttpClientError";
  normalizedError.isHttpClientError = true;
  normalizedError.originalError = error;

  return normalizedError;
}

/**
 * Cliente HTTP centralizado utilizando Axios, configurado con una base URL, timeout y headers por defecto. Incluye interceptores para agregar automáticamente el token de autenticación y un correlation ID a cada solicitud, así como para normalizar los errores de respuesta en una estructura consistente.
 */
export const httpClient = axios.create({
  baseURL: `${env.apiBaseUrl}/api/v1`,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
  /**
   * LA SESION VIAJA EN UNA COOKIE HttpOnly QUE ESTE CODIGO NO PUEDE LEER, y ese es
   * exactamente el patron: el token nunca esta al alcance de un script de la pagina.
   * Sin `withCredentials` el navegador no la envia a otro origen, y toda peticion
   * recibiria 401 sin ninguna pista del motivo.
   */
  withCredentials: true,
});

/**
 * Trazabilidad de cada petición.
 *
 * AQUÍ YA NO SE PONE NINGUNA IDENTIDAD. Hasta la etapa 4 este interceptor enviaba la
 * cabecera "x-usuario-prueba" con el perfil simulado, y ese era el único modo de que el
 * servidor supiera quién pedía. Ahora la identidad viaja sola, en la cookie de sesión
 * que emitió el backend al canjear el código de Auth central, y que este código no
 * puede leer ni escribir. Ver docs/PLAN_INTEGRACION_AUTH.md §6.2.
 */
httpClient.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);

  // El identificador de correlación enlaza la petición completa, desde el clic del
  // usuario hasta la consulta a la base. Ver docs/FASE4-arquitectura-tecnica.md §12.3.
  if (!headers.has(CORRELATION_ID_HEADER)) {
    headers.set(CORRELATION_ID_HEADER, createCorrelationId());
  }

  // Uno por petición, a diferencia del de correlación, que puede abarcar varias.
  if (!headers.has(REQUEST_ID_HEADER)) {
    headers.set(REQUEST_ID_HEADER, createCorrelationId());
  }

  config.headers = headers;
  return config;
});

/**
 * Ruta de los tres endpoints de sesión, exenta del tratamiento global del 401.
 *
 * Se declara aquí y no se importa del servicio a propósito: importarla crearía un ciclo,
 * porque el servicio importa este cliente. Es una sola cadena.
 */
const RUTA_SESION = "/auth/session";

/** Evento con el que se anuncia que la sesión murió. Lo escucha SesionProvider. */
export const SESION_EXPIRADA = "sesion-expirada";

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalizado = normalizeHttpClientError(error);
    const ruta = axios.isAxiosError(error) ? (error.config?.url ?? "") : "";

    /**
     * UN 401 EN UNA API PRIVADA SIGNIFICA QUE LA SESIÓN MURIÓ, y hay que sacar al
     * usuario del área privada.
     *
     * SE ANUNCIA CON UN EVENTO EN LUGAR DE NAVEGAR DESDE AQUÍ. `httpClient` es un
     * módulo: no conoce el enrutador ni el contexto de React, y llamar a
     * `window.location` desde un interceptor cortaría cualquier flujo a medias sin que
     * la aplicación pudiera limpiar su estado. Quien decide qué hacer es quien escucha.
     *
     * LOS TRES ENDPOINTS DE SESIÓN QUEDAN FUERA, y hace falta: su 401 es la respuesta
     * normal de quien todavía no ha entrado. Tratarlo como expiración produciría un
     * bucle de redirecciones justo en el arranque, que es el fallo que la guía de
     * integración advierte que hay que evitar.
     */
    if (normalizado.status === 401 && !ruta.startsWith(RUTA_SESION)) {
      window.dispatchEvent(new Event(SESION_EXPIRADA));
    }

    return Promise.reject(normalizado);
  },
);

export default httpClient;