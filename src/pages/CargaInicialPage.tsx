/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Carga inicial de la DAF
 * Archivo: CargaInicialPage.tsx
 * Responsabilidad: Pantalla M-39. Cargar UNA VEZ los datos iniciales de la DAF desde un .xlsx.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE USA UNA SOLA VEZ. Conductores, vehículos, garajes y turnos del mes ya existen en hojas de la
 * DAF; teclearlos a mano es copiar lo que ya está escrito. Esta pantalla los sube en tres pasos:
 *   1. elegir QUÉ se carga (y el mes, para los turnos) y el archivo;
 *   2. «Previsualizar»: el servidor valida fila por fila y NO escribe nada; se ve el formato que
 *      espera y cada fila válida o con sus errores, tal cual los redacta (regla 7);
 *   3. «Aplicar N filas válidas»: solo las válidas, y el resultado —creados, actualizados,
 *      omitidos— en palabras.
 *
 * Permiso `carga-inicial:administrar` (hoy solo ADMINISTRADOR), el mismo en la ruta y en el menú
 * (regla 4). La importación del HORARIO salió de «Turnos del mes»: vive aquí, como «Turnos del mes».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import Boton from "../components/common/Boton.tsx";

import type {
  PreviaCargaInicial,
  ResultadoCargaInicial,
  TipoCargaInicial,
} from "../interfaces/CargaInicial.ts";
import { CargaInicialService } from "../services/cargaInicial.service.ts";
import { mensaje } from "../utils/mensaje.ts";

const TIPOS: { valor: TipoCargaInicial; nombre: string }[] = [
  { valor: "conductores", nombre: "Conductores" },
  { valor: "vehiculos", nombre: "Vehículos" },
  { valor: "garajes", nombre: "Garajes" },
  { valor: "turnos", nombre: "Turnos del mes" },
];

/** El mes siguiente (`AAAA-MM`): los turnos se cargan antes de que empiece. */
const mesSiguiente = (): string => {
  const hoy = new Date();
  const siguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  return `${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, "0")}`;
};

/** Una fila omitida al aplicar, en palabras: «Fila 4: cédula repetida». */
const textoOmitido = (omitido: ResultadoCargaInicial["omitidos"][number]): string =>
  typeof omitido === "string"
    ? omitido
    : `${omitido.fila !== undefined ? `Fila ${omitido.fila}: ` : ""}${omitido.motivo}`;

/** Un valor de la fila en texto: lo vacío se dice «—». */
const texto = (valor: unknown): string =>
  valor === null || valor === undefined || valor === ""
    ? "—"
    : typeof valor === "object"
      ? JSON.stringify(valor)
      : String(valor);

