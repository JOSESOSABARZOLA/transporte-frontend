/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro y edición de operativo
 * Archivo: politicasOperativo.util.ts
 * Responsabilidad: Las reglas del formulario de operativo que comparten el alta de P-01 y el cajón
 *                  de edición y adicional: qué falta, el horario de cada persona, el texto de
 *                  «listo» y el transporte con que nace.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FUNCIONES PURAS, Y LAS ÚNICAS COPIAS (plan «registro-operativo-rediseno», R1).
 *
 * Vivían dentro de `FormularioOperativo.tsx`, cerradas sobre su render. Desde que el alta y el
 * cajón comparten `FormOperativo`, la lista de lo que falta, su orden y sus nombres son la misma
 * en los dos pies, y aquí se prueban sin montar nada. Ninguna toca el servidor ni el almacenamiento.
 *
 * LO QUE NO ESTÁ AQUÍ, a propósito: el cruce de horario con otro operativo del día, el descanso, la
 * franja nocturna y el cupo. Los decide el servidor por persona (R2) y su rechazo se muestra junto
 * a esa persona; repetirlos aquí sería una segunda regla que acabaría discrepando de la primera.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ValidationError } from "yup";

import type { EstadoPie } from "../components/common/BarraPie.tsx";
import { esquemaOperativo } from "../config/validationSchemas.ts";
import type { TipoTransporte } from "../interfaces/Operativo.ts";
import { estadoPieDrawer } from "./estadoPieDrawer.util.ts";
import { motivoDeHorarioInvalido } from "./horario.util.ts";
import { nombreTipoTransporte } from "./tipoTransporte.util.ts";
import type { ValoresOperativo } from "./valoresOperativo.util.ts";

/** La tarjeta del formulario en que vive un campo: la que se marca en rojo si falta. */
export type SeccionOperativo = "personal" | "lugar" | "control";

/**
 * LOS CAMPOS EN EL ORDEN DEL DOM, que es el orden en que se leen y en que los recorre el
 * tabulador: Lugar (zonal, punto) y Control (instituciones, tipo). De aquí salen el orden de
 * «Falta: …» y cuál es «el primero» al que va el foco. Mover un campo de tarjeta obliga a moverlo
 * aquí. El personal no es campo de Formik y va aparte, delante (es la primera tarjeta).
 *
 * `formularioCodigo` no tiene control en el formulario —lo elige el selector, fuera— y por eso no
 * lleva `id`; sigue en la lista porque si falla es lo que hay que decir.
 */
export const CAMPOS_DEL_FORMULARIO: ReadonlyArray<{
  campo: keyof ValoresOperativo;
  nombre: string;
  id: string | null;
  seccion: SeccionOperativo | null;
}> = [
  { campo: "formularioCodigo", nombre: "formulario", id: null, seccion: null },
  { campo: "zonalesIds", nombre: "zonal", id: "zonales", seccion: "lugar" },
  { campo: "punto", nombre: "punto de encuentro", id: "punto", seccion: "lugar" },
  {
    campo: "puntoLibre",
    nombre: "punto de encuentro adicional",
    id: "puntoLibre",
    seccion: "lugar",
  },
  { campo: "institucionesIds", nombre: "institución", id: "instituciones", seccion: "control" },
  { campo: "tipoControl", nombre: "tipo de control", id: "tipoControl", seccion: "control" },
  {
    campo: "tipoLibre",
    nombre: "tipo de control adicional",
    id: "tipoLibre",
    seccion: "control",
  },
  { campo: "observaciones", nombre: "observaciones", id: "observaciones", seccion: null },
];

/** Lo que se dice cuando no hay nadie asignado, y cuando hay gente sin su horario (RN-66). */
export const FALTA_PERSONAL = "personal";
export const FALTA_HORARIO = "horario del personal";

/**
 * Los campos que el esquema rechaza, preguntándole a él y no a una copia de sus reglas.
 * `abortEarly: false` devuelve TODOS los fallos, no solo el primero.
 */
export const camposConFallo = (valores: ValoresOperativo): Set<string> => {
  try {
    esquemaOperativo.validateSync(valores, { abortEarly: false });
    return new Set();
  } catch (fallo) {
    // Lo que no sea un rechazo de validación es un defecto nuestro, y debe salir.
    if (!(fallo instanceof ValidationError)) throw fallo;

    // `inner` viene vacío cuando el rechazo es del objeto entero y no de un campo.
    const fallos = fallo.inner.length > 0 ? fallo.inner : [fallo];

    return new Set(fallos.map((uno) => uno.path ?? "").filter((ruta) => ruta !== ""));
  }
};

/** El turno de una persona: vacío, o mal escrito (fin igual a inicio, minutos que no son :00/:30). */
export const motivoHorarioPersona = (horaInicio: string, horaFin: string): string | null => {
  if (!horaInicio || !horaFin) return "Indique el horario (inicio y fin).";
  return motivoDeHorarioInvalido(horaInicio, horaFin);
};

