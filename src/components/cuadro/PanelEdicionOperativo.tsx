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
 * EL PANEL VA ARRIBA, NO EN UN MODAL. El formulario ocupa cuatro columnas a 1440 px
 * (FASE5 §4.1); dentro de un modal habría que estrecharlo a una, que es justo la
 * disposición que el Product Owner descartó por lenta.
 */

import type { FC } from "react";
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

type PanelEdicionOperativoProps = {
  operativo: Operativo;
  catalogos: CatalogosFormulario | null;
  puntos: CatalogosFormulario["puntos"];
  cargandoPuntos: boolean;
  onZonalElegida: (zonalId: number | null) => void;
  /** Ver `FormularioOperativo`: la lista de personal se pide con el horario. */
  onHorarioElegido: (horaInicio: string, horaFin: string) => void;

  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  onAgregarPersona: (persona: PersonaElegible) => void;
  onRetirarPersona: (funcionarioId: number) => void;
  avisoPersonal: string | null;

  bloqueado: boolean;
  /**
   * PER-06. El departamento que **aporta** al formulario compartido ve todo en lectura
   * menos el personal. Ver la nota de `FormularioOperativo`.
   */
  soloPersonal?: boolean;
  guardando: boolean;
  onGuardar: (
    valores: ValoresOperativo,
    ayudas: FormikHelpers<ValoresOperativo>,
  ) => void | Promise<void>;
  onCancelar: () => void;
};

const PanelEdicionOperativo: FC<PanelEdicionOperativoProps> = ({
  operativo,
  catalogos,
  puntos,
  cargandoPuntos,
  onZonalElegida,
  onHorarioElegido,
  candidatos,
  cargandoPersonal,
  onAgregarPersona,
  onRetirarPersona,
  avisoPersonal,
  bloqueado,
  soloPersonal = false,
  guardando,
  onGuardar,
  onCancelar,
}) => {
  /**
   * El personal ya asignado se toma **del operativo**, no de un estado propio: así lo que
   * muestra el panel es siempre lo que el servidor acaba de confirmar.
   */
  const personalAgregado: PersonaAgregada[] = operativo.personal.map(
    (persona) => ({
      funcionarioId: persona.funcionarioId,
      nombre: persona.nombre,
      telefono: persona.telefono,
    }),
  );

  return (
    <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
      <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
          {soloPersonal ? "Personal de" : "Editando"} {operativo.identificador}
        </h2>
        {/*
          EL COLOR DEL BANNER LO ENTREGA EL SERVIDOR, Y EL DEL TEXTO SE CALCULA.
          Regla 3 de CLAUDE.md, cumplida desde el 2026-08-26.

          Llevaba `text-white` fijo, y con los nueve colores reales del Excel eso daba
          **1,00:1 en el formulario 8**, cuyo `colorFondo` es blanco: el rótulo no se
          veía nunca, en ningún tema. En el 4 daba 1,41:1 y en el 1, 1,86:1.

          `colorDeTextoSobre` elige blanco o negro por luminancia —el mismo umbral WCAG
          que ya usa `BannerFormulario` en la matriz—, y con él el peor de los nueve
          pasa de 1,00 a 14,88:1.
        */}
        <span
          className="badge badge-sm"
          style={{
            backgroundColor: operativo.formulario.colorFondo,
            color: colorDeTextoSobre(operativo.formulario.colorFondo),
          }}
        >
          {operativo.formulario.numero}. {operativo.formulario.nombre}
        </span>
      </div>

      <div className="app-data-panel-body flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6">
        {/* RN-13: el identificador no cambia al editar, y conviene que se vea. */}
        <p className="text-xs text-base-content/70">
          {soloPersonal
            ? "Su departamento aporta personal a este operativo. El resto de los datos los mantiene el departamento dueño del formulario y llega en lectura. Cada persona se guarda en el momento."
            : "El identificador y el secuencial no cambian al editar. El personal se guarda en el momento; el resto, al pulsar «Guardar cambios»."}
        </p>

        {/*
          ═══════════════════════════════════════════════════════════════════════════
          QUÉ ÁREAS LE FALTAN A LA PATRULLA. RN-31 y RN-32, visibles desde el 2026-08-25.

          El servidor calculaba `composicion` desde M-15 y **ninguna pantalla lo pintaba**:
          el dato viajaba en cada respuesta y se tiraba. Quien armaba la patrulla no tenía
          forma de saber que le faltaba un área hasta que la Dirección no podía cerrar.

          NO ES UN ERROR, ES UN AVISO, y por eso `alert-warning` y no `alert-error`: la
          composición incompleta es lo normal mientras se está componiendo. Lo que sí
          impide cerrar la jornada es que el departamento que aporta no haya puesto a
          nadie, y de eso avisa el cierre con su propio mensaje.
          ═══════════════════════════════════════════════════════════════════════════
        */}
        {operativo.composicion.esPatrulla &&
          !operativo.composicion.completa && (
            <div
              className="alert alert-warning"
              role="status"
            >
              <span>
                Falta personal de{" "}
                {operativo.composicion.areasPendientes.length === 1
                  ? "el área"
                  : "las áreas"}{" "}
                <strong>
                  {operativo.composicion.areasPendientes.join(", ")}
                </strong>
                . La patrulla se compone con una persona de cada área que admite el
                formulario.
              </span>
            </div>
          )}

        <FormularioOperativo
          formularioCodigo={operativo.formulario.codigo}
          catalogos={catalogos}
          puntos={puntos}
          cargandoPuntos={cargandoPuntos}
          onZonalElegida={onZonalElegida}
          onHorarioElegido={onHorarioElegido}
          candidatos={candidatos}
          cargandoPersonal={cargandoPersonal}
          personalAgregado={personalAgregado}
          onAgregarPersona={onAgregarPersona}
          onRetirarPersona={onRetirarPersona}
          avisoPersonal={avisoPersonal}
          valoresIniciales={comoValoresDeFormulario(operativo)}
          textoAccion="Guardar cambios"
          onCancelar={onCancelar}
          bloqueado={bloqueado}
          soloPersonal={soloPersonal}
          guardando={guardando}
          onGuardar={onGuardar}
        />
      </div>
    </div>
  );
};

export default PanelEdicionOperativo;
