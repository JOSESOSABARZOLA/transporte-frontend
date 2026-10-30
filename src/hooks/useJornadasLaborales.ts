/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: useJornadasLaborales.ts
 * Responsabilidad: Traer el catálogo de jornadas laborales una vez y compartirlo entre pantallas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 *
 * SE CACHEA EN EL MÓDULO, como el catálogo de roles: Personal, Flota y sus cajones lo leen a la
 * vez, y no hace falta pedirlo ocho veces. A diferencia de los roles, el catálogo SÍ cambia sin
 * desplegar —el administrador crea y desactiva jornadas—, así que quien escribe llama a
 * `recargar()`, que vacía la caché y vuelve a pedirla.
 *
 * Un fallo no rompe la pantalla: la lista queda vacía y la jornada se lee como «Sin jornada». El
 * aviso lo da quien depende del catálogo para guardar.
 */

import { useCallback, useEffect, useState } from "react";

import type { JornadaLaboral } from "../interfaces/JornadaLaboral.ts";
import { JornadasLaboralesService } from "../services/jornadasLaborales.service.ts";

let cache: JornadaLaboral[] | null = null;
let enVuelo: Promise<JornadaLaboral[]> | null = null;

const pedir = async (): Promise<JornadaLaboral[]> => {
  if (cache) return cache;
  enVuelo ??= JornadasLaboralesService.listar()
    .then((jornadas) => {
      cache = jornadas;
      return jornadas;
    })
    .finally(() => {
      enVuelo = null;
    });
  return enVuelo;
};

/** Vacía la caché: lo llama quien acaba de crear, editar o desactivar una jornada. */
export const olvidarJornadasLaborales = (): void => {
  cache = null;
};

export const useJornadasLaborales = () => {
  const [jornadas, setJornadas] = useState<JornadaLaboral[]>(cache ?? []);
  const [cargando, setCargando] = useState(cache === null);
  const [error, setError] = useState<unknown>(null);
  /** Sube con cada `recargar()`: vuelve a disparar la consulta. */
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    if (cache && vuelta === 0) return undefined;
    let vigente = true;
    void pedir()
      .then((traidas) => {
        if (!vigente) return;
        setJornadas(traidas);
        setError(null);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(fallo);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [vuelta]);

  const recargar = useCallback(() => {
    olvidarJornadasLaborales();
    setCargando(true);
    setVuelta((n) => n + 1);
  }, []);

  return { jornadas, cargando, error, recargar };
};
