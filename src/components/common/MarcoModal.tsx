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
 * La cadena del velo —`fixed inset-0 z-[10002] flex … bg-black/50 p-4`— estaba copiada
 * **nueve veces, idéntica al byte**. Y las nueve se quedaban en el aspecto:
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
 * EL VELO Y LA SOMBRA LOS PONE LA HOJA, NO LA UTILIDAD. Desde el 2026-09-02 el color
 * del velo y la elevación de la tarjeta salen de `app-modal-fondo` y `app-modal-caja`,
 * en `styles/ui/refinamiento.css`. Aquí llevaban `bg-black/50` y `shadow-2xl`, y hubo
 * que retirarlas: son utilidades de Tailwind, viven en la capa siguiente a la de la
 * hoja y **le ganaban**, de modo que el velo compuesto con el azul institucional y la
 * sombra del tema no llegaban a aplicarse nunca.
 *
 * EL CLIC EN EL VELO NO CIERRA, Y ES UNA DECISIÓN.
 *
 * Es lo habitual en otros productos, y aquí se descarta: siete de las nueve ventanas son
 * formularios con datos ya capturados, y el proyecto protege lo capturado hasta en el
 * tratamiento de los errores 409 —«aviso destacado, sin perder lo capturado»—. Un clic
 * fuera es casi siempre accidental; Escape es deliberado y equivale a pulsar «Cancelar»,
 * que es un botón que ya está ahí. Se admite el segundo y no el primero.
 */

import { useRef, type FC, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { usePanelAccesible } from "../../hooks/usePanelAccesible.ts";

/** Anchos en uso. No se admiten otros: son los tres tamaños del sistema. */
const ANCHOS = {
  sm: "max-w-sm",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  /**
   * Para una ventana que contiene una LISTA, no un formulario. Añadido el 2026-08-27.
   *
   * `max-w-4xl` no estaba en el proyecto y se consultó antes de escribirla, como pide la
   * regla 1. El caso que la trajo es el personal de P-13: en 672 px las dos columnas de
   * candidatos dejan celdas de 328 px y el motivo que redacta el servidor se parte en
   * tres renglones. Medido a 1600 px, con 1552 px la celda sube a 768 px, el motivo cabe
   * en **un renglón** y se ven ocho personas en lugar de cuatro.
   *
   * NO SE USE PARA CAPTURAR. Un formulario a 1552 px devuelve las líneas de 200 caracteres
   * que el reparto de P-01 existe para evitar: aquí sirve porque lo que hay dentro es una
   * lista de nombres con su motivo, y esa sí quiere ancho.
   */
  "4xl": "max-w-4xl",
  /**
   * Para ver/editar un DOCUMENTO con su PDF al lado (2026-09-22). `max-w-6xl` y `max-w-7xl` no
   * estaban en el proyecto y se añaden a pedido: el visor de PDF y el editor de plantilla/orden
   * muestran el memorando a tamaño legible, y con `4xl` el documento salía demasiado pequeño.
   * Como el 4xl, NO se usan para capturar un formulario: son para lienzos anchos (el PDF).
   */
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  /**
   * Casi a pantalla completa (2026-09-22), para VER el PDF lo más grande posible. `max-w-full`
   * deja la tarjeta al ancho de la ventana (menos el margen del velo). Es solo para el visor del
   * PDF; no se usa para capturar (mismo criterio que 4xl/6xl/7xl).
   */
  full: "max-w-full",
} as const;

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
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * PIE DE ACCIÓN PERSISTENTE. Opcional, añadido el 2026-09-15.
   *
   * Cuando la ventana entrega aquí sus botones, el CUERPO se desplaza pero el PIE no:
   * queda anclado al fondo de la tarjeta, con un separador, **siempre a la vista**. En un
   * formulario largo —la cuenta de acceso, con sus nueve roles— los botones dejaban de
   * verse bajo el pliegue y había que desplazarse hasta el fondo para encontrarlos.
   *
   * ES FLEXBOX, NO `sticky`. La regla 14 de CLAUDE.md deja `sticky bottom-0` fuera del
   * inventario (§2.2) hasta que se amplíe; esto no lo usa. La tarjeta pasa a ser una
   * columna: cabecera fija · cuerpo con desplazamiento propio · pie fijo. Solo utilidades
   * ya en uso (`flex`, `flex-col`, `flex-1`, `min-h-0`, `overflow-y-auto`, `border-t`).
   *
   * Sin `pie`, la tarjeta se comporta EXACTAMENTE como antes (se desplaza entera). No
   * aplica a `deAviso`: esas ventanas centran su botón y no se desplazan.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  pie?: ReactNode;
  /**
   * La tarjeta ocupa TODO el alto de la ventana (2026-09-22), no solo el que pide su contenido.
   * Para VER un documento (PDF) a pantalla completa: el cuerpo se estira y el PDF se ve a lo largo,
   * no en una franja. Solo con `pie` (la columna flex); sin pie no aplica.
   */
  altoCompleto?: boolean;
  children: ReactNode;
};

