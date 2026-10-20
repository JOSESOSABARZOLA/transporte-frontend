/**
 * App: Cuadro de Colores
 * Módulo: Cuadro
 * Feature: Transporte requerido
 * Archivo: SelectorTipoTransporte.tsx
 * Responsabilidad: Elegir el tipo de transporte que se pide a la DAF, con la explicación de cada opción.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN COMBO PROPIO, NO UN `<select>`, PORQUE CADA OPCIÓN TIENE QUE EXPLICARSE (2026-10-07).
 *
 * Un `<select>` nativo no puede mostrar la explicación de la opción que se recorre con el ratón o con
 * ↑/↓, y quien registra no sabía qué distinguía «Solo dejar» de «Dejar y retirar». Este combo sigue el
 * patrón ARIA de lista desplegable: el foco se queda en el botón (`role="combobox"`) y la opción
 * activa se anuncia con `aria-activedescendant`; cada opción (`role="option"`) se describe con su
 * texto (`aria-describedby`), que además se VE bajo su nombre mientras está activa.
 *
 * Tres ayudas, todas con los MISMOS textos (`tipoTransporte.util.ts`):
 *   a) la de la opción activa del combo (ratón y teclado);
 *   b) «ⓘ» junto a la etiqueta: un panel con las cinco opciones y la actual resaltada, que se abre con
 *      ratón, teclado o toque y se cierra con Esc o tocando fuera;
 *   c) una línea fija bajo el combo con la explicación de lo elegido (Propios medios, en neutro).
 *
 * La lista y el panel flotan en un portal (`usePanelFlotante`): no tapan los campos de abajo al abrirse
 * dentro del cajón, ni la propia etiqueta. Sin clases nuevas.
 *
 * MAQUETACIÓN (2026-10-07, segunda vuelta). Tres filas: (1) etiqueta + ⓘ + «· sugerido…», que envuelve;
 * (2) el combo —NO se encoge, con un ancho mínimo— y, al lado, lo que llegue en `junto` (la casilla del
 * macrooperativo), con `flex-wrap`; (3) la línea de ayuda a todo el ancho. La lista tiene un ancho
 * mínimo PROPIO (no hereda el del combo) y cada opción va en una línea; la explicación de la opción
 * activa se abre AL LADO de la lista. Los anchos van en `style`, como la posición: no son clases.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { TipoTransporte } from "../../interfaces/Operativo.ts";
import { usePanelFlotante } from "../../hooks/usePanelFlotante.ts";
import {
  OPCIONES_TRANSPORTE,
  opcionTransporte,
  textoSugerencia,
} from "../../utils/tipoTransporte.util.ts";
import Boton from "../common/Boton.tsx";

type SelectorTipoTransporteProps = {
  valor: TipoTransporte;
  onCambiar: (valor: TipoTransporte) => void;
  /** Lo que propone el formulario (solo en el alta). Sin él no se pinta la sugerencia. */
  sugerido?: TipoTransporte;
  deshabilitado?: boolean;
  /** Lo que va al lado del combo, en su misma fila (la casilla del macrooperativo). */
  junto?: ReactNode;
};

/** Ancho mínimo del combo: muestra entero el nombre más largo («Dejar y retirar»). */
export const ANCHO_MINIMO_COMBO = 220;
/** Ancho mínimo de la lista: no hereda el del combo y cada opción cabe en una línea. */
export const ANCHO_MINIMO_LISTA = 260;
/** Ancho máximo de la explicación que se abre al lado de la lista. */
export const ANCHO_MAXIMO_EXPLICACION = 320;

const SEPARACION_EXPLICACION = 4;
const MARGEN_VENTANA = 8;

/** La explicación de la opción activa, fija, nace fuera de la vista hasta medirse. */
const ESTILO_EXPLICACION: CSSProperties = {
  position: "fixed",
  top: -9999,
  left: 0,
  zIndex: 10000,
  maxWidth: ANCHO_MAXIMO_EXPLICACION,
};

const CLASE_PANEL =
  "app-shell-surface app-dropdown-surface rounded-md border border-base-300 bg-base-100 p-2 text-sm text-base-content shadow-[0_20px_45px_rgba(15,23,42,0.20)]";

