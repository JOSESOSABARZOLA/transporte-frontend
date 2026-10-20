/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: cobertura.util.ts
 * Responsabilidad: La lógica pura de la matriz de cobertura: letras, rotación, totales y patrones.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * Sin React ni red: lo que decide QUÉ se escribe vive aquí, para probarlo sin montar la grilla.
 * La LETRA es la información (regla 6): D, N, —, V, RM, C, P; el color solo acompaña.
 */

import type {
  CambioCelda,
  EstadoTurno,
  PersonaCobertura,
} from "../interfaces/Cobertura";
import type { DenominacionInstruccion } from "../interfaces/Personal";

/** Las denominaciones de Instrucción, con su nombre legible. */
export const DENOMINACIONES: { valor: DenominacionInstruccion; nombre: string }[] =
  [
    { valor: "LIDER_ZONAL", nombre: "Líder zonal" },
    { valor: "INSTRUCTOR_METROPOLITANO", nombre: "Instructor metropolitano" },
    { valor: "AUXILIAR_FLAGRANCIA", nombre: "Auxiliar de flagrancia" },
  ];

/** «Líder zonal» a partir de «LIDER_ZONAL»; lo desconocido, tal cual. */
export const nombreDenominacion = (valor: string | null): string | null =>
  valor === null
    ? null
    : (DENOMINACIONES.find((d) => d.valor === valor)?.nombre ?? valor);

/** La letra de cada estado. */
export const LETRA_ESTADO: Record<string, string> = {
  DIURNO: "D",
  NOCTURNO: "N",
  DESCANSO: "—",
  VACACIONES: "V",
  REPOSO_MEDICO: "RM",
  CALAMIDAD: "C",
  PERMISO: "P",
};

/** El estado en palabras, para el `title` y el nombre accesible de la celda. */
export const NOMBRE_ESTADO: Record<string, string> = {
  DIURNO: "Diurno",
  NOCTURNO: "Nocturno",
  DESCANSO: "Descanso",
  VACACIONES: "Vacaciones",
  REPOSO_MEDICO: "Reposo médico",
  CALAMIDAD: "Calamidad",
  PERMISO: "Permiso",
};

/** Al pulsar una celda en modo «Rotar»: D → N → — → vacía → D. */
export const siguienteEnRotacion = (
  estado: string | null,
): EstadoTurno | null => {
  switch (estado) {
    case null:
      return "DIURNO";
    case "DIURNO":
      return "NOCTURNO";
    case "NOCTURNO":
      return "DESCANSO";
    default:
      return null;
  }
};

/** La tecla D/N/- (o la letra de un patrón) como turno. `null` si no es ninguna. */
export const turnoDeLetra = (letra: string): EstadoTurno | null => {
  const l = letra.toUpperCase();
  if (l === "D") return "DIURNO";
  if (l === "N") return "NOCTURNO";
  if (l === "-" || l === "—") return "DESCANSO";
  return null;
};

/** Patrones rápidos del modal «Aplicar patrón». */
export const PATRONES_RAPIDOS: { nombre: string; patron: string }[] = [
  { nombre: "5D + 2—", patron: "DDDDD--" },
  { nombre: "2D + 2N + 2—", patron: "DDNN--" },
  { nombre: "3D + 2N + 2—", patron: "DDDNN--" },
  { nombre: "5N + 2—", patron: "NNNNN--" },
];

/** Un patrón libre válido: solo D, N y - (o —), de 2 a 14 letras. */
export const expandirPatron = (texto: string): EstadoTurno[] | null => {
  const limpio = texto.replace(/\s+/g, "").replace(/—/g, "-").toUpperCase();
  if (!/^[DN-]{2,14}$/.test(limpio)) return null;
  return [...limpio].map((letra) => turnoDeLetra(letra) as EstadoTurno);
};

/** Totales de un día, sobre TODO el personal en alcance (no dependen de los filtros). */
export interface TotalesDia {
  diurno: number;
  nocturno: number;
  descanso: number;
  ausencias: number;
  sinTurno: number;
}

