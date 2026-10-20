/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: flota.util.ts
 * Responsabilidad: Reglas puras de «Flota y garajes»: filtros, estado de documentos, placa,
 *                  patrón, textos de las celdas y el día de hoy en Quito.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PV-33 SE CERRÓ EL 2026-08-31, Y AQUÍ QUEDA LA CICATRIZ.
 *
 * Hasta esa fecha la DAF no podía listar la flota: este perfil solo llegaba a conocer el
 * **vehículo habitual de cada conductor**, y una función de este archivo componía la lista con
 * eso. Un vehículo que no fuera habitual de nadie no se podía asignar, y además no se veía. Hoy
 * la lista la da `GET /transporte/vehiculos?fecha=`; aquella función **se retiró** para que nadie
 * reabriera el defecto. Lo que sigue vigente es la regla: en «Flota y garajes» un vehículo sin
 * conductor habitual se señala, porque no se propone automáticamente al planificar el día.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * «FLOTA Y GARAJES» (2026-10-14). El servidor es la autoridad de los indicadores, de
 * `documentos` y de `faltantes`; `estadoDocumentos` es su ESPEJO y solo sirve al aviso en vivo
 * del cajón, sobre fechas que todavía no se guardaron. La placa sigue la misma regla que el
 * servidor: AAA-999 o AAA-9999, y el guion se agrega solo.
 */

import type {
  Conductor,
  EstadoDocumentos,
  FaltanteConductor,
  UbicacionFlota,
  Vehiculo,
} from "../interfaces/Transporte.ts";
import { fechaLarga } from "./ausencias.util.ts";
import { normalizar } from "./texto.util.ts";
import { turnoDeLetra } from "./paletaTurnos.util.ts";

// ─────────────────────────── El día de hoy ───────────────────────────

/** El huso de la AMC. Los documentos vencen y los garajes se usan en el día de Quito. */
const ZONA = "America/Guayaquil";

/**
 * Hoy como AAAA-MM-DD **en Quito**, cualquiera que sea el huso del navegador (regla 12: sin
 * `toISOString`, que daría el día de Greenwich después de las 19H00).
 */
export const hoyEnGuayaquil = (ahora: Date = new Date()): string => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);
  const parte = (tipo: string) => partes.find((una) => una.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
};

/** Días de calendario de `desde` a `hasta` (AAAA-MM-DD). Negativo si `hasta` es anterior. */
export const diasEntre = (desde: string, hasta: string): number => {
  const enUtc = (fecha: string) => {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return Date.UTC(anio, mes - 1, dia);
  };
  return Math.round((enUtc(hasta) - enUtc(desde)) / 86_400_000);
};

// ─────────────────────────── Filtros ───────────────────────────

export type FiltroEstado = "activos" | "inactivos" | "todos";

/**
 * El filtro que pone un indicador al pulsarlo; se ve como ficha y se quita aparte.
 * `alertas-documentos` (2026-10-15) = vencidos, por vencer **y sin fechas**: un vehículo sin
 * matrícula ni SOAT registrados también hay que revisarlo.
 */
export type FiltroIndicador = "alertas-documentos" | "sin-conductor" | "incompletos";

export interface FiltrosFlota {
  busqueda: string;
  estado: FiltroEstado;
  indicador?: FiltroIndicador | null;
}

const pasaEstado = (activo: boolean, estado: FiltroEstado): boolean =>
  estado === "todos" ? true : estado === "activos" ? activo : !activo;

/** Los conductores ACTIVOS que tienen este vehículo como habitual. */
export const conductoresHabitualesDe = (
  vehiculoId: number,
  conductores: Conductor[],
): Conductor[] =>
  conductores.filter(
    (conductor) => conductor.activo && conductor.vehiculoHabitual?.id === vehiculoId,
  );

/** Vencidos, por vencer, sin fechas o con una que falta: todo lo que no está «Al día». */
export const documentosEnAlerta = (vehiculo: Vehiculo): boolean =>
  vehiculo.documentos !== undefined && vehiculo.documentos.estado !== "AL_DIA";

/**
 * Vehículos que satisfacen los filtros. Se busca por placa (con o sin guion) y descripción.
 * «Sin conductor habitual» mira solo a los conductores activos, como el indicador del servidor.
 */
