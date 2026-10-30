/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Traslados entre zonales
 * Archivo: traslados.service.ts
 * Responsabilidad: Leer y guardar la matriz de minutos de traslado entre zonales, y medir el
 *                  impacto de un cambio antes de guardarlo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Un par sin minutos (`null`) usa la REGLA GENERAL del servidor (misma zona / mismo sector / otro
 * sector). Permiso `flota:administrar` (lo hace cumplir el servidor).
 */

import httpClient from "../api/httpClient";

const BASE = "/administracion/traslados";

export interface ZonalTraslado {
  id: number;
  nombre: string;
  sector: string | null;
  /** «DMQ» (2026-10-06): todo el distrito. No entra en la matriz de traslados. */
  esTodoElDistrito?: boolean;
  /** Qué abarca la zonal (2026-10-06): «DMQ» = todo el distrito de Quito. */
  descripcion?: string | null;
}

export interface ParTraslado {
  zonalOrigenId: number;
  zonalDestinoId: number;
  /** 0–600. `null` = se aplica la regla general. */
  minutos: number | null;
}

export interface ReglaGeneralTraslado {
  mismaZona: number;
  mismoSector: number;
  otroSector: number;
}

export interface MatrizTraslados {
  zonales: ZonalTraslado[];
  pares: ParTraslado[];
  reglaGeneral: ReglaGeneralTraslado;
  /** Zonales sin sector (2026-10-06): sus traslados caen siempre en «otro sector». */
  zonalesSinSector?: { id: number; nombre: string }[];
  /**
   * Cobertura de la matriz (2026-10-15): pares dirigidos entre zonales activas (sin el DMQ) y
   * cuántos usan todavía la regla general. Es un dato pendiente de la DAF, no un error.
   */
  cobertura?: { posibles: number; sinTiempo: number };
}

/** `GET /administracion/traslados`. */
const obtener = async (): Promise<MatrizTraslados> => {
  const { data } = await httpClient.get<MatrizTraslados>(BASE);
  return data;
};

/** `PUT /administracion/traslados`. Solo los pares que cambiaron; `null` vuelve a la regla general. */
const guardar = async (pares: ParTraslado[]): Promise<{ guardados: number }> => {
  const { data } = await httpClient.put<{ guardados: number }>(BASE, { pares });
  return data;
};

/** Un par de asignaciones que dejaría de llegar con la matriz propuesta (2026-10-20). */
export interface ParQueNoLlegaria {
  /** AAAA-MM-DD. */
  fecha: string;
  conductor: string;
  placa: string | null;
  desde: string;
  hacia: string;
  /** «HHhMM». */
  fin: string;
  inicio: string;
  huecoMin: number;
  antesMin: number;
  despuesMin: number;
  faltanMin: number;
  mensaje: string;
}

export interface ImpactoTraslados {
  desde: string;
  hasta: string;
  afectadas: number;
  nuevasNoLlega: ParQueNoLlegaria[];
  resueltas: number;
}

/**
 * `POST /administracion/traslados/verificar-impacto` (2026-10-20): qué asignaciones ya hechas,
 * desde hoy, dejarían de llegar con estos pares. Mismo cuerpo que `guardar`; no escribe nada.
 */
const verificarImpacto = async (pares: ParTraslado[]): Promise<ImpactoTraslados> => {
  const { data } = await httpClient.post<ImpactoTraslados>(`${BASE}/verificar-impacto`, {
    pares,
  });
  return data;
};

export const TrasladosService = { obtener, guardar, verificarImpacto };
