/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: Jornada.ts
 * Responsabilidad: Declarar la jornada que consulta un rol departamental.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO ES `Matriz`, AUNQUE SE LE PAREZCA. Y NO SE UNIFICAN.
 *
 * `Matriz` es lo que P-04 le sirve a la Dirección: los nueve formularios, con el
 * indicador de flota y con `admiteAdicionales` para que P-05 ofrezca «Adicional». Esto es
 * lo que P-13 le sirve a **DMIT Instrucción**: los mismos nueve en pantalla, sin ninguna
 * de esas dos cosas, y con un campo que la matriz no necesita —`acceso`— que dice en qué
 * secciones se puede tocar el personal.
 *
 * Compartir el tipo obligaría a que los campos fueran opcionales en los dos sitios, y un
 * campo opcional es una invitación a no comprobarlo. Son dos contratos porque son dos
 * pantallas con dos permisos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Alerta } from "./Alerta";
import type { AreaPersonal } from "./Formulario";
import type { EstadoCuadro } from "./CuadroDiario";
import type { EstadoTransporte } from "./Operativo";

/**
 * Qué puede hacer en esta sección quien la consulta.
 *
 * `ESCRITURA` y `APORTA` se pintan igual —las dos ofrecen el personal— pero se conservan
 * distintas porque **el cupo solo existe en `APORTA`**, y cuando el servidor rechaza una
 * asignación por cupo, el motivo se lee mejor sabiendo cuál de las dos era.
 */
export type AccesoSeccion = "ESCRITURA" | "APORTA" | "LECTURA";

/** Fila de la jornada: un operativo con sus columnas. */
export interface FilaJornada {
  id: number;
  identificador: string;
  /** Lote del registro-patrulla (Form 5/6): agrupa los N en la jornada. Nulo en el resto. */
  grupoRegistro: string | null;
  esAdicional: boolean;
  /** Identificador del operativo del que nace. Nulo en uno ordinario. */
  origen: string | null;
  horario: string;
  /**
   * Nombre y teléfono, que son las dos columnas que el cuadro pinta por persona.
   *
   * **CON TELÉFONO DESDE EL 2026-08-27**: la fila se agrupa por persona y el teléfono es
   * columna del cuadro (`FASE2 §16.1`, RF-015, RN-34). `null` es un caso real del maestro
   * y se dice con palabras, no se deja el hueco.
   *
   * **Sin `area`**, que sí trae `PersonaAsignada`: para editar el personal se pide
   * `GET /operativos/:id`, igual que hace P-05 al abrir una fila.
   */
  personal: {
    funcionarioId: number;
    nombre: string;
    telefono: string | null;
    esResponsable: boolean;
    /** Ventana efectiva de la persona (su turno propio o el del operativo). 2026-09-08. */
    horaInicio: string;
    horaFin: string;
  }[];
  zonales: string[];
  puntoEncuentro: string;
  tipoControl: string;
  instituciones: string[];
  conductor: string | null;
  placa: string | null;
  /** Notas del operativo (bitácora, 2026-09-09): los textos, EN ORDEN. Cada una es una nota
   * independiente y se pinta por separado; vacío si no hay ninguna. */
  observaciones: string[];
  estadoTransporte: EstadoTransporte;
  esNocturno: boolean;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * DE QUÉ ÁREAS ESPERA ESTE OPERATIVO PERSONAL **DE QUIEN CONSULTA**.
   *
   * Es el aviso de P-13, y ocupa el sitio de una notificación que no existe: cuando DMIP
   * Operativos registra un operativo de la 4 · Patrulla ECU Diurna, el DMIT lo ve aquí
   * con `["INSTRUCCION"]` y sabe que le toca poner a su gente. Vacío si no espera nada,
   * y vacío siempre en una sección de solo lectura.
   *
   * **NO ES `composicion.areasPendientes` de `Operativo`.** Aquella son las áreas que le
   * faltan al operativo mire quien mire; esta es la parte que le toca a quien mira. En la
   * 6 · Patrulla Reacción Nocturna un operativo vacío tiene tres pendientes y solo una es
   * del DMIT.
   *
   * **Llega calculada y no se recalcula aquí**, por el mismo motivo que las alertas: el
   * navegador no sabe de `farea_es_compartida`, y un segundo cálculo podría reclamar
   * gente que el servidor rechazaría al asignarla.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  areasPendientesDelRol: AreaPersonal[];
  /** POL-06. Por celda: la pantalla sabe cuál marcar en Amarillo de Alerta. */
  alertas: Alerta[];
}

export interface SeccionJornada {
  numero: number;
  codigo: string;
  nombre: string;
  /** Los colores los entrega el servidor. El frontend no los define ni los interpreta. */
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  responsable: string;
  /**
   * VA POR SECCIÓN, NO POR FILA. Todas las filas de una sección son del mismo
   * formulario, y el permiso de personal es del formulario. Repetirlo en cada fila daría
   * dos sitios donde consultarlo y dos que podrían discrepar.
   */
  acceso: AccesoSeccion;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * SI ESTA PANTALLA OFRECE LA ACCIÓN DE PERSONAL. 2026-09-01.
   *
   * NO SE DEDUCE DE `acceso`, Y DEDUCIRLO ERA EL DEFECTO. La tabla ofrecía la acción
   * donde `acceso !== "LECTURA"`, así que los dos departamentos a los que se abrió esta
   * rejilla ese mismo día podían asignar personal desde aquí sobre sus propios
   * formularios, cuando la decisión del negocio decía «solo en lectura».
   *
   * Son dos preguntas distintas: `acceso` es qué autoridad tiene el rol sobre el
   * formulario, y esto es si **P-13** es el sitio donde la ejerce. Un departamento con
   * ESCRITURA la ejerce en P-01 y P-02, que son sus pantallas.
   *
   * LO DECIDE EL SERVIDOR, contra `t_formulario_rol`. Aquí no se comprueba ningún rol.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  puedeEditarPersonal: boolean;
  totalOperativos: number;
  filas: FilaJornada[];
  /** RN-53. Presente solo si el formulario quedó vacío y su ventana venció. */
  evidencia: {
    leyenda: string;
    responsable: string;
    horaCierre: string | null;
  } | null;
}

export interface Jornada {
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
  };
  secciones: SeccionJornada[];
}
