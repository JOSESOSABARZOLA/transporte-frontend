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
 * detalle libre OBLIGATORIO.
 *
 * El texto recuerda que la baja es LÓGICA —la ficha no se borra, su histórico sobrevive—. Los
 * errores van por campo y en palabras (regla 6), y solo tras el primer intento; nada depende solo
 * del color.
 *
 * MENSAJES ESTÁNDAR (2026-10-16). Es un `MensajeModal` de PELIGRO con el motivo en su espacio
 * corto (`children`): es el único mensaje con campos, porque el motivo es parte de la decisión.
 * `validar` detiene el envío sin cerrar mientras falte el motivo; si el servidor rechaza la baja,
 * el MISMO modal pasa a error con su mensaje.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import MensajeModal from "../common/MensajeModal.tsx";
import type {
  BajaFuncionario,
  Funcionario,
  MotivoBaja,
} from "../../interfaces/Personal.ts";
import { NOMBRE_MOTIVO_BAJA, nombreCompleto } from "../../utils/personal.util.ts";

type ModalBajaConMotivoProps = {
  abierto: boolean;
  funcionario: Funcionario | null;
  /** Da de baja. Si el servidor la rechaza, lanza: el error se muestra en el mismo modal. */
  onConfirmar: (baja: BajaFuncionario) => Promise<void>;
  onCancelar: () => void;
};

const MOTIVOS = Object.keys(NOMBRE_MOTIVO_BAJA) as MotivoBaja[];

const ModalBajaConMotivo: FC<ModalBajaConMotivoProps> = ({
  abierto,
  funcionario,
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

  const validar = () => {
    setIntento(true);
    return !faltaMotivo && !faltaDetalle;
  };

  return (
    <MensajeModal
      variante="peligro"
      titulo={`¿Desactivar a ${nombreCompleto(funcionario)}?`}
      mensaje="Dejará de aparecer para asignar a operativos. Su historial se conserva y puede activarse después."
      textoPrincipal="Desactivar"
      tituloError="No se pudo desactivar"
      validar={validar}
      onPrincipal={() =>
        onConfirmar({
          motivo: motivo as MotivoBaja,
          detalle: motivo === "OTRO" ? detalle.trim() : undefined,
        })
      }
      onSecundario={onCancelar}
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="label-text">
            Motivo de la baja<span className="text-error ml-1">*</span>
          </span>
          <select
            className="select select-bordered select-sm w-full"
            aria-label="Motivo de la baja"
            aria-invalid={Boolean(errorMotivo) || undefined}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value as MotivoBaja | "")}
          >
            <option value="">Seleccione un motivo…</option>
            {MOTIVOS.map((codigo) => (
              <option key={codigo} value={codigo}>
                {NOMBRE_MOTIVO_BAJA[codigo]}
              </option>
            ))}
          </select>
          {errorMotivo && (
            <span className="text-xs text-error" role="alert">
              {errorMotivo}
            </span>
          )}
        </label>

        {/* El detalle solo aparece —y solo es obligatorio— con «Otro». */}
        {motivo === "OTRO" && (
          <label className="flex flex-col gap-1">
            <span className="label-text">
              Detalle<span className="text-error ml-1">*</span>
            </span>
            <textarea
              className="textarea textarea-bordered w-full"
              aria-label="Detalle del motivo de la baja"
              aria-invalid={Boolean(errorDetalle) || undefined}
              rows={2}
              value={detalle}
              onChange={(evento) => setDetalle(evento.target.value)}
            />
            {errorDetalle && (
              <span className="text-xs text-error" role="alert">
                {errorDetalle}
              </span>
            )}
          </label>
        )}
      </div>
    </MensajeModal>
  );
};

export default ModalBajaConMotivo;
