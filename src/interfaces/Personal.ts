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

/**
 * Motivo de la baja lógica (2026-09-30). Códigos fijos que reconoce el servidor; «OTRO» exige un
 * detalle escrito. El nombre legible lo pone `NOMBRE_MOTIVO_BAJA` (regla 6).
 */
export type MotivoBaja = "FIN_CONTRATO" | "RENUNCIA" | "TRASLADO" | "OTRO";

/** Cuerpo de `DELETE /administracion/personal/:id`: el motivo y, solo con «OTRO», su detalle. */
export interface BajaFuncionario {
  motivo: MotivoBaja;
  detalle?: string;
}

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
  /**
   * Correo institucional. Añadido el 2026-09-01. Opcional, como el teléfono.
   *
   * NO ESTÁ EN `PersonaElegible`, y es deliberado: quien arma el cuadro elige personas,
   * no las contacta. Mismo criterio que el teléfono, RN-34.
   */
  correo: string | null;
  cargo: string | null;
  area: AreaPersonal;
  tipoContrato: TipoContrato;
  direccion: RolDepartamental;
  /** Zona y denominación de Instrucción (nulos para el resto; opcionales en el tipo). */
  zonalId?: number | null;
  denominacion?: DenominacionInstruccion | null;
  activo: boolean;
}

/** Denominación del personal de Instrucción en la cobertura mensual por turnos. */
export type DenominacionInstruccion =
  | "LIDER_ZONAL"
  | "INSTRUCTOR_METROPOLITANO"
  | "AUXILIAR_FLAGRANCIA";

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
  /**
   * Zona que la persona gestiona (`func_zonal_id`). Al asignarla, el registro la propone como
   * zonal del operativo (2026-09-24). Nula/ausente si no tiene: entonces no se propone nada.
   */
  zonalId?: number | null;
  /**
   * DOS SEÑALES ADVISORY DISTINTAS (2026-09-29). NO cambian `elegible` ni bloquean; opcionales
   * (solo llegan si el servidor las calculó). Un elegible con `nivelFatiga: "ROJO"` sigue asignable.
   *
   *   1) FATIGA (seguridad, FRMS / ISO 45001): `indiceCarga` + `nivelFatiga`, por umbrales
   *      ABSOLUTOS. Mide si la persona se acerca a un límite de fatiga; no depende del grupo.
   *   2) EQUIDAD (reparto): `cuotaJusta` (media del grupo), `desviacionCarga` (carga − cuota) y
   *      `nivelEquidad` (DEBAJO/EQUILIBRADO/ENCIMA). Mide si carga más o menos que su parte justa.
   *
   * `sugerido` marca a los elegibles por DEBAJO de su cuota, para repartir de forma equitativa.
   */
  indiceCarga?: number;
  nivelFatiga?: NivelFatiga;
  /** Cuántos operativos tiene asignados la persona en el período de equidad (semana). */
  operativosAsignados?: number;
  cuotaJusta?: number;
  desviacionCarga?: number;
  nivelEquidad?: NivelEquidad;
  sugerido?: boolean;
}

/** Nivel del semáforo de fatiga. El texto legible lo pone `NIVEL_FATIGA` (regla 6). */
export type NivelFatiga = "VERDE" | "AMBAR" | "ROJO";

/** Nivel de equidad del reparto. El texto legible lo pone `NIVEL_EQUIDAD` (regla 6). */
export type NivelEquidad = "DEBAJO" | "EQUILIBRADO" | "ENCIMA";

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
  correo?: string;
  cargo?: string;
  area: AreaPersonal;
  tipoContrato: TipoContrato;
  /**
   * Zonal de trabajo. Se envía para el personal DMIP (OPERATIVOS/GENERAL/TECNICO), donde el
   * servidor la exige; para Instrucción no viaja (la fija la matriz de cobertura). 2026-09-21.
   */
  zonalId?: number | null;
  /*
    SIN `direccion`, DESDE EL 2026-09-01. La deduce el servidor del área y el contrato ya
    no la admite. Sigue viajando **de vuelta** en `Funcionario`, porque el maestro la
    muestra y de ella depende quién ve cada ficha (PER-09).
  */
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
