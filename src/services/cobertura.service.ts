/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: cobertura.service.ts
 * Responsabilidad: Consumir la matriz mensual de turnos de Instrucción y sus escrituras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * SOLO PARA INSTRUCCIÓN, y el servidor lo hace cumplir: quien no gestiona esa dirección
 * recibe la matriz vacía y no puede escribir en ella (mismo acote PER-09 que el maestro).
 */

import httpClient from "../api/httpClient";
import type { EstadoTurno, MatrizCobertura } from "../interfaces/Cobertura";
import type { DenominacionInstruccion } from "../interfaces/Personal";

/** `GET /administracion/personal/cobertura?mes=AAAA-MM`. La matriz del mes. */
const obtenerMatriz = async (mes: string): Promise<MatrizCobertura> => {
  const { data } = await httpClient.get<MatrizCobertura>(
    "/administracion/personal/cobertura",
    { params: { mes } },
  );
  return data;
};

/** `PUT /administracion/personal/cobertura`. Fija el turno de una persona en un día. */
const editarCelda = async (
  funcionarioId: number,
  fecha: string,
  estado: EstadoTurno,
): Promise<void> => {
  await httpClient.put("/administracion/personal/cobertura", {
    funcionarioId,
    fecha,
    estado,
  });
};

/** Lo que puede cambiar: solo lo que viaja se toca; lo omitido se conserva. */
export interface DatosInstruccion {
  zonalId?: number | null;
  denominacion?: DenominacionInstruccion | null;
}

/** `PUT /administracion/personal/:id/instruccion`. Fija la zona y/o denominación de la persona. */
const fijarDatosInstruccion = async (
  funcionarioId: number,
  datos: DatosInstruccion,
): Promise<void> => {
  await httpClient.put(
    `/administracion/personal/${funcionarioId}/instruccion`,
    datos,
  );
};

export const CoberturaService = {
  obtenerMatriz,
  editarCelda,
  fijarDatosInstruccion,
};
