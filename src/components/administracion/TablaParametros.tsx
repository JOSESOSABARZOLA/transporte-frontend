/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: TablaParametros.tsx
 * Responsabilidad: Mostrar los siete umbrales con su rango, y dejar corregirlos en línea.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTE COMPONENTE NO CONOCE NINGÚN PARÁMETRO EN CONCRETO.
 *
 * No hay un caso para `JORNADA_MAXIMA_HORAS` y otro para `HORA_LIMITE_CUADRO`: la
 * clave, la descripción, la unidad y los extremos del rango **llegan en la respuesta**, y
 * la fila se dibuja con ellos. El día que se agregue un octavo parámetro aparecerá aquí
 * solo, con su rango y su explicación, sin tocar esta pantalla.
 *
 * Es lo que convierte a P-09 en una pantalla de configuración y no en siete formularios
 * disfrazados de tabla.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL RANGO SE MUESTRA SIEMPRE, NO SOLO AL EQUIVOCARSE (caso 4). Quien va a cambiar un
 * umbral necesita saber qué puede poner **antes** de intentarlo. Un rango que solo
 * aparece en el mensaje de error obliga a fallar para aprenderlo.
 */

import { useState, type FC } from "react";

import type { ParametroPolitica } from "../../interfaces/Administracion.ts";
import {
  descripcionDeRango,
  motivoDeRechazo,
} from "../../utils/parametro.util.ts";

type TablaParametrosProps = {
  parametros: ParametroPolitica[];
  cargando: boolean;
  /** Clave que se está guardando ahora mismo, o `null`. */
  guardando: string | null;
  /** Rechazos del servidor, por clave. Se muestran tal cual. */
  avisos: Record<string, string>;
  onGuardar: (clave: string, valor: string) => void;
};

const TablaParametros: FC<TablaParametrosProps> = ({
  parametros,
  cargando,
  guardando,
  avisos,
  onGuardar,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          <th scope="col">Parámetro</th>
          <th scope="col">Valor</th>
          <th scope="col">Rango admisible</th>
          <th scope="col">Última modificación</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {parametros.length === 0 ? (
          <tr>
            <td
              colSpan={5}
              className="px-3 py-6 text-center text-sm text-base-content/70"
            >
              {cargando
                ? "Cargando los parámetros…"
                : "No hay parámetros de política registrados."}
            </td>
          </tr>
        ) : (
          parametros.map((parametro) => (
            <FilaParametro
              key={parametro.clave}
              parametro={parametro}
              guardando={guardando === parametro.clave}
              aviso={avisos[parametro.clave] ?? null}
              onGuardar={onGuardar}
            />
          ))
        )}
      </tbody>
    </table>
  </div>
);

/**
 * Una fila con su propio valor en edición.
 *
 * El estado vive **en la fila** y no en la tabla: con un mapa de claves a valores en el
 * componente padre, escribir en un parámetro volvería a dibujar los siete, y el cursor de
 * los demás campos saltaría al final en cada tecla.
 */
const FilaParametro: FC<{
  parametro: ParametroPolitica;
  guardando: boolean;
  aviso: string | null;
  onGuardar: (clave: string, valor: string) => void;
}> = ({ parametro, guardando, aviso, onGuardar }) => {
  const [valor, setValor] = useState(parametro.valor);

  const motivo = motivoDeRechazo(parametro, valor);
  const cambiado = valor.trim() !== parametro.valor;

  return (
    <tr className="hover:bg-info/10">
      <td className="px-3 py-2 align-top">
        <span className="block font-mono text-xs font-semibold">
          {parametro.clave}
        </span>
        {/* La descripción la redacta el servidor y nombra la regla que gobierna. */}
        <span className="block max-w-md text-xs text-base-content/70">
          {parametro.descripcion}
        </span>
      </td>

      <td className="px-3 py-2 align-top">
        <label
          className="sr-only"
          htmlFor={`valor-${parametro.clave}`}
        >
          Valor de {parametro.clave}
        </label>
        <input
          id={`valor-${parametro.clave}`}
          type="text"
          className={`input input-bordered input-sm w-32 ${
            motivo && cambiado ? "input-error" : ""
          }`}
          value={valor}
          disabled={guardando}
          onChange={(evento) => setValor(evento.target.value)}
        />
        {parametro.unidad && (
          <span className="ml-2 text-xs text-base-content/70">{parametro.unidad}</span>
        )}

        {/* Caso 2: el rango se indica en el propio rechazo, antes de enviar nada. */}
        {motivo && cambiado && (
          <span className="mt-1 block text-xs text-error">{motivo}</span>
        )}
        {/* Y si el servidor rechaza igualmente, su mensaje se muestra tal cual. */}
        {aviso && (
          <span
            className="mt-1 block text-xs text-error"
            role="alert"
          >
            {aviso}
          </span>
        )}
      </td>

      <td className="px-3 py-2 align-top text-sm">
        {descripcionDeRango(parametro)}
      </td>

      {/*
        Caso 5. La traza completa vive en la auditoría del servidor; aquí se muestra la
        última, que es lo que responde a «¿quién cambió esto?» sin abrir la base.
      */}
      <td className="px-3 py-2 align-top text-xs text-base-content/70">
        {parametro.modificadoPor === null ? (
          "Valor de siembra"
        ) : (
          <>
            <span className="block">
              Usuario {parametro.modificadoPor}
            </span>
            <span className="block">{parametro.modificadoEn.slice(0, 10)}</span>
          </>
        )}
      </td>

      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => onGuardar(parametro.clave, valor.trim())}
            disabled={guardando || !cambiado || motivo !== null}
            title={motivo ?? undefined}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setValor(parametro.valor)}
            disabled={guardando || !cambiado}
          >
            Descartar
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TablaParametros;
