/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Turnos de conductores
 * Archivo: ModalPropuestaMes.tsx
 * Responsabilidad: Enseñar y confirmar la propuesta del mes que calcula el servidor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * LA PROPUESTA LA CALCULA EL SERVIDOR (`propuesta-mes`, que no escribe nada) con el patrón de
 * rotación de cada conductor y los mínimos por día. Aquí se enseña su resumen —celdas a llenar,
 * días bajo el mínimo, avisos y parámetros sin configurar— y, al «Aplicar», la matriz la escribe
 * con el lote de siempre, así que entra en «Deshacer».
 *
 * «Rehacer todo» vuelve a pedir la propuesta pisando también lo ya cargado; las AUSENCIAS nunca se
 * tocan, y el cliente las descarta además como red (igual que «Continuar rotación»).
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` con la versalita del instrumento («Cobertura por
 * turnos» / «Turnos de conductores»); ahora es `DrawerLateral` `ancho="md"`, y ese contexto va en el
 * subtítulo. El pie es el del estándar: [Cancelar] [acción], con su estado a la izquierda.
 */

import { useEffect, useMemo, useState, type FC } from "react";
import { Link } from "react-router-dom";

import DrawerLateral, { type EstadoPie } from "../../common/DrawerLateral.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import type {
  CambioCelda,
  PersonaCobertura,
  PropuestaMes,
} from "../../../interfaces/Cobertura.ts";
import { presentarError } from "../../../utils/errorApi.util.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";

type ModalPropuestaMesProps = {
  mes: string;
  /** Todas las filas del mes (para nombrar los avisos y descartar ausencias). */
  personas: PersonaCobertura[];
  proponer: (mes: string, rehacerTodo: boolean) => Promise<PropuestaMes>;
  /** Contexto del subtítulo («Turnos de conductores»). */
  contexto: string;
  /** A dónde lleva «Parámetros sin configurar» («Ventanas y parámetros»). */
  rutaParametros?: string;
  onAplicar: (cambios: CambioCelda[]) => void;
  onCerrar: () => void;
};

const TURNO: Record<"DIA" | "NOCHE", string> = { DIA: "Día", NOCHE: "Noche" };

const ModalPropuestaMes: FC<ModalPropuestaMesProps> = ({
  mes,
  personas,
  proponer,
  contexto,
  rutaParametros,
  onAplicar,
  onCerrar,
}) => {
  const [rehacerTodo, setRehacerTodo] = useState(false);
  const [propuesta, setPropuesta] = useState<PropuestaMes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void proponer(mes, rehacerTodo)
      .then((respuesta) => {
        if (vigente) setPropuesta(respuesta);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(presentarError(fallo).mensaje);
      });
    return () => {
      vigente = false;
    };
  }, [mes, rehacerTodo, proponer]);

  const nombres = useMemo(
    () => new Map(personas.map((p) => [p.funcionarioId, p.nombre])),
    [personas],
  );

  // Red del cliente: nunca una ausencia y, sin «Rehacer todo», solo celdas vacías.
  const cambios = useMemo<CambioCelda[]>(() => {
    if (!propuesta) return [];
    const admisibles = new Set<string>();
    for (const persona of personas) {
      for (const celda of persona.celdas) {
        if (celda.esAusencia) continue;
        if (!rehacerTodo && celda.estado !== null) continue;
        admisibles.add(`${persona.funcionarioId}|${celda.fecha}`);
      }
    }
    return propuesta.propuestas.filter((p) =>
      admisibles.has(`${p.funcionarioId}|${p.fecha}`),
    );
  }, [propuesta, personas, rehacerTodo]);

  const resumen = propuesta?.resumen;

  const estadoPie: EstadoPie | null = error
    ? { tono: "error", texto: "No se pudo calcular la propuesta" }
    : !resumen
      ? null
      : cambios.length === 0
        ? { tono: "pendiente", texto: "La propuesta no cambia ninguna celda" }
        : { tono: "listo", texto: `Listo para aplicar ${cambios.length} celdas` };

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo="Generar propuesta del mes"
      subtitulo={contexto}
      ayuda="Llena el mes con el patrón de rotación de cada conductor y los mínimos por día. Nada se escribe hasta pulsar «Aplicar», y se puede deshacer."
      onCerrar={onCerrar}
      textoGuardar="Aplicar"
      onGuardar={() => onAplicar(cambios)}
      estadoPie={estadoPie}
      motivoGuardar={cambios.length === 0 ? "La propuesta no cambia ninguna celda." : null}
    >
      <SeccionDrawer titulo="Propuesta" rejilla={false}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={rehacerTodo}
            onChange={(evento) => {
              // La propuesta anterior ya no vale: se vacía y el efecto pide la nueva.
              setPropuesta(null);
              setError(null);
              setRehacerTodo(evento.target.checked);
            }}
          />
          Rehacer todo (no toca ausencias)
        </label>

        {error && (
          <AvisoEnLinea variante="error">{error}</AvisoEnLinea>
        )}
        {!error && !resumen && (
          <p className="text-xs text-app-muted" role="status">
            Calculando la propuesta…
          </p>
        )}

        {resumen && (
          <div className="flex flex-col gap-2" role="status">
            <AvisoEnLinea variante="info">
              Celdas a llenar: {resumen.celdasALlenar}
            </AvisoEnLinea>

            <div className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">
                Días bajo el mínimo: {resumen.diasBajoMinimo.length}
              </span>
              {resumen.diasBajoMinimo.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {resumen.diasBajoMinimo.map((dia) => (
                    <li key={`${dia.fecha}-${dia.turno}`}>
                      {dia.fecha.slice(8, 10)} · {TURNO[dia.turno]}: {dia.hay} de{" "}
                      {dia.minimo}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="font-semibold">
                Avisos: {resumen.avisos.length}
              </span>
              {resumen.avisos.length > 0 && (
                <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                  {resumen.avisos.map((aviso) => (
                    <li key={`${aviso.funcionarioId}-${aviso.fecha}-${aviso.mensaje}`}>
                      {nombres.get(aviso.funcionarioId) ?? `Conductor ${aviso.funcionarioId}`}{" "}
                      · {aviso.fecha.slice(8, 10)}: {aviso.mensaje}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {resumen.parametrosSinConfigurar.length > 0 && (
              <AvisoEnLinea variante="advertencia">
                  Parámetros sin configurar:{" "}
                  {resumen.parametrosSinConfigurar.join(", ")}.{" "}
                  {rutaParametros && (
                    <Link className="link link-hover" to={rutaParametros}>
                      Ir a Ventanas y parámetros
                    </Link>
                  )}
                </AvisoEnLinea>
            )}
          </div>
        )}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default ModalPropuestaMes;
