/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: formularioFlota.util.ts
 * Responsabilidad: Valores, validación y cuerpo de envío de los tres cajones de «Flota y
 *                  garajes» (vehículo, conductor y garaje), y el estado de su pie.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGLAS PURAS, SIN FORMIK. Los tres cajones siguen el patrón de `DrawerFormulario`: el estado
 * es un objeto de cadenas, los errores salen de una función que se prueba sola, y se MUESTRAN
 * solo después de intentar guardar. Los REPETIDOS (placa, cédula, nombre del garaje) son la
 * excepción: se avisan en vivo, porque bloquean y conviene saberlo antes de seguir escribiendo.
 *
 * ESPEJO DEL SERVIDOR, NO SU SUSTITUTO. Placa AAA-999/AAA-9999 solo al crear o al cambiarla (D4),
 * cédula de diez dígitos, teléfono `09xxxxxxxx`, patrón de 2 a 14 letras y acta coherente: el
 * servidor revalida todo, y su mensaje se muestra tal cual en el pie (regla 7).
 *
 * `ValoresConductor` y `cambiosDeConductor` los comparte la ficha que «Planificar el día» abre
 * en el mismo cajón (D6): dos copias del mismo mapeo divergirían a la primera.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  ActualizarConductor,
  ActualizarUbicacion,
  ActualizarVehiculo,
  CrearConductor,
  CrearUbicacion,
  CrearVehiculo,
} from "../interfaces/Flota.ts";
import type { EstadoPie } from "../components/common/DrawerLateral.tsx";
import type { Conductor, UbicacionFlota, Vehiculo } from "../interfaces/Transporte.ts";
import {
  clavePlaca,
  esCedulaConFormato,
  esPatronValido,
  esPlacaValida,
  normalizarPlaca,
} from "./flota.util.ts";
import { estadoPieDrawer } from "./estadoPieDrawer.util.ts";
import { esTelefonoValido } from "./personal.util.ts";
import { normalizar } from "./texto.util.ts";

/** Los errores de un formulario, por campo. Solo los que hay. */
export type ErroresDe<T> = Partial<Record<keyof T, string>>;

// ─────────────────────────── Pie del cajón ───────────────────────────

/**
 * Lo que dice el pie de los tres cajones: el estado común del cajón estándar (`estadoPieDrawer`),
 * con los obligatorios vacíos contados aparte y, si no queda ninguno, los avisos de formato «por
 * revisar». El texto es la señal; el color acompaña (regla 6).
 */
export const estadoDelPie = (
  intentado: boolean,
  pendientes: string[],
  obligatoriosVacios: number,
  esEdicion = false,
  hayCambios = false,
): EstadoPie =>
  estadoPieDrawer({
    esEdicion,
    hayCambios,
    intentado,
    faltan: pendientes,
    porCompletar: obligatoriosVacios,
    porRevisar: pendientes,
  });

/** Los nombres de los campos con error, en el orden del formulario. */
const pendientesDe = <T>(errores: ErroresDe<T>, nombres: Record<keyof T, string>): string[] =>
  (Object.keys(nombres) as (keyof T)[])
    .filter((campo) => Boolean(errores[campo]))
    .map((campo) => nombres[campo]);

// ─────────────────────────── Vehículo ───────────────────────────

/** Los tipos que ofrece el cajón (D5). Un valor anterior distinto se conserva como opción. */
export const TIPOS_VEHICULO = ["Auto", "Camioneta", "Furgoneta", "Bus"] as const;

export type ValoresVehiculo = {
  placa: string;
  tipo: string;
  descripcion: string;
  asientos: string;
  kilometraje: string;
  matriculaVencimiento: string;
  soatVencimiento: string;
};

const NOMBRES_VEHICULO: Record<keyof ValoresVehiculo, string> = {
  placa: "placa",
  tipo: "tipo",
  descripcion: "descripción",
  asientos: "asientos",
  kilometraje: "kilometraje",
  matriculaVencimiento: "matrícula",
  soatVencimiento: "SOAT",
};

