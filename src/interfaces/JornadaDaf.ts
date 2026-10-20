/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: JornadaDaf.ts
 * Responsabilidad: Tipos del resumen de la jornada DAF, los candidatos por operativo, la simulación
 *                  de libres, los vehículos que salen, la emisión de hojas de ruta y las horas
 *                  libres del día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * Espejo de `transporte-backend/docs/CONTRATO-planificar-dia.md`. Las horas viajan «HH:MM»; los
 * textos que el servidor ya redacta (títulos, detalles, motivos) vienen en notación 08H00 y se
 * muestran tal cual (regla 7).
 */

import type { TurnoConductor } from "./Planificacion.ts";

export type Paso = 1 | 2 | 3 | 4;

export type ClaveRequisito = "CUADRO" | "TURNOS" | "CONDUCTORES" | "VEHICULOS" | "VENTANA";

export type AccionRequisito =
  | { tipo: "VER_MATRIZ" }
  | { tipo: "IR_TURNOS" }
  | { tipo: "COMPLETAR_CONDUCTOR"; conductorId: number }
  | { tipo: "CONFIRMAR_VEHICULOS" }
  | { tipo: "CORREGIR_VEHICULOS" };

export interface Requisito {
  clave: ClaveRequisito;
  /** `ESPERA` solo en la ventana (aún no abre). */
  estado: "OK" | "PENDIENTE" | "ESPERA";
  titulo: string;
  detalle: string;
  accion: AccionRequisito | null;
}

export type FaltaConductor = "sector" | "contrato" | "parqueadero";

export interface OperativoJornada {
  id: number;
  identificador: string;
  formulario: string;
  horaInicio: string;
  horaFin: string;
  zonal: string | null;
  zonalId: number | null;
  tipoTransporte: "COMPLETO" | "SOLO_INICIO" | "SOLO_FIN" | "INICIO_Y_FIN";
  esMacrooperativo: boolean;
  /**
   * Compartir unidad (2026-10-19): con qué operativo pidió viajar quien registró, y por qué pidió
   * vehículo exclusivo. Opcionales: un servidor anterior no los envía.
   */
  compartirCon?: { id: number; identificador: string } | null;
  justificacionExclusivo?: string | null;
  transporteLiberado: boolean;
  personas: number;
  cubierto: boolean;
  parcial: boolean;
  tramos: {
    id: number;
    tipo: "DEJAR" | "RETIRAR" | "COMPLETO" | "TAREA";
    horaInicio: string;
    horaFin: string;
    conductorId: number | null;
    conductor: string | null;
    vehiculoId: number | null;
    placa: string | null;
    /** Viaja en la unidad de otro operativo (compartir unidad): su identificador, o `null`. */
    compartidoCon?: string | null;
  }[];
  conductores: { id: number; nombre: string }[];
  placas: string[];
}

export type EstadoHojaRuta = "PENDIENTE" | "EMITIDA" | "PENDIENTE_CAMBIO";

export interface AvisoCarril {
  codigo: string;
  mensaje: string;
  tipo: "DURO" | "AVISO";
}

export interface ConductorJornada {
  id: number;
  nombre: string;
  turno: TurnoConductor | null;
  activado: boolean;
  ausente: boolean;
  vehiculoId: number | null;
  placa: string | null;
  vehiculoIds: number[];
  tramoIds: number[];
  avisos: AvisoCarril[];
  /** `null` = sin tramos ese día: no hay hoja que emitir. */
  hojaRuta: { estado: EstadoHojaRuta; emitidaEn: string | null } | null;
}

export interface VehiculoDelDia {
  id: number;
  placa: string;
  tipo: string | null;
  enTaller: boolean;
  /** `null` = todavía sin confirmar. */
  sale: boolean | null;
  enUso?: boolean;
}

export interface SugerenciaGuarda {
  vehiculoId: number;
  placa: string;
  tipo: "GARAJE";
  ubicacionId: number | null;
  ubicacion: string | null;
  conductorId: number | null;
  conductor: string | null;
  tarde: boolean;
  motivo: string;
  continuidad: string;
  avisoCombustible: boolean;
  ultimoOperativo: { identificador: string | null; horaFin: string; lugar: string | null };
  parqueadero: { autorizado: boolean; actaVigente: boolean };
  declarada: {
    tipo: string | null;
    ubicacion: string | null;
    ubicacionId: number | null;
    conductorId: number | null;
    actaNumero: string | null;
  } | null;
}

