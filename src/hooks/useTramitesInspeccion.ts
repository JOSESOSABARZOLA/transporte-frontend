/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Trámites de Inspección
 * Archivo: useTramitesInspeccion.ts
 * Responsabilidad: Traer los trámites de Inspección de las personas asignadas, en la fecha de la jornada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * UNA consulta por cambio de (fecha, personas), no una por combo. Se vuelve a pedir solo cuando la
 * lista de ids cambia de verdad —la clave se arma con los ids ordenados—, no en cada render.
 *
 * `cargando` SE DERIVA, no se guarda: es «la última respuesta no es de este pedido». Así el efecto
 * solo fija estado al llegar la respuesta (sin `set-state-in-effect`, que el proyecto prohíbe).
 *
 * NUNCA BLOQUEA EL REGISTRO. Si la consulta falla, el estado lo dice (`disponible: false` con el
 * motivo del servidor, tal cual — regla 7) y el operativo se registra igual sin trámite.
 */

import { useEffect, useMemo, useState } from "react";

import { TramitesInspeccionService } from "../services/tramitesInspeccion.service.ts";
import { presentarError } from "../utils/errorApi.util.ts";
import type { TramitesDePersona } from "../interfaces/TramiteInspeccion.ts";

export interface EstadoTramites {
  cargando: boolean;
  disponible: boolean;
  motivo: string | null;
  /** Por funcionario: si es inspector y sus trámites del día. */
  porPersona: ReadonlyMap<number, TramitesDePersona>;
}

type Respuesta = Omit<EstadoTramites, "cargando">;

const SIN_DATOS: Respuesta = {
  disponible: true,
  motivo: null,
  porPersona: new Map(),
};

export const useTramitesInspeccion = (
  fecha: string | null | undefined,
  funcionarioIds: readonly number[],
): EstadoTramites => {
  const clave = useMemo(
    () => [...new Set(funcionarioIds)].sort((a, b) => a - b).join(","),
    [funcionarioIds],
  );
  const pedido = fecha && clave !== "" ? `${fecha}|${clave}` : "";
  const [ultima, setUltima] = useState<{
    pedido: string;
    respuesta: Respuesta;
  } | null>(null);

  useEffect(() => {
    if (!pedido) return;
    const [fechaPedido, ids] = pedido.split("|");
    let vigente = true;
    TramitesInspeccionService.consultar(fechaPedido, ids.split(",").map(Number))
      .then((consulta) => {
        if (!vigente) return;
        setUltima({
          pedido,
          respuesta: {
            disponible: consulta.disponible,
            motivo: consulta.motivo,
            porPersona: new Map(
              consulta.personas.map((persona) => [
                persona.funcionarioId,
                persona,
              ]),
            ),
          },
        });
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;
        setUltima({
          pedido,
          respuesta: {
            disponible: false,
            motivo: presentarError(fallo).mensaje,
            porPersona: new Map(),
          },
        });
      });
    return () => {
      vigente = false;
    };
  }, [pedido]);

  return useMemo(() => {
    if (!pedido) return { ...SIN_DATOS, cargando: false };
    // Mientras llega la respuesta nueva, se conserva lo anterior: los combos no parpadean.
    if (ultima?.pedido !== pedido) {
      return { ...(ultima?.respuesta ?? SIN_DATOS), cargando: true };
    }
    return { ...ultima.respuesta, cargando: false };
  }, [pedido, ultima]);
};
