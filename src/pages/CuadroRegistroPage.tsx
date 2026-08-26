/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: CuadroRegistroPage.tsx
 * Responsabilidad: Pantalla P-01. Registrar un operativo y ver el resultado inmediato.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRES COSAS PUEDEN BLOQUEAR LA CAPTURA, Y CADA UNA SE EXPLICA DISTINTO:
 *
 *   · **No hay jornada abierta.** No es un error: nadie ha abierto el cuadro del día.
 *     Aviso informativo, no rojo.
 *   · **La ventana de carga venció** (RN-56). Aviso con la hora, y los campos
 *     deshabilitados: es el caso 9 del plan.
 *   · **El cuadro está cerrado** (RN-58). Lo dice el propio cuadro en `admiteEscritura`.
 *
 * Ninguno se descubre al guardar. Capturar un operativo completo para recibir un `423`
 * es exactamente lo que hace que la gente vuelva al WhatsApp.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LO CAPTURADO NUNCA SE PIERDE. Un `409` de las reglas de descanso muestra el motivo del
 * servidor y deja el formulario intacto: la persona rechazada no entra, y todo lo demás
 * sigue escrito.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormikHelpers } from "formik";

import CamposCalculados from "../components/cuadro/CamposCalculados.tsx";
import FormularioOperativo from "../components/cuadro/FormularioOperativo.tsx";
import SelectorFormulario from "../components/cuadro/SelectorFormulario.tsx";
import {
  OPCION_ADICIONALES,
  type ValoresOperativo,
} from "../utils/valoresOperativo.util.ts";
import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";
import TablaOperativos from "../components/cuadro/TablaOperativos.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import { useCuadroDiario } from "../hooks/useCuadroDiario.ts";
import { useFormulariosPermitidos } from "../hooks/useFormulariosPermitidos.ts";
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
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import {
  fechaDeJornadaPorDefecto,
  laJornadaSeAbriraSola,
} from "../utils/jornada.util.ts";

/**
 * Códigos con los que el servidor rechaza a UNA PERSONA, no al operativo.
 *
 * Son los ocho de composición y descanso de `codigos-error.ts`. Se distinguen por el
 * código y no por el texto: interpretar cadenas de mensaje sería frágil y el propio
 * manual de estilo del proyecto lo desaconseja.
 */
const RECHAZOS_DE_PERSONAL = [
  "PERSONA_NO_DISPONIBLE",
  "CONTRATO_NO_ADMITE_TURNO",
  "PATRULLA_CONSECUTIVA",
  "TOPE_SALIDAS_PESADAS",
  "SOLAPAMIENTO_HORARIO",
  "JORNADA_MAXIMA_SUPERADA",
  "CUPO_COMPARTIDO_SUPERADO",
  "AREA_NO_ADMITIDA",
];

