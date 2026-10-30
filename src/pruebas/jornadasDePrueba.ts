/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración de pruebas
 * Archivo: jornadasDePrueba.ts
 * Responsabilidad: Las dos jornadas laborales que siembra el servidor, para las pruebas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 *
 * Espejo de la migración `20261023100000_jornada_laboral`: lo que antes era «nombramiento» (id 1)
 * y lo que era «ocasional» (id 2). Las usa `configuracion.ts` para simular el catálogo.
 */

import type { JornadaLaboral } from "../interfaces/JornadaLaboral.ts";

export const JORNADA_LV: JornadaLaboral = {
  id: 1,
  nombre: "Lunes a Viernes 8 horas",
  dias: [1, 2, 3, 4, 5],
  horaInicio: "08:00",
  horaFin: "16:00",
  activo: true,
  funcionarios: 0,
  conductores: 0,
};

export const JORNADA_24_7: JornadaLaboral = {
  id: 2,
  nombre: "Lunes a Domingo 24/7",
  dias: [1, 2, 3, 4, 5, 6, 7],
  horaInicio: null,
  horaFin: null,
  activo: true,
  funcionarios: 0,
  conductores: 0,
};

export const JORNADAS_DE_PRUEBA: JornadaLaboral[] = [JORNADA_LV, JORNADA_24_7];
