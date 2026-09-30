/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: AdminVentanasPage.tsx
 * Responsabilidad: Pantalla P-09. Configurar las ventanas de carga y los siete umbrales.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PANTALLA QUE HACE QUE PV-06 DEJE DE BLOQUEAR.
 *
 * La hora a la que cierra la carga departamental aparece como 14H00 en una sesión y como
 * 15H00 en otra, del mismo interlocutor. Mientras eso no se resuelva, el sistema funciona
 * con un supuesto documentado.
 *
 * A partir de aquí, resolverlo **no exige desplegar código**. Es el caso 1 del plan, y es
 * la razón por la que estos valores viven en tablas y no en constantes.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * DOS PANELES QUE NO DICEN LO MISMO, Y ESO ES NUEVO. 2026-08-25.
 *
 * Hasta hoy la hora de cierre estaba escrita **dos veces**: en la fila de la ventana del
 * rol y en el parámetro `HORA_CIERRE_DEPARTAMENTAL`. Solo una gobernaba —el servidor lee
 * la ventana—, así que la otra se limitaba a producir un aviso pidiendo por favor que se
 * cambiara también. Quien no lo hacía dejaba la pantalla diciendo 15H00 mientras el
 * sistema cerraba a las 16H00.
 *
 * **El parámetro se retiró.** Cada rol tiene su hora en su ventana, que es lo que pide
 * RF-059 —«parametrizar las ventanas de carga por rol»— y lo que un valor único no podía
 * expresar: la DAF cierra a las 16H30 y los tres departamentos a las 15H00.
 *
 * Arriba se administra **cuándo puede escribir cada rol**; abajo, **los umbrales que no
 * dependen del rol**: la hora límite del cuadro entero (RN-57), la franja nocturna, el
 * descanso de patrulla y el tope de salidas pesadas. Las `advertencias` que devuelve el
 * servidor al guardar una ventana siguen mostrándose, y siguen sin impedir nada.
 */

import { useCallback, useEffect, useState } from "react";

import ModalVentana from "../components/administracion/ModalVentana.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import TablaParametros from "../components/administracion/TablaParametros.tsx";
import TablaVentanas from "../components/administracion/TablaVentanas.tsx";
import type {
  ActualizarVentana,
  ParametroPolitica,
  VentanaCarga,
} from "../interfaces/Administracion.ts";
import { AdministracionService } from "../services/administracion.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { useCatalogoRoles } from "../hooks/useCatalogoRoles.ts";
import { usePermiso } from "../hooks/usePermiso.ts";

