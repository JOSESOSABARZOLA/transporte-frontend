/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: ModalContinuarRotacion.tsx
 * Responsabilidad: Completar las celdas vacías siguiendo el ciclo de cada persona.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * EL CICLO LO CALCULA EL SERVIDOR (`propuesta-rotacion`, que no escribe nada) y aquí solo se
 * enseña y se confirma. Como red adicional, el cliente descarta cualquier propuesta que caiga
 * sobre una celda ya planificada o de ausencia: «Continuar rotación» nunca toca lo planificado.
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` con la versalita del instrumento («Cobertura por
 * turnos» / «Turnos de conductores»); ahora es `DrawerLateral` `ancho="md"`, y ese contexto va en el
 * subtítulo. El pie es el del estándar: [Cancelar] [acción], con su estado a la izquierda.
 */

import { useEffect, useMemo, useState, type FC } from "react";

import DrawerLateral, { type EstadoPie } from "../../common/DrawerLateral.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import type {
  CambioCelda,
  PersonaCobertura,
} from "../../../interfaces/Cobertura.ts";
import { presentarError } from "../../../utils/errorApi.util.ts";
import { CONFIG_INSTRUCCION, type ServicioMatriz } from "./configMatriz.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";

type ModalContinuarRotacionProps = {
  abierto: boolean;
  mes: string;
  /** Las personas del alcance (las visibles según los filtros). */
  personas: PersonaCobertura[];
  /** De dónde sale la propuesta (2026-10-06); por omisión, la cobertura de Instrucción. */
  servicio?: ServicioMatriz;
  sujetoPlural?: string;
  /** Contexto del subtítulo; por omisión, el de Instrucción. */
  contexto?: string;
  onAplicar: (cambios: CambioCelda[]) => void;
  onCerrar: () => void;
};

const ModalContinuarRotacion: FC<ModalContinuarRotacionProps> = ({
  abierto,
  mes,
  personas,
  servicio = CONFIG_INSTRUCCION.servicio,
  sujetoPlural = CONFIG_INSTRUCCION.sujeto.plural,
  contexto = CONFIG_INSTRUCCION.contexto,
  onAplicar,
  onCerrar,
}) => {
  const [cambios, setCambios] = useState<CambioCelda[] | null>(null);
  const [omitidas, setOmitidas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ids = useMemo(
    () => personas.map((persona) => persona.funcionarioId),
    [personas],
  );

  useEffect(() => {
    if (!abierto) return;
    // Se monta solo al abrirse (el padre lo monta condicionalmente): el estado nace limpio.
    let vigente = true;
    void servicio
      .proponerRotacion(mes, ids)
      .then((respuesta) => {
        if (!vigente) return;
        // Solo celdas VACÍAS (sin turno ni ausencia), aunque el servidor ya lo garantice.
        const vacia = new Set<string>();
        for (const persona of personas) {
          for (const celda of persona.celdas) {
            if (!celda.esAusencia && celda.estado === null) {
              vacia.add(`${persona.funcionarioId}|${celda.fecha}`);
            }
          }
        }
        setCambios(
          respuesta.propuestas.filter((p) =>
            vacia.has(`${p.funcionarioId}|${p.fecha}`),
          ),
        );
        setOmitidas(respuesta.omitidas);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(presentarError(fallo).mensaje);
      });
    return () => {
      vigente = false;
    };
  }, [abierto, mes, ids, personas, servicio]);

  const cantidadPersonas = useMemo(
    () => new Set((cambios ?? []).map((c) => c.funcionarioId)).size,
    [cambios],
  );

  const sinCeldas = !cambios || cambios.length === 0;
  const estadoPie: EstadoPie | null = error
    ? { tono: "error", texto: "No se pudo calcular la rotación" }
    : cambios === null
      ? null
      : sinCeldas
        ? { tono: "pendiente", texto: "No hay celdas que completar" }
        : { tono: "listo", texto: `Listo para completar ${cambios.length} celdas` };

  return (
    <DrawerLateral
      abierto={abierto}
      ancho="md"
      titulo="Continuar rotación"
      subtitulo={contexto}
      ayuda="Propone el turno de cada celda vacía siguiendo el ciclo de cada fila en las semanas anteriores. No toca lo ya planificado ni las ausencias."
      onCerrar={onCerrar}
      textoGuardar={`Completar ${cambios?.length ?? 0} celdas`}
      onGuardar={() => cambios && onAplicar(cambios)}
      estadoPie={estadoPie}
      motivoGuardar={sinCeldas ? "No hay celdas que completar." : null}
    >
      <SeccionDrawer titulo="Propuesta" rejilla={false}>
        {error && (
          <AvisoEnLinea variante="error">{error}</AvisoEnLinea>
        )}
        {!error && cambios === null && (
          <p className="text-xs text-app-muted" role="status">
            Calculando la rotación…
          </p>
        )}
        {cambios && (
          <AvisoEnLinea variante="info">
            Se llenarán {cambios.length} celdas · {cantidadPersonas}{" "}
            {sujetoPlural} ·{" "}
            {omitidas} omitidas (ausencias)
          </AvisoEnLinea>
        )}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default ModalContinuarRotacion;
