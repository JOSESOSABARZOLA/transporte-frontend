/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: SelectorFormularioCabecera.tsx
 * Responsabilidad: Elegir, desde la cabecera de P-08, el formulario que se está configurando.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUSTITUYE A `SelectorFormularioAdmin` (un `<select>` sin color). Rediseño del 2026-10-12.
 *
 * Todo lo que se ve debajo depende de esta elección, así que va arriba y destacado. Desde el
 * 2026-10-24 va BAJO EL TÍTULO de la página: rótulo en azul y mayúsculas, caja de 44 px con borde
 * azul de 2 px y, pegado a su izquierda, el CUADRO del formulario (`CuadroFormulario`: su color y su
 * número). El color lo entrega el servidor (`colorFondo`, regla 3) y nunca va solo: el número y el
 * nombre se escriben siempre (regla 6). Se usa `colorFondo` porque el acento es negro en los diez.
 *
 * ES UN LISTBOX DE ARIA, NO UN `<select>`: un `<option>` no puede llevar la barrita de color.
 * Teclado: ↓/↑ abren y recorren, Inicio/Fin, Enter o Espacio eligen, Escape cierra y devuelve el
 * foco al botón. El activo se anuncia con `aria-activedescendant`.
 *
 * NO DECIDE SI SE PUEDE CAMBIAR. Si hay cambios de áreas sin guardar, la página pregunta antes de
 * aplicar la elección: aquí solo se avisa de lo que se eligió.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react";

import Iconos from "../common/Iconos.tsx";
import CuadroFormulario from "../formularios/CuadroFormulario.tsx";
import type { Formulario } from "../../interfaces/Formulario.ts";

type SelectorFormularioCabeceraProps = {
  formularios: Formulario[];
  seleccionado: string;
  onSeleccionar: (codigo: string) => void;
  deshabilitado?: boolean;
};

const SelectorFormularioCabecera: FC<SelectorFormularioCabeceraProps> = ({
  formularios,
  seleccionado,
  onSeleccionar,
  deshabilitado = false,
}) => {
  const idEtiqueta = useId();
  const idLista = useId();
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const boton = useRef<HTMLButtonElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  const indiceElegido = Math.max(
    0,
    formularios.findIndex((f) => f.codigo === seleccionado),
  );
  const elegido = formularios[indiceElegido];

  // Clic fuera cierra, sin devolver el foco: quien hizo clic fuera ya eligió dónde está.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const abrir = (indice = indiceElegido) => {
    setActivo(indice);
    setAbierto(true);
  };

  const elegir = (indice: number) => {
    const formulario = formularios[indice];
    setAbierto(false);
    boton.current?.focus();
    if (formulario && formulario.codigo !== seleccionado) {
      onSeleccionar(formulario.codigo);
    }
  };

  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>) => {
    const ultimo = formularios.length - 1;
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(evento.key)) {
        evento.preventDefault();
        abrir();
      }
      return;
    }
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        setActivo((i) => Math.min(ultimo, i + 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case "Home":
        evento.preventDefault();
        setActivo(0);
        break;
      case "End":
        evento.preventDefault();
        setActivo(ultimo);
        break;
      case "Enter":
      case " ":
        evento.preventDefault();
        elegir(activo);
        break;
      case "Escape":
        evento.preventDefault();
        setAbierto(false);
        break;
      case "Tab":
        setAbierto(false);
        break;
    }
  };

  const idOpcion = (indice: number) => `${idLista}-${indice}`;

  return (
    <div
      ref={contenedor}
      className="relative flex w-full flex-col gap-1.5 md:w-auto"
    >
      <span
        id={idEtiqueta}
        className="text-xs font-bold uppercase tracking-wide text-[var(--app-msg-info-fg)]"
      >
        Formulario que está configurando
      </span>
      <span className="flex items-center gap-2">
        {elegido && (
          <CuadroFormulario numero={elegido.numero} colorFondo={elegido.colorFondo} tamano="lg" />
        )}
        <button
          ref={boton}
          type="button"
          // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
          className="btn h-11 w-full justify-between gap-3 rounded-lg border-2 border-[color:var(--app-msg-info-fg)] bg-base-100 text-left text-[0.9375rem] font-bold text-secondary shadow-sm md:w-[420px]"
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-labelledby={`${idEtiqueta} ${idLista}-valor`}
          aria-controls={abierto ? idLista : undefined}
          aria-activedescendant={abierto ? idOpcion(activo) : undefined}
          disabled={deshabilitado || formularios.length === 0}
          onClick={() => (abierto ? setAbierto(false) : abrir())}
          onKeyDown={alTeclear}
        >
          <span
            id={`${idLista}-valor`}
            className="min-w-0 truncate"
          >
            {elegido ? `${elegido.numero}. ${elegido.nombre}` : "Cargando formularios…"}
          </span>
          <Iconos nombre="desplegar" />
        </button>
      </span>

      {abierto && (
        <ul
          id={idLista}
          role="listbox"
          aria-labelledby={idEtiqueta}
          className="app-shell-surface absolute top-full left-0 z-30 mt-1 w-full rounded-md border border-base-300 bg-base-100 p-1 text-sm shadow-[0_20px_45px_rgba(15,23,42,0.20)]"
        >
          {formularios.map((formulario, indice) => {
            const esElegido = formulario.codigo === seleccionado;
            return (
              <li
                key={formulario.codigo}
                id={idOpcion(indice)}
                role="option"
                aria-selected={esElegido}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ${
                  indice === activo ? "bg-primary/10" : ""
                } ${esElegido ? "font-semibold text-primary" : ""}`}
                onMouseEnter={() => setActivo(indice)}
                // `mousedown` + `preventDefault` evita que el botón pierda el foco antes de elegir.
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => elegir(indice)}
              >
                <CuadroFormulario numero={formulario.numero} colorFondo={formulario.colorFondo} />
                <span className="min-w-0 flex-1">
                  {formulario.numero}. {formulario.nombre}
                </span>
                {esElegido && <Iconos nombre="check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SelectorFormularioCabecera;
