/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo / Mis operativos
 * Archivo: RepartoCarga.tsx
 * Responsabilidad: Mostrar —y dejar agregar/quitar— el reparto de carga del personal del formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-01
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO EL CONTENIDO DEL REPARTO, NO EL CONTENEDOR. Lo envuelve un `DrawerLateral` (P-01 alta) o una
 * vista dentro del cajón de edición (P-01 propio / P-02). Reusa los `candidatos` que ya trajo
 * `GET /personal/elegible` con sus dos señales advisory —FATIGA (seguridad, absoluta) y EQUIDAD
 * (reparto, frente a la CUOTA JUSTA = media del grupo)— y NO recalcula nada ni pide al servidor.
 *
 * Reemplaza la tabla de columnas (Unidad/Índice/Fatiga/Reparto/Desviación) por una fila con BARRA:
 * el índice sobre una escala común, con la marca de la cuota, y el estado SIEMPRE en texto bajo la
 * barra (regla 6: nunca solo color).
 *
 * EL COLOR DE LA BARRA ES EL SEMÁFORO DE FATIGA (2026-10-01), los MISMOS tokens (`TONO_CARGA`) que el badge «Carga
 * X» de la lista: verde=baja, naranja=media, rojo=alta. Así una persona se ve del mismo color aquí y
 * en la lista. La POSICIÓN frente a la cuota NO se comunica con color —se lee con la marca vertical
 * de la cuota y el texto bajo la barra—, y los CONTEOS de las tarjetas y el texto «bajo/en/sobre su
 * parte» salen de `clasificarReparto`. Solo el ANCHO de la barra va en `style` inline (dato).
 *
 * AGREGAR/QUITAR NO DECIDE AQUÍ el modo de guardado: llama a `onAgregar`/`onQuitar`, que la pantalla
 * conecta a su estado (borrador en el alta, diferido en la edición, inmediato en el aporte). El
 * `modo` solo cambia los textos (franja informativa, rótulo del botón y de los grupos).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, type FC } from "react";

import {
  nombreDePersona,
  type PersonaElegible,
} from "../../interfaces/Personal.ts";
import {
  clasificarReparto,
  NOMBRE_AREA,
  TONO_CARGA,
  type ClaseReparto,
} from "../../utils/personal.util.ts";
import type { NivelFatiga } from "../../interfaces/Personal.ts";
import Boton from "../common/Boton.tsx";
import EtiquetaCarga from "../common/EtiquetaCarga.tsx";

/**
 * Cómo se guarda lo que se agrega/quita, SOLO para el texto (las acciones las resuelve la pantalla):
 *   · borrador  (P-01 alta): pasa al formulario y se registra con «Registrar operativo».
 *   · diferido  (edición P-01/P-02): se aplica al «Guardar cambios».
 *   · inmediato (aporte): se guarda al instante.
 */
export type ModoReparto = "borrador" | "diferido" | "inmediato";

type RepartoCargaProps = {
  /** Mismo listado que alimenta el selector; se leen sus señales ya calculadas. */
  personas: PersonaElegible[];
  /** Cuota justa del grupo (la misma para todos). */
  cuota: number | undefined;
  /** Ids ya agregados/asignados a este operativo. */
  idsAgregados: number[];
  onAgregar: (id: number) => void;
  onQuitar: (id: number) => void;
  modo: ModoReparto;
};

/** «+3.3» / «−6.4» / «0»: el signo hace ver de un lado quién sobra y quién falta de su parte. */
const conSigno = (valor: number): string =>
  valor > 0 ? `+${valor}` : String(valor);

/** La fatiga en una palabra, para el tooltip: «fatiga alta». */
const PALABRA_FATIGA: Record<NivelFatiga, string> = {
  VERDE: "baja",
  AMBAR: "media",
  ROJO: "alta",
};

/** «1 operativo» / «N operativos»: el plural se escribe bien, no «1 operativos». */
const textoOperativos = (cantidad: number): string =>
  `${cantidad} ${cantidad === 1 ? "operativo" : "operativos"}`;