export const filtrarVehiculos = (
  vehiculos: Vehiculo[],
  filtros: FiltrosFlota,
  conductores: Conductor[],
): Vehiculo[] => {
  const buscado = normalizar(filtros.busqueda.trim());
  return vehiculos.filter((vehiculo) => {
    if (!pasaEstado(vehiculo.activo, filtros.estado)) return false;
    if (filtros.indicador === "alertas-documentos" && !documentosEnAlerta(vehiculo)) return false;
    if (
      filtros.indicador === "sin-conductor" &&
      conductoresHabitualesDe(vehiculo.id, conductores).length > 0
    ) {
      return false;
    }
    if (!buscado) return true;
    const clave = clavePlaca(filtros.busqueda);
    if (clave && clavePlaca(vehiculo.placa).includes(clave)) return true;
    return normalizar(
      `${vehiculo.placa} ${vehiculo.descripcion ?? ""} ${vehiculo.tipo ?? ""}`,
    ).includes(buscado);
  });
};

/** Conductores que satisfacen los filtros: cédula, nombre, placa habitual, teléfono y licencia. */
export const filtrarConductores = (
  conductores: Conductor[],
  filtros: FiltrosFlota,
): Conductor[] => {
  const buscado = normalizar(filtros.busqueda.trim());
  return conductores.filter((conductor) => {
    if (!pasaEstado(conductor.activo, filtros.estado)) return false;
    if (filtros.indicador === "incompletos" && (conductor.faltantes ?? []).length === 0) {
      return false;
    }
    if (!buscado) return true;
    const clave = clavePlaca(filtros.busqueda);
    const placa = conductor.vehiculoHabitual?.placa;
    if (clave.length >= 3 && /[A-Z]/.test(clave) && placa && clavePlaca(placa).includes(clave)) {
      return true;
    }
    return normalizar(
      `${conductor.cedula} ${conductor.nombreCompleto} ${placa ?? ""} ` +
        `${conductor.telefono ?? ""} ${conductor.licenciaTipo ?? ""}`,
    ).includes(buscado);
  });
};

/** Un garaje es vigente si está activo **y** autorizado (D2). */
export const esGarajeVigente = (garaje: UbicacionFlota): boolean =>
  garaje.vigente ?? (garaje.activo && garaje.garajeAutorizado !== false);

/** Garajes que satisfacen el filtro: nombre y zonal. «Activos» aquí es «Vigentes». */
export const filtrarGarajes = (
  garajes: UbicacionFlota[],
  filtros: FiltrosFlota,
): UbicacionFlota[] => {
  const buscado = normalizar(filtros.busqueda.trim());
  return garajes.filter((garaje) => {
    if (!pasaEstado(esGarajeVigente(garaje), filtros.estado)) return false;
    if (!buscado) return true;
    return normalizar(`${garaje.nombre} ${garaje.zonal?.nombre ?? ""}`).includes(buscado);
  });
};

// ─────────────────────────── Documentos ───────────────────────────

type Documento = NonNullable<EstadoDocumentos["documento"]>;

const NOMBRE_DOCUMENTO: Record<Documento, string> = {
  MATRICULA: "Matrícula",
  SOAT: "SOAT",
};

/**
 * ESPEJO de `estadoDocumentos` del servidor: el más crítico de matrícula y SOAT.
 *
 * VENCIDO pesa más que POR_VENCER; entre dos del mismo estado decide el que vence antes. Sin
 * ninguna fecha es SIN_FECHAS; con una sola y sin alerta, INCOMPLETO (`documento` = la que falta);
 * con las dos y sin alerta, AL_DIA. `diasAviso` es
 * `DAF_DIAS_AVISO_VENCIMIENTO`, que llega en el resumen: aquí no se fija ningún número.
 */
