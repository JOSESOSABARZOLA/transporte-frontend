/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: PasoEmitir.tsx
 * Responsabilidad: Paso 4. Resumen de la jornada y emisión de una hoja de ruta por conductor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EMITIR DEJA CONSTANCIA, NO GENERA EL PDF. El servidor guarda la huella de los tramos de cada
 * conductor al emitir; si después se asigna, quita o cambia uno, la hoja vuelve sola a «Pendiente
 * (cambio posterior)». El PDF se sigue generando al momento con «Ver hoja» (uno por vehículo).
 *
 * La hoja de ruta es el INSUMO: la orden de movilización oficial y su número se emiten en el sistema
 * de órdenes de movilización. La emisión no depende de la ventana de la DAF.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import TarjetaPaso from "./TarjetaPaso.tsx";
import Boton from "../../common/Boton.tsx";
import type {
  ConductorJornada,
  EstadoHojaRuta,
  ResumenJornadaDaf,
} from "../../../interfaces/JornadaDaf.ts";
import { JornadaDafService } from "../../../services/jornadaDaf.service.ts";
import { PlanificacionService } from "../../../services/planificacion.service.ts";
import { descargarArchivo } from "../../../utils/banner.util.ts";
import { mensaje } from "../../../utils/mensaje.ts";
import { franja, nombreDeGaraje } from "../../../utils/planificarDia.util.ts";
import { nombreTipoTransporte } from "../../../utils/tipoTransporte.util.ts";

type PasoEmitirProps = {
  fecha: string;
  resumen: ResumenJornadaDaf;
  onRecargar: () => Promise<ResumenJornadaDaf | null>;
  onVolver: () => void;
  onAviso: (mensaje: string) => void;
};

const ESTADO_HOJA: Record<EstadoHojaRuta, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Pendiente", clase: "badge-ghost" },
  EMITIDA: { texto: "Emitida", clase: "badge-success" },
  PENDIENTE_CAMBIO: { texto: "Pendiente (cambio posterior)", clase: "badge-warning" },
};

const NOTA_MOVILIZACION =
  "La orden de movilización oficial y su número se emiten en el sistema de órdenes de movilización.";

