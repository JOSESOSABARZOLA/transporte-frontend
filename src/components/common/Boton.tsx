/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Botones
 * Archivo: Boton.tsx
 * Responsabilidad: El botón ÚNICO de la aplicación: variante, tamaño, icono a la izquierda, carga y
 *                  deshabilitado con su motivo. Las clases de daisyUI se deciden aquí y solo aquí.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTÁNDAR ÚNICO DE BOTONES (2026-10-15). Hasta hoy cada pantalla escribía su `btn …` a mano y la
 * misma acción salía con seis aspectos y tres alturas (24, 27,6 y 32 px). Las pantallas eligen
 * VARIANTE y TAMAÑO; las clases salen de los dos mapas de abajo.
 *
 *   VARIANTES
 *   · primario     relleno azul de marca. Uno por zona (página, cajón o modal).
 *   · secundario   fondo blanco, borde neutro, texto fuerte (`app-accion-secundaria`).
 *   · acento       borde y texto azul: crear o agregar DENTRO de una fila, tarjeta o sección.
 *   · peligro      borde y texto rojo: sacar de uso, reversible (Desactivar, Dar de baja).
 *   · exito        borde y texto verde: volver a poner en uso (Activar, Reactivar).
 *   · peligroTexto sin borde, texto rojo y papelera: el borrado definitivo.
 *   · enlace       texto azul sin borde: navegación o acciones menores.
 *   · peligroRelleno  relleno rojo (`--app-peligro-relleno`, #c2200f): el botón que confirma una
 *                  acción DESTRUCTIVA en un mensaje de peligro (M2 de los mensajes estándar,
 *                  2026-10-16; antes solo lo irreversible, D1).
 *   · fantasma     sin fondo ni borde: el aspa ✕ de la cabecera del cajón (2026-10-15).
 *
 *   TAMAÑOS: sm 32 px / 13 px (fila, paginador, tarjeta) · md 36 px / 14 px (barras y cabeceras) ·
 *   lg 40 px / 14 px (pie de cajones y modales). Nada por debajo de 32 px. Sin texto, el botón es
 *   cuadrado (`btn-square`) y su nombre accesible es obligatorio.
 *
 *   EN BARRA OSCURA (cabeceras azules y, desde el 2026-10-15, la cabecera y el pie del cajón
 *   estándar): el secundario es blanco con texto azul, el primario suma un borde blanco (y apagado
 *   toma colores fijos, sin opacidad), el enlace y el fantasma van en blanco. Se pide con
 *   `enBarraOscura` o llega solo por `BarraOscuraContexto`, que provee `DrawerLateral`.
 *
 * DESHABILITADO SIEMPRE CON `aria-disabled`, NUNCA CON `disabled`. daisyUI le quita el puntero a un
 * `:disabled`, así que su `title` no se mostraba nunca («Resuelva los puntos pendientes», «Publique
 * el mes…»). Con `aria-disabled` el botón conserva su variante al 50 %, el cursor «no permitido»
 * y el motivo en el `title`; el clic (y el envío del formulario) se descarta aquí. Mientras
 * `cargando`, igual, con el giro junto al texto (regla 16 del CLAUDE.md).
 *
 * `onClickApagado`: el «Guardar» de un cajón con campos pendientes se VE apagado, pero al pulsarlo
 * muestra qué falta (lleva al primer error). Solo se llama apagado y sin `cargando`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useContext,
  type ButtonHTMLAttributes,
  type FC,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";

import { BarraOscuraContexto } from "./barraOscura.ts";
import Iconos, { type NombreIcono } from "./Iconos.tsx";

export type VarianteBoton =
  | "primario"
  | "secundario"
  | "acento"
  | "peligro"
  | "exito"
  | "peligroTexto"
  | "enlace"
  | "peligroRelleno"
  | "fantasma";

export type TamanoBoton = "sm" | "md" | "lg";

type Nativos = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style" | "disabled" | "type" | "onClick" | "children"
>;

export type BotonProps = Nativos & {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  /** Icono a la izquierda del texto. */
  icono?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Por qué está apagado: va al `title` y lo apaga aunque `deshabilitado` no venga. */
  motivoDeshabilitado?: string | null;
  /** Dentro de una cabecera azul. */
  enBarraOscura?: boolean;
  type?: "button" | "submit";
  onClick?: (evento: MouseEvent<HTMLButtonElement>) => void;
  /** Se llama en lugar de `onClick` cuando el botón está apagado (no mientras carga). */
  onClickApagado?: () => void;
  children?: ReactNode;
  /** Solo para el acomodo (`w-full`, `flex-1`, `min-w-8`…), nunca para el aspecto. */
  className?: string;
  /** Disparador de un menú: anuncia que abre una lista y si está abierta. */
  expandido?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

/** El aspecto de cada variante. Único sitio donde se escribe. */
// eslint-disable-next-line react-refresh/only-export-components
export const CLASES_VARIANTE: Record<VarianteBoton, string> = {
  primario: "btn-primary",
  secundario: "app-accion-secundaria",
  acento: "btn-outline btn-primary",
  peligro: "btn-outline btn-error text-[var(--app-text-peligro)] hover:text-error-content",
  exito: "btn-outline btn-success text-[var(--app-text-exito)] hover:text-success-content",
  peligroTexto: "btn-ghost text-[var(--app-text-peligro)]",
  enlace: "btn-link",
  peligroRelleno: "btn-error app-boton-peligro-relleno",
  fantasma: "btn-ghost",
};

/** El aspecto de cada variante SOBRE UNA BARRA AZUL (`ui/componentes-propios.css`). */
const CLASES_EN_BARRA: Partial<Record<VarianteBoton, string>> = {
  primario: "app-boton-barra-primario",
  secundario: "app-boton-barra-secundario",
  enlace: "app-boton-barra-enlace",
  fantasma: "app-boton-barra-fantasma",
};

/** La altura y el texto de cada tamaño. */
// eslint-disable-next-line react-refresh/only-export-components
export const CLASES_TAMANO: Record<TamanoBoton, string> = {
  sm: "btn-sm [--fontsize:0.8125rem]",
  md: "[--size:2.25rem] [--fontsize:0.875rem]",
  lg: "[--fontsize:0.875rem]",
};

/**
 * Las clases de un botón para un elemento que NO puede ser `<button>` (un `<summary>` de
 * `<details>`, un `<Link>`). Mismo mapa: el aspecto sigue escribiéndose solo aquí.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function clasesBoton(
  variante: VarianteBoton = "secundario",
  tamano: TamanoBoton = "md",
  enBarraOscura = false,
): string {
  return [
    "btn whitespace-nowrap",
    CLASES_VARIANTE[variante],
    CLASES_TAMANO[tamano],
    enBarraOscura ? (CLASES_EN_BARRA[variante] ?? "") : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const Boton: FC<BotonProps> = ({
  variante = "secundario",
  tamano = "md",
  icono,
  cargando = false,
  deshabilitado = false,
  motivoDeshabilitado,
  enBarraOscura = false,
  type = "button",
  onClick,
  onClickApagado,
  children,
  className,
  expandido,
  title,
  ref,
  ...nativos
}) => {
  const enBarra = useContext(BarraOscuraContexto) || enBarraOscura;
  const apagado = deshabilitado || Boolean(motivoDeshabilitado) || cargando;
  const sinTexto = children === undefined || children === null || children === "";
  const clases = [
    clasesBoton(variante, tamano, enBarra),
    sinTexto ? "btn-square" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...nativos}
      ref={ref}
      type={type}
      className={clases}
      title={motivoDeshabilitado || title}
      aria-disabled={apagado || undefined}
      aria-busy={cargando || undefined}
      aria-haspopup={expandido === undefined ? nativos["aria-haspopup"] : "menu"}
      aria-expanded={expandido ?? nativos["aria-expanded"]}
      onClick={(evento) => {
        if (apagado) {
          evento.preventDefault();
          if (!cargando) onClickApagado?.();
          return;
        }
        onClick?.(evento);
      }}
    >
      {cargando ? (
        <span className="loading loading-spinner loading-sm" aria-hidden="true" />
      ) : (
        icono && <Iconos nombre={icono} />
      )}
      {children}
    </button>
  );
};

export default Boton;
