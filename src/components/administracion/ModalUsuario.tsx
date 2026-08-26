/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Cuentas del módulo
 * Archivo: ModalUsuario.tsx
 * Responsabilidad: Dar de alta o editar una cuenta del Cuadro de Colores.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * EL CORREO NO SE EDITA. Es la llave natural de la cuenta —con la que se sembraban antes
 * de retirar la semilla— y cambiarlo no sería corregir esta cuenta, sería crear otra. Al
 * editar se muestra como `badge badge-ghost badge-sm`, no como campo deshabilitado
 * (regla 5 de CLAUDE.md: los campos calculados no son campos).
 *
 * LA FICHA SE ENLAZA POR CÉDULA, no por un identificador interno. Quien da de alta a una
 * persona conoce su cédula; el `func_id` no lo conoce nadie. Cuando se pedía el número se
 * olvidaba, y el fallo aparecía después: `ffnavarrete` quedó sin ficha y P-06 le
 * respondía que su usuario no tenía ficha asociada.
 *
 * DEJAR LA CÉDULA VACÍA ES UNA RESPUESTA VÁLIDA y se dice en la propia etiqueta: Dirección
 * y administración no salen a operativos y no reciben órdenes de servicio. Sin ese aviso,
 * el siguiente administrador «completaría» el campo con lo que fuera.
 */

