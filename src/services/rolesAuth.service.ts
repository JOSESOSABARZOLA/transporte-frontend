/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Homologación de roles
 * Archivo: rolesAuth.service.ts
 * Responsabilidad: Consumir la administración de la correspondencia con Auth central.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * Todas las llamadas van por `httpClient`, nunca por `axios` directo: es donde viven la
 * cookie de sesión, la correlación y el tratamiento del 401.
 */

import { httpClient } from "../api/httpClient.ts";
import type {
  ActualizarRolAuth,
  BajaRolAuth,
  CrearRolAuth,
  PanoramaRolesAuth,
  RolAuth,
} from "../interfaces/RolAuth.ts";

const RUTA = "/administracion/roles-auth";

const consultar = async (): Promise<PanoramaRolesAuth> => {
  const { data } = await httpClient.get<PanoramaRolesAuth>(RUTA);
  return data;
};

const crear = async (datos: CrearRolAuth): Promise<RolAuth> => {
  const { data } = await httpClient.post<RolAuth>(RUTA, datos);
  return data;
};

const actualizar = async (
  idAuth: number,
  cambios: ActualizarRolAuth,
): Promise<RolAuth> => {
  const { data } = await httpClient.put<RolAuth>(`${RUTA}/${idAuth}`, cambios);
  return data;
};

const desactivar = async (idAuth: number): Promise<BajaRolAuth> => {
  const { data } = await httpClient.delete<BajaRolAuth>(`${RUTA}/${idAuth}`);
  return data;
};

export const RolesAuthService = {
  consultar,
  crear,
  actualizar,
  desactivar,
};
