/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (línea de tiempo por conductor)
 * Archivo: LineaConductores.tsx
 * Responsabilidad: La línea de tiempo de los conductores del día: regla horaria, una fila por
 *                  conductor (con sus horas libres) y la leyenda.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ES SOLO LA VISTA. Sale de la antigua `LineaTiempoTransporte`, que además tenía KPIs, «Por cubrir»,
 * libres, optimizador y fin del día: todo eso vive ahora en los pasos de «Planificar el día». Aquí
 * entra la planificación ya leída y salen los clics (tramo, hoja de ruta, operación del vehículo).
 *
 * QUIÉN APARECE. Los conductores que trabajan hoy (turno, activados o con tramos) y, si la opción
 * «Usar conductores de libre» está activa, también los de libre (banda con borde discontinuo).
 * Nunca los ausentes.
 *
 * EL ANCHO POR HORA SALE DEL CONTENEDOR (2026-10-08). Se mide con `ResizeObserver` (del navegador,
 * sin librerías) y `anchoDeLinea` reparte la jornada en el ancho disponible: 06H00–02H00 cabe sin
 * scroll horizontal desde 1280 px; solo en pantallas angostas la pista se fija al mínimo legible y
 * se desplaza. Las columnas y anchos van en línea porque son geometría calculada, no estilo.
 *
 * LAS HORAS LIBRES LLEGAN HECHAS (2026-10-14): `GET /transporte/huecos/:fecha`. Si esa consulta no
 * responde, la línea se dibuja igual, sin ellas.
 */

import { useEffect, useRef, useState, type FC } from "react";

import FilaConductorLinea from "./FilaConductorLinea.tsx";
import BotonEnlace from "../../common/BotonEnlace.tsx";
import type { ConductorJornada, RespuestaHuecos } from "../../../interfaces/JornadaDaf.ts";
import type { Planificacion, TramoPlanificado } from "../../../interfaces/Planificacion.ts";
import {
  anchoDeLinea,
  desplazamientoDeRotulo,
  ejeDeLinea,
  franjaEnLinea,
  fundirCompartidos,
  marcasHorarias,
  porcentajeEnEje,
  visibleEnLinea,
  type TablaTraslados,
} from "../../../utils/lineaTiempo.util.ts";

type LineaConductoresProps = {
  fecha: string;
  plan: Planificacion;
  /** Del resumen: placa y avisos de cada conductor. */
  conductores: ConductorJornada[];
  /** Horas libres del día (servidor). `null` mientras cargan o si no se pudieron leer. */
  huecos?: RespuestaHuecos | null;
  tabla: TablaTraslados | null;
  /** Con «Usar conductores de libre», también se ven los de libre sin tramos. */
  incluirLibres: boolean;
  exclusivos: ReadonlySet<number>;
  soloLectura: boolean;
  onTramo: (tramo: TramoPlanificado) => void;
  onHojaRuta: (vehiculoId: number) => void;
  onOperacion: (vehiculoId: number, conductorId: number) => void;
  onQuitarActivacion: (conductorId: number) => void;
};

