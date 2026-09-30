/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: CeldaAlerta.tsx
 * Responsabilidad: Pintar una celda con su alerta, siempre acompañada de texto.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGLA 6 DE CLAUDE.md · NINGUNA INFORMACIÓN DEPENDE SOLO DEL COLOR.
 *
 * En un sistema llamado *cuadro de colores* esto exige atención deliberada. La celda
 * amarilla lleva **siempre** el mensaje del servidor: en el `title` para quien apunta con
 * el ratón, y como texto visible cuando la celda está vacía.
 *
 * Sin eso, quien no distingue el amarillo del blanco —o quien lee con un lector de
 * pantalla— no tendría forma de saber que falta algo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import {
  claseDeAlerta,
  textoDeAlerta,
  type Alerta,
  type CampoAlertado,
} from "../../interfaces/Alerta.ts";

type CeldaAlertaProps = {
  alertas: Alerta[];
  campo: CampoAlertado;
  children?: ReactNode;
  /**
   * Cuántos renglones abarca, cuando el operativo se agrupa por persona (2026-08-27).
   *
   * La alerta es **del operativo**, no de una de sus personas: con dos asignados, la
   * celda de punto de encuentro es una sola que abarca los dos renglones, y su Amarillo
   * de Alerta tiene que abarcarlos igual. Sin esto, el color se quedaría en el primero y
   * el segundo parecería estar en regla.
   *
   * Opcional y sin valor por omisión: las tablas que no agrupan —P-13, y las celdas por
   * persona de las que sí— siguen emitiendo exactamente el mismo `<td>` que antes.
   */
  rowSpan?: number;
  /**
   * Clases extra para el `<td>`. Sin valor por omisión: quien no la pasa emite exactamente
   * el mismo marcado que antes. La usa la matriz para marcar el borde superior de la primera
   * fila de cada operativo (`border-t border-base-300`), y así separar un operativo del otro.
   */
  className?: string;
  /**
   * Centra el contenido (vertical y horizontal) en vez de alinearlo arriba a la izquierda.
   * Lo usan los grupos de copias del formulario 8: su celda fusionada abarca varios renglones
   * y el dato queda centrado en el bloque, como una celda combinada de Excel (2026-09-14).
   */
  centrado?: boolean;
};

const CeldaAlerta: FC<CeldaAlertaProps> = ({
  alertas,
  campo,
  children,
  rowSpan,
  className,
  centrado,
}) => {
  const clase = claseDeAlerta(alertas, campo);
  const texto = textoDeAlerta(alertas, campo);
  const vacia = children === null || children === undefined || children === "";
  const alineacion = centrado ? "align-middle text-center" : "align-top";

  return (
    <td
      className={`px-2 py-1 ${alineacion} ${clase}${className ? ` ${className}` : ""}`}
      title={texto || undefined}
      rowSpan={rowSpan}
    >
      {vacia ? (
        <span className="text-xs text-base-content/70">{texto || "—"}</span>
      ) : (
        children
      )}
    </td>
  );
};

export default CeldaAlerta;
