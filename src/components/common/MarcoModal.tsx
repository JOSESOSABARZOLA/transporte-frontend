/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Ventanas modales
 * Archivo: MarcoModal.tsx
 * Responsabilidad: El velo, la tarjeta y el comportamiento que toda ventana modal debe tener.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-21
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NUEVE VENTANAS REPETÍAN EL MISMO VELO Y NINGUNA SE COMPORTABA COMO UNA VENTANA.
 *
 * La cadena `fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4`
 * estaba copiada **nueve veces, idéntica al byte**. Y las nueve se quedaban en el aspecto:
 * ninguna cerraba con Escape, ninguna retenía el foco dentro, ninguna lo devolvía al
 * cerrarse y ninguna impedía que la página de detrás siguiera desplazándose.
 *
 * Eso no es un detalle de acabado. Con el foco suelto, tabular desde el último campo del
 * formulario lleva a los botones de la pantalla que hay **debajo del velo** —invisibles,
 * pero enfocables y pulsables—, y quien navega con teclado o con lector de pantalla se
 * encuentra operando una tabla que no puede ver.
 *
 * Aquí vive una sola vez, y las nueve la componen.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL CLIC EN EL VELO NO CIERRA, Y ES UNA DECISIÓN.
 *
 * Es lo habitual en otros productos, y aquí se descarta: siete de las nueve ventanas son
 * formularios con datos ya capturados, y el proyecto protege lo capturado hasta en el
 * tratamiento de los errores 409 —«aviso destacado, sin perder lo capturado»—. Un clic
 * fuera es casi siempre accidental; Escape es deliberado y equivale a pulsar «Cancelar»,
 * que es un botón que ya está ahí. Se admite el segundo y no el primero.
 */

import { useEffect, useRef, type FC, type ReactNode } from "react";

/** Anchos en uso. No se admiten otros: son los tres tamaños del sistema. */
const ANCHOS = {
  sm: "max-w-sm",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
} as const;

/** Lo que el navegador considera enfocable dentro de la ventana. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type MarcoModalProps = {
  abierto: boolean;
  /**
   * Nombre accesible de la ventana. **Obligatorio.**
   *
   * Antes dos de las nueve no lo llevaban y un lector de pantalla las anunciaba como
   * «diálogo» a secas. Pedirlo aquí hace imposible olvidarlo.
   */
  etiqueta: string;
  /**
   * Qué hacer con Escape. Sin esta propiedad, Escape no cierra.
   *
   * Se omite a propósito mientras se guarda: interrumpir una escritura en curso deja al
   * usuario sin saber si se guardó.
   */
  onCerrar?: () => void;
  /** Ancho de la tarjeta. `lg` es el de un formulario corriente. */
  ancho?: keyof typeof ANCHOS;
  /** Centrado y sin desplazamiento: las ventanas de aviso, no las de captura. */
  deAviso?: boolean;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * CABECERA INSTITUCIONAL. Opcional, y añadida el 2026-08-24.
   *
   * Con `titulo`, la ventana se enmarca en el azul marino de la Alcaldía —`#20347d`, que
   * el manual *Nueva Imagen 2025* asigna a «fondos principales, encabezados»— y el
   * contenido pasa a una tarjeta blanca embutida. Es el mismo patrón que usa el módulo de
   * Instrucción, y por eso las dos aplicaciones se reconocen como una sola.
   *
   * **Sin `titulo` no cambia nada**: las ventanas que no la pasan siguen siendo la tarjeta
   * blanca de siempre. Se adopta ventana por ventana, no de golpe en las nueve.
   *
   * El `antetitulo` va en versalita y dice **el contexto**; el `titulo`, lo que se está
   * haciendo. No es adorno: en un flujo de dos pasos, el antetítulo es lo único que dice
   * en cuál de los dos está.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  titulo?: string;
  antetitulo?: string;
  children: ReactNode;
};

const MarcoModal: FC<MarcoModalProps> = ({
  abierto,
  etiqueta,
  onCerrar,
  ancho = "lg",
  deAviso = false,
  titulo,
  antetitulo,
  children,
}) => {
  const tarjeta = useRef<HTMLDivElement>(null);

  /** Quién tenía el foco antes de abrir, para devolvérselo al cerrar. */
  const enfocadoAntes = useRef<Element | null>(null);

  useEffect(() => {
    if (!abierto) return;

    enfocadoAntes.current = document.activeElement;

    // La página de detrás deja de desplazarse. Sin esto, la rueda del ratón mueve la
    // tabla que hay bajo el velo y la ventana parece flotar sobre algo que se escapa.
    const desplazamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // El foco entra en la ventana, salvo que algo dentro ya lo haya tomado por su cuenta
    // —los avisos enfocan su botón con `autoFocus`, y ése es mejor destino que la tarjeta—.
    const dentro = tarjeta.current?.contains(document.activeElement) ?? false;
    if (!dentro) tarjeta.current?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && onCerrar) {
        evento.stopPropagation();
        onCerrar();
        return;
      }

      if (evento.key !== "Tab" || !tarjeta.current) return;

      // La trampa de foco: el tabulador da la vuelta dentro de la ventana en lugar de
      // salirse a los controles que quedan bajo el velo.
      const enfocables =
        tarjeta.current.querySelectorAll<HTMLElement>(ENFOCABLES);
      if (enfocables.length === 0) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alPulsar);

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = desplazamiento;

      // El foco vuelve a donde estaba. Sin esto queda en el `<body>` y el siguiente
      // tabulador empieza desde el principio de la página.
      if (enfocadoAntes.current instanceof HTMLElement) {
        enfocadoAntes.current.focus();
      }
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  /** Con cabecera institucional, el marco es azul y el contenido va embutido en blanco. */
  const conCabecera = Boolean(titulo) && !deAviso;

  const tarjetaClases = deAviso
    ? `w-full ${ANCHOS[ancho]} rounded-md border border-base-300 bg-base-100 p-6 text-center shadow-2xl`
    : conCabecera
      ? `max-h-full w-full ${ANCHOS[ancho]} overflow-y-auto rounded-md bg-secondary p-2 shadow-2xl`
      : `max-h-full w-full ${ANCHOS[ancho]} overflow-y-auto rounded-md border border-base-300 bg-base-100 p-6 shadow-2xl`;

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={etiqueta}
    >
      <div
        ref={tarjeta}
        // `-1` la hace enfocable por código sin meterla en el recorrido del tabulador.
        tabIndex={-1}
        className={`${tarjetaClases} focus:outline-none`}
      >
        {conCabecera ? (
          <>
            <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-2 text-secondary-content">
              <div className="flex min-w-0 flex-col gap-0.5">
                {antetitulo && (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-content/70">
                    {antetitulo}
                  </p>
                )}
                <h3 className="text-lg font-bold">{titulo}</h3>
              </div>

              {/*
                El aspa hace lo mismo que Escape y que «Cancelar»: no es una tercera vía.
                Se pinta solo cuando hay `onCerrar`, así que mientras se guarda desaparece
                —igual que Escape deja de responder— y no interrumpe una escritura.
              */}
              {onCerrar && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-secondary-content"
                  onClick={onCerrar}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="rounded-md bg-base-100 p-6">{children}</div>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default MarcoModal;
