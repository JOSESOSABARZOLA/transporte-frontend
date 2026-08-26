/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Cuentas del módulo
 * Archivo: usuariosCuadro.service.ts
 * Responsabilidad: Consumir la administración de cuentas del Cuadro de Colores.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * Todas las llamadas van por `httpClient`, nunca por `axios` directo: es donde viven la
 * cookie de sesión, la correlación y el tratamiento del 401.
 */

import { httpClient } from "../api/httpClient.ts";
import type {
  ActualizarUsuarioCuadro,
  CrearUsuarioCuadro,
  UsuarioCuadro,
} from "../interfaces/UsuarioCuadro.ts";

const RUTA = "/administracion/usuarios";

const listar = async (): Promise<UsuarioCuadro[]> => {
  const { data } = await httpClient.get<UsuarioCuadro[]>(RUTA);
  return data;
};

const crear = async (datos: CrearUsuarioCuadro): Promise<UsuarioCuadro> => {
  const { data } = await httpClient.post<UsuarioCuadro>(RUTA, datos);
  return data;
};

const actualizar = async (
  id: number,
  cambios: ActualizarUsuarioCuadro,
): Promise<UsuarioCuadro> => {
  const { data } = await httpClient.put<UsuarioCuadro>(`${RUTA}/${id}`, cambios);
  return data;
};

const desactivar = async (id: number): Promise<UsuarioCuadro> => {
  const { data } = await httpClient.delete<UsuarioCuadro>(`${RUTA}/${id}`);
  return data;
};

export const UsuariosCuadroService = {
  listar,
  crear,
  actualizar,
  desactivar,
};
