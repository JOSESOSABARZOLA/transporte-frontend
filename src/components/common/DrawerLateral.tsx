/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: DrawerLateral.tsx
 * Responsabilidad: El cajón derecho a toda la altura —velo, panel, cabecera, cuerpo y pie— con el
 *                  comportamiento accesible de una ventana modal. Desde el 2026-10-15 es el CAJÓN
 *                  ESTÁNDAR de toda la aplicación: pie, estado, descarte, foco y modo lectura.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES EL HERMANO LATERAL DEL MODAL CENTRADO (`MensajeModal` desde el 2026-10-16). 2026-09-30.
 *
 * Comparte su accesibilidad —foco atrapado, Escape, devolución de foco, bloqueo del fondo y, desde
 * el 2026-10-15, la pila de capas— vía `usePanelAccesible`. Lo propio es la POSICIÓN: un panel
 * anclado a la derecha, a toda la altura, con un velo que lo cubre.
 *
 * CAJÓN ESTÁNDAR (2026-10-15, plan «drawer-estandar»). Cada cajón armaba a mano su cabecera, sus
 * secciones, su pie y su confirmación de descarte. Con `ancho="lg" | "md"` el cajón lo hace todo:
 *
 *   · ANCHO: `lg` = clamp(720 px, 50vw, 860 px) (D1: `min(860px, 50vw)` daba 683 px a 1366);
 *     `md` = 600 px; el 100 % por debajo de `md` (768 px). Entrada de 220 ms.
 *   · PANEL (revisión 2): `rounded-l-2xl` arriba y abajo con `overflow-hidden`, para que la
 *     cabecera, el cuerpo y el pie respeten la curva; sombra lateral, sin borde. Columna flex:
 *     cabecera (fija) → cuerpo (`flex-1 min-h-0`, el ÚNICO scroll) → pie (fijo).
 *   · CABECERA y PIE AZULES (`app-cajon-barra`, revisión 2): fondo azul corporativo en los dos
 *     temas; dentro, los roles de texto pasan a claros y `BarraOscuraContexto` pinta los botones
 *     (Cancelar blanco, Guardar con borde blanco y apagado sin opacidad, aspa blanca) y las
 *     insignias (translúcidas) sin que cada llamador lo pida.
 *   · CABECERA: título de 20 px, subtítulo de 13 px y aspa de 36 px. Sin versalita de contexto:
 *     lo que iba ahí pasa al subtítulo. La `ayuda` va al principio del cuerpo (12 px).
 *   · PIE fijo: [extraPie · estado] ··· [accionesPie] [Cancelar] [Guardar], `lg` los dos. En modo
 *     lectura: [Cerrar] (+ [Listo] si hay acción). El estado va en `role="status"` y nunca solo
 *     por color: lleva su texto y, el error y el listo, su icono (regla 6). Tonos sobre el azul:
 *     sin cambios / pendiente en claro suave, «Cambios sin guardar» en ámbar, «Falta: …» en rojo
 *     claro y «Listo para guardar» en verde claro (`--app-cajon-estado-*`).
 *   · DESCARTE: con `sucio`, el aspa, Escape, el velo y «Cancelar» preguntan «¿Descartar
 *     cambios?»; sin cambios, cierran. Mientras `guardando` no cierra nada y el cuerpo va `inert`.
 *   · FOCO: al abrir, el primer campo editable; en lectura, el aspa. Al pulsar «Guardar» con
 *     errores, el primer campo inválido (`aria-invalid`), centrado.
 *
 * Los anchos y propiedades anteriores (`antetitulo`, `marca`, `pie`, «xl»…«amplio») se retiraron
 * el 2026-10-15 al terminar la migración. `cajonEstandar.spec.ts` vigila que no vuelvan.
 *
 * UN CAJÓN A LA VEZ (D7). Abrir un segundo `DrawerLateral` sobre otro avisa en desarrollo
 * (`console.warn`): un flujo que necesita otro cajón REEMPLAZA al primero y vuelve a él al cerrar
 * («Registrar parada» ↔ «Ver paradas»). Las confirmaciones (`MensajeModal`) sí se apilan encima.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import AvisoEnLinea from "./AvisoEnLinea.tsx";
