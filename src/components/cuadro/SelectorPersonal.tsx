/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: SelectorPersonal.tsx
 * Responsabilidad: Elegir personal, con el veredicto de cada persona a la vista.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CADA PERSONA LLEGA CON SU VEREDICTO · PV-37, RESUELTO EL 2026-08-11.
 *
 * `GET /personal/elegible` devuelve **todos** los candidatos del formulario, con
 * `elegible` y, si no lo es, el motivo redactado. Quien no puede salir aparece
 * deshabilitado y con su explicación, en lugar de desaparecer.
 *
 * Esa desaparición era la pérdida que el análisis quiso evitar: una persona que falta
 * sin decir por qué obliga a levantar el teléfono, que es el canal que este sistema
 * existe para reemplazar. Entre el 07 y el 11 de agosto se ofreció «lo que el servidor
 * ofrece» —solo los aptos— porque el endpoint no daba más; ahora sí lo da.
 *
 * EL MOTIVO SE MUESTRA TAL CUAL, sin reescribirlo: lo redacta el servidor, que es quien
 * conoce la regla. Duplicar aquí el texto dejaría dos versiones que acabarían diciendo
 * cosas distintas de la misma norma.
 *
 * QUE UNA AUSENCIA NO DIGA SU CAUSA ES DELIBERADO. El servidor informa de que la persona
 * no está disponible y nunca de si es reposo médico o calamidad doméstica.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL TELÉFONO NO SE DIGITA (RN-34): viene del maestro y viaja en el `title` del
 * distintivo de cada persona ya agregada.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTÁ HECHO PARA TREINTA, NO PARA TRES. 2026-08-26.
 *
 * Quien usa esta pantalla es un operador de central que registra decenas de operativos al
 * día, y un operativo de patrulla lleva más de treinta efectivos. Con un buscador que solo
 * miraba el nombre y una lista de una columna, asignar treinta eran treinta viajes al
 * ratón.
 *
 * Cuatro cosas, y todas van hacia lo mismo —no levantar las manos del teclado—:
 *
 * · **Filtro por área**, en AND con la búsqueda, con el conteo de cada una.
 * · **`Enter` asigna** al primer visible elegible y limpia la búsqueda.
 * · **«Asignar visibles»** vacía de una vez lo que el filtro dejó a la vista.
 * · **La búsqueda mira nombre, área y cargo**, y compara sin tildes.
 *
 * LO ÚLTIMO ERA UN DEFECTO, NO UNA MEJORA. `texto.util.ts` existe justamente para esto
 * y su cabecera lo dice con el ejemplo exacto: «sin esto, "redrovan" no encontraría
 * "REDROVÁN" y el filtro parecería roto». `SelectorTokens` —el hermano, en el mismo
 * formulario— sí la importaba; aquí no, y eran dos controles contiguos con dos
 * comportamientos de búsqueda distintos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useId,
  useMemo,
  useRef,
  useState,
  type FC,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";

import BotonRepartoCarga from "./BotonRepartoCarga.tsx";
import RepartoCarga, { type ModoReparto } from "./RepartoCarga.tsx";
import ComboTramiteInspeccion from "./ComboTramiteInspeccion.tsx";
import { useTramitesInspeccion } from "../../hooks/useTramitesInspeccion.ts";
import Boton from "../common/Boton.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import Iconos from "../common/Iconos.tsx";
import MensajeModal from "../common/MensajeModal.tsx";
import Paginacion from "../common/Paginacion.tsx";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../../interfaces/Personal.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import {
  comoHoraConMeridiano,
  comoHoraInstitucional,
  cruzaMedianoche,
} from "../../utils/horario.util.ts";
import {
  compararPorCarga,
  conteoSemaforo as contarSemaforo,
  cuantosCompletar,
  hayCargaCalculada,
  NOMBRE_AREA,
  turnoDePrimera,
} from "../../utils/personal.util.ts";
import { motivoHorarioPersona } from "../../utils/politicasOperativo.util.ts";
import { normalizar } from "../../utils/texto.util.ts";
import EtiquetaCarga from "../common/EtiquetaCarga.tsx";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

/** Persona ya agregada al operativo en construcción. */
export type PersonaAgregada = {
  funcionarioId: number;
  nombre: string;
  telefono: string | null;
  /**
   * Horario propio de la persona (2026-09-08, RN-66). En el registro es OBLIGATORIO —el
   * operativo ya no tiene horario propio y lo toma de aquí—; se capturan donde llega
   * `onCambiarHorario`. En edición/aporte no se editan y pueden ir vacías.
   */
  horaInicio?: string;
  horaFin?: string;
  /**
   * Área del personal. Se conserva para mostrarla y filtrarla; ya no gobierna la cantidad
   * (eso pasó al formulario, ver `cantidad`). Opcional porque en aporte no se necesita.
   */
  area?: AreaPersonal;
  /**
   * VARIOS OPERATIVOS POR PERSONA (2026-09-10). Solo en el formulario que lo admite (form 8):
   * cada persona genera SUS PROPIOS `cantidad` operativos independientes, todos con SU MISMA
   * hora general (desde 2026-09-14 el horario ya NO se segmenta). Por defecto 1. Solo en el ALTA.
   */
  cantidad?: number;
  /**
   * Si quien edita puede RETIRAR a esta persona. Por defecto sí. En el modo aporte (Form 4 ECU),
   * el departamento que aporta solo maneja SU propio personal —el de Instrucción—; el del dueño
   * del formulario llega en lectura, sin «×». 2026-09-18. El servidor lo reafirma con un 403.
   */
  editable?: boolean;
  /**
   * Código del trámite de Inspección elegido para esta persona (2026-10-07). `null`/ausente = sin
   * trámite. Solo para inspectores; el servidor vuelve a comprobarlo contra Inspección al guardar.
   */
  tramiteCodigo?: string | null;
};

/** Áreas de inspector: solo a ellas se les consulta el trámite (el servidor lo reafirma). */
const AREAS_INSPECTOR: readonly AreaPersonal[] = ["GENERAL", "TECNICO"];

