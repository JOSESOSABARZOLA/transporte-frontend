/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: administracion.service.ts
 * Responsabilidad: Consumir los parámetros de política y las ventanas de carga.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * SERVICIO PROPIO Y NO UNA AMPLIACIÓN DE `CatalogoCuadroService`. El plan admitía las dos
 * cosas; se separa porque lo que hay aquí no son catálogos del cuadro sino **la
 * configuración que gobierna el sistema entero**: los umbrales con los que se decide si
 * una persona puede salir, y las horas a las que cada departamento deja de cargar.
 * Mezclarlos habría dejado en un mismo archivo lo que cualquiera consulta y lo que solo
 * el ADMINISTRADOR puede tocar.
 *
 * NO HAY `POST` NI `DELETE` DE VENTANAS, y no falta nada: el contrato no los tiene. Hay
 * una ventana por rol y son seis, fijas.
 */

import httpClient from "../api/httpClient";
import type {
  ActualizarParametro,
  ActualizarVentana,
  ParametroPolitica,
  VentanaActualizada,
  VentanaCarga,
} from "../interfaces/Administracion";
import type { RolDepartamental } from "../config/env";

/** `GET /parametros`. Los siete umbrales, con su rango y su descripción. */
const listarParametros = async (): Promise<ParametroPolitica[]> => {
  const { data } = await httpClient.get<ParametroPolitica[]>("/parametros");
  return data;
};

/** `PUT /parametros/:clave`. Una sola propiedad: el rango lo fija el diseño, no quien edita. */
const actualizarParametro = async (
  clave: string,
  cambio: ActualizarParametro,
): Promise<ParametroPolitica> => {
  const { data } = await httpClient.put<ParametroPolitica>(
    `/parametros/${clave}`,
    cambio,
  );
  return data;
};

/** `GET /administracion/ventanas`. Las seis, completas. */
const listarVentanas = async (): Promise<VentanaCarga[]> => {
  const { data } = await httpClient.get<VentanaCarga[]>(
    "/administracion/ventanas",
  );
  return data;
};

/**
 * `PUT /administracion/ventanas/:rol`.
 *
 * Devuelve la ventana guardada **y las advertencias**: el servidor puede aceptar un
 * cambio y avisar de que deja la jornada sin margen. Se muestran; no impiden nada.
 */
const actualizarVentana = async (
  rol: RolDepartamental,
  cambios: ActualizarVentana,
): Promise<VentanaActualizada> => {
  const { data } = await httpClient.put<VentanaActualizada>(
    `/administracion/ventanas/${rol}`,
    cambios,
  );
  return data;
};

export const AdministracionService = {
  listarParametros,
  actualizarParametro,
  listarVentanas,
  actualizarVentana,
};
