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
 *
 * «FLOTA Y GARAJES» (2026-10-14) suma el resumen de indicadores, el aviso previo a la baja y
 * las tres reactivaciones. Contrato: `transporte-backend/docs/CONTRATO-flota-y-garajes.md`.
 */

import httpClient from "../api/httpClient";
import type {
  ActualizarConductor,
  ActualizarUbicacion,
  ActualizarVehiculo,
  AusenciaConductor,
  AusenciaConductorRegistrada,
  AusenciaDeLaFlota,
  BajaDeFlota,
  ConductorCreado,
  CrearConductor,
  CrearUbicacion,
  CrearVehiculo,
  ImpactoBaja,
  ResumenFlota,
} from "../interfaces/Flota";
import type { RegistrarAusencia } from "../interfaces/Personal";
import type {
  Conductor,
  UbicacionFlota,
  Vehiculo,
} from "../interfaces/Transporte";

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
 * `DELETE /administracion/conductores/:id`. Baja **lógica**: conserva los operativos en los que
 * ya figura. Con transporte asignado desde hoy responde 409 `RECURSO_CON_ASIGNACION`.
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

/**
 * `DELETE /administracion/vehiculos/:id`. Baja lógica. Deja sin vehículo habitual a sus
 * conductores (D3), y con transporte asignado desde hoy responde 409.
 */
const desactivarVehiculo = async (
  id: number,
): Promise<BajaDeFlota<Vehiculo>> => {
  const { data } = await httpClient.delete<BajaDeFlota<Vehiculo>>(
    `/administracion/vehiculos/${id}`,
  );
  return data;
};

/** `PATCH /administracion/conductores/:id/reactivar`. Sin cuerpo; idempotente. */
const reactivarConductor = async (id: number): Promise<ConductorCreado> => {
  const { data } = await httpClient.patch<ConductorCreado>(
    `/administracion/conductores/${id}/reactivar`,
  );
  return data;
};

/** `PATCH /administracion/vehiculos/:id/reactivar`. No le devuelve sus conductores habituales. */
const reactivarVehiculo = async (id: number): Promise<Vehiculo> => {
  const { data } = await httpClient.patch<Vehiculo>(
    `/administracion/vehiculos/${id}/reactivar`,
  );
  return data;
};

/** `GET /administracion/{vehiculos|conductores}/:id/impacto-baja`: el aviso antes de confirmar. */
const impactoBaja = async (
  tipo: "vehiculos" | "conductores",
  id: number,
): Promise<ImpactoBaja> => {
  const { data } = await httpClient.get<ImpactoBaja>(
    `/administracion/${tipo}/${id}/impacto-baja`,
  );
  return data;
};

/** `GET /administracion/flota/resumen`: los cuatro indicadores, en tres consultas del servidor. */
const resumen = async (): Promise<ResumenFlota> => {
  const { data } = await httpClient.get<ResumenFlota>("/administracion/flota/resumen");
  return data;
};

// ─────────── Ubicaciones de reposo de la flota · RN-DAF-03 ───────────

const listarUbicaciones = async (
  incluirInactivas = false,
): Promise<UbicacionFlota[]> => {
  const { data } = await httpClient.get<UbicacionFlota[]>(
    "/administracion/ubicaciones-flota",
    incluirInactivas ? { params: { incluirInactivas: "true" } } : undefined,
  );
  return data;
};

const crearUbicacion = async (
  ubicacion: CrearUbicacion,
): Promise<UbicacionFlota> => {
  const { data } = await httpClient.post<UbicacionFlota>(
    "/administracion/ubicaciones-flota",
    ubicacion,
  );
  return data;
};

/** Nombre y zonal. La baja y la reactivación tienen su propia ruta. */
const actualizarUbicacion = async (
  id: number,
  cambios: ActualizarUbicacion,
): Promise<UbicacionFlota> => {
  const { data } = await httpClient.patch<UbicacionFlota>(
    `/administracion/ubicaciones-flota/${id}`,
    cambios,
  );
  return data;
};

/**
 * `DELETE /administracion/ubicaciones-flota/:id`. Apaga `activo` y `garajeAutorizado` (D2): una
 * sola baja. Los destinos ya declarados se conservan.
 */
const darDeBajaUbicacion = async (id: number): Promise<UbicacionFlota> => {
  const { data } = await httpClient.delete<UbicacionFlota>(
    `/administracion/ubicaciones-flota/${id}`,
  );
  return data;
};

/** `PATCH /administracion/ubicaciones-flota/:id/reactivar`: vuelve vigente (activo y autorizado). */
const reactivarUbicacion = async (id: number): Promise<UbicacionFlota> => {
  const { data } = await httpClient.patch<UbicacionFlota>(
    `/administracion/ubicaciones-flota/${id}/reactivar`,
  );
  return data;
};

// ─────────────── Ausencias de los conductores (2026-10-16) ───────────────
// Permiso `flota:ausencias`. Contrato: `transporte-backend/docs/CONTRATO-ausencias-conductor.md`.

/** `GET /administracion/conductores/:id/ausencias`: las del conductor, con su motivo. */
const ausenciasDeConductor = async (id: number): Promise<AusenciaConductor[]> => {
  const { data } = await httpClient.get<AusenciaConductor[]>(
    `/administracion/conductores/${id}/ausencias`,
  );
  return data;
};

/**
 * `POST /administracion/conductores/:id/ausencias`. Devuelve también los tramos ya asignados en
 * el rango, que la ausencia NO retira: la pantalla avisa para reasignarlos (A5).
 */
const registrarAusenciaConductor = async (
  id: number,
  ausencia: RegistrarAusencia,
): Promise<AusenciaConductorRegistrada> => {
  const { data } = await httpClient.post<AusenciaConductorRegistrada>(
    `/administracion/conductores/${id}/ausencias`,
    ausencia,
  );
  return data;
};

/** `DELETE /administracion/conductores/:id/ausencias/:periodoId`. */
const retirarAusenciaConductor = async (
  id: number,
  periodoId: number,
): Promise<void> => {
  await httpClient.delete(
    `/administracion/conductores/${id}/ausencias/${periodoId}`,
  );
};

/**
 * `GET /administracion/conductores/ausencias?desde=`: las EN CURSO y PRÓXIMAS de toda la flota, en
 * UNA consulta y sin motivo. Sin `desde`, el servidor usa hoy en Quito.
 */
const ausenciasDeLaFlota = async (desde?: string): Promise<AusenciaDeLaFlota[]> => {
  const { data } = await httpClient.get<AusenciaDeLaFlota[]>(
    "/administracion/conductores/ausencias",
    { params: desde ? { desde } : undefined },
  );
  return data;
};

export const FlotaService = {
  resumen,
  ausenciasDeConductor,
  registrarAusenciaConductor,
  retirarAusenciaConductor,
  ausenciasDeLaFlota,
  impactoBaja,
  reactivarConductor,
  reactivarVehiculo,
  darDeBajaUbicacion,
  reactivarUbicacion,
  listarConductores,
  listarUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  crearConductor,
  actualizarConductor,
  desactivarConductor,
  listarVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  desactivarVehiculo,
};
