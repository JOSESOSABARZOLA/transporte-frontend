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
 * CAJÓN ESTÁNDAR (2026-10-15, D5): `ancho="lg"`, sin versalita de contexto (va al subtítulo), con
 * el Stepper en el cuerpo y el pie estándar: en el paso 1 «Continuar →» (primario) y «¿No aparece?
 * Registro manual»; en el 2, «← Atrás» antes de Cancelar. Cerrar con algo capturado pregunta
 * «¿Descartar cambios?», que antes faltaba aquí.
 *
 * LA CÉDULA SOLO SE PRECARGA SI ESA PERSONA YA TIENE FICHA: es el enlace a `t_funcionario`, no un
 * dato de la persona. Precargar la cédula de Auth de quien no está fichado mataría el alta con «no
 * hay ficha con esa cédula». Ese matiz vive en `alContinuar`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import Boton from "../common/Boton.tsx";
import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import Stepper from "../common/Stepper.tsx";
import PasoBuscarPersona from "../personal/PasoBuscarPersona.tsx";
import { PARA_CUENTA } from "../personal/propositoDirectorio.ts";

import type { RolDepartamental } from "../../config/env.ts";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { UsuarioCuadro } from "../../interfaces/UsuarioCuadro.ts";
import { useCatalogoRoles } from "../../hooks/useCatalogoRoles.ts";
import { estadoPieDrawer, motivoSinCambios } from "../../utils/estadoPieDrawer.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

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
  /** Ya se pulsó «Guardar»: desde aquí los faltantes se nombran y se marcan en rojo. */
  const [intentado, setIntentado] = useState(false);

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
  // explica el porqué antes de intentarlo (`faltan`, más abajo). En alta, además, el correo.
  const elegidosSinAcceso = roles.filter((rol) => rolesSinAcceso.includes(rol));

  // Lo que falta para guardar, con nombre. Antes del primer intento el pie solo lo cuenta.
  const faltaCorreo = esAlta && correo.trim().length === 0;
  const faltaNombre = nombre.trim().length === 0;
  const faltaRol = roles.length === 0;
  const faltan = [
    faltaCorreo ? "correo" : null,
    faltaNombre ? "nombre" : null,
    faltaRol ? "al menos un rol" : null,
  ].filter((uno): uno is string => uno !== null);

  const guardar = () => {
    setIntentado(true);
    if (faltan.length > 0) return;
    onGuardar({
      correo: correo.trim(),
      nombre: nombre.trim(),
      roles,
      identificadorAd: identificadorAd.trim() || null,
      funcionarioCedula: cedula.trim() || null,
      activo,
    });
  };

  // Hay cambios: en alta, en cuanto se pasa al paso 2; en edición, si algo difiere de la cuenta.
  const hayCambios = esAlta
    ? paso === 2
    : usuarioEdicion !== null &&
      (nombre !== usuarioEdicion.nombre ||
        activo !== usuarioEdicion.activo ||
        identificadorAd !== (usuarioEdicion.identificadorAd ?? "") ||
        cedula !== (usuarioEdicion.funcionario?.cedula ?? "") ||
        [...roles].sort().join() !== [...usuarioEdicion.roles].sort().join());
  const enPaso1 = paso === 1 && esAlta;

  const estadoPie = enPaso1
    ? null
    : estadoPieDrawer({ esEdicion: !esAlta, hayCambios, intentado, faltan });

  const motivoGuardar = enPaso1
    ? elegidaId == null
      ? "Elija a una persona del directorio."
      : null
    : motivoSinCambios(!esAlta, hayCambios);

  return (
    <DrawerLateral
      abierto={abierto}
      ancho="lg"
      titulo={
        !esAlta
          ? `Editar cuenta${usuarioEdicion ? ` de ${usuarioEdicion.nombre}` : ""}`
          : enPaso1
            ? "Buscar en Auth central"
            : "Completar cuenta"
      }
      subtitulo={esAlta ? `${PARA_CUENTA.antetitulo} · Paso ${paso} de 2` : "Cuentas del cuadro"}
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      onGuardar={enPaso1 ? alContinuar : guardar}
      textoGuardar={enPaso1 ? "Continuar →" : esAlta ? "Crear cuenta" : "Guardar cambios"}
      estadoPie={estadoPie}
      motivoGuardar={motivoGuardar}
      guardarPendiente={!enPaso1 && faltan.length > 0}
      errorServidor={enPaso1 ? null : aviso}
      extraPie={
        enPaso1 && (
          <Boton
            variante="enlace"
            tamano="sm"
            onClick={registroManual}
          >
            ¿No aparece? Registro manual
          </Boton>
        )
      }
      accionesPie={
        !enPaso1 &&
        esAlta && (
          <Boton
            tamano="lg"
            onClick={() => setPaso(1)}
            deshabilitado={guardando}
          >
            ← Atrás
          </Boton>
        )
      }
    >
      {esAlta && (
        <Stepper
          pasos={PASOS}
          actual={paso}
          completados={paso === 2 ? [1] : []}
        />
      )}

      {enPaso1 ? (
        <div className="flex min-h-0 flex-1 flex-col">
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
        </div>
      ) : (
        <>
          <p className="text-xs text-app-muted">
            Quién entra al Cuadro de Colores y con qué rol. Auth central acredita la identidad; esta
            cuenta decide el perfil dentro del módulo.
          </p>

          <SeccionDrawer titulo="Persona">
            {esAlta ? (
              <CampoDrawer
                id="cuenta-correo"
                etiqueta="Correo institucional"
                requerido
                ancha
                error={intentado && faltaCorreo ? "Escriba el correo institucional." : null}
              >
                <input
                  type="email"
                  maxLength={160}
                  className="input input-bordered w-full"
                  value={correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                  placeholder="nombre.apellido@quito.gob.ec"
                />
              </CampoDrawer>
            ) : (
              // Llave natural de la cuenta: no se edita (regla 5). El valor completo, en el title.
              <div className="flex min-w-0 flex-col gap-1.5 md:col-span-2">
                <span className="text-sm font-semibold text-app-label">Correo institucional</span>
                <span
                  className="badge badge-ghost badge-sm min-w-0 max-w-full"
                  title={correo}
                >
                  <span className="min-w-0 truncate">{correo}</span>
                </span>
              </div>
            )}

            <CampoDrawer
              id="cuenta-nombre"
              etiqueta="Nombre completo"
              requerido
              ancha
              error={intentado && faltaNombre ? "Escriba el nombre completo." : null}
              ayuda="Es el nombre que se muestra en la barra superior. Auth no lo envía, así que se escribe aquí."
            >
              <input
                type="text"
                maxLength={160}
                className="input input-bordered w-full"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                placeholder="Apellidos Nombres"
              />
            </CampoDrawer>
          </SeccionDrawer>

          {/* Casillas y no `<select multiple>`: la selección múltiple nativa pierde lo elegido. */}
          <SeccionDrawer
            titulo="Roles en el cuadro"
            descripcion="Puede elegir varios: esta persona verá la unión de los formularios de todos ellos."
            rejilla={false}
          >
            <fieldset className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
              <legend className="sr-only">Roles en el cuadro</legend>
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
                  />
                  <span className="label-text min-w-0 whitespace-normal">{nombreDe(codigo)}</span>
                </label>
              ))}
            </fieldset>

            {intentado && faltaRol && (
              <AvisoEnLinea variante="error">
                  Elija al menos uno. Sin ningún rol, esta persona entraría y no podría hacer nada.
                </AvisoEnLinea>
            )}

            {elegidosSinAcceso.length > 0 && (
              <AvisoEnLinea variante="advertencia" rol="alert">
                  {elegidosSinAcceso.map((rol) => nombreDe(rol)).join(", ")} no tiene ningún rol de
                  Transporte en Auth central. Si es el único que le asigna, esta persona no podrá
                  entrar hasta que se cree allí y se registre en Roles de Auth central.
                </AvisoEnLinea>
            )}
          </SeccionDrawer>

          <SeccionDrawer titulo="Ingreso y enlace con personal">
            <CampoDrawer
              id="cuenta-auth"
              etiqueta="Usuario de Auth central"
              ayuda="Es la llave del ingreso: el canje busca esta cuenta por ese usuario. Si queda vacío, esta persona no podrá entrar."
            >
              <input
                type="text"
                maxLength={120}
                className="input input-bordered w-full"
                value={identificadorAd}
                onChange={(evento) => setIdentificadorAd(evento.target.value)}
                placeholder="ffnavarrete"
              />
            </CampoDrawer>

            <CampoDrawer
              id="cuenta-cedula"
              etiqueta="Cédula de la ficha de personal"
              ayuda="Enlaza con el maestro de personal para que reciba sus órdenes de servicio. Déjelo vacío si esta persona no sale a operativos: Dirección y administración no reciben ninguna."
            >
              <input
                type="text"
                maxLength={10}
                className="input input-bordered w-full"
                value={cedula}
                onChange={(evento) => setCedula(evento.target.value)}
                placeholder="0000000000"
              />
            </CampoDrawer>

            {desdeAuth && cedula === "" && (
              <AvisoEnLinea variante="info" className="md:col-span-2">
                  Esta persona <strong>no tiene ficha de personal</strong> en el sistema, así que no
                  hay ninguna a la que enlazar. Puede crear la cuenta igualmente. Si debiera salir a
                  operativos, regístrela primero en «Personal y disponibilidad».
                </AvisoEnLinea>
            )}
          </SeccionDrawer>

          {!esAlta && (
            <SeccionDrawer
              titulo="Estado"
              rejilla={false}
            >
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={activo}
                  onChange={(evento) => setActivo(evento.target.checked)}
                />
                <span className="label-text">Cuenta activa</span>
              </label>
            </SeccionDrawer>
          )}
        </>
      )}
    </DrawerLateral>
  );
};

export default DrawerFlujoCuenta;
