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
  nombreEstadoTransporte,
  valorDeColumna,
  type ColumnaOperativo,
  type FiltrosListado,
} from "../../utils/listadoOperativos.util.ts";
import CeldaAlerta from "./CeldaAlerta.tsx";

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
  /** Contenido de la columna de acciones. Sin ella, la columna no existe. */
  acciones?: (operativo: Operativo) => ReactNode;
};

const TablaOperativos: FC<TablaOperativosProps> = ({
  operativos,
  columnas = COLUMNAS_SESION,
  mensajeVacio = "Los operativos que registre en esta sesión aparecerán aquí.",
  filtros,
  onFiltroChange,
  acciones,
}) => {
  const conFiltros = Boolean(onFiltroChange);
  const totalColumnas = columnas.length + (acciones ? 1 : 0);

  return (
    <div className="overflow-x-auto">
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
            {acciones && <th scope="col">Acciones</th>}
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
              {acciones && <th />}
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
            operativos.map((operativo) => (
              <tr key={operativo.id}>
                {columnas.map((columna) => (
                  <Celda
                    key={columna}
                    operativo={operativo}
                    columna={columna}
                  />
                ))}
                {acciones && (
                  <td className="px-2 py-1 align-top">{acciones(operativo)}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Una celda. El texto sale siempre de `valorDeColumna`, que es también por lo que filtra
 * la fila de arriba: lo que se ve y lo que se busca no pueden separarse.
 */
const Celda: FC<{ operativo: Operativo; columna: ColumnaOperativo }> = ({
  operativo,
  columna,
}) => {
  const texto = valorDeColumna(operativo, columna);

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
      <td className="px-2 py-1 align-top">
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
      <td className="px-2 py-1 align-top">
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

  return <td className="px-2 py-1 align-top">{texto}</td>;
};

export default TablaOperativos;
