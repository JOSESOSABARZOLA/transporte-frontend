/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: MisOperativosPage.tsx
 * Responsabilidad: Pantalla P-02. Consultar, editar y retirar los operativos propios.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CADA PERFIL VE **SUS** FILAS, Y ESO LO DECIDE EL SERVIDOR.
 *
 * `GET /operativos` llega ya recortado por rol (PER-02). Aquí no se descarta ninguna
 * fila por pertenecer a otro departamento: si el recorte viviera en esta pantalla,
 * bastaría con borrar una línea para leer el cuadro ajeno, y el aislamiento de la
 * información es el requisito que originó el encargo.
 *
 * Lo que sí se filtra aquí es lo que el funcionario escribe en la fila de filtros, sobre
 * las filas que el servidor ya le entregó.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA MATRIZ CONSOLIDADA NO ESTÁ AQUÍ, Y SE DICE. El plan pide mostrar explícitamente que
 * es exclusiva de la Dirección. Sin esa línea, quien no la encuentra supone que el
 * sistema falla y termina pidiéndola por WhatsApp, que es el canal que se quiere cerrar.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormikHelpers } from "formik";

import CamposCalculados from "../components/cuadro/CamposCalculados.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import PanelAdicionalOperativo from "../components/cuadro/PanelAdicionalOperativo.tsx";
import PanelEdicionOperativo from "../components/cuadro/PanelEdicionOperativo.tsx";
import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";
import TablaOperativos from "../components/cuadro/TablaOperativos.tsx";
import {
  OPCION_ADICIONALES,
  type ValoresOperativo,
} from "../utils/valoresOperativo.util.ts";
import Paginacion from "../components/common/Paginacion.tsx";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import { useCuadroDiario } from "../hooks/useCuadroDiario.ts";
import { useUser } from "../hooks/useUser.ts";
import { useVentanaCarga } from "../hooks/useVentanaCarga.ts";
import { ROLES_DE_CARGA } from "../config/env.ts";
import type { Operativo } from "../interfaces/Operativo.ts";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../interfaces/Personal.ts";
import { OperativoService } from "../services/operativo.service.ts";
import { PersonalService } from "../services/personal.service.ts";
import {
  accesoAlOperativo,
  motivoDeSoloLectura,
} from "../utils/accesoOperativo.util.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import {
  COLUMNAS_LISTADO,
  descripcionDelRetiro,
  filtrarOperativos,
  hayFiltrosActivos,
  paginar,
  type ColumnaOperativo,
  type FiltrosListado,
} from "../utils/listadoOperativos.util.ts";

/**
 * Se pide la jornada entera de una vez, y se filtra y pagina en memoria.
 *
 * 200 es el máximo que admite `PaginacionDto` en el servidor. Un departamento no llega a
 * esa cifra en un día —el cuadro completo de la AMC ronda las decenas—, pero si alguna
 * vez la superara, la pantalla **lo dice** en lugar de mostrar un listado incompleto con
 * aspecto de completo.
 */
const TAMANIO_MAXIMO_SERVIDOR = 200;

