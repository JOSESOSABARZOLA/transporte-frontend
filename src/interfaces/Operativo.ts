/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos
 * Archivo: Operativo.ts
 * Responsabilidad: Declarar el operativo y lo que se envía para registrarlo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * `CrearOperativo` NO TIENE `conductorId` NI `vehiculoId`, y no es un olvido.
 *
 * RN-40: nacen nulos y **solo la DAF los completa**, desde otro contrato y otra
 * pantalla. El backend rechaza con `400 CAMPOS_NO_PERMITIDOS` cualquier campo que sobre;
 * declararlos aquí solo serviría para que alguien los enviara y recibiera un error.
 *
 * Tampoco lleva campos calculados —identificador, secuencial, duración, alertas—: los
 * deriva el servidor.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Alerta } from "./Alerta";
import type { PoliticaVehiculo } from "./Formulario";
import type { RolDepartamental } from "../config/env";

export type EstadoTransporte = "PENDIENTE" | "ASIGNADO" | "PROPIOS_MEDIOS";

/** Datos del formulario que viajan con cada operativo, para pintar la fila. */
export interface FormularioDelOperativo {
  codigo: string;
  nombre: string;
  numero: number;
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  esPatrulla: boolean;
  condicionanteNoct: boolean;
  /**
   * RN-41 y RN-42. Llega desde el 2026-08-24.
   *
   * `NO_APLICA` son los formularios que operan por propios medios —1 FIJOS, 3 LIMPIA y
   * 9 CBQ—: no llevan conductor ni placa, no llegan a la bandeja de la DAF y el servidor
   * **no emite ninguna alerta** sobre ellos, porque nadie podría resolverla. Sin este
   * dato la celda de conductor no tenía nada que decir y pintaba un guion, que se lee
   * como «todavía no asignado».
   */
  politicaVehiculo: PoliticaVehiculo;
  /**
   * RN-61. Si este formulario admite operativos adicionales. Llega desde el 2026-08-24.
   *
   * **Hoy solo el 2 · PMO**, y no porque esté escrito en ninguna parte del código: un
   * formulario los admite si tiene un prefijo marcado como de adicional, y `OCAPMO` es
   * el único. Las «A» de `ICA`, `OCA`, `IGA` e `ITA` son ordinarias.
   *
   * El servidor ya lo hacía cumplir; la pantalla ofrecía «Adicional» en los nueve y
   * fallaba al pulsarlo en ocho. Esto es lo que le permite dejar de ofrecerlo.
   */
  admiteAdicionales: boolean;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * QUIÉN MANDA SOBRE EL OPERATIVO Y QUIÉN SOLO APORTA. Llega desde el 2026-08-25.
   *
   * Hasta hoy la pantalla no lo necesitaba: P-02 solo mostraba operativos del propio
   * departamento. Al abrir el formulario 4 al cupo del DMIT, «Mis operativos» pasa a
   * incluir patrullas ECU para quien **solo puede poner personal**.
   *
   * Lo interpreta `accesoOperativo.util.ts`, comparando con `user.rolCodes`. Aquí solo
   * viajan los dos hechos; el veredicto no se guarda en la respuesta porque depende de
   * quién mire.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  rolDueno: string;
  /**
   * Qué puede hacer cada departamento en este formulario.
   *
   * ERA `rolCompartido`, un solo invitado. Desde el 2026-08-25 son filas, porque un
   * formulario puede tener **varios departamentos que registran**: la patrulla ECU tiene
   * dos, y eso en un campo no cabía.
   *
   * SIN EL CUPO: el tope lo aplica el servidor al asignar y su mensaje llega redactado.
   * Publicarlo invitaría a comprobarlo en el navegador, que es donde no debe comprobarse.
   */
  roles: { rol: string; acceso: string }[];
}

export interface PersonaAsignada {
  funcionarioId: number;
  nombre: string;
  area: string;
  /** RN-34. Viene del maestro; nunca se digita en el formulario. */
  telefono: string | null;
  esResponsable: boolean;
  asignadoPorRol: RolDepartamental;
}

/** RN-31 y RN-32. Se informa, no bloquea. Ver PV-29. */
export interface ComposicionOperativo {
  esPatrulla: boolean;
  completa: boolean;
  areasPendientes: string[];
}

/**
 * De qué operativo nació un adicional. `null` en un operativo ordinario.
 *
 * VIENE EL IDENTIFICADOR Y NO SOLO EL NÚMERO DE FILA, para que la tabla pueda escribir
 * «adicional de OCPMO-004» sin pedir el padre entero: sería una consulta por fila del
 * cuadro para pintar unos pocos caracteres.
 */
export interface OrigenDelOperativo {
  id: number;
  identificador: string;
}

