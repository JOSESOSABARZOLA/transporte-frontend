/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: PanelAreasFormulario.tsx
 * Responsabilidad: Elegir de qué áreas de personal se nutre un formulario, en una barra plegable.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-27
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO ES UN CATÁLOGO DE FILAS, ES UN CONJUNTO. Las opciones son cuatro y fijas: lo que se
 * administra es cuáles admite este formulario, y se guarda el conjunto ENTERO (con altas y bajas
 * sueltas existiría el instante en que el formulario se queda sin ninguna, y el selector de
 * personal de P-01 quedaría vacío sin explicarlo). El servidor exige al menos una y rechaza
 * retirar un área con personal ya asignado, nombrando los operativos (regla 7).
 *
 * BARRA PLEGABLE (rediseño de P-08, 2026-10-12). Se configura una vez y se consulta muchas: por
 * eso arranca PLEGADA y dice en una línea lo que hay («1 de 4 · Unidad de Operativos»). Al
 * desplegar, las áreas son CHIPS que se marcan (✓) o se agregan (+): el signo y el `aria-pressed`
 * dicen el estado, no el color (regla 6). «Cambios sin guardar» aparece en cuanto difiere de lo
 * guardado, y la página lo usa para preguntar antes de cambiar de formulario.
 *
 * LO QUE SE VE ES LA DESCRIPCIÓN, LO QUE VIAJA ES EL CÓDIGO: `NOMBRE_AREA` es la única traducción.
 * EL CUPO COMPARTIDO no se toca desde aquí (`esCompartida`, PER-06): se muestra para que quien
 * retire esa área sepa lo que se lleva por delante.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useId, useMemo, useState, type FC } from "react";

import Boton from "../common/Boton.tsx";
import Iconos from "../common/Iconos.tsx";
import type { AreaFormulario, AreaPersonal } from "../../interfaces/Formulario.ts";
import { NOMBRE_AREA } from "../../utils/personal.util.ts";

/** Las cuatro áreas, en el orden en que las nombra el enumerado del servidor. */
const TODAS = Object.keys(NOMBRE_AREA) as AreaPersonal[];

const firmaDe = (areas: AreaPersonal[]) => [...areas].sort().join(",");

type PanelAreasFormularioProps = {
  /** Las que el formulario admite hoy, con su marca de compartida. */
  areas: AreaFormulario[];
  cargando: boolean;
  procesando: boolean;
  onGuardar: (areas: AreaPersonal[]) => void;
  /** Avisa a la página si hay cambios sin guardar (para preguntar antes de cambiar de formulario). */
  onCambiosPendientes?: (hay: boolean) => void;
  /**
   * Arranca desplegada (2026-10-13): al llegar desde «Formularios del cuadro» con
   * `?areas=abierto`, que es justo para cambiar las áreas. Solo cuenta al montar.
   */
  desplegadoInicial?: boolean;
};

const PanelAreasFormulario: FC<PanelAreasFormularioProps> = ({
  areas,
  cargando,
  procesando,
  onGuardar,
  onCambiosPendientes,
  desplegadoInicial = false,
}) => {
  const idCuerpo = useId();
  const [desplegado, setDesplegado] = useState(desplegadoInicial);

  /*
    SE AJUSTA DURANTE EL RENDER, NO EN UN EFECTO: lo elegido se iguala a lo guardado cada vez que
    eso cambia (otro formulario, o la vuelta del servidor tras guardar). Es el patrón que React
    documenta para ajustar estado a las props sin un render de más.
  */
  const firma = firmaDe(areas.map((fila) => fila.area));
  const [vista, setVista] = useState(firma);
  const [elegidas, setElegidas] = useState<AreaPersonal[]>(() =>
    areas.map((fila) => fila.area),
  );
  if (vista !== firma) {
    setVista(firma);
    setElegidas(areas.map((fila) => fila.area));
  }

  const compartidas = useMemo(
    () => areas.filter((fila) => fila.esCompartida).map((fila) => fila.area),
    [areas],
  );

  const hayCambios = firmaDe(elegidas) !== firma;

  useEffect(() => {
    onCambiosPendientes?.(hayCambios);
  }, [hayCambios, onCambiosPendientes]);

  const alternar = (area: AreaPersonal) =>
    setElegidas((previas) =>
      previas.includes(area)
        ? previas.filter((una) => una !== area)
        : [...previas, area],
    );

  const marcadas = TODAS.filter((area) => elegidas.includes(area));
  const ocupado = procesando || cargando;

  return (
    <section
      aria-label="Áreas de personal admitidas"
      className="app-shell-surface rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
        <h2 className="text-app-strong text-sm font-semibold">
          Áreas de personal admitidas
        </h2>
        <span className="badge badge-ghost badge-sm">
          {marcadas.length} de {TODAS.length}
        </span>
        <span className="text-app-muted min-w-0 flex-1 text-sm">
          {marcadas.length === 0
            ? "Ninguna área: el formulario no ofrecerá personal"
            : marcadas.map((area) => NOMBRE_AREA[area]).join(", ")}
        </span>
        {hayCambios && (
          <span
            className="badge badge-warning badge-sm"
            role="status"
          >
            Cambios sin guardar
          </span>
        )}
        <Boton
          variante="enlace"
          tamano="sm"
          expandido={desplegado}
          aria-controls={idCuerpo}
          onClick={() => setDesplegado((antes) => !antes)}
        >
          {desplegado ? "Ocultar" : "Cambiar"}
          <span
            className={`inline-flex transition-transform ${desplegado ? "rotate-180" : ""}`}
          >
            <Iconos nombre="desplegar" />
          </span>
        </Boton>
      </div>

      {desplegado && (
        <div
          id={idCuerpo}
          className="flex flex-col gap-3 border-t border-base-300 px-5 py-3"
        >
          <p className="text-app-muted text-sm">
            Al registrar un operativo de este formulario solo se ofrece personal de
            las áreas marcadas.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {TODAS.map((area) => {
              const marcada = elegidas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  aria-pressed={marcada}
                  disabled={ocupado}
                  onClick={() => alternar(area)}
                  // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                  className={`btn btn-sm rounded-full ${
                    marcada ? "btn-outline btn-primary" : "btn-ghost border-dashed border-base-300"
                  }`}
                >
                  <span aria-hidden="true">{marcada ? "✓" : "+"}</span>
                  {NOMBRE_AREA[area]}
                  {compartidas.includes(area) && (
                    <span className="badge badge-ghost badge-xs">
                      Aporta el departamento invitado
                    </span>
                  )}
                </button>
              );
            })}

            <Boton
              variante="primario"
              tamano="sm"
              className="ml-auto"
              cargando={procesando}
              deshabilitado={ocupado}
              motivoDeshabilitado={
                elegidas.length === 0
                  ? "Elija al menos un área."
                  : !hayCambios
                    ? "Sin cambios."
                    : null
              }
              onClick={() => onGuardar(elegidas)}
            >
              {procesando ? "Guardando…" : "Guardar áreas"}
            </Boton>
          </div>

          {/* El estado se lee sin color: un botón apagado sin explicación es lo que se evita. */}
          {elegidas.length === 0 && (
            <p
              className="text-sm text-error"
              role="status"
            >
              Marque al menos un área: sin ninguna, el selector de personal de este
              formulario queda vacío y no lo explica.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default PanelAreasFormulario;
