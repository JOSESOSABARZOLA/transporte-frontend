/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Edición y adicional de operativos
 * Archivo: DrawerOperativo.tsx
 * Responsabilidad: El cajón lateral único de un operativo —editar, adicional o solo personal—:
 *                  cabecera, cuerpo por secciones, pie fijo con su estado y confirmación de descarte.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO CAJÓN PARA TODO LO QUE TOCA UN OPERATIVO (2026-10-08). Nació como el cajón del adicional
 * (`DrawerAdicionalOperativo`) y el mismo día absorbió la edición: Mis operativos usaba otro cajón
 * más angosto (`DrawerEdicionOperativo`) y Registro de operativo dos `DrawerLateral` sueltos, cada
 * uno con su pie. Ahora los cinco caminos montan este componente y solo cambia el CONTENIDO:
 *
 * | `modo` | Quién | Cuerpo | Pie |
 * |---|---|---|---|
 * | `adicional` | Órdenes, Mis operativos | `PanelAdicionalOperativo` | Cancelar · Registrar adicional |
 * | `editar` | Mis operativos, Registro | `PanelEdicionOperativo` | Cancelar · Guardar cambios (o solo Cerrar en lectura) |
 * | `personal` | aporte y patrulla (Mis operativos, Registro) | `PanelEdicionOperativo` en solo-personal | Cancelar |
 *
 * El ancho, la forma, el velo, la animación, el foco, el error del servidor sobre el pie y la
 * confirmación de descarte son los mismos en los tres. Si un día cambian, cambian aquí.
 *
 * ES UN ENVOLTORIO: no conoce el servicio ni arma la petición. La página sigue siendo dueña del
 * borrador y de `onGuardar`; aquí solo se ordena la presentación y se decide cuándo cerrar.
 *
 * SE MONTA SOLO MIENTRAS HAY OPERATIVO (`{operativo && <DrawerOperativo key=… />}`): cada apertura
 * nace con su estado limpio, y al desmontarse `usePanelAccesible` devuelve el foco al botón de la
 * fila que lo abrió.
 *
 * EL BOTÓN PRINCIPAL SE VE APAGADO, PERO SE PUEDE PULSAR. Con algo pendiente lleva `aria-disabled`
 * y el aspecto del deshabilitado; al pulsarlo Formik valida y `FocoAlPrimerError` lleva el
 * desplazamiento y el foco al primer campo que falta. Solo se deshabilita de verdad mientras se
 * guarda o si el cuadro lo bloquea. En «editar» con la ventana cerrada (`soloLectura`) ni se pinta:
 * se abre para consultar.
 *
 * CERRAR CON CAMBIOS PIDE CONFIRMACIÓN, por los cuatro caminos (✕, Cancelar, Escape y clic en el
 * velo). En «personal» nunca pregunta: cada persona ya se guardó en su clic.
 *
 * ES EL MODELO DEL CAJÓN ESTÁNDAR (2026-10-15). `DrawerLateral` `ancho="lg"` pone la cabecera, el
 * pie, el foco inicial y la confirmación «¿Descartar cambios?»; aquí solo se dice qué hay (`sucio`,
 * `estadoPie`, `formId`). El pie pasa de gris («N campos por completar») a rojo («Falta: …») tras
 * el primer intento, y a verde («Listo para guardar») completo. «personal» y la consulta en lectura
 * abren en modo LECTURA: solo [Cerrar]. Las secciones son `SeccionDrawer` (`FormOperativo`):
 * sus títulos usaban `app-section-heading`, que sobre el panel blanco salía casi blanca.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, type FC, type ReactNode } from "react";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import DrawerLateral, { type EstadoPie } from "../common/DrawerLateral.tsx";