import BarraPie, { type EstadoPie } from "./BarraPie.tsx";
import { BarraOscuraContexto } from "./barraOscura.ts";
import Boton from "./Boton.tsx";
import MensajeModal from "./MensajeModal.tsx";
import { usePanelAccesible } from "../../hooks/usePanelAccesible.ts";
import { enfocarPrimerError } from "../../utils/enfocarPrimerError.util.ts";
import type { VarianteAviso } from "../../utils/errorApi.util.ts";

/** Los dos anchos del estándar: `lg` para formularios con varias secciones, `md` para los cortos. */
export type AnchoDrawer = "lg" | "md";

/** La barra del pie vive en `BarraPie` (2026-10-16); los tipos se siguen ofreciendo desde aquí. */
export type { EstadoPie, TonoEstadoPie } from "./BarraPie.tsx";

type DrawerLateralProps = {
  abierto: boolean;
  /** Título del cajón; es el nombre accesible del diálogo (`aria-labelledby`). */
  titulo: string;
  /** Contexto bajo el título. Admite un nodo (identificador en mono, distintivo de color…). */
  subtitulo?: ReactNode;
  /** Línea de ayuda opcional al principio del cuerpo. */
  ayuda?: string;
  /** Sin `onCerrar` no se pinta el aspa ni cierra con Escape/velo. */
  onCerrar?: () => void;
  /** «lg» por omisión; «md» para los formularios cortos. */
  ancho?: AnchoDrawer;
  /** «form» (por omisión) con Cancelar + Guardar; «lectura» con Cerrar (+ Listo). */
  modo?: "form" | "lectura";
  /** Hay cambios sin guardar: cerrar pregunta antes. */
  sucio?: boolean;
  /** Se está guardando: nada cierra, el cuerpo queda `inert` y el botón dice «Guardando…». */
  guardando?: boolean;
  /** Acción del botón principal (si no hay `formId`). */
  onGuardar?: () => void;
  /** Con `formId`, el botón principal envía ese `<form>` (Formik, `DrawerOperativo`). */
  formId?: string;
  /** Rótulo del botón principal; «Guardar» por omisión. */
  textoGuardar?: string;
  estadoPie?: EstadoPie | null;
  /** Apagado de verdad, con el motivo en el `title` («Sin cambios»). En lectura, el de «Listo». */
  motivoGuardar?: string | null;
  /** Se ve apagado pero al pulsarlo valida igual (lleva al primer error). */
  guardarPendiente?: boolean;
  /** Antes del estado, a la izquierda: «Agregar otro después». */
  extraPie?: ReactNode;
  /** Antes de Cancelar/Cerrar, a la derecha: «← Atrás», «Imprimir». */
  accionesPie?: ReactNode;
  /** El mensaje del servidor, tal cual (regla 7), sobre el pie. */
  errorServidor?: ReactNode;
  /** La familia del mensaje del servidor según su trato (`varianteDeAviso`); «error» por omisión. */
  varianteErrorServidor?: VarianteAviso;
  /** Qué se pierde al descartar, si no es lo de siempre (el adicional, la patrulla). */
  mensajeDescarte?: string;
  /** Modo lectura: rótulo y acción del botón principal («Listo»). */
  textoAccionLectura?: string;
  onAccionLectura?: () => void;
  children: ReactNode;
};

/** Clase de ancho del panel por variante. */
const ANCHO: Record<AnchoDrawer, string> = {
  lg: "md:max-w-[clamp(45rem,50vw,53.75rem)]",
  md: "md:max-w-[37.5rem]",
};

/** El primer campo que se puede escribir: ni botones, ni casillas, ni apagados, ni de solo lectura. */
const CAMPO_EDITABLE =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])';

