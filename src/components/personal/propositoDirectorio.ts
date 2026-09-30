/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Directorio de Auth central
 * Archivo: propositoDirectorio.ts
 * Responsabilidad: Decir qué se viene a crear al elegir del directorio.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-01
 *
 * VIVE EN SU PROPIO ARCHIVO Y NO EN EL DEL MODAL porque son constantes, no componentes:
 * exportarlas desde un  rompe el refresco rápido de Vite, y el lint lo dice.
 */

import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA VENTANA SIRVE A DOS PANTALLAS, Y SOLO CAMBIA EL VOCABULARIO. 2026-09-01.
 *
 * Nació el 24-AGO para P-07: elegir del directorio a quién crearle **ficha de personal**.
 * P-11 pidió lo mismo para crear **cuenta del cuadro**, y el recorrido es idéntico —buscar
 * en Auth, ver quién ya lo tiene, elegir, y una salida manual por si Auth no responde—.
 *
 * SE GENERALIZÓ EN LUGAR DE DUPLICARSE. Dos copias divergirían al primer arreglo, y esta
 * ventana ya lleva dos rondas: la paginación de cuatro filas, los cuatro estados vacíos y
 * el distintivo retirado. Mantener eso dos veces es mantenerlo mal una de las dos.
 *
 * LO QUE **NO** SE PARAMETRIZA es el comportamiento: el filtro nace activado, la salida
 * manual sigue visible con Auth caído, y el recuento sigue al filtro. Eso es la ventana;
 * lo que cambia son las palabras y a qué campo mira.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export type PropositoDirectorio = {
  /** Qué se va a crear, en minúscula: va dentro de frases. «ficha», «cuenta». */
  nombre: string;
  antetitulo: string;
  /** Rótulo del interruptor. */
  filtro: string;
  /** Distintivo del recuento: «N sin ficha». */
  contador: string;
  /** Distintivo de la fila de quien ya lo tiene, vigente y de baja. */
  yaTiene: string;
  dadoDeBaja: string;
  /** Botón de la fila. */
  crear: string;
  /** Botón del pie: la salida que no pasa por Auth. */
  salidaManual: string;
  /** Qué mira para decidir si esa persona ya lo tiene. */
  loSuyo: (fila: FilaDirectorio) => { activo: boolean } | null;
  /** Qué se muestra debajo del distintivo de quien ya lo tiene. */
  detalle: (fila: FilaDirectorio) => string;
  /** El motivo por el que NO se puede crear, o nulo si se puede. */
  impedimento: (fila: FilaDirectorio) => string | null;
};

/** P-07. Lo que falta es la ficha de personal: sin ella no se puede convocar a nadie. */
export const PARA_FICHA: PropositoDirectorio = {
  nombre: "ficha",
  antetitulo: "Nuevo funcionario · paso 1 de 2",
  filtro: "Solo quienes no tienen ficha",
  contador: "sin ficha",
  yaTiene: "Ya tiene ficha",
  dadoDeBaja: "Ficha dada de baja",
  crear: "Crear ficha",
  salidaManual: "Crear Funcionario Operativo",
  loSuyo: (fila) => fila.ficha,
  detalle: (fila) =>
    fila.ficha ? `${fila.ficha.apellidos} ${fila.ficha.nombres}` : "",
  impedimento: (fila) =>
    fila.cedula
      ? null
      : "Sin cédula en Auth no se puede crear la ficha: es la llave con la que se enlazan.",
};

/**
 * P-11. Lo que falta es la cuenta del cuadro: sin ella esa persona no puede entrar.
 *
 * EL IMPEDIMENTO NO ES LA CÉDULA SINO EL USUARIO DE AUTH, y esa es la diferencia de
 * fondo con P-07. `usua_identificador_ad` **es** el `username` de Auth y es la llave del
 * canje; la cédula solo enlaza con la ficha, que en una cuenta es opcional —quien
 * administra no sale a operativos—.
 */
export const PARA_CUENTA: PropositoDirectorio = {
  nombre: "cuenta",
  antetitulo: "Nueva cuenta · paso 1 de 2",
  filtro: "Solo quienes no tienen cuenta",
  contador: "sin cuenta",
  yaTiene: "Ya tiene cuenta",
  dadoDeBaja: "Cuenta desactivada",
  crear: "Crear cuenta",
  salidaManual: "Registrar a mano",
  loSuyo: (fila) => fila.cuenta,
  detalle: (fila) => fila.cuenta?.roles.join(", ") ?? "",
  impedimento: (fila) =>
    fila.usuario
      ? null
      : "Sin usuario de Auth no se puede crear la cuenta: es la llave con la que se entra.",
};
