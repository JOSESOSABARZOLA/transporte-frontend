/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: MensajeHost.tsx
 * Responsabilidad: Pintar lo que pide el servicio `utils/mensaje.ts`: el mensaje de arriba de la cola
 *                  en un `MensajeModal` y los avisos breves abajo a la derecha. Se monta UNA vez, en
 *                  `AppProviders`.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * AVISO BREVE (toast). Tarjeta blanca de 360 px, radio 12, sombra y borde izquierdo de 4 px del color
 * de su familia; icono en círculo de 28 px, título de 14 px, texto opcional de 13 px y ✕. Se va solo
 * a los 4 s y la cuenta se PAUSA mientras el ratón o el foco están encima (para leerlo o pulsar su
 * acción). Como mucho tres: el servicio saca al más viejo. Se anuncia con `role="status"` (el de error,
 * `role="alert"`) y lleva siempre su texto, no solo el color (regla 6).
 *
 * UN SOLO HOST. Dos hosts pintarían cada mensaje dos veces; montar un segundo avisa en desarrollo.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type FC } from "react";
import { createPortal } from "react-dom";

import Boton from "./Boton.tsx";
import IconoMensaje from "./IconoMensaje.tsx";
import MensajeModal from "./MensajeModal.tsx";
import { CLASES_FAMILIA } from "./familiasMensaje.ts";
import {
  completarMensaje,
  leerMensajes,
  quitarToast,
  suscribirMensajes,
  DURACION_TOAST_MS,
  type EntradaToast,
} from "../../utils/mensaje.ts";

/** Hosts montados: más de uno es un error de quien programa. */
let hostsMontados = 0;

const TarjetaToast: FC<{ entrada: EntradaToast }> = ({ entrada }) => {
  const [pausado, setPausado] = useState(false);
  /** Lo que le queda de tiempo; se descuenta al pausar. */
  const restante = useRef(DURACION_TOAST_MS);

  useEffect(() => {
    if (pausado) return undefined;
    const inicio = Date.now();
    const temporizador = window.setTimeout(() => quitarToast(entrada.id), restante.current);
    return () => {
      window.clearTimeout(temporizador);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio));
    };
  }, [pausado, entrada.id]);

  const clases = CLASES_FAMILIA[entrada.familia];

  return (
    <div
      role={entrada.familia === "error" ? "alert" : "status"}
      data-familia={entrada.familia}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setPausado(false);
      }}
      className={`app-toast pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-l-4 border-base-300 bg-base-100 p-3 ${clases.bordeIzquierdo}`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${clases.fondo} ${clases.color}`}
      >
        <IconoMensaje familia={entrada.familia} tamano={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-app-strong">{entrada.titulo}</p>
        {entrada.texto && <p className="text-[0.8125rem] text-app-muted">{entrada.texto}</p>}
        {(entrada.accion || entrada.ver) && (
          <div className="mt-1 flex gap-3">
            {entrada.ver && (
              <Boton variante="enlace" tamano="sm" onClick={entrada.ver}>
                Ver
              </Boton>
            )}
            {entrada.accion && (
              <Boton
                variante="enlace"
                tamano="sm"
                onClick={() => {
                  entrada.accion?.onClick();
                  quitarToast(entrada.id);
                }}
              >
                {entrada.accion.texto}
              </Boton>
            )}
          </div>
        )}
      </div>
      <Boton
        variante="fantasma"
        tamano="sm"
        icono="cerrar"
        aria-label="Cerrar aviso"
        onClick={() => quitarToast(entrada.id)}
      />
    </div>
  );
};

const MensajeHost: FC = () => {
  const { cola, toasts } = useSyncExternalStore(suscribirMensajes, leerMensajes, leerMensajes);

  useEffect(() => {
    hostsMontados += 1;
    if (import.meta.env.DEV && hostsMontados > 1) {
      console.warn(
        "MensajeHost: hay más de un host montado. Debe haber uno solo, en AppProviders.",
      );
    }
    return () => {
      hostsMontados -= 1;
    };
  }, []);

  const actual = cola[0];

  return (
    <>
      {actual && (
        <MensajeModal
          key={actual.id}
          {...actual.opciones}
          onSecundario={() => completarMensaje(actual.id, false)}
          onExito={() => completarMensaje(actual.id, true)}
        />
      )}
      {toasts.length > 0 &&
        createPortal(
          <div
            role="region"
            aria-label="Avisos"
            className="pointer-events-none fixed bottom-4 right-4 z-[10001] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2"
          >
            {toasts.map((entrada) => (
              <TarjetaToast key={entrada.id} entrada={entrada} />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default MensajeHost;
