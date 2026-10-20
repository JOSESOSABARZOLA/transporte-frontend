/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos · compartir unidad
 * Archivo: compartirUnidad.util.ts
 * Responsabilidad: Los textos de «compartir unidad» que se repiten entre pantallas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * Al EDITAR, si el cambio dejó la intención de compartir sin coincidencia, el servidor la retira
 * sin error y lo avisa con `avisos: ['COMPARTIR_RETIRADO']`: aquí se dice con un aviso breve de
 * advertencia (regla 19). No es un error y el guardado se dio por bueno.
 */

import type { Operativo } from "../interfaces/Operativo.ts";
import { toast } from "./mensaje.ts";

export const AVISO_COMPARTIR_RETIRADO = "COMPARTIR_RETIRADO";

/** El texto del aviso: nombra con quién ya no coincide, si se sabe. */
export const textoCompartirRetirado = (anfitrion?: string | null): string =>
  `Ya no coincide con ${anfitrion ?? "el operativo elegido"}: se retiró la solicitud de compartir la unidad.`;

/** Avisa, tras una edición, que el servidor retiró la intención de compartir. */
export const avisarCompartirRetirado = (
  actualizado: Pick<Operativo, "avisos">,
  anfitrionAnterior?: string | null,
): void => {
  if (!actualizado.avisos?.includes(AVISO_COMPARTIR_RETIRADO)) return;
  toast.advertencia("Se retiró la solicitud de compartir", {
    texto: textoCompartirRetirado(anfitrionAnterior),
  });
};

/**
 * Lo que pidió quien registró, para la tarjeta de la DAF en «Planificar el día»: «Pide compartir con
 * X» o «Exclusivo: <justificación>» (solo los que la traen de antes: desde el 2026-10-19 el
 * formulario ya no la pide). Sin justificación, el macrooperativo ya lo dice su distintivo MACRO. La
 * DAF decide y ejecuta (RN-40).
 */
export const intencionParaLaDaf = (operativo: {
  compartirCon?: { identificador: string } | null;
  esMacrooperativo: boolean;
  justificacionExclusivo?: string | null;
}): string | null => {
  if (operativo.compartirCon) return `Pide compartir con ${operativo.compartirCon.identificador}`;
  if (operativo.esMacrooperativo && operativo.justificacionExclusivo) {
    return `Exclusivo: ${operativo.justificacionExclusivo}`;
  }
  return null;
};

/** El anfitrión con el que ya viaja (algún tramo compartido), o `null`. */
export const compartidoConDe = (operativo: {
  tramos: ReadonlyArray<{ compartidoCon?: string | null }>;
}): string | null => operativo.tramos.find((t) => t.compartidoCon)?.compartidoCon ?? null;

/** Los operativos que viajan en la unidad de `anfitrion` (sus tramos lo nombran). */
export const invitadosDe = (
  anfitrion: string,
  operativos: ReadonlyArray<{ identificador: string; tramos: ReadonlyArray<{ compartidoCon?: string | null }> }>,
): string[] =>
  operativos
    .filter((o) => o.identificador !== anfitrion && o.tramos.some((t) => t.compartidoCon === anfitrion))
    .map((o) => o.identificador);

// ─────────────────────────── «La misma unidad» (2026-10-19) ───────────────────────────

/** El traslado como acción: «dejar al personal». */
const ACCION: Record<string, string> = {
  dejar: "dejar al personal",
  retirar: "retirar al personal",
  "todo el operativo": "acompañar todo el operativo",
};

/** El traslado como cosa: «el retiro». */
const COSA: Record<string, string> = {
  dejar: "el traslado de dejar",
  retirar: "el retiro",
  "todo el operativo": "el acompañamiento",
};

/** El traslado de un tramo por su tipo: «dejar», «el retiro». */
const TIPO_CORTO: Record<string, string> = {
  DEJAR: "dejar",
  RETIRAR: "retirar",
  COMPLETO: "todo el operativo",
};

const enLista = (partes: readonly string[]): string =>
  partes.length <= 1
    ? (partes[0] ?? "")
    : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;

const conMayuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);

/** «La unidad acompaña su operativo todo el día y además deja al personal de X…» (2026-10-20). */
const notaCompleto = (traslados: readonly string[], de?: string): string => {
  const verbos: Record<string, string> = { dejar: "deja", retirar: "retira" };
  const acciones = enLista(traslados.map((t) => verbos[t] ?? t));
  return `La unidad acompaña su operativo todo el día y además ${acciones} al personal${de ? ` de ${de}` : ""}, sin moverse de su punto.`;
};

