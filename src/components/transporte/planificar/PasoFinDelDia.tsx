/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: PasoFinDelDia.tsx
 * Responsabilidad: Paso 3. Decidir dónde se guarda cada vehículo en uso al terminar la jornada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE CAMBIAN SOLO LAS EXCEPCIONES. El servidor sugiere el garaje autorizado más cercano a la zona
 * del último operativo de cada vehículo (matriz de traslados) y la fila ya llega con él elegido; lo
 * dice SOLO el distintivo «Sugerido», no el texto de la opción. Las opciones son los garajes
 * autorizados del catálogo de flota, por su nombre (`resumen.garajes`, 2026-10-08), más el
 * parqueadero: antes se leía el catálogo de administración entero. El
 * parqueadero del conductor es la excepción (Art. 8): exige el número de acta, que el servidor
 * compara con el acta VIGENTE del conductor; si no coincide, el error vuelve en la fila de ese
 * vehículo y el resto se guarda igual.
 *
 * Reemplaza el botón «Fin del día» y su cajón lateral. Sigue bajo la ventana de la DAF: con la
 * ventana cerrada el servidor responde 423 y su mensaje se muestra tal cual (regla 7).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, type FC } from "react";

import TarjetaPaso from "./TarjetaPaso.tsx";
import Boton from "../../common/Boton.tsx";
import type { ResumenJornadaDaf, SugerenciaGuarda } from "../../../interfaces/JornadaDaf.ts";
import type { GuardaFinal } from "../../../interfaces/Planificacion.ts";
import { PlanificacionService } from "../../../services/planificacion.service.ts";
import { mensaje } from "../../../utils/mensaje.ts";
import {
  faltaActa,
  guardasCompletas,
  nombreDeGaraje,
  PARQUEADERO,
  textoUltimoOperativo,
  type GuardaEnBorrador,
} from "../../../utils/planificarDia.util.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";

type PasoFinDelDiaProps = {
  fecha: string;
  resumen: ResumenJornadaDaf;
  soloLectura: boolean;
  motivoBloqueo: string | null;
  onRecargar: () => Promise<ResumenJornadaDaf | null>;
  onVolver: () => void;
  onContinuar: () => void;
  onAviso: (mensaje: string) => void;
};

/** Lo declarado manda; si no hay, la sugerencia del servidor. */
const borradorInicial = (s: SugerenciaGuarda): GuardaEnBorrador => {
  if (s.declarada?.tipo === "DOMICILIO") {
    return { destino: PARQUEADERO, actaNumero: s.declarada.actaNumero ?? "" };
  }
  const ubicacionId = s.declarada?.ubicacionId ?? s.ubicacionId;
  return { destino: ubicacionId !== null ? String(ubicacionId) : "", actaNumero: "" };
};

const aGuarda = (s: SugerenciaGuarda, borrador: GuardaEnBorrador): GuardaFinal =>
  borrador.destino === PARQUEADERO
    ? {
        vehiculoId: s.vehiculoId,
        tipo: "DOMICILIO",
        ubicacionId: null,
        conductorId: s.conductorId,
        actaNumero: borrador.actaNumero.trim(),
      }
    : {
        vehiculoId: s.vehiculoId,
        tipo: "GARAJE",
        ubicacionId: Number(borrador.destino),
        conductorId: s.conductorId,
      };

