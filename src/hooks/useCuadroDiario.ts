/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cuadro diario
 * Archivo: useCuadroDiario.ts
 * Responsabilidad: Exponer la jornada de una fecha y si admite escritura.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LO CONSULTA LA CABECERA DE TODAS LAS PANTALLAS. RN-58: en un cuadro cerrado no se
 * escribe. `admiteEscritura` llega calculado del servidor, que es donde se decide; aquí
 * solo se transporta, y de él dependen los botones de guardar de las nueve pantallas.
 *
 * `puedeEscribir` es **falso mientras carga**. Habilitar el formulario antes de saber si
 * la jornada está abierta permitiría capturar un operativo completo para descubrir al
 * guardar que el cuadro se cerró hace una hora.
 */

import { useCallback } from "react";

import { CuadroDiarioService } from "../services/cuadroDiario.service";
import type { CuadroDiario } from "../interfaces/CuadroDiario";
import { useConsulta } from "./useConsulta";
import type { ErrorPresentado } from "../utils/errorApi.util";

export interface UsoCuadroDiario {
  cuadro: CuadroDiario | null;
  cargando: boolean;
  error: ErrorPresentado | null;
  /** RN-58. Falso mientras carga y falso si la jornada no existe. */
  puedeEscribir: boolean;
  /** `true` cuando nadie abrió la jornada: el mensaje que toca no es un error rojo. */
  sinJornada: boolean;
  recargar: () => void;
}

export const useCuadroDiario = (fecha: string): UsoCuadroDiario => {
  const consulta = useCallback(
    () => CuadroDiarioService.obtenerPorFecha(fecha),
    [fecha],
  );

  const { datos, cargando, error, recargar } = useConsulta<CuadroDiario>(
    consulta,
    Boolean(fecha),
  );

  return {
    cuadro: datos,
    cargando,
    error,
    puedeEscribir: !cargando && (datos?.admiteEscritura ?? false),
    // El 404 de una fecha sin cuadro no es un fallo: es que la jornada no se ha abierto,
    // y la pantalla lo dice con un aviso informativo en lugar de uno de error.
    sinJornada: error?.estado === 404,
    recargar,
  };
};
