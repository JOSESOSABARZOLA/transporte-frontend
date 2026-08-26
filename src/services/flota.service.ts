/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: flota.service.ts
 * Responsabilidad: Consumir el mantenimiento de conductores y vehículos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOS OCHO ENDPOINTS YA EXISTÍAN. Lo que faltaba era la pantalla.
 *
 * `AdministracionFlotaController` está en el servidor desde M-17 con el CRUD completo y
 * `@Roles(ADMINISTRADOR)`, y hasta el 2026-08-20 **solo se podía usar con curl o Postman**:
 * el manual del administrador lo decía con todas las letras —«se administran por API. No
 * hay pantalla»— y era la limitación L-11. Este servicio no inventa contrato ninguno;
 * consume el que ya estaba.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SERVICIO PROPIO Y NO UNA AMPLIACIÓN DE `transporte.service.ts`, por el mismo criterio
 * con el que `administracion.service.ts` se separó en su día: aquel sirve a la DAF en el
 * ciclo diario del cuadro y éste al administrador en el mantenimiento del maestro. Son dos
 * perfiles, dos pantallas y dos momentos; mezclarlos haría que la pantalla de la DAF
 * arrastrase en su fragmento diferido un CRUD que nunca va a llamar.
 *
 * SE LISTA SIEMPRE CON `incluirInactivos=true`, y la pantalla los atenúa **y los rotula**.
 * Esconder lo inactivo hace que quien busca un conductor que no aparece concluya que se
 * borró, y lo vuelva a dar de alta: entonces la cédula choca y el sistema parece averiado.
 */

import httpClient from "../api/httpClient";
import type {
  ActualizarConductor,
  ActualizarVehiculo,
  BajaDeFlota,
  ConductorCreado,
  CrearConductor,
  CrearVehiculo,
} from "../interfaces/Flota";
import type { Conductor, Vehiculo } from "../interfaces/Transporte";

// ─────────────────────────── Conductores ───────────────────────────

/** `GET /administracion/conductores?incluirInactivos=`. */
const listarConductores = async (
  incluirInactivos = true,
): Promise<Conductor[]> => {
  const { data } = await httpClient.get<Conductor[]>(
    "/administracion/conductores",
    { params: { incluirInactivos } },
  );
  return data;
};

/**
 * `POST /administracion/conductores`.
 *
 * Devuelve solo `{ id, nombreCompleto }`, no la ficha completa. Quien llame debe releer
 * la lista para tener el registro entero; la pantalla ya lo hace.
 */
const crearConductor = async (
  conductor: CrearConductor,
): Promise<ConductorCreado> => {
  const { data } = await httpClient.post<ConductorCreado>(
    "/administracion/conductores",
    conductor,
  );
  return data;
};

/** `PATCH /administracion/conductores/:id`. Devuelve lo mismo que el alta. */
const actualizarConductor = async (
  id: number,
  cambios: ActualizarConductor,
): Promise<ConductorCreado> => {
  const { data } = await httpClient.patch<ConductorCreado>(
    `/administracion/conductores/${id}`,
    cambios,
  );
  return data;
};

/**
 * `DELETE /administracion/conductores/:id`. Baja **lógica**.
 *
 * El conductor deja de ofrecerse en el desplegable de la DAF y **conserva los operativos
 * en los que ya figura**: por eso la respuesta trae el recuento y el motivo redactados
 * por el servidor.
 *
 * **No hay vuelta atrás desde la aplicación.** El contrato de edición no admite `activo`,
 * así que reactivarlo exigiría tocar la base. La pantalla lo advierte antes de confirmar.
 */
const desactivarConductor = async (
  id: number,
): Promise<BajaDeFlota<{ id: number; activo: boolean }>> => {
  const { data } = await httpClient.delete<
    BajaDeFlota<{ id: number; activo: boolean }>
  >(`/administracion/conductores/${id}`);
  return data;
};

// ─────────────────────────── Vehículos ───────────────────────────

/** `GET /administracion/vehiculos?incluirInactivos=`. */
const listarVehiculos = async (incluirInactivos = true): Promise<Vehiculo[]> => {
  const { data } = await httpClient.get<Vehiculo[]>(
    "/administracion/vehiculos",
    { params: { incluirInactivos } },
  );
  return data;
};

/** `POST /administracion/vehiculos`. Éste sí devuelve el registro completo. */
const crearVehiculo = async (vehiculo: CrearVehiculo): Promise<Vehiculo> => {
  const { data } = await httpClient.post<Vehiculo>(
    "/administracion/vehiculos",
    vehiculo,
  );
  return data;
};

/** `PATCH /administracion/vehiculos/:id`. */
const actualizarVehiculo = async (
  id: number,
  cambios: ActualizarVehiculo,
): Promise<Vehiculo> => {
  const { data } = await httpClient.patch<Vehiculo>(
    `/administracion/vehiculos/${id}`,
    cambios,
  );
  return data;
};

/** `DELETE /administracion/vehiculos/:id`. Baja lógica, y tampoco reversible. */
const desactivarVehiculo = async (
  id: number,
): Promise<BajaDeFlota<Vehiculo>> => {
  const { data } = await httpClient.delete<BajaDeFlota<Vehiculo>>(
    `/administracion/vehiculos/${id}`,
  );
  return data;
};

export const FlotaService = {
  listarConductores,
  crearConductor,
  actualizarConductor,
  desactivarConductor,
  listarVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  desactivarVehiculo,
};
