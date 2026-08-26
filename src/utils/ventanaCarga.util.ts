/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas de carga
 * Archivo: ventanaCarga.util.ts
 * Responsabilidad: Distinguir «todavía no» de «ya no», solo para redactar el aviso.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO DECIDE SI SE PUEDE ESCRIBIR. ESO YA VIENE DECIDIDO.
 *
 * `GET /ventanas/estado` devuelve `abierta`, y esa es la única palabra que gobierna si
 * los controles se habilitan. Aquí solo se elige **cuál de dos frases** acompaña a una
 * ventana cerrada, porque el servidor devuelve un único `mensajeCierre` y los casos 7 y 8
 * del plan piden decir cosas distintas:
 *
 *   · Antes de las 15H00 → «aún no es su turno». La DAF no ha perdido nada: espera.
 *   · Después de las 16H30 → «la ventana ya cerró». La DAF sí llegó tarde.
 *
 * Confundirlas hace que alguien crea que se le pasó el plazo cuando todavía faltan dos
 * horas, y llame por teléfono a preguntar.
 *
 * El mensaje del servidor **se sigue mostrando tal cual** (regla 7 de CLAUDE.md); esto lo
 * acompaña, no lo sustituye.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SE MIDE EN LA ZONA DE LA VENTANA, no en la del navegador. `zonaHoraria` viaja en la
 * respuesta justamente para eso: comparar contra la hora local de la máquina daría un
 * resultado silenciosamente equivocado en cuanto alguien abriera el sistema desde otro
 * huso.
 */

import type { EstadoVentana } from "../interfaces/Formulario";

export type MomentoDeVentana =
  /** La ventana no restringe: no hay horario configurado o está desactivado. */
  | "SIN_RESTRICCION"
  /** Se puede escribir ahora. */
  | "DENTRO"
  /** Cerrada, y todavía no ha abierto hoy. */
  | "ANTES"
  /** Cerrada, y ya pasó su hora. */
  | "DESPUES"
  /** Cerrada, pero no se puede afirmar de qué lado. Se muestra solo el mensaje del servidor. */
  | "FUERA";

/** `HH:MM` a minutos desde medianoche. */
const aMinutos = (hora: string): number => {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
};

/** Hora actual, en minutos, dentro de la zona declarada por la ventana. */
export const minutosEnZona = (zona: string, ahora: Date): number => {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ahora);

  return aMinutos(partes);
};

