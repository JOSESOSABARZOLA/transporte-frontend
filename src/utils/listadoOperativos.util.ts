/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: listadoOperativos.util.ts
 * Responsabilidad: Decidir qué texto muestra cada columna, filtrar y paginar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE FILTRA EXACTAMENTE LO QUE SE VE.
 *
 * `valorDeColumna` es la **única** fuente del texto de una celda: la usa la tabla para
 * pintar y el filtro para comparar. Si fueran dos funciones, bastaría con retocar una
 * para que escribir «REDROVÁN» dejara de encontrar la fila donde el ojo lee «REDROVÁN»,
 * y ese desajuste es invisible hasta que alguien se queja.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL FILTRADO ES EN MEMORIA, Y NO POR COMODIDAD. `GET /operativos` admite `fecha` y
 * `formulario`, nada más: no existe un filtro de servidor por punto, por persona ni por
 * estado. Enviar esos parámetros produciría una fila de filtros que no filtra nada, que
 * es peor que no tenerla. Lo que se filtra es la jornada del perfil —decenas de filas,
 * no miles—, ya recortada por el servidor (PER-02).
 */

import type { EstadoTransporte, Operativo } from "../interfaces/Operativo";
import { comoHorario } from "./horario.util";
import { normalizar } from "./texto.util";
import { notasDe, textoDeNotas } from "./notasDeTabla.util.ts";
import { DISTINTIVO_EXCLUSIVO, nombreTipoTransporte } from "./tipoTransporte.util.ts";

/**
 * Columnas que la tabla sabe pintar. El orden lo decide quien la usa.
 *
 * LA TABLA ES UNA SOLA EN P-01 Y P-02 (2026-10-13), y estas son sus columnas. Se retiraron:
 *  - «Fecha»: con un rango de varios días, P-02 pinta una fila de cabecera por día;
 *  - «Tipo» (con fondo de alerta y negrita): la sustituye «Tipo de control», la de P-02;
 *  - «Vehículo» («No se activa»): la placa va con el conductor, y que el formulario no pida
 *    vehículo lo dice el `title` de «Transporte»;
 *
 * «Observaciones» sigue en P-01 (2026-10-13): se probó como icono junto al identificador y no
 * se leía; volvió a ser columna, la última.
 */
export type ColumnaOperativo =
  | "identificador"
  | "formulario"
  | "horario"
  | "personal"
  | "telefono"
  | "zonal"
  | "punto"
  // Tipo de control (2026-10-13): hasta dos tipos, «+N» y el texto libre aparte.
  | "tipoControl"
  | "transporte"
  | "conductor"
  | "estado"
  | "observaciones";

/** Encabezado de cada columna. También es el nombre accesible de su filtro. */
export const TITULO_COLUMNA: Record<ColumnaOperativo, string> = {
  identificador: "Identificador",
  formulario: "Formulario",
  horario: "Horario",
  personal: "Personal",
  telefono: "Teléfono",
  zonal: "Zonal",
  punto: "Punto",
  tipoControl: "Tipo de control",
  transporte: "Transporte",
  conductor: "Conductor",
  estado: "Estado",
  observaciones: "Observaciones",
};

/**
 * Columnas de P-01 · «Operativos de este formulario» (2026-10-13): el mismo orden y el mismo
 * estilo que P-02, sin «Formulario» —la tabla ya es de uno— y con «Transporte», que es lo que
 * quien registra acaba de elegir. Lleva «Estado» como P-02, aunque aquí casi siempre diga
 * «Pendiente»: las dos tablas se leen igual.
 */
export const COLUMNAS_SESION: ColumnaOperativo[] = [
  "identificador",
  "horario",
  "personal",
  "telefono",
  "zonal",
  "punto",
  "tipoControl",
  // Transporte requerido (2026-10-07): qué se pide a la DAF, para revisar de un vistazo qué
  // operativos no piden vehículo.
  "transporte",
  "conductor",
  "estado",
  // Las notas de coordinación (bitácora, 2026-09-09): una tarjeta por nota desde el 2026-10-19
  // (`NotasObservacion`), con la de «Comparte con X».
  "observaciones",
];

