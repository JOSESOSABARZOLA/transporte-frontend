/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: formularioAdmin.util.ts
 * Responsabilidad: Las reglas puras del alta y la edición de un formulario: número libre,
 *                  repetidos, color en uso, secciones pendientes, ejemplo del identificador,
 *                  etiquetas de comportamiento y qué cambios viajan al servidor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIN REACT NI SERVICIOS, para probarlas solas (rediseño de «Formularios del cuadro», 2026-10-13).
 *
 * Los REPETIDOS se validan en vivo contra la lista que ya trae la pantalla: `GET /` devuelve todos
 * los formularios, activos e inactivos, con TODOS sus prefijos. El servidor vuelve a comprobarlo
 * (409 `FORMULARIO_DUPLICADO`); esto solo evita el viaje y avisa mientras se escribe.
 *
 * LA POLÍTICA DE VEHÍCULO SE MUESTRA CON TRES OPCIONES aunque el enumerado tenga cuatro: el código
 * solo distingue `NO_APLICA`, y `REQUERIDO` y `OBLIGATORIO` se leen igual, «Siempre requiere
 * vehículo» (decisión del 2026-10-13). Si el administrador no toca la opción, el valor guardado NO
 * se reescribe: un `OBLIGATORIO` sigue siendo `OBLIGATORIO`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { RolDepartamental } from "../config/env.ts";
import type {
  ActualizarFormulario,
  CrearFormulario,
  FormularioAdmin,
  PoliticaVehiculo,
} from "../interfaces/Formulario.ts";
import type { TipoTransporte } from "../interfaces/Operativo.ts";

/** Número máximo de formulario (CHECK de `form_numero`). */
export const NUMERO_MAXIMO = 99;

/** Las nueve banderas de comportamiento, con su nombre de campo. */
export type BanderaFormulario =
  | "esPatrulla"
  | "condicionanteNoct"
  | "tipoControlMultiple"
  | "capturaLibreTipo"
  | "capturaLibrePunto"
  | "puntoManual"
  | "filtraPersonalPorRol"
  | "variosPorPersona"
  | "cantidadPorPersona";

/** Cómo se presenta la política de vehículo: tres opciones (ver la cabecera). */
export type OpcionPolitica = "NO_APLICA" | "CONDICIONAL" | "SIEMPRE";

/** Lo que se edita en el cajón. El número va como texto para poder quedar vacío. */
export type ValoresFormularioAdmin = {
  numero: string;
  codigo: string;
  prefijo: string;
  nombre: string;
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  rolDueno: string;
  politica: OpcionPolitica;
  tipoTransportePorDefecto: TipoTransporte;
} & Record<BanderaFormulario, boolean>;

/** Las secciones del cajón, en su orden; solo las tres primeras pueden quedar pendientes. */
export type SeccionFormulario = "Identificación" | "Color" | "Responsable y transporte";

/** Los repetidos que se avisan en vivo, campo a campo. */
export type Repetidos = Partial<Record<"numero" | "codigo" | "prefijo", string>>;

/** Los errores de campo que se MUESTRAN tras intentar guardar. */
export type ErroresFormulario = Partial<
  Record<"numero" | "codigo" | "prefijo" | "nombre" | "colorFondo" | "rolDueno", string>
>;

/** Meses del identificador: la misma tabla explícita del servidor (`identificador-operativo.ts`). */
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/** Mayúsculas en castellano (como `toLocaleUpperCase('es')` del servidor). */
export const enMayusculas = (texto: string): string => texto.toLocaleUpperCase("es");

/** El número libre más bajo del 1 al 99 (activos e inactivos ocupan el suyo); `null` si no queda. */
export const numeroLibre = (formularios: Pick<FormularioAdmin, "numero">[]): number | null => {
  const ocupados = new Set(formularios.map((fila) => fila.numero));
  for (let numero = 1; numero <= NUMERO_MAXIMO; numero += 1) {
    if (!ocupados.has(numero)) return numero;
  }
  return null;
};

