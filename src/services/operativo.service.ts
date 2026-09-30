/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos
 * Archivo: operativo.service.ts
 * Responsabilidad: Consumir el registro, la edición y la asignación de personal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LA LISTA LLEGA YA FILTRADA POR EL SERVIDOR (PER-02). Cada perfil recibe solo sus
 * filas: aquí no se recorta nada, porque un filtro de interfaz se desactiva quitando una
 * línea y el aislamiento de la información es el requisito que originó el encargo.
 */

import httpClient from "../api/httpClient";
import type {
  ActualizarOperativo,
  AsignarPersonal,
  CrearAdicional,
  CrearOperativo,
  FiltroOperativos,
  Operativo,
  RespuestaPaginada,
  ResultadoBaja,
} from "../interfaces/Operativo";

/** `GET /operativos`. Paginado; el servidor decide qué filas ve cada rol. */
const consultar = async (
  filtro: FiltroOperativos = {},
): Promise<RespuestaPaginada<Operativo>> => {
  const { data } = await httpClient.get<RespuestaPaginada<Operativo>>(
    "/operativos",
    { params: filtro },
  );
  return data;
};

const obtener = async (id: number): Promise<Operativo> => {
  const { data } = await httpClient.get<Operativo>(`/operativos/${id}`);
  return data;
};

/** `POST /operativos`. El identificador y el secuencial los pone el servidor. */
const registrar = async (operativo: CrearOperativo): Promise<Operativo> => {
  const { data } = await httpClient.post<Operativo>("/operativos", operativo);
  return data;
};

/**
 * `POST /operativos/:id/adicional`. 2026-08-20.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA ÚNICA ESCRITURA DEL SISTEMA QUE FUNCIONA CON LA VENTANA DE CARGA CERRADA, y por
 * eso vive en un endpoint propio del servidor, con su propio controlador y sin la guarda
 * de ventana. Un adicional se dispone por urgencia el mismo día en que se ejecuta, cuando
 * la carga del departamento ya cerró: por el camino ordinario sería imposible de crear
 * justo cuando hace falta.
 *
 * LO DEMÁS SE COMPRUEBA IGUAL. El rol, la propiedad del formulario y el estado del cuadro
 * siguen decidiéndose en el servidor. Y queda constancia: la traza de auditoría anota si
 * la ventana estaba abierta o cerrada al crearlo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const crearAdicional = async (
  origenId: number,
  adicional: CrearAdicional,
): Promise<Operativo> => {
  const { data } = await httpClient.post<Operativo>(
    `/operativos/${origenId}/adicional`,
    adicional,
  );
  return data;
};

/** `PATCH /operativos/:id`. `version` sostiene el bloqueo optimista. */
const editar = async (
  id: number,
  cambios: ActualizarOperativo,
): Promise<Operativo> => {
  const { data } = await httpClient.patch<Operativo>(
    `/operativos/${id}`,
    cambios,
  );
  return data;
};

/** `DELETE /operativos/:id?version=`. La baja es lógica (PV-10). */
/**
 * `DELETE /operativos/:id`. PV-10.
 *
 * `eliminado` distingue las dos bajas: **borrado real** cuando el operativo no tiene
 * órdenes emitidas, y baja lógica cuando sí las tiene, porque `fk_orden_operativo` es
 * `RESTRICT` y una orden ya comunicada no puede quedarse sin origen.
 */
const retirar = async (
  id: number,
  version: number,
): Promise<ResultadoBaja> => {
  const { data } = await httpClient.delete<ResultadoBaja>(`/operativos/${id}`, {
    params: { version },
  });
  return data;
};

/** `POST /operativos/:id/personal`. Devuelve el operativo con sus alertas al día. */
const asignarPersonal = async (
  id: number,
  asignacion: AsignarPersonal,
): Promise<Operativo> => {
  const { data } = await httpClient.post<Operativo>(
    `/operativos/${id}/personal`,
    asignacion,
  );
  return data;
};

/**
 * `PATCH /operativos/patrulla/:grupoRegistro`. 2026-09-18.
 *
 * Edita los campos GENERALES de toda una patrulla (Form 5/6) de una vez: se aplican a TODOS sus
 * códigos (inspectores + instrucción). Solo el registrante (DMIP) puede; el servidor lo comprueba.
 * Sin `version` ni horario (el horario es por persona). Devuelve los operativos ya actualizados.
 */
const editarPatrulla = async (
  grupoRegistro: string,
  cambios: Omit<ActualizarOperativo, "version">,
): Promise<Operativo[]> => {
  const { data } = await httpClient.patch<Operativo[]>(
    `/operativos/patrulla/${grupoRegistro}`,
    cambios,
  );
  return data;
};

/**
 * `PUT /operativos/:id/personal`. 2026-09-18.
 *
 * Reemplaza a la persona de un operativo de una sola persona (patrulla) conservando el MISMO
 * código y su horario. El servidor exige que la persona nueva sea de la misma área que la saliente.
 */
const reemplazarPersonal = async (
  id: number,
  funcionarioId: number,
): Promise<Operativo> => {
  const { data } = await httpClient.put<Operativo>(
    `/operativos/${id}/personal`,
    { funcionarioId },
  );
  return data;
};

/** `DELETE /operativos/:id/personal/:funcionarioId`. */
const retirarPersonal = async (
  id: number,
  funcionarioId: number,
): Promise<Operativo> => {
  const { data } = await httpClient.delete<Operativo>(
    `/operativos/${id}/personal/${funcionarioId}`,
  );
  return data;
};

/**
 * `PATCH /operativos/:id/personal/:funcionarioId`. Cambia el turno de una persona ya
 * asignada (RN-66). El servidor re-deriva la ventana del operativo y devuelve el operativo
 * con sus alertas al día. Las dos horas son obligatorias.
 */
const actualizarTurnoPersonal = async (
  id: number,
  funcionarioId: number,
  turno: { horaInicio: string; horaFin: string },
): Promise<Operativo> => {
  const { data } = await httpClient.patch<Operativo>(
    `/operativos/${id}/personal/${funcionarioId}`,
    turno,
  );
  return data;
};

export const OperativoService = {
  consultar,
  obtener,
  registrar,
  crearAdicional,
  editar,
  editarPatrulla,
  retirar,
  asignarPersonal,
  reemplazarPersonal,
  retirarPersonal,
  actualizarTurnoPersonal,
};
