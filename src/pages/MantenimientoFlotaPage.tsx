/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mantenimiento de vehículos
 * Archivo: MantenimientoFlotaPage.tsx
 * Responsabilidad: Pantalla P-16. Registrar las paradas de taller de la flota.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * RN-DAF-05. HASTA HOY ESTO SE HACÍA CON UN `INSERT` A MANO.
 *
 * `MANTENIMIENTO` existe en el enumerado desde el esquema inicial y el servidor ya
 * rechazaba asignar una placa parada. Lo que no existía era la forma de decirlo: no había
 * endpoint ni pantalla, así que en la práctica el aviso del taller llegaba por mensaje y
 * vivía en la cabeza de la planificadora.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA VEN LA DAF Y EL ADMINISTRADOR. La DAF porque recibe el aviso del taller y sufre la
 * consecuencia; el Administrador porque mantiene el catálogo de flota.
 *
 * NO DEPENDE DE LA VENTANA DE CARGA, y el servidor tampoco la exige aquí. Un vehículo se
 * avería a la hora que se avería: con la ventana puesta, un taller que llama a las nueve
 * de la mañana no se podría registrar hasta las tres de la tarde, y durante esas seis horas
 * la DAF estaría asignando una placa que no existe.
 *
 * LA FECHA DE LA CABECERA ES SOLO PARA MIRAR. Decide qué placas se muestran como paradas
 * *ese* día; no acota lo que se puede registrar, que son fechas futuras casi siempre.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import MarcoModal from "../components/common/MarcoModal.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import ModalMantenimiento, {
  type ValoresMantenimiento,
} from "../components/flota/ModalMantenimiento.tsx";
import type {
  MantenimientoVehiculo,
  VehiculoDeLaFlota,
} from "../interfaces/Transporte.ts";
import { TransporteService } from "../services/transporte.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { normalizar } from "../utils/texto.util.ts";

/** Hoy, en `AAAA-MM-DD`. La flota se consulta contra un día concreto. */
const hoy = (): string => new Date().toISOString().slice(0, 10);

