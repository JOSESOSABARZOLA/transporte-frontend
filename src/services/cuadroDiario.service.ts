/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cuadro diario
 * Archivo: cuadroDiario.service.ts
 * Responsabilidad: Consumir los endpoints de la jornada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * TODOS LOS SERVICIOS DE ESTE MÓDULO USAN `httpClient`, nunca `axios` directo. Aquel ya
 * resuelve la correlación, la identidad provisional y la normalización de errores: una
 * llamada suelta se saltaría las tres, y el fallo aparecería como un `401` sin
 * explicación o como una traza sin identificador de seguimiento.
 *
 * NO CAPTURAN ERRORES. Los dejan pasar tal como los normaliza `httpClient`, para que la
 * pantalla decida con `presentarError()`. Un `catch` aquí, aunque solo registrara, haría
 * que el aviso llegara al funcionario sin el código que decide cómo mostrarlo.
 */

import httpClient from "../api/httpClient";
import type { AbrirCuadro, CuadroDiario } from "../interfaces/CuadroDiario";

/** `GET /cuadros/:fecha`. El estado llega ya sincronizado con las ventanas. */
const obtenerPorFecha = async (fecha: string): Promise<CuadroDiario> => {
  const { data } = await httpClient.get<CuadroDiario>(`/cuadros/${fecha}`);
  return data;
};

/** `POST /cuadros`. Solo el ADMINISTRADOR. La semana la deriva el servidor. */
const abrir = async (cuadro: AbrirCuadro): Promise<CuadroDiario> => {
  const { data } = await httpClient.post<CuadroDiario>("/cuadros", cuadro);
  return data;
};

/** `POST /cuadros/:fecha/cerrar`. Solo la Dirección. */
const cerrar = async (fecha: string): Promise<CuadroDiario> => {
  const { data } = await httpClient.post<CuadroDiario>(
    `/cuadros/${fecha}/cerrar`,
  );
  return data;
};

/** `POST /cuadros/:fecha/reabrir`. Solo la Dirección. */
const reabrir = async (fecha: string): Promise<CuadroDiario> => {
  const { data } = await httpClient.post<CuadroDiario>(
    `/cuadros/${fecha}/reabrir`,
  );
  return data;
};

export const CuadroDiarioService = {
  obtenerPorFecha,
  abrir,
  cerrar,
  reabrir,
};