/** El estado de equidad en palabras, con el número de desviación cuando corresponde. */
const textoEquidad = (persona: PersonaElegible, clase: ClaseReparto): string => {
  if (clase === "en") return "en su parte";
  const lado = clase === "bajo" ? "bajo su parte" : "sobre su parte";
  return persona.desviacionCarga !== undefined
    ? `${conSigno(persona.desviacionCarga)} ${lado}`
    : lado;
};

/**
 * Renglón de texto bajo la barra: «Índice 25 · +11.5 sobre su parte». La fatiga YA NO va aquí —vive
 * en el badge «Carga X» de la izquierda—; aquí solo el índice y la posición frente a la cuota.
 */
const detalleDeCarga = (persona: PersonaElegible, clase: ClaseReparto): string => {
  const equidad = textoEquidad(persona, clase);
  return equidad
    ? `Índice ${persona.indiceCarga} · ${equidad}`
    : `Índice ${persona.indiceCarga}`;
};

/** Tooltip completo: «<nombre> · fatiga <x> · índice <n> · cuota <c> · <desviación>». */
const tooltipDeCarga = (
  persona: PersonaElegible,
  clase: ClaseReparto,
  cuota: number | undefined,
): string => {
  const partes = [nombreDePersona(persona)];
  if (persona.nivelFatiga)
    partes.push(`fatiga ${PALABRA_FATIGA[persona.nivelFatiga]}`);
  partes.push(`índice ${persona.indiceCarga}`);
  if (cuota !== undefined) partes.push(`cuota ${cuota}`);
  const equidad = textoEquidad(persona, clase);
  if (equidad) partes.push(equidad);
  return partes.join(" · ");
};