/** Recalcula los totales por día a partir de las celdas (se usa al editar, en optimista). */
export const calcularTotales = (
  personas: PersonaCobertura[],
  cantidadDias: number,
): TotalesDia[] => {
  const totales: TotalesDia[] = Array.from({ length: cantidadDias }, () => ({
    diurno: 0,
    nocturno: 0,
    descanso: 0,
    ausencias: 0,
    sinTurno: 0,
  }));
  for (const persona of personas) {
    persona.celdas.forEach((celda, i) => {
      const total = totales[i];
      if (!total) return;
      if (celda.esAusencia) total.ausencias += 1;
      else if (celda.estado === "DIURNO") total.diurno += 1;
      else if (celda.estado === "NOCTURNO") total.nocturno += 1;
      else if (celda.estado === "DESCANSO") total.descanso += 1;
      else total.sinTurno += 1;
    });
  }
  return totales;
};

/** «N personas sin turno en X días (dd–dd)»: lo que falta planificar del mes. */
export interface ResumenSinTurno {
  personas: number;
  dias: number;
  desde: string | null;
  hasta: string | null;
}

export const resumirSinTurno = (
  personas: PersonaCobertura[],
  dias: string[],
): ResumenSinTurno => {
  let conVacias = 0;
  const diasVacios = new Set<number>();
  for (const persona of personas) {
    let tiene = false;
    persona.celdas.forEach((celda, i) => {
      if (!celda.esAusencia && celda.estado === null) {
        tiene = true;
        diasVacios.add(i);
      }
    });
    if (tiene) conVacias += 1;
  }
  const indices = [...diasVacios].sort((a, b) => a - b);
  return {
    personas: conVacias,
    dias: indices.length,
    desde: indices.length ? dias[indices[0]] : null,
    hasta: indices.length ? dias[indices[indices.length - 1]] : null,
  };
};

/** Lo que escribiría un patrón, con su vista previa («N celdas (M ya tenían turno) · K …»). */
export interface PlanPatron {
  cambios: CambioCelda[];
  yaTenianTurno: number;
  omitidasAusencia: number;
}

/**
 * Despliega un patrón sobre un conjunto de personas × días. El patrón arranca en `desdeIndice` y
 * se repite; los días anteriores a `desdeIndice` no se tocan. Las ausencias se omiten SIEMPRE; con
 * `soloVacias` tampoco se toca lo ya planificado.
 */
export const planificarPatron = (args: {
  personas: PersonaCobertura[];
  indicesDias: number[];
  desdeIndice: number;
  patron: string[];
  soloVacias: boolean;
}): PlanPatron => {
  const { personas, indicesDias, desdeIndice, patron, soloVacias } = args;
  const cambios: CambioCelda[] = [];
  let yaTenianTurno = 0;
  let omitidasAusencia = 0;
  for (const persona of personas) {
    for (const i of indicesDias) {
      if (i < desdeIndice) continue;
      const celda = persona.celdas[i];
      if (!celda) continue;
      if (celda.esAusencia) {
        omitidasAusencia += 1;
        continue;
      }
      if (celda.estado !== null) {
        if (soloVacias) continue;
        yaTenianTurno += 1;
      }
      cambios.push({
        funcionarioId: persona.funcionarioId,
        fecha: celda.fecha,
        estado: patron[(i - desdeIndice) % patron.length],
      });
    }
  }
  return { cambios, yaTenianTurno, omitidasAusencia };
};

/** «octubre de 2026» a partir de «2026-10». */
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const nombreMes = (mes: string): string => {
  const [anio, numero] = mes.split("-").map(Number);
  return `${MESES[numero - 1] ?? mes} de ${anio}`;
};

/** El mes anterior o siguiente, como «AAAA-MM». */
export const desplazarMes = (mes: string, delta: number): string => {
  const [anio, numero] = mes.split("-").map(Number);
  const base = new Date(Date.UTC(anio, numero - 1 + delta, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}`;
};

const DIAS_SEMANA = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIÉRCOLES",
  "JUEVES",
  "VIERNES",
  "SÁBADO",
];

/** Día de la semana (0 = domingo) de una fecha AAAA-MM-DD, leída en UTC (regla 12). */
export const diaSemana = (fecha: string): number =>
  new Date(`${fecha}T00:00:00Z`).getUTCDay();

export const nombreDiaSemana = (fecha: string): string =>
  DIAS_SEMANA[diaSemana(fecha)];