/**
 * Lo que el personal le falta al envío: nadie asignado, o alguien sin las dos horas (RN-66). Un
 * turno escrito pero inválido (fin igual a inicio) lo señala `motivoHorarioPersona` junto a esa
 * persona, y el servidor lo rechaza con su mensaje: no es un hueco por llenar.
 */
export const faltaDelPersonal = (
  personas: ReadonlyArray<{ horaInicio?: string | null; horaFin?: string | null }>,
  exigeHorario: boolean,
): typeof FALTA_PERSONAL | typeof FALTA_HORARIO | null => {
  if (personas.length === 0) return FALTA_PERSONAL;
  if (exigeHorario && personas.some((p) => !p.horaInicio || !p.horaFin)) return FALTA_HORARIO;
  return null;
};

/**
 * LOS NOMBRES DE LO QUE FALTA, en el orden del formulario y con el personal DELANTE: es la primera
 * tarjeta. Es la ÚNICA copia: la usan el pie del alta y el del cajón.
 */
export const nombresQueFaltan = (
  valores: ValoresOperativo,
  faltaPersonal: typeof FALTA_PERSONAL | typeof FALTA_HORARIO | null,
): string[] => {
  const fallidos = camposConFallo(valores);
  const nombres: string[] = faltaPersonal ? [faltaPersonal] : [];

  for (const { campo, nombre } of CAMPOS_DEL_FORMULARIO) {
    if (fallidos.has(campo) && !nombres.includes(nombre)) nombres.push(nombre);
  }
  return nombres;
};

/** Las tarjetas que tienen algo pendiente: tras intentar registrar se marcan en rojo. */
export const seccionesConFalta = (faltantes: readonly string[]): Set<SeccionOperativo> => {
  const secciones = new Set<SeccionOperativo>();
  for (const nombre of faltantes) {
    if (nombre === FALTA_PERSONAL || nombre === FALTA_HORARIO) {
      secciones.add("personal");
      continue;
    }
    const campo = CAMPOS_DEL_FORMULARIO.find((c) => c.nombre === nombre);
    if (campo?.seccion) secciones.add(campo.seccion);
  }
  return secciones;
};

/** «1 efectivo» / «3 efectivos». */
export const textoEfectivos = (n: number): string => `${n} ${n === 1 ? "efectivo" : "efectivos"}`;

/**
 * «Listo para registrar · 2 efectivos · Propios medios», y con compartir unidad (2026-10-19)
 * «… · Solo dejar · comparte con OCPMO-001».
 */
export const textoListoParaRegistrar = (
  efectivos: number,
  tipoTransporte: TipoTransporte | undefined,
  compartirCon?: string | null,
): string =>
  `Listo para registrar · ${textoEfectivos(efectivos)} · ${nombreTipoTransporte(tipoTransporte)}${
    compartirCon ? ` · comparte con ${compartirCon}` : ""
  }`;

/** El transporte con que nace un alta: el que sugiere el formulario, o «Completo». */
export const transporteInicial = (sugerido: TipoTransporte | undefined): TipoTransporte =>
  sugerido ?? "COMPLETO";

/**
 * EL PIE DEL ALTA (R7): desde que se abre nombra lo que falta en gris; tras intentar, lo mismo en
 * rojo; completo, «Listo para registrar · N efectivos · <transporte>» en verde.
 */
export const estadoPieAlta = ({
  faltantes,
  intentado,
  efectivos,
  tipoTransporte,
  compartirCon,
}: {
  faltantes: string[];
  intentado: boolean;
  efectivos: number;
  tipoTransporte: TipoTransporte | undefined;
  compartirCon?: string | null;
}): EstadoPie =>
  estadoPieDrawer({
    esEdicion: false,
    hayCambios: false,
    intentado,
    faltan: faltantes,
    nombrarFaltantes: true,
    textoListo: textoListoParaRegistrar(efectivos, tipoTransporte, compartirCon),
  });

/**
 * El texto de «Limpiar» del alta (P-01). Cambiar de formulario ya no lo usa: aparta la captura
 * bajo su formulario y no pierde nada (decisión del 2026-09-10).
 */
export const MENSAJE_PERDER_CAPTURA =
  "Se perderá lo que lleva cargado en este formulario (personal, lugar, control y observaciones). Nada se ha registrado todavía.";

/**
 * ¿Hay algo capturado que «Limpiar» perdería? Personal, lugar, control u observaciones. El
 * transporte no cuenta: nace con la sugerencia del formulario y limpiar lo devuelve a ella.
 */
export const hayDatosCapturados = (valores: ValoresOperativo, personas: number): boolean =>
  personas > 0 ||
  valores.zonalesIds.length > 0 ||
  valores.punto !== "" ||
  valores.puntoLibre.trim() !== "" ||
  valores.tiposControlIds.length > 0 ||
  valores.tipoControl !== "" ||
  valores.tipoLibre.trim() !== "" ||
  valores.institucionesIds.length > 0 ||
  valores.observaciones.some((nota) => nota.trim() !== "") ||
  (valores.notaPendiente ?? "").trim() !== "";
