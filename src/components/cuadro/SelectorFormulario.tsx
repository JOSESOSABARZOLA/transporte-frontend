/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: SelectorFormulario.tsx
 * Responsabilidad: Elegir, desde la barra «FORMULARIO» de P-01, el formulario en el que se registra
 *                  (o al que se aporta personal), con buscador, grupos por dueño, «N hoy» y recientes.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06 · los propios desde el 24-AGO · los compartidos vuelven el 25-AGO ·
 *        selector único desde el 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SELECTOR, NO UNA REJILLA (2026-10-16, R10 del plan «registro-operativo-rediseno»). La rejilla
 * de botones crecía una fila con cada formulario nuevo. Ahora es una caja blanca con el formulario
 * elegido —punto de color, «N. NOMBRE», «N hoy»— que al abrirse ofrece un buscador (número, nombre o
 * código, sin tildes) y la lista agrupada por el departamento dueño. Al lado, los RECIENTES: los
 * últimos tres usados, sin el actual (`utils/selectorFormulario.util.ts`).
 *
 * DOS COSAS DISTINTAS, Y HAY QUE VERLAS LAS DOS (se conserva desde el 25-AGO):
 *   `ESCRITURA`  — el formulario es de su departamento. Se elige y se registra.
 *   `COMPARTIDO` — su departamento **aporta personal** a él. Se ofrece con el distintivo «Aporta
 *                  personal» y abre el formulario en esta misma pantalla (`onAportar`); sin ese
 *                  manejador queda apagado. `LECTURA` no se pinta (criterio del 24-AGO).
 *
 * NO ES UN CONTROL DE SEGURIDAD: `FormularioRolGuard` rechaza con 403 cualquier registro en un
 * formulario ajeno. Y NO DECIDE SI SE PUEDE CAMBIAR NI EXPLICA UNA LISTA VACÍA: las dos cosas son
 * de la página (si hay algo capturado pregunta antes de aplicar la elección; el aviso de «no
 * registra» sale de `avisoDeOfrecidos`).
 *
 * ACCESIBLE CON TECLADO. ↓/Enter/Espacio en la caja abren; el foco pasa al buscador, que es un
 * `combobox` sobre la lista (`aria-activedescendant`): ↓/↑ recorren, Enter elige, Escape cierra y
 * devuelve el foco a la caja. EL COLOR VIENE DEL SERVIDOR (regla 3) y nunca va solo (regla 6).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react";

import type { Formulario } from "../../interfaces/Formulario.ts";
import Boton from "../common/Boton.tsx";
import Iconos from "../common/Iconos.tsx";
import Insignia from "../common/Insignia.tsx";
import {
  agruparPorDueno,
  filtrarFormularios,
  formulariosOfrecidos,
} from "../../utils/selectorFormulario.util.ts";

type SelectorFormularioProps = {
  formularios: Formulario[];
  seleccionado: string | null;
  onSeleccionar: (codigo: string) => void;
  /**
   * Qué hacer con un formulario al que este departamento **aporta personal**. Va aparte de
   * `onSeleccionar` a propósito: seleccionar significa «voy a registrar aquí», y en un compartido
   * eso terminaría en 403. Sin esta función el compartido se ofrece apagado.
   */
  onAportar?: (codigo: string) => void;
  /** «N hoy» por `formulario.id`. Sin conteo (aún no llegó, o falló) no se pinta. */
  conteos?: Map<number, number> | null;
  /** Los recientes que se pintan junto a la caja (ya sin el actual). */
  recientes?: Formulario[];
  deshabilitado?: boolean;
};

/** El punto de color del formulario: decorativo, el nombre ya dice cuál es. */
const Punto: FC<{ color: string }> = ({ color }) => (
  <span
    aria-hidden="true"
    className="inline-block h-3 w-3 shrink-0 rounded-full border border-base-300"
    style={{ backgroundColor: color }}
  />
);

const textoHoy = (conteos: Map<number, number> | null | undefined, id: number) => {
  const total = conteos?.get(id);
  return total === undefined ? null : `${total} hoy`;
};

