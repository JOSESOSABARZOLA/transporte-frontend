/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Indicador de pasos
 * Archivo: Stepper.tsx
 * Responsabilidad: Mostrar en qué paso de un flujo va el usuario, con el paso hecho marcado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * EL ESTADO NO DEPENDE DEL COLOR (regla 6): cada paso lleva su número o un check, y SIEMPRE su
 * título en texto. El color acompaña —primario el actual, éxito el hecho, neutro el pendiente—,
 * no sustituye. Entre pasos va una línea conectora (`border-t`) que se vuelve azul (`border-primary`)
 * cuando el paso anterior ya está completado. Solo utilidades del inventario (regla 1): sin la clase
 * daisyUI `steps`, que no está en el inventario. El indicador es un círculo de 32 px
 * (`rounded-full h-8 w-8`, registrado en FASE5 §2.2 el 2026-10-08) y el paso completado muestra el
 * ✓ también cuando es el actual: el halo dice «aquí», el ✓ dice «hecho».
 *
 * NAVEGABLE (2026-10-08, «Planificar el día»). Con `onIr`, cada paso es un BOTÓN: se puede volver a
 * cualquiera ya alcanzado (`alcanzables`) y los demás quedan deshabilitados y atenuados, con el
 * motivo en `title`. Las flechas ← → mueven el foco entre los pasos habilitados; el actual lleva
 * `aria-current="step"` y un halo (`ring`). Sin `onIr` se comporta como antes: solo informa.
 */

import { Fragment, useRef, type FC, type KeyboardEvent } from "react";

import Iconos from "./Iconos.tsx";

export type PasoStepper = { numero: number; titulo: string };

type StepperProps = {
  pasos: PasoStepper[];
  /** Número del paso en curso. */
  actual: number;
  /** Números de los pasos ya completados (muestran un check). */
  completados: number[];
  /** Línea de estado bajo cada título («Todo listo», «7 de 8 cubiertos»…). */
  subtitulos?: Partial<Record<number, string>>;
  /** Pasos a los que se puede ir. Solo cuenta con `onIr`. */
  alcanzables?: number[];
  /** Con él, los pasos son botones navegables. */
  onIr?: (numero: number) => void;
  /** Nombre accesible de la lista de pasos. */
  etiqueta?: string;
};

const Stepper: FC<StepperProps> = ({
  pasos,
  actual,
  completados,
  subtitulos,
  alcanzables,
  onIr,
  etiqueta,
}) => {
  const refLista = useRef<HTMLOListElement>(null);

  /** ← → entre los pasos habilitados (los bloqueados se saltan). */
  const alTeclear = (evento: KeyboardEvent<HTMLOListElement>) => {
    if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
    const botones = Array.from(
      refLista.current?.querySelectorAll<HTMLButtonElement>("button:not([aria-disabled='true'])") ??
        [],
    );
    const indice = botones.findIndex((b) => b === document.activeElement);
    if (indice < 0) return;
    evento.preventDefault();
    const siguiente =
      evento.key === "ArrowRight"
        ? botones[(indice + 1) % botones.length]
        : botones[(indice - 1 + botones.length) % botones.length];
    siguiente.focus();
  };

  return (
    <ol
      ref={refLista}
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
      aria-label={etiqueta}
      onKeyDown={onIr ? alTeclear : undefined}
    >
      {pasos.map((paso, indice) => {
        const hecho = completados.includes(paso.numero);
        const esActual = paso.numero === actual;
        const bloqueado = onIr !== undefined && !(alcanzables ?? []).includes(paso.numero);
        // El actual lleva el halo azul; si además ya está completo, muestra el ✓ (2026-10-08):
        // el número solo se pinta en los pasos sin completar.
        const clase = esActual
          ? "bg-primary text-primary-content ring-4 ring-primary/20"
          : hecho
            ? "bg-success text-success-content"
            : "border border-base-300 bg-base-200 text-app-muted";
        // El conector que ANTECEDE a este paso es azul si el paso anterior ya se completó.
        const anterior = pasos[indice - 1];
        const conectorAzul = anterior
          ? completados.includes(anterior.numero)
          : false;
        const subtitulo = subtitulos?.[paso.numero];

        const contenido = (
          <>
            {/* Círculo de 32 px (2026-10-08): `rounded-full h-8 w-8`, no el distintivo rectangular. */}
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${clase}`}
            >
              {hecho ? <Iconos nombre="check" /> : paso.numero}
              {hecho && <span className="sr-only">completado</span>}
            </span>
            <span className="flex flex-col text-left">
              <span
                className={`text-sm ${
                  bloqueado
                    ? "text-app-disabled"
                    : esActual
                      ? "font-semibold text-app-strong"
                      : "text-app-strong"
                }`}
              >
                {paso.titulo}
              </span>
              {subtitulo && (
                <span
                  className={`text-xs ${
                    bloqueado ? "text-app-disabled" : esActual ? "text-primary" : "text-app-muted"
                  }`}
                >
                  {subtitulo}
                </span>
              )}
            </span>
          </>
        );

        return (
          <Fragment key={paso.numero}>
            {indice > 0 && (
              <li
                aria-hidden="true"
                className={`min-w-8 flex-1 border-t-2 ${conectorAzul ? "border-primary" : "border-base-300"}`}
              />
            )}
            <li
              className="flex items-center gap-2"
              aria-current={esActual ? "step" : undefined}
            >
              {onIr ? (
                // `aria-disabled` y no `disabled` (estándar de botones, 2026-10-15): un botón
                // nativamente apagado no recibe el ratón y su `title` nunca se veía.
                <button
                  type="button"
                  className={`flex items-center gap-2 rounded-md p-1 ${bloqueado ? "cursor-not-allowed" : ""}`}
                  aria-disabled={bloqueado || undefined}
                  title={bloqueado ? "Complete los pasos anteriores para llegar aquí." : undefined}
                  onClick={() => {
                    if (!bloqueado) onIr(paso.numero);
                  }}
                >
                  {contenido}
                </button>
              ) : (
                contenido
              )}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
};

export default Stepper;