export const valoresVehiculo = (vehiculo: Vehiculo | null): ValoresVehiculo => ({
  placa: vehiculo?.placa ?? "",
  tipo: vehiculo?.tipo ?? "",
  descripcion: vehiculo?.descripcion ?? "",
  asientos: vehiculo?.asientos != null ? String(vehiculo.asientos) : "",
  kilometraje: vehiculo?.kilometraje != null ? String(vehiculo.kilometraje) : "",
  matriculaVencimiento: vehiculo?.matriculaVencimiento ?? "",
  soatVencimiento: vehiculo?.soatVencimiento ?? "",
});

/**
 * Si la placa cambió respecto de la guardada. En un alta, siempre. Se comparan NORMALIZADAS: la
 * misma placa escrita de otra forma (`pma 3370` para `PMA-3370`) no es un cambio, igual que en el
 * servidor.
 */
export const placaCambio = (placa: string, original: Vehiculo | null): boolean =>
  original === null || normalizarPlaca(placa.trim()) !== normalizarPlaca(original.placa);

/** El vehículo de OTRO registro con la misma placa, con o sin guion. Incluye a los de baja. */
export const placaRepetida = (
  placa: string,
  vehiculos: Vehiculo[],
  propioId: number | null,
): Vehiculo | undefined => {
  const clave = clavePlaca(placa);
  if (!clave) return undefined;
  return vehiculos.find((otro) => otro.id !== propioId && clavePlaca(otro.placa) === clave);
};

/** El aviso del repetido, que se muestra en vivo: las mismas palabras que el 400 del servidor. */
export const textoPlacaRepetida = (otro: Vehiculo): string =>
  otro.activo
    ? "Ya existe un vehículo con esa placa."
    : `Ya existe un vehículo con esa placa (${normalizarPlaca(otro.placa)}, dado de baja: reactívelo).`;

/** `DAF_KM_MAXIMO` si el resumen no llegó: el mismo valor con que lo siembra la migración. */
export const KM_MAXIMO_POR_DEFECTO = 999_999;

/** Si el kilometraje cambió respecto del guardado. En un alta, siempre. */
const kilometrajeCambio = (kilometraje: string, original: Vehiculo | null): boolean =>
  original === null ||
  kilometraje !== (original.kilometraje != null ? String(original.kilometraje) : "");

/**
 * Los errores del cajón. El tope del kilometraje (`DAF_KM_MAXIMO`, del resumen) se exige solo al
 * crear o si el kilometraje cambió: un vehículo que ya lo supera se sigue editando sin tocarlo.
 */
export const erroresVehiculo = (
  valores: ValoresVehiculo,
  original: Vehiculo | null,
  vehiculos: Vehiculo[],
  kmMaximo: number = KM_MAXIMO_POR_DEFECTO,
): ErroresDe<ValoresVehiculo> => {
  const errores: ErroresDe<ValoresVehiculo> = {};
  const placa = valores.placa.trim();
  const repetida = placaRepetida(placa, vehiculos, original?.id ?? null);

  if (!placa) errores.placa = "Indique la placa del vehículo.";
  else if (repetida) errores.placa = textoPlacaRepetida(repetida);
  else if (placaCambio(placa, original) && !esPlacaValida(placa)) {
    errores.placa = "La placa se escribe AAA-999 o AAA-9999.";
  }

  if (valores.descripcion.trim().length > 160) {
    errores.descripcion = "La descripción no supera los 160 caracteres.";
  }
  if (valores.asientos && !/^([1-9]|[1-5]\d|60)$/.test(valores.asientos)) {
    errores.asientos = "Los asientos son un número entero de 1 a 60.";
  }
  if (valores.kilometraje) {
    if (!/^\d+$/.test(valores.kilometraje)) {
      errores.kilometraje = "El kilometraje es un número entero, sin puntos ni comas.";
    } else if (
      kilometrajeCambio(valores.kilometraje, original) &&
      Number(valores.kilometraje) > kmMaximo
    ) {
      errores.kilometraje = "Revise el kilometraje: parece demasiado alto.";
    }
  }
  return errores;
};

