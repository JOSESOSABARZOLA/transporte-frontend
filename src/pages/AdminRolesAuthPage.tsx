/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Homologación de roles
 * Archivo: AdminRolesAuthPage.tsx
 * Responsabilidad: Pantalla P-10. Administrar la correspondencia con los roles de Auth central.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ RESUELVE. Auth central nombra sus roles «Transporte - Operativos»; este módulo los
 * llama `DMIP_OPERATIVOS`. Hasta hoy la equivalencia vivía como comentario en un archivo
 * de semilla y quien daba de alta a alguien la copiaba a ojo. Equivocarse hacia Dirección
 * significa dar acceso a la matriz consolidada entera, y nada lo habría detectado.
 *
 * LO QUE ESTA PANTALLA NO HACE, y se dice en ella para que nadie lo busque: crear roles
 * NUEVOS del Cuadro de Colores. Registrar un rol de Auth que corresponde a uno que ya
 * existe es un alta —si Auth separa la DAF en dos zonas, son dos filas apuntando a DAF—,
 * pero un actor genuinamente nuevo exige definir qué formularios posee, si tiene ventana
 * de carga y qué le permiten las cuatro guardas. Eso es una decisión del negocio y una
 * migración, no una fila que alguien inserta.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LOS HUECOS SE MUESTRAN. El servidor devuelve qué roles del módulo no tienen rol activo
 * en Auth. Hoy es `FUNCIONARIO`, y significa que quien recibe una orden de servicio no
 * puede elegir el módulo en el portal: P-06 le resulta inaccesible. Verlo aquí evita
 * descubrirlo cuando esa persona no logra entrar.
 */

import { useCallback, useEffect, useState } from "react";

import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import ModalRolAuth from "../components/administracion/ModalRolAuth.tsx";
import TablaRolesAuth from "../components/administracion/TablaRolesAuth.tsx";
import type { RolDepartamental } from "../config/env.ts";
import type { RolAuth } from "../interfaces/RolAuth.ts";
import { RolesAuthService } from "../services/rolesAuth.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { NOMBRE_ROL } from "../utils/parametro.util.ts";

/** Estado del modal: cerrado, alta, o edición de una fila concreta. */
type Edicion = { modo: "alta" } | { modo: "edicion"; rolAuth: RolAuth } | null;

