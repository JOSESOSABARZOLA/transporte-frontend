/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: cobertura.service.ts
 * Responsabilidad: Consumir la matriz mensual de turnos de Instrucción y sus escrituras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * SOLO PARA INSTRUCCIÓN, y el servidor lo hace cumplir: quien no gestiona esa dirección recibe
 * 404 en todos estos endpoints (desde el 2026-10-05; antes la matriz llegaba vacía).
 */

import httpClient from "../api/httpClient";
import type {
  CambioCelda,
  EstadoTurno,
  MatrizCobertura,
  PropuestaRotacion,
  ResultadoLote,
  ResultadoPublicar,
} from "../interfaces/Cobertura";
import type { DenominacionInstruccion } from "../interfaces/Personal";

const BASE = "/administracion/personal";

/** `GET …/cobertura?mes=AAAA-MM`. La matriz del mes. */
const obtenerMatriz = async (mes: string): Promise<MatrizCobertura> => {
  const { data } = await httpClient.get<MatrizCobertura>(`${BASE}/cobertura`, {
    params: { mes },
  });
  return data;
};

/** `PUT …/cobertura`. Fija el turno de una persona en un día; `null` limpia la celda. */
const editarCelda = async (
  funcionarioId: number,
  fecha: string,
  estado: EstadoTurno | null,
): Promise<void> => {
  await httpClient.put(`${BASE}/cobertura`, { funcionarioId, fecha, estado });
};

/** `PUT …/cobertura/lote`. Varias celdas en una transacción; devuelve lo omitido y por qué. */
const aplicarLote = async (celdas: CambioCelda[]): Promise<ResultadoLote> => {
  const { data } = await httpClient.put<ResultadoLote>(
    `${BASE}/cobertura/lote`,
    { celdas },
  );
  return data;
};

/** `POST …/cobertura/propuesta-rotacion`. Propone turnos para las celdas vacías; no escribe. */
const proponerRotacion = async (
  mes: string,
  funcionarioIds?: number[],
): Promise<PropuestaRotacion> => {
  const { data } = await httpClient.post<PropuestaRotacion>(
    `${BASE}/cobertura/propuesta-rotacion`,
    { mes, funcionarioIds },
  );
  return data;
};

/** `POST …/cobertura/publicar`. Marca el mes como publicado (informativo). */
const publicar = async (mes: string): Promise<ResultadoPublicar> => {
  const { data } = await httpClient.post<ResultadoPublicar>(
    `${BASE}/cobertura/publicar`,
    { mes },
  );
  return data;
};

/** `GET …/cobertura/exportar?mes=AAAA-MM`. El Excel del mes, como `blob`. */
const exportar = async (mes: string): Promise<Blob> => {
  const { data } = await httpClient.get<Blob>(`${BASE}/cobertura/exportar`, {
    params: { mes },
    responseType: "blob",
  });
  return data;
};

/** Lo que puede cambiar: solo lo que viaja se toca; lo omitido se conserva. */
export interface DatosInstruccion {
  zonalId?: number | null;
  denominacion?: DenominacionInstruccion | null;
}

/** `PUT …/:id/instruccion`. Fija la zona y/o denominación de la persona. */
const fijarDatosInstruccion = async (
  funcionarioId: number,
  datos: DatosInstruccion,
): Promise<void> => {
  await httpClient.put(`${BASE}/${funcionarioId}/instruccion`, datos);
};

export const CoberturaService = {
  obtenerMatriz,
  editarCelda,
  aplicarLote,
  proponerRotacion,
  publicar,
  exportar,
  fijarDatosInstruccion,
};