/**
 * La nota bajo «Compartir unidad con X» (2026-10-19): lo que se comparte es el conductor con su
 * vehículo. Lo que harán juntos y, si quedan traslados propios, que la misma unidad los hará
 * también si su agenda lo permite —lo confirma la DAF—.
 */
export const notaMismaUnidad = (
  comparte: readonly string[] = [],
  propios: readonly string[] = [],
  opciones: {
    /** El operativo de la unidad, para «después del traslado de X». */
    anfitrion?: string;
    /** Con quién va cada traslado compartido (la unidad del grupo: «retirar» con OCPMO-002). */
    comparteCon?: ReadonlyArray<{ tipo: string; con: string }>;
    /** «Completo» (2026-10-20): los traslados de la unidad que abarca el «completo» del nuevo. */
    contiene?: readonly string[];
    /** «Completo» (2026-10-20): el operativo cuyo «completo» lleva al nuevo. */
    contenidoEn?: string | null;
  } = {},
): string => {
  // «COMPLETO» COMPARTE UNIDAD (2026-10-20): la unidad que acompaña todo el día no se mueve de su
  // punto, así que deja o retira al personal del otro sin dejar el operativo.
  if (opciones.contenidoEn) {
    return `Viajará en la unidad que acompaña a ${opciones.contenidoEn} todo el día. Es una solicitud: la DAF la ejecuta al planificar el día.`;
  }
  if (opciones.contiene?.length) {
    return `${notaCompleto(opciones.contiene, opciones.anfitrion)} Es una solicitud: la DAF la ejecuta al planificar el día.`;
  }
  // NO VIAJAN JUNTOS, PERO VA LA MISMA UNIDAD (2026-10-19, «retirar es otro estado»): un «solo
  // retirar» de la tarde junto a un «solo dejar» de la mañana no se cruzan.
  if (comparte.length === 0 && propios.length > 0) {
    return `No viajan juntos: el mismo conductor y vehículo pueden hacer ${enLista(
      propios.map((p) => COSA[p] ?? p),
    )} después del traslado${opciones.anfitrion ? ` de ${opciones.anfitrion}` : ""}, si su agenda lo permite (lo confirma la DAF).`;
  }
  const conQuien = (tipo: string): string => {
    const con = opciones.comparteCon?.find((c) => c.tipo === tipo)?.con;
    return con && con !== opciones.anfitrion ? ` con ${con}` : "";
  };
  const juntos =
    comparte.length > 0
      ? `Viajarán juntos para ${enLista(comparte.map((p) => `${ACCION[p] ?? p}${conQuien(p)}`))}`
      : "Viajarán en la misma unidad";
  if (propios.length === 0) {
    return `${juntos}. Es una solicitud: la DAF la ejecuta al planificar el día.`;
  }
  return `${juntos}; el mismo conductor y vehículo harán también ${enLista(
    propios.map((p) => COSA[p] ?? p),
  )} si su agenda lo permite (lo confirma la DAF).`;
};

/** Por qué no se pide la misma unidad con el macrooperativo marcado (como en el servidor). */
export const MOTIVO_EXCLUSIVO_NO_COMPARTE = "Un vehículo exclusivo no se comparte.";

/**
 * El rótulo del check del registro (2026-10-19): «Solicitar compartir unidad con X» si viajan juntos
 * en algún traslado; «Solicitar usar la misma unidad que X» si solo la misma unidad hace después lo
 * suyo. Mismo criterio que el botón de la DAF (`accionCompartir`).
 */
export const rotuloCompartir = (
  identificador: string,
  comparte: readonly string[] = [],
  compatible = true,
  propios: readonly string[] = [],
): string =>
  !compatible || comparte.length > 0 || propios.length === 0
    ? `Solicitar compartir unidad con ${identificador}`
    : `Solicitar usar la misma unidad que ${identificador}`;

/** El botón de la DAF, con el mismo criterio: «Compartir unidad» o «Usar la misma unidad». */
export const accionCompartir = (anfitrion: {
  compatible: boolean;
  comparte?: string[];
  propios?: string[];
}): string =>
  anfitrion.compatible && (anfitrion.comparte?.length ?? 0) === 0 && (anfitrion.propios?.length ?? 0) > 0
    ? "Usar la misma unidad"
    : "Compartir unidad";

/** El motivo, escrito: «No se puede compartir con X: …». */
export const textoNoCompartible = (identificador: string, motivo: string): string =>
  `No se puede compartir con ${identificador}: ${motivo}`;

/**
 * El estado de un operativo que ya viaja compartido en algún traslado (2026-10-19): «Dejar
 * compartido con X», y si le falta otro, «· falta el retiro». `null` si no comparte nada.
 */
