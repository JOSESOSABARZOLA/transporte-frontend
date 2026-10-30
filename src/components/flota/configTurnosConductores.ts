/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Turnos de conductores
 * Archivo: configTurnosConductores.ts
 * Responsabilidad: Configurar la matriz común (`MatrizCobertura`) para los turnos mensuales de conductores.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * La matriz es la MISMA que la cobertura de Instrucción: cambian los estados, los textos, los
 * horarios tipo y el servicio. Cinco turnos —Día, Noche, ECU noche, Libre y Administrativo— y las
 * mismas ausencias (vienen de la disponibilidad y no se editan aquí). Cada estado lleva su LETRA,
 * así que el color nunca es la única señal (regla 6).
 *
 * Vive en un `.ts` aparte para que la página exporte solo su componente (react-refresh).
 */

import { CONFIG_INSTRUCCION, type ConfigMatriz } from "../personal/cobertura/configMatriz.ts";
import { turnoDeLetra, type LetraTurno } from "../../utils/paletaTurnos.util.ts";
import { TurnosConductoresService } from "../../services/turnosConductores.service.ts";

/** El color de cada letra sale de la paleta compartida con «Flota y garajes». */
const claseDe = (letra: LetraTurno): string => turnoDeLetra(letra)?.clase ?? "";

export const CONFIG_CONDUCTORES: ConfigMatriz = {
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
  explicacion:
    "La asignación de transporte solo ofrece al conductor en el turno que tenga ese día; vacía, sin turno cargado.",
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
      significado: "Día",
    },
    {
      valor: "NOCHE",
      letra: "N",
      nombre: "Noche",
      teclas: ["N"],
      clase: claseDe("N"),
      significado: "Noche",
    },
    {
      valor: "ECU_NOCHE",
      letra: "E",
      nombre: "ECU noche",
      teclas: ["E"],
      clase: claseDe("E"),
      significado: "ECU noche",
    },
    {
      valor: "LIBRE",
      letra: "L",
      nombre: "Libre",
      teclas: ["L"],
      clase: claseDe("L"),
      significado: "Libre",
    },
    {
      valor: "ADMINISTRATIVO",
      letra: "A",
      nombre: "Administrativo",
      teclas: ["A"],
      clase: claseDe("A"),
      significado: "Administrativo",
    },
  ],
  // Las ausencias son las mismas del maestro: vacaciones, reposo, calamidad y permiso.
  ausencias: CONFIG_INSTRUCCION.ausencias,
  estadoDia: "DIA",
  estadoDescanso: "LIBRE",
  pie: [
    { valor: "DIA", clave: "dia", rotulo: "Día", principal: true, minimo: "dia" },
    { valor: "NOCHE", clave: "noche", rotulo: "Noche", principal: true, minimo: "noche" },
    { valor: "ECU_NOCHE", clave: "ecu-noche", rotulo: "ECU noche" },
    { valor: "LIBRE", clave: "libre", rotulo: "Libres" },
    { valor: "ADMINISTRATIVO", clave: "administrativo", rotulo: "Administrativos" },
  ],
  patronesRapidos: [
    { nombre: "5 de día + 2 libres", descripcion: "Ciclo de 7 días", patron: "DDDDDLL" },
    { nombre: "4 día · 2 noche · 2 libres", descripcion: "Rotativo de 8 días", patron: "DDDDNNLL" },
    { nombre: "3 día · 3 noche · 2 libres", descripcion: "Rotativo de 8 días", patron: "DDDNNNLL" },
    { nombre: "5 noches + 2 libres", descripcion: "Ciclo de 7 días", patron: "NNNNNLL" },
  ],
  conDenominacion: false,
  conCambiarGrupo: false,
  nombreArchivo: (mes, formato = "xlsx") => `turnos-conductores-${mes}.${formato}`,
  servicio: TurnosConductoresService,
  copiarMesAnterior: true,
  exportarPublicado: true,
  rutaParametros: "/home/administracion/ventanas",
};