/** Columnas de P-02, tal como las enumera el esquema de FASE5 §4.4. */
export const COLUMNAS_LISTADO: ColumnaOperativo[] = [
  "identificador",
  "formulario",
  "horario",
  "personal",
  // Teléfono en su propia columna (2026-10-13): debajo del nombre no se distinguía. Va estrecho,
  // a 12 px.
  "telefono",
  // Zonal (2026-10-08): las que eligió el usuario en «Zonales», con su nombre tal cual y todas.
  // Mismo sitio que en P-01, la Matriz y la Jornada: entre Teléfono y Punto.
  "zonal",
  "punto",
  // Tipo de control (2026-10-13): entre Punto y Conductor.
  "tipoControl",
  "conductor",
  "estado",
  // Observaciones como notas (2026-10-19, plan «acciones-icono-notas»): P-02 no la tenía; ahora la
  // lleva igual que P-01, con la nota «Comparte con X» que abre el operativo compartido.
  "observaciones",
];

/**
 * Columnas con filtro propio.
 *
 * `conductor` no lo tiene porque no muestra texto sino la alerta de RN-40, y filtrar por
 * el texto de una alerta llevaría a buscar «falta» para encontrar operativos sin
 * conductor, que es un rodeo. Si hace falta ese corte, es un filtro de estado, no de
 * columna, y conviene decidirlo con el Product Owner antes de inventarlo.
 */
export const COLUMNAS_FILTRABLES: ColumnaOperativo[] = [
  "identificador",
  "formulario",
  "horario",
  "personal",
  "telefono",
  "zonal",
  "punto",
  "tipoControl",
  // P-01 (2026-10-13): filtrar por «Propios medios» o «Completo» es una pregunta real.
  "transporte",
  "estado",
  "observaciones",
];

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN RENGLÓN POR PERSONA. Es lo que la tabla agrupa al estilo del Excel.
 *
 * **DEVUELVE UNA FILA AUNQUE NO HAYA NADIE**, con los dos campos vacíos. No es un
 * descuido: un operativo sin personal tiene que seguir ocupando una fila de la tabla, y
 * su celda de personal vacía es la que lleva ALV-01 —«todavía no tiene personal
 * asignado»—. Devolver `[]` borraría el operativo de la pantalla justamente cuando más
 * falta hace verlo.
 *
 * ES LA ÚNICA FUENTE DE LOS DOS TEXTOS, y de ahí salen también los de `valorDeColumna`:
 * así la invariante de la cabecera de este archivo sigue siendo cierta con la tabla
 * agrupada. Lo que se ve son estos renglones; lo que se filtra es su unión, palabra por
 * palabra la misma.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
/** Lo que se lee cuando la persona no tiene teléfono en el maestro (RN-34). */
export const SIN_TELEFONO = "Sin teléfono";

export const filasDePersonal = (
  operativo: Operativo,
): { nombre: string; telefono: string; horario: string }[] => {
  if (operativo.personal.length === 0) {
    return [{ nombre: "", telefono: "", horario: operativo.horario }];
  }

  return operativo.personal.map((persona) => ({
    nombre: persona.nombre,
    // RN-34: sale del maestro. Que falte es un caso real, y se dice con palabras.
    telefono: persona.telefono ?? SIN_TELEFONO,
    // RN-66: la ventana EFECTIVA de esta persona, que el servidor ya resuelve. Es lo que se
    // pinta por renglón cuando los turnos difieren, en vez de la envolvente del operativo.
    // Sin ventana propia se hereda la del operativo, igual que resuelve el servidor.
    horario:
      persona.horaInicio && persona.horaFin
        ? comoHorario(persona.horaInicio, persona.horaFin)
        : operativo.horario,
  }));
};

