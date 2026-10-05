/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: BotonRepartoCarga.tsx
 * Responsabilidad: El botón que abre el reparto de carga del personal, con su resumen de semáforo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANTES PARECÍA TEXTO. Era un `btn-ghost` junto al rótulo «Personal asignado», y nada lo
 * distinguía de una etiqueta: quien no sabía que existía el reparto no lo descubría. Ahora es un
 * botón secundario (`btn-outline btn-primary`), del alto de los «+ Agregar» (`btn-sm`), con la
 * balanza a la izquierda.
 *
 * UN SOLO COMPONENTE PARA LOS DOS SITIOS: el alta de P-01 y el cajón de edición de Mis operativos
 * renderizan el mismo `SelectorPersonal`, que lo usa. Así no pueden divergir.
 *
 * EL RESUMEN DEL SEMÁFORO sale de los MISMOS datos que el reparto (el `nivelFatiga` de cada
 * candidato) y usa los tonos del TEMA —success/warning/error, los de la barra del reparto—, no
 * hexadecimales a mano (regla 2). Cada punto lleva su conteo, y el resumen completo en palabras va
 * como DESCRIPCIÓN (`aria-describedby`, texto `sr-only`): el color nunca es la única señal
 * (regla 6). El NOMBRE accesible se queda en «Ver reparto de carga», estable para quien lo busca.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useId, type FC, type Ref } from "react";

import Iconos from "../common/Iconos.tsx";

/** Cuántos candidatos hay en cada nivel de carga (fatiga). */
export type ConteoSemaforo = { baja: number; media: number; alta: number };

type BotonRepartoCargaProps = {
  onClick: () => void;
  /** Si el reparto (drawer o vista del cajón) está abierto: alimenta `aria-expanded`. */
  expandido: boolean;
  /** Resumen opcional del semáforo; sin él, el botón va solo con su rótulo. */
  conteo?: ConteoSemaforo;
  ref?: Ref<HTMLButtonElement>;
};

/** Un punto del semáforo con su conteo. El tono es del tema; el número dice lo mismo sin color. */
const Punto: FC<{ clase: string; valor: number }> = ({ clase, valor }) => (
  <span className="inline-flex items-center gap-1" aria-hidden="true">
    <span className={`inline-block h-2 w-2 rounded-full ${clase}`} />
    {valor}
  </span>
);

const BotonRepartoCarga: FC<BotonRepartoCargaProps> = ({
  onClick,
  expandido,
  conteo,
  ref,
}) => {
  const idResumen = useId();
  const hayConteo =
    conteo !== undefined && conteo.baja + conteo.media + conteo.alta > 0;

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="btn btn-sm btn-outline btn-primary whitespace-nowrap"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={expandido}
        aria-describedby={hayConteo ? idResumen : undefined}
        title="Ver cómo se distribuye la carga entre el personal"
      >
        <Iconos nombre="reparto" />
        Ver reparto de carga
        {hayConteo && (
          <span className="ml-1 inline-flex items-center gap-2 text-xs">
            <Punto clase="bg-success" valor={conteo.baja} />
            <Punto clase="bg-warning" valor={conteo.media} />
            <Punto clase="bg-error" valor={conteo.alta} />
          </span>
        )}
      </button>
      {/* Fuera del botón: es su DESCRIPCIÓN, no parte de su nombre accesible. */}
      {hayConteo && (
        <span id={idResumen} className="sr-only">
          {`Carga baja: ${conteo.baja}; media: ${conteo.media}; alta: ${conteo.alta}.`}
        </span>
      )}
    </>
  );
};

export default BotonRepartoCarga;
