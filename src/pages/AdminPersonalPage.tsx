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
 * `FuncionarioResponseDto` es el único contrato del sistema que los devuelve, y su
 * controlador lleva `@Roles(ADMINISTRADOR)`. El resto del módulo trabaja con nombre y
 * área: `PersonaElegibleResponseDto` **no tiene** teléfono, y esa ausencia es lo que
 * impide que se filtre por descuido en una pantalla nueva (RN-34).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * DAR DE BAJA NO BORRA, Y LA CONFIRMACIÓN LO DICE CON NÚMEROS. El histórico de quién
 * salió en cada operativo depende de la ficha, y la rotación del personal es mensual:
 * quien sale hoy puede reingresar el mes que viene con su historial intacto. La respuesta
 * del servidor trae cuántos operativos conserva, y se muestra.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import ModalFuncionario, {
  type PrecargaFuncionario,
} from "../components/personal/ModalFuncionario.tsx";
import PanelAusencias from "../components/personal/PanelAusencias.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import ModalDirectorioAuth from "../components/personal/ModalDirectorioAuth.tsx";
import TablaPersonal from "../components/personal/TablaPersonal.tsx";
import type { AreaPersonal } from "../interfaces/Formulario.ts";
import {
  partirNombre,
  type FilaDirectorio,
} from "../interfaces/DirectorioAuth.ts";
import type {
  CrearFuncionario,
  Disponibilidad,
  EstadoDisponibilidad,
  Funcionario,
  TipoContrato,
} from "../interfaces/Personal.ts";
import { PersonalService } from "../services/personal.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { DatetimeUtil } from "../utils/datetime.util.ts";
import { paginar } from "../utils/listadoOperativos.util.ts";
import {
  NOMBRE_AREA,
  NOMBRE_CONTRATO,
  filtrarPersonal,
  hayFiltrosDePersonal,
  nombreCompleto,
  type FiltrosPersonal,
} from "../utils/personal.util.ts";

