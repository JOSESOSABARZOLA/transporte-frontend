/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: FilaParametro.tsx
 * Responsabilidad: Una fila de parámetro: qué es, su control según el tipo, su rango y estado, y
 *                  quién lo cambió por última vez.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * SIN «GUARDAR» PROPIO (rediseño 2026-10-24, prototipo CARGA3): lo escrito va al borrador de la
 * página y se guarda con la barra «Guardar cambios», todo junto. «↺ Restaurar a …» pone el valor de
 * siembra en el borrador; tampoco guarda solo.
 *
 * El control sigue al tipo: hora (`type="time"`), lista (`select` con las `opciones` del
 * servidor), número con su unidad o texto libre. El motivo de un valor no admisible sale de
 * `motivoDeRechazo`, que aplica el rango que el propio servidor declaró.
 */

import type { FC } from "react";

import Boton from "../common/Boton.tsx";
import Insignia from "../common/Insignia.tsx";
import Tooltip from "../common/Tooltip.tsx";
import CampoHora24 from "./CampoHora24.tsx";

import type { ParametroPolitica } from "../../interfaces/Administracion.ts";
import {
  entradaDe,
  estaModificado,
  sinConfigurar,
  textoUltimaModificacion,
} from "../../utils/catalogoParametros.util.ts";
import {
  descripcionDeRango,
  esClaveDeHora,
  motivoDeRechazo,
} from "../../utils/parametro.util.ts";

type FilaParametroProps = {
  parametro: ParametroPolitica;
  /** El valor que se ve: el del borrador o el guardado. */
  valor: string;
  onCambiar: (valor: string) => void;
  /** El rechazo del servidor para esta clave en el último guardado. */
  errorServidor?: string;
  deshabilitado: boolean;
  /** Recién guardada: verde unos segundos. */
  resaltada: boolean;
};

const CLASE_CONTROL = "input input-bordered input-sm w-full";

const FilaParametro: FC<FilaParametroProps> = ({
  parametro,
  valor,
  onCambiar,
  errorServidor,
  deshabilitado,
  resaltada,
}) => {
  const entrada = entradaDe(parametro.clave);
  const cambiado = valor !== parametro.valor;
  const motivo = cambiado ? motivoDeRechazo(parametro, valor) : null;
  const error = motivo ?? errorServidor ?? null;
  const id = `parametro-${parametro.clave}`;
  const idAyuda = `${id}-ayuda`;
  const modificado = estaModificado(parametro, valor);
  const restaurable =
    parametro.valorSiembra !== null && valor.trim() !== parametro.valorSiembra;
  const etiquetaOtros =
    entrada.grupo === "otros" && entrada.etiqueta === parametro.clave;

  const atributos = {
    id,
    "aria-label": entrada.etiqueta,
    "aria-describedby": idAyuda,
    "aria-invalid": Boolean(error),
    disabled: deshabilitado,
  };

  const control = parametro.opciones ? (
    <select
      {...atributos}
      className={`select select-bordered select-sm w-full ${error ? "select-error" : ""}`}
      value={valor}
      onChange={(evento) => onCambiar(evento.target.value)}
    >
      {/* Un valor guardado fuera de la lista se sigue viendo (y se rechaza al guardar). */}
      {!parametro.opciones.includes(valor) && (
        <option value={valor}>{valor}</option>
      )}
      {parametro.opciones.map((opcion) => (
        <option key={opcion} value={opcion}>
          {opcion}
        </option>
      ))}
    </select>
  ) : esClaveDeHora(parametro.clave) ? (
    // Hora en 24 h del sistema (2026-10-24), no el `type="time"` del navegador.
    <CampoHora24
      id={id}
      etiqueta={entrada.etiqueta}
      valor={valor}
      onCambiar={onCambiar}
      error={Boolean(error)}
      deshabilitado={deshabilitado}
      describedBy={idAyuda}
    />
  ) : (
    <input
      {...atributos}
      type="text"
      inputMode={
        parametro.tipo === "ENTERO"
          ? "numeric"
          : parametro.tipo === "DECIMAL"
            ? "decimal"
            : undefined
      }
      className={`${CLASE_CONTROL} ${error ? "input-error" : ""}`}
      value={valor}
      onChange={(evento) => onCambiar(evento.target.value)}
    />
  );

  return (
    <tr
      className={
        resaltada
          ? "bg-success/10"
          : cambiado
            ? "bg-warning/10"
            : "hover:bg-primary/5"
      }
      data-clave={parametro.clave}
    >
      <td className="px-3 py-3 align-top">
        <label htmlFor={id} className="block font-semibold text-app-strong">
          {etiquetaOtros ? parametro.descripcion : entrada.etiqueta}
        </label>
        <span className="block font-mono text-xs text-app-muted">
          {parametro.clave}
        </span>
        {!etiquetaOtros && (
          <span className="block text-xs text-app-muted">
            {parametro.descripcion}
          </span>
        )}
        {entrada.afecta.length > 0 && (
          <span className="block text-xs text-app-muted">
            Afecta: {entrada.afecta.join(", ")}
          </span>
        )}
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex items-center gap-2">
          {control}
          {parametro.unidad && (
            <span className="whitespace-nowrap text-xs text-app-muted">
              {parametro.unidad}
            </span>
          )}
        </div>
        {error ? (
          <span
            id={idAyuda}
            className="mt-1 block text-xs text-error"
            role="alert"
          >
            {error}
          </span>
        ) : (
          <span id={idAyuda} className="mt-1 block text-xs text-app-muted">
            {descripcionDeRango(parametro)}
          </span>
        )}
      </td>

      <td className="px-3 py-3 align-top">
        <div className="flex flex-wrap items-center gap-1">
          {cambiado && <Insignia variante="aviso">Sin guardar</Insignia>}
          {modificado && <Insignia variante="suave">Modificado</Insignia>}
          {sinConfigurar(valor) && (
            <Insignia variante="avisoSuave">Sin configurar</Insignia>
          )}
        </div>
        {restaurable && (
          <Tooltip texto={`Valor de siembra: ${parametro.valorSiembra}`}>
            <Boton
              variante="enlace"
              tamano="sm"
              deshabilitado={deshabilitado}
              aria-label={`Restaurar ${entrada.etiqueta} a su valor de siembra ${parametro.valorSiembra}`}
              onClick={() => onCambiar(parametro.valorSiembra as string)}
            >
              ↺ Restaurar a {parametro.valorSiembra}
            </Boton>
          </Tooltip>
        )}
      </td>

      <td className="px-3 py-3 align-top text-xs text-app-muted">
        {textoUltimaModificacion(parametro)}
      </td>
    </tr>
  );
};

export default FilaParametro;
