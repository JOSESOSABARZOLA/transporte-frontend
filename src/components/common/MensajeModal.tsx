/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: MensajeModal.tsx
 * Responsabilidad: El modal ÚNICO de mensajes —advertencia, peligro, error, éxito e información—:
 *                  icono en círculo, título, texto, detalle técnico colapsable y uno o dos botones,
 *                  con la acción asíncrona y su fallo resueltos dentro del mismo modal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANATOMÍA (plan «mensajes-estandar», igual en las cinco variantes). Velo oscuro al 45 % sobre TODO
 * —también sobre un cajón abierto—; tarjeta de 420 px (90vw como mucho), radio 16, padding 24, en
 * columna centrada; círculo de 56 px con el fondo suave de la familia y el icono de línea de 28 px;
 * título de 18 px (en una confirmación, una pregunta); texto de 14 px; «Ver detalle» con el texto
 * técnico en mono; botones `lg`, del mismo ancho, el seguro a la izquierda. Con un solo botón, ancho
 * completo. Entrada: el velo aparece y la tarjeta crece de 0,96 a 1 en 150 ms.
 *
 *   · peligro       icono y círculo de advertencia; la acción en ROJO RELLENO (M2).
 *   · advertencia   consecuencias no destructivas (Publicar mes, Cerrar cuadro): acción primaria.
 *   · error         algo falló o no se permite: [Entendido], o [Cerrar] + [Reintentar].
 *   · éxito         solo los hitos: [Aceptar], o [Cerrar] + la acción siguiente.
 *   · info          explicaciones sin riesgo: [Entendido].
 *
 * COMPORTAMIENTO.
 *   · Foco inicial en el botón SEGURO si es peligroso; en el principal en las demás.
 *   · Escape y el velo = el botón secundario (o cerrar, si hay uno solo). Nunca ejecutan lo peligroso.
 *   · Enter NO confirma lo peligroso: sobre el botón rojo, Enter se descarta (la barra espaciadora y
 *     el clic sí). Así un Enter de más —el que envió el formulario de detrás— no borra nada.
 *   · Foco atrapado y devuelto, en la pila de capas de `usePanelAccesible`.
 *   · `onPrincipal` asíncrono: «Procesando…», los dos botones apagados y Escape y velo bloqueados.
 *     Bien → `onExito`. Mal → el MISMO modal pasa a error con `traductorErrores` y el detalle técnico;
 *     si reintentar tiene sentido, [Cerrar] + [Reintentar].
 *   · `role="alertdialog"`, `aria-modal`, nombre por el título y descripción por el texto.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import Boton from "./Boton.tsx";
import IconoMensaje, { type FamiliaMensaje } from "./IconoMensaje.tsx";
import { CLASES_FAMILIA } from "./familiasMensaje.ts";
import { usePanelAccesible } from "../../hooks/usePanelAccesible.ts";
import type { VarianteMensaje } from "../../utils/mensaje.ts";
import { traducirError, type ErrorTraducido } from "../../utils/traductorErrores.ts";

/** El icono y el círculo de cada variante: el peligro comparte los de la advertencia. */
const FAMILIA: Record<VarianteMensaje, FamiliaMensaje> = {
  advertencia: "advertencia",
  peligro: "advertencia",
  error: "error",
  exito: "exito",
  info: "info",
};

/** El rótulo de la acción si no se indica. */
const TEXTO_PRINCIPAL: Record<VarianteMensaje, string> = {
  advertencia: "Confirmar",
  peligro: "Confirmar",
  error: "Entendido",
  exito: "Aceptar",
  info: "Entendido",
};

