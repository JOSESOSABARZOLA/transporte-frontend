/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Cuentas del módulo
 * Archivo: AdminUsuariosPage.tsx
 * Responsabilidad: Pantalla P-11. Dar de alta y mantener las cuentas del Cuadro de Colores.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE. Hasta el 2026-08-19 las cuentas se sembraban desde un archivo de
 * insumo. Al retirar la semilla, dar de alta a alguien se volvió una sentencia SQL a
 * mano, y eso no es aceptable para la operación que decide QUIÉN entra y CON QUÉ ROL:
 * equivocarse hacia Dirección da acceso a la matriz consolidada entera, que es la
 * información cuyo filtrado originó este proyecto.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SE CONSULTAN LOS ROLES DE AUTH TAMBIÉN, y no es un adorno: sirve para avisar cuando el
 * rol elegido no tiene ningún rol de Transporte en Auth. Hoy le pasa a Funcionario, y
 * significa que esa persona **no podrá entrar** por mucho que la cuenta exista. Sin este
 * aviso, el alta parecería correcta y el problema aparecería cuando esa persona lo
 * intentara.
 */

import { useCallback, useEffect, useState } from "react";

import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import ModalUsuario from "../components/administracion/ModalUsuario.tsx";
import TablaUsuarios from "../components/administracion/TablaUsuarios.tsx";
import type { RolDepartamental } from "../config/env.ts";
import type { UsuarioCuadro } from "../interfaces/UsuarioCuadro.ts";
import { RolesAuthService } from "../services/rolesAuth.service.ts";
import { UsuariosCuadroService } from "../services/usuariosCuadro.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";

/** Estado del modal: cerrado, alta, o edición de una cuenta concreta. */
type Edicion =
  | { modo: "alta" }
  | { modo: "edicion"; usuario: UsuarioCuadro }
  | null;

const AdminUsuariosPage = () => {
  const [usuarios, setUsuarios] = useState<UsuarioCuadro[]>([]);
  const [rolesSinAcceso, setRolesSinAcceso] = useState<RolDepartamental[]>([]);
  const [cargando, setCargando] = useState(true);

  const [edicion, setEdicion] = useState<Edicion>(null);
  const [guardando, setGuardando] = useState(false);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);

  const [porDesactivar, setPorDesactivar] = useState<UsuarioCuadro | null>(null);

  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      // Las dos a la vez: la segunda solo alimenta el aviso del modal, así que un fallo
      // suyo no debe impedir administrar cuentas. Por eso se resuelve aparte.
      const [lista, panorama] = await Promise.all([
        UsuariosCuadroService.listar(),
        RolesAuthService.consultar().catch(() => null),
      ]);

      setUsuarios(lista);
      setRolesSinAcceso(panorama?.sinCorrespondencia ?? []);
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setUsuarios([]);
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
      correo: string;
      nombre: string;
      roles: RolDepartamental[];
      identificadorAd: string | null;
      funcionarioCedula: string | null;
      activo: boolean;
    }) => {
      if (!edicion) return;

      setGuardando(true);
      setAvisoModal(null);

      try {
        if (edicion.modo === "alta") {
          const creada = await UsuariosCuadroService.crear({
            correo: datos.correo,
            nombre: datos.nombre,
            roles: datos.roles,
            identificadorAd: datos.identificadorAd,
            funcionarioCedula: datos.funcionarioCedula,
          });
          setExito(
            `La cuenta de ${creada.nombre} quedó creada.` +
              (creada.identificadorAd
                ? " Podrá entrar desde el portal institucional."
                : " Todavía NO puede entrar: le falta el usuario de Auth central."),
          );
        } else {
          const actualizada = await UsuariosCuadroService.actualizar(
            edicion.usuario.id,
            {
              nombre: datos.nombre,
              roles: datos.roles,
              identificadorAd: datos.identificadorAd,
              funcionarioCedula: datos.funcionarioCedula,
              activo: datos.activo,
            },
          );
          setExito(
            `La cuenta de ${actualizada.nombre} quedó guardada. ` +
              "Los cambios rigen desde su próximo ingreso: el perfil viaja en la cookie de sesión.",
          );
        }

        setEdicion(null);
        await cargar();
      } catch (fallo: unknown) {
        setAvisoModal(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [cargar, edicion],
  );

  const desactivar = useCallback(async () => {
    if (!porDesactivar) return;

    setGuardando(true);

    try {
      const desactivada = await UsuariosCuadroService.desactivar(
        porDesactivar.id,
      );
      setPorDesactivar(null);
      setExito(
        `La cuenta de ${desactivada.nombre} quedó desactivada. ` +
          "No podrá entrar, y su sesión abierta caerá en el próximo intento.",
      );
      await cargar();
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setPorDesactivar(null);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setGuardando(false);
    }
  }, [cargar, porDesactivar]);

  const sinIngreso = usuarios.filter(
    (usuario) => usuario.activo && !usuario.identificadorAd,
  ).length;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          Administración
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
          Cuentas del cuadro
        </h1>
        <p className="page-heading-subtitle text-sm">
          Quién entra al Cuadro de Colores y con qué rol. Auth central acredita la
          identidad; esta lista decide el perfil dentro del módulo.
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

      {sinIngreso > 0 && (
        <div
          className="alert alert-warning"
          role="status"
        >
          <span>
            {sinIngreso === 1
              ? "Hay una cuenta activa sin usuario de Auth central: esa persona no puede entrar."
              : `Hay ${sinIngreso} cuentas activas sin usuario de Auth central: esas personas no pueden entrar.`}
          </span>
        </div>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Cuentas
          </h2>
          <div className="flex items-center gap-3">
            <span className="badge badge-ghost badge-sm">
              {cargando ? "Cargando…" : `${usuarios.length} registradas`}
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
              Nueva cuenta
            </button>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <p className="text-xs text-base-content/70">
            Desactivar una cuenta no la borra: las trazas de auditoría guardan
            quién hizo cada cambio, y borrarla las dejaría apuntando a nadie. Una
            cuenta desactivada se puede volver a activar desde Editar.
          </p>

          <TablaUsuarios
            usuarios={usuarios}
            cargando={cargando}
            procesando={guardando}
            onEditar={(usuario) => {
              setEdicion({ modo: "edicion", usuario });
              setAvisoModal(null);
            }}
            onDesactivar={setPorDesactivar}
          />
        </div>
      </div>

      {edicion && (
        <ModalUsuario
          // Cambiar de cuenta vuelve a montar el modal: los valores de la anterior no
          // sobreviven bajo el nombre de la siguiente.
          key={edicion.modo === "alta" ? "alta" : edicion.usuario.id}
          usuario={edicion.modo === "alta" ? null : edicion.usuario}
          guardando={guardando}
          aviso={avisoModal}
          rolesSinAcceso={rolesSinAcceso}
          onGuardar={(datos) => void guardar(datos)}
          onCancelar={() => setEdicion(null)}
        />
      )}

      {porDesactivar && (
        <ModalConfirmacion
          abierto
          titulo="Desactivar la cuenta"
          mensaje={
            `${porDesactivar.nombre} dejará de poder entrar al Cuadro de Colores. ` +
            "La cuenta se conserva y puede volver a activarse."
          }
          procesando={guardando}
          onConfirmar={() => void desactivar()}
          onCancelar={() => setPorDesactivar(null)}
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

export default AdminUsuariosPage;
