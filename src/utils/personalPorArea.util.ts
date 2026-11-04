/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: personalPorArea.util.ts
 * Responsabilidad: Reglas puras del personal elegido POR ÁREA: cuándo se separa, qué pestañas lleva
 *                  y qué área le falta a la patrulla (espejo de `estadoDeComposicion` del servidor).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-04
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIN «TODAS» DONDE CONVIVEN INSPECTOR GENERAL Y TÉCNICO (2026-11-04). En todo formulario cuyas
 * áreas admitidas incluyan las dos, el personal se elige por área: una pestaña por cada una,
 * arrancando en General, y la lista, el buscador, la paginación, «No disponibles» y «Completar con
 * N» solo del área activa. LO DECIDE EL CATÁLOGO (`areasAdmitidas`), NUNCA EL NÚMERO: un formulario
 * nuevo con esas dos áreas lo toma solo. Hoy son el 5, el 6 y el 10 de prueba; el 8 elige UN tipo
 * con sus tarjetas (`tipoUnico`) y no pasa por aquí.
 *
 * SOLO SE OFRECE LO QUE QUIEN MIRA PUEDE AGREGAR. Las pestañas son las áreas admitidas que tienen
 * candidatos (o alguien ya elegido): quien aporta Instrucción al 6 recibe solo esos candidatos, se
 * queda con una sola área y no ve pestañas, como hoy.
 *
 * «FALTA» SOLO EN LA PATRULLA, Y NO BLOQUEA (RN-31 y RN-32). El servidor informa la composición y
 * no la exige (PV-29): aquí tampoco se apaga «Registrar». Se nombran solo General y Técnico, y
 * solo si hay candidatos de esa área: la persona de Instrucción del 6 la aporta otro departamento.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EstadoPie } from "../components/common/BarraPie.tsx";
import type { AreaPersonal, CatalogosFormulario } from "../interfaces/Formulario.ts";
import { NOMBRE_AREA } from "./personal.util.ts";

/** Las dos áreas que, juntas, separan el personal por área. Van primero, en este orden. */
export const AREAS_INSPECCION: readonly AreaPersonal[] = ["GENERAL", "TECNICO"];

/** Lo que el selector de personal necesita para separar por área. */
export type PersonalPorArea = {
  /** Las pestañas, en orden: General, Técnico y luego las demás admitidas. */
  areas: AreaPersonal[];
  /** Las áreas que le faltan a la patrulla (solo General y Técnico). Vacío fuera de la patrulla. */
  faltan: AreaPersonal[];
  /** El prefijo de cada área en la patrulla (IGECU, ITECU…), para «Nuevo IGECU-… al guardar». */
  prefijos: ReadonlyMap<AreaPersonal, string>;
};

/** «Inspector General - DMIP» → «Inspector General». */
export const nombreCortoDeArea = (area: AreaPersonal): string => NOMBRE_AREA[area].split(" - ")[0];

/** «Inspector Técnico» o «Inspector General y Inspector Técnico». */
export const textoDeAreas = (areas: readonly AreaPersonal[]): string => {
  const nombres = areas.map(nombreCortoDeArea);
  return nombres.length <= 1
    ? (nombres[0] ?? "")
    : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
};

/** ¿Admite Inspector General e Inspector Técnico a la vez? Entonces el personal va por área. */
export const separaPorArea = (areasAdmitidas: readonly AreaPersonal[] | undefined): boolean =>
  AREAS_INSPECCION.every((area) => areasAdmitidas?.includes(area) ?? false);

/** Las admitidas que hay entre los candidatos o los elegidos: General, Técnico y el resto. */
export const pestanasDeArea = (
  areasAdmitidas: readonly AreaPersonal[],
  presentes: ReadonlySet<AreaPersonal>,
): AreaPersonal[] => {
  const otras = areasAdmitidas
    .filter((area) => !AREAS_INSPECCION.includes(area))
    .sort((una, otra) => NOMBRE_AREA[una].localeCompare(NOMBRE_AREA[otra]));
  return [...AREAS_INSPECCION, ...otras].filter(
    (area) => areasAdmitidas.includes(area) && presentes.has(area),
  );
};

