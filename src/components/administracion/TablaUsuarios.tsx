/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Cuentas del módulo
 * Archivo: TablaUsuarios.tsx
 * Responsabilidad: Mostrar las cuentas del Cuadro de Colores y lo que les falta.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * DOS AUSENCIAS SE SEÑALAN EN LA PROPIA FILA, porque las dos impiden trabajar y ninguna
 * da error al crear la cuenta:
 *
 *   · SIN USUARIO DE AUTH, esa persona **no puede entrar**. La cuenta existe, está
 *     activa, y aun así el canje no la encuentra.
 *   · SIN FICHA DE PERSONAL, no recibe órdenes de servicio: P-06 le responde que su
 *     usuario no tiene ficha asociada. Le pasó a `ffnavarrete`, y el fallo no se vio al
 *     darle de alta sino al intentar descargar una orden.
 *
 * Se escriben con palabra y no con un guion: «—» las haría parecer datos que alguien
 * olvidó cargar y que el siguiente administrador «completaría» sin saber qué pone.
 *
 * EL ESTADO LLEVA COLOR **Y** PALABRA, regla 6 de CLAUDE.md.
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import Paginacion from "../common/Paginacion.tsx";
import { usePaginaLocal } from "../../hooks/usePaginaLocal.ts";
import type { UsuarioCuadro } from "../../interfaces/UsuarioCuadro.ts";
import type { RolDepartamental } from "../../config/env.ts";

type TablaUsuariosProps = {
  /**
   * Nombre legible de un rol. **Llega como propiedad y no se consulta aquí**: esta tabla
   * es presentacional, y quien habla con el servidor es la página. Sale del catálogo de
   * , no de un mapa escrito en el navegador.
   */
  nombreDe: (rol: RolDepartamental) => string;
  usuarios: UsuarioCuadro[];
  cargando: boolean;
  procesando: boolean;
  onEditar: (usuario: UsuarioCuadro) => void;
  onDesactivar: (usuario: UsuarioCuadro) => void;
  /** Vuelve a activar una cuenta desactivada (estándar de botones: ↺ Activar en la fila). */
  onActivar: (usuario: UsuarioCuadro) => void;
  /** Cuenta recién guardada o activada: abre su página. */
  resaltadoId?: number | null;
};

const TablaUsuarios: FC<TablaUsuariosProps> = ({
  usuarios,
  cargando,
  procesando,
  onEditar,
  onDesactivar,
  onActivar,
  resaltadoId = null,
  nombreDe,
}) => {
  const pagina = usePaginaLocal(usuarios, resaltadoId, (usuario) => usuario.id);
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="table table-sm table-zebra">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-app-label">
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Roles</th>
              <th scope="col">Usuario de Auth</th>
              <th scope="col">Ficha de personal</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-sm text-app-muted"
                >
                  {cargando
                    ? "Cargando las cuentas…"
                    : "No hay ninguna cuenta registrada. Sin cuentas, nadie puede entrar al módulo."}
                </td>
              </tr>
            ) : (
              pagina.filas.map((usuario) => (
                <tr
                  key={usuario.id}
                  data-resaltado={usuario.id === resaltadoId || undefined}
                  className={
                    usuario.id === resaltadoId
                      ? "bg-success/10 transition-colors"
                      : usuario.activo
                        ? "hover:bg-primary/5"
                        : "text-app-muted"
                  }
                >
                  <td className="px-3 py-2 align-top font-medium">
                    {usuario.nombre}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-app-muted">
                    {usuario.correo}
                  </td>
                  {/* Uno por etiqueta: con varios, una lista separada por comas se lee mal
                  y no deja ver de un vistazo cuántos tiene. */}
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {usuario.roles.map((rol) => (
                        <span
                          key={rol}
                          /*
                        `.badge` es de alto fijo: un nombre de rol largo —«DMIP · Unidad de
                        Operativos»— envolvía y rebosaba la píldora, encimándose con la de al
                        lado. `h-auto max-w-full py-1` deja que la píldora crezca en alto y
                        contenga su texto en varias líneas dentro del ancho de la columna.
                      */
                          className="badge badge-outline badge-sm h-auto max-w-full py-1"
                        >
                          {nombreDe(rol)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-3 py-2 align-top">
                    {usuario.identificadorAd ? (
                      <span className="font-mono text-sm">
                        {usuario.identificadorAd}
                      </span>
                    ) : (
                      <span className="badge badge-warning badge-sm">
                        Sin usuario: no puede entrar
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top">
                    {usuario.funcionario ? (
                      <span className="text-sm">
                        {usuario.funcionario.nombreCompleto}
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">
                        Sin ficha: no recibe órdenes
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top">
                    <span
                      className={`badge badge-sm ${
                        usuario.activo ? "badge-success" : "badge-ghost"
                      }`}
                    >
                      {usuario.activo ? "Activa" : "Desactivada"}
                    </span>
                  </td>

                  <td className="px-3 py-2 align-top">
                    <AccionesFila
                      nombre={usuario.nombre}
                      procesando={procesando}
                      editar={{ onClick: () => onEditar(usuario) }}
                      estado={
                        usuario.activo
                          ? {
                              tipo: "desactivar",
                              onClick: () => onDesactivar(usuario),
                            }
                          : {
                              tipo: "activar",
                              onClick: () => onActivar(usuario),
                            }
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
        etiqueta="cuentas"
      />
    </div>
  );
};

export default TablaUsuarios;
