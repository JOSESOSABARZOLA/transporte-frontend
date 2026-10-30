/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: ordenesServicio.ts
 * Responsabilidad: Decir en UN solo sitio qué roles abren «Órdenes de servicio».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-27
 *
 * «Por el momento», solo la Dirección genera, emite y administra las órdenes y sus formatos
 * (decisión del negocio, 2026-10-27). Lo leen la ruta (`ROLES_REQUERIDOS`) y el menú
 * (`requiredRoles`), que así no pueden quedar distintos. Es el espejo de `ROLES_QUE_EMITEN_ORDENES`
 * del servidor (`documentos/domain/formato-orden.ts`), que es la autoridad: ampliarlo a otro rol es
 * cambiarlo en los dos y darle el permiso `ordenes:gestionar`.
 */
export const ROLES_QUE_EMITEN_ORDENES: readonly string[] = ["DIRECTOR"];
