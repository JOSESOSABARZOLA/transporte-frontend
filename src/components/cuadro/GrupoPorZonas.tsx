/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro por zonas del formulario 8 · Matriz y Jornada
 * Archivo: GrupoPorZonas.tsx
 * Responsabilidad: Pintar un registro por zonas en DOS NIVELES con `rowSpan`, el mismo en la
 *   Matriz Consolidada y en la Jornada del Día.
 * Fecha: 2026-10-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO COMPONENTE PARA LAS DOS TABLAS. Nació en `TablaMatriz` el 2026-10-30 y salió aquí cuando
 * la Jornada pidió la misma estructura: dos copias habrían empezado a diferir con el primer ajuste.
 * Las dos tablas tienen las mismas doce columnas —la Jornada suma «Acciones», que llega por
 * `acciones`— y la misma forma de fila (`FilaPorZonas`).
 *
 * Una persona, varias zonas, un mismo `grupoRegistro`, como en el Excel:
 *   · lo del OPERATIVO —horario, persona, teléfono, conductor, placa, estado, notas y acciones—
 *     abarca todas las filas (`rowSpan` = total);
 *   · lo de la ZONA —zonal (con el rango «IG-001 a IG-010 · 10 controles» y «Zona principal»),
 *     punto, tipo e instituciones— abarca solo las filas de esa zona;
 *   · el identificador va por fila, con la marca de su zona (Z1, Z2…).
 * La zona principal va primero y cada zona abre con el borde de separación, que cruza el
 * identificador y las columnas de zona. Todo lo combinado va centrado en vertical. Con una sola
 * zona el registro sigue por el grupo de lote de cada tabla, sin cambios (`esBloquePorZonas`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import CeldaAlerta from "./CeldaAlerta.tsx";
import NotasDeFila from "./NotasDeFila.tsx";
import Insignia from "../common/Insignia.tsx";
import type { Alerta } from "../../interfaces/Alerta.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import type { EstadoTransporte, NotaOperativo } from "../../interfaces/Operativo.ts";
import { useAnclaDeFila } from "../../hooks/useAnclaDeFila.ts";
import { colorEstado } from "../../config/env.ts";
import { nombreEstadoDeFila } from "../../utils/listadoOperativos.util.ts";
import { horarioLegible } from "../../utils/texto.util.ts";
import {
  bloquesDeFilas,
  prioridadDelTransporte,
  resumenDelRegistro,
  type BloqueDeZona,
} from "../../utils/zonasDelBloque.util.ts";

/** Lo que el bloque lee de una fila: la forma común de `FilaMatriz` y `FilaJornada`. */
export interface FilaPorZonas {
  id: number;
  identificador: string;
  esLote: boolean;
  esZonaPrincipal?: boolean | null;
  horario: string;
  esNocturno: boolean;
  personal: {
    nombre: string;
    telefono: string | null;
    cargo?: string | null;
    esResponsable: boolean;
  }[];
  zonales: string[];
  puntoEncuentro: string;
  tipoControl: string;
  instituciones: string[];
  conductor: string | null;
  placa: string | null;
  estadoTransporte: EstadoTransporte;
  alertas: Alerta[];
  notas?: NotaOperativo[];
  observaciones: string[];
  composicionPorInformar?: AreaPersonal[];
}

/** El borde que abre cada operativo y cada zona (`border-t border-base-300`, del inventario). */
const BORDE = "border-t border-base-300";

type GrupoPorZonasProps<F extends FilaPorZonas> = {
  filas: F[];
  bandaGris: boolean;
  /** Contenido de la celda «Acciones» del operativo (la Jornada). Sin él, no hay columna. */
  acciones?: (cabeza: F, filas: F[]) => ReactNode;
};

const GrupoPorZonas = <F extends FilaPorZonas>({
  filas: llegadas,
  bandaGris,
  acciones,
}: GrupoPorZonasProps<F>) => {
  const bloques = bloquesDeFilas(llegadas);
  const filas = bloques.flatMap((bloque) => bloque.filas);
  const cabeza = filas[0];
  const persona = cabeza.personal[0];
  const total = filas.length;
  const anclaDeFila = useAnclaDeFila();
  const nombre = persona?.nombre
    ? `${persona.esResponsable ? `${persona.nombre} (R)` : persona.nombre} (${total})`
    : null;

  return (
    <>
      {bloques.map((bloque) =>
        bloque.filas.map((fila, enLaZona) => {
          const indice = filas.indexOf(fila);
          return (
            <tr
              key={fila.id}
              {...anclaDeFila(fila.id).ancla}
              className={`${anclaDeFila(fila.id).destello}${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
            >
              <td
                className={`min-w-[170px] whitespace-nowrap px-3 py-1 align-top font-mono font-semibold${enLaZona === 0 ? ` ${BORDE}` : ""}`}
              >
                <Insignia
                  variante={bloque.esPrincipal ? "suave" : "neutro"}
                  title={bloque.zonal}
                  className="mr-2"
                >
                  {bloque.marca}
                </Insignia>
                {fila.identificador}
              </td>

              {indice === 0 && (
                <>
                  <td
                    className={`px-3 py-1 align-middle whitespace-nowrap ${BORDE}`}
                    rowSpan={total}
                  >
                    {horarioLegible(cabeza.horario)}
                    {cabeza.esNocturno && (
                      <span className="badge badge-ghost badge-xs ml-2">Nocturno</span>
                    )}
                  </td>
                  <CeldaAlerta
                    alertas={cabeza.alertas}
                    campo="personal"
                    rowSpan={total}
                    alMedio
                    className={BORDE}
                  >
                    {nombre && (
                      <>
                        <span className="block font-semibold text-app-strong">{nombre}</span>
                        {persona?.cargo && (
                          <span className="block text-xs text-app-muted">{persona.cargo}</span>
                        )}
                        <span className="block text-xs text-app-muted">
                          {resumenDelRegistro(bloques)}
                        </span>
                      </>
                    )}
                  </CeldaAlerta>
                  <td
                    className={`px-3 py-1 align-middle whitespace-nowrap font-mono ${BORDE}`}
                    rowSpan={total}
                  >
                    {persona?.telefono ?? "Sin teléfono"}
                  </td>
                </>
              )}

              {enLaZona === 0 && <CeldasDeZona bloque={bloque} />}

              {indice === 0 && (
                <>
                  <CeldaAlerta
                    alertas={cabeza.alertas}
                    campo="conductor"
                    textoCorto="Sin asignar"
                    rowSpan={total}
                    alMedio
                    className={BORDE}
                    pie={prioridadDelTransporte(bloques)}
                  >
                    {cabeza.conductor}
                  </CeldaAlerta>
                  <CeldaAlerta
                    alertas={cabeza.alertas}
                    campo="placa"
                    textoCorto="Sin asignar"
                    rowSpan={total}
                    alMedio
                    className={BORDE}
                  >
                    {cabeza.placa}
                  </CeldaAlerta>
                  <td className={`px-3 py-1 align-middle ${BORDE}`} rowSpan={total}>
                    <span className={`badge badge-sm ${colorEstado(nombreEstadoDeFila(cabeza))}`}>
                      {nombreEstadoDeFila(cabeza)}
                    </span>
                  </td>
                  <td className={`px-2 py-1 align-middle ${BORDE}`} rowSpan={total}>
                    <NotasDeFila fila={cabeza} />
                  </td>
                  {acciones && (
                    <td className={`px-3 py-1 align-middle ${BORDE}`} rowSpan={total}>
                      {acciones(cabeza, filas)}
                    </td>
                  )}
                </>
              )}
            </tr>
          );
        }),
      )}
    </>
  );
};

/** Zonal (con su rango y «Zona principal»), punto, tipo e instituciones de UNA zona. */
const CeldasDeZona: FC<{ bloque: BloqueDeZona<FilaPorZonas> }> = ({ bloque }) => {
  const primera = bloque.filas[0];
  const abarca = bloque.filas.length > 1 ? bloque.filas.length : undefined;
  return (
    <>
      <td className={`min-w-[11rem] px-3 py-1 align-middle ${BORDE}`} rowSpan={abarca}>
        <span className="block font-semibold text-app-strong">{bloque.zonal}</span>
        <span className="block whitespace-nowrap text-xs text-app-muted">{bloque.rango}</span>
        {bloque.esPrincipal && (
          <span className="block text-xs font-semibold text-primary">Zona principal</span>
        )}
      </td>
      <CeldaAlerta
        alertas={primera.alertas}
        campo="puntoEncuentro"
        rowSpan={abarca}
        alMedio
        className={BORDE}
      >
        {bloque.punto || null}
      </CeldaAlerta>
      <CeldaAlerta
        alertas={primera.alertas}
        campo="tipoControl"
        rowSpan={abarca}
        alMedio
        className={BORDE}
      >
        {bloque.tipo || null}
      </CeldaAlerta>
      <td className={`px-3 py-1 align-middle ${BORDE}`} rowSpan={abarca}>
        {bloque.instituciones}
      </td>
    </>
  );
};

export default GrupoPorZonas;
