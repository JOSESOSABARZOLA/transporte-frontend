/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Turnos de conductores
 * Archivo: turnosConductores.service.ts
 * Responsabilidad: Consumir la matriz mensual de turnos de conductores y adaptarla a la matriz común.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * La pantalla REUTILIZA la matriz de la cobertura de Instrucción (`MatrizCobertura`). El backend
 * habla de `conductorId` y `turno`; la matriz común, de `funcionarioId` (la fila) y `estado`. Este
 * servicio traduce en los dos sentidos y no hace nada más: las reglas siguen en el servidor.
 *
 * Permiso `flota:administrar` (lo hace cumplir el servidor). La carga el jefe de la DAF antes de
 * fin de mes.
 *
 * Versión consolidada (2026-10-06): la importación del HORARIO salió de esta pantalla (se carga una
 * sola vez desde «Carga inicial»); entran la PROPUESTA DEL MES, los mínimos por día y la exportación
 * en Excel o PDF.
 */

import httpClient from "../api/httpClient";
import type {
  CambioCelda,
  CeldaCobertura,
  EstadoMesCobertura,
  MatrizCobertura,
  PropuestaMes,
  PropuestaRotacion,
  ResultadoLote,
  ResultadoPublicar,
} from "../interfaces/Cobertura";

const BASE = "/transporte/turnos-conductores";

/** Turno de un conductor en un día. Las ausencias vienen de la disponibilidad, no de aquí. */
export type TurnoConductor =
  | "DIA"
  | "NOCHE"
  | "ECU_NOCHE"
  | "LIBRE"
  | "ADMINISTRATIVO";

/** Lo que devuelve el servidor (contrato de `turnos-conductores`). */
interface MatrizConductoresApi {
  mes: string;
  dias: string[];
  conductores: {
    conductorId: number;
    nombre: string;
    sector: string | null;
    tipoContrato: string | null;
    celdas: CeldaCobertura[];
  }[];
  totales: {
    fecha: string;
    dia: number;
    noche: number;
    ecuNoche: number;
    libre: number;
    administrativo: number;
    ausencias: number;
    sinTurno: number;
    /** Por debajo del mínimo de conductores de ese día (2026-10-06). */
    bajoMinimo?: { dia: boolean; noche: boolean };
  }[];
  estadoMes: EstadoMesCobertura;
  /** Mínimos por día de la semana (L…D), o `null` sin configurar. */
  minimos?: { dia: number[] | null; noche: number[] | null };
}

const SECTOR: Record<string, string> = {
  NORTE: "Norte",
  SUR: "Sur",
  CENTRO: "Centro",
  VALLE: "Valle",
};

const CONTRATO: Record<string, string> = {
  NOMBRAMIENTO: "Nombramiento",
  OCASIONAL: "Ocasional",
};

/** Adapta la respuesta del servidor a la matriz común: la fila es el conductor, el grupo su sector. */
export const aMatrizComun = (api: MatrizConductoresApi): MatrizCobertura => ({
  mes: api.mes,
  dias: api.dias,
  personas: api.conductores.map((conductor) => ({
    funcionarioId: conductor.conductorId,
    nombre: conductor.nombre,
    // El contrato se lee bajo el nombre (decide hasta qué hora trabaja: nombramiento 16H30).
    cargo: conductor.tipoContrato
      ? (CONTRATO[conductor.tipoContrato] ?? conductor.tipoContrato)
      : null,
    zonalId: null,
    zona: conductor.sector
      ? (SECTOR[conductor.sector] ?? conductor.sector)
      : null,
    denominacion: null,
    avisos: 0,
    celdas: conductor.celdas,
  })),
  totales: api.totales.map((total) => ({
    fecha: total.fecha,
    diurno: total.dia,
    nocturno: total.noche + total.ecuNoche,
    descanso: total.libre,
    ausencias: total.ausencias,
    sinTurno: total.sinTurno,
    activos: total.dia + total.noche + total.ecuNoche + total.administrativo,
  })),
  estadoMes: api.estadoMes,
  // Solo los días que el servidor marcó; sin mínimos configurados no hay ninguno.
  bajoMinimo: Object.fromEntries(
    api.totales.flatMap((total) =>
      total.bajoMinimo && (total.bajoMinimo.dia || total.bajoMinimo.noche)
        ? [[total.fecha, total.bajoMinimo]]
        : [],
    ),
  ),
  // Los turnos de conductores no tienen avisos entre días (los da la asignación por tramos).
  avisosConfigurados: false,
});

