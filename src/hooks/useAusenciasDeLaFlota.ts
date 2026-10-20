/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: useAusenciasDeLaFlota.ts
 * Responsabilidad: La ausencia a mostrar de cada conductor en la tabla de «Flota y garajes».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * UNA consulta de toda la flota (`GET /administracion/conductores/ausencias`, sin motivo), no una
 * por fila: de cada conductor se muestra la en curso o, si no, la próxima (`ausenciaAMostrar`).
 * Sin el permiso `flota:ausencias` no se pregunta nada. Si la consulta falla, no hay distintivos y
 * la tabla funciona igual.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AusenciaDeLaFlota } from "../interfaces/Flota.ts";
import { FlotaService } from "../services/flota.service.ts";
import { ausenciaAMostrar } from "../utils/ausencias.util.ts";

export const useAusenciasDeLaFlota = (activo: boolean, hoy: string) => {
  const [ausencias, setAusencias] = useState<AusenciaDeLaFlota[]>([]);
  const [version, setVersion] = useState(0);

  // La consulta va en el efecto y su respuesta se descarta si el efecto ya se limpió.
  useEffect(() => {
    if (!activo) return undefined;
    let vigente = true;
    FlotaService.ausenciasDeLaFlota()
      .then((lista) => {
        if (vigente) setAusencias(lista);
      })
      .catch(() => {
        if (vigente) setAusencias([]);
      });
    return () => {
      vigente = false;
    };
  }, [activo, version]);

  /** Tras registrar o quitar una ausencia. */
  const refrescar = useCallback(() => setVersion((antes) => antes + 1), []);

  const porConductor = useMemo(() => {
    const agrupadas = new Map<number, AusenciaDeLaFlota[]>();
    for (const ausencia of ausencias) {
      const lista = agrupadas.get(ausencia.conductorId) ?? [];
      lista.push(ausencia);
      agrupadas.set(ausencia.conductorId, lista);
    }
    const resultado: Record<number, AusenciaDeLaFlota> = {};
    for (const [id, lista] of agrupadas) {
      const elegida = ausenciaAMostrar(lista, hoy);
      if (elegida) resultado[id] = elegida;
    }
    return resultado;
  }, [ausencias, hoy]);

  return { porConductor, refrescar };
};