/** Respuesta de `GET /operativos` y `POST /operativos`. */
export interface Operativo {
  id: number;
  identificador: string;
  secuencial: number;
  cuadroFecha: string;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * 2026-08-20 · UN ADICIONAL ES UNA SALIDA EXTRAORDINARIA, dispuesta por urgencia el
   * mismo día en que se ejecuta, colgando de un operativo ya registrado.
   *
   * NO CONFUNDIR CON `OPCION_ADICIONALES` de `valoresOperativo.util.ts`, que es otra
   * cosa por completo: la captura libre de un punto o un tipo de control (RN-20). Los dos
   * usan la palabra «adicional» y no tienen ninguna relación.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  esAdicional: boolean;
  origen: OrigenDelOperativo | null;
  /** Cuántos adicionales nacieron de este operativo. Cero en la inmensa mayoría. */
  adicionales: number;
  formulario: FormularioDelOperativo;
  horaInicio: string;
  horaFin: string;
  horario: string;
  duracionHoras: number;
  esNocturno: boolean;
  cruzaMedianoche: boolean;
  zonales: { id: number; codigo: string; nombre: string }[];
  puntoEncuentro: { id: number; nombre: string; zonalNombre: string } | null;
  puntoLibre: string | null;
  tipoControl: { id: number; nombre: string } | null;
  tipoLibre: string | null;
  instituciones: { id: number; sigla: string; nombre: string }[];
  personal: PersonaAsignada[];
  composicion: ComposicionOperativo;
  estadoTransporte: EstadoTransporte;
  alertaActiva: boolean;
  alertas: Alerta[];
  observaciones: string | null;
  creadoPorRol: RolDepartamental;
  creadoPor: number;
  modificadoPorRol: RolDepartamental;
  modificadoPor: number;
  /** Bloqueo optimista: se devuelve al editar, y sin ella el servidor responde 400. */
  version: number;
  creadoEn: string;
}

/** Cuerpo de `POST /operativos`. */
export interface CrearOperativo {
  cuadroFecha: string;
  formularioCodigo: string;
  horaInicio: string;
  horaFin: string;
  zonalesIds: number[];
  puntoEncuentroId?: number;
  puntoLibre?: string;
  tipoControlId?: number;
  tipoLibre?: string;
  institucionesIds: number[];
  /**
   * Personal que se asigna con el registro. **Todo o nada.**
   *
   * Desde el 2026-08-11 viaja con el operativo y el servidor lo guarda en una sola
   * transacción: si alguien es rechazado no se crea nada y lo capturado se conserva
   * para corregir esa persona. Antes se creaba el operativo y se asignaba después, una
   * por petición, así que un rechazo dejaba un operativo vacío en el cuadro.
   */
  personalIds?: number[];
  observaciones?: string;
}

/**
 * Cuerpo de `POST /operativos/:id/adicional`. 2026-08-20.
 *
 * ES `CrearOperativo` MENOS LA JORNADA Y EL FORMULARIO, y su ausencia es el contrato:
 * los dos se heredan del operativo del que nace. Un adicional en otra fecha no es un
 * adicional, y en otro formulario llevaría un prefijo que no corresponde a su padre.
 * El servidor responde `400 CAMPOS_NO_PERMITIDOS` si se envían.
 */
export type CrearAdicional = Omit<
  CrearOperativo,
  "cuadroFecha" | "formularioCodigo"
>;

/** Cuerpo de `PATCH /operativos/:id`. `version` es obligatoria. */
export interface ActualizarOperativo extends Partial<CrearOperativo> {
  version: number;
}

/** Cuerpo de `POST /operativos/:id/personal`. Sin teléfono: RN-34. */
export interface AsignarPersonal {
  funcionarioId: number;
  esResponsable?: boolean;
}

export interface FiltroOperativos {
  fecha?: string;
  formulario?: string;
  pagina?: number;
  tamanio?: number;
}

/**
 * Respuesta de `DELETE /operativos/:id`. PV-10, decidido el 2026-08-07.
 *
 * Hay **dos bajas** y la pantalla debe decir cuál ocurrió:
 *
 *   · `eliminado: true`  la fila se borró de la base. Es la corrección de un error de
 *     captura: nadie fuera del sistema supo que ese operativo existió, y su número queda
 *     libre para el siguiente.
 *   · `eliminado: false` se conservó desactivada porque ya tiene órdenes emitidas
 *     (`ordenesEmitidas`). No es una preferencia: `fk_orden_operativo` es `RESTRICT` y
 *     una orden ya comunicada a un funcionario no puede quedarse sin origen.
 */
export interface ResultadoBaja {
  id: number;
  identificador: string;
  retirado: boolean;
  eliminado: boolean;
  ordenesEmitidas: number;
}

/** Respuesta paginada del backend. FASE4 §8.1. */
export interface RespuestaPaginada<T> {
  datos: T[];
  meta: {
    pagina: number;
    tamanio: number;
    total: number;
    totalPaginas: number;
  };
}
