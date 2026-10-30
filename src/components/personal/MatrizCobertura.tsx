/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: MatrizCobertura.tsx
 * Responsabilidad: Planificar la cobertura mensual por turnos (Instrucción y conductores de la DAF).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EN INSTRUCCIÓN SOLO SE MONTA PARA QUIEN GESTIONA ESA ÁREA (la página lo decide por el área que
 * gestiona), y el servidor lo refuerza: sin alcance responde 404 y este panel no se muestra.
 * Los TURNOS DE CONDUCTORES de la DAF usan la misma matriz con su configuración
 * (`cobertura/configMatriz.ts`): estados, horarios tipo, textos y servicio.
 *
 * SIMPLIFICADA PARA EL USO DIARIO (2026-10-24, prototipos IN1 e IN2), igual en las dos:
 *   · encabezado con el estado del mes, «Guardado hace un momento» y ‹ mes ›; cabecera azul
 *     «Turnos de <mes>» con «Exportar» y «Publicar mes», sin contadores;
 *   · el mes sin turnos es una tarjeta de estado vacío con «Asignar turnos del mes»; quien no
 *     tiene ningún turno, un aviso con «Asignar turnos a quienes faltan»;
 *   · sin selector de modo: el CLIC cambia el turno (D → N → — → vacía en Instrucción) y Mayús+clic
 *     o arrastrar marca un rango en la fila SIN cambiarlo; con dos días o más, la barra «Poner:»
 *     escribe con los estados de la configuración. Una línea de ayuda fija lo dice sobre la grilla.
 *     Los atajos siguen: D, N, -, Supr, flechas, Mayús+flechas y Ctrl+Z;
 *   · la fila de zona es solo un título; el pie enseña lo principal y el resto tras «Ver todos
 *     los totales»; la leyenda, en lenguaje simple, va bajo la grilla;
 *   · «Aplicar patrón» y «Continuar rotación» pasaron a UN cajón, «Asignar turnos».
 * Lo propio de la DAF se conserva: «Generar propuesta del mes», «Copiar mes anterior», Excel y PDF
 * solo con el mes publicado y los días bajo el mínimo en el pie.
 *
 * EDICIÓN OPTIMISTA: la vista cambia al instante (setState funcional); las escrituras por celda se
 * ENCOLAN (una tras otra, nunca en paralelo) y, si una falla, se revierte su celda y se muestra el
 * mensaje del servidor tal cual (regla 7). Los rangos y las asignaciones van en UN lote. Tras
 * escribir se relee la matriz en silencio para reconciliar avisos, totales y estado del mes.
 *
 * LA LETRA ES LA INFORMACIÓN (regla 6): D, N, —, V, RM, C, P. El color —tokens del tema, sin
 * hexadecimales (regla 2)— solo acompaña. LAS AUSENCIAS NO SE EDITAN AQUÍ (🔒): salen de
 * «Ausencias», su fuente única de verdad, y el cliente tampoco las envía nunca.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { BotonIcono } from "../common/AccionesFila.tsx";
import Boton from "../common/Boton.tsx";
import Tooltip from "../common/Tooltip.tsx";
import EtiquetaEstado, { type TonoEstado } from "../common/EtiquetaEstado.tsx";
import Iconos from "../common/Iconos.tsx";
import MensajeModal from "../common/MensajeModal.tsx";
import PanelTabla from "../common/PanelTabla.tsx";
import DrawerAsignarTurnos from "./cobertura/DrawerAsignarTurnos.tsx";
import ModalCambiarZona from "./cobertura/ModalCambiarZona.tsx";
import ModalPropuestaMes from "./cobertura/ModalPropuestaMes.tsx";
import { CatalogoCuadroService } from "../../services/catalogoCuadro.service.ts";
import type {
  CambioCelda,
  EstadoMesCobertura,
  MatrizCobertura as Matriz,
  PersonaCobertura,
} from "../../interfaces/Cobertura.ts";
import type { DenominacionInstruccion } from "../../interfaces/Personal.ts";
import type { Zonal } from "../../interfaces/Formulario.ts";
import { descargarArchivo } from "../../utils/banner.util.ts";
import { personasSinNingunTurno } from "../../utils/asignarTurnos.util.ts";
import {
  DENOMINACIONES,
  desplazarMes,
  diaSemana,
  nombreDenominacion,
  nombreDiaSemana,
  nombreMes,
} from "../../utils/cobertura.util.ts";
import {
  calcularTotalesCon,
  cambiosCopiandoMesAnterior,
  estadoDeTecla,
  rotarEstado,
} from "../../utils/matrizTurnos.util.ts";
import {
  CONFIG_INSTRUCCION,
  type ConfigMatriz,
  type FormatoReporte,
} from "./cobertura/configMatriz.ts";
import { presentarError } from "../../utils/errorApi.util.ts";
import { mensaje, toast } from "../../utils/mensaje.ts";
import { normalizar } from "../../utils/texto.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

type MatrizCoberturaProps = {
  /** Tras cambiar la zona de alguien: la página refresca la tabla del Maestro de personal. */
  onZonaCambiada?: () => void;
  /**
   * Qué instrumento planifica (2026-10-06): por omisión la cobertura de Instrucción; los turnos de
   * conductores de la DAF pasan la suya. Ver `cobertura/configMatriz.ts`.
   */
  config?: ConfigMatriz;
  /** Mes con el que abre (`AAAA-MM`); por omisión el actual. La DAF pasa el de su fecha de trabajo. */
  mesInicial?: string;
  /**
   * DÓNDE SE PINTA CADA PIEZA LO DECIDE LA PÁGINA (2026-10-24). El estado del mes y ‹ mes › se leen
   * en el encabezado de la página, y en «Personal y disponibilidad» la cobertura comparte el panel
   * con el maestro (pestañas). Con `marco` la matriz entrega sus piezas ya armadas —y `panel`, el
   * `PanelTabla` de siempre— y la página las coloca; sin él, pinta solo `panel`.
   */
  marco?: (partes: PartesCobertura) => ReactNode;
  /**
   * Llevar la vista a una persona (desde el maestro): fija el buscador con `texto` y, si viene, el
   * mes. Se aplica cada vez que cambia `clave`.
   */
  enfoque?: { texto: string; mes?: string; clave: number } | null;
  /**
   * El nombre de la persona abre sus Ausencias (Personal). Con esta prop el tooltip de la celda
   * bloqueada y la leyenda lo dicen; sin ella (DAF), «se edita en Ausencias».
   */
  onVerAusencias?: (funcionarioId: number) => void;
  /** Cambia cuando algo de fuera (una ausencia) altera la matriz: se relee en silencio. */
  recarga?: number;
};

/**
 * Las piezas de la cobertura para quien las coloca. `disponible` es `false` cuando el servidor
 * respondió 404 (quien mira no gestiona Instrucción): entonces todas van vacías.
 */
export interface PartesCobertura {
  disponible: boolean;
  estadoMes: ReactNode;
  selectorMes: ReactNode;
  titulo: string;
  acciones: ReactNode;
  filtros: ReactNode;
  contenido: ReactNode;
  nota?: string;
  panel: ReactNode;
}

