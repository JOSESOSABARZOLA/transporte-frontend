/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: planificarDia.util.ts
 * Responsabilidad: Decisiones puras del flujo: en qué paso se abre, a cuáles se puede ir, cuánto
 *                  falta para que abra la ventana y los textos cortos de cada fila.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL PASO NO SE GUARDA: SE DERIVA. `derivarPaso` es el ESPEJO de la política del servidor
 * (`politicas/jornada-daf.ts`). El resumen ya trae `pasoInicial`; esta copia existe para que la
 * pantalla recalcule el paso tras una escritura local sin volver a pedirlo, y la prueba la fija
 * caso por caso contra la tabla del contrato. Si el servidor la cambia, cambian las dos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { TurnoConductor } from "../interfaces/Planificacion.ts";
import type {
  ConductorJornada,
  OperativoJornada,
  Paso,
  ResumenJornadaDaf,
  SugerenciaGuarda,
  VehiculoParaElBloque,
} from "../interfaces/JornadaDaf.ts";
import { descripcionVisible } from "./flota.util.ts";
import { comoHoraInstitucional } from "./horario.util.ts";
import { NOMBRE_TURNO } from "./lineaTiempo.util.ts";
import { normalizar } from "./texto.util.ts";
import { nombreTipoTransporte } from "./tipoTransporte.util.ts";
import { minutosEnZona } from "./ventanaCarga.util.ts";

export const PASOS: readonly { numero: Paso; titulo: string }[] = [
  { numero: 1, titulo: "Preparar" },
  { numero: 2, titulo: "Asignar" },
  { numero: 3, titulo: "Fin del día" },
  { numero: 4, titulo: "Emitir" },
];

export interface DatosDelPaso {
  requisitosListos: boolean;
  operativos: number;
  cubiertos: number;
  vehiculosEnUso: number;
  vehiculosConGuarda: number;
  hojasEmitidas: boolean;
}

/** Lo que `derivarPaso` necesita, leído del resumen. */
export const datosDelPaso = (resumen: ResumenJornadaDaf): DatosDelPaso => {
  const conTramos = resumen.conductores.filter((c) => c.hojaRuta !== null);
  return {
    requisitosListos: resumen.preparacion.listos,
    operativos: resumen.totales.operativos,
    cubiertos: resumen.totales.cubiertos,
    vehiculosEnUso: resumen.finDelDia.length,
    vehiculosConGuarda: resumen.finDelDia.filter((f) => f.declarada !== null).length,
    hojasEmitidas:
      conTramos.length > 0 && conTramos.every((c) => c.hojaRuta?.estado === "EMITIDA"),
  };
};

/**
 * Espejo de `derivarPaso` del servidor: qué pasos están completos y en cuál se abre. Manda lo
 * MÁS AVANZADO de la jornada (ajuste del 2026-10-08: antes los requisitos se miraban primero y una
 * jornada ya asignada sin «vehículos confirmados» abría siempre en Preparar):
 *   4 hojas emitidas, o garaje confirmado para todos los vehículos en uso;
 *   3 asignaciones hechas (todo cubierto, o alguna guarda ya declarada);
 *   2 requisitos listos, o algo ya cubierto;
 *   1 en otro caso.
 */
export const derivarPaso = (
  datos: DatosDelPaso,
): { pasoInicial: Paso; completos: Record<Paso, boolean> } => {
  const guardaCompleta =
    datos.vehiculosEnUso > 0 && datos.vehiculosConGuarda >= datos.vehiculosEnUso;
  const completos: Record<Paso, boolean> = {
    1: datos.requisitosListos,
    2: datos.cubiertos > 0,
    3: guardaCompleta,
    4: datos.hojasEmitidas,
  };
  const asignacionesHechas =
    datos.cubiertos > 0 &&
    (datos.cubiertos >= datos.operativos || datos.vehiculosConGuarda > 0);
  let pasoInicial: Paso;
  if (datos.hojasEmitidas || guardaCompleta) pasoInicial = 4;
  else if (asignacionesHechas) pasoInicial = 3;
  else if (datos.requisitosListos || datos.cubiertos > 0) pasoInicial = 2;
  else pasoInicial = 1;
  return { pasoInicial, completos };
};

/**
 * ¿Se puede ir a este paso? Si ya se alcanzó —es ≤ el paso derivado de la jornada— o si TODOS los
 * anteriores están completos. Así se puede volver a cualquiera ya alcanzado (también al 1 con un
 * requisito pendiente) y nunca saltar a uno que todavía no se alcanzó.
 */
export const pasoAlcanzable = (
  paso: Paso,
  completos: Record<Paso, boolean>,
  pasoInicial: Paso = 1,
): boolean =>
  paso <= pasoInicial || PASOS.filter((p) => p.numero < paso).every((p) => completos[p.numero]);

/** Minutos de la ventana hasta abrir: «01:48». `null` si no hay hora o ya pasó. */
export const faltaParaAbrir = (
  horaApertura: string | null,
  zonaHoraria: string,
  ahora: Date = new Date(),
): string | null => {
  if (!horaApertura) return null;
  const [h, m] = horaApertura.split(":").map(Number);
  const restantes = h * 60 + m - minutosEnZona(zonaHoraria, ahora);
  if (restantes <= 0) return null;
  const horas = String(Math.floor(restantes / 60)).padStart(2, "0");
  const minutos = String(restantes % 60).padStart(2, "0");
  return `${horas}:${minutos}`;
};

