/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: AsignacionTransportePage.tsx
 * Responsabilidad: Pantalla P-03. Resolver el transporte de la jornada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO LA DAF. La ruta la protege `RutaProtegida` y el servidor la protege con
 * `@Roles(DAF)` en endpoints propios bajo `/transporte`. **Ningún otro perfil monta este
 * componente**: no se oculta el panel, no se descarga.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA VENTANA CIERRA LA ESCRITURA, NO LA CONSULTA. `VentanaCargaGuard` deja pasar toda
 * petición de lectura, así que la bandeja se ve a cualquier hora. Lo que cambia con la
 * hora es si se puede escribir, y **cuál de dos frases** acompaña al aviso:
 *
 *   · Antes de las 15H00 → aún no es su turno (caso 7). No ha perdido nada.
 *   · Después de las 16H30 → la ventana ya cerró (caso 8).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DE DÓNDE SALE LA LISTA DE VEHÍCULOS, Y POR QUÉ ES UN PROBLEMA.
 *
 * `ActualizarTransporte` exige `vehiculoId`, pero **la DAF no tiene ningún endpoint para
 * listar la flota**: `GET /administracion/vehiculos` es del `ADMINISTRADOR`. El único
 * vehículo que este perfil llega a conocer es el habitual de cada conductor, que viaja en
 * `GET /transporte/conductores`.
 *
 * Así que la lista se compone con **los vehículos habituales de los conductores
 * disponibles**, sin repetir. Es lo que se puede ofrecer sin inventar nada, y cubre el
 * caso 3 del plan; pero un vehículo que no sea habitual de nadie es inasignable desde
 * aquí. Queda registrado como pendiente de validación, no disimulado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import BandejaTransporte from "../components/transporte/BandejaTransporte.tsx";
import CamposCalculados from "../components/cuadro/CamposCalculados.tsx";
import IndicadorFlota from "../components/transporte/IndicadorFlota.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import PanelAsignacionTransporte from "../components/transporte/PanelAsignacionTransporte.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import { useCuadroDiario } from "../hooks/useCuadroDiario.ts";
import { useVentanaCarga } from "../hooks/useVentanaCarga.ts";
import { ROLES_DE_TRANSPORTE } from "../config/env.ts";
import type {
  CapacidadFlota,
  ConductorDisponible,
  OperativoPendiente,
} from "../interfaces/Transporte.ts";
import { TransporteService } from "../services/transporte.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import { paginar } from "../utils/listadoOperativos.util.ts";
import {
  coincideEnBandeja,
  SIN_PENDIENTES,
  vehiculosDeLosConductores,
} from "../utils/flota.util.ts";
import { momentoRespectoDeVentana } from "../utils/ventanaCarga.util.ts";

