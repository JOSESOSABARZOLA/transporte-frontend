/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: PanelAdicionalOperativo.tsx
 * Responsabilidad: Capturar un operativo adicional sobre otro ya registrado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ ES UN ADICIONAL. Una salida extraordinaria que se dispone POR URGENCIA el mismo día
 * en que se ejecuta, colgando de un operativo que ya estaba planificado. No corrige al
 * original —para eso está el panel de edición— ni es una segunda salida programada.
 *
 * NO CONFUNDIR CON `OPCION_ADICIONALES`, que aparece en este mismo formulario y es otra
 * cosa: la captura libre de un punto o un tipo de control (RN-20). Las dos usan la
 * palabra «adicional» y no tienen ninguna relación.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SE CAPTURA CON EL MISMO FORMULARIO CON EL QUE SE REGISTRA Y SE EDITA, por el motivo de
 * siempre: un segundo formulario significaría un segundo esquema de validación, y el día
 * que se corrija uno el otro seguirá aceptando lo que el servidor rechaza.
 *
 * PARTE DE LOS VALORES DEL OPERATIVO ORIGINAL, y es deliberado. La meta declarada por el
 * Product Owner es registrar en dos o tres minutos, y un adicional se captura con prisa
 * —de eso trata—: la zonal, el punto y las instituciones casi siempre coinciden con las
 * del operativo del que nace. Todo es modificable.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN ADICIONAL HEREDA LOS RECURSOS DEL OPERATIVO DEL QUE NACE. Regla del 2026-08-21.
 *
 * Es lo que define la figura: no se está creando un operativo nuevo que casualmente se
 * parece a otro, se está prolongando **el mismo** con otro horario. Por eso hereda todo lo
 * que el original tenía asignado.
 *
 * | Recurso | Cómo |
 * |---|---|
 * | Zonal, punto, tipo, instituciones | Copiados como valores de partida, editables |
 * | **Personal** | **Automático** al fijar el horario, y editable después |
 * | **Conductor y vehículo** | **Automático, en el servidor.** Ver `heredarTransporte` |
 * | Observaciones | **No.** Describen aquel operativo, no éste, y no son un recurso |
 *
 * DOS VERSIONES ANTERIORES SE EQUIVOCARON, y conviene dejarlo escrito. La primera no
 * heredaba el personal —cada persona tiene su veredicto de descanso, y arrastrarlo
 * ofrecería como elegida a gente que a esa hora no puede salir—. La segunda lo puso tras
 * un botón. Las dos trataban la herencia como una comodidad opcional, y no lo es: es la
 * definición de un adicional.
 *
 * HEREDAR NO SALTA NINGUNA COMPROBACIÓN, y eso no se negocia. `candidatos` trae `elegible`
 * y `motivo` **calculados con el horario de este adicional**: se agrega a quien puede, y
 * de quien no, **se dice el nombre y el motivo** en lugar de dejarlo caer en silencio. Un
 * adicional con menos gente de la que se creía haber puesto no daría ningún error hasta el
 * día del operativo.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL HORARIO NACE EN BLANCO, Y ES CONSECUENCIA DE LO ANTERIOR.
 *
 * Antes se copiaba el del padre. Con la herencia automática eso era una trampa: la misma
 * gente estaría en dos operativos a la misma hora, RN-28 los rechazaría a todos, y quien
 * captura vería un panel lleno de avisos sin haber hecho nada mal.
 *
 * Un adicional es **otra salida**: su horario es lo único que por definición difiere. Se
 * pide primero, y con él ya fijado se hereda el equipo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * VIVE EN UN CAJÓN LATERAL, NO EN LA PÁGINA (2026-10-08). Hasta entonces Órdenes de servicio lo
 * insertaba encima de la tabla y la empujaba; Mis operativos ya lo llevaba en el cajón desde el
 * 2026-09-30. Ahora las dos pantallas usan `DrawerOperativo` (modo «adicional»), que pone la cabecera, el
 * pie fijo y la confirmación de descarte; este componente es solo el CUERPO, por secciones.
 */

import { useCallback, useEffect, useRef, type FC } from "react";
import type { FormikHelpers } from "formik";

