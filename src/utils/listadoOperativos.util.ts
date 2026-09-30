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

/** Columnas que la tabla sabe pintar. El orden lo decide quien la usa. */
export type ColumnaOperativo =
  | "identificador"
  | "formulario"
  | "horario"
  | "personal"
  | "telefono"
  | "zonal"
  | "punto"
  | "tipo"
  | "conductor"
  | "vehiculo"
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
  tipo: "Tipo",
  conductor: "Conductor",
  vehiculo: "Vehículo",
  estado: "Estado",
  observaciones: "Observaciones",
};

/**
 * Columnas de P-01: el resultado inmediato de lo que se acaba de registrar.
 *
 * No lleva estado de transporte porque **allí siempre sería el mismo**: RN-40 dice que
 * conductor y placa nacen nulos, así que una columna recién registrada solo puede decir
 * «Pendiente». Una columna constante ocupa ancho y no informa.
 *
 * SÍ LLEVA VEHÍCULO DESDE EL 2026-08-24, y es la pareja de conductor: en los formularios
 * que operan por propios medios las dos dicen algo —«Propios medios» y «No se activa»—, y
 * en los demás las dos llevan la alerta de que la DAF todavía no ha asignado. Nunca
 * muestran un nombre ni una placa: `Operativo` no los trae, porque en esta pantalla el
 * operativo acaba de nacer y la DAF ni lo ha visto.
 */
export const COLUMNAS_SESION: ColumnaOperativo[] = [
  "identificador",
  "horario",
  "personal",
  "telefono",
  "zonal",
  "punto",
  "tipo",
  "conductor",
  "vehiculo",
  "observaciones",
];

/** Columnas de P-02, tal como las enumera el esquema de FASE5 §4.4. */
export const COLUMNAS_LISTADO: ColumnaOperativo[] = [
  "identificador",
  "formulario",
  "horario",
  "personal",
  "telefono",
  "punto",
  "conductor",
  "estado",
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
  "punto",
  "estado",
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
export const filasDePersonal = (
  operativo: Operativo,
): { nombre: string; telefono: string; horario: string }[] => {
  if (operativo.personal.length === 0) {
    return [{ nombre: "", telefono: "", horario: operativo.horario }];
  }

  return operativo.personal.map((persona) => ({
    nombre: persona.nombre,
    // RN-34: sale del maestro. Que falte es un caso real, y se dice con palabras.
    telefono: persona.telefono ?? "Sin teléfono",
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

    case "formulario":
      return `${operativo.formulario.numero}. ${operativo.formulario.nombre}`;

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

    case "tipo": {
      // Form 8: varios tipos unidos por coma, más el adicional; en el resto, el único.
      const tipos = (operativo.tiposControl ?? []).map((tipo) => tipo.nombre);
      if (operativo.tipoLibre) {
        tipos.push(operativo.tipoLibre);
      }
      return tipos.length > 0
        ? tipos.join(", ")
        : (operativo.tipoControl?.nombre ?? "");
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * LAS DOS COLUMNAS DEL TRANSPORTE DICEN «NO LLEVA» CUANDO NO LLEVA. 2026-08-24.
     *
     * RN-40: conductor y placa los completa la DAF, y mientras no lo haga la celda no
     * tiene texto propio: lo que se ve es la alerta que pone `CeldaAlerta`.
     *
     * **Salvo en los formularios que no habilitan vehículo** —1 FIJOS, 3 LIMPIA y 9 CBQ,
     * RN-41 y RN-42—. Ahí no hay alerta, y con razón: el servidor no emite ninguna sobre
     * un operativo que nadie puede resolver. El resultado era un guion, que se lee como
     * «todavía no asignado» cuando en realidad nunca va a asignarse.
     *
     * Las palabras son las del instrumento aprobado: el operativo se cubre **por propios
     * medios** y la columna de vehículo **no se activa**.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    case "conductor":
      return operaPorPropiosMedios(operativo) ? "Propios medios" : "";

    case "vehiculo":
      return operaPorPropiosMedios(operativo) ? "No se activa" : "";

    case "estado":
      return nombreEstadoTransporte[operativo.estadoTransporte];

    case "observaciones":
      // Notas independientes (bitácora, 2026-09-09): se unen para mostrar y filtrar.
      return operativo.observaciones.map((nota) => nota.texto).join(" · ");
  }
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
 * Texto de la confirmación de retiro, con los cuatro datos que pide el plan:
 * identificador, punto, horario y formulario.
 *
 * «¿Está seguro?» a secas obliga a cerrar el modal para comprobar qué fila se pulsó, y
 * quien tiene prisa no lo cierra: confirma. Ver FASE5 §4.6.
 */
export const descripcionDelRetiro = (operativo: Operativo): string => {
  const punto =
    operativo.puntoEncuentro?.nombre ?? operativo.puntoLibre ?? "sin punto";

  return (
    `Se eliminará ${operativo.identificador}, ${punto}, ${operativo.horario}, ` +
    `del formulario ${operativo.formulario.numero}. ${operativo.formulario.nombre}. ` +
    // PV-10: el borrado es real y no se deshace. Decirlo antes es la única oportunidad
    // de que quien confirma sepa lo que confirma; la excepción se explica al terminar,
    // porque hasta preguntarle al servidor no se sabe si hay órdenes emitidas.
    `Se borra de la base y no se puede deshacer. Si el operativo ya tiene órdenes ` +
    `emitidas, se conservará desactivado y se le indicará.`
  );
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
