/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios y catálogos
 * Archivo: catalogoCuadro.service.ts
 * Responsabilidad: Consumir los formularios permitidos, sus catálogos y las ventanas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LA LISTA DE FORMULARIOS LLEGA YA FILTRADA POR EL SERVIDOR (PER-01). Aquí no se filtra
 * nada por rol: si la interfaz recortara una lista completa, bastaría con no recortarla
 * para ver los formularios de otro departamento.
 */

import httpClient from "../api/httpClient";
import type { RolDepartamental } from "../config/env";
import type {
  ActualizarInstitucion,
  ActualizarPunto,
  ActualizarTipoControl,
  BajaCatalogo,
  CatalogosFormulario,
  CrearInstitucion,
  CrearPunto,
  CrearTipoControl,
  EstadoVentana,
  Formulario,
  Institucion,
  PuntoEncuentro,
  TipoControl,
  Zonal,
} from "../interfaces/Formulario";

/** `GET /formularios/permitidos`. Los que el rol puede abrir, con su acceso. */
const listarPermitidos = async (): Promise<Formulario[]> => {
  const { data } = await httpClient.get<Formulario[]>("/formularios/permitidos");
  return data;
};

/** `GET /formularios/:codigo/catalogos`. Puntos, tipos e instituciones delimitados. */
const obtenerCatalogos = async (
  codigo: string,
): Promise<CatalogosFormulario> => {
  const { data } = await httpClient.get<CatalogosFormulario>(
    `/formularios/${codigo}/catalogos`,
  );
  return data;
};

/**
 * `GET /formularios/:codigo/zonales/:zonalId/puntos`. RN-17.
 *
 * El punto depende de la zonal elegida, y esa dependencia la resuelve el servidor: es la
 * matriz zonal ↔ punto que sigue pendiente de validación (PV-01).
 */
const obtenerPuntos = async (
  codigo: string,
  zonalId: number,
): Promise<PuntoEncuentro[]> => {
  const { data } = await httpClient.get<PuntoEncuentro[]>(
    `/formularios/${codigo}/zonales/${zonalId}/puntos`,
  );
  return data;
};

/** `GET /zonales`. Las once filas: las diez zonales más el ámbito distrital. */
const listarZonales = async (): Promise<Zonal[]> => {
  const { data } = await httpClient.get<Zonal[]>("/zonales");
  return data;
};

/**
 * `GET /ventanas/estado`. Si el rol puede escribir ahora, y hasta cuándo.
 *
 * No lleva parámetro de rol: el servidor lo resuelve de la identidad. Pedirlo permitiría
 * consultar la ventana de otro departamento, que no es asunto de este.
 */
/**
 * `GET /ventanas/estado`. La ventana del rol bajo el que se está trabajando.
 *
 * `rol` ES OPCIONAL, Y **DEBE ENVIARSE DESDE UNA PANTALLA**. Desde el 19-AGO-2026 una
 * persona puede tener varios roles, y entonces «su» ventana deja de ser una sola: sin el
 * parámetro el servidor responde con la del primero de su lista, que casi nunca es el de
 * la pantalla. Es lo que dejó a la DAF con la bandeja en solo lectura leyendo el mensaje
 * de cierre del DMIP. Ver `useVentanaCarga`.
 *
 * El servidor **comprueba que el rol sea suyo** y responde `403` si no lo es: pedir uno
 * ajeno no devuelve el propio en silencio.
 */
const obtenerMiVentana = async (
  rol?: RolDepartamental,
): Promise<EstadoVentana> => {
  const { data } = await httpClient.get<EstadoVentana>("/ventanas/estado", {
    params: rol ? { rol } : undefined,
  });
  return data;
};

// ─────────────────── Administración de catálogos (P-08) ───────────────────

/**
 * `CRUD /administracion/catalogos`. Solo el ADMINISTRADOR.
 *
 * **No hay `GET` de administración**, y eso condiciona P-08: para leer se usa
 * `GET /formularios/:codigo/catalogos`, que devuelve únicamente los valores **activos**.
 * Ver PV-36.
 *
 * `DELETE` DESACTIVA, NO BORRA (RF-058). La ruta es la que el administrador espera y la
 * respuesta explica qué ocurrió realmente, con cuántos operativos anteriores usan el
 * valor.
 */
const crearPunto = async (punto: CrearPunto): Promise<PuntoEncuentro> => {
  const { data } = await httpClient.post<PuntoEncuentro>(
    "/administracion/catalogos/puntos",
    punto,
  );
  return data;
};

const actualizarPunto = async (
  id: number,
  cambios: ActualizarPunto,
): Promise<PuntoEncuentro> => {
  const { data } = await httpClient.put<PuntoEncuentro>(
    `/administracion/catalogos/puntos/${id}`,
    cambios,
  );
  return data;
};

const desactivarPunto = async (id: number): Promise<BajaCatalogo> => {
  const { data } = await httpClient.delete<BajaCatalogo>(
    `/administracion/catalogos/puntos/${id}`,
  );
  return data;
};

const crearTipoControl = async (
  tipo: CrearTipoControl,
): Promise<TipoControl> => {
  const { data } = await httpClient.post<TipoControl>(
    "/administracion/catalogos/tipos-control",
    tipo,
  );
  return data;
};

const actualizarTipoControl = async (
  id: number,
  cambios: ActualizarTipoControl,
): Promise<TipoControl> => {
  const { data } = await httpClient.put<TipoControl>(
    `/administracion/catalogos/tipos-control/${id}`,
    cambios,
  );
  return data;
};

const desactivarTipoControl = async (id: number): Promise<BajaCatalogo> => {
  const { data } = await httpClient.delete<BajaCatalogo>(
    `/administracion/catalogos/tipos-control/${id}`,
  );
  return data;
};

const crearInstitucion = async (
  institucion: CrearInstitucion,
): Promise<Institucion> => {
  const { data } = await httpClient.post<Institucion>(
    "/administracion/catalogos/instituciones",
    institucion,
  );
  return data;
};

const actualizarInstitucion = async (
  id: number,
  cambios: ActualizarInstitucion,
): Promise<Institucion> => {
  const { data } = await httpClient.put<Institucion>(
    `/administracion/catalogos/instituciones/${id}`,
    cambios,
  );
  return data;
};

const desactivarInstitucion = async (id: number): Promise<BajaCatalogo> => {
  const { data } = await httpClient.delete<BajaCatalogo>(
    `/administracion/catalogos/instituciones/${id}`,
  );
  return data;
};

export const CatalogoCuadroService = {
  listarPermitidos,
  obtenerCatalogos,
  obtenerPuntos,
  listarZonales,
  obtenerMiVentana,
  crearPunto,
  actualizarPunto,
  desactivarPunto,
  crearTipoControl,
  actualizarTipoControl,
  desactivarTipoControl,
  crearInstitucion,
  actualizarInstitucion,
  desactivarInstitucion,
};
