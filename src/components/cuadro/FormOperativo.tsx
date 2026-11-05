/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro y edición de operativo
 * Archivo: FormOperativo.tsx
 * Responsabilidad: El formulario del operativo, ÚNICO para el alta de P-01 y para el cajón de
 *                  edición y de adicional: cuatro tarjetas, las mismas validaciones y textos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06 (como `FormularioOperativo`; unificado el 2026-10-16)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN FORMULARIO, TRES MODOS (plan «registro-operativo-rediseno», R1, 2026-10-16).
 *
 * Hasta hoy era `FormularioOperativo` y lo que cambiaba entre el alta y el cajón se decidía con
 * siete banderas (`enCajon`, `seccionado`, `selectoresFlotantes`, `horarioInline`,
 * `ocultarAcciones`, `bandejaSinTope`…) que cada llamador combinaba a su manera. Ahora hay una:
 *
 *   modo        dónde                         pie
 *   ─────────── ───────────────────────────── ─────────────────────────────────────────
 *   "alta"      P-01, en la página            el suyo: barra blanca [Limpiar] [Registrar operativo]
 *   "edicion"   cajón «Editar operativo»      el del cajón (`idForm` + `onEstadoEnvio`)
 *   "adicional" cajón «Operativo adicional»   el del cajón (`idForm` + `onEstadoEnvio`)
 *
 * EN LOS TRES, CUATRO TARJETAS (`SeccionDrawer`): «Personal y horario» · «Lugar» · «Control» ·
 * «Transporte y observaciones». En el alta van a dos columnas desde `lg` —el personal a la
 * izquierda (~55 %), las otras tres apiladas a la derecha (~45 %)—; en el cajón, apiladas.
 *
 * VARIANTE (2026-10-16, ajustes visuales del registro): `variante="pagina" | "drawer"` decide solo el
 * ASPECTO, no el comportamiento. Por omisión, «pagina» en el alta y «drawer» en los cajones. En
 * «pagina» la tarjeta del personal se conserva, pero la columna derecha va SIN tarjetas ni títulos
 * —Zonales + Punto · Instituciones + Tipo · Transporte + macrooperativo · Observaciones—, separada
 * por filetes (`SeccionDrawer abierta`), y el pie es BLANCO (`BarraPie tono="claro"`). En «drawer»,
 * las cuatro tarjetas con sus títulos; el cajón pinta su pie azul.
 *
 * `idForm` Y `onEstadoEnvio` SIGUEN, y no son banderas de maquetación: el cajón lleva su pie fuera
 * del `<form>` —el botón lo envía con `form=`— y ese pie necesita saber qué falta.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ FALTA SE DICE EN EL PIE, Y DÓNDE FALLÓ SE SEÑALA DESPUÉS. D-10 y D-11 (2026-08-26),
 * rehecho el 2026-10-16 (R7).
 *
 *   1. Cada control declara `aria-required`, `aria-invalid` y `aria-describedby` con el `id` de
 *      su mensaje. El color no es la única señal (regla 6).
 *   2. El pie dice EN PALABRAS qué falta. En el alta, desde que se abre y en gris («Falta:
 *      personal, zonal…»); tras intentar registrar, lo mismo en rojo claro y la tarjeta que tiene
 *      el hueco con borde rojo; completo, «Listo para registrar · N efectivos · <transporte>».
 *      En el cajón lo arma `estadoPieDrawer` con `onEstadoEnvio`.
 *   3. `FocoAlPrimerError` lleva el cursor al primer campo inválido cuando el envío se detiene.
 *
 * LA LISTA DE LO QUE FALTA LE PREGUNTA AL MISMO ESQUEMA, no a una copia de sus reglas, y vive en
 * `utils/politicasOperativo.util.ts` (`nombresQueFaltan`), una sola vez para los dos pies.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * FORMIK ES LA ÚNICA FUENTE DE VERDAD del formulario, incluidos los selectores en cascada.
 * Con la mitad de los valores en Formik y la otra mitad en estado propio de la página, limpiar
 * el formulario tras registrar habría que hacerlo dos veces, y la segunda se olvida.
 */

import {
  Form,
  Formik,
  useFormikContext,
  type FormikErrors,
  type FormikHelpers,
  type FormikProps,
} from "formik";
import { useContext, useEffect, useRef, useState, type FC, type ReactNode, type Ref } from "react";

