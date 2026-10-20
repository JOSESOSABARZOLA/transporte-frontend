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
import type { EstadoCuadro } from "./CuadroDiario";
import type { AreaPersonal, PoliticaVehiculo } from "./Formulario";
import type { RolDepartamental } from "../config/env";
import type { TramiteInspeccion } from "./TramiteInspeccion.ts";

export type EstadoTransporte = "PENDIENTE" | "ASIGNADO" | "PROPIOS_MEDIOS";

/**
 * Cómo se moviliza el operativo (2026-10-06, rediseño de la DAF). Lo elige quien registra:
 * COMPLETO (el conductor lleva, espera y trae), SOLO_INICIO (solo dejar), SOLO_FIN (solo retirar),
 * INICIO_Y_FIN (dejar y retirar; entre medio el conductor queda libre) o PROPIOS_MEDIOS.
 */
export type TipoTransporte =
  | "COMPLETO"
  | "SOLO_INICIO"
  | "SOLO_FIN"
  | "INICIO_Y_FIN"
  | "PROPIOS_MEDIOS";

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
  /**
   * Ventana horaria EFECTIVA de la persona (2026-09-08). Si tiene turno propio dentro del
   * operativo es el suyo; si no, es el del operativo. El servidor siempre la resuelve.
   */
  horaInicio: string;
  horaFin: string;
  /**
   * Trámite de Inspección copiado a esta persona en este operativo (2026-10-07). Nulo si no tiene.
   * Es la copia guardada al elegirlo; la orden de servicio la menciona.
   */
  tramiteInspeccion?: TramiteInspeccion | null;
}

/** Una persona con su turno propio opcional, para el registro. */
export interface PersonaConHorario {
  funcionarioId: number;
  /** Turno propio dentro del operativo. Ausente = cumple el horario del operativo. */
  horaInicio?: string;
  horaFin?: string;
  /** Trámite de Inspección elegido (2026-10-07). Solo el código: el servidor copia el resto. */
  tramiteInspeccion?: { codigoTramite: string };
}