export interface ResumenJornadaDaf {
  fecha: string;
  pasos: { pasoInicial: Paso; completos: Record<Paso, boolean> };
  preparacion: {
    requisitos: Requisito[];
    listos: boolean;
    pendientes: number;
    conductoresIncompletos: { id: number; nombre: string; faltan: FaltaConductor[] }[];
  };
  ventana: {
    abierta: boolean;
    horaApertura: string | null;
    horaCierre: string | null;
    mensaje: string;
    zonaHoraria: string;
  };
  totales: {
    operativos: number;
    cubiertos: number;
    sinConductor: number;
    propiosMedios: number;
    conductoresEnUso: number;
    libresEnUso: number;
    vehiculosDisponibles: number;
    vehiculosEnUso: number;
    enTaller: number;
    avisos: number;
  };
  operativos: OperativoJornada[];
  conductores: ConductorJornada[];
  vehiculos: {
    flota: number;
    confirmada: boolean;
    confirmadaEn: string | null;
    lista: VehiculoDelDia[];
  };
  finDelDia: SugerenciaGuarda[];
  /** Opciones de «Se guarda en» (2026-10-08): SOLO garajes autorizados y activos, por nombre. */
  garajes: GarajeAutorizado[];
}

export interface GarajeAutorizado {
  id: number;
  nombre: string;
}

/**
 * `COMPARTE` (2026-10-21): «ocupado» solo porque ya hace un traslado con el que este operativo puede
 * viajar en su misma unidad (el «completo» que deja y retira en su punto). Se toma con «Compartir unidad».
 */
export type CategoriaCandidato =
  | "DISPONIBLE"
  | "COMPARTE"
  | "FUERA_TURNO"
  | "OCUPADO"
  | "LIBRE_INACTIVO";

export interface Candidato {
  conductorId: number;
  nombre: string;
  turno: TurnoConductor | null;
  vehiculoId: number | null;
  placa: string | null;
  categoria: CategoriaCandidato;
  motivo: string;
  avisos: string[];
  actual: boolean;
  asignable: boolean;
  /** Con `COMPARTE`: el operativo cuya unidad se comparte (`POST /transporte/tramos/compartir`). */
  compartirCon?: { operativoId: number; identificador: string } | null;
}

/**
 * Sustitución de flota (2026-10-15). Espejo de `POST /transporte/evaluar/vehiculos`
 * (`transporte-backend/docs/CONTRATO-sustitucion-flota.md`): cada placa activa del día evaluada
 * para UN conductor y UN bloque. `DURO` = asignarla daría 409; se muestra deshabilitada con su
 * motivo. El servidor la ordena: la propuesta primero, luego OK → AVISO → DURO.
 */
export interface MotivoVehiculo {
  codigo: string;
  mensaje: string;
  tipo: "DURO" | "AVISO";
}

export interface VehiculoParaElBloque {
  vehiculoId: number;
  placa: string;
  descripcion: string | null;
  tipo: string | null;
  asientos: number | null;
  propuesto: boolean;
  estado: "OK" | "AVISO" | "DURO";
  motivos: MotivoVehiculo[];
  ocupadaPor: {
    conductorId: number | null;
    nombre: string | null;
    horaInicio: string;
    horaFin: string;
  } | null;
}

export interface EvaluacionDeVehiculos {
  conductorId: number;
  /** La placa que el diálogo ya proponía; `null` = ninguna. */
  propuestoId: number | null;
  vehiculos: VehiculoParaElBloque[];
}

export interface RespuestaCandidatos {
  operativo: {
    id: number;
    identificador: string;
    formulario: string;
    horaInicio: string;
    horaFin: string;
    zonal: string | null;
    tipoTransporte: string;
    esMacrooperativo: boolean;
    compartirCon?: { id: number; identificador: string } | null;
    justificacionExclusivo?: string | null;
  };
  actual: { conductorId: number; nombre: string } | null;
  candidatos: Candidato[];
}

export interface Simulacion {
  simulacion: true;
  total: number;
  cubiertosSinLibres: number;
  cubiertosConLibres: number;
  sugerencia: {
    aplica: boolean;
    pendientesSinLibres: number;
    operativosExtra: number;
    libres: { conductorId: number; nombre: string }[];
  };
}

export interface VehiculosJornada {
  fecha: string;
  confirmada: boolean;
  vehiculos: VehiculoDelDia[];
}

export interface RespuestaEmision {
  emitidas: number;
  hojas: { conductorId: number; estado: "EMITIDA"; emitidaEn: string }[];
}

/**
 * Horas libres (2026-10-14). Espejo de `transporte-backend/docs/CONTRATO-huecos-libres.md`: la
 * ventana en la que un recurso puede trabajar, menos sus tramos ocupados. El servidor las calcula
 * en cada consulta; aquí solo se dibujan.
 */
