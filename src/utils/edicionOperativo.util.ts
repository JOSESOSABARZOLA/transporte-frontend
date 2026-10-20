/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Edición de operativos
 * Archivo: edicionOperativo.util.ts
 * Responsabilidad: Comparar el borrador de una edición con el operativo del servidor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA COPIA (2026-10-08). `hayCambiosDePersonal` y `codigoDeTramite` estaban repetidas, letra
 * por letra, en Registro de operativo y en Mis operativos: las dos editan en el mismo cajón
 * (`DrawerOperativo`) con el personal DIFERIDO, y las dos tienen que decir lo mismo de «hay
 * cambios». Aquí viven también las dos preguntas del aviso de la DAF del modo «editar».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PersonaAsignada } from "../interfaces/Operativo.ts";

/** El código del trámite de Inspección de una persona asignada, o `null` (2026-10-07). */
export const codigoDeTramite = (persona: PersonaAsignada): string | null =>
  persona.tramiteInspeccion?.codigoTramite ?? null;

/**
 * ¿El borrador de personal difiere del original del servidor? (2026-10-01). En la edición de un
 * operativo PROPIO el personal no se guarda al instante: se acumula en el borrador y se aplica al
 * «Guardar cambios». Esto mira si hay alta/baja, cambio de turno o de trámite pendiente, para que
 * el cierre pregunte antes de descartar.
 */
export const hayCambiosDePersonal = (
  actual: PersonaAsignada[],
  original: PersonaAsignada[],
): boolean => {
  if (actual.length !== original.length) return true;
  const porId = new Map(
    original.map((persona) => [persona.funcionarioId, persona]),
  );
  return actual.some((persona) => {
    const antes = porId.get(persona.funcionarioId);
    return (
      !antes ||
      antes.horaInicio !== persona.horaInicio ||
      antes.horaFin !== persona.horaFin ||
      codigoDeTramite(antes) !== codigoDeTramite(persona)
    );
  });
};

/**
 * ¿Cambió el horario de alguien que ya estaba? Es lo que puede descuadrar el transporte asignado
 * por la DAF: el conductor se eligió para esas horas. Altas y bajas no cuentan aquí —no mueven la
 * ventana de quien ya iba—; un turno distinto, sí.
 */
export const cambioDeHorario = (
  actual: PersonaAsignada[],
  original: PersonaAsignada[],
): boolean => {
  const porId = new Map(
    original.map((persona) => [persona.funcionarioId, persona]),
  );
  return actual.some((persona) => {
    const antes = porId.get(persona.funcionarioId);
    return (
      antes !== undefined &&
      (antes.horaInicio !== persona.horaInicio ||
        antes.horaFin !== persona.horaFin)
    );
  });
};

/** ¿Las zonales elegidas son otras que las originales? El orden no cuenta. */
export const cambiaronZonales = (
  actuales: number[],
  originales: number[],
): boolean => {
  if (actuales.length !== originales.length) return true;
  const antes = new Set(originales);
  return actuales.some((id) => !antes.has(id));
};