type SelectorPersonalProps = {
  candidatos: PersonaElegible[];
  cargando: boolean;
  agregadas: PersonaAgregada[];
  onAgregar: (persona: PersonaElegible) => void;
  onRetirar: (funcionarioId: number) => void;
  deshabilitado: boolean;
  /** Aviso del servidor tras un `409`. Se muestra tal cual. */
  avisoRechazo: string | null;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * SI EL BLOQUE LLEVA ASTERISCO. 2026-09-02.
   *
   * El personal pasó a ser obligatorio y la etiqueta no lo decía: este componente pinta su
   * propio `<label>` y no pasa por `CampoEnvoltura`, que es quien dibuja el asterisco en
   * los demás campos. El formulario rechazaba el envío por algo que no estaba marcado.
   *
   * LLEGA COMO PROPIEDAD Y NO SE DA POR SUPUESTO, porque **no siempre lo es**: en el modo
   * aporte no hay botón de guardar —cada persona se escribe en su clic— y un asterisco
   * anunciaría una exigencia que allí no existe.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  obligatorio?: boolean;
  /**
   * TURNO PROPIO POR PERSONA (2026-09-08). Cuando llega, la bandeja pasa a dos columnas
   * alineadas —persona a la izquierda, horario a la derecha— y cada persona gana dos
   * selectores de hora (Inicio/Fin) para cumplir un turno distinto al del operativo dentro
   * del mismo operativo. Sin esta función, la bandeja es la de siempre (distintivos).
   */
  onCambiarHorario?: (
    funcionarioId: number,
    horaInicio: string,
    horaFin: string,
  ) => void;
  /** Opciones de hora (`horasSeleccionables()`), solo si se editan turnos por persona. */
  horasHorario?: string[];
  /**
   * VARIOS OPERATIVOS POR PERSONA (2026-09-10), SOLO en el formulario que lo admite (form 8).
   * Cuando es true, la bandeja con horario suma una tercera columna «Cantidad de operativos»
   * por persona. Cada persona genera sus propios N operativos independientes.
   */
  permiteCantidadPorPersona?: boolean;
  /** Fija la cantidad de operativos de una persona. Solo con `permiteCantidadPorPersona`. */
  onCambiarCantidad?: (funcionarioId: number, cantidad: number) => void;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * QUE SÍ SE GUARDÓ, DICHO EN PALABRAS. 2026-09-01.
   *
   * Solo tiene sentido donde cada persona se escribe **en el acto** —el modo aporte de
   * P-01 y P-02—, no al componer un operativo nuevo: allí el token que aparece en la
   * bandeja es todo lo que ha pasado, y anunciar un guardado que aún no ocurrió mentiría.
   *
   * POR QUÉ HACE FALTA, si la persona ya se ve en la bandeja: porque ahí se vería igual
   * si la petición hubiera fallado y el error se hubiera perdido. Quien aporta a un
   * formulario ajeno no vuelve a esa pantalla a comprobarlo —la abrió para poner a una
   * persona y se va—, así que el único momento en que puede saberlo es éste.
   *
   * VA JUNTO AL RECHAZO Y NO ARRIBA, por el mismo motivo que aquél: es donde está
   * mirando quien acaba de pulsar.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  confirmacion?: string | null;
  /**
   * BANDEJAS SIN TOPE (2026-09-30). Por defecto las bandejas de asignados llevan tope de alto con
   * scroll propio (regla 14, el registro corto). Dentro del cajón de edición de P-02 —que ya
   * desplaza— se APLANAN (sin `max-h`/scroll) para no anidar scrolls. P-01 no lo pasa: conserva el tope.
   */
  bandejaSinTope?: boolean;
  /**
   * LISTA COMPACTA DE ASIGNADOS (Fase C, 2026-09-30). SOLO para el cajón de edición de P-02. En
   * vez de las bandejas de distintivos (P-01) o de las dos columnas de horario, el personal ya
   * asignado se pinta como una LISTA de una columna: cada persona con su nombre, unidad·cargo, su
   * distintivo de carga y «Sugerido», un botón «Quitar» y —cuando se editan turnos
   * (`onCambiarHorario`)— un «Cambiar turno» que despliega dos horas en línea. Es donde el guardado
   * es inmediato (asignar/retirar/turno son `PATCH`/`POST`/`DELETE` al vuelo), así que la cabecera
   * lo dice en palabras. P-01 y el adicional NO lo pasan: conservan sus bandejas.
   */
  listaCompacta?: boolean;
  /**
   * SOLO en `listaCompacta`: si asignar/retirar/turno se guardan al instante (edición de P-02) o no
   * (el adicional, cuyo personal entra con él al registrar). Gobierna el rótulo «Se guarda al
   * instante» de la cabecera: no se pinta cuando el guardado es diferido, para no mentir (regla 6).
   */
  guardadoInmediato?: boolean;
  /**
   * EN EL CAJÓN: la etiqueta «Personal asignado» la pone la cabecera de la sección
   * (`app-section-heading`), así que aquí se oculta su texto para no repetirla. Los controles del
   * encabezado (el botón «Ver reparto de carga») se conservan.
   */
  ocultarEtiqueta?: boolean;
  /**
   * REPARTO DE CARGA — CONTENEDOR (2026-10-01). Si el selector vive DENTRO de un cajón de edición
   * (`enCajon`), el reparto se abre como una VISTA del mismo cajón con «← Volver al operativo»; fuera
   * (alta de P-01), como un `DrawerLateral` aparte con «Listo». El contenido es el mismo (`RepartoCarga`).
   */
  repartoEnCajon?: boolean;
  /** Subtítulo del `DrawerLateral` del reparto en el alta (p. ej. «<formulario> · semana N»). */
  repartoSubtitulo?: string;
  /**
   * ALTA EN UNA COLUMNA CON HORARIO INLINE (2026-10-01). En el ALTA de P-01 la lista pasa a una
   * columna (como el cajón: candidatos con «+ Agregar», filtros en pestañas, contador único), PERO
   * el horario se captura POR PERSONA con los dos campos de hora SIEMPRE VISIBLES inline (regla 14 /
   * RN-66), no detrás de «Cambiar turno». Con `horarioInline` la bandeja de asignados es la de
   * horario (dos/tres columnas por fila) en vez de la lista compacta de «Cambiar turno»; además el
   * verbo de las acciones es «Agregar» (borrador) y aparece la nota de borrador. En el cajón de
   * EDICIÓN es false: allí el turno se cambia al vuelo con «Cambiar turno».
   */
  horarioInline?: boolean;
  /**
   * TRÁMITE DE INSPECCIÓN POR INSPECTOR (2026-10-07). Con la fecha de la jornada y el manejador, cada
   * inspector asignado gana un combo «Trámite de Inspección» con sus trámites del día en el sistema
   * de Inspección. Sin ellos —P-13, aporte— no se consulta nada.
   */
  fechaTramites?: string | null;
  onCambiarTramite?: (funcionarioId: number, codigoTramite: string | null) => void;
  /**
   * Si el combo del trámite va apagado. Por defecto, lo mismo que `deshabilitado`. Se separa porque
   * en la edición del form 8 el PERSONAL queda bloqueado (identificadores ya generados) pero el
   * trámite sí se puede corregir: no cambia ningún código.
   */
  tramiteDeshabilitado?: boolean;
  /** Form 8 por lote: el combo avisa que el trámite se aplica a todas las copias de la persona. */
  tramitePorLote?: boolean;
  /**
   * REPARTO CONTROLADO DESDE FUERA (2026-10-16, bloque 3). En la tarjeta «Personal y horario» el
   * botón «Ver reparto de carga» va en la cabecera de la tarjeta, que pinta `FormOperativo`; con
   * `onCambiarVerReparto` el selector no pinta su propio botón y solo abre/cierra el reparto según
   * `verReparto`. `refBotonReparto` es ese botón, para devolverle el foco al volver.
   */
  verReparto?: boolean;
  onCambiarVerReparto?: (abrir: boolean) => void;
  refBotonReparto?: RefObject<HTMLButtonElement | null>;
  /** Se intentó registrar sin personal: «0 de M efectivos» pasa a rojo y lo dice (lista compacta). */
  faltaTrasIntento?: boolean;
  /**
   * La persona que el servidor acaba de rechazar (`detalles.funcionarioId`, R2): su motivo se pinta
   * BAJO su horario en la franja de seleccionados, no arriba del bloque.
   */
  idPersonaRechazada?: number | null;
  /**
   * CUPO REAL de efectivos, si lo hay (R4). Con cupo, «+ Agregar» se apaga con «Cupo completo» al
   * llenarlo y «Completar con N» no pasa de los cupos libres. Hoy ningún operativo declara un número
   * exigido de efectivos, así que nadie lo pasa: no se inventa.
   */
  cupo?: number | null;
};