import { useState, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";

import type { RolDepartamental } from "../../config/env.ts";
import type { UsuarioCuadro } from "../../interfaces/UsuarioCuadro.ts";
import { NOMBRE_ROL } from "../../utils/parametro.util.ts";

const ROLES = Object.keys(NOMBRE_ROL) as RolDepartamental[];

type DatosGuardar = {
  correo: string;
  nombre: string;
  roles: RolDepartamental[];
  identificadorAd: string | null;
  funcionarioCedula: string | null;
  activo: boolean;
};

type ModalUsuarioProps = {
  /** `null` al dar de alta; la cuenta al editar. */
  usuario: UsuarioCuadro | null;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  /** Roles que no tienen rol activo en Auth: quien los reciba no podrá entrar. */
  rolesSinAcceso: RolDepartamental[];
  onGuardar: (datos: DatosGuardar) => void;
  onCancelar: () => void;
};

const ModalUsuario: FC<ModalUsuarioProps> = ({
  usuario,
  guardando,
  aviso,
  rolesSinAcceso,
  onGuardar,
  onCancelar,
}) => {
  const esAlta = usuario === null;

  const [correo, setCorreo] = useState(usuario?.correo ?? "");
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [roles, setRoles] = useState<RolDepartamental[]>(
    usuario?.roles ?? ["DMIP_OPERATIVOS"],
  );
  const [identificadorAd, setIdentificadorAd] = useState(
    usuario?.identificadorAd ?? "",
  );
  const [cedula, setCedula] = useState(usuario?.funcionario?.cedula ?? "");
  const [activo, setActivo] = useState(usuario?.activo ?? true);

  // SIN NINGÚN ROL NO SE PUEDE GUARDAR. El servidor también lo rechaza, pero aquí el
  // botón deshabilitado explica el porqué antes de intentarlo.
  const puedeGuardar =
    nombre.trim().length > 0 &&
    roles.length > 0 &&
    (esAlta ? correo.trim().length > 0 : true);

  /** Los roles elegidos que no tienen camino desde Auth: quien los reciba no entrará. */
  const elegidosSinAcceso = roles.filter((rol) => rolesSinAcceso.includes(rol));

  const alternar = (rol: RolDepartamental) =>
    setRoles((actuales) =>
      actuales.includes(rol)
        ? actuales.filter((otro) => otro !== rol)
        : [...actuales, rol],
    );

  return (
    <MarcoModal
      abierto
      etiqueta={esAlta ? "Nueva cuenta" : `Cuenta de ${usuario.nombre}`}
      ancho="lg"
      onCerrar={guardando ? undefined : onCancelar}
    >
        <h3 className="mb-1 text-lg font-bold">
          {esAlta ? "Nueva cuenta" : "Editar cuenta"}
        </h3>
        <p className="mb-4 text-xs text-base-content/70">
          Quién entra al Cuadro de Colores y con qué rol. Auth central acredita la
          identidad; esta cuenta decide el perfil dentro del módulo.
        </p>

        {aviso && (
          <div
            className="alert alert-error mb-4"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="usuario-correo"
            >
              <span className="label-text">Correo institucional</span>
            </label>
            {esAlta ? (
              <input
                id="usuario-correo"
                type="email"
                maxLength={160}
                className="input input-bordered input-sm w-full"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                disabled={guardando}
                placeholder="nombre.apellido@quito.gob.ec"
              />
            ) : (
              // Llave natural de la cuenta: no se edita.
              <span className="badge badge-ghost badge-sm w-fit">
                {usuario.correo}
              </span>
            )}
          </div>

          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="usuario-nombre"
            >
              <span className="label-text">Nombre completo</span>
            </label>
            <input
              id="usuario-nombre"
              type="text"
              maxLength={160}
              className="input input-bordered input-sm w-full"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              disabled={guardando}
              placeholder="Apellidos Nombres"
            />
            <span className="label">
              <span className="label-text-alt text-xs text-base-content/70">
                Es el nombre que se muestra en la barra superior. Auth no lo
                envía, así que se escribe aquí.
              </span>
            </span>
          </div>

          {/* CASILLAS Y NO UN <select multiple>: con selección múltiple nativa hacen
              falta Ctrl+clic y se pierde lo elegido por descuido. Misma razón por la que
              el proyecto usa SelectorTokens en los catálogos. */}
          <fieldset className="form-control w-full">
            <legend className="label">
              <span className="label-text">Roles en el cuadro</span>
            </legend>

            <div className="flex flex-col gap-1">
              {ROLES.map((codigo) => (
                <label
                  key={codigo}
                  className="label cursor-pointer justify-start gap-3 py-1"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={roles.includes(codigo)}
                    onChange={() => alternar(codigo)}
                    disabled={guardando}
                  />
                  <span className="label-text">{NOMBRE_ROL[codigo]}</span>
                </label>
              ))}
            </div>

            <span className="label">
              <span className="label-text-alt text-xs text-base-content/70">
                Puede elegir varios: esta persona verá la unión de los
                formularios de todos ellos.
              </span>
            </span>

            {roles.length === 0 && (
              <div
                className="alert alert-error mt-2"
                role="alert"
              >
                <span className="text-xs">
                  Elija al menos uno. Sin ningún rol, esta persona entraría y no
                  podría hacer nada.
                </span>
              </div>
            )}

            {/* Aviso, no bloqueo: puede ser un alta anticipada a que Auth cree el rol. */}
            {elegidosSinAcceso.length > 0 && (
              <div
                className="alert alert-warning mt-2"
                role="alert"
              >
                <span className="text-xs">
                  {elegidosSinAcceso.map((rol) => NOMBRE_ROL[rol]).join(", ")} no
                  tiene ningún rol de Transporte en Auth central. Si es el único
                  que le asigna, esta persona no podrá entrar hasta que se cree
                  allí y se registre en Roles de Auth central.
                </span>
              </div>
            )}
          </fieldset>

          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="usuario-auth"
            >
              <span className="label-text">Usuario de Auth central</span>
            </label>
            <input
              id="usuario-auth"
              type="text"
              maxLength={120}
              className="input input-bordered input-sm w-full"
              value={identificadorAd}
              onChange={(evento) => setIdentificadorAd(evento.target.value)}
              disabled={guardando}
              placeholder="ffnavarrete"
            />
            <span className="label">
              <span className="label-text-alt text-xs text-base-content/70">
                Es la llave del ingreso: el canje busca esta cuenta por ese
                usuario. Si queda vacío, esta persona no podrá entrar.
              </span>
            </span>
          </div>

          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="usuario-cedula"
            >
              <span className="label-text">Cédula de la ficha de personal</span>
            </label>
            <input
              id="usuario-cedula"
              type="text"
              maxLength={10}
              className="input input-bordered input-sm w-full"
              value={cedula}
              onChange={(evento) => setCedula(evento.target.value)}
              disabled={guardando}
              placeholder="0000000000"
            />
            <span className="label">
              <span className="label-text-alt text-xs text-base-content/70">
                Enlaza con el maestro de personal para que reciba sus órdenes de
                servicio. Déjelo vacío si esta persona no sale a operativos:
                Dirección y administración no reciben ninguna.
              </span>
            </span>
          </div>

          {!esAlta && (
            <div className="form-control w-full">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={activo}
                  onChange={(evento) => setActivo(evento.target.checked)}
                  disabled={guardando}
                />
                <span className="label-text">Cuenta activa</span>
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              onGuardar({
                correo: correo.trim(),
                nombre: nombre.trim(),
                roles,
                identificadorAd: identificadorAd.trim() || null,
                funcionarioCedula: cedula.trim() || null,
                activo,
              })
            }
            disabled={guardando || !puedeGuardar}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
    </MarcoModal>
  );
};

export default ModalUsuario;
