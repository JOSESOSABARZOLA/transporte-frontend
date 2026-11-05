/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Zonas de la ciudad
 * Archivo: ZonaCiudad.ts
 * Responsabilidad: Los tipos de `/administracion/zonas`, espejo de `ZonaCiudadResponseDto`.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-05
 */

export type SectorCiudad = "NORTE" | "CENTRO" | "SUR" | "VALLE";

/** Cuánto se usa una zona, por tabla. */
export interface UsoDeZona {
  /** Operativos, tramos de transporte y registros por zonas. */
  operativos: number;
  /** Zonales de formulario, activas o no. */
  formularios: number;
  puntos: number;
  personal: number;
  /** Garajes y talleres. */
  flota: number;
}

export interface ZonaCiudad {
  id: number;
  /** Derivado del nombre al crearla; no cambia. */
  codigo: string;
  nombre: string;
  /** `null` solo en el DMQ, que es todo el distrito. */
  sector: SectorCiudad | null;
  orden: number;
  esDmq: boolean;
  activo: boolean;
  uso: UsoDeZona;
  /** Números de los formularios que la tienen activa. */
  formulariosActivos: number[];
  /** Pares de la matriz de traslados con otra zona activa que usan la regla general. */
  paresSinTiempo: number;
  puedeDesactivar: boolean;
  motivoNoDesactivar: string | null;
  puedeEliminar: boolean;
  motivoNoEliminar: string | null;
}

export interface GuardarZonaCiudad {
  nombre: string;
  sector: SectorCiudad;
  orden?: number;
}