const SelectorPersonal: FC<SelectorPersonalProps> = ({
  candidatos,
  cargando,
  agregadas,
  onAgregar,
  onRetirar,
  deshabilitado,
  avisoRechazo,
  confirmacion = null,
  obligatorio = false,
  onCambiarHorario,
  horasHorario = [],
  permiteCantidadPorPersona = false,
  onCambiarCantidad,
  bandejaSinTope = false,
  listaCompacta = false,
  guardadoInmediato = false,
  ocultarEtiqueta = false,
  repartoEnCajon = false,
  repartoSubtitulo,
  horarioInline = false,
  fechaTramites = null,
  onCambiarTramite,
  tramiteDeshabilitado,
  tramitePorLote = false,
  verReparto: verRepartoControlado,
  onCambiarVerReparto,
  refBotonReparto,
  faltaTrasIntento = false,
  idPersonaRechazada = null,
  cupo = null,
}) => {
  // El verbo de las acciones de asignación: «Agregar» en el borrador del alta, «Asignar» al editar.
  const verboAsignar = horarioInline ? "Agregar" : "Asignar";
  const [busqueda, setBusqueda] = useState("");
  // Ventana de «reparto de carga»: visión global de las dos señales del formulario. 2026-09-29.
  // Desde el 2026-10-16 puede gobernarla quien pinta el botón (la cabecera de la tarjeta).
  const [verRepartoLocal, setVerRepartoLocal] = useState(false);
  const repartoControlado = onCambiarVerReparto !== undefined;
  const verReparto = repartoControlado ? Boolean(verRepartoControlado) : verRepartoLocal;
  const setVerReparto = (abrir: boolean) => {
    if (onCambiarVerReparto) onCambiarVerReparto(abrir);
    else setVerRepartoLocal(abrir);
  };
  // Para devolver el foco al botón «Ver reparto de carga» al cerrar la vista del cajón.
  const botonRepartoPropio = useRef<HTMLButtonElement>(null);
  const botonRepartoRef = refBotonReparto ?? botonRepartoPropio;
  // «▸ No disponibles (N)»: plegado por omisión, con su propia página (lista compacta).
  const [verNoDisponibles, setVerNoDisponibles] = useState(false);
  const [paginaNoDisponibles, setPaginaNoDisponibles] = useState(0);
  // Id del `<datalist>` de horas, único por instancia (P-01 y el panel de aporte conviven). 2026-09-21.
  const idHoras = useId();

  // TRÁMITES DE INSPECCIÓN (2026-10-07): una consulta para todos los inspectores asignados. Quien
  // no trae área (edición antigua) se consulta igual: el servidor decide si es inspector.
  const idsInspectores = useMemo(
    () =>
      onCambiarTramite
        ? agregadas
            .filter(
              (persona) =>
                persona.area === undefined ||
                AREAS_INSPECTOR.includes(persona.area),
            )
            .map((persona) => persona.funcionarioId)
        : [],
    [agregadas, onCambiarTramite],
  );
  const tramites = useTramitesInspeccion(fechaTramites, idsInspectores);

  /** El combo del trámite de una persona, si es inspector y la pantalla lo ofrece. */
  const comboTramite = (persona: PersonaAgregada) => {
    if (!onCambiarTramite || !idsInspectores.includes(persona.funcionarioId)) {
      return null;
    }
    const suyos = tramites.porPersona.get(persona.funcionarioId);
    // Ya respondió el servidor y NO es inspector: no se ofrece nada.
    if (suyos && !suyos.esInspector) return null;
    return (
      <ComboTramiteInspeccion
        nombrePersona={persona.nombre}
        valor={persona.tramiteCodigo ?? null}
        tramites={suyos?.tramites ?? []}
        cargando={tramites.cargando}
        disponible={tramites.disponible}
        motivo={tramites.motivo}
        deshabilitado={
          (tramiteDeshabilitado ?? deshabilitado) || persona.editable === false
        }
        avisoLote={tramitePorLote}
        onCambiar={(codigo) => onCambiarTramite(persona.funcionarioId, codigo)}
      />
    );
  };
  // Un combo por persona, armado UNA vez por render (antes se armaba dos veces por fila).
  const combosTramite = new Map(
    agregadas.map((persona) => [persona.funcionarioId, comboTramite(persona)]),
  );

  /**
   * «QUITAR TODOS» PIDE CONFIRMAR EN EL CAJÓN (2026-10-01). En el cajón de edición la acción se
   * guarda al instante y retira a TODO el personal: vaciar sin preguntar es demasiado fácil. Fuera
   * del cajón (P-01, el alta) se conserva el comportamiento inmediato de siempre.
   */
  const [confirmandoQuitarTodos, setConfirmandoQuitarTodos] = useState(false);

  /**
   * El reparto solo tiene sentido si el servidor calculó las señales (llegan en los candidatos).
   * Sin ellas —contrato anterior, o lista vacía— el botón no se ofrece. El resumen del semáforo
   * (2026-10-05) son los MISMOS datos que pinta el reparto, contados por nivel.
   */
  const hayCarga = useMemo(() => hayCargaCalculada(candidatos), [candidatos]);
  const conteoSemaforo = useMemo(() => contarSemaforo(candidatos), [candidatos]);

  // ── Reparto de carga (2026-10-01) ────────────────────────────────────────────────
  // El modo solo cambia los TEXTOS del reparto; las acciones reusan onAgregar/onRetirar del selector.
  const modoReparto: ModoReparto = guardadoInmediato
    ? "inmediato"
    : repartoEnCajon
      ? "diferido"
      : "borrador";
  const idsAgregados = useMemo(
    () => agregadas.map((persona) => persona.funcionarioId),
    [agregadas],
  );
  const cuotaReparto = candidatos.find(
    (persona) => persona.cuotaJusta !== undefined,
  )?.cuotaJusta;
  // `RepartoCarga` agrega por id; el selector espera la persona completa.
  const agregarDesdeReparto = (id: number) => {
    const persona = candidatos.find((candidato) => candidato.id === id);
    if (persona) onAgregar(persona);
  };
  const cerrarReparto = () => setVerReparto(false);
  const volverDelReparto = () => {
    setVerReparto(false);
    // Devuelve el foco al botón que abrió la vista (§8 accesibilidad).
    requestAnimationFrame(() => botonRepartoRef.current?.focus());
  };

  /** Solo el formulario que lo admite (form 8) muestra la columna de cantidad por persona. */
  const conCantidad = Boolean(permiteCantidadPorPersona && onCambiarCantidad);

  /** Acota la cantidad tecleada al rango [1, 50]; vacío o NaN vuelve a 1. */
  const acotarCantidad = (texto: string): number => {
    const n = Number.parseInt(texto, 10);
    if (Number.isNaN(n)) return 1;
    return Math.min(50, Math.max(1, n));
  };

  /**
   * RETIRAR CON UN SOLO CLIC (2026-09-14). El «×» va pegado a los `<select>` nativos del
   * horario y a veces el PRIMER clic no retiraba: junto a un control nativo, ese clic se
   * consume —el desplegable abierto se cierra con él, o el `mousedown` mueve el foco y el
   * re-render deja al `mouseup` sin su nodo, de modo que el `click` no llega a dispararse—.
   *
   * Se dispara la remoción en `mousedown`, que es UN SOLO evento e inmune a esa carrera, con
   * `preventDefault` para no robar el foco; se conserva `onClick` para el teclado (Enter/Espacio,
   * que no emiten `mousedown`). La remoción es idempotente: si tras el `mousedown` la fila se
   * desmonta, el `click` ya no encuentra su nodo y no hay doble efecto.
   */
  const propsRetirar = (funcionarioId: number) => ({
    onMouseDown: (evento: ReactMouseEvent<HTMLButtonElement>) => {
      evento.preventDefault();
      onRetirar(funcionarioId);
    },
    onClick: () => onRetirar(funcionarioId),
  });

  /**
   * PÁGINA DE LA CAJA DE CANDIDATOS. Seis por página: en dos columnas son tres filas,
   * que es el tope que se pidió. Se pagina en vez de desplazar para que la caja no tenga
   * scroll propio dentro de un formulario que ya se desplaza por fuera.
   */
  const [paginaCandidatos, setPaginaCandidatos] = useState(0);
  // Desde el 2026-10-16 la tarjeta «Personal y horario» muestra OCHO (4 filas × 2); P-13 sigue con seis.
  const POR_PAGINA = listaCompacta ? 8 : 6;
  /** Área elegida en la fila de filtros. `null` es «Todas». */
  const [area, setArea] = useState<AreaPersonal | null>(null);

  /*
   * Cambiar el filtro —búsqueda o área— vuelve la caja a la primera página: la lista es
   * otra y quedarse en una página que ya no existe dejaría la vista en blanco. Se hace
   * en el propio manejador, no en un efecto, para no encadenar renders.
   */
  const filtrarPorBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPaginaCandidatos(0);
    setPaginaNoDisponibles(0);
  };

  const filtrarPorArea = (siguiente: AreaPersonal | null) => {
    setArea(siguiente);
    setPaginaCandidatos(0);
    setPaginaNoDisponibles(0);
  };

  /**
   * Quien todavía no está asignado. Es la base de todo lo demás: de aquí salen los
   * conteos por área y, tras aplicar los dos filtros, la lista visible.
   *
   * SE ORDENA POR CARGA (`compararPorCarga`): el personal se ve siempre de menor a mayor carga
   * —carga baja, luego media, luego alta—, con los elegibles primero, para repartir de forma
   * equitativa. Los filtros y la paginación conservan ese orden (solo recortan), así que basta
   * ordenar aquí. El servidor no reordena: es advisory (ver `personal-elegible.service.ts`).
   */
  const disponibles = useMemo(() => {
    const yaAgregadas = new Set(
      agregadas.map((persona) => persona.funcionarioId),
    );

    // Orden de la lista (2026-10-01): SUGERIDOS primero, luego menor carga y, a igualdad, alfabético.
    // Los sugeridos son los que están bajo su cuota —a quienes conviene repartir—, así que encabezan.
    return candidatos
      .filter((persona) => !yaAgregadas.has(persona.id))
      .sort((a, b) => {
        if (Boolean(a.sugerido) !== Boolean(b.sugerido)) {
          return a.sugerido ? -1 : 1;
        }
        const porCarga = compararPorCarga(a, b);
        if (porCarga !== 0) return porCarga;
        return nombreDePersona(a).localeCompare(nombreDePersona(b));
      });
  }, [candidatos, agregadas]);

  /**
   * Las áreas que de verdad hay entre los candidatos, con cuántos quedan en cada una.
   *
   * SE CUENTAN LOS DISPONIBLES, no todos los candidatos: el número baja según se asigna,
   * y eso es exactamente lo que el operador necesita saber —«me faltan tres de Técnico»—.
   * Un conteo fijo sobre el total diría lo mismo con la lista ya vacía.
   *
   * Y SE TOMAN DE LOS DATOS, no del enumerado completo: pintar «Instrucción (0)» en un formulario
   * que no admite esa área es ofrecer un filtro que no filtra nada.
   */
  const areas = useMemo(() => {
    const cuenta = new Map<AreaPersonal, number>();

    for (const persona of disponibles) {
      cuenta.set(persona.area, (cuenta.get(persona.area) ?? 0) + 1);
    }

    return [...cuenta.entries()].sort(([una], [otra]) =>
      NOMBRE_AREA[una].localeCompare(NOMBRE_AREA[otra]),
    );
  }, [disponibles]);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);

    return disponibles
      .filter((persona) => area === null || persona.area === area)
      .filter((persona) => {
        if (texto === "") return true;

        /*
          SE BUSCA SOBRE LO QUE LA FILA ENSEÑA, y hasta hoy solo sobre el nombre: cada
          fila muestra área y cargo, pero escribir «operativos» o «supervisor» no
          encontraba nada. El marcador decía «Buscar por apellido…» y era la única parte
          honesta del control.

          El área entra dos veces —el código del enumerado y su nombre en español— porque
          el operador puede escribir cualquiera de los dos y ninguno es más correcto.
        */
        const donde = normalizar(
          [
            nombreDePersona(persona),
            persona.area,
            NOMBRE_AREA[persona.area],
            persona.cargo ?? "",
          ].join(" "),
        );

        return donde.includes(texto);
      });
  }, [busqueda, area, disponibles]);

  /** Los que «Asignar visibles» agregaría: los de la lista que además pueden salir. */
  const asignables = useMemo(
    () => visibles.filter((persona) => persona.elegible),
    [visibles],
  );

  /** ¿Todo el personal es de la misma unidad? Entonces no se repite en cada tarjeta ni en pestañas. */
  const unaSolaUnidad = useMemo(
    () => new Set(candidatos.map((persona) => persona.area)).size <= 1,
    [candidatos],
  );

  /**
   * ASIGNA EL PRIMER ELEGIBLE Y LIMPIA LA BÚSQUEDA.
   *
   * `preventDefault` no es opcional: sin él, `Enter` en un `input` dentro de un `<form>`
   * **envía el formulario** con el operativo a medio capturar. Está advertido en
   * `SelectorTokens.alTeclear`, que resolvió lo mismo en este mismo formulario; se
   * replica el patrón en lugar de inventar otro.
   *
   * SOLO ELEGIBLES. Tomar el primero de la lista sin mirar asignaría a quien el servidor
   * acaba de decir que no puede salir, y el rechazo llegaría después, al guardar.
   */
  const alTeclear = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (deshabilitado || evento.key !== "Enter") return;

    evento.preventDefault();

    const primero = asignables[0];
    if (!primero) return;

    onAgregar(primero);
    filtrarPorBusqueda("");
  };

  /** Agrega de una vez lo que el filtro dejó a la vista. No duplica: salen de `visibles`. */
  const asignarVisibles = () => {
    for (const persona of asignables) onAgregar(persona);
  };

  /**
   * Las asignadas que quien edita puede retirar. En el modo aporte, solo las de su propio
   * departamento; las del dueño del formulario llegan en lectura (`editable === false`), así
   * que ni «Quitar todos» ni la «×» las tocan. Por defecto todas son retirables. 2026-09-18.
   */
  const retirables = useMemo(
    () => agregadas.filter((persona) => persona.editable !== false),
    [agregadas],
  );

  const quitarTodos = () => {
    for (const persona of retirables) onRetirar(persona.funcionarioId);
  };

  /**
   * La página que se muestra de la caja de candidatos, ACOTADA al rango válido. Al
   * asignar a alguien sale de `visibles` y la última página puede encogerse; en vez de
   * dejar la vista en blanco, se cae a la última que sí existe. Se deriva —no se corrige
   * con un efecto— para que nunca haya un fotograma con la página fuera de rango.
   */
  /*
    LISTA COMPACTA (2026-10-16): la caja de DISPONIBLES lleva solo a quien puede salir; quien no,
    va aparte en «No disponibles», plegado, con su motivo. P-13 (no compacta) los sigue mezclando.
  */
  const paginables = listaCompacta ? asignables : visibles;
  const noDisponibles = useMemo(
    () => (listaCompacta ? visibles.filter((persona) => !persona.elegible) : []),
    [listaCompacta, visibles],
  );
  const totalPaginasCandidatos = Math.max(
    1,
    Math.ceil(paginables.length / POR_PAGINA),
  );
  const paginaCandidatosValida = Math.min(
    paginaCandidatos,
    totalPaginasCandidatos - 1,
  );
  const candidatosVisibles = paginables.slice(
    paginaCandidatosValida * POR_PAGINA,
    (paginaCandidatosValida + 1) * POR_PAGINA,
  );
  const paginaNoDisponiblesValida = Math.min(
    paginaNoDisponibles,
    Math.max(0, Math.ceil(noDisponibles.length / POR_PAGINA) - 1),
  );
  const noDisponiblesVisibles = noDisponibles.slice(
    paginaNoDisponiblesValida * POR_PAGINA,
    (paginaNoDisponiblesValida + 1) * POR_PAGINA,
  );

  /** Cupo real lleno (R4): «+ Agregar» se apaga con «Cupo completo». Sin cupo, nunca. */
  const cupoCompleto = cupo !== null && agregadas.length >= cupo;
  /** «Completar con N de menor carga»: hasta cuatro elegibles, y no más que los cupos libres. */
  const nCompletar = cuantosCompletar(asignables.length, agregadas.length, cupo);
  const completar = () => {
    for (const persona of asignables.slice(0, nCompletar)) onAgregar(persona);
  };
  const motivoCompletar = cupoCompleto
    ? "Cupo completo"
    : nCompletar === 0
      ? "No hay personal disponible para completar"
      : null;

  /**
   * El detalle de un candidato —nombre, unidad·cargo, distintivos de carga y, si no es elegible,
   * su motivo— es el MISMO en las dos presentaciones (tarjeta-botón de P-01 y fila con «+ Asignar»
   * del cajón). Se extrae para no duplicarlo entre las dos ramas.
   */
  const detalleCandidato = (persona: PersonaElegible) => (
    <>
      <span className="text-sm font-medium">{nombreDePersona(persona)}</span>
      <span className="text-xs text-app-muted">
        {NOMBRE_AREA[persona.area]}
        {persona.cargo ? ` · ${persona.cargo}` : ""}
      </span>
      {persona.nivelFatiga && (
        <span className="mt-0.5 flex flex-wrap gap-1">
          <EtiquetaCarga nivel={persona.nivelFatiga} />
          {persona.sugerido && (
            <span className="badge badge-primary badge-sm">Sugerido</span>
          )}
        </span>
      )}
      {!persona.elegible && persona.motivo && (
        <span className="text-xs text-warning">{persona.motivo}</span>
      )}
    </>
  );

  // REPARTO EN CAJÓN: una VISTA del mismo cajón de edición (no un drawer aparte), con «← Volver».
  if (verReparto && repartoEnCajon) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Boton
          variante="enlace"
          tamano="sm"
          icono="atras"
          className="self-start"
          onClick={volverDelReparto}
        >
          Volver al operativo
        </Boton>
        <RepartoCarga
          personas={candidatos}
          cuota={cuotaReparto}
          idsAgregados={idsAgregados}
          onAgregar={agregarDesdeReparto}
          onQuitar={onRetirar}
          modo={modoReparto}
        />
      </div>
    );
  }

  /*
    REPARTO FUERA DEL CAJÓN (alta de P-01): drawer lateral aparte. Dentro del cajón se abre como
    VISTA (arriba), no aquí, para no anidar dos drawers.
  */
  const repartoAparte = !repartoEnCajon && (
    <DrawerLateral
      abierto={verReparto}
      ancho="lg"
      modo="lectura"
      titulo="Reparto de carga"
      subtitulo={repartoSubtitulo ?? "Personal del formulario"}
      onCerrar={cerrarReparto}
      estadoPie={{
        tono: "pendiente",
        texto:
          idsAgregados.length > 0
            ? `${idsAgregados.length} agregados al formulario · sin registrar`
            : "Aún no agrega personal",
      }}
      onAccionLectura={cerrarReparto}
    >
      <RepartoCarga
        personas={candidatos}
        cuota={cuotaReparto}
        idsAgregados={idsAgregados}
        onAgregar={agregarDesdeReparto}
        onQuitar={onRetirar}
        modo={modoReparto}
      />
    </DrawerLateral>
  );

  /** El botón del reparto, solo si nadie más lo pinta (la cabecera de la tarjeta) y hay carga. */
  const botonRepartoPropioVisible = hayCarga && !repartoControlado && (
    <BotonRepartoCarga
      ref={botonRepartoRef}
      onClick={() => setVerReparto(true)}
      expandido={verReparto}
      conteo={conteoSemaforo}
    />
  );

  /** Las horas sugeridas, compartidas por todos los campos de hora de esta instancia. */
  const listaDeHoras = onCambiarHorario && (
    <datalist id={idHoras}>
      {horasHorario.map((hora) => (
        <option
          key={hora}
          value={hora}
        >
          {comoHoraConMeridiano(hora)}
        </option>
      ))}
    </datalist>
  );

  /** El rechazo del servidor se pinta bajo la persona rechazada si está en la franja (R2). */
  const rechazoEnPersona =
    avisoRechazo !== null &&
    idPersonaRechazada !== null &&
    agregadas.some((persona) => persona.funcionarioId === idPersonaRechazada);

  /** El «+ Agregar» de un disponible: apagado con su motivo si no puede salir o el cupo está lleno. */
  const botonAgregar = (persona: PersonaElegible) => (
    <Boton
      variante="acento"
      tamano="sm"
      className="shrink-0"
      deshabilitado={deshabilitado}
      motivoDeshabilitado={
        !persona.elegible
          ? (persona.motivo ?? "No disponible")
          : cupoCompleto
            ? "Cupo completo"
            : null
      }
      onClick={() => onAgregar(persona)}
    >
      + {verboAsignar}
    </Boton>
  );

  /**
   * TARJETA COMPACTA DE UN CANDIDATO (2026-10-16): nombre en UNA línea (recortado, completo en el
   * `title`), «Cargo · N op. esta semana», la carga y «Sugerido», y el botón a la derecha. Si no
   * hay cargo, no se escribe nada en su lugar. El no disponible lleva su motivo en ámbar, tal cual
   * lo redacta el servidor (PV-37).
   */
  const tarjetaCandidato = (persona: PersonaElegible) => {
    const nombre = nombreDePersona(persona);
    const detalle = [
      unaSolaUnidad ? null : NOMBRE_AREA[persona.area],
      persona.cargo,
      persona.operativosAsignados !== undefined
        ? `${persona.operativosAsignados} op. esta semana`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <div
        key={persona.id}
        className={`flex items-center justify-between gap-2 rounded-box border border-base-300 p-2 ${
          persona.elegible ? "" : "bg-base-200"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium"
            title={nombre}
          >
            {nombre}
          </p>
          {detalle && (
            <p
              className="truncate text-xs text-app-muted"
              title={detalle}
            >
              {detalle}
            </p>
          )}
          {(persona.nivelFatiga || persona.sugerido) && (
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {persona.nivelFatiga && <EtiquetaCarga nivel={persona.nivelFatiga} />}
              {persona.sugerido && (
                <span className="badge badge-primary badge-sm whitespace-nowrap">
                  Sugerido
                </span>
              )}
            </span>
          )}
          {!persona.elegible && persona.motivo && (
            <p className="mt-0.5 text-xs text-warning">{persona.motivo}</p>
          )}
        </div>
        {botonAgregar(persona)}
      </div>
    );
  };

  /*
    ═══════════════════════════════════════════════════════════════════════════════
    LA TARJETA «PERSONAL Y HORARIO» (2026-10-16, bloque 3 del rediseño del registro). Es la que ven
    el alta de P-01 y el cajón de edición y del adicional (`FormOperativo` la pide en los tres).

      · «N de M efectivos» (M = los candidatos, o el cupo real si lo hay: no se inventa un número
        exigido) en naranja sin nadie, verde con gente y rojo si se intentó registrar sin personal;
        siempre con su icono y sus palabras (regla 6). A la derecha, el horario por defecto: el de la
        primera persona, que se copia a cada una que se agrega (`turnoDePrimera`).
      · SELECCIONADOS: franja punteada con cada persona, su horario editable y su «✕». El motivo de
        un horario mal escrito, y el rechazo del servidor para esa persona, van debajo de ella.
      · El buscador y «Completar con N de menor carga» (hasta 4, `cuantosCompletar`).
      · DISPONIBLES: solo quien puede salir, sugeridos primero y luego de menor a mayor carga, en dos
        columnas y de a 8. Al agregar, la persona sale y la página retrocede si queda vacía.
      · «▸ No disponibles (N)», plegado, con el motivo del servidor y el «+ Agregar» apagado.
    ═══════════════════════════════════════════════════════════════════════════════
  */
  if (listaCompacta) {
    const totalEfectivos = cupo ?? candidatos.length;
    const sinNadie = agregadas.length === 0;
    const tonoContador = sinNadie
      ? faltaTrasIntento
        ? "text-error"
        : "text-warning"
      : "text-success";
    const turnoBase = turnoDePrimera(agregadas);
    const textoHorarioBase =
      turnoBase.horaInicio && turnoBase.horaFin
        ? `Horario por defecto: ${comoHoraInstitucional(turnoBase.horaInicio)} a ${comoHoraInstitucional(turnoBase.horaFin)}`
        : "Horario por defecto: el de la primera persona que agregue";

    return (
      <div className="flex flex-col gap-3">
        {/* La cuenta y el horario por defecto. `aria-live` lo anuncia al agregar y al quitar. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${tonoContador}`}
          >
            <Iconos nombre={sinNadie ? "alerta" : "check"} />
            {agregadas.length} de {totalEfectivos} efectivos
            {sinNadie && faltaTrasIntento ? " · agregue al menos una persona" : ""}
          </span>
          <span className="flex items-center gap-2">
            {onCambiarHorario && (
              <span
                className="text-xs text-app-muted"
                title="Se copia a cada persona que agregue; puede cambiarlo en cada una."
              >
                {textoHorarioBase}
              </span>
            )}
            {botonRepartoPropioVisible}
          </span>
        </div>
        {guardadoInmediato && (
          <p
            role="status"
            className="text-xs text-app-muted"
          >
            Se guarda al instante: no necesita pulsar «Guardar cambios».
          </p>
        )}
        {repartoAparte}
        {listaDeHoras}

        {/* SELECCIONADOS. */}
        <div className="flex flex-col gap-2 rounded-box border border-dashed border-base-300 bg-base-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-app-label">
              Seleccionados ({agregadas.length})
            </p>
            {retirables.length > 1 && (
              <Boton
                variante="enlace"
                tamano="sm"
                deshabilitado={deshabilitado}
                onClick={() => setConfirmandoQuitarTodos(true)}
              >
                Quitar todos ({retirables.length})
              </Boton>
            )}
          </div>

          {sinNadie ? (
            <p className="text-sm text-app-muted">
              Aún no agrega personal. Use «+ Agregar» o «Completar con los de menor carga».
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {conCantidad && (
                <li
                  aria-hidden="true"
                  className="grid grid-cols-3 items-center gap-2 px-1"
                >
                  <span className="label-text">Persona</span>
                  <span className="label-text">Horario</span>
                  <span className="label-text">Cantidad de operativos</span>
                </li>
              )}
              {agregadas.map((persona) => {
                const inicio = persona.horaInicio ?? "";
                const fin = persona.horaFin ?? "";
                const escrito = inicio.length >= 5 && fin.length >= 5;
                const motivoHorario = escrito ? motivoHorarioPersona(inicio, fin) : null;
                const nocturno = escrito && !motivoHorario && cruzaMedianoche(inicio, fin);
                const rechazo =
                  rechazoEnPersona && persona.funcionarioId === idPersonaRechazada
                    ? avisoRechazo
                    : null;
                const retirar = persona.editable !== false && (
                  <Boton
                    variante="peligroTexto"
                    tamano="sm"
                    icono="cerrar"
                    aria-label={`Retirar a ${persona.nombre}`}
                    deshabilitado={deshabilitado}
                    {...propsRetirar(persona.funcionarioId)}
                  />
                );

                return (
                  <li
                    key={persona.funcionarioId}
                    className="flex flex-col gap-1"
                  >
                    <div
                      className={`grid ${conCantidad ? "grid-cols-3" : "grid-cols-2"} items-center gap-2`}
                    >
                      <span
                        className="badge badge-primary min-w-0 max-w-full"
                        title={
                          persona.telefono
                            ? `${persona.nombre} · ${persona.telefono}`
                            : persona.nombre
                        }
                      >
                        <span className="min-w-0 truncate">{persona.nombre}</span>
                      </span>

                      <div className="flex min-w-0 items-center gap-2">
                        {onCambiarHorario ? (
                          <>
                            <input
                              type="text"
                              list={idHoras}
                              aria-label={`Hora de inicio de ${persona.nombre}`}
                              aria-invalid={Boolean(motivoHorario) || undefined}
                              className="input input-bordered input-sm min-w-0"
                              placeholder="Inicio…"
                              value={inicio}
                              disabled={deshabilitado}
                              onChange={(evento) =>
                                onCambiarHorario(persona.funcionarioId, evento.target.value, fin)
                              }
                            />
                            <span
                              aria-hidden="true"
                              className="text-sm text-app-muted"
                            >
                              a
                            </span>
                            <input
                              type="text"
                              list={idHoras}
                              aria-label={`Hora de fin de ${persona.nombre}`}
                              aria-invalid={Boolean(motivoHorario) || undefined}
                              className="input input-bordered input-sm min-w-0"
                              placeholder="Fin…"
                              value={fin}
                              disabled={deshabilitado}
                              onChange={(evento) =>
                                onCambiarHorario(persona.funcionarioId, inicio, evento.target.value)
                              }
                            />
                          </>
                        ) : (
                          inicio &&
                          fin && (
                            <span className="text-xs text-app-muted">
                              Turno {inicio} a {fin}
                            </span>
                          )
                        )}
                        {!conCantidad && retirar}
                      </div>

                      {conCantidad && (
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="join">
                            <button
                              type="button"
                              aria-label={`Un operativo menos para ${persona.nombre}`}
                              // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                              className="join-item btn btn-sm"
                              disabled={deshabilitado || (persona.cantidad ?? 1) <= 1}
                              onClick={() =>
                                onCambiarCantidad?.(
                                  persona.funcionarioId,
                                  acotarCantidad(String((persona.cantidad ?? 1) - 1)),
                                )
                              }
                            >
                              −
                            </button>
                            <span
                              aria-label={`Cantidad de operativos de ${persona.nombre}`}
                              // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                              className="join-item btn btn-sm pointer-events-none w-16 text-center"
                            >
                              {persona.cantidad ?? 1}
                            </span>
                            <button
                              type="button"
                              aria-label={`Un operativo más para ${persona.nombre}`}
                              // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                              className="join-item btn btn-sm"
                              disabled={deshabilitado || (persona.cantidad ?? 1) >= 50}
                              onClick={() =>
                                onCambiarCantidad?.(
                                  persona.funcionarioId,
                                  acotarCantidad(String((persona.cantidad ?? 1) + 1)),
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                          {retirar}
                        </div>
                      )}
                    </div>

                    {motivoHorario && (
                      <p className="text-xs text-error">{motivoHorario}</p>
                    )}
                    {nocturno && (
                      <p className="text-xs text-app-muted">
                        Termina al día siguiente (cruza la medianoche).
                      </p>
                    )}
                    {rechazo && <AvisoEnLinea variante="error">{rechazo}</AvisoEnLinea>}
                    {combosTramite.get(persona.funcionarioId)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* El rechazo que no es de una persona de la franja, y la confirmación, encima de la lista. */}
        {avisoRechazo && !rechazoEnPersona && (
          <AvisoEnLinea variante="error">{avisoRechazo}</AvisoEnLinea>
        )}
        {confirmacion && <AvisoEnLinea variante="exito">{confirmacion}</AvisoEnLinea>}

        {/* El buscador y «Completar con N de menor carga». */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="busquedaPersonal"
            type="search"
            aria-label="Buscar personal"
            className="input input-bordered w-full"
            placeholder="Buscar por apellido, unidad o cargo…"
            value={busqueda}
            disabled={deshabilitado}
            onChange={(e) => filtrarPorBusqueda(e.target.value)}
            onKeyDown={alTeclear}
          />
          <Boton
            variante="secundario"
            tamano="sm"
            className="shrink-0"
            deshabilitado={deshabilitado}
            motivoDeshabilitado={motivoCompletar}
            title="Agrega a los disponibles que pueden salir, primero los sugeridos y luego los de menor carga."
            onClick={completar}
          >
            Completar con {nCompletar} de menor carga
          </Boton>
        </div>

        {/* PESTAÑAS DE UNIDAD solo si hay MÁS de una unidad; con una sola, filtrarían por nada. */}
        {!cargando && areas.length > 1 && (
          <div
            role="tablist"
            aria-label="Filtrar disponibles por unidad"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={area === null}
              disabled={deshabilitado}
              onClick={() => filtrarPorArea(null)}
              // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
              className={`btn btn-sm ${area === null ? "btn-primary" : "btn-ghost"}`}
            >
              Todas ({disponibles.length})
            </button>
            {areas.map(([codigo, cuantos]) => (
              <button
                key={codigo}
                type="button"
                role="tab"
                aria-selected={area === codigo}
                disabled={deshabilitado}
                onClick={() => filtrarPorArea(area === codigo ? null : codigo)}
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`btn btn-sm ${area === codigo ? "btn-primary" : "btn-ghost"}`}
              >
                {NOMBRE_AREA[codigo]} ({cuantos})
              </button>
            ))}
          </div>
        )}

        {/* DISPONIBLES. */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-app-muted">
            <span className="font-semibold text-app-label">
              Disponibles ({asignables.length})
            </span>{" "}
            · sugeridos primero, luego de menor a mayor carga
          </p>
          {cargando && (
            <p className="text-sm text-app-muted">Consultando personal disponible…</p>
          )}
          {!cargando && asignables.length === 0 && (
            <p className="text-sm text-app-muted">
              {busqueda.trim() !== "" || area !== null
                ? "No hay personal disponible que coincida con la búsqueda."
                : "No queda personal disponible."}
            </p>
          )}
          {!cargando && asignables.length > 0 && (
            <div
              data-rejilla="disponibles"
              className="grid grid-cols-1 gap-2 md:grid-cols-2"
            >
              {candidatosVisibles.map(tarjetaCandidato)}
            </div>
          )}
          {!cargando && asignables.length > POR_PAGINA && (
            <Paginacion
              page={paginaCandidatosValida}
              pageSize={POR_PAGINA}
              total={asignables.length}
              onPage={setPaginaCandidatos}
              etiqueta="efectivos"
            />
          )}
        </div>

        {/* NO DISPONIBLES, plegado al final. */}
        {!cargando && noDisponibles.length > 0 && (
          <div className="flex flex-col gap-2">
            <Boton
              variante="enlace"
              tamano="sm"
              icono={verNoDisponibles ? "desplegar" : "acordeon"}
              className="self-start"
              aria-expanded={verNoDisponibles}
              onClick={() => setVerNoDisponibles((antes) => !antes)}
            >
              No disponibles ({noDisponibles.length})
            </Boton>
            {verNoDisponibles && (
              <>
                <div
                  data-rejilla="no-disponibles"
                  className="grid grid-cols-1 gap-2 md:grid-cols-2"
                >
                  {noDisponiblesVisibles.map(tarjetaCandidato)}
                </div>
                {noDisponibles.length > POR_PAGINA && (
                  <Paginacion
                    page={paginaNoDisponiblesValida}
                    pageSize={POR_PAGINA}
                    total={noDisponibles.length}
                    onPage={setPaginaNoDisponibles}
                    etiqueta="efectivos"
                  />
                )}
              </>
            )}
          </div>
        )}

        <MensajeModal
          abierto={confirmandoQuitarTodos}
          variante="peligro"
          titulo={`¿Quitar a los ${retirables.length} asignados?`}
          mensaje={
            guardadoInmediato
              ? "Se retiran todos del operativo. Este cambio se guarda al instante."
              : "Se retiran todos del operativo. Puede volver a agregarlos antes de guardar."
          }
          textoPrincipal="Quitar todos"
          onPrincipal={() => {
            quitarTodos();
            setConfirmandoQuitarTodos(false);
          }}
          onSecundario={() => setConfirmandoQuitarTodos(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/*
        LA ETIQUETA LLEVA LA CUENTA, y no es adorno: con la bandeja acotada a cuatro filas
        el resto queda fuera de la vista, así que «cuántos llevo» dejó de poder contarse
        mirando. `aria-live="polite"` lo anuncia al asignar y al retirar sin interrumpir
        lo que el lector de pantalla esté diciendo.
      */}
      <div
        className={`flex items-center gap-2 ${
          ocultarEtiqueta ? "justify-end" : "justify-between"
        }`}
      >
        {!ocultarEtiqueta && (
        <label
          className="label"
          htmlFor="busquedaPersonal"
        >
          <span className="label-text">
            Personal asignado
            {/*
              MISMO ASTERISCO QUE `CampoEnvoltura`, hasta en el `aria-hidden`: es un signo
              visual, y quien no lo ve recibe la exigencia por otros dos caminos —el
              resumen de envío, que nombra «personal asignado» entre lo que falta, y el
              `alert` con `role="alert"` que aparece sobre este bloque al intentar enviar—.

              NO SE LE PONE `aria-required` AL BUSCADOR, aunque la etiqueta apunte a él:
              sería mentira. Lo obligatorio no es escribir en la búsqueda, es que la
              bandeja no quede vacía, y un lector de pantalla que anunciara «campo
              obligatorio» sobre la caja de buscar mandaría a teclear ahí.
            */}
            {obligatorio && (
              <span
                className="text-error ml-1"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </span>
        </label>
        )}

        {/*
          AQUÍ QUEDA EL CONTADOR; «QUITAR TODOS» BAJÓ CON LOS FILTROS. 2026-09-02.

          El botón vivía en este renglón, arriba del todo, y su pareja natural —«Asignar
          visibles»— está abajo, en la fila de filtros. Las dos acciones que operan sobre
          la lista entera estaban a dos alturas distintas de la pantalla, así que para
          decidir entre asignar de golpe o vaciar de golpe había que recorrerla con la
          vista. Ahora están juntas.

          El contador **no** se mueve: no es una acción, es el estado de la bandeja, y su
          sitio es junto al rótulo del bloque.
        */}
        {/*
          A LA DERECHA, LAS DOS PIEZAS DE ESTADO/ACCIÓN DEL BLOQUE: el botón que abre la visión
          global del reparto (solo si el servidor calculó las señales) y el contador de asignados.
        */}
        <div className="flex items-center gap-2">
          {botonRepartoPropioVisible}
          {agregadas.length > 0 && (
            <span
              aria-live="polite"
              className="badge badge-primary badge-sm"
            >
              {agregadas.length} asignados
            </span>
          )}
        </div>
      </div>

      {repartoAparte}

      {/*
        ═══════════════════════════════════════════════════════════════════════════════
        LA BANDEJA TIENE TOPE DESDE EL 2026-08-26. D-2.

        No lo tenía, y ése era el defecto: con más de treinta asignados —el caso real
        declarado— eran treinta distintivos apilados que empujaban hacia abajo todo lo que
        sigue, **incluido el botón de registrar**, que se iba de la vista.

        Un distintivo mide 24 px y con `gap-2` una fila ocupa 32 px: `max-h-32` deja ver
        cuatro filas y el resto se desplaza dentro de la caja. Se eligió esa clase porque
        **ya existe** en el proyecto —`SelectorTokens` la usa para su lista—; dos filas
        justas habrían pedido una altura que no está en el inventario (regla 1).
        ═══════════════════════════════════════════════════════════════════════════════
      */}
      {agregadas.length > 0 && !onCambiarHorario && (
        <div
          className={`flex flex-wrap gap-2 ${bandejaSinTope ? "" : "max-h-32 overflow-y-auto"}`}
        >
          {agregadas.map((persona) => (
            /*
              EL TELÉFONO SALE DEL ANCHO Y SE VA AL `title`. RN-34 lo llama dato de
              consulta, no de identificación: quien busca a alguien en esta bandeja lo
              busca por el nombre. Dentro del distintivo duplicaba su ancho, y con treinta
              distintivos eso es la diferencia entre dos filas y cinco.

              Va acompañado del nombre completo, no solo, para que el `title` se sostenga
              por sí mismo al leerlo.
            */
            <span
              key={persona.funcionarioId}
              /*
                `min-w-0` deja que el distintivo se encoja por debajo de su contenido
                cuando un nombre largo excede la fila; sin él, el distintivo se saldría
                del contenedor `flex-wrap` en vez de recortarse. El nombre va en su propia
                caja `min-w-0 truncate` para que el recorte lo sufra el texto, no la «×».
              */
              className="badge badge-primary gap-2 min-w-0"
              title={
                persona.telefono
                  ? `${persona.nombre} · ${persona.telefono}`
                  : persona.nombre
              }
            >
              <span className="min-w-0 truncate">{persona.nombre}</span>
              {/*
                LA «×» SOLO SI QUIEN EDITA PUEDE RETIRAR A ESTA PERSONA. En el aporte (Form 4
                ECU) el departamento que aporta ve al personal del dueño en LECTURA —sin «×»— y
                solo retira el suyo. 2026-09-18. El servidor lo reafirma con un 403.
              */}
              {persona.editable !== false && (
                /*
                  32 px (sm) y no 24 (D-9, 2026-08-26): la skill `pantallas-cuadro` pide evitar
                  objetivos pequeños en móvil, y aquí son treinta.
                */
                <Boton
                  variante="peligroTexto"
                  tamano="sm"
                  icono="cerrar"
                  aria-label={`Retirar a ${persona.nombre}`}
                  deshabilitado={deshabilitado}
                  {...propsRetirar(persona.funcionarioId)}
                />
              )}
            </span>
          ))}
        </div>
      )}

      {/*
        ═══════════════════════════════════════════════════════════════════════════════
        TURNO PROPIO POR PERSONA, EN DOS COLUMNAS. 2026-09-08.

        Cuando el operativo reúne varios horarios, cada persona es una FILA de DOS columnas
        alineadas: a la IZQUIERDA la persona —su nombre— y a la DERECHA el horario a elegir
        —los dos selectores, inicio–fin, con su «×» para retirar—. Todas las filas comparten
        el mismo reparto `grid grid-cols-2`, así que las dos columnas quedan alineadas de una
        fila a la siguiente en vez de bailar según el largo del nombre. Sustituye a la fila
        mixta en línea que había antes (nombre y selectores revueltos en un `flex-wrap`).

        DESDE RN-66 (2026-09-08) EL HORARIO ES OBLIGATORIO POR PERSONA: el operativo ya no
        tiene horario propio, así que cada asignado debe elegir su inicio y su fin —horas
        libres— y el vacío es un marcador («Inicio…»/«Fin…»), no «heredar». Al AGREGAR a
        alguien su turno arranca copiando el de la PRIMERA persona asignada —lo fija la
        página al construir la lista, no este componente—, y sigue editable aquí; la primera
        arranca vacía y hay que llenarla. `FormOperativo.validate` rechaza el envío
        mientras alguna persona no tenga las dos horas.

        Las clases son las del inventario: `grid grid-cols-2` (§2.2, el mismo reparto que
        «Hora inicio y fin») y `select select-bordered select-sm` para las horas.
        ═══════════════════════════════════════════════════════════════════════════════
      */}
      {agregadas.length > 0 && onCambiarHorario && (
        <>
          {/*
            CABECERA DE LAS DOS COLUMNAS. 2026-09-09. Sin ella no se percibía que la segunda
            columna es el horario que hay que ingresar; el rótulo «Horario*» —con el mismo
            asterisco de un campo obligatorio— lo deja claro. Queda FUERA del scroll, para que
            no se vaya al desplazar la lista. Mismo reparto `grid grid-cols-2` que las filas.
          */}
          <div
            className={`grid ${conCantidad ? "grid-cols-3" : "grid-cols-2"} items-center gap-2 px-1`}
          >
            <span className="label-text">Persona</span>
            <span className="label-text">
              Horario<span className="text-error ml-1">*</span>
            </span>
            {conCantidad && (
              <span className="label-text">
                Cantidad de operativos
              </span>
            )}
          </div>

          {/*
            Las opciones de hora (00:00–23:30, cada 30 min), compartidas por todos los campos de
            hora. Se teclea la hora y el navegador sugiere; el valor insertado es 24h («14:00») y el
            texto muestra su AM/PM como pista.
          */}
          <datalist id={idHoras}>
            {horasHorario.map((hora) => (
              <option
                key={hora}
                value={hora}
              >
                {comoHoraConMeridiano(hora)}
              </option>
            ))}
          </datalist>

          <div
            className={`flex flex-col gap-1 ${bandejaSinTope ? "" : "max-h-48 overflow-y-auto"}`}
          >
            {agregadas.map((persona) => (
              <div
                key={persona.funcionarioId}
                className={`grid ${conCantidad ? "grid-cols-3" : "grid-cols-2"} items-center gap-2`}
              >
                {/* Columna 1: la persona. */}
              <span
                className="badge badge-primary min-w-0 max-w-full"
                title={
                  persona.telefono
                    ? `${persona.nombre} · ${persona.telefono}`
                    : persona.nombre
                }
              >
                <span className="min-w-0 truncate">{persona.nombre}</span>
              </span>

              {/* Columna 2: el horario a elegir, y la «×» para retirar. */}
              <div className="flex min-w-0 items-center gap-2">
                {/*
                  ENTRADA DE HORA ESCRIBIBLE (2026-09-21). Antes eran dos `<select>` de 48 opciones
                  cada uno; ahora se teclea la hora («14» sugiere 14:00/14:30) o se elige de la
                  lista (`<datalist>`). Reutiliza `input input-bordered input-sm` (inventario, sin
                  clase nueva — regla 1). El formato `:00/:30` lo garantiza la lista y lo revalida
                  el servidor (RN-07).
                */}
                <input
                  type="text"
                  list={idHoras}
                  aria-label={`Hora de inicio de ${persona.nombre}`}
                  className="input input-bordered input-sm min-w-0"
                  placeholder="Inicio…"
                  value={persona.horaInicio ?? ""}
                  disabled={deshabilitado}
                  onChange={(evento) =>
                    onCambiarHorario(
                      persona.funcionarioId,
                      evento.target.value,
                      persona.horaFin ?? "",
                    )
                  }
                />
                <span
                  aria-hidden="true"
                  className="text-sm text-app-muted"
                >
                  a
                </span>
                <input
                  type="text"
                  list={idHoras}
                  aria-label={`Hora de fin de ${persona.nombre}`}
                  className="input input-bordered input-sm min-w-0"
                  placeholder="Fin…"
                  value={persona.horaFin ?? ""}
                  disabled={deshabilitado}
                  onChange={(evento) =>
                    onCambiarHorario(
                      persona.funcionarioId,
                      persona.horaInicio ?? "",
                      evento.target.value,
                    )
                  }
                />
                {!conCantidad && persona.editable !== false && (
                  <Boton
                    variante="peligroTexto"
                    tamano="sm"
                    icono="cerrar"
                    aria-label={`Retirar a ${persona.nombre}`}
                    deshabilitado={deshabilitado}
                    {...propsRetirar(persona.funcionarioId)}
                  />
                )}
              </div>

              {/*
                Columna 3: la cantidad de operativos de ESTA persona (solo form 8). Cada
                persona genera sus propios N operativos independientes. La «×» de retirar baja
                aquí, para que quede al final de la fila. `w-16` e `input-sm` son del inventario.
              */}
              {conCantidad && (
                <div className="flex min-w-0 items-center gap-2">
                  {/*
                    CONTADOR «[−] n [+]» (2026-09-14). Sustituye al `<input type="number">` por
                    un stepper, a petición del negocio. Es el MISMO patrón que `Paginacion`:
                    un `join` con tres `join-item btn` y el valor de lectura en medio
                    (`pointer-events-none`). Son clases del inventario —`join`, `join-item`,
                    `btn`, `btn-sm`, `w-16`, `text-center`—, no una clase nueva (Regla 1).
                    `acotarCantidad` mantiene el rango [1, 50]; en cada extremo se deshabilita
                    su botón para no salirse.
                  */}
                  <div className="join">
                    <button
                      type="button"
                      aria-label={`Un operativo menos para ${persona.nombre}`}
                      // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                      className="join-item btn btn-sm"
                      disabled={deshabilitado || (persona.cantidad ?? 1) <= 1}
                      onClick={() =>
                        onCambiarCantidad?.(
                          persona.funcionarioId,
                          acotarCantidad(String((persona.cantidad ?? 1) - 1)),
                        )
                      }
                    >
                      −
                    </button>
                    <span
                      aria-label={`Cantidad de operativos de ${persona.nombre}`}
                      // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                      className="join-item btn btn-sm pointer-events-none w-16 text-center"
                    >
                      {persona.cantidad ?? 1}
                    </span>
                    <button
                      type="button"
                      aria-label={`Un operativo más para ${persona.nombre}`}
                      // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                      className="join-item btn btn-sm"
                      disabled={deshabilitado || (persona.cantidad ?? 1) >= 50}
                      onClick={() =>
                        onCambiarCantidad?.(
                          persona.funcionarioId,
                          acotarCantidad(String((persona.cantidad ?? 1) + 1)),
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                  {persona.editable !== false && (
                    <Boton
                      variante="peligroTexto"
                      tamano="sm"
                      icono="cerrar"
                      aria-label={`Retirar a ${persona.nombre}`}
                      deshabilitado={deshabilitado}
                      {...propsRetirar(persona.funcionarioId)}
                    />
                  )}
                </div>
              )}

              {/* Trámite de Inspección (2026-10-07): a lo ancho, bajo la persona y su horario. */}
              {combosTramite.get(persona.funcionarioId) && (
                <div className="col-span-full">
                  {combosTramite.get(persona.funcionarioId)}
                </div>
              )}
            </div>
            ))}
          </div>
        </>
      )}

      {/* Caso 7 del plan: el motivo del servidor se muestra tal cual, y lo capturado en
          el resto del formulario **no se pierde**. */}
      {avisoRechazo && (
        <AvisoEnLinea variante="error">{avisoRechazo}</AvisoEnLinea>
      )}

      {/*
        `role="status"` Y NO `role="alert"`: confirmar no interrumpe. Un `alert` hace que
        el lector de pantalla corte lo que esté leyendo, y aquí lo que se anuncia es que
        todo fue bien. Es la misma distinción que ya hace el resumen de envío del
        formulario, unas líneas más abajo.

        Y LLEVA LAS PALABRAS DENTRO, no solo el color verde (regla 6). En un sistema
        llamado «cuadro de colores» eso exige atención deliberada.
      */}
      {confirmacion && (
        <AvisoEnLinea variante="exito">{confirmacion}</AvisoEnLinea>
      )}

      <input
        id="busquedaPersonal"
        type="search"
        className="input input-bordered w-full"
        /*
          EL MARCADOR DICE LO QUE EL FILTRO HACE. Decía «Buscar por apellido…» mientras
          buscaba solo por nombre y la fila enseñaba área y cargo: era cierto y por eso
          nadie probaba a escribir «supervisor».
        */
        placeholder="Buscar por apellido, unidad o cargo…"
        value={busqueda}
        disabled={deshabilitado}
        onChange={(e) => filtrarPorBusqueda(e.target.value)}
        onKeyDown={alTeclear}
      />

      {/*
        ═══════════════════════════════════════════════════════════════════════════════
        FILTRO POR ÁREA Y ASIGNACIÓN EN BLOQUE.

        Una patrulla se compone por áreas —RN-31 y RN-32 lo dicen: un inspector general,
        uno técnico, y en la nocturna alguien de Instrucción—, así que «enséñame los de
        Técnico» es la pregunta que el operador se hace de verdad, y hasta hoy tenía que
        responderla leyendo cuarenta filas.

        SE COMBINA EN AND CON LA BÚSQUEDA. Elegir un área no borra lo escrito, y escribir
        no borra el área: son dos cortes del mismo conjunto y quien los usa espera que se
        acumulen.

        «ASIGNAR VISIBLES» CUENTA SOLO A LOS ELEGIBLES, y por eso su número puede ser
        menor que el del pie. Si contara a todos, prometería asignar a quien el servidor
        va a rechazar.
        ═══════════════════════════════════════════════════════════════════════════════
      */}
      {/*
        ═══════════════════════════════════════════════════════════════════════════════
        LA FILA SE PINTA TAMBIÉN CON LA LISTA VACÍA SI HAY GENTE ASIGNADA. 2026-09-02.

        Antes su condición era solo `areas.length > 0`, y `areas` se cuenta sobre los
        **disponibles**: al asignar a todos, la lista se vacía, la fila desaparecía y con
        ella se habría ido «Quitar todos» al bajarlo aquí — justo en el caso en que más
        falta hace, que es haber asignado de más con «Asignar visibles».

        Los filtros por área sí siguen atados a que haya candidatos: filtrar una lista
        vacía no filtra nada.
        ═══════════════════════════════════════════════════════════════════════════════
      */}
      {!cargando && (areas.length > 0 || agregadas.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {areas.length > 0 && (
            <button
              type="button"
              aria-pressed={area === null}
              disabled={deshabilitado}
              onClick={() => filtrarPorArea(null)}
              // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
              className={`btn btn-sm ${area === null ? "btn-primary" : "btn-ghost"}`}
            >
              Todas ({disponibles.length})
            </button>
          )}

          {areas.map(([codigo, cuantos]) => (
            <button
              key={codigo}
              type="button"
              aria-pressed={area === codigo}
              disabled={deshabilitado}
              onClick={() => filtrarPorArea(area === codigo ? null : codigo)}
              // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
              className={`btn btn-sm ${area === codigo ? "btn-primary" : "btn-ghost"}`}
            >
              {NOMBRE_AREA[codigo]} ({cuantos})
            </button>
          ))}

          {areas.length > 0 && (
            <Boton
              variante="secundario"
              tamano="sm"
              deshabilitado={deshabilitado || asignables.length === 0}
              onClick={asignarVisibles}
            >
              Asignar visibles ({asignables.length})
            </Boton>
          )}

          {/*
            LAS DOS ACCIONES DE LISTA ENTERA, JUNTAS Y CON SU NÚMERO. 2026-09-02.

            «Quitar todos» estaba arriba, junto al rótulo del bloque, y su pareja aquí
            abajo: para decidir entre asignar de golpe o vaciar de golpe había que recorrer
            la pantalla con la vista.

            LLEVA EL CONTEO COMO SU PAREJA, y no es simetría por gusto: es lo que da la
            ojeada rápida que se pidió. «Asignar visibles (12)» frente a «Quitar todos
            (30)» dice de un vistazo qué pasa si se pulsa cada uno.
          */}
          {retirables.length > 0 && (
            <Boton
              variante="peligro"
              tamano="sm"
              deshabilitado={deshabilitado}
              onClick={() => setConfirmandoQuitarTodos(true)}
            >
              Quitar todos ({retirables.length})
            </Boton>
          )}
        </div>
      )}

      <MensajeModal
        abierto={confirmandoQuitarTodos}
        variante="peligro"
        titulo={`¿Quitar a los ${retirables.length} asignados?`}
        mensaje="Se retiran todos del operativo que está registrando. Puede volver a agregarlos antes de registrar."
        textoPrincipal="Quitar todos"
        onPrincipal={() => {
          quitarTodos();
          setConfirmandoQuitarTodos(false);
        }}
        onSecundario={() => setConfirmandoQuitarTodos(false)}
      />

      {/*
        ═══════════════════════════════════════════════════════════════════════════════
        LA CAJA SE PAGINA: TRES FILAS, DOS COLUMNAS. 2026-09-04.

        Historia de la caja, que explica por qué está donde está:

        · D-3 (26-AGO): era una ventana de tres filas para cuarenta personas, en una
          columna con scroll. Se abrió a varias columnas y se subió el alto.
        · 27-AGO: bajó a dos columnas al ceder media fila de la rejilla a Instituciones;
          a tres columnas el motivo del servidor se partía en tres renglones.

        Hoy el negocio pide cambiar el scroll por paginación, con TRES filas y DOS
        columnas a la vista. Son SEIS candidatos por página (3×2). Se quita el scroll
        —`max-h-80 overflow-y-auto`— porque la propia paginación acota la altura, y una
        caja con scroll interno dentro de un formulario que ya se desplaza esconde cuántos
        candidatos hay y obliga a arrastrar dentro de dos dedos de alto.

        El buscador, los filtros por área y «Asignar visibles» son los que hacen manejable
        asignar treinta: la caja no está para recorrerla entera, sino para acotarla.

        LA REJILLA VA DENTRO Y NO EN EL CONTENEDOR. Los dos mensajes —«Consultando…» y
        «No hay personal que coincida»— son texto de una línea, y como celdas de rejilla
        quedarían encajonados en media caja.
        ═══════════════════════════════════════════════════════════════════════════════
      */}
      <div className="rounded-box border border-base-300">
        {cargando && (
          <p className="px-3 py-2 text-sm text-app-muted">
            Consultando personal disponible…
          </p>
        )}

        {!cargando && visibles.length === 0 && (
          <p className="px-3 py-2 text-sm text-app-muted">
            No hay personal que coincida con la búsqueda.
          </p>
        )}

        {/*
          DOS PRESENTACIONES DE LA MISMA LISTA. P-01: tarjeta-botón (toda la tarjeta asigna al
          hacer clic), en dos columnas. CAJÓN (listaCompacta): UNA columna, cada fila con el detalle
          y un botón «+ Asignar» explícito a la derecha —de tamaño `btn` (≥44 px, sin `min-h`
          arbitrario, regla 16)—, en vez de una tarjeta clicable. El detalle es el mismo
          (`detalleCandidato`). El motivo del no elegible se muestra tal cual (PV-37).
        */}
        {!cargando && visibles.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-2"
          >
            {candidatosVisibles.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  disabled={deshabilitado || !persona.elegible}
                  /*
                  `aria-disabled` SOLO EN EL NO ELEGIBLE, y no en el bloqueado por la
                  ventana. `disabled` ya lo apaga para todos; esto distingue **por qué**
                  está apagado, que es lo que el lector de pantalla necesita para no
                  confundir «no puede salir hoy» con «el formulario está cerrado».

                  Sigue siendo un `<button>`: convertirlo en `div` lo sacaría del tabulador
                  y quien navega con teclado dejaría de poder recorrer la lista.
                */
                  aria-disabled={!persona.elegible || undefined}
                  // El motivo también en `title`: en una lista larga es lo que se lee al
                  // pasar por encima, sin tener que buscar la línea correspondiente.
                  title={persona.motivo ?? undefined}
                  onClick={() => onAgregar(persona)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-base-200"
                >
                  {detalleCandidato(persona)}
                </button>
            ))}
          </div>
        )}
      </div>

      {/* El paginador solo aparece cuando hay más de una página de candidatos. */}
      {!cargando && visibles.length > POR_PAGINA && (
        <Paginacion
          page={paginaCandidatosValida}
          pageSize={POR_PAGINA}
          total={visibles.length}
          onPage={setPaginaCandidatos}
          etiqueta="efectivos"
        />
      )}

      {/*
        EL PIE DICE CUÁNTO SE ESTÁ VIENDO Y CÓMO SEGUIR SIN EL RATÓN.

        «X de Y» hace visible que hay un filtro puesto: con la lista acotada a 320 px, una
        búsqueda que deja fuera a treinta personas se parece mucho a una lista vacía.

        La pista del teclado va aquí y no en el marcador porque el marcador desaparece en
        cuanto se escribe la primera letra, que es justo cuando `Enter` empieza a servir.
      */}
      {/*
        EN EL CAJÓN NO SE PINTA ESTE PIE. 2026-10-01. El contador de arriba ya es el único; y la
        pista «↵ asigna el primer elegible» se retira porque en el cajón se asigna con «+ Asignar»
        por fila, no con Enter sobre el buscador. P-01 conserva el pie con su «X de Y» y su pista.
      */}
      {!cargando && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-app-muted">
          <span>
            {visibles.length} de {candidatos.length} efectivos
          </span>
          <span>↵ asigna el primer elegible</span>
        </div>
      )}
    </div>
  );
};

export default SelectorPersonal;
