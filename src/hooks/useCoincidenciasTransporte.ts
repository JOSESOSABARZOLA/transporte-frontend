/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos · compartir unidad
 * Archivo: useCoincidenciasTransporte.ts
 * Responsabilidad: Preguntar, mientras se registra, si otro operativo del mismo ámbito va al mismo
 *                  punto y en el mismo horario con transporte DAF.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO PREGUNTA CUANDO HAY CON QUÉ (plan «compartir unidad», §3.1): fecha, un punto del catálogo,
 * una zonal, el horario del personal y un transporte DAF. Espera 400 ms a que la captura se quede
 * quieta y cancela la consulta anterior (`AbortController`) si cambia antes de que llegue.
 *
 * ES UNA SUGERENCIA, NO UN CONTROL. Si la consulta falla, no se dice nada y el registro sigue: el
 * servidor vuelve a validar la intención al guardar y la DAF al ejecutarla. `cargado` distingue
 * «todavía no se preguntó» de «se preguntó y no hay nada», para no limpiar una elección antes de
 * tiempo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";

import type { CoincidenciaTransporte, FiltroCoincidencias } from "../interfaces/Operativo.ts";
import { OperativoService } from "../services/operativo.service.ts";

/** Lo que tarda en preguntar desde el último cambio de la captura. */
export const ESPERA_COINCIDENCIAS_MS = 400;

export interface EstadoCoincidencias {
  coincidencias: CoincidenciaTransporte[];
  /** Ya respondió el servidor para el filtro actual (aunque sea con una lista vacía). */
  cargado: boolean;
}

const SIN_CONSULTA: EstadoCoincidencias = { coincidencias: [], cargado: false };

/**
 * `filtro` en `null` = falta algo para preguntar: no hay coincidencias que mostrar. Se compara por
 * su contenido (no por referencia) para que un pintado nuevo con los mismos datos no repregunte.
 */
export const useCoincidenciasTransporte = (
  filtro: FiltroCoincidencias | null,
): EstadoCoincidencias => {
  const clave = filtro ? JSON.stringify(filtro) : null;
  const [estado, setEstado] = useState<{ clave: string | null } & EstadoCoincidencias>({
    clave: null,
    ...SIN_CONSULTA,
  });

  useEffect(() => {
    if (!clave) return;
    const controlador = new AbortController();
    const temporizador = window.setTimeout(() => {
      OperativoService.coincidenciasTransporte(
        JSON.parse(clave) as FiltroCoincidencias,
        controlador.signal,
      )
        .then((coincidencias) => setEstado({ clave, coincidencias, cargado: true }))
        // Silencioso: sin respuesta no hay sugerencia, y nada se bloquea.
        .catch(() => {
          if (!controlador.signal.aborted) setEstado({ clave, coincidencias: [], cargado: false });
        });
    }, ESPERA_COINCIDENCIAS_MS);

    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [clave]);

  // Lo guardado solo vale para el filtro con que se pidió.
  if (!clave || estado.clave !== clave) return SIN_CONSULTA;
  return { coincidencias: estado.coincidencias, cargado: estado.cargado };
};
