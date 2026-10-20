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

import type { Matriz, OrdenServicio } from "../interfaces/Documento";

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
    return "Disponible cuando el cuadro esté cerrado: las órdenes se emiten después del cierre.";
  }

  return null;
};

/** Resumen de estado de un operativo: la clase de distintivo y su texto. */
export interface ResumenEstadoOrdenes {
  clase: string;
  texto: string;
}

/**
 * Resumen ÚNICO del estado de las órdenes de UN operativo. La columna «Órdenes» de la tabla y el
 * chip del panel comparten esta función, para que nunca se contradigan ni repitan el defecto de
 * mostrar «0 vigente · 1 borrador».
 *
 * Solo cuenta la **versión actual de cada hoja**: las reemplazadas (`vigente === false`) se
 * descartan. `total` es cuántas hojas debería tener el operativo (una por persona). Sobre las
 * hojas vigentes —vig = en firme, bor = en borrador—:
 *
 *   · vig = 0 y bor = 0  → «Pendiente · N hoja(s)» (gris): aún no se emite.
 *   · bor = 0            → «Vigentes vig/total» (verde): todas en firme.
 *   · vig = 0            → «Borrador bor/total» (naranja): todas a medias.
 *   · vig > 0 y bor > 0  → «vig vigente(s) · bor borrador(es)» (naranja): mixto, con plural correcto.
 *
 * Nunca aparece «0 vigente» ni «0 borrador»: ese cero siempre cae en una de las ramas anteriores.
 * Un operativo sin personal (`total === 0`) no tiene a quién entregar la orden: «Sin personal».
 */
export const resumenEstado = (
  hojas: OrdenServicio[],
  total: number,
): ResumenEstadoOrdenes => {
  if (total === 0) {
    return { clase: "badge-ghost", texto: "Sin personal" };
  }

  const vigentes = hojas.filter((hoja) => hoja.vigente);
  const bor = vigentes.filter((hoja) => hoja.estado === "BORRADOR").length;
  const vig = vigentes.length - bor;

  if (vig === 0 && bor === 0) {
    return {
      clase: "badge-ghost",
      texto: `Pendiente · ${total} ${total === 1 ? "hoja" : "hojas"}`,
    };
  }
  if (bor === 0) {
    return { clase: "badge-success", texto: `Vigentes ${vig}/${total}` };
  }
  if (vig === 0) {
    return { clase: "badge-warning", texto: `Borrador ${bor}/${total}` };
  }
  return {
    clase: "badge-warning",
    texto: `${vig} ${vig === 1 ? "vigente" : "vigentes"} · ${bor} ${
      bor === 1 ? "borrador" : "borradores"
    }`,
  };
};

/** Conteo de la jornada por estado (cabecera de P-05). */
export interface ConteoEstados {
  pendiente: number;
  borrador: number;
  vigente: number;
  reemplazada: number;
}

/**
 * Cuenta los estados de la jornada (2026-10-05): PENDIENTE = operativo emisible sin órdenes;
 * BORRADOR/VIGENTE = la versión ACTUAL de cada hoja; REEMPLAZADA = versiones anteriores. Usa el
 * `estado` único que da el servidor, la misma fuente que la tabla, el panel y el visor.
 */
export const contarEstados = (
  ordenesPorOperativo: Record<number, OrdenServicio[]>,
  pendientes: number,
): ConteoEstados => {
  const conteo: ConteoEstados = {
    pendiente: pendientes,
    borrador: 0,
    vigente: 0,
    reemplazada: 0,
  };
  for (const ordenes of Object.values(ordenesPorOperativo)) {
    for (const orden of ordenes) {
      if (orden.estado === "REEMPLAZADA") conteo.reemplazada += 1;
      else if (orden.estado === "BORRADOR") conteo.borrador += 1;
      else conteo.vigente += 1;
    }
  }
  return conteo;
};

/**
 * Las partes del resumen de cabecera, OMITIENDO los estados en 0 (nunca «0 vigente») y con plural
 * correcto. Cada parte lleva la clase de distintivo de su estado.
 */
export const partesResumenCabecera = (
  conteo: ConteoEstados,
): { clave: keyof ConteoEstados; texto: string; clase: string }[] => {
  const definicion: {
    clave: keyof ConteoEstados;
    singular: string;
    plural: string;
    clase: string;
  }[] = [
    { clave: "pendiente", singular: "pendiente", plural: "pendientes", clase: "badge-ghost" },
    { clave: "borrador", singular: "borrador", plural: "borradores", clase: "badge-warning" },
    { clave: "vigente", singular: "vigente", plural: "vigentes", clase: "badge-success" },
    { clave: "reemplazada", singular: "reemplazada", plural: "reemplazadas", clase: "badge-ghost" },
  ];
  return definicion
    .filter(({ clave }) => conteo[clave] > 0)
    .map(({ clave, singular, plural, clase }) => ({
      clave,
      clase,
      texto: `${conteo[clave]} ${conteo[clave] === 1 ? singular : plural}`,
    }));
};
