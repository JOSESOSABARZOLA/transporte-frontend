/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Homologación de roles
 * Archivo: TablaRolesAuth.tsx
 * Responsabilidad: Mostrar la correspondencia entre los roles de Auth y los del módulo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * SE MUESTRA EL IDENTIFICADOR, Y ES LO QUE MÁS IMPORTA. El nombre de Auth se puede
 * editar desde su pantalla de administración; el número no cambia. Quien compare esta
 * tabla con la de Auth debe hacerlo por el identificador, no por el rótulo, y para eso
 * tiene que verlo.
 *
 * EL ESTADO LLEVA COLOR **Y** PALABRA, regla 6 de CLAUDE.md: en un sistema llamado
 * cuadro de colores, ninguna información puede depender solo del color.
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import Paginacion from "../common/Paginacion.tsx";
import { usePaginaLocal } from "../../hooks/usePaginaLocal.ts";
import type { RolAuth } from "../../interfaces/RolAuth.ts";
import type { RolDepartamental } from "../../config/env.ts";

type TablaRolesAuthProps = {
  /**
   * Nombre legible de un rol. **Llega como propiedad y no se consulta aquí**: esta tabla
   * es presentacional, y quien habla con el servidor es la página. Sale del catálogo de
   * , no de un mapa escrito en el navegador.
   */
  nombreDe: (rol: RolDepartamental) => string;
  roles: RolAuth[];
  cargando: boolean;
  procesando: boolean;
  onEditar: (rol: RolAuth) => void;
  onDesactivar: (rol: RolAuth) => void;
  /** Id de Auth recién guardado: su fila se resalta unos segundos, junto al aviso breve. */
  resaltadoId?: number | null;
};

const TablaRolesAuth: FC<TablaRolesAuthProps> = ({
  roles,
  cargando,
  procesando,
  onEditar,
  onDesactivar,
  nombreDe,
  resaltadoId = null,
}) => {
  const pagina = usePaginaLocal(roles, resaltadoId, (rol) => rol.idAuth);
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="table table-sm table-zebra">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-app-label">
              <th scope="col">Id en Auth</th>
              <th scope="col">Nombre en Auth</th>
              <th scope="col">Rol del cuadro</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-app-muted"
                >
                  {cargando
                    ? "Cargando la correspondencia…"
                    : "No hay ninguna correspondencia registrada. Sin ella, nadie puede entrar desde Auth central."}
                </td>
              </tr>
            ) : (
              pagina.filas.map((rol) => (
                <tr
                  key={rol.idAuth}
                  data-resaltado={rol.idAuth === resaltadoId || undefined}
                  className={
                    rol.idAuth === resaltadoId
                      ? "bg-success/10"
                      : rol.activo
                        ? "hover:bg-primary/5"
                        : "text-app-muted"
                  }
                >
                  <td className="px-3 py-2 align-top font-mono text-sm">
                    {rol.idAuth}
                  </td>
                  <td className="px-3 py-2 align-top">{rol.nombreAuth}</td>
                  <td className="px-3 py-2 align-top font-medium">
                    {nombreDe(rol.rol)}
                  </td>

                  <td className="px-3 py-2 align-top">
                    <span
                      className={`badge badge-sm ${
                        rol.activo ? "badge-success" : "badge-ghost"
                      }`}
                    >
                      {rol.activo ? "Vigente" : "Retirada"}
                    </span>
                  </td>

                  <td className="px-3 py-2 align-top">
                    <AccionesFila
                      nombre={`el rol ${rol.idAuth}`}
                      procesando={procesando}
                      editar={{ onClick: () => onEditar(rol) }}
                      estado={
                        rol.activo
                          ? {
                              tipo: "retirar",
                              onClick: () => onDesactivar(rol),
                            }
                          : null
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Paginacion
        page={pagina.pagina}
        pageSize={pagina.tamano}
        total={pagina.total}
        onPage={pagina.irA}
        etiqueta="correspondencias"
      />
    </div>
  );
};

export default TablaRolesAuth;
