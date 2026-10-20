/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Mantenimiento de vehículos
 * Archivo: SemanaMantenimiento.tsx
 * Responsabilidad: Mostrar la semana de la flota: qué vehículo está en taller cada día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PREGUNTA ERA «¿QUÉ TENGO PARADO ESTA SEMANA?», y la pantalla solo respondía placa por placa
 * («Ver paradas»). Siete días desde la fecha de trabajo, con ‹ › para moverse de semana en
 * semana. Cada celda dice el estado EN PALABRAS (regla 6); el motivo va en el `title`.
 *
 * Las flechas llevan texto y son el secundario blanco de la cabecera azul (`<Boton enBarraOscura>`,
 * estándar de botones 2026-10-15): como `btn-ghost` sobre el azul no se veían.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, type FC } from "react";

import Boton from "../common/Boton.tsx";
import type { SemanaMantenimiento as Semana } from "../../interfaces/Transporte.ts";
import { TransporteService } from "../../services/transporte.service.ts";
import { presentarError } from "../../utils/errorApi.util.ts";
import { sumarDias } from "../../utils/jornada.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

const NOMBRE_ESTADO = {
  PROGRAMADO: "Programado",
  EN_TALLER: "En taller",
  LISTO: "Listo",
} as const;

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** «2026-10-07» → «mié 07/10». Se calcula en UTC: la fecha de calendario no tiene huso (regla 12). */
const rotulo = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const semana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return `${DIAS[semana]} ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
};

type SemanaMantenimientoProps = {
  /** Primer día que se muestra al abrir (la fecha de trabajo de la DAF). */
  desdeInicial: string;
  /** Cambia tras cada escritura en la página, para volver a pedir la semana. */
  version?: number;
};

const SemanaMantenimiento: FC<SemanaMantenimientoProps> = ({
  desdeInicial,
  version = 0,
}) => {
  const [desde, setDesde] = useState(desdeInicial);
  const [resultado, setResultado] = useState<{
    clave: string;
    filas: Semana[];
    error: string | null;
  } | null>(null);
  const clave = `${desde}#${version}`;

  useEffect(() => {
    let vigente = true;
    TransporteService.consultarSemanaMantenimiento(desde)
      .then((filas) => {
        if (vigente) setResultado({ clave: `${desde}#${version}`, filas, error: null });
      })
      .catch((fallo: unknown) => {
        if (vigente) {
          setResultado({
            clave: `${desde}#${version}`,
            filas: [],
            error: presentarError(fallo).mensaje,
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [desde, version]);

  const actual = resultado?.clave === clave ? resultado : null;
  const dias = Array.from({ length: 7 }, (_, indice) => sumarDias(desde, indice));
  const conAlgo = (actual?.filas ?? []).filter((fila) =>
    fila.dias.some((dia) => dia.estado !== null),
  );

  return (
    <section
      aria-label="Semana de mantenimiento"
      className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]"
    >
      <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
          Semana del {rotulo(dias[0])} al {rotulo(dias[6])}
        </h2>
        <div className="flex items-center gap-2">
          <Boton
            tamano="md"
            enBarraOscura
            aria-label="Semana anterior"
            onClick={() => setDesde(sumarDias(desde, -7))}
          >
            <span aria-hidden="true">‹</span> Anterior
          </Boton>
          <Boton
            tamano="md"
            enBarraOscura
            aria-label="Semana siguiente"
            onClick={() => setDesde(sumarDias(desde, 7))}
          >
            Siguiente <span aria-hidden="true">›</span>
          </Boton>
        </div>
      </div>

      <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
        {actual?.error && (
          <AvisoEnLinea variante="error">{actual.error}</AvisoEnLinea>
        )}
        <div className="overflow-x-auto">
          <table className="table table-sm table-zebra">
            <thead>
              <tr>
                <th scope="col">Placa</th>
                {dias.map((dia) => (
                  <th key={dia} scope="col" className="whitespace-nowrap">
                    {rotulo(dia)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conAlgo.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-sm text-app-muted"
                  >
                    {actual ? "Ningún vehículo en taller esta semana." : "Cargando la semana…"}
                  </td>
                </tr>
              ) : (
                conAlgo.map((fila) => (
                  <tr key={fila.vehiculoId}>
                    <td className="px-2 py-1 align-top font-mono font-semibold">
                      {fila.placa}
                    </td>
                    {dias.map((dia) => {
                      const celda = fila.dias.find((d) => d.fecha === dia);
                      return (
                        <td
                          key={dia}
                          className="px-2 py-1 align-top text-xs"
                          title={celda?.motivo}
                        >
                          {celda?.estado ? (
                            <span className="badge badge-ghost badge-sm whitespace-nowrap">
                              {NOMBRE_ESTADO[celda.estado]}
                            </span>
                          ) : (
                            <span className="text-app-muted">Disponible</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default SemanaMantenimiento;
