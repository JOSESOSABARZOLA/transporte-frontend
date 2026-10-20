/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: DrawerTareaTaller.tsx
 * Responsabilidad: Asignar o quitar el conductor de una tarea de taller («Llevar a taller») del
 *                  paso 2.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CAJÓN ESTÁNDAR (mensajes estándar, 2026-10-16). Era un `MarcoModal` dentro de `PasoAsignar`, y su
 * error se pintaba en la tarjeta del paso, DETRÁS del modal abierto. Ahora es un `DrawerLateral`
 * `md` con el error sobre su propio pie:
 *
 *   · Sin conductor → formulario de un campo (el conductor), «Asignar» con el estado del pie
 *     estándar y descarte si ya se eligió alguno.
 *   · Con conductor → consulta: «Asignada a …» y «Quitar asignación», que confirma con
 *     `MensajeModal` peligro; si el servidor rechaza, el error queda en ese modal.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import Boton from "../../common/Boton.tsx";
import CampoDrawer from "../../common/CampoDrawer.tsx";
import DrawerLateral from "../../common/DrawerLateral.tsx";
import MensajeModal from "../../common/MensajeModal.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import type { ConductorPlanificado, TramoPlanificado } from "../../../interfaces/Planificacion.ts";
import { PlanificacionService } from "../../../services/planificacion.service.ts";
import { presentarError } from "../../../utils/errorApi.util.ts";
import { estadoPieDrawer } from "../../../utils/estadoPieDrawer.util.ts";
import { franja } from "../../../utils/planificarDia.util.ts";

type DrawerTareaTallerProps = {
  tarea: TramoPlanificado;
  /** Los conductores que se pueden elegir (los visibles en la línea). */
  conductores: ConductorPlanificado[];
  /** Con la ventana cerrada, el motivo; asignar y quitar quedan apagados. */
  bloqueo?: string;
  onCerrar: () => void;
  /** Tras asignar o quitar: la pantalla avisa y vuelve a leer la jornada. */
  onHecho: (mensaje: string) => void;
};

const DrawerTareaTaller: FC<DrawerTareaTallerProps> = ({
  tarea,
  conductores,
  bloqueo,
  onCerrar,
  onHecho,
}) => {
  const [conductorId, setConductorId] = useState<number | "">("");
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  const asignada = tarea.conductorId !== null;
  const falta = conductorId === "" ? ["conductor"] : [];

  const asignar = async () => {
    setIntentado(true);
    if (conductorId === "") return;
    setGuardando(true);
    setError(null);
    try {
      await PlanificacionService.asignarTarea(tarea.id, conductorId);
      onHecho("Tarea de taller asignada.");
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const comun = {
    abierto: true,
    titulo: tarea.descripcion ?? "Llevar a taller",
    subtitulo: `Tarea de taller · ${franja(tarea.horaInicio, tarea.horaFin)}`,
    ancho: "md" as const,
    onCerrar,
    errorServidor: error,
  };

  if (asignada) {
    return (
      <DrawerLateral {...comun} modo="lectura">
        <SeccionDrawer
          titulo="Conductor"
          rejilla={false}
          accion={
            <Boton
              variante="peligro"
              tamano="sm"
              motivoDeshabilitado={bloqueo}
              onClick={() => setConfirmandoQuitar(true)}
            >
              Quitar asignación
            </Boton>
          }
        >
          <p className="text-sm text-app-strong">Asignada a {tarea.conductor}.</p>
        </SeccionDrawer>

        <MensajeModal
          abierto={confirmandoQuitar}
          variante="peligro"
          titulo="¿Quitar el conductor de la tarea?"
          mensaje={`${tarea.conductor ?? "El conductor"} deja la tarea y vuelve a quedar pendiente de asignar.`}
          textoSecundario="No quitar"
          textoPrincipal="Sí, quitar"
          tituloError="No se pudo quitar el conductor"
          onPrincipal={() => PlanificacionService.quitar(tarea.id)}
          onSecundario={() => setConfirmandoQuitar(false)}
          onExito={() => {
            setConfirmandoQuitar(false);
            onHecho("Se quitó el conductor de la tarea.");
          }}
        />
      </DrawerLateral>
    );
  }

  return (
    <DrawerLateral
      {...comun}
      sucio={conductorId !== ""}
      guardando={guardando}
      textoGuardar="Asignar"
      onGuardar={() => void asignar()}
      motivoGuardar={bloqueo}
      guardarPendiente={conductorId === ""}
      estadoPie={estadoPieDrawer({
        esEdicion: false,
        hayCambios: conductorId !== "",
        intentado,
        faltan: falta,
        textoListo: "Listo para asignar",
      })}
    >
      <SeccionDrawer titulo="Conductor" rejilla={false}>
        <CampoDrawer
          etiqueta="Conductor"
          requerido
          error={intentado && conductorId === "" ? "Elija un conductor." : null}
        >
          <select
            className="select select-bordered w-full"
            value={conductorId}
            onChange={(e) => setConductorId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Elija…</option>
            {conductores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </CampoDrawer>
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerTareaTaller;
