/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Asignación de transporte (línea de tiempo por conductor)
 * Archivo: planificacion.service.ts
 * Responsabilidad: Consumir la planificación por tramos, el optimizador, el fin del día, la hoja de
 *                  ruta y la operación diaria del vehículo (Fases 4 y 5).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * SOLO POR `httpClient` (regla 8). La DAF no escribe el operativo: escribe TRAMOS por sus propios
 * endpoints; `ActualizarTransporteDto` (conductor y placa) sigue siendo el de la bandeja heredada.
 * La hoja de ruta NO es la orden de movilización oficial: esa la emite —y la numera— el sistema de
 * órdenes de movilización. Aquí solo se descarga el insumo.
 */

import httpClient from "../api/httpClient";
import type {
  ChecklistVehiculo,
  GuardaFinal,
  Planificacion,
  PropuestaOptimizacion,
  ResultadoConfirmacion,
  ResultadoFinDelDia,
  ResultadoPriorizacion,
} from "../interfaces/Planificacion";
import type {
  EvaluacionDeVehiculos,
  RespuestaCompartibles,
  TramoPropio,
  ResultadoLiberacion,
} from "../interfaces/JornadaDaf";
import type { EstadoMantenimiento } from "../interfaces/Transporte";

const consultar = async (fecha: string): Promise<Planificacion> => {
  const { data } = await httpClient.get<Planificacion>(
    `/transporte/planificacion/${fecha}`,
  );
  return data;
};

const asignar = async (datos: {
  fecha: string;
  operativoIds: number[];
  tramoIds?: number[];
  conductorId: number;
  vehiculoId: number | null;
}): Promise<void> => {
  await httpClient.post("/transporte/tramos/asignar", datos);
};

/**
 * Las placas del día evaluadas para un conductor y un bloque (sustitución de flota, 2026-10-15).
 * No escribe: luego se asigna con `asignar` y la placa elegida.
 */
const evaluarVehiculos = async (datos: {
  fecha: string;
  operativoIds: number[];
  tramoIds?: number[];
  conductorId: number;
}): Promise<EvaluacionDeVehiculos> => {
  const { data } = await httpClient.post<EvaluacionDeVehiculos>(
    "/transporte/evaluar/vehiculos",
    datos,
  );
  return data;
};

const asignarTarea = async (
  tareaId: number,
  conductorId: number,
): Promise<void> => {
  await httpClient.post(`/transporte/tramos/tarea/${tareaId}/asignar`, {
    conductorId,
  });
};

/**
 * `DELETE …/asignacion` responde 200 con `{ liberados, aviso }` desde el 2026-10-19: si el tramo era
 * anfitrión de una unidad compartida, sus invitados quedaron sin conductor y el aviso lo dice. Un
 * servidor anterior respondía 204 sin cuerpo: entonces no hay nadie liberado.
 */
const quitar = async (tramoId: number): Promise<ResultadoLiberacion> => {
  const { data } = await httpClient.delete<ResultadoLiberacion | "" | undefined>(
    `/transporte/tramos/${tramoId}/asignacion`,
  );
  return data && typeof data === "object" ? data : { liberados: [], aviso: null };
};

/**
 * `POST /transporte/tramos/compartir` (2026-10-19): el invitado viaja con el conductor y la placa
 * del anfitrión. La DAF sigue escribiendo solo conductor y vehículo (RN-40).
 */
const compartir = async (
  operativoId: number,
  anfitrionOperativoId: number,
): Promise<ResultadoCompartir> => {
  const { data } = await httpClient.post<ResultadoCompartir>("/transporte/tramos/compartir", {
    operativoId,
    anfitrionOperativoId,
  });
  return data;
};

/**
 * Lo que devuelve «Compartir unidad»: con quién y, desde «la misma unidad» (2026-10-19), los
 * traslados sin pareja —hechos por la misma unidad o pendientes— y el aviso si quedó alguno.
 */
export interface ResultadoCompartir {
  compartidoCon: { operativoId: number; identificador: string };
  tramosPropios?: TramoPropio[];
  aviso?: string | null;
}

/** Con qué operativos ya asignados puede compartir unidad uno. No escribe. */
const compartibles = async (operativoId: number): Promise<RespuestaCompartibles> => {
  const { data } = await httpClient.get<RespuestaCompartibles>(
    `/transporte/tramos/${operativoId}/compartibles`,
  );
  return data;
};

