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

import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import ModalRolAuth from "../components/administracion/ModalRolAuth.tsx";
import TablaRolesAuth from "../components/administracion/TablaRolesAuth.tsx";
import type { RolDepartamental } from "../config/env.ts";
import type { RolAuth } from "../interfaces/RolAuth.ts";
import { RolesAuthService } from "../services/rolesAuth.service.ts";
import { avisoDeFallo, presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import { useCatalogoRoles } from "../hooks/useCatalogoRoles.ts";
import { toast } from "../utils/mensaje.ts";

/** Estado del modal: cerrado, alta, o edición de una fila concreta. */
type Edicion = { modo: "alta" } | { modo: "edicion"; rolAuth: RolAuth } | null;

const AdminRolesAuthPage = () => {
  /** El catálogo de roles sale del servidor: aquí no hay ninguno escrito. */
  const { nombreDe } = useCatalogoRoles();

  const [roles, setRoles] = useState<RolAuth[]>([]);
  const [sinCorrespondencia, setSinCorrespondencia] = useState<
    RolDepartamental[]
  >([]);
  const [cargando, setCargando] = useState(true);

  const [edicion, setEdicion] = useState<Edicion>(null);
  const [guardando, setGuardando] = useState(false);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);

  const [porRetirar, setPorRetirar] = useState<RolAuth | null>(null);

  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  /** Lo guardado se confirma con un aviso breve y la fila resaltada (antes, `ModalExito`). */
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);

  useEffect(() => {
    if (resaltadoId === null) return undefined;
    const quitar = window.setTimeout(() => setResaltadoId(null), 4000);
    return () => window.clearTimeout(quitar);
  }, [resaltadoId]);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const panorama = await RolesAuthService.consultar();
      setRoles(panorama.correspondencias);
      setSinCorrespondencia(panorama.sinCorrespondencia);
      setAviso(null);
    } catch (fallo: unknown) {
      setRoles([]);
      setSinCorrespondencia([]);
      setAviso(avisoDeFallo(fallo));
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
          toast.exito(
            `El rol ${datos.idAuth} de Auth quedó registrado como ${nombreDe(datos.rol)}. ` +
              "Quien entre con él recibirá ese perfil desde el próximo ingreso.",
          );
        } else {
          await RolesAuthService.actualizar(edicion.rolAuth.idAuth, {
            nombreAuth: datos.nombreAuth,
            rol: datos.rol,
            activo: datos.activo,
          });
          toast.exito(
            `La correspondencia ${edicion.rolAuth.idAuth} quedó guardada. ` +
              "Rige desde el próximo ingreso de quien la tenga.",
          );
        }

        setResaltadoId(
          edicion.modo === "alta" ? datos.idAuth : edicion.rolAuth.idAuth,
        );
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
    [cargar, edicion, nombreDe],
  );

  const retirar = useCallback(async () => {
    if (!porRetirar) return;

    // Si el servidor lo rechaza, lanza: el error queda en el modal de la confirmación.
    const resultado = await RolesAuthService.desactivar(porRetirar.idAuth);
    setPorRetirar(null);
    // El servidor redacta el aviso, y distingue si era la última vía de ese rol.
    toast.exito(resultado.mensaje);
    setResaltadoId(porRetirar.idAuth);
    await cargar();
  }, [cargar, porRetirar]);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          Administración
        </p>
        <h1 className="page-heading-title">
          Roles de Auth central
        </h1>
        <p className="page-heading-subtitle text-sm">
          A qué rol del Cuadro de Colores corresponde cada rol de Auth. Es lo que
          decide qué formularios ve una persona cuando entra desde el portal.
        </p>
      </header>

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudieron cargar los roles"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      {/* Los huecos. Color Y palabra: la regla 6 vale también aquí. */}
      {sinCorrespondencia.length > 0 && (
        <AvisoEnLinea
          variante="advertencia"
          titulo={`Sin rol en Auth central: ${sinCorrespondencia.map((rol) => nombreDe(rol)).join(", ")}`}
        >
          <span className="text-xs">
            Nadie puede entrar con esos perfiles: sin un rol de Transporte en
            Auth, esa persona no puede elegir el módulo en el portal. Debe
            crearse allí y registrarse aquí.
          </span>
        </AvisoEnLinea>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Correspondencias
          </h2>
          <div className="flex items-center gap-3">
            <span className="badge badge-ghost badge-sm">
              {cargando ? "Cargando…" : `${roles.length} registradas`}
            </span>
            <Boton
              variante="primario"
              tamano="sm"
              enBarraOscura
              onClick={() => {
                setEdicion({ modo: "alta" });
                setAvisoModal(null);
              }}
              deshabilitado={cargando || guardando}
            >
              + Nuevo rol
            </Boton>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <p className="text-xs text-app-muted">
            Retirar una correspondencia no la borra: se conserva porque explica
            por qué una cuenta dada de alta en su día recibió el rol que recibió.
            Varias filas pueden apuntar al mismo rol del cuadro, si Auth divide
            un área en zonas.
          </p>

          <TablaRolesAuth
            nombreDe={nombreDe}
            roles={roles}
            cargando={cargando}
            procesando={guardando}
            onEditar={(rolAuth) => {
              setEdicion({ modo: "edicion", rolAuth });
              setAvisoModal(null);
            }}
            onDesactivar={setPorRetirar}
            resaltadoId={resaltadoId}
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
        <MensajeModal
          variante="peligro"
          titulo={`¿Retirar el rol ${porRetirar.idAuth}?`}
          mensaje={
            `El rol ${porRetirar.idAuth} de Auth dejará de dar acceso como ` +
            `${nombreDe(porRetirar.rol)}. La fila se conserva y puede volver a activarse.`
          }
          textoPrincipal="Sí, retirar"
          tituloError="No se pudo retirar el rol"
          onPrincipal={retirar}
          onSecundario={() => setPorRetirar(null)}
        />
      )}
    </section>
  );
};

export default AdminRolesAuthPage;
