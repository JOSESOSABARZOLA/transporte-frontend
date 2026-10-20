/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos
 * Archivo: TablaOperativos.tsx
 * Responsabilidad: Mostrar operativos en tabla, con las columnas que pida la pantalla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA COMPARTEN P-01 Y P-02, Y DESDE EL 2026-10-13 SE LEEN IGUAL.
 *
 * Las dos la montan dentro de `PanelOperativos`, con fila de filtros, paginación y el grupo de
 * acciones único (`AccionesOperativo`). Lo que cambia es la lista de columnas: P-02 lleva
 * «Formulario» y P-01 «Transporte». Duplicar el componente habría sido más cómodo hoy y peor
 * mañana: la celda con alerta es la pieza que traduce el color a texto (regla 6), y dos copias
 * empiezan a diferir en cuanto se corrige una.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO USA EL COMPONENTE `Table` GENÉRICO, y conviene decir por qué con precisión, porque
 * al cerrar M-22 anticipé lo contrario:
 *
 *   1. `Table` filtra y pagina **contra el servidor** (`manualFiltering`, `manualPagination`).
 *      `GET /operativos` solo admite `fecha` y `formulario`: los demás filtros llegarían y
 *      se ignorarían. Una fila de filtros que no filtra es peor que ninguna.
 *   2. Sus acciones por fila abren modales del registro `ModalType`, y el diseño dice
 *      justo lo contrario para el retiro: la confirmación (`MensajeModal`) se usa directamente
 *      (FASE5 §4.6, y el comentario de `interfaces/Modal.ts`).
 *   3. Trae dos botones fijos de exportación a CSV y PDF **que no hacen nada**. Sacar el
 *      cuadro a un archivo no es una función que nadie haya pedido en esta pantalla, y en
 *      un sistema que nació de una filtración por WhatsApp no es un detalle menor.
 *
 * `Table` sigue siendo lo correcto donde la consulta la resuelva el servidor —P-07, con
 * cincuenta y dos funcionarios y filtros reales—; y allí sí habrá que memoizar
 * `findRecordsFn` con `useCallback`, como advierte el plan.
 */

import {
  Fragment,
  createContext,
  useContext,
  type FC,
  type ReactNode,
} from "react";

import type { Operativo } from "../../interfaces/Operativo.ts";
import { colorEstado } from "../../config/env.ts";
import {
  COLUMNAS_FILTRABLES,
  COLUMNAS_SESION,
  SIN_TELEFONO,
  TITULO_COLUMNA,
  cabeceraDeFecha,
  filasDePersonal,
  horarioBajaPorPersona,
  nombreEstadoTransporte,
  operaPorPropiosMedios,
  partesDeHorario,
  tiposDelOperativo,
  valorDeColumna,
  type ColumnaOperativo,
  type FiltrosListado,
} from "../../utils/listadoOperativos.util.ts";
import { agruparPorClave } from "../../utils/agrupacionForm8.util.ts";
import { notasDe } from "../../utils/notasDeTabla.util.ts";
import { ATRIBUTO_FILA } from "../../hooks/useDestelloDeFila.ts";
import CeldaAlerta from "./CeldaAlerta.tsx";
import Insignia from "../common/Insignia.tsx";
import NotasObservacion from "../common/NotasObservacion.tsx";
import Tooltip from "../common/Tooltip.tsx";
import {
  DESCRIPCION_MACROOPERATIVO,
  opcionTransporte,
} from "../../utils/tipoTransporte.util.ts";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS COLUMNAS QUE SE PARTEN POR PERSONA. El resto de la fila se combina.
 *
 * Es la agrupación del cuadro en Excel: un operativo con dos asignados ocupa dos
 * renglones, y todo lo que es **del operativo** —identificador, horario, punto, acciones—
 * es una sola celda que los abarca con `rowSpan`. Lo que es **de la persona** —su nombre
 * y su teléfono— tiene un renglón cada uno.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const COLUMNAS_POR_PERSONA: readonly ColumnaOperativo[] = [
  "personal",
  "telefono",
];

/**
 * Columnas que se comparan para decidir si dos operativos son «la misma copia» del formulario 8
 * (todas menos identificador y formulario). Se comparan por su TEXTO —lo mismo que ve el usuario—
 * vía `valorDeColumna`, así la celda fusionada nunca miente.
 */
const COLUMNAS_DE_FUSION: readonly ColumnaOperativo[] = [
  "horario",
  "personal",
  "telefono",
  "zonal",
  "punto",
  "tipoControl",
  "transporte",
  "conductor",
  "estado",
  "observaciones",
];

/**
 * Clave de fusión de las copias del formulario 8: operativos de UNA sola persona idénticos salvo
 * el identificador. `null` = no se agrupa (más de una persona). Ver `agrupacionForm8.util.ts`.
 */