const MisOperativosPage = () => {
  /** El antetítulo nombra al departamento dueño de estos formularios. */
  const { user } = useUser();

  /**
   * LA JORNADA QUE SE PROPONE ES LA DE MAÑANA, no la de hoy. RN-01.
   *
   * El cuadro se elabora la víspera, así que lo que este departamento está armando ahora
   * mismo es la jornada siguiente. Hasta el 2026-08-21 esta pantalla abría en HOY mientras
   * P-01 registraba en MAÑANA: **lo que se acababa de registrar no aparecía aquí**, y el
   * listado vacío se leía como un fallo de guardado.
   *
   * Es una propuesta, no una imposición: el selector de fecha la cambia, y hace falta —la
   * AMC arma el lunes desde el viernes—.
   */
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

  const { cuadro, cargando: cargandoCuadro, puedeEscribir } =
    useCuadroDiario(fecha);
  // La ventana del rol de carga bajo el que se opera, no la del primero de la lista de
  // quien entra. Ver `useVentanaCarga`: con varios roles, el servidor respondía por el
  // primero y la pantalla miraba una ventana ajena.
  const ventana = useVentanaCarga(ROLES_DE_CARGA);

  const [operativos, setOperativos] = useState<Operativo[]>([]);
  const [totalServidor, setTotalServidor] = useState(0);
  const [cargando, setCargando] = useState(true);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * SE PUEDE LLEGAR CON UN FORMULARIO YA FILTRADO. 2026-08-25.
   *
   * De P-01 · Registro: el departamento que **aporta personal** a un formulario no puede
   * registrar en él, así que al pulsarlo se le trae aquí, que es donde su participación
   * tiene efecto. Sin el filtro llegaría al listado entero del día y tendría que buscar
   * su formulario entre los nueve.
   *
   * SE LEE UNA VEZ, AL MONTAR, y después manda el usuario: es una propuesta, no una
   * imposición. Si lo leyera en cada render, borrar el filtro a mano no serviría de nada
   * —volvería a ponerse solo— y la fila de filtros dejaría de obedecer.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [filtros, setFiltros] = useState<FiltrosListado>(() => {
    // Se lee de `window.location` y no con `useSearchParams`: es una lectura ÚNICA al
    // montar, y atar la pantalla al enrutador obligaría a envolverla en un Router para
    // poder probarla, sin ganar nada a cambio.
    const formulario = new URLSearchParams(window.location.search).get(
      "formulario",
    );
    return formulario ? { formulario } : {};
  });
  const [pagina, setPagina] = useState(0);
  const [tamanio, setTamanio] = useState(10);

  const [editando, setEditando] = useState<Operativo | null>(null);
  /**
   * Operativo del que se está capturando un adicional. 2026-08-20.
   *
   * SOLO UNO DE LOS DOS PANELES ESTÁ ABIERTO A LA VEZ —abrir uno cierra el otro—, y de
   * ahí que `enPanel` sirva para los tres efectos que dependen de «qué formulario y qué
   * horario se están mirando»: catálogos, puntos de la zonal y personal elegible. Con dos
   * juegos de efectos, corregir uno dejaría el otro atrás, que es exactamente el defecto
   * que este archivo ya arrastró una vez con el horario del personal.
   */
  const [creandoAdicional, setCreandoAdicional] = useState<Operativo | null>(
    null,
  );
  /**
   * Personal del adicional, mientras se captura. Vive aquí y no en el operativo —como sí
   * ocurre al editar— porque **todavía no existe el operativo al que colgarlo**: entra con
   * él en una sola transacción, todo o nada. Es el mismo criterio de P-01.
   */
  const [personalAdicional, setPersonalAdicional] = useState<PersonaAgregada[]>(
    [],
  );
  /**
   * Horario en edición, mientras se cambia en el formulario. Nulo mientras no se toque:
   * entonces manda el del operativo. Ver el efecto de candidatos.
   */
  const [horarioEditado, setHorarioEditado] = useState<{
    inicio: string;
    fin: string;
  } | null>(null);
  /** Operativo de la última consulta de personal. Ver el efecto de candidatos. */
  const operativoConsultado = useRef<number | null>(null);
  const [porRetirar, setPorRetirar] = useState<Operativo | null>(null);
  const [procesando, setProcesando] = useState(false);

  const [candidatos, setCandidatos] = useState<PersonaElegible[]>([]);
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  const [avisoPersonal, setAvisoPersonal] = useState<string | null>(null);

  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  /** El operativo cuyo formulario y horario gobiernan los catálogos y los elegibles. */
  const enPanel = editando ?? creandoAdicional;

  const catalogos = useCatalogosFormulario(
    enPanel?.formulario.codigo ?? null,
  );

  /**
   * `RN-56` y `RN-58` juntas: se edita y se retira **solo** con la ventana abierta y el
   * cuadro sin cerrar. Es la misma condición que en P-01, y por el mismo motivo: descubrir
   * el bloqueo al guardar obliga a repetir el trabajo.
   */
  const bloqueado = !puedeEscribir || !ventana.puedeEscribir;

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL ADICIONAL SE MIDE CON OTRA VARA, Y ES TODO EL SENTIDO DEL CAMBIO DEL 2026-08-20.
   *
   * Solo lo bloquea el CUADRO cerrado (RN-58); la ventana de carga (RN-56) no cuenta. Un
   * adicional se dispone por urgencia el mismo día en que se ejecuta, cuando la carga del
   * departamento ya cerró: exigirle la ventana lo haría imposible justo cuando hace falta.
   *
   * La excepción es **solo horaria**. El rol, la propiedad del formulario y el estado del
   * cuadro los sigue comprobando el servidor, y la auditoría anota si la ventana estaba
   * abierta o cerrada al crearlo.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const bloqueadoParaAdicional = !puedeEscribir;

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * QUÉ PUEDE HACER ESTA PERSONA CON CADA FILA. 2026-08-25, PER-06.
   *
   * Hasta hoy la respuesta era «lo mismo con todas»: P-02 solo traía operativos del
   * propio departamento. Desde que el formulario 4 admite el cupo del DMIT, la patrulla
   * ECU llega también a quien **solo puede poner personal**, y ofrecerle «Editar» sería
   * ofrecerle un 403 con el formulario ya escrito.
   *
   * SE CALCULA POR FILA Y NO UNA VEZ, porque una misma persona puede ser dueña de unos
   * formularios y aportar a otros: quien tenga DMIP Operativos y DMIT ve las dos cosas
   * en la misma tabla.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const accesoDe = useCallback(
    (operativo: Operativo) =>
      accesoAlOperativo(operativo, user?.rolCodes ?? []),
    [user],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setAviso(null);

    try {
      const respuesta = await OperativoService.consultar({
        fecha,
        pagina: 1,
        tamanio: TAMANIO_MAXIMO_SERVIDOR,
      });
      setOperativos(respuesta.datos);
      setTotalServidor(respuesta.meta.total);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setOperativos([]);
      setTotalServidor(0);
      // Una fecha sin jornada abierta no es un fallo: es un día sin cuadro.
      if (error.estado !== 404) {
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      }
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Al abrir la edición se piden los puntos de **su** zonal.
   *
   * Sin esto el desplegable de punto nacería vacío: el valor del formulario apuntaría a un
   * punto que no está entre las opciones, y quien edita el horario vería desaparecer de la
   * pantalla el punto que ya tenía elegido, sin haberlo tocado.
   */
  const cargarPuntosDeZonal = catalogos.cargarPuntosDeZonal;
  // La zonal, no el operativo entero: al agregar personal `editando` cambia de identidad
  // y volvería a pedir los mismos puntos en cada alta.
  const zonalEnEdicion = enPanel?.zonales[0]?.id;

  useEffect(() => {
    if (zonalEnEdicion) void cargarPuntosDeZonal(zonalEnEdicion);
  }, [zonalEnEdicion, cargarPuntosDeZonal]);

  /**
   * Los candidatos dependen del formulario **y del horario** del operativo que se edita.
   *
   * CORREGIDO EL 2026-08-11, igual que en P-01. Sin el horario el servidor solo descarta
   * por área y por ausencia, así que ofrecía a personas ya ocupadas en otro operativo del
   * mismo día. Aquí el horario se conoce desde el principio —lo trae el operativo— y se
   * actualiza si se cambia en el formulario.
   */
  const horario = horarioEditado ?? {
    inicio: enPanel?.horaInicio ?? "",
    fin: enPanel?.horaFin ?? "",
  };

  // Abrir otro operativo —o cerrar el panel— descarta el horario que se estaba editando:
  // manda otra vez el del operativo. Se observa el identificador y no el objeto, que
  // cambia de identidad cada vez que se agrega personal.
  const idEnEdicion = enPanel?.id ?? null;
  useEffect(() => {
    setHorarioEditado(null);
  }, [idEnEdicion]);

  useEffect(() => {
    if (!enPanel) {
      setCandidatos([]);
      return;
    }

    let vigente = true;

    // Recarga silenciosa al cambiar el horario, igual que en P-01: solo abrir otro
    // operativo vacía la lista y muestra «Consultando…». Ver el comentario de esa
    // pantalla para el porqué.
    const cambioDePoblacion = operativoConsultado.current !== enPanel.id;
    operativoConsultado.current = enPanel.id;

    if (cambioDePoblacion) {
      setCandidatos([]);
      setCargandoPersonal(true);
    }

    const conHorario = Boolean(horario.inicio) && Boolean(horario.fin);

    PersonalService.consultarElegibles({
      formulario: enPanel.formulario.codigo,
      inicio: fecha,
      ...(conHorario
        ? { horaInicio: horario.inicio, horaFin: horario.fin }
        : {}),
    })
      .then((personas) => {
        if (vigente) setCandidatos(personas);
      })
      .catch(() => {
        if (vigente) setCandidatos([]);
      })
      .finally(() => {
        if (vigente) setCargandoPersonal(false);
      });

    return () => {
      vigente = false;
    };
  }, [enPanel, fecha, horario.inicio, horario.fin]);

  const coincidentes = useMemo(
    () => filtrarOperativos(operativos, filtros),
    [operativos, filtros],
  );

  const pagina0 = useMemo(
    () => paginar(coincidentes, pagina, tamanio),
    [coincidentes, pagina, tamanio],
  );

  // Si el filtro deja menos páginas de las que había, la página actual se corrige sola:
  // sin esto, quien filtra desde la página 3 se queda mirando una tabla vacía existiendo
  // resultados.
  useEffect(() => {
    if (pagina0.pagina !== pagina) setPagina(pagina0.pagina);
  }, [pagina0.pagina, pagina]);

  const cambiarFiltro = useCallback(
    (columna: ColumnaOperativo, valor: string) => {
      setFiltros((actuales) => ({ ...actuales, [columna]: valor }));
      setPagina(0);
    },
    [],
  );

  const limpiarFiltros = useCallback(() => {
    setFiltros({});
    setPagina(0);
  }, []);

  const guardarEdicion = useCallback(
    async (
      valores: ValoresOperativo,
      ayudas: FormikHelpers<ValoresOperativo>,
    ) => {
      if (!editando) return;

      setProcesando(true);
      setAviso(null);

      try {
        await OperativoService.editar(editando.id, {
          version: editando.version,
          horaInicio: valores.horaInicio,
          horaFin: valores.horaFin,
          zonalesIds: valores.zonalId === "" ? undefined : [valores.zonalId],
          puntoEncuentroId:
            valores.punto === OPCION_ADICIONALES || valores.punto === ""
              ? undefined
              : Number(valores.punto),
          puntoLibre:
            valores.punto === OPCION_ADICIONALES
              ? valores.puntoLibre
              : undefined,
          tipoControlId:
            valores.tipoControl === OPCION_ADICIONALES ||
            valores.tipoControl === ""
              ? undefined
              : Number(valores.tipoControl),
          tipoLibre:
            valores.tipoControl === OPCION_ADICIONALES
              ? valores.tipoLibre
              : undefined,
          institucionesIds: valores.institucionesIds,
          observaciones: valores.observaciones || undefined,
        });

        setExito(`Operativo ${editando.identificador} actualizado.`);
        setEditando(null);
        ayudas.resetForm();
        await cargar();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
        // `conservaCaptura`: el panel sigue abierto con lo escrito. Un 409 de bloqueo
        // optimista se resuelve recargando, y el mensaje del servidor lo explica.
      } finally {
        setProcesando(false);
      }
    },
    [editando, cargar],
  );

  /**
   * Abre el panel del adicional. 2026-08-20.
   *
   * Cierra la edición si estaba abierta: los dos paneles comparten los efectos de
   * catálogos y elegibles, y tenerlos a la vez haría que uno pidiera los datos del otro.
   */
  const abrirAdicional = useCallback((origen: Operativo) => {
    setEditando(null);
    setPersonalAdicional([]);
    setAvisoPersonal(null);
    setCreandoAdicional(origen);
  }, []);

  const guardarAdicional = useCallback(
    async (
      valores: ValoresOperativo,
      ayudas: FormikHelpers<ValoresOperativo>,
    ) => {
      if (!creandoAdicional) return;

      setProcesando(true);
      setAviso(null);

      try {
        // La jornada y el formulario NO viajan: los hereda del operativo del que nace, y
        // el servidor rechaza con 400 si se envían. Ver `CrearAdicional`.
        const adicional = await OperativoService.crearAdicional(
          creandoAdicional.id,
          {
            horaInicio: valores.horaInicio,
            horaFin: valores.horaFin,
            zonalesIds: valores.zonalId === "" ? [] : [valores.zonalId],
            puntoEncuentroId:
              valores.punto === OPCION_ADICIONALES || valores.punto === ""
                ? undefined
                : Number(valores.punto),
            puntoLibre:
              valores.punto === OPCION_ADICIONALES
                ? valores.puntoLibre
                : undefined,
            tipoControlId:
              valores.tipoControl === OPCION_ADICIONALES ||
              valores.tipoControl === ""
                ? undefined
                : Number(valores.tipoControl),
            tipoLibre:
              valores.tipoControl === OPCION_ADICIONALES
                ? valores.tipoLibre
                : undefined,
            institucionesIds: valores.institucionesIds,
            personalIds: personalAdicional.map(
              (persona) => persona.funcionarioId,
            ),
            observaciones: valores.observaciones || undefined,
          },
        );

        // Se nombra el original: quien acaba de capturarlo con prisa necesita confirmar
        // que colgó de donde quería, y el identificador nuevo no lo dice por sí solo.
        setExito(
          `Operativo adicional ${adicional.identificador} registrado sobre ${creandoAdicional.identificador}.` +
            (ventana.puedeEscribir
              ? ""
              : " Se creó fuera de la ventana de carga y queda constancia en la auditoría.") +
            // El transporte lo hereda el servidor, y solo si el conductor puede conducir
            // a esa hora. Decirlo evita que alguien lo dé por hecho y el operativo salga
            // sin vehículo: la ventana de la DAF también está cerrada a esa hora.
            (adicional.estadoTransporte === "ASIGNADO"
              ? " Heredó el conductor y la placa del operativo original."
              : " NO heredó transporte: queda pendiente de la DAF."),
        );
        setCreandoAdicional(null);
        setPersonalAdicional([]);
        ayudas.resetForm();
        await cargar();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        // El panel sigue abierto con lo capturado: un rechazo del servidor —una persona
        // no elegible, el cuadro ya cerrado— se corrige y se reintenta sin volver a
        // escribirlo todo, que es lo que más importa cuando se captura con prisa.
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      } finally {
        setProcesando(false);
      }
    },
    [creandoAdicional, personalAdicional, ventana.puedeEscribir, cargar],
  );

  const agregarPersona = useCallback(
    async (persona: PersonaElegible) => {
      if (!editando) return;

      setAvisoPersonal(null);

      try {
        const actualizado = await OperativoService.asignarPersonal(editando.id, {
          funcionarioId: persona.id,
        });
        setEditando(actualizado);
        await cargar();
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [editando, cargar],
  );

  const retirarPersona = useCallback(
    async (funcionarioId: number) => {
      if (!editando) return;

      setAvisoPersonal(null);

      try {
        const actualizado = await OperativoService.retirarPersonal(
          editando.id,
          funcionarioId,
        );
        setEditando(actualizado);
        await cargar();
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [editando, cargar],
  );

  const confirmarRetiro = useCallback(async () => {
    if (!porRetirar) return;

    setProcesando(true);
    setAviso(null);

    try {
      const baja = await OperativoService.retirar(
        porRetirar.id,
        porRetirar.version,
      );
      // PV-10: las dos bajas no son la misma noticia. Si la fila se conservó, quien la
      // retiró tiene que saberlo, y por qué.
      setExito(
        baja.eliminado
          ? `Operativo ${baja.identificador} eliminado. Su número queda libre para el siguiente registro.`
          : `Operativo ${baja.identificador} retirado del cuadro. No se elimina porque ya tiene ${baja.ordenesEmitidas === 1 ? "una orden emitida" : `${baja.ordenesEmitidas} órdenes emitidas`}: una orden ya comunicada no puede quedarse sin origen.`,
      );
      if (editando?.id === porRetirar.id) setEditando(null);
      setPorRetirar(null);
      await cargar();
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      setPorRetirar(null);
    } finally {
      setProcesando(false);
    }
  }, [porRetirar, editando, cargar]);

  const filtrando = hayFiltrosActivos(filtros);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          {user?.rolName ?? "Departamento"}
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
          Mis operativos
        </h1>
        <CamposCalculados
          cuadro={cuadro}
          cargando={cargandoCuadro}
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaCuadro"
            >
              <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
                Fecha del cuadro
              </span>
            </label>
            <input
              id="fechaCuadro"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => {
                setFecha(evento.target.value);
                setEditando(null);
                setPagina(0);
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={limpiarFiltros}
            disabled={!filtrando}
          >
            Limpiar filtros
          </button>
        </div>
      </header>

      {/* RN-56 y RN-58. Se avisa antes de intentar editar, no al guardar. */}
      {!cargandoCuadro && !ventana.cargando && bloqueado && (
        <div className="alert alert-info">
          <span>
            {cuadro && !cuadro.admiteEscritura
              ? `El cuadro del ${cuadro.fecha} fue cerrado por la Dirección: puede consultarlo, pero no editarlo ni retirar operativos.`
              : `${ventana.mensaje} Puede consultar el listado; para editar o retirar, espere a que su ventana vuelva a abrirse.`}
          </span>
        </div>
      )}

      {/*
        Con la ventana abierta, cuánto queda. Aquí se edita y se retira, y las dos cosas
        dejan de poderse a la misma hora. El adicional no —regla 11—, y por eso el texto
        habla de registrar y editar, que es lo que sí caduca.
      */}
      {!cargandoCuadro && !ventana.cargando && !bloqueado && (
        <AvisoVentana cuentaAtras={ventana.cuentaAtras} />
      )}

      {totalServidor > operativos.length && (
        <div className="alert alert-warning">
          <span>
            La jornada tiene {totalServidor} operativos y esta pantalla muestra
            los primeros {operativos.length}. Informe al administrador: el
            listado necesita paginarse contra el servidor.
          </span>
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

      {creandoAdicional && (
        <PanelAdicionalOperativo
          origen={creandoAdicional}
          catalogos={catalogos.catalogos}
          puntos={catalogos.puntos}
          cargandoPuntos={catalogos.cargandoPuntos}
          onZonalElegida={(zonalId) => {
            if (zonalId === null) {
              catalogos.limpiarPuntos();
              return;
            }
            void catalogos.cargarPuntosDeZonal(zonalId);
          }}
          onHorarioElegido={(inicio, fin) => setHorarioEditado({ inicio, fin })}
          candidatos={candidatos}
          cargandoPersonal={cargandoPersonal}
          personalAgregado={personalAdicional}
          // Sin llamada al servidor: el adicional todavía no existe. Entran con él.
          onAgregarPersona={(persona) =>
            setPersonalAdicional((actuales) =>
              actuales.some((agregada) => agregada.funcionarioId === persona.id)
                ? actuales
                : [
                    ...actuales,
                    {
                      funcionarioId: persona.id,
                      nombre: nombreDePersona(persona),
                      // RN-34: el teléfono lo resuelve el servidor al asignar. Aquí
                      // todavía no se conoce, y **no se inventa**. Igual que en P-01.
                      telefono: null,
                    },
                  ],
            )
          }
          onRetirarPersona={(funcionarioId) =>
            setPersonalAdicional((actuales) =>
              actuales.filter(
                (agregada) => agregada.funcionarioId !== funcionarioId,
              ),
            )
          }
          avisoPersonal={avisoPersonal}
          bloqueado={bloqueadoParaAdicional}
          ventanaCerrada={!ventana.puedeEscribir}
          guardando={procesando}
          onGuardar={guardarAdicional}
          onCancelar={() => {
            setCreandoAdicional(null);
            setPersonalAdicional([]);
          }}
        />
      )}

      {editando && (
        <PanelEdicionOperativo
          operativo={editando}
          catalogos={catalogos.catalogos}
          puntos={catalogos.puntos}
          cargandoPuntos={catalogos.cargandoPuntos}
          onZonalElegida={(zonalId) => {
            if (zonalId === null) {
              catalogos.limpiarPuntos();
              return;
            }
            void catalogos.cargarPuntosDeZonal(zonalId);
          }}
          onHorarioElegido={(inicio, fin) =>
            setHorarioEditado({ inicio, fin })
          }
          candidatos={candidatos}
          cargandoPersonal={cargandoPersonal}
          onAgregarPersona={(persona) => void agregarPersona(persona)}
          onRetirarPersona={(funcionarioId) => void retirarPersona(funcionarioId)}
          avisoPersonal={avisoPersonal}
          bloqueado={bloqueado}
          soloPersonal={accesoDe(editando) !== "PROPIO"}
          guardando={procesando}
          onGuardar={guardarEdicion}
          onCancelar={() => setEditando(null)}
        />
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Operativos registrados
          </h2>
          <span className="badge badge-ghost badge-sm">
            {cargando
              ? "Cargando…"
              : `${coincidentes.length} de ${operativos.length} registros`}
          </span>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <TablaOperativos
            operativos={pagina0.filas}
            columnas={COLUMNAS_LISTADO}
            filtros={filtros}
            onFiltroChange={cambiarFiltro}
            mensajeVacio={
              cargando ? (
                "Cargando operativos…"
              ) : filtrando ? (
                // Caso 4 del plan: el filtro no encontró nada, y se ofrece la salida.
                <span className="flex flex-col items-center gap-2">
                  Ningún operativo coincide con el filtro.
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={limpiarFiltros}
                  >
                    Limpiar filtros
                  </button>
                </span>
              ) : (
                // Caso 5: no hay nada que filtrar, hay que registrar.
                "No hay operativos registrados en esta fecha. Regístrelos desde «Registro de operativo»."
              )
            }
            acciones={(operativo) => {
              /*
                ═══════════════════════════════════════════════════════════════════
                TRES BOTONES Y DOS VARAS DISTINTAS. 2026-08-25.

                `bloqueado` es horario —la ventana cerró, el cuadro se cerró— y afecta a
                todo el mundo. El acceso es de permiso, y solo afecta a quien aporta.

                Quien APORTA no edita ni retira: el botón principal cambia de nombre y
                abre el mismo panel en modo «solo personal». **No se le apaga el botón**,
                porque sí tiene algo que hacer ahí; lo que se le apagan son los otros dos,
                con su motivo escrito (regla 6).
                ═══════════════════════════════════════════════════════════════════
              */
              const acceso = accesoDe(operativo);
              const esPropio = acceso === "PROPIO";
              const motivoAjeno = motivoDeSoloLectura(
                acceso,
                operativo.creadoPorRol,
              );

              return (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setEditando(operativo)}
                  disabled={bloqueado || procesando}
                  title={
                    bloqueado
                      ? "La ventana de carga está cerrada o el cuadro fue cerrado."
                      : (motivoAjeno ?? undefined)
                  }
                >
                  {esPropio ? "Editar" : "Personal"}
                </button>

                {/*
                  ADICIONAL · 2026-08-20.

                  SE OFRECE AUNQUE LA VENTANA ESTÉ CERRADA, y esa es la diferencia con los
                  otros dos botones. Es lo único que se salta la ventana, porque un
                  adicional se dispone el día de la ejecución. El cuadro cerrado sí lo
                  bloquea: reabrirlo es potestad de la Dirección.

                  SOBRE UN ADICIONAL NO SE OFRECE: no se encadenan. El botón desaparece en
                  lugar de aparecer apagado, porque «apagado» insinúa que en otras
                  circunstancias se podría, y aquí nunca.

                  NI EN LOS FORMULARIOS QUE NO LOS ADMITEN, desde el 2026-08-24. RN-61: un
                  formulario admite adicionales si tiene un prefijo marcado para ellos, y
                  hoy solo el **2 · PMO** con `OCAPMO`. El servidor ya lo rechazaba; la
                  pantalla lo ofrecía igual en los nueve.
                */}
                {esPropio &&
                  !operativo.esAdicional &&
                  operativo.formulario.admiteAdicionales && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => abrirAdicional(operativo)}
                    disabled={bloqueadoParaAdicional || procesando}
                    title={
                      bloqueadoParaAdicional
                        ? "El cuadro fue cerrado por la Dirección."
                        : "Registrar un operativo adicional sobre éste, en su misma jornada."
                    }
                  >
                    Adicional
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => setPorRetirar(operativo)}
                  disabled={bloqueado || procesando || !esPropio}
                  title={
                    motivoAjeno ??
                    (bloqueado
                      ? "La ventana de carga está cerrada o el cuadro fue cerrado."
                      : undefined)
                  }
                >
                  Retirar
                </button>
              </div>
              );
            }}
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

      <p className="text-xs text-base-content/70">
        La Matriz Consolidada del Día es exclusiva de la Dirección. Esta pantalla
        muestra únicamente los operativos de sus formularios.
      </p>

      {/* Caso 2 del plan: la confirmación nombra el operativo, no pregunta en abstracto. */}
      <ModalConfirmacion
        abierto={porRetirar !== null}
        titulo="¿Retirar este operativo?"
        mensaje={porRetirar ? descripcionDelRetiro(porRetirar) : ""}
        textoSi="Sí, retirar"
        textoNo="Cancelar"
        procesando={procesando}
        onConfirmar={() => void confirmarRetiro()}
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

export default MisOperativosPage;
