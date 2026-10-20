/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Navegación de la DAF
 * Archivo: RedireccionDaf.tsx
 * Responsabilidad: Redirigir las rutas antiguas de la DAF a «Planificar el día», conservando la fecha.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * «Jornada de los conductores» pasó a ser la vista «Tabla» del paso 2 de Planificar el día, y la
 * «Capacidad de flota» se confirma ahora en su paso 1 (vehículos que salen). Un marcador o un enlace viejo no debe
 * terminar en el inicio: llega a la pantalla nueva, en la pestaña que corresponde y con la
 * misma `?fecha=` si la traía.
 */

import type { FC } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { esFechaDeCalendario } from "../../utils/jornada.util.ts";

type RedireccionDafProps = {
  /** Vista de los conductores en el paso 2 (`?vista=`); sin ella, la línea de tiempo. */
  vista?: "tabla";
};

const RedireccionDaf: FC<RedireccionDafProps> = ({ vista }) => {
  const [params] = useSearchParams();
  const destino = new URLSearchParams();
  const fecha = params.get("fecha");
  if (esFechaDeCalendario(fecha)) destino.set("fecha", fecha);
  if (vista) destino.set("vista", vista);
  const consulta = destino.toString();

  return (
    <Navigate
      to={`/home/cuadro/transporte${consulta ? `?${consulta}` : ""}`}
      replace
    />
  );
};

export default RedireccionDaf;