const claveDeFusion = (operativo: Operativo): string | null => {
  // PATRULLA (Form 5/6): los operativos de un mismo registro-lote (`grupoRegistro`) se agrupan como
  // «una sola patrulla», cada persona con su código por área en su fila. Se comparan las columnas
  // fusionadas —SIN personal ni teléfono, que bajan por fila— para que la celda combinada nunca
  // mienta; el UUID evita fusionar patrullas distintas del mismo horario.
  //
  // Y SIN observaciones (2026-09-17): la bitácora es por operativo y la persona que APORTA el DMIT
  // (INECU) nace sin notas propias, mientras el registrante (IGNECU/ITNECU) sí las tiene. Si
  // entrara en la clave, el aportado quedaría siempre en un grupo aparte en cuanto la patrulla
  // tuviera una nota. La celda fusionada muestra las notas de coordinación del registrante.
  // Y SIN horario (2026-09-21): el `grupoRegistro` (UUID) YA identifica a la patrulla —no hace falta
  // el horario para no fundir dos distintas—, y cada persona lleva su ventana EFECTIVA (RN-66), que
  // puede diferir (el aporte del DMIT a otra hora). Si el horario entrara en la clave, ese código se
  // saldría de la patrulla y se pintaría como un operativo aparte —lo reportado—. Baja POR PERSONA
  // cuando difiere (ver `GrupoForm6Operativos`).
  if (operativo.grupoRegistro) {
    return JSON.stringify([
      "F6",
      // Con un rango de varios días (2026-10-13) nunca se funden filas de cuadros distintos.
      operativo.cuadroFecha,
      operativo.grupoRegistro,
      operativo.esAdicional,
      ...COLUMNAS_DE_FUSION.filter(
        (columna) =>
          columna !== "personal" &&
          columna !== "telefono" &&
          columna !== "observaciones" &&
          columna !== "horario",
      ).map((columna) => valorDeColumna(operativo, columna)),
    ]);
  }
  if (operativo.personal.length !== 1) return null;
  return JSON.stringify([
    "F8",
    operativo.cuadroFecha,
    operativo.personal[0].funcionarioId,
    operativo.esAdicional,
    ...COLUMNAS_DE_FUSION.map((columna) => valorDeColumna(operativo, columna)),
  ]);
};

/**
 * Anchos (2026-10-13). Formulario, Personal y Tipo de control se parten en varias líneas
 * (Formulario, con un tope de ancho); el Horario va en dos líneas («08H00 a» / «15H00»);
 * Teléfono, Conductor, Estado y Acciones van con ancho fijo. El identificador va en UNA línea
 * (`min-w-[170px]` + `whitespace-nowrap`) y Conductor tiene un mínimo de 130 px para que
 * «Sin conductor» no se parta ni desborde.
 *
 * Con varios días, P-02 ya no lleva columna «Fecha» (2026-10-13): una fila de cabecera por día.
 * Cifras medidas en Chrome en FASE5 §2.2.
 */
const ANCHO_COLUMNA: Partial<Record<ColumnaOperativo, string>> = {
  identificador: "min-w-[170px]",
  formulario: "w-28 min-w-24",
  personal: "min-w-32",
  telefono: "w-24",
  tipoControl: "min-w-28",
  conductor: "min-w-[130px]",
  estado: "w-24",
  // Las notas son tarjetas de ~220 px (2026-10-19): la fila crece lo que haga falta.
  observaciones: "app-columna-notas",
};

/** La celda de teléfono (2026-10-13): 12 px, una línea. */
const CLASE_TELEFONO = "px-2 py-1 align-top whitespace-nowrap text-xs";

/** El número en monoespaciada; sin número, «Sin teléfono» en gris (no es un dato, es su falta). */
const TextoTelefono: FC<{ telefono: string | null }> = ({ telefono }) => {
  if (!telefono) return null;
  if (telefono === SIN_TELEFONO) {
    return <span className="text-app-muted">{SIN_TELEFONO}</span>;
  }
  return <span className="font-mono">{telefono}</span>;
};

/**
 * El horario en dos líneas (2026-10-13): «08H00 a» arriba y «15H00» abajo, cada una sin partirse.
 * Lo que no es un rango simple (varios horarios unidos por coma) se pinta tal cual.
 */
const TextoHorario: FC<{ horario: string }> = ({ horario }) => {
  const partes = horario ? partesDeHorario(horario) : null;
  if (!partes) return <>{horario}</>;
  return (
    <span data-horario={horario}>
      <span className="block whitespace-nowrap">{partes.inicio}</span>
      <span className="block whitespace-nowrap">{partes.fin}</span>
    </span>
  );
};

/** La columna de acciones de siempre; P-02 pasa la suya (2026-10-13). */
const COLUMNA_ACCIONES = { th: "w-56", td: "" };

/** Cuántos tipos de control se ven en la celda antes del «+N». */
const TIPOS_VISIBLES = 2;

/**
 * Columnas que se pintan como celda con alerta, y a qué campo alertado corresponden. Desde el
 * 2026-10-13 el tipo de control va sin fondo ni negrita (el libre se marca «(libre)») y el conductor
 * con su distintivo compacto: quedan personal, punto y observaciones, las alertas del cuadro de
 * colores.
 */
const CAMPO_ALERTADO = {
  personal: "personal",
  punto: "puntoEncuentro",
  observaciones: "observaciones",
} as const;

/**
 * ¿La tabla tiene la columna «Transporte»? (2026-10-13). Si la tiene (P-01), el conductor de un
 * operativo por propios medios dice «—»: ya lo dice Transporte. Si no (P-02), «Propios medios».
 */
const ConColumnaTransporte = createContext(false);

/** Abre el detalle de otro operativo (la nota «Comparte con X»). Lo provee la tabla. */
const VerOperativo = createContext<((operativoId: number) => void) | undefined>(undefined);

/** El operativo cuya fila destella (lo pidió una nota «Comparte con X»), o `null`. */
const Destacado = createContext<number | null>(null);

/**
 * Los atributos de la PRIMERA fila de un operativo: su ancla (`data-operativo-id`) para que la
 * nota «Comparte con X» la encuentre, y el destello si es la pedida (`useDestelloDeFila`).
 */
const anclaDeFila = (id: number): Record<string, number> => ({ [ATRIBUTO_FILA]: id });

