/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos
 * Archivo: PanelOperativos.tsx
 * Responsabilidad: El panel de la tabla de operativos —cabecera, tabla, paginación y la
 *   confirmación de «Eliminar»—, el mismo en Registro de operativo y en Mis operativos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA TABLA DE OPERATIVOS, CON COLUMNAS CONFIGURABLES. 2026-10-13.
 *
 * P-01 («Operativos de este formulario») y P-02 («Operativos registrados») escribían cada una su
 * panel —la misma cadena de clases, la misma cabecera, el mismo contador— y sus propios botones:
 * P-01 sin filtros, sin páginas y con «Editar»/«Eliminar» sueltos; P-02 con todo. Ahora las dos
 * montan este panel, y lo único que cambia es lo que le pasan: las columnas, el texto de la
 * cabecera y las acciones de fila (`AccionesOperativo`, el mismo grupo en las dos).
 *
 * LA CONFIRMACIÓN DE «ELIMINAR» VIVE AQUÍ, y es la misma en las dos pantallas: «¿Eliminar
 * <ID>?» con «Se quitará del cuadro y se liberará al personal asignado.» y el botón en rojo,
 * siempre en un modal centrado. Quién borra y qué se dice al terminar lo decide cada página.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import MensajeModal from "../common/MensajeModal.tsx";
import Paginacion from "../common/Paginacion.tsx";
import TablaOperativos from "./TablaOperativos.tsx";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { TablaDeOperativos } from "../../hooks/useTablaOperativos.ts";
import {
  MENSAJE_DEL_RETIRO,
  tituloDelRetiro,
  type ColumnaOperativo,
} from "../../utils/listadoOperativos.util.ts";

/** La columna de acciones: el ancho de `AccionesOperativo`, alineada a la derecha. */
const COLUMNA_ACCIONES = { th: "w-[9.5rem] text-right", td: "text-right whitespace-nowrap" };

type PanelOperativosProps = {
  /** El rótulo de la cabecera azul. */
  titulo: string;
  /** Lo que va a la derecha de la cabecera: enlaces y el contador de la pantalla. */
  cabecera?: ReactNode;
  /** El estado de la tabla (filtros, página, resaltado): `useTablaOperativos`. */
  tabla: TablaDeOperativos;
  columnas: ColumnaOperativo[];
  mensajeVacio: ReactNode;
  acciones: (operativo: Operativo) => ReactNode;
  accionesFilaPatrulla: (
    operativo: Operativo,
    grupo: Operativo[],
    esCabeza: boolean,
  ) => ReactNode;
  /** Con varios días (P-02): una fila de cabecera por fecha. */
  agruparPorFecha?: boolean;
  /** Una línea bajo la paginación (P-02: «Ordenado por fecha…»). */
  pie?: ReactNode;
  /** El operativo cuya baja espera confirmación, o `null`. */
  porRetirar: Operativo | null;
  /** Elimina el operativo. Si falla, lanza: el error se muestra en el mismo modal. */
  onConfirmarRetiro: () => Promise<void>;
  onCancelarRetiro: () => void;
  /** Abre el detalle del operativo con el que comparte unidad (la nota «Comparte con X»). */
  onVerOperativo?: (operativoId: number) => void;
};

const PanelOperativos: FC<PanelOperativosProps> = ({
  titulo,
  cabecera,
  tabla,
  columnas,
  mensajeVacio,
  acciones,
  accionesFilaPatrulla,
  agruparPorFecha = false,
  pie,
  porRetirar,
  onConfirmarRetiro,
  onCancelarRetiro,
  onVerOperativo,
}) => {
  /*
    La nota «Comparte con X» (2026-10-19, J5): si X está en esta tabla, lleva a su fila —su página,
    centrada, con un destello—; si no (otra fecha, filtrado fuera), abre su detalle como hasta hoy.
  */
  const irAOperativo = (operativoId: number) => {
    if (tabla.contiene(operativoId)) tabla.destacar(operativoId);
    else onVerOperativo?.(operativoId);
  };

  // Cuántos operativos tiene cada día en todo lo filtrado: la cabecera del día no depende de la
  // página en que caiga.
  const conteoPorFecha = agruparPorFecha
    ? tabla.coincidentes.reduce<Record<string, number>>((conteo, operativo) => {
        conteo[operativo.cuadroFecha] = (conteo[operativo.cuadroFecha] ?? 0) + 1;
        return conteo;
      }, {})
    : undefined;

  return (
    <>
      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            {titulo}
          </h2>
          {cabecera && <div className="flex flex-wrap items-center gap-2">{cabecera}</div>}
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <TablaOperativos
            operativos={tabla.paginaActual.filas}
            columnas={columnas}
            resaltadoId={tabla.resaltadoId}
            filtros={tabla.filtros}
            onFiltroChange={tabla.cambiarFiltro}
            mensajeVacio={mensajeVacio}
            acciones={acciones}
            // La patrulla (Form 5/6): su acción principal en la cabeza y el menú en cada fila.
            accionesFilaPatrulla={accionesFilaPatrulla}
            columnaAcciones={COLUMNA_ACCIONES}
            agruparPorFecha={agruparPorFecha}
            conteoPorFecha={conteoPorFecha}
            onVerOperativo={irAOperativo}
            destacadoId={tabla.destacadoId}
          />

          {tabla.coincidentes.length > 0 && (
            <Paginacion
              page={tabla.paginaActual.pagina}
              pageSize={tabla.tamanio}
              total={tabla.paginaActual.total}
              onPage={tabla.setPagina}
              onPageSize={tabla.cambiarTamanio}
              etiqueta="operativos"
            />
          )}
          {tabla.coincidentes.length > 0 && pie}
        </div>
      </div>

      {/*
        Caso 2 del plan: la confirmación nombra el operativo, no pregunta en abstracto. Siempre se
        pide, en un modal centrado, y el botón que borra va en rojo (2026-10-13). Si el servidor lo
        rechaza, el MISMO modal pasa a error (mensajes estándar, 2026-10-16).
      */}
      <MensajeModal
        abierto={porRetirar !== null}
        variante="peligro"
        titulo={porRetirar ? tituloDelRetiro(porRetirar) : ""}
        mensaje={MENSAJE_DEL_RETIRO}
        textoPrincipal="Eliminar"
        tituloError="No se pudo eliminar"
        onPrincipal={onConfirmarRetiro}
        onExito={onCancelarRetiro}
        onSecundario={onCancelarRetiro}
      />
    </>
  );
};

export default PanelOperativos;
