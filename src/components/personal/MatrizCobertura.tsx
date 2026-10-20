/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: MatrizCobertura.tsx
 * Responsabilidad: Planificar la cobertura mensual por turnos del personal de Instrucción.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO SE MONTA PARA INSTRUCCIÓN (la página lo decide por el área que gestiona), y el servidor lo
 * refuerza: sin alcance de Instrucción responde 404 y este panel no se muestra (2026-10-05).
 *
 * REDISEÑO DEL 2026-10-05, a partir del prototipo «Cobertura por turnos (Instrucción)»:
 *   · cabecera con mes ‹ ›, estado del mes (Borrador / Publicado / Publicado · con cambios),
 *     «Exportar Excel», «Publicar mes» e indicador de guardado;
 *   · grilla agrupada por zona con subtotales D/N, cabecera de días y columna de nombres fijas y
 *     pie de totales;
 *   · edición por CLIC (rotar D → N → — → vacía), por RANGO (Shift+clic o modo «Seleccionar»)
 *     y por TECLADO (D, N, -, Supr, flechas, Shift+flechas, Ctrl+Z);
 *   · «Aplicar patrón», «Continuar rotación» y «Cambiar zona» en ventanas propias.
 *
 * VERSIÓN CONSOLIDADA DE LA DAF (2026-10-06), todo por configuración y apagado en Instrucción:
 * «Generar propuesta del mes» (si el servicio la tiene), «Exportar» Excel / PDF solo con el mes
 * publicado, subtotal compacto «D1 · N2» y los días bajo el mínimo resaltados en el pie. La
 * importación del HORARIO salió de aquí: se hace una sola vez en «Carga inicial».
 *
 * EDICIÓN OPTIMISTA: la vista cambia al instante (setState funcional); las escrituras por celda se
 * ENCOLAN (una tras otra, nunca en paralelo) y, si una falla, se revierte su celda y se muestra el
 * mensaje del servidor tal cual (regla 7). Los rangos y patrones van en UN lote. Tras escribir se
 * relee la matriz en silencio para reconciliar avisos, totales y estado del mes con el servidor.
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
} from "react";

import PanelCatalogo from "../catalogos/PanelCatalogo.tsx";
import Boton from "../common/Boton.tsx";
import Iconos from "../common/Iconos.tsx";
import MensajeModal from "../common/MensajeModal.tsx";
import ModalAplicarPatron from "./cobertura/ModalAplicarPatron.tsx";
import ModalCambiarZona from "./cobertura/ModalCambiarZona.tsx";
import ModalContinuarRotacion from "./cobertura/ModalContinuarRotacion.tsx";
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
import {
  DENOMINACIONES,
  desplazarMes,
  diaSemana,
  nombreDenominacion,
  nombreDiaSemana,
  nombreMes,
  resumirSinTurno,
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
};