const AsignacionTransportePage = () => {
  /**
   * La misma jornada que arma P-01: la del **día siguiente**, y se puede cambiar.
   *
   * La DAF asigna esta tarde el transporte de los operativos de mañana, sobre el mismo
   * cuadro que los departamentos acaban de cargar. Fijar hoy dejaba la bandeja vacía
   * sin explicar por qué. Ver `jornada.util.ts`.
   */
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

  const { cuadro, cargando: cargandoCuadro } = useCuadroDiario(fecha);
  // La ventana de la DAF, no la del primer rol de la lista de quien entra. Sin este
  // argumento, una cuenta con varios roles recibía la ventana de otro departamento y la
  // bandeja se bloqueaba sola justo en la hora y media de la DAF. Ver `useVentanaCarga`.
  const ventana = useVentanaCarga(ROLES_DE_TRANSPORTE);

  const [pendientes, setPendientes] = useState<OperativoPendiente[]>([]);
  const [conductores, setConductores] = useState<ConductorDisponible[]>([]);
  const [capacidad, setCapacidad] = useState<CapacidadFlota | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoConductores, setCargandoConductores] = useState(true);

  const [seleccionado, setSeleccionado] = useState<OperativoPendiente | null>(
    null,
  );
  const [guardando, setGuardando] = useState(false);
  const [avisoPanel, setAvisoPanel] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [tamanio, setTamanio] = useState(10);

  const momento = momentoRespectoDeVentana(ventana.ventana);
  const soloLectura = !ventana.puedeEscribir;

  const cargarBandeja = useCallback(async () => {
    setCargando(true);

    try {
      const [filas, flota] = await Promise.all([
        TransporteService.consultarPendientes(fecha),
        TransporteService.consultarCapacidad(fecha),
      ]);
      setPendientes(filas);
      setCapacidad(flota);
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setPendientes([]);
      setCapacidad(null);
      // Un 404 es una jornada que nadie abrió, no una avería.
      if (error.estado !== 404) {
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      }
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargarBandeja();
  }, [cargarBandeja]);

  useEffect(() => {
    let vigente = true;
    setCargandoConductores(true);

    TransporteService.consultarConductores(fecha)
      .then((filas) => {
        if (vigente) setConductores(filas);
      })
      .catch(() => {
        if (vigente) setConductores([]);
      })
      .finally(() => {
        if (vigente) setCargandoConductores(false);
      });

    return () => {
      vigente = false;
    };
  }, [fecha]);

  const vehiculos = useMemo(
    () => vehiculosDeLosConductores(conductores),
    [conductores],
  );

  const coincidentes = useMemo(
    () => pendientes.filter((operativo) => coincideEnBandeja(operativo, busqueda)),
    [pendientes, busqueda],
  );

  const pagina0 = useMemo(
    () => paginar(coincidentes, pagina, tamanio),
    [coincidentes, pagina, tamanio],
  );

  useEffect(() => {
    if (pagina0.pagina !== pagina) setPagina(pagina0.pagina);
  }, [pagina0.pagina, pagina]);

  /**
   * Tras resolver un operativo se recarga la bandeja y **el panel se cierra**: la fila que
   * lo alimentaba ya no está pendiente, y dejarla en pantalla invitaría a asignarla otra
   * vez. Es el caso 5 del plan.
   */
  const alResolver = useCallback(
    async (mensaje: string) => {
      setExito(mensaje);
      setSeleccionado(null);
      setAvisoPanel(null);
      await cargarBandeja();
    },
    [cargarBandeja],
  );

  /**
   * Cambiar de jornada cierra el panel y vuelve a la primera página.
   *
   * El operativo seleccionado es de la bandeja que se abandona: dejarlo abierto mientras
   * detrás se carga otra jornada permitiría asignar conductor a un operativo que ya no
   * está en pantalla.
   */
  const cambiarJornada = useCallback((nueva: string) => {
    setFecha(nueva);
    setSeleccionado(null);
    setAvisoPanel(null);
    setPagina(0);
  }, []);

  const asignar = useCallback(
    async (conductorId: number, vehiculoId: number) => {
      if (!seleccionado) return;

      setGuardando(true);
      setAvisoPanel(null);

      try {
        const resultado = await TransporteService.asignar(seleccionado.id, {
          conductorId,
          vehiculoId,
        });
        await alResolver(
          `Transporte asignado a ${resultado.identificador}: ${
            resultado.conductor?.nombreCompleto ?? "conductor"
          } · ${resultado.vehiculo?.placa ?? "vehículo"}.`,
        );
      } catch (fallo: unknown) {
        // Caso 4: las reglas de descanso del conductor llegan en el 409, con el nombre y
        // el motivo. La selección se conserva: el panel sigue abierto tal como estaba.
        setAvisoPanel(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [seleccionado, alResolver],
  );

  const declararPropiosMedios = useCallback(async () => {
    if (!seleccionado) return;

    setGuardando(true);
    setAvisoPanel(null);

    try {
      const resultado = await TransporteService.declararPropiosMedios(
        seleccionado.id,
      );
      await alResolver(
        `${resultado.identificador} se cubrirá por propios medios. No se asignó vehículo.`,
      );
    } catch (fallo: unknown) {
      setAvisoPanel(presentarError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  }, [seleccionado, alResolver]);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          DAF
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
          Asignación de transporte
        </h1>
        <CamposCalculados
          cuadro={cuadro}
          cargando={cargandoCuadro}
        />

        {/* La misma jornada que P-01, y por el mismo motivo: una bandeja vacía puede
            serlo porque no hay pendientes o porque se está mirando el día equivocado. */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaCuadro"
            >
              <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
                Fecha de la jornada
              </span>
            </label>
            <input
              id="fechaCuadro"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => cambiarJornada(evento.target.value)}
            />
          </div>
        </div>
      </header>

      {/* La regla, dicha además de mostrada. FASE5 §4.2. */}
      <div className="alert alert-info">
        <span>
          Edición restringida. De cada operativo solo puede completar el conductor
          y la placa; el resto lo cargó el departamento responsable.
        </span>
      </div>

      {/* Casos 7 y 8: la misma ventana cerrada, dos situaciones distintas. */}
      {!ventana.cargando && soloLectura && (
        <div
          className={`alert ${momento === "ANTES" ? "alert-info" : "alert-error"}`}
        >
          <span>
            {momento === "ANTES"
              ? `Aún no es el turno de la DAF: la bandeja está en solo lectura hasta las ${ventana.ventana?.horaApertura ?? ""}. ${ventana.mensaje}`
              : `La ventana de asignación ya cerró y la bandeja queda en solo lectura. ${ventana.mensaje}`}
          </span>
        </div>
      )}

      {/*
        La DAF tiene la ventana más corta del sistema —15H00 a 16H30, hora y media— y es
        la última en tocar el cuadro antes de que la Dirección lo cierre. Aquí la cuenta
        atrás es la que más se agradece.
      */}
      {!ventana.cargando && <AvisoVentana cuentaAtras={ventana.cuentaAtras} />}

      {/* Caso 9: se avisa, no se bloquea. */}
      {capacidad?.hayAdvertencia && capacidad.advertencia && (
        <div
          className="alert alert-warning"
          role="status"
        >
          <span>{capacidad.advertencia}</span>
        </div>
      )}

      {aviso && (
        <div
          className={`alert ${aviso.clase}`}
          role="alert"
        >
          <span>{aviso.texto}</span>
        </div>
      )}

      {seleccionado && (
        <PanelAsignacionTransporte
          // Cambiar de fila vuelve a montar el panel: así la selección del operativo
          // anterior no sobrevive un instante sobre el nuevo.
          key={seleccionado.id}
          operativo={seleccionado}
          conductores={conductores}
          vehiculos={vehiculos}
          cargandoConductores={cargandoConductores}
          soloLectura={soloLectura}
          guardando={guardando}
          aviso={avisoPanel}
          onAsignar={(conductorId, vehiculoId) =>
            void asignar(conductorId, vehiculoId)
          }
          onPropiosMedios={() => void declararPropiosMedios()}
          onCancelar={() => {
            setSeleccionado(null);
            setAvisoPanel(null);
          }}
        />
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Planificaciones recibidas
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <IndicadorFlota
              capacidad={capacidad}
              cargando={cargando}
            />
            <span className="badge badge-ghost badge-sm">
              {cargando
                ? "Cargando…"
                : `${pendientes.length} ${
                    pendientes.length === 1 ? "pendiente" : "pendientes"
                  }`}
            </span>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              className="input input-bordered input-sm w-full sm:max-w-xs"
              placeholder="Buscar…"
              aria-label="Buscar en la bandeja"
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(evento.target.value);
                setPagina(0);
              }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setBusqueda("");
                setPagina(0);
              }}
              disabled={busqueda === ""}
            >
              Limpiar filtros
            </button>
          </div>

          <BandejaTransporte
            operativos={pagina0.filas}
            seleccionadoId={seleccionado?.id ?? null}
            onSeleccionar={(operativo) => {
              setSeleccionado(operativo);
              setAvisoPanel(null);
            }}
            soloLectura={soloLectura}
            mensajeVacio={
              cargando
                ? "Cargando la bandeja…"
                : busqueda !== ""
                  ? "Ningún operativo coincide con la búsqueda."
                  : // Caso 10: no queda nada por resolver, y se dice así.
                    SIN_PENDIENTES
            }
          />

          {coincidentes.length > 0 && (
            <Paginacion
              page={pagina0.pagina}
              pageSize={tamanio}
              total={pagina0.total}
              onPage={setPagina}
              onPageSize={setTamanio}
              etiqueta="operativos"
            />
          )}
        </div>
      </div>

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

export default AsignacionTransportePage;
