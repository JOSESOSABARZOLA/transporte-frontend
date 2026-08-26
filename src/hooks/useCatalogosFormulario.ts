/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios y catálogos
 * Archivo: useCatalogosFormulario.ts
 * Responsabilidad: Exponer los catálogos delimitados de un formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * NO PIDE NADA HASTA QUE HAY FORMULARIO. Los catálogos dependen de él —RN-16 y RN-17
 * delimitan puntos, tipos e instituciones por formulario—, y pedirlos con el código
 * vacío devolvería un 404 que el funcionario no provocó: todavía no ha elegido.
 *
 * LOS PUNTOS SE PIDEN APARTE, al elegir la zonal. RN-17: el punto pertenece a la zonal,
 * y la matriz que los relaciona vive en el servidor y sigue pendiente de validación
 * (PV-01). Resolverla aquí exigiría inventarla.
 */

import { useCallback, useState } from "react";

import { CatalogoCuadroService } from "../services/catalogoCuadro.service";
import type {
  CatalogosFormulario,
  PuntoEncuentro,
} from "../interfaces/Formulario";
import { useConsulta } from "./useConsulta";
import { presentarError, type ErrorPresentado } from "../utils/errorApi.util";

export interface UsoCatalogos {
  catalogos: CatalogosFormulario | null;
  cargando: boolean;
  error: ErrorPresentado | null;
  recargar: () => void;
  /** Puntos de la zonal elegida. Vacío mientras no se elija ninguna. */
  puntos: PuntoEncuentro[];
  cargandoPuntos: boolean;
  errorPuntos: ErrorPresentado | null;
  /** RN-17. Se llama al cambiar la zonal en el formulario. */
  cargarPuntosDeZonal: (zonalId: number) => Promise<void>;
  limpiarPuntos: () => void;
}

export const useCatalogosFormulario = (
  formularioCodigo: string | null,
): UsoCatalogos => {
  const consulta = useCallback(
    () => CatalogoCuadroService.obtenerCatalogos(formularioCodigo ?? ""),
    [formularioCodigo],
  );

  const { datos, cargando, error, recargar } = useConsulta<CatalogosFormulario>(
    consulta,
    Boolean(formularioCodigo),
  );

  const [puntos, setPuntos] = useState<PuntoEncuentro[]>([]);
  const [cargandoPuntos, setCargandoPuntos] = useState(false);
  const [errorPuntos, setErrorPuntos] = useState<ErrorPresentado | null>(null);

  const cargarPuntosDeZonal = useCallback(
    async (zonalId: number) => {
      if (!formularioCodigo) return;

      setCargandoPuntos(true);
      setErrorPuntos(null);

      try {
        setPuntos(
          await CatalogoCuadroService.obtenerPuntos(formularioCodigo, zonalId),
        );
      } catch (fallo: unknown) {
        setErrorPuntos(presentarError(fallo));
        // Se vacía la lista: dejar los puntos de la zonal anterior ofrecería una opción
        // que el servidor rechazaría por no pertenecer a la zonal elegida (INV-07).
        setPuntos([]);
      } finally {
        setCargandoPuntos(false);
      }
    },
    [formularioCodigo],
  );

  const limpiarPuntos = useCallback(() => {
    setPuntos([]);
    setErrorPuntos(null);
  }, []);

  return {
    catalogos: datos,
    cargando,
    error,
    recargar,
    puntos,
    cargandoPuntos,
    errorPuntos,
    cargarPuntosDeZonal,
    limpiarPuntos,
  };
};
