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

import ModalExito from "../components/common/ModalExito.tsx";
import ModalBajaConMotivo from "../components/personal/ModalBajaConMotivo.tsx";
import PanelAusencias from "../components/personal/PanelAusencias.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import DrawerFlujoAlta, {
  type ResultadoGuardado,
} from "../components/personal/DrawerFlujoAlta.tsx";
import type { ValoresFichaAlta } from "../components/personal/PasoFichaFuncionario.tsx";
import { PARA_FICHA } from "../components/personal/propositoDirectorio.ts";
import TablaPersonal from "../components/personal/TablaPersonal.tsx";
import type { AreaPersonal, Zonal } from "../interfaces/Formulario.ts";
import MatrizCobertura from "../components/personal/MatrizCobertura.tsx";
import type { FilaDirectorio } from "../interfaces/DirectorioAuth.ts";
import type {
  BajaFuncionario,
  Disponibilidad,
  EstadoDisponibilidad,
  Funcionario,
  TipoContrato,
} from "../interfaces/Personal.ts";
import { PersonalService } from "../services/personal.service.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
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
 * «Crear Funcionario Operativo», y `POST /administracion/personal` no toca Auth por ningún lado.
 *
 * El directorio se sigue pidiendo **solo cuando hace falta** —al abrir la ventana, no al
 * entrar a la pantalla— y se conserva en memoria: la segunda vez la ventana abre sin
 * esperar a Auth, y «Actualizar» es lo que vuelve a preguntar.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const AdminPersonalPage = () => {
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * QUÉ ÁREAS PUEDE DAR DE ALTA QUIEN ESTÁ MIRANDO. 2026-09-01, tarde.
   *
   * El negocio repartió el maestro por áreas: el administrador de la DMIP crea «Unidad de
   * Operativos», «Inspector General» e «Inspector Técnico»; **«Personal de Instrucción» es
   * solo del DMIT**. El desplegable del formulario se acota con esto.
   *
   * ESTE ESTADO SUSTITUYE AL DE DIRECCIONES, que se retiró esa misma mañana al quitar el
   * campo «Dirección» del formulario. Entonces quedó anotado que haría falta «el día que
   * esta pantalla se abra a los administradores de área»; ese día es hoy.
   *
   * NACE VACÍO Y NO CON LAS CUATRO. Mientras la respuesta no llega no se ofrece ninguna:
   * una lista completa por omisión haría que un alta rápida cayera en un área ajena si
   * alguien fuera más rápido que la red, y el servidor la rechazaría con un 403 que quien
   * captura no sabría explicarse.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [areasQueGestiona, setAreasQueGestiona] = useState<AreaPersonal[]>([]);
  // Catálogo de zonales para la ficha del personal DMIP (2026-09-21).
  const [zonales, setZonales] = useState<Zonal[]>([]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * SI QUIEN MIRA ADMINISTRA EL MAESTRO. Reescrito el 2026-09-02.
   *
   * PREGUNTABA POR UN ROL —`rolCodes.includes(ADMINISTRADOR_DMIP)`— Y ERA UN DEFECTO. Al
   * repartirse el maestro entre dos administradores, el del DMIT entraba a la pantalla y
   * **no le aparecía «Nuevo funcionario»**: la ruta lo admitía, el servidor le habría
   * aceptado el alta, y la única que decía que no era esta línea. Un rol quemado en el
   * navegador que contradecía al servidor.
   *
   * AHORA SE DERIVA DEL ALCANCE: quien alcanza al menos un área administra, y qué áreas
   * alcanza lo dice el servidor contra `t_rol_direccion`. No aparece ningún rol escrito, y
   * el día que el negocio dé personal a un cuarto administrador esta pantalla se entera
   * sola.
   *
   * ES LA MISMA PREGUNTA QUE YA RESPONDE EL DESPLEGABLE DE ÁREA, y por eso sale del mismo
   * dato: no puede haber un formulario que ofrezca tres áreas y un botón que diga que no
   * se administra nada.
   *
   * MIENTRAS LA RESPUESTA NO LLEGA ES `false`, y es correcto: pintar el botón antes de
   * saberlo dejaría abrir un formulario cuyo desplegable de área estaría vacío.
   *
   * ESTO NO ES LA AUTORIZACIÓN, ES LA PRESENTACIÓN. Quien decide es el servidor; si
   * alguien llamara al endpoint a mano recibiría un 403 igualmente. Lo que no puede hacer
   * no se pinta —y no se pinta apagado—: un botón deshabilitado insinúa que en otro
   * momento serviría.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const puedeAdministrar = areasQueGestiona.length > 0;

  const hoy = useMemo(() => DatetimeUtil.formatDate(new Date()), []);

  const [personal, setPersonal] = useState<Funcionario[]>([]);
  const [cargando, setCargando] = useState(true);

  /** Ausencias por funcionario. La clave presente significa «ya consultado». */
  const [ausencias, setAusencias] = useState<Record<number, Disponibilidad[]>>(
    {},
  );

  const [filtros, setFiltros] = useState<FiltrosPersonal>({});
  const [pagina, setPagina] = useState(0);
  // 25 filas por página por defecto (2026-09-30): el maestro es pequeño y se recorre mejor de 25.
  const [tamanio, setTamanio] = useState(25);

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

  // ALTA y EDICIÓN comparten el cajón (`DrawerFlujoAlta`): el alta cuando `eligiendoDeAuth`, la
  // edición cuando `editando` tiene una ficha. Ya no hay `ModalFuncionario`.
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [enAusencias, setEnAusencias] = useState<Funcionario | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<Funcionario | null>(null);
  const [procesando, setProcesando] = useState(false);
  // Fila recién guardada/editada, para resaltarla tras navegar a su página (ajuste 4).
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);

  const [avisoAusencia, setAvisoAusencia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  /** Siempre con inactivos: el caso 4 pide mostrarlos atenuados, no esconderlos. */
  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      // Las dos juntas: la pantalla no sirve sin el maestro, y el alta no sirve sin saber
      // qué áreas puede crear quien mira.
      const [fichas, areas, zonalesDelCatalogo] = await Promise.all([
        PersonalService.listar(true),
        PersonalService.areasQueGestiona(),
        // Para el campo Zonal de la ficha (personal DMIP). Si falla, el maestro sigue sirviendo.
        CatalogoCuadroService.listarZonales().catch(() => [] as Zonal[]),
      ]);
      setPersonal(fichas);
      setAreasQueGestiona(areas);
      setZonales(zonalesDelCatalogo);
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

    if (directorioPedido.current) return;

    directorioPedido.current = true;
    void cargarDirectorio();
  }, [cargarDirectorio]);

  const coincidentes = useMemo(
    () => filtrarPersonal(personal, filtros),
    [personal, filtros],
  );

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * LAS ÁREAS DEL DESPLEGABLE SALEN DE LO QUE HAY, NO DEL ENUMERADO. PER-09, 27-AGO.
   *
   * Desde que el servidor acota el maestro a la dirección de quien consulta, a un rol
   * departamental le llega **una sola área**. Seguir ofreciendo las cuatro dejaría tres
   * opciones que vacían la tabla sin explicar por qué, y quien las pulsara concluiría que
   * el sistema perdió a su gente.
   *
   * Se derivan del maestro **sin filtrar** —`personal`, no `coincidentes`—: si salieran de
   * lo filtrado, elegir un área dejaría el desplegable con una sola opción y no habría
   * forma de volver atrás.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const areasPresentes = useMemo(
    () =>
      (Object.keys(NOMBRE_AREA) as AreaPersonal[]).filter((area) =>
        personal.some((funcionario) => funcionario.area === area),
      ),
    [personal],
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

  /** Cierra el cajón (sirva al ALTA o a la EDICIÓN) y descarta su estado. */
  const cerrarCajon = useCallback(() => {
    setEligiendoDeAuth(false);
    setEditando(null);
  }, []);

  /** Valores del cajón a partir de una ficha existente, para editarla. */
  const aValoresFicha = (funcionario: Funcionario): ValoresFichaAlta => ({
    cedula: funcionario.cedula,
    apellidos: funcionario.apellidos,
    nombres: funcionario.nombres,
    telefono: funcionario.telefono ?? "",
    correo: funcionario.correo ?? "",
    cargo: funcionario.cargo ?? "",
    area: funcionario.area,
    tipoContrato: funcionario.tipoContrato,
    zonalId: funcionario.zonalId != null ? String(funcionario.zonalId) : "",
  });

  /**
   * Tras guardar/editar (ajuste 4): si los filtros ocultan la ficha, se LIMPIAN para que se vea; se
   * fija el resaltado y un efecto navega a su página cuando la lista se asiente.
   */
  const resaltarFicha = useCallback(
    (funcionario: Funcionario) => {
      if (filtrarPersonal([funcionario], filtros).length === 0) setFiltros({});
      setResaltadoId(funcionario.id);
    },
    [filtros],
  );

  /**
   * Guardar DESDE EL CAJÓN: crea (alta) o actualiza (edición) según `editando`. Devuelve el
   * resultado enrutado para que el cajón lo muestre donde toca: éxito (con o sin «crear otro»),
   * error de cédula al campo, o aviso general. Sin «crear otro», la página abre su `ModalExito`,
   * refresca y resalta la fila.
   */
  const guardarDesdeDrawer = useCallback(
    async (
      valores: ValoresFichaAlta,
      { crearOtro }: { crearOtro: boolean },
    ): Promise<ResultadoGuardado> => {
      // ZONAL SOLO PARA EL PERSONAL DMIP: para el resto va `undefined` (no se envía).
      const zonalId =
        valores.area !== "" &&
        ["OPERATIVOS", "GENERAL", "TECNICO"].includes(valores.area) &&
        valores.zonalId !== ""
          ? Number(valores.zonalId)
          : undefined;

      const datos = {
        apellidos: valores.apellidos,
        nombres: valores.nombres,
        telefono: valores.telefono || undefined,
        correo: valores.correo || undefined,
        cargo: valores.cargo || undefined,
        area: valores.area as AreaPersonal,
        tipoContrato: valores.tipoContrato as TipoContrato,
        zonalId,
      };

      try {
        // `area`/`tipoContrato` ya no son "" aquí: Yup los exige antes de llegar.
        const guardado = editando
          ? await PersonalService.actualizar(editando.id, datos)
          : await PersonalService.crear({ ...datos, cedula: valores.cedula });

        const nombre = `${valores.apellidos} ${valores.nombres}`;

        // Refresca el maestro (y el directorio si ya se pidió, solo en alta) en paralelo.
        await Promise.all([
          cargar(),
          !editando && directorioPedido.current
            ? cargarDirectorio()
            : Promise.resolve(),
        ]);

        // «Guardar y crear otro» avisa DENTRO del cajón; solo «Guardar» abre el ModalExito.
        if (!crearOtro) {
          setExito(
            editando
              ? `Ficha de ${nombre} actualizada.`
              : `${nombre} se agregó al maestro. Ya se ofrece en los desplegables de personal.`,
          );
          resaltarFicha(guardado);
        }

        return { ok: true, nombre };
      } catch (fallo: unknown) {
        // Un 409 es la cédula repetida: su mensaje va AL CAMPO cédula (regla 7 + ajuste 6).
        const error = presentarError(fallo);
        return error.trato === "conflicto"
          ? { ok: false, errorCedula: error.mensaje }
          : { ok: false, aviso: error.mensaje };
      }
    },
    [editando, cargar, cargarDirectorio, resaltarFicha],
  );

  /** Navega a la página de la fila resaltada cuando la lista se asienta, y la desvanece a los 4 s. */
  useEffect(() => {
    if (resaltadoId == null) return;
    const indice = coincidentes.findIndex((f) => f.id === resaltadoId);
    if (indice >= 0) setPagina(Math.floor(indice / tamanio));
    const temporizador = setTimeout(() => setResaltadoId(null), 4000);
    return () => clearTimeout(temporizador);
  }, [resaltadoId, coincidentes, tamanio]);

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

  const darDeBaja = useCallback(
    async (datosBaja: BajaFuncionario) => {
      if (!porDarDeBaja) return;

      setProcesando(true);
      setAviso(null);

      try {
        const baja = await PersonalService.desactivar(porDarDeBaja.id, datosBaja);
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
    },
    [porDarDeBaja, cargar],
  );

  /**
   * Reingreso. No pide confirmación —es reversible y no destruye nada—; la baja sí,
   * porque advierte de que el histórico obliga a conservar la ficha. El servidor
   * comprueba el alcance, igual que en la baja.
   */
  const reactivar = useCallback(
    async (funcionario: Funcionario) => {
      setProcesando(true);
      setAviso(null);
      try {
        await PersonalService.reactivar(funcionario.id);
        setExito(
          `${funcionario.apellidos} ${funcionario.nombres} vuelve al maestro.`,
        );
        await cargar();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      } finally {
        setProcesando(false);
      }
    },
    [cargar],
  );

  const filtrando = hayFiltrosDePersonal(filtros);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          Administración
        </p>
        <h1 className="page-heading-title">
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

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Maestro de personal
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-ghost badge-sm">
              {cargando
                ? "Cargando…"
                : `Mostrando ${coincidentes.length} de ${personal.length}`}
            </span>
            {puedeAdministrar && (
              <button
                type="button"
                className="btn btn-sm app-modules-panel-action"
                onClick={abrirDirectorio}
              >
                Nuevo funcionario
              </button>
            )}
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

              {/* «Limpiar filtros» solo aparece con filtros activos: sin ellos no limpia nada. */}
              {filtrando && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setFiltros({});
                    setPagina(0);
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <TablaPersonal
              personal={visibles}
              zonales={zonales}
              ausencias={ausencias}
              hoy={hoy}
              seleccionadoId={enAusencias?.id ?? null}
              resaltadoId={resaltadoId}
              onSeleccionar={(funcionario) => {
                setEnAusencias(funcionario);
                setAvisoAusencia(null);
                void refrescarAusencias(funcionario.id);
              }}
              onEditar={(funcionario) => setEditando(funcionario)}
              onDarDeBaja={setPorDarDeBaja}
              onReactivar={(funcionario) => void reactivar(funcionario)}
              puedeAdministrar={puedeAdministrar}
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
        COBERTURA POR TURNOS · SOLO INSTRUCCIÓN. Se monta únicamente cuando quien entró
        gestiona el área de Instrucción, así que la vista de Inspección (DMIP) no cambia.
        Adapta el Excel «COBERTURA POR TURNOS» a la pantalla, reutilizando el maestro.
      */}
      {areasQueGestiona.includes("INSTRUCCION" as AreaPersonal) && (
        <MatrizCobertura />
      )}

      {/*
        EL CAJÓN, compartido por el ALTA (dos pasos: buscar persona → completar ficha) y la
        EDICIÓN (abre directo en la ficha, sin stepper, cédula en solo lectura). Va aquí y no dentro
        del panel: es del flujo, no del maestro. P-11 (Cuentas) usa su propio cajón `DrawerFlujoCuenta`
        sobre los mismos primitivos.
      */}
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
        valoresEdicion={editando ? aValoresFicha(editando) : null}
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

      {/* La baja exige un motivo (caso 5 + baja con motivo, 2026-09-30). `key` por ficha remonta el
          modal con estado limpio en cada apertura. */}
      <ModalBajaConMotivo
        key={porDarDeBaja?.id ?? "baja"}
        abierto={porDarDeBaja !== null}
        funcionario={porDarDeBaja}
        procesando={procesando}
        onConfirmar={(baja) => void darDeBaja(baja)}
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
