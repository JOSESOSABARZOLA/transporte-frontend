/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada de los conductores
 * Archivo: JornadaConductoresPage.tsx
 * Responsabilidad: Pantalla P-14. Ver qué lleva encadenado cada conductor del día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PANTALLA QUE CAMBIA EL OBJETO DEL MÓDULO.
 *
 * P-03 pregunta «¿quién lleva este operativo?». Ésta pregunta «¿qué lleva este conductor?»,
 * que es como planifica la DAF: *«ahorita está de uno a uno… pero en la realidad así no
 * funciona, porque hay varios operativos por cubrir»*.
 *
 * El Excel lo confirma sobre el mes completo: de 422 celdas de actividad con horario, 263
 * llevan un rango, **106 llevan dos y 53 llevan tres o más**.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NO ES UN TABLERO DE ARRASTRAR Y SOLTAR, Y HAY QUE DECIRLO.
 *
 * El análisis lo describió como «una línea de tiempo con sus huecos», y la analista
 * recordaba «un tipo tetris» de otro sistema. **Esta versión es una tabla**, por dos
 * motivos, y ninguno es la comodidad:
 *
 *   1. La regla 1 de CLAUDE.md prohíbe introducir clases CSS nuevas, y una línea de tiempo
 *      gráfica las necesita —anchos proporcionales, posiciones absolutas—. Ampliar el
 *      inventario de `docs/FASE5-diseno-interfaz.md` §2.2 **se decide, no se supone**.
 *   2. El arrastrar y soltar solo tiene sentido cuando el sistema puede PROPONER dónde
 *      cae cada operativo, y eso exige el tiempo de traslado entre puntos: la pregunta
 *      Q-03, todavía sin respuesta. Sin ella, arrastrar sería adivinar.
 *
 * Lo que la tabla sí resuelve, que es lo que hoy no existe: ver de un vistazo qué lleva
 * cada conductor, en orden, con sus horas acumuladas y sus placas.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NO ASIGNA. Es una vista; la asignación sigue estando en P-03 con todas sus reglas. El
 * análisis lo recomienda expresamente: *el sistema debe proponer y avisar, no decidir*.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import CamposCalculados from "../components/cuadro/CamposCalculados.tsx";
import FilaJornadaConductor from "../components/transporte/FilaJornadaConductor.tsx";
import { useCuadroDiario } from "../hooks/useCuadroDiario.ts";
import type { JornadaDeConductor } from "../interfaces/Transporte.ts";
import { TransporteService } from "../services/transporte.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import { normalizar } from "../utils/texto.util.ts";

const JornadaConductoresPage = () => {
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

  const { cuadro, cargando: cargandoCuadro } = useCuadroDiario(fecha);

  const [jornadas, setJornadas] = useState<JornadaDeConductor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );

  const [busqueda, setBusqueda] = useState("");
  const [soloConCarga, setSoloConCarga] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      setJornadas(await TransporteService.consultarJornadaConductores(fecha));
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setJornadas([]);
      if (error.estado !== 404) {
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      }
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const coincidentes = useMemo(() => {
    const buscado = normalizar(busqueda);

    return jornadas.filter((jornada) => {
      if (soloConCarga && jornada.tramos.length === 0) return false;
      if (!buscado) return true;

      return normalizar(jornada.nombreCompleto).includes(buscado);
    });
  }, [jornadas, busqueda, soloConCarga]);

  /** Lo que explica por qué alcanza o no la flota, en palabras. */
  const resumen = useMemo(() => {
    const disponibles = jornadas.filter((jornada) => jornada.disponible).length;
    const conCarga = jornadas.filter(
      (jornada) => jornada.tramos.length > 0,
    ).length;
    const encadenados = jornadas.filter(
      (jornada) => jornada.tramos.length > 1,
    ).length;

    return { disponibles, conCarga, encadenados, total: jornadas.length };
  }, [jornadas]);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker font-semibold uppercase">
          DAF
        </p>
        <h1 className="page-heading-title">
          Jornada de los conductores
        </h1>
        <CamposCalculados
          cuadro={cuadro}
          cargando={cargandoCuadro}
        />
        <p className="text-sm text-base-content/70">
          Qué lleva encadenado cada conductor ese día. Esta pantalla no asigna:
          la asignación se hace en «Asignación de transporte», con sus reglas.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaJornada"
            >
              <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
                Fecha de la jornada
              </span>
            </label>
            <input
              id="fechaJornada"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
          </div>
        </div>
      </header>

      {aviso && (
        <div
          className={`alert ${aviso.clase}`}
          role="alert"
        >
          <span>{aviso.texto}</span>
        </div>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Conductores del día
          </h2>
          {/* Campos calculados: distintivo, nunca un input deshabilitado (regla 5). */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-ghost badge-sm">
              {cargando
                ? "Cargando…"
                : `${resumen.disponibles} de ${resumen.total} disponibles`}
            </span>
            <span className="badge badge-ghost badge-sm">
              {resumen.conCarga} con asignación
            </span>
            <span className="badge badge-ghost badge-sm">
              {resumen.encadenados} encadenan más de uno
            </span>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              className="input input-bordered input-sm w-full sm:max-w-xs"
              placeholder="Buscar conductor…"
              aria-label="Buscar conductor"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={soloConCarga}
                onChange={(evento) => setSoloConCarga(evento.target.checked)}
              />
              <span className="label-text text-xs">
                Solo los que ya llevan algo
              </span>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th scope="col">Conductor</th>
                  <th scope="col">Vive en</th>
                  <th scope="col">Contrato</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Operativos que lleva</th>
                  <th scope="col">Horas</th>
                </tr>
              </thead>
              <tbody>
                {coincidentes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-sm text-base-content/70"
                    >
                      {cargando
                        ? "Cargando la jornada…"
                        : busqueda !== "" || soloConCarga
                          ? "Ningún conductor coincide con el filtro."
                          : "No hay conductores registrados en la flota."}
                    </td>
                  </tr>
                ) : (
                  coincidentes.map((jornada) => (
                    <FilaJornadaConductor
                      key={jornada.conductorId}
                      jornada={jornada}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JornadaConductoresPage;
