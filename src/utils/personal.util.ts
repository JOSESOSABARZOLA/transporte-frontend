/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: personal.util.ts
 * Responsabilidad: Nombrar en español lo que el contrato enumera, y decidir si alguien está ausente.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * «REPOSO_MEDICO» NO ES UN TEXTO DE INTERFAZ. Es el valor del contrato.
 *
 * Mostrarlo tal cual obligaría al administrador a traducir mentalmente en cada fila, y
 * dejaría en pantalla la forma en que la base guarda las cosas —que es exactamente lo que
 * un sistema bien hecho no enseña—. Aquí viven las traducciones, en un solo sitio, para
 * que ninguna pantalla invente la suya.
 *
 * La regla 7 de CLAUDE.md —«los mensajes de error del servidor se muestran tal cual»— no
 * entra en conflicto: un enumerado no es un mensaje. Los mensajes siguen llegando escritos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  Disponibilidad,
  EstadoDisponibilidad,
  Funcionario,
  TipoContrato,
} from "../interfaces/Personal";
import type { AreaPersonal } from "../interfaces/Formulario";
import type { RolDepartamental } from "../config/env";
import { normalizar } from "./texto.util";

export const NOMBRE_AREA: Record<AreaPersonal, string> = {
  GENERAL: "General",
  TECNICO: "Técnico",
  INSTRUCCION: "Instrucción",
  OPERATIVOS: "Operativos",
  CCF: "CCF",
};

/**
 * `NOMBRAMIENTO` y `OCASIONAL` no son etiquetas administrativas cualesquiera.
 *
 * De ellas depende RN-26: quién puede salir de noche y en fin de semana. Por eso el
 * formulario de alta explica la consecuencia en lugar de limitarse a pedir el dato.
 */
export const NOMBRE_CONTRATO: Record<TipoContrato, string> = {
  NOMBRAMIENTO: "Nombramiento",
  OCASIONAL: "Ocasional",
};

export const NOMBRE_ESTADO_DISPONIBILIDAD: Record<EstadoDisponibilidad, string> =
  {
    DISPONIBLE: "Disponible",
    VACACIONES: "Vacaciones",
    REPOSO_MEDICO: "Reposo médico",
    CALAMIDAD: "Calamidad doméstica",
    PERMISO: "Permiso",
    MANTENIMIENTO: "Mantenimiento",
  };

/**
 * Situaciones que se pueden registrar sobre una persona.
 *
 * `MANTENIMIENTO` es de vehículos y el servidor la rechaza con su propio mensaje;
 * ofrecerla en el desplegable sería invitar a un error que ya sabemos que va a ocurrir.
 * `DISPONIBLE` tampoco se ofrece: registrar «esta persona está disponible del 1 al 15» no
 * describe una ausencia, y quien quiere devolverla al servicio **retira** el periodo.
 */
export const SITUACIONES_DE_AUSENCIA: EstadoDisponibilidad[] = [
  "VACACIONES",
  "REPOSO_MEDICO",
  "CALAMIDAD",
  "PERMISO",
];

/** Dirección a la que pertenece el funcionario, en las palabras del organigrama. */
export const NOMBRE_DIRECCION: Record<RolDepartamental, string> = {
  DMIP_OPERATIVOS: "DMIP Operativos",
  DMIP_INSPECCIONES: "DMIP Inspecciones",
  DMIT_INSTRUCTOR: "DMIT Instrucción",
  DAF: "DAF",
  DIRECTOR: "Dirección",
  ADMINISTRADOR: "Administración",
  FUNCIONARIO: "Funcionario",
};

export const nombreCompleto = (funcionario: Funcionario): string =>
  `${funcionario.apellidos} ${funcionario.nombres}`;

/**
 * El periodo que cubre hoy, si lo hay.
 *
 * Los extremos **entran**: `ck_disponibilidad_rango` admite `desde = hasta`, es decir una
 * ausencia de un solo día, y quien está de permiso ese día lo está el día entero.
 *
 * Se comparan cadenas `AAAA-MM-DD` y no fechas, a propósito: son fechas de calendario
 * —`@db.Date` en el servidor— y convertirlas a `Date` las movería un día en cualquier
 * huso al oeste de Greenwich, que es donde está Quito. El orden lexicográfico de ese
 * formato coincide con el cronológico.
 */
export const ausenciaVigente = (
  ausencias: Disponibilidad[],
  hoy: string,
): Disponibilidad | null =>
  ausencias.find(
    (periodo) => periodo.desde <= hoy && hoy <= periodo.hasta,
  ) ?? null;

/** Texto de la ausencia vigente: la situación y hasta cuándo. Regla 6. */
export const textoDeAusencia = (ausencia: Disponibilidad): string =>
  `${NOMBRE_ESTADO_DISPONIBILIDAD[ausencia.estado]} hasta el ${ausencia.hasta}`;

/** Filtros de la pantalla. Vacío significa «sin filtrar». */
export interface FiltrosPersonal {
  busqueda?: string;
  area?: AreaPersonal | "";
  contrato?: TipoContrato | "";
  /** `""` todos · `activos` · `inactivos`. */
  estado?: "" | "activos" | "inactivos";
}


/**
 * Filtra en memoria sobre el maestro ya recibido.
 *
 * El servidor admite `area` y `direccion` como parámetros, pero no `tipoContrato` ni la
 * búsqueda por nombre. Repartir los filtros entre servidor y memoria daría dos
 * comportamientos distintos en la misma barra —unos recargarían y otros no—, así que se
 * pide el maestro una vez y se filtra aquí. Son decenas de fichas, no miles.
 */
export const filtrarPersonal = (
  personal: Funcionario[],
  filtros: FiltrosPersonal,
): Funcionario[] => {
  const buscado = normalizar(filtros.busqueda ?? "");

  return personal.filter((funcionario) => {
    if (filtros.area && funcionario.area !== filtros.area) return false;
    if (filtros.contrato && funcionario.tipoContrato !== filtros.contrato) {
      return false;
    }
    if (filtros.estado === "activos" && !funcionario.activo) return false;
    if (filtros.estado === "inactivos" && funcionario.activo) return false;

    if (!buscado) return true;

    return normalizar(
      `${funcionario.cedula} ${nombreCompleto(funcionario)} ${funcionario.cargo ?? ""}`,
    ).includes(buscado);
  });
};

export const hayFiltrosDePersonal = (filtros: FiltrosPersonal): boolean =>
  Boolean(
    (filtros.busqueda ?? "").trim() ||
      filtros.area ||
      filtros.contrato ||
      filtros.estado,
  );
