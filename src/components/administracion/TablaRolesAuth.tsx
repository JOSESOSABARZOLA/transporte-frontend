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

import type { RolAuth } from "../../interfaces/RolAuth.ts";
import { NOMBRE_ROL } from "../../utils/parametro.util.ts";

type TablaRolesAuthProps = {
  roles: RolAuth[];
  cargando: boolean;
  procesando: boolean;
  onEditar: (rol: RolAuth) => void;
  onDesactivar: (rol: RolAuth) => void;
};

const TablaRolesAuth: FC<TablaRolesAuthProps> = ({
  roles,
  cargando,
  procesando,
  onEditar,
  onDesactivar,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          <th scope="col">Id en Auth</th>
          <th scope="col">Nombre en Auth</th>
          <th scope="col">Rol del cuadro</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {roles.length === 0 ? (
          <tr>
            <td
              colSpan={5}
              className="px-3 py-6 text-center text-sm text-base-content/70"
            >
              {cargando
                ? "Cargando la correspondencia…"
                : "No hay ninguna correspondencia registrada. Sin ella, nadie puede entrar desde Auth central."}
            </td>
          </tr>
        ) : (
          roles.map((rol) => (
            <tr
              key={rol.idAuth}
              className={rol.activo ? "hover:bg-info/10" : "opacity-60"}
            >
              <td className="px-3 py-2 align-top font-mono text-sm">
                {rol.idAuth}
              </td>
              <td className="px-3 py-2 align-top">{rol.nombreAuth}</td>
              <td className="px-3 py-2 align-top font-medium">
                {NOMBRE_ROL[rol.rol]}
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
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onEditar(rol)}
                    disabled={procesando}
                  >
                    Editar
                  </button>
                  {rol.activo && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onDesactivar(rol)}
                      disabled={procesando}
                    >
                      Retirar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default TablaRolesAuth;