export type MensajeModalProps = {
  /** `true` por omisión: el host lo monta y desmonta. */
  abierto?: boolean;
  variante: VarianteMensaje;
  titulo: string;
  mensaje?: ReactNode;
  /** El texto técnico (código HTTP, de negocio, seguimiento). Nunca el mensaje principal. */
  detalle?: string | null;
  textoPrincipal?: string;
  /** `null` = un solo botón. Sin indicar: «Cancelar» en advertencia y peligro, nada en las demás. */
  textoSecundario?: string | null;
  /** La acción. Si devuelve una promesa, el modal espera y, si falla, pasa a error. */
  onPrincipal?: () => unknown;
  /** El botón seguro, Escape y el velo. */
  onSecundario?: () => void;
  /** `onPrincipal` terminó bien. */
  onExito?: () => void;
  /** Por omisión, la variante `peligro`. */
  peligroso?: boolean;
  /** Procesando por fuera (quien lo monta lleva su propio estado). */
  cargando?: boolean;
  /** Apaga la acción con su motivo («Elija el motivo»). */
  motivoPrincipal?: string | null;
  /**
   * Antes de la acción: `false` la detiene sin cerrar ni pasar a error (el contenido de `children`
   * muestra entonces sus errores por campo, como el motivo de una baja).
   */
  validar?: () => boolean;
  /** El título del error si `onPrincipal` falla. */
  tituloError?: string;
  /** Un contenido corto bajo el texto (el motivo de una baja). No es un formulario. */
  children?: ReactNode;
};