const ESTADO_MES: Record<EstadoMesCobertura, { texto: string; tono: TonoEstado }> = {
  BORRADOR: { texto: "Borrador", tono: "borrador" },
  PUBLICADO: { texto: "Publicado", tono: "activo" },
  PUBLICADO_CON_CAMBIOS: { texto: "Publicado · con cambios", tono: "aviso" },
};

/** Una celda de la grilla: fila visible × columna de día. */
type Posicion = { f: number; c: number };

/** Lo que guarda «Deshacer»: el estado ANTERIOR de cada celda tocada. */
type PasoDeshacer = CambioCelda[];

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function hoyIso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

/** «noviembre» a partir de «2026-11» (el año ya lo dice el selector del mes). */
const mesSinAnio = (mes: string): string => nombreMes(mes).replace(/ de \d{4}$/, "");

const conMayuscula = (texto: string): string =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

/** La matriz con varias celdas cambiadas; nunca toca una ausencia. */
function conCambios(matriz: Matriz, cambios: CambioCelda[]): Matriz {
  const porPersona = new Map<number, Map<string, string | null>>();
  for (const cambio of cambios) {
    const fechas =
      porPersona.get(cambio.funcionarioId) ?? new Map<string, string | null>();
    fechas.set(cambio.fecha, cambio.estado);
    porPersona.set(cambio.funcionarioId, fechas);
  }
  return {
    ...matriz,
    personas: matriz.personas.map((persona) => {
      const fechas = porPersona.get(persona.funcionarioId);
      if (!fechas) return persona;
      return {
        ...persona,
        celdas: persona.celdas.map((celda) =>
          celda.esAusencia || !fechas.has(celda.fecha)
            ? celda
            : { ...celda, estado: fechas.get(celda.fecha) ?? null },
        ),
      };
    }),
  };
}