const SelectorTipoTransporte: FC<SelectorTipoTransporteProps> = ({
  valor,
  onCambiar,
  sugerido,
  deshabilitado = false,
  junto,
}) => {
  const base = useId();
  const idEtiqueta = `${base}-etiqueta`;
  const idLista = `${base}-lista`;
  const idLinea = `${base}-explicacion`;
  const idAyuda = `${base}-ayuda`;
  const idOpcion = (indice: number) => `${base}-opcion-${indice}`;
  const idDescripcion = (indice: number) => `${base}-descripcion-${indice}`;

  const elegida = opcionTransporte(valor);
  const indiceElegido = OPCIONES_TRANSPORTE.findIndex((o) => o.valor === elegida.valor);

  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(indiceElegido);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const botonAyudaRef = useRef<HTMLButtonElement>(null);
  const ayudaRef = useRef<HTMLDivElement>(null);
  const explicacionRef = useRef<HTMLDivElement>(null);

  const cerrarLista = useCallback(() => setAbierto(false), []);
  const cerrarAyuda = useCallback(() => {
    setAyudaAbierta(false);
    botonAyudaRef.current?.focus();
  }, []);
  const estiloLista = usePanelFlotante(abierto, botonRef, listaRef, cerrarLista, {
    anchoMinimo: ANCHO_MINIMO_LISTA,
  });

  // La explicación de la opción activa se coloca AL LADO de la lista, a la altura de esa opción; si a la
  // derecha no cabe, a la izquierda. Se escribe en el elemento, como la posición de la lista.
  useLayoutEffect(() => {
    if (!abierto) return;
    const lista = listaRef.current;
    const explicacion = explicacionRef.current;
    const opcion = lista?.querySelector<HTMLElement>(`[data-indice="${activo}"]`);
    if (!lista || !explicacion || !opcion) return;
    const rl = lista.getBoundingClientRect();
    const ro = opcion.getBoundingClientRect();
    const ancho = Math.min(explicacion.offsetWidth || ANCHO_MAXIMO_EXPLICACION, ANCHO_MAXIMO_EXPLICACION);
    const cabeDerecha = rl.right + SEPARACION_EXPLICACION + ancho <= window.innerWidth - MARGEN_VENTANA;
    const left = cabeDerecha
      ? rl.right + SEPARACION_EXPLICACION
      : Math.max(MARGEN_VENTANA, rl.left - SEPARACION_EXPLICACION - ancho);
    Object.assign(explicacion.style, { top: `${Math.max(MARGEN_VENTANA, ro.top)}px`, left: `${left}px` });
  }, [abierto, activo]);
  const estiloAyuda = usePanelFlotante(ayudaAbierta, botonAyudaRef, ayudaRef, cerrarAyuda);

  const abrir = () => {
    if (deshabilitado) return;
    setActivo(indiceElegido);
    setAbierto(true);
  };

  const elegir = (indice: number) => {
    onCambiar(OPCIONES_TRANSPORTE[indice].valor);
    setAbierto(false);
    botonRef.current?.focus();
  };

  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (deshabilitado) return;
    const ultimo = OPCIONES_TRANSPORTE.length - 1;
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        if (!abierto) abrir();
        else setActivo((i) => Math.min(ultimo, i + 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        if (!abierto) abrir();
        else setActivo((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (abierto) {
          evento.preventDefault();
          setActivo(0);
        }
        break;
      case "End":
        if (abierto) {
          evento.preventDefault();
          setActivo(ultimo);
        }
        break;
      case "Enter":
      case " ":
        evento.preventDefault();
        if (abierto) elegir(activo);
        else abrir();
        break;
      case "Escape":
        if (abierto) {
          evento.preventDefault();
          setAbierto(false);
        }
        break;
      case "Tab":
        setAbierto(false);
        break;
      default:
        break;
    }
  };

  const sugerencia = textoSugerencia(valor, sugerido);
  const esPropiosMedios = elegida.valor === "PROPIOS_MEDIOS";

  return (
    <div className="flex flex-col">
      <div className="label flex-wrap whitespace-normal">
        <span id={idEtiqueta} className="label-text min-w-0">
          Transporte requerido<span className="text-error ml-1">*</span>
          {sugerencia && (
            <span className="ml-1 text-xs font-normal text-app-muted">{sugerencia}</span>
          )}
        </span>
        <Boton
          ref={botonAyudaRef}
          variante="enlace"
          tamano="sm"
          icono="informacion"
          aria-label="Qué significa cada opción de transporte"
          aria-haspopup="dialog"
          aria-expanded={ayudaAbierta}
          aria-controls={ayudaAbierta ? idAyuda : undefined}
          onClick={() => setAyudaAbierta((v) => !v)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
      <button
        ref={botonRef}
        type="button"
        role="combobox"
        className="select select-bordered shrink-0 text-left"
        style={{ minWidth: ANCHO_MINIMO_COMBO }}
        aria-labelledby={idEtiqueta}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-required="true"
        aria-describedby={idLinea}
        aria-activedescendant={abierto ? idOpcion(activo) : undefined}
        disabled={deshabilitado}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={alTeclear}
      >
        <span className="whitespace-nowrap">
          {elegida.nombre}
          {/* La opción que propone el formulario se marca en el combo y en la lista (2026-10-16). */}
          {elegida.valor === sugerido && (
            <span className="ml-1 text-xs text-app-muted">(sugerido)</span>
          )}
        </span>
      </button>
      {junto}
      </div>

      {/* (c) La explicación de lo elegido, siempre visible. Propios medios, en neutro. */}
      <p
        id={idLinea}
        className={`mt-1 text-xs ${esPropiosMedios ? "text-app-muted" : "text-base-content"}`}
      >
        {elegida.descripcion}
      </p>

      {abierto &&
        createPortal(
          <ul
            ref={listaRef}
            id={idLista}
            role="listbox"
            aria-labelledby={idEtiqueta}
            style={estiloLista}
            className={`${CLASE_PANEL} flex flex-col gap-1`}
          >
            {OPCIONES_TRANSPORTE.map((opcion, indice) => {
              const esActiva = indice === activo;
              const esElegida = opcion.valor === elegida.valor;
              return (
                <li
                  key={opcion.valor}
                  id={idOpcion(indice)}
                  data-indice={indice}
                  role="option"
                  aria-selected={esElegida}
                  aria-describedby={idDescripcion(indice)}
                  className={`cursor-pointer rounded-md px-2 py-1 ${esActiva ? "bg-primary/10" : ""}`}
                  onMouseEnter={() => setActivo(indice)}
                  onMouseDown={(evento) => evento.preventDefault()}
                  onClick={() => elegir(indice)}
                >
                  <span className={`whitespace-nowrap ${esElegida ? "font-semibold" : ""}`}>
                    {opcion.nombre}
                    {opcion.valor === sugerido && (
                      <span className="ml-1 text-xs font-normal text-app-muted">(sugerido)</span>
                    )}
                  </span>
                  {/* Para el lector de pantalla; la que se VE va al lado de la lista. */}
                  <span id={idDescripcion(indice)} className="sr-only">
                    {opcion.descripcion}
                  </span>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}

      {/* (a) La explicación de la opción activa (ratón y ↑/↓), al lado de la lista. */}
      {abierto &&
        createPortal(
          <div
            ref={explicacionRef}
            aria-hidden="true"
            data-explicacion-opcion=""
            style={ESTILO_EXPLICACION}
            className={`${CLASE_PANEL} text-xs`}
          >
            {OPCIONES_TRANSPORTE[activo]?.descripcion}
          </div>,
          document.body,
        )}

      {ayudaAbierta &&
        createPortal(
          <div
            ref={ayudaRef}
            id={idAyuda}
            role="dialog"
            aria-label="Opciones de transporte"
            style={estiloAyuda}
            className={`${CLASE_PANEL} max-w-sm`}
          >
            <ul className="flex flex-col gap-2">
              {OPCIONES_TRANSPORTE.map((opcion) => {
                const actual = opcion.valor === elegida.valor;
                return (
                  <li
                    key={opcion.valor}
                    aria-current={actual ? "true" : undefined}
                    className={`rounded-md px-2 py-1 ${actual ? "bg-primary/10" : ""}`}
                  >
                    <span className="font-semibold">{opcion.nombre}</span>
                    {actual && <span className="ml-1 text-xs">· opción actual</span>}
                    <span className="block text-xs text-app-muted">{opcion.descripcion}</span>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SelectorTipoTransporte;