export const pendientesVehiculo = (errores: ErroresDe<ValoresVehiculo>): string[] =>
  pendientesDe(errores, NOMBRES_VEHICULO);

export const obligatoriosVaciosVehiculo = (valores: ValoresVehiculo): number =>
  valores.placa.trim() ? 0 : 1;

/**
 * El cuerpo de `POST`/`PATCH`. Vacío viaja como `null` (borra el dato al editar). La placa viaja
 * siempre NORMALIZADA (2026-10-15); si es la misma escrita de otra forma, el servidor no la toma
 * por un cambio ni la revalida (D4).
 */
export const cuerpoVehiculo = (valores: ValoresVehiculo): CrearVehiculo & ActualizarVehiculo => {
  const placa = valores.placa.trim();
  return {
    placa: normalizarPlaca(placa),
    descripcion: valores.descripcion.trim() || undefined,
    tipo: valores.tipo || null,
    asientos: valores.asientos ? Number(valores.asientos) : null,
    kilometraje: valores.kilometraje ? Number(valores.kilometraje) : null,
    matriculaVencimiento: valores.matriculaVencimiento || null,
    soatVencimiento: valores.soatVencimiento || null,
  };
};

// ─────────────────────────── Conductor ───────────────────────────

/** Los tipos de licencia que ofrece el cajón (D5). Un valor anterior distinto se conserva. */
export const TIPOS_LICENCIA = ["A", "A1", "B", "C", "C1", "D", "D1", "E", "E1", "F", "G"] as const;

/**
 * Lo que maneja la ficha del conductor. `vehiculoHabitualId` es TEXTO porque un `<select>` solo
 * tiene cadenas. `sector` y `tipoContrato` se tipan con la unión, y la cadena vacía es «no consta».
 */
export type ValoresConductor = {
  cedula: string;
  nombreCompleto: string;
  telefono: string;
  licenciaTipo: string;
  vehiculoHabitualId: string;
  sector: "" | "NORTE" | "SUR" | "CENTRO" | "VALLE";
  parqueaderoAutorizado: boolean;
  tipoContrato: "" | "NOMBRAMIENTO" | "OCASIONAL";
  actaParqueaderoNumero: string;
  actaParqueaderoDesde: string;
  actaParqueaderoHasta: string;
  patronRotacion: string;
};

const NOMBRES_CONDUCTOR: Record<keyof ValoresConductor, string> = {
  cedula: "cédula",
  telefono: "teléfono",
  nombreCompleto: "apellidos y nombres",
  vehiculoHabitualId: "vehículo habitual",
  licenciaTipo: "licencia",
  sector: "sector",
  tipoContrato: "contrato",
  patronRotacion: "patrón",
  parqueaderoAutorizado: "parqueadero",
  actaParqueaderoNumero: "número de acta",
  actaParqueaderoDesde: "acta desde",
  actaParqueaderoHasta: "acta hasta",
};

export const valoresConductor = (conductor: Conductor | null): ValoresConductor => ({
  cedula: conductor?.cedula ?? "",
  nombreCompleto: conductor?.nombreCompleto ?? "",
  telefono: conductor?.telefono ?? "",
  licenciaTipo: conductor?.licenciaTipo ?? "",
  vehiculoHabitualId: conductor?.vehiculoHabitual ? String(conductor.vehiculoHabitual.id) : "",
  sector: conductor?.sector ?? "",
  parqueaderoAutorizado: conductor?.parqueaderoAutorizado ?? false,
  tipoContrato: conductor?.tipoContrato ?? "",
  actaParqueaderoNumero: conductor?.actaParqueaderoNumero ?? "",
  actaParqueaderoDesde: conductor?.actaParqueaderoDesde ?? "",
  actaParqueaderoHasta: conductor?.actaParqueaderoHasta ?? "",
  patronRotacion: conductor?.patronRotacion ?? "",
});