/** RN-31 y RN-32. Se informa, no bloquea. Ver PV-29. */
export interface ComposicionOperativo {
  esPatrulla: boolean;
  completa: boolean;
  /**
   * Tipado como `AreaPersonal[]` desde el 2026-08-27, no como `string[]`.
   *
   * Con `string[]` nada obligaba a traducirlo, y en pantalla salía «Falta personal de el
   * área INSTRUCCION». Ahora el compilador exige pasarlo por `NOMBRE_AREA`, que es un
   * `Record` sobre este mismo tipo.
   */
  areasPendientes: AreaPersonal[];
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

/**
 * Una nota del operativo (bitácora append-only, 2026-09-09): su texto y quién la escribió y
 * cuándo. `creadoPorRol` es el departamento, no la persona. Antes las observaciones eran un
 * solo campo de texto.
 */
export interface ObservacionOperativo {
  texto: string;
  creadoPorRol: string;
  creadoEn: string;
}

/**
 * Una nota de la celda «Observaciones» (2026-10-19, plan «acciones-icono-notas»). `NOTA` es una
 * observación escrita (`t_operativo_observacion`); `COMPARTIDA` se deriva de la solicitud de
 * compartir unidad (`compartirCon`) y apunta al operativo con `operativoRelacionadoId`. La lista
 * llega de la más reciente a la más antigua. Ver `CONTRATO-notas-operativo.md` del backend.
 */
export interface NotaOperativo {
  id: string;
  tipo: "NOTA" | "COMPARTIDA";
  texto: string;
  autor: string;
  fecha: string;
  operativoRelacionadoId: number | null;
}

/** Respuesta de `GET /operativos` y `POST /operativos`. */
export interface Operativo {
  id: number;
  identificador: string;
  secuencial: number;
  /**
   * Lote del registro-patrulla (Form 5/6): los N operativos de una misma patrulla lo comparten,
   * para agruparlos en las listas como «una sola patrulla». Nulo en el resto (registro de uno,
   * adicional, copias del 8). Lo entrega el servidor; el navegador solo agrupa por él.
   */
  grupoRegistro: string | null;
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
  /**
   * Varios tipos, SOLO en el formulario que lo admite (form 8). Vacío en el resto. Opcional
   * en el tipo porque el servidor siempre lo envía pero muchos fixtures de prueba lo omiten;
   * quien lo lee usa `?? []`.
   */
  tiposControl?: { id: number; nombre: string }[];
  tipoLibre: string | null;
  instituciones: { id: number; sigla: string; nombre: string }[];
  personal: PersonaAsignada[];
  composicion: ComposicionOperativo;
  estadoTransporte: EstadoTransporte;
  /** Opcionales: contratos anteriores al 2026-10-06 no los traen (se leen con `??`). */
  tipoTransporte?: TipoTransporte;
  esMacrooperativo?: boolean;
  /**
   * COMPARTIR UNIDAD (2026-10-19): el operativo con el que quien registró pidió viajar en la misma
   * unidad. Es una INTENCIÓN: la ejecuta la DAF (RN-40). Opcional: contratos anteriores no lo traen.
   */
  compartirCon?: { id: number; identificador: string } | null;
  /** Por qué pide vehículo exclusivo (macrooperativo), si lo justificó al registrar. */
  justificacionExclusivo?: string | null;
  /**
   * Solo en la respuesta de una EDICIÓN, y solo si hay alguno. `COMPARTIR_RETIRADO`: el cambio dejó
   * la intención de compartir sin coincidencia y el servidor la retiró (no es un error).
   */
  avisos?: string[];
  alertaActiva: boolean;
  alertas: Alerta[];
  /** Notas del operativo (bitácora append-only, 2026-09-09), en el orden en que se escribieron. */
  observaciones: ObservacionOperativo[];
  /** Las notas de la tabla (NOTA y COMPARTIDA). Opcional: un servidor anterior no las trae. */
  notas?: NotaOperativo[];
  creadoPorRol: RolDepartamental;
  creadoPor: number;
  modificadoPorRol: RolDepartamental;
  modificadoPor: number;
  /** Bloqueo optimista: se devuelve al editar, y sin ella el servidor responde 400. */
  version: number;
  creadoEn: string;
  /** Estado del cuadro de la fila (2026-10-13): con un rango, cada fila puede ser de otro cuadro. */
  cuadroEstado?: EstadoCuadro;
  /**
   * Solo en el listado de P-02 (2026-10-13): el servidor dice si el cuadro de la fila admite
   * edición —no cerrado, vigente y con la ventana abierta—. La propiedad la sigue decidiendo
   * el cliente con `creadoPorRol`.
   */
  admiteEdicion?: boolean;
  /**
   * Solo en el listado de P-02 (2026-10-13): conductor y placa que asignó la DAF, para la celda
   * «Conductor». Vacío si aún no hay; varios si los tramos van con conductores distintos.
   */
  transporteAsignado?: { conductor: string; placa: string | null }[];
}

/** Cuerpo de `POST /operativos`. */
export interface CrearOperativo {
  cuadroFecha: string;
  formularioCodigo: string;
  /**
   * Horario del operativo. **Opcional desde RN-66 (2026-09-08):** el operativo ya no tiene
   * horario propio; el servidor lo deriva de las ventanas de las personas. P-01 ya no lo
   * envía. Se conserva opcional por compatibilidad con el modo clásico del servidor.
   */
  horaInicio?: string;
  horaFin?: string;
  zonalesIds: number[];
  puntoEncuentroId?: number;
  puntoLibre?: string;
  /**
   * PUNTO NUEVO a crear al registrar (Unidad de Operativos, 2026-09-24). Excluyente con
   * `puntoEncuentroId` y `puntoLibre`. El servidor lo crea en el catálogo DENTRO de la misma
   * transacción del operativo, ligado a este formulario: si el operativo no se crea, el punto
   * tampoco queda. Solo lo admiten los formularios con `puntoManual` (1-4).
   */
  puntoNuevo?: { nombre: string; zonalId: number };
  tipoControlId?: number;
  /** Varios tipos, SOLO en el formulario que lo admite (form 8). */
  tipoControlIds?: number[];
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
  /**
   * Personal con su horario propio (2026-09-08, RN-66). En el registro es OBLIGATORIO por
   * persona: el operativo ya no tiene horario propio y el servidor toma su ventana de éstas
   * —p. ej. una de 07H00 a 16H00 y otra de 09H00 a 18H00 en el mismo operativo—. Es la forma
   * que envía P-01; el servidor conserva `personalIds` por compatibilidad.
   */
  personal?: PersonaConHorario[];
  /** Notas del operativo (bitácora, 2026-09-09). Cada una entra como una nota independiente. */
  observaciones?: string[];
  /**
   * Cuántos operativos idénticos generar en este registro (2026-09-09). Opcional; por defecto
   * el servidor asume 1. Una persona puede atender varios operativos en el mismo turno, así que
   * el operador puede pedir N copias con identificadores consecutivos. Solo al ALTA: el adicional
   * y la edición no lo llevan. Las copias quedan **exentas** del cruce mutuo entre ellas (RN-28).
   */
  cantidad?: number;
  /** Cómo se moviliza (2026-10-06). Opcional: sin él, el servidor asume COMPLETO. */
  tipoTransporte?: TipoTransporte;
  /** Macrooperativo: no admite compartir carro. */
  esMacrooperativo?: boolean;
  /**
   * Compartir unidad (2026-10-19): el operativo con el que pide viajar, o `null` para retirar la
   * intención. Al EDITAR solo viaja si cambió: lo que no viene se conserva.
   */
  compartirConOperativoId?: number | null;
  /** Justificación del vehículo exclusivo: 10 a 300 caracteres, o `null`. */
  justificacionExclusivo?: string | null;
}

/**
 * Cuerpo de `POST /operativos/:id/adicional`. 2026-08-20.
 *
 * ES `CrearOperativo` MENOS LA JORNADA Y EL FORMULARIO, y su ausencia es el contrato:
 * los dos se heredan del operativo del que nace. Un adicional en otra fecha no es un
 * adicional, y en otro formulario llevaría un prefijo que no corresponde a su padre.
 * El servidor responde `400 CAMPOS_NO_PERMITIDOS` si se envían.
 *
 * Tampoco lleva `cantidad`: un adicional es una salida única por urgencia, no un lote. El
 * servidor no lo admite en ese endpoint.
 */
export type CrearAdicional = Omit<
  CrearOperativo,
  "cuadroFecha" | "formularioCodigo" | "cantidad"
>;

/**
 * Cuerpo de `PATCH /operativos/:id`. `version` es obligatoria.
 *
 * Las notas NO se editan aquí (bitácora append-only, 2026-09-09): la edición solo AGREGA
 * nuevas, en `observacionesNuevas`; las ya escritas quedan como constancia. Por eso se retira
 * `observaciones` del contrato de edición —el servidor lo rechazaría—.
 *
 * `cantidad` tampoco: editar un operativo no genera copias, es una operación sobre uno solo.
 */
export interface ActualizarOperativo
  extends Partial<Omit<CrearOperativo, "observaciones" | "cantidad">> {
  version: number;
  observacionesNuevas?: string[];
  /**
   * Transporte requerido (2026-10-07). Confirma que, al cambiar el tipo de transporte de un operativo
   * que ya tiene transporte asignado, se libera la asignación. Sin ella el servidor responde 409
   * con `CAMBIO_TIPO_CON_TRANSPORTE`, o con `CAMBIO_CON_TRANSPORTE` si cambian el horario o la
   * zonal (2026-10-14). Ver `useConfirmarLiberacion`.
   */
  confirmarLiberacion?: boolean;
}

/** Cuerpo de `POST /operativos/:id/personal`. Sin teléfono: RN-34. */
export interface AsignarPersonal {
  funcionarioId: number;
  esResponsable?: boolean;
  /** Turno propio opcional dentro del operativo (2026-09-08). Ausente = hereda el del operativo. */
  horaInicio?: string;
  horaFin?: string;
}

/** `GET /operativos/rango` (2026-10-13): lo que la pantalla necesita para validar un rango. */
export interface RangoConsulta {
  /** Cuadro vigente, AAAA-MM-DD: mañana en America/Guayaquil. */
  fechaVigente: string;
  rangoMaxDias: number;
}

/**
 * `GET /operativos/conteo?fecha=` (2026-10-16): cuántos operativos lleva cada formulario permitido
 * en esa jornada, el «N hoy» del selector de P-01. Trae TODOS los permitidos, con 0 si no hay.
 */
export interface ConteoFormulario {
  formularioId: number;
  total: number;
}

export interface FiltroOperativos {
  fecha?: string;
  /** Rango Desde–Hasta (2026-10-13), inclusive. No se mezcla con `fecha`. */
  desde?: string;
  hasta?: string;
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

/**
 * `GET /operativos/coincidencias-transporte` (2026-10-19, compartir unidad). Los parámetros: la
 * captura en curso. `horaInicio`/`horaFin` son la envolvente del personal (la calcula la pantalla).
 */
export interface FiltroCoincidencias {
  fecha: string;
  puntoEncuentroId: number;
  zonalId: number;
  horaInicio: string;
  horaFin: string;
  tipoTransporte: Exclude<TipoTransporte, "PROPIOS_MEDIOS">;
  esMacrooperativo?: boolean;
  excluirOperativoId?: number;
}

/**
 * Un operativo del PROPIO ámbito del rol (RN-48) en el mismo punto, día y horario, con transporte
 * DAF. `compatible` lo decide el servidor con la misma regla que usa la DAF; si no, `motivo`.
 */
export interface CoincidenciaTransporte {
  operativoId: number;
  identificador: string;
  formularioNumero: number;
  /** Solo nombres: ni teléfono ni cédula. */
  personal: string[];
  horaInicio: string;
  horaFin: string;
  tipoTransporte: TipoTransporte;
  esMacrooperativo: boolean;
  compatible: boolean;
  motivo?: string | null;
  /**
   * «La misma unidad» (2026-10-19): traslados que harían juntos («dejar») y los del nuevo sin
   * pareja («retirar»), que la misma unidad hace después si su agenda lo permite.
   */
  comparte?: string[];
  propios?: string[];
  /** Con quién va cada traslado compartido (la unidad del grupo, 2026-10-19). */
  comparteCon?: { tipo: string; con: string }[];
  /**
   * «Completo» comparte unidad (2026-10-20): lo que el «completo» del nuevo abarca de la unidad
   * («dejar», «retirar»), o el «completo» de la unidad dentro del que viajaría el nuevo.
   */
  contiene?: string[];
  contenidoEn?: string | null;
}
