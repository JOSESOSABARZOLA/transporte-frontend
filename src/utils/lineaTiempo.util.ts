/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Asignación de transporte (línea de tiempo por conductor)
 * Archivo: lineaTiempo.util.ts
 * Responsabilidad: Cálculos PUROS de la línea de tiempo: posición de cada tramo en la línea
 *                  05H00→05H00, quién aparece en ella, traslados entre tramos y el texto de las
 *                  horas libres que calcula el servidor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO PARA DIBUJAR. Quién PUEDE tomar un bloque lo decide el servidor (`POST /transporte/evaluar`,
 * política pura con sus parámetros, regla 2): aquí no se replica ninguna regla de asignación. Lo
 * que sí se calcula es dónde cae cada cosa en la línea y si entre dos tramos seguidos de un mismo
 * conductor el hueco alcanza para el traslado, con la MISMA tabla que administra la DAF
 * (`/administracion/traslados`). Si esa tabla no está disponible para quien mira, el traslado se
 * dibuja sin juzgarlo, salvo el solapamiento, que no necesita tabla.
 *
 * LAS HORAS LIBRES NO SE CALCULAN AQUÍ (2026-10-14). Dependen del turno, del contrato, de la jornada
 * máxima y del traslado mínimo: las calcula el servidor (`GET /transporte/huecos/:fecha`) y aquí solo
 * se dicen en palabras (`textoHueco`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { HuecoLibre } from "../interfaces/JornadaDaf.ts";
import type {
  ConductorPlanificado,
  FranjaLinea,
  Planificacion,
  TramoPlanificado,
  ZonalCorta,
} from "../interfaces/Planificacion.ts";

export const MINUTOS_LINEA = 1440;

/** «HH:MM» → minutos desde la medianoche. */
export const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Minuto de una hora sobre la línea que empieza en `inicioJornada` (0..1439). */
export const minutoEnLinea = (hora: string, inicioJornada: string): number =>
  (aMinutos(hora) - aMinutos(inicioJornada) + MINUTOS_LINEA) % MINUTOS_LINEA;

/**
 * La hora del reloj («17H00») de un minuto de la línea (2026-10-06). Las franjas del servidor ya
 * vienen en minutos desde `inicioJornada`; para decirlas en palabras se suma el inicio, nunca se resta.
 */
export const horaDeMinuto = (minuto: number, inicioJornada: string): string => {
  const total = (((aMinutos(inicioJornada) + minuto) % MINUTOS_LINEA) + MINUTOS_LINEA) % MINUTOS_LINEA;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}H${mm}`;
};

/** Franja de un tramo/operativo sobre la línea; si el fin no supera el inicio, cruza a mañana. */
export const franjaEnLinea = (
  horaInicio: string,
  horaFin: string,
  inicioJornada: string,
): FranjaLinea => {
  const inicio = minutoEnLinea(horaInicio, inicioJornada);
  let fin = minutoEnLinea(horaFin, inicioJornada);
  if (fin <= inicio) fin += MINUTOS_LINEA;
  return { inicio, fin };
};

/**
 * El tramo VISIBLE de la línea (2026-10-06), en minutos sobre la línea (0 = `inicioJornada`).
 * Antes se pintaban siempre las 24 h y un día de 08H00 a 18H00 ocupaba un tercio del ancho, con
 * scroll horizontal para ver vacío.
 */
export interface EjeLinea {
  desde: number;
  hasta: number;
}

/** Las 24 h completas: lo que se dibujaba antes y lo que se usa si no se pasa eje. */
export const EJE_COMPLETO: EjeLinea = { desde: 0, hasta: MINUTOS_LINEA };

/**
 * Eje de la línea: desde 1 h ANTES del primer tramo hasta 1 h DESPUÉS del último, como mínimo de
 * 06H00 a 24H00, redondeado a horas ENTERAS del reloj (así las marcas caen en la grilla) y sin
 * salirse de la jornada.
 */
export const ejeDeLinea = (
  franjas: FranjaLinea[],
  inicioJornada: string,
): EjeLinea => {
  const minimoDesde = minutoEnLinea("06:00", inicioJornada);
  const medianoche = minutoEnLinea("00:00", inicioJornada);
  const minimoHasta = medianoche === 0 ? MINUTOS_LINEA : medianoche;

  let desde = minimoDesde;
  let hasta = minimoHasta;
  if (franjas.length > 0) {
    desde = Math.min(desde, Math.min(...franjas.map((f) => f.inicio)) - 60);
    hasta = Math.max(hasta, Math.max(...franjas.map((f) => f.fin)) + 60);
  }

  // Desfase del minuto 0 de la línea respecto de la hora entera (0 si la jornada empieza en punto).
  const desfase = aMinutos(inicioJornada) % 60;
  desde = Math.floor((desde + desfase) / 60) * 60 - desfase;
  hasta = Math.ceil((hasta + desfase) / 60) * 60 - desfase;

  return {
    desde: Math.max(0, desde),
    hasta: Math.min(MINUTOS_LINEA, Math.max(hasta, desde + 60)),
  };
};

/** Porcentaje (0..100) de un minuto de la línea dentro del eje. */
export const porcentajeEnEje = (minuto: number, eje: EjeLinea = EJE_COMPLETO): number => {
  const ancho = eje.hasta - eje.desde;
  const recortado = Math.max(eje.desde, Math.min(minuto, eje.hasta));
  return ancho > 0 ? ((recortado - eje.desde) / ancho) * 100 : 0;
};

/** Posición CSS (en %) de una franja, recortada al eje visible (por omisión, la línea entera). */
export const posicion = (
  franja: FranjaLinea,
  eje: EjeLinea = EJE_COMPLETO,
): { left: string; width: string } => {
  const ancho = eje.hasta - eje.desde;
  const inicio = Math.max(eje.desde, Math.min(franja.inicio, eje.hasta));
  const fin = Math.max(inicio, Math.min(franja.fin, eje.hasta));
  return {
    left: `${((inicio - eje.desde) / ancho) * 100}%`,
    width: `${Math.max(((fin - inicio) / ancho) * 100, 0.4)}%`,
  };
};

/**
 * «05H00» … las marcas de la regla horaria, cada `cada` horas. Con `eje`, solo las que caen en
 * él, y `cada` se elige solo (1 h si el eje cabe en 12 h, 2 h si no) para no amontonarlas.
 */
export const marcasHorarias = (
  inicioJornada: string,
  cada = 3,
  eje?: EjeLinea,
): { minuto: number; texto: string }[] => {
  const marcas: { minuto: number; texto: string }[] = [];
  const paso = eje ? (eje.hasta - eje.desde <= 12 * 60 ? 1 : 2) : cada;
  const desde = eje ? eje.desde : 0;
  const hasta = eje ? eje.hasta : MINUTOS_LINEA;
  for (let m = desde; m <= hasta; m += paso * 60) {
    marcas.push({ minuto: m, texto: horaDeMinuto(m, inicioJornada) });
  }
  return marcas;
};

export const NOMBRE_TIPO_TRAMO: Record<TramoPlanificado["tipo"], string> = {
  DEJAR: "Dejar",
  RETIRAR: "Retirar",
  COMPLETO: "Completo",
  TAREA: "Tarea",
};

export const NOMBRE_TURNO: Record<NonNullable<ConductorPlanificado["turno"]>, string> = {
  DIA: "Día",
  NOCHE: "Noche",
  ECU_NOCHE: "ECU noche",
  LIBRE: "Libre",
  ADMINISTRATIVO: "Administrativo",
};

/** ¿Este conductor trabaja hoy? Turno de trabajo, activado, o ya tiene tramos. Nunca si está ausente. */
export const esConductorActivo = (
  conductor: ConductorPlanificado,
  tramos: readonly TramoPlanificado[],
): boolean => {
  if (conductor.ausente) return false;
  if (conductor.activado) return true;
  if (tramos.some((t) => t.conductorId === conductor.id)) return true;
  return conductor.turno !== "LIBRE";
};

/**
 * ¿Va en la línea de «Planificar el día»? Los que trabajan hoy y, con «Usar conductores de libre»
 * activa, también los de libre (2026-10-08). Nunca los ausentes.
 */
export const visibleEnLinea = (
  conductor: ConductorPlanificado,
  tramos: readonly TramoPlanificado[],
  incluirLibres: boolean,
): boolean => {
  if (conductor.ausente) return false;
  return esConductorActivo(conductor, tramos) || (incluirLibres && conductor.turno === "LIBRE");
};

/** Los ids de los operativos que piden vehículo exclusivo. */
export const operativosExclusivos = (plan: Planificacion): Set<number> =>
  new Set(plan.operativos.filter((o) => o.esMacrooperativo).map((o) => o.id));

/** La tabla de traslados tal como la entrega `/administracion/traslados`. */
export interface TablaTraslados {
  pares: { zonalOrigenId: number; zonalDestinoId: number; minutos: number }[];
  reglaGeneral: { mismaZona: number; mismoSector: number; otroSector: number };
}

/** Minutos de traslado entre dos zonales: par explícito > misma zona > mismo sector > otro sector. */
export const minutosTraslado = (
  origen: ZonalCorta | null,
  destino: ZonalCorta | null,
  tabla: TablaTraslados | null,
): number | null => {
  if (!tabla || !origen || !destino) return null;
  const par = tabla.pares.find(
    (p) => p.zonalOrigenId === origen.id && p.zonalDestinoId === destino.id,
  );
  if (par) return par.minutos;
  if (origen.id === destino.id) return tabla.reglaGeneral.mismaZona;
  if (origen.sector && origen.sector === destino.sector)
    return tabla.reglaGeneral.mismoSector;
  return tabla.reglaGeneral.otroSector;
};

export interface SegmentoTraslado {
  desde: number;
  hasta: number;
  hueco: number;
  requerido: number | null;
  noLlega: boolean;
}

/**
 * Los traslados entre tramos SEGUIDOS de un conductor: el hueco entre el fin de uno y el inicio del
 * siguiente. «No llega» si se cruzan, o si el hueco es menor que el traslado de la tabla.
 */
export const trasladosDe = (
  tramos: readonly TramoPlanificado[],
  inicioJornada: string,
  tabla: TablaTraslados | null,
): SegmentoTraslado[] => {
  const ordenados = [...tramos]
    .map((t) => ({ t, f: franjaEnLinea(t.horaInicio, t.horaFin, inicioJornada) }))
    .sort((a, b) => a.f.inicio - b.f.inicio);
  const segmentos: SegmentoTraslado[] = [];
  for (let i = 1; i < ordenados.length; i += 1) {
    const anterior = ordenados[i - 1];
    const siguiente = ordenados[i];
    const hueco = siguiente.f.inicio - anterior.f.fin;
    const requerido = minutosTraslado(
      anterior.t.zonalDestino ?? anterior.t.zonalOrigen,
      siguiente.t.zonalOrigen,
      tabla,
    );
    segmentos.push({
      desde: anterior.f.fin,
      hasta: Math.max(siguiente.f.inicio, anterior.f.fin),
      hueco,
      requerido,
      noLlega: hueco < 0 || (requerido !== null && hueco < requerido),
    });
  }
  return segmentos;
};

/** «HH:MM» → «HHHMM», la notación institucional de los textos del cuadro. */
const institucional = (hora: string): string => hora.replace(":", "H");

/** Minutos en palabras: «45 min», «5 h», «5 h 30 min». */
export const textoDuracion = (minutos: number): string => {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
};

/**
 * El texto de una hora libre que calcula el servidor (2026-10-14): «Libre 08H30 a 14H30 (útil 5 h)».
 * Las horas extra lo dicen en palabras (regla 6): el borde discontinuo de la línea solo acompaña.
 */
export const textoHueco = (hueco: HuecoLibre): string =>
  `Libre ${institucional(hueco.horaInicio)} a ${institucional(hueco.horaFin)} (útil ${textoDuracion(
    hueco.utilMinimoMin,
  )})${hueco.horasExtra ? " · horas extra" : ""}`;

/** Ancho de la columna del nombre del conductor, en px (2026-10-08). */
export const COLUMNA_NOMBRE_PX = 160;
/** Separación entre el nombre y la pista (`gap-2`). */
const SEPARACION_PX = 8;
/**
 * Mínimo legible por hora. Con un eje de más de 12 h las marcas van cada 2 h, así que cada rótulo
 * («06H00», `text-xs`) dispone de 40 px: por debajo se amontonan y se prefiere el scroll.
 */
export const MIN_PX_POR_HORA = 20;

/**
 * Desplazamiento del rótulo horario número `indice` de `total` (2026-10-08): el primero se apoya a
 * la izquierda de su hora, el último a la derecha y el resto se centra. Así ningún rótulo sobresale
 * de la pista, que es lo que hacía aparecer el scroll horizontal con la jornada entera a la vista.
 */
export const desplazamientoDeRotulo = (indice: number, total: number): string =>
  indice === 0 ? "none" : indice === total - 1 ? "translateX(-100%)" : "translateX(-50%)";

export interface AnchoDeLinea {
  pxPorHora: number;
  /** Ancho de la pista horaria, en px. */
  anchoPista: number;
  /** `grid-template-columns` de cada fila: nombre | pista. */
  columnas: string;
  /** ¿Hace falta desplazar a lo ancho? Solo cuando el contenedor no da el mínimo legible. */
  conScroll: boolean;
}

/**
 * El ancho por hora SALE DEL CONTENEDOR (2026-10-08): la jornada entera —06H00 a 02H00— cabe sin
 * desplazamiento horizontal en pantallas de 1280 px o más, y solo en las angostas, donde cada hora
 * quedaría por debajo de `MIN_PX_POR_HORA`, la pista se fija al mínimo y aparece el scroll.
 * Con ancho 0 (aún sin medir, o en pruebas sin `ResizeObserver`) usa el mínimo.
 */
export const anchoDeLinea = (anchoContenedor: number, eje: EjeLinea): AnchoDeLinea => {
  const horas = Math.max(1, (eje.hasta - eje.desde) / 60);
  const disponible = Math.max(0, anchoContenedor - COLUMNA_NOMBRE_PX - SEPARACION_PX);
  const pxPorHora = Math.max(MIN_PX_POR_HORA, disponible / horas);
  const anchoPista = Math.floor(pxPorHora * horas);
  return {
    pxPorHora,
    anchoPista,
    columnas: `${COLUMNA_NOMBRE_PX}px ${anchoPista}px`,
    conScroll: COLUMNA_NOMBRE_PX + SEPARACION_PX + anchoPista > anchoContenedor,
  };
};

/**
 * UNA UNIDAD COMPARTIDA ES UN VIAJE (2026-10-19, compartir unidad). Los tramos que viajan en la
 * unidad de otro (`compartidoConTramoId`) se funden en su anfitrión cuando los dos están en la
 * misma fila: el anfitrión lleva sus identificadores en `invitados` y el invitado no se pinta
 * aparte, igual que el servidor los cuenta como un solo intervalo (sin «no llega» entre ellos). Un
 * invitado cuyo anfitrión no está en la fila se deja como está, con su `compartidoCon`.
 */
export const fundirCompartidos = <
  T extends {
    id: number;
    identificador: string | null;
    compartidoConTramoId: number | null;
    tipo?: string;
    horaInicio?: string;
    horaFin?: string;
  },
>(
  tramos: readonly T[],
  inicioJornada?: string,
): (T & { invitados?: string[]; marcas?: MarcaDeUnidad[] })[] => {
  const ids = new Set(tramos.map((t) => t.id));
  const grupoPorAnfitrion = new Map<number, T[]>();
  for (const tramo of tramos) {
    const anfitrion = tramo.compartidoConTramoId;
    if (anfitrion === null || !ids.has(anfitrion)) continue;
    grupoPorAnfitrion.set(anfitrion, [...(grupoPorAnfitrion.get(anfitrion) ?? []), tramo]);
  }
  return tramos
    .filter((t) => t.compartidoConTramoId === null || !ids.has(t.compartidoConTramoId))
    .map((t) => {
      const grupo = grupoPorAnfitrion.get(t.id);
      if (!grupo) return t;
      const fundido = {
        ...t,
        invitados: grupo.flatMap((g) => (g.identificador ? [g.identificador] : [])),
      };
      return inicioJornada === undefined ? fundido : abarcarUnidad(fundido, grupo, inicioJornada);
    });
};

/** Un traslado que la unidad hace dentro de su barra de todo el día. */
export interface MarcaDeUnidad {
  identificador: string | null;
  tipo: string;
  horaInicio: string;
  horaFin: string;
}

/**
 * «COMPLETO» COMPARTE UNIDAD (2026-10-20): si un tramo del grupo se sale del anfitrión (la unidad
 * que acompaña un «completo» todo el día y además deja y retira a otros), la barra es la del grupo
 * entero —del primer inicio al último fin, como `agendaPorUnidad` del servidor— y los traslados
 * quedan marcados dentro de ella. Sin un tramo que se salga, la barra es la de siempre.
 */
const abarcarUnidad = <T extends { tipo?: string; horaInicio?: string; horaFin?: string; identificador: string | null }>(
  anfitrion: T,
  grupo: readonly T[],
  inicioJornada: string,
): T & { marcas?: MarcaDeUnidad[] } => {
  const todos = [anfitrion, ...grupo];
  if (todos.some((t) => t.horaInicio === undefined || t.horaFin === undefined)) return anfitrion;
  const franjas = todos.map((t) => ({
    tramo: t,
    ...franjaEnLinea(t.horaInicio ?? "", t.horaFin ?? "", inicioJornada),
  }));
  const inicio = Math.min(...franjas.map((f) => f.inicio));
  const fin = Math.max(...franjas.map((f) => f.fin));
  const propia = franjas[0];
  if (inicio === propia.inicio && fin === propia.fin) return anfitrion;
  const marcas = franjas
    .filter((f) => f.tramo.tipo !== "COMPLETO")
    .map((f) => ({
      identificador: f.tramo.identificador,
      tipo: f.tramo.tipo ?? "",
      horaInicio: f.tramo.horaInicio ?? "",
      horaFin: f.tramo.horaFin ?? "",
    }));
  const completo = franjas.find((f) => f.tramo.tipo === "COMPLETO")?.tramo;
  return {
    // La barra es la del «completo» —la unidad que acompaña ese operativo todo el día—: su rótulo,
    // y al pulsarla se abre ese operativo.
    ...(completo ?? anfitrion),
    ...(completo
      ? {
          invitados: [
            ...new Set(
              todos
                .filter((t) => t !== completo && t.identificador)
                .map((t) => t.identificador ?? ""),
            ),
          ],
        }
      : {}),
    horaInicio: horaDeMinuto(inicio, inicioJornada).replace("H", ":"),
    horaFin: horaDeMinuto(fin, inicioJornada).replace("H", ":"),
    marcas,
  };
};