/**
 * Las áreas de inspección que le faltan a la patrulla. Solo con alguien ya elegido —sin nadie, el pie
 * ya dice «Falta: personal»—, y solo las que quien mira puede agregar (hay candidatos de ellas).
 */
export const areasQueFaltan = ({
  areasAdmitidas,
  esPatrulla,
  elegirUnaArea,
  elegidas,
  conCandidatos,
}: {
  areasAdmitidas: readonly AreaPersonal[];
  esPatrulla: boolean;
  elegirUnaArea: boolean;
  elegidas: ReadonlySet<AreaPersonal>;
  conCandidatos: ReadonlySet<AreaPersonal>;
}): AreaPersonal[] => {
  if (!esPatrulla || elegirUnaArea || elegidas.size === 0) return [];
  return AREAS_INSPECCION.filter(
    (area) => areasAdmitidas.includes(area) && conCandidatos.has(area) && !elegidas.has(area),
  );
};

/**
 * Arma la configuración por área desde el catálogo del formulario, los candidatos y los elegidos.
 * `null` deja el selector como siempre: el formulario no admite las dos áreas, elige UN tipo (el 8)
 * o quien mira solo tiene una área para elegir.
 */
export const personalPorArea = (
  catalogos: Pick<
    CatalogosFormulario,
    "areasAdmitidas" | "esPatrulla" | "elegirUnaArea" | "maxPersonas" | "prefijosPorArea"
  > | null | undefined,
  candidatos: readonly { id: number; area: AreaPersonal }[],
  elegidas: readonly { funcionarioId: number; area?: AreaPersonal }[],
): PersonalPorArea | null => {
  const admitidas = catalogos?.areasAdmitidas ?? [];
  if (!separaPorArea(admitidas)) return null;
  if (catalogos?.elegirUnaArea && catalogos.maxPersonas === 1) return null;

  const areaPorId = new Map(candidatos.map((persona) => [persona.id, persona.area]));
  const areasElegidas = new Set(
    elegidas.flatMap((persona) => {
      const area = persona.area ?? areaPorId.get(persona.funcionarioId);
      return area ? [area] : [];
    }),
  );
  const conCandidatos = new Set(candidatos.map((persona) => persona.area));
  const areas = pestanasDeArea(admitidas, new Set([...conCandidatos, ...areasElegidas]));
  if (areas.length <= 1) return null;

  const esPatrulla = catalogos?.esPatrulla ?? false;
  return {
    areas,
    faltan: areasQueFaltan({
      areasAdmitidas: admitidas,
      esPatrulla,
      elegirUnaArea: catalogos?.elegirUnaArea ?? false,
      elegidas: areasElegidas,
      conCandidatos,
    }),
    // Solo la patrulla lleva un código por área: fuera de ella el prefijo no se anuncia.
    prefijos: new Map(
      esPatrulla
        ? (catalogos?.prefijosPorArea ?? []).map((fila) => [fila.area, fila.prefijo] as const)
        : [],
    ),
  };
};

/** El rótulo de quien se agrega a la patrulla: «Nuevo IGECU-… al guardar». */
export const rotuloNuevoConPrefijo = (prefijo: string): string => `Nuevo ${prefijo}-… al guardar`;

/**
 * EL PIE CON LO QUE FALTA A LA PATRULLA, SIN BLOQUEAR. Solo cuando el pie no dice algo más urgente
 * (lo que falta para registrar, un error, «Sin cambios pendientes»): «Listo para registrar» pasa a
 * «Falta: Inspector Técnico · puede registrar igual», y «Cambios sin guardar» suma lo que falta. En
 * ámbar (`cambios`), nunca en rojo: no es un error y el botón sigue activo.
 */
export const conFaltaDeComposicion = (
  estado: EstadoPie,
  faltan: readonly AreaPersonal[],
  verbo: "registrar" | "guardar" = "registrar",
): EstadoPie => {
  if (faltan.length === 0) return estado;
  const falta = `Falta: ${textoDeAreas(faltan)}`;
  if (estado.tono === "listo") {
    return { tono: "cambios", texto: `${falta} · puede ${verbo} igual` };
  }
  if (estado.tono === "cambios") return { tono: "cambios", texto: `${estado.texto} · ${falta}` };
  return estado;
};
