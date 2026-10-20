/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: SelectorTipoControl.tsx
 * Responsabilidad: El campo «Tipo de control» del operativo, con su adicional (RN-20).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-09
 *
 * SE EXTRAJO DE `SelectorZonalPunto` para poder COLOCARLO POR SEPARADO en la rejilla. El
 * rediseño del 2026-09-09 pide Tipo de control junto a Instituciones (no junto a Zonal y
 * Punto), y la cascada zonal→punto no tiene nada que ver con el tipo. `SelectorZonalPunto`
 * lo sigue pintando por omisión (`renderTipo`), así que sus pruebas no cambian; P-01 lo
 * apaga allí y lo pinta aquí donde toca.
 *
 * NO CONOCE FORMIK: recibe valores y devuelve cambios, igual que `SelectorZonalPunto`. Los
 * mensajes de error llegan ya resueltos (cuándo mostrarlos lo decide el formulario).
 */

import type { FC } from "react";

import type { TipoControl } from "../../interfaces/Formulario.ts";
import { OPCION_ADICIONALES } from "../../utils/valoresOperativo.util.ts";
import SelectorTokens from "../forms/SelectorTokens.tsx";
import { PieDeError } from "./PieDeError.tsx";

// Fuera del componente: `SelectorTokens` memoiza su filtro con esta función como dependencia,
// así que su identidad debe ser estable (regla 2 de CLAUDE.md).
const nombreDeTipo = (tipo: TipoControl): string => tipo.nombre;

type SelectorTipoControlProps = {
  tiposControl: TipoControl[];
  tipoSeleccionado: string;
  onTipoChange: (valor: string) => void;
  /** Selección múltiple de tipos, donde el formulario lo admite (los nueve desde 2026-09-14). */
  tipoMultiple: boolean;
  tiposSeleccionadosIds: number[];
  onTiposChange: (ids: number[]) => void;
  tipoLibre: string;
  onTipoLibreChange: (texto: string) => void;
  capturaLibreTipo: boolean;
  deshabilitado: boolean;
  errorTipoControl?: string;
  errorTipoLibre?: string;
  /** Variante en el cajón de edición (2026-09-30): desplegable flotante y opción «Otro…». */
  enCajon?: boolean;
  /**
   * Solo el desplegable flotante de los chips, sin la opción «Otro…» ni el resto de la
   * variante de cajón. Lo usa la ventana principal de registro (P-01) para heredar el
   * estilo flotante del cajón sin su reflujo a una columna. 2026-10-01.
   */
  tiposFlotante?: boolean;
};

const SelectorTipoControl: FC<SelectorTipoControlProps> = ({
  tiposControl,
  tipoSeleccionado,
  onTipoChange,
  tipoMultiple,
  tiposSeleccionadosIds,
  onTiposChange,
  tipoLibre,
  onTipoLibreChange,
  capturaLibreTipo,
  deshabilitado,
  errorTipoControl,
  errorTipoLibre,
  enCajon = false,
  tiposFlotante = false,
}) => (
  <div className="form-control w-full">
    {tipoMultiple ? (
      <>
        {/*
          MULTIPLE: varios tipos a la vez con `SelectorTokens`, como instituciones. Lo activa
          el flag `tipoControlMultiple` del formulario —verdadero en los nueve desde el
          2026-09-14—. El adicional (RN-20) convive con ellos donde el formulario admite
          captura libre (`capturaLibreTipo`, hoy 2 y 8): es opcional y se agrega desde el mismo
          desplegable, como ficha «OTRO ·».
        */}
        <SelectorTokens
          id="tiposControl"
          etiqueta="Tipo de control"
          obligatorio
          opciones={tiposControl}
          seleccionadas={tiposSeleccionadosIds}
          onCambio={onTiposChange}
          etiquetaCorta={nombreDeTipo}
          etiquetaLarga={nombreDeTipo}
          marcador="Escriba para buscar un tipo de control…"
          flotante={tiposFlotante || enCajon}
          cajaUnica={enCajon}
          /*
            EL «OTRO» LIBRE SE INTEGRA EN EL COMBOBOX, en el cajón (2026-10-01) y desde el 2026-10-16
            también en el alta de P-01: si lo tecleado no coincide con un tipo del catálogo, el
            desplegable ofrece «+ Agregar … como otro tipo», y el libre se pinta como ficha naranja
            «OTRO ·». Es UNO solo —el servidor guarda un texto (`oper_tipo_libre`)—: con uno ya
            puesto, la opción dice «Reemplazar otro tipo por …». El campo aparte se retiró.
          */
          valorLibre={capturaLibreTipo ? tipoLibre : undefined}
          onValorLibre={capturaLibreTipo ? onTipoLibreChange : undefined}
          deshabilitado={deshabilitado}
          error={errorTipoControl ?? null}
        />
        {/* Ayuda del «otro tipo» integrado. */}
        {capturaLibreTipo && (
          <p className="mt-1 text-xs text-app-muted">
            Si no encuentra el tipo, escríbalo y elija «Agregar como otro tipo».
          </p>
        )}
      </>
    ) : (
      <>
        <label
          className="label"
          htmlFor="tipoControl"
        >
          <span className="label-text">
            Tipo de control<span className="text-error ml-1">*</span>
          </span>
        </label>
        <select
          id="tipoControl"
          className="select select-bordered w-full"
          value={tipoSeleccionado}
          disabled={deshabilitado}
          aria-required="true"
          aria-invalid={Boolean(errorTipoControl)}
          aria-describedby={errorTipoControl ? "tipoControl-error" : undefined}
          onChange={(e) => onTipoChange(e.target.value)}
        >
          <option value="">Seleccionar…</option>
          {tiposControl.map((tipo) => (
            <option
              key={tipo.id}
              value={String(tipo.id)}
            >
              {tipo.nombre}
            </option>
          ))}
          {capturaLibreTipo && (
            <option value={OPCION_ADICIONALES}>
              {enCajon ? "Otro…" : "ADICIONALES…"}
            </option>
          )}
        </select>

        <PieDeError
          id="tipoControl-error"
          mensaje={errorTipoControl}
        />

        {tipoSeleccionado === OPCION_ADICIONALES && (
          <>
            <input
              id="tipoLibre"
              type="text"
              className="input input-bordered mt-2 w-full"
              placeholder="Escriba el tipo de control"
              aria-label="Tipo de control adicional"
              maxLength={220}
              value={tipoLibre}
              disabled={deshabilitado}
              aria-required="true"
              aria-invalid={Boolean(errorTipoLibre)}
              aria-describedby={errorTipoLibre ? "tipoLibre-error" : undefined}
              onChange={(e) => onTipoLibreChange(e.target.value)}
            />
            <PieDeError
              id="tipoLibre-error"
              mensaje={errorTipoLibre}
            />
          </>
        )}
      </>
    )}
  </div>
);

export default SelectorTipoControl;
