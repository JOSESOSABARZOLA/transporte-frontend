/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: PanelEdicionOperativo.tsx
 * Responsabilidad: Editar un operativo existente con el formulario de registro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE EDITA CON EL MISMO FORMULARIO CON EL QUE SE REGISTRA, y el plan lo pide así:
 * «las mismas validaciones de P-01 al editar». Un segundo formulario significaría un
 * segundo esquema, y el día que se corrija VAL-07 en uno, el otro seguirá aceptando lo
 * que el servidor rechaza.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL PERSONAL SE GUARDA AL INSTANTE, NO AL PULSAR «GUARDAR». No es una inconsistencia:
 * son contratos distintos. `PATCH /operativos/:id` cambia horario, punto, tipo e
 * instituciones; el personal entra y sale por `POST` y `DELETE /operativos/:id/personal`,
 * porque cada asignación tiene su propio veredicto de descanso y puede fallar sola. Al
 * registrar no existía todavía el operativo al que colgarlas, así que allí se difieren;
 * aquí existe, y diferirlas solo serviría para perderlas si alguien cierra la pantalla.
 *
 * VIVE SIEMPRE DENTRO DEL CAJÓN `DrawerOperativo` (2026-10-08). Ya no hay uso en línea: la marca
 * y la cabecera propias se retiraron, y el formulario va siempre por SECCIONES —Personal y
 * horario · Lugar · Control · Transporte y observaciones—, igual que el adicional. El pie de acción
 * es el del cajón (`idForm`), y el estado del envío le llega por `onEstadoEnvio`.
 */

import type { FC } from "react";
import type { FormikHelpers } from "formik";

