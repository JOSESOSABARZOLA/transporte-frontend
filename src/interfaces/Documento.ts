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
  personal: { funcionarioId: number; nombre: string; esResponsable: boolean }[];
  zonales: string[];
  puntoEncuentro: string;
  tipoControl: string;
  instituciones: string[];
  conductor: string | null;
  placa: string | null;
  observaciones: string | null;
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
