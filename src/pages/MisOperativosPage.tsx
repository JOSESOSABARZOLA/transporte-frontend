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
import type { FormikHelpers, FormikProps } from "formik";

import CamposCalculados from "../components/cuadro/CamposCalculados.tsx";
import Iconos from "../components/common/Iconos.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import PanelAdicionalOperativo from "../components/cuadro/PanelAdicionalOperativo.tsx";
import PanelEdicionOperativo from "../components/cuadro/PanelEdicionOperativo.tsx";
import DrawerEdicionOperativo from "../components/cuadro/DrawerEdicionOperativo.tsx";
import type { MiembroPatrulla } from "../components/cuadro/RosterPatrulla.tsx";
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
import type { Operativo, PersonaAsignada } from "../interfaces/Operativo.ts";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../interfaces/Personal.ts";
import { turnoDePrimera } from "../utils/personal.util.ts";
import { OperativoService } from "../services/operativo.service.ts";
import { PersonalService } from "../services/personal.service.ts";
import {
  accesoAlOperativo,
  motivoDeSoloLectura,
  puedeAportarA,
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

/**
 * ¿El borrador de personal difiere del original del servidor? (2026-10-01). En la edición de un
 * operativo PROPIO el personal ya no se guarda al instante: se acumula en el borrador y se aplica
 * al pulsar «Guardar cambios». Esto mira si hay alta/baja o cambio de turno pendiente, para que el
 * pie diga «Cambios sin guardar» y el cierre pregunte antes de descartar.
 */
const hayCambiosDePersonal = (
  actual: PersonaAsignada[],
  original: PersonaAsignada[],
): boolean => {
  if (actual.length !== original.length) return true;
  const porId = new Map(original.map((persona) => [persona.funcionarioId, persona]));
  return actual.some((persona) => {
    const antes = porId.get(persona.funcionarioId);
    return (
      !antes ||
      antes.horaInicio !== persona.horaInicio ||
      antes.horaFin !== persona.horaFin
    );
  });
};

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
  // PATRULLA (2026-09-18): «Agregar Personal» abre el panel en modo solo-personal aunque el que
  // mira sea el registrante (que si no vería el editor de generales completo).
  const [agregandoAPatrulla, setAgregandoAPatrulla] = useState(false);
  // Cajón de edición (2026-09-30): ref al Formik para saber si hay GENERALES sin guardar (`dirty`)
  // y confirmar el descarte al cerrar. El personal ya se guardó al instante (no entra en `dirty`).
  const refFormikEdicion = useRef<FormikProps<ValoresOperativo>>(null);
  /**
   * EDICIÓN DIFERIDA (2026-10-01). El personal de un operativo PROPIO ya no se guarda al instante:
   * los cambios (alta/baja/turno) se acumulan en el borrador local —`editando.personal`— y se
   * aplican al pulsar «Guardar cambios». Aquí se guarda el personal ORIGINAL del servidor (al abrir
   * o recargar) para calcular el diff a aplicar y para saber si hay cambios pendientes.
   */
  const personalOriginalRef = useRef<PersonaAsignada[]>([]);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  // Fase D: indicador «Cambios sin guardar / Sin cambios» del pie del cajón (Formik `dirty`).
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
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
   * Sale de la edición. Con cambios sin guardar pregunta antes. Desde 2026-10-01, en la edición
   * DIFERIDA de un operativo propio los cambios de personal TAMPOCO están guardados, así que cuentan
   * junto a los generales (`dirty`). En el aporte el personal sí se guardó al instante y no cuenta.
   */
  const cerrarEdicion = useCallback(() => {
    const diferida =
      editando != null &&
      !agregandoAPatrulla &&
      !editando.formulario.esPatrulla &&
      accesoAlOperativo(editando, user?.rolCodes ?? []) === "PROPIO";
    const personalPendiente =
      diferida &&
      editando != null &&
      hayCambiosDePersonal(editando.personal, personalOriginalRef.current);
    if (refFormikEdicion.current?.dirty || personalPendiente) {
      setConfirmandoDescarte(true);
      return;
    }
    setEditando(null);
    setAgregandoAPatrulla(false);
    setConfirmacionPersonal(null);
  }, [editando, agregandoAPatrulla, user]);

  /** Descarta sin guardar los generales y cierra (el personal ya quedó guardado). */
  const descartarEdicion = useCallback(() => {
    setConfirmandoDescarte(false);
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
    const esAdicional = Boolean(creandoAdicional) && !editando;
    const conHorario =
      !esAdicional && Boolean(horario.inicio) && Boolean(horario.fin);

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
  }, [enPanel, editando, creandoAdicional, fecha, horario.inicio, horario.fin]);

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

  const guardarEdicion = useCallback(
    async (
      valores: ValoresOperativo,
      ayudas: FormikHelpers<ValoresOperativo>,
    ) => {
      if (!editando) return;

      setProcesando(true);
      setAviso(null);
      setConflictoEdicion(null);

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
        observacionesNuevas:
          valores.observaciones.length > 0 ? valores.observaciones : undefined,
      };

      try {
        // PATRULLA (2026-09-18): editar los generales los aplica a TODOS los códigos del lote.
        if (editando.grupoRegistro) {
          await OperativoService.editarPatrulla(
            editando.grupoRegistro,
            generales,
          );
          setExito("Patrulla actualizada en todos sus códigos.");
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

          let actual = editando;
          const aplicado = (operativoAlDia: Operativo) => {
            actual = operativoAlDia;
            versionVigente = operativoAlDia.version;
            // Lo ya aplicado se consolida: la fila de la tabla y el «original» del borrador avanzan,
            // así un reintento tras un fallo no vuelve a aplicar lo que ya quedó guardado.
            personalOriginalRef.current = operativoAlDia.personal;
            empalmarEnLaLista(operativoAlDia);
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
              aplicado(
                await OperativoService.actualizarTurnoPersonal(
                  actual.id,
                  alta.funcionarioId,
                  { horaInicio: alta.horaInicio, horaFin: alta.horaFin },
                ),
              );
            }
            for (const turno of turnos) {
              aplicado(
                await OperativoService.actualizarTurnoPersonal(
                  actual.id,
                  turno.funcionarioId,
                  { horaInicio: turno.horaInicio, horaFin: turno.horaFin },
                ),
              );
            }
          } catch (falloPersonal: unknown) {
            // Se detiene y se avisa en el bloque de personal; los generales no se tocan (el `finally`
            // del `try` externo repone `procesando`). El cajón queda abierto con lo ya aplicado.
            setAvisoPersonal(presentarError(falloPersonal).mensaje);
            return;
          }
        }

        await OperativoService.editar(editando.id, {
          version: versionVigente,
          ...generales,
        });

        setExito(`Operativo ${editando.identificador} actualizado.`);
        setEditando(null);
        ayudas.resetForm();
        await cargar();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        // `conservaCaptura`: el panel sigue abierto con lo escrito. Un 409 de bloqueo optimista se
        // resuelve recargando, así que su aviso va DENTRO del cajón, con «Recargar datos» (Fase D),
        // donde está mirando quien acaba de pulsar. El resto de errores siguen en el aviso de arriba.
        if (error.estado === 409) {
          setConflictoEdicion(error.mensaje);
        } else {
          setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
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
    ],
  );

  // «Agregar Personal» a una patrulla: abre el panel en modo solo-personal sobre un miembro del
  // grupo. El servidor adopta el `grupoRegistro`. 2026-09-18.
  const abrirAgregarPatrulla = useCallback((operativo: Operativo) => {
    setEditando(operativo);
    setAgregandoAPatrulla(true);
  }, []);

  // Acciones FUSIONADAS de la patrulla (Form 5/6). Un solo «Editar» (los generales, solo el
  // registrante) + un solo «Agregar Personal»; el «Eliminar» va por persona. 2026-09-18.
  const accionesDePatrulla = (grupo: Operativo[]) => {
    const cabeza = grupo[0];
    const esRegistrante = accesoDe(cabeza) === "PROPIO";
    // «Agregar Personal» es el APORTE de Instrucción: solo se ofrece a quien aporta a este
    // formulario —en el Form 6, el DMIT de Instrucción—, no al dueño, que registra a los suyos al
    // crear la patrulla. Espejo de `reglaCupoCompartido` del servidor. 2026-09-18.
    const puedeAgregarPersonal = puedeAportarA(cabeza, user?.rolCodes ?? []);
    const motivoBloqueo = bloqueado
      ? "La ventana de carga está cerrada o el cuadro fue cerrado."
      : undefined;
    return (
      <div className="flex flex-col items-start gap-1">
        {esRegistrante && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              setAgregandoAPatrulla(false);
              setEditando(cabeza);
            }}
            disabled={bloqueado || procesando}
            title={motivoBloqueo}
          >
            Editar
          </button>
        )}
        {puedeAgregarPersonal && (
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => abrirAgregarPatrulla(cabeza)}
            disabled={bloqueado}
            title={motivoBloqueo}
          >
            Agregar Personal
          </button>
        )}
      </div>
    );
  };

  const accionDePersonaPatrulla = (operativo: Operativo) => {
    const acceso = accesoDe(operativo);
    const motivoAjeno = motivoDeSoloLectura(acceso, operativo.creadoPorRol);
    const impedido = bloqueado || procesando || motivoAjeno !== null;
    return (
      <button
        type="button"
        className="btn btn-ghost btn-xs text-error"
        onClick={() => setPorRetirar(operativo)}
        disabled={impedido}
        title={
          motivoAjeno ??
          (bloqueado
            ? "La ventana de carga está cerrada o el cuadro fue cerrado."
            : undefined)
        }
      >
        <Iconos nombre="eliminar" />
        Eliminar
      </button>
    );
  };

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

  /** Cierra el cajón del adicional y descarta lo capturado (aún no existía nada que guardar). */
  const cerrarAdicional = useCallback(() => {
    setCreandoAdicional(null);
    setPersonalAdicional([]);
  }, []);

  /**
   * Fija el horario propio de una persona del adicional (2026-09-08, RN-66). Obligatorio: el
   * adicional no tiene horario propio y el servidor toma su ventana de las de su gente.
   */
  const cambiarHorarioAdicional = useCallback(
    (funcionarioId: number, horaInicio: string, horaFin: string) => {
      setPersonalAdicional((actuales) =>
        actuales.map((persona) =>
          persona.funcionarioId === funcionarioId
            ? {
                ...persona,
                horaInicio: horaInicio || undefined,
                horaFin: horaFin || undefined,
              }
            : persona,
        ),
      );
    },
    [],
  );

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
            // RN-66: el adicional no manda su horario; el servidor lo deriva de las personas.
            zonalesIds: valores.zonalesIds,
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
            // Cada persona con su horario, OBLIGATORIO (RN-66): el servidor toma la ventana
            // del adicional de las de su gente.
            personal: personalAdicional.map((persona) => ({
              funcionarioId: persona.funcionarioId,
              horaInicio: persona.horaInicio || undefined,
              horaFin: persona.horaFin || undefined,
            })),
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
        setAvisoPersonal(presentarError(fallo).mensaje);
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
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [editando, agregandoAPatrulla, esEdicionDiferida, empalmarEnLaLista],
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
        const actualizado = await OperativoService.actualizarTurnoPersonal(
          editando.id,
          funcionarioId,
          { horaInicio, horaFin },
        );
        setEditando(actualizado);
        empalmarEnLaLista(actualizado);
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [editando, agregandoAPatrulla, esEdicionDiferida, empalmarEnLaLista],
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
      const error = presentarError(fallo);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
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
        setAvisoPersonal(presentarError(fallo).mensaje);
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
        setAvisoPersonal(presentarError(fallo).mensaje);
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
  // El pie y el cierre miran los generales (`dirty`) Y el personal pendiente.
  const hayCambiosPendientes = hayCambiosSinGuardar || personalSucio;

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
        <p className="page-heading-kicker font-semibold uppercase">
          {user?.rolName ?? "Departamento"}
        </p>
        <h1 className="page-heading-title">
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

      {/*
        Fase E · EL ADICIONAL VIVE EN EL MISMO CAJÓN QUE LA EDICIÓN. Antes era una tarjeta en línea
        que empujaba la tabla; ahora es un `DrawerLateral` con velo, foco atrapado y pie fijo, igual
        que «Editar». El título lo nombra («Nuevo operativo adicional») y el subtítulo dice de cuál
        nace. Cancelar/Registrar viven en el pie del cajón (form externo por `idForm`).
      */}
      <DrawerEdicionOperativo
        abierto={creandoAdicional !== null}
        titulo="Nuevo operativo adicional"
        subtitulo={
          creandoAdicional
            ? `Sobre ${creandoAdicional.identificador} · ${creandoAdicional.formulario.nombre}`
            : undefined
        }
        onCerrar={cerrarAdicional}
        pie={
          creandoAdicional ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={cerrarAdicional}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-adicional-operativo"
                className="btn btn-primary btn-sm"
                disabled={bloqueadoParaAdicional || procesando}
              >
                {procesando ? (
                  <>
                    <span
                      className="loading loading-spinner loading-sm"
                      aria-hidden="true"
                    />
                    Registrando…
                  </>
                ) : (
                  "Registrar adicional"
                )}
              </button>
            </div>
          ) : null
        }
      >
        {creandoAdicional && (
          <PanelAdicionalOperativo
            sinMarco
            enCajon
            idForm="form-adicional-operativo"
            ocultarAcciones
            bandejaSinTope
            origen={creandoAdicional}
            catalogos={catalogos.catalogos}
            puntos={catalogos.puntos}
            cargandoPuntos={catalogos.cargandoPuntos}
            onZonalesElegidas={(zonalesIds) => {
              void catalogos.cargarPuntosDeZonales(zonalesIds);
            }}
            candidatos={candidatos}
            cargandoPersonal={cargandoPersonal}
            personalAgregado={personalAdicional}
            // Sin llamada al servidor: el adicional todavía no existe. Entran con él.
            onAgregarPersona={(persona) =>
              setPersonalAdicional((actuales) =>
                actuales.some(
                  (agregada) => agregada.funcionarioId === persona.id,
                )
                  ? actuales
                  : [
                      ...actuales,
                      {
                        funcionarioId: persona.id,
                        nombre: nombreDePersona(persona),
                        // RN-34: el teléfono lo resuelve el servidor al asignar. Aquí
                        // todavía no se conoce, y **no se inventa**. Igual que en P-01.
                        telefono: null,
                        // DEFAULT-FROM-FIRST (RN-66): el horario arranca copiando el de la
                        // primera persona; la primera queda vacía y hay que llenarla.
                        ...turnoDePrimera(actuales),
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
            onCambiarHorarioPersona={cambiarHorarioAdicional}
            avisoPersonal={avisoPersonal}
            bloqueado={bloqueadoParaAdicional}
            ventanaCerrada={!ventana.puedeEscribir}
            guardando={procesando}
            onGuardar={guardarAdicional}
            onCancelar={cerrarAdicional}
          />
        )}
      </DrawerEdicionOperativo>

      <DrawerEdicionOperativo
        abierto={editando !== null}
        titulo={
          editando
            ? `${
                agregandoAPatrulla || accesoDe(editando) !== "PROPIO"
                  ? "Personal de"
                  : "Editar"
              } ${
                // Fase E: una patrulla (Form 5/6) se nombra por su GRUPO, no por un identificador
                // suelto: editar sus generales los aplica a todo el lote. El resto, «operativo <id>».
                editando.grupoRegistro && editando.formulario.esPatrulla
                  ? `patrulla ${editando.grupoRegistro}`
                  : `operativo ${editando.identificador}`
              }`
            : ""
        }
        subtitulo={
          editando
            ? `${editando.formulario.nombre} · ${editando.horaInicio} a ${editando.horaFin}`
            : undefined
        }
        onCerrar={cerrarEdicion}
        pie={
          editando ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/*
                Fase D: indicador «Cambios sin guardar / Sin cambios» (Formik `dirty`). `role="status"`
                —no interrumpe— y en palabras (regla 6). Solo donde hay «Guardar cambios» (edición
                propia): en el aporte/patrulla el personal se guarda solo y no hay generales que guardar.
              */}
              {!(agregandoAPatrulla || accesoDe(editando) !== "PROPIO") && (
                <span
                  role="status"
                  className={`mr-auto text-xs ${
                    hayCambiosPendientes
                      ? "text-warning"
                      : "text-base-content/70"
                  }`}
                >
                  {hayCambiosPendientes
                    ? "Cambios sin guardar"
                    : "Sin cambios pendientes"}
                </span>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={cerrarEdicion}
                disabled={procesando}
              >
                Cancelar
              </button>
              {!(agregandoAPatrulla || accesoDe(editando) !== "PROPIO") && (
                <button
                  type="submit"
                  form="form-edicion-operativo"
                  className="btn btn-primary btn-sm"
                  disabled={bloqueado || procesando}
                >
                  {procesando ? (
                    <>
                      <span
                        className="loading loading-spinner loading-sm"
                        aria-hidden="true"
                      />
                      Guardando…
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </button>
              )}
            </div>
          ) : null
        }
      >
        {editando && (
          <div className="flex flex-col gap-4">
            {/*
              Fase D · VENTANA CERRADA CON EL CAJÓN ABIERTO. El mismo bloqueo que apaga «Guardar
              cambios» (RN-56/RN-58) se dice también aquí dentro, donde se está editando: sin esto, el
              botón apagado abajo no explicaría por qué. El personal sí se puede seguir tocando (se
              guarda al instante y su propia validación decide); lo que no se puede es guardar generales.
            */}
            {bloqueado &&
              !(agregandoAPatrulla || accesoDe(editando) !== "PROPIO") && (
                <div className="alert alert-info">
                  <span>
                    {cuadro && !cuadro.admiteEscritura
                      ? `El cuadro del ${cuadro.fecha} fue cerrado por la Dirección: puede consultarlo, pero no guardar cambios en sus datos.`
                      : `${ventana.mensaje} Los cambios de datos del operativo no pueden guardarse hasta que su ventana vuelva a abrirse.`}
                  </span>
                </div>
              )}

            {/*
              Fase D · CONFLICTO 409 (bloqueo optimista). Otro guardó el operativo entre que se abrió
              el cajón y se pulsó «Guardar»: el servidor lo rechaza para no pisar ese cambio. El mensaje
              va tal cual (regla 7) y «Recargar datos» trae la versión al día SIN cerrar el cajón. Lo
              capturado en los generales se conserva hasta recargar (conservaCaptura).
            */}
            {conflictoEdicion && (
              <div
                className="alert alert-error"
                role="alert"
              >
                <span>{conflictoEdicion}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={procesando}
                  onClick={() => void recargarEdicion()}
                >
                  <Iconos nombre="actualizar" />
                  Recargar datos
                </button>
              </div>
            )}

            <PanelEdicionOperativo
              sinMarco
              enCajon
              idForm="form-edicion-operativo"
              ocultarAcciones
              bandejaSinTope
              onCambiosSinGuardar={setHayCambiosSinGuardar}
              refFormik={refFormikEdicion}
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
          // En el aporte, solo son retirables las personas que este departamento asignó (las de
          // Instrucción); las del dueño del formulario llegan en lectura. El servidor lo reafirma.
          puedeEditarPersona={(persona) =>
            accesoDe(editando) === "PROPIO" ||
            (user?.rolCodes ?? []).includes(persona.asignadoPorRol)
          }
          avisoPersonal={avisoPersonal}
          confirmacionPersonal={confirmacionPersonal}
          bloqueado={bloqueado}
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
          onCancelar={cerrarEdicion}
            />
          </div>
        )}
      </DrawerEdicionOperativo>

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
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
            // La patrulla (Form 5/6) usa acciones fusionadas; el resto, la de abajo por fila.
            accionesPatrulla={accionesDePatrulla}
            accionPersona={accionDePersonaPatrulla}
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
                {/*
                  LA ACCIÓN DE APORTE SE DESTACA, LA DE EDICIÓN NO. 2026-08-31.

                  Los tres botones de esta fila eran `btn-ghost btn-xs` y se leían como
                  una sola masa gris. Para el departamento que APORTA —el DMIT en los
                  formularios 4 y 6— «Agregar Personal» es lo único que puede hacer aquí,
                  así que pasa a `btn-primary`; para el dueño, «Editar» convive con
                  «Adicional» y «Eliminar» y destacarlo no ayudaría a elegir.

                  Las dos clases están en el inventario de FASE5 §2.2. No se introduce
                  ninguna nueva (regla 1).
                */}
                <button
                  type="button"
                  className={
                    esPropio ? "btn btn-ghost btn-xs" : "btn btn-primary btn-xs"
                  }
                  onClick={() => setEditando(operativo)}
                  disabled={bloqueado || procesando}
                  title={
                    bloqueado
                      ? "La ventana de carga está cerrada o el cuadro fue cerrado."
                      : (motivoAjeno ?? undefined)
                  }
                >
                  {esPropio ? "Editar" : "Agregar Personal"}
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
                  formulario admite adicionales si tiene un prefijo marcado para ellos —el
                  **2 · PMO** con `OCAPMO`, y desde el 2026-09-08 el **8 · INSPECCIONES** con
                  `IGA`/`ITA`—. Se lee de `admiteAdicionales`, no de un código quemado.
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
                  {/*
                    EL ICONO ACOMPAÑA, NO SUSTITUYE (regla 13). El rótulo se queda: un
                    botón que solo fuera un dibujo obligaría a adivinar, y en la fila de
                    al lado «Editar» y «Adicional» son palabras.

                    SIN `aria-label` y sin color propio: FontAwesome ya pone
                    `aria-hidden`, y el rojo lo pone `text-error` del botón, que el icono
                    hereda por `currentColor`.
                  */}
                  <Iconos nombre="eliminar" />
                  Eliminar
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
        titulo="¿Eliminar este operativo?"
        mensaje={porRetirar ? descripcionDelRetiro(porRetirar) : ""}
        textoSi="Sí, eliminar"
        textoNo="Cancelar"
        procesando={procesando}
        onConfirmar={() => void confirmarRetiro()}
        onCancelar={() => setPorRetirar(null)}
      />

      {/*
        Descartar la edición con cambios sin guardar. En la edición DIFERIDA (operativo propio) el
        personal tampoco está guardado y también se pierde; en la patrulla el personal se gestiona
        al instante con el roster, así que ahí sí quedó guardado.
      */}
      <ModalConfirmacion
        abierto={confirmandoDescarte}
        titulo="Descartar cambios"
        mensaje={
          edicionDiferida
            ? "¿Descartar los cambios? Se perderán los cambios en el personal asignado y en los datos del operativo (punto de encuentro, zonales, instituciones, tipo de control y observaciones nuevas). Nada se ha guardado todavía."
            : "¿Descartar los cambios de datos del operativo? Se perderán los cambios en punto de encuentro, zonales, instituciones, tipo de control y las observaciones nuevas. El personal ya quedó guardado."
        }
        textoSi="Descartar"
        textoNo="Seguir editando"
        onConfirmar={descartarEdicion}
        onCancelar={() => setConfirmandoDescarte(false)}
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
