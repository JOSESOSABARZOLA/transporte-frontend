/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Consulta a la API
 * Archivo: useConsulta.ts
 * Responsabilidad: Ejecutar una consulta y exponer su estado, error y recarga.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ES LA BASE DE LOS CUATRO HOOKS DEL MÓDULO. Sin ella, cada uno repetiría el mismo
 * `useState` triple —dato, cargando, error—, el mismo `useEffect` y la misma traducción
 * del error, y las cinco copias empezarían a diferir en cuanto una se corrigiera.
 *
 * NO ES UNA CACHÉ NI UN GESTOR DE ESTADO DEL SERVIDOR. Incorporar uno —`react-query`—
 * exigiría una dependencia nueva, y eso se pregunta antes (PV-24, y regla 2 de
 * CLAUDE.md). Esto es lo que hace falta hoy: pedir, mostrar, y volver a pedir.
 *
 * DESCARTA LA RESPUESTA SI EL COMPONENTE SE DESMONTÓ. Sin esa comprobación, cambiar de
 * pantalla mientras una petición vuela produce una advertencia de React y, peor, deja el
 * error de una pantalla que ya nadie mira.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { presentarError, type ErrorPresentado } from "../utils/errorApi.util";

export interface EstadoConsulta<T> {
  datos: T | null;
  cargando: boolean;
  error: ErrorPresentado | null;
  /** Vuelve a pedir. La pantalla la usa después de escribir. */
  recargar: () => void;
}

/**
 * Ejecuta `consulta` al montar y cada vez que cambie alguna dependencia.
 *
 * @param consulta función que pide a la API. Debe estar memoizada por quien la pasa.
 * @param habilitada `false` deja el hook en espera sin pedir nada. Sirve cuando la
 *        consulta depende de un dato que todavía no se eligió —el formulario, la fecha—:
 *        pedir con un valor vacío devolvería un 400 que el funcionario no ha provocado.
 */
export const useConsulta = <T>(
  consulta: () => Promise<T>,
  habilitada = true,
): EstadoConsulta<T> => {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState<boolean>(habilitada);
  const [error, setError] = useState<ErrorPresentado | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const ejecutar = useCallback(async () => {
    if (!habilitada) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const resultado = await consulta();
      if (montado.current) setDatos(resultado);
    } catch (fallo: unknown) {
      if (montado.current) setError(presentarError(fallo));
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [consulta, habilitada]);

  useEffect(() => {
    void ejecutar();
  }, [ejecutar]);

  return { datos, cargando, error, recargar: () => void ejecutar() };
};
