/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: AdminVentanasPage.tsx
 * Responsabilidad: Pantalla P-09. Las ventanas de carga, las jornadas laborales y los parámetros
 *                  de política, en tres pestañas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PANTALLA QUE HACE QUE PV-06 DEJE DE BLOQUEAR: la hora a la que cierra cada departamento y
 * los umbrales de descanso viven en tablas, así que cambiarlos no exige desplegar código.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA PANTALLA SOLO PARAMETRIZA (2026-10-08). Cada ventana se guarda por su cuenta, sin compararla
 * con las otras: la coherencia entre ventanas la aplica el sistema en ejecución.
 *
 * REDISEÑO (2026-10-24, prototipos CARGA1–3):
 *   · Tres pestañas —Ventanas de carga · Jornadas laborales · Parámetros—, cada una con su
 *     permiso, recordada en la URL (`?tab=`). Un `tab` sin permiso cae en la primera permitida.
 *   · PLANTILLA VISUAL (2026-10-24): `EncabezadoPagina` y `PanelTabla`; las pestañas, sin números,
 *     en la cabecera azul; sin resumen a la derecha; «+ Nueva jornada» en la cabecera; las ayudas,
 *     al pie del panel.
 *   · Las ventanas dicen su estado EN VIVO; el reloj se refresca cada minuto.
 *   · PARÁMETROS CON GUARDADO ÚNICO. El borrador vive AQUÍ (cambiar de pestaña no lo pierde) y se
 *     guarda todo junto con «Guardar cambios», tras confirmar el resumen «CLAVE: anterior →
 *     nuevo · Afecta: …». El servidor guarda todos o ninguno (`PUT /parametros`); si rechaza
 *     alguno, su motivo queda bajo su fila y el borrador se conserva.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ModalVentana from "../components/administracion/ModalVentana.tsx";
import PanelJornadasLaborales from "../components/administracion/PanelJornadasLaborales.tsx";
import PanelParametros from "../components/administracion/PanelParametros.tsx";
import TablaVentanas from "../components/administracion/TablaVentanas.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import EncabezadoPagina from "../components/common/EncabezadoPagina.tsx";
import PanelTabla from "../components/common/PanelTabla.tsx";
import Pestanas, {
  type DefinicionPestana,
} from "../components/common/Pestanas.tsx";
import type {
  ActualizarVentana,
  ParametroPolitica,
  VentanaCarga,
} from "../interfaces/Administracion.ts";
import { AdministracionService } from "../services/administracion.service.ts";
import {
  avisoDeFallo,
  erroresPorClave,
  presentarError,
  type AvisoTexto,
} from "../utils/errorApi.util.ts";
import { entradaDe } from "../utils/catalogoParametros.util.ts";
import { motivoDeRechazo } from "../utils/parametro.util.ts";
import { useCatalogoRoles } from "../hooks/useCatalogoRoles.ts";
import { usePermiso } from "../hooks/usePermiso.ts";
import { useAvisoAlSalir } from "../hooks/useAvisoAlSalir.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

type Pestana = "ventanas" | "jornadas" | "parametros";

const esPestana = (valor: string | null): valor is Pestana =>
  valor === "ventanas" || valor === "jornadas" || valor === "parametros";

/** Cada cuánto se refresca el estado en vivo de las ventanas. */
const MS_RELOJ = 60_000;
/** Cuánto dura el verde de lo recién guardado. */
const MS_RESALTADO = 4000;

const plural = (n: number, uno: string, varios: string): string =>
  `${n} ${n === 1 ? uno : varios}`;