const ESTADO_MES: Record<EstadoMesCobertura, { texto: string; clase: string }> =
  {
    BORRADOR: { texto: "Borrador", clase: "badge-ghost" },
    PUBLICADO: { texto: "Publicado", clase: "badge-success" },
    PUBLICADO_CON_CAMBIOS: {
      texto: "Publicado · con cambios",
      clase: "badge-warning",
    },
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
  const LEYENDA = todosLosEstados.map((e) => ({
    estado: e.valor,
    texto: e.leyenda,
  }));
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
  const [modo, setModo] = useState<"rotar" | "seleccionar">("rotar");
  const [colapsadas, setColapsadas] = useState<Set<string>>(() => new Set());

  const [cursor, setCursor] = useState<Posicion | null>(null);
  const [seleccion, setSeleccion] = useState<{
    ancla: Posicion;
    foco: Posicion;
  } | null>(null);
  const [deshacer, setDeshacer] = useState<PasoDeshacer[]>([]);

  const [patronAbierto, setPatronAbierto] = useState(false);
  const [rotacionAbierta, setRotacionAbierta] = useState(false);
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

  useEffect(() => {
    if (!config.conCambiarGrupo) return;
    void CatalogoCuadroService.listarZonales()
      .then(setZonales)
      .catch(() => {
        // Sin zonales, «Cambiar zona» queda con la lista vacía; no bloquea la matriz.
      });
  }, [config.conCambiarGrupo]);

  useEffect(
    () => () => {
      window.clearTimeout(recargaRef.current);
    },
    [],
  );

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
   * Varias celdas en UN lote (rango, patrón, rotación, deshacer). Optimista; lo que el servidor
   * omite se revierte, y todo se revierte si el lote falla.
   */
  const escribirLote = useCallback(
    async (
      cambios: CambioCelda[],
      opciones: { registrarDeshacer?: boolean; omitidasCliente?: number } = {},
    ) => {
      const { registrarDeshacer = true, omitidasCliente = 0 } = opciones;
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
        toast.exito(
          `${resultado.aplicadas} celdas actualizadas · ${
            omitidasCliente + resultado.omitidas.length
          } omitidas por ausencias`,
        );
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

  /** Las filas EDITABLES visibles, en orden de pantalla (las de grupos colapsados no cuentan). */
  const filas = useMemo(
    () =>
      grupos.flatMap((grupo) =>
        colapsadas.has(grupo.zona) ? [] : grupo.personas,
      ),
    [grupos, colapsadas],
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

  const resumenVacios = useMemo(
    () => (matriz ? resumirSinTurno(matriz.personas, dias) : null),
    [matriz, dias],
  );

  const celdasVacias = useMemo(
    () => totales.reduce((suma, total) => suma + total.sinTurno, 0),
    [totales],
  );

  /** El mes sin NINGÚN turno cargado (solo ausencias o vacío): estado vacío con sus tres salidas. */
  const mesSinCargar =
    !!config.copiarMesAnterior &&
    !!matriz &&
    matriz.personas.length > 0 &&
    matriz.personas.every((persona) =>
      persona.celdas.every((celda) => celda.esAusencia || celda.estado === null),
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

  // ─────────────────────────── Selección rectangular ───────────────────────────

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

  const alPulsarCelda = (
    evento: MouseEvent<HTMLTableCellElement>,
    f: number,
    c: number,
  ): void => {
    grillaRef.current?.focus();
    const seleccionando = modo === "seleccionar" || evento.shiftKey;
    if (seleccionando) {
      if (evento.shiftKey && (seleccion || cursor)) {
        setSeleccion({
          ancla: seleccion?.ancla ?? cursor ?? { f, c },
          foco: { f, c },
        });
      } else {
        setSeleccion({ ancla: { f, c }, foco: { f, c } });
      }
      setCursor({ f, c });
      return;
    }
    setSeleccion(null);
    setCursor({ f, c });
    const persona = filas[f];
    const celda = persona?.celdas[c];
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

  // ─────────────────────────── Alcance de los modales ───────────────────────────

  const alcancePatron = useMemo(() => {
    if (rect) {
      return {
        personas: filas.slice(rect.f1, rect.f2 + 1),
        indicesDias: Array.from(
          { length: rect.c2 - rect.c1 + 1 },
          (_, i) => rect.c1 + i,
        ),
        descripcion: `la selección (${
          (rect.f2 - rect.f1 + 1) * (rect.c2 - rect.c1 + 1)
        } celdas)`,
      };
    }
    return {
      personas: personasFiltradas,
      indicesDias: dias.map((_, i) => i),
      descripcion: `las ${personasFiltradas.length} ${config.sujeto.plural} visibles`,
    };
  }, [rect, filas, personasFiltradas, dias, config.sujeto.plural]);

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

  if (noDisponible) return null;

  const personas = matriz?.personas.length ?? 0;
  const cantidadZonas = new Set(
    (matriz?.personas ?? []).map((p) => p.zona ?? SIN_ZONA),
  ).size;
  const estadoMes = matriz ? ESTADO_MES[matriz.estadoMes] : null;
  // El reporte es lo publicado: sin publicar, «Exportar» se apaga y dice por qué (regla 6).
  const exportarBloqueado =
    !!config.exportarPublicado && matriz?.estadoMes === "BORRADOR";
  // Referencia estable (los servicios son objetos de funciones): el modal la usa en su efecto.
  const proponerMes = servicio.proponerMes;
  const tamanoSeleccion = rect
    ? (rect.f2 - rect.f1 + 1) * (rect.c2 - rect.c1 + 1)
    : 0;

  /** Las clases de una celda: estado + día (fin de semana, lunes) + selección. */
  const claseCelda = (
    estado: string | null,
    esAusencia: boolean,
    fecha: string,
    f: number,
    c: number,
  ): string => {
    const partes = ["text-center text-xs font-semibold"];
    const color = estado ? COLOR[estado] : "";
    if (color) partes.push(color);
    else if (diaSemana(fecha) === 0 || diaSemana(fecha) === 6)
      partes.push("bg-base-200");
    if (diaSemana(fecha) === 1) partes.push("border-l border-base-content/40");
    partes.push(esAusencia ? "cursor-not-allowed" : "cursor-pointer");
    if (enSeleccion(f, c)) partes.push("ring-1 ring-inset ring-primary brightness-90");
    else if (cursor && cursor.f === f && cursor.c === c)
      partes.push("ring-1 ring-inset ring-base-content");
    return partes.join(" ");
  };

  let indiceFila = -1;

  return (
    <PanelCatalogo
      titulo={config.titulo}
      distintivo={
        <span className="flex flex-wrap items-center gap-2">
          <span className="badge badge-ghost badge-sm whitespace-nowrap">
            {cargando
              ? "Cargando…"
              : `${personas} ${personas === 1 ? config.sujeto.singular : config.sujeto.plural} · ${cantidadZonas} ${
                  cantidadZonas === 1 ? config.grupo.singular : config.grupo.plural
                }`}
          </span>
          {estadoMes && (
            <span
              className={`badge badge-sm whitespace-nowrap ${estadoMes.clase}`}
            >
              {estadoMes.texto}
            </span>
          )}
        </span>
      }
      procesando={cargando}
    >
      <div className="flex flex-col gap-3 px-1 pt-1">
        {/* D16 · Mes, guardado, exportar y publicar. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-app-muted" role="status">
              {guardado === "guardando"
                ? "Guardando…"
                : guardado === "guardado"
                  ? "Guardado hace un momento"
                  : ""}
            </span>
            {proponerMes && (
              <Boton
                tamano="md"
                onClick={() => setPropuestaAbierta(true)}
                motivoDeshabilitado={!matriz ? "Espere a que cargue la matriz del mes." : null}
              >
                Generar propuesta del mes
              </Boton>
            )}
            {config.exportarPublicado ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5" role="group" aria-label="Exportar">
                  <span className="text-sm text-app-label">
                    {exportando ? "Exportando…" : "Exportar"}
                  </span>
                  {(
                    [
                      { formato: "xlsx", texto: "Excel" },
                      { formato: "pdf", texto: "PDF" },
                    ] as const
                  ).map(({ formato, texto }) => (
                    <Boton
                      key={formato}
                      tamano="md"
                      onClick={() => void exportar(formato)}
                      deshabilitado={!matriz || exportando !== null}
                      motivoDeshabilitado={
                        exportarBloqueado ? "Publique el mes para exportar el reporte" : null
                      }
                      aria-label={`Exportar ${texto}`}
                    >
                      {texto}
                    </Boton>
                  ))}
                </span>
                {exportarBloqueado && (
                  <span className="text-xs text-app-muted">
                    Publique el mes para exportar el reporte
                  </span>
                )}
              </span>
            ) : (
              <Boton
                tamano="md"
                onClick={() => void exportar("xlsx")}
                cargando={exportando !== null}
                deshabilitado={!matriz}
              >
                {exportando ? "Exportando…" : "Exportar Excel"}
              </Boton>
            )}
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
          </div>
        </div>

        {/* D17 · Qué significa la matriz (texto de la configuración). */}
        <AvisoEnLinea variante="info">{config.banner}</AvisoEnLinea>
        {config.nota && (
          <p className="text-xs text-app-muted">{config.nota}</p>
        )}

        {/*
          MES SIN CARGAR (2026-10-06, solo con `copiarMesAnterior`): para no empezar de cero se
          ofrecen las salidas conocidas. La importación del HORARIO vive en «Carga inicial».
        */}
        {mesSinCargar && (
          <AvisoEnLinea variante="info">
            <span className="flex flex-col items-start gap-2">
              <span>
                Aún no hay turnos cargados para {nombreMes(mes)}. Empiece desde lo que ya conoce:
              </span>
              <span className="flex flex-wrap gap-2">
                <Boton tamano="sm" cargando={preparandoCopia} onClick={() => void prepararCopia()}>
                  {preparandoCopia ? "Leyendo el mes anterior…" : "Copiar mes anterior"}
                </Boton>
                <Boton tamano="sm" onClick={() => setPatronAbierto(true)}>
                  Aplicar patrón
                </Boton>
                <Boton tamano="sm" onClick={() => setRotacionAbierta(true)}>
                  Continuar rotación
                </Boton>
              </span>
            </span>
          </AvisoEnLinea>
        )}

        {/* D18 · Mes sin planificar. Compacto en una línea si la configuración lo pide. */}
        {!mesSinCargar &&
          config.avisoSinTurnoCompacto &&
          resumenVacios &&
          resumenVacios.personas > 0 && (
            <p
              className="flex flex-wrap items-center gap-2 text-xs text-app-muted"
              role="status"
            >
              <span>
                <span aria-hidden="true">⚠ </span>
                {resumenVacios.personas}{" "}
                {resumenVacios.personas === 1
                  ? config.sujeto.singular
                  : config.sujeto.plural}{" "}
                sin turno en {resumenVacios.dias}{" "}
                {resumenVacios.dias === 1 ? "día" : "días"} (
                {resumenVacios.desde?.slice(8, 10)}–{resumenVacios.hasta?.slice(8, 10)})
              </span>
              <span className="flex flex-wrap gap-2">
                <Boton tamano="sm" onClick={() => setRotacionAbierta(true)}>
                  Continuar rotación
                </Boton>
                <Boton tamano="sm" onClick={() => setPatronAbierto(true)}>
                  Aplicar patrón
                </Boton>
              </span>
            </p>
          )}
        {!config.avisoSinTurnoCompacto && resumenVacios && resumenVacios.personas > 0 && (
          <AvisoEnLinea
            variante="advertencia"
            accion={
              <span className="flex gap-2">
                <Boton tamano="sm" onClick={() => setRotacionAbierta(true)}>
                  Continuar rotación
                </Boton>
                <Boton tamano="sm" onClick={() => setPatronAbierto(true)}>
                  Aplicar patrón
                </Boton>
              </span>
            }
          >
            {resumenVacios.personas}{" "}
            {resumenVacios.personas === 1
              ? config.sujeto.singular
              : config.sujeto.plural}{" "}
            sin turno
            en {resumenVacios.dias} {resumenVacios.dias === 1 ? "día" : "días"}{" "}
            ({resumenVacios.desde?.slice(8, 10)}–
            {resumenVacios.hasta?.slice(8, 10)})
          </AvisoEnLinea>
        )}

        {/* D19 · Barra de herramientas. */}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">{config.sujeto.buscar}</span>
            <input
              type="search"
              className="input input-bordered input-sm"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Apellido o nombre"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">{config.grupo.filtro}</span>
            <select
              className="select select-bordered select-sm"
              value={zonaFiltro}
              onChange={(evento) => setZonaFiltro(evento.target.value)}
            >
              <option value="">Todas</option>
              {zonasDisponibles.map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </label>
          {config.conDenominacion && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">Denominación</span>
            <select
              className="select select-bordered select-sm"
              value={denominacionFiltro}
              onChange={(evento) => setDenominacionFiltro(evento.target.value)}
            >
              <option value="">Todas</option>
              {DENOMINACIONES.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          )}
          <label className="flex items-center gap-2 pb-1 text-xs">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={soloAvisos}
              onChange={(evento) => setSoloAvisos(evento.target.checked)}
            />
            Solo con avisos
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">Al pulsar una celda</span>
            <div className="join" role="group" aria-label="Al pulsar una celda">
              <button
                type="button"
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`btn btn-sm join-item ${modo === "rotar" ? "btn-primary" : ""}`}
                aria-pressed={modo === "rotar"}
                onClick={() => setModo("rotar")}
              >
                Rotar turno
              </button>
              <button
                type="button"
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`btn btn-sm join-item ${modo === "seleccionar" ? "btn-primary" : ""}`}
                aria-pressed={modo === "seleccionar"}
                onClick={() => setModo("seleccionar")}
              >
                Seleccionar rango
              </button>
            </div>
          </div>
          <Boton
            tamano="sm"
            onClick={deshacerUltimo}
            motivoDeshabilitado={deshacer.length === 0 ? "No hay cambios que deshacer." : null}
          >
            Deshacer ({deshacer.length})
          </Boton>
          {matriz?.avisosConfigurados && (
            <span className="badge badge-warning badge-sm whitespace-nowrap">
              Avisos de descanso: {totalAvisos}
            </span>
          )}
        </div>

        {/* Barra de selección (D21). */}
        {rect && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-md bg-primary/10 p-2 text-xs"
            role="toolbar"
            aria-label="Acciones sobre la selección"
          >
            <span className="font-semibold">{tamanoSeleccion} celdas:</span>
            {config.estados.map((estado) => (
              <Boton
                key={estado.valor}
                tamano="sm"
                className="min-w-8"
                onClick={() => fijarEn(posicionesSeleccion(), estado.valor)}
                aria-label={estado.etiquetaBoton}
              >
                {estado.letra}
              </Boton>
            ))}
            <Boton tamano="sm" onClick={() => fijarEn(posicionesSeleccion(), null)}>
              Limpiar
            </Boton>
            <Boton tamano="sm" onClick={() => setPatronAbierto(true)}>
              Aplicar patrón…
            </Boton>
            <Boton variante="enlace" tamano="sm" onClick={() => setSeleccion(null)}>
              Quitar selección
            </Boton>
          </div>
        )}

        {errorEscritura && (
          <AvisoEnLinea variante="error">{errorEscritura}</AvisoEnLinea>
        )}
        {errorCarga && (
          <AvisoEnLinea variante="error">{errorCarga}</AvisoEnLinea>
        )}

        {/* Leyenda: el color apoya; la letra y este rótulo son la información (regla 6). */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-app-muted">
          {LEYENDA.map((elemento) => (
            <span key={elemento.estado} className="flex items-center gap-1">
              <span
                className={`inline-block h-3 w-3 rounded-sm border border-base-300 ${
                  COLOR[elemento.estado] ?? ""
                }`}
              />
              {elemento.texto}
            </span>
          ))}
        </div>

        {cargando ? (
          <p className="py-6 text-center text-sm text-app-muted">
            {config.cargando}
          </p>
        ) : !matriz || personas === 0 ? (
          <p className="py-6 text-center text-sm text-app-muted">
            {config.vacio}
          </p>
        ) : (
          // D20 · La grilla: una sola caja de desplazamiento con cabecera, nombres y pie fijos.
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
                    className="sticky left-0 top-0 z-30 bg-base-100 text-left"
                  >
                    {config.sujeto.columna}
                  </th>
                  {dias.map((fecha) => (
                    <th
                      key={fecha}
                      scope="col"
                      className={`sticky top-0 z-10 text-center ${
                        fecha === hoy
                          ? "bg-primary text-primary-content"
                          : "bg-base-100"
                      } ${diaSemana(fecha) === 1 ? "border-l border-base-content/40" : ""}`}
                      title={`${nombreDiaSemana(fecha)} ${fecha.slice(8, 10)}${fecha === hoy ? " · hoy" : ""}`}
                    >
                      <div>{nombreDiaSemana(fecha).slice(0, 2)}</div>
                      <div>{fecha.slice(8, 10)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              {grupos.map((grupo) => {
                const colapsada = colapsadas.has(grupo.zona);
                return (
                  <tbody key={grupo.zona}>
                    <tr className="bg-base-200">
                      <th
                        scope="rowgroup"
                        className="sticky left-0 z-10 bg-base-200 text-left"
                      >
                        <Boton
                          variante="enlace"
                          tamano="sm"
                          aria-expanded={!colapsada}
                          onClick={() =>
                            setColapsadas((actual) => {
                              const siguiente = new Set(actual);
                              if (siguiente.has(grupo.zona))
                                siguiente.delete(grupo.zona);
                              else siguiente.add(grupo.zona);
                              return siguiente;
                            })
                          }
                        >
                          {colapsada ? "▸" : "▾"} {grupo.zona} (
                          {grupo.personas.length})
                        </Boton>
                      </th>
                      {dias.map((fecha, c) => {
                        // Subtotal de los estados «en servicio» del grupo (D/N en Instrucción).
                        const cuentas = config.activos.map(
                          (valor) =>
                            grupo.personas.filter(
                              (persona) => persona.celdas[c]?.estado === valor,
                            ).length,
                        );
                        const suma = cuentas.reduce((a, b) => a + b, 0);
                        // Compacto (DAF): «D1 · N2», solo lo distinto de cero; sin nadie, «—».
                        const texto = config.subtotalCompacto
                          ? suma === 0
                            ? "—"
                            : config.activos
                                .flatMap((valor, i) =>
                                  cuentas[i] > 0
                                    ? [`${LETRA[valor] ?? valor}${cuentas[i]}`]
                                    : [],
                                )
                                .join(" · ")
                          : cuentas.join("/");
                        return (
                          <td
                            key={fecha}
                            className={`text-center text-xs ${
                              // Con ceros atenuados (DAF) el subtotal vacío es gris, sin fondo:
                              // solo «Sin turno» del pie se resalta. Instrucción conserva su aviso.
                              suma === 0
                                ? config.cerosAtenuados
                                  ? "text-app-muted"
                                  : "bg-warning/20 text-warning"
                                : ""
                            }`}
                            title={`Subtotal ${grupo.zona} · ${fecha.slice(8, 10)}: ${config.activos
                              .map(
                                (valor, i) =>
                                  `${cuentas[i]} ${(NOMBRE[valor] ?? valor).toLowerCase()}`,
                              )
                              .join(", ")}`}
                          >
                            {texto}
                          </td>
                        );
                      })}
                    </tr>
                    {!colapsada &&
                      grupo.personas.map((persona) => {
                        indiceFila += 1;
                        const f = indiceFila;
                        const denominacion = nombreDenominacion(
                          persona.denominacion,
                        );
                        const cargoDistinto =
                          persona.cargo &&
                          normalizar(persona.cargo) !==
                            normalizar(denominacion ?? "")
                            ? persona.cargo
                            : null;
                        return (
                          <tr key={persona.funcionarioId}>
                            <th
                              scope="row"
                              className="sticky left-0 z-10 bg-base-100 text-left font-normal"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col">
                                  <span className="whitespace-nowrap font-medium">
                                    {persona.nombre}
                                  </span>
                                  {denominacion && (
                                    <span className="text-xs text-app-muted">
                                      {denominacion}
                                    </span>
                                  )}
                                  {cargoDistinto && (
                                    <span className="text-xs text-app-muted">
                                      {cargoDistinto}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {persona.avisos > 0 && (
                                    <span className="badge badge-warning badge-xs whitespace-nowrap">
                                      {persona.avisos}{" "}
                                      {persona.avisos === 1 ? "aviso" : "avisos"}
                                    </span>
                                  )}
                                  {config.conCambiarGrupo && (
                                    <Boton
                                      variante="enlace"
                                      tamano="sm"
                                      onClick={() => setZonaDe(persona)}
                                      aria-label={`Cambiar zona de ${persona.nombre}`}
                                    >
                                      Cambiar zona
                                    </Boton>
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
                              return (
                                <td
                                  key={celda.fecha}
                                  role="gridcell"
                                  aria-label={descripcion}
                                  aria-selected={enSeleccion(f, c)}
                                  aria-readonly={celda.esAusencia}
                                  title={descripcion}
                                  className={claseCelda(
                                    celda.estado,
                                    celda.esAusencia,
                                    celda.fecha,
                                    f,
                                    c,
                                  )}
                                  onClick={(evento) => alPulsarCelda(evento, f, c)}
                                >
                                  <span className="inline-flex items-center gap-0.5">
                                    {celda.esAusencia && (
                                      <Iconos nombre="candado" />
                                    )}
                                    {celda.estado
                                      ? (LETRA[celda.estado] ?? celda.estado)
                                      : ""}
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
                );
              })}
              {/* D25 · Pie de totales de TODO el personal en alcance. */}
              <tfoot>
                {[
                  ...config.pie.map((fila) => ({
                    rotulo: fila.rotulo,
                    clave: fila.clave,
                    minimo: fila.minimo,
                    valor: (t: (typeof totales)[number]) =>
                      t.porEstado[fila.valor] ?? 0,
                  })),
                  {
                    rotulo: "Ausencias",
                    clave: "ausencias",
                    minimo: undefined,
                    valor: (t: (typeof totales)[number]) => t.ausencias,
                  },
                  {
                    rotulo: "Sin turno",
                    clave: "sinTurno",
                    minimo: undefined,
                    valor: (t: (typeof totales)[number]) => t.sinTurno,
                  },
                ].map(({ rotulo, clave, minimo, valor }) => (
                  <tr key={clave}>
                    <th
                      scope="row"
                      className="sticky bottom-0 left-0 z-30 bg-base-200 text-left"
                    >
                      {rotulo}
                    </th>
                    {totales.map((total, c) => {
                      // Día bajo el mínimo (DAF): lo marca el servidor; se resalta y se dice (regla 6).
                      const bajo =
                        minimo !== undefined &&
                        !!matriz?.bajoMinimo?.[dias[c]]?.[minimo];
                      return (
                        <td
                          key={dias[c]}
                          className={`sticky bottom-0 z-10 bg-base-200 text-center text-xs ${
                            (clave === "sinTurno" && total.sinTurno > 0) || bajo
                              ? "text-warning font-semibold"
                              : config.cerosAtenuados && valor(total) === 0
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
        )}
      </div>

      {patronAbierto && matriz && (
        <ModalAplicarPatron
          abierto
          dias={dias}
          personas={alcancePatron.personas}
          indicesDias={alcancePatron.indicesDias}
          descripcionAlcance={alcancePatron.descripcion}
          estados={config.estados}
          patronesRapidos={config.patronesRapidos}
          ayudaPatron={config.ayudaPatron}
          contexto={config.contexto}
          onAplicar={(cambios) => {
            setPatronAbierto(false);
            void escribirLote(cambios);
          }}
          onCerrar={() => setPatronAbierto(false)}
        />
      )}

      {rotacionAbierta && matriz && (
        <ModalContinuarRotacion
          abierto
          mes={mes}
          personas={personasFiltradas}
          servicio={servicio}
          sujetoPlural={config.sujeto.plural}
          contexto={config.contexto}
          onAplicar={(cambios) => {
            setRotacionAbierta(false);
            void escribirLote(cambios);
          }}
          onCerrar={() => setRotacionAbierta(false)}
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
    </PanelCatalogo>
  );
};

export default MatrizCobertura;
