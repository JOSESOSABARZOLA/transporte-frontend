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
};

const CeldaAlerta: FC<CeldaAlertaProps> = ({ alertas, campo, children }) => {
  const clase = claseDeAlerta(alertas, campo);
  const texto = textoDeAlerta(alertas, campo);
  const vacia = children === null || children === undefined || children === "";

  return (
    <td
      className={`px-2 py-1 align-top ${clase}`}
      title={texto || undefined}
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
