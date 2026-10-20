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
 *
 * CAJONES ESTÁNDAR (2026-10-15). «Ver paradas» y la captura de una parada eran modales; ahora son
 * `DrawerLateral` `lg`, y UNO A LA VEZ (D7): «Registrar parada» REEMPLAZA al cajón de paradas y,
 * al cerrarse —guarde o no—, vuelve a él. Tras guardar: aviso breve y la fila del vehículo
 * resaltada (antes, `ModalExito`).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import DrawerLateral from "../components/common/DrawerLateral.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import DrawerMantenimiento, {
  type ValoresMantenimiento,
} from "../components/flota/DrawerMantenimiento.tsx";
import SemanaMantenimiento from "../components/flota/SemanaMantenimiento.tsx";
import { useFechaDaf } from "../context/FechaDafContext.tsx";
import { usePaginaLocal } from "../hooks/usePaginaLocal.ts";
import type {
  EstadoMantenimiento,
  MantenimientoVehiculo,
  VehiculoDeLaFlota,
} from "../interfaces/Transporte.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
import { PlanificacionService } from "../services/planificacion.service.ts";
import { TransporteService } from "../services/transporte.service.ts";
import { avisoDeFallo, presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import { normalizar } from "../utils/texto.util.ts";
import { ANTETITULO_DAF } from "../utils/daf.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

/** Cuánto dura resaltada la fila del vehículo tras guardar. */
const MS_RESALTADO = 4000;

/** El estado de la cita en palabras (regla 6). */
const NOMBRE_ESTADO: Record<EstadoMantenimiento, string> = {
  PROGRAMADO: "Programado",
  EN_TALLER: "En taller",
  LISTO: "Listo",
};

/**
 * Transiciones admitidas (Fase 5): PROGRAMADO → EN_TALLER o LISTO; EN_TALLER → LISTO o vuelve a
 * PROGRAMADO; LISTO es final. El servidor las vuelve a validar.
 */
const TRANSICIONES: Record<EstadoMantenimiento, { a: EstadoMantenimiento; texto: string }[]> = {
  PROGRAMADO: [
    { a: "EN_TALLER", texto: "Marcar en taller" },
    { a: "LISTO", texto: "Marcar listo" },
  ],
  EN_TALLER: [
    { a: "LISTO", texto: "Marcar listo" },
    { a: "PROGRAMADO", texto: "Volver a programado" },
  ],
  LISTO: [],
};

const MantenimientoFlotaPage = () => {
  // La fecha de trabajo compartida de la DAF (2026-10-06): antes, «hoy» en UTC por pantalla.
  const { fecha, setFecha } = useFechaDaf();
  /** «Programar mantenimiento» abre el modal SIN vehículo elegido: se elige dentro. */
  const [programando, setProgramando] = useState(false);
  /** «Programar» desde una fila de la flota (2026-10-06): la placa llega elegida en el modal. */
  const [vehiculoAProgramar, setVehiculoAProgramar] = useState<number | undefined>();
  /** Sube tras cada escritura para que la vista semanal se vuelva a pedir. */
  const [version, setVersion] = useState(0);

  const [vehiculos, setVehiculos] = useState<VehiculoDeLaFlota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [zonales, setZonales] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => {
    let vigente = true;
    CatalogoCuadroService.listarZonales()
      .then((lista) => {
        if (vigente) setZonales(lista.map((z) => ({ id: z.id, nombre: z.nombre })));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  const [elegido, setElegido] = useState<VehiculoDeLaFlota | null>(null);
  const [paradas, setParadas] = useState<MantenimientoVehiculo[]>([]);
  const [cargandoParadas, setCargandoParadas] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);
  const [porRetirar, setPorRetirar] = useState<MantenimientoVehiculo | null>(
    null,
  );
  /** El aviso breve tras guardar o eliminar, y la fila del vehículo resaltada. */
  const [resaltado, setResaltado] = useState<number | null>(null);

  // El resaltado se apaga solo.
  useEffect(() => {
    if (resaltado === null) return undefined;
    const espera = window.setTimeout(() => setResaltado(null), MS_RESALTADO);
    return () => window.clearTimeout(espera);
  }, [resaltado]);

  const cargarFlota = useCallback(async () => {
    setCargando(true);

    try {
      const filas = await TransporteService.consultarVehiculos(fecha);
      setVehiculos(filas);
      setAviso(null);
    } catch (fallo: unknown) {
      setVehiculos([]);
      setAviso(avisoDeFallo(fallo));
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

  // 10 por página (D5); el vehículo elegido no cambia de página.
  const paginaFlota = usePaginaLocal(coincidentes, resaltado, (vehiculo) => vehiculo.id);

  const registrar = useCallback(
    async (valores: ValoresMantenimiento) => {
      const vehiculo =
        (programando
          ? vehiculos.find((v) => String(v.id) === valores.vehiculoId)
          : elegido) ?? null;
      if (!vehiculo) return;

      setGuardando(true);
      setAvisoModal(null);

      try {
        await TransporteService.registrarMantenimiento(vehiculo.id, {
          desde: valores.desde,
          hasta: valores.hasta,
          // Los opcionales se omiten en blanco: enviar cadena vacía guardaría un taller
          // que se llama «» en lugar de dejar el dato sin informar.
          taller: valores.taller.trim() || undefined,
          hora: valores.hora.trim() || undefined,
          motivo: valores.motivo.trim() || undefined,
          zonalTallerId:
            valores.zonalTallerId === "" ? undefined : Number(valores.zonalTallerId),
        });

        setRegistrando(false);
        setProgramando(false);
        toast.exito(
          `${vehiculo.placa} queda parada del ${valores.desde} al ${valores.hasta}. No se podrá asignar en esas fechas.`,
        );
        setResaltado(vehiculo.id);
        if (elegido?.id === vehiculo.id) await cargarParadas(vehiculo.id);
        await cargarFlota();
        setVersion((v) => v + 1);
      } catch (fallo: unknown) {
        setAvisoModal(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [elegido, programando, vehiculos, cargarParadas, cargarFlota],
  );

  /** Cambia el estado de la cita (Programado / En taller / Listo) y relee las paradas. */
  const cambiarEstado = useCallback(
    async (parada: MantenimientoVehiculo, estado: EstadoMantenimiento) => {
      if (!elegido) return;
      setGuardando(true);
      try {
        await PlanificacionService.cambiarEstadoMantenimiento(
          elegido.id,
          parada.id,
          estado,
        );
        await cargarParadas(elegido.id);
        await cargarFlota();
        setVersion((v) => v + 1);
      } catch (fallo: unknown) {
        void mensaje.errorDe(fallo, { titulo: "No se pudo cambiar el estado de la parada" });
      } finally {
        setGuardando(false);
      }
    },
    [elegido, cargarParadas, cargarFlota],
  );

  const retirar = useCallback(async () => {
    if (!elegido || !porRetirar) return;

    // Si el servidor lo rechaza, lanza: el error queda en el modal de la confirmación.
    await TransporteService.retirarMantenimiento(elegido.id, porRetirar.id);
    setPorRetirar(null);
    toast.exito(`La parada de ${elegido.placa} se eliminó.`);
    await cargarParadas(elegido.id);
    await cargarFlota();
    setVersion((v) => v + 1);
  }, [elegido, porRetirar, cargarParadas, cargarFlota]);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="page-heading-kicker font-semibold uppercase">
            {ANTETITULO_DAF}
          </p>
          <h1 className="page-heading-title">
            Mantenimiento de vehículos
          </h1>
          <p className="page-heading-subtitle text-sm">
            Un vehículo con mantenimiento registrado no se puede asignar en esas
            fechas. La asignación de transporte lo muestra inhabilitado, con el
            motivo.
          </p>
        </div>
        <div className="app-page-header-actions flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaFlota"
            >
              <span className="text-app-label text-xs uppercase tracking-[0.12em]">
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
          {/* La acción principal (2026-10-06): antes había que buscar la placa y «Ver paradas». */}
          <Boton
            variante="primario"
            tamano="md"
            icono="mantenimiento"
            motivoDeshabilitado={vehiculos.length === 0 ? "No hay vehículos en la flota" : null}
            onClick={() => {
              setAvisoModal(null);
              setVehiculoAProgramar(undefined);
              setProgramando(true);
            }}
          >
            Programar mantenimiento
          </Boton>
        </div>
      </header>

      <SemanaMantenimiento key={fecha} desdeInicial={fecha} version={version} />

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudo cargar la flota"
          accion={
            <Boton tamano="sm" onClick={() => void cargarFlota()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
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
                  <th scope="col" className="text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {coincidentes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-sm text-app-muted"
                    >
                      {cargando
                        ? "Cargando la flota…"
                        : busqueda !== ""
                          ? "Ninguna placa coincide con la búsqueda."
                          : "No hay vehículos registrados en la flota."}
                    </td>
                  </tr>
                ) : (
                  paginaFlota.filas.map((vehiculo) => (
                    <tr
                      key={vehiculo.id}
                      className={
                        vehiculo.id === resaltado
                          ? "bg-success/10"
                          : vehiculo.id === elegido?.id
                            ? "bg-primary/5"
                            : undefined
                      }
                    >
                      <td className="px-2 py-1 align-top font-mono font-semibold">
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
                        <div className="flex flex-nowrap justify-end gap-1.5">
                          <Boton
                            variante="acento"
                            tamano="sm"
                            icono="mantenimiento"
                            aria-label={`Programar mantenimiento de ${vehiculo.placa}`}
                            onClick={() => {
                              setAvisoModal(null);
                              setVehiculoAProgramar(vehiculo.id);
                              setProgramando(true);
                            }}
                          >
                            Programar
                          </Boton>
                          <Boton tamano="sm" onClick={() => elegir(vehiculo)}>
                            Ver paradas
                          </Boton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Paginacion
            page={paginaFlota.pagina}
            pageSize={paginaFlota.tamano}
            total={paginaFlota.total}
            onPage={paginaFlota.irA}
            etiqueta="vehículos"
          />
        </div>
      </div>

      {elegido && (
        <DrawerLateral
          abierto={!registrando}
          ancho="lg"
          modo="lectura"
          titulo={`Paradas de ${elegido.placa}`}
          subtitulo={elegido.descripcion || "Paradas de taller registradas"}
          guardando={guardando}
          onCerrar={() => setElegido(null)}
        >
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <Boton
                variante="acento"
                tamano="md"
                icono="agregar"
                onClick={() => {
                  setAvisoModal(null);
                  setRegistrando(true);
                }}
              >
                Registrar parada
              </Boton>
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
                    <th scope="col">Estado</th>
                    <th scope="col" className="text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-sm text-app-muted"
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
                          <span className="badge badge-ghost badge-sm whitespace-nowrap">
                            {NOMBRE_ESTADO[parada.estado ?? "PROGRAMADO"]}
                          </span>
                        </td>
                        <td className="px-2 py-1 align-top">
                          <div className="flex flex-nowrap justify-end gap-1.5">
                            {TRANSICIONES[parada.estado ?? "PROGRAMADO"].map((t) => (
                              <Boton
                                key={t.a}
                                tamano="sm"
                                onClick={() => void cambiarEstado(parada, t.a)}
                                deshabilitado={guardando}
                              >
                                {t.texto}
                              </Boton>
                            ))}
                            {/* Borra la fila (`t_disponibilidad` no tiene baja lógica): Eliminar. */}
                            <Boton
                              variante="peligroTexto"
                              tamano="sm"
                              icono="eliminar"
                              onClick={() => setPorRetirar(parada)}
                              deshabilitado={guardando}
                              aria-label={`Eliminar la parada del ${parada.desde} al ${parada.hasta}`}
                            >
                              Eliminar
                            </Boton>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DrawerLateral>
      )}

      <DrawerMantenimiento
        abierto={registrando || programando}
        vehiculo={programando ? null : elegido}
        vehiculos={programando ? vehiculos : undefined}
        desdeInicial={programando ? fecha : ""}
        vehiculoInicialId={programando ? vehiculoAProgramar : undefined}
        guardando={guardando}
        aviso={avisoModal}
        zonales={zonales}
        onGuardar={(valores) => void registrar(valores)}
        onCancelar={() => {
          setRegistrando(false);
          setProgramando(false);
          setAvisoModal(null);
        }}
      />

      <MensajeModal
        abierto={porRetirar !== null}
        variante="peligro"
        titulo="¿Eliminar la parada?"
        mensaje={
          porRetirar
            ? `La parada del ${porRetirar.desde} al ${porRetirar.hasta} se eliminará y el vehículo volverá a ofrecerse en esas fechas.`
            : ""
        }
        textoPrincipal="Sí, eliminar"
        tituloError="No se pudo eliminar la parada"
        onPrincipal={retirar}
        onSecundario={() => setPorRetirar(null)}
      />
    </section>
  );
};

export default MantenimientoFlotaPage;