/**
 * ¿El horario baja a la fila de cada persona? (RN-66, 2026-09-08). Sí cuando el operativo
 * reúne a más de una persona con ventanas distintas; entonces la envolvente del operativo
 * no representa a nadie y cada quien muestra la suya. Con turnos iguales —o una sola
 * persona— se muestra una vez, abarcando los renglones. Espeja `TablaMatriz`.
 */
export const horarioBajaPorPersona = (operativo: Operativo): boolean =>
  operativo.personal.length > 1 &&
  operativo.personal.some(
    (persona) =>
      persona.horaInicio !== operativo.personal[0].horaInicio ||
      persona.horaFin !== operativo.personal[0].horaFin,
  );

/** Filtros activos, por columna. Ausente o vacío significa «sin filtrar». */
export type FiltrosListado = Partial<Record<ColumnaOperativo, string>>;

/**
 * Nombre del estado de transporte.
 *
 * Coincide **a propósito** con las claves de `estadoBadgeMap` en `config/env.ts`: el
 * distintivo se resuelve por el mismo texto que lee el funcionario, de modo que el color
 * nunca puede quedar desalineado con la palabra (regla 6 de CLAUDE.md).
 */
export const nombreEstadoTransporte: Record<EstadoTransporte, string> = {
  PENDIENTE: "Pendiente",
  ASIGNADO: "Asignado",
  PROPIOS_MEDIOS: "Propios medios",
};

/**
 * `true` si el formulario del operativo no habilita vehículo. RN-41 y RN-42.
 *
 * Se decide por el **formulario**, no por `estadoTransporte`: ese dice `PENDIENTE` en
 * estos operativos y seguirá diciéndolo, porque la bandeja de la DAF los excluye y
 * `PATCH /transporte/operativos/:id` los rechaza con 409. No es una decisión de la DAF
 * que esté por tomarse: es que no hay ninguna que tomar.
 */
export const operaPorPropiosMedios = (operativo: Operativo): boolean =>
  operativo.formulario.politicaVehiculo === "NO_APLICA";

/**
 * Los tipos de control del operativo, en orden: los de la tabla de varios tipos si los hay y, si no,
 * el único. El texto libre («Otro tipo (adicional)») NO va aquí: la celda lo pinta aparte.
 */
export const tiposDelOperativo = (operativo: Operativo): string[] => {
  const varios = (operativo.tiposControl ?? []).map((tipo) => tipo.nombre);
  if (varios.length > 0) return varios;
  return operativo.tipoControl ? [operativo.tipoControl.nombre] : [];
};

/** «2026-10-14» → «14/10/2026». */
export const fechaCorta = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
};

const DIAS_DE_LA_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/**
 * La fila de cabecera de un día en P-02 con varios días (2026-10-13), que sustituye a la columna
 * «Fecha»: «Martes 14/10/2026 · 3 operativos». El día de la semana se calcula sobre la fecha del
 * cuadro en UTC, así no depende de la zona del navegador.
 */
