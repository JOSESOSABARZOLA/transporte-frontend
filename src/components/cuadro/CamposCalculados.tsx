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
 *
 * PLANTILLA VISUAL (2026-10-24). Los distintivos van dentro de los chips de `EncabezadoPagina`,
 * así que se devuelven SUELTOS (sin contenedor propio), en el orden de todas las pantallas:
 * código · fecha · semana · estado. La fecha se dice en palabras (`fechaEnPalabras`: «Sábado 24 de
 * octubre de 2026»), igual que en la Jornada, la Matriz y Órdenes; antes iba el `AAAA-MM-DD` tal cual.
 */

import type { FC } from "react";

import { colorEstado } from "../../config/env.ts";
import {
  nombreEstadoCuadro,
  type CuadroDiario,
} from "../../interfaces/CuadroDiario.ts";
import { fechaEnPalabras } from "../../utils/texto.util.ts";

type CamposCalculadosProps = {
  cuadro: CuadroDiario | null;
  cargando: boolean;
};

const CamposCalculados: FC<CamposCalculadosProps> = ({ cuadro, cargando }) => {
  if (cargando) {
    return <span className="badge badge-ghost badge-sm">Cargando jornada…</span>;
  }

  if (!cuadro) {
    return <span className="badge badge-ghost badge-sm">Sin jornada abierta</span>;
  }

  const estado = nombreEstadoCuadro[cuadro.estado];

  return (
    <>
      <span className="badge badge-ghost badge-sm">{cuadro.ordenTrabajo}</span>
      <span className="badge badge-ghost badge-sm">{fechaEnPalabras(cuadro.fecha)}</span>
      <span className="badge badge-ghost badge-sm">
        Semana {cuadro.nroSemana} de {cuadro.anioSemana}
      </span>
      {/* El estado lleva color y **también** texto: ninguna señal depende solo del color. */}
      <span className={`badge badge-sm ${colorEstado(estado)}`}>{estado}</span>
    </>
  );
};

export default CamposCalculados;
