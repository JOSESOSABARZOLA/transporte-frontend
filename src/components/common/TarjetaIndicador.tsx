/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Indicadores
 * Archivo: TarjetaIndicador.tsx
 * Responsabilidad: Una tarjeta de indicador clicable: título, número, detalle y, si hay que
 *                  atenderlo, el tono ámbar con su aviso en palabras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA ÚNICA TARJETA DE INDICADOR ESTABA ESCRITA EN LÍNEA en el paso 4 de «Planificar el día»
 * (`PasoEmitir`). Esta es la misma composición —`rounded-md border p-3`, título `text-app-label`,
 * valor `text-2xl font-semibold text-app-strong`, detalle `text-xs text-app-muted`— con dos
 * diferencias: es un BOTÓN (lleva a la pestaña con su filtro) y puede pedir atención.
 *
 * EL ÁMBAR NO ES LA SEÑAL (regla 6). Con `atencion`, además del borde y el fondo, el nombre
 * accesible dice «requiere atención» y el detalle se lee igual. `activa` marca la tarjeta cuyo
 * filtro está puesto (`aria-pressed`).
 *
 * DOS GRADOS DE ATENCIÓN (2026-10-15): `atencion` (borde y fondo ámbar) para lo que ya es un
 * problema, y `atencion="suave"` (solo el borde ámbar tenue) para un dato que falta —documentos
 * sin fechas—. `nota` es una segunda línea bajo el detalle (p. ej. «3 sin fechas registradas»).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

type TarjetaIndicadorProps = {
  titulo: string;
  /** `null` mientras no hay dato (el resumen falló o no llegó): se pinta «—». */
  valor: number | null;
  detalle: string;
  /** Una segunda línea bajo el detalle; se omite si no hay. */
  nota?: string | null;
  /**
   * Pide atención: `true` con borde y fondo ámbar; `"suave"` solo con el borde ámbar tenue. Las
   * dos lo dicen en el nombre accesible.
   */
  atencion?: boolean | "suave";
  /** Su filtro está puesto en la tabla. */
  activa?: boolean;
  onClick: () => void;
};

const CLASE_ATENCION = {
  fuerte: "border-warning bg-warning/10",
  suave: "border-warning/50 bg-base-100",
  ninguna: "border-base-300 bg-base-100",
} as const;

const TarjetaIndicador: FC<TarjetaIndicadorProps> = ({
  titulo,
  valor,
  detalle,
  nota = null,
  atencion = false,
  activa = false,
  onClick,
}) => {
  const grado = atencion === "suave" ? "suave" : atencion ? "fuerte" : "ninguna";
  const textoAtencion =
    grado === "fuerte" ? ". Requiere atención" : grado === "suave" ? ". Requiere revisión" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      aria-label={`${titulo}: ${valor ?? "sin dato"}. ${detalle}${nota ? `. ${nota}` : ""}${textoAtencion}`}
      data-atencion={grado}
      className={`flex flex-col gap-1 rounded-md border p-3 text-left transition-colors hover:bg-primary/5 ${
        CLASE_ATENCION[grado]
      } ${activa ? "ring-2 ring-primary" : ""}`}
    >
      <span className="text-sm text-app-label">{titulo}</span>
      <span className="text-2xl font-semibold text-app-strong">{valor ?? "—"}</span>
      <span className="text-xs text-app-muted">{detalle}</span>
      {nota && <span className="text-xs text-app-muted">{nota}</span>}
    </button>
  );
};

export default TarjetaIndicador;
