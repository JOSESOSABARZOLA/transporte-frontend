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
 * LA COMPARTEN P-01 Y P-02, QUE MIRAN LO MISMO CON DISTINTO PROPÓSITO.
 *
 *   · **P-01** la usa como «resultado inmediato» (FASE5 §4.1): quien registra ve la fila
 *     aparecer sin cambiar de pantalla. Sin filtros, sin paginar, sin acciones.
 *   · **P-02** la usa como listado de la jornada: con fila de filtros, paginación y las
 *     acciones de editar y retirar.
 *
 * Las diferencias viajan **como propiedades opcionales cuyo valor por defecto es lo que
 * P-01 ya hacía**. Duplicar el componente habría sido más cómodo hoy y peor mañana: la
 * celda con alerta es la pieza que traduce el color a texto (regla 6), y dos copias
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
 *      justo lo contrario para el retiro: `ModalConfirmacion` se usa directamente
 *      (FASE5 §4.6, y el comentario de `interfaces/Modal.ts`).
 *   3. Trae dos botones fijos de exportación a CSV y PDF **que no hacen nada**. Sacar el
 *      cuadro a un archivo no es una función que nadie haya pedido en esta pantalla, y en
 *      un sistema que nació de una filtración por WhatsApp no es un detalle menor.
 *
 * `Table` sigue siendo lo correcto donde la consulta la resuelva el servidor —P-07, con
 * cincuenta y dos funcionarios y filtros reales—; y allí sí habrá que memoizar
 * `findRecordsFn` con `useCallback`, como advierte el plan.
 */

import type { FC, ReactNode } from "react";

import type { Operativo } from "../../interfaces/Operativo.ts";
import { colorEstado } from "../../config/env.ts";
import {
  COLUMNAS_FILTRABLES,
  COLUMNAS_SESION,
  TITULO_COLUMNA,
  filasDePersonal,
  horarioBajaPorPersona,
  nombreEstadoTransporte,
  valorDeColumna,
  type ColumnaOperativo,
  type FiltrosListado,
} from "../../utils/listadoOperativos.util.ts";
import { agruparPorClave } from "../../utils/agrupacionForm8.util.ts";
import CeldaAlerta from "./CeldaAlerta.tsx";

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
  "tipo",
  "conductor",
  "vehiculo",
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
    operativo.personal[0].funcionarioId,
    operativo.esAdicional,
    ...COLUMNAS_DE_FUSION.map((columna) => valorDeColumna(operativo, columna)),
  ]);
};

/** Columnas que se pintan como celda con alerta, y a qué campo alertado corresponden. */
const CAMPO_ALERTADO = {
  personal: "personal",
  punto: "puntoEncuentro",
  tipo: "tipoControl",
  conductor: "conductor",
  vehiculo: "placa",
  observaciones: "observaciones",
} as const;

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
   * PATRULLA (Form 5/6). Acciones de PATRULLA, fusionadas una sola vez para todo el grupo
   * (Editar los generales + Agregar Personal). 2026-09-18. Si falta, la patrulla cae a `acciones`.
   */
  accionesPatrulla?: (operativos: Operativo[]) => ReactNode;
  /** PATRULLA. Acción POR PERSONA (Eliminar), pintada junto al nombre de cada quien. */
  accionPersona?: (operativo: Operativo) => ReactNode;
};