import Boton from "../common/Boton.tsx";
import FormOperativo, {
  type EstadoEnvio,
  type ExtrasDelEnvio,
} from "./FormOperativo.tsx";
import {
  comoValoresDeFormulario,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import type { PersonaAgregada } from "./SelectorPersonal.tsx";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

export type PanelAdicionalOperativoProps = {
  /** El operativo del que nace. Aporta la jornada, el formulario y los valores de partida. */
  origen: Operativo;
  catalogos: CatalogosFormulario | null;
  puntos: CatalogosFormulario["puntos"];
  cargandoPuntos: boolean;
  onZonalesElegidas: (zonalesIds: number[]) => void;

  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  /** Se lleva en la pantalla, no en el operativo: todavía no existe al que colgarlas. */
  personalAgregado: PersonaAgregada[];
  onAgregarPersona: (persona: PersonaElegible) => void;
  onRetirarPersona: (funcionarioId: number) => void;
  /**
   * Horario propio de cada persona (2026-09-08, RN-66). El adicional ya no tiene horario
   * único: como el registro, cada persona lleva el suyo y el servidor deriva la ventana.
   */
  onCambiarHorarioPersona: (
    funcionarioId: number,
    horaInicio: string,
    horaFin: string,
  ) => void;
  /**
   * TRÁMITE DE INSPECCIÓN (2026-10-07). Si llega, cada inspector del adicional ofrece su combo con
   * los trámites de la fecha de la jornada (la del original). Entra con el adicional al registrar.
   */
  onCambiarTramitePersona?: (
    funcionarioId: number,
    codigoTramite: string | null,
  ) => void;
  avisoPersonal: string | null;
  /** A quién se refiere `avisoPersonal`, si el servidor lo nombró (R2): el motivo va bajo su horario. */
  idPersonaRechazada?: number | null;

  /**
   * RN-58, **no** RN-56. Aquí solo bloquea el cuadro cerrado: la ventana de carga no
   * cuenta, y ese es justamente el sentido del adicional. Ver el aviso del cuerpo.
   */
  bloqueado: boolean;
  /** Si la ventana de carga del departamento está cerrada ahora mismo. */
  ventanaCerrada: boolean;
  guardando: boolean;
  onGuardar: (
    valores: ValoresOperativo,
    ayudas: FormikHelpers<ValoresOperativo>,
    extras?: ExtrasDelEnvio,
  ) => void | Promise<void>;
  /** `id` del `<form>`: el botón «Registrar adicional» del pie del cajón lo envía con `form=`. */
  idForm: string;
  /** Qué falta y si hay cambios, para el estado del pie del cajón. */
  onEstadoEnvio: (estado: EstadoEnvio) => void;
};

/** Quién del equipo del padre no pudo heredarse, y por qué lo dice el servidor. */
type NoHeredado = { nombre: string; motivo: string };

const PanelAdicionalOperativo: FC<PanelAdicionalOperativoProps> = ({
  origen,
  catalogos,
  puntos,
  cargandoPuntos,
  onZonalesElegidas,
  candidatos,
  cargandoPersonal,
  personalAgregado,
  onAgregarPersona,
  onRetirarPersona,
  onCambiarHorarioPersona,
  onCambiarTramitePersona,
  avisoPersonal,
  idPersonaRechazada = null,
  bloqueado,
  ventanaCerrada,
  guardando,
  onGuardar,
  idForm,
  onEstadoEnvio,
}) => {
  const yaAgregados = new Set(
    personalAgregado.map((persona) => persona.funcionarioId),
  );
  const porHeredar = origen.personal.filter(
    (persona) => !yaAgregados.has(persona.funcionarioId),
  );

  /**
   * A quién del equipo del padre no se pudo heredar, **derivado y no guardado**.
   *
   * Desde RN-66 (2026-09-08) el adicional no tiene horario único: los elegibles se piden por
   * área y ausencia, y el cruce por hora lo valida el servidor por persona al registrar. Así
   * que «no heredado» es aquí «falta por heredar y ya no figura entre los elegibles del
   * formulario» —baja del maestro, cambio de área—. A quien se quitó a mano no se le nombra:
   * sigue faltando, pero **sí podía**, y llamarlo «no heredado» acusaría al sistema de algo
   * que hizo la persona.
   */
  const noHeredados: NoHeredado[] = !cargandoPersonal
    ? porHeredar.flatMap((persona) => {
        const candidato = candidatos.find(
          (fila) => fila.id === persona.funcionarioId,
        );

        if (candidato?.elegible) return [];

        return [
          {
            nombre: persona.nombre,
            motivo:
              candidato?.motivo ??
              "Ya no figura entre el personal elegible de este formulario.",
          },
        ];
      })
    : [];

  /**
   * Agrega del equipo del padre a quien sigue elegible (área y ausencia), y nombra a quien
   * no. Heredar no salta ninguna comprobación: el horario de cada persona se captura abajo y
   * el servidor valida el cruce al registrar. Cada heredado entra **sin horario** —el
   * adicional es otra salida a otra hora— y hay que fijárselo.
   *
   * Quien ya no figure en la lista se trata como rechazado, no como ausente: puede haberse
   * dado de baja del maestro o haber cambiado de área, y callarlo dejaría un equipo
   * incompleto sin que nadie se enterara.
   */
  const heredarPersonal = useCallback(() => {
    const yaEstan = new Set(
      personalAgregado.map((persona) => persona.funcionarioId),
    );

    for (const persona of origen.personal) {
      if (yaEstan.has(persona.funcionarioId)) continue;

      const candidato = candidatos.find(
        (fila) => fila.id === persona.funcionarioId,
      );

      // A quien ya no es elegible NO se le agrega. `noHeredados` lo nombra, derivado de
      // este mismo criterio: los dos miran `elegible`, así que no pueden discrepar.
      if (candidato?.elegible) onAgregarPersona(candidato);
    }
  }, [candidatos, onAgregarPersona, origen.personal, personalAgregado]);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * LA HERENCIA AUTOMÁTICA, en cuanto el servidor responde quién sigue elegible.
   *
   * SE HEREDA UNA SOLA VEZ, y el `ref` es lo que lo garantiza. Sin él, quitar a una persona
   * a mano volvería a agregarla en el siguiente pintado: la pantalla pelearía contra quien
   * la usa. Ya no depende del horario —el adicional no tiene uno único (RN-66)—: se dispara
   * cuando llega la lista de elegibles. El botón «Volver a heredar» es el reintento manual
   * tras haber quitado a alguien por error.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const yaHeredado = useRef(false);

  useEffect(() => {
    if (cargandoPersonal || candidatos.length === 0) return;
    if (yaHeredado.current) return;

    yaHeredado.current = true;
    heredarPersonal();
  }, [cargandoPersonal, candidatos.length, heredarPersonal]);

  return (
    <div className="flex flex-col gap-4">
      {/*
        a) CONTEXTO, COMPACTO (2026-10-08). Era un párrafo de cinco líneas antes de cualquier
        campo; ahora una línea con lo esencial y «¿Cómo funciona?», que despliega el detalle. Un
        `<details>` da el teclado y el anuncio de «expandido» sin código propio.
      */}
      <div className="flex flex-col gap-1 text-sm text-app-muted">
        <p>
          Se registra en la misma jornada y formulario que{" "}
          {origen.identificador}, con su propia numeración.
        </p>
        <details>
          <summary className="link link-primary w-fit text-sm">
            ¿Cómo funciona?
          </summary>
          <p className="mt-1 text-xs text-app-muted">
            El identificador lo pone el servidor. Los valores llegan copiados del
            operativo original y puede cambiarlos todos. El personal se elige aquí
            y entra con el adicional: si alguien es rechazado no se crea nada y lo
            capturado se conserva.
          </p>
        </details>
      </div>

      {/*
        EL TRANSPORTE SE HEREDA SOLO, EN EL SERVIDOR · 2026-08-21.

        No es un control porque no hay nada que elegir: conductor y placa los escribe la
        DAF (RN-40), y aquí no se toma una decisión nueva, se reutiliza la suya. El
        servidor copia los del operativo original **si el conductor puede conducir en este
        horario**, y si no, el adicional nace pendiente y lo dice al terminar.

        Se anuncia antes de capturar porque cambia lo que hay que hacer después: con
        transporte heredado el adicional está listo; sin él, hay que esperar a la DAF. Desde el
        2026-10-08 va como aviso SUAVE (hoy `AvisoEnLinea` info), no como barra azul sólida.
      */}
      {origen.estadoTransporte === "ASIGNADO" && (
        <AvisoEnLinea variante="info">
            {origen.identificador} ya tiene conductor y placa asignados por la
            DAF. <strong>Se heredarán</strong> si ese conductor puede cubrir el
            horario del adicional; si no, quedará pendiente de la DAF.
          </AvisoEnLinea>
      )}

      {/*
        SE DICE QUE ESTO ES UNA EXCEPCIÓN, y se dice antes de capturar.

        Quien registra fuera de ventana debe saber que lo está haciendo y que queda
        constancia. Un formulario que simplemente funciona a deshora enseña que la ventana
        no significa nada, y la ventana es lo que sostiene que el cuadro esté armado antes
        de la jornada.
      */}
      {ventanaCerrada && !bloqueado && (
        <AvisoEnLinea variante="advertencia" rol="alert">
            Su ventana de carga está cerrada. Un adicional puede registrarse de
            todos modos, porque se dispone el día de la ejecución, y queda
            constancia en la auditoría de que se creó fuera de ventana.
          </AvisoEnLinea>
      )}

      {/*
        EL EQUIPO DEL ORIGINAL · 2026-08-21, adaptado a RN-66 (2026-09-08).

        Se hereda **solo**, en cuanto llega la lista de elegibles. Lo que este bloque hace es
        decir de dónde salió la gente que aparece abajo y qué pasó con quien no pudo venir:
        sin esto, alguien que quitó a una persona vería reaparecer un equipo del que no
        recuerda el origen. Cada heredado entra SIN horario —hay que fijárselo abajo, porque
        el adicional es otra salida a otra hora—. Desde el 2026-10-08 las personas van como
        distintivos, no como una frase.

        El botón queda como REINTENTO, no como el camino normal: sirve tras haber quitado a
        alguien por error.
      */}
      {origen.personal.length > 0 && !bloqueado && (
        <div className="flex flex-col gap-2 rounded-box border border-base-300 bg-base-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-app-label">
              Heredadas de {origen.identificador} ({origen.personal.length})
              {cargandoPersonal ? (
                <span className="font-normal text-app-muted">
                  {" "}
                  · cargando elegibles…
                </span>
              ) : porHeredar.length > 0 ? (
                <span className="font-normal text-app-muted">
                  {" "}
                  · faltan {porHeredar.length} por heredar
                </span>
              ) : null}
            </span>
            <Boton
              variante="secundario"
              tamano="sm"
              icono="actualizar"
              onClick={heredarPersonal}
              deshabilitado={guardando || cargandoPersonal}
              motivoDeshabilitado={porHeredar.length === 0 ? "Ya están todas agregadas." : null}
              title="Vuelve a heredar a quien falte."
            >
              Volver a heredar
            </Boton>
          </div>

          <ul
            className="flex flex-wrap gap-1"
            aria-label={`Personal de ${origen.identificador}`}
          >
            {origen.personal.map((persona) => (
              <li
                key={persona.funcionarioId}
                className="badge badge-ghost badge-sm min-w-0 max-w-full"
                title={persona.nombre}
              >
                <span className="min-w-0 truncate">{persona.nombre}</span>
              </li>
            ))}
          </ul>

          <span className="text-xs text-app-muted">
            Se hereda a quien sigue elegible (área y disponibilidad). A cada persona
            se le fija su horario abajo, y el cruce lo valida el servidor al
            registrar.
          </span>

          {/*
            A QUIEN NO SE PUDO HEREDAR SE LE NOMBRA, con el motivo del servidor tal cual
            (regla 7). Dejarlo caer en silencio produciría un adicional con menos gente de
            la que se creía haber puesto, y nadie lo notaría hasta el operativo.
          */}
          {noHeredados.length > 0 && (
            <AvisoEnLinea
              variante="advertencia"
              rol="alert"
              titulo={
                noHeredados.length === 1
                  ? "Una persona del operativo original no se pudo heredar:"
                  : `${noHeredados.length} personas del operativo original no se pudieron heredar:`
              }
            >
              <span className="flex flex-col gap-1" data-testid="no-heredados">
                {noHeredados.map((persona) => (
                  <span key={persona.nombre}>
                    <strong>{persona.nombre}</strong> · {persona.motivo}
                  </span>
                ))}
              </span>
            </AvisoEnLinea>
          )}
        </div>
      )}

      <FormOperativo
        modo="adicional"
        formularioCodigo={origen.formulario.codigo}
        catalogos={catalogos}
        puntos={puntos}
        cargandoPuntos={cargandoPuntos}
        onZonalesElegidas={onZonalesElegidas}
        candidatos={candidatos}
        cargandoPersonal={cargandoPersonal}
        personalAgregado={personalAgregado}
        onAgregarPersona={onAgregarPersona}
        onRetirarPersona={onRetirarPersona}
        onCambiarHorarioPersona={onCambiarHorarioPersona}
        fechaTramites={onCambiarTramitePersona ? origen.cuadroFecha : null}
        onCambiarTramitePersona={onCambiarTramitePersona}
        avisoPersonal={avisoPersonal}
        idPersonaRechazada={idPersonaRechazada}
        /*
          Del padre, menos dos cosas (y el transporte, que propone el formulario):

          · el HORARIO, que nace en blanco. Es lo único que por definición difiere, y
            copiarlo garantizaría que el equipo heredado chocara consigo mismo (RN-28).
          · las OBSERVACIONES, que describen aquel operativo y no éste. No son un recurso.
        */
        valoresIniciales={{
          ...comoValoresDeFormulario(origen),
          horaInicio: "",
          horaFin: "",
          observaciones: [],
          // El transporte que propone el formulario (2026-10-06); sin él, el del padre. Editable.
          tipoTransporte:
            catalogos?.tipoTransportePorDefecto ??
            origen.tipoTransporte ??
            "COMPLETO",
        }}
        bloqueado={bloqueado}
        guardando={guardando}
        onGuardar={onGuardar}
        // El pie de acción vive en el pie fijo del cajón (`idForm`).
        idForm={idForm}
        onEstadoEnvio={onEstadoEnvio}
        // El personal del adicional NO se guarda al instante: entra con él al registrar. Así la
        // lista compacta del cajón no promete «Se guarda al instante» (a diferencia de la edición).
        personalInmediato={false}
      />
    </div>
  );
};

export default PanelAdicionalOperativo;