export const estadoDocumentos = (
  matricula: string | null | undefined,
  soat: string | null | undefined,
  hoy: string,
  diasAviso: number,
): EstadoDocumentos => {
  const fechas: { documento: Documento; vence: string }[] = [];
  if (matricula) fechas.push({ documento: "MATRICULA", vence: matricula });
  if (soat) fechas.push({ documento: "SOAT", vence: soat });

  if (fechas.length === 0) {
    return { estado: "SIN_FECHAS", documento: null, vence: null, dias: null };
  }

  const alertas = fechas
    .map((una) => ({ ...una, dias: diasEntre(hoy, una.vence) }))
    .filter((una) => una.dias <= diasAviso)
    .sort((a, b) => a.dias - b.dias);

  const peor = alertas[0];
  if (!peor && fechas.length === 1) {
    const falta: Documento = fechas[0].documento === "MATRICULA" ? "SOAT" : "MATRICULA";
    return { estado: "INCOMPLETO", documento: falta, vence: null, dias: null };
  }
  if (!peor) return { estado: "AL_DIA", documento: null, vence: null, dias: null };
  return {
    estado: peor.dias < 0 ? "VENCIDO" : "POR_VENCER",
    documento: peor.documento,
    vence: peor.vence,
    dias: peor.dias,
  };
};

/** El estado de los documentos en palabras: «Matrícula vencida», «SOAT vence en 19 d»… */
export const textoDocumentos = (documentos: EstadoDocumentos): string => {
  if (documentos.estado === "SIN_FECHAS") return "Sin fechas";
  if (documentos.estado === "AL_DIA" || !documentos.documento) return "Al día";
  if (documentos.estado === "INCOMPLETO") {
    return documentos.documento === "MATRICULA" ? "Falta matrícula" : "Falta SOAT";
  }
  const nombre = NOMBRE_DOCUMENTO[documentos.documento];
  if (documentos.estado === "VENCIDO") {
    return documentos.documento === "MATRICULA" ? `${nombre} vencida` : `${nombre} vencido`;
  }
  if ((documentos.dias ?? 0) <= 0) return `${nombre} vence hoy`;
  return `${nombre} vence en ${documentos.dias} d`;
};

/**
 * La variante de `Insignia` de cada estado: rojo solo lo vencido, ámbar «vence en N d», verde al
 * día y ámbar SUAVE (2026-10-15) sin fechas o con una que falta: es un dato que falta, no un
 * estado neutro.
 */
export const varianteDocumentos = (
  estado: EstadoDocumentos["estado"],
): "error" | "aviso" | "exito" | "avisoSuave" =>
  estado === "VENCIDO"
    ? "error"
    : estado === "POR_VENCER"
      ? "aviso"
      : estado === "AL_DIA"
        ? "exito"
        : "avisoSuave";

/**
 * La descripción que va debajo de la placa: la real, y nada si está vacía o solo repite el tipo
 * (2026-10-15: 21 de los 23 vehículos de desarrollo tienen «Camioneta» como descripción). El dato
 * no se toca; solo deja de pintarse dos veces.
 */
export const descripcionVisible = (vehiculo: {
  descripcion?: string | null;
  tipo?: string | null;
}): string | null => {
  const descripcion = vehiculo.descripcion?.trim();
  if (!descripcion) return null;
  if (vehiculo.tipo && normalizar(descripcion) === normalizar(vehiculo.tipo.trim())) return null;
  return descripcion;
};

// ─────────────────────────── Placa ───────────────────────────

const PLACA_VALIDA = /^[A-Z]{3}-\d{3,4}$/;

/**
 * ESPEJO de `normalizarPlaca` del servidor (2026-10-15): mayúsculas, sin espacios ni guiones y,
 * si queda AAA999 o AAA9999, con el guion (`pma 3370`, `PMA3370` y `pma-3370` → `PMA-3370`). Lo
 * que no se parece a una placa se devuelve en mayúsculas y sin espacios, para que el formato lo
 * rechace con su mensaje. Se aplica al guardar, al buscar, al comparar y al mostrar.
 */
export const normalizarPlaca = (placa: string): string => {
  const limpia = placa.toUpperCase().replace(/\s+/g, "");
  const compacta = limpia.replace(/-/g, "");
  return /^[A-Z]{3}\d{3,4}$/.test(compacta)
    ? `${compacta.slice(0, 3)}-${compacta.slice(3)}`
    : limpia;
};

/** AAA-999 o AAA-9999, una vez normalizada. */
export const esPlacaValida = (placa: string): boolean =>
  PLACA_VALIDA.test(normalizarPlaca(placa));

