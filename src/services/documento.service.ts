/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Documentos
 * Archivo: documento.service.ts
 * Responsabilidad: Consumir la matriz consolidada y las órdenes de servicio.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LOS PDF SE PIDEN COMO `blob`. `httpClient` responde JSON por defecto; sin
 * `responseType` el binario llegaría convertido a texto y el archivo quedaría corrupto.
 *
 * SIN AUTOSERVICIO DEL FUNCIONARIO desde el 2026-09-10: al retirarse el rol FUNCIONARIO se
 * eliminó P-06 «Mis órdenes» y con ella `consultarMias` y `descargarOrden`. Las órdenes se
 * siguen emitiendo desde la Dirección (P-05).
 *
 * LA VISTA DEL PDF VUELVE, PERO PARA LA DIRECCIÓN (2026-09-15). Desde P-05 se puede ver el
 * PDF de una orden en formato **memorando** (`verOrdenMemorando`): enumera los operativos
 * de esa persona en su jornada, sigue siendo solo de ELLA (RN-51). No es autoservicio del
 * funcionario: la genera y la revisa quien emite.
 */

import httpClient from "../api/httpClient";
import type {
  Apartado,
  DatosMemorando,
  EditablesMemorando,
  Matriz,
  OrdenServicio,
} from "../interfaces/Documento";

/** `GET /matriz/:fecha`. Solo la Dirección (RN-48). */
const consultarMatriz = async (fecha: string): Promise<Matriz> => {
  const { data } = await httpClient.get<Matriz>(`/matriz/${fecha}`);
  return data;
};

/** `GET /matriz/:fecha/exportar`. El documento formal, para archivar y firmar. */
const exportarMatriz = async (fecha: string): Promise<Blob> => {
  const { data } = await httpClient.get<Blob>(`/matriz/${fecha}/exportar`, {
    responseType: "blob",
  });
  return data;
};

/** `POST /operativos/:id/ordenes-servicio`. Una orden por funcionario asignado. */
const emitirOrdenes = async (
  operativoId: number,
): Promise<OrdenServicio[]> => {
  const { data } = await httpClient.post<OrdenServicio[]>(
    `/operativos/${operativoId}/ordenes-servicio`,
  );
  return data;
};

/** `GET /operativos/:id/ordenes-servicio`. Lo ya emitido, para P-05. */
const consultarOrdenesDeOperativo = async (
  operativoId: number,
): Promise<OrdenServicio[]> => {
  const { data } = await httpClient.get<OrdenServicio[]>(
    `/operativos/${operativoId}/ordenes-servicio`,
  );
  return data;
};

/**
 * `GET /ordenes-servicio/:codigo/memorando`. El PDF de la orden en formato memorando, para
 * que la Dirección lo vea desde P-05. Solo DIRECTOR (lo hace cumplir el servidor).
 */
const verOrdenMemorando = async (codigo: string): Promise<Blob> => {
  const { data } = await httpClient.get<Blob>(
    `/ordenes-servicio/${codigo}/memorando`,
    { responseType: "blob" },
  );
  return data;
};

/** `GET …/memorando/datos`. Lo que el editor precarga (sistema + valores por omisión). */
const obtenerDatosMemorando = async (
  codigo: string,
): Promise<DatosMemorando> => {
  const { data } = await httpClient.get<DatosMemorando>(
    `/ordenes-servicio/${codigo}/memorando/datos`,
  );
  return data;
};

/** `POST …/memorando`. El PDF con lo que la Dirección completó en el editor. */
const generarMemorandoEditado = async (
  codigo: string,
  editables: EditablesMemorando,
): Promise<Blob> => {
  const { data } = await httpClient.post<Blob>(
    `/ordenes-servicio/${codigo}/memorando`,
    editables,
    { responseType: "blob" },
  );
  return data;
};

/** `GET /plantilla-orden`. La plantilla compartida (apartados). Solo Dirección. */
const obtenerPlantilla = async (): Promise<Apartado[]> => {
  const { data } = await httpClient.get<Apartado[]>("/plantilla-orden");
  return data;
};

/** `PUT /plantilla-orden`. Guarda la plantilla; se aplica a todas las órdenes futuras. */
const guardarPlantilla = async (apartados: Apartado[]): Promise<Apartado[]> => {
  const { data } = await httpClient.put<Apartado[]>("/plantilla-orden", {
    apartados,
  });
  return data;
};

/**
 * `POST /plantilla-orden/previsualizar`. El PDF de la plantilla EN EDICIÓN (aún sin guardar), con
 * datos de muestra, para la vista previa real del editor de plantilla. Solo Dirección.
 */
const previsualizarPlantilla = async (
  apartados: Apartado[],
): Promise<Blob> => {
  const { data } = await httpClient.post<Blob>(
    "/plantilla-orden/previsualizar",
    { apartados },
    { responseType: "blob" },
  );
  return data;
};

export const DocumentoService = {
  consultarMatriz,
  exportarMatriz,
  emitirOrdenes,
  consultarOrdenesDeOperativo,
  verOrdenMemorando,
  obtenerDatosMemorando,
  generarMemorandoEditado,
  obtenerPlantilla,
  guardarPlantilla,
  previsualizarPlantilla,
};
