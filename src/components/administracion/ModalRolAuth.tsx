/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Roles de Auth central
 * Archivo: ModalRolAuth.tsx
 * Responsabilidad: Dar de alta o editar una correspondencia con un rol de Auth central.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19 · cajón estándar 2026-10-15
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
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` con cabecera institucional y la versalita
 * «Homologación de roles»; ahora es `DrawerLateral` `ancho="md"`, con el pie del estándar: gris
 * «N campos por completar», rojo «Falta: …» tras intentar guardar, verde «Listo para guardar», y
 * la confirmación «¿Descartar cambios?» si se cierra con algo escrito.
 */

import { useState, type FC } from "react";

import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";

import type { RolDepartamental } from "../../config/env.ts";
import type { RolAuth } from "../../interfaces/RolAuth.ts";
import { useCatalogoRoles } from "../../hooks/useCatalogoRoles.ts";
import { estadoPieDrawer, motivoSinCambios } from "../../utils/estadoPieDrawer.util.ts";

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

    El vacío obliga a elegir, y `faltan` lo exige.
    ═══════════════════════════════════════════════════════════════════════════════
  */
  const [rol, setRol] = useState<RolDepartamental | "">(rolAuth?.rol ?? "");
  const [activo, setActivo] = useState(rolAuth?.activo ?? true);
  /** Tras el primer intento de guardar, lo que falta se dice en rojo. */
  const [intentado, setIntentado] = useState(false);

  const identificador = Number(idAuth);
  const identificadorValido = Number.isInteger(identificador) && identificador > 0;

  const faltan = [
    esAlta && !identificadorValido ? "identificador" : null,
    nombreAuth.trim().length === 0 ? "nombre" : null,
    rol === "" ? "rol del cuadro" : null,
  ].filter((campo): campo is string => campo !== null);

  const sucio = esAlta
    ? idAuth !== "" || nombreAuth !== "" || rol !== ""
    : nombreAuth !== rolAuth.nombreAuth || rol !== rolAuth.rol || activo !== rolAuth.activo;

  const estadoPie = estadoPieDrawer({ esEdicion: !esAlta, hayCambios: sucio, intentado, faltan });

  const guardar = () => {
    if (faltan.length > 0) {
      setIntentado(true);
      return;
    }
    onGuardar({
      idAuth: esAlta ? identificador : rolAuth.idAuth,
      nombreAuth: nombreAuth.trim(),
      // `faltan` ya exige un rol elegido: aquí `rol` nunca está vacío.
      rol: rol as RolDepartamental,
      activo,
    });
  };

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo={esAlta ? "Nuevo rol de Auth" : "Editar rol de Auth"}
      subtitulo={
        esAlta
          ? "Correspondencia con un rol del Cuadro de Colores"
          : `${rolAuth.nombreAuth} · identificador ${rolAuth.idAuth}`
      }
      ayuda="Declara a qué rol del Cuadro de Colores corresponde un rol de Auth central. No crea roles nuevos del cuadro: eso exige definir sus formularios, su ventana de carga y sus permisos."
      onCerrar={onCancelar}
      sucio={sucio}
      guardando={guardando}
      onGuardar={guardar}
      estadoPie={estadoPie}
      motivoGuardar={motivoSinCambios(!esAlta, sucio)}
      guardarPendiente={faltan.length > 0}
      errorServidor={aviso}
    >
      <SeccionDrawer titulo="Rol de Auth central" rejilla={false}>
        {esAlta ? (
          <CampoDrawer
            etiqueta="Identificador en Auth"
            requerido
            error={
              intentado && !identificadorValido
                ? "Indique un número entero mayor que cero."
                : null
            }
            ayuda="El número que Auth central asigna al rol. Es la llave, y no cambia aunque alguien edite el nombre allí."
          >
            <input
              type="number"
              min={1}
              className="input input-bordered input-sm w-full"
              value={idAuth}
              onChange={(evento) => setIdAuth(evento.target.value)}
              disabled={guardando}
            />
          </CampoDrawer>
        ) : (
          // Calculado, no editable: cambiarlo apuntaría a otro rol distinto (regla 5).
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-app-label">Identificador en Auth</p>
            <span className="badge badge-ghost badge-sm w-fit">{rolAuth.idAuth}</span>
            <p className="text-xs text-app-muted">
              El número que Auth central asigna al rol. Es la llave, y no cambia aunque
              alguien edite el nombre allí.
            </p>
          </div>
        )}

        <CampoDrawer
          etiqueta="Nombre en Auth"
          requerido
          error={
            intentado && nombreAuth.trim().length === 0
              ? "Indique el nombre del rol en Auth."
              : null
          }
        >
          <input
            type="text"
            maxLength={120}
            className="input input-bordered input-sm w-full"
            value={nombreAuth}
            onChange={(evento) => setNombreAuth(evento.target.value)}
            disabled={guardando}
            placeholder="Transporte - Operativos"
          />
        </CampoDrawer>
      </SeccionDrawer>

      <SeccionDrawer titulo="Correspondencia" rejilla={false}>
        <CampoDrawer
          etiqueta="Rol del Cuadro de Colores"
          requerido
          error={intentado && rol === "" ? "Elija el rol del cuadro." : null}
        >
          <select
            className="select select-bordered select-sm w-full"
            value={rol}
            onChange={(evento) => setRol(evento.target.value as RolDepartamental)}
            disabled={guardando}
          >
            {/*
                LA OPCIÓN VACÍA ES OBLIGATORIA, no cosmética. Sin ella el `<select>` tiene
                un valor —la cadena vacía— que ninguna de sus opciones contiene, y el
                navegador lo pinta **en blanco**: parecería que hay un rol elegido y no lo hay.
              */}
            <option value="">Elija el rol del cuadro…</option>
            {asignables.map((codigo) => (
              <option key={codigo} value={codigo}>
                {nombreDe(codigo)}
              </option>
            ))}
          </select>
        </CampoDrawer>

        {!esAlta && (
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={activo}
              onChange={(evento) => setActivo(evento.target.checked)}
              disabled={guardando}
            />
            <span className="text-sm text-app-strong">Vigente</span>
          </label>
        )}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default ModalRolAuth;
