/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Turnos de conductores
 * Archivo: configTurnosConductores.ts
 * Responsabilidad: Configurar la matriz común (`MatrizCobertura`) para los turnos mensuales de conductores.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * La matriz es la MISMA que la cobertura de Instrucción: cambian los estados, los textos y el
 * servicio. Cinco turnos —Día, Noche, ECU noche, Libre y Administrativo— y las mismas ausencias
 * (vienen de la disponibilidad y no se editan aquí). Cada estado lleva su LETRA, así que el color
 * nunca es la única señal (regla 6).
 *
 * Vive en un `.ts` aparte para que la página exporte solo su componente (react-refresh).
 */

import { CONFIG_INSTRUCCION, type ConfigMatriz } from "../personal/cobertura/configMatriz.ts";
import { turnoDeLetra, type LetraTurno } from "../../utils/paletaTurnos.util.ts";
import { TurnosConductoresService } from "../../services/turnosConductores.service.ts";

/** El color de cada letra sale de la paleta compartida con «Flota y garajes». */
const claseDe = (letra: LetraTurno): string => turnoDeLetra(letra)?.clase ?? "";

export const CONFIG_CONDUCTORES: ConfigMatriz = {
  titulo: "Turnos de conductores",
  contexto: "Turnos de conductores",
  sujeto: {
    singular: "conductor",
    plural: "conductores",
    columna: "Conductor",
    buscar: "Buscar conductor",
  },
  grupo: {
    singular: "sector",
    plural: "sectores",
    sinGrupo: "Sin sector",
    filtro: "Sector",
  },
  banner:
    "D Día · N Noche · E ECU noche · L Libre · A Administrativo. La asignación de transporte solo ofrece al conductor en el turno que tenga ese día; vacía, sin turno cargado.",
  nota: "La carga el jefe de la DAF antes de fin de mes.",
  consecuenciaVacias: "esos días el conductor queda sin turno cargado",
  vacio:
    "No hay conductores activos. Regístrelos en «Flota y garajes».",
  cargando: "Cargando los turnos…",
  nombreGrilla: "Turnos de conductores",
  estados: [
    {
      valor: "DIA",
      letra: "D",
      nombre: "Día",
      teclas: ["D"],
      clase: claseDe("D"),
      leyenda: "D Día",
    },
    {
      valor: "NOCHE",
      letra: "N",
      nombre: "Noche",
      teclas: ["N"],
      clase: claseDe("N"),
      leyenda: "N Noche",
    },
    {
      valor: "ECU_NOCHE",
      letra: "E",
      nombre: "ECU noche",
      teclas: ["E"],
      clase: claseDe("E"),
      leyenda: "E ECU noche",
    },
    {
      valor: "LIBRE",
      letra: "L",
      nombre: "Libre",
      teclas: ["L"],
      clase: claseDe("L"),
      leyenda: "L Libre",
    },
    {
      valor: "ADMINISTRATIVO",
      letra: "A",
      nombre: "Administrativo",
      teclas: ["A"],
      clase: claseDe("A"),
      leyenda: "A Administrativo",
    },
  ],
  // Las ausencias son las mismas del maestro: vacaciones, reposo, calamidad y permiso.
  ausencias: CONFIG_INSTRUCCION.ausencias,
  activos: ["DIA", "NOCHE", "ECU_NOCHE"],
  pie: [
    { valor: "DIA", clave: "dia", rotulo: "Día", minimo: "dia" },
    { valor: "NOCHE", clave: "noche", rotulo: "Noche", minimo: "noche" },
    { valor: "ECU_NOCHE", clave: "ecu-noche", rotulo: "ECU noche" },
    { valor: "LIBRE", clave: "libre", rotulo: "Libres" },
    { valor: "ADMINISTRATIVO", clave: "administrativo", rotulo: "Administrativos" },
  ],
  patronesRapidos: [
    { nombre: "5D + 2L", patron: "DDDDDLL" },
    { nombre: "4D + 2N + 2L", patron: "DDDDNNLL" },
    { nombre: "3D + 3N + 2L", patron: "DDDNNNLL" },
    { nombre: "5N + 2L", patron: "NNNNNLL" },
  ],
  ayudaPatron: "Patrón libre (D, N, E, L y A; de 2 a 14 letras)",
  conDenominacion: false,
  conCambiarGrupo: false,
  nombreArchivo: (mes, formato = "xlsx") => `turnos-conductores-${mes}.${formato}`,
  servicio: TurnosConductoresService,
  copiarMesAnterior: true,
  avisoSinTurnoCompacto: true,
  cerosAtenuados: true,
  subtotalCompacto: true,
  exportarPublicado: true,
  rutaParametros: "/home/administracion/ventanas",
};
