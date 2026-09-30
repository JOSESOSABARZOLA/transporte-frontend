/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Homologación de roles
 * Archivo: ModalRolAuth.tsx
 * Responsabilidad: Dar de alta o editar una correspondencia con un rol de Auth central.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * EL IDENTIFICADOR NO SE EDITA. Al dar de alta se escribe —lo copia el administrador de
 * Auth— pero al editar queda bloqueado: cambiarlo no sería corregir esta fila, sería
 * apuntar a otro rol distinto, y para eso están el alta y la baja. Se muestra como
 * `badge badge-ghost badge-sm` porque es un valor calculado, no un campo (regla 5).
 *
 * LO QUE ESTA PANTALLA NO PUEDE HACER, y se dice en ella: crear un rol NUEVO del Cuadro
 * de Colores. Aquí solo se declara a cuál de los siete que ya existen corresponde un rol
 * de Auth. Un actor nuevo —un «Auditor» que solo lee— exige decidir qué formularios
 * posee, si tiene ventana de carga y qué le permiten las cuatro guardas; si bastara con
 * esta pantalla, existirían roles cuyo comportamiento no está definido en ninguna parte.
 */

import { useState, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";

import type { RolDepartamental } from "../../config/env.ts";
import type { RolAuth } from "../../interfaces/RolAuth.ts";
import { useCatalogoRoles } from "../../hooks/useCatalogoRoles.ts";


type ModalRolAuthProps = {
  /** `null` al dar de alta; la fila al editar. */
  rolAuth: RolAuth | null;
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  onGuardar: (datos: {
    idAuth: number;
    nombreAuth: string;
    rol: RolDepartamental;
    activo: boolean;
  }) => void;
  onCancelar: () => void;
};

const ModalRolAuth: FC<ModalRolAuthProps> = ({
  rolAuth,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}) => {
  const { asignables, nombreDe } = useCatalogoRoles();

  const esAlta = rolAuth === null;

  const [idAuth, setIdAuth] = useState(rolAuth ? String(rolAuth.idAuth) : "");
  const [nombreAuth, setNombreAuth] = useState(rolAuth?.nombreAuth ?? "");
  /*
    ═══════════════════════════════════════════════════════════════════════════════
    NACE SIN ROL ELEGIDO, Y ANTES NACÍA CON `DMIP_OPERATIVOS`. 2026-09-01.

    Era el último rol escrito en esta pantalla, y proponía uno concreto por ser el primero
    de una lista. Una correspondencia de Auth mal apuntada no falla al guardarse: falla el
    día que alguien entra con ese rol de Auth y recibe un perfil que no le toca.

    El vacío obliga a elegir, y `puedeGuardar` lo exige.
    ═══════════════════════════════════════════════════════════════════════════════
  */
  const [rol, setRol] = useState<RolDepartamental | "">(rolAuth?.rol ?? "");
  const [activo, setActivo] = useState(rolAuth?.activo ?? true);

  const identificador = Number(idAuth);
  const identificadorValido = Number.isInteger(identificador) && identificador > 0;
  const puedeGuardar =
    nombreAuth.trim().length > 0 &&
    rol !== "" &&
    (esAlta ? identificadorValido : true);

  return (
    <MarcoModal
      abierto
      etiqueta={esAlta ? "Nueva correspondencia" : `Correspondencia ${rolAuth.idAuth}`}
      ancho="lg"
      onCerrar={guardando ? undefined : onCancelar}
      /*
        CABECERA INSTITUCIONAL, como el resto de los modales institucionales.
        Antes esta ventana no pasaba `titulo`, así que caía en la tarjeta blanca plana y
        repetía el título en un `<h3>` del cuerpo: no se reconocía como las demás.
      */
      antetitulo="Homologación de roles"
      titulo={
        esAlta ? "Nueva correspondencia" : `Editar correspondencia ${rolAuth.idAuth}`
      }
      /* Botones al pie persistente (ver `MarcoModal`): quedan siempre a la vista. */
      pie={
        <div className="flex justify-end gap-2">
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
                idAuth: esAlta ? identificador : rolAuth.idAuth,
                nombreAuth: nombreAuth.trim(),
                // `puedeGuardar` ya exige un rol elegido: aquí `rol` nunca está vacío.
                rol: rol as RolDepartamental,
                activo,
              })
            }
            disabled={guardando || !puedeGuardar}
          >
            {guardando ? (
              <>
                <span
                  className="loading loading-spinner loading-sm"
                  aria-hidden="true"
                />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </button>
        </div>
      }
    >
        <p className="mb-4 text-xs text-base-content/70">
          Declara a qué rol del Cuadro de Colores corresponde un rol de Auth
          central. No crea roles nuevos del cuadro: eso exige definir sus
          formularios, su ventana de carga y sus permisos.
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
              htmlFor="rol-auth-id"
            >
              <span className="label-text">Identificador en Auth</span>
            </label>
            {esAlta ? (
              <input
                id="rol-auth-id"
                type="number"
                min={1}
                className="input input-bordered input-sm w-full"
                value={idAuth}
                onChange={(evento) => setIdAuth(evento.target.value)}
                disabled={guardando}
              />
            ) : (
              // Calculado, no editable: cambiarlo apuntaría a otro rol distinto.
              <span className="badge badge-ghost badge-sm w-fit">
                {rolAuth.idAuth}
              </span>
            )}
            {/*
              El texto de ayuda va en un `<p>`, no en `<span className="label">`: la clase
              `label` de daisyUI es `white-space: nowrap` y hacía que esta línea larga se
              saliera de la ventana. Un párrafo envuelve con naturalidad.
            */}
            <p className="mt-1 text-xs text-base-content/70">
              El número que Auth central asigna al rol. Es la llave, y no
              cambia aunque alguien edite el nombre allí.
            </p>
          </div>

          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="rol-auth-nombre"
            >
              <span className="label-text">Nombre en Auth</span>
            </label>
            <input
              id="rol-auth-nombre"
              type="text"
              maxLength={120}
              className="input input-bordered input-sm w-full"
              value={nombreAuth}
              onChange={(evento) => setNombreAuth(evento.target.value)}
              disabled={guardando}
              placeholder="Transporte - Operativos"
            />
          </div>

          <div className="form-control w-full">
            <label
              className="label"
              htmlFor="rol-auth-rol"
            >
              <span className="label-text">Rol del Cuadro de Colores</span>
            </label>
            <select
              id="rol-auth-rol"
              className="select select-bordered select-sm w-full"
              value={rol}
              onChange={(evento) =>
                setRol(evento.target.value as RolDepartamental)
              }
              disabled={guardando}
            >
              {/*
                LA OPCIÓN VACÍA ES OBLIGATORIA, no cosmética. Sin ella el `<select>` tiene
                un valor —la cadena vacía— que ninguna de sus opciones contiene, y el
                navegador lo pinta **en blanco**: parecería que hay un rol elegido y no lo
                hay. Es el mismo defecto que tuvo el selector de tamaño del directorio.
              */}
              <option value="">Elija el rol del cuadro…</option>
              {asignables.map((codigo) => (
                <option
                  key={codigo}
                  value={codigo}
                >
                  {nombreDe(codigo)}
                </option>
              ))}
            </select>
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
                <span className="label-text">Vigente</span>
              </label>
            </div>
          )}
        </div>
    </MarcoModal>
  );
};

export default ModalRolAuth;
