/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Fecha de trabajo de la DAF
 * Archivo: FechaDafContext.tsx
 * Responsabilidad: Compartir la FECHA DE TRABAJO entre las pantallas de la DAF.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA ANALISTA PLANIFICA UN DÍA, NO UNA PANTALLA. Si eligió el 07/10 en «Planificar el día» y pasa
 * a «Turnos del mes» o a «Mantenimiento», debe seguir mirando el 07/10. Cada pantalla tenía su
 * propio `useState(fechaDeJornadaPorDefecto())`, así que al cambiar de pantalla se volvía a
 * mañana sin avisar.
 *
 * DOS FUENTES, CON PRIORIDAD: el `?fecha=AAAA-MM-DD` de la URL manda (se puede compartir o
 * recargar sin perderlo); si no viene, la del contexto, que recuerda la última elegida en la
 * sesión de la pestaña (`sessionStorage`, como el borrador de P-01: sin datos personales, pero
 * por pestaña). Fuera del proveedor —las pruebas— se usa mañana y el cambio es local.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useSearchParams } from "react-router-dom";

import {
  esFechaDeCalendario,
  fechaDeJornadaPorDefecto,
} from "../utils/jornada.util.ts";

const CLAVE = "sigoc.transporte.fechaDaf";

type ValorFechaDaf = { fecha: string; setFecha: (fecha: string) => void };

const leerGuardada = (): string | null => {
  try {
    const valor = window.sessionStorage.getItem(CLAVE);
    return esFechaDeCalendario(valor) ? valor : null;
  } catch {
    return null;
  }
};

const FechaDafContext = createContext<ValorFechaDaf | null>(null);

export const FechaDafProvider = ({ children }: PropsWithChildren) => {
  const [fecha, setFechaInterna] = useState<string>(
    () => leerGuardada() ?? fechaDeJornadaPorDefecto(),
  );

  const setFecha = useCallback((nueva: string) => {
    if (!esFechaDeCalendario(nueva)) return;
    setFechaInterna(nueva);
    try {
      window.sessionStorage.setItem(CLAVE, nueva);
    } catch {
      // Sin almacenamiento (modo privado): la fecha vive solo en memoria. No es un error.
    }
  }, []);

  const valor = useMemo(() => ({ fecha, setFecha }), [fecha, setFecha]);

  return (
    <FechaDafContext.Provider value={valor}>{children}</FechaDafContext.Provider>
  );
};

/** La fecha del contexto (sin URL). La usa el menú para llevarla en los enlaces de la DAF. */
// eslint-disable-next-line react-refresh/only-export-components
export const useFechaDafContexto = (): string | null =>
  useContext(FechaDafContext)?.fecha ?? null;

/**
 * La fecha de trabajo de una pantalla DAF: la de la URL si viene, si no la compartida. Cambiarla
 * actualiza las dos, así que al navegar a otra pantalla DAF se conserva.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useFechaDaf = (): ValorFechaDaf => {
  const contexto = useContext(FechaDafContext);
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState<string>(() => fechaDeJornadaPorDefecto());

  const enUrl = params.get("fecha");
  const deUrl = esFechaDeCalendario(enUrl) ? enUrl : null;
  const compartida = contexto?.fecha ?? local;
  const fecha = deUrl ?? compartida;

  // La URL manda: si trae otra fecha, el contexto la adopta (para la siguiente pantalla).
  useEffect(() => {
    if (deUrl && contexto && deUrl !== contexto.fecha) contexto.setFecha(deUrl);
  }, [deUrl, contexto]);

  const setFecha = useCallback(
    (nueva: string) => {
      if (!esFechaDeCalendario(nueva)) return;
      if (contexto) contexto.setFecha(nueva);
      else setLocal(nueva);
      const siguiente = new URLSearchParams(params);
      siguiente.set("fecha", nueva);
      setParams(siguiente, { replace: true });
    },
    [contexto, params, setParams],
  );

  return { fecha, setFecha };
};
