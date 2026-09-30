/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: accesoOperativo.util.ts
 * Responsabilidad: Distinguir el operativo que se manda del que solo se acompaña.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-25
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUIEN LO REGISTRÓ LO EDITA. NADIE MÁS.
 *
 * Hasta el 2026-08-25 el criterio era «el formulario es suyo», y era equivalente: el
 * dueño era el único que podía haberlo creado. Desde que un formulario admite **varios
 * departamentos que registran** —la patrulla ECU tiene dos— deja de serlo, y el negocio
 * eligió: cada uno edita y retira lo suyo.
 *
 * El motivo es operativo, no de permisos: el cuadro se arma contra reloj y dos
 * departamentos escribiendo sobre la misma fila se pisan el trabajo sin enterarse.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * VER NO ES TOCAR, Y SON DOS PREGUNTAS DISTINTAS. Participar en el formulario da derecho
 * a **ver** el operativo y a poner personal en él —para eso está el cupo—; cambiarlo
 * exige haberlo creado. De ahí que esto devuelva tres estados y no un booleano.
 *
 * ES EL ESPEJO DE `operativos.service.ts` EN EL SERVIDOR, y conviene decirlo en voz alta:
 * quien decide de verdad es `exigirPropiedad`. Esto **no autoriza nada**; solo evita
 * ofrecer lo que se va a rechazar con un 403 después de escribir el formulario entero.
 *
 * SE COMPRUEBA CONTRA TODOS SUS ROLES, no contra uno. `user.rolCodes` es plural desde el
 * 19-AGO y una persona ve la unión de lo que cada rol le abre.
 */

import type { RolDepartamental } from "../config/env";

/** Con qué autoridad mira alguien un operativo concreto. */
export type AccesoAlOperativo =
  /** Lo registró su departamento: lo edita y lo retira. */
  | "PROPIO"
  /** Su departamento participa en el formulario, pero no registró esta fila. */
  | "PARTICIPA"
  /** Ni una cosa ni la otra. Lo ven los roles transversales, y solo miran. */
  | "AJENO";

/** Lo mínimo que hay que saber del operativo para decidir. */
export type ParticipacionEnOperativo = {
  /** Con qué sombrero se registró. `oper_creado_por_rol`. */
  creadoPorRol: string;
  formulario: { roles: { rol: string; acceso: string }[] };
};

export const accesoAlOperativo = (
  operativo: ParticipacionEnOperativo,
  roles: RolDepartamental[],
): AccesoAlOperativo => {
  // Haberlo creado gana a participar: si se preguntara al revés, quien registró en un
  // formulario compartido perdería el botón de editar el suyo.
  if (roles.some((rol) => rol === operativo.creadoPorRol)) return "PROPIO";

  if (
    operativo.formulario.roles.some((fila) =>
      roles.some((rol) => rol === fila.rol),
    )
  ) {
    return "PARTICIPA";
  }

  return "AJENO";
};

/**
 * Si alguno de los roles del usuario APORTA a este formulario (cupo compartido): quien pone
 * personal sin ser dueño de la fila. En la patrulla del Form 6 es el DMIT de Instrucción.
 *
 * El botón «Agregar Personal» de la patrulla es SUYO —es el aporte de Instrucción, no el alta
 * de los generales—, así que SOLO a él se le ofrece; el dueño registra a los suyos al crear la
 * patrulla. Es el espejo de `reglaCupoCompartido` del servidor, que solo deja aportar a los
 * roles con `acceso === 'APORTA'`. 2026-09-18.
 */
export const puedeAportarA = (
  operativo: ParticipacionEnOperativo,
  roles: RolDepartamental[],
): boolean =>
  operativo.formulario.roles.some(
    (fila) => fila.acceso === "APORTA" && roles.some((rol) => rol === fila.rol),
  );

/**
 * Por qué no se puede editar ni retirar, dicho con palabras.
 *
 * REGLA 6. Un botón apagado no dice nada por sí solo: quien lo ve no sabe si es su
 * permiso, la ventana o un error. El texto viaja en `title`, que es lo que ya hacen los
 * otros dos motivos de bloqueo de esta misma pantalla.
 *
 * EL MENSAJE NOMBRA AL DEPARTAMENTO QUE LO REGISTRÓ, porque es a quien hay que pedirle el
 * cambio. «No puede editarlo» a secas obliga a levantar el teléfono para averiguar a
 * quién llamar, que es el canal que este sistema existe para reemplazar.
 */
export const motivoDeSoloLectura = (
  acceso: AccesoAlOperativo,
  creadoPorRol: string,
): string | null => {
  if (acceso === "PARTICIPA") {
    return `Este operativo lo registró ${creadoPorRol}. Cada departamento edita y retira los suyos; usted puede asignar personal.`;
  }
  if (acceso === "AJENO") {
    return "Este operativo pertenece a otro departamento.";
  }
  return null;
};