export const estadoMismaUnidad = (operativo: {
  tramos: ReadonlyArray<{ tipo: string; conductorId: number | null; compartidoCon?: string | null }>;
}): string | null => {
  const compartido = operativo.tramos.find((t) => t.compartidoCon);
  if (!compartido) return null;
  const base = `${conMayuscula(TIPO_CORTO[compartido.tipo] ?? "un traslado")} compartido con ${compartido.compartidoCon}`;
  const faltan = operativo.tramos.filter((t) => t.conductorId === null);
  if (faltan.length === 0) return base;
  return `${base} · falta ${enLista(faltan.map((t) => COSA[TIPO_CORTO[t.tipo] ?? ""] ?? "un traslado"))}`;
};

/**
 * Lo que la DAF ve de un anfitrión en «Compartir unidad»: «Comparte: dejar · Retiro con la misma
 * unidad: viable» o «… no viable (motivo)». `null` si no hay nada que decir.
 */
export const detalleMismaUnidad = (anfitrion: {
  compatible: boolean;
  comparte?: string[];
  propios?: string[];
  propiosViables?: boolean | null;
  motivoPropios?: string | null;
  identificador?: string;
  completo?: "ABARCA" | "DENTRO" | null;
  contiene?: readonly string[];
}): string | null => {
  if (!anfitrion.compatible) return null;
  // «Completo» (2026-10-20): una sola unidad todo el día.
  if (anfitrion.completo === "DENTRO") {
    return `Viajará en la unidad que acompaña a ${anfitrion.identificador ?? "ese operativo"} todo el día.`;
  }
  if (anfitrion.completo === "ABARCA") {
    return notaCompleto([...(anfitrion.contiene ?? [])], anfitrion.identificador);
  }
  if (!anfitrion.comparte?.length && !anfitrion.propios?.length) return null;
  const partes = [anfitrion.comparte?.length ? `Comparte: ${enLista(anfitrion.comparte)}` : "No viajan juntos"];
  if (anfitrion.propios?.length) {
    const cosa = conMayuscula(enLista(anfitrion.propios.map((p) => COSA[p] ?? p)).replace(/^el /, ""));
    partes.push(
      anfitrion.propiosViables
        ? `${cosa} con la misma unidad: viable`
        : `${cosa} con la misma unidad: no viable${anfitrion.motivoPropios ? ` (${anfitrion.motivoPropios})` : ""}`,
    );
  }
  return partes.join(" · ");
};

/** Cómo se nombra cada momento de la unidad en los asientos. */
const MOMENTO: Record<string, string> = {
  DEJAR: "Al dejar",
  RETIRAR: "Al retirar",
  COMPLETO: "Todo el día",
};

/**
 * Los asientos de la unidad (2026-10-21): se cuentan POR MOMENTO, lo que va a bordo a cada hora.
 * Con varios momentos: «Al dejar (08:00): 3 de 3 · Al retirar (16:00): 3 de 3»; con uno: «Ocupará 3
 * de 4 asientos»; si no cabe, lo que la unidad deja libre en su momento más lleno.
 */
export const textoAsientos = (anfitrion: {
  asientosLibres: number | null;
  vehiculo: { asientos: number | null };
  personasConInvitado?: number | null;
  asientosPorMomento?: readonly { tipo: string; hora: string; ocupados: number }[];
}): string => {
  const total = anfitrion.vehiculo.asientos;
  if (total === null || anfitrion.asientosLibres === null) return "Sin asientos registrados";
  const momentos = anfitrion.asientosPorMomento ?? [];
  if (anfitrion.personasConInvitado != null && momentos.length > 1) {
    return momentos
      .map((m) => `${MOMENTO[m.tipo] ?? "A las"} (${m.hora}): ${m.ocupados} de ${total}`)
      .join(" · ");
  }
  if (anfitrion.personasConInvitado != null) {
    return `Ocupará ${anfitrion.personasConInvitado} de ${total} asientos`;
  }
  return `${anfitrion.asientosLibres} de ${total} asientos libres`;
};

/**
 * El aviso de «Asignar automáticamente» (2026-10-21): cuántos operativos quedaron cubiertos y, si
 * los hay, cuántos traslados viajan en una unidad ya asignada (el «completo» que deja y retira).
 */
export const textoAsignacionAutomatica = (cubiertos: number, compartidos: number): string => {
  const base = `${cubiertos} ${cubiertos === 1 ? "operativo asignado" : "operativos asignados"} automáticamente.`;
  if (compartidos === 0) return base;
  return `${base} ${compartidos} ${
    compartidos === 1 ? "traslado viaja" : "traslados viajan"
  } en una unidad ya asignada (misma unidad, mismo punto).`;
};
