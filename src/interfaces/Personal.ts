/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: Personal.ts
 * Responsabilidad: Declarar el maestro de personal y su disponibilidad.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * EL VEREDICTO DE ELEGIBILIDAD NO TRAE DATOS DEL FUNCIONARIO, y esa ausencia es la
 * frontera de M-12: el servidor responde si la persona puede salir y por qué, nunca los
 * antecedentes con los que lo decidió. Sin acceso a ellos, la interfaz no puede
 * reimplementar las reglas de descanso aunque quisiera.
 */

import type { AreaPersonal } from "./Formulario";
import type { RolDepartamental } from "../config/env";

export type TipoContrato = "NOMBRAMIENTO" | "OCASIONAL";

export type EstadoDisponibilidad =
  | "DISPONIBLE"
  | "VACACIONES"
  | "REPOSO_MEDICO"
  | "CALAMIDAD"
  | "PERMISO"
  | "MANTENIMIENTO";

/** Respuesta de `GET /administracion/personal`. */
export interface Funcionario {
  id: number;
  cedula: string;
  apellidos: string;
  nombres: string;
  telefono: string | null;
  cargo: string | null;
  area: AreaPersonal;
  tipoContrato: TipoContrato;
  direccion: RolDepartamental;
  activo: boolean;
}

/**
 * Persona ofrecida en el desplegable de asignación. Respuesta de `GET /personal/elegible`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SON LOS CINCO CAMPOS QUE EL SERVIDOR ENVÍA, Y **LA LISTA YA LLEGA FILTRADA**.
 *
 * Hasta el 2026-08-07 esta interfaz declaraba `{ funcionarioId, nombre, elegible,
 * motivo }`, que **el servidor no envía**. Dos consecuencias:
 *
 *   1. `persona.nombre` era `undefined` y la pantalla se rompía al filtrar la búsqueda.
 *   2. `elegible` y `motivo` nunca llegaban, así que el veredicto por persona que
 *      `SelectorPersonal` pretendía mostrar no podía funcionar.
 *
 * **El endpoint no devuelve veredictos: descarta a quien no puede salir.** El motivo se
 * conoce al intentar asignar, en el `409` de `POST /operativos/:id/personal`. Ver la nota
 * de PV-37 en `PENDIENTES-VALIDACION.md`: que la persona desaparezca en lugar de aparecer
 * con su explicación es una decisión de producto que conviene revisar.
 *
 * Sin cédula ni teléfono, a propósito (RN-34): un campo que no existe en el contrato no
 * se filtra por descuido.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export interface PersonaElegible {
  id: number;
  apellidos: string;
  nombres: string;
  area: AreaPersonal;
  cargo: string | null;
  /**
   * Si puede recibir la asignación en el horario consultado.
   *
   * PV-37, RESUELTO EL 2026-08-11. El endpoint devolvía solo a los aptos y quien no
   * podía salir desaparecía de la lista sin explicación. Ahora llegan todos, y la
   * pantalla muestra a los rechazados deshabilitados **con su motivo**.
   */
  elegible: boolean;
  /** Por qué no puede, redactado por el servidor. Nulo si puede. */
  motivo: string | null;
}

/** `APELLIDOS NOMBRES`, como se muestra en todo el sistema. */
export const nombreDePersona = (persona: PersonaElegible): string =>
  `${persona.apellidos} ${persona.nombres}`;

/**
 * Periodo de ausencia. Respuesta de `GET /administracion/personal/:id/disponibilidad`.
 *
 * **No trae `funcionarioId`**, y no es un olvido del servidor: el periodo se pide por la
 * ruta de su funcionario, así que repetirlo en el cuerpo sería un dato que puede
 * contradecir a la ruta. Se declaró aquí en M-21 por simetría con la tabla, y se corrigió
 * en M-27 al consumirlo de verdad.
 */
export interface Disponibilidad {
  id: number;
  estado: EstadoDisponibilidad;
  desde: string;
  hasta: string;
  /** Solo lo ve el ADMINISTRADOR: puede describir una condición de salud. */
  motivo: string | null;
  registradoPor: number;
}

export interface CrearFuncionario {
  cedula: string;
  apellidos: string;
  nombres: string;
  telefono?: string;
  cargo?: string;
  area: AreaPersonal;
  tipoContrato: TipoContrato;
  direccion: RolDepartamental;
}

/** Cuerpo de `PUT /administracion/personal/:id`. Se envía lo que cambia. */
export type ActualizarFuncionario = Partial<CrearFuncionario> & {
  activo?: boolean;
};

export interface RegistrarAusencia {
  estado: EstadoDisponibilidad;
  desde: string;
  hasta: string;
  motivo?: string;
}