export const momentoRespectoDeVentana = (
  ventana: EstadoVentana | null,
  ahora: Date = new Date(),
): MomentoDeVentana => {
  if (!ventana || !ventana.activo) return "SIN_RESTRICCION";
  if (ventana.abierta) return "DENTRO";

  const { horaApertura, horaCierre } = ventana;

  // Una ventana semanal —de lunes a viernes, por ejemplo— no se resuelve comparando solo
  // la hora, y adivinarlo daría un aviso equivocado el fin de semana. Se calla y deja
  // hablar al servidor.
  if (ventana.diaApertura !== null || ventana.diaCierre !== null) return "FUERA";

  if (!horaApertura || !horaCierre) return "FUERA";

  const apertura = aMinutos(horaApertura);
  const cierre = aMinutos(horaCierre);

  // Ventana que cruza la medianoche: estar fuera significa a la vez «después del cierre»
  // y «antes de la próxima apertura», y lo útil es lo segundo, que dice cuándo volver.
  if (apertura > cierre) return "ANTES";

  return minutosEnZona(ventana.zonaHoraria, ahora) < apertura
    ? "ANTES"
    : "DESPUES";
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CUÁNTO QUEDA PARA EL CIERRE. 2026-08-25.
 *
 * Hasta hoy la ventana **solo se anunciaba cuando ya había cerrado**. Quien empezaba a
 * capturar un operativo a las 14H55 no tenía forma de saberlo: se enteraba al guardar,
 * con un `423`, y con el formulario entero escrito.
 *
 * RN-56 no es una preferencia —a las 15H00 el departamento deja de cargar—, así que el
 * aviso tiene que llegar **mientras todavía se puede hacer algo con él**.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ES UN SEMÁFORO, Y SE LEE COMO TAL:
 *
 *   · `HOLGADA`  — **verde.** Falta más de una hora. Informa, no interrumpe.
 *   · `PROXIMA`  — **amarillo.** Entre treinta minutos y una hora. Conviene no empezar
 *                  nada que no vaya a terminar.
 *   · `INMINENTE`— **rojo.** Media hora o menos. Lo que no esté guardado, se pierde.
 *
 * Media hora es el umbral pedido por el negocio, y tiene sentido operativo: capturar un
 * operativo con su personal lleva varios minutos, así que a los treinta ya no da tiempo a
 * empezar uno nuevo con holgura.
 *
 * NO DECIDE NADA, Y ESO IMPORTA. `puedeEscribir` sigue saliendo de `abierta`, que lo dice
 * el servidor. Esto es texto: si el reloj del navegador va adelantado, la cuenta atrás se
 * equivoca y la guarda no. Por eso se mide en la zona de la ventana —`minutosEnZona`— y
 * no en la del navegador, igual que `momentoRespectoDeVentana`.
 */
export type UrgenciaDeCierre = "HOLGADA" | "PROXIMA" | "INMINENTE";

export interface CuentaAtrasDeVentana {
  minutosRestantes: number;
  urgencia: UrgenciaDeCierre;
  /**
   * Lo que queda, en corto: `2 h 20 min` · `55 min` · `8 min`.
   *
   * VA SEPARADO DEL RESTO A PROPÓSITO. La cifra es lo único que hay que leer de un
   * vistazo, y la pantalla la destaca; la frase explica qué hacer con ella. Juntas en una
   * sola cadena, el número se perdía dentro del párrafo.
   */
  tiempo: string;
  /** Lo que sigue a la cifra. Empieza en minúscula: es la misma oración. */
  texto: string;
}

/**
 * Umbrales, en minutos. Cambiarlos es cambiar solo estas dos líneas.
 *
 * `UMBRAL_INMINENTE` pasó de 15 a **30** el 2026-08-25, por decisión del negocio: media
 * hora es lo que hace falta para capturar un operativo entero con su personal, así que
 * por debajo de eso ya no da tiempo a empezar otro.
 */
const UMBRAL_PROXIMA = 60;
const UMBRAL_INMINENTE = 30;

const MINUTOS_DEL_DIA = 24 * 60;

/**
 * Lo que queda, en `hh:mm`: `135` → `02:15` · `45` → `00:45` · `4` → `00:04`.
 *
 * ES UN RELOJ, NO UNA FRASE. Se probó primero con «2 h 15 min», y leído deprisa dentro de
 * un párrafo se confundía con la hora de cierre. Dos cifras a dos dígitos, siempre en el
 * mismo sitio y con el mismo ancho, se comparan de un vistazo entre una visita y la
 * siguiente: `00:28` y `00:04` se distinguen sin leer.
 */
export const comoTiempoRestante = (minutos: number): string => {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  const aDosCifras = (valor: number): string => String(valor).padStart(2, "0");

  return `${aDosCifras(horas)}:${aDosCifras(resto)}`;
};

/**
 * La cuenta atrás, o `null` si no hay nada que contar.
 *
 * Devuelve `null` —y la pantalla no pinta nada— cuando la ventana no restringe, cuando
 * está cerrada —de eso ya avisa el mensaje del servidor— y cuando **no se puede afirmar
 * cuánto falta**: una ventana con días de apertura no se resuelve comparando horas, y
 * adivinarlo daría una cuenta atrás falsa. Callarse es la respuesta correcta.
 */
export const cuentaAtrasDeVentana = (
  ventana: EstadoVentana | null,
  ahora: Date = new Date(),
): CuentaAtrasDeVentana | null => {
  if (!ventana || !ventana.activo || !ventana.abierta) return null;
  if (ventana.diaApertura !== null || ventana.diaCierre !== null) return null;
  if (!ventana.horaCierre) return null;

  const cierre = aMinutos(ventana.horaCierre);
  const actual = minutosEnZona(ventana.zonaHoraria, ahora);

  /*
    Ventana que cruza la medianoche —22H00 a 02H00—: estando dentro y ya pasada la hora
    de cierre del reloj, lo que falta se cuenta hasta el cierre **del día siguiente**.
    Sin esto, una ventana nocturna daría minutos negativos justo cuando se está usando.
  */
  /*
    ═══════════════════════════════════════════════════════════════════════════════
    LA VUELTA DE MEDIANOCHE SOLO SE APLICA SI LA VENTANA CRUZA MEDIANOCHE DE VERDAD.

    Y eso exige tener hora de apertura, que **las tres ventanas departamentales no
    tienen**: en la base, `DMIP_OPERATIVOS`, `DMIP_INSPECCIONES` y `DMIT_INSTRUCTOR`
    cierran a las 15H00 con `vcar_hora_apertura` en nulo —cargan desde medianoche—. Solo
    la de la DAF declara las dos horas, 15H00 a 16H30.

    Sin esta comprobación, un reloj adelantado o una discrepancia con el servidor daba
    «Falta 23:00» a las 16H00: la resta se iba al día siguiente porque no había con qué
    distinguir una ventana nocturna de una hora ya pasada. Se prefiere **callar**: quien
    manda sobre si se puede escribir es `abierta`, que lo dice el servidor.
    ═══════════════════════════════════════════════════════════════════════════════
  */
  const cruzaMedianoche =
    ventana.horaApertura !== null && aMinutos(ventana.horaApertura) > cierre;

  const restantes =
    cierre >= actual
      ? cierre - actual
      : cruzaMedianoche
        ? cierre + MINUTOS_DEL_DIA - actual
        : 0;

  // El servidor ya la dio por abierta; si la resta no deja nada, manda él y no se avisa.
  if (restantes <= 0) return null;

  /*
    LA HORA VA EN NOTACIÓN INSTITUCIONAL —`15H00`—, no `15:00`. Es la que usan la matriz,
    la orden de servicio, los avisos y los manuales; escribirla aquí de otro modo haría de
    este el único sitio del sistema que la dice distinto. Y separarla en el texto de la
    cuenta atrás, que sí va en `hh:mm`, evita leer dos relojes con el mismo formato.
  */
  const hora = ventana.horaCierre.replace(":", "H");
  const tiempo = comoTiempoRestante(restantes);
  const comun = `para cerrar la ventana, está activa hasta las ${hora}.`;

  if (restantes <= UMBRAL_INMINENTE) {
    return {
      minutosRestantes: restantes,
      urgencia: "INMINENTE",
      tiempo,
      texto: `${comun} Guarde lo que tenga capturado: después no podrá registrar ni editar.`,
    };
  }

  if (restantes <= UMBRAL_PROXIMA) {
    return {
      minutosRestantes: restantes,
      urgencia: "PROXIMA",
      tiempo,
      texto: `${comun} No empiece un operativo que no vaya a terminar.`,
    };
  }

  return {
    minutosRestantes: restantes,
    urgencia: "HOLGADA",
    tiempo,
    texto: comun,
  };
};
