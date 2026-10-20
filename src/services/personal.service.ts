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
  AusenciaDelMaestro,
  BajaFuncionario,
  CrearFuncionario,
  Disponibilidad,
  Funcionario,
  OperativoDeLaPersona,
  PersonaElegible,
  RegistrarAusencia,
} from "../interfaces/Personal";
import type { RespuestaDirectorio } from "../interfaces/DirectorioAuth";
import type { AreaPersonal } from "../interfaces/Formulario.ts";
import type { RolDepartamental } from "../config/env.ts";

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
 * `GET /administracion/personal`. El Administrador y los tres roles departamentales.
 *
 * **NO SE LE MANDA `direccion`, Y ES DELIBERADO.** Desde PER-09 el servidor acota el
 * maestro a la dirección de quien pregunta, derivada de su sesión. Enviarla desde aquí no
 * añadiría nada —el servidor descarta el parámetro a los roles departamentales— y daría
 * a entender que la restricción vive en el navegador, que es justo lo que se corrigió: un
 * filtro de cliente no restringe, porque la respuesta de red ya trae lo que oculta.
 *
 * `incluirInactivos` sí es del servidor porque cambia **qué filas existen**, no cómo se
 * ven: P-07 pide siempre las inactivas para mostrarlas atenuadas, que es el caso 4 del plan.
 */
const listar = async (incluirInactivos = false): Promise<Funcionario[]> => {
  const { data } = await httpClient.get<Funcionario[]>(
    "/administracion/personal",
    { params: incluirInactivos ? { incluirInactivos: "true" } : undefined },
  );
  return data;
};

/**
 * `GET /administracion/personal/direcciones`. Las que quien pregunta puede gestionar.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO SE DEDUCE EN EL NAVEGADOR, Y ESA ES LA DECISION. 2026-09-01.
 *
 * P-07 lo deducia con `rolCodes.includes(direccion)`, que acierta para un rol
 * departamental —el rol **es** la direccion— y devuelve **vacio** para un administrador,
 * que no es ninguna: administra unas cuantas. El reparto vive en `t_rol_direccion`.
 *
 * Copiarlo aqui crearia una segunda fuente que se separaria de la primera el dia que se
 * reorganice un departamento, y la pantalla ofreceria direcciones que el servidor
 * rechaza con 403 al guardar. Es el mismo error que el filtro de cliente que PER-09
 * corrigio: lo que decide tiene que estar donde se decide.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const direccionesQueGestiona = async (): Promise<RolDepartamental[]> => {
  const { data } = await httpClient.get<RolDepartamental[]>(
    "/administracion/personal/direcciones",
  );
  return data;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS ÁREAS QUE ESTA PERSONA PUEDE DAR DE ALTA. 2026-09-01, tarde.
 *
 * Es lo que acota el desplegable «Área» del formulario de ficha. El negocio repartió el
 * maestro así: el administrador de la DMIP crea Unidad de Operativos, Inspector General e
 * Inspector Técnico; Personal de Instrucción es solo del DMIT.
 *
 * SE PREGUNTA, NO SE DEDUCE, por el mismo motivo que las direcciones: la correspondencia
 * área → dirección y el reparto viven los dos en el servidor. Deducirlo aquí ofrecería
 * áreas que el servidor rechaza con 403 al guardar, y ése es el defecto que este módulo
 * lleva evitando desde que la administración se repartió.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const areasQueGestiona = async (): Promise<AreaPersonal[]> => {
  const { data } = await httpClient.get<AreaPersonal[]>(
    "/administracion/personal/areas",
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
 * `DELETE /administracion/personal/:id`. La baja es **lógica** y desde 2026-09-30 exige un MOTIVO
 * (código + detalle solo con «OTRO»), que viaja en el CUERPO del `DELETE` (`data`, como admite
 * axios). La respuesta trae cuántos operativos históricos conserva la persona, para que el
 * administrador vea que no está borrando nada.
 */
const desactivar = async (
  id: number,
  baja: BajaFuncionario,
): Promise<{ mensaje: string; operativosHistoricos: number }> => {
  const { data } = await httpClient.delete<{
    mensaje: string;
    operativosHistoricos: number;
  }>(`/administracion/personal/${id}`, { data: baja });
  return data;
};

/**
 * `POST /administracion/personal/:id/reactivar`. Reingreso: la ficha vuelve al maestro.
 *
 * Es la vuelta de la baja. No borra ni pide confirmación —es reversible—; el servidor
 * comprueba que quien reactiva alcanza la dirección de la ficha, igual que en la baja.
 */
const reactivar = async (id: number): Promise<Funcionario> => {
  const { data } = await httpClient.post<Funcionario>(
    `/administracion/personal/${id}/reactivar`,
  );
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

/**
 * `GET /administracion/personal/ausencias?desde=` (2026-10-08). Las ausencias EN CURSO y PRÓXIMAS
 * de todo el maestro al alcance, en UNA consulta y sin motivo. Sustituye a las N peticiones por fila
 * con las que la lista pintaba la columna «Estado». Sin `desde`, el servidor usa hoy en Quito.
 */
const listarAusenciasDelMaestro = async (
  desde?: string,
): Promise<AusenciaDelMaestro[]> => {
  const { data } = await httpClient.get<AusenciaDelMaestro[]>(
    "/administracion/personal/ausencias",
    { params: desde ? { desde } : undefined },
  );
  return data;
};

/**
 * `GET /administracion/personal/:id/operativos?desde&hasta` (2026-10-08). Los operativos activos de
 * la persona en ese rango (extremos incluidos), para avisar al registrar una ausencia. La ausencia
 * no los retira y el servidor no notifica a nadie.
 */
const operativosDe = async (
  id: number,
  desde: string,
  hasta: string,
): Promise<OperativoDeLaPersona[]> => {
  const { data } = await httpClient.get<OperativoDeLaPersona[]>(
    `/administracion/personal/${id}/operativos`,
    { params: { desde, hasta } },
  );
  return data;
};

export const PersonalService = {
  consultarElegibles,
  consultarDirectorio,
  listar,
  direccionesQueGestiona,
  areasQueGestiona,
  obtener,
  crear,
  actualizar,
  desactivar,
  reactivar,
  listarAusencias,
  listarAusenciasDelMaestro,
  operativosDe,
  registrarAusencia,
  retirarAusencia,
};