const MensajeModal: FC<MensajeModalProps> = ({
  abierto = true,
  variante: varianteInicial,
  titulo,
  mensaje,
  detalle,
  textoPrincipal,
  textoSecundario,
  onPrincipal,
  onSecundario,
  onExito,
  peligroso,
  cargando = false,
  motivoPrincipal,
  validar,
  tituloError,
  children,
}) => {
  const tarjeta = useRef<HTMLDivElement>(null);
  const botonPrincipal = useRef<HTMLButtonElement>(null);
  const botonSecundario = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idMensaje = useId();
  const idDetalle = useId();
  const [procesandoPropio, setProcesando] = useState(false);
  const [fallo, setFallo] = useState<ErrorTraducido | null>(null);
  const [verDetalle, setVerDetalle] = useState(false);

  // Montado con `abierto`, al cerrarse el fallo y el detalle no sobreviven a la siguiente apertura
  // (se ajusta al pintar, como en `DrawerLateral`).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abiertoAntes !== abierto) {
    setAbiertoAntes(abierto);
    if (!abierto) {
      setFallo(null);
      setProcesando(false);
      setVerDetalle(false);
    }
  }

  const procesando = cargando || procesandoPropio;

  // Tras un fallo, el modal ES un error: otra variante, otro texto y otros botones.
  const variante: VarianteMensaje = fallo ? "error" : varianteInicial;
  const esPeligroso = !fallo && (peligroso ?? varianteInicial === "peligro");
  const familia = FAMILIA[variante];
  const tituloVisible = fallo ? fallo.titulo : titulo;
  const mensajeVisible = fallo ? fallo.mensaje : mensaje;
  const detalleVisible = fallo ? fallo.detalle : detalle;
  const puedeReintentar = Boolean(fallo?.reintentable && onPrincipal);

  const rotuloPrincipal = fallo
    ? puedeReintentar
      ? "Reintentar"
      : "Entendido"
    : (textoPrincipal ?? TEXTO_PRINCIPAL[varianteInicial]);
  const rotuloSecundario = fallo
    ? puedeReintentar
      ? "Cerrar"
      : null
    : textoSecundario === undefined
      ? varianteInicial === "advertencia" || varianteInicial === "peligro"
        ? "Cancelar"
        : null
      : textoSecundario;

  /** Escape, el velo y el botón seguro. Con un solo botón, «cerrar» es ese botón (si no es peligroso). */
  const cerrar = () => {
    if (procesando) return;
    if (onSecundario) onSecundario();
    else if (!esPeligroso && !fallo) void ejecutar();
  };

  async function ejecutar() {
    if (procesando) return;
    // El error sin reintento se cierra con su único botón.
    if (fallo && !puedeReintentar) {
      onSecundario?.();
      return;
    }
    // Sin acción, el botón único cierra: «Entendido» de un error no hizo nada (`false`); «Aceptar» o
    // «Entendido» de un aviso, sí lo dio por leído (`true`).
    if (!onPrincipal) {
      if (varianteInicial === "error") onSecundario?.();
      else (onExito ?? onSecundario)?.();
      return;
    }
    if (!fallo && validar && !validar()) return;
    let resultado: unknown;
    try {
      resultado = onPrincipal();
    } catch (error) {
      setFallo(traducirError(error, { titulo: tituloError }));
      return;
    }
    if (!(resultado instanceof Promise)) {
      onExito?.();
      return;
    }
    setProcesando(true);
    try {
      await resultado;
      setProcesando(false);
      setFallo(null);
      onExito?.();
    } catch (error) {
      setProcesando(false);
      setVerDetalle(false);
      setFallo(traducirError(error, { titulo: tituloError }));
    }
  }

  const { esCapaSuperior } = usePanelAccesible(
    abierto,
    procesando ? undefined : cerrar,
    tarjeta,
  );

  // Foco inicial: el botón seguro si es peligroso; si no, el principal. Va DESPUÉS del hook de
  // capas, que enfoca la tarjeta, para ganarle. Tras un fallo, vuelve al principal del error.
  useEffect(() => {
    if (!abierto) return;
    const destino =
      esPeligroso && botonSecundario.current ? botonSecundario.current : botonPrincipal.current;
    destino?.focus();
  }, [abierto, esPeligroso, fallo]);

  if (!abierto) return null;

  /** Enter sobre la acción peligrosa no la dispara (la barra espaciadora y el clic, sí). */
  const alPulsar = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (esPeligroso && evento.key === "Enter" && evento.target === botonPrincipal.current) {
      evento.preventDefault();
    }
  };

  const clases = CLASES_FAMILIA[familia];

  return createPortal(
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4">
      {/* El velo: el mismo camino que Escape, y solo si es la capa de arriba y nada se procesa. */}
      <div
        aria-hidden="true"
        data-velo-mensaje=""
        onClick={() => {
          if (esCapaSuperior()) cerrar();
        }}
        className="app-mensaje-fondo absolute inset-0 bg-slate-950/45"
      />

      <div
        ref={tarjeta}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={mensajeVisible ? idMensaje : undefined}
        aria-busy={procesando || undefined}
        data-variante={variante}
        tabIndex={-1}
        onKeyDown={alPulsar}
        className="app-mensaje-caja relative flex max-h-full w-[420px] max-w-[90vw] flex-col items-center gap-2.5 overflow-y-auto rounded-2xl bg-base-100 p-6 text-center focus:outline-none"
      >
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-full ${clases.fondo} ${clases.color}`}
        >
          <IconoMensaje familia={familia} />
        </div>

        <h2 id={idTitulo} className="text-lg font-semibold text-app-strong">
          {tituloVisible}
        </h2>

        {mensajeVisible && (
          <div id={idMensaje} className="text-sm leading-normal text-app-muted">
            {mensajeVisible}
          </div>
        )}

        {!fallo && children && <div className="w-full text-left">{children}</div>}

        {detalleVisible && (
          <div className="flex w-full flex-col items-center gap-2">
            <Boton
              variante="enlace"
              tamano="sm"
              aria-expanded={verDetalle}
              aria-controls={idDetalle}
              onClick={() => setVerDetalle((previo) => !previo)}
            >
              {verDetalle ? "Ocultar detalle" : "Ver detalle"}
            </Boton>
            {verDetalle && (
              <pre
                id={idDetalle}
                className="w-full whitespace-pre-wrap break-words rounded-lg bg-base-200 p-3 text-left font-mono text-xs text-app-label"
              >
                {detalleVisible}
              </pre>
            )}
          </div>
        )}

        <div className="mt-3 flex w-full gap-3">
          {rotuloSecundario && (
            <Boton
              ref={botonSecundario}
              tamano="lg"
              className="flex-1"
              deshabilitado={procesando}
              onClick={() => onSecundario?.()}
            >
              {rotuloSecundario}
            </Boton>
          )}
          <Boton
            ref={botonPrincipal}
            tamano="lg"
            variante={esPeligroso ? "peligroRelleno" : "primario"}
            className="flex-1"
            cargando={procesando}
            motivoDeshabilitado={fallo ? null : motivoPrincipal}
            onClick={() => void ejecutar()}
          >
            {procesando ? "Procesando…" : rotuloPrincipal}
          </Boton>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MensajeModal;
