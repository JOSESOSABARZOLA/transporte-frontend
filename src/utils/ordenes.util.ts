/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: ordenes.util.ts
 * Responsabilidad: Decidir sobre qué operativos se puede emitir, y explicar los demás.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL BOTÓN DESHABILITADO SIEMPRE DICE POR QUÉ. Es el caso 4 del plan, y la validación
 * que la ficha del módulo enuncia: «el botón de emitir queda deshabilitado, **con la
 * explicación en el `title`**, cuando el operativo no tiene personal».
 *
 * Por eso `motivoParaNoEmitir` no devuelve un booleano sino **el motivo o nada**: con un
 * booleano, el texto del `title` habría que componerlo aparte, y el día que se agregue una
 * tercera condición alguien la añadiría al booleano y olvidaría el texto. Aquí no se puede
 * deshabilitar sin decir por qué, porque son el mismo valor.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Matriz } from "../interfaces/Documento";

/** Lo que P-05 necesita de un operativo para decidir si emite. */
export interface OperativoEmisible {
  id: number;
  identificador: string;
  formulario: string;
  horario: string;
  /** Los nombres, no un conteo: la confirmación dice a cuántos y la tabla, a quiénes. */
  personal: string[];
  /**
   * Si es un adicional, y de cuál nace. 2026-08-20.
   *
   * P-05 los necesita por dos motivos: para **decirlo en la fila** —el documento tiene dos
   * versiones desde que la Dirección puede añadir sobre lo cerrado— y para **no ofrecer
   * crear un adicional sobre un adicional**, que el servidor rechaza.
   */
  esAdicional: boolean;
  origen: string | null;
  /**
   * RN-61. Si el formulario de este operativo admite adicionales.
   *
   * Viene de la sección de la matriz, que es de donde nace la fila. Sin esto P-05
   * ofrecía «Adicional» en los nueve formularios y el servidor lo rechazaba en ocho.
   */
  admiteAdicionales: boolean;
}

/**
 * Aplana la matriz a la lista de operativos de la jornada.
 *
 * La matriz llega por secciones —una por formulario— porque así se lee como documento;
 * para emitir, lo que hace falta es la lista corrida. Las secciones sin filas
 * desaparecen solas: un formulario que nadie cargó no tiene órdenes que emitir.
 */
export const operativosDeLaMatriz = (
  matriz: Matriz | null,
): OperativoEmisible[] => {
  if (!matriz) return [];

  return matriz.secciones.flatMap((seccion) =>
    seccion.filas.map((fila) => ({
      id: fila.id,
      identificador: fila.identificador,
      formulario: `${seccion.numero}. ${seccion.nombre}`,
      horario: fila.horario,
      personal: fila.personal.map((persona) => persona.nombre),
      esAdicional: fila.esAdicional,
      origen: fila.origen,
      admiteAdicionales: seccion.admiteAdicionales,
    })),
  );
};

/**
 * Por qué no se puede emitir sobre este operativo, o `null` si sí se puede.
 *
 * Las dos condiciones tienen orígenes distintos y conviene no confundirlos:
 *
 *   · **Sin personal** la rechaza también el servidor, con su propio mensaje. Aquí se
 *     adelanta para no gastar un viaje en un error previsible.
 *   · **Cuadro sin cerrar** es el flujo aprobado —FASE5 §6.1 lo dibuja como «cierre del
 *     cuadro → P-05 emisión»— pero **el servidor no lo exige hoy**. Mientras siga así,
 *     esta regla vive solo en la interfaz, que es tanto como decir que no está garantizada.
 *     Registrado como PV-34.
 */
export const motivoParaNoEmitir = (
  operativo: OperativoEmisible,
  cuadroCerrado: boolean,
): string | null => {
  if (operativo.personal.length === 0) {
    return "Este operativo no tiene personal asignado: no hay a quién entregar la orden.";
  }

  if (!cuadroCerrado) {
    return "El cuadro del día todavía no está cerrado. Las órdenes se emiten después del cierre.";
  }

  return null;
};