import PanelAdicionalOperativo, {
  type PanelAdicionalOperativoProps,
} from "./PanelAdicionalOperativo.tsx";
import PanelEdicionOperativo, {
  type PanelEdicionOperativoProps,
} from "./PanelEdicionOperativo.tsx";
import type { EstadoEnvio } from "./FormOperativo.tsx";
import type { Operativo } from "../../interfaces/Operativo.ts";
import { colorDeTextoSobre } from "../../utils/banner.util.ts";
import type { AvisoTexto } from "../../utils/errorApi.util.ts";
import { cambiaronZonales } from "../../utils/edicionOperativo.util.ts";
import { estadoPieDrawer, motivoSinCambios } from "../../utils/estadoPieDrawer.util.ts";

/** `id` del `<form>` del cajón: el botón del pie lo envía con `form=`. Uno abierto a la vez. */
const ID_FORM = "form-drawer-operativo";

/** Lo que falta, con el rótulo corto del pie («Horario», no «horario del personal»). */
const ROTULO_CORTO: Record<string, string> = {
  "horario del personal": "Horario",
};

const rotuloDelPie = (nombre: string): string => {
  const corto = ROTULO_CORTO[nombre] ?? nombre;
  return corto.charAt(0).toUpperCase() + corto.slice(1);
};

type AvisoServidor = AvisoTexto;

type PropsComunes = {
  /** Cierra y DESCARTA lo capturado. Se llama ya confirmado: el cajón pregunta antes si hace falta. */
  onCerrar: () => void;
  /** Error del servidor al guardar: se muestra dentro del cajón, sobre el pie, sin cerrarlo. */
  errorServidor?: AvisoServidor | null;
  /** Aviso propio de la pantalla al principio del cuerpo (cuadro cerrado, ventana cerrada, 409…). */
  avisoContexto?: ReactNode;
  /** Título si el del modo no basta (p. ej. «Editar patrulla …»). */
  titulo?: string;
  /** Qué se pierde al descartar, si no es lo de siempre (p. ej. la patrulla: su personal ya se guardó). */
  mensajeDescarte?: string;
};

type PropsAdicional = PropsComunes & {
  modo: "adicional";
} & Omit<PanelAdicionalOperativoProps, "idForm" | "onEstadoEnvio">;

type PropsPanelEdicion = Omit<
  PanelEdicionOperativoProps,
  "idForm" | "onEstadoEnvio"
>;

type PropsEditar = PropsComunes & {
  modo: "editar";
  /** Ventana cerrada o cuadro cerrado: se abre para consultar, sin «Guardar cambios». */
  soloLectura: boolean;
  /** Personal del borrador sin aplicar (alta, baja, turno o trámite): cuenta como cambio. */
  personalPendiente: boolean;
  /** Si el borrador cambió el turno de alguien que ya iba: puede descuadrar el transporte. */
  horarioCambiado: boolean;
} & PropsPanelEdicion;

type PropsPersonal = PropsComunes & {
  modo: "personal";
  titulo: string;
} & PropsPanelEdicion;

export type DrawerOperativoProps = PropsAdicional | PropsEditar | PropsPersonal;

/** Chip del formulario con el color del banner que entrega el servidor (regla 3). */
const ChipFormulario: FC<{ operativo: Operativo }> = ({ operativo }) => (
  <span
    className="badge badge-sm min-w-0 max-w-full"
    title={`${operativo.formulario.numero}. ${operativo.formulario.nombre}`}
    style={{
      backgroundColor: operativo.formulario.colorFondo,
      color: colorDeTextoSobre(operativo.formulario.colorFondo),
    }}
  >
    {/* El número va en el texto: el color acompaña, no informa solo (regla 6). */}
    <span className="min-w-0 truncate">
      {operativo.formulario.numero}. {operativo.formulario.nombre}
    </span>
  </span>
);