const PasoEmitir: FC<PasoEmitirProps> = ({ fecha, resumen, onRecargar, onVolver, onAviso }) => {
  const { totales } = resumen;
  const [emitiendo, setEmitiendo] = useState<number | "todas" | null>(null);

  const conHoja = resumen.conductores.filter(
    (c): c is ConductorJornada & { hojaRuta: NonNullable<ConductorJornada["hojaRuta"]> } =>
      c.hojaRuta !== null,
  );
  const todasEmitidas =
    conHoja.length > 0 && conHoja.every((c) => c.hojaRuta.estado === "EMITIDA");

  const emitir = async (conductorId?: number) => {
    setEmitiendo(conductorId ?? "todas");
    try {
      const respuesta = await JornadaDafService.emitir(fecha, conductorId);
      onAviso(
        `${respuesta.emitidas} ${respuesta.emitidas === 1 ? "hoja de ruta emitida" : "hojas de ruta emitidas"}.`,
      );
      await onRecargar();
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudieron emitir las hojas de ruta" });
    } finally {
      setEmitiendo(null);
    }
  };

  const verHoja = async (vehiculoId: number, placa: string) => {
    try {
      const pdf = await PlanificacionService.hojaDeRuta(fecha, vehiculoId);
      descargarArchivo(pdf, `hoja-ruta-${placa}-${fecha}.pdf`);
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo descargar la hoja de ruta" });
    }
  };

  /** Los tramos del conductor, como chips: «08H00–16H30 · OCPMO-001 · Calderón · Completo». */
  const tramosDe = (conductorId: number) =>
    resumen.operativos.flatMap((operativo) =>
      operativo.tramos
        .filter((t) => t.conductorId === conductorId)
        .map((t) => ({
          id: t.id,
          texto: [
            franja(t.horaInicio, t.horaFin),
            operativo.identificador,
            operativo.zonal,
            nombreTipoTransporte(operativo.tipoTransporte),
          ]
            .filter(Boolean)
            .join(" · "),
        })),
    );

  /**
   * «PMA7056 · guarda en Garaje Centro», con lo declarado en el paso 3: el NOMBRE del garaje del
   * catálogo (`resumen.garajes`), o la sugerencia si aún no se declaró.
   */
  const guardaDe = (conductor: ConductorJornada): string => {
    const guarda = resumen.finDelDia.find((f) => conductor.vehiculoIds.includes(f.vehiculoId));
    const ubicacionId = guarda?.declarada?.ubicacionId ?? guarda?.ubicacionId ?? null;
    const garaje =
      resumen.garajes.find((g) => g.id === ubicacionId)?.nombre ??
      guarda?.declarada?.ubicacion ??
      guarda?.ubicacion ??
      null;
    const donde =
      guarda?.declarada?.tipo === "DOMICILIO"
        ? "parqueadero autorizado"
        : garaje
          ? nombreDeGaraje(garaje)
          : null;
    return [conductor.placa, donde ? `guarda en ${donde}` : null].filter(Boolean).join(" · ");
  };

  const tarjetas = [
    {
      titulo: "Operativos cubiertos",
      valor: `${totales.cubiertos} de ${totales.operativos}`,
      detalle:
        totales.sinConductor > 0 ? `${totales.sinConductor} sin conductor` : "Todos cubiertos",
    },
    {
      titulo: "Conductores en uso",
      valor: String(totales.conductoresEnUso),
      detalle:
        totales.libresEnUso > 0
          ? `Incluye ${totales.libresEnUso} de libre`
          : "Sin conductores de libre",
    },
    {
      titulo: "Vehículos en uso",
      valor: `${totales.vehiculosEnUso} de ${totales.vehiculosDisponibles}`,
      detalle: totales.enTaller > 0 ? `${totales.enTaller} en taller` : "Ninguno en taller",
    },
    {
      titulo: "Avisos",
      valor: String(totales.avisos),
      detalle: totales.avisos === 0 ? "Sin avisos" : "En los carriles de los conductores",
    },
  ];

  return (
    <TarjetaPaso
      numero={4}
      titulo="Emitir hojas de ruta"
      descripcion="Revise el resumen y emita una hoja por conductor. Es el insumo de la orden de movilización."
      extremo={
        <Boton
          variante="primario"
          tamano="md"
          cargando={emitiendo === "todas"}
          deshabilitado={emitiendo !== null}
          motivoDeshabilitado={
            todasEmitidas
              ? "Todas las hojas de ruta ya están emitidas."
              : conHoja.length === 0
                ? "Ningún conductor tiene tramos asignados."
                : null
          }
          onClick={() => void emitir()}
        >
          {todasEmitidas
            ? "✓ Hojas emitidas"
            : emitiendo === "todas"
              ? "Emitiendo…"
              : "Emitir todas las hojas de ruta"}
        </Boton>
      }
      pie={
        <>
          <Boton tamano="lg" onClick={onVolver}>
            ← Volver
          </Boton>
          <p className="text-sm text-app-muted">{NOTA_MOVILIZACION}</p>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((tarjeta) => (
          <div key={tarjeta.titulo} className="rounded-md border border-base-300 bg-base-100 p-3">
            <p className="text-sm text-app-label">{tarjeta.titulo}</p>
            <p className="text-2xl font-semibold text-app-strong">{tarjeta.valor}</p>
            <p className="text-xs text-app-muted">{tarjeta.detalle}</p>
          </div>
        ))}
      </div>

      {conHoja.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          Ningún conductor tiene tramos asignados: no hay hojas de ruta que emitir.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Hojas de ruta por conductor">
          {conHoja.map((conductor) => {
            const estado = ESTADO_HOJA[conductor.hojaRuta.estado];
            const emitida = conductor.hojaRuta.estado === "EMITIDA";
            return (
              <li
                key={conductor.id}
                className="flex flex-col gap-3 rounded-md border border-base-300 p-3 lg:flex-row lg:items-center"
                data-testid={`hoja-${conductor.id}`}
              >
                <div className="flex min-w-0 flex-col lg:w-60">
                  <span className="font-semibold text-app-strong">{conductor.nombre}</span>
                  <span className="text-xs text-app-muted">{guardaDe(conductor)}</span>
                </div>
                <ul className="flex flex-1 flex-wrap gap-1">
                  {tramosDe(conductor.id).map((tramo) => (
                    <li key={tramo.id} className="badge badge-ghost badge-sm min-w-0 max-w-full">
                      <span className="min-w-0 truncate" title={tramo.texto}>
                        {tramo.texto}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge badge-sm ${estado.clase}`}>{estado.texto}</span>
                  {emitida ? (
                    conductor.vehiculoIds.map((vehiculoId) => {
                      const placa =
                        resumen.vehiculos.lista.find((v) => v.id === vehiculoId)?.placa ??
                        String(vehiculoId);
                      return (
                        <Boton
                          key={vehiculoId}
                          tamano="sm"
                          onClick={() => void verHoja(vehiculoId, placa)}
                          aria-label={`Ver hoja de ${conductor.nombre} · ${placa}`}
                        >
                          Ver hoja
                        </Boton>
                      );
                    })
                  ) : (
                    <Boton
                      variante="acento"
                      tamano="sm"
                      cargando={emitiendo === conductor.id}
                      deshabilitado={emitiendo !== null}
                      onClick={() => void emitir(conductor.id)}
                      aria-label={`Emitir la hoja de ${conductor.nombre}`}
                    >
                      {emitiendo === conductor.id ? "Emitiendo…" : "Emitir"}
                    </Boton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </TarjetaPaso>
  );
};

export default PasoEmitir;
