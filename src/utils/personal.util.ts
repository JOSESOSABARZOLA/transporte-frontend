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

import {
  nombreDePersona,
  type EstadoDisponibilidad,
  type Funcionario,
  type MotivoBaja,
  type NivelEquidad,
  type NivelFatiga,
  type OperativoDelDia,
  type PersonaElegible,
} from "../interfaces/Personal";
import type { AreaPersonal } from "../interfaces/Formulario";
import type { RolDepartamental } from "../config/env";
import { horarioLegible, normalizar } from "./texto.util";
import { comoHorario, comoHoraInstitucional, esHoraValida, seCruzan } from "./horario.util.ts";
import { identificadorCorto } from "./rangoIdentificadores.util.ts";

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
 * `NOMBRE_CONTRATO` se retiró el 2026-10-23: el tipo de contrato se dio de baja y lo reemplaza la
 * jornada laboral, un catálogo del servidor (`useJornadasLaborales`, `utils/jornadaLaboral.util.ts`).
 */

/** El valor del filtro «Jornada» para quien aún no tiene jornada asignada. */
export const FILTRO_SIN_JORNADA = "sin";

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
 * asignable—. Quien no trae carga calculada va al final.
 *
 * POR OPERATIVOS DESDE EL 2026-10-30: nivel de carga (`nivelCarga`, por operativos de la semana),
 * luego cuántos operativos, luego el índice de horas (desempate) y, por último, el apellido. Así el
 * orden coincide con la etiqueta y con «N op. esta semana».
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const ORDEN_FATIGA: Record<NivelFatiga, number> = { VERDE: 0, AMBAR: 1, ROJO: 2 };

/** Peso de carga para ordenar; sin nivel calculado va al final (tras VERDE/AMBAR/ROJO). */
const pesoDeCarga = (persona: PersonaElegible): number =>
  persona.nivelCarga ? ORDEN_FATIGA[persona.nivelCarga] : 3;

/**
 * Compara dos candidatos por carga para ordenar el selector: elegibles primero y, dentro de
 * cada grupo, nivel de carga → operativos de la semana → índice de horas → apellido.
 */
export const compararPorCarga = (
  a: PersonaElegible,
  b: PersonaElegible,
): number => {
  if (a.elegible !== b.elegible) return a.elegible ? -1 : 1;

  const porNivel = pesoDeCarga(a) - pesoDeCarga(b);
  if (porNivel !== 0) return porNivel;

  const porOperativos =
    (a.operativosAsignados ?? 0) - (b.operativosAsignados ?? 0);
  if (porOperativos !== 0) return porOperativos;

  const porIndice = (a.indiceCarga ?? 0) - (b.indiceCarga ?? 0);
  if (porIndice !== 0) return porIndice;

  return nombreDePersona(a).localeCompare(nombreDePersona(b));
};

/**
 * SI EL SERVIDOR CALCULÓ LA CARGA (llega en los candidatos) y cuántos hay en cada nivel del
 * semáforo. Es lo que resume el botón «Ver reparto de carga». Vive aquí y no en el selector porque
 * desde el 2026-10-16 el botón lo pinta la cabecera de la tarjeta «Personal y horario».
 */
export const hayCargaCalculada = (candidatos: readonly ConCarga[]): boolean =>
  candidatos.some((persona) => persona.indiceCarga !== undefined);

/**
 * Lo que necesitan el semáforo y el aviso de carga: la persona del registro o, desde el 2026-10-30,
 * el conductor de la DAF, que trae las mismas señales.
 */
type ConCarga = Pick<PersonaElegible, "indiceCarga" | "nivelFatiga">;

/**
 * Una fila de `RepartoCarga` (2026-10-30): lo que se lee de una persona o de un conductor. Las
 * señales son las mismas que calcula el servidor para los dos (fatiga y equidad); `area` solo la
 * tiene el personal.
 */
export type FilaReparto = Pick<
  PersonaElegible,
  | "id"
  | "elegible"
  | "motivo"
  | "indiceCarga"
  | "operativosAsignados"
  | "desviacionCarga"
  | "nivelEquidad"
  | "sugerido"
