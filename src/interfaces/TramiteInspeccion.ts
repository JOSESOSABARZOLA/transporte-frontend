/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Trámites de Inspección
 * Archivo: TramiteInspeccion.ts
 * Responsabilidad: Declarar los trámites de Inspección que se ofrecen a cada inspector asignado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * El navegador nunca habla con Inspección (CSP `connect-src 'self'`): pregunta a NUESTRO servidor,
 * que reenvía el token de Auth central y cruza por cédula. La cédula no llega hasta aquí.
 */

/** Un trámite asignado al inspector en el sistema de Inspección. */
export interface TramiteInspeccion {
  codigoTramite: string;
  nroSitra: string | null;
  predio: string | null;
  zonal: string | null;
  materia: string | null;
  tipoTramite: string | null;
  estado?: string | null;
}

/** Lo que el combo necesita de una persona. */
export interface TramitesDePersona {
  funcionarioId: number;
  /** Área General o Técnico de la ficha. A quien no lo es no se le ofrece combo. */
  esInspector: boolean;
  tramites: TramiteInspeccion[];
}

/** `disponible: false` NO es un error: Inspección no respondió y el motivo se muestra tal cual. */
export interface ConsultaTramites {
  disponible: boolean;
  motivo: string | null;
  personas: TramitesDePersona[];
}
