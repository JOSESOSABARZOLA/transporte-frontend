/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz mensual de turnos (Instrucción y conductores)
 * Archivo: asignarTurnos.util.ts
 * Responsabilidad: La lógica pura del cajón «Asignar turnos»: horarios tipo, editor, vista previa y resumen.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO CAJÓN EN LUGAR DE «APLICAR PATRÓN» Y «CONTINUAR ROTACIÓN» (2026-10-24). Lo que escribe
 * sigue saliendo de las mismas piezas: `planificarPatron` despliega un ciclo y la rotación la
 * propone el servidor. Aquí solo lo que el cajón agrega:
 *
 * · «LUNES A VIERNES DE DÍA» SIGUE EL CALENDARIO, NO UN CICLO: cada día toma su valor según su día
 *   de la semana. Se expresa como un ciclo de 7 girado hasta el día de arranque, así lo aplica el
 *   mismo `planificarPatron` y cae siempre de lunes a viernes.
 * · EL EDITOR PERSONALIZADO GENERA LAS MISMAS LETRAS que el campo de texto de antes: sus casillas se
 *   leen como texto y pasan por `expandirPatronCon`, de modo que no hay una segunda forma de validar.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  CambioCelda,
  CeldaCobertura,
  PersonaCobertura,
} from "../interfaces/Cobertura.ts";
import { diaSemana } from "./cobertura.util.ts";
import type { EstadoMatriz } from "./matrizTurnos.util.ts";

/** Largo admitido del ciclo personalizado (el mismo del patrón libre: de 2 a 14 letras). */
export const LARGO_MINIMO_CICLO = 2;
export const LARGO_MAXIMO_CICLO = 14;

/** Días que enseña la vista previa: las dos primeras semanas desde el día de arranque. */
export const DIAS_VISTA_PREVIA = 14;

/**
 * El ciclo de 7 días de «lunes a viernes de día», girado para que su posición 0 sea el día de la
 * semana de `desdeFecha`: así, aplicado desde ese día, el lunes cae en lunes y el sábado en sábado.
 */
export const patronLunesAViernes = (
  desdeFecha: string,
  estadoDia: string,
  estadoDescanso: string,
): string[] => {
  const inicio = diaSemana(desdeFecha);
  return Array.from({ length: 7 }, (_, k) => {
    const dia = (inicio + k) % 7;
    return dia === 0 || dia === 6 ? estadoDescanso : estadoDia;
  });
};

/** Un clic en una casilla del editor: el siguiente estado, y del último vuelve al primero. */
export const siguienteEnEditor = (
  valor: string,
  estados: EstadoMatriz[],
): string => {
  const indice = estados.findIndex((estado) => estado.valor === valor);
  return estados[(indice + 1) % estados.length]?.valor ?? valor;
};

/** Las casillas del editor como el texto del patrón libre («DDN--»): la tecla de cada estado. */
export const letrasDelEditor = (
  valores: string[],
  estados: EstadoMatriz[],
): string =>
  valores
    .map((valor) => estados.find((estado) => estado.valor === valor)?.teclas[0] ?? "")
    .join("");

/** Un día de la vista previa: lo que quedaría en esa celda. */
export interface DiaVistaPrevia {
  fecha: string;
  estado: string | null;
  esAusencia: boolean;
}

/** Las dos primeras semanas de una persona desde `desdeIndice`, con los cambios ya puestos. */
export const vistaPrevia = (
  persona: PersonaCobertura,
  desdeIndice: number,
  cambios: CambioCelda[],
): DiaVistaPrevia[] => {
  const propios = new Map(
    cambios
      .filter((cambio) => cambio.funcionarioId === persona.funcionarioId)
      .map((cambio) => [cambio.fecha, cambio.estado]),
  );
  return persona.celdas
    .slice(desdeIndice, desdeIndice + DIAS_VISTA_PREVIA)
    .map((celda) => ({
      fecha: celda.fecha,
      esAusencia: celda.esAusencia,
      estado: propios.has(celda.fecha) ? (propios.get(celda.fecha) ?? null) : celda.estado,
    }));
};

/**
 * Lo que se dirá antes de escribir: días que se asignan, de cuántas personas, ausencias intactas y
 * cuántos de esos días ya tenían OTRO turno (se reemplazan).
 */
export interface ResumenAsignacion {
  dias: number;
  personas: number;
  ausencias: number;
  reemplazos: number;
}

export const resumenAsignacion = (
  cambios: CambioCelda[],
  marcadas: PersonaCobertura[],
  desdeIndice: number,
): ResumenAsignacion => {
  const actual = new Map(
    marcadas.flatMap((persona) =>
      persona.celdas.map((celda) => [`${persona.funcionarioId}|${celda.fecha}`, celda.estado]),
    ),
  );
  return {
    dias: cambios.length,
    personas: new Set(cambios.map((cambio) => cambio.funcionarioId)).size,
    ausencias: marcadas.reduce(
      (suma, persona) =>
        suma + persona.celdas.slice(desdeIndice).filter((celda) => celda.esAusencia).length,
      0,
    ),
    reemplazos: cambios.filter((cambio) => {
      const antes = actual.get(`${cambio.funcionarioId}|${cambio.fecha}`);
      return antes !== null && antes !== undefined && antes !== cambio.estado;
    }).length,
  };
};

const sinTurno = (celda: CeldaCobertura): boolean =>
  !celda.esAusencia && celda.estado === null;

/** Quien no tiene NINGÚN turno en el mes (solo vacías o ausencias). */
export const personasSinNingunTurno = (
  personas: PersonaCobertura[],
): PersonaCobertura[] =>
  personas.filter((persona) =>
    persona.celdas.every((celda) => celda.esAusencia || sinTurno(celda)),
  );

/**
 * «Seguir el ciclo»: de lo que propuso el servidor, solo lo de las personas marcadas, desde el día
 * elegido y sobre celdas VACÍAS. El servidor ya lo garantiza; el cliente lo vuelve a filtrar, como
 * hacía «Continuar rotación»: el ciclo nunca toca lo planificado ni una ausencia.
 */
export const cambiosDelCiclo = (
  propuestas: CambioCelda[],
  marcadas: PersonaCobertura[],
  desdeFecha: string,
): CambioCelda[] => {
  const vacias = new Set<string>();
  for (const persona of marcadas) {
    for (const celda of persona.celdas) {
      if (sinTurno(celda) && celda.fecha >= desdeFecha) {
        vacias.add(`${persona.funcionarioId}|${celda.fecha}`);
      }
    }
  }
  return propuestas.filter((propuesta) =>
    vacias.has(`${propuesta.funcionarioId}|${propuesta.fecha}`),
  );
};
