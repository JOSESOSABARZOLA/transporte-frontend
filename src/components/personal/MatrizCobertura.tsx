/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: MatrizCobertura.tsx
 * Responsabilidad: Editar la cobertura mensual por turnos del personal de Instrucción.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * SOLO SE MONTA PARA INSTRUCCIÓN (la página lo decide por el área que gestiona), así que no
 * afecta a la vista de Inspección. Adapta el Excel «COBERTURA POR TURNOS»: una fila por
 * persona (con su zona y denominación), una columna por día, y el estado del día.
 *
 * LAS AUSENCIAS NO SE EDITAN AQUÍ (celdas grises): salen de «Ausencias», su fuente única de
 * verdad. Los turnos DIURNO/NOCTURNO/DESCANSO se fijan pulsando la celda, que va rotando.
 */

import { useCallback, useEffect, useState, type FC } from "react";

import PanelCatalogo from "../catalogos/PanelCatalogo.tsx";
import { CoberturaService } from "../../services/cobertura.service.ts";
import { CatalogoCuadroService } from "../../services/catalogoCuadro.service.ts";
import type {
  CeldaCobertura,
  EstadoTurno,
  MatrizCobertura as Matriz,
} from "../../interfaces/Cobertura.ts";
import type { DenominacionInstruccion } from "../../interfaces/Personal.ts";
import type { Zonal } from "../../interfaces/Formulario.ts";
import { presentarError } from "../../utils/errorApi.util.ts";

const DENOMINACIONES: { valor: DenominacionInstruccion; nombre: string }[] = [
  { valor: "LIDER_ZONAL", nombre: "Líder zonal" },
  { valor: "INSTRUCTOR_METROPOLITANO", nombre: "Instructor metropolitano" },
  { valor: "AUXILIAR_FLAGRANCIA", nombre: "Auxiliar de flagrancia" },
];

/** Al pulsar una celda editable, su turno rota en este orden. */
const SIGUIENTE: Record<string, EstadoTurno> = {
  "": "DIURNO",
  DIURNO: "NOCTURNO",
  NOCTURNO: "DESCANSO",
  DESCANSO: "DIURNO",
};

/** Abreviatura de cada estado. La letra ES la información (regla 6); el color solo apoya. */
const ABREV: Record<string, string> = {
  DIURNO: "D",
  NOCTURNO: "N",
  DESCANSO: "—",
  VACACIONES: "V",
  REPOSO_MEDICO: "RM",
  CALAMIDAD: "C",
  PERMISO: "P",
};

/*
  COLOR POR ESTADO, como en el Excel pero con la PALETA DEL TEMA (no hexadecimales a mano,
  reglas 2 y 13): DIURNO azul, NOCTURNO gris, DESCANSO amarillo→`warning`, y las ausencias
  en su color (vacaciones verde, reposo rojo). El color solo apoya: la letra ya lo dice.
*/
const COLOR: Record<string, string> = {
  DIURNO: "bg-info/25",
  NOCTURNO: "bg-base-300",
  DESCANSO: "bg-warning/30",
  VACACIONES: "bg-success/30",
  REPOSO_MEDICO: "bg-error/25",
  CALAMIDAD: "bg-error/15",
  PERMISO: "bg-base-200",
};

/** Las clases de una celda: su color de estado + su comportamiento (editable o no). */
function claseCelda(estado: string | null, esAusencia: boolean): string {
  const color = COLOR[estado ?? ""] ?? "";
  const partes = ["text-center", color];

  if (esAusencia) {
    partes.push("text-base-content/70");
  } else {
    partes.push("cursor-pointer");
    partes.push(color ? "hover:brightness-95" : "hover:bg-primary/10");
  }

  return partes.filter(Boolean).join(" ");
}

/** La leyenda de colores, para no depender solo del color (regla 6). */
const LEYENDA: { estado: string; texto: string }[] = [
  { estado: "DIURNO", texto: "Diurno (D)" },
  { estado: "NOCTURNO", texto: "Nocturno (N)" },
  { estado: "DESCANSO", texto: "Descanso (—)" },
  { estado: "VACACIONES", texto: "Vacaciones (V)" },
  { estado: "REPOSO_MEDICO", texto: "Reposo (RM)" },
];

const LETRA_DIA = ["D", "L", "M", "X", "J", "V", "S"];

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function diaDeMes(fecha: string): string {
  return fecha.slice(8, 10);
}

function letraSemana(fecha: string): string {
  return LETRA_DIA[new Date(`${fecha}T00:00:00Z`).getUTCDay()];
}

