/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Cuentas del módulo
 * Archivo: DrawerFlujoCuenta.tsx
 * Responsabilidad: Componer el cajón de la cuenta con sus dos pasos —buscar persona y completar
 *                  la cuenta— reutilizando el cajón, el stepper y el paso 1 compartidos con P-07.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA MISMA VENTANA QUE P-07, CON OTRO VOCABULARIO Y OTRO PASO 2. 2026-09-30.
 *
 * El cascarón (`DrawerLateral`), el indicador de pasos (`Stepper`) y el paso 1 (`PasoBuscarPersona`,
 * parametrizado por `proposito`) se COMPARTEN con Personal. Lo propio de esta pantalla es el paso 2:
 * el formulario de la cuenta (correo, nombre, roles, usuario de Auth, cédula de enlace). Sustituye a
 * `ModalDirectorioAuth` (paso 1) + `ModalUsuario` (paso 2), que se retiraron.
 *
 * NO REUSA `DrawerFlujoAlta` (el de la ficha) porque aquél está atado a Formik y al esquema de la
 * ficha; la cuenta tiene otro formulario y otras reglas. Duplicar la orquestación —pequeña— es más
 * barato y seguro que generalizar un componente que ya funciona en P-07.
 *
 * LA CÉDULA SOLO SE PRECARGA SI ESA PERSONA YA TIENE FICHA: es el enlace a `t_funcionario`, no un
 * dato de la persona. Precargar la cédula de Auth de quien no está fichado mataría el alta con «no
 * hay ficha con esa cédula». Ese matiz vive en `alContinuar`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import DrawerLateral from "../common/DrawerLateral.tsx";
import Stepper from "../common/Stepper.tsx";
import PasoBuscarPersona from "../personal/PasoBuscarPersona.tsx";
import { PARA_CUENTA } from "../personal/propositoDirectorio.ts";

import type { RolDepartamental } from "../../config/env.ts";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { UsuarioCuadro } from "../../interfaces/UsuarioCuadro.ts";
import { useCatalogoRoles } from "../../hooks/useCatalogoRoles.ts";

/** Lo que el pie envía al guardar; misma forma que consumía el modal anterior. */
export type DatosCuenta = {
  correo: string;
  nombre: string;
  roles: RolDepartamental[];
  identificadorAd: string | null;
  funcionarioCedula: string | null;
  activo: boolean;
};

type DrawerFlujoCuentaProps = {
  abierto: boolean;
  /** `alta` empieza en el paso 1; `edicion` abre directo en la cuenta, sin stepper. */
  modo: "alta" | "edicion";
  /** La cuenta a corregir, en modo edición. */
  usuarioEdicion: UsuarioCuadro | null;
  /** Paso 1 (alta): el directorio de Auth. */
  filas: FilaDirectorio[];
  disponible: boolean;
  motivo: string | null;
  cargando: boolean;
  onActualizar: () => void;
  /** Roles sin camino desde Auth: quien los reciba no podrá entrar (aviso, no bloqueo). */
  rolesSinAcceso: RolDepartamental[];
  guardando: boolean;
  /** Rechazo del servidor. Se muestra tal cual (regla 7). */
  aviso: string | null;
  onGuardar: (datos: DatosCuenta) => void;
  onCerrar: () => void;
};

const PASOS = [
  { numero: 1, titulo: "Buscar persona" },
  { numero: 2, titulo: "Completar cuenta" },
];

