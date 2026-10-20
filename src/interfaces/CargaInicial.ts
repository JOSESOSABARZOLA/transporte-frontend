/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Carga inicial de la DAF
 * Archivo: CargaInicial.ts
 * Responsabilidad: Los tipos de la carga inicial (previsualizar y aplicar un .xlsx).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Espejo de `POST /administracion/carga-inicial/previsualizar` y `…/aplicar` (versión consolidada
 * de la DAF). Se usa UNA SOLA VEZ para cargar los datos iniciales; lo valida el servidor.
 */

/** Qué se carga. Los turnos van por mes. */
export type TipoCargaInicial = "conductores" | "vehiculos" | "garajes" | "turnos";

/** Una fila de la hoja, ya validada por el servidor. */
export interface FilaCargaInicial {
  /** Número de fila en la hoja. */
  fila: number;
  valido: boolean;
  /** Redactados por el servidor: se muestran tal cual (regla 7). */
  errores: string[];
  /** Lo que la fila aportaría, columna → valor. */
  datos: Record<string, unknown>;
}

export interface PreviaCargaInicial {
  tipo: TipoCargaInicial;
  /** Qué espera el servidor de la hoja: un texto o la lista de columnas. */
  formatoEsperado: string | string[];
  filas: FilaCargaInicial[];
  resumen: { validas: number; invalidas: number };
}

export interface ResultadoCargaInicial {
  creados: number;
  actualizados: number;
  /** Lo que el servidor no aplicó, con su motivo (texto o fila con motivo). */
  omitidos: (string | { fila?: number; motivo: string })[];
}
