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
  VERDE: "Carga Baja",
  AMBAR: "Carga Media",
  ROJO: "Carga Alta",
};

/**
 * Variante de color del distintivo de carga. El COLOR ACOMPAÑA al texto de `NIVEL_FATIGA`, no lo
 * sustituye (regla 6): quien no distingue color sigue leyendo «Carga alta». Los tres niveles llevan
 * el MISMO tratamiento —relleno tenue, borde y texto legible del color (`ui/tipografia.plugin.js`)—
 * y solo cambia la variante. Se pinta únicamente con `common/EtiquetaCarga.tsx` (2026-10-08).
 */
export const VARIANTE_CARGA: Record<NivelFatiga, string> = {
  VERDE: "badge-success",
  AMBAR: "badge-warning",
  ROJO: "badge-error",
};

/**
 * Tono de relleno por nivel para lo que NO es la etiqueta: los puntos del botón «Ver reparto de
 * carga» y la barra del reparto. Es el color de la variante —el mismo del borde de la etiqueta—,
 * así los tres sitios dicen el mismo verde, ámbar y rojo.
 */
export const TONO_CARGA: Record<NivelFatiga, string> = {
  VERDE: "bg-success",
  AMBAR: "bg-warning",
  ROJO: "bg-error",
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

/** Tres clases del reparto, para el color de la barra, el texto y los conteos del cuadrito. */
export type ClaseReparto = "bajo" | "en" | "sobre";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLASIFICACIÓN ÚNICA DEL REPARTO. 2026-10-01.
 *
 * De aquí salen el COLOR de la barra, el TEXTO y los CONTEOS del reparto de carga, para que no
 * discrepen entre sí. La tolerancia de «en su parte» la decide el SERVIDOR (es quien calcula la
 * equidad), así que se respeta `nivelEquidad` cuando viene: DEBAJO→'bajo', EQUILIBRADO→'en',
 * ENCIMA→'sobre'. Antes el color se sacaba del SIGNO de la desviación, y una desviación pequeña
 * no-cero —que el servidor considera «en su parte»— salía pintada de naranja: ese desajuste se
 * cierra usando el mismo veredicto del servidor en los tres sitios.
 *
 * Solo si `nivelEquidad` NO viene (señal advisory, opcional) se cae a comparar el índice contra la
 * cuota con una tolerancia pequeña (±5 % de la cuota, mínimo ±1), para no pintar «sobre» a quien
 * apenas la roza.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const clasificarReparto = (
  indice: number | undefined,
  cuota: number | undefined,
  nivelEquidad?: NivelEquidad,
): ClaseReparto => {
  if (nivelEquidad === "DEBAJO") return "bajo";
  if (nivelEquidad === "ENCIMA") return "sobre";
  if (nivelEquidad === "EQUILIBRADO") return "en";

  if (indice === undefined || cuota === undefined) return "en";
  const margen = Math.max(1, cuota * 0.05);
  if (indice < cuota - margen) return "bajo";
  if (indice > cuota + margen) return "sobre";
  return "en";
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

/**
 * SI EL SERVIDOR CALCULÓ LA CARGA (llega en los candidatos) y cuántos hay en cada nivel del
 * semáforo. Es lo que resume el botón «Ver reparto de carga». Vive aquí y no en el selector porque
 * desde el 2026-10-16 el botón lo pinta la cabecera de la tarjeta «Personal y horario».
 */
export const hayCargaCalculada = (candidatos: readonly PersonaElegible[]): boolean =>
  candidatos.some((persona) => persona.indiceCarga !== undefined);

export const conteoSemaforo = (
  candidatos: readonly PersonaElegible[],
): { baja: number; media: number; alta: number } =>
  candidatos.reduce(
    (cuenta, persona) => {
      if (persona.nivelFatiga === "VERDE") cuenta.baja += 1;
      else if (persona.nivelFatiga === "AMBAR") cuenta.media += 1;
      else if (persona.nivelFatiga === "ROJO") cuenta.alta += 1;
      return cuenta;
    },
    { baja: 0, media: 0, alta: 0 },
  );

/** Tope de «Completar con N de menor carga»: completa de a pocos, no vacía la lista (R4). */
export const MAXIMO_COMPLETAR = 4;

/**
 * CUÁNTOS AGREGA «COMPLETAR CON N DE MENOR CARGA» (R4, 2026-10-16): los elegibles disponibles, hasta
 * cuatro, y nunca más que los cupos libres SI hay un cupo real. Sin cupo (el operativo no declara un
 * número exigido de efectivos) solo acotan los elegibles y el tope. No se inventa un cupo.
 */
export const cuantosCompletar = (
  elegiblesLibres: number,
  asignados: number,
  cupo: number | null,
): number => {
  const libres = cupo === null ? Number.POSITIVE_INFINITY : Math.max(0, cupo - asignados);
  return Math.max(0, Math.min(MAXIMO_COMPLETAR, elegiblesLibres, libres));
};

export const NOMBRE_ESTADO_DISPONIBILIDAD: Record<EstadoDisponibilidad, string> =
  {
    DISPONIBLE: "Disponible",
    VACACIONES: "Vacaciones",
    // Rótulos del 2026-10-08: «Permiso médico» y «Calamidad doméstica» son los nombres del
    // negocio; el VALOR guardado no cambia (REPOSO_MEDICO, CALAMIDAD).
    REPOSO_MEDICO: "Permiso médico",
    CALAMIDAD: "Calamidad doméstica",
    PERMISO: "Permiso",
    LICENCIA: "Licencia",
    CAPACITACION: "Capacitación",
    COMISION_SERVICIOS: "Comisión de servicios",
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
  // Las tres del 2026-10-08 (migración aditiva del servidor). Todas excluyen del cuadro.
  "LICENCIA",
  "CAPACITACION",
  "COMISION_SERVICIOS",
  "CALAMIDAD",
  // Se conserva por los registros existentes: el negocio ya no la nombra, pero hay periodos con ella.
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

/*
  `ausenciaVigente` y `textoDeAusencia` se retiraron el 2026-10-08: la lista ya no pregunta
  persona por persona sino que recibe las ausencias en curso y próximas de todo el maestro, y elige
  cuál mostrar con `ausenciaAMostrar` de `utils/ausencias.util.ts` (extremos incluidos, mismo
  criterio de cadenas `AAAA-MM-DD`).
*/

/** Filtros de la pantalla. Vacío significa «sin filtrar». */
export interface FiltrosPersonal {
  busqueda?: string;
  area?: AreaPersonal | "";
  contrato?: TipoContrato | "";
  /** `""` todos · `activos` · `inactivos`. */
  estado?: "" | "activos" | "inactivos";
}

/**
 * LOS FILTROS CON LOS QUE ABRE LA PANTALLA (2026-10-08): **solo activos**. Antes abría con todos y
 * el contador decía «68 de 68» aunque 38 fueran bajas. «Limpiar filtros» vuelve AQUÍ, no a vacío.
 */
export const FILTROS_INICIALES: FiltrosPersonal = { estado: "activos" };

/**
 * TELÉFONO: celular de diez dígitos que empieza por 09 (2026-10-08). Espejo de `esTelefonoValido`
 * del servidor: tolera espacios y guiones, como él. Vacío no se valida aquí (es opcional).
 */
export const esTelefonoValido = (telefono: string): boolean =>
  /^09\d{8}$/.test(telefono.replace(/[\s-]/g, ""));

/** CORREO con forma `x@y.z` (2026-10-08), la misma vara genérica que `esCorreoValido` del servidor. */
export const esCorreoValido = (correo: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

/**
 * «TIENE FICHA», CON UN SOLO CRITERIO (2026-10-08). La cédula es única en todo el sistema, así que
 * quien ya tiene ficha —de cualquier dirección— no puede recibir otra. En el paso 1 del alta:
 *
 *   · Ficha ACTIVA → se OCULTA por omisión y es la que cuenta en «M ya tienen ficha (ocultos)».
 *   · Ficha DADA DE BAJA → se muestra, con «Ficha dada de baja», y no se puede elegir: se reactiva.
 *
 * Antes «71 ya tienen ficha» sumaba activas y bajas de las cuatro direcciones, mientras el maestro
 * decía «68 de 68» sobre las de quien mira. Siguen siendo dos números distintos —uno es de toda la
 * AMC y el otro de sus direcciones—, pero ya miden lo mismo.
 */
export const tieneFichaActiva = (fila: {
  ficha: { activo: boolean } | null;
}): boolean => fila.ficha?.activo === true;

/**
 * Rótulo corto de una dependencia de Auth para su chip (2026-10-08): «Dirección Metropolitana de
 * Inspección» → «Inspección». El nombre completo sigue en el `title` y en cada fila.
 */
export const rotuloDeDependencia = (dependencia: string): string =>
  dependencia
    .replace(/^direcci[oó]n\s+metropolitana\s+(de\s+(la\s+)?)?/i, "")
    .trim() || dependencia;

export const contarFichasActivas = (
  filas: { ficha: { activo: boolean } | null }[],
): number => filas.filter(tieneFichaActiva).length;

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

/** Si hay algún filtro DISTINTO de los iniciales (el «Activos» por omisión no cuenta). */
export const hayFiltrosDePersonal = (filtros: FiltrosPersonal): boolean =>
  Boolean(
    (filtros.busqueda ?? "").trim() ||
      filtros.area ||
      filtros.contrato ||
      (filtros.estado ?? "") !== (FILTROS_INICIALES.estado ?? ""),
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
