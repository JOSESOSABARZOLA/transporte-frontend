/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: ModalVentana.tsx
 * Responsabilidad: Corregir la ventana de carga de un rol.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE EDITA AQUÍ DECIDE A QUÉ HORA DEJA DE TRABAJAR UN DEPARTAMENTO ENTERO.
 *
 * Por eso el modal muestra, junto a los campos, **lo que el funcionario leerá** cuando su
 * ventana esté cerrada: `mensajeCierre` no es un texto técnico, es lo que aparece en P-01
 * a las 15H01 y lo único que le dice a alguien cuándo puede volver a intentarlo. El
 * servidor exige diez caracteres como mínimo por ese motivo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA HORA VACÍA SE ENVÍA COMO `null`, NO SE OMITE. En este contrato son cosas distintas:
 * lo que no viene no se toca, y lo que viene nulo se limpia. Omitir el campo al borrarlo
 * dejaría la hora anterior intacta y el administrador creería haberla quitado.
 */

import { useState, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";

import type {
  ActualizarVentana,
  TipoVentana,
  VentanaCarga,
} from "../../interfaces/Administracion.ts";
import {
    NOMBRE_TIPO_VENTANA,
} from "../../utils/parametro.util.ts";
import { useCatalogoRoles } from "../../hooks/useCatalogoRoles.ts";

const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

const TIPOS = Object.keys(NOMBRE_TIPO_VENTANA) as TipoVentana[];

/**
 * Quien lo monta le pasa `key={ventana.rol}`: cambiar de ventana lo vuelve a montar y
 * estos estados parten de la nueva. Sin eso, abrir la ventana de la DAF después de la del
 * DMIP mostraría los valores del anterior sobre el rótulo del siguiente.
 */
type ModalVentanaProps = {
  ventana: VentanaCarga | null;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual. */
  aviso: string | null;
  onGuardar: (cambios: ActualizarVentana) => void;
  onCancelar: () => void;
};

const ModalVentana: FC<ModalVentanaProps> = ({
  ventana,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}) => {
  const { nombreDe } = useCatalogoRoles();

  const [tipo, setTipo] = useState<TipoVentana>(ventana?.tipo ?? "DIARIO");
  const [horaApertura, setHoraApertura] = useState(ventana?.horaApertura ?? "");
  const [horaCierre, setHoraCierre] = useState(ventana?.horaCierre ?? "");
  const [mensajeCierre, setMensajeCierre] = useState(
    ventana?.mensajeCierre ?? "",
  );
  const [activo, setActivo] = useState(ventana?.activo ?? true);

  if (!ventana) return null;

  const horaInvalida = (hora: string) =>
    hora !== "" && !PATRON_HORA.test(hora);

  const motivo = horaInvalida(horaApertura)
    ? "La hora de apertura se escribe en formato HH:MM, por ejemplo 15:00."
    : horaInvalida(horaCierre)
      ? "La hora de cierre se escribe en formato HH:MM, por ejemplo 16:30."
      : mensajeCierre.trim().length > 0 && mensajeCierre.trim().length < 10
        ? "El mensaje de cierre debe explicarle al funcionario cuándo vuelve a abrirse."
        : null;

  return (
    <MarcoModal
      abierto
      etiqueta={`Ventana de ${nombreDe(ventana.rol)}`}
      ancho="lg"
      onCerrar={guardando ? undefined : onCancelar}
    >
        <h3 className="mb-1 text-lg font-semibold">
          Ventana de {nombreDe(ventana.rol)}
        </h3>
        <p className="mb-4 text-xs text-base-content/70">
          Se evalúa en {ventana.zonaHoraria}. Dejar una hora vacía significa
          «sin restricción», no falta de dato.
        </p>

        {aviso && (
          <div
            className="alert alert-error mb-4"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="tipoVentana"
            >
              <span className="label-text font-medium">Tipo</span>
            </label>
            <select
              id="tipoVentana"
              className="select select-bordered select-sm"
              value={tipo}
              disabled={guardando}
              onChange={(evento) => setTipo(evento.target.value as TipoVentana)}
            >
              {TIPOS.map((valor) => (
                <option
                  key={valor}
                  value={valor}
                >
                  {NOMBRE_TIPO_VENTANA[valor]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="form-control w-full">
              <label
                className="label"
                htmlFor="horaApertura"
              >
                <span className="label-text font-medium">Hora de apertura</span>
              </label>
              <input
                id="horaApertura"
                type="text"
                inputMode="numeric"
                placeholder="Vacío: sin restricción"
                className={`input input-bordered input-sm ${
                  horaInvalida(horaApertura) ? "input-error" : ""
                }`}
                value={horaApertura}
                disabled={guardando}
                onChange={(evento) => setHoraApertura(evento.target.value)}
              />
            </div>

            <div className="form-control w-full">
              <label
                className="label"
                htmlFor="horaCierre"
              >
                <span className="label-text font-medium">Hora de cierre</span>
              </label>
              <input
                id="horaCierre"
                type="text"
                inputMode="numeric"
                placeholder="Vacío: sin restricción"
                className={`input input-bordered input-sm ${
                  horaInvalida(horaCierre) ? "input-error" : ""
                }`}
                value={horaCierre}
                disabled={guardando}
                onChange={(evento) => setHoraCierre(evento.target.value)}
              />
            </div>
          </div>

          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="mensajeCierre"
            >
              <span className="label-text font-medium">
                Mensaje que verá el funcionario
              </span>
            </label>
            <textarea
              id="mensajeCierre"
              className="textarea textarea-bordered textarea-sm"
              rows={3}
              value={mensajeCierre}
              disabled={guardando}
              onChange={(evento) => setMensajeCierre(evento.target.value)}
            />
            <span className="mt-1 text-xs text-base-content/70">
              Es lo que aparece en su pantalla cuando la ventana está cerrada.
              Debe decirle cuándo vuelve a abrirse.
            </span>
          </div>

          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={activo}
              disabled={guardando}
              onChange={(evento) => setActivo(evento.target.checked)}
            />
            <span className="label-text">
              Ventana vigente. Desactivarla deja al rol{" "}
              <strong>sin restricción horaria</strong>.
            </span>
          </label>

          {motivo && (
            <span
              className="text-xs text-error"
              role="alert"
            >
              {motivo}
            </span>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={guardando || motivo !== null}
            onClick={() =>
              onGuardar({
                tipo,
                // Vacío se envía como `null`: es «quitar la restricción», no «no tocar».
                horaApertura: horaApertura.trim() || null,
                horaCierre: horaCierre.trim() || null,
                mensajeCierre: mensajeCierre.trim() || undefined,
                activo,
              })
            }
          >
            {guardando ? (
              <>
                <span
                  className="loading loading-spinner loading-sm"
                  aria-hidden="true"
                />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </button>
        </div>
    </MarcoModal>
  );
};

export default ModalVentana;
