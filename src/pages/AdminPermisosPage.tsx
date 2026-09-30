/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de permisos (RBAC)
 * Archivo: AdminPermisosPage.tsx
 * Responsabilidad: Editar la matriz rol<->permiso: qué puede hacer cada rol, sin desplegar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * ES LA META DEL RBAC. Se elige un rol y se marcan los permisos que tendrá; al guardar, el
 * servidor reescribe su matriz e invalida su caché, así que el cambio surte efecto en la
 * siguiente petición, sin tocar código. El servidor sigue siendo la autoridad.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import PanelCatalogo from "../components/catalogos/PanelCatalogo.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import { PermisosService, type Permiso } from "../services/permisos.service.ts";
import type { RolDepartamental } from "../config/env.ts";
import { useCatalogoRoles } from "../hooks/useCatalogoRoles.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";

const AdminPermisosPage = () => {
  const { roles, nombreDe } = useCatalogoRoles();

  const [catalogo, setCatalogo] = useState<Permiso[]>([]);
  const [rol, setRol] = useState<string>("");
  const [otorgados, setOtorgados] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setCatalogo(await PermisosService.listarPermisos());
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const cargarRol = useCallback(async (codigo: string) => {
    setRol(codigo);
    setAviso(null);
    if (!codigo) {
      setOtorgados(new Set());
      return;
    }
    try {
      const suyos = await PermisosService.permisosDeRol(codigo);
      setOtorgados(new Set(suyos));
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    }
  }, []);

  const alternar = (codigo: string): void => {
    setOtorgados((actuales) => {
      const copia = new Set(actuales);
      if (copia.has(codigo)) copia.delete(codigo);
      else copia.add(codigo);
      return copia;
    });
  };

  const guardar = async (): Promise<void> => {
    if (!rol) return;
    setGuardando(true);
    setAviso(null);
    try {
      const resultado = await PermisosService.guardarPermisosDeRol(
        rol,
        [...otorgados],
      );
      setOtorgados(new Set(resultado));
      setExito(
        `Permisos de ${nombreDe(rol as RolDepartamental)} actualizados. El cambio rige desde la próxima petición.`,
      );
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setGuardando(false);
    }
  };

  // Agrupado por módulo, que es como se lee la matriz.
  const porModulo = useMemo(() => {
    const grupos = new Map<string, Permiso[]>();
    for (const permiso of catalogo) {
      const suyos = grupos.get(permiso.modulo) ?? [];
      suyos.push(permiso);
      grupos.set(permiso.modulo, suyos);
    }
    return [...grupos.entries()];
  }, [catalogo]);

  return (
    <div className="flex flex-col gap-4">
      {aviso && (
        <div className={aviso.clase} role="alert">
          <span>{aviso.texto}</span>
        </div>
      )}

      <PanelCatalogo
        titulo="Permisos por rol"
        distintivo={
          <span className="badge badge-ghost badge-sm">
            {cargando ? "Cargando…" : `${catalogo.length} permisos`}
          </span>
        }
        procesando={guardando}
      >
        <div className="flex flex-col gap-3 px-1 pt-1">
          <p className="text-xs text-base-content/70">
            Elija un rol y marque lo que puede hacer. El servidor reescribe su matriz al
            guardar; el acceso deja de estar en el código.
          </p>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor="rol" className="text-sm font-medium">
              Rol
            </label>
            <select
              id="rol"
              className="select select-bordered select-sm w-full sm:max-w-sm"
              value={rol}
              onChange={(evento) => void cargarRol(evento.target.value)}
              disabled={guardando}
            >
              <option value="">— elija un rol —</option>
              {roles.map((r) => (
                <option key={r.codigo} value={r.codigo}>
                  {r.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm sm:ml-auto"
              onClick={() => void guardar()}
              disabled={!rol || guardando}
            >
              {guardando ? "Guardando…" : "Guardar permisos"}
            </button>
          </div>

          {rol === "" ? (
            <p className="py-6 text-center text-sm text-base-content/70">
              Elija un rol para ver y editar sus permisos.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-base-300">
              <div className="flex items-center justify-between gap-2 bg-primary px-3 py-2 text-primary-content">
                <h3 className="text-xs font-semibold uppercase tracking-wider">
                  {nombreDe(rol as RolDepartamental)}
                </h3>
                <span className="text-xs">{otorgados.size} permisos</span>
              </div>

              <div className="flex flex-col gap-3 p-3">
                {porModulo.map(([modulo, permisos]) => (
                  <fieldset key={modulo} className="flex flex-col gap-1">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
                      {modulo}
                    </legend>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {permisos.map((permiso) => (
                        <label
                          key={permiso.codigo}
                          className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-primary/5"
                        >
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm mt-0.5"
                            checked={otorgados.has(permiso.codigo)}
                            onChange={() => alternar(permiso.codigo)}
                            disabled={guardando}
                          />
                          <span className="flex flex-col">
                            <span className="text-sm">{permiso.descripcion}</span>
                            <span className="text-xs text-base-content/60">
                              {permiso.codigo}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>
          )}
        </div>
      </PanelCatalogo>

      <ModalExito
        abierto={exito !== null}
        mensaje={exito ?? ""}
        onClose={() => setExito(null)}
      />
    </div>
  );
};

export default AdminPermisosPage;
