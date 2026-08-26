/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: personal.service.ts
 * Responsabilidad: Consumir el maestro de personal y la consulta de elegibles.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * EL DESPLEGABLE DE PERSONAL LLEGA CON SU VEREDICTO. `GET /personal/elegible` devuelve a
 * cada persona con `elegible` y, si no lo es, **el motivo redactado**. La pantalla la
 * muestra deshabilitada con la explicación en lugar de esconderla: una persona que
 * desaparece de la lista sin decir por qué es lo que obliga a preguntar por teléfono, y
 * el teléfono es el canal que este sistema existe para reemplazar.
 */

import httpClient from "../api/httpClient";
import type {
  ActualizarFuncionario,
  CrearFuncionario,
  Disponibilidad,
  Funcionario,
  PersonaElegible,
  RegistrarAusencia,
} from "../interfaces/Personal";
import type { RespuestaDirectorio } from "../interfaces/DirectorioAuth";

export interface ConsultaElegibles {
  formulario: string;
  inicio: string;
  fin?: string;
  horaInicio?: string;
  horaFin?: string;
}

/**
 * `GET /personal/elegible`. Las horas van juntas o no van.
 *
 * Con una sola no se puede formar el rango, y el servidor lo rechaza: aplicar media
 * regla de descanso sería peor que no aplicarla.
 */
const consultarElegibles = async (
  consulta: ConsultaElegibles,
): Promise<PersonaElegible[]> => {
  const { data } = await httpClient.get<PersonaElegible[]>("/personal/elegible", {
    params: consulta,
  });
  return data;
};

/**
 * `GET /administracion/personal`. Solo el ADMINISTRADOR.
 *
 * `incluirInactivos` es del servidor porque cambia **qué filas existen**, no cómo se ven:
 * P-07 pide siempre las inactivas para mostrarlas atenuadas, que es el caso 4 del plan.
 */
const listar = async (incluirInactivos = false): Promise<Funcionario[]> => {
  const { data } = await httpClient.get<Funcionario[]>(
    "/administracion/personal",
    { params: incluirInactivos ? { incluirInactivos: "true" } : undefined },
  );
  return data;
};

const crear = async (funcionario: CrearFuncionario): Promise<Funcionario> => {
  const { data } = await httpClient.post<Funcionario>(
    "/administracion/personal",
    funcionario,
  );
  return data;
};

const obtener = async (id: number): Promise<Funcionario> => {
  const { data } = await httpClient.get<Funcionario>(
    `/administracion/personal/${id}`,
  );
  return data;
};

/**
 * `PUT /administracion/personal/:id`. Es un `PUT` con cuerpo parcial, no un `PATCH`.
 *
 * Así lo expone el controlador: se modifica lo que llega y se conserva lo demás. Enviar
 * la ficha entera sobrescribiría con valores viejos lo que otro administrador acabara de
 * corregir.
 */
const actualizar = async (
  id: number,
  cambios: ActualizarFuncionario,
): Promise<Funcionario> => {
  const { data } = await httpClient.put<Funcionario>(
    `/administracion/personal/${id}`,
    cambios,
  );
  return data;
};

/**
 * `DELETE /administracion/personal/:id`. La baja es **lógica**.
 *
 * La respuesta trae cuántos operativos históricos conserva la persona, para que el
 * administrador vea que no está borrando nada.
 */
const desactivar = async (
  id: number,
): Promise<{ mensaje: string; operativosHistoricos: number }> => {
  const { data } = await httpClient.delete<{
    mensaje: string;
    operativosHistoricos: number;
  }>(`/administracion/personal/${id}`);
  return data;
};

/**
 * `GET /administracion/directorio`. Solo el ADMINISTRADOR.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL PERSONAL DE LA INSTITUCIÓN SEGÚN AUTH, cruzado con nuestras fichas.
 *
 * Existe para dejar de teclear el maestro —PV-02, bloqueante del negocio—. El servidor
 * consulta a Auth con el token de la sesión de quien pregunta: **Auth no tiene token de
 * servicio**, así que la credencial de una persona es la única que hay.
 *
 * Puede fallar por motivos que no son avería: sesión anterior al 2026-08-21 sin token de
 * Auth, Auth caído, o el ambiente sin `AUTH_API_URL`. En los tres casos el servidor
 * redacta el mensaje y la pantalla lo muestra tal cual (regla 7).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO LANZA CUANDO AUTH NO ESTÁ. Desde el 2026-08-24 el servidor responde
 * `{ disponible, motivo, personas }` en lugar de un 503: la indisponibilidad de Auth es
 * un **estado**, no un error de esta petición. Importa porque el directorio dejó de ser
 * una pestaña de consulta y es el primer paso del alta — con una excepción, la ventana
 * tendría que distinguir por el `catch` entre «no se pudo preguntar» y «no hay nadie».
 *
 * Un fallo de nuestro backend **sí** sigue lanzando, y debe.
 */
const consultarDirectorio = async (): Promise<RespuestaDirectorio> => {
  const { data } = await httpClient.get<RespuestaDirectorio>(
    "/administracion/directorio",
  );
  return data;
};

/** `GET /administracion/personal/:id/disponibilidad`. */
const listarAusencias = async (id: number): Promise<Disponibilidad[]> => {
  const { data } = await httpClient.get<Disponibilidad[]>(
    `/administracion/personal/${id}/disponibilidad`,
  );
  return data;
};

const registrarAusencia = async (
  id: number,
  ausencia: RegistrarAusencia,
): Promise<Disponibilidad> => {
  const { data } = await httpClient.post<Disponibilidad>(
    `/administracion/personal/${id}/disponibilidad`,
    ausencia,
  );
  return data;
};

/** `DELETE /administracion/personal/:id/disponibilidad/:periodoId`. */
const retirarAusencia = async (
  id: number,
  periodoId: number,
): Promise<void> => {
  await httpClient.delete(
    `/administracion/personal/${id}/disponibilidad/${periodoId}`,
  );
};

export const PersonalService = {
  consultarElegibles,
  consultarDirectorio,
  listar,
  obtener,
  crear,
  actualizar,
  desactivar,
  listarAusencias,
  registrarAusencia,
  retirarAusencia,
};
