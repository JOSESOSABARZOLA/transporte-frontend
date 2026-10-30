/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: EstadoRegistroFlota.tsx
 * Responsabilidad: El distintivo «Activo» / «Vigente» / «De baja» de las tres tablas de Flota.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-20
 *
 * «De baja» va en gris y, si consta, dice en su tooltip cuándo y quién lo dio de baja (D1 del plan
 * «flota-mantenimiento-baja»): «Dado de baja el 14/10/2026 por Ana Pérez». El texto también va para
 * el lector de pantalla (regla 6). Uno solo para vehículos, conductores y garajes.
 */

import type { FC } from "react";

import Insignia from "../common/Insignia.tsx";
import Tooltip from "../common/Tooltip.tsx";
import type { DatosDeBaja } from "../../interfaces/Transporte.ts";
import { textoDeBaja } from "../../utils/flota.util.ts";

type EstadoRegistroFlotaProps = {
  /** Activo (vehículo, conductor) o vigente (garaje). */
  enUso: boolean;
  /** «Activo» o «Vigente». */
  textoEnUso: string;
  registro: DatosDeBaja;
};

const EstadoRegistroFlota: FC<EstadoRegistroFlotaProps> = ({ enUso, textoEnUso, registro }) => {
  if (enUso) return <Insignia variante="exito">{textoEnUso}</Insignia>;
  const detalle = textoDeBaja(registro);
  if (!detalle) return <Insignia variante="neutro">De baja</Insignia>;
  return (
    <Tooltip texto={detalle}>
      <span tabIndex={0} className="inline-flex">
        <Insignia variante="neutro">
          De baja<span className="sr-only">: {detalle}</span>
        </Insignia>
      </span>
    </Tooltip>
  );
};

export default EstadoRegistroFlota;
