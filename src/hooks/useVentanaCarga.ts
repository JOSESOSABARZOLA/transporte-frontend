/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas de carga
 * Archivo: useVentanaCarga.ts
 * Responsabilidad: Exponer si el rol activo puede escribir ahora, y hasta cuándo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * RN-56. La ventana no es una preferencia: a las 15H00 el departamento deja de cargar.
 * Este hook permite **avisar antes** de que el funcionario capture un operativo entero
 * para recibir un `423` al guardar.
 *
 * NO SUSTITUYE A LA GUARDA. `VentanaCargaGuard` sigue rechazando en el servidor, y debe
 * seguir haciéndolo: esto adelanta el aviso, no lo decide. Si alguna vez discrepan
 * —porque el reloj del navegador va adelantado, o porque el administrador acaba de
 * cambiar el horario— **manda el servidor**.
 *
 * SE REEVALÚA CADA MINUTO. Una ventana que vence mientras la pantalla está abierta tiene
 * que reflejarse sola: quien está escribiendo a las 14H59 no va a recargar la página
 * para enterarse de que ya no puede guardar.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CADA PANTALLA PREGUNTA POR LA VENTANA DEL ROL BAJO EL QUE OPERA · corregido el
 * 2026-08-20, por un defecto reportado con una cuenta que tenía los seis roles.
 *
 * La DAF entraba a P-03 y leía «La ventana de asignación ya cerró», con el mensaje de
 * cierre del DMIP pegado detrás. La bandeja quedaba en solo lectura **justo durante la
 * hora y media en que la DAF debe trabajar**: a las 15H00 su ventana abre y la del DMIP
 * cierra.
 *
 * El servidor respondía con la ventana del PRIMER rol de la lista, porque
 * `GET /ventanas/estado` no declara `@Roles` y `RolesGuard` no tenía nada que estrechar.
 * Con un solo rol daba igual; con seis, casi nunca acertaba.
 *
 * LA REGLA ES LA MISMA QUE APLICA `RolesGuard` EN EL SERVIDOR: de los roles que la
 * pantalla admite, el primero que la persona tenga. Esa simetría es lo que impide que la
 * vista y la guarda vuelvan a mirar ventanas distintas — porque cuando esa pantalla
 * escriba, la guarda elegirá exactamente este mismo rol.
 *
 * SIN ROLES DECLARADOS SE CONSERVA EL COMPORTAMIENTO ANTERIOR. No es una comodidad: hay
 * pantallas sin un rol propio, y para ellas el rol efectivo de la sesión es la respuesta
 * correcta.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect } from "react";

import { CatalogoCuadroService } from "../services/catalogoCuadro.service";
import type { RolDepartamental } from "../config/env";
import type { EstadoVentana } from "../interfaces/Formulario";
import { useConsulta } from "./useConsulta";
import { useUser } from "./useUser";
import { comoHoraInstitucional } from "../utils/horario.util";
import {
  cuentaAtrasDeVentana,
  type CuentaAtrasDeVentana,
} from "../utils/ventanaCarga.util";
import type { ErrorPresentado } from "../utils/errorApi.util";

/** Un minuto. La ventana se mide en horas y medias horas: no hace falta más fino. */
const INTERVALO_MS = 60_000;

export interface UsoVentanaCarga {
  ventana: EstadoVentana | null;
  cargando: boolean;
  error: ErrorPresentado | null;
  /** Falso mientras carga: no se habilita un formulario sin saber si la ventana está abierta. */
  puedeEscribir: boolean;
  /** El texto del servidor, redactado para el funcionario. */
  mensaje: string;
  /** `15H00`, para el aviso de bloqueo. Nulo si la ventana no tiene cierre. */
  horaCierre: string | null;
  /**
   * Cuánto falta para el cierre, con su tono. Nulo si no hay nada que contar.
   *
   * SE RECALCULA CON EL MISMO PULSO QUE LA CONSULTA: el temporizador de un minuto que ya
   * existía provoca el render, y la cuenta atrás se rehace con él. No hace falta un
   * segundo reloj, y tenerlo habría abierto la puerta a que los dos discreparan.
   */
  cuentaAtras: CuentaAtrasDeVentana | null;
  recargar: () => void;
}

/**
 * @param rolesDeLaPantalla roles bajo los que esta pantalla opera, **en el orden en que
 *   los declara el endpoint que va a escribir**. Se pregunta por el primero que la
 *   persona tenga. Omitirlo deja que responda el rol efectivo de la sesión.
 */
export const useVentanaCarga = (
  rolesDeLaPantalla?: readonly RolDepartamental[],
): UsoVentanaCarga => {
  const { user } = useUser();

  // Misma elección que `RolesGuard`: el primero que el endpoint admite y la persona
  // tiene. `undefined` cuando la pantalla no declara roles, o cuando no tiene ninguno de
  // ellos —caso en el que preguntar por uno ajeno daría 403 y no diría nada útil—.
  const rol = rolesDeLaPantalla?.find((candidato) =>
    user?.rolCodes.includes(candidato),
  );

  const consulta = useCallback(
    () => CatalogoCuadroService.obtenerMiVentana(rol),
    [rol],
  );

  const { datos, cargando, error, recargar } =
    useConsulta<EstadoVentana>(consulta);

  useEffect(() => {
    const temporizador = window.setInterval(recargar, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
    // `recargar` cambia en cada render del hook base; incluirla reiniciaría el
    // temporizador continuamente. La consulta no depende de nada más, así que basta con
    // programarlo una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ventana: datos,
    cargando,
    error,
    puedeEscribir: !cargando && (datos?.abierta ?? false),
    mensaje: datos?.mensaje ?? "",
    horaCierre: datos?.horaCierre
      ? comoHoraInstitucional(datos.horaCierre)
      : null,
    cuentaAtras: cuentaAtrasDeVentana(datos),
    recargar,
  };
};
