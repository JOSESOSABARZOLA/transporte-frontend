/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Trámites de Inspección
 * Archivo: ComboTramiteInspeccion.tsx
 * Responsabilidad: Elegir, para un inspector asignado, uno de sus trámites de Inspección del día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * Solo se pinta para inspectores (lo decide el servidor por el área de la ficha). Cada estado se
 * dice con palabras, nunca solo con color (regla 6):
 *
 *   · consultando            → «Consultando trámites de Inspección…»
 *   · Inspección no responde → «Inspección no disponible: <motivo del servidor tal cual>» (regla 7)
 *   · sin trámites ese día   → «Sin trámites asignados en Inspección para esta fecha.»
 *
 * «Sin trámite» siempre es una opción: el trámite es opcional y el registro nunca depende de él. Si
 * la persona ya tenía uno guardado que hoy no llega en la lista, se sigue ofreciendo para no
 * perderlo en silencio, pero rotulado «ya no figura en Inspección» y con un aviso que pide elegir
 * otro o «Sin trámite»: el servidor no lo aceptaría de nuevo.
 *
 * `avisoLote` (form 8 al editar): el trámite se aplica a TODAS las copias de esa persona en el
 * registro, y se dice antes de elegir.
 *
 * Clases del inventario: `select select-bordered select-sm`, `label-text`, `text-xs` (regla 1).
 */

import { useId, type FC } from "react";

import type { TramiteInspeccion } from "../../interfaces/TramiteInspeccion.ts";

type ComboTramiteInspeccionProps = {
  nombrePersona: string;
  /** Código elegido; `null` = sin trámite. */
  valor: string | null;
  tramites: TramiteInspeccion[];
  cargando: boolean;
  disponible: boolean;
  motivo: string | null;
  deshabilitado: boolean;
  /** Form 8 por lote: el cambio alcanza a todas las copias de la persona. */
  avisoLote?: boolean;
  onCambiar: (codigoTramite: string | null) => void;
};

/** «DENUNCIA-26-3415 · Espacio público · Los Chillos»: el código y lo que lo distingue. */
const rotuloTramite = (tramite: TramiteInspeccion): string =>
  [tramite.codigoTramite, tramite.materia ?? tramite.tipoTramite, tramite.zonal]
    .filter((parte): parte is string => !!parte)
    .join(" · ");

const ComboTramiteInspeccion: FC<ComboTramiteInspeccionProps> = ({
  nombrePersona,
  valor,
  tramites,
  cargando,
  disponible,
  motivo,
  deshabilitado,
  avisoLote = false,
  onCambiar,
}) => {
  const idAyuda = useId();
  const conservado =
    valor !== null &&
    !tramites.some((tramite) => tramite.codigoTramite === valor);

  // Solo se afirma que «ya no figura» cuando Inspección SÍ respondió: si no, no se sabe.
  const yaNoFigura = conservado && !cargando && disponible;

  let ayuda: string | null = null;
  if (cargando) ayuda = "Consultando trámites de Inspección…";
  else if (!disponible)
    ayuda = `Inspección no disponible: ${motivo ?? "sin respuesta."}`;
  else if (yaNoFigura)
    ayuda = `El trámite ${valor} ya no figura en Inspección para esta fecha: elija otro o «Sin trámite de Inspección».`;
  else if (tramites.length === 0)
    ayuda = "Sin trámites asignados en Inspección para esta fecha.";
  const avisos = [
    ayuda,
    avisoLote
      ? "Se aplica a todas las copias de esta persona en este registro."
      : null,
  ].filter((texto): texto is string => texto !== null);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <select
        aria-label={`Trámite de Inspección de ${nombrePersona}`}
        aria-describedby={avisos.length > 0 ? idAyuda : undefined}
        className="select select-bordered select-sm w-full"
        value={valor ?? ""}
        disabled={deshabilitado}
        onChange={(evento) => onCambiar(evento.target.value || null)}
      >
        <option value="">Sin trámite de Inspección</option>
        {conservado && (
          <option value={valor}>
            {yaNoFigura ? `${valor} (ya no figura en Inspección)` : valor}
          </option>
        )}
        {tramites.map((tramite) => (
          <option
            key={tramite.codigoTramite}
            value={tramite.codigoTramite}
          >
            {rotuloTramite(tramite)}
          </option>
        ))}
      </select>
      {avisos.length > 0 && (
        <span
          id={idAyuda}
          className="text-xs text-app-muted"
        >
          {avisos.join(" ")}
        </span>
      )}
    </div>
  );
};

export default ComboTramiteInspeccion;
