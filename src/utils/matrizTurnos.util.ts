/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz mensual de turnos (Instrucción y conductores)
 * Archivo: matrizTurnos.util.ts
 * Responsabilidad: La lógica pura de una matriz de turnos PARAMETRIZADA por sus estados.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA MATRIZ, DOS INSTRUMENTOS. La cobertura de Instrucción (D/N/—) y los turnos de conductores
 * de la DAF (D/N/E/L/A) se planifican con la MISMA grilla: rotar, rango, teclado, patrones,
 * continuar rotación, deshacer, publicar y exportar. Lo único que cambia son los ESTADOS —su
 * valor, su letra, su orden de rotación y sus teclas—, y eso vive aquí como parámetro, no
 * cableado en la grilla.
 *
 * La LETRA es la información (regla 6); el color solo acompaña y se elige por token del tema.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PersonaCobertura } from "../interfaces/Cobertura.ts";

/** Un estado editable de la matriz (se escribe con clic, tecla o patrón). */
export interface EstadoMatriz {
  /** Valor que viaja al servidor: «DIURNO», «DIA»… */
  valor: string;
  /** Lo que se pinta en la celda: «D», «N», «—»… */
  letra: string;
  /** En palabras, para el `title` y el nombre accesible: «Diurno». */
  nombre: string;
  /** Teclas (y letras de patrón) que lo escriben, en mayúsculas: ["D"], ["-", "—"]. */
  teclas: string[];
}

/** Al pulsar en modo «Rotar»: vacía → primero → … → último → vacía. */
export const rotarEstado = (
  estado: string | null,
  estados: EstadoMatriz[],
): string | null => {
  if (estado === null) return estados[0]?.valor ?? null;
  const indice = estados.findIndex((e) => e.valor === estado);
  if (indice === -1 || indice === estados.length - 1) return null;
  return estados[indice + 1].valor;
};

/** El estado que escribe una tecla (o una letra de patrón), o `null` si no es ninguna. */
export const estadoDeTecla = (
  tecla: string,
  estados: EstadoMatriz[],
): string | null => {
  const t = tecla.toUpperCase();
  return estados.find((e) => e.teclas.includes(t))?.valor ?? null;
};

/** Un patrón libre válido: solo las teclas de los estados, de 2 a 14 letras. */
export const expandirPatronCon = (
  texto: string,
  estados: EstadoMatriz[],
): string[] | null => {
  const limpio = texto.replace(/\s+/g, "").toUpperCase();
  if (limpio.length < 2 || limpio.length > 14) return null;
  const valores: string[] = [];
  for (const letra of limpio) {
    const valor = estadoDeTecla(letra, estados);
    if (!valor) return null;
    valores.push(valor);
  }
  return valores;
};

/** Totales de un día: cuántas celdas hay en cada estado, más ausencias y sin turno. */
export interface TotalesDiaGenerico {
  porEstado: Record<string, number>;
  ausencias: number;
  sinTurno: number;
}

/** Recalcula los totales por día sobre TODAS las filas en alcance (no dependen de los filtros). */
export const calcularTotalesCon = (
  personas: PersonaCobertura[],
  cantidadDias: number,
  estados: EstadoMatriz[],
): TotalesDiaGenerico[] => {
  const totales: TotalesDiaGenerico[] = Array.from(
    { length: cantidadDias },
    () => ({
      porEstado: Object.fromEntries(estados.map((e) => [e.valor, 0])),
      ausencias: 0,
      sinTurno: 0,
    }),
  );
  for (const persona of personas) {
    persona.celdas.forEach((celda, i) => {
      const total = totales[i];
      if (!total) return;
      if (celda.esAusencia) total.ausencias += 1;
      else if (celda.estado === null) total.sinTurno += 1;
      else if (celda.estado in total.porEstado)
        total.porEstado[celda.estado] += 1;
    });
  }
  return totales;
};

/**
 * «COPIAR MES ANTERIOR» (2026-10-06): el día N de cada persona toma el estado del día N del mes
 * anterior. Lo que NO se copia: las ausencias (vienen de la disponibilidad y son de ESE mes, no
 * del siguiente), los días que el mes anterior no tiene (el 31 tras un mes de 30) y las celdas
 * vacías. Tampoco se pisa una celda que ya tenga estado ni una ausencia del mes actual. Pura: la
 * vista previa cuenta lo que devuelve y el lote escribe exactamente eso.
 */
export const cambiosCopiandoMesAnterior = (
  actual: { personas: { funcionarioId: number; celdas: { fecha: string; estado: string | null; esAusencia: boolean }[] }[] },
  anterior: { personas: { funcionarioId: number; celdas: { fecha: string; estado: string | null; esAusencia: boolean }[] }[] },
): { funcionarioId: number; fecha: string; estado: string }[] => {
  const previas = new Map(anterior.personas.map((p) => [p.funcionarioId, p]));
  const cambios: { funcionarioId: number; fecha: string; estado: string }[] = [];
  for (const persona of actual.personas) {
    const previa = previas.get(persona.funcionarioId);
    if (!previa) continue;
    const porDia = new Map(previa.celdas.map((c) => [c.fecha.slice(8, 10), c]));
    for (const celda of persona.celdas) {
      if (celda.esAusencia || celda.estado !== null) continue;
      const origen = porDia.get(celda.fecha.slice(8, 10));
      if (!origen || origen.esAusencia || origen.estado === null) continue;
      cambios.push({
        funcionarioId: persona.funcionarioId,
        fecha: celda.fecha,
        estado: origen.estado,
      });
    }
  }
  return cambios;
};
