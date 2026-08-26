/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: PanelAsignacionTransporte.tsx
 * Responsabilidad: Completar conductor y vehículo, y solo eso.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA PANTALLA EXPRESA VISUALMENTE UNA REGLA DE NEGOCIO. El plan lo dice así, y es la
 * razón de ser del panel: **el contraste entre lo bloqueado y lo editable debe ser
 * inequívoco**.
 *
 * La DAF escribe **dos campos** de los nueve formularios (RN-40). El resto del operativo
 * lo cargó otro departamento y no le corresponde tocarlo. Aquí eso no se explica en un
 * aviso: se ve. Todo llega deshabilitado salvo dos controles, y esos dos llevan
 * `badge badge-accent badge-xs` con la palabra *Editable* junto a su etiqueta.
 *
 * Es el cuarto nivel de la restricción de la DAF, y el único que el funcionario percibe.
 * Los otros tres —endpoint propio, DTO de dos propiedades, escritura acotada en el
 * repositorio— viven en el servidor y siguen ahí aunque esta pantalla se equivoque.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LOS CAMPOS BLOQUEADOS SON `input disabled` Y NO DISTINTIVOS, al revés que en P-01.
 * No es una incoherencia: en P-01 los valores calculados **no los escribe nadie**, y un
 * campo sugeriría lo contrario. Aquí sí son campos del operativo, escritos por otra
 * persona, y mostrarlos con aspecto de campo es justamente lo que comunica «esto se
 * edita, pero no por usted».
 */

import { useState, type FC } from "react";

import type {
  ConductorDisponible,
  OperativoPendiente,
} from "../../interfaces/Transporte.ts";
import type { VehiculoOfrecido } from "../../utils/flota.util.ts";

type PanelAsignacionTransporteProps = {
  operativo: OperativoPendiente;
  conductores: ConductorDisponible[];
  vehiculos: VehiculoOfrecido[];
  cargandoConductores: boolean;
  /** RN-56 y RN-58: fuera de la ventana, la bandeja se consulta pero no se escribe. */
  soloLectura: boolean;
  guardando: boolean;
  /** Mensaje del servidor tras un 409 —descanso del conductor—. Se muestra tal cual. */
  aviso: string | null;
  onAsignar: (conductorId: number, vehiculoId: number) => void;
  onPropiosMedios: () => void;
  onCancelar: () => void;
};