/** `GET /transporte/turnos-conductores?mes=AAAA-MM`. */
const obtenerMatriz = async (mes: string): Promise<MatrizCobertura> => {
  const { data } = await httpClient.get<MatrizConductoresApi>(BASE, {
    params: { mes },
  });
  return aMatrizComun(data);
};

/** `PUT /transporte/turnos-conductores`. `null` limpia la celda. */
const editarCelda = async (
  conductorId: number,
  fecha: string,
  turno: string | null,
): Promise<void> => {
  await httpClient.put(BASE, { conductorId, fecha, turno });
};

/** `PUT …/lote`. Varias celdas en una transacción; devuelve lo omitido y por qué. */
const aplicarLote = async (celdas: CambioCelda[]): Promise<ResultadoLote> => {
  const { data } = await httpClient.put<{
    aplicadas: number;
    omitidas: { conductorId: number; fecha: string; motivo: string }[];
  }>(`${BASE}/lote`, {
    celdas: celdas.map((celda) => ({
      conductorId: celda.funcionarioId,
      fecha: celda.fecha,
      turno: celda.estado,
    })),
  });
  return {
    aplicadas: data.aplicadas,
    omitidas: data.omitidas.map((omitida) => ({
      funcionarioId: omitida.conductorId,
      fecha: omitida.fecha,
      motivo: omitida.motivo,
    })),
  };
};

/** `POST …/propuesta-rotacion`. Propone turnos para las celdas vacías; no escribe. */
const proponerRotacion = async (
  mes: string,
  conductorIds?: number[],
): Promise<PropuestaRotacion> => {
  const { data } = await httpClient.post<{
    propuestas: { conductorId: number; fecha: string; turno: string }[];
    conductores: number;
    omitidas: number;
  }>(`${BASE}/propuesta-rotacion`, { mes, conductorIds });
  return {
    propuestas: data.propuestas.map((propuesta) => ({
      funcionarioId: propuesta.conductorId,
      fecha: propuesta.fecha,
      estado: propuesta.turno,
    })),
    personas: data.conductores,
    omitidas: data.omitidas,
  };
};

/**
 * `POST …/propuesta-mes` (2026-10-06). Propone el mes según el patrón de rotación de cada conductor
 * y los mínimos por día. NO escribe: la matriz la aplica con el lote (y entra en «Deshacer»). Con
 * `rehacerTodo` el servidor rehace también lo ya cargado (nunca las ausencias).
 */
const proponerMes = async (
  mes: string,
  rehacerTodo: boolean,
): Promise<PropuestaMes> => {
  const { data } = await httpClient.post<{
    propuestas: { conductorId: number; fecha: string; turno: string }[];
    resumen: {
      celdasALlenar: number;
      diasBajoMinimo: PropuestaMes["resumen"]["diasBajoMinimo"];
      avisos: { conductorId: number; fecha: string; mensaje: string }[];
      parametrosSinConfigurar: string[];
    };
  }>(`${BASE}/propuesta-mes`, { mes, rehacerTodo });
  return {
    propuestas: data.propuestas.map((propuesta) => ({
      funcionarioId: propuesta.conductorId,
      fecha: propuesta.fecha,
      estado: propuesta.turno,
    })),
    resumen: {
      celdasALlenar: data.resumen.celdasALlenar,
      diasBajoMinimo: data.resumen.diasBajoMinimo,
      avisos: data.resumen.avisos.map((aviso) => ({
        funcionarioId: aviso.conductorId,
        fecha: aviso.fecha,
        mensaje: aviso.mensaje,
      })),
      parametrosSinConfigurar: data.resumen.parametrosSinConfigurar,
    },
  };
};

/** `POST …/publicar`. Marca el mes como publicado (informativo). */
const publicar = async (mes: string): Promise<ResultadoPublicar> => {
  const { data } = await httpClient.post<ResultadoPublicar>(
    `${BASE}/publicar`,
    { mes },
  );
  return data;
};

/**
 * `GET …/exportar?mes=AAAA-MM&formato=xlsx|pdf`. El reporte del mes, como `blob`. El servidor
 * responde 409 si el mes no está publicado; la pantalla ya no lo ofrece en ese caso.
 */
const exportar = async (
  mes: string,
  formato: "xlsx" | "pdf" = "xlsx",
): Promise<Blob> => {
  const { data } = await httpClient.get<Blob>(`${BASE}/exportar`, {
    params: { mes, formato },
    responseType: "blob",
  });
  return data;
};

export const TurnosConductoresService = {
  obtenerMatriz,
  editarCelda,
  aplicarLote,
  proponerRotacion,
  proponerMes,
  publicar,
  exportar,
};
