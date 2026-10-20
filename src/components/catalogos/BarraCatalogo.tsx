/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: BarraCatalogo.tsx
 * Responsabilidad: La barra común de las tres pestañas de P-08: buscar, filtrar por estado, contar
 *                  y dar de alta.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * UNA SOLA BARRA PARA LAS TRES PESTAÑAS (rediseño del 2026-10-12): el mismo sitio para buscar, el
 * mismo segmentado Activos | Inactivos | Todos (arranca en Activos desde el 2026-10-15) y el contador a la derecha, para que pasar de
 * «Puntos» a «Tipos» no obligue a reaprender la pantalla. Las acciones (alta y, en puntos,
 * «Expandir todo») las pone cada pestaña como `children`; lo que va junto al filtro (el interruptor
 * de zonales, 2026-10-13), como `complemento`. El contador va en `text-app-strong`: es una cifra
 * que se lee, no una ayuda.
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
  contador: string;
  /** Junto al filtro de estado: en puntos, el interruptor «Solo zonales con puntos…». */
  complemento?: ReactNode;
  children?: ReactNode;
};

const BarraCatalogo: FC<BarraCatalogoProps> = ({
  id,
  marcador,
  busqueda,
  onBuscar,
  filtro,
  onFiltro,
  contador,
  complemento,
  children,
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <input
      id={`${id}-buscar`}
      type="search"
      className="input input-bordered w-full sm:w-72"
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
    {complemento}
    <span
      className="text-app-strong text-sm"
      role="status"
    >
      {contador}
    </span>
    <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export default BarraCatalogo;