const MatrizCobertura: FC<MatrizCoberturaProps> = ({
  onZonaCambiada,
  config = CONFIG_INSTRUCCION,
  mesInicial,
  marco,
  enfoque = null,
  onVerAusencias,
  recarga = 0,
}) => {
  const servicio = config.servicio;
  const SIN_ZONA = config.grupo.sinGrupo;
  /*
    COLOR, LETRA Y NOMBRE POR ESTADO, de la configuración: tokens del tema (regla 2), sólidos para
    leerse de un vistazo; la letra manda (regla 6).
  */
  const todosLosEstados = [...config.estados, ...config.ausencias];
  const COLOR: Record<string, string> = Object.fromEntries(
    todosLosEstados.map((e) => [e.valor, e.clase]),
  );
  const LETRA: Record<string, string> = Object.fromEntries(
    todosLosEstados.map((e) => [e.valor, e.letra]),
  );
  const NOMBRE: Record<string, string> = Object.fromEntries(
    todosLosEstados.map((e) => [e.valor, e.nombre]),
  );
  const [mes, setMes] = useState<string>(() => mesInicial ?? mesActual());
  /** «Copiar mes anterior»: lo que se escribiría, para la vista previa. */
  const [copia, setCopia] = useState<CambioCelda[] | null>(null);
  const [preparandoCopia, setPreparandoCopia] = useState(false);
  const [matriz, setMatriz] = useState<Matriz | null>(null);
  const [zonales, setZonales] = useState<Zonal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [errorEscritura, setErrorEscritura] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<"nada" | "guardando" | "guardado">(
    "nada",
  );

  const [busqueda, setBusqueda] = useState("");
  const [zonaFiltro, setZonaFiltro] = useState("");
  const [denominacionFiltro, setDenominacionFiltro] = useState("");
  const [soloAvisos, setSoloAvisos] = useState(false);
  const [verTodosTotales, setVerTodosTotales] = useState(false);

  const [cursor, setCursor] = useState<Posicion | null>(null);
  const [seleccion, setSeleccion] = useState<{
    ancla: Posicion;
    foco: Posicion;
  } | null>(null);
  const [deshacer, setDeshacer] = useState<PasoDeshacer[]>([]);

  /**
   * «Asignar turnos»: quiénes llegan marcados al abrir el cajón (o `null` si está cerrado), y si se
   * abrió desde la fila de UNA persona (entonces el alcance es solo ella).
   */
  const [asignarA, setAsignarA] = useState<{ ids: number[]; unaPersona: boolean } | null>(null);
  const abrirAsignar = (ids: number[], unaPersona = false) => setAsignarA({ ids, unaPersona });
  // «Generar propuesta del mes» solo existe donde el servicio sabe proponerla (conductores DAF).
  const [propuestaAbierta, setPropuestaAbierta] = useState(false);
  const [zonaDe, setZonaDe] = useState<PersonaCobertura | null>(null);
  const [confirmandoPublicar, setConfirmandoPublicar] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [exportando, setExportando] = useState<FormatoReporte | null>(null);

  // La matriz «de verdad» en este instante, para calcular el estado anterior de una celda al editar
  // sin esperar al render (dos ediciones seguidas leen lo último, no lo pintado).
  const matrizRef = useRef<Matriz | null>(null);
  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const pendientesRef = useRef(0);
  const recargaRef = useRef<number | undefined>(undefined);
  const grillaRef = useRef<HTMLDivElement>(null);
  // Arrastrar con el botón pulsado selecciona dentro de la fila; si se movió, el clic no rota.
  const arrastreRef = useRef<{ ancla: Posicion; movido: boolean } | null>(null);
  const huboArrastreRef = useRef(false);

  const fijarMatriz = useCallback((siguiente: Matriz | null) => {
    matrizRef.current = siguiente;
    setMatriz(siguiente);
  }, []);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) {
        setCargando(true);
        setErrorCarga(null);
      }
      try {
        fijarMatriz(await servicio.obtenerMatriz(mes));
        setNoDisponible(false);
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        // 404: quien mira no gestiona Instrucción. El panel no se muestra (no revela nada).
        if (error.estado === 404) setNoDisponible(true);
        else if (!silencioso) setErrorCarga(error.mensaje);
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [mes, fijarMatriz, servicio],
  );

  useEffect(() => {
    setSeleccion(null);
    setCursor(null);
    setDeshacer([]);
    void cargar();
  }, [cargar]);

  // Algo de fuera cambió la matriz (una ausencia registrada o quitada): se relee en silencio, para
  // poner o quitar el candado. Solo cuando `recarga` cambia, no al cambiar de mes.
  const recargaVista = useRef(recarga);
  useEffect(() => {
    if (recargaVista.current === recarga) return;
    recargaVista.current = recarga;
    void cargar(true);
  }, [recarga, cargar]);

  // Llevar la vista a una persona (desde el maestro): su nombre en el buscador y, si viene, su mes.
  const claveEnfoque = enfoque?.clave;
  useEffect(() => {
    if (!enfoque) return;
    setBusqueda(enfoque.texto);
    setZonaFiltro("");
    setDenominacionFiltro("");
    setSoloAvisos(false);
    if (enfoque.mes) setMes(enfoque.mes);
    // Solo al cambiar la clave: el objeto puede rehacerse en cada render de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveEnfoque]);

  useEffect(() => {
    if (!config.conCambiarGrupo) return;
    void CatalogoCuadroService.listarZonales()
      .then(setZonales)
      .catch(() => {
        // Sin zonales, «Cambiar zona» queda con la lista vacía; no bloquea la matriz.
      });
  }, [config.conCambiarGrupo]);

  useEffect(() => {
    // `mouseup` llega antes que el `click`: aquí se anota si hubo arrastre, para que no rote.
    const soltar = () => {
      huboArrastreRef.current = arrastreRef.current?.movido ?? false;
      arrastreRef.current = null;
    };
    document.addEventListener("mouseup", soltar);
    return () => {
      document.removeEventListener("mouseup", soltar);
      window.clearTimeout(recargaRef.current);
    };
  }, []);

  /** Relee en silencio cuando la cola queda vacía: reconcilia avisos, totales y estado del mes. */
  const programarRecarga = useCallback(() => {
    window.clearTimeout(recargaRef.current);
    recargaRef.current = window.setTimeout(() => void cargar(true), 600);
  }, [cargar]);

  const aplicarLocal = useCallback((cambios: CambioCelda[]) => {
    if (matrizRef.current) {
      matrizRef.current = conCambios(matrizRef.current, cambios);
    }
    setMatriz((actual) => (actual ? conCambios(actual, cambios) : actual));
  }, []);

  /** El estado actual de cada celda que se va a tocar (para deshacer o revertir). */
  const anteriores = useCallback((cambios: CambioCelda[]): CambioCelda[] => {
    const actual = matrizRef.current;
    if (!actual) return [];
    return cambios.map((cambio) => {
      const persona = actual.personas.find(
        (p) => p.funcionarioId === cambio.funcionarioId,
      );
      const celda = persona?.celdas.find((c) => c.fecha === cambio.fecha);
      return {
        funcionarioId: cambio.funcionarioId,
        fecha: cambio.fecha,
        estado: celda?.estado ?? null,
      };
    });
  }, []);

  /** Una celda: optimista, ENCOLADA (serializada) y revertida si el servidor la rechaza. */
  const escribirCelda = useCallback(
    (cambio: CambioCelda) => {
      const previo = anteriores([cambio]);
      aplicarLocal([cambio]);
      setDeshacer((pila) => [...pila, previo]);
      setErrorEscritura(null);
      pendientesRef.current += 1;
      setGuardado("guardando");
      colaRef.current = colaRef.current
        .then(async () => {
          try {
            await servicio.editarCelda(
              cambio.funcionarioId,
              cambio.fecha,
              cambio.estado,
            );
          } catch (fallo: unknown) {
            aplicarLocal(previo);
            setErrorEscritura(presentarError(fallo).mensaje);
          }
        })
        .finally(() => {
          pendientesRef.current -= 1;
          if (pendientesRef.current === 0) {
            setGuardado("guardado");
            programarRecarga();
          }
        });
    },
    [anteriores, aplicarLocal, programarRecarga, servicio],
  );

  /**
   * Varias celdas en UN lote (rango, asignación, propuesta, copia, deshacer). Optimista; lo que el
   * servidor omite se revierte, y todo se revierte si el lote falla. Con `avisoAsignacion` (el
   * cajón «Asignar turnos») el aviso dice ese texto y ofrece «Deshacer» ahí mismo.
   */
  const escribirLote = useCallback(
    async (
      cambios: CambioCelda[],
      opciones: {
        registrarDeshacer?: boolean;
        omitidasCliente?: number;
        avisoAsignacion?: string;
      } = {},
    ) => {
      const { registrarDeshacer = true, omitidasCliente = 0, avisoAsignacion } = opciones;
      if (cambios.length === 0) {
        if (omitidasCliente > 0) {
          toast.exito(
            `0 celdas actualizadas · ${omitidasCliente} omitidas por ausencias`,
          );
        }
        return;
      }
      const previos = anteriores(cambios);
      aplicarLocal(cambios);
      if (registrarDeshacer) setDeshacer((pila) => [...pila, previos]);
      setErrorEscritura(null);
      pendientesRef.current += 1;
      setGuardado("guardando");
      try {
        const resultado = await servicio.aplicarLote(cambios);
        if (resultado.omitidas.length > 0) {
          const omitida = new Set(
            resultado.omitidas.map((o) => `${o.funcionarioId}|${o.fecha}`),
          );
          aplicarLocal(
            previos.filter((p) => omitida.has(`${p.funcionarioId}|${p.fecha}`)),
          );
        }
        if (avisoAsignacion !== undefined) {
          toast.exito(avisoAsignacion, {
            accion: {
              texto: "Deshacer",
              onClick: () => {
                // Saca ESTE paso de la pila (no el último, que puede ser otro) y lo revierte.
                setDeshacer((pila) => pila.filter((paso) => paso !== previos));
                void escribirLote(previos, { registrarDeshacer: false });
              },
            },
          });
        } else {
          toast.exito(
            `${resultado.aplicadas} celdas actualizadas · ${
              omitidasCliente + resultado.omitidas.length
            } omitidas por ausencias`,
          );
        }
      } catch (fallo: unknown) {
        aplicarLocal(previos);
        setErrorEscritura(presentarError(fallo).mensaje);
      } finally {
        pendientesRef.current -= 1;
        if (pendientesRef.current === 0) setGuardado("guardado");
        await cargar(true);
      }
    },
    [anteriores, aplicarLocal, cargar, servicio],
  );

  // El efecto (reescribir) va FUERA del actualizador de estado: en StrictMode un actualizador
  // puede ejecutarse dos veces, y deshacer no debe enviar dos lotes.
  const deshacerUltimo = useCallback(() => {
    const ultimo = deshacer[deshacer.length - 1];
    if (!ultimo) return;
    setDeshacer((pila) => pila.slice(0, -1));
    void escribirLote(ultimo, { registrarDeshacer: false });
  }, [deshacer, escribirLote]);

  // ─────────────────────── Filtros, grupos y filas visibles ───────────────────────

  const dias = useMemo(() => matriz?.dias ?? [], [matriz]);
  const hoy = hoyIso();

  const personasFiltradas = useMemo(() => {
    if (!matriz) return [];
    const texto = normalizar(busqueda.trim());
    return matriz.personas.filter((persona) => {
      if (texto && !normalizar(persona.nombre).includes(texto)) return false;
      if (zonaFiltro && (persona.zona ?? SIN_ZONA) !== zonaFiltro) return false;
      if (denominacionFiltro && persona.denominacion !== denominacionFiltro)
        return false;
      if (soloAvisos) {
        const conVacias = persona.celdas.some(
          (c) => !c.esAusencia && c.estado === null,
        );
        if (persona.avisos === 0 && !conVacias) return false;
      }
      return true;
    });
  }, [matriz, busqueda, zonaFiltro, denominacionFiltro, soloAvisos, SIN_ZONA]);

  const grupos = useMemo(() => {
    const porZona = new Map<string, PersonaCobertura[]>();
    for (const persona of personasFiltradas) {
      const zona = persona.zona ?? SIN_ZONA;
      porZona.set(zona, [...(porZona.get(zona) ?? []), persona]);
    }
    return [...porZona.entries()]
      .sort(([a], [b]) =>
        a === SIN_ZONA ? 1 : b === SIN_ZONA ? -1 : a.localeCompare(b),
      )
      .map(([zona, personas]) => ({ zona, personas }));
  }, [personasFiltradas, SIN_ZONA]);

  /** Las filas EDITABLES visibles, en orden de pantalla. */
  const filas = useMemo(
    () => grupos.flatMap((grupo) => grupo.personas),
    [grupos],
  );

  const zonasDisponibles = useMemo(
    () =>
      [
        ...new Set((matriz?.personas ?? []).map((p) => p.zona ?? SIN_ZONA)),
      ].sort(),
    [matriz, SIN_ZONA],
  );

  // Totales de TODO el personal en alcance (no dependen de los filtros), recalculados al editar.
  const totales = useMemo(
    () =>
      matriz
        ? calcularTotalesCon(matriz.personas, dias.length, config.estados)
        : [],
    [matriz, dias.length, config.estados],
  );

  const celdasVacias = useMemo(
    () => totales.reduce((suma, total) => suma + total.sinTurno, 0),
    [totales],
  );

  /** El mes sin NINGÚN turno cargado (solo ausencias o vacío): la tarjeta de estado vacío. */
  const mesSinCargar =
    !!matriz &&
    matriz.personas.length > 0 &&
    matriz.personas.every((persona) =>
      persona.celdas.every((celda) => celda.esAusencia || celda.estado === null),
    );

  /** Con el mes ya cargado, quienes no tienen ningún turno: el aviso «… no tienen ningún turno». */
  const sinNingunTurno = useMemo(
    () => (matriz && !mesSinCargar ? personasSinNingunTurno(matriz.personas) : []),
    [matriz, mesSinCargar],
  );

  /** Pide el mes anterior y calcula lo que se copiaría; la escritura espera a la confirmación. */
  const prepararCopia = async (): Promise<void> => {
    if (!matriz) return;
    setPreparandoCopia(true);
    setErrorEscritura(null);
    try {
      const anterior = await servicio.obtenerMatriz(desplazarMes(mes, -1));
      setCopia(cambiosCopiandoMesAnterior(matriz, anterior));
    } catch (fallo: unknown) {
      setErrorEscritura(presentarError(fallo).mensaje);
    } finally {
      setPreparandoCopia(false);
    }
  };

  const totalAvisos = useMemo(
    () => (matriz?.personas ?? []).reduce((suma, p) => suma + p.avisos, 0),
    [matriz],
  );

  // ─────────────────────────── Selección ───────────────────────────

  const rect = useMemo(() => {
    if (!seleccion) return null;
    return {
      f1: Math.min(seleccion.ancla.f, seleccion.foco.f),
      f2: Math.max(seleccion.ancla.f, seleccion.foco.f),
      c1: Math.min(seleccion.ancla.c, seleccion.foco.c),
      c2: Math.max(seleccion.ancla.c, seleccion.foco.c),
    };
  }, [seleccion]);

  const enSeleccion = (f: number, c: number): boolean =>
    rect !== null && f >= rect.f1 && f <= rect.f2 && c >= rect.c1 && c <= rect.c2;

  /** Escribe un mismo estado en un conjunto de posiciones, omitiendo las ausencias. */
  const fijarEn = useCallback(
    (posiciones: Posicion[], estado: string | null) => {
      const cambios: CambioCelda[] = [];
      let ausencias = 0;
      for (const { f, c } of posiciones) {
        const persona = filas[f];
        const celda = persona?.celdas[c];
        if (!persona || !celda) continue;
        if (celda.esAusencia) {
          ausencias += 1;
          continue;
        }
        cambios.push({
          funcionarioId: persona.funcionarioId,
          fecha: celda.fecha,
          estado,
        });
      }
      if (cambios.length === 1 && ausencias === 0) escribirCelda(cambios[0]);
      else void escribirLote(cambios, { omitidasCliente: ausencias });
    },
    [filas, escribirCelda, escribirLote],
  );

  const posicionesSeleccion = useCallback((): Posicion[] => {
    if (!rect) return cursor ? [cursor] : [];
    const posiciones: Posicion[] = [];
    for (let f = rect.f1; f <= rect.f2; f += 1)
      for (let c = rect.c1; c <= rect.c2; c += 1) posiciones.push({ f, c });
    return posiciones;
  }, [rect, cursor]);

  /**
   * DOS GESTOS, SIN SELECTOR DE MODO (2026-10-24):
   *   · CLIC SIMPLE: cambia el turno en el orden de la configuración (Instrucción D → N → — →
   *     vacía), con la escritura encolada y optimista de siempre, y entra en «Deshacer».
   *   · MAYÚS + CLIC O ARRASTRAR: marca un rango en la MISMA fila SIN cambiar nada; lo que se pone
   *     lo dice la barra «Poner:» (con dos días o más) o el teclado.
   * El arrastre empieza en `mousedown` y solo cuenta si pasó a otra celda: entonces el `click` que
   * sigue no rota.
   */
  const alPresionarCelda = (
    evento: MouseEvent<HTMLTableCellElement>,
    f: number,
    c: number,
  ): void => {
    evento.preventDefault();
    grillaRef.current?.focus();
    if (evento.shiftKey) {
      const ancla = seleccion?.ancla ?? cursor;
      setSeleccion({
        ancla: ancla && ancla.f === f ? ancla : { f, c },
        foco: { f, c },
      });
      setCursor({ f, c });
      return;
    }
    arrastreRef.current = { ancla: { f, c }, movido: false };
  };

  const alArrastrarSobre = (f: number, c: number): void => {
    const arrastre = arrastreRef.current;
    if (!arrastre || arrastre.ancla.f !== f) return;
    if (arrastre.ancla.c === c && !arrastre.movido) return;
    arrastre.movido = true;
    setSeleccion({ ancla: arrastre.ancla, foco: { f, c } });
    setCursor({ f, c });
  };

  const alPulsarCelda = (
    evento: MouseEvent<HTMLTableCellElement>,
    f: number,
    c: number,
  ): void => {
    // Mayús ya seleccionó en `mousedown`; un arrastre tampoco rota.
    if (evento.shiftKey || huboArrastreRef.current) return;
    setSeleccion(null);
    setCursor({ f, c });
    const persona = filas[f];
    const celda = persona?.celdas[c];
    // La ausencia no se edita aquí: el clic no hace nada (🔒).
    if (!persona || !celda || celda.esAusencia) return;
    escribirCelda({
      funcionarioId: persona.funcionarioId,
      fecha: celda.fecha,
      estado: rotarEstado(celda.estado, config.estados),
    });
  };

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>): void => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "z") {
      evento.preventDefault();
      deshacerUltimo();
      return;
    }
    const flechas: Record<string, Posicion> = {
      ArrowUp: { f: -1, c: 0 },
      ArrowDown: { f: 1, c: 0 },
      ArrowLeft: { f: 0, c: -1 },
      ArrowRight: { f: 0, c: 1 },
    };
    const delta = flechas[evento.key];
    if (delta) {
      evento.preventDefault();
      if (filas.length === 0 || dias.length === 0) return;
      const base = seleccion?.foco ?? cursor ?? { f: 0, c: 0 };
      const destino = {
        f: Math.min(Math.max(base.f + delta.f, 0), filas.length - 1),
        c: Math.min(Math.max(base.c + delta.c, 0), dias.length - 1),
      };
      if (evento.shiftKey) {
        setSeleccion({ ancla: seleccion?.ancla ?? cursor ?? base, foco: destino });
      } else {
        setSeleccion(null);
      }
      setCursor(destino);
      return;
    }
    if (evento.key === "Escape") {
      setSeleccion(null);
      return;
    }
    if (evento.key === "Delete" || evento.key === "Backspace") {
      evento.preventDefault();
      fijarEn(posicionesSeleccion(), null);
      return;
    }
    const turno = estadoDeTecla(evento.key, config.estados);
    if (turno) {
      evento.preventDefault();
      fijarEn(posicionesSeleccion(), turno);
    }
  };

  /** Publica el mes. Si falla, lanza: quien la llama decide dónde se muestra el error. */
  const publicarMes = async (): Promise<void> => {
    setErrorEscritura(null);
    const resultado = await servicio.publicar(mes);
    setMatriz((actual) =>
      actual ? { ...actual, estadoMes: resultado.estadoMes } : actual,
    );
    setConfirmandoPublicar(false);
    // Un HITO (M7): modal de éxito.
    void mensaje.exito({
      titulo: `Mes publicado: ${nombreMes(mes)}`,
      textoPrincipal: "Aceptar",
    });
  };

  /** Sin celdas vacías no se pregunta: se publica y el error va al aviso de la matriz. */
  const publicar = async (): Promise<void> => {
    setPublicando(true);
    try {
      await publicarMes();
    } catch (fallo: unknown) {
      setErrorEscritura(presentarError(fallo).mensaje);
    } finally {
      setPublicando(false);
    }
  };

  const exportar = async (formato: FormatoReporte): Promise<void> => {
    setExportando(formato);
    setErrorEscritura(null);
    try {
      descargarArchivo(
        await servicio.exportar(mes, formato),
        config.nombreArchivo(mes, formato),
      );
    } catch (fallo: unknown) {
      setErrorEscritura(presentarError(fallo).mensaje);
    } finally {
      setExportando(null);
    }
  };

  const alCambiarZona = (
    funcionarioId: number,
    zonalId: number | null,
    denominacion: DenominacionInstruccion | null,
  ): void => {
    const zona = zonales.find((z) => z.id === zonalId)?.nombre ?? null;
    setMatriz((actual) =>
      actual
        ? {
            ...actual,
            personas: actual.personas.map((p) =>
              p.funcionarioId === funcionarioId
                ? { ...p, zonalId, zona, denominacion }
                : p,
            ),
          }
        : actual,
    );
    if (matrizRef.current) {
      matrizRef.current = {
        ...matrizRef.current,
        personas: matrizRef.current.personas.map((p) =>
          p.funcionarioId === funcionarioId
            ? { ...p, zonalId, zona, denominacion }
            : p,
        ),
      };
    }
    setZonaDe(null);
    toast.exito("Zona actualizada.");
    onZonaCambiada?.();
  };

  // 404: quien mira no gestiona Instrucción. Nada de la cobertura se pinta; con `marco`, la página
  // sigue mostrando lo suyo (el maestro, sin pestañas).
  if (noDisponible) {
    return marco
      ? marco({
          disponible: false,
          estadoMes: null,
          selectorMes: null,
          titulo: "",
          acciones: null,
          filtros: null,
          contenido: null,
          panel: null,
        })
      : null;
  }

  const personas = matriz?.personas.length ?? 0;
  const estadoMes = matriz ? ESTADO_MES[matriz.estadoMes] : null;
  // El reporte es lo publicado: sin publicar, «Exportar» se apaga y dice por qué (regla 6).
  const exportarBloqueado =
    !!config.exportarPublicado && matriz?.estadoMes === "BORRADOR";
  // Referencia estable (los servicios son objetos de funciones): el modal la usa en su efecto.
  const proponerMes = servicio.proponerMes;
  const esFinDeSemana = (fecha: string): boolean =>
    diaSemana(fecha) === 0 || diaSemana(fecha) === 6;

  /** Las clases de una celda: estado + día (fin de semana, lunes) + selección. */
  const claseCelda = (
    estado: string | null,
    esAusencia: boolean,
    fecha: string,
    f: number,
    c: number,
  ): string => {
    const partes = ["p-0.5 text-center text-xs font-semibold"];
    const color = estado ? COLOR[estado] : "";
    if (color) partes.push(color);
    else if (esFinDeSemana(fecha)) partes.push("bg-base-200");
    if (diaSemana(fecha) === 1) partes.push("border-l border-base-content/40");
    partes.push(esAusencia ? "cursor-not-allowed" : "cursor-pointer");
    if (enSeleccion(f, c)) partes.push("ring-1 ring-inset ring-primary brightness-90");
    else if (cursor && cursor.f === f && cursor.c === c)
      partes.push("ring-1 ring-inset ring-base-content");
    return partes.join(" ");
  };

  const rotuloCabecera = "text-xs uppercase tracking-wider";

  let indiceFila = -1;

  // ─────────────────────────────── Piezas ───────────────────────────────

  /** ‹ mes ›: a la derecha del encabezado. */
  const selectorMes = (
    <div className="flex items-center gap-1.5">
      <Boton
        tamano="sm"
        onClick={() => setMes((m) => desplazarMes(m, -1))}
        aria-label="Mes anterior"
      >
        ‹
      </Boton>
      <span className="min-w-32 text-center text-sm font-semibold capitalize text-app-strong">
        {nombreMes(mes)}
      </span>
      <Boton
        tamano="sm"
        onClick={() => setMes((m) => desplazarMes(m, 1))}
        aria-label="Mes siguiente"
      >
        ›
      </Boton>
    </div>
  );

  const indicadorGuardado = (
    <span className="text-xs text-app-muted" role="status">
      {guardado === "guardando"
        ? "Guardando…"
        : guardado === "guardado"
          ? "Guardado hace un momento"
          : ""}
    </span>
  );

  /** El estado del mes y, a su lado en texto pequeño, el guardado. */
  const estadoYGuardado = (
    <>
      {estadoMes && <EtiquetaEstado tono={estadoMes.tono}>{estadoMes.texto}</EtiquetaEstado>}
      {indicadorGuardado}
    </>
  );

  const botonPropuesta = proponerMes && (
    <Boton
      tamano="md"
      onClick={() => setPropuestaAbierta(true)}
      motivoDeshabilitado={!matriz ? "Espere a que cargue la matriz del mes." : null}
    >
      Generar propuesta del mes
    </Boton>
  );

  // Con `exportarPublicado` (DAF): Excel y PDF, apagados con su motivo mientras el mes es borrador.
  const botonesExportar = config.exportarPublicado ? (
    (
      [
        { formato: "xlsx", texto: "Exportar Excel" },
        { formato: "pdf", texto: "Exportar PDF" },
      ] as const
    ).map(({ formato, texto }) => (
      <Boton
        key={formato}
        tamano="md"
        onClick={() => void exportar(formato)}
        cargando={exportando === formato}
        deshabilitado={!matriz || exportando !== null}
        motivoDeshabilitado={
          exportarBloqueado ? "Publique el mes para exportar el reporte" : null
        }
      >
        {texto}
      </Boton>
    ))
  ) : (
    <Boton
      tamano="md"
      onClick={() => void exportar("xlsx")}
      cargando={exportando !== null}
      deshabilitado={!matriz}
    >
      {exportando ? "Exportando…" : "Exportar Excel"}
    </Boton>
  );

  const botonPublicar = (
    <Boton
      variante="primario"
      tamano="md"
      onClick={() =>
        celdasVacias > 0
          ? setConfirmandoPublicar(true)
          : void publicar()
      }
      cargando={publicando}
      deshabilitado={!matriz}
    >
      Publicar mes
    </Boton>
  );

  /*
    MES SIN TURNOS (2026-10-24): una tarjeta de estado vacío con UNA salida, «Asignar turnos del
    mes». La DAF suma la suya de siempre, «Copiar mes anterior».
  */
  const estadoVacio = mesSinCargar && (
    <div className="flex flex-col gap-3 rounded-box border border-dashed border-base-300 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Iconos nombre="asignarTurnos" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold text-app-strong">
            {conMayuscula(mesSinAnio(mes))} todavía no tiene turnos
          </p>
          <p className="text-sm text-app-muted">
            Elija un horario tipo y se llena el mes para {config.sujeto.plural === "personas" ? "todas las" : "todos los"}{" "}
            {config.sujeto.plural} en un paso. Después puede ajustar días sueltos.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {config.copiarMesAnterior && (
          <Boton tamano="md" cargando={preparandoCopia} onClick={() => void prepararCopia()}>
            {preparandoCopia ? "Leyendo el mes anterior…" : "Copiar mes anterior"}
          </Boton>
        )}
        <Boton
          variante="primario"
          tamano="md"
          onClick={() => abrirAsignar((matriz?.personas ?? []).map((p) => p.funcionarioId))}
        >
          Asignar turnos del mes
        </Boton>
      </div>
    </div>
  );

  const avisoFaltantes = sinNingunTurno.length > 0 && (
    <AvisoEnLinea
      variante="advertencia"
      accion={
        <Boton
          tamano="sm"
          onClick={() => abrirAsignar(sinNingunTurno.map((p) => p.funcionarioId))}
        >
          Asignar turnos a quienes faltan
        </Boton>
      }
    >
      {sinNingunTurno.length}{" "}
      {sinNingunTurno.length === 1
        ? `${config.sujeto.singular} no tiene`
        : `${config.sujeto.plural} no tienen`}{" "}
      ningún turno en {mesSinAnio(mes)}
    </AvisoEnLinea>
  );

  /** «Ayala Camila · del 3 al 7 (5 días)», o «3 personas · …» si abarca varias filas. */
  const textoSeleccion = (() => {
    if (!rect) return "";
    const d1 = Number(dias[rect.c1]?.slice(8, 10));
    const d2 = Number(dias[rect.c2]?.slice(8, 10));
    const cuantos = (rect.f2 - rect.f1 + 1) * (rect.c2 - rect.c1 + 1);
    const quien =
      rect.f1 === rect.f2
        ? (filas[rect.f1]?.nombre ?? "")
        : `${rect.f2 - rect.f1 + 1} ${config.sujeto.plural}`;
    const cuando = d1 === d2 ? `el ${d1}` : `del ${d1} al ${d2}`;
    return `${quien} · ${cuando} (${cuantos} ${cuantos === 1 ? "día" : "días"})`;
  })();

  // La barra solo con DOS días o más: un día suelto se cambia con el clic.
  const tamanoSeleccion = rect ? (rect.f2 - rect.f1 + 1) * (rect.c2 - rect.c1 + 1) : 0;
  const barraSeleccion = tamanoSeleccion >= 2 && (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md bg-primary/10 p-2 text-xs"
      role="toolbar"
      aria-label="Acciones sobre la selección"
    >
      <span className="font-semibold text-app-strong">{textoSeleccion}</span>
      <span className="text-app-label">· Poner:</span>
      {config.estados.map((estado) => (
        <Boton
          key={estado.valor}
          tamano="sm"
          onClick={() => fijarEn(posicionesSeleccion(), estado.valor)}
        >
          {estado.letra} · {estado.nombre}
        </Boton>
      ))}
      <Boton tamano="sm" onClick={() => fijarEn(posicionesSeleccion(), null)}>
        Limpiar
      </Boton>
      <Boton variante="enlace" tamano="sm" onClick={() => setSeleccion(null)}>
        Cancelar
      </Boton>
      <span className="text-app-muted">
        Teclas: {config.estados.map((estado) => estado.teclas[0]).join(", ")} · Supr limpia ·
        Ctrl+Z deshace
      </span>
    </div>
  );

  // Pie: lo principal siempre; el resto y las ausencias, tras «Ver todos los totales».
  type FilaPie = {
    rotulo: string;
    clave: string;
    minimo?: "dia" | "noche";
    valor: (t: (typeof totales)[number]) => number;
  };
  const filaDeEstado = (fila: ConfigMatriz["pie"][number]): FilaPie => ({
    rotulo: fila.rotulo,
    clave: fila.clave,
    minimo: fila.minimo,
    valor: (t) => t.porEstado[fila.valor] ?? 0,
  });
  const filasPie: FilaPie[] = [
    ...config.pie.filter((fila) => fila.principal).map(filaDeEstado),
    ...(verTodosTotales
      ? [
          ...config.pie.filter((fila) => !fila.principal).map(filaDeEstado),
          { rotulo: "Ausencias", clave: "ausencias", valor: (t: (typeof totales)[number]) => t.ausencias },
        ]
      : []),
    { rotulo: "Sin turno", clave: "sinTurno", valor: (t) => t.sinTurno },
  ];

  const grilla = (
    // La grilla: una sola caja de desplazamiento con cabecera, nombres y pie fijos.
    <div
      ref={grillaRef}
      className="max-h-[70vh] overflow-auto rounded-md border border-base-300 focus:outline-none"
      tabIndex={0}
      onKeyDown={alTeclear}
      role="grid"
      aria-label={`${config.nombreGrilla} de ${nombreMes(mes)}`}
      aria-multiselectable
    >
      <table className="table table-xs">
        <thead>
          <tr>
            <th
              scope="col"
              className={`sticky left-0 top-0 z-30 bg-base-100 text-left text-app-label ${rotuloCabecera}`}
            >
              {config.sujeto.columna}
            </th>
            {dias.map((fecha) => (
              <th
                key={fecha}
                scope="col"
                className={`sticky top-0 z-10 text-center ${rotuloCabecera} ${
                  fecha === hoy
                    ? "bg-primary text-primary-content"
                    : `${esFinDeSemana(fecha) ? "bg-base-200" : "bg-base-100"} text-app-label`
                } ${diaSemana(fecha) === 1 ? "border-l border-base-content/40" : ""}`}
                title={`${nombreDiaSemana(fecha)} ${fecha.slice(8, 10)}${fecha === hoy ? " · hoy" : ""}`}
              >
                <div>{nombreDiaSemana(fecha).slice(0, 2)}</div>
                <div>{fecha.slice(8, 10)}</div>
              </th>
            ))}
          </tr>
        </thead>
        {grupos.map((grupo) => (
          <tbody key={grupo.zona}>
            {/* La fila de zona es solo su título (2026-10-24): sin contador ni subtotal. */}
            <tr>
              <th
                scope="rowgroup"
                className="sticky left-0 z-10 bg-base-100 pt-3 text-left text-xs font-semibold uppercase tracking-wider text-app-label"
              >
                {grupo.zona}
              </th>
              <td colSpan={dias.length} className="bg-base-100" />
            </tr>
            {grupo.personas.map((persona) => {
              indiceFila += 1;
              const f = indiceFila;
              const denominacion = nombreDenominacion(persona.denominacion);
              const cargoDistinto =
                persona.cargo &&
                normalizar(persona.cargo) !== normalizar(denominacion ?? "")
                  ? persona.cargo
                  : null;
              const detalle = [denominacion, cargoDistinto].filter(Boolean).join(" · ");
              return (
                <tr key={persona.funcionarioId}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-base-100 text-left font-normal"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        {onVerAusencias ? (
                          <Tooltip texto="Ver ausencias de esta persona">
                            <Boton
                              variante="enlace"
                              tamano="sm"
                              className="h-auto whitespace-nowrap px-0 py-0.5 font-semibold"
                              onClick={() => onVerAusencias(persona.funcionarioId)}
                            >
                              {persona.nombre}
                            </Boton>
                          </Tooltip>
                        ) : (
                          <span className="whitespace-nowrap font-semibold text-app-strong">
                            {persona.nombre}
                          </span>
                        )}
                        {detalle && (
                          <span className="text-xs text-app-muted">{detalle}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {persona.avisos > 0 && (
                          <span className="badge badge-warning badge-xs whitespace-nowrap">
                            {persona.avisos} {persona.avisos === 1 ? "aviso" : "avisos"}
                          </span>
                        )}
                        <BotonIcono
                          icono="asignarTurnos"
                          rotulo="Asignar turnos a"
                          nombre={persona.nombre}
                          tooltip={`Asignar turnos a esta ${config.sujeto.singular}`}
                          onClick={() => abrirAsignar([persona.funcionarioId], true)}
                        />
                        {config.conCambiarGrupo && (
                          <BotonIcono
                            icono="cambiarZona"
                            rotulo="Cambiar zona de"
                            nombre={persona.nombre}
                            tooltip="Cambiar zona"
                            alinear="fin"
                            onClick={() => setZonaDe(persona)}
                          />
                        )}
                      </div>
                    </div>
                  </th>
                  {persona.celdas.map((celda, c) => {
                    const estadoTexto = celda.estado
                      ? (NOMBRE[celda.estado] ?? celda.estado)
                      : "sin turno";
                    const descripcion = `${persona.nombre} · ${nombreDiaSemana(celda.fecha).toLowerCase()} ${celda.fecha.slice(8, 10)} · ${estadoTexto}${
                      celda.esAusencia ? " (de Ausencias)" : ""
                    }${celda.aviso ? ` · ${celda.aviso}` : ""}`;
                    const vacia = !celda.esAusencia && celda.estado === null;
                    // Lo que se lee al pasar: la ausencia dice dónde se edita; la vacía, qué significa.
                    const ayuda = celda.esAusencia
                      ? onVerAusencias
                        ? `${estadoTexto} (toque el nombre para ver sus ausencias)`
                        : `${estadoTexto}: se edita en Ausencias`
                      : vacia
                        ? `Sin restricción${celda.aviso ? ` · ${celda.aviso}` : ""}`
                        : descripcion;
                    return (
                      <td
                        key={celda.fecha}
                        role="gridcell"
                        aria-label={descripcion}
                        aria-selected={enSeleccion(f, c)}
                        aria-readonly={celda.esAusencia}
                        title={ayuda}
                        className={claseCelda(celda.estado, celda.esAusencia, celda.fecha, f, c)}
                        onMouseDown={(evento) => alPresionarCelda(evento, f, c)}
                        onMouseEnter={() => alArrastrarSobre(f, c)}
                        onClick={(evento) => alPulsarCelda(evento, f, c)}
                      >
                        <span
                          className={`inline-flex h-6 w-full items-center justify-center gap-0.5 rounded-sm ${
                            vacia ? "border border-dashed border-base-300" : ""
                          }`}
                        >
                          {celda.esAusencia && <Iconos nombre="candado" />}
                          {celda.estado ? (LETRA[celda.estado] ?? celda.estado) : ""}
                          {celda.aviso && (
                            <span className="text-warning" aria-hidden="true">
                              !
                            </span>
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
        {/* Pie de totales de TODO el personal en alcance. */}
        <tfoot>
          {filasPie.map(({ rotulo, clave, minimo, valor }) => (
            <tr key={clave}>
              <th
                scope="row"
                className={`sticky bottom-0 left-0 z-30 bg-base-200 text-left ${
                  clave === "sinTurno" ? "text-warning" : ""
                }`}
              >
                {rotulo}
              </th>
              {totales.map((total, c) => {
                // Día bajo el mínimo (DAF): lo marca el servidor; se resalta y se dice (regla 6).
                const bajo =
                  minimo !== undefined && !!matriz?.bajoMinimo?.[dias[c]]?.[minimo];
                return (
                  <td
                    key={dias[c]}
                    className={`sticky bottom-0 z-10 bg-base-200 text-center text-xs ${
                      (clave === "sinTurno" && total.sinTurno > 0) || bajo
                        ? "text-warning font-semibold"
                        : valor(total) === 0
                          ? "text-app-muted"
                          : ""
                    }`}
                    data-total={`${clave}-${dias[c]}`}
                    title={bajo ? "bajo el mínimo" : undefined}
                  >
                    {valor(total)}
                    {bajo && <span aria-hidden="true">!</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );

  /* La leyenda, en lenguaje simple, bajo la grilla: la letra y este texto son la información. */
  const leyenda = (
    <div className="flex flex-wrap items-center gap-3 text-xs text-app-label">
      {config.estados.map((estado) => (
        <span key={estado.valor} className="flex items-center gap-1.5">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-sm text-xs font-semibold ${estado.clase}`}
            aria-hidden="true"
          >
            {estado.letra}
          </span>
          {estado.significado}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-5 w-5 rounded-sm border border-dashed border-base-300"
          aria-hidden="true"
        />
        Vacío: sin restricción
      </span>
      <span className="flex items-center gap-1.5">
        {config.ausencias.map((ausencia) => ausencia.letra).join("/")}: se cargan en Ausencias
        <Iconos nombre="candado" />
        {onVerAusencias && " (toque el nombre)"}
      </span>
    </div>
  );

  const cuerpo = (
    <>
      {estadoVacio}
      {avisoFaltantes}
      {matriz && personas > 0 && (
        <p className="text-xs text-app-muted">
          Clic en un día: cambia el turno{" "}
          {[...config.estados.map((estado) => estado.letra), "vacío"].join(" → ")} · Mayús + clic:
          elige varios días seguidos y los cambia de una vez
        </p>
      )}
      {barraSeleccion}
      {errorEscritura && <AvisoEnLinea variante="error">{errorEscritura}</AvisoEnLinea>}
      {errorCarga && <AvisoEnLinea variante="error">{errorCarga}</AvisoEnLinea>}
      {cargando ? (
        <p className="py-6 text-center text-sm text-app-muted">{config.cargando}</p>
      ) : !matriz || personas === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">{config.vacio}</p>
      ) : (
        <>
          {grilla}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {leyenda}
            <Boton
              variante="enlace"
              tamano="sm"
              aria-expanded={verTodosTotales}
              onClick={() => setVerTodosTotales((ver) => !ver)}
            >
              {verTodosTotales ? "Ver solo los totales principales" : "Ver todos los totales"}
            </Boton>
          </div>
        </>
      )}
    </>
  );

  const modales = (
    <>
      {asignarA && matriz && (
        <DrawerAsignarTurnos
          mes={mes}
          dias={dias}
          personas={matriz.personas}
          marcadasIniciales={asignarA.ids}
          unaPersona={asignarA.unaPersona}
          config={config}
          onAplicar={(cambios, aviso) => {
            setAsignarA(null);
            void escribirLote(cambios, { avisoAsignacion: aviso });
          }}
          onCerrar={() => setAsignarA(null)}
        />
      )}

      {propuestaAbierta && matriz && proponerMes && (
        <ModalPropuestaMes
          mes={mes}
          personas={matriz.personas}
          proponer={proponerMes}
          contexto={config.contexto}
          rutaParametros={config.rutaParametros}
          onAplicar={(cambios) => {
            setPropuestaAbierta(false);
            // Por el lote de siempre: optimista y con su paso en «Deshacer».
            void escribirLote(cambios);
          }}
          onCerrar={() => setPropuestaAbierta(false)}
        />
      )}

      {zonaDe && config.conCambiarGrupo && (
        <ModalCambiarZona
          key={zonaDe.funcionarioId}
          persona={zonaDe}
          zonales={zonales}
          onGuardado={alCambiarZona}
          onCerrar={() => setZonaDe(null)}
        />
      )}

      {/* Con celdas vacías se pregunta; si la publicación falla, el error queda en este modal. */}
      <MensajeModal
        abierto={confirmandoPublicar}
        variante="advertencia"
        titulo={`¿Publicar ${nombreMes(mes)} con celdas vacías?`}
        mensaje={`${celdasVacias} celdas vacías: ${config.consecuenciaVacias ?? "esos días quedan sin restricción de horario"}.`}
        textoPrincipal="Publicar igual"
        textoSecundario="Volver"
        tituloError="No se pudo publicar el mes"
        onPrincipal={publicarMes}
        onSecundario={() => setConfirmandoPublicar(false)}
      />

      {/* Vista previa de «Copiar mes anterior»: cuántas celdas, antes de escribir ninguna. */}
      <MensajeModal
        abierto={copia !== null}
        variante="info"
        titulo="¿Copiar el mes anterior?"
        mensaje={
          copia === null
            ? ""
            : copia.length === 0
              ? `${nombreMes(desplazarMes(mes, -1))} no tiene turnos que copiar.`
              : `Se escribirán ${copia.length} ${copia.length === 1 ? "celda" : "celdas"}: cada día toma el turno del mismo día de ${nombreMes(desplazarMes(mes, -1))}. Las ausencias no se copian.`
        }
        textoPrincipal={copia?.length === 0 ? "Entendido" : "Copiar"}
        textoSecundario={copia?.length === 0 ? null : "Volver"}
        onPrincipal={() => {
          const cambios = copia ?? [];
          setCopia(null);
          if (cambios.length > 0) void escribirLote(cambios);
        }}
        onSecundario={() => setCopia(null)}
      />
    </>
  );

  const notaPie = [config.explicacion, config.nota].filter(Boolean).join(" ");
  const titulo = `Turnos de ${mesSinAnio(mes)}`;

  const acciones = (
    <>
      {botonPropuesta}
      {botonesExportar}
      {botonPublicar}
    </>
  );

  const filtros = (
    <>
      <input
        type="search"
        className="input input-bordered input-sm min-w-[320px]"
        aria-label={config.sujeto.buscar}
        placeholder={config.sujeto.buscar}
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
      />
      <select
        className="select select-bordered select-sm"
        aria-label={config.grupo.filtro}
        value={zonaFiltro}
        onChange={(evento) => setZonaFiltro(evento.target.value)}
      >
        <option value="">
          {config.grupo.plural === "zonas" ? "Todas las zonas" : `Todos los ${config.grupo.plural}`}
        </option>
        {zonasDisponibles.map((zona) => (
          <option key={zona} value={zona}>
            {zona}
          </option>
        ))}
      </select>
      {config.conDenominacion && (
        <select
          className="select select-bordered select-sm"
          aria-label="Denominación"
          value={denominacionFiltro}
          onChange={(evento) => setDenominacionFiltro(evento.target.value)}
        >
          <option value="">Todas las denominaciones</option>
          {DENOMINACIONES.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.nombre}
            </option>
          ))}
        </select>
      )}
      {/* Sin reglas de aviso configuradas no hay avisos que filtrar ni contar. */}
      {matriz?.avisosConfigurados && (
        <>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={soloAvisos}
              onChange={(evento) => setSoloAvisos(evento.target.checked)}
            />
            Solo con avisos
          </label>
          <span className="badge badge-warning badge-sm whitespace-nowrap">
            Avisos de descanso: {totalAvisos}
          </span>
        </>
      )}
      {exportarBloqueado && (
        <span className="text-xs text-app-muted">
          Publique el mes para exportar el reporte
        </span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Boton
          tamano="md"
          title={deshacer.length > 0 ? `${deshacer.length} cambios para deshacer` : undefined}
          onClick={deshacerUltimo}
          motivoDeshabilitado={deshacer.length === 0 ? "No hay cambios que deshacer." : null}
        >
          ↶ Deshacer
        </Boton>
        <Boton
          variante="primario"
          tamano="md"
          motivoDeshabilitado={
            !matriz || personas === 0 ? `No hay ${config.sujeto.plural} a quienes asignar.` : null
          }
          onClick={() => abrirAsignar(personasFiltradas.map((p) => p.funcionarioId))}
        >
          Asignar turnos
        </Boton>
      </div>
    </>
  );

  const contenido = (
    <>
      {cuerpo}
      {modales}
    </>
  );

  const panel = (
    <PanelTabla titulo={titulo} acciones={acciones} filtros={filtros} nota={notaPie || undefined}>
      {contenido}
    </PanelTabla>
  );

  return marco
    ? marco({
        disponible: true,
        estadoMes: estadoYGuardado,
        selectorMes,
        titulo,
        acciones,
        filtros,
        contenido,
        nota: notaPie || undefined,
        panel,
      })
    : panel;
};

export default MatrizCobertura;