/** El conductor de OTRO registro con la misma cédula. Incluye a los de baja. */
export const cedulaRepetida = (
  cedula: string,
  conductores: Conductor[],
  propioId: number | null,
): Conductor | undefined => {
  const buscada = cedula.trim();
  if (!buscada) return undefined;
  return conductores.find((otro) => otro.id !== propioId && otro.cedula === buscada);
};

export const textoCedulaRepetida = (otro: Conductor): string =>
  `Ya existe un conductor con esa cédula: ${otro.nombreCompleto}${otro.activo ? "" : " (dado de baja: reactívelo)"}.`;

/** El teléfono sin espacios ni guiones, como lo compara el servidor. */
const telefonoLimpio = (telefono: string): string => telefono.replace(/[\s-]/g, "");

export const erroresConductor = (
  valores: ValoresConductor,
  original: Conductor | null,
  conductores: Conductor[],
): ErroresDe<ValoresConductor> => {
  const errores: ErroresDe<ValoresConductor> = {};

  // La cédula solo se valida en el alta: al editar es la llave natural y no se cambia.
  if (original === null) {
    const repetido = cedulaRepetida(valores.cedula, conductores, null);
    if (!valores.cedula.trim()) errores.cedula = "Indique la cédula del conductor.";
    else if (repetido) errores.cedula = textoCedulaRepetida(repetido);
    else if (!esCedulaConFormato(valores.cedula)) {
      errores.cedula = "La cédula son 10 dígitos, sin guiones ni espacios.";
    }
  }

  const nombre = valores.nombreCompleto.trim();
  if (!nombre) errores.nombreCompleto = "Indique los apellidos y nombres del conductor.";
  else if (nombre.length > 160) errores.nombreCompleto = "El nombre no supera los 160 caracteres.";

  const telefono = telefonoLimpio(valores.telefono);
  if (telefono && !esTelefonoValido(telefono)) {
    errores.telefono = "El teléfono se escribe 09 y ocho dígitos más.";
  }

  const patron = valores.patronRotacion.trim().toUpperCase();
  if (patron && !esPatronValido(patron)) {
    errores.patronRotacion = "El patrón son de 2 a 14 letras: D, N, E, L o A.";
  }

  if (valores.parqueaderoAutorizado) {
    if (!valores.actaParqueaderoNumero.trim()) {
      errores.actaParqueaderoNumero = "Con parqueadero autorizado, indique el número de acta.";
    } else if (valores.actaParqueaderoNumero.trim().length > 40) {
      errores.actaParqueaderoNumero = "El número de acta no supera los 40 caracteres.";
    }
    if (!valores.actaParqueaderoDesde) {
      errores.actaParqueaderoDesde = "Indique desde cuándo rige el acta.";
    }
    if (!valores.actaParqueaderoHasta) {
      errores.actaParqueaderoHasta = "Indique hasta cuándo rige el acta.";
    } else if (
      valores.actaParqueaderoDesde &&
      valores.actaParqueaderoDesde > valores.actaParqueaderoHasta
    ) {
      errores.actaParqueaderoHasta = "La vigencia del acta termina antes de empezar.";
    }
  }
  return errores;
};

export const pendientesConductor = (errores: ErroresDe<ValoresConductor>): string[] =>
  pendientesDe(errores, NOMBRES_CONDUCTOR);

export const obligatoriosVaciosConductor = (
  valores: ValoresConductor,
  esAlta: boolean,
): number =>
  (esAlta && !valores.cedula.trim() ? 1 : 0) + (valores.nombreCompleto.trim() ? 0 : 1);

/**
 * Lo que viaja en `PATCH /administracion/conductores/:id` (2026-10-08). Lo comparten «Flota y
 * garajes» y la ficha que abre «Planificar el día».
 *
 * Vacío significa «no consta» y viaja como ausente, NO como cadena vacía: el servidor distingue
 * un dato sin registrar de un valor. El acta solo viaja con parqueadero autorizado; al quitarlo
 * se envía `null`, que la borra (Art. 8).
 */
