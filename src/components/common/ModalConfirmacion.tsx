/**
 * Módulo: Común
 * Feature: Confirmaciones
 * Archivo: ModalConfirmacion.tsx
 * Responsabilidad: Pop-up de confirmación reutilizable (Sí/No) para acciones sensibles. Se muestra
 *                  centrado; "Sí" ejecuta onConfirmar y "No" ejecuta onCancelar (por defecto, cerrar
 *                  sin hacer nada). Uso estándar del proyecto para pedir confirmación antes de un flujo.
 * Desarrollador: Doris Villavicencio
 * Fecha: 2026-07-20
 */

import MarcoModal from "./MarcoModal.tsx";

interface ModalConfirmacionProps {
  abierto: boolean;
  mensaje: string;
  titulo?: string;
  textoSi?: string;
  textoNo?: string;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const ModalConfirmacion = ({
  abierto,
  mensaje,
  titulo = "¿Estás seguro?",
  textoSi = "Sí, enviar",
  textoNo = "No",
  procesando = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) => {
  if (!abierto) return null;

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta={titulo}
      ancho="sm"
      deAviso
      onCerrar={procesando ? undefined : onCancelar}
    >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 stroke-current text-warning" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A1.5 1.5 0 003.11 21h17.78a1.5 1.5 0 001.3-2.44l-8.48-14.7a1.5 1.5 0 00-2.6 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-base-content">{titulo}</h3>
        <p className="mt-1 text-sm text-base-content/70">{mensaje}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-outline flex-1" onClick={onCancelar} disabled={procesando}>
            {textoNo}
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={onConfirmar} disabled={procesando} autoFocus>
            {procesando ? "Procesando…" : textoSi}
          </button>
        </div>
    </MarcoModal>
  );
};

export default ModalConfirmacion;