const CuadroRegistroPage = () => {
  /** El antetítulo nombra al departamento dueño de estos formularios. */
  const { user } = useUser();

  /** Para llevar a P-02 el formulario al que este departamento solo aporta personal. */
  const navegar = useNavigate();

  /**
   * La jornada que se registra es la del **día siguiente**, y se puede cambiar.
   *
   * Hasta el 2026-08-11 esta pantalla fijaba la fecha de HOY, sin selector, así que
   * pedía una jornada que nadie abre: el administrador abre la del día siguiente. El
   * resultado era el aviso «no hay una jornada abierta» con la fecha equivocada, y sin
   * forma de corregirlo desde la interfaz. La regla y por qué se propone en vez de
   * imponerse están en `jornada.util.ts`.
   */
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

  const {
    cuadro,
    cargando: cargandoCuadro,
    puedeEscribir,
    sinJornada,
    recargar: recargarCuadro,
  } = useCuadroDiario(fecha);

  /**
   * REGLA DEL 2026-08-11. Una jornada que todavía no existe **ya no bloquea**: el primer
   * registro la abre. Antes `sinJornada` deshabilitaba el formulario, así que el
   * registro que debía abrirla era justamente el que no se podía hacer.
   */
  const jornadaPorAbrir = sinJornada && laJornadaSeAbriraSola(fecha);
  // La ventana del rol de carga bajo el que se registra, no la del primero de la lista de
  // quien entra. Ver `useVentanaCarga`.
  const ventana = useVentanaCarga(ROLES_DE_CARGA);
  const { formularios, cargando: cargandoFormularios } =
    useFormulariosPermitidos();

  const [codigoElegido, setCodigoElegido] = useState<string | null>(null);
  const catalogos = useCatalogosFormulario(codigoElegido);

  /**
   * Horario capturado, para pedir el personal elegible con él.
   *
   * CORREGIDO EL 2026-08-11. La lista se pedía sin horario, así que el servidor solo
   * podía descartar por área y por ausencia: ofrecía a personas ya ocupadas en otro
   * operativo del mismo día y el cruce no aparecía hasta intentar asignarlas, cuando el
   * operativo ya estaba creado. Con el horario, `GET /personal/elegible` aplica las seis
   * reglas de descanso y **quien se cruza deja de ofrecerse**.
   *
   * Las dos horas van juntas o no van: el servidor rechaza media pareja, y con una sola
   * no se puede formar el rango.
   */
  const [horario, setHorario] = useState({ inicio: "", fin: "" });

  /**
   * Formulario y fecha de la última consulta. Distingue recargar de cambiar de población.
   *
   * Va la FECHA además del formulario porque las ausencias dependen del día: la
   * referencia sin horario de un día no sirve para contar los ocultos de otro.
   */
  const consultaAnterior = useRef<string | null>(null);

  const [candidatos, setCandidatos] = useState<PersonaElegible[]>([]);
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  const [personalAgregado, setPersonalAgregado] = useState<PersonaAgregada[]>(
    [],
  );
  const [avisoPersonal, setAvisoPersonal] = useState<string | null>(null);

  const [registrados, setRegistrados] = useState<Operativo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [avisoGeneral, setAvisoGeneral] = useState<{
    texto: string;
    clase: string;
  } | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const formularioElegido = useMemo(
    () => formularios.find((formulario) => formulario.codigo === codigoElegido),
    [formularios, codigoElegido],
  );

  /** El primero propio se elige solo: ahorra un clic en el noventa por ciento de los días. */
  useEffect(() => {
    if (codigoElegido || formularios.length === 0) return;

    const primero = formularios.find(
      (formulario) => formulario.acceso === "ESCRITURA",
    );
    if (primero) setCodigoElegido(primero.codigo);
  }, [formularios, codigoElegido]);

  /**
   * El personal elegible depende del formulario, de la fecha **y del horario**.
   *
   * ═══════════════════════════════════════════════════════════════════════════════
   * RECARGA SILENCIOSA AL CAMBIAR EL HORARIO. Es uno de los estados obligatorios de
   * FASE5 §8, y esta pantalla no lo implementaba: toda consulta vaciaba la lista y
   * mostraba «Consultando…». Como el horario se elige en dos desplegables, capturar un
   * operativo hacía parpadear la lista dos veces —una al fijar la hora de inicio y otra
   * al fijar la de fin—, y el parpadeo se confundía con un fallo.
   *
   * Cambiar de FORMULARIO sí vacía: es otra población, y dejar los de antes en pantalla
   * permitiría agregar a alguien que ya no corresponde a ese formulario.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  useEffect(() => {
    if (!codigoElegido) {
      setCandidatos([]);
      consultaAnterior.current = null;
      return;
    }

    let vigente = true;

    const clave = `${codigoElegido}|${fecha}`;
    const cambioDePoblacion = consultaAnterior.current !== clave;
    consultaAnterior.current = clave;

    if (cambioDePoblacion) {
      setCandidatos([]);
      setCargandoPersonal(true);
    }

    const conHorario = Boolean(horario.inicio) && Boolean(horario.fin);

    PersonalService.consultarElegibles({
      formulario: codigoElegido,
      inicio: fecha,
      ...(conHorario
        ? { horaInicio: horario.inicio, horaFin: horario.fin }
        : {}),
    })
      .then((personas) => {
        if (!vigente) return;

        setCandidatos(personas);
      })
      .catch((fallo: unknown) => {
        if (vigente) setCandidatos([]);
        if (vigente) {
          const error = presentarError(fallo);
          setAvisoGeneral({
            texto: error.mensaje,
            clase: claseDeAviso(error.trato),
          });
        }
      })
      .finally(() => {
        if (vigente) setCargandoPersonal(false);
      });

    return () => {
      vigente = false;
    };
  }, [codigoElegido, fecha, horario.inicio, horario.fin]);

  const bloqueado =
    cargandoCuadro ||
    !ventana.puedeEscribir ||
    (!puedeEscribir && !jornadaPorAbrir);

  const agregarPersona = useCallback((persona: PersonaElegible) => {
    setAvisoPersonal(null);
    setPersonalAgregado((actuales) => [
      ...actuales,
      {
        funcionarioId: persona.id,
        nombre: nombreDePersona(persona),
        // El teléfono lo resuelve el servidor al asignar (RN-34): aquí todavía no se
        // conoce, y **no se inventa**.
        telefono: null,
      },
    ]);
  }, []);

  const retirarPersona = useCallback((funcionarioId: number) => {
    setPersonalAgregado((actuales) =>
      actuales.filter((persona) => persona.funcionarioId !== funcionarioId),
    );
  }, []);

  /**
   * Cambiar de jornada vacía lo capturado y lo ya registrado.
   *
   * Las dos cosas pertenecen a un día concreto: el personal se evaluó contra las reglas
   * de descanso de esa fecha, y arrastrarlo al día siguiente ofrecería para el jueves a
   * quien se declaró elegible para el miércoles. El listado de registrados es de la
   * jornada que se acaba de abandonar, y dejarlo en pantalla haría creer que pertenece
   * a la nueva.
   */
  const cambiarJornada = useCallback((nueva: string) => {
    setFecha(nueva);
    setPersonalAgregado([]);
    setRegistrados([]);
    setAvisoPersonal(null);
    setAvisoGeneral(null);
  }, []);

  const registrar = useCallback(
    async (
      valores: ValoresOperativo,
      ayudas: FormikHelpers<ValoresOperativo>,
    ) => {
      setGuardando(true);
      setAvisoGeneral(null);
      setAvisoPersonal(null);

      try {
        const operativo = await OperativoService.registrar({
          cuadroFecha: fecha,
          formularioCodigo: valores.formularioCodigo,
          horaInicio: valores.horaInicio,
          horaFin: valores.horaFin,
          zonalesIds: valores.zonalId === "" ? [] : [valores.zonalId],
          puntoEncuentroId:
            valores.punto === OPCION_ADICIONALES
              ? undefined
              : Number(valores.punto),
          puntoLibre:
            valores.punto === OPCION_ADICIONALES
              ? valores.puntoLibre
              : undefined,
          tipoControlId:
            valores.tipoControl === OPCION_ADICIONALES
              ? undefined
              : Number(valores.tipoControl),
          tipoLibre:
            valores.tipoControl === OPCION_ADICIONALES
              ? valores.tipoLibre
              : undefined,
          institucionesIds: valores.institucionesIds,
          // TODO O NADA, desde el 2026-08-11. El personal viaja con el operativo y el
          // servidor los guarda en una sola transacción. Antes se creaba el operativo y
          // se asignaba después, una petición por persona, capturando el rechazo de cada
          // una: al rechazarse alguien quedaba un operativo vacío en el cuadro y el
          // formulario se limpiaba igual, así que no había forma de corregir a esa
          // persona sin volver a teclear todo.
          personalIds: personalAgregado.map(
            (persona) => persona.funcionarioId,
          ),
          observaciones: valores.observaciones || undefined,
        });

        const ultimo = operativo;
        setRegistrados((actuales) => [ultimo, ...actuales]);

        // Si este registro abrió la jornada, se dice y se relee la cabecera: el estado y
        // la orden de trabajo los compone el servidor, y componerlos aquí duplicaría un
        // formato que no es nuestro. `jornadaPorAbrir` se evaluó antes de guardar, así
        // que sigue describiendo cómo estaba la jornada al empezar.
        if (jornadaPorAbrir) {
          setExito(
            `Operativo ${ultimo.identificador} registrado. Se abrió la jornada del ${fecha}.`,
          );
          recargarCuadro();
        } else {
          setExito(`Operativo ${ultimo.identificador} registrado.`);
        }

        // Se limpia todo **salvo el formulario elegido**: quien registra suele encadenar
        // varios del mismo. Volver a elegirlo cada vez cuesta un clic por operativo.
        ayudas.resetForm();
        setPersonalAgregado([]);
        catalogos.limpiarPuntos();
        // El horario vive fuera de Formik —lo necesita la consulta de personal—, así que
        // `resetForm` no lo alcanza. Sin esto los desplegables quedaban vacíos y la lista
        // seguía filtrada por el horario del operativo anterior, contando como ocultas a
        // personas descartadas por unas horas que ya no se veían en pantalla.
        setHorario({ inicio: "", fin: "" });
      } catch (fallo: unknown) {
        const error = presentarError(fallo);

        // El motivo se muestra JUNTO AL SELECTOR DE PERSONAL cuando el rechazo es de una
        // persona: es ahí donde hay que corregirlo, y un aviso en la cabecera obliga a
        // buscar a qué campo se refiere. Los demás fallos siguen arriba.
        if (RECHAZOS_DE_PERSONAL.includes(error.codigo)) {
          setAvisoPersonal(error.mensaje);
        } else {
          setAvisoGeneral({
            texto: error.mensaje,
            clase: claseDeAviso(error.trato),
          });
        }
        // `conservaCaptura` es cierto en todos los casos: no se limpia nada, ni el
        // personal agregado. Quien captura retira a la persona rechazada, elige otra y
        // reintenta sin volver a teclear el operativo.
      } finally {
        setGuardando(false);
      }
    },
    [fecha, personalAgregado, catalogos, jornadaPorAbrir, recargarCuadro],
  );

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          {user?.rolName ?? "Departamento"}
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
          Registro de operativo
        </h1>
        <CamposCalculados
          cuadro={cuadro}
          cargando={cargandoCuadro}
        />

        {/* La fecha se propone —la del día siguiente— y se dice que se propone: quien
            arma el cuadro debe poder ver de qué jornada está hablando sin deducirlo. */}
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

      {/* Se dice ANTES de capturar, no al guardar: que la jornada nazca de un registro
          es un hecho con consecuencias —la matriz del día sale de ahí— y quien lo
          provoca debe saberlo de antemano. */}
      {jornadaPorAbrir && (
        <div
          className="alert alert-info"
          role="status"
        >
          <span>
            La jornada del {fecha} todavía no está abierta. Se abrirá sola al
            registrar el primer operativo.
          </span>
        </div>
      )}

      {sinJornada && !jornadaPorAbrir && (
        <div
          className="alert alert-warning"
          role="status"
        >
          <span>
            La jornada del {fecha} ya pasó y no puede abrirse. El cuadro se arma
            para el día siguiente.
          </span>
        </div>
      )}

      {/* Caso 9 del plan: la ventana cerrada se avisa ANTES de capturar, con su hora. */}
      {!ventana.cargando && !ventana.puedeEscribir && (
        <div className="alert alert-info">
          <span>
            {ventana.mensaje}
            {ventana.horaCierre && ` Su ventana cierra a las ${ventana.horaCierre}.`}
          </span>
        </div>
      )}

      {/*
        Y CON LA VENTANA ABIERTA, CUÁNTO QUEDA. Es la pantalla donde más importa: aquí se
        captura un operativo entero, y empezarlo a las 14H55 termina en un `423` al
        guardar con todo escrito.
      */}
      {!ventana.cargando && <AvisoVentana cuentaAtras={ventana.cuentaAtras} />}

      {cuadro && !cuadro.admiteEscritura && (
        <div className="alert alert-warning">
          <span>
            El cuadro del {cuadro.fecha} fue cerrado por la Dirección y no admite
            modificaciones.
          </span>
        </div>
      )}

      {avisoGeneral && (
        <div
          className={`alert ${avisoGeneral.clase}`}
          role="alert"
        >
          <span>{avisoGeneral.texto}</span>
        </div>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Formulario
          </h2>
        </div>

        <div className="app-data-panel-body flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6">
          {cargandoFormularios ? (
            <span className="badge badge-ghost badge-sm">
              Cargando formularios…
            </span>
          ) : (
            <SelectorFormulario
              formularios={formularios}
              seleccionado={codigoElegido}
              onSeleccionar={setCodigoElegido}
              /*
                ═══════════════════════════════════════════════════════════════════
                UN FORMULARIO COMPARTIDO NO SE REGISTRA AQUÍ: SE LLEVA A DONDE SÍ SIRVE.

                El departamento que aporta personal —el DMIT en los formularios 4 y 6— no
                puede crear operativos: el servidor responde 403. Pero el formulario **sí
                es suyo para una cosa**, poner a su gente, y eso ocurre sobre un operativo
                que ya existe, en P-02.

                Se navega con el formulario ya filtrado para que no tenga que buscarlo
                entre los del día. Antes el botón salía apagado y dejaba constancia y nada
                más: quien necesitaba asignar tenía que adivinar en qué pantalla hacerlo.
                ═══════════════════════════════════════════════════════════════════
              */
              onAportar={(codigo) =>
                navegar(
                  "/cuadro/mis-operativos?formulario=" + encodeURIComponent(codigo),
                )
              }
              deshabilitado={bloqueado}
            />
          )}

          {formularioElegido && (
            <>
              {/* Caso 2 del plan: la barra toma el color que entrega el servidor. */}
              <div
                aria-hidden="true"
                className="h-1.5 w-full rounded"
                style={{ backgroundColor: formularioElegido.colorFondo }}
              />

              {/* Caso 6 del plan: el aviso del condicionante nocturno. */}
              {formularioElegido.condicionanteNocturno && (
                <p className="text-xs text-base-content/70">
                  Este formulario exige conductor obligatorio si el horario entra
                  en la franja nocturna. La DAF lo asignará antes del cierre.
                </p>
              )}

              <FormularioOperativo
                formularioCodigo={formularioElegido.codigo}
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
                onHorarioElegido={(inicio, fin) => setHorario({ inicio, fin })}
                candidatos={candidatos}
                cargandoPersonal={cargandoPersonal}
                personalAgregado={personalAgregado}
                onAgregarPersona={agregarPersona}
                onRetirarPersona={retirarPersona}
                avisoPersonal={avisoPersonal}
                bloqueado={bloqueado}
                guardando={guardando}
                onGuardar={registrar}
              />
            </>
          )}
        </div>
      </div>

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Registrados en esta sesión
          </h2>
        </div>

        <div className="app-data-panel-body px-2 pb-4 pt-2 md:px-4">
          <TablaOperativos operativos={registrados} />
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

export default CuadroRegistroPage;
