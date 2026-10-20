/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (línea de tiempo por conductor)
 * Archivo: FilaConductorLinea.tsx
 * Responsabilidad: Una fila de la línea de tiempo: el conductor con su turno, placa y avisos, la
 *                  banda de su turno y sus tramos asignados.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOS AVISOS VAN EN EL CONDUCTOR (2026-10-08, «Planificar el día»), no en un contador aparte: chips
 * ámbar bajo el nombre con el texto del servidor tal cual («Jornada 13H (máx. 12H)», «Fuera de su
 * turno», traslado imposible). Salen de la MISMA política de asignación (resumen de la jornada).
 *
 * SE ASIGNA DESDE EL DIÁLOGO, NO ARRASTRANDO. Clic en un tramo → `onTramo` (cambiar o quitar). Se
 * retiraron el arrastrar y soltar y el veredicto por fila de la versión anterior: el diálogo de
 * candidatos dice quién puede y por qué.
 *
 * Posiciones con `left/width` en % (estilo en línea, como `VisorPdf`): es geometría calculada, no
 * estilo; los colores salen de las clases del tema. Banda azul clara = turno; azul = tramo asignado;
 * acento = macrooperativo; un conductor de libre lleva la banda con borde discontinuo.
 *
 * LAS HORAS LIBRES LAS DICE EL SERVIDOR (2026-10-14, `GET /transporte/huecos/:fecha`). Se dibujan
 * como banda verde clara en la pista y, en palabras, bajo el nombre: «Libre 08H30 a 14H30 (útil
 * 5 h)». Las de horas extra llevan además borde discontinuo y lo dicen en el texto (regla 6).
 *
 * SIN VEHÍCULO (2026-10-15). Un tramo asignado sin placa ocupa al conductor pero no completa el
 * operativo (sigue PENDIENTE hasta tener placa). Se dice con el distintivo «Sin vehículo» junto al
 * nombre —con los tramos en el `title`— y en el `title` de cada barra; el aviso del servidor
 * (`SIN_VEHICULO`) va además como chip, igual que los demás. Las tareas de taller no cuentan: su
 * vehículo es el de la tarea.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import Boton from "../../common/Boton.tsx";
import Iconos from "../../common/Iconos.tsx";
import Insignia from "../../common/Insignia.tsx";
import type { AvisoCarril, HuecoLibre } from "../../../interfaces/JornadaDaf.ts";
import type {
  ConductorPlanificado,
  FranjaLinea,
  TramoPlanificado,
} from "../../../interfaces/Planificacion.ts";
import {
  franjaEnLinea,
  horaDeMinuto,
  NOMBRE_TIPO_TRAMO,
  EJE_COMPLETO,
  porcentajeEnEje,
  posicion,
  textoHueco,
  trasladosDe,
  type EjeLinea,
  type TablaTraslados,
} from "../../../utils/lineaTiempo.util.ts";
import { textoConductor } from "../../../utils/planificarDia.util.ts";
import { DISTINTIVO_EXCLUSIVO } from "../../../utils/tipoTransporte.util.ts";

type FilaConductorLineaProps = {
  conductor: ConductorPlanificado;
  tramos: TramoPlanificado[];
  /** Placa con la que trabaja hoy (o la habitual). */
  placa: string | null;
  /** Avisos del carril (resumen de la jornada): van como chips bajo el nombre. */
  avisos: AvisoCarril[];
  /** Horas libres del conductor, calculadas por el servidor. Sin ellas, no se dibujan. */
  huecos?: HuecoLibre[];
  /** Operativos que piden vehículo exclusivo (macrooperativo): su barra lo dice. */
  exclusivos?: ReadonlySet<number>;
  inicioJornada: string;
  ventanaTurno: FranjaLinea | null;
  ventanaNombramiento: FranjaLinea | null;
  tabla: TablaTraslados | null;
  soloLectura: boolean;
  onTramo: (tramo: TramoPlanificado) => void;
  onHojaRuta: (vehiculoId: number) => void;
  onOperacion: (vehiculoId: number, conductorId: number) => void;
  onQuitarActivacion: (conductorId: number) => void;
  /** Tramo visible de la línea: sin él, las 24 h. */
  eje?: EjeLinea;
  /** Minutos de la línea con marca horaria: se dibujan como líneas de grilla. */
  marcas?: number[];
  /**
   * Columnas de la fila (nombre | pista), calculadas por `LineaConductores` a partir del ancho del
   * contenedor. Sin ellas, la fila apila nombre y pista.
   */
  columnas?: string;
};