const PanelAsignacionTransporte: FC<PanelAsignacionTransporteProps> = ({
  operativo,
  conductores,
  vehiculos,
  cargandoConductores,
  soloLectura,
  guardando,
  aviso,
  onAsignar,
  onPropiosMedios,
  onCancelar,
}) => {
  /**
   * La selección nace vacía en cada operativo.
   *
   * Quien monta el panel le pasa `key={operativo.id}`, así que cambiar de fila lo vuelve a
   * montar y estos dos estados vuelven a su valor inicial. Limpiarlos desde un efecto
   * habría sido un renderizado de más y, sobre todo, una ventana en la que el conductor
   * del operativo anterior sigue seleccionado sobre el nuevo.
   */
  const [conductorId, setConductorId] = useState<number | "">("");
  const [vehiculoId, setVehiculoId] = useState<number | "">("");

  /**
   * Caso 3 del plan: al elegir conductor, la placa se completa con su vehículo habitual.
   *
   * Es una **propuesta**, no una imposición: el desplegable queda habilitado para
   * cambiarla. RN-45 dice de dónde sale la sugerencia, no que sea obligatoria.
   */
  const elegirConductor = (valor: string) => {
    const id = valor === "" ? "" : Number(valor);
    setConductorId(id);

    if (id === "") {
      setVehiculoId("");
      return;
    }

    const elegido = conductores.find((conductor) => conductor.id === id);
    setVehiculoId(elegido?.vehiculoHabitual?.id ?? "");
  };

  const puedeGuardar =
    !soloLectura && !guardando && conductorId !== "" && vehiculoId !== "";

  return (
    <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
      <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
          Asignar transporte a {operativo.identificador}
        </h2>
        <button
          type="button"
          className="btn btn-sm app-modules-panel-action"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>
      </div>

      <div className="app-data-panel-body flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6">
        {/* RN-43. Los nocturnos con condicionante son los que impiden cerrar la jornada. */}
        {operativo.requiereConductor && (
          <div className="alert alert-warning">
            <span>
              Operativo nocturno con conductor obligatorio: la jornada no se puede
              cerrar mientras siga sin asignar.
            </span>
          </div>
        )}

        {aviso && (
          <div
            className="alert alert-error"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CampoBloqueado
            etiqueta="Formulario"
            valor={operativo.formularioNombre}
          />
          <CampoBloqueado
            etiqueta="Horario"
            valor={operativo.horario}
          />
          <CampoBloqueado
            etiqueta="Zonal"
            valor={operativo.zonales.join(", ")}
          />
          <CampoBloqueado
            etiqueta="Punto de encuentro"
            valor={operativo.puntoEncuentro}
          />
          <CampoBloqueado
            etiqueta="Personal asignado"
            valor={`${operativo.personasAsignadas} ${
              operativo.personasAsignadas === 1 ? "persona" : "personas"
            }`}
          />

          <div className="form-control w-full">
            <label
              className="label gap-2"
              htmlFor="conductor"
            >
              <span className="label-text font-medium">
                Conductor<span className="text-error ml-1">*</span>
              </span>
              <span className="badge badge-accent badge-xs">Editable</span>
            </label>
            <select
              id="conductor"
              className="select input-bordered w-full focus:input-primary"
              value={conductorId}
              disabled={soloLectura || guardando || cargandoConductores}
              onChange={(evento) => elegirConductor(evento.target.value)}
            >
              <option value="">
                {cargandoConductores
                  ? "Cargando conductores…"
                  : "Seleccione conductor…"}
              </option>
              {conductores.map((conductor) => (
                <option
                  key={conductor.id}
                  value={conductor.id}
                >
                  {conductor.nombreCompleto}
                  {conductor.licenciaTipo ? ` · ${conductor.licenciaTipo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control w-full">
            <label
              className="label gap-2"
              htmlFor="vehiculo"
            >
              <span className="label-text font-medium">
                Placa del vehículo<span className="text-error ml-1">*</span>
              </span>
              <span className="badge badge-accent badge-xs">Editable</span>
            </label>
            <select
              id="vehiculo"
              className="select input-bordered w-full focus:input-primary"
              value={vehiculoId}
              disabled={soloLectura || guardando}
              onChange={(evento) =>
                setVehiculoId(
                  evento.target.value === "" ? "" : Number(evento.target.value),
                )
              }
            >
              <option value="">Seleccione vehículo…</option>
              {vehiculos.map((vehiculo) => (
                <option
                  key={vehiculo.id}
                  value={vehiculo.id}
                >
                  {vehiculo.placa}
                </option>
              ))}
            </select>
            {vehiculos.length === 0 && !cargandoConductores && (
              <span className="mt-1 text-xs text-base-content/70">
                Ningún conductor disponible tiene vehículo habitual registrado.
                El administrador debe asignarlos desde la administración de flota.
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {/* RN-41. No asigna vehículo: declara que el operativo se cubre sin él. */}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onPropiosMedios}
            disabled={soloLectura || guardando}
          >
            Marcar propios medios
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              onAsignar(Number(conductorId), Number(vehiculoId))
            }
            disabled={!puedeGuardar}
          >
            {guardando ? "Guardando…" : "Guardar asignación"}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Campo del operativo que la DAF ve y no toca. */
const CampoBloqueado: FC<{ etiqueta: string; valor: string }> = ({
  etiqueta,
  valor,
}) => (
  <div className="form-control w-full">
    <label className="label">
      <span className="label-text font-medium">{etiqueta}</span>
    </label>
    <input
      type="text"
      className="input input-bordered w-full"
      value={valor || "—"}
      disabled
      readOnly
      aria-label={etiqueta}
    />
  </div>
);

export default PanelAsignacionTransporte;
