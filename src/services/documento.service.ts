/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Documentos
 * Archivo: documento.service.ts
 * Responsabilidad: Consumir la matriz consolidada y las órdenes de servicio.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * `consultarMias` NO RECIBE NINGÚN IDENTIFICADOR, y esa ausencia es la garantía: el
 * servidor resuelve de quién son las órdenes a partir de la identidad. Si esta función
 * aceptara un parámetro, existiría el camino para pedir las de otra persona —y RN-49
 * dice que cada funcionario recibe únicamente la suya—.
 *
 * LOS PDF SE PIDEN COMO `blob`. `httpClient` responde JSON por defecto; sin
 * `responseType` el binario llegaría convertido a texto y el archivo quedaría corrupto.
 */

import httpClient from "../api/httpClient";
import type { Matriz, OrdenServicio } from "../interfaces/Documento";

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

/** `GET /ordenes-servicio/mias`. Sin parámetros: el servidor sabe quién pregunta. */
const consultarMias = async (desde?: string): Promise<OrdenServicio[]> => {
  const { data } = await httpClient.get<OrdenServicio[]>(
    "/ordenes-servicio/mias",
    { params: desde ? { desde } : undefined },
  );
  return data;
};

/** `GET /ordenes-servicio/:codigo/documento`. Solo sobre las propias. */
const descargarOrden = async (codigo: string): Promise<Blob> => {
  const { data } = await httpClient.get<Blob>(
    `/ordenes-servicio/${codigo}/documento`,
    { responseType: "blob" },
  );
  return data;
};

export const DocumentoService = {
  consultarMatriz,
  exportarMatriz,
  emitirOrdenes,
  consultarOrdenesDeOperativo,
  consultarMias,
  descargarOrden,
};
