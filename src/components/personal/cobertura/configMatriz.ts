/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz mensual de turnos (Instrucción y conductores)
 * Archivo: configMatriz.ts
 * Responsabilidad: El contrato de configuración de `MatrizCobertura` y la de Instrucción.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * `MatrizCobertura` nació para Instrucción. Desde el 2026-10-06 la reutilizan los TURNOS DE
 * CONDUCTORES de la DAF: lo que difiere entre las dos —estados, textos, agrupación, servicio,
 * columnas de totales, horarios tipo— entra por esta configuración. La de Instrucción es el valor
 * por omisión.
 *
 * SIMPLIFICADA EL 2026-10-24 (cobertura para el uso diario): las dos configuraciones comparten ya
 * la misma plantilla, así que se retiraron las banderas de aspecto (`plantillaEstandar`,
 * `subtotalCompacto`, `cerosAtenuados`), el banner azul y la ayuda del patrón libre.
 */

import { CoberturaService } from "../../../services/cobertura.service.ts";
import type {
  CambioCelda,
  MatrizCobertura,
  PropuestaMes,
  PropuestaRotacion,
  ResultadoLote,
  ResultadoPublicar,
} from "../../../interfaces/Cobertura.ts";
import { PATRONES_RAPIDOS } from "../../../utils/cobertura.util.ts";
import type { EstadoMatriz } from "../../../utils/matrizTurnos.util.ts";

/**
 * Lo que la matriz pide al servidor. Firmas de MÉTODO (no propiedades) a propósito: TypeScript las
 * compara con bivarianza, así un servicio que tipa el estado más estrecho (Instrucción) encaja.
 */
export interface ServicioMatriz {
  obtenerMatriz(mes: string): Promise<MatrizCobertura>;
  editarCelda(id: number, fecha: string, estado: string | null): Promise<void>;
  aplicarLote(celdas: CambioCelda[]): Promise<ResultadoLote>;
  proponerRotacion(mes: string, ids?: number[]): Promise<PropuestaRotacion>;
  publicar(mes: string): Promise<ResultadoPublicar>;
  /** El reporte del mes. Instrucción solo exporta Excel y no mira el formato. */
  exportar(mes: string, formato?: FormatoReporte): Promise<Blob>;
  /**
   * «Generar propuesta del mes» (2026-10-06). OPCIONAL: solo los turnos de conductores la tienen.
   * Si está, la matriz ofrece el botón. No escribe: lo propuesto se aplica con el lote.
   */
  proponerMes?(mes: string, rehacerTodo: boolean): Promise<PropuestaMes>;
}

/** Formatos del reporte exportado. */
export type FormatoReporte = "xlsx" | "pdf";

/** Un estado editable con su color (token del tema, regla 2) y lo que significa en palabras. */
export interface EstadoConEstilo extends EstadoMatriz {
  clase: string;
  /** La leyenda en lenguaje simple: «D Diurno: sale de día». */
  significado: string;
  /** Nombre accesible del botón de la barra de selección si la letra no es legible («—»). */
  etiquetaBoton?: string;
}

/** Un estado de ausencia (viene de la disponibilidad; no se edita en la matriz). */
export interface EstadoAusencia {
  valor: string;
  letra: string;
  nombre: string;
  clase: string;
}

/** Un horario tipo del cajón «Asignar turnos»: un ciclo que se repite. */
export interface PatronRapido {
  /** En español, como se lee en la tarjeta: «5 de día + 2 de descanso». */
  nombre: string;
  /** La línea bajo el nombre: «Ciclo de 7 días». */
  descripcion: string;
  /** Las teclas del ciclo: «DDDDD--». */
  patron: string;
}