const RepartoCarga: FC<RepartoCargaProps> = ({
  personas,
  cuota,
  idsAgregados,
  onAgregar,
  onQuitar,
  modo,
}) => {
  const esBorrador = modo === "borrador";
  const rotuloAgregar = esBorrador ? "+ Agregar" : "+ Asignar";
  const rotuloChipAgregado = esBorrador ? "Agregado" : "Asignado aquí";

  const {
    disponibles,
    agregados,
    noDisponibles,
    escala,
    bajo,
    en,
    sobre,
    unidadUnica,
  } = useMemo(() => {
    const conCarga = personas.filter(
      (persona) => persona.indiceCarga !== undefined,
    );
    const agregadosSet = new Set(idsAgregados);
    // Si todas las personas son de la misma unidad, la unidad no se repite en cada fila.
    const unidadUnica =
      new Set(conCarga.map((persona) => persona.area)).size <= 1;

      const disponibles = conCarga
        .filter((persona) => persona.elegible && !agregadosSet.has(persona.id))
        // Menor carga arriba: los mejores candidatos para repartir (como el selector).
        .slice()
        .sort((a, b) => (a.indiceCarga ?? 0) - (b.indiceCarga ?? 0));
      const agregados = conCarga.filter((persona) =>
        agregadosSet.has(persona.id),
      );
      const noDisponibles = conCarga.filter(
        (persona) => !persona.elegible && !agregadosSet.has(persona.id),
      );

      // Escala común para todas las barras: el máximo entre índices y cuota, con 10 % de aire.
      const maximo = Math.max(
        cuota ?? 0,
        ...conCarga.map((persona) => persona.indiceCarga ?? 0),
      );
      const escala = maximo > 0 ? maximo * 1.1 : 1;

      // Conteos con la MISMA clasificación que colorea la barra: los tres suman el total.
      let bajo = 0;
      let en = 0;
      let sobre = 0;
      for (const persona of conCarga) {
        const clase = clasificarReparto(
          persona.indiceCarga,
          cuota,
          persona.nivelEquidad,
        );
        if (clase === "bajo") bajo += 1;
        else if (clase === "sobre") sobre += 1;
        else en += 1;
      }

      return {
        disponibles,
        agregados,
        noDisponibles,
        escala,
        bajo,
        en,
        sobre,
        unidadUnica,
      };
    }, [personas, idsAgregados, cuota]);

  const hayCarga =
    disponibles.length + agregados.length + noDisponibles.length > 0;

  const cuotaPct =
    cuota !== undefined ? Math.min(100, (cuota / escala) * 100) : null;

  /** Una fila de persona: nombre + chips a la izquierda, barra al centro, acción a la derecha. */
  const Fila = (
    persona: PersonaElegible,
    variante: "disponible" | "agregado" | "noDisponible",
  ) => {
    const indice = persona.indiceCarga ?? 0;
    const anchoPct = Math.min(100, (indice / escala) * 100);
    const clase = clasificarReparto(
      persona.indiceCarga,
      cuota,
      persona.nivelEquidad,
    );
    return (
      <li
        key={persona.id}
        className="flex flex-wrap items-center gap-3 px-1 py-2 sm:flex-nowrap"
      >
        {/* IZQUIERDA (~210px): nombre (hasta 2 líneas, sin ellipsis), operativos y chips. */}
        <div className="w-full min-w-0 sm:w-52 sm:shrink-0">
          <p className="break-words font-medium">{nombreDePersona(persona)}</p>
          <p className="text-xs text-app-muted">
            {textoOperativos(persona.operativosAsignados ?? 0)}
            {!unidadUnica && persona.area
              ? ` · ${NOMBRE_AREA[persona.area]}`
              : ""}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {/* Badge de fatiga = el MISMO de la lista; da el color de la barra en palabras. */}
            {persona.nivelFatiga && (
              <EtiquetaCarga nivel={persona.nivelFatiga} />
            )}
            {persona.sugerido && (
              <span className="badge badge-primary badge-sm whitespace-nowrap">
                Sugerido
              </span>
            )}
            {variante === "agregado" && (
              <span className="badge badge-ghost badge-sm whitespace-nowrap">
                {rotuloChipAgregado}
              </span>
            )}
          </div>
        </div>

        {/* CENTRO: barra con la marca de la cuota + el estado en texto debajo. */}
        <div className="min-w-0 flex-1">
          <div
            className="relative h-2.5 w-full rounded-full bg-base-200"
            title={tooltipDeCarga(persona, clase, cuota)}
          >
            <div
              className={`absolute left-0 top-0 h-full rounded-full ${
                persona.nivelFatiga
                  ? TONO_CARGA[persona.nivelFatiga]
                  : "bg-base-content/40"
              }`}
              style={{ width: `${anchoPct}%` }}
            />
            {cuotaPct !== null && (
              <div
                className="absolute top-0 h-full w-0.5 bg-base-content/60"
                style={{ left: `${cuotaPct}%` }}
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-1 text-xs text-app-muted">
            {detalleDeCarga(persona, clase)}
          </p>
          {variante === "noDisponible" && persona.motivo && (
            <p className="mt-0.5 text-xs text-app-muted">
              No disponible: {persona.motivo}
            </p>
          )}
        </div>

        {/* DERECHA: agregar/quitar (outline); los no disponibles no tienen botón. */}
        <div className="flex w-full justify-end sm:w-24 sm:shrink-0">
          {variante === "disponible" && (
            <Boton variante="acento" tamano="sm" onClick={() => onAgregar(persona.id)}>
              {rotuloAgregar}
            </Boton>
          )}
          {variante === "agregado" && (
            <Boton variante="peligro" tamano="sm" onClick={() => onQuitar(persona.id)}>
              Quitar
            </Boton>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* FRANJA INFORMATIVA SEGÚN EL MODO (neutra, no lila). */}
      <div
        className="rounded-box border border-base-300 bg-base-200 px-3 py-2"
        role="status"
      >
        <span className="text-xs">
          {modo === "borrador"
            ? "Lo que agregue aquí pasa al formulario y se registra con «Registrar operativo»."
            : modo === "diferido"
              ? "Los cambios se aplican al pulsar «Guardar cambios»."
              : "Se guarda al instante."}
        </span>
      </div>

      {/* 4 TARJETAS DE RESUMEN: los tres conteos suman el total de personas con carga. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-box border border-base-300 p-3">
          <p className="text-xs text-app-muted">Cuota justa</p>
          <p className="text-lg font-semibold">{cuota ?? "—"}</p>
        </div>
        <div className="rounded-box border border-base-300 p-3">
          <p className="text-xs text-app-muted">Bajo su parte</p>
          <p className="text-lg font-semibold">{bajo}</p>
          <p className="text-xs text-app-muted">pueden recibir más</p>
        </div>
        <div className="rounded-box border border-base-300 p-3">
          <p className="text-xs text-app-muted">En su parte</p>
          <p className="text-lg font-semibold">{en}</p>
        </div>
        <div className="rounded-box border border-base-300 p-3">
          <p className="text-xs text-app-muted">Sobre su parte</p>
          <p className="text-lg font-semibold">{sobre}</p>
          <p className="text-xs text-app-muted">ya con carga de más</p>
        </div>
      </div>

      {/* LEYENDA: el COLOR es la fatiga (muestras en barra); la cuota, la marca vertical. Regla 6. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-muted">
        <span className="font-medium text-base-content">Color = fatiga:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-5 rounded-full bg-success" />
          baja
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-5 rounded-full bg-warning" />
          media
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-5 rounded-full bg-error" />
          alta
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-0.5 bg-base-content/60" />
          cuota justa{cuota !== undefined ? ` (${cuota})` : ""}
        </span>
      </div>

      {!hayCarga ? (
        <p className="px-1 py-2 text-sm text-app-muted">
          Todavía no hay carga calculada para este personal.
        </p>
      ) : (
        <>
          {/* DISPONIBLES, de menor a mayor carga (un grupo vacío no se muestra). */}
          {disponibles.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-base-content">
                  Disponibles ({disponibles.length})
                </p>
                <span className="text-xs text-app-muted">
                  Ordenados de menor a mayor carga
                </span>
              </div>
              <ul className="divide-y divide-base-200 rounded-box border border-base-300">
                {disponibles.map((persona) => Fila(persona, "disponible"))}
              </ul>
            </>
          )}

          {/* AGREGADOS (P-01) o ASIGNADOS/NO DISPONIBLES (edición). */}
          {esBorrador
            ? agregados.length + noDisponibles.length > 0 && (
                <>
                  {agregados.length > 0 && (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-base-content">
                          Agregados a este operativo ({agregados.length})
                        </p>
                        <span className="text-xs text-app-muted">
                          Sin registrar todavía
                        </span>
                      </div>
                      <ul className="divide-y divide-base-200 rounded-box border border-base-300">
                        {agregados.map((persona) => Fila(persona, "agregado"))}
                      </ul>
                    </>
                  )}
                  {noDisponibles.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-base-content">
                        No disponibles ({noDisponibles.length})
                      </p>
                      <ul className="divide-y divide-base-200 rounded-box border border-base-300">
                        {noDisponibles.map((persona) =>
                          Fila(persona, "noDisponible"),
                        )}
                      </ul>
                    </>
                  )}
                </>
              )
            : agregados.length + noDisponibles.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-base-content">
                    Asignados aquí o no disponibles (
                    {agregados.length + noDisponibles.length})
                  </p>
                  <ul className="divide-y divide-base-200 rounded-box border border-base-300">
                    {agregados.map((persona) => Fila(persona, "agregado"))}
                    {noDisponibles.map((persona) =>
                      Fila(persona, "noDisponible"),
                    )}
                  </ul>
                </>
              )}
        </>
      )}

      {/* NOTA AL PIE. */}
      <p className="text-xs text-app-muted">
        Índice = carga acumulada de la semana. La cuota justa es la parte que le
        toca a cada persona del grupo.
      </p>
    </div>
  );
};

export default RepartoCarga;