const MarcoModal: FC<MarcoModalProps> = ({
  abierto,
  etiqueta,
  onCerrar,
  ancho = "lg",
  altoCompleto = false,
  deAviso = false,
  titulo,
  antetitulo,
  pie,
  children,
}) => {
  const tarjeta = useRef<HTMLDivElement>(null);

  // Foco atrapado, Escape, devolución de foco y bloqueo del fondo: la mecánica común a toda ventana
  // superpuesta, extraída para que el cajón (`DrawerLateral`) no la duplique.
  usePanelAccesible(abierto, onCerrar, tarjeta);

  if (!abierto) return null;

  /** Con cabecera institucional, el marco es azul y el contenido va embutido en blanco. */
  const conCabecera = Boolean(titulo) && !deAviso;

  /** Con pie persistente, la tarjeta es una columna flex y el desplazamiento vive dentro. */
  const conPie = Boolean(pie) && !deAviso;

  // Con `altoCompleto` la tarjeta ocupa todo el alto (solo tiene sentido con pie, que estira el
  // cuerpo). `h-full` fija la altura y `max-h-full` la acota al velo: juntas, pantalla completa.
  const alto = altoCompleto && conPie ? "h-full " : "";

  const tarjetaClases = deAviso
    ? `max-h-full w-full ${ANCHOS[ancho]} overflow-y-auto rounded-md border border-base-300 bg-base-100 p-6 text-center`
    : conCabecera
      ? conPie
        ? `flex ${alto}max-h-full w-full ${ANCHOS[ancho]} flex-col rounded-md bg-secondary p-2`
        : `max-h-full w-full ${ANCHOS[ancho]} overflow-y-auto rounded-md bg-secondary p-2`
      : conPie
        ? `flex ${alto}max-h-full w-full ${ANCHOS[ancho]} flex-col rounded-md border border-base-300 bg-base-100`
        : `max-h-full w-full ${ANCHOS[ancho]} overflow-y-auto rounded-md border border-base-300 bg-base-100 p-6`;

  /*
    PORTAL A `document.body` (2026-09-22). El velo es `position: fixed`, pero si CUALQUIER
    ancestro tiene `transform`, `filter` o `contain`, ese ancestro pasa a ser el bloque contenedor
    del fijo y el modal queda ATRAPADO dentro de esa caja (se vio en el panel «Órdenes de …»: el
    velo cubría solo la tarjeta, no la ventana). Renderizar en `body` lo saca de cualquier ancestro
    y el `inset-0` vuelve a ser el de la ventana. El foco, Escape y el bloqueo de scroll usan
    escuchas de documento y refs, así que siguen funcionando igual.
  */
  return createPortal(
    <div
      // `app-modal-fondo` y `app-modal-caja` no colocan: son los dos enganches que
      // permiten vestir TODOS los modales desde una hoja. Doce de los trece pasan por
      // aquí. Ver `styles/ui/refinamiento.css`.
      className="app-modal-fondo fixed inset-0 z-[10002] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={etiqueta}
    >
      <div
        ref={tarjeta}
        // `-1` la hace enfocable por código sin meterla en el recorrido del tabulador.
        tabIndex={-1}
        className={`app-modal-caja ${tarjetaClases} focus:outline-none`}
      >
        {conCabecera ? (
          <>
            <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-2 text-secondary-content">
              <div className="flex min-w-0 flex-col gap-0.5">
                {antetitulo && (
                  <p className="text-xs font-semibold uppercase text-secondary-content/70">
                    {antetitulo}
                  </p>
                )}
                <h3 className="text-lg font-semibold">{titulo}</h3>
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

            {conPie ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-base-100">
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  {children}
                </div>
                <div className="shrink-0 border-t border-base-300 p-4">
                  {pie}
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-base-100 p-6">{children}</div>
            )}
          </>
        ) : conPie ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
            <div className="shrink-0 border-t border-base-300 p-4">{pie}</div>
          </>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body,
  );
};

export default MarcoModal;
