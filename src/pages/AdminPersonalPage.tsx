/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: AdminPersonalPage.tsx
 * Responsabilidad: Pantalla P-07. Mantener el maestro de personal y sus ausencias.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA ÚNICA PANTALLA QUE MUESTRA CÉDULAS Y TELÉFONOS.
 *
 * `FuncionarioResponseDto` es el único contrato del sistema que los devuelve. El resto del
 * módulo trabaja con nombre y área: `PersonaElegibleResponseDto` **no tiene** teléfono, y esa
 * ausencia es lo que impide que se filtre por descuido en una pantalla nueva (RN-34).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REDISEÑO DEL 2026-10-08:
 *   · Abre en «Activos» (selector segmentado Activos | Inactivos | Todos) con un solo contador:
 *     «N funcionarios · X activos de Y en el maestro». Antes abría con todos y decía «68 de 68»
 *     aunque 38 fueran bajas. Y es de SUS direcciones; el directorio de Auth mira toda la AMC.
 *   · 10 por página, como Mis operativos. La columna «Estado» sale de UNA consulta de ausencias de
 *     todo el maestro (antes, una por fila).
 *   · Avisos breves abajo a la derecha (`toast`, `utils/mensaje.ts`) en lugar de `ModalExito`, y la fila
 *     recién creada o editada se resalta en verde `MS_RESALTADO` ms en su página.
 *   · Baja con su modal centrado (motivo obligatorio) y REACTIVAR también con confirmación.
 *
 * DAR DE BAJA NO BORRA. El histórico de quién salió en cada operativo depende de la ficha, y
 * quien sale hoy puede reingresar con su historial intacto. El servidor dice cuántos operativos
 * conserva, y se muestra.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ModalBajaConMotivo from "../components/personal/ModalBajaConMotivo.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import PanelAusencias, {
  type ValoresAusencia,
} from "../components/personal/PanelAusencias.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import SelectorSegmentado from "../components/forms/SelectorSegmentado.tsx";
import DrawerFlujoAlta, {
  type OrigenAlta,
  type ResultadoGuardado,
} from "../components/personal/DrawerFlujoAlta.tsx";
import type { ValoresFichaAlta } from "../components/personal/PasoFichaFuncionario.tsx";
import { PARA_FICHA } from "../components/personal/propositoDirectorio.ts";
import TablaPersonal from "../components/personal/TablaPersonal.tsx";
import type { AreaPersonal, Zonal } from "../interfaces/Formulario.ts";
import MatrizCobertura from "../components/personal/MatrizCobertura.tsx";
import type { FilaDirectorio } from "../interfaces/DirectorioAuth.ts";
import type {
  AusenciaDelMaestro,
  BajaFuncionario,
  Disponibilidad,
  Funcionario,
  TipoContrato,
} from "../interfaces/Personal.ts";
import { PersonalService } from "../services/personal.service.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
import { avisoDeFallo, presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import { DatetimeUtil } from "../utils/datetime.util.ts";
import { MS_RESALTADO, paginar } from "../utils/listadoOperativos.util.ts";
import { ausenciaAMostrar, fechaLarga } from "../utils/ausencias.util.ts";
import {
  FILTROS_INICIALES,
  NOMBRE_AREA,
  NOMBRE_CONTRATO,
  filtrarPersonal,
  hayFiltrosDePersonal,
  nombreCompleto,
  type FiltrosPersonal,
} from "../utils/personal.util.ts";
import { toast } from "../utils/mensaje.ts";

/** Opciones del selector de estado. «Todos» es el valor vacío del filtro. */
const OPCIONES_ESTADO = [
  { valor: "activos", nombre: "Activos" },
  { valor: "inactivos", nombre: "Inactivos" },
  { valor: "", nombre: "Todos" },
];

/** Códigos del servidor que dicen «Auth no tiene a esta persona o no responde»: salida manual. */
const SIN_AUTH = new Set(["PERSONA_NO_ENCONTRADA_EN_AUTH", "AUTH_NO_DISPONIBLE"]);

const AdminPersonalPage = () => {
  /**
   * QUÉ ÁREAS PUEDE DAR DE ALTA QUIEN ESTÁ MIRANDO (2026-09-01). Nace vacío y no con las cuatro:
   * una lista completa por omisión haría que un alta rápida cayera en un área ajena.
   */
  const [areasQueGestiona, setAreasQueGestiona] = useState<AreaPersonal[]>([]);
  const [zonales, setZonales] = useState<Zonal[]>([]);

  /**
   * SI QUIEN MIRA ADMINISTRA EL MAESTRO (2026-09-02): se deriva del alcance que dice el servidor
   * contra `t_rol_direccion`, no de un rol quemado. Es presentación, no autorización.
   */
  const puedeAdministrar = areasQueGestiona.length > 0;

  const hoy = useMemo(() => DatetimeUtil.formatDate(new Date()), []);

  const [personal, setPersonal] = useState<Funcionario[]>([]);
  const [cargando, setCargando] = useState(true);
  /** Ausencias en curso y próximas de todo el maestro (una consulta). */
  const [ausenciasMaestro, setAusenciasMaestro] = useState<AusenciaDelMaestro[]>(
    [],
  );

  const [filtros, setFiltros] = useState<FiltrosPersonal>(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(0);
  // 10 por página, como Mis operativos (2026-10-08).
  const [tamanio, setTamanio] = useState(10);

  /** La ventana del directorio, que es por donde empieza un alta. */
  const [eligiendoDeAuth, setEligiendoDeAuth] = useState(false);
  const [directorio, setDirectorio] = useState<FilaDirectorio[]>([]);
  const [cargandoDirectorio, setCargandoDirectorio] = useState(false);
  /** Que Auth no esté es un ESTADO (`{ disponible, motivo, personas }`), no un error. */
  const [directorioDisponible, setDirectorioDisponible] = useState(true);
  const [motivoDirectorio, setMotivoDirectorio] = useState<string | null>(null);

  // ALTA y EDICIÓN comparten el cajón (`DrawerFlujoAlta`).
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [enAusencias, setEnAusencias] = useState<Funcionario | null>(null);
  /** Ausencias de la persona del modal (con motivo y las pasadas). `null` = consultando. */
  const [ausenciasDe, setAusenciasDe] = useState<Disponibilidad[] | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<Funcionario | null>(null);
  const [porReactivar, setPorReactivar] = useState<Funcionario | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);

  const [avisoAusencia, setAvisoAusencia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  /** Aviso breve, abajo a la derecha. */

  /** Ausencias del maestro. Un fallo no tumba la lista: solo se pierde el distintivo. */
  const cargarAusenciasMaestro = useCallback(async () => {
    try {
      setAusenciasMaestro(await PersonalService.listarAusenciasDelMaestro());
    } catch {
      setAusenciasMaestro([]);
    }
  }, []);

  /** Siempre con inactivos: el filtro de estado decide qué se ve. */
  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const [fichas, areas, zonalesDelCatalogo] = await Promise.all([
        PersonalService.listar(true),
        PersonalService.areasQueGestiona(),
        // Para el campo Zonal de la ficha. Si falla, el maestro sigue sirviendo.
        CatalogoCuadroService.listarZonales().catch(() => [] as Zonal[]),
        cargarAusenciasMaestro(),
      ]);
      setPersonal(fichas);
      setAreasQueGestiona(areas);
      setZonales(zonalesDelCatalogo);
      setAviso(null);
    } catch (fallo: unknown) {
      setPersonal([]);
      setAviso(avisoDeFallo(fallo));
    } finally {
      setCargando(false);
    }
  }, [cargarAusenciasMaestro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * El directorio de Auth: se pide al abrir la ventana del alta, no al entrar. Su fallo se anuncia
   * DENTRO de la ventana; el maestro sigue estando bien.
   */
  const cargarDirectorio = useCallback(async () => {
    setCargandoDirectorio(true);

    try {
      const respuesta = await PersonalService.consultarDirectorio();
      setDirectorio(respuesta.personas);
      setDirectorioDisponible(respuesta.disponible);
      setMotivoDirectorio(respuesta.motivo);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setDirectorio([]);
      setDirectorioDisponible(false);
      setMotivoDirectorio(error.mensaje);
    } finally {
      setCargandoDirectorio(false);
    }
  }, []);

  /** Una sola vez por visita: se conserva lo consultado y «Actualizar» vuelve a preguntar. */
  const directorioPedido = useRef(false);

  const abrirDirectorio = useCallback(() => {
    setEligiendoDeAuth(true);
    if (directorioPedido.current) return;
    directorioPedido.current = true;
    void cargarDirectorio();
  }, [cargarDirectorio]);

  const coincidentes = useMemo(
    () => filtrarPersonal(personal, filtros),
    [personal, filtros],
  );

  /** Las áreas del desplegable salen del maestro SIN filtrar (PER-09). */
  const areasPresentes = useMemo(
    () =>
      (Object.keys(NOMBRE_AREA) as AreaPersonal[]).filter((area) =>
        personal.some((funcionario) => funcionario.area === area),
      ),
    [personal],
  );

  const activos = useMemo(
    () => personal.filter((funcionario) => funcionario.activo).length,
    [personal],
  );

  const pagina0 = useMemo(
    () => paginar(coincidentes, pagina, tamanio),
    [coincidentes, pagina, tamanio],
  );

  useEffect(() => {
    if (pagina0.pagina !== pagina) setPagina(pagina0.pagina);
  }, [pagina0.pagina, pagina]);

  /** La ausencia a mostrar de cada ficha: la en curso o, si no, la próxima. */
  const ausenciaPorFicha = useMemo(() => {
    const porFicha = new Map<number, AusenciaDelMaestro[]>();
    for (const ausencia of ausenciasMaestro) {
      const lista = porFicha.get(ausencia.funcionarioId) ?? [];
      lista.push(ausencia);
      porFicha.set(ausencia.funcionarioId, lista);
    }
    const resultado: Record<number, AusenciaDelMaestro> = {};
    for (const [id, lista] of porFicha) {
      const elegida = ausenciaAMostrar(lista, hoy);
      if (elegida) resultado[id] = elegida;
    }
    return resultado;
  }, [ausenciasMaestro, hoy]);

  const cerrarCajon = useCallback(() => {
    setEligiendoDeAuth(false);
    setEditando(null);
  }, []);

  /**
   * Valores del cajón a partir de la ficha que se edita. MEMOIZADOS: el formulario usa
   * `enableReinitialize`, y un objeto nuevo en cada render de la página lo reiniciaría.
   */
  const valoresEdicion = useMemo<ValoresFichaAlta | null>(
    () =>
      editando
        ? {
            cedula: editando.cedula,
            apellidos: editando.apellidos,
            nombres: editando.nombres,
            telefono: editando.telefono ?? "",
            correoInstitucional: editando.correoInstitucional ?? "",
            correoPersonal: editando.correoPersonal ?? "",
            cargo: editando.cargo ?? "",
            area: editando.area,
            tipoContrato: editando.tipoContrato,
            zonalId: editando.zonalId != null ? String(editando.zonalId) : "",
          }
        : null,
    [editando],
  );

  /** Tras guardar: si los filtros ocultan la ficha, vuelven a los iniciales; se resalta la fila. */
  const resaltarFicha = useCallback(
    (funcionario: Funcionario) => {
      if (filtrarPersonal([funcionario], filtros).length === 0) {
        setFiltros(FILTROS_INICIALES);
      }
      setResaltadoId(funcionario.id);
    },
    [filtros],
  );

  /** Crea (alta) o actualiza (edición) desde el cajón y devuelve el resultado enrutado. */
  const guardarDesdeDrawer = useCallback(
    async (
      valores: ValoresFichaAlta,
      { crearOtro, origen }: { crearOtro: boolean; origen: OrigenAlta },
    ): Promise<ResultadoGuardado> => {
      // Vacía va `undefined`: no se envía y el servidor conserva la que hubiera.
      const zonalId = valores.zonalId !== "" ? Number(valores.zonalId) : undefined;

      const datos = {
        apellidos: valores.apellidos,
        nombres: valores.nombres,
        telefono: valores.telefono || undefined,
        correoInstitucional: valores.correoInstitucional || undefined,
        correoPersonal: valores.correoPersonal || undefined,
        cargo: valores.cargo || undefined,
        area: valores.area as AreaPersonal,
        tipoContrato: valores.tipoContrato as TipoContrato,
        zonalId,
      };

      try {
        // Con AUTH el servidor toma el correo institucional de Auth central y descarta el enviado.
        const guardado = editando
          ? await PersonalService.actualizar(editando.id, datos)
          : await PersonalService.crear({
              ...datos,
              cedula: valores.cedula,
              origen,
            });

        const nombre = `${valores.apellidos} ${valores.nombres}`;

        await Promise.all([
          cargar(),
          !editando && directorioPedido.current
            ? cargarDirectorio()
            : Promise.resolve(),
        ]);

        toast.exito(
          editando
            ? `Ficha de ${nombre} actualizada.`
            : `Ficha de ${nombre} creada.`,
        );
        if (!crearOtro) {
          setEditando(null);
          setEligiendoDeAuth(false);
          resaltarFicha(guardado);
        }

        return { ok: true, nombre };
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        if (error.codigo === "CEDULA_CON_FICHA") {
          return { ok: false, errorCedula: error.mensaje };
        }
        return {
          ok: false,
          aviso: error.mensaje,
          ofrecerManual: SIN_AUTH.has(error.codigo),
        };
      }
    },
    [editando, cargar, cargarDirectorio, resaltarFicha],
  );

  /** Navega a la página de la fila resaltada y la apaga a los `MS_RESALTADO` ms. */
  useEffect(() => {
    if (resaltadoId == null) return;
    const indice = coincidentes.findIndex((f) => f.id === resaltadoId);
    if (indice >= 0) setPagina(Math.floor(indice / tamanio));
    const temporizador = setTimeout(() => setResaltadoId(null), MS_RESALTADO);
    return () => clearTimeout(temporizador);
  }, [resaltadoId, coincidentes, tamanio]);

  const abrirAusencias = useCallback(async (funcionario: Funcionario) => {
    setEnAusencias(funcionario);
    setAvisoAusencia(null);
    setAusenciasDe(null);
    try {
      setAusenciasDe(await PersonalService.listarAusencias(funcionario.id));
    } catch (fallo: unknown) {
      setAusenciasDe([]);
      setAvisoAusencia(presentarError(fallo).mensaje);
    }
  }, []);

  const refrescarAusenciasDe = useCallback(async (funcionarioId: number) => {
    const [suyas] = await Promise.all([
      PersonalService.listarAusencias(funcionarioId),
      cargarAusenciasMaestro(),
    ]);
    setAusenciasDe(suyas);
  }, [cargarAusenciasMaestro]);

  const registrarAusencia = useCallback(
    async (valores: ValoresAusencia): Promise<boolean> => {
      if (!enAusencias) return false;

      setProcesando(true);
      setAvisoAusencia(null);

      try {
        await PersonalService.registrarAusencia(enAusencias.id, {
          estado: valores.estado,
          desde: valores.desde,
          hasta: valores.hasta,
          motivo: valores.motivo.trim() || undefined,
        });
        await refrescarAusenciasDe(enAusencias.id);
        toast.exito(
          `Ausencia registrada: ${nombreCompleto(enAusencias)}, del ${fechaLarga(valores.desde)} al ${fechaLarga(valores.hasta)}.`,
        );
        return true;
      } catch (fallo: unknown) {
        // 409 AUSENCIA_SOLAPADA: el servidor conoce también lo que otro acaba de registrar.
        setAvisoAusencia(presentarError(fallo).mensaje);
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [enAusencias, refrescarAusenciasDe],
  );

  const retirarAusencia = useCallback(
    async (periodoId: number) => {
      if (!enAusencias) return;

      setProcesando(true);
      setAvisoAusencia(null);

      try {
        await PersonalService.retirarAusencia(enAusencias.id, periodoId);
        await refrescarAusenciasDe(enAusencias.id);
        toast.exito("Ausencia quitada.");
      } catch (fallo: unknown) {
        // 409 AUSENCIA_PASADA: una ausencia que ya terminó es historial.
        setAvisoAusencia(presentarError(fallo).mensaje);
      } finally {
        setProcesando(false);
      }
    },
    [enAusencias, refrescarAusenciasDe],
  );

  const darDeBaja = useCallback(
    async (datosBaja: BajaFuncionario) => {
      if (!porDarDeBaja) return;

      // Si el servidor la rechaza, lanza: el error queda en el modal de la baja.
      const baja = await PersonalService.desactivar(porDarDeBaja.id, datosBaja);
      setPorDarDeBaja(null);
      // El servidor redacta cuántos operativos conserva la ficha. Se muestra tal cual.
      toast.exito(baja.mensaje);
      await cargar();
    },
    [porDarDeBaja, cargar],
  );

  const reactivar = useCallback(async () => {
    if (!porReactivar) return;
    const funcionario = porReactivar;
    // Si el servidor lo rechaza, lanza: el error queda en el modal de la confirmación.
    await PersonalService.reactivar(funcionario.id);
    setPorReactivar(null);
    toast.exito(`${nombreCompleto(funcionario)} vuelve al maestro.`);
    await cargar();
  }, [porReactivar, cargar]);

  const filtrando = hayFiltrosDePersonal(filtros);

  const cambiarFiltro = (cambio: Partial<FiltrosPersonal>) => {
    setFiltros((actuales) => ({ ...actuales, ...cambio }));
    setPagina(0);
  };

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="page-heading-kicker font-semibold uppercase">
            Administración
          </p>
          <h1 className="page-heading-title">Personal y disponibilidad</h1>
          <p className="page-heading-subtitle text-sm">
            Maestro de funcionarios de la AMC. Es la única pantalla que muestra
            cédulas y teléfonos.
          </p>
        </div>
      </header>

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudo cargar el maestro"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-4 md:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              className="input input-bordered input-sm w-full sm:max-w-xs"
              placeholder="Buscar por cédula, nombre o cargo…"
              aria-label="Buscar en el maestro"
              value={filtros.busqueda ?? ""}
              onChange={(evento) => cambiarFiltro({ busqueda: evento.target.value })}
            />

            <select
              className="select select-bordered select-sm"
              aria-label="Filtrar por área"
              value={filtros.area ?? ""}
              onChange={(evento) =>
                cambiarFiltro({ area: evento.target.value as AreaPersonal | "" })
              }
            >
              <option value="">Todas las áreas</option>
              {areasPresentes.map((area) => (
                <option
                  key={area}
                  value={area}
                >
                  {NOMBRE_AREA[area]}
                </option>
              ))}
            </select>

            <select
              className="select select-bordered select-sm"
              aria-label="Filtrar por contrato"
              value={filtros.contrato ?? ""}
              onChange={(evento) =>
                cambiarFiltro({ contrato: evento.target.value as TipoContrato | "" })
              }
            >
              <option value="">Todo contrato</option>
              {Object.entries(NOMBRE_CONTRATO).map(([valor, nombre]) => (
                <option
                  key={valor}
                  value={valor}
                >
                  {nombre}
                </option>
              ))}
            </select>

            <SelectorSegmentado
              id="filtro-estado"
              etiqueta="Estado"
              etiquetaOculta
              opciones={OPCIONES_ESTADO}
              valor={filtros.estado ?? ""}
              onCambiar={(valor) =>
                cambiarFiltro({ estado: valor as "" | "activos" | "inactivos" })
              }
            />

            {/* «Limpiar filtros» solo con filtros distintos de los iniciales. */}
            {filtrando && (
              <Boton
                variante="enlace"
                tamano="sm"
                onClick={() => {
                  setFiltros(FILTROS_INICIALES);
                  setPagina(0);
                }}
              >
                Limpiar filtros
              </Boton>
            )}

            <span
              className="ml-auto text-sm text-app-muted"
              role="status"
              title="«En el maestro» son las fichas de las direcciones que usted administra."
            >
              {cargando
                ? "Cargando…"
                : `${coincidentes.length} funcionarios · ${activos} activos de ${personal.length} en el maestro`}
            </span>
            {/* Estándar de botones (D4): «+ Nuevo» a la derecha de la barra de su tabla. */}
            {puedeAdministrar && (
              <Boton
                variante="primario"
                onClick={abrirDirectorio}
              >
                + Nuevo funcionario
              </Boton>
            )}
          </div>

          <TablaPersonal
            personal={pagina0.filas}
            zonales={zonales}
            ausencias={ausenciaPorFicha}
            seleccionadoId={enAusencias?.id ?? null}
            resaltadoId={resaltadoId}
            onAusencias={(funcionario) => void abrirAusencias(funcionario)}
            onEditar={(funcionario) => setEditando(funcionario)}
            onDarDeBaja={setPorDarDeBaja}
            onReactivar={setPorReactivar}
            puedeAdministrar={puedeAdministrar}
            mensajeVacio={
              cargando
                ? "Cargando el maestro…"
                : filtrando
                  ? "Ningún funcionario coincide con el filtro."
                  : "No hay funcionarios activos. Registre el primero."
            }
          />

          {coincidentes.length > 0 && (
            <Paginacion
              page={pagina0.pagina}
              pageSize={tamanio}
              total={pagina0.total}
              onPage={setPagina}
              onPageSize={setTamanio}
              etiqueta="funcionarios"
            />
          )}
        </div>
      </div>

      {/* COBERTURA POR TURNOS · SOLO INSTRUCCIÓN: se monta si quien entró gestiona esa área. */}
      {areasQueGestiona.includes("INSTRUCCION" as AreaPersonal) && (
        <MatrizCobertura onZonaCambiada={() => void cargar()} />
      )}

      {/* EL CAJÓN, compartido por el ALTA (dos pasos) y la EDICIÓN (directo en la ficha). */}
      <DrawerFlujoAlta
        abierto={eligiendoDeAuth || editando !== null}
        proposito={PARA_FICHA}
        filas={directorio}
        disponible={directorioDisponible}
        motivo={motivoDirectorio}
        cargando={cargandoDirectorio}
        onActualizar={() => void cargarDirectorio()}
        onCerrar={cerrarCajon}
        areasQueGestiona={areasQueGestiona}
        zonales={zonales}
        onGuardar={guardarDesdeDrawer}
        edicion={editando !== null}
        valoresEdicion={valoresEdicion}
      />

      {enAusencias && (
        <PanelAusencias
          funcionario={enAusencias}
          ausencias={ausenciasDe ?? []}
          cargando={ausenciasDe === null}
          guardando={procesando}
          hoy={hoy}
          aviso={avisoAusencia}
          onRegistrar={registrarAusencia}
          onRetirar={(periodoId) => void retirarAusencia(periodoId)}
          onCerrar={() => {
            setEnAusencias(null);
            setAusenciasDe(null);
          }}
        />
      )}

      {/* La baja exige un motivo. `key` por ficha remonta el modal limpio en cada apertura. */}
      <ModalBajaConMotivo
        key={porDarDeBaja?.id ?? "baja"}
        abierto={porDarDeBaja !== null}
        funcionario={porDarDeBaja}
        onConfirmar={darDeBaja}
        onCancelar={() => setPorDarDeBaja(null)}
      />

      {/*
        Reactivar vuelve a ofrecer a la persona en los desplegables de TODOS los formularios: un
        clic suelto en la fila no debería bastar para eso (2026-10-08). Advertencia, no peligro.
      */}
      <MensajeModal
        abierto={porReactivar !== null}
        variante="advertencia"
        titulo={porReactivar ? `¿Activar a ${nombreCompleto(porReactivar)}?` : ""}
        mensaje="Volverá a aparecer para asignar a operativos, con su historial intacto."
        textoPrincipal="Activar"
        tituloError="No se pudo activar"
        onPrincipal={reactivar}
        onSecundario={() => setPorReactivar(null)}
      />
    </section>
  );
};

export default AdminPersonalPage;