const DrawerLateral: FC<DrawerLateralProps> = ({
  abierto,
  titulo,
  subtitulo,
  ayuda,
  onCerrar,
  ancho = "lg",
  modo = "form",
  sucio = false,
  guardando = false,
  onGuardar,
  formId,
  textoGuardar = "Guardar",
  estadoPie,
  motivoGuardar,
  guardarPendiente = false,
  extraPie,
  accionesPie,
  errorServidor,
  varianteErrorServidor = "error",
  mensajeDescarte = "Los cambios que no se guardaron se perderán.",
  textoAccionLectura = "Listo",
  onAccionLectura,
  children,
}) => {
  const tarjeta = useRef<HTMLDivElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const aspa = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const [confirmando, setConfirmando] = useState(false);

  /*
   * `intentarCerrar` es ESTABLE (va a Escape por la pila de capas): lee el estado por referencia.
   * Sin cambios cierra; con cambios abre la confirmación; mientras se guarda o ya se confirma, nada.
   */
  const refSucio = useRef(sucio);
  const refGuardando = useRef(guardando);
  const refConfirmando = useRef(confirmando);
  const refOnCerrar = useRef(onCerrar);
  useEffect(() => {
    refSucio.current = sucio;
    refGuardando.current = guardando;
    refConfirmando.current = confirmando;
    refOnCerrar.current = onCerrar;
  }, [sucio, guardando, confirmando, onCerrar]);

  const intentarCerrar = useCallback(() => {
    if (refGuardando.current || refConfirmando.current) return;
    if (refSucio.current) setConfirmando(true);
    else refOnCerrar.current?.();
  }, []);

  const descartar = useCallback(() => {
    setConfirmando(false);
    refOnCerrar.current?.();
  }, []);

  const cerrar = onCerrar ? intentarCerrar : undefined;
  const { esCapaSuperior } = usePanelAccesible(abierto, cerrar, tarjeta, { cajon: true });

  // Al cerrarse, una confirmación pendiente no sobrevive a la siguiente apertura (se ajusta al
  // pintar, no en un efecto, para no pintar una vez la confirmación vieja).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abiertoAntes !== abierto) {
    setAbiertoAntes(abierto);
    if (!abierto) setConfirmando(false);
  }

  // Foco inicial del estándar: el primer campo editable; en lectura (o sin campos), el aspa. Se
  // respeta lo que un hijo ya enfocó por su cuenta (`autoFocus`).
  useEffect(() => {
    if (!abierto) return;
    const activo = document.activeElement;
    if (activo && activo !== tarjeta.current && tarjeta.current?.contains(activo)) return;
    const campo =
      modo === "form"
        ? cuerpo.current?.querySelector<HTMLElement>(CAMPO_EDITABLE)
        : null;
    (campo ?? aspa.current)?.focus();
  }, [abierto, modo]);

  if (!abierto) return null;

  /*
   * Sin `formId`, tras pulsar «Guardar» la vista y el foco van al primer campo inválido del
   * cuerpo (`aria-invalid`, que `CampoDrawer` marca tras el primer intento). Va en el siguiente
   * turno, cuando el llamador ya pintó sus errores. Con `formId` lo hace `EnfocarPrimerError`.
   */
  const pulsarGuardar = () => {
    onGuardar?.();
    window.setTimeout(() => {
      if (cuerpo.current) enfocarPrimerError(cuerpo.current);
    }, 0);
  };

  /** El botón principal con `formId` envía ese formulario; apagado y pendiente, también valida. */
  const accionGuardar = () => {
    if (formId) {
      const formulario = document.getElementById(formId);
      if (formulario instanceof HTMLFormElement) formulario.requestSubmit();
    } else {
      pulsarGuardar();
    }
  };

  const motivo =
    motivoGuardar ?? (estadoPie?.tono === "sinCambios" ? "Sin cambios" : null);

  const conPie = modo === "lectura" || Boolean(onGuardar) || Boolean(formId);

  /** Las acciones del pie; la barra (estado, `extraPie`, azul) la pinta `BarraPie`. */
  const acciones = conPie && (
    <>
      {accionesPie}
      {modo === "lectura" ? (
        <>
          <Boton tamano="lg" onClick={intentarCerrar}>
            Cerrar
          </Boton>
          {onAccionLectura && (
            <Boton
              variante="primario"
              tamano="lg"
              motivoDeshabilitado={motivoGuardar}
              onClick={onAccionLectura}
            >
              {textoAccionLectura}
            </Boton>
          )}
        </>
      ) : (
        <>
          <Boton tamano="lg" onClick={intentarCerrar} deshabilitado={guardando}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            tamano="lg"
            type={formId ? "submit" : "button"}
            form={formId}
            cargando={guardando}
            deshabilitado={guardarPendiente}
            motivoDeshabilitado={motivo}
            onClick={formId ? undefined : pulsarGuardar}
            onClickApagado={guardarPendiente && !motivo ? accionGuardar : undefined}
          >
            {guardando ? "Guardando…" : textoGuardar}
          </Boton>
        </>
      )}
    </>
  );

  return createPortal(
    <div className="fixed inset-0 z-40">
      {/*
        VELO. Es un `<button>` para ser operable con teclado y llevar nombre accesible; cerrar por
        aquí pasa por el mismo camino que Escape y el aspa, y solo si es la capa de arriba.
      */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          if (cerrar && esCapaSuperior()) cerrar();
        }}
        className="absolute inset-0 bg-slate-950/45"
      />

      <div
        ref={tarjeta}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        // `-1` la hace enfocable por código sin meterla en el recorrido del tabulador.
        tabIndex={-1}
        className={`app-cajon-amplio absolute inset-y-0 right-0 flex h-full w-full ${ANCHO[ancho]} flex-col overflow-hidden rounded-l-2xl bg-base-100 focus:outline-none`}
      >
        <BarraOscuraContexto.Provider value>
          <div className="app-cajon-barra flex shrink-0 items-start justify-between gap-3 px-6 pt-5 pb-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={idTitulo} className="text-xl font-semibold text-app-strong">
                {titulo}
              </h2>
              {subtitulo && (
                <div className="text-[0.8125rem] text-app-muted">{subtitulo}</div>
              )}
            </div>

            {/* El aspa hace lo mismo que Escape y que «Cancelar»; solo si hay `onCerrar`. */}
            {onCerrar && (
              <Boton
                ref={aspa}
                variante="fantasma"
                tamano="md"
                icono="cerrar"
                aria-label="Cerrar"
                onClick={intentarCerrar}
                deshabilitado={guardando}
              />
            )}
          </div>
        </BarraOscuraContexto.Provider>

        {/*
          El cuerpo es lo único que se desplaza; la cabecera y el pie quedan fijos. Es una COLUMNA
          flex para que su contenido (p. ej. la lista del paso 1) pueda ocupar todo el alto hasta el
          pie con su propio scroll, en vez de quedarse corto.
        */}
        <div
          ref={cuerpo}
          inert={guardando || undefined}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-3.5 pb-5"
        >
          {ayuda && <p className="text-xs text-app-muted">{ayuda}</p>}
          {children}
        </div>

        {/*
          El mensaje del servidor va SOBRE el pie, fuera de la barra azul: es un aviso en línea con
          la paleta de los mensajes estándar (fondo claro), y dentro de la barra su texto heredaría
          el blanco.
        */}
        {errorServidor && (
          <div className="shrink-0 px-6 pb-3">
            <AvisoEnLinea variante={varianteErrorServidor}>{errorServidor}</AvisoEnLinea>
          </div>
        )}

        {acciones && (
          <BarraPie
            estadoPie={estadoPie}
            guardando={guardando}
            extraPie={extraPie}
            className="shrink-0 px-6 py-3.5"
          >
            {acciones}
          </BarraPie>
        )}
      </div>

      <MensajeModal
        abierto={confirmando}
        variante="peligro"
        titulo="¿Descartar cambios?"
        mensaje={mensajeDescarte}
        textoSecundario="Seguir editando"
        textoPrincipal="Descartar"
        onPrincipal={descartar}
        onSecundario={() => setConfirmando(false)}
      />
    </div>,
    document.body,
  );
};

export default DrawerLateral;