const DrawerFlujoCuenta: FC<DrawerFlujoCuentaProps> = ({
  abierto,
  modo,
  usuarioEdicion,
  filas,
  disponible,
  motivo,
  cargando,
  onActualizar,
  rolesSinAcceso,
  guardando,
  aviso,
  onGuardar,
  onCerrar,
}) => {
  const { asignables, nombreDe } = useCatalogoRoles();

  const esAlta = modo === "alta";

  /*
    EL ESTADO SE INICIALIZA AL MONTAR, y el padre REMONTA el cajón con un `key` que cambia entre
    alta y la edición de cada cuenta. Así se reinicia sin un `useEffect` que llame a `setState`
    (que dispararía renders en cascada): en edición abre en el paso 2 con la cuenta cargada; en
    alta, vacío en el paso 1. Como no hay efecto, teclear nunca borra lo capturado.
  */
  const [paso, setPaso] = useState<1 | 2>(usuarioEdicion ? 2 : 1);
  const [elegidaId, setElegidaId] = useState<number | null>(null);
  /** Si el paso 2 nació del directorio: guía el aviso de «sin ficha» de la cédula. */
  const [desdeAuth, setDesdeAuth] = useState(false);

  const [correo, setCorreo] = useState(usuarioEdicion ? usuarioEdicion.correo : "");
  const [nombre, setNombre] = useState(usuarioEdicion ? usuarioEdicion.nombre : "");
  const [roles, setRoles] = useState<RolDepartamental[]>(
    usuarioEdicion ? usuarioEdicion.roles : [],
  );
  const [identificadorAd, setIdentificadorAd] = useState(
    usuarioEdicion?.identificadorAd ?? "",
  );
  const [cedula, setCedula] = useState(
    usuarioEdicion?.funcionario?.cedula ?? "",
  );
  const [activo, setActivo] = useState(usuarioEdicion ? usuarioEdicion.activo : true);

  const alternarRol = (rol: RolDepartamental) =>
    setRoles((actuales) =>
      actuales.includes(rol)
        ? actuales.filter((otro) => otro !== rol)
        : [...actuales, rol],
    );

  const alContinuar = () => {
    const fila = filas.find((f) => f.authId === elegidaId);
    if (!fila) return;
    setDesdeAuth(true);
    setCorreo(fila.correo);
    setNombre(fila.nombre);
    setIdentificadorAd(fila.usuario);
    // La cédula solo enlaza una ficha existente; sin ficha queda vacía (respuesta válida).
    setCedula(fila.ficha ? fila.cedula : "");
    setPaso(2);
  };

  const registroManual = () => {
    setDesdeAuth(false);
    setCorreo("");
    setNombre("");
    setIdentificadorAd("");
    setCedula("");
    setPaso(2);
  };

  // SIN NINGÚN ROL NO SE PUEDE GUARDAR. El servidor también lo rechaza; aquí el botón apagado
  // explica el porqué antes de intentarlo. En alta, además, el correo es obligatorio.
  const puedeGuardar =
    nombre.trim().length > 0 &&
    roles.length > 0 &&
    (esAlta ? correo.trim().length > 0 : true);

  const elegidosSinAcceso = roles.filter((rol) => rolesSinAcceso.includes(rol));

  const guardar = () =>
    onGuardar({
      correo: correo.trim(),
      nombre: nombre.trim(),
      roles,
      identificadorAd: identificadorAd.trim() || null,
      funcionarioCedula: cedula.trim() || null,
      activo,
    });

  const pie =
    paso === 1 && esAlta ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={registroManual}
        >
          ¿No aparece? Registro manual
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={elegidaId == null}
            onClick={alContinuar}
          >
            Continuar
          </button>
        </div>
      </div>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {esAlta ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPaso(1)}
            disabled={guardando}
          >
            ← Atrás
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={guardar}
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
            ) : esAlta ? (
              "Crear cuenta"
            ) : (
              "Guardar cambios"
            )}
          </button>
        </div>
      </div>
    );

  return (
    <DrawerLateral
      abierto={abierto}
      antetitulo={esAlta ? PARA_CUENTA.antetitulo : "Cuentas del cuadro"}
      titulo={
        !esAlta
          ? `Editar cuenta${usuarioEdicion ? ` de ${usuarioEdicion.nombre}` : ""}`
          : paso === 1
            ? "Buscar persona"
            : "Completar cuenta"
      }
      onCerrar={guardando ? undefined : onCerrar}
      pie={pie}
    >
      <div className="flex flex-col gap-4">
        {esAlta && (
          <Stepper
            pasos={PASOS}
            actual={paso}
            completados={paso === 2 ? [1] : []}
          />
        )}

        {paso === 1 && esAlta ? (
          <PasoBuscarPersona
            proposito={PARA_CUENTA}
            filas={filas}
            disponible={disponible}
            motivo={motivo}
            cargando={cargando}
            onActualizar={onActualizar}
            elegidaId={elegidaId}
            onSeleccionar={(fila) => setElegidaId(fila.authId)}
            onRegistroManual={registroManual}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-base-content/70">
              Quién entra al Cuadro de Colores y con qué rol. Auth central acredita la
              identidad; esta cuenta decide el perfil dentro del módulo.
            </p>

            {aviso && (
              <div
                className="alert alert-error"
                role="alert"
              >
                <span>{aviso}</span>
              </div>
            )}

            <div className="form-control w-full">
              <label
                className="label"
                htmlFor="cuenta-correo"
              >
                <span className="label-text">Correo institucional</span>
              </label>
              {esAlta ? (
                <input
                  id="cuenta-correo"
                  type="email"
                  maxLength={160}
                  className="input input-bordered input-sm w-full"
                  value={correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                  disabled={guardando}
                  placeholder="nombre.apellido@quito.gob.ec"
                />
              ) : (
                // Llave natural de la cuenta: no se edita (regla 5). El valor completo, en el title.
                <span
                  className="badge badge-ghost badge-sm min-w-0 max-w-full"
                  title={correo}
                >
                  <span className="min-w-0 truncate">{correo}</span>
                </span>
              )}
            </div>

            <div className="form-control w-full">
              <label
                className="label"
                htmlFor="cuenta-nombre"
              >
                <span className="label-text">Nombre completo</span>
              </label>
              <input
                id="cuenta-nombre"
                type="text"
                maxLength={160}
                className="input input-bordered input-sm w-full"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                disabled={guardando}
                placeholder="Apellidos Nombres"
              />
              <p className="mt-1 text-xs text-base-content/70">
                Es el nombre que se muestra en la barra superior. Auth no lo envía,
                así que se escribe aquí.
              </p>
            </div>

            {/* Casillas y no `<select multiple>`: la selección múltiple nativa pierde lo elegido. */}
            <fieldset className="form-control w-full">
              <legend className="label">
                <span className="label-text">Roles en el cuadro</span>
              </legend>

              <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                {asignables.map((codigo) => (
                  <label
                    key={codigo}
                    className="label cursor-pointer justify-start gap-3 py-1"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm shrink-0"
                      checked={roles.includes(codigo)}
                      onChange={() => alternarRol(codigo)}
                      disabled={guardando}
                    />
                    <span className="label-text min-w-0 whitespace-normal">
                      {nombreDe(codigo)}
                    </span>
                  </label>
                ))}
              </div>

              <p className="mt-1 text-xs text-base-content/70">
                Puede elegir varios: esta persona verá la unión de los formularios
                de todos ellos.
              </p>

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

              {elegidosSinAcceso.length > 0 && (
                <div
                  className="alert alert-warning mt-2"
                  role="alert"
                >
                  <span className="text-xs">
                    {elegidosSinAcceso.map((rol) => nombreDe(rol)).join(", ")} no
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
                htmlFor="cuenta-auth"
              >
                <span className="label-text">Usuario de Auth central</span>
              </label>
              <input
                id="cuenta-auth"
                type="text"
                maxLength={120}
                className="input input-bordered input-sm w-full"
                value={identificadorAd}
                onChange={(evento) => setIdentificadorAd(evento.target.value)}
                disabled={guardando}
                placeholder="ffnavarrete"
              />
              <p className="mt-1 text-xs text-base-content/70">
                Es la llave del ingreso: el canje busca esta cuenta por ese usuario.
                Si queda vacío, esta persona no podrá entrar.
              </p>
            </div>

            <div className="form-control w-full">
              <label
                className="label"
                htmlFor="cuenta-cedula"
              >
                <span className="label-text">Cédula de la ficha de personal</span>
              </label>
              <input
                id="cuenta-cedula"
                type="text"
                maxLength={10}
                className="input input-bordered input-sm w-full"
                value={cedula}
                onChange={(evento) => setCedula(evento.target.value)}
                disabled={guardando}
                placeholder="0000000000"
              />
              <p className="mt-1 text-xs text-base-content/70">
                Enlaza con el maestro de personal para que reciba sus órdenes de
                servicio. Déjelo vacío si esta persona no sale a operativos:
                Dirección y administración no reciben ninguna.
              </p>

              {desdeAuth && cedula === "" && (
                <div
                  className="alert alert-info mt-2"
                  role="status"
                >
                  <span className="text-xs">
                    Esta persona <strong>no tiene ficha de personal</strong> en el
                    sistema, así que no hay ninguna a la que enlazar. Puede crear la
                    cuenta igualmente. Si debiera salir a operativos, regístrela
                    primero en «Personal y disponibilidad».
                  </span>
                </div>
              )}
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
        )}
      </div>
    </DrawerLateral>
  );
};

export default DrawerFlujoCuenta;
