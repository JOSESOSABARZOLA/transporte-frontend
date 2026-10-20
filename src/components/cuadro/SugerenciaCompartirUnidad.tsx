/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos · compartir unidad
 * Archivo: SugerenciaCompartirUnidad.tsx
 * Responsabilidad: Avisar, en el grupo «Transporte» del formulario, que otro operativo del mismo
 *                  ámbito va al mismo punto y horario, y recoger si quien registra pide la misma unidad.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUIEN REGISTRA SOLICITA; LA DAF EJECUTA (RN-40, plan «compartir unidad»). Aquí solo se deja la
 * INTENCIÓN de viajar en la unidad de otro operativo. No bloquea el registro: «Registrar operativo»
 * sigue disponible, y sin marcar el check decide la DAF.
 *
 * UN SOLO CHECK (2026-10-19, a pedido del usuario). Había cuatro opciones —compartir, propios medios,
 * vehículo exclusivo con justificación, dejar que decida la DAF—, y dos repetían controles que ya
 * existen: «Propios medios» es una opción de «Transporte requerido» y «Vehículo exclusivo» es el check
 * del macrooperativo. Quedó solo lo nuevo: «Solicitar compartir unidad con X». La justificación del
 * exclusivo se retiró (opción A del usuario).
 *
 * SOLO EL PROPIO ÁMBITO (RN-48). Las coincidencias las filtra el servidor con la misma vara que el
 * listado: aquí nunca llega un operativo de otro departamento, y del personal solo el nombre.
 *
 * SE LLAMA «COMPARTIR UNIDAD», NUNCA «ADICIONAL»: esa palabra ya nombra el operativo adicional
 * (RN-61 a RN-64) y la captura libre (RN-20).
 *
 * Si la coincidencia elegida desaparece (cambió el punto o el horario), la solicitud se limpia sola
 * y se dice en línea. Con propios medios no hay transporte DAF y la sugerencia no se pinta.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useState, type FC } from "react";
import { useFormikContext } from "formik";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import { useCoincidenciasTransporte } from "../../hooks/useCoincidenciasTransporte.ts";
import type { FiltroCoincidencias, TipoTransporte } from "../../interfaces/Operativo.ts";
import {
  MOTIVO_EXCLUSIVO_NO_COMPARTE,
  notaMismaUnidad,
  rotuloCompartir,
  textoNoCompartible,
} from "../../utils/compartirUnidad.util.ts";
import { envolventeDeHorarios } from "../../utils/horario.util.ts";
import type { ValoresOperativo } from "../../utils/valoresOperativo.util.ts";

type SugerenciaCompartirUnidadProps = {
  /** La jornada del operativo. Sin ella no se pregunta. */
  fecha: string | null;
  /** El horario de cada persona: la ventana del operativo es su envolvente. */
  personal: ReadonlyArray<{ horaInicio?: string | null; horaFin?: string | null }>;
  /** La zonal del punto elegido (si se conoce); si no, la primera del operativo. */
  zonalDelPunto: number | null;
  /** Al editar, el propio operativo no cuenta como coincidencia. */
  excluirOperativoId?: number | null;
  deshabilitado?: boolean;
};

/** Texto del motivo cuando el servidor no lo envía pero la coincidencia no es compatible. */
const MOTIVO_GENERICO = "No piden el mismo traslado: no pueden compartir la unidad.";