/** «OCF-001-09-OCT-2026»: cómo se numerarán los operativos con ese prefijo, con la fecha dada. */
export const ejemploIdentificador = (prefijo: string, fecha: Date): string => {
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${enMayusculas(prefijo.trim())}-001-${dia}-${MESES[fecha.getMonth()]}-${fecha.getFullYear()}`;
};

/**
 * La frase de ayuda del prefijo: sin prefijo no hay ejemplo que mostrar —uno inventado
 * («PREFIJO-001-…») se leía como un identificador real—, así que se pide escribirlo.
 */
export const textoEjemploIdentificador = (prefijo: string, fecha: Date): string =>
  prefijo.trim() === ""
    ? "Escriba el prefijo para ver el ejemplo."
    : `Los operativos se numerarán ${ejemploIdentificador(prefijo, fecha)}.`;

/** La opción que se muestra para un valor guardado. */
export const opcionDePolitica = (politica: PoliticaVehiculo): OpcionPolitica =>
  politica === "REQUERIDO" || politica === "OBLIGATORIO" ? "SIEMPRE" : politica;

/** El valor a guardar: el original si la opción no cambió; «Siempre» nuevo se guarda REQUERIDO. */
export const politicaAGuardar = (
  opcion: OpcionPolitica,
  original: PoliticaVehiculo | null,
): PoliticaVehiculo => {
  if (original && opcionDePolitica(original) === opcion) return original;
  return opcion === "SIEMPRE" ? "REQUERIDO" : opcion;
};

const igualSinMayusculas = (a: string, b: string): boolean =>
  a.trim().toLocaleUpperCase("es") === b.trim().toLocaleUpperCase("es");

/**
 * Número, código o prefijo que ya usa OTRO formulario. El prefijo se compara contra todos los
 * prefijos de los demás (por área y de adicionales incluidos): dos formularios con el mismo
 * prefijo darían identificadores que se confunden.
 */
export const repetidosDe = (
  valores: Pick<ValoresFormularioAdmin, "numero" | "codigo" | "prefijo">,
  formularios: FormularioAdmin[],
  codigoPropio: string | null,
  prefijoEditable: boolean,
): Repetidos => {
  const otros = formularios.filter((fila) => fila.codigo !== codigoPropio);
  const repetidos: Repetidos = {};

  const numero = Number(valores.numero);
  if (codigoPropio === null && valores.numero.trim() !== "" && otros.some((f) => f.numero === numero)) {
    repetidos.numero = `Ya existe un formulario con el número ${numero}.`;
  }

  const codigo = valores.codigo.trim();
  if (codigoPropio === null && codigo && otros.some((f) => igualSinMayusculas(f.codigo, codigo))) {
    repetidos.codigo = `Ya existe un formulario con el código ${enMayusculas(codigo)}.`;
  }

  const prefijo = valores.prefijo.trim();
  if (
    prefijoEditable &&
    prefijo &&
    otros.some((f) => f.prefijos.some((uno) => igualSinMayusculas(uno.prefijo, prefijo)))
  ) {
    repetidos.prefijo = `El prefijo ${enMayusculas(prefijo)} ya lo usa otro formulario: los identificadores se confundirían.`;
  }

  return repetidos;
};

/** El formulario VIGENTE (otro) que ya usa ese color, para el aviso que no bloquea. */
export const colorEnUso = (
  colorFondo: string,
  formularios: FormularioAdmin[],
  codigoPropio: string | null,
): FormularioAdmin | null => {
  if (!colorFondo) return null;
  return (
    formularios.find(
      (fila) =>
        fila.activo &&
        fila.codigo !== codigoPropio &&
        fila.colorFondo.toUpperCase() === colorFondo.toUpperCase(),
    ) ?? null
  );
};

/** Los errores de campo de los obligatorios (los repetidos van aparte, en vivo). */
export const erroresDe = (valores: ValoresFormularioAdmin, prefijoEditable: boolean): ErroresFormulario => {
  const errores: ErroresFormulario = {};
  const numero = Number(valores.numero);
  if (!/^\d+$/.test(valores.numero.trim()) || numero < 1 || numero > NUMERO_MAXIMO) {
    errores.numero = "El número va del 1 al 99.";
  }
  if (!valores.codigo.trim()) errores.codigo = "Indique el código.";
  else if (valores.codigo.trim().length > 40) errores.codigo = "Máximo 40 caracteres.";
  if (prefijoEditable) {
    if (!valores.prefijo.trim()) errores.prefijo = "Indique el prefijo.";
    else if (valores.prefijo.trim().length > 12) errores.prefijo = "Máximo 12 caracteres.";
  }
  if (!valores.nombre.trim()) errores.nombre = "Indique el nombre del formulario.";
  else if (valores.nombre.trim().length > 160) errores.nombre = "Máximo 160 caracteres.";
  if (!valores.colorFondo) errores.colorFondo = "Elija un color.";
  if (!valores.rolDueno) errores.rolDueno = "Elija el departamento dueño.";
  return errores;
};

/** Las secciones con algo pendiente (un error o un repetido), en el orden del cajón. */
export const seccionesPendientes = (
  errores: ErroresFormulario,
  repetidos: Repetidos,
): SeccionFormulario[] => {
  const secciones: SeccionFormulario[] = [];
  if (
    errores.numero || errores.codigo || errores.prefijo || errores.nombre ||
    repetidos.numero || repetidos.codigo || repetidos.prefijo
  ) {
    secciones.push("Identificación");
  }
  if (errores.colorFondo) secciones.push("Color");
  if (errores.rolDueno) secciones.push("Responsable y transporte");
  return secciones;
};

/** Las etiquetas-resumen de la columna «Comportamiento», en orden fijo. */
export const etiquetasComportamiento = (
  formulario: Pick<
    FormularioAdmin,
    "esPatrulla" | "condicionanteNoct" | "variosPorPersona" | "tipoControlMultiple"
  >,
): string[] => {
  const etiquetas: string[] = [];
  if (formulario.esPatrulla) etiquetas.push("Patrulla");
  if (formulario.condicionanteNoct) etiquetas.push("Nocturno");
  if (formulario.variosPorPersona) etiquetas.push("Uno por persona");
  if (formulario.tipoControlMultiple) etiquetas.push("Varios tipos");
  return etiquetas;
};

/** Los valores del cajón para un alta (con el número sugerido) o para editar una fila. */
export const valoresIniciales = (
  fila: FormularioAdmin | null,
  numeroSugerido: number | null,
): ValoresFormularioAdmin => ({
  numero: fila ? String(fila.numero) : numeroSugerido === null ? "" : String(numeroSugerido),
  codigo: fila?.codigo ?? "",
  prefijo: fila?.prefijo ?? "",
  nombre: fila?.nombre ?? "",
  colorFondo: fila?.colorFondo ?? "",
  colorAcento: fila?.colorAcento ?? "",
  colorNombre: fila?.colorNombre ?? "",
  rolDueno: fila?.rolDueno ?? "",
  politica: fila ? opcionDePolitica(fila.politicaVehiculo) : "NO_APLICA",
  tipoTransportePorDefecto: fila?.tipoTransportePorDefecto ?? "PROPIOS_MEDIOS",
  esPatrulla: fila?.esPatrulla ?? false,
  condicionanteNoct: fila?.condicionanteNoct ?? false,
  tipoControlMultiple: fila?.tipoControlMultiple ?? false,
  capturaLibreTipo: fila?.capturaLibreTipo ?? false,
  capturaLibrePunto: fila?.capturaLibrePunto ?? false,
  puntoManual: fila?.puntoManual ?? false,
  filtraPersonalPorRol: fila?.filtraPersonalPorRol ?? true,
  variosPorPersona: fila?.variosPorPersona ?? false,
  cantidadPorPersona: fila?.cantidadPorPersona ?? false,
});

const BANDERAS: BanderaFormulario[] = [
  "esPatrulla",
  "condicionanteNoct",
  "tipoControlMultiple",
  "capturaLibreTipo",
  "capturaLibrePunto",
  "puntoManual",
  "filtraPersonalPorRol",
  "variosPorPersona",
  "cantidadPorPersona",
];

/** El cuerpo del alta. Sin áreas: el formulario nace sin ellas. */
export const cuerpoDeAlta = (valores: ValoresFormularioAdmin): CrearFormulario => ({
  numero: Number(valores.numero),
  codigo: enMayusculas(valores.codigo.trim()),
  nombre: enMayusculas(valores.nombre.trim()),
  colorFondo: valores.colorFondo,
  colorAcento: valores.colorAcento,
  colorNombre: valores.colorNombre,
  rolDueno: valores.rolDueno as RolDepartamental,
  prefijo: enMayusculas(valores.prefijo.trim()),
  politicaVehiculo: politicaAGuardar(valores.politica, null),
  tipoTransportePorDefecto: valores.tipoTransportePorDefecto,
  ...Object.fromEntries(BANDERAS.map((bandera) => [bandera, valores[bandera]])),
}) as CrearFormulario;

/**
 * Solo lo que CAMBIÓ respecto de la fila. Nunca número, código ni áreas. Los tres campos de color
 * viajan juntos (el servidor los exige así); el prefijo, solo si es editable y cambió.
 */
export const cambiosDeEdicion = (
  fila: FormularioAdmin,
  valores: ValoresFormularioAdmin,
): ActualizarFormulario => {
  const cambios: ActualizarFormulario = {};
  const nombre = enMayusculas(valores.nombre.trim());
  if (nombre !== fila.nombre) cambios.nombre = nombre;
  if (valores.colorFondo.toUpperCase() !== fila.colorFondo.toUpperCase()) {
    cambios.colorFondo = valores.colorFondo;
    cambios.colorAcento = valores.colorAcento;
    cambios.colorNombre = valores.colorNombre;
  }
  if (valores.rolDueno !== fila.rolDueno) cambios.rolDueno = valores.rolDueno as RolDepartamental;
  const prefijo = enMayusculas(valores.prefijo.trim());
  if (fila.prefijo !== null && prefijo !== fila.prefijo) cambios.prefijo = prefijo;
  const politica = politicaAGuardar(valores.politica, fila.politicaVehiculo);
  if (politica !== fila.politicaVehiculo) cambios.politicaVehiculo = politica;
  if (
    fila.tipoTransportePorDefecto !== undefined &&
    valores.tipoTransportePorDefecto !== fila.tipoTransportePorDefecto
  ) {
    cambios.tipoTransportePorDefecto = valores.tipoTransportePorDefecto;
  }
  for (const bandera of BANDERAS) {
    if (valores[bandera] !== fila[bandera]) cambios[bandera] = valores[bandera];
  }
  return cambios;
};

/**
 * Catálogos del cuadro con ese formulario elegido y la barra de áreas desplegada: el enlace
 * «Cambiar en Catálogos del cuadro →» y el «Ir a Catálogos» del aviso tras un alta.
 */
export const rutaCatalogosConAreas = (codigo: string): string =>
  `/home/administracion/catalogos-cuadro?formulario=${encodeURIComponent(codigo)}&areas=abierto`;