> & {
  nombre: string;
  area?: AreaPersonal;
  /**
   * El nivel que pinta la etiqueta y el color de la barra (2026-10-30): el del PERSONAL es por
   * operativos (`nivelCarga`); el del conductor de la DAF, su fatiga (`nivelFatiga`).
   */
  nivel?: NivelFatiga;
};

/** La persona del registro como fila del reparto: su nivel es el de carga por operativos. */
export const filaDePersona = (persona: PersonaElegible): FilaReparto => ({
  ...persona,
  nombre: nombreDePersona(persona),
  nivel: persona.nivelCarga,
});

/**
 * AVISO DE CARGA ALTA AL SELECCIONAR (2026-10-30). Al agregar a una persona o asignar a un
 * conductor con «Carga Alta» (fatiga `ROJO`, el umbral `FATIGA_UMBRAL_ROJO`) sale un aviso breve
 * INFORMATIVO: no frena ni pregunta, la selección ya se hizo. Varios a la vez («Completar con N»)
 * dan UN solo aviso con sus nombres. Sin nadie en carga alta, `null`: no se avisa.
 */
export const avisoCargaAlta = (
  seleccionados: readonly (ConCarga & {
    nombre: string;
    operativosAsignados?: number;
  })[],
): { titulo: string; texto: string } | null => {
  const altos = seleccionados.filter((s) => s.nivelFatiga === "ROJO");
  if (altos.length === 0) return null;
  if (altos.length === 1) {
    const [uno] = altos;
    const cuantos =
      uno.operativosAsignados !== undefined
        ? ` (${uno.operativosAsignados} ${uno.operativosAsignados === 1 ? "operativo" : "operativos"} esta semana)`
        : "";
    return {
      titulo: "Carga alta de operativos",
      texto: `${uno.nombre} tiene una carga alta de operativos${cuantos}. Considere repartir con quien tenga menos carga.`,
    };
  }
  return {
    titulo: "Carga alta de operativos",
    texto: `${altos.length} de los seleccionados tienen una carga alta de operativos: ${altos
      .map((s) => s.nombre)
      .join(", ")}. Considere repartir con quien tenga menos carga.`,
  };
};

/**
 * CARGA ALTA ANTES DE AGREGAR (2026-10-30). Al pulsar «+ Agregar» o «Reemplazar» sobre alguien con
 * «Carga Alta» —por OPERATIVOS de la semana, `nivelCarga` `ROJO`— no se agrega todavía: se pregunta
 * con un `MensajeModal` advertencia. Es solo un aviso: «Agregar igual» siempre está, y no cambia
 * ninguna regla de elegibilidad.
 */
export const pideConfirmarCarga = (persona: PersonaElegible): boolean =>
  persona.nivelCarga === "ROJO";

/** Tope de personas que propone el modal de carga alta. */
export const MAXIMO_SUGERENCIAS_CARGA = 3;

/**
 * A QUIÉN PROPONER EN SU LUGAR (hasta tres): personas DISPONIBLES (elegibles y aún no agregadas) del
 * MISMO tipo de personal, con MENOS operativos que la elegida y que NO estén en Carga Alta, en el
 * orden del selector (`compararPorCarga`). Sin nadie así, la lista va vacía y el modal no propone.
 *
 * Con el horario del operativo (2026-10-31) tampoco propone a quien se cruza con él: la misma regla de
 * las etiquetas (`ocupacionDe`, espejo de RN-28). Sin horario no se juzga el cruce.
 */
export const sugerenciasDeMenorCarga = (
  elegida: PersonaElegible,
  candidatos: readonly PersonaElegible[],
  idsAgregados: readonly number[],
  horario: HorarioDelOperativo | null = null,
  maximo: number = MAXIMO_SUGERENCIAS_CARGA,
): PersonaElegible[] => {
  const agregados = new Set(idsAgregados);
  const suyos = elegida.operativosAsignados ?? 0;
  return candidatos
    .filter(
      (c) =>
        c.id !== elegida.id &&
        c.elegible &&
        !agregados.has(c.id) &&
        c.area === elegida.area &&
        c.nivelCarga !== "ROJO" &&
        c.operativosAsignados !== undefined &&
        c.operativosAsignados < suyos &&
        ocupacionDe(c, horario).estado !== "CRUCE",
    )
    .sort(compararPorCarga)
    .slice(0, maximo);
};