const AdminRolesAuthPage = () => {
  const [roles, setRoles] = useState<RolAuth[]>([]);
  const [sinCorrespondencia, setSinCorrespondencia] = useState<
    RolDepartamental[]
  >([]);
  const [cargando, setCargando] = useState(true);

  const [edicion, setEdicion] = useState<Edicion>(null);
  const [guardando, setGuardando] = useState(false);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);

  const [porRetirar, setPorRetirar] = useState<RolAuth | null>(null);

  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const panorama = await RolesAuthService.consultar();
      setRoles(panorama.correspondencias);
      setSinCorrespondencia(panorama.sinCorrespondencia);
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setRoles([]);
      setSinCorrespondencia([]);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = useCallback(
    async (datos: {
      idAuth: number;
      nombreAuth: string;
      rol: RolDepartamental;
      activo: boolean;
    }) => {
      if (!edicion) return;

      setGuardando(true);
      setAvisoModal(null);

      try {
        if (edicion.modo === "alta") {
          await RolesAuthService.crear({
            idAuth: datos.idAuth,
            nombreAuth: datos.nombreAuth,
            rol: datos.rol,
          });
          setExito(
            `El rol ${datos.idAuth} de Auth quedó registrado como ${NOMBRE_ROL[datos.rol]}. ` +
              "Quien entre con él recibirá ese perfil desde el próximo ingreso.",
          );
        } else {
          await RolesAuthService.actualizar(edicion.rolAuth.idAuth, {
            nombreAuth: datos.nombreAuth,
            rol: datos.rol,
            activo: datos.activo,
          });
          setExito(
            `La correspondencia ${edicion.rolAuth.idAuth} quedó guardada. ` +
              "Rige desde el próximo ingreso de quien la tenga.",
          );
        }

        setEdicion(null);
        // Se recarga entera y no se parchea la fila: el panorama incluye los huecos, y
        // un alta puede cerrar uno.
        await cargar();
      } catch (fallo: unknown) {
        setAvisoModal(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [cargar, edicion],
  );

  const retirar = useCallback(async () => {
    if (!porRetirar) return;

    setGuardando(true);

    try {
      const resultado = await RolesAuthService.desactivar(porRetirar.idAuth);
      setPorRetirar(null);
      // El servidor redacta el aviso, y distingue si era la última vía de ese rol.
      setExito(resultado.mensaje);
      await cargar();
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setPorRetirar(null);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setGuardando(false);
    }
  }, [cargar, porRetirar]);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          Administración
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
          Roles de Auth central
        </h1>
        <p className="page-heading-subtitle text-sm">
          A qué rol del Cuadro de Colores corresponde cada rol de Auth. Es lo que
          decide qué formularios ve una persona cuando entra desde el portal.
        </p>
      </header>

      {aviso && (
        <div
          className={`alert ${aviso.clase}`}
          role="alert"
        >
          <span>{aviso.texto}</span>
        </div>
      )}

      {/* Los huecos. Color Y palabra: la regla 6 vale también aquí. */}
      {sinCorrespondencia.length > 0 && (
        <div
          className="alert alert-warning"
          role="status"
        >
          <div className="flex flex-col gap-1">
            <span className="font-semibold">
              Sin rol en Auth central:{" "}
              {sinCorrespondencia.map((rol) => NOMBRE_ROL[rol]).join(", ")}
            </span>
            <span className="text-xs">
              Nadie puede entrar con esos perfiles: sin un rol de Transporte en
              Auth, esa persona no puede elegir el módulo en el portal. Debe
              crearse allí y registrarse aquí.
            </span>
          </div>
        </div>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Correspondencias
          </h2>
          <div className="flex items-center gap-3">
            <span className="badge badge-ghost badge-sm">
              {cargando ? "Cargando…" : `${roles.length} registradas`}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={() => {
                setEdicion({ modo: "alta" });
                setAvisoModal(null);
              }}
              disabled={cargando || guardando}
            >
              Registrar rol
            </button>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <p className="text-xs text-base-content/70">
            Retirar una correspondencia no la borra: se conserva porque explica
            por qué una cuenta dada de alta en su día recibió el rol que recibió.
            Varias filas pueden apuntar al mismo rol del cuadro, si Auth divide
            un área en zonas.
          </p>

          <TablaRolesAuth
            roles={roles}
            cargando={cargando}
            procesando={guardando}
            onEditar={(rolAuth) => {
              setEdicion({ modo: "edicion", rolAuth });
              setAvisoModal(null);
            }}
            onDesactivar={setPorRetirar}
          />
        </div>
      </div>

      {edicion && (
        <ModalRolAuth
          // Cambiar de fila vuelve a montar el modal: los valores de la anterior no
          // sobreviven bajo el rótulo de la siguiente.
          key={edicion.modo === "alta" ? "alta" : edicion.rolAuth.idAuth}
          rolAuth={edicion.modo === "alta" ? null : edicion.rolAuth}
          guardando={guardando}
          aviso={avisoModal}
          onGuardar={(datos) => void guardar(datos)}
          onCancelar={() => setEdicion(null)}
        />
      )}

      {porRetirar && (
        <ModalConfirmacion
          abierto
          titulo="Retirar la correspondencia"
          mensaje={
            `El rol ${porRetirar.idAuth} de Auth dejará de dar acceso como ` +
            `${NOMBRE_ROL[porRetirar.rol]}. La fila se conserva y puede volver a activarse.`
          }
          procesando={guardando}
          onConfirmar={() => void retirar()}
          onCancelar={() => setPorRetirar(null)}
        />
      )}

      {exito && (
        <ModalExito
          abierto
          mensaje={exito}
          onClose={() => setExito(null)}
        />
      )}
    </section>
  );
};

export default AdminRolesAuthPage;
