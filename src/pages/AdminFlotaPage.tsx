/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: AdminFlotaPage.tsx
 * Responsabilidad: Pantalla P-12. Dar de alta y mantener conductores y vehículos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE. Los ocho endpoints estaban en el servidor desde M-17, y hasta hoy
 * **solo se podían usar con curl**: el manual del administrador lo decía con todas las
 * letras —«se administran por API. No hay pantalla»— y era la limitación L-11. Mientras
 * tanto `RF-056`, de prioridad Alta, exigía administrarlos.
 *
 * La consecuencia era concreta y medible: **0 conductores y 0 vehículos en la base**, es
 * decir PV-03, es decir que la DAF no podía asignar transporte a ningún operativo. Esta
 * pantalla no arregla PV-03 —los datos los tiene la DAF—, lo desbloquea.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA PANTALLA CON DOS PANELES, Y LOS VEHÍCULOS PRIMERO.
 *
 * No son dos rutas porque el vehículo habitual de un conductor apunta a un vehículo: hay
 * que tener los dos a la vista. Y el panel de vehículos va arriba porque **el orden de
 * carga importa**: no se puede asignar vehículo habitual a un conductor si el vehículo no
 * existe todavía, y descubrirlo con un desplegable vacío es peor que leerlo antes.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA BAJA NO SE PUEDE DESHACER DESDE AQUÍ, y se advierte antes de confirmar en lugar de
 * ofrecer un botón «Reactivar» que el servidor rechazaría: `ActualizarConductorDto` y
 * `ActualizarVehiculoDto` no admiten `activo`, a diferencia del contrato de personal.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import ModalConductor, {
  type ValoresConductor,
} from "../components/flota/ModalConductor.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import PanelUbicaciones from "../components/flota/PanelUbicaciones.tsx";
import ModalVehiculo, {
  type ValoresVehiculo,
} from "../components/flota/ModalVehiculo.tsx";
import TablaConductores from "../components/flota/TablaConductores.tsx";
import TablaVehiculos from "../components/flota/TablaVehiculos.tsx";
import type { FiltrosFlota } from "../interfaces/Flota.ts";
import type {
  Conductor,
  UbicacionFlota,
  Vehiculo,
} from "../interfaces/Transporte.ts";
import { FlotaService } from "../services/flota.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import {
  filtrarConductores,
  filtrarVehiculos,
  hayFiltrosDeFlota,
} from "../utils/flota.util.ts";

/** Qué se está editando, en cada panel. `"alta"` es dar de alta uno nuevo. */
type EdicionVehiculo = { modo: "alta" } | { modo: "edicion"; vehiculo: Vehiculo } | null;
type EdicionConductor =
  | { modo: "alta" }
  | { modo: "edicion"; conductor: Conductor }
  | null;

/** Lo que está por darse de baja, con su tipo, para una sola confirmación. */
type PorDarDeBaja =
  | { tipo: "vehiculo"; vehiculo: Vehiculo }
  | { tipo: "conductor"; conductor: Conductor }
  | null;

