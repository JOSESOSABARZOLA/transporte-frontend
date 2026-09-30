/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Documentos
 * Archivo: Documento.ts
 * Responsabilidad: Declarar la matriz consolidada y las órdenes de servicio.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * `DatoAislado` TIENE CUATRO CAMPOS. INV-24 y RN-50.
 *
 * La orden de servicio expone exclusivamente horario, funcionario, conductor y placa. El
 * motivo lo declara RN-51: la filtración del cuadro permitía a los intervenidos
 * anticiparse al operativo.
 *
 * Aquí se declara igual de cerrado que en el servidor. Ampliar esta interfaz —«para
 * mostrar también el punto de encuentro»— sería deshacer el aislamiento desde el lado
 * que menos se vigila.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Alerta } from "./Alerta";
import type { EstadoCuadro } from "./CuadroDiario";
import type { EstadoTransporte } from "./Operativo";

/** Fila de la matriz: las nueve columnas más observaciones. */
export interface FilaMatriz {
  id: number;
  identificador: string;
  /** Lote del registro-patrulla (Form 5/6): agrupa los N en la matriz. Nulo en el resto. */
  grupoRegistro: string | null;
  /**
   * Si nació como ADICIONAL, y de qué operativo. 2026-08-20.
   *
   * Desde que la Dirección puede sumar un adicional a un cuadro ya cerrado, **existen dos
   * versiones del mismo documento firmado**. Quien compare la matriz de las 16H00 con la
   * de las 18H00 tiene que ver qué se añadió y de dónde salió, no deducirlo de que un
   * identificador empiece por `OCAPMO`.
   */
  esAdicional: boolean;
  /** Identificador del operativo del que nace. Nulo en un operativo ordinario. */
  origen: string | null;
  horario: string;
  /**
   * CON TELÉFONO DESDE EL 2026-08-27. Es la columna 3 del cuadro según `FASE2 §16.1`
   * —**PERSONAL ASIGNADO / TELÉFONO**— y lo pide RF-015 con prioridad alta.
   *
   * `null` es un caso real: hay fichas del maestro sin teléfono, y la tabla lo dice con
   * palabras en vez de dejar el hueco (regla 6).
   */
  personal: {
    funcionarioId: number;
    nombre: string;
    telefono: string | null;
    esResponsable: boolean;
    /**
     * Ventana EFECTIVA de la persona (2026-09-08): su turno propio si lo tiene, o el del
     * operativo si no. El servidor la resuelve (`fila.horaInicio ?? operativo.horaInicio`).
     * Cuando difieren entre personas, la tabla pinta el horario por persona en vez del
     * único del operativo.
     */
    horaInicio: string;
    horaFin: string;
  }[];
  zonales: string[];
  puntoEncuentro: string;
  tipoControl: string;
  instituciones: string[];
  conductor: string | null;
  placa: string | null;
  /** Notas del operativo (bitácora, 2026-09-09): los textos, en orden. La matriz las pinta separadas. */
  observaciones: string[];
  estadoTransporte: EstadoTransporte;
  esNocturno: boolean;
  alertas: Alerta[];
}

/** Una sección de la matriz: un formulario con sus filas o su evidencia. */
export interface SeccionMatriz {
  numero: number;
  codigo: string;
  nombre: string;
  /** Viene del servidor. El frontend lo pinta, no lo define. */
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  responsable: string;
  esPatrulla: boolean;
  /**
   * RN-61. Si este formulario admite adicionales. Desde el 2026-08-24.
   *
   * Lo dice el dato: el formulario los admite si tiene un prefijo marcado para ellos, y
   * hoy solo el 2 · PMO con `OCAPMO`. P-05 arma sus filas desde esta matriz, así que es
   * por aquí por donde le llega.
   */
  admiteAdicionales: boolean;
  totalOperativos: number;
  filas: FilaMatriz[];
  /** RN-53 y RN-54. Presente solo si el formulario quedó vacío y su ventana venció. */
  evidencia: {
    leyenda: string;
    responsable: string;
    horaCierre: string | null;
  } | null;
}

/** Respuesta de `GET /matriz/:fecha`. */
export interface Matriz {
  cabecera: {
    ordenTrabajo: string;
    fecha: string;
    fechaNatural: string;
    nroSemana: number;
    anioSemana: number;
    estado: EstadoCuadro;
    totalOperativos: number;
    totalAlertas: number;
    formulariosSinCarga: number;
    flota: {
      declarados: number;
      requeridos: number;
      hayAdvertencia: boolean;
    } | null;
  };
  secciones: SeccionMatriz[];
}

/** INV-24. Cuatro campos, y ninguno más. */
export interface DatoAislado {
  horario: string;
  funcionario: string;
  conductor: { nombre: string; telefono: string | null } | null;
  placa: string | null;
}

/** Respuesta de `POST /operativos/:id/ordenes-servicio` y `/ordenes-servicio/mias`. */
export interface OrdenServicio {
  codigo: string;
  emitidaEn: string;
  vigente: boolean;
  fechaJornada: string;
  datoAislado: DatoAislado;
}

/** Un operativo de la persona, como se lista en el apartado cuarto del memorando. */
export interface OperativoDeMemorando {
  identificador: string;
  horario: string;
  zonal: string;
}

/** Cómo se pinta el contenido de un apartado de la plantilla. */
export type TipoApartado = "texto" | "lista" | "campos" | "operativos";

/** Un apartado de la plantilla de la orden de servicio. */
export interface Apartado {
  id: string;
  titulo: string;
  tipo: TipoApartado;
  contenido: string;
}

/** Los datos base del memorando que el editor precarga (`GET …/memorando/datos`). */
export interface DatosMemorando {
  numeroMemorando: string;
  ciudadFecha: string;
  para: { nombre: string; cargo: string; dependencia: string };
  numeroOrden: string;
  fechaEmision: string;
  direccionResponsable: string;
  operativos: OperativoDeMemorando[];
  firmante: { nombre: string; cargo: string; dependencia: string };
  nut: string;
  elaboradoPor: string;
  siglasUnidad: string;
  apartados: Apartado[];
}

/** Lo que el editor por-orden envía (`POST …/memorando`). Solo huecos; los textos van en la plantilla. */
export interface EditablesMemorando {
  numeroMemorando?: string;
  numeroOrden?: string;
  nut?: string;
  paraCargo?: string;
  paraDependencia?: string;
  direccionResponsable?: string;
  firmanteNombre?: string;
  firmanteCargo?: string;
  firmanteDependencia?: string;
  elaboradoPor?: string;
  siglasUnidad?: string;
}