const PasoFinDelDia: FC<PasoFinDelDiaProps> = ({
  fecha,
  resumen,
  soloLectura,
  motivoBloqueo,
  onRecargar,
  onVolver,
  onContinuar,
  onAviso,
}) => {
  const filas = resumen.finDelDia;
  // Solo garajes autorizados del catálogo de flota, por su nombre: los manda el resumen.
  const garajes = resumen.garajes;
  const [borrador, setBorrador] = useState<Record<number, GuardaEnBorrador>>(() =>
    Object.fromEntries(filas.map((s) => [s.vehiculoId, borradorInicial(s)])),
  );
  const [errores, setErrores] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState(false);

  const borradores = useMemo(
    () => filas.map((s) => borrador[s.vehiculoId] ?? borradorInicial(s)),
    [filas, borrador],
  );
  const completas = guardasCompletas(borradores);
  const faltanActas = borradores.some(faltaActa);
  const bloqueo = soloLectura
    ? (motivoBloqueo ?? "La ventana de asignación no está abierta")
    : undefined;

  const cambiar = (vehiculoId: number, cambio: Partial<GuardaEnBorrador>) =>
    setBorrador((previo) => ({
      ...previo,
      [vehiculoId]: { ...(previo[vehiculoId] ?? { destino: "", actaNumero: "" }), ...cambio },
    }));

  const confirmar = async () => {
    setGuardando(true);
    setErrores({});
    try {
      const resultado = await PlanificacionService.guardarFinDelDia(
        fecha,
        filas.map((s, i) => aGuarda(s, borradores[i])),
      );
      const conError = Object.fromEntries(
        resultado.errores.map((e) => [e.vehiculoId, e.motivo]),
      );
      setErrores(conError);
      await onRecargar();
      if (resultado.errores.length === 0) {
        onAviso(
          `Garajes confirmados: ${resultado.guardadas} ${resultado.guardadas === 1 ? "vehículo" : "vehículos"}`,
        );
        onContinuar();
      }
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo confirmar el fin del día" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <TarjetaPaso
      numero={3}
      titulo="Dónde se guarda cada vehículo"
      descripcion="Se sugiere el garaje más cercano al último operativo. Cambie solo las excepciones. Un parqueadero fuera de garaje requiere acta (Art. 8)."
      pie={
        <>
          <Boton tamano="lg" onClick={onVolver}>
            ← Volver
          </Boton>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {faltanActas && (
              <span className="text-sm text-error" role="alert">
                Falta el número de acta de un parqueadero.
              </span>
            )}
            <Boton
              variante="primario"
              tamano="lg"
              cargando={guardando}
              motivoDeshabilitado={
                bloqueo ??
                (filas.length === 0
                  ? "No hay vehículos que guardar."
                  : !completas
                    ? "Elija dónde se guarda cada vehículo y escriba las actas."
                    : null)
              }
              onClick={() => void confirmar()}
            >
              {guardando ? "Guardando…" : "Confirmar y continuar →"}
            </Boton>
          </div>
        </>
      }
    >
      {soloLectura && (
        <AvisoEnLinea variante="info">
            Modo lectura: {motivoBloqueo ?? "la ventana de asignación no está abierta"}.
          </AvisoEnLinea>
      )}
      {filas.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          Ningún vehículo tiene operativos asignados en esta jornada.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm table-zebra w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider">
                <th>Vehículo</th>
                <th>Conductor</th>
                <th>Último operativo</th>
                <th>Se guarda en</th>
                <th>Acta</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((s, i) => {
                const actual = borradores[i];
                const sugerido = s.ubicacionId !== null && actual.destino === String(s.ubicacionId);
                const conParqueadero = actual.destino === PARQUEADERO;
                const sinActa = faltaActa(actual);
                return (
                  <tr key={s.vehiculoId}>
                    <td className="font-mono font-semibold">{s.placa}</td>
                    <td>{s.conductor ?? "—"}</td>
                    <td>
                      {textoUltimoOperativo(s)}
                      {s.avisoCombustible && (
                        <span className="block text-xs text-app-muted">
                          Dejar con combustible para el siguiente turno.
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="select select-bordered select-sm"
                          value={actual.destino}
                          disabled={soloLectura}
                          title={bloqueo}
                          aria-label={`Dónde se guarda ${s.placa}`}
                          onChange={(e) => cambiar(s.vehiculoId, { destino: e.target.value })}
                        >
                          <option value="">Elija…</option>
                          {garajes.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                              {nombreDeGaraje(g.nombre)}
                            </option>
                          ))}
                          <option value={PARQUEADERO} disabled={!s.parqueadero.autorizado}>
                            Parqueadero autorizado (requiere acta)
                            {s.parqueadero.autorizado ? "" : " · el conductor no lo tiene"}
                          </option>
                        </select>
                        {sugerido && <span className="badge badge-success badge-sm">Sugerido</span>}
                      </div>
                      {errores[s.vehiculoId] && (
                        <p className="mt-1 text-xs text-error" role="alert">
                          {errores[s.vehiculoId]}
                        </p>
                      )}
                    </td>
                    <td>
                      {conParqueadero ? (
                        <input
                          type="text"
                          className={`input input-bordered input-sm w-32 ${sinActa ? "input-error" : ""}`}
                          placeholder="N.º de acta"
                          aria-label={`N.º de acta de ${s.placa}`}
                          aria-invalid={sinActa}
                          maxLength={60}
                          value={actual.actaNumero}
                          disabled={soloLectura}
                          onChange={(e) => cambiar(s.vehiculoId, { actaNumero: e.target.value })}
                        />
                      ) : (
                        <span className="text-app-muted">No aplica</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </TarjetaPaso>
  );
};

export default PasoFinDelDia;
