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
  DatosGeneralesPlantilla,
  DatosMemorando,
  EditablesMemorando,
  Matriz,
  OrdenServicio,
  Plantilla,
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

/**
 * `GET /plantilla-orden`. La plantilla compartida: apartados + datos generales del Director
 * (2026-10-02). Solo Dirección.
 */
const obtenerPlantilla = async (): Promise<Plantilla> => {
  const { data } = await httpClient.get<Plantilla>("/plantilla-orden");
  return data;
};

/**
 * `PUT /plantilla-orden`. Guarda la plantilla (apartados + datos generales); se aplica a todas las
 * órdenes que se emitan después.
 */
const guardarPlantilla = async (
  apartados: Apartado[],
  datosGenerales: DatosGeneralesPlantilla,
): Promise<Plantilla> => {
  const { data } = await httpClient.put<Plantilla>("/plantilla-orden", {
    apartados,
    datosGenerales,
  });
  return data;
};

/**
 * `POST /plantilla-orden/previsualizar`. El PDF de la plantilla EN EDICIÓN (aún sin guardar), con
 * los datos generales en edición y datos de muestra, para la vista previa real del editor. Solo
 * Dirección.
 */
const previsualizarPlantilla = async (
  apartados: Apartado[],
  datosGenerales: DatosGeneralesPlantilla,
  /** Cancela la petición si llega una más nueva (el editor aborta la anterior). */
  signal?: AbortSignal,
): Promise<Blob> => {
  const { data } = await httpClient.post<Blob>(
    "/plantilla-orden/previsualizar",
    // La plantilla EN BORRADOR (sin guardar). La vista previa es siempre genérica (D17): los datos
    // de la orden salen como marcadores grises; ya no hay `codigo` de una persona real.
    { apartados, datosGenerales },
    { responseType: "blob", signal },
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