const SelectorFormulario: FC<SelectorFormularioProps> = ({
  formularios,
  seleccionado,
  onSeleccionar,
  onAportar,
  conteos,
  recientes = [],
  deshabilitado = false,
}) => {
  const idLista = useId();
  const idEtiqueta = useId();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0);
  const caja = useRef<HTMLButtonElement>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  const ofrecidos = useMemo(() => formulariosOfrecidos(formularios), [formularios]);
  const filtrados = useMemo(
    () => filtrarFormularios(ofrecidos, busqueda),
    [ofrecidos, busqueda],
  );
  const grupos = useMemo(() => agruparPorDueno(filtrados), [filtrados]);
  // El orden de recorrido con el teclado es el de los grupos, que puede no ser el del servidor.
  const enOrden = useMemo(() => grupos.flatMap((grupo) => grupo.formularios), [grupos]);

  const elegido = ofrecidos.find((formulario) => formulario.codigo === seleccionado);

  // Clic fuera cierra, sin devolver el foco: quien hizo clic fuera ya eligió dónde está.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  useEffect(() => {
    if (abierto) buscador.current?.focus();
  }, [abierto]);

  // Sin nada que ofrecer no se pinta la caja: la página lo explica (`avisoDeOfrecidos`).
  if (ofrecidos.length === 0) return null;

  const esInerte = (formulario: Formulario) =>
    formulario.acceso === "COMPARTIDO" && !onAportar;

  const abrir = () => {
    // Sin búsqueda, el recorrido es el de todos los ofrecidos agrupados: arranca en el elegido.
    setBusqueda("");
    const todos = agruparPorDueno(ofrecidos).flatMap((grupo) => grupo.formularios);
    setActivo(Math.max(0, todos.findIndex((formulario) => formulario.codigo === seleccionado)));
    setAbierto(true);
  };

  const cerrar = (devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) caja.current?.focus();
  };

  const elegir = (formulario: Formulario | undefined) => {
    if (!formulario || esInerte(formulario)) return;
    cerrar(true);
    if (formulario.codigo === seleccionado) return;
    if (formulario.acceso === "COMPARTIDO") onAportar?.(formulario.codigo);
    else onSeleccionar(formulario.codigo);
  };

  const alTeclearCaja = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      abrir();
    }
  };

  const alTeclearBuscador = (evento: KeyboardEvent<HTMLInputElement>) => {
    const ultimo = enOrden.length - 1;
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        setActivo((indice) => Math.min(ultimo, indice + 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        setActivo((indice) => Math.max(0, indice - 1));
        break;
      case "Enter":
        evento.preventDefault();
        elegir(enOrden[activo]);
        break;
      case "Escape":
        evento.preventDefault();
        cerrar(true);
        break;
      case "Tab":
        cerrar(false);
        break;
    }
  };

  const idOpcion = (formulario: Formulario) => `${idLista}-${formulario.codigo}`;
  const opcionActiva = enOrden[activo];
  const hoyElegido = elegido ? textoHoy(conteos, elegido.id) : null;

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
        <div ref={contenedor} className="relative w-full md:w-[29.5rem]">
          <span id={idEtiqueta} className="sr-only">
            Formulario
          </span>
          <button
            ref={caja}
            type="button"
            // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
            className="btn h-10 min-h-10 w-full justify-between gap-3 border border-base-300 bg-base-100 px-3 text-left font-semibold normal-case text-app-strong"
            aria-haspopup="listbox"
            aria-expanded={abierto}
            aria-labelledby={`${idEtiqueta} ${idLista}-valor`}
            disabled={deshabilitado}
            onClick={() => (abierto ? cerrar(false) : abrir())}
            onKeyDown={alTeclearCaja}
          >
            <span className="flex min-w-0 items-center gap-2">
              {elegido && <Punto color={elegido.colorFondo} />}
              <span id={`${idLista}-valor`} className="truncate">
                {elegido ? `${elegido.numero}. ${elegido.nombre}` : "Elija un formulario"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {hoyElegido && <Insignia variante="neutro">{hoyElegido}</Insignia>}
              <Iconos nombre="desplegar" />
            </span>
          </button>

          {abierto && (
            <div className="app-shell-surface absolute top-full left-0 z-30 mt-1 flex w-full flex-col gap-2 rounded-md border border-base-300 bg-base-100 p-2 text-sm shadow-[0_20px_45px_rgba(15,23,42,0.20)]">
              <input
                ref={buscador}
                type="text"
                role="combobox"
                aria-label="Buscar formulario por número, nombre o código"
                aria-controls={idLista}
                aria-expanded="true"
                aria-autocomplete="list"
                aria-activedescendant={opcionActiva ? idOpcion(opcionActiva) : undefined}
                className="input input-bordered input-sm w-full"
                placeholder="Buscar por número, nombre o código…"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setActivo(0);
                }}
                onKeyDown={alTeclearBuscador}
              />

              <div
                id={idLista}
                role="listbox"
                aria-label="Formularios"
                className="flex max-h-80 flex-col gap-2 overflow-y-auto"
              >
                {grupos.length === 0 && (
                  <p className="px-2 py-3 text-app-muted">Sin formularios con ese texto.</p>
                )}
                {grupos.map((grupo) => {
                  const idGrupo = `${idLista}-grupo-${grupo.dueno}`;
                  return (
                    <div key={grupo.dueno} role="group" aria-labelledby={idGrupo}>
                      <p
                        id={idGrupo}
                        className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-app-muted"
                      >
                        {grupo.etiqueta}
                      </p>
                      {grupo.formularios.map((formulario) => {
                        const esElegido = formulario.codigo === seleccionado;
                        const aporta = formulario.acceso === "COMPARTIDO";
                        const inerte = esInerte(formulario);
                        const hoy = textoHoy(conteos, formulario.id);
                        return (
                          <div
                            key={formulario.codigo}
                            id={idOpcion(formulario)}
                            role="option"
                            aria-selected={esElegido}
                            aria-disabled={inerte || undefined}
                            title={
                              aporta
                                ? `${formulario.nombre}. Su departamento aporta personal a este formulario; los operativos los registra el departamento dueño. Abre los operativos del día para asignar a su gente.`
                                : formulario.nombre
                            }
                            className={`flex items-center gap-2 rounded-md px-2 py-2 ${
                              inerte ? "cursor-not-allowed text-app-disabled" : "cursor-pointer"
                            } ${formulario === opcionActiva ? "bg-primary/10" : ""} ${
                              esElegido ? "font-semibold" : ""
                            }`}
                            onMouseEnter={() => setActivo(enOrden.indexOf(formulario))}
                            // `mousedown` + `preventDefault`: el buscador no pierde el foco antes de elegir.
                            onMouseDown={(evento) => evento.preventDefault()}
                            onClick={() => elegir(formulario)}
                          >
                            <Punto color={formulario.colorFondo} />
                            <span className="min-w-0 flex-1">
                              {formulario.numero}. {formulario.nombre}
                            </span>
                            {aporta && <Insignia variante="neutro">Aporta personal</Insignia>}
                            {hoy && <span className="shrink-0 text-xs text-app-muted">{hoy}</span>}
                            {esElegido && <Iconos nombre="check" />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RECIENTES (R5): los últimos tres usados, sin el actual. Un clic cambia, como la lista. */}
        {recientes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Formularios recientes">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-content">
              Recientes
            </span>
            {recientes.map((formulario) => (
              <Boton
                key={formulario.codigo}
                tamano="sm"
                enBarraOscura
                title={`${formulario.numero}. ${formulario.nombre}`}
                deshabilitado={deshabilitado || esInerte(formulario)}
                onClick={() => elegir(formulario)}
              >
                <Punto color={formulario.colorFondo} />
                {formulario.numero} · {formulario.codigo}
              </Boton>
            ))}
          </div>
        )}
    </div>
  );
};

export default SelectorFormulario;