export interface LugarHueco {
  zonalId: number | null;
  sector: string | null;
  sinSector?: boolean;
}

export interface HuecoLibre {
  /** «HH:MM» del reloj; `horaFin` puede ser menor que `horaInicio` (cruza la medianoche). */
  horaInicio: string;
  horaFin: string;
  /** Minutos desde `inicioJornada`: la misma escala de la línea de tiempo. */
  franja: { inicio: number; fin: number };
  brutoMin: number;
  /** El mejor caso: descuenta el traslado mínimo por cada lado con tramo vecino. */
  utilMinimoMin: number;
  /** Solo si se pidió una zonal de destino. */
  aprovechableMin: number | null;
  desde: LugarHueco | null;
  hacia: LugarHueco | null;
  /** Fuera de la ventana de su turno. */
  horasExtra: boolean;
}

export interface HuecosConductor {
  conductorId: number;
  nombre: string;
  turno: TurnoConductor | null;
  ventana: { inicio: number; fin: number } | null;
  ventanaTurno: { inicio: number; fin: number } | null;
  huecos: HuecoLibre[];
}

export interface RespuestaHuecos {
  fecha: string;
  inicioJornada: string;
  /** `DAF_HUECO_MINIMO_MIN`: por debajo, el hueco no se muestra. */
  minimoMin: number;
  zonalDestino: { id: number; nombre: string; sector: string | null } | null;
  conductores: HuecosConductor[];
  vehiculos: {
    vehiculoId: number;
    placa: string;
    enTaller: boolean;
    huecos: HuecoLibre[];
  }[];
}

export interface FiltrosHuecos {
  conductorId?: number;
  vehiculoId?: number;
  zonalId?: number;
}

/**
 * `GET /transporte/tramos/:operativoId/compartibles` (2026-10-19, compartir unidad). Un operativo
 * del día que ya tiene conductor y placa, evaluado con la misma regla que «Compartir unidad» (con
 * asientos). Los incompatibles cercanos llegan con su motivo, para mostrarlos apagados.
 */
export interface AnfitrionCompartible {
  operativoId: number;
  identificador: string;
  formulario: string;
  horaInicio: string;
  horaFin: string;
  conductor: { id: number; nombre: string };
  vehiculo: { id: number; placa: string; asientos: number | null };
  /** Asientos libres en el momento más lleno de la unidad; `null` si la placa no los tiene registrados. */
  asientosLibres: number | null;
  /**
   * Los asientos de cada momento con este operativo a bordo (2026-10-21): uno por tipo de traslado.
   * Vacío si no es compatible.
   */
  asientosPorMomento?: { tipo: string; hora: string; ocupados: number }[];
  /** Lo pidió quien registró el operativo. Va primero. */
  solicitado: boolean;
  compatible: boolean;
  motivo: string | null;
  /** «La misma unidad» (2026-10-19): traslados que harían juntos y los que quedan propios. */
  comparte?: string[];
  propios?: string[];
  /** ¿Puede esa misma unidad hacer los propios? `null` si no hay propios. */
  propiosViables?: boolean | null;
  /** Por qué no puede hacerlos (la política con esa placa). */
  motivoPropios?: string | null;
  /**
   * «Completo» comparte unidad (2026-10-20): `ABARCA` si el «completo» del invitado abarca los
   * traslados de la unidad, `DENTRO` si el invitado viaja dentro del «completo» de la unidad.
   */
  completo?: "ABARCA" | "DENTRO" | null;
  /**
   * Las personas del momento más lleno de la unidad con este operativo (2026-10-21, los asientos se
   * cuentan por momento). `null` si no es compatible.
   */
  personasConInvitado?: number | null;
  /**
   * Lo que va DENTRO del «completo» (2026-10-20): con ABARCA, los traslados de la unidad que el
   * «completo» del invitado cubre; con DENTRO, los del invitado. Con «completo», `comparte` queda vacío.
   */
  contiene?: string[];
}

/** Un traslado del invitado sin pareja al compartir: si lo hizo la misma unidad o quedó pendiente. */
export interface TramoPropio {
  tramoId: number;
  tipo: string;
  asignado: boolean;
  motivo?: string;
}

export interface RespuestaCompartibles {
  operativoId: number;
  identificador: string;
  solicitado: { operativoId: number; identificador: string } | null;
  anfitriones: AnfitrionCompartible[];
}

/** Operativos que viajaban en una unidad y quedaron sin conductor al quitar o reasignar al anfitrión. */
export interface ResultadoLiberacion {
  liberados: { operativoId: number; identificador: string }[];
  aviso: string | null;
}
