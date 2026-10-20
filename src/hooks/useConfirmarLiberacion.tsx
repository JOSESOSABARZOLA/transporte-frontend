/**
 * App: Cuadro de Colores
 * Módulo: Cuadro
 * Feature: Transporte requerido
 * Archivo: useConfirmarLiberacion.tsx
 * Responsabilidad: Pedir confirmación antes de liberar el transporte de un operativo al cambiar su
 *                  tipo, su horario o su zonal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PANTALLA NO SABE SI HAY TRANSPORTE ASIGNADO: SE LO PREGUNTA AL SERVIDOR (2026-10-07).
 *
 * Con la planificación por tramos, un operativo puede tener conductor en un tramo aunque su estado
 * siga «pendiente», y eso solo lo sabe el servidor. Por eso no se adivina: se guarda normal y, si
 * responde 409 con `CAMBIO_TIPO_CON_TRANSPORTE`, se muestra SU mensaje (regla 7) en una confirmación;
 * con «Sí» se reenvía lo mismo con `confirmarLiberacion: true` y el servidor libera la asignación y
 * deja el aviso «Transporte liberado» a la DAF. Con «No», no se guarda nada y la captura sigue.
 *
 * DESDE EL 2026-10-14 TAMBIÉN EL HORARIO Y LA ZONAL. La ocupación del conductor sale de los tramos, y
 * los tramos se cortan con el horario y la zonal del operativo: si cambian, dejan de corresponder.
 * El servidor responde entonces `CAMBIO_CON_TRANSPORTE` (también al editar el turno de una persona,
 * si eso mueve la ventana del operativo). Los dos códigos se tratan igual.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef, useState, type ReactNode } from "react";

import MensajeModal from "../components/common/MensajeModal.tsx";
import { presentarError } from "../utils/errorApi.util.ts";

export const CODIGO_CAMBIO_TIPO_CON_TRANSPORTE = "CAMBIO_TIPO_CON_TRANSPORTE";
export const CODIGO_CAMBIO_CON_TRANSPORTE = "CAMBIO_CON_TRANSPORTE";

/** Los 409 que piden confirmar la liberación del transporte antes de guardar. */
const CODIGOS_LIBERACION: readonly string[] = [
  CODIGO_CAMBIO_TIPO_CON_TRANSPORTE,
  CODIGO_CAMBIO_CON_TRANSPORTE,
];

export interface ConfirmarLiberacion {
  /**
   * Ejecuta el guardado; si el servidor pide confirmar la liberación, pregunta y lo reintenta.
   * Devuelve `null` si quien edita decidió NO hacer el cambio (no se guardó nada).
   */
  ejecutar: <T>(guardar: (confirmarLiberacion: boolean) => Promise<T>) => Promise<T | null>;
  modal: ReactNode;
}

export const useConfirmarLiberacion = (): ConfirmarLiberacion => {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const resolver = useRef<((si: boolean) => void) | null>(null);

  const preguntar = (texto: string) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setMensaje(texto);
    });

  const responder = (si: boolean) => {
    resolver.current?.(si);
    resolver.current = null;
    setMensaje(null);
  };

  const ejecutar = useCallback(
    async <T,>(guardar: (confirmarLiberacion: boolean) => Promise<T>): Promise<T | null> => {
      try {
        return await guardar(false);
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        if (!CODIGOS_LIBERACION.includes(error.codigo)) throw fallo;
        const si = await preguntar(error.mensaje);
        if (!si) return null;
        return guardar(true);
      }
    },
    [],
  );

  return {
    ejecutar,
    modal: (
      <MensajeModal
        abierto={mensaje !== null}
        variante="peligro"
        titulo="¿Liberar el transporte asignado?"
        mensaje={mensaje ?? ""}
        textoPrincipal="Sí, cambiar y liberar"
        textoSecundario="No cambiar"
        onPrincipal={() => responder(true)}
        onSecundario={() => responder(false)}
      />
    ),
  };
};