/** La clase de destello de la fila del operativo, si es la pedida. */
const claseDestello = (id: number, destacadoId: number | null): string =>
  destacadoId === id ? "app-fila-destello " : "";

/** El `title` de Transporte en los formularios que no habilitan vehículo (RN-41, RN-42). */
const AYUDA_SIN_VEHICULO = "Este formulario no pide vehículo a la DAF.";

type TablaOperativosProps = {
  operativos: Operativo[];
  /** Por defecto, las de P-01. */
  columnas?: ColumnaOperativo[];
  /** Qué decir cuando no hay filas. La pantalla distingue «sin datos» de «sin coincidencias». */
  mensajeVacio?: ReactNode;
  /** Con `onFiltroChange` se dibuja la fila de filtros. Sin ella, no. */
  filtros?: FiltrosListado;
  onFiltroChange?: (columna: ColumnaOperativo, valor: string) => void;
  /** Contenido de la columna de acciones, POR OPERATIVO (no-patrulla). Sin ella, la columna no existe. */
  acciones?: (operativo: Operativo) => ReactNode;
  /**
   * PATRULLA (Form 5/6), con el grupo de acciones único (2026-10-13): UN grupo por fila, que sabe
   * si su fila es la cabeza de la patrulla —la acción principal va una vez, en la cabeza—. Si
   * falta, la patrulla cae a `acciones`.
   */
  accionesFilaPatrulla?: (
    operativo: Operativo,
    grupo: Operativo[],
    esCabeza: boolean,
  ) => ReactNode;
  /**
   * Clases de la columna de acciones (2026-10-13). P-02 la fija al ancho de su grupo y la alinea
   * a la derecha; sin ella, la de siempre.
   */
  columnaAcciones?: { th: string; td: string };
  /**
   * Operativo recién registrado (2026-10-08): su fila se resalta unos segundos para encontrarlo
   * —el adicional que se acaba de crear desde el cajón—. Solo en filas sueltas: un adicional no
   * forma grupo con sus hermanos.
   */
  resaltadoId?: number | null;
  /**
   * P-02 con varios días (2026-10-13): una fila de cabecera por fecha —«Martes 14/10/2026 · 3
   * operativos»— en lugar de la columna «Fecha». Las filas llegan ordenadas por fecha.
   */
  agruparPorFecha?: boolean;
  /**
   * Cuántos operativos tiene cada fecha en TODO lo filtrado, no solo en la página: la cabecera
   * dice el total del día aunque la paginación lo parta. Sin él, cuenta los de la página.
   */
  conteoPorFecha?: Record<string, number>;
  /** Abre el detalle del operativo con el que comparte unidad (la nota «Comparte con X»). */
  onVerOperativo?: (operativoId: number) => void;
  /** La fila que destella porque la pidió una nota «Comparte con X» (`useDestelloDeFila`). */
  destacadoId?: number | null;
};