/** «N op. esta semana» (corto) o «N operativos esta semana», o nada si el servidor no lo trae. */
export const operativosDeLaSemana = (
  cantidad: number | undefined,
  corto: boolean,
): string | null => {
  if (cantidad === undefined) return null;
  if (corto) return `${cantidad} op. esta semana`;
  return `${cantidad} ${cantidad === 1 ? "operativo" : "operativos"} esta semana`;
};

/** Los textos del modal de carga alta: título y mensaje (la lista de sugeridas va aparte). */
export const textoModalCargaAlta = (
  elegida: PersonaElegible,
): { titulo: string; mensaje: string } => {
  const semana = operativosDeLaSemana(elegida.operativosAsignados, false);
  return {
    titulo: `${nombreDePersona(elegida)} tiene carga alta`,
    mensaje: `${
      semana ? `Ya tiene ${semana}.` : "Ya tiene una carga alta esta semana."
    } Considere repartir con quien tenga menos carga.`,
  };
};

/**
 * Cuántos hay en cada nivel del semáforo: lo que resume el botón «Ver reparto de carga». El
 * PERSONAL cuenta por `nivelCarga` (operativos, 2026-10-30, con `nivelDeCargaPersonal`); la DAF,
 * por omisión, por la fatiga del conductor (`nivelFatiga`).
 */
export const conteoSemaforo = <T extends ConCarga>(
  candidatos: readonly T[],
  nivelDe: (item: T) => NivelFatiga | undefined = (item) => item.nivelFatiga,
): { baja: number; media: number; alta: number } =>
  candidatos.reduce(
    (cuenta, persona) => {
      const nivel = nivelDe(persona);
      if (nivel === "VERDE") cuenta.baja += 1;
      else if (nivel === "AMBAR") cuenta.media += 1;
      else if (nivel === "ROJO") cuenta.alta += 1;
      return cuenta;
    },
    { baja: 0, media: 0, alta: 0 },
  );

/** El nivel de carga del personal (por operativos), para `conteoSemaforo`. */
export const nivelDeCargaPersonal = (
  persona: PersonaElegible,
): NivelFatiga | undefined => persona.nivelCarga;

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
  /** Id de la jornada laboral como texto, `FILTRO_SIN_JORNADA` o "" (todas). */
  jornada?: string;
  /** `""` todos · `activos` · `inactivos`. */
  estado?: "" | "activos" | "inactivos";
}

/**
 * LOS FILTROS CON LOS QUE ABRE LA PANTALLA (2026-10-08): **solo activos**. Antes abría con todos y
 * el contador decía «68 de 68» aunque 38 fueran bajas. «Limpiar filtros» vuelve AQUÍ, no a vacío.
 */
export const FILTROS_INICIALES: FiltrosPersonal = { estado: "activos" };

/**
 * Los filtros iniciales con la jornada que llega en la URL (`?jornada=<id>` o `?jornada=sin`,
 * 2026-10-24): el enlace «N fichas de personal →» de «Jornadas laborales» abre la pantalla ya
 * filtrada. Un valor que no es un id ni `sin` se ignora.
 */