import {
  esquemaOperativo,
  esquemaOperativoPorZonas,
} from "../../config/validationSchemas.ts";
import { UserContext } from "../../context/UserContext.tsx";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type {
  ObservacionOperativo,
  ProximoIdentificador,
  TipoTransporte,
} from "../../interfaces/Operativo.ts";
import { estadoPieDrawer } from "../../utils/estadoPieDrawer.util.ts";
import {
  FALTA_PERSONA,
  faltantesDeZonas,
  indiceZonaPrincipal,
  rangosDeVistaPrevia,
  textoListoPorZonas,
  zonaVacia,
  type ZonaCaptura,
} from "../../utils/registroPorZonas.util.ts";
import { nombreTipoTransporte } from "../../utils/tipoTransporte.util.ts";
import BloqueZonas from "./BloqueZonas.tsx";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import BarraPie from "../common/BarraPie.tsx";
import Boton from "../common/Boton.tsx";
import MensajeModal from "../common/MensajeModal.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import SelectorTokens from "../forms/SelectorTokens.tsx";
import BotonRepartoCarga from "./BotonRepartoCarga.tsx";
import ObservacionesOperativo from "./ObservacionesOperativo.tsx";
import { horasSeleccionables } from "../../utils/horario.util.ts";
import { conNotaPendiente } from "../../utils/notasOperativo.util.ts";
import {
  conteoSemaforo,
  hayCargaCalculada,
  horarioMasComun,
  motivoCruces,
  nivelDeCargaPersonal,
  NOMBRE_AREA,
  type HorarioDelOperativo,
} from "../../utils/personal.util.ts";
import {
  CAMPOS_DEL_FORMULARIO,
  estadoPieAlta,
  faltaDelPersonal,
  hayDatosCapturados,
  MENSAJE_PERDER_CAPTURA,
  nombresQueFaltan,
  seccionesConFalta,
  transporteInicial,
} from "../../utils/politicasOperativo.util.ts";
import {
  OPCION_ADICIONALES,
  OPCION_PUNTO_NUEVO,
  VALORES_INICIALES,
  horarioDeLaCaptura,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";
import {
  DESCRIPCION_MACROOPERATIVO,
  ROTULO_MACROOPERATIVO,
  pideVehiculo,
  admiteMacrooperativo,
} from "../../utils/tipoTransporte.util.ts";
import SelectorPersonal, {
  type PersonaAgregada,
} from "./SelectorPersonal.tsx";
import SelectorZonalPunto from "./SelectorZonalPunto.tsx";
import {
  conFaltaDeComposicion,
  personalPorArea,
} from "../../utils/personalPorArea.util.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import SelectorTipoControl from "./SelectorTipoControl.tsx";
import SelectorTipoTransporte from "./SelectorTipoTransporte.tsx";
import SugerenciaCompartirUnidad from "./SugerenciaCompartirUnidad.tsx";

type Institucion = CatalogosFormulario["instituciones"][number];

/** Dónde vive el formulario. Ver la cabecera. */
export type ModoFormOperativo = "alta" | "edicion" | "adicional";

/** El aspecto: la página de registro (columna derecha abierta, pie blanco) o el cajón (tarjetas). */
export type VarianteFormOperativo = "pagina" | "drawer";

/** Lo que el envío cuenta además de los valores (2026-10-16). */
export type ExtrasDelEnvio = {
  /** Se sumó la nota escrita sin «Agregar»: el aviso de éxito lo menciona. */
  notaPendienteAgregada: boolean;
  /**
   * EDITAR PATRULLA (2026-10-31): ¿cambiaron los datos comunes (no el personal)? Lo pone el cajón; si
   * no cambiaron, solo se guarda el personal y no se envía el PATCH de la patrulla.
   */
  generalesCambiaron?: boolean;
};

/**
 * Transporte requerido (2026-10-07). Al elegir el formulario se aplica el transporte que SUGIERE,
 * salvo que quien registra ya lo haya elegido a mano en ese registro (`tipoTransporteManual`). En la
 * edición no se pasa sugerencia: manda lo guardado.
 */
const AplicarTransporteSugerido: FC<{ sugerido?: TipoTransporte }> = ({ sugerido }) => {
  const { values, setFieldValue } = useFormikContext<ValoresOperativo>();
  const { formularioCodigo, tipoTransporte, tipoTransporteManual } = values;
  useEffect(() => {
    if (!sugerido || tipoTransporteManual || tipoTransporte === sugerido) return;
    void setFieldValue("tipoTransporte", sugerido);
    // El macrooperativo solo existe en COMPLETO (2026-10-19).
    if (!admiteMacrooperativo(sugerido)) void setFieldValue("esMacrooperativo", false);
    // Solo al cambiar de formulario o de sugerencia: un cambio de valor a mano ya marcó «manual».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugerido, formularioCodigo, tipoTransporteManual]);
  return null;
};

/**
 * Los errores del formulario, más el del personal. `personal` NO ES UNA CLAVE DE
 * `ValoresOperativo`: las personas asignadas viven fuera de Formik. Formik admite que `validate`
 * devuelva claves que no están en los valores, pero su tipo solo conoce las de `T`.
 */
type ErroresDelOperativo = FormikErrors<ValoresOperativo> & {
  personal?: string;
};

/** Las zonas del registro por zonas; un borrador anterior no las trae y nace con una vacía. */
const zonasDe = (valores: ValoresOperativo): ZonaCaptura[] =>
  valores.zonas && valores.zonas.length > 0 ? valores.zonas : [zonaVacia()];

/**
 * ETIQUETAS DEL SELECTOR DE INSTITUCIONES, FUERA DEL COMPONENTE A PROPÓSITO: `SelectorTokens` las
 * lleva en las dependencias de su filtro memoizado.
 */
const siglaDeInstitucion = (institucion: Institucion): string =>
  institucion.sigla;

/** Si sigla y nombre coinciden («AMC · AMC»), se escribe una sola vez. */
const nombreDeInstitucion = (institucion: Institucion): string =>
  institucion.sigla === institucion.nombre
    ? institucion.nombre
    : `${institucion.sigla} · ${institucion.nombre}`;

/** Lo que el pie del cajón necesita saber del formulario (2026-10-08). */
export type EstadoEnvio = {
  /** Los nombres de lo que falta, en el orden del formulario («personal», «zonal»…). */
  faltantes: string[];
  /** Si hay generales sin guardar (`dirty` de Formik). El personal lo juzga quien lo lleva. */
  hayCambios: boolean;
  /** Las zonales elegidas ahora: el modo «editar» del cajón avisa si dejan atrás al transporte. */
  zonalesIds: number[];
  /** Ya se intentó enviar (`submitCount > 0`): el pie pasa de gris a rojo («Falta: …»). */
  intentado: boolean;
  /** Cuántas personas elegidas se cruzan con otro operativo del día (2026-10-31): apaga Guardar. */
  cruces: number;
  /** Las áreas que le faltan a la patrulla (2026-11-04): el pie las nombra en ámbar, sin apagar. */
  faltaComposicion: AreaPersonal[];
};

/**
 * Avisa del estado del envío en cada cambio, ANTES del primer intento: el pie del cajón dice
 * desde el principio qué falta. No pinta nada. Solo se monta con `onEstadoEnvio`.
 */
const ReporteroDeEstado: FC<{
  faltantes: string[];
  cruces: number;
  faltaComposicion: AreaPersonal[];
  onEstadoEnvio: (estado: EstadoEnvio) => void;
}> = ({ faltantes, cruces, faltaComposicion, onEstadoEnvio }) => {
  const { values, dirty, submitCount } = useFormikContext<ValoresOperativo>();
  const intentado = submitCount > 0;
  const clave = faltantes.join("|");
  const claveComposicion = faltaComposicion.join("|");
  // Como texto, para que el efecto no se dispare con cada arreglo nuevo de las mismas zonales.
  const zonales = values.zonalesIds.join(",");

  useEffect(() => {
    onEstadoEnvio({
      faltantes: clave === "" ? [] : clave.split("|"),
      hayCambios: dirty,
      zonalesIds: zonales === "" ? [] : zonales.split(",").map(Number),
      intentado,
      cruces,
      faltaComposicion:
        claveComposicion === "" ? [] : (claveComposicion.split("|") as AreaPersonal[]),
    });
  }, [clave, dirty, zonales, intentado, cruces, claveComposicion, onEstadoEnvio]);

  return null;
};

/**
 * Avisa a la página del valor actual del formulario en cada cambio, para que P-01 conserve la
 * captura en `sessionStorage`. Solo se monta cuando hay a quién avisar (el alta).
 */
const ReporteroDeValores: FC<{
  onValoresCambian: (valores: ValoresOperativo) => void;
}> = ({ onValoresCambian }) => {
  const { values } = useFormikContext<ValoresOperativo>();

  useEffect(() => {
    onValoresCambian(values);
  }, [values, onValoresCambian]);

  return null;
};

/** `id` del bloque de personal: destino del foco cuando lo que falta es el personal o su horario. */
const ID_BLOQUE_PERSONAL = "bloque-personal";

/**
 * Al detenerse el envío, el cursor va al primer campo inválido. SE ACTÚA UNA VEZ POR INTENTO (el
 * `useRef`): sin ese guardián el foco saltaría al primer campo inválido con cada tecla pulsada
 * después de un envío fallido. Y se espera a que la validación termine: Formik incrementa
 * `submitCount` antes de validar.
 */
const FocoAlPrimerError: FC<{
  /** El personal es la primera tarjeta: si falta, es también el primer error. */
  personalPrimero: boolean;
}> = ({ personalPrimero }) => {
  const { submitCount, isValidating, errors } =
    useFormikContext<ValoresOperativo>();
  const intentoAtendido = useRef(0);

  useEffect(() => {
    if (isValidating || submitCount === intentoAtendido.current) return;
    intentoAtendido.current = submitCount;

    const primero = CAMPOS_DEL_FORMULARIO.find(({ campo }) => errors[campo]);
    const errorPersonal = Boolean((errors as ErroresDelOperativo).personal);
    const destino =
      errorPersonal && (personalPrimero || !primero?.id)
        ? ID_BLOQUE_PERSONAL
        : primero?.id;
    if (!destino) return;

    /*
      SE LLEVA EL DESPLAZAMIENTO Y LUEGO EL FOCO (2026-10-08). El primer campo con error puede estar
      fuera de la vista: `scrollIntoView` lo centra y `preventScroll` evita un segundo salto al
      enfocar. jsdom no implementa `scrollIntoView`, de ahí la llamada opcional.
    */
    const elemento = document.getElementById(destino);
    elemento?.scrollIntoView?.({ block: "center" });
    elemento?.focus({ preventScroll: true });
  }, [submitCount, isValidating, errors, personalPrimero]);

  return null;
};

/**
 * EL PIE DEL ALTA (R7, 2026-10-16): la misma pieza del cajón (`BarraPie`), al final del bloque del
 * formulario, en su TONO CLARO en la página (blanco, filete arriba, botones sin borde blanco).
 * [Limpiar] secundario lg + [Registrar operativo] primario lg.
 * «Limpiar» con algo capturado pregunta antes (`MensajeModal` peligro); sin datos limpia directo.
 * Si quien lo monta ofrece `onCancelar` (la corrección de una patrulla), va «Cancelar» en su lugar.
 */
const PieDelAlta: FC<{
  faltantes: string[];
  efectivos: number;
  hayDatos: boolean;
  textoAccion: string;
  bloqueado: boolean;
  guardando: boolean;
  onLimpiar?: () => void;
  onCancelar?: () => void;
  /** «pagina»: blanco con filete; «drawer»: la barra azul del cajón. */
  variante: VarianteFormOperativo;
  /** El texto de «listo» propio (registro por zonas, 2026-10-28). Sin él, el de siempre. */
  textoListo?: string;
  /** «Revise los horarios · N personas se cruzan…» (2026-10-31): manda sobre el resto y apaga. */
  motivoCruce: string | null;
  /** Las áreas que le faltan a la patrulla (2026-11-04): ámbar y sin apagar «Registrar». */
  faltaComposicion: AreaPersonal[];
}> = ({
  variante,
  textoListo,
  motivoCruce,
  faltaComposicion,
  faltantes,
  efectivos,
  hayDatos,
  textoAccion,
  bloqueado,
  guardando,
  onLimpiar,
  onCancelar,
}) => {
  const { values, submitCount } = useFormikContext<ValoresOperativo>();
  const [confirmandoLimpiar, setConfirmandoLimpiar] = useState(false);

  const estadoPie = motivoCruce
    ? { tono: "error" as const, texto: motivoCruce }
    : textoListo
    ? estadoPieDrawer({
        esEdicion: false,
        hayCambios: false,
        intentado: submitCount > 0,
        faltan: faltantes,
        nombrarFaltantes: true,
        textoListo,
      })
    : conFaltaDeComposicion(
        estadoPieAlta({
          faltantes,
          intentado: submitCount > 0,
          efectivos,
          tipoTransporte: values.tipoTransporte,
          compartirCon:
            values.eleccionCompartir === "COMPARTIR" ? values.compartirConIdentificador : null,
        }),
        faltaComposicion,
      );

  return (
    <>
      <BarraPie
        tono={variante === "pagina" ? "claro" : "azul"}
        estadoPie={estadoPie}
        guardando={guardando}
        className={variante === "pagina" ? "px-[18px] py-3" : "rounded-xl px-6 py-3.5"}
      >
        {onCancelar ? (
          <Boton tamano="lg" onClick={onCancelar} deshabilitado={guardando}>
            Cancelar
          </Boton>
        ) : (
          onLimpiar && (
            <Boton
              tamano="lg"
              deshabilitado={guardando}
              onClick={() => (hayDatos ? setConfirmandoLimpiar(true) : onLimpiar())}
            >
              Limpiar
            </Boton>
          )
        )}
        <Boton
          type="submit"
          variante="primario"
          tamano="lg"
          cargando={guardando}
          deshabilitado={bloqueado}
          motivoDeshabilitado={motivoCruce}
        >
          {guardando ? "Guardando…" : textoAccion}
        </Boton>
      </BarraPie>

      {onLimpiar && (
        <MensajeModal
          abierto={confirmandoLimpiar}
          variante="peligro"
          titulo="¿Limpiar el formulario?"
          mensaje={MENSAJE_PERDER_CAPTURA}
          textoSecundario="Seguir editando"
          textoPrincipal="Descartar"
          onPrincipal={() => {
            setConfirmandoLimpiar(false);
            onLimpiar();
          }}
          onSecundario={() => setConfirmandoLimpiar(false)}
        />
      )}
    </>
  );
};

type FormOperativoProps = {
  /** Dónde vive: el alta de P-01 o el cajón de edición/adicional. Por omisión, el alta. */
  modo?: ModoFormOperativo;
  /** Aspecto. Por omisión, «pagina» en el alta y «drawer» en los cajones. */
  variante?: VarianteFormOperativo;
  /**
   * Solo el código, no el formulario entero: es lo único que este componente necesita —viaja en
   * el cuerpo de la petición—.
   */
  formularioCodigo: string;
  catalogos: CatalogosFormulario | null;
  puntos: CatalogosFormulario["puntos"];
  cargandoPuntos: boolean;
  /** VARIAS zonales (2026-09-21): recarga la UNIÓN de los puntos de las elegidas. */
  onZonalesElegidas: (zonalesIds: number[]) => void;
  /**
   * AGREGAR UN PUNTO AL CATÁLOGO desde el registro (Unidad de Operativos, 2026-09-24). Al teclearlo
   * NO se crea nada todavía: queda pendiente y el servidor lo crea al REGISTRAR, en la misma
   * transacción del operativo. Solo el ALTA lo enciende; se combina con `puntoManual` del catálogo.
   */
  permiteAgregarPunto?: boolean;

  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  personalAgregado: PersonaAgregada[];
  onAgregarPersona: (persona: PersonaElegible) => void;
  onRetirarPersona: (funcionarioId: number) => void;
  /**
   * «Reemplazar» del formulario de una sola persona (2026-10-28, el 8): la nueva toma el lugar de la
   * elegida conservando horario y cantidad. Sin él, el selector quita y agrega.
   */
  onReemplazarPersona?: (salienteId: number, entrante: PersonaElegible) => void;
  /** Turno propio por persona (2026-09-08, RN-66). Con él el horario de cada persona es obligatorio. */
  onCambiarHorarioPersona?: (
    funcionarioId: number,
    horaInicio: string,
    horaFin: string,
  ) => void;
  avisoPersonal: string | null;
  /**
   * La persona a la que se refiere `avisoPersonal` (`detalles.funcionarioId` del rechazo, R2): el
   * motivo se pinta bajo SU horario. Sin ella, el aviso va sobre el bloque, como siempre.
   */
  idPersonaRechazada?: number | null;
  /** Que la asignación se guardó, dicho en palabras. No aplica al alta: ahí aún no hay nada guardado. */
  confirmacionPersonal?: string | null;

  /**
   * Notas YA ESCRITAS del operativo (bitácora, 2026-09-09), en solo lectura al corregir. En el
   * alta no hay ninguna.
   */
  observacionesExistentes?: ObservacionOperativo[];

  /** Valores de partida: sin ellos nace vacío (el alta); con ellos edita uno existente. */
  valoresIniciales?: ValoresOperativo;
  /** El «Transporte» que propone el formulario al registrar (`tipoTransportePorDefecto`). */
  tipoTransportePorDefecto?: TipoTransporte;
  /** Texto del botón principal del alta. «Registrar operativo» al crear. */
  textoAccion?: string;
  /** En el alta, «Cancelar» en lugar de «Limpiar» (la corrección de una patrulla). */
  onCancelar?: () => void;
  /**
   * «Limpiar» del pie del alta: vacía la captura (formulario y personal) y conserva el formulario
   * elegido. Quien lo monta lo hace; aquí solo se pregunta antes si hay algo capturado.
   */
  onLimpiar?: () => void;

  /** RN-56 y RN-58: la ventana cerrada o el cuadro cerrado bloquean la captura. */
  bloqueado: boolean;
  /**
   * TODO EN LECTURA MENOS EL PERSONAL (2026-08-25, PER-06): el departamento que APORTA al
   * formulario compartido. Es OTRA VARA que `bloqueado` —que también apaga el personal— y hay que
   * mantenerlas separadas. Sin botón de guardar: el personal se guarda solo.
   */
  soloPersonal?: boolean;
  guardando: boolean;
  /**
   * `extras.notaPendienteAgregada` (2026-10-16): la nota escrita sin «Agregar» se sumó sola al
   * enviar (`conNotaPendiente`), para que el aviso de éxito lo diga. Los valores ya la traen.
   */
  onGuardar: (
    valores: ValoresOperativo,
    ayudas: FormikHelpers<ValoresOperativo>,
    extras?: ExtrasDelEnvio,
  ) => void | Promise<void>;
  /**
   * Para LEER lo tecleado sin haberlo enviado (2026-09-01): P-01 aparta el borrador al cambiar de
   * modo. Es una referencia, no un `onChange`.
   */
  refFormik?: Ref<FormikProps<ValoresOperativo>>;
  /** Avisa del valor en cada cambio para conservar la captura al salir (solo el alta, 2026-09-04). */
  onValoresCambian?: (valores: ValoresOperativo) => void;
  /** «Cantidad de operativos» por persona (2026-09-10, form 8). Solo en el alta del que lo admite. */
  permiteCantidadPorPersona?: boolean;
  onCambiarCantidadPersona?: (funcionarioId: number, cantidad: number) => void;
  /** Trámite de inspección por inspector (2026-10-07). Sin ellos no se consulta Inspección. */
  fechaTramites?: string | null;
  onCambiarTramitePersona?: (
    funcionarioId: number,
    codigoTramite: string | null,
  ) => void;
  /** Form 8 por lote: el trámite elegido se aplica a todas las copias de esa persona. */
  tramitePorLote?: boolean;
  /** Personal en solo lectura (2026-09-14, form 8 al editar): el resto del formulario sigue vivo. */
  personalBloqueado?: boolean;
  /**
   * El horario del operativo, FIJO (el aporte, 2026-10-31): quien se agrega lo hereda y no se edita.
   * Sin él, en el alta es el de la captura (`values.horarioOperativo`, vacío si no hay) y al editar
   * arranca con el más común del personal.
   */
  horarioFijo?: HorarioDelOperativo | null;
  /**
   * De quién es la captura del alta: «<código>·<fecha>» (2026-11-04). Al cambiar, el selector de
   * personal vuelve a su primera pestaña y suelta la búsqueda; el horario ya viaja con los valores.
   */
  idCaptura?: string;
  /** Al asignar una persona, propone su zonal (2026-09-24). Solo el alta. */
  proponerZonalDePersona?: boolean;
  /**
   * EL PIE DEL CAJÓN, FUERA DEL `<form>`. `idForm` da al `<Form>` un `id` para que el botón del pie
   * del cajón lo envíe con `form=`, y `onEstadoEnvio` le dice qué falta en cada cambio.
   */
  idForm?: string;
  onEstadoEnvio?: (estado: EstadoEnvio) => void;
  /** Borrador del aporte (2026-10-28): quienes se agregaron y aún no se guardan («Nuevo»). */
  idsNuevos?: ReadonlySet<number>;
  /** El rótulo de cada persona nueva si no es «Nuevo» (la patrulla, 2026-10-29). */
  rotulosNuevos?: ReadonlyMap<number, string>;
  /** Junto a quien llega en lectura, por qué (el aporte, 2026-10-29). */
  rotuloLectura?: string;
  /**
   * EDITAR PATRULLA (2026-10-31): el código de cada persona junto a su nombre y su «Cambiar por…».
   * `detalleDePersona` reemplaza al de la zonal del Maestro (solo del registro por zonas).
   */
  detalleDePersona?: (persona: PersonaAgregada) => ReactNode;
  accionDePersona?: (persona: PersonaAgregada) => ReactNode;
  /** Subtítulo del cajón «Reparto de carga» del alta (p. ej. «<formulario> · semana N»). */
  repartoSubtitulo?: string;
  /**
   * COMPARTIR UNIDAD (2026-10-19): la jornada del operativo, para preguntar si otro del mismo ámbito
   * va al mismo punto y horario. Sin ella no se sugiere nada. No aplica al adicional (su DTO no lo
   * admite).
   */
  fechaJornada?: string | null;
  /** Al editar, el propio operativo: no cuenta como coincidencia. */
  operativoId?: number | null;
  /**
   * Registro por zonas (2026-10-28): prefijo del tipo y siguiente número del día, para la vista
   * previa de los identificadores de cada zona. `null` mientras no llega o al editar.
   */
  vistaPrevia?: ProximoIdentificador | null;
};

const FormOperativo: FC<FormOperativoProps> = ({
  modo = "alta",
  variante,
  formularioCodigo,
  tipoTransportePorDefecto,
  catalogos,
  puntos,
  cargandoPuntos,
  onZonalesElegidas,
  permiteAgregarPunto = false,
  candidatos,
  cargandoPersonal,
  personalAgregado,
  onAgregarPersona,
  onRetirarPersona,
  onReemplazarPersona,
  onCambiarHorarioPersona,
  avisoPersonal,
  idPersonaRechazada = null,
  confirmacionPersonal = null,
  observacionesExistentes = [],
  valoresIniciales,
  textoAccion = "Registrar operativo",
  onCancelar,
  onLimpiar,
  bloqueado,
  soloPersonal = false,
  guardando,
  onGuardar,
  refFormik,
  onValoresCambian,
  permiteCantidadPorPersona = false,
  onCambiarCantidadPersona,
  fechaTramites,
  onCambiarTramitePersona,
  tramitePorLote = false,
  personalBloqueado = false,
  horarioFijo = null,
  idCaptura,
  proponerZonalDePersona = false,
  idForm,
  onEstadoEnvio,
  idsNuevos,
  rotulosNuevos,
  rotuloLectura,
  detalleDePersona,
  accionDePersona,
  repartoSubtitulo,
  fechaJornada = null,
  operativoId = null,
  vistaPrevia = null,
}) => {
  /*
    REGISTRO POR ZONAS (2026-10-28): lo decide el dato `cantidadPorZona` del formulario (hoy el 8).
    Zonal, punto, instituciones, tipo de control y cantidad van por zona; persona, horario,
    transporte y observaciones son comunes.
  */
  const porZonas = Boolean(catalogos?.cantidadPorZona);
  /** La zonal del Maestro de cada persona, de la lista de candidatos (`func_zonal_id`). */
  const zonalDelMaestro = (funcionarioId: number | undefined): number | null =>
    candidatos.find((candidato) => candidato.id === funcionarioId)?.zonalId ??
    null;
  const nombreDeZonal = (zonalId: number | null): string | null =>
    (catalogos?.zonales ?? []).find((zonal) => zonal.id === zonalId)?.nombre ?? null;
  /** En el cajón el formulario no pinta su pie: lo lleva el cajón. */
  const enCajon = modo !== "alta";
  /** En la página la columna derecha va abierta (sin tarjetas ni títulos) y el pie, blanco. */
  const varianteEfectiva: VarianteFormOperativo =
    variante ?? (enCajon ? "drawer" : "pagina");
  const enPagina = varianteEfectiva === "pagina";
  /** El horario de cada persona es obligatorio donde se captura (RN-66). */
  const exigeHorario = Boolean(onCambiarHorarioPersona);
  /** Solo los puntos vigentes de las zonales elegidas (§4); el catálogo de lectura ya los filtra. */
  const puntosVigentes = puntos.filter((punto) => punto.activo !== false);
  /*
    «VER REPARTO DE CARGA» EN LA CABECERA DE LA TARJETA (2026-10-16, bloque 3): el botón va en la
    línea del título «Personal y horario» y el selector abre o cierra el reparto según este estado.
  */
  const [verReparto, setVerReparto] = useState(false);

  /*
    HORARIO DEL OPERATIVO Y CRUCES (2026-10-31; controlado desde el 2026-11-04). En el ALTA es parte
    de la captura (`values.horarioOperativo`): se aparta y se carga con el formulario y la fecha, y
    viaja en el borrador. En los CAJONES no se persiste: nace con cada apertura —el del aporte, fijo,
    o al editar el más común del personal— y vive aquí, fuera de Formik, para que cambiarlo no cuente
    como «Cambios sin guardar» (no viaja al servidor). El selector avisa cuántas personas elegidas se
    cruzan con otro operativo del día; mientras haya alguna, el pie lo dice y no se guarda.
  */
  const [horarioDelCajon, setHorarioDelCajon] = useState<HorarioDelOperativo>(
    () =>
      horarioFijo ??
      (modo === "edicion" ? horarioMasComun(personalAgregado) : null) ?? {
        horaInicio: "",
        horaFin: "",
      },
  );
  const [cruces, setCruces] = useState(0);
  const motivoCruce = motivoCruces(cruces);

  /*
    UNA PERSONA Y UN TIPO DE PERSONAL (2026-10-28): lo deciden dos datos del formulario, no su número.
    Al editar, el tipo queda fijado por la persona registrada (su prefijo ya está en el identificador).
  */
  const [tipoFijo] = useState(() =>
    modo === "edicion" ? (personalAgregado[0]?.area ?? null) : null,
  );
  const tipoUnicoDePersonal =
    catalogos?.elegirUnaArea && catalogos.maxPersonas === 1
      ? {
          opciones: (catalogos.prefijosPorArea ?? []).map((fila) => ({
            area: fila.area,
            prefijo: fila.prefijo,
          })),
          fijo: tipoFijo,
        }
      : undefined;
  /*
    PERSONAL POR ÁREA (2026-11-04): con Inspector General y Técnico en las áreas del catálogo, una
    pestaña por área y sin «Todas»; en la patrulla, el área que falta. Lo decide el catálogo, no el
    número. El modo de un solo tipo (el 8) devuelve `null` y sigue con sus tarjetas.
  */
  const porArea = personalPorArea(catalogos, candidatos, personalAgregado);
  /** «IG para Inspector General e IT para Inspector Técnico», del catálogo. */
  const prefijosDelTipo = (catalogos?.prefijosPorArea ?? [])
    .map((fila) => `${fila.prefijo} para ${NOMBRE_AREA[fila.area].split(" - ")[0]}`)
    .join(" e ");

  // El autor de las notas nuevas: quien tiene la sesión. Sin contexto (pruebas aisladas), «Usted».
  const autorDeLasNotas = useContext(UserContext)?.user?.usuFullName || "Usted";
  const refBotonReparto = useRef<HTMLButtonElement>(null);
  const hayCarga = hayCargaCalculada(candidatos);

  return (
    <Formik<ValoresOperativo>
      innerRef={refFormik}
      initialValues={
        valoresIniciales ?? {
          ...VALORES_INICIALES,
          formularioCodigo,
          tipoTransporte: transporteInicial(tipoTransportePorDefecto),
          ...(porZonas ? { zonas: [zonaVacia()] } : {}),
        }
      }
      enableReinitialize
      validationSchema={porZonas ? esquemaOperativoPorZonas : esquemaOperativo}
      /*
        EL PERSONAL ES OBLIGATORIO, Y SE VALIDA AQUÍ Y NO EN YUP (2026-09-02): no es un campo de
        Formik. Formik lo trata como cualquier otro error y no llama a `onGuardar`. En modo aporte
        no aplica: no hay botón de guardar. Desde el 2026-09-08 exige también el horario de cada
        persona (RN-66), donde se captura.
      */
      validate={(valores) => {
        if (soloPersonal) return {};
        const falta = faltaDelPersonal(personalAgregado, exigeHorario);
        // Registro por zonas: cada zona completa (2026-10-28). La persona, como siempre.
        const faltaEnZonas = porZonas ? faltantesDeZonas(zonasDe(valores)) : [];
        if (faltaEnZonas.length > 0 && !falta) {
          return { zonas: `Complete las zonas: ${faltaEnZonas.join("; ")}.` };
        }
        if (falta === "personal") {
          return {
            personal:
              "Asigne al menos una persona al operativo antes de registrarlo.",
          };
        }
        if (falta === "horario del personal") {
          return {
            personal: "Indique el horario (inicio y fin) de cada persona asignada.",
          };
        }
        if (motivoCruce) return { personal: `${motivoCruce}.` };
        return {};
      }}
      /*
        LA NOTA ESCRITA SIN «AGREGAR» TAMBIÉN VIAJA (2026-10-16). Se suma a la lista antes de
        entregar los valores, se deja visible en la lista (por si el envío falla) y se avisa por
        `extras` para que el aviso de éxito lo diga.
      */
      onSubmit={(valores, ayudas) => {
        const { valores: aEnviar, agregada } = conNotaPendiente(valores, new Date());
        if (agregada) {
          void ayudas.setFieldValue("observaciones", aEnviar.observaciones, false);
          void ayudas.setFieldValue("observacionesHoras", aEnviar.observacionesHoras, false);
          void ayudas.setFieldValue("notaPendiente", "", false);
        }
        return onGuardar(aEnviar, ayudas, { notaPendienteAgregada: agregada });
      }}
    >
      {({ values, setFieldValue, errors, touched, submitCount }) => {
        /*
          LO QUE FALTA, UNA SOLA VEZ POR PINTADO, para el pie (el del alta o el del cajón) y para
          las tarjetas en rojo tras intentar. El aviso rojo sobre el bloque de personal sigue
          saliendo solo tras el primer envío, como el resto de los errores del formulario.
        */
        const faltaPersonal = soloPersonal
          ? null
          : faltaDelPersonal(personalAgregado, exigeHorario);
        const zonas = zonasDe(values);
        const faltantes = porZonas
          ? [
              ...(faltaPersonal === null
                ? []
                : faltaPersonal === "personal"
                  ? [FALTA_PERSONA]
                  : [faltaPersonal]),
              ...faltantesDeZonas(zonas),
            ]
          : nombresQueFaltan(values, faltaPersonal);
        const personaZonal = zonalDelMaestro(personalAgregado[0]?.funcionarioId);
        const indicePrincipal = indiceZonaPrincipal(zonas, personaZonal);
        const principalEsDelMaestro =
          personaZonal !== null && zonas[indicePrincipal]?.zonalId === personaZonal;
        const nombrePrincipal = nombreDeZonal(zonas[indicePrincipal]?.zonalId ?? null);
        const intentado = submitCount > 0;
        const secciones = intentado ? seccionesConFalta(faltantes) : new Set<string>();

        const errorPersonal = (errors as ErroresDelOperativo).personal;
        const hayErrorPersonal = intentado && Boolean(errorPersonal);

        /*
          AL ASIGNAR UNA PERSONA SE PROPONE SU ZONAL COMO ZONAL DEL OPERATIVO (2026-09-24). Solo en
          el alta (`proponerZonalDePersona`) y solo si el formulario OFRECE esa zonal (RN-16).
        */
        /*
          REGISTRO POR ZONAS: al elegir la persona, la Zona 1 vacía toma su zonal del Maestro (y su
          punto, si es el único), siempre que el formulario la ofrezca.
        */
        const llenarZonaConElMaestro = (persona: PersonaElegible): void => {
          const zonal = persona.zonalId;
          if (zonal == null || zonas.some((z) => z.zonalId === zonal)) return;
          if (zonas[0].zonalId !== null) return;
          if (!(catalogos?.zonales ?? []).some((z) => z.id === zonal)) return;
          const propios = (catalogos?.puntos ?? []).filter(
            (punto) => punto.zonalId === zonal && punto.activo !== false,
          );
          void setFieldValue("zonas", [
            { ...zonas[0], zonalId: zonal, puntoId: propios.length === 1 ? propios[0].id : null },
            ...zonas.slice(1),
          ]);
        };
        const agregarConZonal = (persona: PersonaElegible): void => {
          onAgregarPersona(persona);
          if (porZonas) {
            if (modo === "alta") llenarZonaConElMaestro(persona);
            return;
          }
          if (!proponerZonalDePersona) return;
          const zonal = persona.zonalId;
          if (zonal == null || values.zonalesIds.includes(zonal)) return;
          const laOfrece = (catalogos?.zonales ?? []).some((z) => z.id === zonal);
          if (!laOfrece) return;
          const zonales = [...values.zonalesIds, zonal];
          void setFieldValue("zonalesIds", zonales);
          onZonalesElegidas(zonales);
        };

        const deshabilitadoGenerales = bloqueado || soloPersonal;

        const tarjetaPersonal = (
          <div
            // Destino del foco cuando lo que falta es el personal o su horario (`FocoAlPrimerError`).
            id={ID_BLOQUE_PERSONAL}
            tabIndex={-1}
            className="flex min-w-0 flex-col focus:outline-none"
          >
            <SeccionDrawer
              titulo="Personal y horario"
              obligatoria={!soloPersonal}
              conFalta={secciones.has("personal")}
              rejilla={false}
              accion={
                hayCarga ? (
                  <BotonRepartoCarga
                    ref={refBotonReparto}
                    onClick={() => setVerReparto(true)}
                    expandido={verReparto}
                    conteo={conteoSemaforo(candidatos, nivelDeCargaPersonal)}
                  />
                ) : undefined
              }
            >
              <SelectorPersonal
                candidatos={candidatos}
                cargando={cargandoPersonal}
                agregadas={personalAgregado}
                onAgregar={agregarConZonal}
                onRetirar={onRetirarPersona}
                tipoUnico={tipoUnicoDePersonal}
                porArea={porArea}
                onReemplazar={
                  porZonas && onReemplazarPersona && modo === "alta"
                    ? (salienteId, entrante) => {
                        onReemplazarPersona(salienteId, entrante);
                        llenarZonaConElMaestro(entrante);
                      }
                    : onReemplazarPersona
                }
                /* Form 8 en edición: el personal queda en solo lectura (ids ya generados). */
                deshabilitado={bloqueado || personalBloqueado}
                obligatorio={!soloPersonal}
                /*
                  DOS ORÍGENES, UNA SOLA RANURA, Y MANDA EL DEL SERVIDOR: el rechazo de una persona
                  concreta lo redacta el servidor y describe algo que acaba de pasar; «asigne al
                  menos una» es local y describe algo que falta.
                */
                avisoRechazo={
                  avisoPersonal ??
                  (hayErrorPersonal ? (errorPersonal ?? null) : null)
                }
                idPersonaRechazada={idPersonaRechazada}
                faltaTrasIntento={hayErrorPersonal && personalAgregado.length === 0}
                verReparto={verReparto}
                onCambiarVerReparto={setVerReparto}
                refBotonReparto={refBotonReparto}
                confirmacion={confirmacionPersonal}
                bandejaSinTope={enCajon}
                listaCompacta
                // El horario de cada persona, con sus dos campos a la vista (regla 14, RN-66).
                horarioInline
                horarioOperativo={modo === "alta" ? horarioDeLaCaptura(values) : horarioDelCajon}
                onCambiarHorarioOperativo={
                  modo === "alta"
                    ? (horario) => void setFieldValue("horarioOperativo", horario)
                    : setHorarioDelCajon
                }
                idCaptura={idCaptura}
                horarioFijo={horarioFijo !== null}
                onCrucesCambian={setCruces}
                conGuardarCambios={modo === "edicion"}
                idsNuevos={idsNuevos}
                rotulosNuevos={rotulosNuevos}
                rotuloLectura={rotuloLectura}
                accionDePersona={accionDePersona}
                detalleDePersona={
                  detalleDePersona ??
                  (porZonas
                    ? (persona) => {
                        const zonal = zonalDelMaestro(persona.funcionarioId);
                        return `Zonal en el Maestro: ${
                          zonal === null ? "sin zonal" : (nombreDeZonal(zonal) ?? "otra zonal")
                        }`;
                      }
                    : undefined)
                }
                // El título de la tarjeta («Personal y horario *») reemplaza al rótulo del bloque.
                ocultarEtiqueta
                /* Reparto de carga: dentro del cajón como vista del mismo; en el alta, cajón aparte. */
                repartoEnCajon={enCajon}
                repartoSubtitulo={repartoSubtitulo}
                onCambiarHorario={onCambiarHorarioPersona}
                horasHorario={horasSeleccionables()}
                permiteCantidadPorPersona={
                  permiteCantidadPorPersona && !soloPersonal && !porZonas
                }
                onCambiarCantidad={onCambiarCantidadPersona}
                fechaTramites={fechaTramites}
                onCambiarTramite={onCambiarTramitePersona}
                /* El trámite se corrige aunque el personal del 8 esté bloqueado: no cambia códigos. */
                tramiteDeshabilitado={bloqueado}
                tramitePorLote={tramitePorLote}
              />
            </SeccionDrawer>
          </div>
        );

        const tarjetaLugar = (
          <SeccionDrawer titulo="Lugar" conFalta={secciones.has("lugar")} abierta={enPagina}>
            <SelectorZonalPunto
              renderTipo={false}
              enCajon={enCajon}
              zonalesFlotante
              tiposFlotante
              zonales={catalogos?.zonales ?? []}
              zonalesSeleccionadas={values.zonalesIds}
              onZonalesChange={(ids) => {
                void setFieldValue("zonalesIds", ids);
                /*
                  EL PUNTO ES DE UNA ZONAL (§4, 2026-10-16). Sin zonales no hay punto posible; y si
                  se quitó la zonal a la que pertenecía el punto elegido, también se limpia. Agregar
                  una zonal no invalida el punto: se recargan los puntos de la UNIÓN.
                */
                const elegido = puntosVigentes.find((p) => String(p.id) === values.punto);
                if (ids.length === 0 || (elegido && !ids.includes(elegido.zonalId))) {
                  void setFieldValue("punto", "");
                  void setFieldValue("puntoLibre", "");
                }
                // Un PUNTO NUEVO pendiente se descarta si se deselecciona su zonal.
                if (
                  ids.length === 0 ||
                  (values.puntoNuevo && !ids.includes(values.puntoNuevo.zonalId))
                ) {
                  if (values.puntoNuevo) void setFieldValue("punto", "");
                  void setFieldValue("puntoNuevo", null);
                }
                onZonalesElegidas(ids);
              }}
              puntos={puntosVigentes}
              cargandoPuntos={cargandoPuntos}
              puntoSeleccionado={values.punto}
              onPuntoChange={(valor) => {
                void setFieldValue("punto", valor);
                if (valor !== OPCION_ADICIONALES) {
                  void setFieldValue("puntoLibre", "");
                }
                // Al elegir otro punto se descarta el punto nuevo pendiente.
                if (valor !== OPCION_PUNTO_NUEVO) {
                  void setFieldValue("puntoNuevo", null);
                }
              }}
              puntoLibre={values.puntoLibre}
              onPuntoLibreChange={(texto) =>
                void setFieldValue("puntoLibre", texto)
              }
              tiposControl={catalogos?.tiposControl ?? []}
              tipoSeleccionado={values.tipoControl}
              onTipoChange={(valor) => void setFieldValue("tipoControl", valor)}
              tipoMultiple={catalogos?.tipoControlMultiple ?? false}
              tiposSeleccionadosIds={values.tiposControlIds}
              onTiposChange={(ids) => void setFieldValue("tiposControlIds", ids)}
              tipoLibre={values.tipoLibre}
              onTipoLibreChange={(texto) => void setFieldValue("tipoLibre", texto)}
              capturaLibrePunto={catalogos?.capturaLibrePunto ?? false}
              capturaLibreTipo={catalogos?.capturaLibreTipo ?? false}
              permiteAgregarPunto={
                (catalogos?.puntoManual ?? false) && permiteAgregarPunto
              }
              onAgregarPunto={(nombre, zonalId) => {
                void setFieldValue("punto", OPCION_PUNTO_NUEVO);
                void setFieldValue("puntoNuevo", { nombre, zonalId });
                void setFieldValue("puntoLibre", "");
              }}
              puntoNuevoNombre={values.puntoNuevo?.nombre}
              deshabilitado={deshabilitadoGenerales}
              /*
               * Un error se muestra cuando el campo se tocó, y al enviar Formik marca como tocados
               * todos: es el momento en que hacen falta.
               */
              errores={{
                zonal: touched.zonalesIds
                  ? (errors.zonalesIds as string | undefined)
                  : undefined,
                punto: touched.punto ? errors.punto : undefined,
                puntoLibre: touched.puntoLibre ? errors.puntoLibre : undefined,
                tipoControl: touched.tipoControl ? errors.tipoControl : undefined,
                tipoLibre: touched.tipoLibre ? errors.tipoLibre : undefined,
              }}
            />
          </SeccionDrawer>
        );

        const tarjetaControl = (
          <SeccionDrawer
            titulo="Control"
            conFalta={secciones.has("control")}
            abierta={enPagina}
            separada
          >
            <div className="flex w-full min-w-0 flex-col gap-3" data-celda="instituciones">
              <SelectorTokens
                id="instituciones"
                etiqueta="Instituciones"
                obligatorio
                opciones={catalogos?.instituciones ?? []}
                seleccionadas={values.institucionesIds}
                onCambio={(ids) => void setFieldValue("institucionesIds", ids)}
                etiquetaCorta={siglaDeInstitucion}
                etiquetaLarga={nombreDeInstitucion}
                marcador="Agregar institución…"
                flotante
                cajaUnica={enCajon}
                deshabilitado={deshabilitadoGenerales}
                error={
                  touched.institucionesIds && errors.institucionesIds
                    ? String(errors.institucionesIds)
                    : null
                }
              />
            </div>
            <SelectorTipoControl
              enCajon={enCajon}
              tiposFlotante
              tiposControl={catalogos?.tiposControl ?? []}
              tipoSeleccionado={values.tipoControl}
              onTipoChange={(valor) => {
                void setFieldValue("tipoControl", valor);
                if (valor !== OPCION_ADICIONALES) {
                  void setFieldValue("tipoLibre", "");
                }
              }}
              tipoMultiple={catalogos?.tipoControlMultiple ?? false}
              tiposSeleccionadosIds={values.tiposControlIds}
              onTiposChange={(ids) => void setFieldValue("tiposControlIds", ids)}
              tipoLibre={values.tipoLibre}
              onTipoLibreChange={(texto) => void setFieldValue("tipoLibre", texto)}
              capturaLibreTipo={catalogos?.capturaLibreTipo ?? false}
              deshabilitado={deshabilitadoGenerales}
              errorTipoControl={touched.tipoControl ? errors.tipoControl : undefined}
              errorTipoLibre={touched.tipoLibre ? errors.tipoLibre : undefined}
            />
          </SeccionDrawer>
        );

        /*
          OBSERVACIONES (2026-10-16). Un solo componente en el alta y en el cajón: las notas se
          agregan, y las de la sesión —aún no guardadas— se corrigen o se quitan. Las ya escritas
          (cajón de edición) siguen en solo lectura. Lo escrito sin «Agregar» vive en el borrador
          (`notaPendiente`) y se suma solo al enviar. Reemplaza al `textarea` del alta (R8), que
          perdía las varias notas, y a `CapturadorNotas`.
        */
        const notas = (
          <ObservacionesOperativo
            notas={values.observaciones}
            horas={values.observacionesHoras}
            onCambio={({ notas: lista, horas }) => {
              void setFieldValue("observaciones", lista);
              void setFieldValue("observacionesHoras", horas);
            }}
            pendiente={values.notaPendiente ?? ""}
            onPendienteCambio={(texto) => void setFieldValue("notaPendiente", texto)}
            guardadas={observacionesExistentes}
            autor={autorDeLasNotas}
            deshabilitado={deshabilitadoGenerales}
            distinguirNuevas={enCajon}
          />
        );

        const tarjetaTransporte = (
          <SeccionDrawer
            titulo={
              porZonas
                ? "Transporte requerido · común a todo el operativo"
                : enPagina
                  ? "Transporte"
                  : "Transporte y observaciones"
            }
            obligatoria={porZonas}
            rejilla={false}
            abierta={enPagina}
            separada
          >
            <div className="flex w-full min-w-0 flex-col" data-celda="transporte">
              <SelectorTipoTransporte
                valor={values.tipoTransporte ?? "COMPLETO"}
                sugerido={tipoTransportePorDefecto}
                deshabilitado={deshabilitadoGenerales}
                onCambiar={(tipo) => {
                  void setFieldValue("tipoTransporte", tipo);
                  void setFieldValue("tipoTransporteManual", true);
                  // El macrooperativo solo existe en COMPLETO (2026-10-19): en otro tipo se limpia.
                  if (!admiteMacrooperativo(tipo)) void setFieldValue("esMacrooperativo", false);
                  // Propios medios no pide vehículo: con él se limpia la solicitud de compartir
                  // unidad (2026-10-19), que solo vale con transporte DAF.
                  if (!pideVehiculo(tipo)) {
                    void setFieldValue("eleccionCompartir", undefined);
                    void setFieldValue("compartirConOperativoId", null);
                    void setFieldValue("compartirConIdentificador", null);
                  }
                }}
                junto={
                  admiteMacrooperativo(values.tipoTransporte) ? (
                    <label
                      className="label cursor-pointer gap-2 whitespace-normal"
                      title={DESCRIPCION_MACROOPERATIVO}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        name="esMacrooperativo"
                        checked={values.esMacrooperativo ?? false}
                        disabled={deshabilitadoGenerales}
                        aria-describedby="macrooperativo-ayuda"
                        onChange={(evento) => {
                          const marcado = evento.target.checked;
                          void setFieldValue("esMacrooperativo", marcado);
                          // Compartir y vehículo exclusivo se excluyen (como en el servidor).
                          if (marcado && values.eleccionCompartir === "COMPARTIR") {
                            void setFieldValue("eleccionCompartir", undefined);
                            void setFieldValue("compartirConOperativoId", null);
                            void setFieldValue("compartirConIdentificador", null);
                          }
                        }}
                      />
                      <span className="label-text min-w-0">{ROTULO_MACROOPERATIVO}</span>
                      {/* La explicación va en `title`; aquí solo para el lector de pantalla. */}
                      <span id="macrooperativo-ayuda" className="sr-only">
                        {DESCRIPCION_MACROOPERATIVO}
                      </span>
                    </label>
                  ) : null
                }
              />
              <AplicarTransporteSugerido sugerido={tipoTransportePorDefecto} />
              {porZonas && (
                <p className="mt-1 text-xs text-app-muted">
                  La DAF lo ve como <strong>un solo operativo</strong> y asigna conductor y vehículo
                  según <strong>{nombrePrincipal ?? "la zona principal"}</strong>.
                </p>
              )}
              {/* Compartir unidad (2026-10-19): solo en el alta y la edición, nunca en el adicional. */}
              {!porZonas && modo !== "adicional" && fechaJornada && !soloPersonal && (
                <SugerenciaCompartirUnidad
                  fecha={fechaJornada}
                  personal={personalAgregado}
                  zonalDelPunto={
                    puntosVigentes.find((p) => String(p.id) === values.punto)?.zonalId ?? null
                  }
                  excluirOperativoId={operativoId}
                  deshabilitado={deshabilitadoGenerales}
                />
              )}
            </div>
            {/* En la página las observaciones son su propio grupo, tras otro filete. */}
            {!enPagina && notas}
          </SeccionDrawer>
        );

        const grupoObservaciones = enPagina && (
          <SeccionDrawer titulo="Observaciones" rejilla={false} abierta separada>
            {notas}
          </SeccionDrawer>
        );

        return (
          <Form
            id={idForm}
            className={`flex flex-col gap-4 ${enCajon ? "" : "app-form-operativo"}`}
          >
            {/*
              EN EL ALTA, DOS COLUMNAS DESDE `lg`: el personal a la izquierda (~55 %) y Lugar,
              Control y Transporte y observaciones apiladas a la derecha (~45 %). En el cajón —y en
              la patrulla, sin personal— todo apilado.
            */}
            <div
              className={`grid grid-cols-1 gap-4 ${
                !enCajon ? "lg:grid-cols-[11fr_9fr] lg:items-start" : ""
              }`}
            >
              {tarjetaPersonal}
              {/* En la página, grupos abiertos con filete entre ellos (14 px de aire arriba). */}
              <div className={`flex min-w-0 flex-col ${enPagina ? "gap-3.5" : "gap-4"}`}>
                {porZonas ? (
                  <BloqueZonas
                    zonas={zonas}
                    onCambiar={(lista) => void setFieldValue("zonas", lista)}
                    catalogos={catalogos}
                    indicePrincipal={indicePrincipal}
                    principalEsDelMaestro={principalEsDelMaestro}
                    rangos={
                      vistaPrevia
                        ? rangosDeVistaPrevia(zonas, vistaPrevia.prefijo, vistaPrevia.siguiente)
                        : null
                    }
                    sinPersona={personalAgregado.length === 0}
                    deshabilitado={deshabilitadoGenerales}
                    intentado={intentado}
                  />
                ) : (
                  <>
                    {tarjetaLugar}
                    {tarjetaControl}
                  </>
                )}
                {tarjetaTransporte}
                {grupoObservaciones}
                {tipoUnicoDePersonal && prefijosDelTipo && (
                  <AvisoEnLinea variante="info">
                    {porZonas
                      ? `Prefijo según el tipo de personal: ${prefijosDelTipo}. La numeración sigue el contador del día y avanza zona por zona. Zonal, punto, instituciones, tipo de control y cantidad se eligen por zona; persona, horario, transporte y observaciones son comunes a todo el operativo.`
                      : `El identificador toma el prefijo del tipo de personal: ${prefijosDelTipo}.`}
                  </AvisoEnLinea>
                )}
              </div>
            </div>

            {!enCajon && !soloPersonal && (
              <PieDelAlta
                variante={varianteEfectiva}
                faltantes={faltantes}
                efectivos={personalAgregado.length}
                hayDatos={hayDatosCapturados(values, personalAgregado.length)}
                textoAccion={textoAccion}
                // Registro por zonas: Registrar queda apagado mientras falte algo (2026-10-28).
                bloqueado={bloqueado || (porZonas && faltantes.length > 0)}
                guardando={guardando}
                onLimpiar={onLimpiar}
                onCancelar={onCancelar}
                motivoCruce={motivoCruce}
                faltaComposicion={porArea?.faltan ?? []}
                textoListo={
                  porZonas
                    ? textoListoPorZonas(nombreTipoTransporte(values.tipoTransporte), zonas)
                    : undefined
                }
              />
            )}

            <FocoAlPrimerError personalPrimero />
            {onEstadoEnvio && (
              <ReporteroDeEstado
                faltantes={faltantes}
                cruces={cruces}
                faltaComposicion={porArea?.faltan ?? []}
                onEstadoEnvio={onEstadoEnvio}
              />
            )}
            {onValoresCambian && (
              <ReporteroDeValores onValoresCambian={onValoresCambian} />
            )}
          </Form>
        );
      }}
    </Formik>
  );
};

export default FormOperativo;
