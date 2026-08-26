/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: IndicadorFlota.tsx
 * Responsabilidad: Mostrar la holgura de flota del día, sin impedir nada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * AVISA, NO BLOQUEA. Es el caso 9 del plan y VAL-24.
 *
 * Que la demanda supere la flota declarada es un hecho de la jornada, no un error de
 * captura: el cuadro sigue siendo válido y alguien tendrá que resolverlo pidiendo apoyo o
 * cubriendo por propios medios. Un bloqueo aquí obligaría a la DAF a mentir en la
 * declaración de capacidad para poder seguir trabajando.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `declarada` EN NULO NO ES CERO. Mientras la DAF no declare su flota, no hay con qué
 * comparar, y decir «0/0» afirmaría que no hay vehículos. Se dice que falta declararla.
 */

import type { FC } from "react";

import type { CapacidadFlota } from "../../interfaces/Transporte.ts";

type IndicadorFlotaProps = {
  capacidad: CapacidadFlota | null;
  cargando: boolean;
};

const IndicadorFlota: FC<IndicadorFlotaProps> = ({ capacidad, cargando }) => {
  if (cargando) {
    return <span className="badge badge-ghost badge-sm">Cargando flota…</span>;
  }

  if (!capacidad || !capacidad.declarada) {
    return (
      <span
        className="badge badge-ghost badge-sm"
        title="La DAF aún no ha declarado cuántos vehículos y conductores están hábiles hoy."
      >
        Flota sin declarar
      </span>
    );
  }

  const { vehiculos, conductores } = capacidad;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {vehiculos && (
        <span
          className={`badge badge-sm ${
            vehiculos.suficiente ? "badge-ghost" : "badge-error"
          }`}
        >
          Vehículos {vehiculos.requeridos}/{vehiculos.declarados}
        </span>
      )}
      {conductores && (
        <span
          className={`badge badge-sm ${
            conductores.suficiente ? "badge-ghost" : "badge-error"
          }`}
        >
          Conductores {conductores.requeridos}/{conductores.declarados}
        </span>
      )}
    </div>
  );
};

export default IndicadorFlota;