/** «08H00–16H30». */
export const franja = (horaInicio: string, horaFin: string): string =>
  `${comoHoraInstitucional(horaInicio)}–${comoHoraInstitucional(horaFin)}`;

/** «08H00–16H30 · Calderón · Completo». */
export const detalleOperativo = (operativo: OperativoJornada): string =>
  [
    franja(operativo.horaInicio, operativo.horaFin),
    operativo.zonal,
    nombreTipoTransporte(operativo.tipoTransporte),
  ]
    .filter(Boolean)
    .join(" · ");

/** «Turno día» · «De libre» · «Sin turno». */
export const textoTurno = (turno: TurnoConductor | null): string => {
  if (!turno) return "Sin turno";
  if (turno === "LIBRE") return "De libre";
  return `Turno ${NOMBRE_TURNO[turno].toLowerCase()}`;
};

/** «Turno día · PMA7056». */
export const textoConductor = (conductor: Pick<ConductorJornada, "turno" | "placa">): string =>
  [textoTurno(conductor.turno), conductor.placa].filter(Boolean).join(" · ");

/** «5 conductores en uso · 5 vehículos disponibles · sin avisos». */
export const lineaDeDetalle = (totales: ResumenJornadaDaf["totales"]): string => {
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
  return [
    `${plural(totales.conductoresEnUso, "conductor", "conductores")} en uso`,
    `${plural(totales.vehiculosDisponibles, "vehículo disponible", "vehículos disponibles")}`,
    totales.avisos === 0
      ? "sin avisos"
      : `${plural(totales.avisos, "aviso", "avisos")} en los conductores`,
  ].join(" · ");
};

/** «OCFIJ-002 · termina 17H00 en Centro». */
export const textoUltimoOperativo = (sugerencia: SugerenciaGuarda): string => {
  const { identificador, horaFin, lugar } = sugerencia.ultimoOperativo;
  return [
    identificador,
    `termina ${comoHoraInstitucional(horaFin)}${lugar ? ` en ${lugar}` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
};

/**
 * Nombre visible de un garaje del catálogo (2026-10-08): «Calderón» → «Garaje Calderón». En el
 * catálogo varios garajes se llaman como su zona, y en «Se guarda en» se leían como una zonal. Si el
 * nombre ya empieza por «Garaje» (sin mirar tildes ni mayúsculas) se deja tal cual.
 */
export const nombreDeGaraje = (nombre: string): string => {
  const limpio = nombre.trim();
  return normalizar(limpio).startsWith("garaje") ? limpio : `Garaje ${limpio}`;
};

/** Valor del select «Se guarda en» para el parqueadero (no es un garaje del catálogo). */
export const PARQUEADERO = "PARQUEADERO";

export interface GuardaEnBorrador {
  /** Id del garaje como texto, o `PARQUEADERO`; "" = sin elegir. */
  destino: string;
  actaNumero: string;
}

/** Con parqueadero, el número de acta es obligatorio (Art. 8). */
export const faltaActa = (guarda: GuardaEnBorrador): boolean =>
  guarda.destino === PARQUEADERO && guarda.actaNumero.trim() === "";

/** Lo que el paso 3 deja guardar: todo vehículo con destino y, si es parqueadero, con acta. */
export const guardasCompletas = (guardas: readonly GuardaEnBorrador[]): boolean =>
  guardas.every((g) => g.destino !== "" && !faltaActa(g));

// ─────────────────────────── Sustitución de flota (2026-10-15) ───────────────────────────

/**
 * Por qué una placa NO se puede elegir, en pocas palabras para la opción del desplegable: «en
 * taller», «ocupada por ZAMORA ANA 09H00–11H00». Si el motivo no es de la placa, la frase del
 * servidor tal cual (regla 7). `null` si se puede elegir.
 */
export const motivoPlacaNoElegible = (vehiculo: VehiculoParaElBloque): string | null => {
  if (vehiculo.estado !== "DURO") return null;
  if (vehiculo.ocupadaPor) {
    const quien = vehiculo.ocupadaPor.nombre ?? "otro conductor";
    return `ocupada por ${quien} ${franja(vehiculo.ocupadaPor.horaInicio, vehiculo.ocupadaPor.horaFin)}`;
  }
  const duros = vehiculo.motivos.filter((m) => m.tipo === "DURO");
  if (duros.some((m) => m.codigo === "VEHICULO_EN_TALLER")) return "en taller";
  return duros[0]?.mensaje ?? "no disponible";
};

/** «PMA-3370 · Camioneta doble cabina (4 asientos)», y « — en taller» si no se puede elegir. */
export const textoOpcionVehiculo = (vehiculo: VehiculoParaElBloque): string => {
  const descripcion = descripcionVisible(vehiculo);
  const asientos =
    vehiculo.asientos === null
      ? ""
      : ` (${vehiculo.asientos} ${vehiculo.asientos === 1 ? "asiento" : "asientos"})`;
  const motivo = motivoPlacaNoElegible(vehiculo);
  return `${vehiculo.placa}${descripcion ? ` · ${descripcion}` : ""}${asientos}${
    motivo ? ` — ${motivo}` : ""
  }`;
};