const SugerenciaCompartirUnidad: FC<SugerenciaCompartirUnidadProps> = ({
  fecha,
  personal,
  zonalDelPunto,
  excluirOperativoId = null,
  deshabilitado = false,
}) => {
  const { values, setFieldValue } = useFormikContext<ValoresOperativo>();
  const [avisoRetirada, setAvisoRetirada] = useState<string | null>(null);

  const tipo = values.tipoTransporte ?? "COMPLETO";
  const punto = /^\d+$/.test(values.punto) ? Number(values.punto) : null;
  const zonalId = zonalDelPunto ?? values.zonalesIds[0] ?? null;
  const ventana = envolventeDeHorarios(personal);
  const ventanaInicio = ventana?.horaInicio ?? null;
  const ventanaFin = ventana?.horaFin ?? null;
  const exclusivo = values.esMacrooperativo ?? false;
  const solicitada = values.eleccionCompartir === "COMPARTIR";

  const filtro = useMemo<FiltroCoincidencias | null>(() => {
    if (!fecha || punto === null || zonalId === null || !ventanaInicio || !ventanaFin) return null;
    if (tipo === "PROPIOS_MEDIOS") return null;
    return {
      fecha,
      puntoEncuentroId: punto,
      zonalId,
      horaInicio: ventanaInicio,
      horaFin: ventanaFin,
      tipoTransporte: tipo as Exclude<TipoTransporte, "PROPIOS_MEDIOS">,
      ...(exclusivo ? { esMacrooperativo: true } : {}),
      ...(excluirOperativoId ? { excluirOperativoId } : {}),
    };
  }, [fecha, punto, zonalId, ventanaInicio, ventanaFin, tipo, exclusivo, excluirOperativoId]);

  const { coincidencias, cargado } = useCoincidenciasTransporte(filtro);

  /** La coincidencia de la que se habla: la elegida, o la primera. */
  const elegida =
    coincidencias.find((c) => c.operativoId === values.compartirConOperativoId) ??
    coincidencias[0] ??
    null;

  /*
    LA COINCIDENCIA ELEGIDA DESAPARECIÓ (cambió el punto, el horario o el traslado): la solicitud se
    limpia sola y se dice. Solo con una respuesta del servidor para el filtro actual (`cargado`), o
    cuando ya no hay con qué preguntar (`filtro` nulo), para no limpiar a destiempo.
  */
  useEffect(() => {
    if (!solicitada || !values.compartirConOperativoId) return;
    const sigue = coincidencias.some(
      (c) => c.operativoId === values.compartirConOperativoId && c.compatible,
    );
    if (sigue || (filtro && !cargado)) return;
    if (tipo === "PROPIOS_MEDIOS") return;
    setAvisoRetirada(
      `Ya no coincide con ${values.compartirConIdentificador ?? "el operativo elegido"}: se quitó la solicitud de compartir la unidad.`,
    );
    void setFieldValue("eleccionCompartir", undefined);
    void setFieldValue("compartirConOperativoId", null);
    void setFieldValue("compartirConIdentificador", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacciona a la respuesta, no a la elección
  }, [coincidencias, cargado, filtro]);

  /** Marca o desmarca la solicitud sobre la coincidencia de la que se habla. */
  const solicitar = (marcado: boolean) => {
    setAvisoRetirada(null);
    if (marcado && elegida) {
      void setFieldValue("eleccionCompartir", "COMPARTIR");
      void setFieldValue("compartirConOperativoId", elegida.operativoId);
      void setFieldValue("compartirConIdentificador", elegida.identificador);
      return;
    }
    // Sin marcar decide la DAF.
    void setFieldValue("eleccionCompartir", undefined);
    void setFieldValue("compartirConOperativoId", null);
    void setFieldValue("compartirConIdentificador", null);
  };

  if (coincidencias.length === 0 || !elegida) {
    return avisoRetirada ? (
      <AvisoEnLinea variante="advertencia" className="mt-2">
        {avisoRetirada}
      </AvisoEnLinea>
    ) : null;
  }

  const personas = elegida.personal.join(", ");
  // El motivo por el que no se puede pedir: el vehículo exclusivo propio manda sobre el del servidor.
  const motivo = exclusivo
    ? MOTIVO_EXCLUSIVO_NO_COMPARTE
    : elegida.compatible
      ? null
      : (elegida.motivo ?? MOTIVO_GENERICO);
  const apagado = deshabilitado || motivo !== null;
  const rotulo = rotuloCompartir(
    elegida.identificador,
    elegida.comparte,
    elegida.compatible,
    elegida.propios,
  );

  return (
    <div className="mt-2 flex flex-col gap-2" data-celda="compartir-unidad">
      <AvisoEnLinea variante="info" titulo="Misma movilización">
        Se detectó la solicitud <strong>{elegida.identificador}</strong>
        {personas ? ` (${personas})` : ""} registrada para el mismo punto y horario. ¿Desea
        solicitar esta movilización en la misma unidad?
      </AvisoEnLinea>

      {coincidencias.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className="label-text">Coincidencias en el mismo punto y horario</span>
          <select
            className="select select-bordered select-sm w-full"
            value={elegida.operativoId}
            disabled={deshabilitado}
            onChange={(evento) => {
              const otra = coincidencias.find(
                (c) => c.operativoId === Number(evento.target.value),
              );
              if (!otra) return;
              if (solicitada && otra.compatible && !exclusivo) {
                void setFieldValue("compartirConOperativoId", otra.operativoId);
                void setFieldValue("compartirConIdentificador", otra.identificador);
                return;
              }
              // Sin solicitud (o con una que la otra no admite), solo cambia de qué se habla.
              void setFieldValue("eleccionCompartir", undefined);
              void setFieldValue("compartirConIdentificador", null);
              void setFieldValue("compartirConOperativoId", solicitada ? null : otra.operativoId);
            }}
          >
            {coincidencias.map((c) => (
              <option key={c.operativoId} value={c.operativoId}>
                {c.identificador} · {c.horaInicio}–{c.horaFin}
                {c.compatible ? "" : " · no puede compartir"}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-1">
        <label
          className={`label justify-start gap-2 whitespace-normal ${apagado ? "cursor-not-allowed" : "cursor-pointer"}`}
          title={motivo ?? undefined}
        >
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            name="solicitarMismaUnidad"
            checked={solicitada && !apagado}
            disabled={apagado}
            aria-describedby="solicitarMismaUnidad-nota"
            onChange={(evento) => solicitar(evento.target.checked)}
          />
          <span className="label-text min-w-0">{rotulo}</span>
        </label>
        {motivo === null && (
          <span id="solicitarMismaUnidad-nota" className="text-xs text-app-muted">
            {notaMismaUnidad(elegida.comparte, elegida.propios, {
              anfitrion: elegida.identificador,
              comparteCon: elegida.comparteCon,
              contiene: elegida.contiene,
              contenidoEn: elegida.contenidoEn,
            })}{" "}
            Sin marcar, decide la DAF.
          </span>
        )}
      </div>

      {/* El motivo ESCRITO, no solo en el title del check apagado (2026-10-19). */}
      {motivo !== null && (
        <AvisoEnLinea variante="advertencia">
          <span id="solicitarMismaUnidad-nota">
            {textoNoCompartible(elegida.identificador, motivo)}
          </span>
        </AvisoEnLinea>
      )}

      {avisoRetirada && <AvisoEnLinea variante="advertencia">{avisoRetirada}</AvisoEnLinea>}
    </div>
  );
};

export default SugerenciaCompartirUnidad;