const AdminVentanasPage = () => {
  /** El catálogo de roles sale del servidor: aquí no hay ninguno escrito. */
  const { nombreDe } = useCatalogoRoles();

  /*
    LAS VENTANAS DE CARGA son de la administración general (ADMINISTRADOR y DMIP). El
    ADMINISTRADOR_DMIT entra a esta pantalla SOLO por las ventanas de los turnos de la
    cobertura (el servidor le filtra los parámetros), así que a él no se le pinta esta
    sección ni se le piden sus datos. Quien tenga ambos roles la ve.
  */
  // RBAC: la sección de «Ventanas de carga» la ve quien tiene el permiso de administrarlas;
  // el DMIT entra solo por los parámetros de turno y no la ve.
  const gestionaVentanas = usePermiso("ventanas:administrar");

  const [parametros, setParametros] = useState<ParametroPolitica[]>([]);
  const [ventanas, setVentanas] = useState<VentanaCarga[]>([]);
  const [cargando, setCargando] = useState(true);

  const [guardandoClave, setGuardandoClave] = useState<string | null>(null);
  const [avisosParametro, setAvisosParametro] = useState<
    Record<string, string>
  >({});

  const [enEdicion, setEnEdicion] = useState<VentanaCarga | null>(null);
  const [guardandoVentana, setGuardandoVentana] = useState(false);
  const [avisoVentana, setAvisoVentana] = useState<string | null>(null);
  const [advertencias, setAdvertencias] = useState<string[]>([]);

  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const [listaParametros, listaVentanas] = await Promise.all([
        AdministracionService.listarParametros(),
        // El DMIT no gestiona ventanas de carga: no se le piden (evita un 403 inútil).
        gestionaVentanas
          ? AdministracionService.listarVentanas()
          : Promise.resolve([]),
      ]);
      setParametros(listaParametros);
      setVentanas(listaVentanas);
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setParametros([]);
      setVentanas([]);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setCargando(false);
    }
  }, [gestionaVentanas]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardarParametro = useCallback(
    async (clave: string, valor: string) => {
      setGuardandoClave(clave);
      // Se retira el rechazo anterior de esta clave, y solo el de esta: los avisos de
      // los demás parámetros siguen valiendo mientras nadie los corrija.
      setAvisosParametro((actuales) =>
        Object.fromEntries(
          Object.entries(actuales).filter(([otra]) => otra !== clave),
        ),
      );

      try {
        const actualizado = await AdministracionService.actualizarParametro(
          clave,
          { valor },
        );

        // Se reemplaza solo la fila tocada: recargar las ocho descartaría lo que el
        // administrador tuviera escrito a medias en otra.
        setParametros((actuales) =>
          actuales.map((parametro) =>
            parametro.clave === clave ? actualizado : parametro,
          ),
        );
        setExito(
          `${clave} quedó en ${actualizado.valor}${
            actualizado.unidad ? ` ${actualizado.unidad}` : ""
          }. El cambio rige desde ahora, sin desplegar código.`,
        );
      } catch (fallo: unknown) {
        // Caso 2: el servidor rechaza con el rango indicado. Se muestra tal cual, junto
        // al campo, y el valor escrito se conserva para poder corregirlo.
        setAvisosParametro((actuales) => ({
          ...actuales,
          [clave]: presentarError(fallo).mensaje,
        }));
      } finally {
        setGuardandoClave(null);
      }
    },
    [],
  );

  const guardarVentana = useCallback(
    async (cambios: ActualizarVentana) => {
      if (!enEdicion) return;

      setGuardandoVentana(true);
      setAvisoVentana(null);

      try {
        const resultado = await AdministracionService.actualizarVentana(
          enEdicion.rol,
          cambios,
        );

        setVentanas((actuales) =>
          actuales.map((ventana) =>
            ventana.rol === enEdicion.rol ? resultado.ventana : ventana,
          ),
        );
        setAdvertencias(resultado.advertencias);
        setEnEdicion(null);
        setExito(
          `La ventana de ${nombreDe(enEdicion.rol)} quedó guardada. Rige desde la próxima evaluación.`,
        );
      } catch (fallo: unknown) {
        setAvisoVentana(presentarError(fallo).mensaje);
      } finally {
        setGuardandoVentana(false);
      }
    },
    [enEdicion],
  );

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          Administración
        </p>
        <h1 className="page-heading-title">
          Ventanas y parámetros
        </h1>
        <p className="page-heading-subtitle text-sm">
          La configuración que gobierna el sistema: a qué hora deja de cargar
          cada departamento y con qué umbrales se decide si una persona puede
          salir.
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

      {/* Las advertencias del servidor: aceptó el cambio y avisa de lo que deja apretado. */}
      {advertencias.length > 0 && (
        <div
          className="alert alert-warning"
          role="alert"
        >
          <div className="flex flex-col gap-1">
            {advertencias.map((advertencia) => (
              <span key={advertencia}>{advertencia}</span>
            ))}
          </div>
        </div>
      )}

      {gestionaVentanas && (
        <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
          <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
              Ventanas de carga
            </h2>
            <span className="badge badge-ghost badge-sm">
              {cargando ? "Cargando…" : `${ventanas.length} roles`}
            </span>
          </div>

          <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
            <p className="text-xs text-base-content/70">
              Hay una ventana por rol y no se crean ni se eliminan: eliminar una
              abriría la carga de ese rol las veinticuatro horas. Para quitar la
              restricción se desactiva, que dice lo mismo y deja rastro.
            </p>

            <TablaVentanas
              nombreDe={nombreDe}
              ventanas={ventanas}
              cargando={cargando}
              procesando={guardandoVentana}
              onEditar={(ventana) => {
                setEnEdicion(ventana);
                setAvisoVentana(null);
                setAdvertencias([]);
              }}
            />
          </div>
        </div>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Parámetros de política
          </h2>
          <span className="badge badge-ghost badge-sm">
            {cargando ? "Cargando…" : `${parametros.length} parámetros`}
          </span>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <p className="text-xs text-base-content/70">
            Cada valor rige desde el momento en que se guarda. Cambiar un umbral
            de descanso altera de inmediato a quién ofrece el sistema al armar el
            cuadro.
          </p>

          <TablaParametros
            parametros={parametros}
            cargando={cargando}
            guardando={guardandoClave}
            avisos={avisosParametro}
            onGuardar={(clave, valor) => void guardarParametro(clave, valor)}
          />
        </div>
      </div>

      {enEdicion && (
        <ModalVentana
          // Cambiar de rol vuelve a montar el modal: los valores del anterior no
          // sobreviven bajo el rótulo del siguiente.
          key={enEdicion.rol}
          ventana={enEdicion}
          guardando={guardandoVentana}
          aviso={avisoVentana}
          onGuardar={(cambios) => void guardarVentana(cambios)}
          onCancelar={() => setEnEdicion(null)}
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

export default AdminVentanasPage;
