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

/** Estado único de la orden (A). «Pendiente» es a nivel de operativo (sin órdenes). */
export type EstadoOrden = "VIGENTE" | "BORRADOR" | "REEMPLAZADA";

/**
 * Origen de un dato faltante (D), para agrupar el aviso de borrador por quién lo completa
 * (plantilla por Director, 2026-10-05):
 *  · `persona`: de la ficha del destinatario (hoy, el cargo) — «Datos del funcionario».
 *  · `plantilla`: datos generales de la plantilla del Director que generó la orden (dirección
 *     responsable, número y fecha del memorando, funcionario designado).
 *  · `firmante`: nombre, cargo y dependencia del firmante, también en la plantilla del Director.
 *  · `cuadro`: datos del DÍA (NUT y «elaborado por»).
 *  · `configuracion`: parámetros institucionales (siglas de la unidad).
 */
export type OrigenFaltante =
  | "persona"
  | "plantilla"
  | "firmante"
  | "cuadro"
  | "configuracion";

/** Un dato obligatorio sin completar (D15/D16): su token, su etiqueta legible y su origen. */
export interface Faltante {
  token: string;
  etiqueta: string;
  origen: OrigenFaltante;
}

/** Copia del firmante (Director) congelada al emitir (F). */
export interface FirmanteOrden {
  nombre: string;
  cargo: string;
  dependencia: string;
  usuarioId: number;
  fecha: string;
}

/** Respuesta de `POST /operativos/:id/ordenes-servicio` y `/ordenes-servicio/mias`. */
export interface OrdenServicio {
  codigo: string;
  emitidaEn: string;
  vigente: boolean;
  /** Estado único derivado (A): la MISMA fuente para tabla, panel, tarjeta y visor. */
  estado: EstadoOrden;
  /** Versión v1, v2… (nº de emisión). */
  version: number;
  /** Número oficial AMC-OS-<8>-<año> una vez Vigente, o `null` mientras es Borrador (G). */
  numeroOrden: string | null;
  fechaJornada: string;
  datoAislado: DatoAislado;
  /**
   * Datos OBLIGATORIOS del memorando aún sin completar (D15/D16), cada uno con su ORIGEN
   * ('persona' | 'configuracion' | 'firmante' | 'plantilla') para agrupar el aviso de borrador. Si hay alguno, la
   * orden está en BORRADOR y el documento sale con huecos resaltados. Vacío = completa. `numeroOrden`
   * NO cuenta como faltante.
   */
  faltantes: Faltante[];
  /** Copia del firmante (Director) congelada al emitir, o `null` si aún no se guardó. */
  firmante: FirmanteOrden | null;
  /** Director que generó la orden (plantilla por Director, 2026-10-05). */
  directorId: number | null;
  /** Nombre del Director que la generó, para «Generada por …». */
  directorNombre: string | null;
  /** `true` si la generó el Director en sesión: solo entonces se puede editar o reemitir. */
  esPropia: boolean;
  /** Versión de la plantilla con la que se resuelve ESTA orden. */
  plantillaVersion: number | null;
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
  /**
   * Etiqueta de la columna izquierda de la tabla de 2 columnas (2026-10-01). Separada del título
   * (que es el encabezado del apartado), que antes se mezclaba en un solo campo y salía truncado.
   * Opcional: una plantilla sin `etiqueta` deriva la etiqueta del título, como antes.
   */
  etiqueta?: string;
  tipo: TipoApartado;
  contenido: string;
}

/**
 * Datos generales de la plantilla de la Dirección (2026-10-02). Son del DIRECTOR y los comparten
 * TODAS las órdenes que se emitan con esa plantilla: la dirección/unidad responsable, el memorando
 * de designación (número y fecha), el funcionario designado y el FIRMANTE del documento —nombre con
 * título, su cargo y su dependencia—. Alimentan los tokens {{direccionResponsable}},
 * {{numeroMemorando}}, {{fechaMemorando}}, {{designado}} y {{firmante}} (origen 'plantilla'), y el
 * bloque «Atentamente». `fechaMemorando` viaja como texto `AAAA-MM-DD` (o `""`), nunca como `Date`
 * (regla 12).
 */
export interface DatosGeneralesPlantilla {
  direccionResponsable: string;
  numeroMemorando: string;
  fechaMemorando: string;
  designado: string;
  firmante: string;
  firmanteCargo: string;
  firmanteDependencia: string;
}

/** La plantilla completa que viaja por `GET`/`PUT /plantilla-orden`: apartados + datos generales. */
/**
 * Sugerencia del firmante a partir del Director EN SESIÓN (su ficha): nombre, cargo y la dependencia de
 * su dirección. Solo sirve para PRELLENAR los campos del firmante que vengan vacíos (2026-10-05).
 */
export interface SugerenciaFirmante {
  nombre: string;
  cargo: string;
  dependencia: string;
}

export interface Plantilla {
  apartados: Apartado[];
  datosGenerales: DatosGeneralesPlantilla;
  /** Solo en el GET; `null` si la sesión no tiene ficha de personal asociada. */
  sugerenciaFirmante?: SugerenciaFirmante | null;
  /**
   * Versión de la plantilla del Director en sesión (2026-10-05): sube en cada «Guardar plantilla».
   * Opcional para no obligar a los dobles de prueba anteriores.
   */
  version?: number;
  /** Director dueño de la plantilla (siempre el de la sesión). */
  directorId?: number | null;
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