const AdminFlotaPage = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [cargando, setCargando] = useState(true);

  const [filtrosVehiculos, setFiltrosVehiculos] = useState<FiltrosFlota>({});
  const [filtrosConductores, setFiltrosConductores] = useState<FiltrosFlota>({});

  const [edicionVehiculo, setEdicionVehiculo] = useState<EdicionVehiculo>(null);
  const [edicionConductor, setEdicionConductor] =
    useState<EdicionConductor>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<PorDarDeBaja>(null);

  const [guardando, setGuardando] = useState(false);

  /**
   * TRES AVISOS SEPARADOS, como en P-07. El de cada modal vive dentro del modal para que
   * un rechazo del servidor no obligue a volver a capturar lo escrito; el global habla de
   * la pantalla entera.
   */
  const [avisoVehiculo, setAvisoVehiculo] = useState<string | null>(null);
  const [avisoConductor, setAvisoConductor] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  /** RN-DAF-03. Zonales donde puede quedar un vehiculo. Nace vacio: es Q-01. */
  const [ubicaciones, setUbicaciones] = useState<UbicacionFlota[]>([]);

  /**
   * Los dos maestros a la vez, **siempre con inactivos**.
   *
   * Se piden juntos porque el panel de vehículos necesita los conductores para decir
   * cuántos llevan cada placa, y el modal de conductor necesita los vehículos para el
   * desplegable. Pedirlos por separado dejaría una de las dos vistas desfasada tras
   * cualquier escritura.
   */
  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const [flota, personas, zonales] = await Promise.all([
        FlotaService.listarVehiculos(true),
        FlotaService.listarConductores(true),
        FlotaService.listarUbicaciones(),
      ]);

      setVehiculos(flota);
      setConductores(personas);
      setUbicaciones(zonales);
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setVehiculos([]);
      setConductores([]);
      setUbicaciones([]);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const vehiculosVisibles = useMemo(
    () => filtrarVehiculos(vehiculos, filtrosVehiculos),
    [vehiculos, filtrosVehiculos],
  );

  const conductoresVisibles = useMemo(
    () => filtrarConductores(conductores, filtrosConductores),
    [conductores, filtrosConductores],
  );

  // ────────── Zonales de reposo · RN-DAF-03 ──────────

  const crearUbicacion = useCallback(
    async (nombre: string) => {
      setGuardando(true);

      try {
        const creada = await FlotaService.crearUbicacion({ nombre });
        setExito(
          creada.nombre +
            " quedo registrada como zonal de reposo. La DAF ya puede declarar que un vehiculo queda alli.",
        );
        await cargar();
      } catch (fallo: unknown) {
        setAviso({ texto: presentarError(fallo).mensaje, clase: "alert-error" });
      } finally {
        setGuardando(false);
      }
    },
    [cargar],
  );

  /** Baja LOGICA: una zonal ya usada en un destino no se puede borrar. */
  const desactivarUbicacion = useCallback(
    async (id: number) => {
      setGuardando(true);

      try {
        await FlotaService.actualizarUbicacion(id, { activo: false });
        await cargar();
      } catch (fallo: unknown) {
        setAviso({ texto: presentarError(fallo).mensaje, clase: "alert-error" });
      } finally {
        setGuardando(false);
      }
    },
    [cargar],
  );

  // ─────────────────────────── Vehículos ───────────────────────────

  const guardarVehiculo = useCallback(
    async (valores: ValoresVehiculo) => {
      if (!edicionVehiculo) return;

      setGuardando(true);
      setAvisoVehiculo(null);

      try {
        // Vacío se envía como ausente, no como cadena vacía: el contrato declara la
        // descripción opcional, y una cadena vacía guardaría un dato que no es un dato.
        const descripcion = valores.descripcion.trim() || undefined;

        if (edicionVehiculo.modo === "alta") {
          const creado = await FlotaService.crearVehiculo({
            placa: valores.placa.trim(),
            descripcion,
          });
          setExito(
            `El vehículo ${creado.placa} quedó registrado. Asígnelo como habitual a un conductor para que la DAF pueda usarlo.`,
          );
        } else {
          const actualizado = await FlotaService.actualizarVehiculo(
            edicionVehiculo.vehiculo.id,
            { placa: valores.placa.trim(), descripcion },
          );
          setExito(`El vehículo ${actualizado.placa} quedó guardado.`);
        }

        setEdicionVehiculo(null);
        await cargar();
      } catch (fallo: unknown) {
        setAvisoVehiculo(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [cargar, edicionVehiculo],
  );

  // ─────────────────────────── Conductores ───────────────────────────

  const guardarConductor = useCallback(
    async (valores: ValoresConductor) => {
      if (!edicionConductor) return;

      setGuardando(true);
      setAvisoConductor(null);

      try {
        const telefono = valores.telefono.trim() || undefined;
        const licenciaTipo = valores.licenciaTipo.trim() || undefined;
        // El `<select>` entrega texto; vacío significa «sin asignar» y viaja como ausente.
        const vehiculoHabitualId = valores.vehiculoHabitualId
          ? Number(valores.vehiculoHabitualId)
          : undefined;
        // Los tres del 2026-08-31. El desplegable entrega texto; vacio significa «no
        // consta» y viaja como ausente, NO como cadena vacia: el servidor distingue un
        // dato sin registrar de un valor, y de esa distincion depende que la regla del
        // contrato se aplique o no.
        const sector = valores.sector || undefined;
        const tipoContrato = valores.tipoContrato || undefined;

        if (edicionConductor.modo === "alta") {
          const creado = await FlotaService.crearConductor({
            cedula: valores.cedula.trim(),
            nombreCompleto: valores.nombreCompleto.trim(),
            telefono,
            licenciaTipo,
            vehiculoHabitualId,
            sector,
            parqueaderoAutorizado: valores.parqueaderoAutorizado,
            tipoContrato,
          });
          setExito(
            `${creado.nombreCompleto} quedó registrado como conductor.` +
              (vehiculoHabitualId
                ? " Ya se le puede asignar transporte."
                : " Todavía NO tiene vehículo habitual: la DAF no podrá proponerle placa."),
          );
        } else {
          const actualizado = await FlotaService.actualizarConductor(
            edicionConductor.conductor.id,
            {
              nombreCompleto: valores.nombreCompleto.trim(),
              telefono,
              licenciaTipo,
              vehiculoHabitualId,
              sector,
              parqueaderoAutorizado: valores.parqueaderoAutorizado,
              tipoContrato,
            },
          );
          setExito(`Los datos de ${actualizado.nombreCompleto} quedaron guardados.`);
        }

        setEdicionConductor(null);
        await cargar();
      } catch (fallo: unknown) {
        setAvisoConductor(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [cargar, edicionConductor],
  );

  // ─────────────────────────── Baja ───────────────────────────

  const confirmarBaja = useCallback(async () => {
    if (!porDarDeBaja) return;

    setGuardando(true);
    setAviso(null);

    try {
      // El servidor redacta el motivo y cuenta los operativos históricos: se muestra tal
      // cual (regla 7), porque nombra al registro y explica que no se borra nada.
      const baja =
        porDarDeBaja.tipo === "vehiculo"
          ? await FlotaService.desactivarVehiculo(porDarDeBaja.vehiculo.id)
          : await FlotaService.desactivarConductor(porDarDeBaja.conductor.id);

      setPorDarDeBaja(null);
      setExito(baja.mensaje);
      await cargar();
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setPorDarDeBaja(null);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setGuardando(false);
    }
  }, [cargar, porDarDeBaja]);

  /**
   * El texto de la confirmación. Nombra el registro y **advierte que no se deshace**.
   *
   * Lo segundo no es una fórmula de cortesía: el contrato de edición de la flota no admite
   * `activo`, así que una baja por error solo se corrige tocando la base. Es la última
   * pantalla donde quien confirma puede enterarse.
   */
  const textoDeLaBaja = (objetivo: NonNullable<PorDarDeBaja>): string => {
    const comun =
      " Se conserva en los operativos donde ya figura, y deja de ofrecerse a la DAF. " +
      "Esta baja NO se puede deshacer desde la aplicación.";

    return objetivo.tipo === "vehiculo"
      ? `Se dará de baja el vehículo ${objetivo.vehiculo.placa}.${comun}`
      : `Se dará de baja a ${objetivo.conductor.nombreCompleto}.${comun}`;
  };

  const filtrandoVehiculos = hayFiltrosDeFlota(filtrosVehiculos);
  const filtrandoConductores = hayFiltrosDeFlota(filtrosConductores);

  /** Cuántos conductores activos no podrán recibir placa. Se avisa en la cabecera. */
  const sinVehiculo = conductores.filter(
    (conductor) => conductor.activo && !conductor.vehiculoHabitual,
  ).length;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          Administración
        </p>
        <h1 className="page-heading-title">
          Conductores y vehículos
        </h1>
        <p className="page-heading-subtitle text-sm">
          Maestro de la flota. De aquí sale lo que la DAF puede asignar en la
          pantalla de transporte: sin conductores registrados, ningún operativo
          puede recibir vehículo.
        </p>
      </header>

      {aviso && (
        <div
          className={`alert ${aviso.clase}`}
          role="alert"
        >
          <span>{aviso.texto}</span>
        </div>
      )}

      {/* PV-33 dicho donde importa: un conductor sin vehículo habitual deja a la DAF sin
          placa que proponer, y el alta no da ningún error. */}
      {!cargando && sinVehiculo > 0 && (
        <div
          className="alert alert-warning"
          role="status"
        >
          <span>
            {sinVehiculo === 1
              ? "Hay un conductor activo sin vehículo habitual: la DAF no podrá proponerle placa."
              : `Hay ${sinVehiculo} conductores activos sin vehículo habitual: la DAF no podrá proponerles placa.`}
          </span>
        </div>
      )}

      {/* ─────────────── Vehículos, primero: sin ellos no hay habitual que asignar ─────────────── */}
      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Vehículos
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-ghost badge-sm">
              {cargando
                ? "Cargando…"
                : `${vehiculosVisibles.length} de ${vehiculos.length} registros`}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={() => {
                setEdicionVehiculo({ modo: "alta" });
                setAvisoVehiculo(null);
              }}
              disabled={cargando || guardando}
            >
              Nuevo vehículo
            </button>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <FiltrosDeFlota
            filtros={filtrosVehiculos}
            onCambiar={setFiltrosVehiculos}
            etiqueta="placa o descripción"
            id="vehiculos"
          />

          <TablaVehiculos
            vehiculos={vehiculosVisibles}
            conductores={conductores}
            procesando={guardando}
            onEditar={(vehiculo) => {
              setEdicionVehiculo({ modo: "edicion", vehiculo });
              setAvisoVehiculo(null);
            }}
            onDarDeBaja={(vehiculo) =>
              setPorDarDeBaja({ tipo: "vehiculo", vehiculo })
            }
            mensajeVacio={
              cargando
                ? "Cargando los vehículos…"
                : filtrandoVehiculos
                  ? "Ningún vehículo coincide con el filtro."
                  : "No hay ningún vehículo registrado. Empiece por aquí: sin vehículos no se puede asignar uno habitual a los conductores."
            }
          />
        </div>
      </div>

      {/* ─────────────────────────── Conductores ─────────────────────────── */}
      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Conductores
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-ghost badge-sm">
              {cargando
                ? "Cargando…"
                : `${conductoresVisibles.length} de ${conductores.length} registros`}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={() => {
                setEdicionConductor({ modo: "alta" });
                setAvisoConductor(null);
              }}
              disabled={cargando || guardando}
            >
              Nuevo conductor
            </button>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <p className="text-xs text-base-content/70">
            Un conductor no es un funcionario del cuadro: vive en su propio
            maestro y no se le asignan operativos, solo el transporte de ellos.
            Dar de baja a uno no borra nada; deja de ofrecerse a la DAF.
          </p>

          <FiltrosDeFlota
            filtros={filtrosConductores}
            onCambiar={setFiltrosConductores}
            etiqueta="cédula, nombre o placa"
            id="conductores"
          />

          <TablaConductores
            conductores={conductoresVisibles}
            procesando={guardando}
            onEditar={(conductor) => {
              setEdicionConductor({ modo: "edicion", conductor });
              setAvisoConductor(null);
            }}
            onDarDeBaja={(conductor) =>
              setPorDarDeBaja({ tipo: "conductor", conductor })
            }
            mensajeVacio={
              cargando
                ? "Cargando los conductores…"
                : filtrandoConductores
                  ? "Ningún conductor coincide con el filtro."
                  : "No hay ningún conductor registrado. Sin conductores, la DAF no puede asignar transporte a ningún operativo."
            }
          />
        </div>
      </div>

      <ModalVehiculo
        abierto={edicionVehiculo !== null}
        // Cambiar de registro vuelve a montar el modal: los valores del anterior no
        // sobreviven bajo la placa del siguiente.
        key={
          edicionVehiculo?.modo === "edicion"
            ? `vehiculo-${edicionVehiculo.vehiculo.id}`
            : "vehiculo-alta"
        }
        vehiculo={
          edicionVehiculo?.modo === "edicion" ? edicionVehiculo.vehiculo : null
        }
        guardando={guardando}
        aviso={avisoVehiculo}
        onGuardar={(valores) => void guardarVehiculo(valores)}
        onCancelar={() => setEdicionVehiculo(null)}
      />

      <ModalConductor
        abierto={edicionConductor !== null}
        key={
          edicionConductor?.modo === "edicion"
            ? `conductor-${edicionConductor.conductor.id}`
            : "conductor-alta"
        }
        conductor={
          edicionConductor?.modo === "edicion"
            ? edicionConductor.conductor
            : null
        }
        vehiculos={vehiculos}
        guardando={guardando}
        aviso={avisoConductor}
        onGuardar={(valores) => void guardarConductor(valores)}
        onCancelar={() => setEdicionConductor(null)}
      />

      <ModalConfirmacion
        abierto={porDarDeBaja !== null}
        titulo="Dar de baja"
        mensaje={porDarDeBaja ? textoDeLaBaja(porDarDeBaja) : ""}
        textoSi="Sí, dar de baja"
        textoNo="Cancelar"
        procesando={guardando}
        onConfirmar={() => void confirmarBaja()}
        onCancelar={() => setPorDarDeBaja(null)}
      />

      {/*
        ═══════════════════════════════════════════════════════════════════════════
        RN-DAF-03. EL CATÁLOGO DE ZONALES DE REPOSO, y sin él P-03 no puede declarar
        dónde queda cada vehículo: el panel de destinos lo dice y remite justamente aquí.

        NACE VACÍO A PROPÓSITO. La hoja de agosto usa cinco zonales —MATRIZ, ELOY ALFARO,
        CALDERÓN, QUITUMBE, LOS CHILLOS— y la transcripción menciona cuatro. Es la pregunta
        Q-01, sin responder. Sembrar las cinco «porque están en el Excel» habría convertido
        una suposición en dato maestro, y nadie habría vuelto a preguntarse de dónde salió.
        ═══════════════════════════════════════════════════════════════════════════
      */}
      <PanelUbicaciones
        ubicaciones={ubicaciones}
        cargando={cargando}
        procesando={guardando}
        onCrear={(nombre) => void crearUbicacion(nombre)}
        onDesactivar={(id) => void desactivarUbicacion(id)}
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

/**
 * La barra de filtros, idéntica en los dos paneles.
 *
 * Se extrae porque son los mismos dos controles: repetirlos habría hecho que corregir uno
 * dejara el otro atrás. Vive aquí y no en `components/flota/` porque solo esta pantalla la
 * usa, y sacarla a un archivo propio sería inventar una pieza compartida que no lo es.
 */
const FiltrosDeFlota = ({
  filtros,
  onCambiar,
  etiqueta,
  id,
}: {
  filtros: FiltrosFlota;
  onCambiar: (filtros: FiltrosFlota) => void;
  etiqueta: string;
  id: string;
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="form-control">
      <label
        className="label"
        htmlFor={`buscar-${id}`}
      >
        <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
          Buscar
        </span>
      </label>
      <input
        id={`buscar-${id}`}
        type="search"
        className="input input-bordered input-sm"
        placeholder={etiqueta}
        value={filtros.busqueda ?? ""}
        onChange={(evento) =>
          onCambiar({ ...filtros, busqueda: evento.target.value })
        }
      />
    </div>

    <div className="form-control">
      <label
        className="label"
        htmlFor={`estado-${id}`}
      >
        <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
          Estado
        </span>
      </label>
      <select
        id={`estado-${id}`}
        className="select select-bordered select-sm"
        value={filtros.estado ?? ""}
        onChange={(evento) =>
          onCambiar({
            ...filtros,
            estado: evento.target.value as FiltrosFlota["estado"],
          })
        }
      >
        <option value="">Todos</option>
        <option value="activos">Activos</option>
        <option value="inactivos">Dados de baja</option>
      </select>
    </div>

    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => onCambiar({})}
      disabled={!hayFiltrosDeFlota(filtros)}
    >
      Limpiar filtros
    </button>
  </div>
);

export default AdminFlotaPage;