export const filtrosDesdeUrl = (busqueda: string): FiltrosPersonal => {
  const jornada = new URLSearchParams(busqueda).get("jornada");
  if (jornada === null || !(jornada === FILTRO_SIN_JORNADA || /^\d+$/.test(jornada))) {
    return FILTROS_INICIALES;
  }
  return { ...FILTROS_INICIALES, jornada };
};

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
 * El servidor admite `area` y `direccion` como parámetros, pero no la jornada laboral ni la
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
    if (filtros.jornada === FILTRO_SIN_JORNADA && funcionario.jornadaLaboralId != null) {
      return false;
    }
    if (
      filtros.jornada &&
      filtros.jornada !== FILTRO_SIN_JORNADA &&
      String(funcionario.jornadaLaboralId) !== filtros.jornada
    ) {
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
      filtros.jornada ||
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
/**
 * «REEMPLAZAR» (2026-10-28, formularios de UNA persona por operativo: el 8). La persona nueva ocupa
 * el lugar de la saliente y CONSERVA lo que es del puesto —horario, cantidad de operativos, quién la
 * asignó—; lo que es de la persona —nombre, área, cargo, teléfono y trámite de Inspección— se renueva.
 * Sirve igual al alta (`PersonaAgregada`) que al borrador de la edición (`PersonaAsignada`).
 */
export const conPersonaReemplazada = <T extends { funcionarioId: number }>(
  lista: readonly T[],
  salienteId: number,
  entrante: PersonaElegible,
): T[] =>
  lista.map((persona) =>
    persona.funcionarioId === salienteId
      ? ({
          ...persona,
          funcionarioId: entrante.id,
          nombre: nombreDePersona(entrante),
          area: entrante.area,
          // RN-34: el teléfono lo resuelve el servidor; el cargo, del Maestro hasta que confirme.
          telefono: null,
          cargo: entrante.cargo?.trim() || null,
          tramiteCodigo: null,
          tramiteInspeccion: null,
        } as T)
      : persona,
  );

export const turnoDePrimera = <
  T extends { horaInicio?: string; horaFin?: string },
>(
  agregadas: T[],
): { horaInicio?: string; horaFin?: string } => {
  const primera = agregadas[0];

  return { horaInicio: primera?.horaInicio, horaFin: primera?.horaFin };
};

/*
  ═══════════════════════════════════════════════════════════════════════════════
  OCUPACIÓN DEL DÍA (2026-10-31). Al asignar personal se ve, antes de guardar, si la persona ya está
  en otro operativo ese día y si se cruza con el horario del operativo. El cruce lo decide
  `seCruzan` (espejo de RN-28); el servidor sigue siendo la autoridad al guardar.
  ═══════════════════════════════════════════════════════════════════════════════
*/

/** El horario del operativo que se arma: inicio y fin, o nada si falta alguno. */
export type HorarioDelOperativo = { horaInicio: string; horaFin: string };

/** ¿Tiene las dos horas bien escritas? Sin eso no se juzga el cruce. */
export const horarioCompleto = (
  horario: { horaInicio?: string | null; horaFin?: string | null } | null | undefined,
): horario is HorarioDelOperativo =>
  Boolean(horario?.horaInicio && horario?.horaFin) &&
  esHoraValida(horario?.horaInicio ?? "") &&
  esHoraValida(horario?.horaFin ?? "");

/** LIBRE ese día; OCUPADO en otro operativo que no choca; CRUCE si alguno choca con el horario. */
export type EstadoOcupacion = "LIBRE" | "OCUPADO" | "CRUCE";

export type Ocupacion = {
  estado: EstadoOcupacion;
  operativos: OperativoDelDia[];
  /** Los que chocan con el horario (vacío sin horario: no se juzga). */
  cruces: OperativoDelDia[];
};

export const ocupacionDe = (
  persona: { operativosDelDia?: OperativoDelDia[] },
  horario: HorarioDelOperativo | null,
): Ocupacion => {
  const operativos = persona.operativosDelDia ?? [];
  const cruces = horarioCompleto(horario)
    ? operativos.filter((operativo) => seCruzan(operativo, horario))
    : [];
  const estado: EstadoOcupacion =
    operativos.length === 0 ? "LIBRE" : cruces.length > 0 ? "CRUCE" : "OCUPADO";
  return { estado, operativos, cruces };
};

/** Libres, luego ocupados sin cruce, luego con cruce. */
export const ORDEN_OCUPACION: Record<EstadoOcupacion, number> = { LIBRE: 0, OCUPADO: 1, CRUCE: 2 };

/** «08H00–16H30», corto, para la etiqueta. */
const horarioCorto = (operativo: { horaInicio: string; horaFin: string }): string =>
  `${comoHoraInstitucional(operativo.horaInicio)}–${comoHoraInstitucional(operativo.horaFin)}`;

/** «08H00 a 16H30», el de las tablas. */
const horarioLargo = (operativo: { horaInicio: string; horaFin: string }): string =>
  horarioLegible(comoHorario(operativo.horaInicio, operativo.horaFin));

/** «Ocupado 08H00–16H30», «Se cruza 18H00–22H00 +1», o `null` si está libre. */
export const etiquetaOcupacion = (ocupacion: Ocupacion): string | null => {
  if (ocupacion.estado === "LIBRE") return null;
  const lista = ocupacion.estado === "CRUCE" ? ocupacion.cruces : ocupacion.operativos;
  const mas = lista.length > 1 ? ` +${lista.length - 1}` : "";
  return `${ocupacion.estado === "CRUCE" ? "Se cruza" : "Ocupado"} ${horarioCorto(lista[0])}${mas}`;
};

/**
 * Una línea del globito: «OCF-001-31-OCT-2026 · 1. OCF · 08H00 a 16H30 · Zonal Calderón · Estación
 * Río Coca». RN-48: de un operativo ajeno, «08H00 a 16H30 · otro departamento».
 */
export const lineaOperativoDelDia = (operativo: OperativoDelDia): string =>
  operativo.ajeno
    ? `${horarioLargo(operativo)} · otro departamento`
    : [
        operativo.identificador,
        `${operativo.formulario.numero}. ${operativo.formulario.codigo}`,
        horarioLargo(operativo),
        operativo.zonal,
        operativo.punto,
      ]
        .filter(Boolean)
        .join(" · ");

/** La última línea del globito: si choca o no con el horario del operativo. Sin horario, `null`. */
export const cierreOcupacion = (
  ocupacion: Ocupacion,
  horario: HorarioDelOperativo | null,
): string | null => {
  if (!horarioCompleto(horario) || ocupacion.estado === "LIBRE") return null;
  return ocupacion.estado === "CRUCE"
    ? `Choca con ${horarioLargo(horario)}: si lo agrega, cambie el horario`
    : `No choca con ${horarioLargo(horario)}: se puede agregar`;
};

/**
 * Bajo una persona elegida que se cruza: «⚠ Se cruza con OCF-001 (08H00 a 16H30). Cambie el horario
 * o quítelo.». De un operativo ajeno: «con un operativo de otro departamento».
 */
export const avisoCruceSeleccionado = (ocupacion: Ocupacion): string | null => {
  const choque = ocupacion.cruces[0];
  if (!choque) return null;
  const con = choque.ajeno
    ? "un operativo de otro departamento"
    : identificadorCorto(choque.identificador);
  return `⚠ Se cruza con ${con} (${horarioLargo(choque)}). Cambie el horario o quítelo.`;
};

/** «Revise los horarios · 2 personas se cruzan con otro operativo», o `null` sin cruces. */
export const motivoCruces = (cuantas: number): string | null =>
  cuantas === 0
    ? null
    : `Revise los horarios · ${cuantas} ${cuantas === 1 ? "persona se cruza" : "personas se cruzan"} con otro operativo`;

/** El horario más común del personal (al editar): el que llevan más personas; `null` sin horarios. */
export const horarioMasComun = (
  personal: ReadonlyArray<{ horaInicio?: string | null; horaFin?: string | null }>,
): HorarioDelOperativo | null => {
  const cuenta = new Map<string, { horario: HorarioDelOperativo; veces: number }>();
  for (const persona of personal) {
    if (!horarioCompleto(persona)) continue;
    const clave = `${persona.horaInicio}|${persona.horaFin}`;
    const actual = cuenta.get(clave);
    cuenta.set(clave, {
      horario: { horaInicio: persona.horaInicio, horaFin: persona.horaFin },
      veces: (actual?.veces ?? 0) + 1,
    });
  }
  let mejor: { horario: HorarioDelOperativo; veces: number } | null = null;
  for (const candidato of cuenta.values()) {
    if (!mejor || candidato.veces > mejor.veces) mejor = candidato;
  }
  return mejor?.horario ?? null;
};
