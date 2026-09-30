/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: ModalBajaConMotivo.tsx
 * Responsabilidad: Confirmar la baja lógica de una ficha EXIGIENDO un motivo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA BAJA YA NO SE CONFIRMA A SECAS: pide un MOTIVO. Es un `select` de códigos fijos
 * (fin de contrato / renuncia / traslado / otro) y, SOLO cuando el motivo es «Otro», un
 * detalle libre OBLIGATORIO. Sustituye al `ModalConfirmacion` de la baja.
 *
 * El texto recuerda que la baja es LÓGICA —la ficha no se borra, su histórico sobrevive—, que es
 * lo que el `ModalConfirmacion` anterior advertía. Los errores van por campo y en palabras (regla
 * 6); nada depende solo del color.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";
import type {
  BajaFuncionario,
  Funcionario,
  MotivoBaja,
} from "../../interfaces/Personal.ts";
import { NOMBRE_MOTIVO_BAJA, nombreCompleto } from "../../utils/personal.util.ts";

type ModalBajaConMotivoProps = {
  abierto: boolean;
  funcionario: Funcionario | null;
  procesando: boolean;
  onConfirmar: (baja: BajaFuncionario) => void;
  onCancelar: () => void;
};

const MOTIVOS = Object.keys(NOMBRE_MOTIVO_BAJA) as MotivoBaja[];

const ModalBajaConMotivo: FC<ModalBajaConMotivoProps> = ({
  abierto,
  funcionario,
  procesando,
  onConfirmar,
  onCancelar,
}) => {
  // Arranca limpio en cada apertura: la página remonta el modal con `key` por ficha, así que el
  // estado inicial («sin motivo») basta y no hace falta un efecto que lo reponga.
  const [motivo, setMotivo] = useState<MotivoBaja | "">("");
  const [detalle, setDetalle] = useState("");
  const [intento, setIntento] = useState(false);

  if (!abierto || !funcionario) return null;

  const faltaMotivo = motivo === "";
  const faltaDetalle = motivo === "OTRO" && detalle.trim() === "";
  const errorMotivo = intento && faltaMotivo ? "Indique el motivo de la baja." : "";
  const errorDetalle =
    intento && faltaDetalle ? "Con motivo «Otro», escriba el detalle." : "";

  const confirmar = () => {
    setIntento(true);
    if (faltaMotivo || faltaDetalle) return;
    onConfirmar({
      motivo: motivo as MotivoBaja,
      detalle: motivo === "OTRO" ? detalle.trim() : undefined,
    });
  };

  const pie = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={onCancelar}
        disabled={procesando}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={confirmar}
        disabled={procesando}
      >
        {procesando ? (
          <>
            <span
              className="loading loading-spinner loading-sm"
              aria-hidden="true"
            />
            Dando de baja…
          </>
        ) : (
          "Dar de baja"
        )}
      </button>
    </div>
  );

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta="Dar de baja al funcionario"
      antetitulo="Personal y disponibilidad"
      titulo="Dar de baja"
      onCerrar={procesando ? undefined : onCancelar}
      pie={pie}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          <strong>{nombreCompleto(funcionario)}</strong> dejará de ofrecerse en
          los desplegables de personal. La ficha <strong>NO se borra</strong>: el
          histórico de los operativos en que participó depende de ella, y si
          reingresa se reactiva con su historial intacto.
        </p>

        <label className="flex flex-col gap-1">
          <span className="label-text font-medium">
            Motivo de la baja<span className="text-error ml-1">*</span>
          </span>
          <select
            className="select select-bordered select-sm"
            aria-label="Motivo de la baja"
            aria-invalid={Boolean(errorMotivo) || undefined}
            value={motivo}
            disabled={procesando}
            onChange={(evento) => setMotivo(evento.target.value as MotivoBaja | "")}
          >
            <option value="">Seleccione un motivo…</option>
            {MOTIVOS.map((codigo) => (
              <option
                key={codigo}
                value={codigo}
              >
                {NOMBRE_MOTIVO_BAJA[codigo]}
              </option>
            ))}
          </select>
          {errorMotivo && (
            <span
              className="text-xs text-error"
              role="alert"
            >
              {errorMotivo}
            </span>
          )}
        </label>

        {/* El detalle solo aparece —y solo es obligatorio— con «Otro». */}
        {motivo === "OTRO" && (
          <label className="flex flex-col gap-1">
            <span className="label-text font-medium">
              Detalle<span className="text-error ml-1">*</span>
            </span>
            <textarea
              className="textarea textarea-bordered"
              aria-label="Detalle del motivo de la baja"
              aria-invalid={Boolean(errorDetalle) || undefined}
              rows={2}
              value={detalle}
              disabled={procesando}
              onChange={(evento) => setDetalle(evento.target.value)}
            />
            {errorDetalle && (
              <span
                className="text-xs text-error"
                role="alert"
              >
                {errorDetalle}
              </span>
            )}
          </label>
        )}
      </div>
    </MarcoModal>
  );
};

export default ModalBajaConMotivo;
