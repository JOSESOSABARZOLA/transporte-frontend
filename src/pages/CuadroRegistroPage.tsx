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
import { Link } from "react-router-dom";
import type { FormikHelpers, FormikProps } from "formik";

import CamposCalculados from "../components/cuadro/CamposCalculados.tsx";
import FormularioOperativo from "../components/cuadro/FormularioOperativo.tsx";
import PanelEdicionOperativo from "../components/cuadro/PanelEdicionOperativo.tsx";
import RosterPatrulla, {
  type MiembroPatrulla,
} from "../components/cuadro/RosterPatrulla.tsx";
import SelectorFormulario from "../components/cuadro/SelectorFormulario.tsx";
import {
  comoValoresDeFormulario,
  OPCION_ADICIONALES,
  OPCION_PUNTO_NUEVO,
  VALORES_INICIALES,
  type ValoresOperativo,
} from "../utils/valoresOperativo.util.ts";
import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";
import TablaOperativos from "../components/cuadro/TablaOperativos.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import Iconos from "../components/common/Iconos.tsx";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import { useCuadroDiario } from "../hooks/useCuadroDiario.ts";
import { useFormulariosPermitidos } from "../hooks/useFormulariosPermitidos.ts";
import { useUser } from "../hooks/useUser.ts";
import {
  esBorradorVacio,
  guardarBorrador,
  guardarPuntero,
  leerBorrador,
  leerPuntero,
  limpiarBorrador,
} from "../utils/borradorOperativo.util.ts";
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
  puedeAportarA,
} from "../utils/accesoOperativo.util.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { descripcionDelRetiro } from "../utils/listadoOperativos.util.ts";
import { NOMBRE_DIRECCION, turnoDePrimera } from "../utils/personal.util.ts";
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

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * LO QUE SE ESTÁ CAPTURANDO SE CONSERVA AL SALIR Y VOLVER. 2026-09-04.
   *
   * React Router desmonta esta página al navegar a otra —«Jornada del día», por ejemplo—
   * y su estado se perdía: al volver, el formulario aparecía vacío. Es «LO CAPTURADO
   * NUNCA SE PIERDE» (regla 15, principio 2 de PRODUCT.md), que aquí no se cumplía.
   *
   * Se lee UNA VEZ, en el inicializador perezoso de `useState`, y con eso se siembran los
   * estados de abajo. Sembrar en el inicializador —no en un efecto— evita el parpadeo de
   * pintar vacío y luego rellenar, y evita pelearse con el efecto que autoselecciona el
   * primer formulario: éste ya encuentra `codigoElegido` puesto y no lo pisa.
   *
   * Ver `borradorOperativo.util.ts`: por qué `sessionStorage`, cuándo se borra, y la
   * cautela con los datos personales.
   *
   * SON DOS LECTURAS. El PUNTERO dice dónde iba el usuario —fecha y último formulario—; con
   * ese formulario se lee el BORRADOR de captura de ESE formulario y solo ése (2026-09-10).
   * Cada formulario guarda lo suyo, así que al montar solo se restaura el que estaba abierto.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [punteroGuardado] = useState(() =>
    user ? leerPuntero(user.userid) : null,
  );
  const [borradorGuardado] = useState(() =>
    user && punteroGuardado?.codigoElegido
      ? leerBorrador(
          user.userid,
          punteroGuardado.codigoElegido,
          punteroGuardado.fecha,
        )
      : null,
  );

  /**
   * La jornada que se registra es la del **día siguiente**, y se puede cambiar.
   *
   * Hasta el 2026-08-11 esta pantalla fijaba la fecha de HOY, sin selector, así que
   * pedía una jornada que nadie abre: el administrador abre la del día siguiente. El
   * resultado era el aviso «no hay una jornada abierta» con la fecha equivocada, y sin
   * forma de corregirlo desde la interfaz. La regla y por qué se propone en vez de
   * imponerse están en `jornada.util.ts`.
   */
  const [fecha, setFecha] = useState(
    () => punteroGuardado?.fecha ?? fechaDeJornadaPorDefecto(),
  );

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

  const [codigoElegido, setCodigoElegido] = useState<string | null>(
    () => punteroGuardado?.codigoElegido ?? null,
  );
  const catalogos = useCatalogosFormulario(codigoElegido);
  // Referencia estable de la carga de puntos: la usan `abrirEdicion` y la restauración
  // del borrador como dependencia, y el objeto `catalogos` cambia de identidad en cada
  // render, así que depender de él las recrearía sin necesidad.
  const { cargarPuntosDeZonales } = catalogos;

  /**
   * Formulario y fecha de la última consulta. Distingue recargar de cambiar de población.
   *
   * Va la FECHA además del formulario porque las ausencias dependen del día: la
   * referencia de un día no sirve para contar los ocultos de otro.
   *
   * DESDE RN-66 (2026-09-08) NO DEPENDE DEL HORARIO. El operativo ya no tiene un horario
   * propio con el que filtrar —cada persona lleva el suyo—, así que la lista se pide solo
   * por formulario y fecha: descarta por área y por ausencia, y el cruce por persona lo
   * valida el servidor al registrar, con su motivo. Antes se pedía con el horario del
   * operativo para aplicar las seis reglas de descanso desde el 2026-08-11.
   */
  const consultaAnterior = useRef<string | null>(null);

  /**
   * Lo mismo, para la tabla de operativos: distingue cambiar de formulario de recargarlo.
   *
   * VA SEPARADA DE `consultaAnterior` aunque la clave sea la misma. Se disparan por
   * motivos distintos, y compartirlas rompería una de las dos en silencio el día que
   * cambiaran sus dependencias.
   */
  const consultaDeOperativos = useRef<string | null>(null);

  const [candidatos, setCandidatos] = useState<PersonaElegible[]>([]);
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  /**
   * Fuerza recargar la lista de elegibles SIN cambiar de población (2026-09-25). El semáforo de
   * carga/fatiga lo calcula el servidor con lo que la persona lleva ese día; al registrar o
   * asignar personal, esa carga cambia, así que se vuelve a pedir la lista para que el semáforo
   * se actualice en el momento —antes solo se refrescaba al reabrir sesión—.
   */
  const [recargaPersonal, setRecargaPersonal] = useState(0);
  const refrescarElegibles = useCallback(
    () => setRecargaPersonal((valor) => valor + 1),
    [],
  );
  const [personalAgregado, setPersonalAgregado] = useState<PersonaAgregada[]>(
    () => borradorGuardado?.personal ?? [],
  );
  const [avisoPersonal, setAvisoPersonal] = useState<string | null>(null);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * QUE LA ASIGNACIÓN SE GUARDÓ, DICHO EN PALABRAS. 2026-09-01.
   *
   * En modo aporte cada persona es un `POST` inmediato, y hasta hoy el éxito **no decía
   * nada**: la persona aparecía en la bandeja y ya. Quien aporta a un formulario ajeno
   * —el DMIT en la ECU y en la 6— entra a esta pantalla a poner a una persona y se va;
   * no vuelve a comprobar, así que ése es el único momento en que puede saberlo. El
   * fallo sí hablaba, desde siempre, por `avisoPersonal`.
   *
   * VA APARTE DE `avisoPersonal` Y NO ES UN CAMPO CON TONO. Los dos pueden convivir con
   * sentido —«se agregó a X» seguido de «a Y no se le pudo, porque…»— y fundirlos en un
   * estado obligaría a elegir cuál se pierde. Se limpian juntos al empezar cada acción.
   *
   * NO APLICA AL ALTA: allí el personal viaja con el operativo al pulsar «Registrar», y
   * anunciar un guardado que todavía no ocurrió sería mentir sobre el estado del
   * servidor. Por eso lo fijan solo los dos manejadores de abajo.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [confirmacionPersonal, setConfirmacionPersonal] = useState<
    string | null
  >(null);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL MODO APORTE, desde el 2026-08-31. PER-06.
   *
   * Cuando el formulario elegido es de los que este departamento **aporta** —el DMIT en
   * los formularios 4 y 6—, esta pantalla deja de servir para registrar y pasa a servir
   * para poner personal en lo que otro departamento ya registró.
   *
   * NO SE COMPRUEBA EL ROL, y es deliberado. Quién aporta y dónde lo dice
   * `t_formulario_rol`, y llega resuelto en `acceso`. Un `if (rol === DMIT_INSTRUCTOR)`
   * sería una segunda fuente de verdad sobre permisos que empezaría a divergir el día
   * que el negocio diera un cupo a otra dirección.
   * ═══════════════════════════════════════════════════════════════════════════════
   *
   * ═══════════════════════════════════════════════════════════════════════════════
   * Y DESDE EL 2026-09-01 POR LA TARDE ESTA LISTA ES LA ÚNICA, EN LOS DOS MODOS.
   *
   * Había dos: ésta, traída del servidor para el aporte, y `registrados`, memoria de la
   * sesión para el registro. Al pedirse que el registro también muestre lo que ya lleva
   * la jornada, la segunda dejó de tener contenido propio: sería un subconjunto de la
   * primera, mantenido a mano y capaz de contradecirla.
   *
   * QUIÉN PUEDE EDITAR CADA FILA YA NO ES OBVIO, y ése es el precio. Mientras la tabla
   * solo tuvo lo recién creado por quien miraba, la propiedad estaba garantizada; ahora
   * el formulario 4 trae también lo que registró el otro departamento que escribe en él,
   * y eso lo decide `accesoAlOperativo`, no la pantalla.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [operativosDelFormulario, setOperativosDelFormulario] = useState<
    Operativo[]
  >([]);
  const [cargandoOperativos, setCargandoOperativos] = useState(false);
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * UN SOLO ESTADO PARA LOS DOS MODOS DE ABRIR EL PANEL, Y NO DOS PARECIDOS.
   *
   * En modo aporte se abre para poner personal en un operativo ajeno (PER-06); desde el
   * 2026-09-01 se abre también para **corregir uno propio** recién registrado. Son la
   * misma pregunta —«qué operativo está abierto»— y separarlas en dos estados dejaría
   * abierto el caso de tener los dos a la vez, que no significa nada.
   *
   * Lo que cambia es `soloPersonal` y a dónde va `onGuardar`, y las dos cosas se derivan
   * de `esAporte`, que es un modo de la pantalla entera: no pueden contradecirse.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [enEdicion, setEnEdicion] = useState<Operativo | null>(null);
  // PATRULLA (2026-09-18): «Agregar Personal» abre el MISMO panel de aporte que el modo
  // compartido, aunque el que mira sea el registrante (que si no vería el formulario de edición).
  const [agregandoAPatrulla, setAgregandoAPatrulla] = useState(false);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL BORRADOR DE LA CAPTURA, GUARDADO MIENTRAS SE CORRIGE OTRA COSA. 2026-09-01.
   *
   * Desde hoy registrar y corregir ocupan **el mismo formulario**, así que los valores
   * del operativo que se edita caen sobre los campos donde alguien podía llevar medio
   * operativo tecleado. Sin esto, pulsar «Editar» borraría ese trabajo, y la cabecera
   * de este archivo promete lo contrario: «LO CAPTURADO NUNCA SE PIERDE».
   *
   * SE GUARDA SIEMPRE, ESTÉ VACÍO O NO. Comprobar si hay algo escrito para decidir si
   * merece la pena guardarlo añade una condición que puede equivocarse —¿cuenta el
   * formulario elegido?, ¿cuenta una hora suelta?— a cambio de no guardar un objeto
   * pequeño. Restaurar un borrador vacío deja el formulario vacío, que es lo correcto.
   *
   * VA EL PERSONAL TAMBIÉN. En alta el personal vive en `personalAgregado` y no se ha
   * enviado a ningún sitio; en edición lo sirve el operativo, porque allí cada persona
   * ya está guardada. Son dos orígenes distintos para el mismo hueco de la pantalla, y
   * el de la captura hay que apartarlo con los valores o se pierde igual.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [borrador, setBorrador] = useState<{
    valores: ValoresOperativo;
    personal: PersonaAgregada[];
  } | null>(
    // Un borrador restaurado entra por este mismo canal —es el `valoresIniciales` del
    // formulario en alta—. En edición no aplica: no se persiste una corrección.
    () =>
      borradorGuardado
        ? {
            valores: borradorGuardado.valores,
            personal: borradorGuardado.personal,
          }
        : null,
  );
  /** Para leer lo tecleado en el instante de cambiar de modo. Ver `refFormik`. */
  const formularioRef = useRef<FormikProps<ValoresOperativo> | null>(null);

  /**
   * Los últimos valores del formulario, reportados desde dentro de `<Formik>` (el
   * `innerRef` se limpia al desmontar, así que no sirve para guardar al salir). Es un
   * `ref` y no estado: cambia con cada tecla y no debe repintar la página.
   */
  const valoresActualesRef = useRef<ValoresOperativo | null>(
    borradorGuardado?.valores ?? null,
  );

  /**
   * EL FORMULARIO DUEÑO DE LO QUE HAY EN MEMORIA. 2026-09-10.
   *
   * `valoresActualesRef` y `personalAgregado` pertenecen a ESTE formulario. La referencia se
   * mueve SOLO en el efecto de cambio de formulario —después de guardar el saliente—, nunca
   * en el render: así `persistirBorrador` jamás escribe la captura de un formulario bajo la
   * clave de otro durante el instante en que se cambia de pestaña.
   */
  const codigoActivoRef = useRef<string | null>(
    punteroGuardado?.codigoElegido ?? null,
  );

  /**
   * La FECHA dueña de lo que hay en memoria (2026-09-21). Como el formulario, se mueve solo tras
   * guardar el saliente, para que cambiar «Fecha de la jornada» conserve la captura de cada día.
   */
  const fechaActivaRef = useRef<string>(
    punteroGuardado?.fecha ?? fechaDeJornadaPorDefecto(),
  );

  /** El operativo cuya baja está esperando confirmación. */
  const [porRetirar, setPorRetirar] = useState<Operativo | null>(null);
  const [guardando, setGuardando] = useState(false);
  /** Una edición o una baja en vuelo. Apaga las acciones para no repetirlas. */
  const [procesando, setProcesando] = useState(false);
  const [avisoGeneral, setAvisoGeneral] = useState<{
    texto: string;
    clase: string;
  } | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const formularioElegido = useMemo(
    () => formularios.find((formulario) => formulario.codigo === codigoElegido),
    [formularios, codigoElegido],
  );

  /** PER-06. Este departamento aporta personal al formulario elegido, no registra en él. */
  const esAporte = formularioElegido?.acceso === "COMPARTIDO";

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * LOS OPERATIVOS DEL FORMULARIO ELEGIDO, TRAÍDOS DEL SERVIDOR.
   *
   * SE PIDEN POR CÓDIGO Y NO SE FILTRAN EN MEMORIA. `GET /operativos?formulario=ECU`
   * acepta el código y aplica PER-02 del lado del servidor. Filtrar aquí contra el texto
   * visible es exactamente lo que dejaba la pantalla vacía en la patrulla 6.
   *
   * SE PIDE TAMBIÉN EN REGISTRO, Y NO SOLO EN APORTE, DESDE EL 2026-09-01 POR LA TARDE.
   *
   * Hasta entonces la tabla de abajo era memoria de la sesión: nacía vacía y solo crecía
   * con lo que se acababa de crear en esa pestaña. Recargar la página lo borraba, y quien
   * volvía tras el almuerzo registraba a ciegas, sin ver lo que ya llevaba el día. La
   * pregunta estaba planteada en el plan de esta pantalla —«¿memoria de la sesión, o que
   * sobreviva a una recarga?»— y el negocio la resolvió a favor de lo segundo.
   *
   * ES LA MISMA LLAMADA QUE YA HACÍA EL MODO APORTE. Lo único que cambió es que dejó de
   * condicionarse; el `catch`, la paginación y el criterio de pedir por código siguen
   * siendo los que ya estaban probados.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const cargarOperativosDelFormulario = useCallback(async () => {
    if (!formularioElegido) {
      setOperativosDelFormulario([]);
      consultaDeOperativos.current = null;
      return;
    }

    /*
      ═══════════════════════════════════════════════════════════════════════════════
      CAMBIAR DE FORMULARIO VACÍA LA TABLA; RECARGARLA NO. 2026-09-01, tarde.

      Son dos cosas distintas y la diferencia se ve en pantalla. Al pulsar otra pestaña
      la respuesta tarda, y sin esto la tabla sigue mostrando los operativos del
      formulario ANTERIOR bajo el rótulo del nuevo: quien mira lee «2 · PMO» sobre una
      fila `OCF-…` y da por buena una mezcla que no existe. En una pantalla cuyo valor es
      la ojeada rápida, eso es peor que una tabla vacía medio segundo.

      Recargar la misma población es otro caso: ocurre en cada persona que se asigna, y
      vaciar ahí haría parpadear la tabla entera a cada clic.

      MISMO CRITERIO Y MISMO MECANISMO QUE `candidatos`, unas líneas más arriba: una
      referencia con la clave de la última consulta —formulario **y** fecha—, porque los
      operativos de un día no son los de otro aunque el formulario no cambie.
      ═══════════════════════════════════════════════════════════════════════════════
    */
    const clave = `${formularioElegido.codigo}|${fecha}`;
    const cambioDePoblacion = consultaDeOperativos.current !== clave;
    consultaDeOperativos.current = clave;

    if (cambioDePoblacion) setOperativosDelFormulario([]);

    setCargandoOperativos(true);

    try {
      const respuesta = await OperativoService.consultar({
        fecha,
        formulario: formularioElegido.codigo,
        pagina: 1,
        tamanio: 100,
      });
      setOperativosDelFormulario(respuesta.datos);
    } catch {
      // Una jornada que nadie abrió no es una avería: es un día sin cuadro. Lo dice el
      // mensaje de la tabla vacía, no un banner rojo sobre la pantalla de captura.
      setOperativosDelFormulario([]);
    } finally {
      setCargandoOperativos(false);
    }
  }, [formularioElegido, fecha]);

  useEffect(() => {
    void cargarOperativosDelFormulario();
  }, [cargarOperativosDelFormulario]);

  /**
   * Cambiar de formulario cierra la corrección y descarta el borrador.
   *
   * Los dos pertenecen al formulario que se abandona. Con el formulario compartido desde
   * el 2026-09-01, dejar la corrección abierta pintaría los datos de un operativo de la
   * ECU bajo la pestaña de la patrulla 6; y devolver el borrador tampoco serviría,
   * porque su zonal, su punto y su personal son de la otra población.
   */
  useEffect(() => {
    if (!enEdicion || !codigoElegido) return;
    if (enEdicion.formulario.codigo === codigoElegido) return;

    setEnEdicion(null);
    setBorrador(null);
  }, [codigoElegido, enEdicion]);

  /**
   * Cambiar de formulario LIMPIA los avisos de error. 2026-09-10.
   *
   * `avisoGeneral` y `avisoPersonal` se fijan al fallar un envío y **persisten** hasta que se
   * los reemplaza. Sin esto, un error de un formulario —p. ej. «Indique el tipo de control» al
   * intentar registrar uno de tipo ÚNICO (1–4) sin elegir tipo— quedaba colgado sobre otro
   * formulario al cambiar de pestaña, y parecía un error del formulario nuevo (el 8, que sí
   * tenía su tipo elegido). El error pertenece al formulario que se abandona; se va con él.
   */
  useEffect(() => {
    setAvisoGeneral(null);
    setAvisoPersonal(null);
  }, [codigoElegido]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * CADA FORMULARIO GUARDA SU CAPTURA, Y NO VE LA DEL OTRO. 2026-09-10.
   *
   * Antes había un solo borrador por usuario: teclear en el 1 y cambiar al 8 mostraba en el
   * 8 lo del 1. Ahora el borrador es por (usuario, formulario). Al cambiar de pestaña:
   *   1. Se GUARDA lo capturado bajo el formulario que se abandona (o se retira si va vacío).
   *   2. Se CARGA —o se vacía— la captura del formulario que entra.
   *
   * `codigoActivoRef` se mueve aquí, tras guardar el saliente, para que `persistirBorrador`
   * nunca escriba en el formulario equivocado durante el cambio.
   *
   * NO GUARDA DURANTE UNA CORRECCIÓN (`enEdicion`): una corrección no se persiste. El
   * borrador de la captura sigue intacto bajo su clave desde antes de entrar a corregir, así
   * que se recupera solo al volver a su formulario. El efecto de arriba ya cerró la edición.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  useEffect(() => {
    const salienteCodigo = codigoActivoRef.current;
    const salienteFecha = fechaActivaRef.current;
    // Cambió el formulario O la fecha (2026-09-21): en ambos casos hay que guardar lo saliente
    // bajo SU clave y cargar lo del (formulario, fecha) entrante.
    if (salienteCodigo === codigoElegido && salienteFecha === fecha) return;

    if (user && salienteCodigo && !enEdicion) {
      const valores = valoresActualesRef.current;
      if (valores && !esBorradorVacio(valores, personalAgregado)) {
        guardarBorrador(user.userid, salienteCodigo, salienteFecha, {
          valores,
          personal: personalAgregado,
        });
      } else {
        limpiarBorrador(user.userid, salienteCodigo, salienteFecha);
      }
    }

    codigoActivoRef.current = codigoElegido;
    fechaActivaRef.current = fecha;

    const entrante =
      user && codigoElegido
        ? leerBorrador(user.userid, codigoElegido, fecha)
        : null;
    valoresActualesRef.current = entrante?.valores ?? null;
    setBorrador(
      entrante ? { valores: entrante.valores, personal: entrante.personal } : null,
    );
    setPersonalAgregado(entrante?.personal ?? []);

    // Los puntos de la zonal restaurada se piden a mano: la zonal llega en `valoresIniciales`
    // y eso NO dispara `onZonalesElegidas`, como en la restauración del montaje y en `abrirEdicion`.
    if (entrante && entrante.valores.zonalesIds.length > 0) {
      void cargarPuntosDeZonales(entrante.valores.zonalesIds);
    }
  }, [
    codigoElegido,
    fecha,
    user,
    enEdicion,
    personalAgregado,
    cargarPuntosDeZonales,
  ]);

  /**
   * El primero propio se elige solo: ahorra un clic en el noventa por ciento de los días.
   *
   * Y SI EL CÓDIGO RESTAURADO YA NO ES DE ESTE USUARIO, SE DESCARTA. Un borrador puede
   * traer un formulario que el rol ya no puede escribir —el permiso cambió entre sesiones—.
   * Se pone a `null` para que la autoselección elija uno válido, en lugar de dejar la
   * pantalla apuntando a un formulario que no existe para quien mira.
   */
  useEffect(() => {
    if (formularios.length === 0) return;

    if (codigoElegido) {
      const existe = formularios.some(
        (formulario) => formulario.codigo === codigoElegido,
      );
      if (!existe) setCodigoElegido(null);
      return;
    }

    const primero = formularios.find(
      (formulario) => formulario.acceso === "ESCRITURA",
    );
    if (primero) setCodigoElegido(primero.codigo);
  }, [formularios, codigoElegido]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * PERSISTIR LO QUE SE CAPTURA. 2026-09-04.
   *
   * Guarda el borrador en cada cambio, de modo que al salir ya está guardado y no hace
   * falta un guardado al desmontar —el `innerRef` de Formik se limpia entonces y no se
   * podrían leer los valores—.
   *
   * SOLO EN ALTA. Durante una corrección (`enEdicion`) el formulario visible es el del
   * operativo que se edita, no la captura; la captura está a salvo en `borrador`. Persistir
   * una edición a medias no es lo que se pidió.
   *
   * NO PERSISTE UN BORRADOR VACÍO: lo retira. Tras registrar, el formulario se resetea y
   * este efecto se dispara con todo vacío —salvo el formulario, que se conserva para
   * encadenar—; en ese caso se borra la clave en vez de dejar un borrador que al volver
   * repoblaría un formulario ya enviado.
   */
  const persistirBorrador = useCallback(
    (valores: ValoresOperativo) => {
      if (!user || enEdicion) return;
      // Bajo el formulario DUEÑO de estos valores, no bajo el `codigoElegido` reactivo: en
      // el instante de cambiar de pestaña los dos difieren, y usar el reactivo escribiría la
      // captura del formulario que se abandona bajo la clave del que entra.
      const codigo = codigoActivoRef.current;
      if (!codigo) return;
      // Bajo la FECHA dueña de estos valores, por el mismo motivo que el formulario.
      const fechaDueña = fechaActivaRef.current;
      if (esBorradorVacio(valores, personalAgregado)) {
        limpiarBorrador(user.userid, codigo, fechaDueña);
        return;
      }
      guardarBorrador(user.userid, codigo, fechaDueña, {
        personal: personalAgregado,
        valores,
      });
    },
    [user, enEdicion, personalAgregado],
  );

  // El puntero de sesión —fecha y último formulario— se guarda aparte del borrador, para
  // reabrir la pantalla donde iba el usuario. No lleva datos personales.
  useEffect(() => {
    if (!user) return;
    guardarPuntero(user.userid, { fecha, codigoElegido });
  }, [user, fecha, codigoElegido]);

  // Cambios que NO vienen de Formik —fecha, formulario, personal— también
  // guardan, con los últimos valores conocidos del formulario.
  useEffect(() => {
    if (!valoresActualesRef.current) return;
    persistirBorrador(valoresActualesRef.current);
  }, [persistirBorrador]);

  // Cambios que vienen de Formik: el reportero de abajo llama a esto en cada tecla.
  const alCambiarValores = useCallback(
    (valores: ValoresOperativo) => {
      valoresActualesRef.current = valores;
      persistirBorrador(valores);
    },
    [persistirBorrador],
  );

  /**
   * Un borrador restaurado también necesita sus puntos, y por la misma razón que la
   * edición: la zonal llega en `valoresIniciales` y eso NO dispara `onZonalElegida`, así
   * que sin esto el desplegable de puntos nace vacío al volver a la pantalla. Se piden una
   * sola vez, en cuanto el formulario del borrador está resuelto.
   */
  const puntosDelBorradorPedidos = useRef(false);
  useEffect(() => {
    if (puntosDelBorradorPedidos.current) return;
    if (!borradorGuardado || !codigoElegido) return;

    const zonalesDelBorrador = borradorGuardado.valores.zonalesIds;
    if (zonalesDelBorrador.length === 0) {
      puntosDelBorradorPedidos.current = true;
      return;
    }

    puntosDelBorradorPedidos.current = true;
    void cargarPuntosDeZonales(zonalesDelBorrador);
  }, [borradorGuardado, codigoElegido, cargarPuntosDeZonales]);

  /**
   * El personal elegible depende del formulario y de la fecha.
   *
   * ═══════════════════════════════════════════════════════════════════════════════
   * SIN HORARIO DESDE RN-66 (2026-09-08). El operativo ya no tiene un horario propio con
   * el que filtrar —cada persona lleva el suyo—, así que la lista se pide solo por
   * formulario y fecha: el servidor descarta por área y por ausencia, y el cruce por
   * persona lo valida al registrar, con su motivo. Antes se recargaba al cambiar el
   * horario del operativo para aplicar las seis reglas de descanso.
   *
   * Cambiar de FORMULARIO vacía la lista: es otra población, y dejar los de antes en
   * pantalla permitiría agregar a alguien que ya no corresponde a ese formulario.
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

    PersonalService.consultarElegibles({
      formulario: codigoElegido,
      inicio: fecha,
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
    // `recargaPersonal` re-pide la lista tras registrar/asignar sin cambiar de población: la clave
    // (`codigoElegido|fecha`) no cambia, así que no se vacía ni parpadea, solo se refresca el semáforo.
  }, [codigoElegido, fecha, recargaPersonal]);

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
        // El área se conserva para mostrarla/filtrarla (ya no gobierna la cantidad).
        area: persona.area,
        // Cantidad de operativos por persona (2026-09-10): arranca en 1. Solo el formulario 8
        // la deja subir; cada persona genera sus propios N operativos independientes.
        cantidad: 1,
        // DEFAULT-FROM-FIRST: el turno arranca heredando el de la primera asignada; la
        // primera queda vacía = «Operativo». Editable después en la bandeja.
        ...turnoDePrimera(actuales),
      },
    ]);
  }, []);

  const retirarPersona = useCallback((funcionarioId: number) => {
    setPersonalAgregado((actuales) =>
      actuales.filter((persona) => persona.funcionarioId !== funcionarioId),
    );
  }, []);

  /**
   * Fija el horario propio de una persona (2026-09-08, RN-66). Es OBLIGATORIO: el operativo
   * ya no tiene horario propio y lo toma de las personas. Aquí solo se captura; el servidor
   * lo valida y deriva la ventana del operativo al registrar.
   */
  const cambiarHorarioPersona = useCallback(
    (funcionarioId: number, horaInicio: string, horaFin: string) => {
      setPersonalAgregado((actuales) =>
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

  /**
   * Fija la cantidad de operativos de una persona (2026-09-10). Solo en el formulario 8:
   * cada persona genera sus propios N operativos independientes, con su horario dividido en N.
   * Se acota a [1, 50]; el servidor reafirma el tope por persona.
   */
  const cambiarCantidadPersona = useCallback(
    (funcionarioId: number, cantidad: number) => {
      setPersonalAgregado((actuales) =>
        actuales.map((persona) =>
          persona.funcionarioId === funcionarioId
            ? { ...persona, cantidad }
            : persona,
        ),
      );
    },
    [],
  );

  /**
   * Sustituye una fila de la lista por la respuesta del servidor.
   *
   * LA `version` ES EL MOTIVO, no la estética. `PATCH` y `POST /personal` devuelven el
   * operativo con su versión nueva; si la fila de la tabla se queda con la vieja, el
   * siguiente guardado manda una versión caduca y el servidor responde 409 con razón.
   * Si el operativo no está en la lista —modo aporte, donde la tabla es otra— no hace
   * nada, que es lo correcto.
   */
  const empalmarEnLaLista = useCallback(
    (actualizado: Operativo) => {
      setOperativosDelFormulario((actuales) =>
        actuales.map((fila) =>
          fila.id === actualizado.id ? actualizado : fila,
        ),
      );
      // Asignar/retirar/cambiar horario a un operativo altera la carga de esa persona ese día:
      // se re-pide la lista de elegibles para que el semáforo de carga/fatiga se actualice ya.
      refrescarElegibles();
    },
    [refrescarElegibles],
  );

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * PERSONAL SOBRE UN OPERATIVO QUE YA EXISTE. Modo aporte, PER-06.
   *
   * SE ESCRIBE EN EL SERVIDOR EN CADA CLIC, al revés que los dos manejadores de arriba.
   * Aquéllos componen un operativo que todavía no existe y guardan una lista en memoria
   * hasta que se pulsa «Registrar»; aquí el operativo ya está en la base y cada persona
   * es un `POST` inmediato, igual que hace P-02.
   *
   * EL CUPO NO SE COMPRUEBA AQUÍ. Son dos personas del área Instrucción en la ECU y una
   * en la patrulla 6, y lo hace cumplir el servidor con `CUPO_COMPARTIDO_SUPERADO`.
   * Repetir el número en la pantalla daría dos sitios que corregir el día que cambie.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const agregarPersonaAlOperativo = useCallback(
    async (persona: PersonaElegible) => {
      if (!enEdicion) return;

      setAvisoPersonal(null);
      setConfirmacionPersonal(null);

      try {
        const actualizado = await OperativoService.asignarPersonal(
          enEdicion.id,
          { funcionarioId: persona.id },
        );
        setEnEdicion(actualizado);
        empalmarEnLaLista(actualizado);
        /*
          EL MENSAJE NOMBRA A LA PERSONA Y AL OPERATIVO. «Guardado» a secas no distingue
          entre haber asignado a quien se quería y haber asignado a quien estaba al lado
          en la lista, que con treinta candidatos y `Enter` como atajo no es raro.
        */
        setConfirmacionPersonal(
          `Se agregó a ${nombreDePersona(persona)} al operativo ${actualizado.identificador}.`,
        );
        await cargarOperativosDelFormulario();
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [enEdicion, empalmarEnLaLista, cargarOperativosDelFormulario],
  );

  const retirarPersonaDelOperativo = useCallback(
    async (funcionarioId: number) => {
      if (!enEdicion) return;

      setAvisoPersonal(null);
      setConfirmacionPersonal(null);

      /*
        EL NOMBRE SE TOMA ANTES DE LLAMAR, porque después ya no está: la respuesta trae el
        operativo **sin** esa persona. Solo se dispone del identificador del funcionario.
      */
      const retirada = enEdicion.personal.find(
        (persona) => persona.funcionarioId === funcionarioId,
      );

      try {
        const actualizado = await OperativoService.retirarPersonal(
          enEdicion.id,
          funcionarioId,
        );
        setEnEdicion(actualizado);
        empalmarEnLaLista(actualizado);
        setConfirmacionPersonal(
          retirada
            ? `Se retiró a ${retirada.nombre} del operativo ${actualizado.identificador}.`
            : `Se retiró a la persona del operativo ${actualizado.identificador}.`,
        );
        await cargarOperativosDelFormulario();
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [enEdicion, empalmarEnLaLista, cargarOperativosDelFormulario],
  );

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EDITAR EL PERSONAL DE UNA PATRULLA (Form 5/6). 2026-09-18.
   *
   * Al pulsar «Editar» sobre una patrulla propia, el roster deja CAMBIAR cada inspector
   * conservando su código (misma área) → `reemplazarPersonal`, y AGREGAR una persona nueva
   * → `asignarPersonal` la crea como un código más de su área en el mismo `grupoRegistro`.
   * QUITAR un código usa el mismo modal de retiro por operativo (`setPorRetirar`).
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const reemplazarPersonaPatrulla = useCallback(
    async (operativoId: number, funcionarioId: number) => {
      setAvisoPersonal(null);
      setConfirmacionPersonal(null);
      try {
        const actualizado = await OperativoService.reemplazarPersonal(
          operativoId,
          funcionarioId,
        );
        empalmarEnLaLista(actualizado);
        if (enEdicion?.id === operativoId) setEnEdicion(actualizado);
        await cargarOperativosDelFormulario();
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [enEdicion, empalmarEnLaLista, cargarOperativosDelFormulario],
  );

  const agregarMiembroPatrulla = useCallback(
    async (funcionarioId: number) => {
      if (!enEdicion) return;

      setAvisoPersonal(null);
      setConfirmacionPersonal(null);
      try {
        // El servidor adopta el `grupoRegistro` y numera el nuevo código por el área de la
        // persona (p. ej. un 2.º General → IGNECU-002).
        const creado = await OperativoService.asignarPersonal(enEdicion.id, {
          funcionarioId,
        });
        empalmarEnLaLista(creado);
        await cargarOperativosDelFormulario();
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [enEdicion, empalmarEnLaLista, cargarOperativosDelFormulario],
  );

  /** ¿Estoy editando (no aportando) una patrulla que registré yo? Entonces se pinta el roster. */
  const editandoPatrulla =
    enEdicion != null &&
    Boolean(enEdicion.grupoRegistro) &&
    // El roster (cambiar inspector/aportar) es SOLO de la patrulla. El Form 8 comparte lote pero
    // no es patrulla: se edita con los generales normales, sin roster.
    enEdicion.formulario.esPatrulla &&
    !agregandoAPatrulla &&
    accesoAlOperativo(enEdicion, user?.rolCodes ?? []) === "PROPIO";

  /** Los códigos de la patrulla en edición, cada uno con su persona y si lo puedo tocar. */
  const miembrosPatrulla = useMemo<MiembroPatrulla[]>(() => {
    if (!enEdicion?.grupoRegistro) return [];
    return operativosDelFormulario
      .filter((operativo) => operativo.grupoRegistro === enEdicion.grupoRegistro)
      .slice()
      .sort((una, otra) => una.identificador.localeCompare(otra.identificador))
      .map((operativo) => ({
        operativo,
        persona: operativo.personal[0],
        // Puedo cambiar/quitar los códigos que registré yo (General/Técnico); el INECU del DMIT
        // llega en lectura.
        editable: accesoAlOperativo(operativo, user?.rolCodes ?? []) === "PROPIO",
      }))
      .filter((miembro) => miembro.persona != null);
  }, [operativosDelFormulario, enEdicion, user]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EDITAR EL HORARIO DE UNA PERSONA YA ASIGNADA. 2026-09-09, RN-66.
   *
   * En corrección el horario es editable, y como el resto del personal en este modo se
   * escribe EN EL ACTO (no con el botón «Guardar cambios»): cada cambio de un `select` es un
   * `PATCH` inmediato. El servidor re-deriva la ventana del operativo de los turnos de su
   * gente y devuelve el operativo al día, que se empalma en la lista y en `enEdicion`.
   *
   * SOLO SE ENVÍA CON LAS DOS HORAS. El `select` avisa con el par completo (la que cambió y
   * la que ya estaba), y en edición ambas vienen llenas; el guardián es por si acaso, para no
   * mandar media ventana que el servidor rechazaría.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const cambiarHorarioPersonaDelOperativo = useCallback(
    async (funcionarioId: number, horaInicio: string, horaFin: string) => {
      if (!enEdicion) return;
      if (!horaInicio || !horaFin) return;

      setAvisoPersonal(null);
      setConfirmacionPersonal(null);

      try {
        const actualizado = await OperativoService.actualizarTurnoPersonal(
          enEdicion.id,
          funcionarioId,
          { horaInicio, horaFin },
        );
        setEnEdicion(actualizado);
        empalmarEnLaLista(actualizado);
        const persona = actualizado.personal.find(
          (fila) => fila.funcionarioId === funcionarioId,
        );
        setConfirmacionPersonal(
          persona
            ? `Se actualizó el horario de ${persona.nombre} a ${horaInicio}–${horaFin} en el operativo ${actualizado.identificador}.`
            : `Se actualizó el horario en el operativo ${actualizado.identificador}.`,
        );
        await cargarOperativosDelFormulario();
      } catch (fallo: unknown) {
        setAvisoPersonal(presentarError(fallo).mensaje);
      }
    },
    [enEdicion, empalmarEnLaLista, cargarOperativosDelFormulario],
  );

  /**
   * Cambiar de jornada CONSERVA lo capturado de cada día (2026-09-21). Antes se borraba todo, y
   * quien tocaba «Fecha de la jornada» perdía lo que llevaba escrito. Ahora el borrador se guarda
   * por (formulario, FECHA): el efecto de cambio guarda la captura del día saliente bajo su clave
   * y carga la del entrante, así que volver a la fecha anterior la restaura. Respeta RN-66 —cada
   * captura queda con su día, el personal no se arrastra a otra fecha—.
   *
   * Solo se vacía el LISTADO de operativos (es de la jornada abandonada, y dejarlo confundiría) y
   * se CIERRA la corrección abierta (era de otro día). El puntero se queda.
   */
  const cambiarJornada = useCallback((nueva: string) => {
    setFecha(nueva);
    setOperativosDelFormulario([]);
    setEnEdicion(null);
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
          zonalesIds: valores.zonalesIds,
          puntoEncuentroId:
            valores.punto === OPCION_ADICIONALES ||
            valores.punto === OPCION_PUNTO_NUEVO
              ? undefined
              : Number(valores.punto),
          puntoLibre:
            valores.punto === OPCION_ADICIONALES
              ? valores.puntoLibre
              : undefined,
          // PUNTO NUEVO (Unidad de Operativos, 2026-09-24): viaja solo el nombre y la zonal; el
          // servidor lo CREA al registrar, dentro de la misma transacción del operativo. Si el
          // operativo no se crea, el punto tampoco queda.
          puntoNuevo:
            valores.punto === OPCION_PUNTO_NUEVO && valores.puntoNuevo
              ? valores.puntoNuevo
              : undefined,
          // Form 8: viajan los ids del `SelectorTokens` y el adicional opcional; en el resto,
          // el tipo único (o el adicional del desplegable). El servidor elige según su flag.
          tipoControlId:
            catalogos.catalogos?.tipoControlMultiple ||
            valores.tipoControl === OPCION_ADICIONALES
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
          // TODO O NADA, desde el 2026-08-11. El personal viaja con el operativo y el
          // servidor los guarda en una sola transacción. Antes se creaba el operativo y
          // se asignaba después, una petición por persona, capturando el rechazo de cada
          // una: al rechazarse alguien quedaba un operativo vacío en el cuadro y el
          // formulario se limpiaba igual, así que no había forma de corregir a esa
          // persona sin volver a teclear todo.
          // Cada persona con su horario propio, OBLIGATORIO (2026-09-08, RN-66): el operativo
          // ya no manda su horario; el servidor toma la ventana del operativo de las de su
          // gente. Se guarda en una sola transacción (todo o nada), como antes.
          personal: personalAgregado.map((persona) => ({
            funcionarioId: persona.funcionarioId,
            horaInicio: persona.horaInicio || undefined,
            horaFin: persona.horaFin || undefined,
            // CANTIDAD POR PERSONA (2026-09-10), solo en el formulario 8: cada persona genera
            // SUS PROPIOS N operativos independientes, con su horario dividido en N. Solo viaja
            // cuando es >1, para no ensuciar el resto; el servidor lo exige atado al formulario.
            cantidad: (persona.cantidad ?? 1) > 1 ? persona.cantidad : undefined,
          })),
          observaciones: valores.observaciones || undefined,
        });

        const ultimo = operativo;
        // Cuántos operativos se generaron. En el formulario 8, la SUMA de las cantidades por
        // persona (cada persona genera sus propios N); en el resto, uno solo con todo el
        // personal. Con más de uno, el servidor devuelve solo el PRIMERO.
        const generados = catalogos.catalogos?.variosPorPersona
          ? personalAgregado.reduce(
              (suma, persona) => suma + (persona.cantidad ?? 1),
              0,
            )
          : 1;

        // CON UNO SOLO, ARRIBA Y SIN VOLVER A CONSULTAR: el servidor devuelve el operativo
        // completo y anteponerlo es lo que hace que quien encadena registros vea el suyo sin
        // buscarlo. CON VARIOS, el servidor devuelve SOLO EL PRIMERO de los N (el contrato de
        // `POST /operativos` sigue siendo un operativo), así que hay que releer el listado
        // para traer también los demás; anteponer solo el primero mentiría sobre lo generado.
        if (generados > 1) {
          await cargarOperativosDelFormulario();
        } else {
          setOperativosDelFormulario((actuales) => [ultimo, ...actuales]);
        }

        // El texto del éxito dice cuántos se generaron. Con varios, nombra el PRIMER
        // identificador —los demás son consecutivos— para que se sepa de dónde arranca el lote.
        const registrado =
          generados > 1
            ? `${generados} operativos registrados a partir de ${ultimo.identificador}: cada persona atiende los suyos con su horario repartido en tramos. Puede ajustarlos con «Editar».`
            : `Operativo ${ultimo.identificador} registrado.`;

        // Si este registro abrió la jornada, se dice y se relee la cabecera: el estado y
        // la orden de trabajo los compone el servidor, y componerlos aquí duplicaría un
        // formato que no es nuestro. `jornadaPorAbrir` se evaluó antes de guardar, así
        // que sigue describiendo cómo estaba la jornada al empezar.
        if (jornadaPorAbrir) {
          setExito(`${registrado} Se abrió la jornada del ${fecha}.`);
          recargarCuadro();
        } else {
          setExito(registrado);
        }

        // Se limpia todo **salvo el formulario elegido**: quien registra suele encadenar
        // varios del mismo. Volver a elegirlo cada vez cuesta un clic por operativo.
        //
        // SE DICE A QUÉ SE VUELVE, y no basta con `resetForm()` a secas desde el
        // 2026-09-01 por la tarde: `resetForm` sin argumentos repone `initialValues`, y
        // si quien registra había entrado a corregir algo, `initialValues` es el borrador
        // que se apartó entonces. El formulario se habría rellenado solo con lo que
        // acababa de registrarse.
        setBorrador(null);
        // El borrador ya cumplió: lo capturado se registró. Se retira de una vez —el del
        // formulario recién enviado, no otro—, sin esperar a que el reformateo de abajo lo
        // vacíe campo a campo, para que un salto a otra pantalla en ese instante no reabra un
        // operativo ya enviado.
        if (user)
          limpiarBorrador(user.userid, valores.formularioCodigo, fecha);
        ayudas.resetForm({
          values: {
            ...VALORES_INICIALES,
            formularioCodigo: valores.formularioCodigo,
          },
        });
        setPersonalAgregado([]);
        catalogos.limpiarPuntos();
        // Las personas recién registradas ya cargan un operativo más ese día: se re-pide la lista
        // de elegibles para que su semáforo de carga/fatiga se actualice de inmediato (antes solo
        // se veía tras cerrar sesión y volver a entrar).
        refrescarElegibles();
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
    [
      fecha,
      personalAgregado,
      catalogos,
      jornadaPorAbrir,
      recargarCuadro,
      user,
      cargarOperativosDelFormulario,
      refrescarElegibles,
    ],
  );

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * ENTRAR A CORREGIR: APARTAR EL BORRADOR Y CARGAR EL OPERATIVO. 2026-09-01, tarde.
   *
   * LO USAN LOS DOS BOTONES, el «Editar» de lo propio y el «Agregar Personal» del modo
   * aporte, porque los dos hacen la misma pregunta: qué operativo está abierto.
   *
   * DESDE RN-66 (2026-09-08) NO SE SIEMBRA NINGÚN HORARIO DE OPERATIVO. El operativo ya no
   * tiene horario propio y la lista de elegibles se pide sin él (área y ausencia). El horario
   * POR PERSONA sí es editable en corrección desde el 2026-09-09, pero se toma de
   * `enEdicion.personal` (lo resuelve el servidor) y se escribe en el acto, no se siembra aquí.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const abrirEdicion = useCallback(
    (operativo: Operativo) => {
      setAvisoPersonal(null);
      setConfirmacionPersonal(null);
      setAvisoGeneral(null);

      // En aporte este formulario no se pinta, así que no hay captura que apartar ni
      // referencia que leer: el operativo se abre en el panel, como hasta ahora.
      if (!esAporte) {
        setBorrador({
          valores: formularioRef.current?.values ?? {
            ...VALORES_INICIALES,
            formularioCodigo: operativo.formulario.codigo,
          },
          personal: personalAgregado,
        });
      }

      setEnEdicion(operativo);

      // LOS PUNTOS DE LA ZONAL SE PIDEN AL ABRIR, y sin esto no llegan. El desplegable de
      // zonal muestra la del operativo porque viene en `valoresIniciales`, pero eso NO
      // dispara `onZonalElegida` —solo lo hace un cambio del usuario—, así que la lista de
      // puntos se quedaba vacía y la pantalla decía «no hay puntos configurados para esta
      // zonal» sobre una zonal que sí los tiene. Se cargan igual que en la selección manual.
      const zonalesDelOperativo = operativo.zonales.map((zonal) => zonal.id);
      if (zonalesDelOperativo.length > 0) {
        void cargarPuntosDeZonales(zonalesDelOperativo);
      }
    },
    [esAporte, personalAgregado, cargarPuntosDeZonales],
  );

  /**
   * Salir de la corrección y devolver el borrador a su sitio.
   *
   * NO SE BORRA `borrador` AQUÍ, y es lo que hace que funcione: mientras siga puesto es
   * el `valoresIniciales` del formulario, y `enableReinitialize` repone lo tecleado en
   * cuanto `enEdicion` se vacía. Se limpia al registrar, al cambiar de jornada y al
   * cambiar de formulario, que son los tres momentos en que ese borrador deja de tener
   * sentido.
   */
  const cerrarEdicion = useCallback(() => {
    setEnEdicion(null);
    setAgregandoAPatrulla(false);
    setAvisoPersonal(null);
    setConfirmacionPersonal(null);

    if (borrador) {
      setPersonalAgregado(borrador.personal);
      return;
    }
  }, [borrador]);

  /**
   * «Agregar Personal» a una patrulla: abre el panel de aporte (solo personal) sobre un miembro
   * del grupo, sea quien sea el que mira. El servidor adopta el `grupoRegistro`, así que agregar a
   * cualquier miembro suma a la misma patrulla, con el código del área de la persona. 2026-09-18.
   */
  const abrirAgregarPatrulla = useCallback(
    (operativo: Operativo) => {
      abrirEdicion(operativo);
      setAgregandoAPatrulla(true);
    },
    [abrirEdicion],
  );

  // Acciones FUSIONADAS de la patrulla (Form 5/6). 2026-09-18. Un solo «Editar» (los generales, y
  // SOLO el registrante) + un solo «Agregar Personal»; el «Eliminar» va por persona (más abajo).
  const accionesDePatrulla = (grupo: Operativo[]) => {
    const cabeza = grupo[0];
    const esRegistrante =
      accesoAlOperativo(cabeza, user?.rolCodes ?? []) === "PROPIO";
    // «Agregar Personal» es el APORTE de Instrucción: solo se ofrece a quien aporta a este
    // formulario —en el Form 6, el DMIT de Instrucción—, no al dueño (DMIP), que registra a los
    // suyos al crear la patrulla. Espejo de `reglaCupoCompartido` del servidor. 2026-09-18.
    const puedeAgregarPersonal = puedeAportarA(cabeza, user?.rolCodes ?? []);
    const motivoBloqueo = bloqueado
      ? "La ventana de carga está cerrada o el cuadro fue cerrado."
      : undefined;
    return (
      <div className="flex flex-col items-center gap-1">
        {esRegistrante && (
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => abrirEdicion(cabeza)}
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

  // El «Eliminar» de cada persona de la patrulla: habilitado solo en el código propio de quien
  // mira (PER-08); en los ajenos, apagado con su motivo (regla 6). Va junto a cada nombre.
  const accionDePersonaPatrulla = (operativo: Operativo) => {
    const acceso = accesoAlOperativo(operativo, user?.rolCodes ?? []);
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
   * ═══════════════════════════════════════════════════════════════════════════════
   * CORREGIR SIN CAMBIAR DE PANTALLA. 2026-09-01.
   *
   * Hasta hoy la tabla de la sesión era solo lectura y para arreglar una hora mal
   * digitada había que ir a P-02. El wireframe de `FASE5` §4.1 ya dibujaba `[✎] [🗑]`
   * aquí desde el diseño; nunca se construyó ni se desmintió.
   *
   * NO SE RECARGA LA LISTA: SE EMPALMA LA RESPUESTA. Pedirla otra vez sería
   * una consulta para lo que ya se tiene: `PATCH` devuelve el operativo actualizado **con su
   * `version` nueva**. Volver a pedir el listado sería otra consulta para lo que ya
   * tenemos; y dejar la fila vieja sería peor que cosmético — el siguiente guardado
   * mandaría una versión caduca y el servidor respondería 409.
   *
   * NO RECIBE `ayudas` DESDE EL 2026-09-01 POR LA TARDE. Llamaba a `resetForm`, que con
   * un formulario compartido con la captura habría vaciado el borrador en vez de
   * devolverlo. Quien repone los campos es `cerrarEdicion`, por `enableReinitialize`.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const guardarEdicion = useCallback(
    async (valores: ValoresOperativo) => {
      if (!enEdicion) return;

      setProcesando(true);
      setAvisoGeneral(null);

      // Los campos generales, comunes a `editar` (un operativo) y `editarPatrulla` (todo el lote).
      const generales = {
        zonalesIds: valores.zonalesIds,
        puntoEncuentroId:
          valores.punto === OPCION_ADICIONALES || valores.punto === ""
            ? undefined
            : Number(valores.punto),
        puntoLibre:
          valores.punto === OPCION_ADICIONALES ? valores.puntoLibre : undefined,
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
        if (enEdicion.grupoRegistro) {
          const actualizados = await OperativoService.editarPatrulla(
            enEdicion.grupoRegistro,
            generales,
          );
          actualizados.forEach(empalmarEnLaLista);
          setExito(
            `Patrulla actualizada: ${actualizados.length} códigos al día.`,
          );
          cerrarEdicion();
          return;
        }

        // RN-66: el operativo conserva su ventana (derivada de las personas). En corrección no se
        // toca el horario; se editan zonal, punto, tipo, instituciones y notas (`generales`).
        const actualizado = await OperativoService.editar(enEdicion.id, {
          version: enEdicion.version,
          ...generales,
        });

        empalmarEnLaLista(actualizado);
        setExito(`Operativo ${actualizado.identificador} actualizado.`);
        cerrarEdicion();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAvisoGeneral({
          texto: error.mensaje,
          clase: claseDeAviso(error.trato),
        });
      } finally {
        setProcesando(false);
      }
    },
    [
      enEdicion,
      empalmarEnLaLista,
      cerrarEdicion,
      catalogos.catalogos?.tipoControlMultiple,
    ],
  );

  /**
   * PV-10. La baja borra de verdad mientras no haya orden emitida.
   *
   * Aquí es casi siempre el caso: son operativos de hace un minuto, sin órdenes, así que
   * el borrado es físico y **el secuencial vuelve a quedar libre**. Es justo lo que
   * necesita quien se equivocó al teclear y va a registrarlo otra vez. Las dos bajas no
   * son la misma noticia, y el mensaje lo dice.
   */
  const confirmarRetiro = useCallback(async () => {
    if (!porRetirar) return;

    setProcesando(true);
    setAvisoGeneral(null);

    try {
      const baja = await OperativoService.retirar(
        porRetirar.id,
        porRetirar.version,
      );

      setOperativosDelFormulario((actuales) =>
        actuales.filter((fila) => fila.id !== porRetirar.id),
      );
      // Si el operativo que se acaba de eliminar era el que estaba abierto, se cierra la
      // corrección **por el camino normal**: el borrador de la captura vuelve a los
      // campos. Vaciar `enEdicion` a secas dejaría el formulario con los datos de un
      // operativo que ya no existe.
      if (enEdicion?.id === porRetirar.id) cerrarEdicion();

      setExito(
        baja.eliminado
          ? `Operativo ${baja.identificador} eliminado. Su número queda libre para el siguiente registro.`
          : `Operativo ${baja.identificador} retirado del cuadro. No se elimina porque ya tiene ${baja.ordenesEmitidas === 1 ? "una orden emitida" : `${baja.ordenesEmitidas} órdenes emitidas`}: una orden ya comunicada no puede quedarse sin origen.`,
      );
      setPorRetirar(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setAvisoGeneral({
        texto: error.mensaje,
        clase: claseDeAviso(error.trato),
      });
      setPorRetirar(null);
    } finally {
      setProcesando(false);
    }
  }, [porRetirar, enEdicion, cerrarEdicion]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * QUÉ PERSONAL PINTA EL FORMULARIO, SEGÚN EL MODO. 2026-09-01, tarde.
   *
   * En ALTA sale de `personalAgregado`, que es memoria: el operativo todavía no existe y
   * las personas viajan con él al pulsar «Registrar».
   *
   * En EDICIÓN sale **del operativo**, no de un estado propio, para que lo que se ve sea
   * siempre lo que el servidor acaba de confirmar. Es el mismo criterio que aplica
   * `PanelEdicionOperativo`, que sigue sirviendo al modo aporte y a P-02.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const personalDelFormulario = useMemo<PersonaAgregada[]>(
    () =>
      enEdicion
        ? enEdicion.personal.map((persona) => ({
            funcionarioId: persona.funcionarioId,
            nombre: persona.nombre,
            telefono: persona.telefono,
            // El turno de cada persona, para poder EDITARLO en corrección (RN-66, 2026-09-09).
            // Viene siempre lleno: es la ventana efectiva que resuelve el servidor.
            horaInicio: persona.horaInicio,
            horaFin: persona.horaFin,
          }))
        : personalAgregado,
    [enEdicion, personalAgregado],
  );

  return (
    <section className="app-page-shell">
      {/*
        ═══════════════════════════════════════════════════════════════════════════════
        LA FECHA SUBE A LA DERECHA DEL TÍTULO. 2026-09-02.

        Ocupaba un renglón entero para sí sola, pegada al margen izquierdo, con el resto
        del ancho vacío: a 1440 px eran unos mil píxeles sin usar y una fila menos para el
        formulario, que es lo que esta pantalla existe para llenar deprisa (regla 14).

        ES EL PATRÓN QUE YA USA P-13, y por eso no se inventa uno: mismo `header` en dos
        columnas a partir de `md`, mismo `app-page-header-actions` —que es quien alinea a
        la derecha, y solo desde 768 px— y la misma pareja de rótulo y campo. Dos pantallas
        hermanas con el selector de fecha en sitios distintos obligan a buscarlo dos veces.

        EN MÓVIL SIGUE APILADO, y debe: `flex-col` hasta `md`, y la clase deja el campo
        alineado a la izquierda por debajo de ese ancho. Alinearlo a la derecha en 375 px
        lo separaría de su etiqueta sin ganar nada.
        ═══════════════════════════════════════════════════════════════════════════════
      */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="page-heading-kicker font-semibold uppercase">
            {user?.rolName ?? "Departamento"}
          </p>
          <h1 className="page-heading-title">
            Registro de operativo
          </h1>
          <CamposCalculados
            cuadro={cuadro}
            cargando={cargandoCuadro}
          />
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

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Formulario
          </h2>

          {/*
            LA FECHA DE LA JORNADA VIVE EN LA BARRA DEL FORMULARIO (2026-09-25). El operador la
            necesita muy a la vista —de qué jornada está armando el cuadro— y esta franja azul
            tenía el espacio libre. La etiqueta va en blanco (`text-primary-content`) para leerse
            sobre el degradado; el `input` blanco resalta. Al cambiarla, `cambiarJornada` conserva
            la captura de cada día (borrador por fecha).
          */}
          <label
            htmlFor="fechaCuadro"
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-content">
              Fecha de la jornada
            </span>
            <input
              id="fechaCuadro"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => cambiarJornada(evento.target.value)}
            />
          </label>
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
                UN FORMULARIO COMPARTIDO NO SE REGISTRA AQUÍ, PERO SÍ SE RESUELVE AQUÍ.

                El departamento que aporta personal —el DMIT en los formularios 4 y 6— no
                puede crear operativos: el servidor responde 403. Lo que sí le toca es
                poner a su gente, y eso ocurre sobre un operativo que ya existe.

                HASTA EL 2026-08-31 ESTO NAVEGABA A P-02, con el formulario ya filtrado.
                Se retiró por una razón concreta: el enlace mandaba el **código** —`ECU`—
                y P-02 filtraba comparando contra el **texto visible** de la columna,
                `4. PATRULLA ECU DIURNA`. Con la ECU casaba de milagro, porque el código
                es subcadena del nombre; con la patrulla 6 —código `REACN`, nombre
                «PATRULLA REACCIÓN NOCTURNA»— **no casaba**, y la pantalla salía vacía.

                Ahora se queda en esta pantalla: el formulario se abre en lectura y los
                operativos del día se traen del servidor **por código**, que es una llave
                estable y no depende de cómo se llame el formulario.
                ═══════════════════════════════════════════════════════════════════
              */
              onAportar={setCodigoElegido}
              deshabilitado={bloqueado}
            />
          )}

          {formularioElegido && (
            <>
              {/*
                PER-06. Se dice antes que nada: sin explicación, una pantalla que no deja
                registrar se lee como una avería.
              */}
              {esAporte && (
                <div
                  className="alert alert-info"
                  role="status"
                >
                  <span>
                    Su departamento <strong>aporta personal</strong> a este
                    formulario; los operativos los registra{" "}
                    {NOMBRE_DIRECCION[formularioElegido.rolDueno]}. Abajo están
                    los operativos del día: pulse{" "}
                    <strong>Agregar Personal</strong> en el que le corresponda y
                    se abrirá <strong>su</strong> formulario, en lectura salvo el
                    personal.
                  </span>
                </div>
              )}

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

              {/*
                ═══════════════════════════════════════════════════════════════════
                EN MODO APORTE NO SE PINTA ESTE FORMULARIO, Y ES LA CORRECCIÓN DEL
                2026-08-31 POR LA TARDE.

                La primera versión sí lo pintaba, vacío y bloqueado, para que se viera
                «el formulario». El resultado era que en pantalla quedaban DOS: éste,
                vacío y sin salida, y el del operativo al pulsar «Agregar Personal».

                Sobra el vacío. Es un formulario de ALTA para algo que este departamento
                no puede crear nunca —el servidor responde 403—, así que no hay nada que
                consultar en él: todos sus campos están en blanco. El formulario útil es
                el del operativo que ya existe, con sus datos, y ése lo abre el botón.
                ═══════════════════════════════════════════════════════════════════
              */}
              {!esAporte && !agregandoAPatrulla && (
                <>
                  {/*
                    ═══════════════════════════════════════════════════════════════════
                    SE DICE QUE SE ESTÁ CORRIGIENDO, Y QUE NO SE PERDIÓ NADA. 2026-09-01.

                    El formulario es el mismo que el de captura, así que sin este aviso
                    el único indicio del cambio de modo sería el rótulo del botón. Y la
                    segunda frase importa tanto como la primera: quien lleva medio
                    operativo tecleado necesita saber **antes** de mirar los campos que
                    lo suyo sigue guardado, o deshará la corrección por las dudas.

                    VA EN PALABRAS Y NO EN COLOR (regla 6), y `role="status"` para que el
                    lector de pantalla lo anuncie al entrar en el modo.
                    ═══════════════════════════════════════════════════════════════════
                  */}
                  {enEdicion && (
                    <div
                      className="alert alert-info"
                      role="status"
                    >
                      <span>
                        Está corrigiendo el operativo{" "}
                        <strong>{enEdicion.identificador}</strong>. Lo que estaba
                        capturando quedó guardado y vuelve al cancelar o al
                        guardar los cambios.
                      </span>
                    </div>
                  )}

                  {/*
                    ═══════════════════════════════════════════════════════════════════
                    UN SOLO FORMULARIO PARA REGISTRAR Y PARA CORREGIR. 2026-09-01, tarde.

                    Hasta esta mañana «Editar» abría `PanelEdicionOperativo` **debajo de
                    la tabla**, con una segunda instancia de este mismo componente. No
                    era un formulario distinto —el panel siempre envolvió a éste—, pero
                    en pantalla había dos, y para corregir una hora mal digitada había
                    que desplazarse hasta el final de la página y volver.

                    LO QUE CAMBIA CON EL MODO SON CINCO PROPIEDADES, y todas se derivan
                    de `enEdicion`: no pueden contradecirse entre sí. El componente ya
                    admitía `valoresIniciales` desde P-02; lo único que hacía falta era
                    decidir aquí qué valores le tocan.

                    EL PANEL NO DESAPARECE: sigue sirviendo al modo aporte, más abajo, y
                    a P-02 entera, donde es la pantalla y no un añadido.
                    ═══════════════════════════════════════════════════════════════════
                  */}
                  {/*
                    ROSTER DE LA PATRULLA (2026-09-18): al editar una patrulla propia, el personal
                    se gestiona aquí —cambiar inspector conservando el código + agregar persona—, y
                    el bloque de personal del formulario de abajo va OCULTO (solo generales).
                  */}
                  {editandoPatrulla && (
                    <RosterPatrulla
                      miembros={miembrosPatrulla}
                      candidatos={candidatos}
                      onCambiar={(operativoId, funcionarioId) =>
                        void reemplazarPersonaPatrulla(operativoId, funcionarioId)
                      }
                      onQuitar={(operativo) => setPorRetirar(operativo)}
                      onAgregar={(funcionarioId) =>
                        void agregarMiembroPatrulla(funcionarioId)
                      }
                      aviso={avisoPersonal}
                      bloqueado={bloqueado}
                    />
                  )}

                  <FormularioOperativo
                    refFormik={formularioRef}
                    /*
                      SOLO EN ALTA SE CONSERVA LA CAPTURA. En edición la captura está
                      apartada en `borrador` y a salvo; persistir lo que se teclea sobre
                      un operativo que se corrige no es lo que se pidió.
                    */
                    onValoresCambian={enEdicion ? undefined : alCambiarValores}
                    formularioCodigo={formularioElegido.codigo}
                    catalogos={catalogos.catalogos}
                    puntos={catalogos.puntos}
                    cargandoPuntos={catalogos.cargandoPuntos}
                    onZonalesElegidas={(zonalesIds) => {
                      void catalogos.cargarPuntosDeZonales(zonalesIds);
                    }}
                    /*
                      AGREGAR UN PUNTO AL CATÁLOGO desde el registro (Unidad de Operativos, 2026-09-24).
                      Solo en el ALTA, y solo si el formulario lo permite (`puntoManual`, hoy el 1-4);
                      `FormularioOperativo` combina esto con esa bandera. Al teclearlo queda pendiente y
                      el servidor lo crea al registrar, en la misma transacción del operativo.
                    */
                    permiteAgregarPunto={!enEdicion}
                    candidatos={candidatos}
                    cargandoPersonal={cargandoPersonal}
                    personalAgregado={personalDelFormulario}
                    /*
                      EN ALTA SE ACUMULA EN MEMORIA; EN EDICIÓN SE ESCRIBE EN EL ACTO.
                      No es una inconsistencia: al registrar no existe todavía el
                      operativo al que colgar a nadie, y al corregir sí, y cada persona
                      tiene su propio veredicto de descanso y puede fallar sola.
                    */
                    onAgregarPersona={
                      enEdicion
                        ? (persona) => void agregarPersonaAlOperativo(persona)
                        : agregarPersona
                    }
                    onRetirarPersona={
                      enEdicion
                        ? (funcionarioId) =>
                            void retirarPersonaDelOperativo(funcionarioId)
                        : retirarPersona
                    }
                    /*
                      El turno por persona es editable en los DOS modos (RN-66, 2026-09-09).
                      Al REGISTRAR se acumula en memoria (`cambiarHorarioPersona`); al CORREGIR
                      se escribe en el acto, como el resto del personal en edición
                      (`cambiarHorarioPersonaDelOperativo`). Con la función presente, la bandeja
                      muestra los dos `select` de horario.
                    */
                    onCambiarHorarioPersona={
                      enEdicion
                        ? cambiarHorarioPersonaDelOperativo
                        : cambiarHorarioPersona
                    }
                    avisoPersonal={avisoPersonal}
                    confirmacionPersonal={confirmacionPersonal}
                    // En corrección se muestran las notas ya escritas (bitácora); en alta no hay.
                    observacionesExistentes={enEdicion?.observaciones ?? []}
                    valoresIniciales={
                      enEdicion
                        ? comoValoresDeFormulario(enEdicion)
                        : borrador?.valores
                    }
                    textoAccion={enEdicion ? "Guardar cambios" : undefined}
                    onCancelar={enEdicion ? cerrarEdicion : undefined}
                    // Solo en el ALTA se propone la zonal de la persona al asignarla; en
                    // edición el operativo ya tiene la suya y no se cambia por agregar gente.
                    proponerZonalDePersona={!enEdicion}
                    bloqueado={bloqueado}
                    guardando={enEdicion ? procesando : guardando}
                    onGuardar={enEdicion ? guardarEdicion : registrar}
                    /*
                      «CANTIDAD DE OPERATIVOS» POR PERSONA, SOLO EN EL ALTA DEL FORMULARIO QUE LA
                      OFRECE (`cantidadPorPersona`, hoy solo el 8). 2026-09-14: se separó del split
                      —`variosPorPersona`, que también tiene el 5—, porque el 5 divide por persona
                      (cada área su código) pero NO ofrece elegir cantidad. En edición no se generan
                      copias; este bloque ya excluye el aporte (`!esAporte`).
                    */
                    permiteCantidadPorPersona={
                      !enEdicion &&
                      (catalogos.catalogos?.cantidadPorPersona ?? false)
                    }
                    onCambiarCantidadPersona={cambiarCantidadPersona}
                    /*
                      FORM 8 EN EDICIÓN: EL PERSONAL NO SE TOCA (2026-09-14). Los N operativos
                      del 8 ya tienen su identificador generado —uno por operativo, no
                      modificable—, así que al corregir uno solo se cambian zonal, punto,
                      instituciones y tipo; agregar/retirar/editar personal queda bloqueado.
                    */
                    personalBloqueado={
                      Boolean(enEdicion) &&
                      ((catalogos.catalogos?.cantidadPorPersona ?? false) ||
                        // En una patrulla el personal se gestiona con las acciones fusionadas
                        // (Agregar / Eliminar por persona), no dentro del editor de generales.
                        Boolean(enEdicion?.grupoRegistro))
                    }
                    // Al editar una patrulla propia, el personal vive en el roster de arriba: aquí
                    // se OCULTA el bloque de personal y el formulario solo edita los generales.
                    personalOculto={editandoPatrulla}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/*
            ═══════════════════════════════════════════════════════════════════════
            EL TÍTULO YA NO CAMBIA CON EL MODO, PORQUE LA TABLA YA NO CAMBIA.

            Decía «Registrados en esta sesión» en registro y «Operativos de este
            formulario» en aporte, y las dos frases eran literales: eran dos listas
            distintas. Desde el 2026-09-01 por la tarde es una sola, traída del servidor
            en los dos modos, así que la segunda frase describe también al primero.

            Y LA PRIMERA HABRÍA PASADO A SER FALSA. La tabla ya no recuerda lo de esta
            sesión: trae la jornada entera del formulario, incluida la de ayer por la
            tarde y la del compañero del otro turno. Dejar el rótulo viejo sería decirle
            a quien mira que puede borrar sin mirar porque «todo esto lo puse yo».
            ═══════════════════════════════════════════════════════════════════════
          */}
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Operativos de este formulario
          </h2>

          {/*
            ═══════════════════════════════════════════════════════════════════════
            LA VISIÓN GENERAL DEL DÍA, A UN CLIC. 2026-09-01.

            Esta tabla trae un formulario; para ver dónde encaja lo que se está
            registrando hace falta la rejilla completa de los nueve. P-13 se abrió ese día
            a los tres roles departamentales justamente para esto.

            VA COMO ENLACE Y NO COMO BOTÓN porque navega. Y **no se comprueba el rol**:
            los tres que llegan a P-01 son exactamente los tres que P-13 admite desde ese
            día, así que nadie puede ver este enlace y rebotar al pulsarlo. Repetir la
            lista aquí sería una segunda fuente de verdad sobre permisos, que es el
            defecto que el modo aporte ya evita leyendo `acceso` en lugar del rol.

            Si algún día las dos listas se separaran, `rolesDeAdministracion.spec.ts` no
            lo vería: lo vería el usuario, rebotando. Conviene recordarlo antes de abrir
            P-01 a un cuarto rol.
            ═══════════════════════════════════════════════════════════════════════
          */}
          <Link
            to="/home/cuadro/jornada"
            className="btn btn-ghost btn-sm"
          >
            Ver la Jornada del Día
          </Link>
          {/*
            EL CONTADOR ES DE LOS DOS MODOS desde que la lista lo es. Es además la única
            señal de que la tabla se está releyendo: el listado no se vacía mientras llega
            la respuesta —eso haría parpadear la tabla en cada asignación de personal—,
            así que sin esto una recarga en curso no se distinguiría de una terminada.
          */}
          <span className="badge badge-ghost badge-sm">
            {cargandoOperativos
              ? "Cargando…"
              : `${operativosDelFormulario.length} en la jornada`}
          </span>
        </div>

        <div className="app-data-panel-body px-2 pb-4 pt-2 md:px-4">
          {esAporte ? (
            <TablaOperativos
              operativos={operativosDelFormulario}
              mensajeVacio={
                cargandoOperativos
                  ? "Cargando los operativos de la jornada…"
                  : "Todavía no hay operativos de este formulario en esta jornada. Los registra el departamento dueño; cuando existan, podrá asignarles a su gente aquí."
              }
              // La patrulla (Form 5/6) usa acciones fusionadas; el resto, la de abajo por fila.
              accionesPatrulla={accionesDePatrulla}
              accionPersona={accionDePersonaPatrulla}
              acciones={(operativo) => (
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={() => abrirEdicion(operativo)}
                  disabled={bloqueado}
                  title={
                    bloqueado
                      ? "La ventana de carga está cerrada o el cuadro fue cerrado."
                      : undefined
                  }
                >
                  Agregar Personal
                </button>
              )}
            />
          ) : (
            <TablaOperativos
              operativos={operativosDelFormulario}
              mensajeVacio={
                cargandoOperativos
                  ? "Cargando los operativos de la jornada…"
                  : "Todavía no hay operativos de este formulario en esta jornada. El primero que registre la abre."
              }
              // La patrulla (Form 5/6) usa acciones fusionadas; el resto, la de abajo por fila.
              accionesPatrulla={accionesDePatrulla}
              accionPersona={accionDePersonaPatrulla}
              acciones={(operativo) => {
                /*
                  ═══════════════════════════════════════════════════════════════════
                  CORREGIR AQUÍ MISMO, SIN IR A P-02. 2026-09-01.

                  LA PROPIEDAD YA NO ESTÁ GARANTIZADA, Y ÉSE ES EL CAMBIO DE LA TARDE.

                  Cuando esta tabla solo tenía lo que quien miraba acababa de registrar,
                  todas sus filas eran suyas por construcción. Ahora trae la jornada del
                  formulario tal como la devuelve el servidor, y el formulario 4 tiene
                  **dos departamentos que registran** desde el 2026-08-25: el DMIP verá
                  ahí filas del DMIT, y viceversa.

                  `exigirPropiedad` compara `oper_creado_por_rol` con el rol de quien
                  pide, así que pulsar «Editar» en una fila ajena daría un 403 que antes
                  no existía. Se decide con `accesoAlOperativo`, que es la misma utilidad
                  que usa P-02 y **no nombra ningún rol**: cruza `creadoPorRol` con
                  `user.rolCodes`, que es plural desde el 19-AGO.

                  LOS MISMOS BOTONES QUE P-02, A PROPÓSITO: «Editar» sin icono y
                  «Eliminar» con tacho. Las dos tablas hacen lo mismo y deben leerse
                  igual; inventar aquí otra disposición obligaría a aprenderla dos veces.
                  Las dos clases están en el inventario de FASE5 §2.2 (regla 1).
                  ═══════════════════════════════════════════════════════════════════
                */
                const acceso = accesoAlOperativo(operativo, user?.rolCodes ?? []);
                const motivoAjeno = motivoDeSoloLectura(
                  acceso,
                  operativo.creadoPorRol,
                );

                /*
                  QUIEN NO PUEDE, LO VE Y SABE POR QUÉ (regla 6). No se le quitan los
                  botones: se apagan con el motivo en `title`, que es lo que ya hacen los
                  otros dos bloqueos de esta misma pantalla. Ocultarlos produciría la
                  sorpresa de no encontrar una acción que en la fila de al lado sí está.
                */
                const impedido = bloqueado || procesando || motivoAjeno !== null;
                const motivo =
                  motivoAjeno ??
                  (bloqueado
                    ? "La ventana de carga está cerrada o el cuadro fue cerrado."
                    : undefined);

                return (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      /*
                        SUBE AL FORMULARIO, NO ABRE UN PANEL, desde el 2026-09-01 por la
                        tarde. La corrección ocurre arriba, en el mismo formulario con el
                        que se registra.
                      */
                      onClick={() => abrirEdicion(operativo)}
                      disabled={impedido}
                      title={motivo}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => setPorRetirar(operativo)}
                      disabled={impedido}
                      title={motivo}
                    >
                      {/*
                        El icono acompaña, no sustituye (regla 13). Sin `aria-label` y sin
                        color propio: FontAwesome ya pone `aria-hidden`, y el rojo lo pone
                        `text-error` del botón, que el icono hereda por `currentColor`.
                      */}
                      <Iconos nombre="eliminar" />
                      Eliminar
                    </button>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/*
        PER-06. El mismo panel de P-02, en modo solo-personal: todo llega en lectura menos
        la asignación de gente, y el botón de guardar **no se pinta** —lo decide el propio
        `FormularioOperativo`—, porque el personal se guarda en cada clic y no hay nada
        que enviar al final.

        ═══════════════════════════════════════════════════════════════════════════════
        Y DESDE EL 2026-09-01 POR LA TARDE, **SOLO** EN MODO APORTE.

        Lo propio se corrige arriba, en el formulario de captura. Aquí el panel sigue
        siendo lo correcto porque en aporte ese formulario ni siquiera se pinta: no hay
        captura con la que compartirlo, el operativo es de otro departamento y llega
        entero en lectura menos el personal.

        Por eso `soloPersonal` ya no se deriva de `esAporte` sino que es `true`: dentro de
        esta rama son lo mismo, y dejarlo escrito como condición insinuaría que el panel
        puede pintar aquí un operativo propio, que es justo lo que dejó de hacer.
        ═══════════════════════════════════════════════════════════════════════════════
      */}
      {(esAporte || agregandoAPatrulla) && enEdicion && (
        <PanelEdicionOperativo
          operativo={enEdicion}
          catalogos={catalogos.catalogos}
          puntos={catalogos.puntos}
          cargandoPuntos={catalogos.cargandoPuntos}
          onZonalesElegidas={(zonalesIds) => {
            void catalogos.cargarPuntosDeZonales(zonalesIds);
          }}
          candidatos={candidatos}
          cargandoPersonal={cargandoPersonal}
          onAgregarPersona={(persona) => void agregarPersonaAlOperativo(persona)}
          onRetirarPersona={(funcionarioId) =>
            void retirarPersonaDelOperativo(funcionarioId)
          }
          avisoPersonal={avisoPersonal}
          confirmacionPersonal={confirmacionPersonal}
          bloqueado={bloqueado}
          /*
            SOLO PERSONAL: el operativo es de otro departamento y PER-08 dice que aportar
            personal no es tener el formulario.
          */
          soloPersonal
          guardando={guardando || procesando}
          /*
            NO HAY NADA QUE ENVIAR AL FINAL. Cada persona se guarda en su clic, y con
            `soloPersonal` el botón ni se pinta; el manejador está por contrato.
          */
          onGuardar={() => undefined}
          onCancelar={cerrarEdicion}
        />
      )}

      {/* Caso 2 de CU-03: la confirmación nombra el operativo, no pregunta en abstracto. */}
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
