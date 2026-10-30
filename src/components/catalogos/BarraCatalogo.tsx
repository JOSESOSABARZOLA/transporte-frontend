/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: BarraCatalogo.tsx
 * Responsabilidad: La barra común de las tres pestañas de P-08: buscar, filtrar por estado y, a la
 *                  derecha, lo propio de la pestaña.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * UNA SOLA BARRA PARA LAS TRES PESTAÑAS (rediseño del 2026-10-12): el mismo sitio para buscar, el
 * mismo segmentado Activos | Inactivos | Todos (arranca en Activos desde el 2026-10-15) y el contador a la derecha, para que pasar de
 * «Puntos» a «Tipos» no obligue a reaprender la pantalla. Las acciones (alta y, en puntos,
 * «Expandir todo») las pone cada pestaña como `children`; lo que va junto al filtro (el interruptor
 * de zonales, 2026-10-13), como `complemento`. El contador va en `text-app-strong`: es una cifra
 * que se lee, no una ayuda.
 *
 * PLANTILLA VISUAL (2026-10-24): es el contenido de la barra blanca de filtros de `PanelTabla`.
 * El alta subió a la cabecera azul y el contador se retiró; a la derecha (`ml-auto`) quedan, en
 * puntos, «Expandir / Contraer todo» y el interruptor «Solo zonales con puntos…» (`children`).
 */

import type { FC, ReactNode } from "react";

import SelectorSegmentado from "../forms/SelectorSegmentado.tsx";
import { OPCIONES_ESTADO, type FiltroEstado } from "../../utils/catalogos.util.ts";

type BarraCatalogoProps = {
  id: string;
  /** Texto del buscador y su nombre accesible («Buscar zonal o punto…»). */
  marcador: string;
  busqueda: string;
  onBuscar: (texto: string) => void;
  filtro: FiltroEstado;
  onFiltro: (filtro: FiltroEstado) => void;
  /** A la derecha de la barra: en puntos, «Expandir todo» y el interruptor de zonales. */
  children?: ReactNode;
};

const BarraCatalogo: FC<BarraCatalogoProps> = ({
  id,
  marcador,
  busqueda,
  onBuscar,
  filtro,
  onFiltro,
  children,
}) => (
  <>
    <input
      id={`${id}-buscar`}
      type="search"
      className="input input-bordered input-sm min-w-[320px]"
      placeholder={marcador}
      aria-label={marcador.replace(/…$/, "")}
      value={busqueda}
      onChange={(evento) => onBuscar(evento.target.value)}
    />
    <SelectorSegmentado
      id={`${id}-estado`}
      etiqueta="Estado"
      etiquetaOculta
      opciones={OPCIONES_ESTADO}
      valor={filtro}
      onCambiar={(valor) => onFiltro(valor as FiltroEstado)}
    />
    {children && <div className="ml-auto flex flex-wrap items-center gap-3">{children}</div>}
  </>
);

export default BarraCatalogo;
