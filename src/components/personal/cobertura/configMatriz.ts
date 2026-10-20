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
 * columnas de totales— entra por esta configuración. La de Instrucción es el valor por omisión,
 * de modo que su comportamiento no cambia (las pruebas de la cobertura lo vigilan).
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

/** Un estado editable con su color (token del tema, regla 2) y su texto de leyenda. */
export interface EstadoConEstilo extends EstadoMatriz {
  clase: string;
  leyenda: string;
  /** Nombre accesible del botón de la barra de selección si la letra no es legible («—»). */
  etiquetaBoton?: string;
}

/** Un estado de ausencia (viene de la disponibilidad; no se edita en la matriz). */
export interface EstadoAusencia {
  valor: string;
  letra: string;
  nombre: string;
  clase: string;
  leyenda: string;
}

export interface ConfigMatriz {
  titulo: string;
  /** Contexto en el subtítulo de sus cajones («Cobertura por turnos» / «Turnos de conductores»). */
  contexto: string;
  sujeto: {
    singular: string;
    plural: string;
    /** Encabezado de la columna fija. */
    columna: string;
    /** Rótulo del buscador. */
    buscar: string;
  };
  grupo: {
    singular: string;
    plural: string;
    sinGrupo: string;
    /** Rótulo del filtro. */
    filtro: string;
  };
  banner: string;
  /** Nota bajo el banner (p. ej. quién la carga y cuándo). */
  nota?: string;
  /** Qué significa publicar con celdas vacías. Sin él, la frase de Instrucción. */
  consecuenciaVacias?: string;
  vacio: string;
  cargando: string;
  /** «Cobertura» → aria-label «Cobertura de octubre de 2026». */
  nombreGrilla: string;
  estados: EstadoConEstilo[];
  ausencias: EstadoAusencia[];
  /** Estados que cuentan como «en servicio» en el subtotal de cada grupo. */
  activos: string[];
  /**
   * Filas del pie: un estado con su rótulo y la clave del atributo `data-total`. `minimo` dice qué
   * marca de `bajoMinimo` del servidor resalta esa fila (solo la DAF).
   */
  pie: { valor: string; clave: string; rotulo: string; minimo?: "dia" | "noche" }[];
  patronesRapidos: { nombre: string; patron: string }[];
  ayudaPatron: string;
  conDenominacion: boolean;
  conCambiarGrupo: boolean;
  nombreArchivo: (mes: string, formato?: FormatoReporte) => string;
  servicio: ServicioMatriz;
  /**
   * Opciones de los turnos de conductores (2026-10-06). Todas opcionales y APAGADAS en Instrucción,
   * para que su comportamiento no cambie:
   *   · `copiarMesAnterior`: con el mes vacío, el estado vacío ofrece «Copiar mes anterior»,
   *     «Aplicar patrón» y «Continuar rotación» (no hay importación de Excel: se carga aquí).
   *   · `avisoSinTurnoCompacto`: el aviso «N sin turno» va en una línea, no como alerta.
   *   · `cerosAtenuados`: los ceros del pie se pintan en gris (`text-app-muted`).
   *   · `subtotalCompacto`: el subtotal del grupo se lee «D1 · N2» (solo lo distinto de cero) y,
   *     sin nadie, «—» en gris; Instrucción conserva «1/2».
   *   · `exportarPublicado`: «Exportar» es un menú Excel / PDF y solo se habilita con el mes
   *     publicado (el reporte es lo publicado; el servidor responde 409 si no).
   *   · `rutaParametros`: a dónde lleva «Parámetros sin configurar» en la propuesta del mes.
   */
  copiarMesAnterior?: boolean;
  avisoSinTurnoCompacto?: boolean;
  cerosAtenuados?: boolean;
  subtotalCompacto?: boolean;
  exportarPublicado?: boolean;
  rutaParametros?: string;
}

/** La configuración de la cobertura de Instrucción: el comportamiento histórico de la matriz. */
export const CONFIG_INSTRUCCION: ConfigMatriz = {
  titulo: "Cobertura por turnos · Personal de Instrucción",
  contexto: "Cobertura por turnos",
  sujeto: {
    singular: "persona",
    plural: "personas",
    columna: "Personal",
    buscar: "Buscar persona",
  },
  grupo: {
    singular: "zona",
    plural: "zonas",
    sinGrupo: "Sin zona",
    filtro: "Zona",
  },
  banner:
    "En Instrucción esta matriz define quién puede salir: D/N solo dentro de la ventana de ese turno (también con nombramiento) · — no se asigna · vacía sin restricción.",
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
      leyenda: "D Diurno",
    },
    {
      valor: "NOCTURNO",
      letra: "N",
      nombre: "Nocturno",
      teclas: ["N"],
      clase: "bg-info text-info-content",
      leyenda: "N Nocturno",
    },
    {
      valor: "DESCANSO",
      letra: "—",
      nombre: "Descanso",
      teclas: ["-", "—"],
      clase: "bg-base-300",
      leyenda: "— Descanso (no se asigna)",
      etiquetaBoton: "Descanso",
    },
  ],
  ausencias: [
    {
      valor: "VACACIONES",
      letra: "V",
      nombre: "Vacaciones",
      clase: "bg-warning/40",
      leyenda: "V Vacaciones",
    },
    {
      valor: "REPOSO_MEDICO",
      letra: "RM",
      nombre: "Reposo médico",
      clase: "bg-error/30",
      leyenda: "RM Reposo médico",
    },
    {
      valor: "CALAMIDAD",
      letra: "C",
      nombre: "Calamidad",
      clase: "bg-error/20",
      leyenda: "C Calamidad",
    },
    {
      valor: "PERMISO",
      letra: "P",
      nombre: "Permiso",
      clase: "bg-base-200 text-app-muted",
      leyenda: "P Permiso",
    },
  ],
  activos: ["DIURNO", "NOCTURNO"],
  pie: [
    { valor: "DIURNO", clave: "diurno", rotulo: "Diurnos" },
    { valor: "NOCTURNO", clave: "nocturno", rotulo: "Nocturnos" },
    { valor: "DESCANSO", clave: "descanso", rotulo: "Descansos" },
  ],
  patronesRapidos: PATRONES_RAPIDOS,
  ayudaPatron: "Patrón libre (D, N y -; de 2 a 14 letras)",
  conDenominacion: true,
  conCambiarGrupo: true,
  nombreArchivo: (mes) => `cobertura-instruccion-${mes}.xlsx`,
  servicio: CoberturaService,
};
