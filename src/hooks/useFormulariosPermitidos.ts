/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios y catálogos
 * Archivo: useFormulariosPermitidos.ts
 * Responsabilidad: Exponer los formularios que el rol activo puede abrir.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LA LISTA LLEGA FILTRADA DEL SERVIDOR (PER-01). Este hook no descarta ninguno: si
 * recibiera los nueve y ocultara seis, quitar una línea bastaría para escribir en el
 * formulario de otro departamento. El servidor devuelve solo los que corresponden.
 *
 * `soloDueno` NO ES UN FILTRO DE SEGURIDAD, es una comodidad de presentación: el
 * desplegable de registro necesita los formularios sobre los que se puede **crear**, y
 * el rol compartido participa con cupo de personal pero no registra (PER-06). El
 * servidor lo rechazaría igual; esto solo evita ofrecer lo que va a fallar.
 */

import { useCallback, useMemo } from "react";

import { CatalogoCuadroService } from "../services/catalogoCuadro.service";
import type { Formulario } from "../interfaces/Formulario";
import { useConsulta } from "./useConsulta";
import type { ErrorPresentado } from "../utils/errorApi.util";

export interface UsoFormularios {
  formularios: Formulario[];
  /** Aquellos de los que el rol es dueño: los únicos donde puede registrar. */
  propios: Formulario[];
  cargando: boolean;
  error: ErrorPresentado | null;
  recargar: () => void;
  buscarPorCodigo: (codigo: string) => Formulario | undefined;
}

export const useFormulariosPermitidos = (): UsoFormularios => {
  const consulta = useCallback(
    () => CatalogoCuadroService.listarPermitidos(),
    [],
  );

  const { datos, cargando, error, recargar } =
    useConsulta<Formulario[]>(consulta);

  const formularios = useMemo(() => datos ?? [], [datos]);

  const propios = useMemo(
    () =>
      formularios.filter((formulario) => formulario.acceso === "ESCRITURA"),
    [formularios],
  );

  const buscarPorCodigo = useCallback(
    (codigo: string) =>
      formularios.find((formulario) => formulario.codigo === codigo),
    [formularios],
  );

  return { formularios, propios, cargando, error, recargar, buscarPorCodigo };
};