const AdminVentanasPage = () => {
  /** El catálogo de roles sale del servidor: aquí no hay ninguno escrito. */
  const { nombreDe } = useCatalogoRoles();

  // RBAC: cada pestaña con su permiso. El DMIT y el administrador DAF entran solo por los
  // parámetros (el servidor les filtra cuáles); las jornadas, quien fijaba el nombramiento.
  const gestionaVentanas = usePermiso("ventanas:administrar");
  const gestionaJornadas = usePermiso("jornadas:administrar");
  const gestionaParametros = usePermiso("parametros:administrar");

  const [params, setParams] = useSearchParams();
  const [parametros, setParametros] = useState<ParametroPolitica[]>([]);
  const [ventanas, setVentanas] = useState<VentanaCarga[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  const [enEdicion, setEnEdicion] = useState<{
    ventana: VentanaCarga;
    mensaje?: string;
  } | null>(null);
  const [guardandoVentana, setGuardandoVentana] = useState(false);
  /** «+ Nueva jornada» de la cabecera abre el alta del panel de jornadas. */
  const [altaJornada, setAltaJornada] = useState(false);
  const [avisoVentana, setAvisoVentana] = useState<string | null>(null);
  const [resaltado, setResaltado] = useState<VentanaCarga["rol"] | null>(null);

  /** Clave → valor escrito y aún no guardado. Solo lo que difiere de lo guardado. */
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [erroresServidor, setErroresServidor] = useState<
    Record<string, string>
  >({});
  const [guardandoParametros, setGuardandoParametros] = useState(false);
  const [resaltadas, setResaltadas] = useState<ReadonlySet<string>>(new Set());

  const permitidas = useMemo(() => {
    const lista: Pestana[] = [];
    if (gestionaVentanas) lista.push("ventanas");
    if (gestionaJornadas) lista.push("jornadas");
    if (gestionaParametros) lista.push("parametros");
    return lista;
  }, [gestionaVentanas, gestionaJornadas, gestionaParametros]);

  const pedida = params.get("tab");
  const activa: Pestana | undefined =
    esPestana(pedida) && permitidas.includes(pedida) ? pedida : permitidas[0];

  const elegir = (pestana: Pestana) => {
    const siguientes = new URLSearchParams(params);
    siguientes.set("tab", pestana);
    setParams(siguientes, { replace: true });
  };

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), MS_RELOJ);
    return () => window.clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (!resaltado) return undefined;
    const quitar = window.setTimeout(() => setResaltado(null), MS_RESALTADO);
    return () => window.clearTimeout(quitar);
  }, [resaltado]);

  useEffect(() => {
    if (resaltadas.size === 0) return undefined;
    const quitar = window.setTimeout(
      () => setResaltadas(new Set()),
      MS_RESALTADO,
    );
    return () => window.clearTimeout(quitar);
  }, [resaltadas]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // Solo se pide lo que el rol administra: evita un 403 inútil.
      const [listaParametros, listaVentanas] = await Promise.all([
        gestionaParametros
          ? AdministracionService.listarParametros()
          : Promise.resolve([]),
        gestionaVentanas
          ? AdministracionService.listarVentanas()
          : Promise.resolve([]),
      ]);
      setParametros(listaParametros);
      setVentanas(listaVentanas);
      setAviso(null);
    } catch (fallo: unknown) {
      setParametros([]);
      setVentanas([]);
      setAviso(avisoDeFallo(fallo));
    } finally {
      setCargando(false);
    }
  }, [gestionaParametros, gestionaVentanas]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hayCambios = Object.keys(borrador).length > 0;
  useAvisoAlSalir(hayCambios);

  const porClave = useMemo(
    () => new Map(parametros.map((parametro) => [parametro.clave, parametro])),
    [parametros],
  );

  const cambiarParametro = useCallback(
    (clave: string, valor: string) => {
      const guardado = porClave.get(clave)?.valor;
      setBorrador((antes) => {
        const siguiente = { ...antes };
        if (valor === guardado) delete siguiente[clave];
        else siguiente[clave] = valor;
        return siguiente;
      });
      // Al corregir, el rechazo anterior del servidor ya no dice nada de este valor.
      setErroresServidor((antes) => {
        if (!(clave in antes)) return antes;
        const siguiente = { ...antes };
        delete siguiente[clave];
        return siguiente;
      });
    },
    [porClave],
  );

  const erroresBorrador = Object.entries(borrador).filter(([clave, valor]) => {
    const parametro = porClave.get(clave);
    return parametro ? motivoDeRechazo(parametro, valor) !== null : false;
  }).length;

  const descartar = () => {
    setBorrador({});
    setErroresServidor({});
  };

  const guardarParametros = async () => {
    const cambios = Object.entries(borrador).map(([clave, valor]) => ({
      clave,
      valor: valor.trim(),
    }));
    if (cambios.length === 0 || erroresBorrador > 0) return;

    const confirmado = await mensaje.confirmar({
      variante: "advertencia",
      titulo: `¿Guardar ${plural(cambios.length, "cambio", "cambios")}?`,
      mensaje: (
        <div className="flex flex-col gap-2 text-left">
          <p>Rigen desde que se guardan, sin desplegar código:</p>
          <ul className="flex flex-col gap-1">
            {cambios.map(({ clave, valor }) => {
              const afecta = entradaDe(clave).afecta;
              return (
                <li key={clave} className="text-sm">
                  <span className="font-mono text-xs font-semibold">
                    {clave}
                  </span>
                  : {porClave.get(clave)?.valor ?? "—"} → {valor}
                  {afecta.length > 0 && (
                    <span className="block text-xs text-app-muted">
                      Afecta: {afecta.join(", ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ),
      textoPrincipal: "Guardar",
      textoSecundario: "Cancelar",
    });
    if (!confirmado) return;

    setGuardandoParametros(true);
    try {
      const lista = await AdministracionService.actualizarParametros(cambios);
      setParametros(lista);
      setBorrador({});
      setErroresServidor({});
      setResaltadas(new Set(cambios.map((cambio) => cambio.clave)));
      toast.exito(
        `${plural(cambios.length, "parámetro guardado", "parámetros guardados")}. Rigen desde ahora.`,
      );
    } catch (fallo: unknown) {
      // Todos o ninguno: no se guardó nada. Cada motivo, bajo su fila; el borrador se conserva.
      const porFila = erroresPorClave(fallo);
      setErroresServidor(porFila);
      if (Object.keys(porFila).length === 0) {
        void mensaje.errorDe(fallo, {
          titulo: "No se guardaron los parámetros",
        });
      } else {
        toast.error(presentarError(fallo).mensaje);
      }
    } finally {
      setGuardandoParametros(false);
    }
  };

  const guardarVentana = useCallback(
    async (cambios: ActualizarVentana) => {
      if (!enEdicion) return;
      const { rol } = enEdicion.ventana;
      setGuardandoVentana(true);
      setAvisoVentana(null);
      try {
        const resultado = await AdministracionService.actualizarVentana(
          rol,
          cambios,
        );
        setVentanas((actuales) =>
          actuales.map((ventana) =>
            ventana.rol === rol ? resultado.ventana : ventana,
          ),
        );
        setEnEdicion(null);
        setResaltado(rol);
        toast.exito(`Ventana de ${nombreDe(rol)} actualizada`);
      } catch (fallo: unknown) {
        setAvisoVentana(presentarError(fallo).mensaje);
      } finally {
        setGuardandoVentana(false);
      }
    },
    [enEdicion, nombreDe],
  );

  // Sin números en las pestañas ni resumen en la cabecera (plantilla visual, 2026-10-24).
  const pestanas: DefinicionPestana<Pestana>[] = [
    gestionaVentanas && {
      id: "ventanas" as const,
      titulo: "Ventanas de carga",
    },
    gestionaJornadas && {
      id: "jornadas" as const,
      titulo: "Jornadas laborales",
    },
    gestionaParametros && { id: "parametros" as const, titulo: "Parámetros" },
  ].filter((pestana): pestana is DefinicionPestana<Pestana> =>
    Boolean(pestana),
  );

  /** La ayuda de cada pestaña, al pie del panel. */
  const nota =
    activa === "ventanas"
      ? "Una ventana por rol. Fuera de su franja el departamento no puede cargar ni editar. Para quitar la restricción se elige «Sin restricción», que deja rastro."
      : activa === "jornadas"
        ? "Reemplazan al tipo de contrato: cada persona y cada conductor tienen una, y fuera de sus días u horas no se los convoca. Sin jornada no se los convoca. Las reglas de descanso y las ausencias valen igual para todas."
        : undefined;

  return (
    <section className="app-page-shell">
      <EncabezadoPagina
        modulo="Administración"
        titulo="Ventanas y parámetros"
        subtitulo="Cuándo puede cargar cada departamento y con qué reglas decide el sistema."
      />

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudieron cargar las ventanas y los parámetros"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      {activa && (
        <PanelTabla
          // Con UNA sola pestaña (el administrador DAF solo ve Parámetros) no se pintan pestañas:
          // la cabecera lleva su nombre como título (2026-10-24).
          titulo={pestanas.length === 1 ? pestanas[0].titulo : undefined}
          cabecera={
            pestanas.length > 1 ? (
              <Pestanas
                etiqueta="Ventanas y parámetros"
                pestanas={pestanas}
                activa={activa}
                onElegir={elegir}
                sobreBarra
              />
            ) : undefined
          }
          acciones={
            activa === "jornadas" ? (
              <Boton
                variante="primario"
                tamano="md"
                onClick={() => setAltaJornada(true)}
              >
                + Nueva jornada
              </Boton>
            ) : undefined
          }
          cuerpo={
            pestanas.length > 1
              ? {
                  id: `panel-${activa}`,
                  role: "tabpanel",
                  "aria-labelledby": `pestana-${activa}`,
                }
              : undefined
          }
          nota={nota}
        >
          {activa === "ventanas" && (
            <TablaVentanas
              nombreDe={nombreDe}
              ventanas={ventanas}
              cargando={cargando}
              procesando={guardandoVentana}
              resaltado={resaltado}
              ahora={ahora}
              onEditar={(ventana, mensajeInicial) => {
                setEnEdicion({ ventana, mensaje: mensajeInicial });
                setAvisoVentana(null);
              }}
            />
          )}

          {activa === "jornadas" && (
            <PanelJornadasLaborales
              altaAbierta={altaJornada}
              onCerrarAlta={() => setAltaJornada(false)}
            />
          )}

          {activa === "parametros" && (
            <PanelParametros
              parametros={parametros}
              cargando={cargando}
              borrador={borrador}
              onCambiar={cambiarParametro}
              erroresServidor={erroresServidor}
              errores={erroresBorrador}
              guardando={guardandoParametros}
              resaltadas={resaltadas}
              onGuardar={() => void guardarParametros()}
              onDescartar={descartar}
            />
          )}
        </PanelTabla>
      )}

      {enEdicion && (
        <ModalVentana
          // Cambiar de rol vuelve a montar el modal: los valores del anterior no
          // sobreviven bajo el rótulo del siguiente.
          key={enEdicion.ventana.rol}
          ventana={enEdicion.ventana}
          mensajeInicial={enEdicion.mensaje}
          guardando={guardandoVentana}
          aviso={avisoVentana}
          onGuardar={(cambios) => void guardarVentana(cambios)}
          onCancelar={() => setEnEdicion(null)}
        />
      )}
    </section>
  );
};

export default AdminVentanasPage;
