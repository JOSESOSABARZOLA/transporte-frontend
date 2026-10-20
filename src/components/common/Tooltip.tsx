/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Tooltip
 * Archivo: Tooltip.tsx
 * Responsabilidad: El único tooltip de la aplicación: un rótulo breve encima de un control.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO TOOLTIP (2026-10-19, plan «acciones-icono-notas»). Lo necesitan los botones que solo
 * llevan icono: sin texto visible, el `title` nativo tarda, no se ve con el teclado y no se cierra
 * con Escape. Este:
 *   · aparece ARRIBA del control a los 300 ms de pasar el ratón, y AL INSTANTE con el foco;
 *   · se cierra al salir, al perder el foco o con Escape;
 *   · si no cabe arriba, va abajo (flip); `alinear="fin"` lo pega al borde derecho del control
 *     (el último botón de una fila, para que no se salga de la tabla);
 *   · se dibuja en un portal con `position: fixed`, así ninguna celda con `overflow` lo corta.
 *
 * ACCESIBILIDAD. El texto vive SIEMPRE en un `<span>` oculto con su `id`, y el control lo nombra
 * con `aria-describedby`: el lector de pantalla lo oye abierto o cerrado. La burbuja visible es
 * `aria-hidden` para que no se anuncie dos veces.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

/** Retraso al pasar el ratón; con el teclado no se espera. */
export const RETRASO_TOOLTIP_MS = 300;

const SEPARACION = 8;
const MARGEN = 4;

type TooltipProps = {
  /** El texto; vacío o `null`, el control se pinta sin tooltip. */
  texto: string | null | undefined;
  /** Dónde se alinea respecto del control: al centro (por omisión), o pegado a su borde derecho. */
  alinear?: "centro" | "fin";
  /** UN elemento que reciba `aria-describedby` (un `<Boton>`, un `<button>`). */
  children: ReactElement<{ "aria-describedby"?: string }>;
};

type Posicion = { top: number; left: number; flecha: number; lado: "arriba" | "abajo" };

const Tooltip: FC<TooltipProps> = ({ texto, alinear = "centro", children }) => {
  const id = useId();
  const ancla = useRef<HTMLSpanElement>(null);
  const burbuja = useRef<HTMLSpanElement>(null);
  const reloj = useRef<number | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<Posicion | null>(null);

  const cancelar = useCallback(() => {
    if (reloj.current !== null) {
      window.clearTimeout(reloj.current);
      reloj.current = null;
    }
  }, []);

  const cerrar = useCallback(() => {
    cancelar();
    setAbierto(false);
    setPosicion(null);
  }, [cancelar]);

  const abrirConRetraso = () => {
    cancelar();
    reloj.current = window.setTimeout(() => setAbierto(true), RETRASO_TOOLTIP_MS);
  };

  useEffect(() => cancelar, [cancelar]);

  // Escape cierra, venga el foco de donde venga.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, cerrar]);

  // Se mide al abrir: arriba si cabe, si no abajo; dentro de la ventana en horizontal.
  useLayoutEffect(() => {
    if (!abierto || !ancla.current || !burbuja.current) return;
    const control = ancla.current.getBoundingClientRect();
    const caja = burbuja.current.getBoundingClientRect();
    const ancho = window.innerWidth;

    const arriba = control.top - caja.height - SEPARACION;
    const lado: Posicion["lado"] = arriba >= MARGEN ? "arriba" : "abajo";
    const top = lado === "arriba" ? arriba : control.bottom + SEPARACION;

    const deseado =
      alinear === "fin"
        ? control.right - caja.width
        : control.left + control.width / 2 - caja.width / 2;
    const left = Math.max(MARGEN, Math.min(deseado, ancho - caja.width - MARGEN));
    const centroControl = control.left + control.width / 2;
    const flecha = Math.max(8, Math.min(caja.width - 8, centroControl - left));

    setPosicion({ top, left, flecha, lado });
  }, [abierto, alinear, texto]);

  if (!texto || !isValidElement(children)) return children;

  const previo = children.props["aria-describedby"];
  const control = cloneElement(children, {
    "aria-describedby": previo ? `${previo} ${id}` : id,
  });

  return (
    <span
      ref={ancla}
      className="inline-flex"
      onMouseEnter={abrirConRetraso}
      onMouseLeave={cerrar}
      onFocus={() => {
        cancelar();
        setAbierto(true);
      }}
      onBlur={cerrar}
    >
      {control}
      <span id={id} className="sr-only">
        {texto}
      </span>
      {abierto &&
        createPortal(
          <span
            ref={burbuja}
            role="tooltip"
            aria-hidden="true"
            className="app-tooltip"
            data-lado={posicion?.lado ?? "arriba"}
            style={{
              top: posicion?.top ?? -9999,
              left: posicion?.left ?? -9999,
              ["--app-tooltip-flecha" as string]: posicion ? `${posicion.flecha}px` : "50%",
            }}
          >
            {texto}
          </span>,
          document.body,
        )}
    </span>
  );
};

export default Tooltip;
