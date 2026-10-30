/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: BarraCambiosParametros.tsx
 * Responsabilidad: La barra fija inferior del guardado único: cuántos cambios hay, Descartar y
 *                  Guardar cambios.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * `sticky bottom-0 z-10` ENTRÓ AL INVENTARIO el 2026-10-24, por decisión del usuario y solo para
 * esta barra (docs/FASE5-diseno-interfaz.md §2.2): con 48 parámetros en secciones plegables, un
 * pie al final del panel quedaba fuera de la vista. Aparece solo si hay cambios.
 *
 * Con valores no admisibles, «Guardar cambios» se apaga y dice por qué («Revise N valores fuera
 * de rango»): no se manda al servidor algo que ya se sabe que rechazará.
 */

import type { FC } from "react";

import Boton from "../common/Boton.tsx";

type BarraCambiosParametrosProps = {
  cambios: number;
  errores: number;
  guardando: boolean;
  onDescartar: () => void;
  onGuardar: () => void;
};

const BarraCambiosParametros: FC<BarraCambiosParametrosProps> = ({
  cambios,
  errores,
  guardando,
  onDescartar,
  onGuardar,
}) => {
  if (cambios === 0) return null;
  const motivo =
    errores > 0
      ? `Revise ${errores} ${errores === 1 ? "valor" : "valores"} fuera de rango`
      : null;
  return (
    <div
      className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Cambios sin guardar"
    >
      <p className="text-sm font-semibold text-app-strong" aria-live="polite">
        {cambios} {cambios === 1 ? "cambio sin guardar" : "cambios sin guardar"}
        {motivo && (
          <span className="block text-xs font-normal text-error">{motivo}</span>
        )}
      </p>
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          tamano="sm"
          deshabilitado={guardando}
          onClick={onDescartar}
        >
          Descartar
        </Boton>
        <Boton
          variante="primario"
          tamano="sm"
          cargando={guardando}
          motivoDeshabilitado={motivo}
          onClick={onGuardar}
        >
          Guardar cambios
        </Boton>
      </div>
    </div>
  );
};

export default BarraCambiosParametros;