import FormOperativo, {
  type EstadoEnvio,
  type ExtrasDelEnvio,
} from "./FormOperativo.tsx";
import {
  comoValoresDeFormulario,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";
import { NOMBRE_AREA } from "../../utils/personal.util.ts";
import type {
  AreaPersonal,
  CatalogosFormulario,
} from "../../interfaces/Formulario.ts";
import type { Operativo, PersonaAsignada } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import type { PersonaAgregada } from "./SelectorPersonal.tsx";
import RosterPatrulla, { type MiembroPatrulla } from "./RosterPatrulla.tsx";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

export type PanelEdicionOperativoProps = {
  operativo: Operativo;
  catalogos: CatalogosFormulario | null;
  puntos: CatalogosFormulario["puntos"];
  cargandoPuntos: boolean;
  onZonalesElegidas: (zonalesIds: number[]) => void;

  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  onAgregarPersona: (persona: PersonaElegible) => void;
  onRetirarPersona: (funcionarioId: number) => void;
  /**
   * CAMBIAR EL TURNO DE UNA PERSONA YA ASIGNADA (Fase C, 2026-09-30). En edición el turno se guarda
   * al instante (`PATCH /operativos/:id/personal/:funcionarioId`), como asignar y retirar. La lista
   * compacta lo ofrece con «Cambiar turno». Cuando no llega —P-01, adicional— el turno se captura de
   * otra forma y esta ranura queda vacía.
   */
  onCambiarHorarioPersona?: (
    funcionarioId: number,
    horaInicio: string,
    horaFin: string,
  ) => void;
  /**
   * Si quien edita puede RETIRAR a una persona ya asignada. En el aporte (Form 4 ECU) el
   * departamento que aporta solo maneja el personal que él asignó —el de Instrucción—; el del
   * dueño del formulario llega en lectura. Por defecto, todo el personal es editable. 2026-09-18.
   */
  puedeEditarPersona?: (persona: PersonaAsignada) => boolean;
  /**
   * TRÁMITE DE INSPECCIÓN (2026-10-07): quién fija el trámite de una persona. Con él, cada inspector
   * del operativo ofrece su combo con los trámites de la fecha de la jornada.
   */
  onCambiarTramitePersona?: (
    funcionarioId: number,
    codigoTramite: string | null,
  ) => void;
  avisoPersonal: string | null;
  /** A quién se refiere `avisoPersonal`, si el servidor lo nombró (R2): el motivo va bajo su horario. */
  idPersonaRechazada?: number | null;
  /** Que la asignación se guardó. Ver `SelectorPersonal.confirmacion`. */
  confirmacionPersonal?: string | null;

  bloqueado: boolean;
  /**
   * PER-06. El departamento que **aporta** al formulario compartido ve todo en lectura
   * menos el personal. Ver la nota de `FormOperativo`.
   */
  soloPersonal?: boolean;
  /**
   * Bloquea SOLO el bloque de personal, dejando editables los generales. En la PATRULLA (Form
   * 5/6) el personal se gestiona con las acciones fusionadas, no dentro del editor. 2026-09-18.
   */
  personalBloqueado?: boolean;
  /**
   * ROSTER DE LA PATRULLA (2026-09-18). Al editar una patrulla (Form 5/6) como registrante, en
   * lugar del bloque de personal se pinta el roster: cada código de área (IGNECU/ITNECU/INECU) con
   * su «Cambiar» (misma área, conserva el código) y «Agregar persona». Vacío = no es patrulla o no
   * corresponde editarla, y se pinta el personal normal.
   */
  miembrosPatrulla?: MiembroPatrulla[];
  onCambiarPersonaPatrulla?: (operativoId: number, funcionarioId: number) => void;
  onQuitarMiembroPatrulla?: (operativo: Operativo) => void;
  onAgregarMiembroPatrulla?: (funcionarioId: number) => void;
  guardando: boolean;
  onGuardar: (
    valores: ValoresOperativo,
    ayudas: FormikHelpers<ValoresOperativo>,
    extras?: ExtrasDelEnvio,
  ) => void | Promise<void>;
  /**
   * ¿El personal se guarda al instante? (2026-10-01). Por omisión true (conducta de P-02 hasta hoy y
   * del aporte). En la edición DIFERIDA del operativo propio la página lo pasa false: el personal se
   * acumula y se aplica al «Guardar cambios», así que se apaga el rótulo «Se guarda al instante».
   */
  personalInmediato?: boolean;
  /** `id` del `<form>`: el botón del pie del cajón lo envía con `form=`. */
  idForm: string;
  /** Qué falta, si hay cambios y las zonales elegidas, para el pie y el aviso del cajón. */
  onEstadoEnvio?: (estado: EstadoEnvio) => void;
};

/** ¿El área que llega del servidor es una de las conocidas? Lo que no, viaja como `undefined`. */
const esAreaPersonal = (area: string): area is AreaPersonal =>
  Object.hasOwn(NOMBRE_AREA, area);

const PanelEdicionOperativo: FC<PanelEdicionOperativoProps> = ({
  operativo,
  catalogos,
  puntos,
  cargandoPuntos,
  onZonalesElegidas,
  candidatos,
  cargandoPersonal,
  onAgregarPersona,
  onRetirarPersona,
  onCambiarHorarioPersona,
  puedeEditarPersona = () => true,
  onCambiarTramitePersona,
  avisoPersonal,
  idPersonaRechazada = null,
  confirmacionPersonal = null,
  bloqueado,
  soloPersonal = false,
  personalBloqueado = false,
  miembrosPatrulla,
  onCambiarPersonaPatrulla,
  onQuitarMiembroPatrulla,
  onAgregarMiembroPatrulla,
  guardando,
  onGuardar,
  personalInmediato = true,
  idForm,
  onEstadoEnvio,
}) => {
  /**
   * ROSTER DE LA PATRULLA: se pinta cuando la página lo entrega y hay miembros. Sustituye al
   * bloque de personal del formulario, que se OCULTA (aquí solo se editan los generales).
   */
  const conRoster = Boolean(
    miembrosPatrulla &&
      miembrosPatrulla.length > 0 &&
      onCambiarPersonaPatrulla &&
      onQuitarMiembroPatrulla &&
      onAgregarMiembroPatrulla,
  );

  /**
   * El personal ya asignado se toma **del operativo**, no de un estado propio: así lo que
   * muestra el panel es siempre lo que el servidor acaba de confirmar.
   */
  const personalAgregado: PersonaAgregada[] = operativo.personal.map(
    (persona) => ({
      funcionarioId: persona.funcionarioId,
      nombre: persona.nombre,
      telefono: persona.telefono,
      // El turno EFECTIVO (2026-09-08): lo pinta la lista compacta y siembra «Cambiar turno».
      horaInicio: persona.horaInicio,
      horaFin: persona.horaFin,
      // Quien aporta al formulario ajeno solo retira SU personal; el resto va en lectura.
      editable: puedeEditarPersona(persona),
      // El área decide si se le consulta trámite de Inspección; el trámite, lo que ya tiene.
      area: esAreaPersonal(persona.area) ? persona.area : undefined,
      tramiteCodigo: persona.tramiteInspeccion?.codigoTramite ?? null,
    }),
  );

  return (
    <div className="flex flex-col gap-4">
        {/* RN-13: el identificador no cambia al editar, y conviene que se vea (ayuda corta). */}
        <p className="text-xs text-app-muted">
          {soloPersonal
            ? "Su departamento aporta personal a este operativo. El resto de los datos los mantiene el departamento dueño del formulario y llega en lectura. Cada persona se guarda en el momento."
            : "El identificador no cambia al editar."}
        </p>

        {/*
          ═══════════════════════════════════════════════════════════════════════════
          QUÉ ÁREAS LE FALTAN A LA PATRULLA. RN-31 y RN-32, visibles desde el 2026-08-25.

          El servidor calculaba `composicion` desde M-15 y **ninguna pantalla lo pintaba**:
          el dato viajaba en cada respuesta y se tiraba. Quien armaba la patrulla no tenía
          forma de saber que le faltaba un área hasta que la Dirección no podía cerrar.

          NO ES UN ERROR, ES UN AVISO, y por eso `advertencia` y no `error`: la
          composición incompleta es lo normal mientras se está componiendo. Lo que sí
          impide cerrar la jornada es que el departamento que aporta no haya puesto a
          nadie, y de eso avisa el cierre con su propio mensaje.
          ═══════════════════════════════════════════════════════════════════════════
        */}
        {operativo.composicion.esPatrulla &&
          !operativo.composicion.completa && (
            <AvisoEnLinea variante="advertencia">
                Falta personal de{" "}
                {operativo.composicion.areasPendientes.length === 1
                  ? "el área"
                  : "las áreas"}{" "}
                <strong>
                  {operativo.composicion.areasPendientes
                    .map((area) => NOMBRE_AREA[area])
                    .join(", ")}
                </strong>
                . La patrulla se compone con una persona de cada área que admite el
                formulario.
              </AvisoEnLinea>
          )}

        {/*
          ROSTER DE LA PATRULLA: cambiar/agregar/quitar cada código de área. Reemplaza al bloque de
          personal del formulario (que abajo va OCULTO); los generales se siguen editando abajo.
        */}
        {conRoster && (
          <RosterPatrulla
            miembros={miembrosPatrulla ?? []}
            candidatos={candidatos}
            onCambiar={onCambiarPersonaPatrulla!}
            onQuitar={onQuitarMiembroPatrulla!}
            onAgregar={onAgregarMiembroPatrulla!}
            aviso={avisoPersonal}
            bloqueado={bloqueado}
          />
        )}

        <FormOperativo
          modo="edicion"
          formularioCodigo={operativo.formulario.codigo}
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
          fechaTramites={
            onCambiarTramitePersona ? operativo.cuadroFecha : null
          }
          onCambiarTramitePersona={onCambiarTramitePersona}
          // Form 8 por lote: el trámite de una copia se aplica a todas las de esa persona.
          tramitePorLote={personalBloqueado && operativo.grupoRegistro !== null}
          avisoPersonal={avisoPersonal}
          idPersonaRechazada={idPersonaRechazada}
          confirmacionPersonal={confirmacionPersonal}
          // Las notas ya escritas (bitácora): se muestran en solo lectura; aquí solo se agregan.
          observacionesExistentes={operativo.observaciones}
          valoresIniciales={comoValoresDeFormulario(operativo)}
          // Compartir unidad (2026-10-19): coincidencias de su jornada, sin contarse a sí mismo.
          fechaJornada={soloPersonal || conRoster ? null : operativo.cuadroFecha}
          operativoId={operativo.id}
          bloqueado={bloqueado}
          soloPersonal={soloPersonal}
          personalBloqueado={personalBloqueado}
          // Con roster, el personal se gestiona arriba: aquí se oculta y solo quedan los generales.
          personalOculto={conRoster}
          guardando={guardando}
          onGuardar={onGuardar}
          // Gobierna el rótulo «Se guarda al instante» de la lista compacta. En el aporte el
          // personal es inmediato; en la edición diferida del operativo propio, false.
          personalInmediato={personalInmediato}
          idForm={idForm}
          onEstadoEnvio={onEstadoEnvio}
        />
    </div>
  );
};

export default PanelEdicionOperativo;
