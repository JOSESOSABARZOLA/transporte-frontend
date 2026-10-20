/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: AvisoEnLinea.tsx
 * Responsabilidad: El aviso que vive DENTRO de la página, un formulario o un cajón —«Falta 02:42
 *                  para cerrar…», «Sin rol en Auth central…»—, con la misma paleta e icono que los
 *                  mensajes estándar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * NO ES UN MENSAJE (M9 del plan «mensajes-estandar»). Los avisos de contexto no bloquean ni se
 * cierran: se quedan donde se leen. Lo único que se unifica con `MensajeModal` es su lenguaje:
 * fondo suave de la familia, borde fino del mismo color e icono de línea (`IconoMensaje`). El texto
 * va en los roles de siempre (`text-app-strong`), nunca en el color de la familia. El de error se
 * anuncia con `role="alert"`; los demás, con `role="status"`, salvo que `rol` pida otra cosa (una
 * advertencia que debe interrumpir: «queda constancia en la auditoría», «no se pudo heredar»).
 */

import type { FC, ReactNode } from "react";

import IconoMensaje, { type FamiliaMensaje } from "./IconoMensaje.tsx";
import { CLASES_FAMILIA } from "./familiasMensaje.ts";

type AvisoEnLineaProps = {
  variante: FamiliaMensaje;
  /** Una primera línea en negrita, opcional. */
  titulo?: string;
  children?: ReactNode;
  /** Un botón o enlace a la derecha («Reintentar», «Ir a Turnos»). */
  accion?: ReactNode;
  /** Fuerza el rol accesible; por omisión, `alert` para el error y `status` para el resto. */
  rol?: "alert" | "status";
  /** Solo para el acomodo (`mt-2`), nunca para el aspecto. */
  className?: string;
};

const AvisoEnLinea: FC<AvisoEnLineaProps> = ({
  variante,
  titulo,
  children,
  accion,
  rol,
  className,
}) => {
  const clases = CLASES_FAMILIA[variante];

  return (
    <div
      role={rol ?? (variante === "error" ? "alert" : "status")}
      data-variante={variante}
      className={`flex items-start gap-3 rounded-lg border p-3 text-sm text-app-strong ${clases.fondo} ${clases.borde} ${className ?? ""}`}
    >
      <span className={`mt-0.5 shrink-0 ${clases.color}`}>
        <IconoMensaje familia={variante} tamano={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div>{children}</div>}
      </div>
      {accion && <div className="shrink-0 self-center">{accion}</div>}
    </div>
  );
};

export default AvisoEnLinea;
