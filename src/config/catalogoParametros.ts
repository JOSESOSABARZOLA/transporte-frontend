/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: catalogoParametros.ts
 * Responsabilidad: Agrupar los parámetros de política y darles un nombre humano y lo que afectan.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * SOLO PRESENTACIÓN. El valor, el rango, la descripción y la siembra vienen del servidor; aquí va
 * lo que el servidor no sabe decir: en qué sección se lee cada clave, cómo se llama para una
 * persona y qué pantallas cambian si se mueve («Afecta: …», del mapa de consumidores del backend).
 *
 * UNA CLAVE SIN ENTRADA NO SE PIERDE: cae en «Otros» con su código y la descripción del servidor.
 * Así, un parámetro nuevo aparece en la pantalla aunque nadie haya tocado este archivo.
 *
 * NOMBRES QUE SE CONFUNDEN: `JORNADA_MAXIMA_HORAS` es del PERSONAL DEL CUADRO y
 * `DAF_MAX_JORNADA_HORAS` es del CONDUCTOR DAF; la etiqueta lo dice en las dos.
 */

export type IdGrupoParametros =
  | "cuadro"
  | "carga"
  | "franjas"
  | "dafTramos"
  | "dafTraslados"
  | "dafTurnos"
  | "dafFlota"
  | "dafOptimizador"
  | "otros";

export interface GrupoParametros {
  id: IdGrupoParametros;
  titulo: string;
  /** El resumen gris a la derecha de la cabecera. */
  resumen: string;
  /** Un enlace en la cabecera («Ver matriz de traslados →»). */
  enlace?: { texto: string; ruta: string };
}

export interface EntradaCatalogo {
  grupo: IdGrupoParametros;
  etiqueta: string;
  afecta: string[];
}

/** Las secciones, en el orden en que se muestran. «Otros» va siempre al final. */
export const GRUPOS_PARAMETROS: GrupoParametros[] = [
  {
    id: "cuadro",
    titulo: "Cuadro de colores · Jornada y descanso",
    resumen: "Quién puede salir y cuánto",
  },
  {
    id: "carga",
    titulo: "Carga y fatiga",
    resumen: "Índice de carga y semáforo",
  },
  {
    id: "franjas",
    titulo: "Franjas y turnos del personal",
    resumen: "Horas del día",
  },
  {
    id: "dafTramos",
    titulo: "Transporte DAF · Tramos y jornada del conductor",
    resumen: "Planificar el día",
  },
  {
    id: "dafTraslados",
    titulo: "Transporte DAF · Traslados",
    resumen: "Regla general",
    enlace: {
      texto: "Ver matriz de traslados →",
      ruta: "/administracion/traslados",
    },
  },
  {
    id: "dafTurnos",
    titulo: "Transporte DAF · Turnos del mes",
    resumen: "Propuesta mensual",
  },
  {
    id: "dafFlota",
    titulo: "Transporte DAF · Flota y fin del día",
    resumen: "Flota y garajes",
  },
  {
    id: "dafOptimizador",
    titulo: "Transporte DAF · Optimizador",
    resumen: "Costos del armado automático",
  },
  { id: "otros", titulo: "Otros", resumen: "Sin sección asignada" },
];

const REGISTRO = "Registro de operativo";
const PLANIFICAR = "Planificar el día";
const JORNADA_DAF = "Jornada DAF";
const COBERTURA = "Cobertura de Instrucción";
const TURNOS = "Turnos de conductores";
const FLOTA = "Flota y garajes";

const en = (
  grupo: IdGrupoParametros,
  etiqueta: string,
  afecta: string[],
): EntradaCatalogo => ({
  grupo,
  etiqueta,
  afecta,
});