const MatrizCobertura: FC = () => {
  const [mes, setMes] = useState<string>(() => mesActual());
  const [matriz, setMatriz] = useState<Matriz | null>(null);
  const [zonales, setZonales] = useState<Zonal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await CoberturaService.obtenerMatriz(mes);
      setMatriz(datos);
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void (async () => {
      try {
        setZonales(await CatalogoCuadroService.listarZonales());
      } catch {
        // El desplegable de zona quedará vacío; no bloquea la matriz.
      }
    })();
  }, []);

  /** Rota el turno de una celda editable y lo guarda; actualiza la vista al vuelo. */
  const rotarCelda = async (
    funcionarioId: number,
    indice: number,
    celda: CeldaCobertura,
  ): Promise<void> => {
    if (celda.esAusencia) return;
    const nuevo = SIGUIENTE[celda.estado ?? ""];

    setError(null);
    try {
      await CoberturaService.editarCelda(funcionarioId, celda.fecha, nuevo);
      setMatriz((actual) => aplicarCelda(actual, funcionarioId, indice, nuevo));
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    }
  };

  const fijarZona = async (
    funcionarioId: number,
    zonalId: number | null,
  ): Promise<void> => {
    try {
      await CoberturaService.fijarDatosInstruccion(funcionarioId, { zonalId });
      await cargar();
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    }
  };

  const fijarDenominacion = async (
    funcionarioId: number,
    denominacion: DenominacionInstruccion | null,
  ): Promise<void> => {
    try {
      await CoberturaService.fijarDatosInstruccion(funcionarioId, {
        denominacion,
      });
      await cargar();
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    }
  };

  const personas = matriz?.personas.length ?? 0;

  return (
    <PanelCatalogo
      titulo="Cobertura por turnos"
      distintivo={
        <span className="badge badge-ghost badge-sm">
          {cargando
            ? "Cargando…"
            : personas === 1
              ? "1 persona"
              : `${personas} personas`}
        </span>
      }
      procesando={cargando}
    >
      <div className="flex flex-col gap-3 px-1 pt-1">
        {/*
          MISMA TARJETA QUE «ZONALES DEL CUADRO»: barra azul de cabecera con su acción
          —aquí el mes— y la tabla debajo, todo dentro de un borde redondeado.
        */}
        <div className="overflow-hidden rounded-md border border-base-300">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-3 py-2 text-primary-content">
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Personal de Instrucción
            </h3>
            <input
              type="month"
              className="input input-bordered input-sm text-base-content"
              value={mes}
              onChange={(evento) => setMes(evento.target.value)}
              aria-label="Mes de la cobertura"
            />
          </div>

          <div className="flex flex-col gap-3 p-2">
            <p className="text-xs text-base-content/70">
              Una fila por persona; pulse una celda para rotar su turno (D =
              diurno, N = nocturno, — = descanso). Las ausencias (V, RM…) salen
              de «Ausencias».
            </p>

            {/* Leyenda: el color apoya, pero la letra y este rótulo son la información (regla 6). */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/70">
              {LEYENDA.map((elemento) => (
                <span key={elemento.estado} className="flex items-center gap-1">
                  <span
                    className={`inline-block h-3 w-3 rounded-sm border border-base-300 ${
                      COLOR[elemento.estado] ?? ""
                    }`}
                  />
                  {elemento.texto}
                </span>
              ))}
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                <span className="text-xs">{error}</span>
              </div>
            )}

            {cargando ? (
              <p className="py-6 text-center text-sm text-base-content/70">
                Cargando la cobertura…
              </p>
            ) : !matriz || personas === 0 ? (
              <p className="py-6 text-center text-sm text-base-content/70">
                No hay personal de Instrucción a su alcance. Registre personas
                con área «Personal de Instrucción» y asígneles zona y
                denominación aquí.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="app-data-table table table-sm table-zebra">
                  <thead>
              <tr className="text-xs uppercase tracking-wider text-base-content/70">
                <th scope="col" className="text-left">
                  Zona
                </th>
                <th scope="col" className="text-left">
                  Denominación
                </th>
                <th scope="col" className="text-left">
                  Personal
                </th>
                {matriz.dias.map((fecha) => (
                  <th
                    key={fecha}
                    scope="col"
                    className="text-center"
                    title={fecha}
                  >
                    <div>{letraSemana(fecha)}</div>
                    <div>{diaDeMes(fecha)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.personas.map((persona) => (
                <tr key={persona.funcionarioId} className="hover:bg-primary/5">
                  <td>
                    <select
                      className="select select-bordered select-xs w-full min-w-28"
                      value={persona.zonalId ?? ""}
                      onChange={(e) =>
                        void fijarZona(
                          persona.funcionarioId,
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      aria-label={`Zona de ${persona.nombre}`}
                    >
                      <option value="">— zona —</option>
                      {zonales.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="select select-bordered select-xs w-full min-w-36"
                      value={persona.denominacion ?? ""}
                      onChange={(e) =>
                        void fijarDenominacion(
                          persona.funcionarioId,
                          (e.target.value || null) as DenominacionInstruccion | null,
                        )
                      }
                      aria-label={`Denominación de ${persona.nombre}`}
                    >
                      <option value="">— denominación —</option>
                      {DENOMINACIONES.map((d) => (
                        <option key={d.valor} value={d.valor}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap font-medium">
                    {persona.nombre}
                  </td>
                  {persona.celdas.map((celda, indice) => (
                    <td
                      key={celda.fecha}
                      className={claseCelda(celda.estado, celda.esAusencia)}
                      title={celda.estado ?? "sin turno"}
                      onClick={
                        celda.esAusencia
                          ? undefined
                          : () =>
                              void rotarCelda(
                                persona.funcionarioId,
                                indice,
                                celda,
                              )
                      }
                    >
                      {celda.estado ? (ABREV[celda.estado] ?? celda.estado) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-right">
                  Activos por día
                </th>
                {matriz.totales.map((total) => (
                  <th key={total.fecha} className="text-center" title={total.fecha}>
                    {total.activos}
                  </th>
                ))}
              </tr>
            </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PanelCatalogo>
  );
};

/** Devuelve la matriz con una celda cambiada, sin mutar la anterior. */
function aplicarCelda(
  matriz: Matriz | null,
  funcionarioId: number,
  indice: number,
  estado: EstadoTurno,
): Matriz | null {
  if (!matriz) return matriz;

  return {
    ...matriz,
    personas: matriz.personas.map((persona) =>
      persona.funcionarioId !== funcionarioId
        ? persona
        : {
            ...persona,
            celdas: persona.celdas.map((celda, i) =>
              i === indice ? { ...celda, estado, esAusencia: false } : celda,
            ),
          },
    ),
  };
}

export default MatrizCobertura;
