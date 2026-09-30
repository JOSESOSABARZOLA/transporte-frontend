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
 * EL PANEL VA ARRIBA Y NO EN UN MODAL, igual que el de edición: el formulario ocupa cuatro
 * columnas a 1440 px (FASE5 §4.1) y dentro de un modal habría que estrecharlo a una.
 */

import { useCallback, useEffect, useRef, type FC } from "react";
import type { FormikHelpers } from "formik";

import FormularioOperativo from "./FormularioOperativo.tsx";
import {
  comoValoresDeFormulario,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";
import { colorDeTextoSobre } from "../../utils/banner.util.ts";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import type { PersonaAgregada } from "./SelectorPersonal.tsx";

type PanelAdicionalOperativoProps = {
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
  avisoPersonal: string | null;

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
  ) => void | Promise<void>;
  onCancelar: () => void;
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
  avisoPersonal,
  bloqueado,
  ventanaCerrada,
  guardando,
  onGuardar,
  onCancelar,
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
  <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
    <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
        Operativo adicional de {origen.identificador}
      </h2>
      {/*
        EL COLOR DEL BANNER LO ENTREGA EL SERVIDOR, Y EL DEL TEXTO SE CALCULA.
        Regla 3 de CLAUDE.md, cumplida desde el 2026-08-26. Ver la nota gemela en
        `PanelEdicionOperativo`: con `text-white` fijo el rótulo del formulario 8 era
        blanco sobre blanco.
      */}
      <span
        className="badge badge-sm min-w-0 max-w-full"
        title={`${origen.formulario.numero}. ${origen.formulario.nombre}`}
        style={{
          backgroundColor: origen.formulario.colorFondo,
          color: colorDeTextoSobre(origen.formulario.colorFondo),
        }}
      >
        {/* `min-w-0` + `truncate`: ver la nota gemela en `PanelEdicionOperativo`. */}
        <span className="min-w-0 truncate">
          {origen.formulario.numero}. {origen.formulario.nombre}
        </span>
      </span>
    </div>

    <div className="app-data-panel-body flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6">
      <p className="text-xs text-base-content/70">
        Se registra en la misma jornada y en el mismo formulario que{" "}
        {origen.identificador}, y con su propia numeración: el identificador lo
        pone el servidor. Los valores llegan copiados del operativo original y
        puede cambiarlos todos. El personal se elige aquí y entra con el
        adicional: si alguien es rechazado no se crea nada y lo capturado se
        conserva.
      </p>

      {/*
        EL TRANSPORTE SE HEREDA SOLO, EN EL SERVIDOR · 2026-08-21.

        No es un control porque no hay nada que elegir: conductor y placa los escribe la
        DAF (RN-40), y aquí no se toma una decisión nueva, se reutiliza la suya. El
        servidor copia los del operativo original **si el conductor puede conducir en este
        horario**, y si no, el adicional nace pendiente y lo dice al terminar.

        Se anuncia antes de capturar porque cambia lo que hay que hacer después: con
        transporte heredado el adicional está listo; sin él, hay que esperar a la DAF.
      */}
      {origen.estadoTransporte === "ASIGNADO" && (
        <div className="alert alert-info">
          <span className="text-sm">
            {origen.identificador} ya tiene conductor y placa asignados por la
            DAF. <strong>Se heredarán</strong> si ese conductor puede conducir en
            el horario del adicional; si no, el adicional quedará pendiente de la
            DAF y se lo diremos al guardar.
          </span>
        </div>
      )}

      {/*
        EL EQUIPO DEL ORIGINAL · 2026-08-21, adaptado a RN-66 (2026-09-08).

        Se hereda **solo**, en cuanto llega la lista de elegibles. Lo que este bloque hace es
        decir de dónde salió la gente que aparece abajo y qué pasó con quien no pudo venir:
        sin esto, alguien que quitó a una persona vería reaparecer un equipo del que no
        recuerda el origen. Cada heredado entra SIN horario —hay que fijárselo abajo, porque
        el adicional es otra salida a otra hora—.

        El botón queda como REINTENTO, no como el camino normal: sirve tras haber quitado a
        alguien por error.
      */}
      {origen.personal.length > 0 && !bloqueado && (
        <div className="flex flex-col gap-2 rounded-md border border-base-300 bg-base-200/40 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-base-content/70">
              {origen.identificador} lleva{" "}
              <strong>
                {origen.personal.length}{" "}
                {origen.personal.length === 1 ? "persona" : "personas"}
              </strong>
              : {origen.personal.map((persona) => persona.nombre).join(", ")}.
              {cargandoPersonal ? (
                <> Cargando elegibles…</>
              ) : porHeredar.length === 0 ? (
                <> Heredadas.</>
              ) : (
                <> Faltan {porHeredar.length} por heredar.</>
              )}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={heredarPersonal}
              disabled={
                guardando || cargandoPersonal || porHeredar.length === 0
              }
              title={
                porHeredar.length === 0
                  ? "Ya están todas agregadas."
                  : "Vuelve a heredar a quien falte."
              }
            >
              Volver a heredar
            </button>
          </div>

          <span className="text-xs text-base-content/70">
            Se hereda a quien sigue elegible (área y disponibilidad). A cada persona
            se le fija su horario abajo, y el cruce lo valida el servidor al
            registrar. Puede quitar a quien no vaya y sumar a quien haga falta en el
            selector de abajo.
          </span>

          {/*
            A QUIEN NO SE PUDO HEREDAR SE LE NOMBRA, con el motivo del servidor tal cual
            (regla 7). Dejarlo caer en silencio produciría un adicional con menos gente de
            la que se creía haber puesto, y nadie lo notaría hasta el operativo.
          */}
          {noHeredados.length > 0 && (
            <div
              className="alert alert-warning"
              role="alert"
            >
              <div className="flex flex-col gap-1 text-xs">
                <span>
                  {noHeredados.length === 1
                    ? "Una persona del operativo original no se pudo heredar:"
                    : `${noHeredados.length} personas del operativo original no se pudieron heredar:`}
                </span>
                {noHeredados.map((persona) => (
                  <span key={persona.nombre}>
                    <strong>{persona.nombre}</strong> · {persona.motivo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/*
        SE DICE QUE ESTO ES UNA EXCEPCIÓN, y se dice antes de capturar.

        Quien registra fuera de ventana debe saber que lo está haciendo y que queda
        constancia. Un formulario que simplemente funciona a deshora enseña que la ventana
        no significa nada, y la ventana es lo que sostiene que el cuadro esté armado antes
        de la jornada.
      */}
      {ventanaCerrada && !bloqueado && (
        <div
          className="alert alert-warning"
          role="alert"
        >
          <span className="text-sm">
            Su ventana de carga está cerrada. Un adicional puede registrarse de
            todos modos, porque se dispone el día de la ejecución, y queda
            constancia en la auditoría de que se creó fuera de ventana.
          </span>
        </div>
      )}

      <FormularioOperativo
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
        avisoPersonal={avisoPersonal}
        /*
          Del padre, menos dos cosas:

          · el HORARIO, que nace en blanco. Es lo único que por definición difiere, y
            copiarlo garantizaría que el equipo heredado chocara consigo mismo (RN-28).
          · las OBSERVACIONES, que describen aquel operativo y no éste. No son un recurso.
        */
        valoresIniciales={{
          ...comoValoresDeFormulario(origen),
          horaInicio: "",
          horaFin: "",
          observaciones: [],
        }}
        textoAccion="Registrar adicional"
        onCancelar={onCancelar}
        bloqueado={bloqueado}
        guardando={guardando}
        onGuardar={onGuardar}
      />
    </div>
  </div>
  );
};

export default PanelAdicionalOperativo;
