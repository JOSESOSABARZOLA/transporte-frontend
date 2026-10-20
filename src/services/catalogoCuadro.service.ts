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
  AreaPersonal,
  AreasDeFormulario,
  ActualizarPunto,
  ActualizarTipoControl,
  ActualizarZonal,
  BajaCatalogo,
  CatalogosFormulario,
  CrearInstitucion,
  CrearPunto,
  CrearTipoControl,
  CrearZonal,
  EstadoVentana,
  Formulario,
  Institucion,
  PuntoEncuentro,
  TipoControl,
  Zonal,
  ZonalAdmin,
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

/**
 * `GET /zonales`. Por omisión solo las vigentes; `incluirInactivas` trae también las
 * desactivadas, que es lo que P-08 necesita para poder reactivarlas.
 */
const listarZonales = async (incluirInactivas = false): Promise<Zonal[]> => {
  const { data } = await httpClient.get<Zonal[]>("/zonales", {
    params: incluirInactivas ? { incluirInactivas: "true" } : undefined,
  });
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
 * `CRUD /administracion/catalogos/:codigo/…`. Solo con `catalogos:administrar`.
 *
 * CADA FORMULARIO TIENE SU CONFIGURACIÓN PROPIA (2026-10-13): todo cuelga del código del
 * formulario que se administra. Un valor de otro formulario responde 404 —para este no existe—,
 * y ya no hay copias ni vínculos entre formularios.
 *
 * `DELETE …/:id` DESACTIVA (RF-058) y responde cuántos operativos anteriores lo usan;
 * `DELETE …/:id/permanente` BORRA, y solo si nunca se usó en ese formulario (409 si no).
 */
const rutaAdmin = (codigo: string, resto: string) =>
  `/administracion/catalogos/${encodeURIComponent(codigo)}/${resto}`;

const crearPunto = async (codigo: string, punto: CrearPunto): Promise<PuntoEncuentro> => {
  const { data } = await httpClient.post<PuntoEncuentro>(rutaAdmin(codigo, "puntos"), punto);
  return data;
};

const actualizarPunto = async (
  codigo: string,
  id: number,
  cambios: ActualizarPunto,
): Promise<PuntoEncuentro> => {
  const { data } = await httpClient.put<PuntoEncuentro>(
    rutaAdmin(codigo, `puntos/${id}`),
    cambios,
  );
  return data;
};

const desactivarPunto = async (codigo: string, id: number): Promise<BajaCatalogo> => {
  const { data } = await httpClient.delete<BajaCatalogo>(rutaAdmin(codigo, `puntos/${id}`));
  return data;
};

/**
 * `GET …/:codigo/zonales`. Las zonales DEL FORMULARIO —vigentes y desactivadas— con su veredicto
 * de borrado. Su `id` es el de la zona de la ciudad. `listarZonales` sigue sirviendo a personal,
 * flota y cobertura, que trabajan con las zonas de la ciudad.
 */
const listarZonalesAdmin = async (codigo: string): Promise<ZonalAdmin[]> => {
  const { data } = await httpClient.get<ZonalAdmin[]>(rutaAdmin(codigo, "zonales"));
  return data;
};

/** `GET …/:codigo/zonas-disponibles`. Las zonas de la ciudad que el formulario aún no tiene. */
const zonasDisponibles = async (codigo: string): Promise<Zonal[]> => {
  const { data } = await httpClient.get<Zonal[]>(rutaAdmin(codigo, "zonas-disponibles"));
  return data;
};

/**
 * Alta de una zonal del formulario: la zona de la ciudad y el nombre. La reactivación es un
 * `PUT` con `activo: true`, como en los demás catálogos.
 */
const crearZonal = async (codigo: string, zonal: CrearZonal): Promise<ZonalAdmin> => {
  const { data } = await httpClient.post<ZonalAdmin>(rutaAdmin(codigo, "zonales"), zonal);
  return data;
};

const actualizarZonal = async (
  codigo: string,
  zonaId: number,
  cambios: ActualizarZonal,
): Promise<Zonal> => {
  const { data } = await httpClient.put<Zonal>(rutaAdmin(codigo, `zonales/${zonaId}`), cambios);
  return data;
};

/** Desactiva la zonal y sus puntos vigentes DE ESTE formulario; los demás no se tocan. */
const desactivarZonal = async (codigo: string, zonaId: number): Promise<BajaCatalogo> => {
  const { data } = await httpClient.delete<BajaCatalogo>(rutaAdmin(codigo, `zonales/${zonaId}`));
  return data;
};

const crearTipoControl = async (
  codigo: string,
  tipo: CrearTipoControl,
): Promise<TipoControl> => {
  const { data } = await httpClient.post<TipoControl>(rutaAdmin(codigo, "tipos-control"), tipo);
  return data;
};

const actualizarTipoControl = async (
  codigo: string,
  id: number,
  cambios: ActualizarTipoControl,
): Promise<TipoControl> => {
  const { data } = await httpClient.put<TipoControl>(
    rutaAdmin(codigo, `tipos-control/${id}`),
    cambios,
  );
  return data;
};

const desactivarTipoControl = async (codigo: string, id: number): Promise<BajaCatalogo> => {
  const { data } = await httpClient.delete<BajaCatalogo>(
    rutaAdmin(codigo, `tipos-control/${id}`),
  );
  return data;
};

const crearInstitucion = async (
  codigo: string,
  institucion: CrearInstitucion,
): Promise<Institucion> => {
  const { data } = await httpClient.post<Institucion>(
    rutaAdmin(codigo, "instituciones"),
    institucion,
  );
  return data;
};

const actualizarInstitucion = async (
  codigo: string,
  id: number,
  cambios: ActualizarInstitucion,
): Promise<Institucion> => {
  const { data } = await httpClient.put<Institucion>(
    rutaAdmin(codigo, `instituciones/${id}`),
    cambios,
  );
  return data;
};

const desactivarInstitucion = async (codigo: string, id: number): Promise<BajaCatalogo> => {
  const { data } = await httpClient.delete<BajaCatalogo>(
    rutaAdmin(codigo, `instituciones/${id}`),
  );
  return data;
};

/**
 * BAJA FÍSICA (eliminación definitiva) de un valor de catálogo (2026-09-24). Borra la fila,
 * y SOLO si nunca se usó en un operativo de ese formulario (y, en la zonal, si no tiene puntos):
 * si está en uso, el servidor responde 409 con el motivo, que se muestra tal cual (regla 7). En
 * la zonal se borra solo la del formulario: la zona de la ciudad queda.
 */
type EliminacionCatalogo = { id: number; mensaje: string };

const eliminarZonal = async (codigo: string, zonaId: number): Promise<EliminacionCatalogo> => {
  const { data } = await httpClient.delete<EliminacionCatalogo>(
    rutaAdmin(codigo, `zonales/${zonaId}/permanente`),
  );
  return data;
};

const eliminarPunto = async (codigo: string, id: number): Promise<EliminacionCatalogo> => {
  const { data } = await httpClient.delete<EliminacionCatalogo>(
    rutaAdmin(codigo, `puntos/${id}/permanente`),
  );
  return data;
};

const eliminarTipoControl = async (
  codigo: string,
  id: number,
): Promise<EliminacionCatalogo> => {
  const { data } = await httpClient.delete<EliminacionCatalogo>(
    rutaAdmin(codigo, `tipos-control/${id}/permanente`),
  );
  return data;
};

const eliminarInstitucion = async (
  codigo: string,
  id: number,
): Promise<EliminacionCatalogo> => {
  const { data } = await httpClient.delete<EliminacionCatalogo>(
    rutaAdmin(codigo, `instituciones/${id}/permanente`),
  );
  return data;
};

/**
 * `PUT /administracion/formularios/:codigo/areas`. Solo el ADMINISTRADOR.
 *
 * SE MANDA EL CONJUNTO ENTERO, no un alta ni una baja. Con operaciones sueltas existe el
 * instante en que el formulario se queda sin ninguna área, y ese estado deja el selector
 * de personal de P-01 vacío sin explicarlo. El servidor iguala lo que hay a lo que llega.
 *
 * Devuelve lo que quedó, incluida la marca de compartida —que el servidor conserva y este
 * contrato no envía—, para que el panel repinte con el estado real y no con el supuesto.
 */
const reemplazarAreas = async (
  codigo: string,
  areas: AreaPersonal[],
): Promise<AreasDeFormulario> => {
  const { data } = await httpClient.put<AreasDeFormulario>(
    `/administracion/formularios/${codigo}/areas`,
    { areas },
  );
  return data;
};

/**
 * `GET /administracion/catalogos/:codigo`. PV-36.
 *
 * Como `obtenerCatalogos`, pero INCLUYE LOS DESACTIVADOS, con su bandera `activo`, para
 * poder reactivarlos. Es solo de P-08: el registro de operativos usa `obtenerCatalogos`,
 * que filtra lo vigente. Reactivar es un `PUT` con `activo: true` de los que ya existen.
 */
const obtenerCatalogosAdmin = async (
  codigo: string,
): Promise<CatalogosFormulario> => {
  const { data } = await httpClient.get<CatalogosFormulario>(
    `/administracion/catalogos/${codigo}`,
  );
  return data;
};

export const CatalogoCuadroService = {
  listarPermitidos,
  reemplazarAreas,
  obtenerCatalogos,
  obtenerCatalogosAdmin,
  obtenerPuntos,
  listarZonales,
  listarZonalesAdmin,
  zonasDisponibles,
  obtenerMiVentana,
  crearZonal,
  actualizarZonal,
  desactivarZonal,
  crearPunto,
  actualizarPunto,
  desactivarPunto,
  crearTipoControl,
  actualizarTipoControl,
  desactivarTipoControl,
  crearInstitucion,
  actualizarInstitucion,
  desactivarInstitucion,
  eliminarZonal,
  eliminarPunto,
  eliminarTipoControl,
  eliminarInstitucion,
};
