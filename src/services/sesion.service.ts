/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Identidad y acceso
 * Archivo: sesion.service.ts
 * Responsabilidad: Consumir los tres endpoints de sesión con Auth central.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-18
 *
 * Los tres del contrato compartido, `INTEGRACION_AUTH_CENTRAL_FRONTEND.md`. Los sirve
 * NUESTRO backend, no Auth central: el frontend de un módulo nunca habla directamente
 * con Auth. Lo único que recibe de Auth es el `code` en la URL de regreso.
 *
 * NINGUNA DE ESTAS FUNCIONES DEVUELVE UN TOKEN, ni podría: viaja en una cookie
 * `HttpOnly` que este código no puede leer. Es el fondo del patrón.
 *
 * SUS ERRORES NO SE TRADUCEN AQUÍ. Cada llamada los maneja dentro de su propio flujo:
 * un 401 de `obtenerSesion` es la respuesta normal de quien todavía no ha entrado, no
 * una incidencia que haya que anunciar.
 */

import httpClient from "../api/httpClient";
import { env, type RolDepartamental } from "../config/env";

/** Perfil mínimo que el backend devuelve al navegador. */
export interface PerfilSesion {
  username: string;
  displayName: string;
  /**
   * Ampliación del contrato compartido, que solo pide `username` y `displayName`.
   *
   * Hace falta porque **este frontend monta las pantallas según el rol** —regla de
   * interfaz nº 4: un perfil no autorizado no tiene el componente en memoria— y sin el
   * rol no puede decidir qué construir. Ver PLAN_INTEGRACION_AUTH.md §4.3.
   */
  /**
   * TODOS los roles de la persona. Plural desde el 2026-08-19.
   *
   * Auth central admite asignar varios roles de Transporte a la misma persona, y el
   * negocio decidió que valen todos a la vez: se ve la UNIÓN de lo que cada uno permite.
   */
  rolCodes: RolDepartamental[];
}

interface RespuestaSesion {
  success: true;
  data: { user: PerfilSesion };
  correlationId: string;
  requestId: string;
}

/** Rutas exentas del tratamiento global del 401. Ver el interceptor de httpClient. */
export const RUTAS_DE_SESION = "/auth/session";

/**
 * Canjea el código de un solo uso que entregó Auth central.
 *
 * SE LLAMA UNA SOLA VEZ POR INGRESO. El código se consume al usarlo: reintentarlo
 * devuelve «caducó o ya fue utilizado», que taparía la causa real de un fallo de red.
 */
export const canjearCodigo = async (code: string): Promise<PerfilSesion> => {
  const { data } = await httpClient.post<RespuestaSesion>(
    `${RUTAS_DE_SESION}/exchange`,
    { code },
  );
  return data.data.user;
};

/**
 * Devuelve el perfil si la cookie corresponde a una sesión viva.
 *
 * Responde `401` cuando no la hay, y **eso es una respuesta, no un error**: es la
 * pregunta que la aplicación hace al arrancar para saber si entra o va al portal.
 */
export const obtenerSesion = async (): Promise<PerfilSesion | null> => {
  try {
    const { data } = await httpClient.get<RespuestaSesion>(RUTAS_DE_SESION);
    return data.data.user;
  } catch {
    return null;
  }
};

/**
 * Cierra la sesión de ESTE módulo.
 *
 * No lanza nunca: si la petición falla, el estado visual se limpia igual y se navega al
 * portal. Dejar al usuario dentro porque el cierre no respondió sería lo contrario de
 * lo que pidió.
 *
 * NO CIERRA LA SESIÓN DE AUTH CENTRAL, que sigue viva en su servidor: desde el portal
 * se puede volver a entrar sin credenciales. Auth no publica endpoint de revocación y
 * la guía prohíbe improvisarlo. Ver PLAN_INTEGRACION_AUTH.md §10.
 */
export const cerrarSesion = async (): Promise<void> => {
  try {
    await httpClient.post(`${RUTAS_DE_SESION}/logout`);
  } catch {
    // Silencio deliberado: el cierre local ocurre igual.
  }
};

/**
 * URL del portal con el callback de este módulo y su código.
 *
 * SE ENVÍAN `redirectUri` Y `module` AUNQUE EL PORTAL NO LOS LEA HOY. Está comprobado
 * —su paquete no contiene ninguna referencia a `redirectUri`— y el regreso lo resuelve
 * con el `path` del módulo en su propia base. Se envían igual por dos motivos: los pide
 * `INTEGRACION_AUTH_CENTRAL_FRONTEND.md` §2, y el módulo de Instrucción los envía, así
 * que omitirlos dejaría una diferencia entre módulos hermanos que alguien tendría que
 * explicar. Si algún día el portal empieza a leerlos, esto ya funciona.
 */
export const urlDelPortal = (): string => {
  const regreso = `${window.location.origin}/auth/callback`;
  return (
    `${env.portalAuthUrl}` +
    `?redirectUri=${encodeURIComponent(regreso)}` +
    `&module=${encodeURIComponent(env.moduleCode)}`
  );
};