/**
 * La placa sin guion ni espacios, para comparar y buscar: `PMA-7056`, `pma7056` y `PMA 7056` son
 * la misma. Tras la migración del 2026-10-15 todas llevan guion; la clave cubre la que no se pudo
 * migrar y lo que se teclea en el buscador.
 */
export const clavePlaca = (placa: string): string => placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

// ─────────────────────────── Conductor ───────────────────────────

/** Cédula: diez dígitos (la unicidad la comprueba el cajón contra el maestro). */
export const esCedulaConFormato = (cedula: string): boolean => /^\d{10}$/.test(cedula.trim());

/** Patrón de rotación: de 2 a 14 letras D, N, E, L o A (el mismo `^[DNELA]{2,14}$` del servidor). */
export const esPatronValido = (patron: string): boolean => /^[DNELA]{2,14}$/.test(patron);

/** El patrón en palabras: «Noche → Noche → Libre». */
export const secuenciaPatron = (patron: string): string =>
  [...patron].map((letra) => turnoDeLetra(letra)?.nombre ?? letra).join(" → ");

/** Lo que falta, en palabras, para el indicador y el distintivo. */
const NOMBRE_FALTANTE: Record<FaltanteConductor, string> = {
  VEHICULO_HABITUAL: "vehículo habitual",
  TIPO_CONTRATO: "tipo de contrato",
  PATRON_ROTACION: "patrón",
};

/** «Falta: vehículo habitual, patrón». Vacío si la ficha está completa. */
export const textoFaltantes = (faltantes: FaltanteConductor[] | undefined): string =>
  faltantes && faltantes.length > 0
    ? `Falta: ${faltantes.map((uno) => NOMBRE_FALTANTE[uno]).join(", ")}`
    : "";

/** Un vehículo habitual dado de baja cuenta como «Sin vehículo», igual que en el servidor. */
export const tieneVehiculoUtil = (conductor: Conductor): boolean =>
  Boolean(conductor.vehiculoHabitual) && conductor.vehiculoHabitual?.activo !== false;

/**
 * Qué le falta a la ficha de un conductor para PLANIFICAR con él (2026-10-06). ESPEJO de
 * `faltantesDeConductor` del servidor que alimenta el paso 1 de «Planificar el día»: sin sector,
 * sin contrato, o con parqueadero autorizado y sin acta VIGENTE en `fecha`. Lo usa la ficha que
 * se abre desde allí para señalar los campos. No es el `faltantes` de la flota (vehículo,
 * contrato, patrón): son dos preguntas distintas.
 */
export const faltantesDeConductor = (
  conductor: Conductor,
  fecha: string = hoyEnGuayaquil(),
): ("sector" | "contrato" | "parqueadero")[] => {
  const faltan: ("sector" | "contrato" | "parqueadero")[] = [];
  if (!conductor.sector) faltan.push("sector");
  if (!conductor.tipoContrato) faltan.push("contrato");
  const actaVigente =
    !!conductor.actaParqueaderoNumero &&
    !!conductor.actaParqueaderoDesde &&
    !!conductor.actaParqueaderoHasta &&
    conductor.actaParqueaderoDesde <= fecha &&
    conductor.actaParqueaderoHasta >= fecha;
  if (conductor.parqueaderoAutorizado && !actaVigente) faltan.push("parqueadero");
  return faltan;
};

// ─────────────────────────── Celdas ───────────────────────────

/** 85000 → «85.000 km». Sin `Intl`: el separador de es-EC cambia entre motores. */
export const formatoKilometraje = (kilometraje: number): string =>
  `${String(kilometraje).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} km`;

/** Desde aquí un kilometraje se marca «Revisar» en la tabla, aunque no pase el tope (2026-10-15). */
export const KM_A_REVISAR = 500_000;

/**
 * Un kilometraje inusual, que conviene confirmar: sobre el tope (`DAF_KM_MAXIMO`) o desde
 * `KM_A_REVISAR`. Solo marca la fila; el cajón sigue bloqueando lo que pase el tope.
 */
export const kmSospechoso = (km: number, max: number): boolean =>
  km > max || km >= KM_A_REVISAR;

/** La última vez que un vehículo quedó en un garaje: «hoy», «ayer» o dd/mm/aaaa. */
export const ultimaVez = (fecha: string, hoy: string): string => {
  const dias = diasEntre(fecha, hoy);
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return fechaLarga(fecha);
};