const FilaConductorLinea: FC<FilaConductorLineaProps> = ({
  conductor,
  tramos,
  placa,
  avisos,
  huecos = [],
  exclusivos,
  inicioJornada,
  ventanaTurno,
  ventanaNombramiento,
  tabla,
  soloLectura,
  onTramo,
  onHojaRuta,
  onOperacion,
  onQuitarActivacion,
  eje = EJE_COMPLETO,
  marcas = [],
  columnas,
}) => {
  const traslados = trasladosDe(tramos, inicioJornada, tabla);
  const vehiculoId = tramos.find((t) => t.vehiculoId !== null)?.vehiculoId ?? null;
  const vinoDeNoche = (conductor.ultimoFinAyer ?? 0) > 0;
  const conParqueadero = conductor.parqueaderoAutorizado && conductor.actaVigente;
  const deLibre = conductor.turno === "LIBRE";
  const sinVehiculo = tramos.filter((t) => t.tipo !== "TAREA" && t.vehiculoId === null);

  return (
    <li
      className="grid grid-cols-1 gap-2 border-b border-base-300 py-2"
      style={columnas ? { gridTemplateColumns: columnas } : undefined}
      data-testid={`fila-conductor-${conductor.id}`}
    >
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-semibold text-app-strong">{conductor.nombre}</span>
          {vinoDeNoche && (
            <span
              className="badge badge-ghost badge-xs gap-1 whitespace-nowrap"
              title="Terminó tarde ayer: revise su descanso."
            >
              <Iconos nombre="vinoDeNoche" /> Vino de noche
            </span>
          )}
          {sinVehiculo.length > 0 && (
            <Insignia
              variante="aviso"
              className="whitespace-nowrap"
              title={`Asignado sin vehículo: falta la placa (${sinVehiculo
                .map((t) => `${t.identificador ?? "tramo"} ${t.horaInicio}–${t.horaFin}`)
                .join(", ")}).`}
            >
              Sin vehículo
            </Insignia>
          )}
          {conParqueadero && (
            <span
              className="badge badge-ghost badge-xs gap-1 whitespace-nowrap"
              title="Parqueadero autorizado con acta vigente: puede llevarse el vehículo."
            >
              <Iconos nombre="parqueadero" /> Parqueadero
            </span>
          )}
        </div>
        <span className="text-xs text-app-muted">
          {textoConductor({ turno: conductor.turno, placa })}
          {conductor.activado ? " · activado (horas extra)" : ""}
        </span>

        {avisos.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label={`Avisos de ${conductor.nombre}`}>
            {avisos.map((aviso) => (
              <li
                key={aviso.codigo}
                className="badge badge-warning badge-sm min-w-0 max-w-full"
                title={aviso.mensaje}
              >
                <span className="min-w-0 truncate">⚠ {aviso.mensaje}</span>
              </li>
            ))}
          </ul>
        )}

        {huecos.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label={`Horas libres de ${conductor.nombre}`}>
            {huecos.map((hueco) => (
              <li
                key={`${hueco.franja.inicio}-${hueco.franja.fin}`}
                className="badge badge-ghost badge-sm min-w-0 max-w-full"
                title={textoHueco(hueco)}
              >
                <span className="min-w-0 truncate">{textoHueco(hueco)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-1.5">
          {vehiculoId !== null && (
            <>
              <Boton tamano="sm" onClick={() => onHojaRuta(vehiculoId)}>
                Hoja de ruta
              </Boton>
              <Boton
                tamano="sm"
                icono="checklist"
                onClick={() => onOperacion(vehiculoId, conductor.id)}
              >
                Operación del vehículo
              </Boton>
            </>
          )}
          {conductor.activado && tramos.length === 0 && !soloLectura && (
            <Boton
              variante="peligro"
              tamano="sm"
              icono="desactivar"
              onClick={() => onQuitarActivacion(conductor.id)}
            >
              Quitar activación
            </Boton>
          )}
        </div>
      </div>

      <div
        className={`relative h-10 overflow-hidden rounded-md bg-base-200 ${deLibre ? "border border-dashed border-base-300" : ""}`}
        aria-label={`Línea de tiempo de ${conductor.nombre}`}
      >
        {/* `overflow-hidden`: la última guía cae en el 100 % y su borde de 1 px asomaba fuera de la
            pista; bastaba para que el contenedor mostrara la barra de desplazamiento (2026-10-08). */}
        {marcas.map((minuto) => (
          <div
            key={`g-${minuto}`}
            className="absolute inset-y-0 border-l border-base-300"
            style={{ left: `${porcentajeEnEje(minuto, eje)}%` }}
            aria-hidden="true"
          />
        ))}
        {/* Banda azul clara: cuándo trabaja de plan. */}
        {ventanaTurno && (
          <div
            className="absolute inset-y-0 rounded-md bg-primary/10"
            style={posicion(ventanaTurno, eje)}
            title={`Horario de turno · ${horaDeMinuto(ventanaTurno.inicio, inicioJornada)}–${horaDeMinuto(ventanaTurno.fin, inicioJornada)}`}
          />
        )}
        {/* Banda verde clara: hora libre aprovechable; con borde discontinuo, en horas extra. */}
        {huecos.map((hueco) => (
          <div
            key={`h-${hueco.franja.inicio}-${hueco.franja.fin}`}
            className={`absolute inset-y-0 rounded-md bg-success/10 ${
              hueco.horasExtra ? "border border-dashed border-base-300" : ""
            }`}
            style={posicion(hueco.franja, eje)}
            title={textoHueco(hueco)}
            data-testid="banda-hueco"
          />
        ))}
        {/* Límite del nombramiento: después de esta línea no se le asigna. */}
        {conductor.tipoContrato === "NOMBRAMIENTO" && ventanaNombramiento && (
          <div
            className="absolute inset-y-0 border-l border-warning"
            style={{ left: `${porcentajeEnEje(ventanaNombramiento.fin, eje)}%` }}
            title={`Límite del nombramiento · ${horaDeMinuto(ventanaNombramiento.fin, inicioJornada)}`}
          />
        )}

        {traslados.map((segmento) => (
          <div
            key={`tr-${segmento.desde}-${segmento.hasta}`}
            className={`absolute top-4 h-2 rounded ${
              segmento.noLlega ? "bg-error" : "bg-base-300"
            }`}
            style={posicion({ inicio: segmento.desde, fin: segmento.hasta }, eje)}
            title={
              segmento.noLlega
                ? `No llega: ${segmento.hueco < 0 ? "los tramos se cruzan" : `hay ${segmento.hueco} min y el traslado toma ${segmento.requerido} min`}`
                : `Traslado: ${segmento.hueco} min`
            }
          >
            {segmento.noLlega && <span className="sr-only">No llega</span>}
          </div>
        ))}

        {tramos.map((tramo) => {
          const franja = franjaEnLinea(tramo.horaInicio, tramo.horaFin, inicioJornada);
          const exclusivo =
            tramo.operativoId !== null && (exclusivos?.has(tramo.operativoId) ?? false);
          const texto =
            tramo.tipo === "TAREA"
              ? (tramo.descripcion ?? "Llevar a taller")
              : `${tramo.identificador ?? ""} · ${NOMBRE_TIPO_TRAMO[tramo.tipo]}${
                  exclusivo ? ` · ${DISTINTIVO_EXCLUSIVO}` : ""
                }${
                  // Compartir unidad (2026-10-19): con su texto, no solo con un color (regla 6).
                  tramo.invitados && tramo.invitados.length > 0
                    ? ` · Compartido con ${tramo.invitados.join(", ")}`
                    : tramo.compartidoCon
                      ? ` · Compartido con ${tramo.compartidoCon}`
                      : ""
                }`;
          // «Completo» comparte unidad (2026-10-20): los traslados que la unidad hace dentro de su
          // barra de todo el día, también en palabras (regla 6).
          const ancho = Math.max(1, franja.fin - franja.inicio);
          const marcas = (tramo.marcas ?? []).map((marca) => ({
            marca,
            franja: franjaEnLinea(marca.horaInicio, marca.horaFin, inicioJornada),
            texto: `${NOMBRE_TIPO_TRAMO[marca.tipo as TramoPlanificado["tipo"]] ?? marca.tipo} ${
              marca.identificador ?? ""
            } ${marca.horaInicio}–${marca.horaFin}`,
          }));
          const textoMarcas = marcas.map((m) => ` · ${m.texto}`).join("");
          const clase =
            tramo.tipo === "TAREA"
              ? "bg-warning text-base-content"
              : exclusivo
                ? "bg-accent text-accent-content"
                : "bg-primary text-primary-content";
          return (
            <button
              key={tramo.id}
              type="button"
              onClick={() => onTramo(tramo)}
              className={`absolute inset-y-1 overflow-hidden whitespace-nowrap rounded px-1 text-left text-xs font-semibold ${clase}`}
              style={posicion(franja, eje)}
              title={`${texto} · ${tramo.horaInicio}–${tramo.horaFin}${tramo.placa ? ` · ${tramo.placa}` : tramo.tipo === "TAREA" ? "" : " · sin vehículo"}${tramo.compartidoConTramoId && !tramo.compartidoCon ? " · carro compartido" : ""}${textoMarcas}`}
            >
              {texto}
              {textoMarcas && <span className="sr-only">{textoMarcas}</span>}
              {marcas.map((m) => (
                <span
                  key={`${m.marca.tipo}-${m.marca.horaInicio}-${m.marca.identificador ?? ""}`}
                  aria-hidden="true"
                  className="absolute bottom-0 h-1 rounded bg-base-100"
                  style={{
                    left: `${((m.franja.inicio - franja.inicio) / ancho) * 100}%`,
                    width: `${((m.franja.fin - m.franja.inicio) / ancho) * 100}%`,
                  }}
                  data-testid="marca-traslado"
                />
              ))}
            </button>
          );
        })}
      </div>
    </li>
  );
};

export default FilaConductorLinea;