const TablaOperativos: FC<TablaOperativosProps> = ({
  operativos,
  columnas = COLUMNAS_SESION,
  mensajeVacio = "Los operativos que registre en esta sesión aparecerán aquí.",
  filtros,
  onFiltroChange,
  acciones,
  accionesPatrulla,
  accionPersona,
}) => {
  const conFiltros = Boolean(onFiltroChange);
  // La columna de acciones existe si hay acción por operativo O de patrulla.
  const hayAcciones = Boolean(acciones ?? accionesPatrulla);
  const totalColumnas = columnas.length + (hayAcciones ? 1 : 0);

  return (
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
              >
                {TITULO_COLUMNA[columna]}
              </th>
            ))}
            {hayAcciones && <th scope="col">Acciones</th>}
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
                className="px-2 py-6 text-center text-sm text-base-content/70"
              >
                {mensajeVacio}
              </td>
            </tr>
          ) : (
            // Las copias del formulario 8 (varios operativos idénticos de una persona) se juntan
            // en un grupo; los demás quedan en grupos de uno. Ver `agrupacionForm8.util.ts`.
            agruparPorClave(operativos, claveDeFusion).map((grupo, indiceGrupo) =>
              // La PATRULLA (Form 5/6, con `grupoRegistro`) va SIEMPRE por su componente, aunque
              // lleve un solo código: así sus acciones fusionadas se ofrecen desde el primero.
              grupo[0].grupoRegistro ? (
                <GrupoForm6Operativos
                  key={grupo[0].id}
                  operativos={grupo}
                  columnas={columnas}
                  acciones={acciones}
                  accionesPatrulla={accionesPatrulla}
                  accionPersona={accionPersona}
                  bandaGris={indiceGrupo % 2 === 0}
                />
              ) : grupo.length === 1 ? (
                <FilasDelOperativo
                  key={grupo[0].id}
                  operativo={grupo[0]}
                  columnas={columnas}
                  acciones={acciones}
                  bandaGris={indiceGrupo % 2 === 0}
                />
              ) : (
                <GrupoForm8Operativos
                  key={grupo[0].id}
                  operativos={grupo}
                  columnas={columnas}
                  acciones={acciones}
                  bandaGris={indiceGrupo % 2 === 0}
                />
              ),
            )
          )}
        </tbody>
      </table>
    </div>
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
  bandaGris: boolean;
}> = ({ operativo, columnas, acciones, bandaGris }) => {
  const filas = filasDePersonal(operativo);
  const abarca = filas.length > 1 ? filas.length : undefined;

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
          className={`${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
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
              className="px-2 py-1 align-top"
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
 * La celda de una persona: su nombre o su teléfono, en su propio renglón.
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

  return (
    <td className="px-2 py-1 align-top whitespace-nowrap font-mono text-xs">
      {texto}
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

  if (columna in CAMPO_ALERTADO) {
    /*
      En conductor y vehículo el único texto propio posible es una condición que deriva
      del formulario —«Propios medios», «No se activa»—, nunca un nombre ni una placa:
      `Operativo` no los trae. Se pinta como distintivo para que no se lea como un dato
      capturado, igual que los campos calculados de la regla 5.
    */
    const derivado =
      texto !== "" && (columna === "conductor" || columna === "vehiculo");

    return (
      <CeldaAlerta
        alertas={operativo.alertas}
        campo={CAMPO_ALERTADO[columna as keyof typeof CAMPO_ALERTADO]}
        rowSpan={rowSpan}
        centrado={centrado}
      >
        {derivado ? (
          <span className="badge badge-ghost badge-sm">{texto}</span>
        ) : (
          texto || null
        )}
      </CeldaAlerta>
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
        <span className="font-mono text-xs font-semibold">
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

  return (
    <td
      className={`px-2 py-1 ${alin}`}
      rowSpan={rowSpan}
    >
      {texto}
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
  bandaGris: boolean;
}> = ({ operativos, columnas, acciones, bandaGris }) => {
  const cabeza = operativos[0];
  const total = operativos.length;
  const nombreConConteo = `${valorDeColumna(cabeza, "personal")} (${total})`;

  return (
    <>
      {operativos.map((operativo, indice) => (
        <tr
          key={operativo.id}
          className={`${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
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
            <td className="px-2 py-1 align-top">{acciones(operativo)}</td>
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
 * ACCIONES (2026-09-18): la patrulla es UN operativo. Todas las acciones viven en la columna
 * «Acciones»: en la PRIMERA fila los generales del grupo (Editar, solo el registrante + Agregar
 * Personal), y en CADA fila el «Eliminar» de esa persona (`accionPersona`). Sin `accionesPatrulla`,
 * cae a la acción por operativo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const GrupoForm6Operativos: FC<{
  operativos: Operativo[];
  columnas: ColumnaOperativo[];
  acciones?: (operativo: Operativo) => ReactNode;
  accionesPatrulla?: (operativos: Operativo[]) => ReactNode;
  accionPersona?: (operativo: Operativo) => ReactNode;
  bandaGris: boolean;
}> = ({
  operativos,
  columnas,
  acciones,
  accionesPatrulla,
  accionPersona,
  bandaGris,
}) => {
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
            className={`${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
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
                    className="px-2 py-1 align-top whitespace-nowrap font-mono text-xs"
                    rowSpan={abarcaPersona}
                  >
                    {persona.telefono}
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
              Acciones en su columna: los generales del grupo (Editar + Agregar Personal) UNA vez en
              la primera fila, y el «Eliminar» de cada persona en SU fila. La celda NO se fusiona:
              así el «Eliminar» sale en Acciones, por persona. Sin `accionesPatrulla`, cae a la
              acción por operativo (compatibilidad).
            */}
            {accionesPatrulla ? (
              <td className="px-2 py-1 align-top">
                <div className="flex flex-col items-start gap-1">
                  {indice === 0 && accionesPatrulla(ordenados)}
                  {accionPersona?.(operativo)}
                </div>
              </td>
            ) : (
              acciones && (
                <td className="px-2 py-1 align-top">{acciones(operativo)}</td>
              )
            )}
          </tr>
        );
      })}
    </>
  );
};

export default TablaOperativos;
