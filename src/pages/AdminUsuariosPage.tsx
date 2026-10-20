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
 * EL ALTA Y LA EDICIÓN VIVEN EN EL CAJÓN COMPARTIDO (2026-09-30). El alta empieza en el
 * paso 1 (buscar en el directorio de Auth) y sigue en el paso 2 (completar la cuenta); la
 * edición abre directo en el paso 2. Es la misma ventana que P-07, con otro vocabulario
 * (`PARA_CUENTA`) y otro paso 2. `ModalDirectorioAuth` y `ModalUsuario` se retiraron.
 *
 * SE CONSULTAN LOS ROLES DE AUTH TAMBIÉN, y no es un adorno: avisa cuando el rol elegido no
 * tiene ningún rol de Transporte en Auth. Sin ese aviso, el alta parecería correcta y la
 * persona descubriría que no puede entrar cuando lo intentara.
 */

import { useCallback, useEffect, useState } from "react";

import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import DrawerFlujoCuenta, {
  type DatosCuenta,
} from "../components/administracion/DrawerFlujoCuenta.tsx";
import TablaUsuarios from "../components/administracion/TablaUsuarios.tsx";
import type { RolDepartamental } from "../config/env.ts";
import type { FilaDirectorio } from "../interfaces/DirectorioAuth.ts";
import type { UsuarioCuadro } from "../interfaces/UsuarioCuadro.ts";
import { PersonalService } from "../services/personal.service.ts";
import { RolesAuthService } from "../services/rolesAuth.service.ts";
import { UsuariosCuadroService } from "../services/usuariosCuadro.service.ts";
import { avisoDeFallo, presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import { MS_RESALTADO } from "../utils/listadoOperativos.util.ts";
import { useCatalogoRoles } from "../hooks/useCatalogoRoles.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

/** Estado del cajón: cerrado, alta, o edición de una cuenta concreta. */
type Flujo =
  | { modo: "alta" }
  | { modo: "edicion"; usuario: UsuarioCuadro }
  | null;

const AdminUsuariosPage = () => {
  /** El catálogo de roles sale del servidor: aquí no hay ninguno escrito. */
  const { nombreDe } = useCatalogoRoles();

  const [usuarios, setUsuarios] = useState<UsuarioCuadro[]>([]);
  const [rolesSinAcceso, setRolesSinAcceso] = useState<RolDepartamental[]>([]);
  const [cargando, setCargando] = useState(true);

  const [flujo, setFlujo] = useState<Flujo>(null);
  const [guardando, setGuardando] = useState(false);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);

  const [porDesactivar, setPorDesactivar] = useState<UsuarioCuadro | null>(null);
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);

  // El resaltado de la cuenta recién activada se apaga solo.
  useEffect(() => {
    if (resaltadoId === null) return;
    const espera = window.setTimeout(() => setResaltadoId(null), MS_RESALTADO);
    return () => window.clearTimeout(espera);
  }, [resaltadoId]);

  /**
   * EL ALTA EMPIEZA EN EL DIRECTORIO DE AUTH, que NO se consulta al entrar sino al pulsar
   * «Nueva cuenta»: cuesta una llamada a otro sistema —hasta cinco segundos— y quien entra a
   * corregir un rol no tiene por qué pagarla.
   */
  const [directorio, setDirectorio] = useState<FilaDirectorio[]>([]);
  const [cargandoDirectorio, setCargandoDirectorio] = useState(false);
  /** Que Auth no esté es un **estado**, no un error de la petición. */
  const [directorioDisponible, setDirectorioDisponible] = useState(true);
  const [motivoDirectorio, setMotivoDirectorio] = useState<string | null>(null);

  const cargarDirectorio = useCallback(async () => {
    setCargandoDirectorio(true);

    try {
      const respuesta = await PersonalService.consultarDirectorio();

      setDirectorio(respuesta.personas);
      setDirectorioDisponible(respuesta.disponible);
      setMotivoDirectorio(respuesta.motivo);
    } catch (fallo: unknown) {
      // Aquí solo llegan los fallos que **no** son de Auth: nuestro backend caído, un 403.
      const error = presentarError(fallo);
      setDirectorio([]);
      setDirectorioDisponible(false);
      setMotivoDirectorio(error.mensaje);
    } finally {
      setCargandoDirectorio(false);
    }
  }, []);

  /** «Nueva cuenta» abre el cajón en el paso 1 y pide el directorio. */
  const abrirAlta = useCallback(() => {
    setAvisoModal(null);
    setFlujo({ modo: "alta" });
    void cargarDirectorio();
  }, [cargarDirectorio]);

  const [aviso, setAviso] = useState<AvisoTexto | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      // Las dos a la vez: la segunda solo alimenta el aviso del cajón, así que un fallo suyo
      // no debe impedir administrar cuentas. Por eso se resuelve aparte.
      const [lista, panorama] = await Promise.all([
        UsuariosCuadroService.listar(),
        RolesAuthService.consultar().catch(() => null),
      ]);

      setUsuarios(lista);
      setRolesSinAcceso(panorama?.sinCorrespondencia ?? []);
      setAviso(null);
    } catch (fallo: unknown) {
      setUsuarios([]);
      setAviso(avisoDeFallo(fallo));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = useCallback(
    async (datos: DatosCuenta) => {
      if (!flujo) return;

      setGuardando(true);
      setAvisoModal(null);

      try {
        if (flujo.modo === "alta") {
          const creada = await UsuariosCuadroService.crear({
            correo: datos.correo,
            nombre: datos.nombre,
            roles: datos.roles,
            identificadorAd: datos.identificadorAd,
            funcionarioCedula: datos.funcionarioCedula,
          });
          // D3 (cajón estándar, 2026-10-15): aviso breve y fila resaltada, no un modal de éxito.
          setResaltadoId(creada.id);
          toast.exito(
            `La cuenta de ${creada.nombre} quedó creada.` +
              (creada.identificadorAd
                ? " Podrá entrar desde el portal institucional."
                : " Todavía NO puede entrar: le falta el usuario de Auth central."),
          );
        } else {
          const actualizada = await UsuariosCuadroService.actualizar(
            flujo.usuario.id,
            {
              nombre: datos.nombre,
              roles: datos.roles,
              identificadorAd: datos.identificadorAd,
              funcionarioCedula: datos.funcionarioCedula,
              activo: datos.activo,
            },
          );
          setResaltadoId(actualizada.id);
          toast.exito(
            `La cuenta de ${actualizada.nombre} quedó guardada. ` +
              "Los cambios rigen desde su próximo ingreso: el perfil viaja en la cookie de sesión.",
          );
        }

        setFlujo(null);
        await cargar();
      } catch (fallo: unknown) {
        setAvisoModal(presentarError(fallo).mensaje);
      } finally {
        setGuardando(false);
      }
    },
    [cargar, flujo],
  );

  const desactivar = useCallback(async () => {
    if (!porDesactivar) return;

    // Si el servidor la rechaza, lanza: el error queda en el modal de la confirmación.
    const desactivada = await UsuariosCuadroService.desactivar(porDesactivar.id);
    setPorDesactivar(null);
    setResaltadoId(desactivada.id);
    toast.exito(
      `La cuenta de ${desactivada.nombre} quedó desactivada. ` +
        "No podrá entrar, y su sesión abierta caerá en el próximo intento.",
    );
    await cargar();
  }, [cargar, porDesactivar]);

  /**
   * ↺ Activar en la fila (estándar de botones). No pide confirmación: devolver el acceso es
   * reversible y la fila lo dice. El servidor acepta el cuerpo parcial `{ activo: true }`.
   */
  const activar = useCallback(
    async (usuario: UsuarioCuadro) => {
      setGuardando(true);
      try {
        const activada = await UsuariosCuadroService.actualizar(usuario.id, { activo: true });
        toast.exito(`La cuenta de ${activada.nombre} vuelve a estar activa.`);
        setResaltadoId(activada.id);
        await cargar();
      } catch (fallo: unknown) {
        void mensaje.errorDe(fallo, { titulo: `No se pudo activar la cuenta de ${usuario.nombre}` });
      } finally {
        setGuardando(false);
      }
    },
    [cargar],
  );

  const sinIngreso = usuarios.filter(
    (usuario) => usuario.activo && !usuario.identificadorAd,
  ).length;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          Administración
        </p>
        <h1 className="page-heading-title">Cuentas del cuadro</h1>
        <p className="page-heading-subtitle text-sm">
          Quién entra al Cuadro de Colores y con qué rol. Auth central acredita la
          identidad; esta lista decide el perfil dentro del módulo.
        </p>
      </header>

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudieron cargar las cuentas"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      {sinIngreso > 0 && (
        <AvisoEnLinea variante="advertencia">
          {sinIngreso === 1
            ? "Hay una cuenta activa sin usuario de Auth central: esa persona no puede entrar."
            : `Hay ${sinIngreso} cuentas activas sin usuario de Auth central: esas personas no pueden entrar.`}
        </AvisoEnLinea>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Cuentas
          </h2>
          <div className="flex items-center gap-3">
            <span className="badge badge-ghost badge-sm">
              {cargando ? "Cargando…" : `${usuarios.length} registradas`}
            </span>
            <Boton
              variante="primario"
              tamano="sm"
              enBarraOscura
              onClick={abrirAlta}
              deshabilitado={cargando || guardando}
            >
              + Nueva cuenta
            </Boton>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <p className="text-xs text-app-muted">
            Desactivar una cuenta no la borra: las trazas de auditoría guardan
            quién hizo cada cambio, y borrarla las dejaría apuntando a nadie. Una
            cuenta desactivada se vuelve a activar con «Activar», en su fila.
          </p>

          <TablaUsuarios
            nombreDe={nombreDe}
            usuarios={usuarios}
            cargando={cargando}
            procesando={guardando}
            onEditar={(usuario) => {
              setFlujo({ modo: "edicion", usuario });
              setAvisoModal(null);
            }}
            onDesactivar={setPorDesactivar}
            onActivar={(usuario) => void activar(usuario)}
            resaltadoId={resaltadoId}
          />
        </div>
      </div>

      {/*
        LA MISMA VENTANA QUE P-07, CON OTRO VOCABULARIO. Ver `PropositoDirectorio`. `PARA_CUENTA`
        cambia lo que se busca —quien no tiene **cuenta**—, los rótulos y el impedimento: aquí la
        llave es el **usuario de Auth**, no la cédula.
      */}
      <DrawerFlujoCuenta
        // El `key` REMONTA el cajón al cambiar de flujo (alta / editar a alguien): así reinicia su
        // estado desde los inicializadores, sin un efecto que llame a `setState`.
        key={
          flujo
            ? flujo.modo === "edicion"
              ? `ed-${flujo.usuario.id}`
              : "alta"
            : "cerrado"
        }
        abierto={flujo !== null}
        modo={flujo?.modo ?? "alta"}
        usuarioEdicion={flujo?.modo === "edicion" ? flujo.usuario : null}
        filas={directorio}
        disponible={directorioDisponible}
        motivo={motivoDirectorio}
        cargando={cargandoDirectorio}
        onActualizar={() => void cargarDirectorio()}
        rolesSinAcceso={rolesSinAcceso}
        guardando={guardando}
        aviso={avisoModal}
        onGuardar={(datos) => void guardar(datos)}
        onCerrar={() => {
          setFlujo(null);
          setAvisoModal(null);
        }}
      />

      {porDesactivar && (
        <MensajeModal
          variante="peligro"
          titulo={`¿Desactivar la cuenta de ${porDesactivar.nombre}?`}
          mensaje={
            `${porDesactivar.nombre} dejará de poder entrar al Cuadro de Colores. ` +
            "La cuenta se conserva y puede volver a activarse."
          }
          textoPrincipal="Sí, desactivar"
          tituloError="No se pudo desactivar la cuenta"
          onPrincipal={desactivar}
          onSecundario={() => setPorDesactivar(null)}
        />
      )}
    </section>
  );
};

export default AdminUsuariosPage;
