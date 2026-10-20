/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: PasoAsignar.tsx
 * Responsabilidad: Paso 2. Cubrir los operativos: «Asignar automáticamente» y ajustar a mano lo
 *                  que haga falta, con la línea de tiempo (o la tabla) de los conductores del día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA ACCIÓN PRINCIPAL: «Asignar automáticamente». Corre el optimizador de siempre —propone y
 * confirma de una vez— y ese optimizador YA trabaja solo sobre los pendientes: lo asignado a mano
 * queda fijo. Las dos opciones («Usar conductores de libre», «Compartir vehículo») van en un menú
 * con su explicación, y el contador dice cuántas están activas.
 *
 * SUGERENCIA DE LIBRES. Si quedan pendientes con la opción de libres apagada, se SIMULA (sin
 * escribir nada) qué pasaría con ella: solo si se cubren más se ofrece «Usar conductor de libre»,
 * que la enciende y vuelve a asignar. Con la ventana cerrada la simulación responde 423 y no se
 * muestra nada.
 *
 * LO QUE SE CONSERVA. Asignar, cambiar y quitar por el cajón de candidatos; propios medios y pedir
 * priorización en ese cajón; hoja de ruta y operación del vehículo bajo cada conductor; las tareas
 * de taller pendientes, con su propio botón y su cajón (`DrawerTareaTaller`, 2026-10-16).
 * UN CAJÓN A LA VEZ: abrir candidatos, tarea u operación cierra los otros dos. Se retiraron los KPIs, «Por cubrir» con arrastre y
 * «Libres del día»: la columna «Sin conductor» y la barra de progreso dicen lo mismo con menos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState, type FC } from "react";

import DrawerCandidatos from "./DrawerCandidatos.tsx";
import DrawerTareaTaller from "./DrawerTareaTaller.tsx";
import TarjetaPaso from "./TarjetaPaso.tsx";
import DrawerOperacionVehiculo from "../linea/DrawerOperacionVehiculo.tsx";
import LineaConductores from "../linea/LineaConductores.tsx";
import Boton, { clasesBoton } from "../../common/Boton.tsx";
import type {
  OperativoJornada,
  RespuestaHuecos,
  ResumenJornadaDaf,
  Simulacion,
} from "../../../interfaces/JornadaDaf.ts";
import type { Planificacion, TramoPlanificado } from "../../../interfaces/Planificacion.ts";
import { JornadaDafService } from "../../../services/jornadaDaf.service.ts";
import { PlanificacionService } from "../../../services/planificacion.service.ts";
import { TrasladosService } from "../../../services/traslados.service.ts";
import { descargarArchivo } from "../../../utils/banner.util.ts";
import { presentarError } from "../../../utils/errorApi.util.ts";
import { mensaje, toast } from "../../../utils/mensaje.ts";
import {
  operativosExclusivos,
  visibleEnLinea,
  type TablaTraslados,
} from "../../../utils/lineaTiempo.util.ts";
import {
  detalleOperativo,
  franja,
  lineaDeDetalle,
} from "../../../utils/planificarDia.util.ts";
import {
  DESCRIPCION_MACROOPERATIVO,
  nombreTipoTransporte,
  TEXTO_PRIORITARIO,
} from "../../../utils/tipoTransporte.util.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";
import Insignia from "../../common/Insignia.tsx";
import {
  compartidoConDe,
  estadoMismaUnidad,
  intencionParaLaDaf,
  invitadosDe,
  textoAsignacionAutomatica,
} from "../../../utils/compartirUnidad.util.ts";

export type VistaConductores = "linea" | "tabla";

type PasoAsignarProps = {
  fecha: string;
  resumen: ResumenJornadaDaf;
  soloLectura: boolean;
  motivoBloqueo: string | null;
  vista: VistaConductores;
  onVista: (vista: VistaConductores) => void;
  /** Vuelve a leer la jornada y devuelve el resumen nuevo. */
  onRecargar: () => Promise<ResumenJornadaDaf | null>;
  onVolver: () => void;
  onContinuar: () => void;
  onAviso: (mensaje: string) => void;
};