const TablaOperativos: FC<TablaOperativosProps> = ({
  operativos,
  columnas = COLUMNAS_SESION,
  mensajeVacio = "Los operativos que registre en esta sesión aparecerán aquí.",
  filtros,
  onFiltroChange,
  acciones,
  accionesFilaPatrulla,
  columnaAcciones = COLUMNA_ACCIONES,
  resaltadoId = null,
  agruparPorFecha = false,
  conteoPorFecha,
  onVerOperativo,
  destacadoId = null,
}) => {
  const conFiltros = Boolean(onFiltroChange);
  // La columna de acciones existe si hay acción por operativo O de patrulla.
  const hayAcciones = Boolean(acciones ?? accionesFilaPatrulla);
  const totalColumnas = columnas.length + (hayAcciones ? 1 : 0);

  const grupos = agruparPorClave(operativos, claveDeFusion);
  const cuantosEl = (fecha: string): number =>
    conteoPorFecha?.[fecha] ??
    operativos.filter((operativo) => operativo.cuadroFecha === fecha).length;

  return (
    <ConColumnaTransporte.Provider value={columnas.includes("transporte")}>
    <VerOperativo.Provider value={onVerOperativo}>
    <Destacado.Provider value={destacadoId}>
    <div className="overflow-x-auto">
      {/*
        SIN `table-zebra`: rayaba por `<tr>`, y un operativo (o un grupo de copias del 8) puede
        ocupar varios `<tr>`, así que el bloque salía a dos tonos. La banda se pinta POR OPERATIVO
        —o por GRUPO— en `FilasDelOperativo`/`GrupoForm8Operativos` (2026-09-14, igual que la matriz
        y la jornada): un solo tono por operativo, gris y blanco alternos.
      */}
      <table className="table table-sm">
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th
                key={columna}
                scope="col"
                className={ANCHO_COLUMNA[columna]}
              >
                {TITULO_COLUMNA[columna]}
              </th>
            ))}
            {hayAcciones && (
              <th scope="col" className={columnaAcciones.th}>
                Acciones
              </th>
            )}
          </tr>

          {conFiltros && (
            <tr>
              {columnas.map((columna) => (
                <th key={columna}>
                  {COLUMNAS_FILTRABLES.includes(columna) ? (
                    <input
                      type="search"
                      className="input input-xs w-full"
                      placeholder="Filtrar…"
                      aria-label={`Filtrar por ${TITULO_COLUMNA[columna].toLowerCase()}`}
                      value={filtros?.[columna] ?? ""}
                      onChange={(evento) =>
                        onFiltroChange?.(columna, evento.target.value)
                      }
                    />
                  ) : null}
                </th>
              ))}
              {hayAcciones && <th />}
            </tr>
          )}
        </thead>

        <tbody>
          {operativos.length === 0 ? (
            <tr>
              <td
                colSpan={totalColumnas}
                className="px-2 py-6 text-center text-sm text-app-muted"
              >
                {mensajeVacio}
              </td>
            </tr>
          ) : (
            // Las copias del formulario 8 (varios operativos idénticos de una persona) se juntan
            // en un grupo; los demás quedan en grupos de uno. Ver `agrupacionForm8.util.ts`.
            // La clave de fusión incluye la fecha, así que un grupo nunca cruza dos días.
            grupos.map((grupo, indiceGrupo) => (
              <Fragment key={grupo[0].id}>
                {agruparPorFecha &&
                  (indiceGrupo === 0 ||
                    grupos[indiceGrupo - 1][0].cuadroFecha !== grupo[0].cuadroFecha) && (
                    <tr data-cabecera-fecha={grupo[0].cuadroFecha}>
                      <th
                        scope="colgroup"
                        colSpan={totalColumnas}
                        className="bg-base-300/60 px-2 py-1.5 text-left text-xs font-semibold text-app-strong"
                      >
                        {cabeceraDeFecha(grupo[0].cuadroFecha, cuantosEl(grupo[0].cuadroFecha))}
                      </th>
                    </tr>
                  )}
                {/*
                  La PATRULLA (Form 5/6, con `grupoRegistro`) va SIEMPRE por su componente, aunque
                  lleve un solo código: así sus acciones fusionadas se ofrecen desde el primero.
                */}
                {grupo[0].grupoRegistro ? (
                <GrupoForm6Operativos
                  operativos={grupo}
                  columnas={columnas}
                  acciones={acciones}
                  accionesFilaPatrulla={accionesFilaPatrulla}
                  claseAcciones={columnaAcciones.td}
                  bandaGris={indiceGrupo % 2 === 0}
                />
              ) : grupo.length === 1 ? (
                <FilasDelOperativo
                  operativo={grupo[0]}
                  columnas={columnas}
                  acciones={acciones}
                  claseAcciones={columnaAcciones.td}
                  bandaGris={indiceGrupo % 2 === 0}
                  resaltado={grupo[0].id === resaltadoId}
                />
              ) : (
                <GrupoForm8Operativos
                  operativos={grupo}
                  columnas={columnas}
                  acciones={acciones}
                  claseAcciones={columnaAcciones.td}
                  bandaGris={indiceGrupo % 2 === 0}
                />
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
    </Destacado.Provider>
    </VerOperativo.Provider>
    </ConColumnaTransporte.Provider>
  );
};

/**
 * Los renglones de un operativo: uno por persona asignada, y uno si no hay nadie.
 *
 * SIN PERSONAL SIGUE HABIENDO UNA FILA, y su celda de personal vacía es la que lleva
 * ALV-01. Un operativo sin nadie es justo el que hay que ver.
 *
 * `rowSpan` solo se emite cuando de verdad hay más de un renglón: con uno, el marcado
 * queda **idéntico al de antes** de este cambio, que es la mayoría de las filas.
 */
const FilasDelOperativo: FC<{
  operativo: Operativo;
  columnas: ColumnaOperativo[];
  acciones?: (operativo: Operativo) => ReactNode;
  claseAcciones?: string;
  bandaGris: boolean;
  resaltado?: boolean;
}> = ({ operativo, columnas, acciones, claseAcciones = "", bandaGris, resaltado = false }) => {
  const filas = filasDePersonal(operativo);
  const abarca = filas.length > 1 ? filas.length : undefined;
  const destacadoId = useContext(Destacado);

  /*
    RN-66: el horario baja a la fila de cada persona cuando los turnos difieren, igual que
    en `TablaMatriz`. Con turnos iguales —o una sola persona— sigue abarcando con `rowSpan`.
  */
  const horarioPersonal = horarioBajaPorPersona(operativo);
  const esPorPersona = (columna: ColumnaOperativo): boolean =>
    COLUMNAS_POR_PERSONA.includes(columna) ||
    (columna === "horario" && horarioPersonal);

  const textoDePersona = (
    columna: ColumnaOperativo,
    fila: { nombre: string; telefono: string; horario: string },
  ): string =>
    columna === "personal"
      ? fila.nombre
      : columna === "horario"
        ? fila.horario
        : fila.telefono;

  return (
    <>
      {filas.map((fila, indice) => (
        <tr
          key={indice}
          // La primera fila es el ancla del operativo (la nota «Comparte con X» la busca).
          {...(indice === 0 ? anclaDeFila(operativo.id) : {})}
          // El recién registrado se resalta (`bg-primary/10`) en lugar de su banda, unos segundos.
          data-resaltado={resaltado || undefined}
          className={`${claseDestello(operativo.id, destacadoId)}${resaltado ? "bg-primary/10 " : bandaGris ? "bg-base-200 " : ""}transition-colors hover:bg-primary/5`}
        >
          {columnas.map((columna) =>
            esPorPersona(columna) ? (
              <CeldaDePersona
                key={columna}
                operativo={operativo}
                columna={columna}
                texto={textoDePersona(columna, fila)}
              />
            ) : (
              // Lo que es del operativo se pinta una vez, en el primer renglón.
              indice === 0 && (
                <Celda
                  key={columna}
                  operativo={operativo}
                  columna={columna}
                  rowSpan={abarca}
                />
              )
            ),
          )}

          {acciones && indice === 0 && (
            <td
              className={`px-2 py-1 align-top ${claseAcciones}`}
              rowSpan={abarca}
            >
              {acciones(operativo)}
            </td>
          )}
        </tr>
      ))}
    </>
  );
};

/**
 * La celda de una persona: su nombre, su horario o su teléfono, en su propio renglón.
 *
 * La de personal conserva su `CeldaAlerta` **sin `rowSpan`**: ALV-01 solo se emite cuando
 * el operativo no tiene a nadie, y entonces hay un único renglón. Con gente asignada no
 * hay alerta que pintar y la celda es una corriente.
 */
const CeldaDePersona: FC<{
  operativo: Operativo;
  columna: ColumnaOperativo;
  texto: string;
}> = ({ operativo, columna, texto }) => {
  if (columna === "personal") {
    return (
      <CeldaAlerta
        alertas={operativo.alertas}
        campo="personal"
      >
        {texto || null}
      </CeldaAlerta>
    );
  }

  // RN-66: el horario propio de la persona, en dos líneas como el del operativo.
  if (columna === "horario") {
    return (
      <td className="px-2 py-1 align-top">
        <TextoHorario horario={texto} />
      </td>
    );
  }

  return (
    <td className={CLASE_TELEFONO}>
      <TextoTelefono telefono={texto} />
    </td>
  );
};

/** El tooltip de «Sin conductor» (2026-10-13). */
const AYUDA_SIN_CONDUCTOR =
  "La DAF todavía no ha asignado conductor a este operativo.";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA CELDA «CONDUCTOR», COMPACTA (2026-10-13).
 *
 * Antes la alerta del servidor se escribía entera dentro de la celda, sobre fondo amarillo, y
 * estiraba la fila. Ahora:
 *  - formulario sin vehículo (RN-41/42) o «Propios medios» elegido al registrar: texto gris;
 *  - con conductor asignado por la DAF: nombre y placa en dos líneas cortas (y «+N» si los
 *    tramos van con otros conductores, todos en el `title`);
 *  - con la alerta de conductor: el distintivo ámbar «Sin conductor» (sin icono), con la explicación en
 *    el `title`. La palabra va dentro: no depende del color (regla 6);
 *  - sin nada de lo anterior: «—».
 * Sin fondo de celda: el color está en el distintivo, no en la casilla.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const CeldaConductor: FC<{
  operativo: Operativo;
  rowSpan?: number;
  alin: string;
}> = ({ operativo, rowSpan, alin }) => {
  const conTransporte = useContext(ConColumnaTransporte);
  const asignados = operativo.transporteAsignado ?? [];
  const propios =
    valorDeColumna(operativo, "conductor") !== "" ||
    operativo.tipoTransporte === "PROPIOS_MEDIOS";
  const sinConductor = operativo.alertas.some((alerta) => alerta.campo === "conductor");

  const contenido = (() => {
    if (asignados.length > 0) {
      const [primero, ...resto] = asignados;
      const todos = asignados
        .map((par) => (par.placa ? `${par.conductor} · ${par.placa}` : par.conductor))
        .join(", ");
      return (
        <span className="block" title={resto.length > 0 ? todos : undefined}>
          <span className="block text-app-strong">{primero.conductor}</span>
          <span className="block font-mono text-xs text-app-muted">
            {primero.placa ?? "Sin placa"}
            {resto.length > 0 && (
              <span className="badge badge-ghost badge-xs ml-1 font-sans text-app-strong">
                +{resto.length}
              </span>
            )}
          </span>
        </span>
      );
    }
    // Con la columna «Transporte» (P-01) ya se lee ahí: aquí basta el guion.
    if (propios)
      return (
        <span className="text-app-muted">{conTransporte ? "—" : "Propios medios"}</span>
      );
    if (sinConductor) {
      return (
        <Insignia
          variante="aviso"
          title={AYUDA_SIN_CONDUCTOR}
          className="h-auto whitespace-nowrap px-2 py-0.5"
        >
          Sin conductor
        </Insignia>
      );
    }
    return <span className="text-app-muted">—</span>;
  })();

  return (
    <td className={`px-2 py-1 ${alin}`} rowSpan={rowSpan}>
      {contenido}
    </td>
  );
};

/**
 * Una celda. El texto sale siempre de `valorDeColumna`, que es también por lo que filtra
 * la fila de arriba: lo que se ve y lo que se busca no pueden separarse.
 */
const Celda: FC<{
  operativo: Operativo;
  columna: ColumnaOperativo;
  rowSpan?: number;
  /** Centra la celda: los grupos de copias del 8 la fusionan y el dato va centrado. */
  centrado?: boolean;
}> = ({ operativo, columna, rowSpan, centrado }) => {
  const texto = valorDeColumna(operativo, columna);
  const alin = centrado ? "align-middle text-center" : "align-top";
  const verOperativo = useContext(VerOperativo);

  if (columna === "conductor") {
    return <CeldaConductor operativo={operativo} rowSpan={rowSpan} alin={alin} />;
  }

  if (columna in CAMPO_ALERTADO) {
    return (
      <CeldaAlerta
        alertas={operativo.alertas}
        campo={CAMPO_ALERTADO[columna as keyof typeof CAMPO_ALERTADO]}
        rowSpan={rowSpan}
        centrado={centrado}
      >
        {columna === "observaciones" ? (
          // Una tarjeta por nota (2026-10-19), con la compartida: `NotasObservacion`, el mismo
          // componente de la Jornada y la Matriz. El «Vehículo exclusivo» va encima, fuera de él.
          <span className="flex flex-col items-start gap-1">
            {operativo.esMacrooperativo && (
              <Insignia variante="suave" title={operativo.justificacionExclusivo ?? undefined}>
                Vehículo exclusivo
              </Insignia>
            )}
            {(notasDe(operativo).length > 0 || !operativo.esMacrooperativo) && (
              <NotasObservacion
                notas={notasDe(operativo)}
                onIrA={verOperativo}
                etiqueta={`Observaciones de ${operativo.identificador}`}
              />
            )}
          </span>
        ) : (
          texto || null
        )}
      </CeldaAlerta>
    );
  }

  /*
    Formulario compacto (2026-10-19): el punto de su color —lo entrega el servidor, regla 3— y
    «N · CÓDIGO» en una línea; el nombre completo, en el tooltip. El filtro busca por número,
    código o nombre (`valorDeColumna`).
  */
  if (columna === "formulario") {
    const formulario = operativo.formulario;
    return (
      <td className={`px-2 py-1 ${alin}`} rowSpan={rowSpan}>
        <Tooltip texto={`${formulario.numero}. ${formulario.nombre}`}>
          <span
            tabIndex={0}
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
            aria-label={`Formulario ${formulario.numero}. ${formulario.nombre}`}
          >
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: formulario.colorFondo }}
            />
            {formulario.numero} · {formulario.codigo}
          </span>
        </Tooltip>
      </td>
    );
  }

  /*
    Transporte requerido (2026-10-07): la etiqueta del tipo, con su nombre dentro (regla 6) y su
    explicación en `title`. Una sola forma con borde (2026-10-13): azul claro si pide vehículo,
    gris si es por propios medios. En los formularios que no habilitan vehículo —la antigua
    columna «Vehículo · No se activa»— el `title` lo dice.
  */
  if (columna === "transporte") {
    const opcion = opcionTransporte(operativo.tipoTransporte);
    const descripcion = operaPorPropiosMedios(operativo)
      ? AYUDA_SIN_VEHICULO
      : opcion.descripcion;
    const ayuda = operativo.esMacrooperativo
      ? `${descripcion} ${DESCRIPCION_MACROOPERATIVO}`
      : descripcion;
    return (
      <td className={`px-2 py-1 ${alin}`} rowSpan={rowSpan}>
        <span
          className={`badge badge-sm whitespace-nowrap ${opcion.claseEtiqueta}`}
          title={ayuda}
        >
          {texto}
        </span>
      </td>
    );
  }

  // El estado lleva color **y** palabra: el distintivo se resuelve por el mismo texto que
  // lee el funcionario, así que nunca pueden desalinearse (regla 6 de CLAUDE.md).
  if (columna === "estado") {
    return (
      <td
        className={`px-2 py-1 ${alin}`}
        rowSpan={rowSpan}
      >
        <span
          className={`badge badge-sm ${colorEstado(
            nombreEstadoTransporte[operativo.estadoTransporte],
          )}`}
        >
          {texto}
        </span>
      </td>
    );
  }

  /**
   * El identificador, y debajo de qué operativo nació si es un adicional.
   *
   * SE ESCRIBE CON PALABRAS, no con un color ni un icono (regla 6 de CLAUDE.md): en un
   * sistema llamado *cuadro de colores* esa disciplina exige atención deliberada. Y son
   * exactamente las palabras que devuelve `valorDeColumna`, así que quien filtre por
   * `OCPMO-004` encuentra el operativo y sus adicionales.
   */
  if (columna === "identificador") {
    return (
      <td
        className="px-2 py-1 align-top"
        rowSpan={rowSpan}
      >
        {/* Una sola línea (2026-10-13): el código no se parte por sus guiones. */}
        <span className="font-mono text-xs font-semibold whitespace-nowrap">
          {operativo.identificador}
        </span>
        {operativo.origen && (
          <span className="badge badge-outline badge-xs mt-1 block w-fit">
            Adicional de {operativo.origen.identificador}
          </span>
        )}
      </td>
    );
  }

  /*
    Tipo de control (2026-10-13): hasta dos tipos separados por coma y, si hay más, «+N» con
    todos en el `title`. El «Otro tipo (adicional)» va en una segunda línea gris, marcado como
    libre. Sin ninguno, «—». El filtro busca en todos y en el libre (`valorDeColumna`).
  */
  if (columna === "tipoControl") {
    const tipos = tiposDelOperativo(operativo);
    const visibles = tipos.slice(0, TIPOS_VISIBLES);
    const resto = tipos.length - visibles.length;
    const libre = operativo.tipoLibre;

    return (
      <td className={`px-2 py-1 ${alin}`} rowSpan={rowSpan}>
        {tipos.length === 0 && !libre ? (
          "—"
        ) : (
          <>
            {visibles.length > 0 && (
              <span>
                {visibles.join(", ")}
                {resto > 0 && (
                  <span
                    className="badge badge-ghost badge-xs ml-1 text-app-strong"
                    title={tipos.join(", ")}
                    aria-label={`${resto} tipos más: ${tipos.slice(TIPOS_VISIBLES).join(", ")}`}
                  >
                    +{resto}
                  </span>
                )}
              </span>
            )}
            {libre && (
              <span className="mt-0.5 block text-xs text-app-muted">
                {libre} <em>(libre)</em>
              </span>
            )}
          </>
        )}
      </td>
    );
  }

  return (
    <td
      className={`px-2 py-1 ${alin}`}
      rowSpan={rowSpan}
    >
      {/* Sin zonal se dice con «—», no con una celda en blanco que parezca un fallo de carga. */}
      {columna === "zonal" && texto === "" ? (
        "—"
      ) : columna === "horario" ? (
        <TextoHorario horario={texto} />
      ) : (
        texto
      )}
    </td>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS COPIAS DEL FORMULARIO 8, AGRUPADAS. 2026-09-14, a petición del negocio.
 *
 * El 8 genera N operativos idénticos de UNA persona (solo cambia el identificador). Se pintan
 * como un bloque: el IDENTIFICADOR y las ACCIONES bajan a la fila de cada operativo —así se
 * puede seguir editando/retirando cada código—, y TODO lo demás se fusiona en una celda que
 * abarca el grupo (`rowSpan`), con el personal mostrando «Nombre (n)». Reutiliza `Celda` para
 * cada columna del operativo.
 *
 * ALINEADO ARRIBA, NO CENTRADO (2026-09-21). Antes las celdas fusionadas se centraban
 * verticalmente, así que en un grupo de tres los datos salían pegados a la fila del MEDIO y las
 * otras dos parecían filas vacías —a la vista, operativos distintos—. Con `align-top` los datos
 * arrancan en la primera fila y el bloque se lee como UN solo operativo. Igual que la patrulla.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const GrupoForm8Operativos: FC<{
  operativos: Operativo[];
  columnas: ColumnaOperativo[];
  acciones?: (operativo: Operativo) => ReactNode;
  claseAcciones?: string;
  bandaGris: boolean;
}> = ({ operativos, columnas, acciones, claseAcciones = "", bandaGris }) => {
  const cabeza = operativos[0];
  const total = operativos.length;
  const nombreConConteo = `${valorDeColumna(cabeza, "personal")} (${total})`;
  const destacadoId = useContext(Destacado);

  return (
    <>
      {operativos.map((operativo, indice) => (
        <tr
          key={operativo.id}
          {...anclaDeFila(operativo.id)}
          className={`${claseDestello(operativo.id, destacadoId)}${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
        >
          {columnas.map((columna) => {
            // El identificador NO se fusiona: una fila (y una acción) por operativo.
            if (columna === "identificador") {
              return (
                <Celda
                  key={columna}
                  operativo={operativo}
                  columna={columna}
                />
              );
            }
            // El resto se pinta una vez, en la primera fila, y abarca el grupo.
            if (indice !== 0) return null;
            if (columna === "personal") {
              return (
                <CeldaAlerta
                  key={columna}
                  alertas={cabeza.alertas}
                  campo="personal"
                  rowSpan={total}
                >
                  {nombreConConteo}
                </CeldaAlerta>
              );
            }
            return (
              <Celda
                key={columna}
                operativo={cabeza}
                columna={columna}
                rowSpan={total}
              />
            );
          })}

          {/* La acción va por operativo: se conserva editar/retirar de cada código. */}
          {acciones && (
            <td className={`px-2 py-1 align-top ${claseAcciones}`}>{acciones(operativo)}</td>
          )}
        </tr>
      ))}
    </>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN REGISTRO CON LOTE, AGRUPADO. 2026-09-17 (igual que la matriz y la jornada).
 *
 * Los operativos de un mismo `grupoRegistro`: la PATRULLA del 5/6 (una persona por área) y —desde
 * el 2026-09-21— el REGISTRO del 8 (varias personas/copias del mismo registro). El IDENTIFICADOR
 * baja a la fila de cada código; la PERSONA y el TELÉFONO se fusionan POR PERSONA —con «(n)» en el
 * nombre cuando lleva varios operativos, las copias del 8—; el resto se fusiona sobre todo el grupo
 * con `rowSpan`, y el bloque lleva UN solo color. La patrulla ofrece «Agregar Personal» (aporte); el
 * 8 no —su rol no aporta—, así que sale solo «Editar» y el «Eliminar» por código.
 *
 * ALINEADA COMO LAS DEMÁS (2026-09-18): las celdas fusionadas NO se centran —`align-top`, como
 * cualquier otro operativo—, para que la patrulla recién registrada salga alineada con el resto y
 * no como un bloque centrado aparte.
 *
 * ACCIONES (2026-09-18; grupo único desde el 2026-10-13): la patrulla es UN operativo. Cada fila
 * lleva su grupo en la columna «Acciones» (`accionesFilaPatrulla`): la acción principal solo en la
 * PRIMERA —«Editar» para el registrante, «Agregar Personal» para quien aporta— y en CADA una el
 * menú con el «Eliminar» de esa persona. Sin él, cae a la acción por operativo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const GrupoForm6Operativos: FC<{
  operativos: Operativo[];
  columnas: ColumnaOperativo[];
  acciones?: (operativo: Operativo) => ReactNode;
  accionesFilaPatrulla?: (
    operativo: Operativo,
    grupo: Operativo[],
    esCabeza: boolean,
  ) => ReactNode;
  claseAcciones?: string;
  bandaGris: boolean;
}> = ({
  operativos,
  columnas,
  acciones,
  accionesFilaPatrulla,
  claseAcciones = "",
  bandaGris,
}) => {
  const destacadoId = useContext(Destacado);
  // ORDEN DETERMINISTA DE LA PATRULLA (2026-09-18). Los códigos del grupo pueden llegar en distinto
  // orden según la pantalla (P-01 antepone los aportes recién puestos; P-02 los trae del servidor).
  // Se ordenan por identificador para que la CABEZA —de la que cuelgan «Editar»/«Agregar Personal»—
  // sea SIEMPRE la misma (el código del registrante, IGNECU), y así los botones se comporten IGUAL
  // en las dos tablas.
  const ordenados = [...operativos].sort((una, otra) =>
    una.identificador.localeCompare(otra.identificador),
  );
  const cabeza = ordenados[0];
  const total = ordenados.length;

  // HORARIO POR PERSONA cuando las ventanas de los códigos difieren (RN-66): cada persona de la
  // patrulla puede tener su turno propio. Si difieren, el horario BAJA por fila (como personal); si
  // todos coinciden, se fusiona como el resto. Así el código a otra hora deja de salirse del grupo.
  const horarioPorPersona =
    new Set(ordenados.map((operativo) => valorDeColumna(operativo, "horario")))
      .size > 1;

  // FUSIÓN POR PERSONA (2026-09-21). Una persona puede traer VARIOS códigos: las copias del 8
  // comparten funcionario (el mismo inspector con «cantidad de operativos» N). El NOMBRE, el
  // TELÉFONO y —si difiere— el HORARIO se fusionan por persona en vez de repetirse por fila, y el
  // nombre muestra el total de operativos de esa persona: «VILLAVICENCIO VACA MIGUEL ANGEL (2)».
  // En la patrulla (Form 5/6) cada persona trae UN solo código (n=1): no se muestra el conteo y el
  // marcado queda idéntico al de antes. Como `ordenados` va por identificador y el prefijo codifica
  // el área de cada persona, los códigos de una misma persona quedan contiguos y el `rowSpan` calza.
  const idDePersona = (operativo: Operativo): string =>
    String(operativo.personal[0]?.funcionarioId ?? `sin-${operativo.id}`);
  const conteoPorPersona = new Map<string, number>();
  for (const operativo of ordenados) {
    const clave = idDePersona(operativo);
    conteoPorPersona.set(clave, (conteoPorPersona.get(clave) ?? 0) + 1);
  }

  return (
    <>
      {ordenados.map((operativo, indice) => {
        // Cada operativo de la patrulla lleva UNA persona: su nombre y teléfono van por fila.
        const persona = filasDePersonal(operativo)[0];
        // Cuántos códigos lleva esta persona en el grupo, y si esta es su PRIMERA fila (donde se
        // pintan sus celdas fusionadas). El resto de sus filas las omite el `rowSpan`.
        const codigosDeLaPersona = conteoPorPersona.get(idDePersona(operativo)) ?? 1;
        const abarcaPersona =
          codigosDeLaPersona > 1 ? codigosDeLaPersona : undefined;
        const esPrimeraDeLaPersona =
          ordenados.findIndex(
            (otro) => idDePersona(otro) === idDePersona(operativo),
          ) === indice;

        return (
          <tr
            key={operativo.id}
            {...anclaDeFila(operativo.id)}
            className={`${claseDestello(operativo.id, destacadoId)}${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
          >
            {columnas.map((columna) => {
              // El identificador baja POR FILA: una fila (y una acción) por cada código.
              if (columna === "identificador") {
                return (
                  <Celda
                    key={columna}
                    operativo={operativo}
                    columna={columna}
                  />
                );
              }
              // Personal y teléfono se fusionan POR PERSONA: solo en su primera fila, con «(n)» en
              // el nombre cuando la persona lleva varios operativos (las copias del 8).
              if (COLUMNAS_POR_PERSONA.includes(columna)) {
                if (!esPrimeraDeLaPersona) return null;
                if (columna === "personal") {
                  const etiqueta =
                    codigosDeLaPersona > 1
                      ? `${persona.nombre} (${codigosDeLaPersona})`
                      : persona.nombre;
                  return (
                    <CeldaAlerta
                      key={columna}
                      alertas={operativo.alertas}
                      campo="personal"
                      rowSpan={abarcaPersona}
                    >
                      {etiqueta || null}
                    </CeldaAlerta>
                  );
                }
                return (
                  <td
                    key={columna}
                    className={CLASE_TELEFONO}
                    rowSpan={abarcaPersona}
                  >
                    <TextoTelefono telefono={persona.telefono} />
                  </td>
                );
              }
              // El horario baja POR PERSONA cuando difiere entre los códigos (cada persona el suyo,
              // fusionado sobre sus copias).
              if (columna === "horario" && horarioPorPersona) {
                if (!esPrimeraDeLaPersona) return null;
                return (
                  <Celda
                    key={columna}
                    operativo={operativo}
                    columna={columna}
                    rowSpan={abarcaPersona}
                  />
                );
              }
              // El resto —horario (si coincide), zonal, punto…— se fusiona en la primera fila y
              // abarca el grupo. SIN `centrado`: se alinea arriba, como cualquier otro operativo.
              if (indice !== 0) return null;
              return (
                <Celda
                  key={columna}
                  operativo={cabeza}
                  columna={columna}
                  rowSpan={total}
                />
              );
            })}

            {/*
              Acciones en su columna, un grupo por fila: la acción principal del grupo UNA vez, en la
              primera, y el «Eliminar» de cada persona en SU fila. La celda NO se fusiona: así el
              «Eliminar» sale en Acciones, por persona. Sin `accionesFilaPatrulla`, cae a la acción
              por operativo.
            */}
            {accionesFilaPatrulla ? (
              <td className={`px-2 py-1 align-top ${claseAcciones}`}>
                {accionesFilaPatrulla(operativo, ordenados, indice === 0)}
              </td>
            ) : (
              acciones && (
                <td className={`px-2 py-1 align-top ${claseAcciones}`}>{acciones(operativo)}</td>
              )
            )}
          </tr>
        );
      })}
    </>
  );
};

export default TablaOperativos;