const CargaInicialPage: FC = () => {
  const [tipo, setTipo] = useState<TipoCargaInicial>("conductores");
  const [mes, setMes] = useState<string>(mesSiguiente);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<PreviaCargaInicial | null>(null);
  const [procesando, setProcesando] = useState<"previa" | "aplicar" | null>(null);

  const conMes = tipo === "turnos";
  const validas = previa?.filas.filter((fila) => fila.valido) ?? [];

  /** Cambiar qué se carga, el mes o el archivo deja de valer la vista previa anterior. */
  const reiniciar = () => {
    setPrevia(null);
  };

  const previsualizar = async () => {
    if (!archivo) return;
    setProcesando("previa");
    reiniciar();
    try {
      setPrevia(
        await CargaInicialService.previsualizar(tipo, archivo, conMes ? mes : undefined),
      );
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo leer el archivo" });
    } finally {
      setProcesando(null);
    }
  };

  const aplicar = async () => {
    if (validas.length === 0) return;
    setProcesando("aplicar");
    try {
      const resultado = await CargaInicialService.aplicar(
        tipo,
        validas,
        conMes ? mes : undefined,
      );
      setPrevia(null);
      // Un HITO (M7): modal de éxito; las filas omitidas, con su motivo, en «Ver detalle».
      void mensaje.exito({
        titulo: "Carga inicial terminada",
        mensaje: `${resultado.creados} creados · ${resultado.actualizados} actualizados · ${resultado.omitidos.length} omitidos.`,
        detalle:
          resultado.omitidos.length > 0
            ? resultado.omitidos.map(textoOmitido).join("\n")
            : undefined,
        textoPrincipal: "Aceptar",
      });
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo aplicar la carga" });
    } finally {
      setProcesando(null);
    }
  };

  const columnas = previa
    ? [...new Set(previa.filas.flatMap((fila) => Object.keys(fila.datos)))]
    : [];

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="page-heading-kicker font-semibold uppercase">Administración</p>
          <h1 className="page-heading-title">Carga inicial</h1>
          <p className="page-heading-subtitle text-sm">
            Se usa una sola vez para cargar los datos iniciales de la DAF.
          </p>
        </div>
      </header>

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">Archivo de carga</h2>
        </div>
        <div className="app-data-panel-body px-2 pb-4 pt-2 md:px-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3 px-1 pt-1">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">Qué se carga</span>
            <select
              className="select select-bordered select-sm"
              value={tipo}
              disabled={procesando !== null}
              onChange={(evento) => {
                setTipo(evento.target.value as TipoCargaInicial);
                reiniciar();
              }}
            >
              {TIPOS.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.nombre}
                </option>
              ))}
            </select>
          </label>
          {conMes && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">Mes</span>
              <input
                type="month"
                className="input input-bordered input-sm"
                value={mes}
                disabled={procesando !== null}
                onChange={(evento) => {
                  setMes(evento.target.value);
                  reiniciar();
                }}
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">Archivo (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="file-input file-input-sm"
              disabled={procesando !== null}
              onChange={(evento) => {
                setArchivo(evento.target.files?.[0] ?? null);
                reiniciar();
              }}
            />
          </label>
          {/* Con una vista previa a la vista, la acción principal pasa a «Aplicar». */}
          <Boton
            variante={previa ? "secundario" : "primario"}
            cargando={procesando === "previa"}
            deshabilitado={procesando !== null}
            motivoDeshabilitado={
              !archivo
                ? "Elija primero el archivo .xlsx."
                : conMes && !mes
                  ? "Elija el mes."
                  : null
            }
            onClick={() => void previsualizar()}
          >
            {procesando === "previa" ? "Leyendo el archivo…" : "Previsualizar"}
          </Boton>
        </div>
        <p className="px-1 text-xs text-app-muted">
          Previsualizar no escribe nada: el servidor revisa cada fila y dice cuáles son
          válidas. Solo se aplican esas.
        </p>
        </div>
      </div>

      {previa && (
        <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
          <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">Previsualización</h2>
            <span className="badge badge-ghost badge-sm whitespace-nowrap" role="status">
              {previa.resumen.validas}{" "}
              {previa.resumen.validas === 1 ? "fila válida" : "filas válidas"} ·{" "}
              {previa.resumen.invalidas}{" "}
              {previa.resumen.invalidas === 1 ? "fila con errores" : "filas con errores"}
            </span>
            </div>
            <Boton
              variante="primario"
              enBarraOscura
              cargando={procesando === "aplicar"}
              deshabilitado={procesando !== null}
              motivoDeshabilitado={validas.length === 0 ? "No hay filas válidas que aplicar." : null}
              onClick={() => void aplicar()}
            >
              {procesando === "aplicar"
                ? "Aplicando…"
                : `Aplicar ${validas.length} ${validas.length === 1 ? "fila válida" : "filas válidas"}`}
            </Boton>
          </div>

          <div className="app-data-panel-body px-2 pb-4 pt-2 md:px-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1 px-1 pt-1 text-sm">
            <span className="font-semibold">Formato esperado</span>
            <span className="text-xs text-app-muted">
              {Array.isArray(previa.formatoEsperado)
                ? `Columnas: ${previa.formatoEsperado.join(", ")}`
                : previa.formatoEsperado}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-app-label">
                  <th scope="col">Fila</th>
                  <th scope="col">Estado</th>
                  {columnas.map((columna) => (
                    <th key={columna} scope="col">
                      {columna}
                    </th>
                  ))}
                  <th scope="col">Errores</th>
                </tr>
              </thead>
              <tbody>
                {previa.filas.map((fila) => (
                  <tr key={fila.fila} className="hover:bg-primary/5">
                    <td className="px-3 py-1 align-top">{fila.fila}</td>
                    <td className="px-3 py-1 align-top">
                      {/* Regla 6: el estado en palabras; el color acompaña. */}
                      <span
                        className={`badge badge-sm whitespace-nowrap ${
                          fila.valido ? "badge-success" : "badge-error"
                        }`}
                      >
                        {fila.valido ? "Válida" : "Con errores"}
                      </span>
                    </td>
                    {columnas.map((columna) => (
                      <td key={columna} className="px-3 py-1 align-top">
                        {texto(fila.datos[columna])}
                      </td>
                    ))}
                    <td className="px-3 py-1 align-top">
                      {fila.errores.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="flex flex-col gap-0.5 text-error">
                          {fila.errores.map((mensaje) => (
                            <li key={mensaje}>{mensaje}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CargaInicialPage;