export const cabeceraDeFecha = (fecha: string, cantidad: number): string => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const nombre = DIAS_DE_LA_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${nombre} ${fechaCorta(fecha)} · ${cantidad} ${
    cantidad === 1 ? "operativo" : "operativos"
  }`;
};

/** Texto que muestra —y por el que se filtra— una columna. */
export const valorDeColumna = (
  operativo: Operativo,
  columna: ColumnaOperativo,
): string => {
  switch (columna) {
    /**
     * EL ORIGEN VIAJA EN EL TEXTO DE LA COLUMNA, y no es un adorno: es lo que hace que
     * escribir «OCPMO-004» en el filtro encuentre **el operativo y sus adicionales**,
     * que es la pregunta que alguien se hace al mirar el cuadro del día.
     *
     * La celda lo pinta en dos renglones, con las mismas palabras. Devolver aquí solo el
     * identificador rompería la invariante de la cabecera de este archivo: se filtra
     * exactamente lo que se ve.
     */
    case "identificador":
      return operativo.origen
        ? `${operativo.identificador} Adicional de ${operativo.origen.identificador}`
        : operativo.identificador;

    // Compacto en la celda («2 · PMO», 2026-10-19), pero se filtra por número, código O nombre.
    case "formulario":
      return `${operativo.formulario.numero} · ${operativo.formulario.codigo} · ${operativo.formulario.nombre}`;

    /*
      SE FILTRA LO QUE SE VE (RN-66): cuando el horario baja por persona, el texto es el de
      cada ventana efectiva —lo mismo que pinta la tabla renglón a renglón—; si no, la
      envolvente del operativo, que ahí sí representa a todos.
    */
    case "horario":
      return horarioBajaPorPersona(operativo)
        ? [...new Set(filasDePersonal(operativo).map((fila) => fila.horario))].join(
            ", ",
          )
        : operativo.horario;

    /*
      LOS DOS SALEN DE `filasDePersonal`, que es lo que la tabla pinta renglon a renglon.
      Derivarlos aparte volveria a separar lo que se ve de lo que se busca, que es la
      invariante declarada en la cabecera de este archivo.
    */
    case "personal":
      return filasDePersonal(operativo)
        .map((fila) => fila.nombre)
        .filter(Boolean)
        .join(", ");

    case "telefono":
      return filasDePersonal(operativo)
        .map((fila) => fila.telefono)
        .filter(Boolean)
        .join(", ");

    case "zonal":
      return operativo.zonales.map((zonal) => zonal.nombre).join(", ");

    case "punto":
      return operativo.puntoEncuentro?.nombre ?? operativo.puntoLibre ?? "";

    // Se filtra por TODOS los tipos y por el texto libre, aunque la celda muestre dos y «+N».
    case "tipoControl":
      return [...tiposDelOperativo(operativo), operativo.tipoLibre ?? ""]
        .filter(Boolean)
        .join(", ");

    case "transporte":
      return `${nombreTipoTransporte(operativo.tipoTransporte)}${
        operativo.esMacrooperativo ? ` · ${DISTINTIVO_EXCLUSIVO}` : ""
      }`;

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * EL CONDUCTOR DICE «NO LLEVA» CUANDO NO LLEVA. 2026-08-24.
     *
     * RN-40: conductor y placa los completa la DAF, y mientras no lo haga la celda no
     * tiene texto propio: lo que se ve es «Sin conductor».
     *
     * **Salvo en los formularios que no habilitan vehículo** —1 FIJOS, 3 LIMPIA y 9 CBQ,
     * RN-41 y RN-42—. Ahí no hay alerta, y con razón: el servidor no emite ninguna sobre
     * un operativo que nadie puede resolver. Las palabras son las del instrumento aprobado:
     * el operativo se cubre **por propios medios**. La celda lo pinta en gris, o con «—»
     * cuando la tabla ya tiene la columna «Transporte» (P-01), que lo dice ahí.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    case "conductor":
      return operaPorPropiosMedios(operativo) ? "Propios medios" : "";

    case "estado":
      return nombreEstadoTransporte[operativo.estadoTransporte];

    // Bitácora (2026-09-09): cada nota es independiente. Desde el 2026-10-19 la celda las pinta
    // como tarjetas (`NotasObservacion`) y el filtro busca en todas, incluido «Comparte con X».
    case "observaciones":
      return textoDeNotas(notasDe(operativo));
  }
};

/**
 * El horario en sus dos mitades, para pintarlo en dos líneas (2026-10-13): «08H00 a» arriba y
 * «15H00» abajo. Solo un rango simple: varios horarios unidos por coma, o un texto sin «a», dan
 * `null` y se pintan tal cual. El filtro sigue usando el texto de una línea (`valorDeColumna`).
 */
export const partesDeHorario = (
  horario: string,
): { inicio: string; fin: string } | null => {
  const partes = /^(\S+)\s+(a)\s+(\S+)$/i.exec(horario.trim());
  return partes ? { inicio: `${partes[1]} ${partes[2]}`, fin: partes[3] } : null;
};

/** `true` si el operativo satisface **todos** los filtros activos. */
export const coincideConFiltros = (
  operativo: Operativo,
  filtros: FiltrosListado,
): boolean =>
  Object.entries(filtros).every(([columna, buscado]) => {
    if (!buscado || !buscado.trim()) return true;

    return normalizar(valorDeColumna(operativo, columna as ColumnaOperativo))
      .includes(normalizar(buscado));
  });

export const filtrarOperativos = (
  operativos: Operativo[],
  filtros: FiltrosListado,
): Operativo[] =>
  operativos.filter((operativo) => coincideConFiltros(operativo, filtros));

/** `true` si hay al menos un filtro con texto. Distingue «sin datos» de «sin coincidencias». */
export const hayFiltrosActivos = (filtros: FiltrosListado): boolean =>
  Object.values(filtros).some((valor) => Boolean(valor && valor.trim()));

/**
 * La confirmación de «Eliminar», la misma en P-01 y P-02 (2026-10-13): el título nombra el
 * operativo —«¿Está seguro?» a secas obliga a cerrar el modal para comprobar qué fila se pulsó,
 * FASE5 §4.6— y el mensaje dice lo que pasa. La excepción de PV-10 (órdenes emitidas) se explica
 * al terminar, porque hasta preguntarle al servidor no se sabe si las hay.
 */
export const tituloDelRetiro = (operativo: Operativo): string =>
  `¿Eliminar ${operativo.identificador}?`;
export const MENSAJE_DEL_RETIRO =
  "Se quitará el operativo y su personal quedará libre. Esta acción no se puede deshacer.";

/** Una casilla del paginador numerado: una página (contada desde 1) o la elipsis. */
export type CasillaPagina = number | "…";

/**
 * Las páginas que muestra el paginador numerado (2026-10-15, «Flota y garajes»), contadas desde 1.
 * Hasta siete páginas, todas; con más, siempre siete casillas —la primera, la última, la actual
 * con sus vecinas y la elipsis donde hay hueco—: `1 … 4 5 6 … 12`. Así los botones no saltan de
 * sitio al avanzar.
 */
export const rangoPaginas = (actual: number, total: number): CasillaPagina[] => {
  if (total <= 7) return Array.from({ length: Math.max(1, total) }, (_, i) => i + 1);
  const pagina = Math.min(Math.max(1, actual), total);
  if (pagina <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (pagina >= total - 3) {
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "…", pagina - 1, pagina, pagina + 1, "…", total];
};

/**
 * Recorta la página pedida.
 *
 * Si el filtro deja menos filas de las que ocupaba la página actual, quien pagina se
 * quedaría mirando una página vacía existiendo resultados. Por eso devuelve además la
 * `pagina` efectiva, que la pantalla usa para corregirse.
 */
export const paginar = <T,>(
  items: T[],
  pagina: number,
  tamanio: number,
): { pagina: number; filas: T[]; total: number; totalPaginas: number } => {
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanio));
  const efectiva = Math.min(Math.max(0, pagina), totalPaginas - 1);
  const desde = efectiva * tamanio;

  return {
    pagina: efectiva,
    filas: items.slice(desde, desde + tamanio),
    total,
    totalPaginas,
  };
};

/**
 * Cuánto se resalta la fila de un operativo recién registrado (2026-10-08): el adicional que se
 * acaba de crear desde el cajón se marca en la tabla para encontrarlo, y luego vuelve a su banda.
 */
export const MS_RESALTADO = 3000;
