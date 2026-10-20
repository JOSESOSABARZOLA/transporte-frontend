/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Barras azules
 * Archivo: barraOscura.ts
 * Responsabilidad: Avisar a `Boton` e `Insignia` de que se pintan sobre una barra azul (cabecera y
 *                  pie del cajón estándar), para que tomen su aspecto claro sin que cada llamador lo pida.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { createContext } from "react";

/** `true` dentro de una barra azul (`app-cajon-barra`). */
export const BarraOscuraContexto = createContext(false);
