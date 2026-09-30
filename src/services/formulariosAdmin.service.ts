/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios y catálogos
 * Archivo: formulariosAdmin.service.ts
 * Responsabilidad: Consumir el CRUD de formularios de administración (crear/editar/baja).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-29
 *
 * Todo por `httpClient` (nunca `axios` directo). Lo que administra esta pantalla es el
 * formulario en sí —no un catálogo—: `/administracion/formularios`, bajo el permiso
 * `catalogos:administrar`, el mismo del resto de la administración del cuadro.
 */

import httpClient from "../api/httpClient";
import type {
  ActualizarFormulario,
  ColorPaleta,
  CrearFormulario,
  FormularioAdmin,
} from "../interfaces/Formulario";

/** Respuesta de la baja: que quedó inactivo y cuántos operativos históricos conserva. */
export interface ResultadoBajaFormulario {
  usosHistoricos: number;
  mensaje: string;
}

/** `GET /administracion/formularios`. Todos, incluidos los dados de baja. */
const listar = async (): Promise<FormularioAdmin[]> => {
  const { data } = await httpClient.get<FormularioAdmin[]>(
    "/administracion/formularios",
  );
  return data;
};

/** `GET /administracion/formularios/paleta`. Los colores institucionales a elegir. */
const obtenerPaleta = async (): Promise<ColorPaleta[]> => {
  const { data } = await httpClient.get<ColorPaleta[]>(
    "/administracion/formularios/paleta",
  );
  return data;
};

/** `POST /administracion/formularios`. Da de alta un formulario nuevo. */
const crear = async (formulario: CrearFormulario): Promise<FormularioAdmin> => {
  const { data } = await httpClient.post<FormularioAdmin>(
    "/administracion/formularios",
    formulario,
  );
  return data;
};

/** `PUT /administracion/formularios/:codigo`. Edita o reactiva (`activo: true`). */
const actualizar = async (
  codigo: string,
  cambios: ActualizarFormulario,
): Promise<FormularioAdmin> => {
  const { data } = await httpClient.put<FormularioAdmin>(
    `/administracion/formularios/${codigo}`,
    cambios,
  );
  return data;
};

/** `DELETE /administracion/formularios/:codigo`. Baja lógica (nunca borra). */
const darDeBaja = async (codigo: string): Promise<ResultadoBajaFormulario> => {
  const { data } = await httpClient.delete<ResultadoBajaFormulario>(
    `/administracion/formularios/${codigo}`,
  );
  return data;
};

export const FormulariosAdminService = {
  listar,
  obtenerPaleta,
  crear,
  actualizar,
  darDeBaja,
};
