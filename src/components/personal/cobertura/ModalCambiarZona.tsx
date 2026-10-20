/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: ModalCambiarZona.tsx
 * Responsabilidad: Cambiar la zona (y la denominación) de una persona de Instrucción, con confirmación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * LA ZONA VIVE EN LA FICHA (`func_zonal_id`), no en la matriz: cambiarla aquí la cambia también en
 * el Maestro de personal y en los operativos que se registren desde ahora. Por eso pide
 * CONFIRMACIÓN antes de escribir, y el padre refresca la tabla del Maestro al terminar.
 *
 * La denominación (Líder zonal, Instructor…) se edita en la misma ventana: antes la fila tenía sus
 * dos desplegables en línea, y sacarlos de la grilla sin un sitio nuevo habría sido perderla.
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` con el nombre en versalita; ahora es
 * `DrawerLateral` `ancho="md"` con el nombre en el subtítulo. La confirmación es un `MensajeModal`
 * (mensajes estándar, 2026-10-16) y se abre ENCIMA del cajón: la pila de capas hace que Escape
 * cierre solo ella, y si el servidor rechaza el cambio el error queda en ese mismo modal.
 */

import { useState, type FC } from "react";

import CampoDrawer from "../../common/CampoDrawer.tsx";
import DrawerLateral, { type EstadoPie } from "../../common/DrawerLateral.tsx";
import MensajeModal from "../../common/MensajeModal.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import { CoberturaService } from "../../../services/cobertura.service.ts";
import type { PersonaCobertura } from "../../../interfaces/Cobertura.ts";
import type { Zonal } from "../../../interfaces/Formulario.ts";
import type { DenominacionInstruccion } from "../../../interfaces/Personal.ts";
import { DENOMINACIONES } from "../../../utils/cobertura.util.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";

type ModalCambiarZonaProps = {
  /** La persona a la que se cambia la zona. El padre lo monta con `key` por persona. */
  persona: PersonaCobertura;
  zonales: Zonal[];
  /** Tras guardar: el padre actualiza la fila y refresca el Maestro. */
  onGuardado: (
    funcionarioId: number,
    zonalId: number | null,
    denominacion: DenominacionInstruccion | null,
  ) => void;
  onCerrar: () => void;
};

const ModalCambiarZona: FC<ModalCambiarZonaProps> = ({
  persona,
  zonales,
  onGuardado,
  onCerrar,
}) => {
  // Nace con la zona y la denominación actuales (se monta de nuevo para cada persona).
  const [zonalId, setZonalId] = useState<number | null>(persona.zonalId);
  const [denominacion, setDenominacion] =
    useState<DenominacionInstruccion | null>(
      persona.denominacion as DenominacionInstruccion | null,
    );
  const [confirmando, setConfirmando] = useState(false);

  const nombreZona =
    zonales.find((z) => z.id === zonalId)?.nombre ?? "sin zona";

  /** Si el servidor lo rechaza, lanza: el error se muestra en el modal de la confirmación. */
  const guardar = async (): Promise<void> => {
    await CoberturaService.fijarDatosInstruccion(persona.funcionarioId, {
      zonalId,
      denominacion,
    });
    setConfirmando(false);
    onGuardado(persona.funcionarioId, zonalId, denominacion);
  };

  const sucio =
    zonalId !== persona.zonalId || denominacion !== (persona.denominacion ?? null);
  const estadoPie: EstadoPie = sucio
    ? { tono: "cambios", texto: "Cambios sin guardar" }
    : { tono: "sinCambios", texto: "Sin cambios pendientes" };

  return (
    <>
      <DrawerLateral
        abierto
        ancho="md"
        titulo="Cambiar zona"
        subtitulo={persona.nombre}
        onCerrar={onCerrar}
        sucio={sucio}
        textoGuardar="Cambiar zona"
        onGuardar={() => setConfirmando(true)}
        estadoPie={estadoPie}
      >
        <SeccionDrawer titulo="Zona y denominación" rejilla={false}>
          <CampoDrawer etiqueta="Zona">
            <select
              className="select select-bordered select-sm w-full"
              value={zonalId ?? ""}
              onChange={(evento) =>
                setZonalId(
                  evento.target.value ? Number(evento.target.value) : null,
                )
              }
            >
              <option value="">— sin zona —</option>
              {zonales.map((zonal) => (
                <option key={zonal.id} value={zonal.id}>
                  {zonal.nombre}
                </option>
              ))}
            </select>
          </CampoDrawer>
          <CampoDrawer etiqueta="Denominación">
            <select
              className="select select-bordered select-sm w-full"
              value={denominacion ?? ""}
              onChange={(evento) =>
                setDenominacion(
                  (evento.target.value ||
                    null) as DenominacionInstruccion | null,
                )
              }
            >
              <option value="">— sin denominación —</option>
              {DENOMINACIONES.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </CampoDrawer>
          <AvisoEnLinea variante="advertencia">
            También cambia en el Maestro de personal y en los operativos que se
            registren desde ahora.
          </AvisoEnLinea>
        </SeccionDrawer>
      </DrawerLateral>

      <MensajeModal
        abierto={confirmando}
        variante="advertencia"
        titulo="¿Cambiar la zona?"
        mensaje={`${persona.nombre} pasará a «${nombreZona}». También cambia en el Maestro de personal y en los operativos que se registren desde ahora.`}
        textoPrincipal="Sí, cambiar"
        textoSecundario="Volver"
        tituloError="No se pudo cambiar la zona"
        onPrincipal={guardar}
        onSecundario={() => setConfirmando(false)}
      />
    </>
  );
};

export default ModalCambiarZona;