export const cambiosDeConductor = (valores: ValoresConductor): ActualizarConductor => {
  const conActa = valores.parqueaderoAutorizado;
  const telefono = telefonoLimpio(valores.telefono);
  return {
    nombreCompleto: valores.nombreCompleto.trim(),
    telefono: telefono || undefined,
    licenciaTipo: valores.licenciaTipo.trim() || undefined,
    vehiculoHabitualId: valores.vehiculoHabitualId
      ? Number(valores.vehiculoHabitualId)
      : undefined,
    sector: valores.sector || undefined,
    parqueaderoAutorizado: valores.parqueaderoAutorizado,
    tipoContrato: valores.tipoContrato || undefined,
    actaParqueaderoNumero: conActa ? valores.actaParqueaderoNumero.trim() : null,
    actaParqueaderoDesde: conActa ? valores.actaParqueaderoDesde : null,
    actaParqueaderoHasta: conActa ? valores.actaParqueaderoHasta : null,
    patronRotacion: valores.patronRotacion.trim().toUpperCase() || null,
  };
};

/** El cuerpo del alta: el de la edición más la cédula, sin los `null` que solo borran. */
export const cuerpoAltaConductor = (valores: ValoresConductor): CrearConductor => {
  const cambios = cambiosDeConductor(valores);
  return {
    ...cambios,
    cedula: valores.cedula.trim(),
    actaParqueaderoNumero: cambios.actaParqueaderoNumero ?? undefined,
    actaParqueaderoDesde: cambios.actaParqueaderoDesde ?? undefined,
    actaParqueaderoHasta: cambios.actaParqueaderoHasta ?? undefined,
    patronRotacion: cambios.patronRotacion ?? undefined,
  };
};

// ─────────────────────────── Garaje ───────────────────────────

export type ValoresGaraje = {
  nombre: string;
  /** El `<select>` entrega texto; vacío es «Sin zonal». */
  zonalId: string;
};

const NOMBRES_GARAJE: Record<keyof ValoresGaraje, string> = {
  nombre: "nombre",
  zonalId: "zonal",
};

export const valoresGaraje = (garaje: UbicacionFlota | null): ValoresGaraje => ({
  nombre: garaje?.nombre ?? "",
  zonalId: garaje?.zonalId != null ? String(garaje.zonalId) : "",
});

/**
 * El garaje de OTRO registro con el mismo nombre, sin distinguir tildes ni mayúsculas, incluidos
 * los dados de baja: es el mismo 409 `NOMBRE_DUPLICADO` del servidor.
 */
export const nombreGarajeRepetido = (
  nombre: string,
  garajes: UbicacionFlota[],
  propioId: number | null,
): UbicacionFlota | undefined => {
  const buscado = normalizar(nombre.trim());
  if (!buscado) return undefined;
  return garajes.find((otro) => otro.id !== propioId && normalizar(otro.nombre) === buscado);
};

export const erroresGaraje = (
  valores: ValoresGaraje,
  original: UbicacionFlota | null,
  garajes: UbicacionFlota[],
): ErroresDe<ValoresGaraje> => {
  const errores: ErroresDe<ValoresGaraje> = {};
  const nombre = valores.nombre.trim();
  const repetido = nombreGarajeRepetido(nombre, garajes, original?.id ?? null);
  if (!nombre) errores.nombre = "Indique el nombre del garaje.";
  else if (repetido) {
    errores.nombre = `Ya existe un garaje con ese nombre${repetido.activo ? "" : " (dado de baja: reactívelo)"}.`;
  } else if (nombre.length > 120) errores.nombre = "El nombre no supera los 120 caracteres.";
  return errores;
};

export const pendientesGaraje = (errores: ErroresDe<ValoresGaraje>): string[] =>
  pendientesDe(errores, NOMBRES_GARAJE);

export const obligatoriosVaciosGaraje = (valores: ValoresGaraje): number =>
  valores.nombre.trim() ? 0 : 1;

export const cuerpoGaraje = (valores: ValoresGaraje): CrearUbicacion & ActualizarUbicacion => ({
  nombre: valores.nombre.trim(),
  zonalId: valores.zonalId ? Number(valores.zonalId) : null,
});
