/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: JornadaLaboral.ts
 * Responsabilidad: El contrato de las jornadas laborales con el servidor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 *
 * LA JORNADA LABORAL REEMPLAZA AL TIPO DE CONTRATO (2026-10-23). Nombramiento y ocasional se dieron
 * de baja: cada persona y cada conductor tienen una jornada del catálogo, que decide en qué días y
 * horas se los puede convocar. Sin jornada no se los convoca. Ver
 * `transporte-backend/src/modules/talento-operativo/domain/jornada-laboral.ts`.
 */

/** Una jornada del catálogo, como la devuelve `GET /administracion/jornadas-laborales`. */
export interface JornadaLaboral {
  id: number;
  nombre: string;
  /** 1 = lunes … 7 = domingo. */
  dias: number[];
  /** Ventana HH:MM; las dos nulas = sin horario (cualquier hora de sus días). */
  horaInicio: string | null;
  horaFin: string | null;
  activo: boolean;
  /** Cuántas fichas de personal y cuántos conductores la tienen asignada. */
  funcionarios: number;
  conductores: number;
}

/** Lo que se envía al crear o editar una jornada. */
export interface GuardarJornadaLaboral {
  nombre: string;
  dias: number[];
  horaInicio: string | null;
  horaFin: string | null;
}
