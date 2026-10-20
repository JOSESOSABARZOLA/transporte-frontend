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
import Boton from "../components/common/Boton.tsx";
import { useConfirmarLiberacion } from "../hooks/useConfirmarLiberacion.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import AvisoVentanaCerrada from "../components/common/AvisoVentanaCerrada.tsx";
import DrawerOperativo from "../components/cuadro/DrawerOperativo.tsx";
import type { ExtrasDelEnvio } from "../components/cuadro/FormOperativo.tsx";
import { macroSegunTipo } from "../utils/tipoTransporte.util.ts";
import { AVISO_NOTA_PENDIENTE } from "../utils/notasOperativo.util.ts";
import AccionesOperativo, {
  type AccionPrincipal,
} from "../components/cuadro/AccionesOperativo.tsx";
import {
  cambioDeHorario,
  codigoDeTramite,
  hayCambiosDePersonal,
} from "../utils/edicionOperativo.util.ts";
import type { MiembroPatrulla } from "../components/cuadro/RosterPatrulla.tsx";
import PanelOperativos from "../components/cuadro/PanelOperativos.tsx";
import {
  camposCompartirParaEnvio,
  comoValoresDeFormulario,
  OPCION_ADICIONALES,
  type ValoresOperativo,
} from "../utils/valoresOperativo.util.ts";
import { avisarCompartirRetirado } from "../utils/compartirUnidad.util.ts";
import { useAdicionalOperativo } from "../hooks/useAdicionalOperativo.ts";
import { useTablaOperativos } from "../hooks/useTablaOperativos.ts";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import { useCuadroDiario } from "../hooks/useCuadroDiario.ts";
import { useUser } from "../hooks/useUser.ts";
import { useVentanaCarga } from "../hooks/useVentanaCarga.ts";
import { ROLES_DE_CARGA } from "../config/env.ts";
import type { Operativo, PersonaAsignada } from "../interfaces/Operativo.ts";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../interfaces/Personal.ts";
import { OperativoService } from "../services/operativo.service.ts";
import { PersonalService } from "../services/personal.service.ts";
import {
  accesoAlOperativo,
  motivoDeSoloLectura,
  puedeAportarA,
} from "../utils/accesoOperativo.util.ts";
import {
  funcionarioDelRechazo,
  presentarError,
  varianteDeAviso,
  type AvisoTexto,
} from "../utils/errorApi.util.ts";
import { fechaDeHoy, fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import {
  ATAJOS_RANGO,
  RANGO_MAX_DIAS_POR_DEFECTO,
  atajoActivo,
  busquedaConRango,
  errorDelRango,
  esUnSoloDia,
  incluye,
  rangoDeAtajo,
  rangoDeLaUrl,
  resumenDelRango,
  type RangoFechas,
} from "../utils/rangoFechas.util.ts";
import Insignia from "../components/common/Insignia.tsx";
import { COLUMNAS_LISTADO, fechaCorta } from "../utils/listadoOperativos.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

/**
 * Se pide la jornada entera de una vez, y se filtra y pagina en memoria.
 *
 * 200 es el máximo que admite `PaginacionDto` en el servidor. Un departamento no llega a
 * esa cifra en un día —el cuadro completo de la AMC ronda las decenas—, pero si alguna
 * vez la superara, la pantalla **lo dice** en lugar de mostrar un listado incompleto con
 * aspecto de completo.
 */
const TAMANIO_MAXIMO_SERVIDOR = 200;

/**
 * Con un rango (2026-10-13) se piden TODAS sus páginas, una tras otra, para que el contador, los
 * filtros de columna y la paginación cubran el rango entero. El tope evita una carga sin fin: si
 * el rango tiene más, la pantalla lo dice con el mismo aviso de siempre.
 */
const MAX_PAGINAS_SERVIDOR = 10;

/** Por qué una fila de otro cuadro solo se consulta. */
const MOTIVO_CUADRO_CERRADO = "El cuadro de esa fecha ya está cerrado";

/** Espera tras el último cambio de fecha antes de consultar. */
const MS_ESPERA_RANGO = 400;

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
   *
   * DESDE EL 2026-10-13 ES UN RANGO Desde–Hasta, y la vista inicial sigue siendo la misma: los
   * dos extremos en el cuadro vigente. El servidor confirma cuál es el vigente y el rango
   * máximo (`GET /operativos/rango`); mientras responde rige la misma regla calculada aquí.
   * El rango se guarda en la URL (`?desde=&hasta=`) y se lee al cargar.
   */
  const [vigente, setVigente] = useState(() => fechaDeJornadaPorDefecto());
  const [rangoMaxDias, setRangoMaxDias] = useState(RANGO_MAX_DIAS_POR_DEFECTO);
  const rangoDeUrlRef = useRef(
    new URLSearchParams(window.location.search).has("desde"),
  );
  // Lo que se escribe en los dos campos…
  const [rango, setRango] = useState<RangoFechas>(() =>
    rangoDeLaUrl(window.location.search, fechaDeJornadaPorDefecto()),
  );
  // …y lo que se consulta, tras la espera y solo si es válido.
  const [rangoAplicado, setRangoAplicado] = useState<RangoFechas>(rango);
  const errorRango = errorDelRango(rango, rangoMaxDias);
  const unDia = esUnSoloDia(rangoAplicado);

  useEffect(() => {
    let vivo = true;
    Promise.resolve(OperativoService.rango())
      .then((datos) => {
        if (!vivo || !datos) return;
        setRangoMaxDias(datos.rangoMaxDias);
        setVigente((local) => {
          // Sin rango en la URL, la vista inicial se alinea con el vigente del servidor.
          if (!rangoDeUrlRef.current && datos.fechaVigente !== local) {
            const inicial = { desde: datos.fechaVigente, hasta: datos.fechaVigente };
            setRango(inicial);
            setRangoAplicado(inicial);
          }
          return datos.fechaVigente;
        });
      })
      .catch(() => {
        // Sin respuesta rige la regla local; el servidor valida igual.
      });
    return () => {
      vivo = false;
    };
  }, []);

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
   *
   * Se lee de `window.location` y no con `useSearchParams`: es una lectura ÚNICA al montar, y
   * atar la pantalla al enrutador obligaría a envolverla en un Router para poder probarla. Los
   * filtros, la página y el resaltado viven en `useTablaOperativos` desde el 2026-10-13.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const tabla = useTablaOperativos(operativos, () => {
    const formulario = new URLSearchParams(window.location.search).get("formulario");
    return formulario ? { formulario } : {};
  });
  const { setPagina, resaltar } = tabla;

  // Al cambiar el rango: espera, valida y vuelve a la página 1. Sin consulta si no es válido.
  useEffect(() => {
    if (errorDelRango(rango, rangoMaxDias)) return undefined;
    const espera = window.setTimeout(() => {
      setRangoAplicado((actual) =>
        actual.desde === rango.desde && actual.hasta === rango.hasta ? actual : rango,
      );
      setPagina(0);
    }, MS_ESPERA_RANGO);
    return () => window.clearTimeout(espera);
  }, [rango, rangoMaxDias, setPagina]);

  // El rango aplicado viaja a la URL sin recargar ni apilar historial.
  useEffect(() => {
    const busqueda = busquedaConRango(window.location.search, rangoAplicado);
    if (busqueda !== window.location.search) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${busqueda}${window.location.hash}`,
      );
    }
  }, [rangoAplicado]);

  /**
   * El cuadro cuyos chips se muestran (un solo día) o cuyo aviso de ventana se calcula (varios
   * días que incluyen el vigente). Con varios días no se muestran chips: los reemplaza el resumen.
   */
  const fechaDeCuadro = unDia ? rangoAplicado.desde : vigente;
  const muestraAvisoVentana = incluye(rangoAplicado, vigente);

  const { cuadro, cargando: cargandoCuadro, puedeEscribir } =
    useCuadroDiario(fechaDeCuadro);

  const [editando, setEditando] = useState<Operativo | null>(null);
  // PATRULLA (2026-09-18): «Agregar Personal» abre el panel en modo solo-personal aunque el que
  // mira sea el registrante (que si no vería el editor de generales completo).
  const [agregandoAPatrulla, setAgregandoAPatrulla] = useState(false);
  // «Ver detalle» (2026-10-13): el cajón se abre en SOLO LECTURA aunque la fila admita edición.
  const [consultaId, setConsultaId] = useState<number | null>(null);
  /**
   * EDICIÓN DIFERIDA (2026-10-01). El personal de un operativo PROPIO ya no se guarda al instante:
   * los cambios (alta/baja/turno) se acumulan en el borrador local —`editando.personal`— y se
   * aplican al pulsar «Guardar cambios». Aquí se guarda el personal ORIGINAL del servidor (al abrir
   * o recargar) para calcular el diff a aplicar y para saber si hay cambios pendientes.
   */
  const personalOriginalRef = useRef<PersonaAsignada[]>([]);
  /**
   * Confirmación en palabras tras asignar/retirar personal en el cajón (2026-10-01). El personal se
   * guarda al instante; esta franja («… asignado/retirado · guardado») lo dice sin color solo
   * (regla 6). Se limpia al cerrar el cajón.
   */
  const [confirmacionPersonal, setConfirmacionPersonal] = useState<
    string | null
  >(null);
  // Fase D: mensaje del servidor tras un 409 al guardar. Se muestra DENTRO del cajón, con
  // «Recargar datos», y conserva lo capturado (RN de bloqueo optimista). Nulo si no hay conflicto.
  const [conflictoEdicion, setConflictoEdicion] = useState<string | null>(null);
  /** Otro error del servidor al guardar la edición: dentro del cajón, sobre el pie, sin cerrarlo. */
  const [errorEdicion, setErrorEdicion] = useState<AvisoTexto | null>(null);
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
  /*
    A QUIÉN SE REFIERE EL RECHAZO (R2, 2026-10-16), igual que en P-01: el servidor nombra a la
    persona en `detalles.funcionarioId` y el motivo se pinta bajo SU horario dentro del cajón. Solo
    vale mientras `avisoPersonal` siga siendo ese texto: ningún otro aviso hereda el dueño.
  */
  const [rechazoDe, setRechazoDe] = useState<{ mensaje: string; id: number } | null>(null);
  const idPersonaRechazada =
    rechazoDe !== null && rechazoDe.mensaje === avisoPersonal ? rechazoDe.id : null;
  const avisarRechazoPersonal = (fallo: unknown) => {
    const texto = presentarError(fallo).mensaje;
    const id = funcionarioDelRechazo(fallo);
    setAvisoPersonal(texto);
    setRechazoDe(id === null ? null : { mensaje: texto, id });
  };

  /** El error de CARGA del listado; los de las acciones son mensajes estándar o van en su cajón. */
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  /**
   * Aviso breve tras guardar o retirar (abajo a la derecha, desaparece solo). El retiro también
   * va por aquí desde el 2026-10-15: `ModalExito` se retiró.
   */

  // La ventana del rol de carga bajo el que se opera, no la del primero de la lista de
  // quien entra. Ver `useVentanaCarga`: con varios roles, el servidor respondía por el
  // primero y la pantalla miraba una ventana ajena.
  const ventana = useVentanaCarga(ROLES_DE_CARGA);

  /**
   * El ADICIONAL, en su cajón único (2026-08-20; hook compartido con P-01 desde el 2026-10-13).
   * Al registrarlo se recarga la lista y su fila se resalta (`cargar` se declara más abajo: el hook
   * llama siempre a la última versión de este aviso).
   */
  const adicional = useAdicionalOperativo({
    ventanaAbierta: ventana.puedeEscribir,
    alRegistrar: async (creado, aviso) => {
      toast.exito(aviso);
      await cargar();
      resaltar(creado.id);
    },
  });

  /**
   * El operativo cuyo formulario y horario gobiernan los catálogos y los elegibles.
   *
   * SOLO UNO DE LOS DOS PANELES ESTÁ ABIERTO A LA VEZ —abrir uno cierra el otro—, y de ahí que
   * `enPanel` sirva para los tres efectos que dependen de «qué formulario y qué horario se están
   * mirando»: catálogos, puntos de la zonal y personal elegible.
   */
  const enPanel = editando ?? adicional.origen;

  /**
   * Fase D: al abrir, cerrar o cambiar de operativo en el cajón se olvida el conflicto (409) de la
   * edición anterior. Recargar reusa el mismo id y limpia el conflicto por su cuenta, así que no lo
   * borra este efecto. El indicador «sin guardar» lo repone el propio reportero al montar (dirty=false).
   */
  useEffect(() => {
    setConflictoEdicion(null);
    // Al abrir/cambiar de operativo, el personal del servidor es el punto de partida del borrador.
    // SOLO al cambiar de `id`, NO en cada mutación local: incluir `editando.personal` en las
    // dependencias recapturaría el «original» en cada alta/baja del borrador y anularía el diff.
    personalOriginalRef.current = editando?.personal ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando?.id]);

  /**
   * Cierra la edición y descarta lo que no se guardó. `DrawerOperativo` ya preguntó si había
   * cambios —generales (`dirty`) o, en la edición DIFERIDA, el personal del borrador—: aquí solo se
   * cierra. En el aporte el personal se guardó al instante y no cuenta.
   */
  const descartarEdicion = useCallback(() => {
    setErrorEdicion(null);
    setEditando(null);
    setAgregandoAPatrulla(false);
    setConfirmacionPersonal(null);
  }, []);

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
   * CON UN RANGO, CADA FILA ES DE SU CUADRO (2026-10-13).
   *
   * El servidor dice por fila si admite edición (`admiteEdicion`: no cerrada, cuadro vigente y
   * ventana abierta). Sin ese dato —respuesta anterior— rige la vara de siempre, la del cuadro
   * que se mira. Una fila de un cuadro CERRADO o PASADO solo se consulta: «Ver» y «Eliminar»
   * apagado con su motivo. La del vigente con la ventana cerrada conserva el comportamiento y
   * los textos de siempre.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const bloqueadoFila = useCallback(
    (operativo: Operativo): boolean =>
      operativo.admiteEdicion === undefined ? bloqueado : !operativo.admiteEdicion,
    [bloqueado],
  );
  // Sin el dato del servidor no se distingue «cerrado o pasado»: rige el comportamiento de siempre.
  const cuadroCerradoFila = useCallback(
    (operativo: Operativo): boolean =>
      operativo.admiteEdicion !== undefined &&
      (operativo.cuadroEstado === "CERRADO" || operativo.cuadroFecha !== vigente),
    [vigente],
  );
  /**
   * El adicional se salta la ventana y se dispone el día de la ejecución (regla 11): se ofrece
   * en el cuadro de HOY y en el vigente mientras no estén cerrados, como hasta ahora.
   */
  const adicionalBloqueadoFila = useCallback(
    (operativo: Operativo): boolean =>
      operativo.cuadroEstado === undefined
        ? bloqueadoParaAdicional
        : operativo.cuadroEstado === "CERRADO",
    [bloqueadoParaAdicional],
  );
  const ofreceAdicionalFila = useCallback(
    (operativo: Operativo): boolean =>
      operativo.admiteEdicion === undefined || operativo.cuadroFecha >= fechaDeHoy(),
    [],
  );

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

  /**
   * ¿Esta edición usa el guardado DIFERIDO del personal? (2026-10-01). Solo el operativo PROPIO que
   * se corrige con «Guardar cambios» y NO es patrulla (la patrulla gestiona su personal con el
   * roster, al instante). El APORTE (operativo ajeno, solo-personal) NO tiene «Guardar cambios», así
   * que ahí el personal sigue al instante: no hay a dónde diferirlo.
   */
  const esEdicionDiferida = useCallback(
    (operativo: Operativo | null, aportandoAPatrulla: boolean): boolean =>
      operativo !== null &&
      !aportandoAPatrulla &&
      !operativo.formulario.esPatrulla &&
      accesoDe(operativo) === "PROPIO",
    [accesoDe],
  );

  // Solo cuenta la última consulta: si el rango cambia mientras otra responde, esa se descarta.
  const consultaVigenteRef = useRef(0);

  const cargar = useCallback(async () => {
    const consulta = ++consultaVigenteRef.current;
    setCargando(true);
    setAviso(null);

    try {
      const filas: Operativo[] = [];
      let total = 0;
      for (let numero = 1; numero <= MAX_PAGINAS_SERVIDOR; numero += 1) {
        const respuesta = await OperativoService.consultar({
          desde: rangoAplicado.desde,
          hasta: rangoAplicado.hasta,
          pagina: numero,
          tamanio: TAMANIO_MAXIMO_SERVIDOR,
        });
        if (consulta !== consultaVigenteRef.current) return;
        filas.push(...respuesta.datos);
        total = respuesta.meta.total;
        if (filas.length >= total || respuesta.datos.length === 0) break;
      }
      setOperativos(filas);
      setTotalServidor(total);
    } catch (fallo: unknown) {
      if (consulta !== consultaVigenteRef.current) return;
      const error = presentarError(fallo);
      setOperativos([]);
      setTotalServidor(0);
      // Una fecha sin jornada abierta no es un fallo: es un día sin cuadro.
      if (error.estado !== 404) {
        setAviso({ texto: error.mensaje, variante: varianteDeAviso(error.trato) });
      }
    } finally {
      if (consulta === consultaVigenteRef.current) setCargando(false);
    }
  }, [rangoAplicado]);

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
  const cargarPuntosDeZonales = catalogos.cargarPuntosDeZonales;
  // Las zonales (varias, 2026-09-21), no el operativo entero: al agregar personal `enPanel`
  // cambia de identidad y volvería a pedir los mismos puntos. La clave estable evita el bucle.
  const zonalesEnEdicionKey = (enPanel?.zonales ?? [])
    .map((zonal) => zonal.id)
    .join(",");

  useEffect(() => {
    const ids = zonalesEnEdicionKey
      ? zonalesEnEdicionKey.split(",").map(Number)
      : [];
    if (ids.length > 0) void cargarPuntosDeZonales(ids);
  }, [zonalesEnEdicionKey, cargarPuntosDeZonales]);

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

    // RN-66: el ADICIONAL se pide SIN horario (por área y ausencia): ya no tiene uno único,
    // cada persona lleva el suyo. La EDICIÓN sí filtra por la ventana del operativo, que
    // conserva su envolvente.
    const esAdicional = Boolean(adicional.origen) && !editando;
    const conHorario =
      !esAdicional && Boolean(horario.inicio) && Boolean(horario.fin);

    PersonalService.consultarElegibles({
      formulario: enPanel.formulario.codigo,
      inicio: enPanel.cuadroFecha,
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
  }, [enPanel, editando, adicional.origen, horario.inicio, horario.fin]);

  /** Cambia el rango que se escribe; la consulta llega tras la espera, si es válido. */
  const cambiarRango = useCallback((nuevo: RangoFechas) => {
    setRango(nuevo);
    setEditando(null);
  }, []);

  // «Limpiar filtros» (2026-10-13) también devuelve el rango al cuadro vigente.
  const { limpiarFiltros: limpiarColumnas } = tabla;
  const limpiarFiltros = useCallback(() => {
    limpiarColumnas();
    setRango({ desde: vigente, hasta: vigente });
  }, [vigente, limpiarColumnas]);

  const atajoDelRango = atajoActivo(rango, vigente);

  /** Cuántos cuadros distintos abarca lo cargado, para el resumen de varios días. */
  const cuadrosDelRango = useMemo(
    () => new Set(operativos.map((operativo) => operativo.cuadroFecha)).size,
    [operativos],
  );

  /**
   * BUG #9 (2026-09-30): reemplaza en la lista de la jornada el operativo COMPLETO que devuelve una
   * mutación de personal (`asignarPersonal`/`retirarPersonal` traen el operativo con su personal al
   * día). El endpoint de LISTA puede devolver el operativo sin el detalle de personal, así que
   * `cargar()` no basta: sin esto la fila seguía diciendo «todavía no tiene personal asignado» aun
   * con asignados. Solo cambia ese operativo; el resto de la lista no se toca.
   */
  const empalmarEnLaLista = useCallback((actualizado: Operativo) => {
    setOperativos((previos) =>
      previos.map((operativo) =>
        operativo.id === actualizado.id ? actualizado : operativo,
      ),
    );
  }, []);

  const { ejecutar: conLiberacion, modal: modalLiberacion } =
    useConfirmarLiberacion();

  const guardarEdicion = useCallback(
    async (
      valores: ValoresOperativo,
      ayudas: FormikHelpers<ValoresOperativo>,
      extras?: ExtrasDelEnvio,
    ) => {
      if (!editando) return;

      setProcesando(true);
      setAviso(null);
      setConflictoEdicion(null);
      setErrorEdicion(null);

      // RN-66: el operativo conserva su ventana; la corrección edita zonal, punto, tipo,
      // instituciones y notas (los campos GENERALES), no el horario.
      const generales = {
        zonalesIds: valores.zonalesIds,
        puntoEncuentroId:
          valores.punto === OPCION_ADICIONALES || valores.punto === ""
            ? undefined
            : Number(valores.punto),
        puntoLibre:
          valores.punto === OPCION_ADICIONALES ? valores.puntoLibre : undefined,
        /*
          TIPO DE CONTROL — MISMA REGLA QUE EL ALTA (P-01), y se decide por el flag del catálogo
          `tipoControlMultiple`, no por si el arreglo trae datos. En el form 8 (múltiple) viajan los
          ids en `tipoControlIds` y el «otro tipo» integrado en `tipoLibre`; en el resto, el tipo
          único (o el adicional de la rama «ADICIONALES»). OJO: la clave del contrato es
          `tipoControlIds` (NO `tiposControlIds`, que es solo el nombre del valor local); enviar un
          campo ajeno al DTO hace que el servidor rechace el PATCH (400) y el guardado «no haga nada».
        */
        tipoControlId:
          catalogos.catalogos?.tipoControlMultiple ||
          valores.tipoControl === OPCION_ADICIONALES ||
          valores.tipoControl === ""
            ? undefined
            : Number(valores.tipoControl),
        tipoControlIds: catalogos.catalogos?.tipoControlMultiple
          ? valores.tiposControlIds
          : undefined,
        tipoLibre: catalogos.catalogos?.tipoControlMultiple
          ? valores.tipoLibre.trim() || undefined
          : valores.tipoControl === OPCION_ADICIONALES
            ? valores.tipoLibre
            : undefined,
        institucionesIds: valores.institucionesIds,
            // Cómo se moviliza (2026-10-06): lo elige quien registra; por defecto, completo.
            tipoTransporte: valores.tipoTransporte ?? "COMPLETO",
            esMacrooperativo: macroSegunTipo(
              valores.tipoTransporte ?? "COMPLETO",
              valores.esMacrooperativo,
            ),
        observacionesNuevas:
          valores.observaciones.length > 0 ? valores.observaciones : undefined,
      };

      try {
        // PATRULLA (2026-09-18): editar los generales los aplica a TODOS los códigos del lote.
        if (editando.grupoRegistro) {
          const grupo = editando.grupoRegistro;
          // Transporte requerido (2026-10-07): si cambia el tipo con transporte asignado, se pregunta.
          const hecho = await conLiberacion((confirmarLiberacion) =>
            OperativoService.editarPatrulla(grupo, {
              ...generales,
              ...(confirmarLiberacion ? { confirmarLiberacion } : {}),
            }),
          );
          if (hecho === null) return;
          // Aviso breve abajo a la derecha y la fila resaltada, como el adicional (2026-10-08).
          toast.exito("Patrulla actualizada en todos sus códigos.");
          resaltar(editando.id);
          setEditando(null);
          ayudas.resetForm();
          await cargar();
          return;
        }

        // DIFERIDO (operativo propio): aplicar el borrador de personal acumulado ANTES de los
        // generales. Cada alta/baja/turno es su propia petición y NO son una transacción: si el
        // servidor rechaza una persona (descanso/cruce, RN-24/25), se detiene ahí, se avisa en el
        // bloque de personal y NO se tocan los generales; lo ya aplicado queda guardado y el cajón
        // sigue abierto para corregir. Se usa la `version` al día que devuelve cada respuesta.
        let versionVigente = editando.version;
        if (esEdicionDiferida(editando, agregandoAPatrulla)) {
          const original = personalOriginalRef.current;
          const idsActual = new Set(
            editando.personal.map((persona) => persona.funcionarioId),
          );
          const idsOriginal = new Set(
            original.map((persona) => persona.funcionarioId),
          );
          const bajas = original.filter(
            (persona) => !idsActual.has(persona.funcionarioId),
          );
          const altas = editando.personal.filter(
            (persona) => !idsOriginal.has(persona.funcionarioId),
          );
          const turnos = editando.personal.filter((persona) => {
            const antes = original.find(
              (otra) => otra.funcionarioId === persona.funcionarioId,
            );
            return (
              antes !== undefined &&
              (antes.horaInicio !== persona.horaInicio ||
                antes.horaFin !== persona.horaFin)
            );
          });
          // Trámites de Inspección (2026-10-07): de quien sigue y lo cambió, y de las altas que lo traen.
          const tramites = editando.personal.filter((persona) => {
            const antes = original.find(
              (otra) => otra.funcionarioId === persona.funcionarioId,
            );
            return antes === undefined
              ? codigoDeTramite(persona) !== null
              : codigoDeTramite(antes) !== codigoDeTramite(persona);
          });

          let actual = editando;
          const aplicado = (operativoAlDia: Operativo) => {
            actual = operativoAlDia;
            versionVigente = operativoAlDia.version;
            // Lo ya aplicado se consolida: la fila de la tabla y el «original» del borrador avanzan,
            // así un reintento tras un fallo no vuelve a aplicar lo que ya quedó guardado.
            personalOriginalRef.current = operativoAlDia.personal;
            empalmarEnLaLista(operativoAlDia);
          };
          // Un turno que mueve la ventana de un operativo con transporte pide confirmar (2026-10-14).
          // Con «No», se detiene aquí: lo ya aplicado queda y el cajón sigue abierto.
          const turnoAplicado = async (
            funcionarioId: number,
            turno: { horaInicio: string; horaFin: string },
          ): Promise<boolean> => {
            const hecho = await conLiberacion((confirmarLiberacion) =>
              OperativoService.actualizarTurnoPersonal(
                actual.id,
                funcionarioId,
                turno,
                confirmarLiberacion,
              ),
            );
            if (hecho === null) return false;
            aplicado(hecho);
            return true;
          };

          try {
            for (const baja of bajas) {
              aplicado(
                await OperativoService.retirarPersonal(
                  actual.id,
                  baja.funcionarioId,
                ),
              );
            }
            for (const alta of altas) {
              aplicado(
                await OperativoService.asignarPersonal(actual.id, {
                  funcionarioId: alta.funcionarioId,
                }),
              );
              const conTurno = await turnoAplicado(alta.funcionarioId, {
                horaInicio: alta.horaInicio,
                horaFin: alta.horaFin,
              });
              if (!conTurno) return;
            }
            for (const turno of turnos) {
              const conTurno = await turnoAplicado(turno.funcionarioId, {
                horaInicio: turno.horaInicio,
                horaFin: turno.horaFin,
              });
              if (!conTurno) return;
            }
            for (const conTramite of tramites) {
              aplicado(
                await OperativoService.fijarTramitePersonal(
                  actual.id,
                  conTramite.funcionarioId,
                  codigoDeTramite(conTramite),
                ),
              );
            }
          } catch (falloPersonal: unknown) {
            // Se detiene y se avisa en el bloque de personal; los generales no se tocan (el `finally`
            // del `try` externo repone `procesando`). El cajón queda abierto con lo ya aplicado.
            avisarRechazoPersonal(falloPersonal);
            return;
          }
        }

        const editado = await conLiberacion((confirmarLiberacion) =>
          OperativoService.editar(editando.id, {
            version: versionVigente,
            ...generales,
            // Compartir unidad (2026-10-19): solo lo que cambió respecto de lo guardado.
            ...camposCompartirParaEnvio(valores, comoValoresDeFormulario(editando)),
            ...(confirmarLiberacion ? { confirmarLiberacion } : {}),
          }),
        );
        if (editado === null) return;
        avisarCompartirRetirado(editado, editando.compartirCon?.identificador);

        // La nota escrita sin «Agregar» se sumó sola (2026-10-16): el aviso lo dice.
        toast.exito(`Operativo ${editando.identificador} actualizado`, {
          texto: extras?.notaPendienteAgregada ? AVISO_NOTA_PENDIENTE : undefined,
        });
        resaltar(editando.id);
        setEditando(null);
        ayudas.resetForm();
        await cargar();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        // `conservaCaptura`: el panel sigue abierto con lo escrito. Un 409 de bloqueo optimista se
        // resuelve recargando, así que su aviso va DENTRO del cajón, con «Recargar datos» (Fase D),
        // donde está mirando quien acaba de pulsar. El resto, también dentro del cajón, sobre el pie.
        if (error.estado === 409) {
          setConflictoEdicion(error.mensaje);
        } else {
          // Dentro del cajón, sobre el pie (2026-10-08): quien pulsó «Guardar» está mirando ahí.
          setErrorEdicion({ texto: error.mensaje, variante: varianteDeAviso(error.trato) });
        }
      } finally {
        setProcesando(false);
      }
    },
    [
      editando,
      cargar,
      catalogos.catalogos?.tipoControlMultiple,
      agregandoAPatrulla,
      esEdicionDiferida,
      empalmarEnLaLista,
      conLiberacion,
      resaltar,
    ],
  );

  // «Agregar Personal» a una patrulla: abre el panel en modo solo-personal sobre un miembro del
  // grupo. El servidor adopta el `grupoRegistro`. 2026-09-18.
  const abrirAgregarPatrulla = useCallback((operativo: Operativo) => {
    setConsultaId(null);
    setEditando(operativo);
    setAgregandoAPatrulla(true);
  }, []);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL GRUPO DE ACCIONES DE UNA FILA (2026-10-13), el mismo en todas: `AccionesOperativo`.
   *
   * La fila que no se puede escribir —cuadro cerrado o pasado, o la ventana cerrada— solo se
   * CONSULTA: «Ver» abre el cajón en solo lectura y «Eliminar» queda apagado en el menú con su
   * motivo. La excepción es «+ Adicional»: se salta la ventana y se dispone el día de la ejecución
   * (regla 11, RN-61), así que sigue ofreciéndose mientras su cuadro no esté cerrado.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const motivoBloqueoDe = useCallback(
    (operativo: Operativo): string =>
      cuadroCerradoFila(operativo)
        ? MOTIVO_CUADRO_CERRADO
        : "La ventana de carga está cerrada o el cuadro fue cerrado.",
    [cuadroCerradoFila],
  );

  /** Abre el cajón del operativo; con `consulta`, en solo lectura aunque la fila admita edición. */
  const abrirCajon = useCallback((operativo: Operativo, consulta: boolean) => {
    setAgregandoAPatrulla(false);
    setConsultaId(consulta ? operativo.id : null);
    setEditando(operativo);
  }, []);

  /**
   * La nota «Comparte con X» (2026-10-19): abre el detalle del operativo con el que comparte. Si
   * no está en la lista cargada, se pide por su id; es del mismo ámbito (RN-48), así que se ve.
   */
  const verOperativoPorId = useCallback(
    async (operativoId: number) => {
      const enLista = operativos.find((uno) => uno.id === operativoId);
      try {
        abrirCajon(enLista ?? (await OperativoService.obtener(operativoId)), true);
      } catch (fallo) {
        mensaje.errorDe(fallo, { titulo: "No se pudo abrir el operativo" });
      }
    },
    [operativos, abrirCajon],
  );

  /** Por qué «+ Adicional» no aplica a esta fila, o `null` si aplica. */
  const motivoSinAdicional = (operativo: Operativo): string | null => {
    if (!operativo.formulario.admiteAdicionales)
      return "Este formulario no admite operativos adicionales.";
    if (operativo.esAdicional)
      return "Es un operativo adicional: los adicionales no se encadenan.";
    if (accesoDe(operativo) !== "PROPIO")
      return "Solo el departamento que registró el operativo puede crear un adicional.";
    if (!ofreceAdicionalFila(operativo)) return "El cuadro de esa fecha ya pasó.";
    if (adicionalBloqueadoFila(operativo)) return "El cuadro fue cerrado por la Dirección.";
    return null;
  };

  /**
   * El casillero «+ Adicional»: vacío en una fila de consulta, salvo que el adicional siga
   * disponible ahí (cuadro de hoy o vigente sin cerrar).
   */
  const casilleroAdicional = (operativo: Operativo) => {
    const consulta = bloqueadoFila(operativo);
    const disponible =
      ofreceAdicionalFila(operativo) && !adicionalBloqueadoFila(operativo);
    if (consulta && !disponible) return null;
    return {
      onClick: () => abrirAdicional(operativo),
      motivo: motivoSinAdicional(operativo),
    };
  };

  /** «Eliminar» del menú: apagado si la fila es de consulta o de otro departamento. */
  const eliminarDe = (operativo: Operativo) => ({
    onClick: () => setPorRetirar(operativo),
    motivo: bloqueadoFila(operativo)
      ? motivoBloqueoDe(operativo)
      : motivoDeSoloLectura(accesoDe(operativo), operativo.creadoPorRol),
  });

  /** Una fila suelta (o una copia del 8). */
  const accionesDeFila = (operativo: Operativo) => {
    const esPropio = accesoDe(operativo) === "PROPIO";
    const consulta = bloqueadoFila(operativo);
    const principal: AccionPrincipal = consulta
      ? {
          tipo: "ver",
          onClick: () => abrirCajon(operativo, true),
          motivo: `${motivoBloqueoDe(operativo)}: se abre en solo lectura.`,
        }
      : esPropio
        ? { tipo: "editar", onClick: () => abrirCajon(operativo, false) }
        : {
            // Quien APORTA no edita los generales: abre el mismo cajón en «solo personal».
            tipo: "personal",
            onClick: () => abrirCajon(operativo, false),
            motivo:
              motivoDeSoloLectura(accesoDe(operativo), operativo.creadoPorRol) ?? undefined,
          };
    return (
      <AccionesOperativo
        identificador={operativo.identificador}
        principal={principal}
        consulta={consulta}
        adicional={casilleroAdicional(operativo)}
        onVerDetalle={() => abrirCajon(operativo, true)}
        eliminar={eliminarDe(operativo)}
        procesando={procesando}
      />
    );
  };

  /**
   * Una fila de PATRULLA (Form 5/6). La patrulla es UN operativo: su acción principal va una sola
   * vez, en la cabeza —«Editar» para quien la registró, «Agregar Personal» para quien aporta—, y en
   * cada fila el menú con el «Eliminar» de esa persona. 2026-09-18, rehecho el 2026-10-13.
   */
  const accionesDeFilaPatrulla = (
    operativo: Operativo,
    grupo: Operativo[],
    esCabeza: boolean,
  ) => {
    const cabeza = grupo[0];
    const esRegistrante = accesoDe(cabeza) === "PROPIO";
    // «Agregar Personal» es el APORTE de Instrucción: espejo de `reglaCupoCompartido`.
    const puedeAgregarPersonal = puedeAportarA(cabeza, user?.rolCodes ?? []);
    const consulta = bloqueadoFila(cabeza);

    let principal: AccionPrincipal | null = null;
    if (esCabeza) {
      principal =
        consulta || (!esRegistrante && !puedeAgregarPersonal)
          ? {
              tipo: "ver",
              onClick: () => abrirCajon(cabeza, true),
              motivo: consulta
                ? `${motivoBloqueoDe(cabeza)}: se abre en solo lectura.`
                : undefined,
            }
          : esRegistrante
            ? { tipo: "editar", onClick: () => abrirCajon(cabeza, false) }
            : { tipo: "personal", onClick: () => abrirAgregarPatrulla(cabeza) };
    }

    return (
      <AccionesOperativo
        identificador={operativo.identificador}
        principal={principal}
        consulta={consulta}
        adicional={esCabeza ? casilleroAdicional(cabeza) : null}
        onVerDetalle={() => abrirCajon(operativo, true)}
        // Quien registró la patrulla y además aporta a ella: «Agregar personal» va al menú.
        masAcciones={
          esCabeza && !consulta && esRegistrante && puedeAgregarPersonal
            ? [{ etiqueta: "Agregar personal", onClick: () => abrirAgregarPatrulla(cabeza) }]
            : []
        }
        eliminar={eliminarDe(operativo)}
        procesando={procesando}
      />
    );
  };

  /**
   * Abre el panel del adicional. 2026-08-20.
   *
   * Cierra la edición si estaba abierta: los dos paneles comparten los efectos de
   * catálogos y elegibles, y tenerlos a la vez haría que uno pidiera los datos del otro.
   */
  const { abrir: abrirCajonAdicional } = adicional;
  const abrirAdicional = useCallback(
    (origen: Operativo) => {
      setEditando(null);
      setAvisoPersonal(null);
      abrirCajonAdicional(origen);
    },
    [abrirCajonAdicional],
  );

  const agregarPersona = useCallback(
    async (persona: PersonaElegible) => {
      if (!editando) return;

      setAvisoPersonal(null);

      // DIFERIDO (operativo propio): se acumula en el borrador local; NO toca el servidor ni la
      // tabla hasta «Guardar cambios». El turno arranca heredando la ventana del operativo (lo
      // mismo que hace el servidor al asignar); se puede ajustar con «Cambiar turno».
      if (esEdicionDiferida(editando, agregandoAPatrulla)) {
        setEditando((actual) =>
          actual
            ? {
                ...actual,
                personal: [
                  ...actual.personal,
                  {
                    funcionarioId: persona.id,
                    nombre: nombreDePersona(persona),
                    area: persona.area,
                    telefono: null,
                    esResponsable: false,
                    asignadoPorRol: actual.creadoPorRol,
                    horaInicio: actual.horaInicio,
                    horaFin: actual.horaFin,
                  },
                ],
              }
            : actual,
        );
        return;
      }

      // INMEDIATO (aporte a formulario ajeno: no hay «Guardar cambios»).
      try {
        const actualizado = await OperativoService.asignarPersonal(editando.id, {
          funcionarioId: persona.id,
        });
        setEditando(actualizado);
        empalmarEnLaLista(actualizado);
        setConfirmacionPersonal(
          `Se guarda al instante · ${nombreDePersona(persona)} asignado · guardado.`,
        );
      } catch (fallo: unknown) {
        avisarRechazoPersonal(fallo);
      }
    },
    [editando, agregandoAPatrulla, esEdicionDiferida, empalmarEnLaLista],
  );

  const retirarPersona = useCallback(
    async (funcionarioId: number) => {
      if (!editando) return;

      setAvisoPersonal(null);

      // DIFERIDO (operativo propio): se quita del borrador local; se aplica al «Guardar cambios».
      if (esEdicionDiferida(editando, agregandoAPatrulla)) {
        setEditando((actual) =>
          actual
            ? {
                ...actual,
                personal: actual.personal.filter(
                  (persona) => persona.funcionarioId !== funcionarioId,
                ),
              }
            : actual,
        );
        return;
      }

      // El nombre se toma ANTES de retirar: tras la respuesta ya no está en el operativo.
      const nombreRetirado =
        editando.personal.find(
          (persona) => persona.funcionarioId === funcionarioId,
        )?.nombre ?? "La persona";

      // INMEDIATO (aporte).
      try {
        const actualizado = await OperativoService.retirarPersonal(
          editando.id,
          funcionarioId,
        );
        setEditando(actualizado);
        empalmarEnLaLista(actualizado);
        setConfirmacionPersonal(
          `Se guarda al instante · ${nombreRetirado} retirado · guardado.`,
        );
      } catch (fallo: unknown) {
        avisarRechazoPersonal(fallo);
      }
    },
    [editando, agregandoAPatrulla, esEdicionDiferida, empalmarEnLaLista],
  );

  /**
   * Fija el trámite de Inspección de una persona en el borrador del cajón (2026-10-07). Se aplica al
   * «Guardar cambios», con el resto del personal.
   */
  const cambiarTramiteEnEdicion = useCallback(
    (funcionarioId: number, codigoTramite: string | null) => {
      setAvisoPersonal(null);
      setEditando((actual) =>
        actual
          ? {
              ...actual,
              personal: actual.personal.map((persona) =>
                persona.funcionarioId === funcionarioId
                  ? {
                      ...persona,
                      tramiteInspeccion: codigoTramite
                        ? {
                            codigoTramite,
                            nroSitra: null,
                            predio: null,
                            zonal: null,
                            materia: null,
                            tipoTramite: null,
                          }
                        : null,
                    }
                  : persona,
              ),
            }
          : actual,
      );
    },
    [],
  );

  /**
   * CAMBIAR EL TURNO DE UNA PERSONA (Fase C, 2026-09-30). Igual que asignar y retirar en edición: es
   * un `PATCH` INMEDIATO (RN-66). El servidor re-deriva la ventana del operativo (envolvente) y
   * revalida el cruce/descanso de esa persona; devuelve el operativo al día, que se refleja en el
   * cajón (`setEditando`) y en la fila de la lista (`empalmarEnLaLista`).
   */
  const cambiarHorarioPersona = useCallback(
    async (funcionarioId: number, horaInicio: string, horaFin: string) => {
      if (!editando) return;

      setAvisoPersonal(null);

      // DIFERIDO (operativo propio): el turno se ajusta en el borrador; se aplica al guardar.
      if (esEdicionDiferida(editando, agregandoAPatrulla)) {
        setEditando((actual) =>
          actual
            ? {
                ...actual,
                personal: actual.personal.map((persona) =>
                  persona.funcionarioId === funcionarioId
                    ? { ...persona, horaInicio, horaFin }
                    : persona,
                ),
              }
            : actual,
        );
        return;
      }

      try {
        const actualizado = await conLiberacion((confirmarLiberacion) =>
          OperativoService.actualizarTurnoPersonal(
            editando.id,
            funcionarioId,
            { horaInicio, horaFin },
            confirmarLiberacion,
          ),
        );
        if (actualizado === null) return;
        setEditando(actualizado);
        empalmarEnLaLista(actualizado);
      } catch (fallo: unknown) {
        avisarRechazoPersonal(fallo);
      }
    },
    [
      editando,
      agregandoAPatrulla,
      esEdicionDiferida,
      empalmarEnLaLista,
      conLiberacion,
    ],
  );

  /**
   * RECARGAR DATOS tras un 409 (Fase D). Vuelve a pedir el operativo al servidor y reinicia el cajón
   * con la versión al día —así el siguiente guardado lleva la `version` correcta—, conservando el
   * cajón abierto. El personal ya se guardó al instante, de modo que solo se repone lo que el otro
   * cambió; lo capturado en los generales se pierde a propósito: ya no casa con la versión nueva.
   */
  const recargarEdicion = useCallback(async () => {
    if (!editando) return;

    setProcesando(true);
    try {
      const fresco = await OperativoService.obtener(editando.id);
      setEditando(fresco);
      empalmarEnLaLista(fresco);
      // Mismo id: el efecto no repone el original, hay que resincronizarlo a mano con la versión al día.
      personalOriginalRef.current = fresco.personal;
      setConflictoEdicion(null);
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, {
        titulo: "No se pudo recargar el operativo",
        reintentar: () => void recargarEdicion(),
      });
    } finally {
      setProcesando(false);
    }
  }, [editando, empalmarEnLaLista]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EDITAR EL PERSONAL DE UNA PATRULLA (Form 5/6). 2026-09-18.
   *
   * La patrulla es un grupo de operativos de UNA persona (IGNECU/ITNECU/INECU). Al pulsar
   * «Editar», el registrante ve el roster y, sobre lo suyo (Inspector General/Técnico):
   *   · CAMBIA la persona conservando el código (misma área) → `reemplazarPersonal`.
   *   · AGREGA una persona nueva → `asignarPersonal` la crea como un código más de su área.
   *   · QUITA un código → el mismo modal de retiro por operativo (`setPorRetirar`).
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const reemplazarPersonaPatrulla = useCallback(
    async (operativoId: number, funcionarioId: number) => {
      setAvisoPersonal(null);
      try {
        await OperativoService.reemplazarPersonal(operativoId, funcionarioId);
        await cargar();
      } catch (fallo: unknown) {
        avisarRechazoPersonal(fallo);
      }
    },
    [cargar],
  );

  const agregarMiembroPatrulla = useCallback(
    async (funcionarioId: number) => {
      if (!editando) return;

      setAvisoPersonal(null);
      try {
        // El servidor adopta el `grupoRegistro` de la patrulla y numera el nuevo código por el
        // área de la persona (p. ej. un 2.º General → IGNECU-002).
        await OperativoService.asignarPersonal(editando.id, { funcionarioId });
        await cargar();
      } catch (fallo: unknown) {
        avisarRechazoPersonal(fallo);
      }
    },
    [editando, cargar],
  );

  /** ¿Estoy editando (no aportando) una patrulla que registré yo? Entonces se pinta el roster. */
  const editandoPatrulla =
    editando != null &&
    Boolean(editando.grupoRegistro) &&
    // El roster (cambiar inspector/aportar) es SOLO de la patrulla. El Form 8 comparte lote pero
    // no es patrulla: se edita con los generales normales, sin roster.
    editando.formulario.esPatrulla &&
    !agregandoAPatrulla &&
    accesoDe(editando) === "PROPIO";

  // EDICIÓN DIFERIDA (2026-10-01): el personal del operativo propio se aplica al «Guardar cambios».
  const edicionDiferida = esEdicionDiferida(editando, agregandoAPatrulla);
  // ¿Hay personal pendiente de aplicar (alta/baja/turno en el borrador)?
  const personalSucio =
    edicionDiferida && editando != null
      ? hayCambiosDePersonal(editando.personal, personalOriginalRef.current)
      : false;
  /**
   * QUÉ MODO DEL CAJÓN. «editar» para el operativo propio (y los generales de la patrulla propia);
   * «personal» para el aporte y el «Agregar Personal» de la patrulla, que guardan al instante.
   */
  const modoCajon: "editar" | "personal" =
    editando != null && !agregandoAPatrulla && accesoDe(editando) === "PROPIO"
      ? "editar"
      : "personal";

  /** Los códigos de la patrulla en edición, cada uno con su persona y si lo puedo tocar. */
  const miembrosPatrulla = useMemo<MiembroPatrulla[]>(() => {
    if (!editando?.grupoRegistro) return [];
    return operativos
      .filter((operativo) => operativo.grupoRegistro === editando.grupoRegistro)
      .slice()
      .sort((una, otra) => una.identificador.localeCompare(otra.identificador))
      .map((operativo) => ({
        operativo,
        persona: operativo.personal[0],
        // Puedo cambiar/quitar los códigos que registré yo (General/Técnico); el INECU del DMIT
        // llega en lectura.
        editable: accesoDe(operativo) === "PROPIO",
      }))
      .filter((miembro) => miembro.persona != null);
  }, [operativos, editando, accesoDe]);

  const confirmarRetiro = useCallback(async () => {
    if (!porRetirar) return;

    setAviso(null);

    // Si el servidor lo rechaza, la promesa falla y el MISMO modal de la confirmación lo muestra.
    const baja = await OperativoService.retirar(porRetirar.id, porRetirar.version);
    // PV-10: las dos bajas no son la misma noticia. Si la fila se conservó, quien la
    // retiró tiene que saberlo, y por qué.
    // Eliminado: éxito. Retirado sin eliminar: INFORMACIÓN (no se hizo lo que se pidió, y por qué).
    if (baja.eliminado) {
      toast.exito(`Operativo ${baja.identificador} eliminado. Su número queda libre para el siguiente registro.`);
    } else {
      toast.info(`Operativo ${baja.identificador} retirado del cuadro. No se elimina porque ya tiene ${baja.ordenesEmitidas === 1 ? "una orden emitida" : `${baja.ordenesEmitidas} órdenes emitidas`}: una orden ya comunicada no puede quedarse sin origen.`);
    }
    if (editando?.id === porRetirar.id) setEditando(null);
    setPorRetirar(null);
    // La recarga va aparte: el modal ya se cerró y un fallo al releer lo dice la propia página.
    void cargar();
  }, [porRetirar, editando, cargar]);


  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker font-semibold uppercase">
          {user?.rolName ?? "Departamento"}
        </p>
        <h1 className="page-heading-title">
          Mis operativos
        </h1>
        {/*
          UN SOLO DÍA: los chips del cuadro, como siempre. VARIOS DÍAS (2026-10-13): no hay un
          cuadro que nombrar; el resumen dice cuántos operativos y cuántos cuadros abarca.
        */}
        {unDia ? (
          <CamposCalculados
            cuadro={cuadro}
            cargando={cargandoCuadro}
          />
        ) : (
          <div role="status">
            <Insignia variante="suave">
              {cargando
                ? "Cargando…"
                : resumenDelRango(rangoAplicado, operativos.length, cuadrosDelRango)}
            </Insignia>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaDesde"
            >
              <span className="text-app-label text-xs uppercase tracking-[0.12em]">
                Desde
              </span>
            </label>
            <input
              id="fechaDesde"
              type="date"
              className={`input input-bordered input-sm ${
                errorRango?.campo === "desde" ? "input-error" : ""
              }`}
              value={rango.desde}
              aria-invalid={errorRango?.campo === "desde"}
              aria-describedby={errorRango ? "errorRango" : undefined}
              onChange={(evento) => cambiarRango({ ...rango, desde: evento.target.value })}
            />
          </div>
          <span
            className="pb-2 text-app-muted"
            aria-hidden="true"
          >
            →
          </span>
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaHasta"
            >
              <span className="text-app-label text-xs uppercase tracking-[0.12em]">
                Hasta
              </span>
            </label>
            <input
              id="fechaHasta"
              type="date"
              className={`input input-bordered input-sm ${
                errorRango?.campo === "hasta" ? "input-error" : ""
              }`}
              value={rango.hasta}
              aria-invalid={errorRango?.campo === "hasta"}
              aria-describedby={errorRango ? "errorRango" : undefined}
              onChange={(evento) => cambiarRango({ ...rango, hasta: evento.target.value })}
            />
          </div>

          {/* Atajos anclados al cuadro vigente; el que coincide con el rango se resalta. */}
          <div
            className="flex flex-wrap gap-1 pb-1"
            role="group"
            aria-label="Atajos de fechas"
          >
            {ATAJOS_RANGO.map(({ clave, nombre }) => {
              const activo = atajoDelRango === clave;
              return (
                <button
                  key={clave}
                  type="button"
                  // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                  className={`btn btn-sm rounded-full ${activo ? "btn-primary" : "btn-outline"}`}
                  aria-pressed={activo}
                  onClick={() => cambiarRango(rangoDeAtajo(clave, vigente))}
                >
                  {nombre}
                </button>
              );
            })}
          </div>

          <Boton
            variante="enlace"
            tamano="sm"
            onClick={limpiarFiltros}
            deshabilitado={!tabla.filtrando && rango.desde === vigente && rango.hasta === vigente}
          >
            Limpiar filtros
          </Boton>
        </div>

        {errorRango && (
          <p
            id="errorRango"
            className="text-sm text-error"
            role="alert"
          >
            {errorRango.mensaje}
          </p>
        )}
      </header>

      {/* RN-56 y RN-58. Se avisa antes de intentar editar, no al guardar. */}
      {/* El mismo aviso que muestra la vista previa de «Editar ventana de carga» (2026-10-07). */}
      {/*
        Con un rango (2026-10-13), el aviso de la ventana sale solo si el rango incluye el cuadro
        vigente: es el único que la ventana gobierna. Un solo día cerrado por la Dirección lo
        sigue diciendo.
      */}
      {!cargandoCuadro &&
        !ventana.cargando &&
        (muestraAvisoVentana
          ? bloqueado
          : unDia && cuadro !== null && !cuadro.admiteEscritura) && (
        <AvisoVentanaCerrada>
          {cuadro && !cuadro.admiteEscritura
            ? `El cuadro del ${cuadro.fecha} fue cerrado por la Dirección: puede consultarlo, pero no editarlo ni retirar operativos.`
            : `${ventana.mensaje} Puede consultar el listado; para editar o retirar, espere a que su ventana vuelva a abrirse.`}
        </AvisoVentanaCerrada>
      )}

      {/*
        Con la ventana abierta, cuánto queda. Aquí se edita y se retira, y las dos cosas
        dejan de poderse a la misma hora. El adicional no —regla 11—, y por eso el texto
        habla de registrar y editar, que es lo que sí caduca.
      */}
      {!cargandoCuadro && !ventana.cargando && muestraAvisoVentana && !bloqueado && (
        <AvisoVentana cuentaAtras={ventana.cuentaAtras} />
      )}

      {totalServidor > operativos.length && (
        <AvisoEnLinea variante="advertencia">
          {unDia ? "La jornada" : "El rango"} tiene {totalServidor} operativos y esta pantalla muestra
          los primeros {operativos.length}. Informe al administrador: el
          listado necesita paginarse contra el servidor.
        </AvisoEnLinea>
      )}

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudieron cargar los operativos"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      {/*
        EL ADICIONAL, EN SU CAJÓN ÚNICO (2026-10-08): `DrawerOperativo` en modo «adicional», el de Órdenes
        de servicio. Pone la cabecera, el estado del pie, «Registrar adicional» y la confirmación
        de descarte; se monta solo mientras hay adicional, así cada apertura nace limpia. Los
        errores del servidor quedan dentro del cajón (`errorAdicional`), sin cerrarlo.
      */}
      {adicional.origen && (
        <DrawerOperativo
          modo="adicional"
          key={adicional.origen.id}
          {...adicional.cajon}
          origen={adicional.origen}
          catalogos={catalogos.catalogos}
          puntos={catalogos.puntos}
          cargandoPuntos={catalogos.cargandoPuntos}
          onZonalesElegidas={(zonalesIds) => {
            void catalogos.cargarPuntosDeZonales(zonalesIds);
          }}
          candidatos={candidatos}
          cargandoPersonal={cargandoPersonal}
          avisoPersonal={avisoPersonal}
          idPersonaRechazada={idPersonaRechazada}
          bloqueado={adicionalBloqueadoFila(adicional.origen)}
          ventanaCerrada={!ventana.puedeEscribir}
        />
      )}

      {/*
        EDITAR, EN EL CAJÓN ÚNICO (2026-10-08): `DrawerOperativo`, el mismo del adicional y de
        Registro de operativo. «editar» para el operativo propio —personal DIFERIDO, «Guardar
        cambios»—; «personal» para el aporte y el «Agregar Personal» de la patrulla, que guardan cada
        persona al instante. Con la ventana o el cuadro cerrados, «editar» se abre en SOLO LECTURA:
        se consulta, no se guarda. Se monta solo mientras hay operativo: cada apertura nace limpia y
        al cerrarse el foco vuelve al botón de la fila.
      */}
      {editando && (
        <DrawerOperativo
          key={`${editando.id}-${modoCajon}`}
          {...(modoCajon === "personal"
            ? {
                modo: "personal" as const,
                titulo: `Personal de ${
                  editando.grupoRegistro && editando.formulario.esPatrulla
                    ? `patrulla ${editando.grupoRegistro}`
                    : `operativo ${editando.identificador}`
                }`,
              }
            : {
                modo: "editar" as const,
                // Una patrulla (Form 5/6) se nombra por su GRUPO: editar sus generales los aplica a
                // todo el lote.
                titulo:
                  editando.grupoRegistro && editando.formulario.esPatrulla
                    ? `Editar patrulla ${editando.grupoRegistro}`
                    : undefined,
                soloLectura: bloqueadoFila(editando) || consultaId === editando.id,
                personalPendiente: personalSucio,
                horarioCambiado:
                  edicionDiferida &&
                  cambioDeHorario(editando.personal, personalOriginalRef.current),
                mensajeDescarte: edicionDiferida
                  ? undefined
                  : "Se perderán los cambios en punto de encuentro, zonales, instituciones, tipo de control y las observaciones nuevas. El personal ya quedó guardado.",
              })}
          onCerrar={descartarEdicion}
          errorServidor={errorEdicion}
          avisoContexto={
            <>
              {/*
                VENTANA CERRADA: se abre para CONSULTAR. El aviso dice por qué no hay «Guardar
                cambios» (RN-56/RN-58), donde se está mirando.
              */}
              {bloqueadoFila(editando) && modoCajon === "editar" && (
                <AvisoVentanaCerrada>
                  {cuadroCerradoFila(editando)
                    ? `El cuadro del ${fechaCorta(editando.cuadroFecha)} ya está cerrado: puede consultar el operativo, pero no guardar cambios.`
                    : cuadro && !cuadro.admiteEscritura
                    ? `El cuadro del ${cuadro.fecha} fue cerrado por la Dirección: puede consultarlo, pero no guardar cambios.`
                    : `${ventana.mensaje} Puede consultar el operativo; los cambios no pueden guardarse hasta que su ventana vuelva a abrirse.`}
                </AvisoVentanaCerrada>
              )}
              {/*
                CONFLICTO 409 (bloqueo optimista): otro guardó el operativo entre que se abrió el cajón
                y se pulsó «Guardar». El mensaje va tal cual (regla 7) y «Recargar datos» trae la
                versión al día SIN cerrar el cajón.
              */}
              {conflictoEdicion && (
                <AvisoEnLinea
                  variante="error"
                  accion={
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono="actualizar"
                      deshabilitado={procesando}
                      onClick={() => void recargarEdicion()}
                    >
                      Recargar datos
                    </Boton>
                  }
                >
                  {conflictoEdicion}
                </AvisoEnLinea>
              )}
            </>
          }
          operativo={editando}
          catalogos={catalogos.catalogos}
          puntos={catalogos.puntos}
          cargandoPuntos={catalogos.cargandoPuntos}
          onZonalesElegidas={(zonalesIds) => {
            void catalogos.cargarPuntosDeZonales(zonalesIds);
          }}
          // APORTE (Form 4 ECU / patrulla): quien aporta solo pone y quita personal de INSTRUCCIÓN;
          // ofrecerle candidatos de otras áreas sería ofrecerle un 409. El dueño ve todas las áreas.
          candidatos={
            agregandoAPatrulla || accesoDe(editando) !== "PROPIO"
              ? candidatos.filter((persona) => persona.area === "INSTRUCCION")
              : candidatos
          }
          cargandoPersonal={cargandoPersonal}
          onAgregarPersona={(persona) => void agregarPersona(persona)}
          onRetirarPersona={(funcionarioId) => void retirarPersona(funcionarioId)}
          // Fase C: cambiar el turno de un asignado se guarda al instante (PATCH), como asignar/retirar.
          onCambiarHorarioPersona={(funcionarioId, horaInicio, horaFin) =>
            void cambiarHorarioPersona(funcionarioId, horaInicio, horaFin)
          }
          // TRÁMITE DE INSPECCIÓN (2026-10-07): solo en la edición del operativo PROPIO (diferida),
          // donde se ajusta en el borrador y se aplica al «Guardar cambios». En el aporte no.
          onCambiarTramitePersona={
            edicionDiferida ? cambiarTramiteEnEdicion : undefined
          }
          // En el aporte, solo son retirables las personas que este departamento asignó (las de
          // Instrucción); las del dueño del formulario llegan en lectura. El servidor lo reafirma.
          puedeEditarPersona={(persona) =>
            accesoDe(editando) === "PROPIO" ||
            (user?.rolCodes ?? []).includes(persona.asignadoPorRol)
          }
          avisoPersonal={avisoPersonal}
          idPersonaRechazada={idPersonaRechazada}
          confirmacionPersonal={confirmacionPersonal}
          bloqueado={bloqueadoFila(editando) || consultaId === editando.id}
          // DIFERIDO (2026-10-01): en la edición propia el personal se aplica al «Guardar cambios»,
          // no al instante; se apaga el rótulo «Se guarda al instante» de la lista. En el aporte
          // (no diferido) sigue siendo inmediato.
          personalInmediato={!edicionDiferida}
          // PATRULLA: «Agregar Personal» abre en solo-personal; «Editar» de generales bloquea el
          // personal (se gestiona con las acciones fusionadas), pero deja los generales editables.
          soloPersonal={agregandoAPatrulla || accesoDe(editando) !== "PROPIO"}
          personalBloqueado={
            !agregandoAPatrulla && Boolean(editando.grupoRegistro)
          }
          // ROSTER: al editar una patrulla propia, el personal se gestiona con el roster (cambiar
          // inspector conservando el código + agregar persona), no con el bloque de personal.
          miembrosPatrulla={editandoPatrulla ? miembrosPatrulla : undefined}
          onCambiarPersonaPatrulla={(operativoId, funcionarioId) =>
            void reemplazarPersonaPatrulla(operativoId, funcionarioId)
          }
          onQuitarMiembroPatrulla={(operativo) => setPorRetirar(operativo)}
          onAgregarMiembroPatrulla={(funcionarioId) =>
            void agregarMiembroPatrulla(funcionarioId)
          }
          guardando={procesando}
          onGuardar={guardarEdicion}
        />
      )}

      <PanelOperativos
        onVerOperativo={verOperativoPorId}
        titulo="Operativos registrados"
        cabecera={
          <span className="badge badge-ghost badge-sm">
            {cargando
              ? "Cargando…"
              : tabla.filtrando
                ? `${tabla.coincidentes.length} de ${operativos.length} registros`
                : `${operativos.length} ${operativos.length === 1 ? "registro" : "registros"}`}
          </span>
        }
        tabla={tabla}
        columnas={COLUMNAS_LISTADO}
        // Con varios días (2026-10-13), una fila de cabecera por fecha en lugar de la columna.
        agruparPorFecha={!unDia}
        mensajeVacio={
          cargando ? (
            "Cargando operativos…"
          ) : tabla.filtrando ? (
            // Caso 4 del plan: el filtro no encontró nada, y se ofrece la salida.
            <span className="flex flex-col items-center gap-2">
              Ningún operativo coincide con el filtro.
              <Boton variante="enlace" tamano="sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            </span>
          ) : (
            // Caso 5: no hay nada que filtrar, hay que registrar. Con varios días, el rango.
            unDia
              ? "No hay operativos registrados en esta fecha. Regístrelos desde «Registro de operativo»."
              : "No hay operativos en ese rango."
          )
        }
        acciones={accionesDeFila}
        accionesFilaPatrulla={accionesDeFilaPatrulla}
        pie={
          !unDia && (
            <p className="px-2 text-right text-xs text-app-muted">
              Ordenado por fecha (más reciente primero)
            </p>
          )
        }
        porRetirar={porRetirar}
        onConfirmarRetiro={confirmarRetiro}
        onCancelarRetiro={() => setPorRetirar(null)}
      />

      <p className="text-xs text-app-muted">
        La Matriz Consolidada del Día es exclusiva de la Dirección. Esta pantalla
        muestra únicamente los operativos de sus formularios.
      </p>

      {/* Transporte requerido (2026-10-07): liberar el transporte al cambiar el tipo. */}
      {modalLiberacion}
    </section>
  );
};

export default MisOperativosPage;