export interface ConfigMatriz {
  /** Contexto en el subtítulo de sus cajones («Cobertura por turnos» / «Turnos de conductores»). */
  contexto: string;
  sujeto: {
    singular: string;
    plural: string;
    /** Encabezado de la columna fija. */
    columna: string;
    /** Texto guía del buscador (y su nombre accesible). */
    buscar: string;
  };
  grupo: {
    singular: string;
    plural: string;
    sinGrupo: string;
    /** Nombre accesible del filtro. */
    filtro: string;
  };
  /** Qué significa la matriz, sin repetir la leyenda: va en la nota al pie. */
  explicacion: string;
  /** Nota que se suma a la explicación (p. ej. quién la carga y cuándo). */
  nota?: string;
  /** Qué significa publicar con celdas vacías. Sin él, la frase de Instrucción. */
  consecuenciaVacias?: string;
  vacio: string;
  cargando: string;
  /** «Cobertura» → aria-label «Cobertura de octubre de 2026». */
  nombreGrilla: string;
  estados: EstadoConEstilo[];
  ausencias: EstadoAusencia[];
  /** «Lunes a viernes de día»: el estado de los días hábiles y el de sábado y domingo. */
  estadoDia: string;
  estadoDescanso: string;
  /**
   * Filas del pie: un estado con su rótulo y la clave del atributo `data-total`. `principal` va
   * siempre a la vista; el resto, tras «Ver todos los totales». `minimo` dice qué marca de
   * `bajoMinimo` del servidor resalta esa fila (solo la DAF).
   */
  pie: {
    valor: string;
    clave: string;
    rotulo: string;
    principal?: boolean;
    minimo?: "dia" | "noche";
  }[];
  patronesRapidos: PatronRapido[];
  conDenominacion: boolean;
  conCambiarGrupo: boolean;
  nombreArchivo: (mes: string, formato?: FormatoReporte) => string;
  servicio: ServicioMatriz;
  /**
   * Opciones de los turnos de conductores (2026-10-06), APAGADAS en Instrucción:
   *   · `copiarMesAnterior`: con el mes vacío, el estado vacío ofrece además «Copiar mes anterior».
   *   · `exportarPublicado`: «Exportar Excel» y «Exportar PDF», que solo se habilitan con el mes
   *     publicado (el reporte es lo publicado; el servidor responde 409 si no).
   *   · `rutaParametros`: a dónde lleva «Parámetros sin configurar» en la propuesta del mes.
   */
  copiarMesAnterior?: boolean;
  exportarPublicado?: boolean;
  rutaParametros?: string;
}

/** La configuración de la cobertura de Instrucción. */
export const CONFIG_INSTRUCCION: ConfigMatriz = {
  contexto: "Cobertura por turnos",
  sujeto: {
    singular: "persona",
    plural: "personas",
    columna: "Persona",
    buscar: "Buscar persona por apellido o nombre",
  },
  grupo: {
    singular: "zona",
    plural: "zonas",
    sinGrupo: "Sin zona",
    filtro: "Zona",
  },
  explicacion:
    "Con D o N, la persona solo puede salir dentro del horario de ese turno, cualquiera que sea su jornada laboral. Con descanso no se le asigna nada ese día. Publicar el mes es informativo: el registro de operativos usa estos turnos desde que se guardan.",
  vacio:
    "No hay personal de Instrucción a su alcance. Registre personas con área «Personal de Instrucción» en el Maestro de personal.",
  cargando: "Cargando la cobertura…",
  nombreGrilla: "Cobertura",
  estados: [
    {
      valor: "DIURNO",
      letra: "D",
      nombre: "Diurno",
      teclas: ["D"],
      clase: "bg-success text-success-content",
      significado: "Diurno: sale de día",
    },
    {
      valor: "NOCTURNO",
      letra: "N",
      nombre: "Nocturno",
      teclas: ["N"],
      clase: "bg-info text-info-content",
      significado: "Nocturno: sale de noche",
    },
    {
      valor: "DESCANSO",
      letra: "—",
      nombre: "Descanso",
      teclas: ["-", "—"],
      clase: "bg-base-300",
      significado: "Descanso: ese día no sale",
      etiquetaBoton: "Descanso",
    },
  ],
  ausencias: [
    { valor: "VACACIONES", letra: "V", nombre: "Vacaciones", clase: "bg-warning/40" },
    { valor: "REPOSO_MEDICO", letra: "RM", nombre: "Reposo médico", clase: "bg-error/30" },
    { valor: "CALAMIDAD", letra: "C", nombre: "Calamidad", clase: "bg-error/20" },
    { valor: "PERMISO", letra: "P", nombre: "Permiso", clase: "bg-base-200 text-app-muted" },
  ],
  estadoDia: "DIURNO",
  estadoDescanso: "DESCANSO",
  pie: [
    { valor: "DIURNO", clave: "diurno", rotulo: "De día", principal: true },
    { valor: "NOCTURNO", clave: "nocturno", rotulo: "De noche", principal: true },
    { valor: "DESCANSO", clave: "descanso", rotulo: "Descansos" },
  ],
  patronesRapidos: PATRONES_RAPIDOS,
  conDenominacion: true,
  conCambiarGrupo: true,
  nombreArchivo: (mes) => `cobertura-instruccion-${mes}.xlsx`,
  servicio: CoberturaService,
};