/** Una entrada por clave. Lo que no esté aquí cae en «Otros». */
export const CATALOGO_PARAMETROS: Record<string, EntradaCatalogo> = {
  // ── Cuadro de colores · Jornada y descanso ──
  JORNADA_MAXIMA_HORAS: en(
    "cuadro",
    "Horas máximas por jornada · personal del cuadro",
    [REGISTRO],
  ),
  TOPE_SALIDAS_PESADAS: en("cuadro", "Tope de salidas pesadas", [REGISTRO]),
  PERIODO_COMPUTO_SALIDAS: en("cuadro", "Período del tope de salidas", [
    REGISTRO,
  ]),
  DIAS_DESCANSO_PATRULLA: en("cuadro", "Días de descanso tras una patrulla", [
    REGISTRO,
  ]),
  HORA_LIMITE_CUADRO: en("cuadro", "Hora límite del cuadro", [
    "Matriz consolidada",
  ]),
  MIS_OPERATIVOS_RANGO_MAX_DIAS: en(
    "cuadro",
    "Días máximos por consulta en Mis operativos",
    ["Mis operativos"],
  ),

  // ── Carga y fatiga ──
  PERIODO_EQUIDAD: en("carga", "Período de reparto de la carga", [REGISTRO]),
  EQUIDAD_MARGEN: en("carga", "Margen de equidad", [REGISTRO]),
  FATIGA_UMBRAL_AMBAR: en("carga", "Índice de fatiga · paso a ámbar", [
    REGISTRO,
  ]),
  FATIGA_UMBRAL_ROJO: en("carga", "Índice de fatiga · paso a rojo", [REGISTRO]),
  PESO_HORAS_DIA: en("carga", "Peso de cada hora del día", [REGISTRO]),
  PESO_SALIDAS_PESADAS: en("carga", "Peso de cada salida pesada", [REGISTRO]),
  PESO_PATRULLA_RECIENTE: en("carga", "Peso de una patrulla reciente", [
    REGISTRO,
  ]),
  PESO_CARGA_PERIODO: en("carga", "Peso de la carga acumulada del período", [
    REGISTRO,
  ]),

  // ── Franjas y turnos del personal ──
  FRANJA_NOCTURNA_INICIO: en("franjas", "Inicio de la franja nocturna", [
    REGISTRO,
  ]),
  FRANJA_NOCTURNA_FIN: en("franjas", "Fin de la franja nocturna", [REGISTRO]),
  HORA_TURNO_DIURNO_INICIO: en(
    "franjas",
    "Inicio del turno diurno · Instrucción",
    [COBERTURA, REGISTRO],
  ),
  HORA_TURNO_DIURNO_FIN: en("franjas", "Fin del turno diurno · Instrucción", [
    COBERTURA,
    REGISTRO,
  ]),
  HORA_TURNO_NOCTURNO_INICIO: en(
    "franjas",
    "Inicio del turno nocturno · Instrucción",
    [COBERTURA, REGISTRO],
  ),
  HORA_TURNO_NOCTURNO_FIN: en(
    "franjas",
    "Fin del turno nocturno · Instrucción",
    [COBERTURA, REGISTRO],
  ),
  COBERTURA_MAX_DIAS_SIN_DESCANSO: en(
    "franjas",
    "Días seguidos sin descanso · Instrucción",
    [COBERTURA],
  ),
  COBERTURA_PERMITE_NOCTURNO_A_DIURNO: en(
    "franjas",
    "Diurno al día siguiente de un nocturno",
    [COBERTURA],
  ),

  // ── Transporte DAF · Tramos y jornada del conductor ──
  INICIO_JORNADA_TRANSPORTE: en(
    "dafTramos",
    "Inicio de la línea de tiempo del transporte",
    [PLANIFICAR, JORNADA_DAF],
  ),
  DAF_DURACION_TRAMO_MIN: en("dafTramos", "Duración de un tramo", [
    PLANIFICAR,
    JORNADA_DAF,
  ]),
  DAF_DURACION_DEJAR_MIN: en("dafTramos", "Duración del tramo de dejar", [
    PLANIFICAR,
    JORNADA_DAF,
  ]),
  DAF_DURACION_RETIRAR_MIN: en("dafTramos", "Duración del tramo de retirar", [
    PLANIFICAR,
    JORNADA_DAF,
  ]),
  DAF_MAX_JORNADA_HORAS: en("dafTramos", "Jornada máxima · conductor DAF", [
    PLANIFICAR,
    JORNADA_DAF,
  ]),
  DAF_JORNADA_AVISO_HORAS: en(
    "dafTramos",
    "Jornada con aviso · conductor DAF",
    [PLANIFICAR, JORNADA_DAF],
  ),
  DAF_DESCANSO_MIN_HORAS: en(
    "dafTramos",
    "Descanso mínimo entre días · conductor DAF",
    [PLANIFICAR, JORNADA_DAF],
  ),
  DAF_HUECO_MINIMO_MIN: en("dafTramos", "Hueco libre aprovechable", [
    PLANIFICAR,
    JORNADA_DAF,
  ]),
  MINUTOS_TOLERANCIA_FIN_CONDUCTOR: en(
    "dafTramos",
    "Tolerancia al fin de la jornada laboral · conductor",
    [PLANIFICAR, JORNADA_DAF],
  ),
  HORA_TURNO_CONDUCTOR_DIA_INICIO: en(
    "dafTramos",
    "Inicio del turno DÍA · conductor",
    [PLANIFICAR, TURNOS],
  ),
  HORA_TURNO_CONDUCTOR_DIA_FIN: en(
    "dafTramos",
    "Fin del turno DÍA · conductor",
    [PLANIFICAR, TURNOS],
  ),
  HORA_TURNO_CONDUCTOR_NOCHE_INICIO: en(
    "dafTramos",
    "Inicio del turno NOCHE · conductor",
    [PLANIFICAR, TURNOS],
  ),
  HORA_TURNO_CONDUCTOR_NOCHE_FIN: en(
    "dafTramos",
    "Fin del turno NOCHE · conductor",
    [PLANIFICAR, TURNOS],
  ),
  HORA_TURNO_CONDUCTOR_ECU_NOCHE_INICIO: en(
    "dafTramos",
    "Inicio del turno ECU NOCHE · conductor",
    [PLANIFICAR, TURNOS],
  ),
  HORA_TURNO_CONDUCTOR_ECU_NOCHE_FIN: en(
    "dafTramos",
    "Fin del turno ECU NOCHE · conductor",
    [PLANIFICAR, TURNOS],
  ),

  // ── Transporte DAF · Traslados ──
  TRASLADO_MISMA_ZONA_MIN: en(
    "dafTraslados",
    "Traslado dentro de la misma zonal",
    [PLANIFICAR, JORNADA_DAF],
  ),
  TRASLADO_MISMO_SECTOR_MIN: en(
    "dafTraslados",
    "Traslado entre zonales del mismo sector",
    [PLANIFICAR, JORNADA_DAF],
  ),
  TRASLADO_OTRO_SECTOR_MIN: en(
    "dafTraslados",
    "Traslado entre sectores distintos",
    [PLANIFICAR, JORNADA_DAF],
  ),

  // ── Transporte DAF · Turnos del mes ──
  DAF_MIN_CONDUCTORES_DIA: en(
    "dafTurnos",
    "Mínimo de conductores en turno DÍA",
    [TURNOS],
  ),
  DAF_MIN_CONDUCTORES_NOCHE: en(
    "dafTurnos",
    "Mínimo de conductores en turno NOCHE",
    [TURNOS],
  ),
  DAF_MAX_DIAS_SIN_LIBRE: en("dafTurnos", "Días seguidos sin un LIBRE", [
    TURNOS,
  ]),
  DAF_PERMITE_NOCHE_A_DIA: en(
    "dafTurnos",
    "Turno DÍA al día siguiente de una NOCHE",
    [TURNOS],
  ),

  // ── Transporte DAF · Flota y fin del día ──
  DAF_DIAS_AVISO_VENCIMIENTO: en(
    "dafFlota",
    "Aviso de vencimiento de matrícula o SOAT",
    [FLOTA],
  ),
  DAF_KM_MAXIMO: en("dafFlota", "Kilometraje máximo de un vehículo", [FLOTA]),
  GUARDA_HORA_TARDE: en("dafFlota", "Hora desde la que un cierre es tarde", [
    PLANIFICAR,
  ]),
  DURACION_TAREA_TALLER_MIN: en("dafFlota", "Duración de «Llevar a taller»", [
    PLANIFICAR,
    FLOTA,
  ]),
  COMPARTIR_VENTANA_MIN: en(
    "dafFlota",
    "Diferencia máxima para compartir carro",
    [PLANIFICAR, REGISTRO],
  ),

  // ── Transporte DAF · Optimizador ──
  COSTO_PENALIZACION_AVISO: en("dafOptimizador", "Costo de cada aviso", [
    PLANIFICAR,
  ]),
  COSTO_ACTIVAR_LIBRE: en(
    "dafOptimizador",
    "Costo de activar a un conductor libre",
    [PLANIFICAR],
  ),
  COSTO_ARRANQUE_LEJOS: en(
    "dafOptimizador",
    "Costo de arrancar lejos del vehículo",
    [PLANIFICAR],
  ),
};
