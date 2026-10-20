/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Carga inicial de la DAF
 * Archivo: cargaInicial.service.ts
 * Responsabilidad: Previsualizar y aplicar la carga inicial (.xlsx) de conductores, vehículos,
 *                  garajes o turnos del mes.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Permiso `carga-inicial:administrar` (hoy solo ADMINISTRADOR); lo hace cumplir el servidor.
 * PREVISUALIZAR NO ESCRIBE: devuelve cada fila validada. APLICAR envía solo las válidas.
 *
 * El `Content-Type` va explícito en la subida: el cliente HTTP manda JSON por defecto y axios
 * convertiría el `FormData` a JSON; con `multipart/form-data` el navegador pone el delimitador.
 */

import httpClient from "../api/httpClient.ts";
import type {
  FilaCargaInicial,
  PreviaCargaInicial,
  ResultadoCargaInicial,
  TipoCargaInicial,
} from "../interfaces/CargaInicial.ts";

const BASE = "/administracion/carga-inicial";

/** `POST …/previsualizar` (multipart: `archivo`, `tipo` y, para turnos, `mes`). */
const previsualizar = async (
  tipo: TipoCargaInicial,
  archivo: File,
  mes?: string,
): Promise<PreviaCargaInicial> => {
  const formulario = new FormData();
  formulario.append("tipo", tipo);
  if (mes) formulario.append("mes", mes);
  formulario.append("archivo", archivo);
  const { data } = await httpClient.post<PreviaCargaInicial>(
    `${BASE}/previsualizar`,
    formulario,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 30_000,
    },
  );
  return data;
};

/** `POST …/aplicar`. Las filas son las VÁLIDAS de la vista previa, tal como llegaron. */
const aplicar = async (
  tipo: TipoCargaInicial,
  filas: FilaCargaInicial[],
  mes?: string,
): Promise<ResultadoCargaInicial> => {
  const { data } = await httpClient.post<ResultadoCargaInicial>(
    `${BASE}/aplicar`,
    { tipo, ...(mes ? { mes } : {}), filas },
    { timeout: 30_000 },
  );
  return data;
};

export const CargaInicialService = { previsualizar, aplicar };
