/**
 * Módulo: Común
 * Feature: Confirmaciones
 * Archivo: ModalExito.tsx
 * Responsabilidad: Pop-up de éxito reutilizable para confirmar acciones (enviado, aprobado,
 *                  guardado, etc.). Se muestra centrado; al aceptar ejecuta el onClose. Uso
 *                  estándar del proyecto para el feedback de acciones confirmadas.
 * Desarrollador: Doris Villavicencio
 * Fecha: 2026-07-15
 */

import MarcoModal from "./MarcoModal.tsx";

interface ModalExitoProps {
  abierto: boolean;
  mensaje: string;
  titulo?: string;
  textoBoton?: string;
  onClose: () => void;
}

const ModalExito = ({ abierto, mensaje, titulo = "¡Listo!", textoBoton = "Aceptar", onClose }: ModalExitoProps) => {
  if (!abierto) return null;

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta={titulo}
      ancho="sm"
      deAviso
      onCerrar={onClose}
    >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 stroke-current text-success" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-base-content">{titulo}</h3>
        <p className="mt-1 text-sm text-base-content/70">{mensaje}</p>
        {/*
          SIN `text-white`, retirado el 2026-08-26. `--color-success` es `#6ed0bd` —un
          menta claro, e idéntico en los dos temas— y daisyUI ya resuelve el texto
          legible con `--color-success-content`. El `text-white` lo pisaba y dejaba
          **1,84:1**: blanco sobre menta, ilegible en tema claro y en oscuro.
        */}
        <button type="button" className="btn btn-success mt-6 w-full" onClick={onClose} autoFocus>
          {textoBoton}
        </button>
    </MarcoModal>
  );
};

export default ModalExito;
