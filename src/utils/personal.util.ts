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
  MotivoBaja,
  NivelEquidad,
  NivelFatiga,
  PersonaElegible,
  TipoContrato,
} from "../interfaces/Personal";
import type { AreaPersonal } from "../interfaces/Formulario";
import type { RolDepartamental } from "../config/env";
import { normalizar } from "./texto.util";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL NOMBRE QUE SE VE NO ES EL VALOR QUE SE GUARDA. Renombrado el 2026-08-27.
 *
 * El negocio pidió llamar a las áreas por su denominación institucional. **Se cambió el
 * rótulo, no el enumerado**: en la base sigue diciendo `OPERATIVOS` y `TECNICO`, igual que
 * el rol sigue siendo `DMIP_OPERATIVOS`. Renombrar los valores habría exigido una
 * migración irreversible en caliente sobre cuatro columnas para no ganar nada: el código
 * interno no lo lee ningún usuario.
 *
 * ESTE MAPA ES LA ÚNICA TRADUCCIÓN, y por eso importa que nadie pinte `persona.area` en
 * crudo. Hasta hoy lo hacían dos sitios —la ficha del candidato y el aviso de áreas
 * pendientes— y con nombres de una palabra apenas se notaba; con «Inspector Técnico -
 * DMIP» al lado de «TECNICO» se nota mucho. Los dos pasan ya por aquí.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const NOMBRE_AREA: Record<AreaPersonal, string> = {
  GENERAL: "Inspector General - DMIP",
  TECNICO: "Inspector Técnico - DMIP",
  INSTRUCCION: "Personal de Instrucción",
  OPERATIVOS: "Unidad de Operativos",
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

/**
 * MOTIVO DE LA BAJA en palabras (2026-09-30). El servidor guarda el código; la pantalla lo ofrece y
 * lo muestra así. «Otro» exige un detalle escrito (lo valida el modal de baja).
 */
export const NOMBRE_MOTIVO_BAJA: Record<MotivoBaja, string> = {
  FIN_CONTRATO: "Fin de contrato",
  RENUNCIA: "Renuncia",
  TRASLADO: "Traslado",
  OTRO: "Otro",
};

/**
 * SEMÁFORO DE FATIGA EN PALABRAS (FRMS / ISO 45001). El servidor manda el nivel
 * (`VERDE/AMBAR/ROJO`); la pantalla lo muestra como carga baja/media/alta. El texto es la señal
 * (regla 6): no se depende del color, y el badge va en `badge-ghost` (neutro, del inventario).
 */
export const NIVEL_FATIGA: Record<NivelFatiga, string> = {
  VERDE: "Carga baja",
  AMBAR: "Carga media",
  ROJO: "Carga alta",
};

/**
 * Color del badge por nivel (semáforo). El COLOR ACOMPAÑA al texto de `NIVEL_FATIGA`, no lo
 * sustituye (regla 6): quien no distingue color sigue leyendo «Carga alta». Clases de badge de
 * daisyUI (chips pequeños, no fondos sólidos de botón).
 */
export const CLASE_BADGE_FATIGA: Record<NivelFatiga, string> = {
  VERDE: "badge-success",
  AMBAR: "badge-warning",
  ROJO: "badge-error",
};

/**
 * SEÑAL DE EQUIDAD EN PALABRAS (reparto). Distinta de la fatiga: la fatiga es seguridad (absoluta);
 * esto dice si la persona carga más o menos que su PARTE JUSTA —la media del grupo—. El servidor
 * manda `DEBAJO/EQUILIBRADO/ENCIMA`; la pantalla lo muestra así. El texto es la señal (regla 6).
 */
export const NIVEL_EQUIDAD: Record<NivelEquidad, string> = {
  DEBAJO: "Bajo su parte",
  EQUILIBRADO: "En su parte",
  ENCIMA: "Sobre su parte",
};

/**
 * Color del badge de equidad. El COLOR ACOMPAÑA al texto de `NIVEL_EQUIDAD`, no lo sustituye
 * (regla 6). Quien carga por ENCIMA de su parte va en aviso (warning); DEBAJO en éxito —tiene
 * margen para recibir más—; en su parte, neutro. Clases de badge del inventario.
 */
export const CLASE_BADGE_EQUIDAD: Record<NivelEquidad, string> = {
  DEBAJO: "badge-success",
  EQUILIBRADO: "badge-ghost",
  ENCIMA: "badge-warning",
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ORDEN POR CARGA EN EL SELECTOR DE ASIGNACIÓN. 2026-09-25.
 *
 * El personal se ofrece SIEMPRE de menor a mayor carga —carga baja, luego media, luego
 * alta—, para que quien arma el cuadro vea arriba a quien menos acumula y reparta de forma
 * equitativa (la misma intención que «Sugerido»). El servidor calcula el índice pero **no
 * reordena** —es advisory (ver `personal-elegible.service.ts`)—, así que el orden es una
 * decisión de la pantalla y por eso vive aquí, en un solo sitio.
 *
 * LOS ELEGIBLES VAN PRIMERO: a quien no se puede convocar tampoco se le puede elegir, así que
 * no encabeza la lista aunque su carga sea baja —quedaría por encima de gente que sí es
 * asignable—. A igualdad de nivel, el índice afina (menor arriba); quien no trae carga
 * calculada va al final. Es ESTABLE: los empates conservan el orden que ya traían (el
 * alfabético del servidor).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const ORDEN_FATIGA: Record<NivelFatiga, number> = { VERDE: 0, AMBAR: 1, ROJO: 2 };

/** Peso de carga para ordenar; sin nivel calculado va al final (tras VERDE/AMBAR/ROJO). */
const pesoDeCarga = (persona: PersonaElegible): number =>
  persona.nivelFatiga ? ORDEN_FATIGA[persona.nivelFatiga] : 3;

/**
 * Compara dos candidatos por carga para ordenar el selector: elegibles primero y, dentro de
 * cada grupo, de menor a mayor carga (nivel del semáforo y, a igualdad, el índice).
 */
export const compararPorCarga = (
  a: PersonaElegible,
  b: PersonaElegible,
): number => {
  if (a.elegible !== b.elegible) return a.elegible ? -1 : 1;

  const porNivel = pesoDeCarga(a) - pesoDeCarga(b);
  if (porNivel !== 0) return porNivel;

  return (a.indiceCarga ?? 0) - (b.indiceCarga ?? 0);
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
  // Los tres del 2026-09-01. No son direcciones con personal, pero el mapa se pinta
  // también sobre `func_direccion` de fichas ya guardadas y sobre filas de auditoría,
  // así que tiene que saber nombrarlos.
  ADMINISTRADOR_DMIP: "Administración DMIP",
  ADMINISTRADOR_DMIT: "Administración DMIT",
  ADMINISTRADOR_DAF: "Administración DAF",
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TURNO HEREDADO DE LA PRIMERA PERSONA (DEFAULT-FROM-FIRST). 2026-09-08.
 *
 * Al AGREGAR a alguien al operativo, su turno propio arranca copiando el de la PRIMERA
 * persona ya asignada: un operativo casi siempre comparte horario, así que teclearlo una
 * vez y heredarlo ahorra el trabajo repetido que el operador de central hace decenas de
 * veces al día. Queda editable después. La primera persona no tiene de quién heredar, así
 * que sale vacía —`horaInicio`/`horaFin` sin valor—, que es «Operativo» (hereda el del
 * operativo).
 *
 * VIVE AQUÍ, EN UN SOLO SITIO, y no en cada página: P-01 (`agregarPersona`) y el adicional
 * de P-06 (`OrdenesServicioPage`) construyen la lista igual, y dos copias de esta regla
 * acabarían separándose. Es genérico —solo mira `horaInicio`/`horaFin`— para no atar la
 * utilidad al tipo del componente.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const turnoDePrimera = <
  T extends { horaInicio?: string; horaFin?: string },
>(
  agregadas: T[],
): { horaInicio?: string; horaFin?: string } => {
  const primera = agregadas[0];

  return { horaInicio: primera?.horaInicio, horaFin: primera?.horaFin };
};
