/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos
 * Archivo: valoresOperativo.util.ts
 * Responsabilidad: Declarar los valores del formulario de operativo y su conversión.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * VIVE FUERA DE `FormularioOperativo.tsx` PORQUE LO USAN DOS PANTALLAS. P-01 parte de
 * los valores vacíos y P-02 parte de un operativo existente; dejar la conversión dentro
 * del componente obligaba a exportar una función desde un archivo de componentes, que es
 * justo lo que rompe el refresco rápido de Vite.
 */

import type { Operativo } from "../interfaces/Operativo";

/**
 * Opción del desplegable que activa la captura libre.
 *
 * **No es una fila del catálogo** (INV-08): es una elección del formulario, y por eso su
 * valor es una palabra y no un identificador. El servidor recibe `puntoLibre` en lugar de
 * `puntoEncuentroId` cuando llega esta opción.
 */
export const OPCION_ADICIONALES = "ADICIONALES";

export type ValoresOperativo = {
  formularioCodigo: string;
  horaInicio: string;
  horaFin: string;
  zonalId: number | "";
  punto: string;
  puntoLibre: string;
  tipoControl: string;
  tipoLibre: string;
  institucionesIds: number[];
  observaciones: string;
};

export const VALORES_INICIALES: ValoresOperativo = {
  formularioCodigo: "",
  horaInicio: "",
  horaFin: "",
  zonalId: "",
  punto: "",
  puntoLibre: "",
  tipoControl: "",
  tipoLibre: "",
  institucionesIds: [],
  observaciones: "",
};

/**
 * Valores de un operativo existente, para editarlo con el mismo formulario y las mismas
 * validaciones con que se registró (lo que pide M-23).
 *
 * `zonalId` toma **la primera** zonal: la interfaz ofrece una sola, aunque RN-19 admita
 * varias y el contrato las transporte como arreglo. Está registrado como PV-31.
 */
export const comoValoresDeFormulario = (
  operativo: Operativo,
): ValoresOperativo => ({
  formularioCodigo: operativo.formulario.codigo,
  horaInicio: operativo.horaInicio,
  horaFin: operativo.horaFin,
  zonalId: operativo.zonales[0]?.id ?? "",
  punto: operativo.puntoEncuentro
    ? String(operativo.puntoEncuentro.id)
    : operativo.puntoLibre
      ? OPCION_ADICIONALES
      : "",
  puntoLibre: operativo.puntoLibre ?? "",
  tipoControl: operativo.tipoControl
    ? String(operativo.tipoControl.id)
    : operativo.tipoLibre
      ? OPCION_ADICIONALES
      : "",
  tipoLibre: operativo.tipoLibre ?? "",
  institucionesIds: operativo.instituciones.map((institucion) => institucion.id),
  observaciones: operativo.observaciones ?? "",
});