const MantenimientoFlotaPage = () => {
  const [fecha, setFecha] = useState(() => hoy());

  const [vehiculos, setVehiculos] = useState<VehiculoDeLaFlota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );

  const [busqueda, setBusqueda] = useState("");

  const [elegido, setElegido] = useState<VehiculoDeLaFlota | null>(null);
  const [paradas, setParadas] = useState<MantenimientoVehiculo[]>([]);
  const [cargandoParadas, setCargandoParadas] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);
  const [porRetirar, setPorRetirar] = useState<MantenimientoVehiculo | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  const cargarFlota = useCallback(async () => {
    setCargando(true);

    try {
      const filas = await TransporteService.consultarVehiculos(fecha);
      setVehiculos(filas);
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setVehiculos([]);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargarFlota();
  }, [cargarFlota]);

  /** Las paradas del vehículo elegido. Se recargan tras cada escritura. */
  const cargarParadas = useCallback(async (vehiculoId: number) => {
    setCargandoParadas(true);

    try {
      setParadas(await TransporteService.listarMantenimientos(vehiculoId));
    } catch {
      setParadas([]);
    } finally {
      setCargandoParadas(false);
    }
  }, []);

  const elegir = useCallback(
    (vehiculo: VehiculoDeLaFlota) => {
      setElegido(vehiculo);
      setAvisoModal(null);
      void cargarParadas(vehiculo.id);
    },
    [cargarParadas],
  );

  const coincidentes = useMemo(() => {
    const buscado = normalizar(busqueda);
    if (!buscado) return vehiculos;

    return vehiculos.filter((vehiculo) =>
      normalizar(`${vehiculo.placa} ${vehiculo.descripcion ?? ""}`).includes(
        buscado,
      ),
    );
  }, [vehiculos, busqueda]);

  const registrar = useCallback(
    async (valores: ValoresMantenimiento) => {
      if (!elegido) return;

      setGuardando(true);
      setAvisoModal(null);

      try {
        await TransporteService.registrarMantenimiento(elegido.id, {
          desde: valores.desde,
          hasta: valores.hasta,
          // Los opcionales se omiten en blanco: enviar cadena vacía guardaría un taller
          // que se llama «» en lugar de dejar el dato sin informar.
          taller: valores.taller.trim() || undefined,
          hora: valores.hora.trim() || undefined,
          motivo: valores.motivo.trim() || undefined,
        });

        setRegistrando(false);
        setExito(
          `${elegido.placa} queda parada del ${valores.desde} al ${valores.hasta}. No se podrá asignar en esas fechas.`,
        );
        await cargarParadas(elegido.id);
        await cargarFlota();
      } catch (fallo: unknown) {
        setAvisoModal(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [elegido, cargarParadas, cargarFlota],
  );

  const retirar = useCallback(async () => {
    if (!elegido || !porRetirar) return;

    setGuardando(true);

    try {
      await TransporteService.retirarMantenimiento(elegido.id, porRetirar.id);
      setPorRetirar(null);
      setExito(`La parada de ${elegido.placa} se retiró.`);
      await cargarParadas(elegido.id);
      await cargarFlota();
    } catch (fallo: unknown) {
      setPorRetirar(null);
      setAviso({ texto: presentarError(fallo).mensaje, clase: "alert-error" });
    } finally {
      setGuardando(false);
    }
  }, [elegido, porRetirar, cargarParadas, cargarFlota]);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker font-semibold uppercase">
          DAF
        </p>
        <h1 className="page-heading-title">
          Mantenimiento de vehículos
        </h1>
        <p className="text-sm text-base-content/70">
          Un vehículo con mantenimiento registrado no se puede asignar en esas
          fechas. La asignación de transporte lo muestra inhabilitado, con el
          motivo.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaFlota"
            >
              <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
                Estado de la flota el día
              </span>
            </label>
            <input
              id="fechaFlota"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => {
                setFecha(evento.target.value);
                setElegido(null);
              }}
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
            Flota
          </h2>
          <span className="badge badge-ghost badge-sm">
            {cargando
              ? "Cargando…"
              : `${vehiculos.filter((vehiculo) => !vehiculo.utilizable).length} de ${vehiculos.length} parados`}
          </span>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <input
            type="search"
            className="input input-bordered input-sm w-full sm:max-w-xs"
            placeholder="Buscar por placa…"
            aria-label="Buscar vehículo"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />

          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th scope="col">Placa</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Estado ese día</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {coincidentes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-sm text-base-content/70"
                    >
                      {cargando
                        ? "Cargando la flota…"
                        : busqueda !== ""
                          ? "Ninguna placa coincide con la búsqueda."
                          : "No hay vehículos registrados en la flota."}
                    </td>
                  </tr>
                ) : (
                  coincidentes.map((vehiculo) => (
                    <tr
                      key={vehiculo.id}
                      className={
                        vehiculo.id === elegido?.id ? "bg-primary/5" : undefined
                      }
                    >
                      <td className="px-2 py-1 align-top font-mono text-xs font-semibold">
                        {vehiculo.placa}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {vehiculo.descripcion || "—"}
                      </td>
                      {/* Regla 6: el estado se lee, no se deduce de un color. */}
                      <td className="px-2 py-1 align-top">
                        {vehiculo.utilizable ? (
                          "Disponible"
                        ) : (
                          <span className="font-semibold">
                            {vehiculo.motivo ?? "No disponible"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 align-top">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => elegir(vehiculo)}
                        >
                          Ver paradas
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {elegido && (
        <MarcoModal
          abierto
          etiqueta={`Paradas de ${elegido.placa}`}
          ancho="2xl"
          titulo={`Paradas de ${elegido.placa}`}
          antetitulo="Mantenimiento"
          onCerrar={guardando ? undefined : () => setElegido(null)}
        >
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setAvisoModal(null);
                  setRegistrando(true);
                }}
              >
                Registrar parada
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th scope="col">Desde</th>
                    <th scope="col">Hasta</th>
                    <th scope="col">Taller</th>
                    <th scope="col">Hora</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {paradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-sm text-base-content/70"
                      >
                        {cargandoParadas
                          ? "Cargando…"
                          : "Este vehículo no tiene paradas registradas."}
                      </td>
                    </tr>
                  ) : (
                    paradas.map((parada) => (
                      <tr key={parada.id}>
                        <td className="px-2 py-1 align-top">{parada.desde}</td>
                        <td className="px-2 py-1 align-top">{parada.hasta}</td>
                        <td className="px-2 py-1 align-top">
                          {parada.taller || "—"}
                        </td>
                        <td className="px-2 py-1 align-top">
                          {parada.hora || "—"}
                        </td>
                        <td className="px-2 py-1 align-top">
                          {parada.motivo || "—"}
                        </td>
                        <td className="px-2 py-1 align-top">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => setPorRetirar(parada)}
                            disabled={guardando}
                          >
                            Retirar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </MarcoModal>
      )}

      <ModalMantenimiento
        abierto={registrando}
        vehiculo={elegido}
        guardando={guardando}
        aviso={avisoModal}
        onGuardar={(valores) => void registrar(valores)}
        onCancelar={() => {
          setRegistrando(false);
          setAvisoModal(null);
        }}
      />

      <ModalConfirmacion
        abierto={porRetirar !== null}
        titulo="¿Retirar la parada?"
        mensaje={
          porRetirar
            ? `La parada del ${porRetirar.desde} al ${porRetirar.hasta} se eliminará y el vehículo volverá a ofrecerse en esas fechas.`
            : ""
        }
        textoSi="Sí, retirar"
        procesando={guardando}
        onConfirmar={() => void retirar()}
        onCancelar={() => setPorRetirar(null)}
      />

      {exito && (
        <ModalExito
          abierto
          mensaje={exito}
          onClose={() => setExito(null)}
        />
      )}
    </section>
  );
};

export default MantenimientoFlotaPage;