type ValoresFuncionario = CrearFuncionario & { telefono: string; cargo: string };

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA VISTA, Y EL DIRECTORIO COMO PRIMER PASO DEL ALTA. 2026-08-24.
 *
 * Hasta hoy este panel tenía dos vistas conmutables —«Maestro» y «Directorio de Auth»— y
 * «Nuevo funcionario» abría una ficha en blanco. Se retiró la pestaña a petición expresa:
 * el directorio de Auth **es** la base de usuarios de la institución, así que el alta
 * empieza eligiendo a alguien de allí y no tecleando desde cero lo que ya está escrito.
 *
 * Lo que NO cambia, porque `CLAUDE.md` §7 lo exige: **el maestro sigue administrándose
 * igual aunque Auth no responda**. La ventana del directorio lleva siempre la salida
 * «Registrar a mano», y `POST /administracion/personal` no toca Auth por ningún lado.
 *
 * El directorio se sigue pidiendo **solo cuando hace falta** —al abrir la ventana, no al
 * entrar a la pantalla— y se conserva en memoria: la segunda vez la ventana abre sin
 * esperar a Auth, y «Actualizar» es lo que vuelve a preguntar.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const AdminPersonalPage = () => {
  const hoy = useMemo(() => DatetimeUtil.formatDate(new Date()), []);

  const [personal, setPersonal] = useState<Funcionario[]>([]);
  const [cargando, setCargando] = useState(true);

  /** Ausencias por funcionario. La clave presente significa «ya consultado». */
  const [ausencias, setAusencias] = useState<Record<number, Disponibilidad[]>>(
    {},
  );

  const [filtros, setFiltros] = useState<FiltrosPersonal>({});
  const [pagina, setPagina] = useState(0);
  const [tamanio, setTamanio] = useState(10);

  /** La ventana del directorio, que es por donde empieza un alta. */
  const [eligiendoDeAuth, setEligiendoDeAuth] = useState(false);
  const [directorio, setDirectorio] = useState<FilaDirectorio[]>([]);
  const [cargandoDirectorio, setCargandoDirectorio] = useState(false);
  /**
   * Que Auth no esté es un **estado**, no un error de la petición: el servidor responde
   * `{ disponible, motivo, personas }` y nunca un 503. Ver `DirectorioAuth.ts`.
   */
  const [directorioDisponible, setDirectorioDisponible] = useState(true);
  const [motivoDirectorio, setMotivoDirectorio] = useState<string | null>(null);

  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [creando, setCreando] = useState(false);
  /** Cédula y nombre traídos de Auth para un alta. `null` en un alta desde cero. */
  const [precarga, setPrecarga] = useState<PrecargaFuncionario | null>(null);
  const [enAusencias, setEnAusencias] = useState<Funcionario | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<Funcionario | null>(null);
  const [procesando, setProcesando] = useState(false);

  const [avisoFicha, setAvisoFicha] = useState<string | null>(null);
  const [avisoAusencia, setAvisoAusencia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  /** Siempre con inactivos: el caso 4 pide mostrarlos atenuados, no esconderlos. */
  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const fichas = await PersonalService.listar(true);
      setPersonal(fichas);
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setPersonal([]);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * El directorio de Auth. **No se pide al arrancar**, sino al abrir la ventana del alta.
   *
   * Cuesta una consulta a otro sistema —hasta cinco segundos de espera máxima—, y quien
   * entra a corregir un teléfono del maestro no tiene por qué pagarla. Su fallo se anuncia
   * **dentro de la ventana** y no en el aviso general: el maestro sigue estando bien.
   */
  const cargarDirectorio = useCallback(async () => {
    setCargandoDirectorio(true);

    try {
      // Sesión sin token de Auth, Auth caído o ambiente sin `AUTH_API_URL`: el servidor
      // los distingue, redacta cuál es y **no lanza**. Se muestra tal cual (regla 7).
      const respuesta = await PersonalService.consultarDirectorio();

      setDirectorio(respuesta.personas);
      setDirectorioDisponible(respuesta.disponible);
      setMotivoDirectorio(respuesta.motivo);
    } catch (fallo: unknown) {
      // Aquí solo llegan los fallos que **no** son de Auth: nuestro backend caído, un 403.
      const error = presentarError(fallo);
      setDirectorio([]);
      setDirectorioDisponible(false);
      setMotivoDirectorio(error.mensaje);
    } finally {
      setCargandoDirectorio(false);
    }
  }, []);

  /**
   * Una sola vez por visita: se conserva lo consultado y «Actualizar» vuelve a preguntar.
   *
   * Es lo que hace que la ventana abra al instante a partir de la segunda vez, en lugar de
   * esperar a Auth en cada clic de «Nuevo funcionario».
   */
  const directorioPedido = useRef(false);

  /** «Nuevo funcionario»: el alta empieza en el directorio. */
  const abrirDirectorio = useCallback(() => {
    setEligiendoDeAuth(true);
    setAvisoFicha(null);

    if (directorioPedido.current) return;

    directorioPedido.current = true;
    void cargarDirectorio();
  }, [cargarDirectorio]);

  const coincidentes = useMemo(
    () => filtrarPersonal(personal, filtros),
    [personal, filtros],
  );

  const pagina0 = useMemo(
    () => paginar(coincidentes, pagina, tamanio),
    [coincidentes, pagina, tamanio],
  );

  useEffect(() => {
    if (pagina0.pagina !== pagina) setPagina(pagina0.pagina);
  }, [pagina0.pagina, pagina]);

  /**
   * Ausencias de las fichas que están a la vista, y solo de esas.
   *
   * El contrato entrega los periodos **por funcionario**: no hay endpoint que devuelva
   * las de la institución. Pedirlas para las cincuenta y dos fichas del maestro sería
   * cincuenta y dos peticiones para pintar diez distintivos. Se piden las de la página
   * actual y se recuerdan, así que paginar hacia atrás no vuelve a preguntar. Ver PV-35.
   */
  const visibles = pagina0.filas;

  useEffect(() => {
    const pendientes = visibles.filter(
      (funcionario) => !(funcionario.id in ausencias),
    );
    if (pendientes.length === 0) return;

    let vigente = true;

    void Promise.all(
      pendientes.map(async (funcionario) => {
        try {
          return [
            funcionario.id,
            await PersonalService.listarAusencias(funcionario.id),
          ] as const;
        } catch {
          // Un fallo aquí no puede tumbar el maestro: la fila queda sin distintivo de
          // situación, que es menos malo que una pantalla en blanco.
          return [funcionario.id, [] as Disponibilidad[]] as const;
        }
      }),
    ).then((resultados) => {
      if (!vigente) return;
      setAusencias((actuales) => ({
        ...actuales,
        ...Object.fromEntries(resultados),
      }));
    });

    return () => {
      vigente = false;
    };
  }, [visibles, ausencias]);

  const refrescarAusencias = useCallback(async (funcionarioId: number) => {
    const suyas = await PersonalService.listarAusencias(funcionarioId);
    setAusencias((actuales) => ({ ...actuales, [funcionarioId]: suyas }));
    return suyas;
  }, []);

  /**
   * Abrir el alta con lo que Auth sabe de esa persona. 2026-08-21.
   *
   * SE PARTE EL NOMBRE AQUÍ Y SE DEJA EDITABLE. Auth guarda un solo campo y la partición
   * es una heurística —dos primeras palabras, apellidos—: «DE LA TORRE PEREZ JUAN» sale
   * mal, y quien da de alta lo corrige mirándolo. Lo que **no** se propone es el área ni
   * el tipo de contrato: Auth no los sabe, y un valor por omisión invita a no mirarlo
   * justo en el campo del que depende RN-26.
   */
  const crearFichaDesdeAuth = useCallback((fila: FilaDirectorio) => {
    const { apellidos, nombres } = partirNombre(fila.nombre);

    // Las dos ventanas van EN SECUENCIA, no anidadas: `MarcoModal` bloquea el
    // desplazamiento y atrapa el foco, y dos a la vez se pelearían por los dos.
    setEligiendoDeAuth(false);
    setPrecarga({ cedula: fila.cedula, apellidos, nombres });
    setCreando(true);
    setEditando(null);
    setAvisoFicha(null);
  }, []);

  /**
   * La salida que no pasa por Auth. `CLAUDE.md` §7: «el maestro sigue administrándose
   * igual. No acople una a la otra».
   */
  const registrarAMano = useCallback(() => {
    setEligiendoDeAuth(false);
    setPrecarga(null);
    setCreando(true);
    setEditando(null);
    setAvisoFicha(null);
  }, []);

  /**
   * Cerrar la ficha: si el alta nació del directorio, se **vuelve** a él.
   *
   * Quien se equivocó de persona quiere elegir otra, no volver al maestro y empezar de
   * cero. Al editar una ficha existente, o al haber entrado por «Registrar a mano», no hay
   * directorio al que volver.
   */
  const cerrarFicha = useCallback(() => {
    const veniaDelDirectorio = precarga !== null;

    setCreando(false);
    setEditando(null);
    setPrecarga(null);
    setAvisoFicha(null);
    setEligiendoDeAuth(veniaDelDirectorio);
  }, [precarga]);

  const guardarFicha = useCallback(
    async (valores: ValoresFuncionario) => {
      setProcesando(true);
      setAvisoFicha(null);

      try {
        if (editando) {
          await PersonalService.actualizar(editando.id, {
            apellidos: valores.apellidos,
            nombres: valores.nombres,
            telefono: valores.telefono || undefined,
            cargo: valores.cargo || undefined,
            area: valores.area,
            tipoContrato: valores.tipoContrato,
            direccion: valores.direccion,
          });
          setExito(`Ficha de ${valores.apellidos} ${valores.nombres} actualizada.`);
        } else {
          await PersonalService.crear({
            cedula: valores.cedula,
            apellidos: valores.apellidos,
            nombres: valores.nombres,
            telefono: valores.telefono || undefined,
            cargo: valores.cargo || undefined,
            area: valores.area,
            tipoContrato: valores.tipoContrato,
            direccion: valores.direccion,
          });
          setExito(
            `${valores.apellidos} ${valores.nombres} se agregó al maestro. Ya se ofrece en los desplegables de personal.`,
          );
        }

        setEditando(null);
        setCreando(false);
        setPrecarga(null);

        // LAS DOS RECARGAS VAN EN PARALELO, y la diferencia se nota: el maestro lo sirve
        // nuestra base en milisegundos, pero el directorio sale a Auth central, que tiene
        // cinco segundos de espera máxima. Encadenadas, quien acaba de guardar una ficha
        // esperaba una detrás de la otra sin motivo: ninguna necesita el resultado de la
        // otra, las dos releen del servidor.
        //
        // Si el directorio no se ha llegado a pedir, no se pide ahora: solo se refresca lo
        // que está a la vista. Esa fila acaba de dejar de estar «sin ficha» y tiene que
        // dejar de decirlo.
        await Promise.all([
          cargar(),
          directorioPedido.current ? cargarDirectorio() : Promise.resolve(),
        ]);
      } catch (fallo: unknown) {
        // El mensaje del servidor nombra a quién pertenece la cédula repetida, o qué
        // tiene de malo el dato. Se muestra tal cual, dentro del modal, sin perder lo
        // capturado.
        setAvisoFicha(presentarError(fallo).mensaje);
      } finally {
        setProcesando(false);
      }
    },
    [editando, cargar, cargarDirectorio],
  );

  const registrarAusencia = useCallback(
    async (valores: {
      estado: EstadoDisponibilidad;
      desde: string;
      hasta: string;
      motivo: string;
    }) => {
      if (!enAusencias) return;

      setProcesando(true);
      setAvisoAusencia(null);

      try {
        await PersonalService.registrarAusencia(enAusencias.id, {
          estado: valores.estado,
          desde: valores.desde,
          hasta: valores.hasta,
          motivo: valores.motivo || undefined,
        });
        await refrescarAusencias(enAusencias.id);
        setExito(
          `Ausencia registrada. ${nombreCompleto(enAusencias)} deja de ofrecerse del ${valores.desde} al ${valores.hasta}.`,
        );
      } catch (fallo: unknown) {
        // INV-14: el solape lo detecta el servidor, que conoce los demás periodos.
        setAvisoAusencia(presentarError(fallo).mensaje);
      } finally {
        setProcesando(false);
      }
    },
    [enAusencias, refrescarAusencias],
  );

  const retirarAusencia = useCallback(
    async (periodoId: number) => {
      if (!enAusencias) return;

      setProcesando(true);
      setAvisoAusencia(null);

      try {
        await PersonalService.retirarAusencia(enAusencias.id, periodoId);
        await refrescarAusencias(enAusencias.id);
      } catch (fallo: unknown) {
        setAvisoAusencia(presentarError(fallo).mensaje);
      } finally {
        setProcesando(false);
      }
    },
    [enAusencias, refrescarAusencias],
  );

  const darDeBaja = useCallback(async () => {
    if (!porDarDeBaja) return;

    setProcesando(true);
    setAviso(null);

    try {
      const baja = await PersonalService.desactivar(porDarDeBaja.id);
      setPorDarDeBaja(null);
      // El servidor redacta cuántos operativos conserva la ficha. Se muestra tal cual.
      setExito(baja.mensaje);
      await cargar();
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setPorDarDeBaja(null);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setProcesando(false);
    }
  }, [porDarDeBaja, cargar]);

  const filtrando = hayFiltrosDePersonal(filtros);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          Administración
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
          Personal y disponibilidad
        </h1>
        <p className="page-heading-subtitle text-sm">
          Maestro de funcionarios de la AMC. Es la única pantalla que muestra
          cédulas y teléfonos.
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

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Maestro de personal
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-ghost badge-sm">
              {cargando
                ? "Cargando…"
                : `${coincidentes.length} de ${personal.length} registros`}
            </span>
            <button
              type="button"
              className="btn btn-sm app-modules-panel-action"
              onClick={abrirDirectorio}
            >
              Nuevo funcionario
            </button>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                className="input input-bordered input-sm w-full sm:max-w-xs"
                placeholder="Buscar por cédula, nombre o cargo…"
                aria-label="Buscar en el maestro"
                value={filtros.busqueda ?? ""}
                onChange={(evento) => {
                  setFiltros((actuales) => ({
                    ...actuales,
                    busqueda: evento.target.value,
                  }));
                  setPagina(0);
                }}
              />

              <select
                className="select select-bordered select-sm"
                aria-label="Filtrar por área"
                value={filtros.area ?? ""}
                onChange={(evento) => {
                  setFiltros((actuales) => ({
                    ...actuales,
                    area: evento.target.value as AreaPersonal | "",
                  }));
                  setPagina(0);
                }}
              >
                <option value="">Todas las áreas</option>
                {Object.entries(NOMBRE_AREA).map(([valor, nombre]) => (
                  <option
                    key={valor}
                    value={valor}
                  >
                    {nombre}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm"
                aria-label="Filtrar por contrato"
                value={filtros.contrato ?? ""}
                onChange={(evento) => {
                  setFiltros((actuales) => ({
                    ...actuales,
                    contrato: evento.target.value as TipoContrato | "",
                  }));
                  setPagina(0);
                }}
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

              <select
                className="select select-bordered select-sm"
                aria-label="Filtrar por estado"
                value={filtros.estado ?? ""}
                onChange={(evento) => {
                  setFiltros((actuales) => ({
                    ...actuales,
                    estado: evento.target.value as "" | "activos" | "inactivos",
                  }));
                  setPagina(0);
                }}
              >
                <option value="">Activos e inactivos</option>
                <option value="activos">Solo activos</option>
                <option value="inactivos">Solo inactivos</option>
              </select>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setFiltros({});
                  setPagina(0);
                }}
                disabled={!filtrando}
              >
                Limpiar filtros
              </button>
            </div>

            <TablaPersonal
              personal={visibles}
              ausencias={ausencias}
              hoy={hoy}
              seleccionadoId={enAusencias?.id ?? null}
              onSeleccionar={(funcionario) => {
                setEnAusencias(funcionario);
                setAvisoAusencia(null);
                void refrescarAusencias(funcionario.id);
              }}
              onEditar={(funcionario) => {
                setEditando(funcionario);
                setCreando(false);
                setPrecarga(null);
                setAvisoFicha(null);
              }}
              onDarDeBaja={setPorDarDeBaja}
              mensajeVacio={
                cargando
                  ? "Cargando el maestro…"
                  : filtrando
                    ? "Ningún funcionario coincide con el filtro."
                    : "El maestro está vacío. Registre el primer funcionario."
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

      {/*
        LA VENTANA DEL ALTA. Va aquí y no dentro del panel: es del alta, no del maestro.

        Se monta solo cuando se está eligiendo, de modo que `MarcoModal` y la ventana de la
        ficha nunca coexisten. Ver `crearFichaDesdeAuth`.
      */}
      <ModalDirectorioAuth
        abierto={eligiendoDeAuth}
        personas={directorio}
        disponible={directorioDisponible}
        motivo={motivoDirectorio}
        cargando={cargandoDirectorio}
        procesando={procesando}
        onElegir={crearFichaDesdeAuth}
        onRegistrarAMano={registrarAMano}
        onActualizar={() => void cargarDirectorio()}
        onCerrar={() => setEligiendoDeAuth(false)}
      />

      {enAusencias && (
        <PanelAusencias
          funcionario={enAusencias}
          ausencias={ausencias[enAusencias.id] ?? []}
          cargando={!(enAusencias.id in ausencias)}
          guardando={procesando}
          hoy={hoy}
          aviso={avisoAusencia}
          onRegistrar={(valores) => void registrarAusencia(valores)}
          onRetirar={(periodoId) => void retirarAusencia(periodoId)}
          onCerrar={() => setEnAusencias(null)}
        />
      )}

      <ModalFuncionario
        abierto={creando || editando !== null}
        funcionario={editando}
        precarga={precarga}
        guardando={procesando}
        aviso={avisoFicha}
        onGuardar={(valores) => void guardarFicha(valores)}
        onCancelar={cerrarFicha}
      />

      {/* Caso 5: la confirmación advierte que la baja es lógica. */}
      <ModalConfirmacion
        abierto={porDarDeBaja !== null}
        titulo="¿Dar de baja a este funcionario?"
        mensaje={
          porDarDeBaja
            ? `${nombreCompleto(porDarDeBaja)} dejará de ofrecerse en los desplegables de personal. La ficha NO se borra: el histórico de los operativos en que participó depende de ella, y si reingresa se reactiva con su historial intacto.`
            : ""
        }
        textoSi="Sí, dar de baja"
        textoNo="Cancelar"
        procesando={procesando}
        onConfirmar={() => void darDeBaja()}
        onCancelar={() => setPorDarDeBaja(null)}
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

export default AdminPersonalPage;