const DrawerOperativo: FC<DrawerOperativoProps> = (props) => {
  const { onCerrar, errorServidor = null, avisoContexto } = props;
  const operativo = props.modo === "adicional" ? props.origen : props.operativo;
  const guardando = props.guardando;

  // `null` hasta que el formulario informa: así el primer pintado no cree que todo cambió.
  const [estado, setEstado] = useState<EstadoEnvio | null>(null);

  /*
    ADICIONAL · ¿CAMBIÓ EL PERSONAL RESPECTO DE LO HEREDADO? Al abrir, el cajón hereda solo a quien
    sigue elegible; eso no es un cambio de quien captura. Sí lo es quitar o sumar a alguien, o
    fijarle un horario o un trámite (los heredados nacen sin horario).
  */
  const personalAdicionalModificado = useMemo(() => {
    if (props.modo !== "adicional") return false;
    const heredables = new Set(
      props.origen.personal
        .filter(
          (persona) =>
            props.candidatos.find((fila) => fila.id === persona.funcionarioId)
              ?.elegible,
        )
        .map((persona) => persona.funcionarioId),
    );
    const agregados = new Set(
      props.personalAgregado.map((persona) => persona.funcionarioId),
    );
    const mismaGente =
      heredables.size === agregados.size &&
      [...agregados].every((id) => heredables.has(id));
    const algoFijado = props.personalAgregado.some(
      (persona) =>
        Boolean(persona.horaInicio) ||
        Boolean(persona.horaFin) ||
        Boolean(persona.tramiteCodigo),
    );
    return !mismaGente || algoFijado;
  }, [props]);

  // Las zonales con que se abrió la edición: contra ellas se juzga si el transporte se descuadra.
  // Las mismas que siembra `comoValoresDeFormulario`: todas las del operativo.
  const zonalesOriginales = useMemo(
    () => operativo.zonales.map((zonal) => zonal.id),
    [operativo],
  );

  const hayCambios =
    props.modo === "personal"
      ? false
      : (estado?.hayCambios ?? false) ||
        (props.modo === "adicional"
          ? personalAdicionalModificado
          : props.personalPendiente);

  /*
    EDITAR · AVISO DE LA DAF. Conductor y placa se eligieron para un horario y una zona; si el
    borrador mueve cualquiera de los dos, la DAF puede tener que reasignar. Es informativo: el
    servidor decide (y, si cambia el tipo de transporte, pregunta aparte con su propio modal).
  */
  const avisoTransporte =
    props.modo === "editar" &&
    !props.soloLectura &&
    operativo.estadoTransporte === "ASIGNADO" &&
    (props.horarioCambiado ||
      (estado !== null &&
        cambiaronZonales(estado.zonalesIds, zonalesOriginales)));

  const faltantes = estado?.faltantes ?? [];
  const incompleto = faltantes.length > 0;

  // «N de M efectivos» compara con el original del adicional; al editar, el personal es el propio.
  const total =
    props.modo === "adicional"
      ? props.personalAgregado.length
      : operativo.personal.length;
  const delOrigen = props.modo === "adicional" ? operativo.personal.length : 0;
  const textoEfectivos =
    delOrigen > 0
      ? `${total} de ${delOrigen} efectivos`
      : `${total} ${total === 1 ? "efectivo" : "efectivos"}`;

  const titulo =
    props.titulo ??
    (props.modo === "adicional" ? "Operativo adicional" : "Editar operativo");

  // El botón principal: no en «personal» (nada que enviar) ni al consultar en lectura.
  const conAccion =
    props.modo === "adicional" ||
    (props.modo === "editar" && !props.soloLectura);
  const textoAccion =
    props.modo === "adicional" ? "Registrar adicional" : "Guardar cambios";
  const textoListo =
    props.modo === "adicional" ? "Listo para registrar" : "Listo para guardar";
  const enLectura = props.modo === "personal" || (props.modo === "editar" && props.soloLectura);

  /*
    El pie: «N efectivos · …» con los estados comunes del cajón estándar. Al editar sin cambios dice
    «Sin cambios pendientes» y «Guardar cambios» queda apagado («Sin cambios»): el personal que se
    guardó al instante ya no es un cambio pendiente. Con cambios, «Cambios sin guardar». En lectura,
    solo informa. (El rojo de «Falta: …» va tras intentar; el adicional completo, «Listo para
    registrar».)
  */
  const estadoPie: EstadoPie =
    props.modo === "personal"
      ? { tono: "pendiente", texto: "Cada persona se guarda en el momento." }
      : enLectura
        ? { tono: "pendiente", texto: `${textoEfectivos} · Solo lectura` }
        : estadoPieDrawer({
            esEdicion: props.modo === "editar",
            hayCambios,
            intentado: estado?.intentado ?? false,
            faltan: faltantes.map(rotuloDelPie),
            textoListo,
            contexto: textoEfectivos,
          });

  return (
    <DrawerLateral
      abierto
      ancho="lg"
      modo={conAccion ? "form" : "lectura"}
      titulo={titulo}
      subtitulo={
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span>
            {props.modo === "adicional"
              ? `de ${operativo.identificador}`
              : operativo.identificador}
          </span>
          <ChipFormulario operativo={operativo} />
        </span>
      }
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      formId={conAccion ? ID_FORM : undefined}
      textoGuardar={textoAccion}
      estadoPie={estadoPie}
      /*
        Con campos pendientes se VE apagado, pero al pulsarlo envía el formulario igual, para que la
        validación lleve al primer error. Apagado de verdad solo si el cuadro lo bloquea.
      */
      guardarPendiente={incompleto}
      motivoGuardar={
        props.bloqueado
          ? "No se puede guardar: el cuadro o la ventana de carga están cerrados."
          : motivoSinCambios(props.modo === "editar", hayCambios)
      }
      errorServidor={errorServidor?.texto}
      varianteErrorServidor={errorServidor?.variante}
      mensajeDescarte={
        props.mensajeDescarte ??
        (props.modo === "adicional"
          ? "Se perderá lo capturado del operativo adicional: el personal, su horario y los demás datos."
          : "Se perderán los cambios en el personal asignado y en los datos del operativo (punto de encuentro, zonales, instituciones, tipo de control y observaciones nuevas). Nada se ha guardado todavía.")
      }
    >
      <div
        className="flex flex-col gap-4"
        // Un solo componente para los tres modos: las pruebas de cada pantalla lo comprueban.
        data-drawer-operativo={props.modo}
      >
        {avisoContexto}
        {avisoTransporte && (
          <AvisoEnLinea variante="info">
            Este cambio puede dejar el transporte pendiente de reasignación por la DAF.
          </AvisoEnLinea>
        )}
        {props.modo === "adicional" ? (
          <PanelAdicionalOperativo
            {...panelDe(props)}
            idForm={ID_FORM}
            onEstadoEnvio={setEstado}
          />
        ) : (
          <PanelEdicionOperativo
            {...panelDe(props)}
            idForm={ID_FORM}
            onEstadoEnvio={setEstado}
          />
        )}
      </div>
    </DrawerLateral>
  );
};

/** Las propiedades del panel, sin las del cajón: cada panel recibe solo lo suyo. */
function panelDe(
  props: PropsAdicional,
): Omit<PanelAdicionalOperativoProps, "idForm" | "onEstadoEnvio">;
function panelDe(props: PropsEditar | PropsPersonal): PropsPanelEdicion;
function panelDe(props: DrawerOperativoProps) {
  if (props.modo === "adicional") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { modo, onCerrar, errorServidor, avisoContexto, titulo, mensajeDescarte, ...panel } =
      props;
    return panel;
  }
  if (props.modo === "editar") {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      modo, onCerrar, errorServidor, avisoContexto, titulo, mensajeDescarte,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      soloLectura, personalPendiente, horarioCambiado,
      ...panel
    } = props;
    return panel;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { modo, onCerrar, errorServidor, avisoContexto, titulo, mensajeDescarte, ...panel } =
    props;
  return panel;
}

export default DrawerOperativo;
