/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cajones del operativo
 * Archivo: ChipFormulario.tsx
 * Responsabilidad: El distintivo del formulario en la cabecera de los cajones de un operativo
 *                  (edición, adicional y detalle), con el color del banner que entrega el servidor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-27
 *
 * Nació dentro de `DrawerOperativo`; el 2026-10-27 lo comparte con `DetalleOperativoLectura`, que
 * lleva la misma cabecera. El número va en el texto: el color acompaña, no informa solo (regla 6).
 */

import type { FC } from "react";

import type { Operativo } from "../../interfaces/Operativo.ts";
import { colorDeTextoSobre } from "../../utils/banner.util.ts";

const ChipFormulario: FC<{ operativo: Operativo }> = ({ operativo }) => (
  <span
    className="badge badge-sm min-w-0 max-w-full"
    title={`${operativo.formulario.numero}. ${operativo.formulario.nombre}`}
    style={{
      backgroundColor: operativo.formulario.colorFondo,
      color: colorDeTextoSobre(operativo.formulario.colorFondo),
    }}
  >
    <span className="min-w-0 truncate">
      {operativo.formulario.numero}. {operativo.formulario.nombre}
    </span>
  </span>
);

export default ChipFormulario;