const activar = async (
  fecha: string,
  conductorId: number,
  motivo: string,
): Promise<void> => {
  await httpClient.post("/transporte/activaciones", {
    fecha,
    conductorId,
    motivo,
  });
};

const desactivar = async (fecha: string, conductorId: number): Promise<void> => {
  await httpClient.delete(`/transporte/activaciones/${conductorId}`, {
    params: { fecha },
  });
};

const optimizar = async (
  fecha: string,
  activarLibres: boolean,
  compartirCarro: boolean,
): Promise<PropuestaOptimizacion> => {
  const { data } = await httpClient.post<PropuestaOptimizacion>(
    "/transporte/optimizar",
    { fecha, activarLibres, compartirCarro },
  );
  return data;
};

const confirmar = async (
  fecha: string,
  propuesta: PropuestaOptimizacion,
): Promise<ResultadoConfirmacion> => {
  const { data } = await httpClient.post<ResultadoConfirmacion>(
    "/transporte/optimizar/confirmar",
    {
      fecha,
      asignaciones: propuesta.asignaciones.map((a) => ({
        tramoIds: a.tramoIds,
        conductorId: a.conductorId,
        vehiculoId: a.vehiculoId,
      })),
      activaciones: propuesta.activaciones.map((a) => ({
        conductorId: a.conductorId,
        motivo: a.motivo,
      })),
      compartidos: propuesta.compartidos,
      // Solo va a la traza de la confirmación (2026-10-14): qué estrategia la produjo.
      estrategia: propuesta.estrategia,
    },
  );
  return data;
};

const pedirPriorizacion = async (
  operativoId: number,
  motivo?: string,
): Promise<ResultadoPriorizacion> => {
  const { data } = await httpClient.post<ResultadoPriorizacion>(
    "/transporte/priorizacion",
    {
      operativoId,
      opciones: ["PROPIOS_MEDIOS", "COMPARTIR", "LIBERAR_OTRO"],
      ...(motivo ? { motivo } : {}),
    },
  );
  return data;
};

const guardarFinDelDia = async (
  fecha: string,
  guardas: GuardaFinal[],
): Promise<ResultadoFinDelDia> => {
  const { data } = await httpClient.put<ResultadoFinDelDia>(
    `/transporte/fin-del-dia/${fecha}`,
    { guardas },
  );
  return data;
};

/** El PDF de la hoja de ruta (insumo de la orden de movilización oficial; sin número). */
const hojaDeRuta = async (fecha: string, vehiculoId: number): Promise<Blob> => {
  const { data } = await httpClient.get<Blob>(
    `/transporte/movilizacion/${fecha}/vehiculo/${vehiculoId}`,
    { responseType: "blob" },
  );
  return data;
};

const registrarChecklist = async (datos: ChecklistVehiculo): Promise<void> => {
  await httpClient.post("/transporte/checklist", datos);
};

const registrarKilometraje = async (datos: {
  fecha: string;
  vehiculoId: number;
  conductorId?: number;
  kilometraje: number;
}): Promise<void> => {
  await httpClient.post("/transporte/kilometraje", datos);
};

const registrarVale = async (datos: {
  fecha: string;
  conductorId: number;
  vehiculoId: number;
  monto: 10 | 20;
  numero?: string;
}): Promise<void> => {
  await httpClient.post("/transporte/vales", datos);
};

const cambiarEstadoMantenimiento = async (
  vehiculoId: number,
  mantenimientoId: number,
  estado: EstadoMantenimiento,
): Promise<void> => {
  await httpClient.patch(
    `/transporte/vehiculos/${vehiculoId}/mantenimiento/${mantenimientoId}/estado`,
    { estado },
  );
};

export const PlanificacionService = {
  consultar,
  asignar,
  evaluarVehiculos,
  asignarTarea,
  quitar,
  compartir,
  compartibles,
  activar,
  desactivar,
  optimizar,
  confirmar,
  pedirPriorizacion,
  guardarFinDelDia,
  hojaDeRuta,
  registrarChecklist,
  registrarKilometraje,
  registrarVale,
  cambiarEstadoMantenimiento,
};