const PasoAsignar: FC<PasoAsignarProps> = ({
  fecha,
  resumen,
  soloLectura,
  motivoBloqueo,
  vista,
  onVista,
  onRecargar,
  onVolver,
  onContinuar,
  onAviso,
}) => {
  const { totales } = resumen;
  const [plan, setPlan] = useState<Planificacion | null>(null);
  const [huecos, setHuecos] = useState<RespuestaHuecos | null>(null);
  const [tabla, setTabla] = useState<TablaTraslados | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [usarLibres, setUsarLibres] = useState(false);
  const [compartir, setCompartir] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [simulacion, setSimulacion] = useState<Simulacion | null>(null);

  const [eligiendo, setEligiendo] = useState<OperativoJornada | null>(null);
  const [tarea, setTarea] = useState<TramoPlanificado | null>(null);
  const [operacion, setOperacion] = useState<{ vehiculoId: number; conductorId: number } | null>(
    null,
  );

  // Cierres estables: la pila de capas no se re-apila si `onCerrar` conserva su identidad.
  const cerrarCandidatos = useCallback(() => setEligiendo(null), []);
  const cerrarTarea = useCallback(() => setTarea(null), []);
  const cerrarOperacion = useCallback(() => setOperacion(null), []);

  // La planificación (tramos por conductor) se relee con cada resumen nuevo: es lo que dibuja la línea.
  useEffect(() => {
    let vigente = true;
    PlanificacionService.consultar(fecha)
      .then((datos) => {
        if (vigente) setPlan(datos);
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;
        const presentado = presentarError(fallo);
        setPlan(null);
        if (presentado.estado !== 404) setError(presentado.mensaje);
      });
    return () => {
      vigente = false;
    };
  }, [fecha, resumen]);

  // Horas libres (2026-10-14): las calcula el servidor y se releen con cada resumen, como la planificación.
  // Si fallan, la línea se dibuja sin ellas: son una ayuda, no condición para asignar.
  useEffect(() => {
    let vigente = true;
    JornadaDafService.huecos(fecha)
      .then((datos) => {
        if (vigente) setHuecos(datos);
      })
      .catch(() => {
        if (vigente) setHuecos(null);
      });
    return () => {
      vigente = false;
    };
  }, [fecha, resumen]);

  // La tabla de traslados es de la flota: quien no la ve, ve los traslados sin juicio.
  useEffect(() => {
    let vigente = true;
    TrasladosService.obtener()
      .then((traslados) => {
        if (!vigente) return;
        setTabla({
          pares: traslados.pares.filter(
            (p): p is typeof p & { minutos: number } => p.minutos !== null,
          ),
          reglaGeneral: traslados.reglaGeneral,
        });
      })
      .catch(() => {
        if (vigente) setTabla(null);
      });
    return () => {
      vigente = false;
    };
  }, []);

  /*
   * SUGERENCIA DE LIBRES: solo con pendientes, con la opción apagada y con la ventana abierta. Es
   * una simulación: no escribe. Cualquier fallo (423 incluido) simplemente no muestra el aviso.
   */
  useEffect(() => {
    let vigente = true;
    setSimulacion(null);
    if (soloLectura || usarLibres || totales.sinConductor === 0) return undefined;
    JornadaDafService.simular(fecha, compartir)
      .then((resultado) => {
        if (vigente) setSimulacion(resultado);
      })
      .catch(() => {
        if (vigente) setSimulacion(null);
      });
    return () => {
      vigente = false;
    };
  }, [fecha, resumen, soloLectura, usarLibres, compartir, totales.sinConductor]);

  const sinConductor = resumen.operativos.filter((o) => !o.cubierto);
  const tareasPendientes = useMemo(
    () => plan?.tramos.filter((t) => t.tipo === "TAREA" && t.conductorId === null) ?? [],
    [plan],
  );
  const exclusivos = useMemo(
    () => (plan ? operativosExclusivos(plan) : new Set<number>()),
    [plan],
  );
  const opcionesActivas = Number(usarLibres) + Number(compartir);
  const porcentaje =
    totales.operativos === 0 ? 0 : Math.round((totales.cubiertos / totales.operativos) * 100);
  const bloqueo = soloLectura
    ? (motivoBloqueo ?? "La ventana de asignación no está abierta")
    : undefined;

  const asignarAutomaticamente = async (conLibres: boolean) => {
    setAsignando(true);
    try {
      const antes = totales.cubiertos;
      const propuesta = await PlanificacionService.optimizar(fecha, conLibres, compartir);
      // Una propuesta hecha solo de traslados que viajan en una unidad ya asignada (el «completo» que
      // deja y retira en su punto, 2026-10-21) también se confirma.
      if (propuesta.asignaciones.length === 0 && propuesta.compartidos.length === 0) {
        // No es un éxito: nada cambió. Información, no confirmación.
        toast.info("No hay asignaciones posibles", {
          texto: "Ningún conductor disponible puede cubrir los operativos pendientes.",
        });
        await onRecargar();
        return;
      }
      const resultado = await PlanificacionService.confirmar(fecha, propuesta);
      const nuevo = await onRecargar();
      const cubiertos = (nuevo?.totales.cubiertos ?? antes) - antes;
      onAviso(textoAsignacionAutomatica(cubiertos, resultado.compartidos));
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo asignar automáticamente" });
    } finally {
      setAsignando(false);
    }
  };

  /** «Usar conductor de libre»: enciende la opción y vuelve a asignar sobre los pendientes. */
  const usarLibresSugeridos = () => {
    setUsarLibres(true);
    void asignarAutomaticamente(true);
  };

  /** Un cajón a la vez: abrir uno cierra los otros. */
  const elegirConductor = (operativo: OperativoJornada) => {
    setTarea(null);
    setOperacion(null);
    setEligiendo(operativo);
  };

  const alTramo = (tramo: TramoPlanificado) => {
    if (tramo.tipo === "TAREA") {
      setEligiendo(null);
      setOperacion(null);
      setTarea(tramo);
      return;
    }
    const operativo = resumen.operativos.find((o) => o.id === tramo.operativoId);
    if (operativo) elegirConductor(operativo);
  };

  const hojaDeRuta = async (vehiculoId: number) => {
    try {
      const pdf = await PlanificacionService.hojaDeRuta(fecha, vehiculoId);
      const placa = plan?.vehiculos.find((v) => v.id === vehiculoId)?.placa ?? vehiculoId;
      descargarArchivo(pdf, `hoja-ruta-${placa}-${fecha}.pdf`);
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo descargar la hoja de ruta" });
    }
  };

  const quitarActivacion = async (conductorId: number) => {
    try {
      await PlanificacionService.desactivar(fecha, conductorId);
      await onRecargar();
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo quitar la activación" });
    }
  };

  const conductoresParaTarea = plan
    ? plan.conductores.filter((c) => visibleEnLinea(c, plan.tramos, usarLibres))
    : [];
  const vehiculoOperacion = operacion
    ? plan?.vehiculos.find((v) => v.id === operacion.vehiculoId)
    : undefined;

  return (
    <TarjetaPaso
      numero={2}
      titulo="Asignar conductores"
      // Descripción FIJA del paso (2026-10-08): el detalle de conductores, vehículos y avisos va
      // SOLO bajo la barra de progreso; antes se repetía aquí.
      descripcion="El sistema reparte los operativos y usted ajusta lo que haga falta."
      extremo={
        <>
          <details className="dropdown dropdown-end">
            <summary className={clasesBoton("secundario", "md")}>Opciones ({opcionesActivas})</summary>
            <div className="dropdown-content z-10 mt-2 flex w-80 flex-col gap-3 rounded-md border border-base-300 bg-base-100 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-sm mt-1"
                  checked={usarLibres}
                  onChange={(e) => setUsarLibres(e.target.checked)}
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-app-label">
                    Usar conductores de libre
                  </span>
                  <span className="text-xs text-app-muted">
                    Incluye a quienes hoy tienen día libre. Úselo solo si faltan conductores.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-sm mt-1"
                  checked={compartir}
                  onChange={(e) => setCompartir(e.target.checked)}
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-app-label">Compartir vehículo</span>
                  <span className="text-xs text-app-muted">
                    Un vehículo puede atender operativos de la misma zona que coinciden en hora.
                    Nunca un macrooperativo.
                  </span>
                </span>
              </label>
            </div>
          </details>
          <Boton
            variante="primario"
            tamano="md"
            icono="optimizar"
            cargando={asignando}
            motivoDeshabilitado={
              bloqueo ??
              (totales.sinConductor === 0 ? "No quedan operativos sin conductor." : null)
            }
            onClick={() => void asignarAutomaticamente(usarLibres)}
          >
            {asignando ? "Asignando…" : "Asignar automáticamente"}
          </Boton>
        </>
      }
      pie={
        <>
          <Boton tamano="lg" onClick={onVolver}>
            ← Volver
          </Boton>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {totales.sinConductor > 0 && (
              <span className="text-sm text-app-strong" role="status">
                ⚠ Quedan {totales.sinConductor}{" "}
                {totales.sinConductor === 1 ? "operativo" : "operativos"} sin conductor.
              </span>
            )}
            <Boton
              variante="primario"
              tamano="lg"
              motivoDeshabilitado={
                totales.cubiertos === 0 ? "Cubra al menos un operativo para continuar." : null
              }
              onClick={onContinuar}
            >
              {totales.sinConductor > 0
                ? `Continuar con ${totales.sinConductor} sin cubrir →`
                : "Continuar →"}
            </Boton>
          </div>
        </>
      }
    >
      {/* Una sola barra: azul mientras falta, verde al 100 %. El número va en texto (regla 6). */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-app-label">Progreso de la asignación</span>
          <span className="text-sm text-app-strong">
            <span className="text-2xl font-semibold">{totales.cubiertos}</span> de{" "}
            {totales.operativos} operativos cubiertos
          </span>
        </div>
        <progress
          className={`progress w-full ${porcentaje === 100 ? "progress-success" : "progress-primary"}`}
          value={totales.cubiertos}
          max={Math.max(totales.operativos, 1)}
          aria-label={`${totales.cubiertos} de ${totales.operativos} operativos cubiertos`}
        />
        <span className="text-xs text-app-muted">
          {totales.cubiertos === 0 && totales.operativos > 0
            ? "Empiece con «Asignar automáticamente»."
            : lineaDeDetalle(totales)}
        </span>
      </div>

      {soloLectura && (
        <AvisoEnLinea variante="info">
            Modo lectura: {motivoBloqueo ?? "la ventana de asignación no está abierta"}. Puede
            revisar todo; asignar se habilita cuando abra la ventana.
          </AvisoEnLinea>
      )}

      {simulacion?.sugerencia.aplica && (
        <AvisoEnLinea
          variante="advertencia"
          accion={
            <Boton tamano="sm" cargando={asignando} onClick={usarLibresSugeridos}>
              Usar conductor de libre
            </Boton>
          }
        >
          No alcanzan los conductores de turno para {simulacion.sugerencia.pendientesSinLibres}{" "}
          {simulacion.sugerencia.pendientesSinLibres === 1 ? "operativo" : "operativos"}. Hay{" "}
          {simulacion.sugerencia.libres.length}{" "}
          {simulacion.sugerencia.libres.length === 1 ? "conductor" : "conductores"} de libre (
          {simulacion.sugerencia.libres.map((l) => l.nombre).join(", ")}) que podrían cubrirlos.
        </AvisoEnLinea>
      )}

      {error && (
        <AvisoEnLinea variante="error" titulo="No se pudo cargar el plan del día">
          {error}
        </AvisoEnLinea>
      )}

      {/*
        «SIN CONDUCTOR» ARRIBA, LA LÍNEA DE TIEMPO A TODO EL ANCHO (2026-10-08). En dos columnas, a
        1280 px la línea se quedaba con ~585 px: 06H00–02H00 cabía apenas a 20 px por hora, con las
        horas encimadas. Apiladas, la línea recibe todo el ancho de la tarjeta (~890 px a 1280) y las
        tarjetas pendientes se reparten en la rejilla de tarjetas del inventario.
      */}
      <div className="flex min-w-0 flex-col gap-4">
        <section className="flex flex-col gap-2" aria-labelledby="sin-conductor-titulo">
          <h3 id="sin-conductor-titulo" className="text-sm font-semibold text-app-strong">
            Sin conductor ({sinConductor.length})
          </h3>
          {sinConductor.length === 0 && tareasPendientes.length === 0 && (
            <p className="rounded-md border border-base-300 p-3 text-sm text-app-strong">
              ✓ Todos los operativos tienen conductor.
            </p>
          )}
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sinConductor.map((operativo) => (
              <li
                key={operativo.id}
                className="flex flex-col gap-1 rounded-md border border-warning border-l-4 bg-warning/10 p-3"
                data-testid={`sin-conductor-${operativo.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-app-strong">
                    {operativo.identificador}
                  </span>
                  {operativo.esMacrooperativo && (
                    <span
                      className="badge badge-sm badge-accent"
                      title={`${TEXTO_PRIORITARIO}. ${DESCRIPCION_MACROOPERATIVO}`}
                    >
                      MACRO
                    </span>
                  )}
                  {operativo.transporteLiberado && (
                    <span className="badge badge-sm badge-warning">Transporte liberado</span>
                  )}
                </div>
                <span className="text-xs text-app-strong">{operativo.formulario}</span>
                <span className="text-xs text-app-muted">{detalleOperativo(operativo)}</span>
                {/* Compartir unidad (2026-10-19): lo que pidió quien registró, en palabras. */}
                {intencionParaLaDaf(operativo) && (
                  <span className="text-xs text-app-strong" data-testid={`intencion-${operativo.id}`}>
                    {intencionParaLaDaf(operativo)}
                  </span>
                )}
                {estadoMismaUnidad(operativo) ? (
                  <span
                    className="text-xs text-app-strong"
                    data-testid={`misma-unidad-${operativo.id}`}
                  >
                    {estadoMismaUnidad(operativo)}
                  </span>
                ) : (
                  operativo.parcial && (
                    <span className="text-xs text-app-muted">Algún tramo ya tiene conductor.</span>
                  )
                )}
                <Boton
                  variante="acento"
                  tamano="sm"
                  className="mt-1"
                  onClick={() => elegirConductor(operativo)}
                >
                  Asignar conductor
                </Boton>
              </li>
            ))}
            {tareasPendientes.map((pendiente) => (
              <li
                key={`tarea-${pendiente.id}`}
                className="flex flex-col gap-1 rounded-md border border-warning border-l-4 bg-warning/10 p-3"
              >
                <span className="text-sm font-semibold text-app-strong">
                  {pendiente.descripcion ?? "Llevar a taller"}
                </span>
                <span className="text-xs text-app-muted">
                  Tarea de taller · {franja(pendiente.horaInicio, pendiente.horaFin)}
                </span>
                <Boton
                  variante="acento"
                  tamano="sm"
                  className="mt-1"
                  onClick={() => alTramo(pendiente)}
                >
                  Asignar conductor
                </Boton>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="conductores-dia-titulo">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="conductores-dia-titulo" className="text-sm font-semibold text-app-strong">
              Conductores del día
            </h3>
            <div role="tablist" aria-label="Vista de los conductores" className="join">
              <button
                type="button"
                role="tab"
                aria-selected={vista === "linea"}
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`join-item btn btn-sm ${vista === "linea" ? "btn-primary" : ""}`}
                onClick={() => onVista("linea")}
              >
                Línea de tiempo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={vista === "tabla"}
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`join-item btn btn-sm ${vista === "tabla" ? "btn-primary" : ""}`}
                onClick={() => onVista("tabla")}
              >
                Tabla
              </button>
            </div>
          </div>

          {!plan && !error && (
            <p className="py-6 text-center text-sm text-app-muted" role="status">
              Cargando los conductores…
            </p>
          )}

          {plan && vista === "linea" && (
            <LineaConductores
              fecha={fecha}
              plan={plan}
              conductores={resumen.conductores}
              huecos={huecos}
              tabla={tabla}
              incluirLibres={usarLibres}
              exclusivos={exclusivos}
              soloLectura={soloLectura}
              onTramo={alTramo}
              onHojaRuta={(id) => void hojaDeRuta(id)}
              onOperacion={(vehiculoId, conductorId) => {
                setEligiendo(null);
                setTarea(null);
                setOperacion({ vehiculoId, conductorId });
              }}
              onQuitarActivacion={(id) => void quitarActivacion(id)}
            />
          )}

          {vista === "tabla" && (
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider">
                    <th>Operativo</th>
                    <th>Horario</th>
                    <th>Zona</th>
                    <th>Transporte</th>
                    <th>Conductor</th>
                    <th>Vehículo</th>
                    <th>
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.operativos.map((operativo) => (
                    <tr key={operativo.id} className="hover:bg-primary/5">
                      <td className="font-mono font-semibold">{operativo.identificador}</td>
                      <td>{franja(operativo.horaInicio, operativo.horaFin)}</td>
                      <td>{operativo.zonal ?? "—"}</td>
                      <td>
                        <span className="flex flex-col gap-0.5">
                          <span>{nombreTipoTransporte(operativo.tipoTransporte)}</span>
                          {compartidoConDe(operativo) ? (
                            <Insignia variante="suave">
                              {estadoMismaUnidad(operativo) ??
                                `Compartido con ${compartidoConDe(operativo)}`}
                            </Insignia>
                          ) : (
                            intencionParaLaDaf(operativo) && (
                              <span className="text-xs text-app-muted">
                                {intencionParaLaDaf(operativo)}
                              </span>
                            )
                          )}
                        </span>
                      </td>
                      <td>
                        {operativo.conductores.length > 0 ? (
                          operativo.conductores.map((c) => c.nombre).join(", ")
                        ) : (
                          <span className="badge badge-warning badge-sm">Sin conductor</span>
                        )}
                      </td>
                      <td className="font-mono">{operativo.placas.join(", ") || "—"}</td>
                      <td>
                        <Boton
                          variante={operativo.cubierto ? "enlace" : "acento"}
                          tamano="sm"
                          onClick={() => elegirConductor(operativo)}
                        >
                          {operativo.cubierto ? "Cambiar" : "Asignar"}
                        </Boton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {eligiendo && (
        <DrawerCandidatos
          fecha={fecha}
          operativo={eligiendo}
          soloLectura={soloLectura}
          motivoBloqueo={motivoBloqueo}
          usarLibres={usarLibres}
          invitados={invitadosDe(eligiendo.identificador, resumen.operativos)}
          onCerrar={cerrarCandidatos}
          onHecho={(mensaje) => {
            setEligiendo(null);
            onAviso(mensaje);
            void onRecargar();
          }}
        />
      )}

      {tarea && (
        <DrawerTareaTaller
          key={tarea.id}
          tarea={tarea}
          conductores={conductoresParaTarea}
          bloqueo={bloqueo}
          onCerrar={cerrarTarea}
          onHecho={(mensaje) => {
            setTarea(null);
            onAviso(mensaje);
            void onRecargar();
          }}
        />
      )}

      {operacion && (
        <DrawerOperacionVehiculo
          fecha={fecha}
          vehiculoId={operacion.vehiculoId}
          placa={vehiculoOperacion?.placa ?? ""}
          conductorId={operacion.conductorId}
          conductor={
            plan?.conductores.find((c) => c.id === operacion.conductorId)?.nombre ?? ""
          }
          avisoCombustible={vehiculoOperacion?.avisoCombustible ?? false}
          onCerrar={cerrarOperacion}
        />
      )}
    </TarjetaPaso>
  );
};

export default PasoAsignar;