const LineaConductores: FC<LineaConductoresProps> = ({
  fecha,
  plan,
  conductores,
  huecos = null,
  tabla,
  incluirLibres,
  exclusivos,
  soloLectura,
  onTramo,
  onHojaRuta,
  onOperacion,
  onQuitarActivacion,
}) => {
  const delResumen = new Map(conductores.map((c) => [c.id, c]));
  const huecosDe = new Map(
    (huecos?.conductores ?? []).map((c) => [c.conductorId, c.huecos]),
  );
  const visibles = plan.conductores.filter((c) =>
    visibleEnLinea(c, plan.tramos, incluirLibres),
  );
  const eje = ejeDeLinea(
    [
      ...plan.tramos.map((t) => franjaEnLinea(t.horaInicio, t.horaFin, plan.inicioJornada)),
      ...plan.operativos.map((o) => franjaEnLinea(o.horaInicio, o.horaFin, plan.inicioJornada)),
    ],
    plan.inicioJornada,
  );
  const marcas = marcasHorarias(plan.inicioJornada, 3, eje);

  // Ancho del contenedor; 0 mientras no se mide (o sin `ResizeObserver`, como en las pruebas).
  const refContenedor = useRef<HTMLDivElement>(null);
  const [anchoContenedor, setAnchoContenedor] = useState(0);
  useEffect(() => {
    const nodo = refContenedor.current;
    if (!nodo || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(([entrada]) =>
      setAnchoContenedor(Math.floor(entrada.contentRect.width)),
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);
  const ancho = anchoDeLinea(anchoContenedor, eje);

  return (
    <div className="flex flex-col gap-2">
      {/* `overflow-x-auto` solo desplaza cuando `ancho.conScroll`: si cabe, no hay barra. */}
      {/*
        El contenedor MEDIDO es el que desplaza, y lleva `min-w-0`: su ancho lo da la tarjeta, nunca
        su contenido (si creciera con la pista, la medición se alimentaría a sí misma y no encogería).
      */}
      <div ref={refContenedor} className="min-w-0 overflow-x-auto" data-testid="contenedor-linea">
        <div>
          <div className="grid gap-2" style={{ gridTemplateColumns: ancho.columnas }}>
            <span className="text-xs font-semibold text-app-label">Conductor</span>
            <div className="relative h-5 text-xs font-semibold text-app-label" aria-hidden="true">
              {/*
                Cada rótulo se CENTRA en su hora; el primero se apoya a la izquierda y el último a la
                derecha. Antes todos arrancaban en su hora y «02H00», en el 100 %, sobresalía ~40 px
                de la pista: era lo que hacía aparecer la barra de desplazamiento aunque la jornada
                cupiera (2026-10-08).
              */}
              {marcas.map((marca, indice) => (
                <span
                  key={marca.minuto}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: `${porcentajeEnEje(marca.minuto, eje)}%`,
                    transform: desplazamientoDeRotulo(indice, marcas.length),
                  }}
                >
                  {marca.texto}
                </span>
              ))}
            </div>
          </div>
          <ul className="flex flex-col">
            {visibles.length === 0 && (
              <li className="flex flex-wrap items-center gap-2 py-4 text-sm text-app-muted">
                <span>Ningún conductor tiene turno en esta jornada.</span>
                <BotonEnlace to={`/home/administracion/turnos-conductores?fecha=${fecha}`} tamano="sm">
                  Ir a Turnos del mes
                </BotonEnlace>
              </li>
            )}
            {visibles.map((conductor) => {
              const resumen = delResumen.get(conductor.id);
              return (
                <FilaConductorLinea
                  key={conductor.id}
                  conductor={conductor}
                  // Compartir unidad (2026-10-19): anfitrión e invitados, un solo viaje.
                  tramos={fundirCompartidos(
                    plan.tramos.filter((t) => t.conductorId === conductor.id),
                    plan.inicioJornada,
                  )}
                  placa={resumen?.placa ?? null}
                  avisos={resumen?.avisos ?? []}
                  huecos={huecosDe.get(conductor.id) ?? []}
                  exclusivos={exclusivos}
                  inicioJornada={plan.inicioJornada}
                  ventanaTurno={
                    conductor.turno &&
                    conductor.turno !== "LIBRE" &&
                    conductor.turno !== "ADMINISTRATIVO"
                      ? (plan.ventanasTurno?.[conductor.turno] ?? null)
                      : null
                  }
                  ventanaNombramiento={plan.ventanaNombramiento ?? null}
                  tabla={tabla}
                  soloLectura={soloLectura}
                  onTramo={onTramo}
                  onHojaRuta={onHojaRuta}
                  onOperacion={onOperacion}
                  onQuitarActivacion={onQuitarActivacion}
                  eje={eje}
                  marcas={marcas.map((marca) => marca.minuto)}
                  columnas={ancho.columnas}
                />
              );
            })}
          </ul>
        </div>
      </div>
      {/* Leyenda: el color acompaña a un texto (regla 6). */}
      <ul className="flex flex-wrap gap-4 text-xs text-app-muted" aria-label="Leyenda">
        <li className="flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-primary/10" aria-hidden="true" /> Horario de turno
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-primary" aria-hidden="true" /> Operativo asignado
          (clic para cambiar)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-accent" aria-hidden="true" /> Macrooperativo
        </li>
        {huecos && (
          <li className="flex items-center gap-2">
            <span className="h-3 w-5 rounded bg-success/10" aria-hidden="true" /> Hora libre (desde{" "}
            {huecos.minimoMin} min útiles; borde discontinuo: horas extra)
          </li>
        )}
      </ul>
    </div>
  );
};

export default LineaConductores;
