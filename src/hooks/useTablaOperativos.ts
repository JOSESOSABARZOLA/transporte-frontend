/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos
 * Archivo: useTablaOperativos.ts
 * Responsabilidad: Filtros por columna, paginación y resaltado de la tabla única de operativos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ESTADO DE LA TABLA, EN UN SOLO SITIO. 2026-10-13.
 *
 * P-01 («Operativos de este formulario») y P-02 («Operativos registrados») muestran la misma
 * tabla con los mismos controles: filtros por columna, páginas de 10/25/50 y la fila recién
 * guardada resaltada unos segundos. Hasta hoy P-02 lo tenía escrito en la página y P-01 no lo
 * tenía; dos copias habrían empezado a diferir en cuanto se corrigiera una.
 *
 * SE FILTRA Y SE PAGINA EN MEMORIA, sobre lo que el servidor ya entregó recortado por rol
 * (PER-02): ver la cabecera de `listadoOperativos.util.ts`.
 *
 * RESALTAR LLEVA A SU PÁGINA. Una fila resaltada en otra página no la ve nadie: al pedir el
 * resaltado, la tabla salta a la página donde está. La recién registrada va arriba, así que
 * queda en la primera. Los filtros NO se borran: si ocultan la fila, quien filtró sigue viendo
 * lo que pidió.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Operativo } from "../interfaces/Operativo.ts";
import { useDestelloDeFila } from "./useDestelloDeFila.ts";
import {
  MS_RESALTADO,
  filtrarOperativos,
  hayFiltrosActivos,
  paginar,
  type ColumnaOperativo,
  type FiltrosListado,
} from "../utils/listadoOperativos.util.ts";

/** El tamaño de página con que se abre la tabla. */
const TAMANIO_INICIAL = 10;

export const useTablaOperativos = (
  operativos: Operativo[],
  /** Filtros con que nace la tabla (P-02 lee `?formulario=` de la URL). Se leen una vez. */
  filtrosIniciales: () => FiltrosListado = () => ({}),
) => {
  const [filtros, setFiltros] = useState<FiltrosListado>(filtrosIniciales);
  const [pagina, setPagina] = useState(0);
  const [tamanio, setTamanio] = useState(TAMANIO_INICIAL);
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);
  // La fila que hay que llevar a su página: se cumple cuando ya está en la lista (tras recargar).
  const [irA, setIrA] = useState<number | null>(null);
  // La fila a la que lleva una nota «Comparte con X»: se centra y destella (2026-10-19).
  const destello = useDestelloDeFila();

  const coincidentes = useMemo(
    () => filtrarOperativos(operativos, filtros),
    [operativos, filtros],
  );

  const paginaActual = useMemo(
    () => paginar(coincidentes, pagina, tamanio),
    [coincidentes, pagina, tamanio],
  );

  // Si el filtro deja menos páginas de las que había, `paginar` devuelve la última que existe
  // (`paginaActual.pagina`), y es la que se muestra: sin esto, quien filtra desde la página 3 se
  // quedaría mirando una tabla vacía existiendo resultados.

  // Llevar a su página la fila pedida, en cuanto está en la lista. Se ajusta DURANTE el render —el
  // patrón de React para estado derivado—, no en un efecto que pintaría primero la página vieja.
  if (irA !== null) {
    const indice = coincidentes.findIndex((operativo) => operativo.id === irA);
    if (indice >= 0) {
      setIrA(null);
      setPagina(Math.floor(indice / tamanio));
    }
  }

  // La fila resaltada se apaga sola.
  useEffect(() => {
    if (resaltadoId === null) return undefined;
    const apagar = window.setTimeout(() => setResaltadoId(null), MS_RESALTADO);
    return () => window.clearTimeout(apagar);
  }, [resaltadoId]);

  const cambiarFiltro = useCallback((columna: ColumnaOperativo, valor: string) => {
    setFiltros((actuales) => ({ ...actuales, [columna]: valor }));
    setPagina(0);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros({});
    setPagina(0);
  }, []);

  const cambiarTamanio = useCallback((nuevo: number) => {
    setTamanio(nuevo);
    setPagina(0);
  }, []);

  /** Resalta la fila del operativo unos segundos y lleva la tabla a su página. */
  const resaltar = useCallback((id: number) => {
    setIrA(id);
    setResaltadoId(id);
  }, []);

  const destacarDestello = destello.destacar;
  /**
   * La nota «Comparte con X» lleva a la fila de X (2026-10-19, plan «notas-jornada-matriz», J5): a
   * su página si hace falta, centrada y con un destello. Si los filtros la ocultan, no hay fila que
   * mostrar: lo decide quien llama con `contiene`.
   */
  const destacar = useCallback(
    (id: number) => {
      setIrA(id);
      destacarDestello(id);
    },
    [destacarDestello],
  );

  /** ¿El operativo está en lo que la tabla muestra (filtrado, en alguna de sus páginas)? */
  const contiene = useCallback(
    (id: number) => coincidentes.some((operativo) => operativo.id === id),
    [coincidentes],
  );

  return {
    filtros,
    cambiarFiltro,
    limpiarFiltros,
    filtrando: hayFiltrosActivos(filtros),
    coincidentes,
    paginaActual,
    setPagina,
    tamanio,
    cambiarTamanio,
    resaltadoId,
    resaltar,
    destacadoId: destello.destacadoId,
    destacar,
    contiene,
  };
};

export type TablaDeOperativos = ReturnType<typeof useTablaOperativos>;
