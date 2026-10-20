/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: TarjetaOrden.tsx
 * Responsabilidad: Entregar la orden al funcionario en su teléfono.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES UNA TARJETA Y NO UNA FILA DE TABLA, Y ESA ES LA DECISIÓN DEL MÓDULO.
 *
 * P-06 es **la única pantalla concebida principalmente para el teléfono**, porque su
 * destinatario es el funcionario en territorio. Una tabla a 375 px obliga a desplazarse en
 * horizontal para leer cuatro datos que caben de sobra en vertical, y quien la consulta
 * está de pie, con una mano, a las seis de la tarde.
 *
 * La rejilla crece con la pantalla —una, dos y tres columnas—, pero el diseño nace del
 * teléfono hacia arriba y no al revés. FASE5 §9.6.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import CamposDeLaOrden from "./CamposDeLaOrden.tsx";
import Boton from "../common/Boton.tsx";
import type { OrdenServicio } from "../../interfaces/Documento.ts";

type TarjetaOrdenProps = {
  orden: OrdenServicio;
  descargando: boolean;
  onDescargar: (codigo: string) => void;
};

const TarjetaOrden: FC<TarjetaOrdenProps> = ({
  orden,
  descargando,
  onDescargar,
}) => (
  <article className="rounded-md border border-base-300 bg-base-100 p-4">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <span className="font-mono text-xs font-semibold">{orden.codigo}</span>
      <span
        className={`badge badge-sm ${
          orden.vigente ? "badge-success" : "badge-ghost"
        }`}
      >
        {orden.vigente ? "Vigente" : "Sustituida"}
      </span>
    </header>

    <p className="mb-3 text-sm text-app-muted">
      Jornada del {orden.fechaJornada}
    </p>

    <CamposDeLaOrden dato={orden.datoAislado} />

    <div className="mt-4">
      <Boton
        variante="primario"
        tamano="sm"
        className="w-full"
        onClick={() => onDescargar(orden.codigo)}
        cargando={descargando}
      >
        {descargando ? "Descargando…" : "Descargar PDF"}
      </Boton>
    </div>
  </article>
);

export default TarjetaOrden;
