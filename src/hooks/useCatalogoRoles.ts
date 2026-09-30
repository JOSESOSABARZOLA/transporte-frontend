/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogo de roles
 * Archivo: useCatalogoRoles.ts
 * Responsabilidad: Traer del servidor qué roles hay y cómo se llaman.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-01
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NINGÚN ROL ESCRITO EN EL FRONTEND. Decisión del negocio, 2026-09-01.
 *
 * Hasta hoy `utils/parametro.util.ts` tenía su propio `NOMBRE_ROL`, y de él salía la lista
 * del desplegable de «Cuentas del cuadro» y de «Roles de Auth central». Eso significaba
 * que **añadir un rol exigía tocar el navegador**, y que dos listas del mismo hecho —la
 * del servidor y la de aquí— podían decir cosas distintas sin que nada fallara.
 *
 * Ahora sale de `GET /administracion/roles`.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE CACHEA EN EL MÓDULO, Y CONVIENE DECIR POR QUÉ SE PUEDE.
 *
 * El catálogo es el enumerado de PostgreSQL y los nombres del organigrama: **no cambia
 * mientras la aplicación esté cargada**, porque cambiarlo exige desplegar. Sin caché, cada
 * tabla y cada modal que nombre un rol pediría la lista otra vez, y hay ocho.
 *
 * El precio es explícito y pequeño: tras un despliegue que añada un rol, quien tenga la
 * pestaña abierta sigue con el catálogo anterior hasta recargar. Es aceptable porque ese
 * despliegue le va a cambiar la aplicación entera de todos modos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { RolDepartamental } from "../config/env.ts";
import type { RolDelCatalogo } from "../interfaces/CatalogoRoles.ts";
import { CatalogoRolesService } from "../services/catalogoRoles.service.ts";

/** Resuelto una vez por carga de la aplicación. Ver la nota de arriba. */
let cache: RolDelCatalogo[] | null = null;
/** La consulta en vuelo, para que ocho componentes a la vez no pidan ocho veces. */
let enVuelo: Promise<RolDelCatalogo[]> | null = null;

const pedir = async (): Promise<RolDelCatalogo[]> => {
  if (cache) return cache;

  enVuelo ??= CatalogoRolesService.consultar()
    .then((roles) => {
      cache = roles;
      return roles;
    })
    .finally(() => {
      enVuelo = null;
    });

  return enVuelo;
};

export const useCatalogoRoles = () => {
  const [roles, setRoles] = useState<RolDelCatalogo[]>(cache ?? []);
  const [cargando, setCargando] = useState(cache === null);

  useEffect(() => {
    if (cache) return;

    let vigente = true;

    void pedir()
      .then((traidos) => {
        if (vigente) setRoles(traidos);
      })
      /*
        UN FALLO AQUÍ NO ROMPE LA PANTALLA. `nombreDe` cae en el código del rol, que es
        feo pero legible; y `asignables` queda vacío, con lo que el desplegable no ofrece
        nada en lugar de ofrecer algo equivocado. El aviso lo da la pantalla que sí
        depende del catálogo para guardar.
      */
      .catch(() => undefined)
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  /**
   * El nombre legible, con el código como respaldo.
   *
   * NUNCA DEVUELVE VACÍO. Mientras la respuesta no llega —o si no llega— sale el código
   * del rol. Es el mismo criterio que el servidor aplica en la fila de evidencia de la
   * matriz: preferible un código en pantalla a un hueco que nadie sabe interpretar.
   */
  const nombreDe = useCallback(
    (codigo: RolDepartamental): string =>
      roles.find((rol) => rol.codigo === codigo)?.nombre ?? codigo,
    [roles],
  );

  /** Los que se pueden otorgar a una cuenta. Todos se pueden **nombrar**. */
  const asignables = useMemo(
    () => roles.filter((rol) => rol.asignable).map((rol) => rol.codigo),
    [roles],
  );

  return { roles, asignables, nombreDe, cargando };
};
