/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: CamposCalculados.tsx
 * Responsabilidad: Mostrar semana, fecha y estado como distintivos, no como campos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOS CAMPOS CALCULADOS NO SON CAMPOS. Regla 5 de CLAUDE.md.
 *
 * Semana, identificador y fecha se muestran como `badge badge-ghost badge-sm`, **nunca
 * como `input` deshabilitado**. La diferencia no es estética:
 *
 *   · Un `input` deshabilitado sugiere que alguien podría habilitarlo. Estos valores los
 *     deriva el servidor y **nadie los escribe**: el Product Owner describió el problema
 *     al revés —«al escribirlo a mano me equivoco en el año y en el secuencial»—.
 *   · Un distintivo **no recibe foco**, así que queda fuera del recorrido del tabulador
 *     (caso 12 del plan y FASE5 §10.3). Tabular por tres controles que no se pueden
 *     tocar es exactamente el ruido que hace lento un formulario.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import { colorEstado } from "../../config/env.ts";
import {
  nombreEstadoCuadro,
  type CuadroDiario,
} from "../../interfaces/CuadroDiario.ts";

type CamposCalculadosProps = {
  cuadro: CuadroDiario | null;
  cargando: boolean;
};

const CamposCalculados: FC<CamposCalculadosProps> = ({ cuadro, cargando }) => {
  if (cargando) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-ghost badge-sm">Cargando jornada…</span>
      </div>
    );
  }

  if (!cuadro) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-ghost badge-sm">Sin jornada abierta</span>
      </div>
    );
  }

  const estado = nombreEstadoCuadro[cuadro.estado];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="badge badge-ghost badge-sm">{cuadro.ordenTrabajo}</span>
      <span className="badge badge-ghost badge-sm">{cuadro.fecha}</span>
      <span className="badge badge-ghost badge-sm">
        Semana {cuadro.nroSemana} de {cuadro.anioSemana}
      </span>
      {/* El estado lleva color y **también** texto: ninguna señal depende solo del color. */}
      <span className={`badge badge-sm ${colorEstado(estado)}`}>{estado}</span>
    </div>
  );
};

export default CamposCalculados;
