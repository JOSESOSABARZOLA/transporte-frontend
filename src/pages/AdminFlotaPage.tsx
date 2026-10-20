/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: AdminFlotaPage.tsx
 * Responsabilidad: Pantalla P-12 «Flota y garajes»: lo que la DAF puede asignar al planificar el
 *                  día —vehículos, conductores y dónde se guarda la flota—.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE. Los endpoints de la flota estaban en el servidor desde M-17 y hasta el
 * 2026-08-20 **solo se podían usar con curl** (limitación L-11), con la flota en cero (PV-03):
 * la DAF no podía asignar transporte a ningún operativo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REDISEÑO DEL 2026-10-14: INDICADORES + PESTAÑAS + CAJÓN.
 *
 *   · Cuatro indicadores del servidor (`GET /administracion/flota/resumen`), clicables: cada
 *     uno abre su pestaña con su filtro, que se ve como ficha y se quita aparte.
 *   · Tres pestañas en lugar de tres tablas apiladas, con la pestaña y el filtro en la URL
 *     (`?tab=vehiculos|conductores|garajes&filtro=…`). `?conductor=<id>` —el enlace desde
 *     «Planificar el día»— sigue abriendo la ficha de ese conductor.
 *   · Barra común: buscador, Activos | De baja | Todos (Vigentes en garajes), **arranca en
 *     Activos** —antes arrancaba en «Todos» con los dados de baja mezclados—, contador y alta.
 *   · Alta y edición en un cajón por registro (`DrawerVehiculo`, `DrawerConductor`,
 *     `DrawerGaraje`); `MensajeModal` solo para confirmar la baja y el descarte.
 *   · La baja SE DESHACE («Reactivar»), y antes de confirmarla se pregunta al servidor qué
 *     pasaría (`impacto-baja`): con transporte asignado desde hoy no se ofrece —el servidor la
 *     rechazaría con 409—, y la de un vehículo nombra a los conductores que quedarán sin él (D3).
 *   · Tras guardar: aviso breve y fila resaltada.
 *
 * AJUSTES DEL 2026-10-15:
 *   · Placa normalizada (`PMA-3370`) al guardar, buscar, comparar y mostrar.
 *   · «Documentos por vencer» dice cuántos no tienen fechas y abre «Con alertas de documentos»
 *     (vencidos, por vencer y sin fechas), ficha junto al buscador.
 *   · PAGINADO en el navegador, igual en las tres pestañas: 10 filas por omisión (10/25/50),
 *     `?page=&size=` en la URL y cada pestaña recuerda su página. Buscar, cambiar el segmentado o
 *     la ficha vuelve a la primera; guardar lleva a la página de la fila; una baja que vacía la
 *     página retrocede. El contador de la barra cuenta lo filtrado, no la página.
 *   · Sin `?fecha=`: el menú ya no la pone en este enlace y, si llega, se quita.
 *
 * Contrato: `transporte-backend/docs/CONTRATO-flota-y-garajes.md`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import Insignia from "../components/common/Insignia.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import Pestanas from "../components/common/Pestanas.tsx";
import TarjetaIndicador from "../components/common/TarjetaIndicador.tsx";
import PanelAusenciasConductor from "../components/flota/AusenciasConductor.tsx";
import DrawerConductor from "../components/flota/DrawerConductor.tsx";
import DrawerGaraje from "../components/flota/DrawerGaraje.tsx";
import DrawerVehiculo from "../components/flota/DrawerVehiculo.tsx";
import TablaConductores from "../components/flota/TablaConductores.tsx";
import TablaGarajes from "../components/flota/TablaGarajes.tsx";
import TablaVehiculos from "../components/flota/TablaVehiculos.tsx";
import SelectorSegmentado from "../components/forms/SelectorSegmentado.tsx";
import type { ImpactoBaja, ResumenFlota } from "../interfaces/Flota.ts";
import type { Conductor, UbicacionFlota, Vehiculo } from "../interfaces/Transporte.ts";
import { useAusenciasDeLaFlota } from "../hooks/useAusenciasDeLaFlota.ts";
import { usePermiso } from "../hooks/usePermiso.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
import { FlotaService } from "../services/flota.service.ts";
import { fechaLarga } from "../utils/ausencias.util.ts";
import { ANTETITULO_DAF } from "../utils/daf.util.ts";
import { avisoDeFallo, presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import {
  esGarajeVigente,
  filtrarConductores,
  filtrarGarajes,
  filtrarVehiculos,
  hoyEnGuayaquil,
  normalizarPlaca,
  type FiltroEstado,
  type FiltroIndicador,
} from "../utils/flota.util.ts";
import {
  KM_MAXIMO_POR_DEFECTO,
  cambiosDeConductor,
  cuerpoAltaConductor,
  cuerpoGaraje,
  cuerpoVehiculo,
  type ValoresConductor,
  type ValoresGaraje,
  type ValoresVehiculo,
} from "../utils/formularioFlota.util.ts";
import { MS_RESALTADO, paginar } from "../utils/listadoOperativos.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

type Pestana = "vehiculos" | "conductores" | "garajes";

const PESTANAS: {
  id: Pestana;
  titulo: string;
  ayuda: string;
  marcador: string;
  nuevo: string;
}[] = [
  {
    id: "vehiculos",
    titulo: "Vehículos",
    ayuda: "Un vehículo sin conductor habitual no se propone automáticamente al planificar el día.",
    marcador: "Buscar placa o descripción…",
    nuevo: "+ Nuevo vehículo",
  },
  {
    id: "conductores",
    titulo: "Conductores",
    ayuda:
      "Los conductores viven en su propio maestro; no se les asignan operativos, solo el transporte de ellos.",
    marcador: "Buscar cédula, nombre o placa…",
    nuevo: "+ Nuevo conductor",
  },
  {
    id: "garajes",
    titulo: "Garajes autorizados",
    ayuda:
      "Destinos posibles de la flota al terminar la jornada. Con zonal, se sugieren automáticamente.",
    marcador: "Buscar garaje…",
    nuevo: "+ Nuevo garaje",
  },
];

const esPestana = (valor: string | null): valor is Pestana =>
  valor === "vehiculos" || valor === "conductores" || valor === "garajes";

/** Qué filtro de indicador vale en cada pestaña. Uno ajeno en la URL se ignora. */
const INDICADORES_DE: Record<Pestana, FiltroIndicador[]> = {
  vehiculos: ["alertas-documentos", "sin-conductor"],
  conductores: ["incompletos"],
  garajes: [],
};

const NOMBRE_INDICADOR: Record<FiltroIndicador, string> = {
  "alertas-documentos": "Con alertas de documentos",
  "sin-conductor": "Sin conductor habitual",
  incompletos: "Datos incompletos",
};

const opcionesEstado = (pestana: Pestana): { valor: FiltroEstado; nombre: string }[] => [
  { valor: "activos", nombre: pestana === "garajes" ? "Vigentes" : "Activos" },
  { valor: "inactivos", nombre: "De baja" },
  { valor: "todos", nombre: "Todos" },
];

type Edicion =
  | { tipo: "vehiculo"; registro: Vehiculo | null }
  | { tipo: "conductor"; registro: Conductor | null }
  | { tipo: "garaje"; registro: UbicacionFlota | null };

type PorDarDeBaja =
  | { tipo: "vehiculo"; registro: Vehiculo; impacto: ImpactoBaja }
  | { tipo: "conductor"; registro: Conductor; impacto: ImpactoBaja }
  | { tipo: "garaje"; registro: UbicacionFlota };

/** La fila recién tocada, con su pestaña: los ids de vehículos y conductores se repiten. */
type Resaltado = { tipo: Pestana; id: number } | null;

const TEXTO_BAJA: Record<PorDarDeBaja["tipo"], string> = {
  vehiculo: "Dejará de ofrecerse en la asignación de transporte. Su historial se conserva.",
  conductor: "Dejará de ofrecerse a la DAF. No se borra nada; puede reactivarlo después.",
  garaje: "Ya no podrá elegirse como destino de la flota al terminar la jornada.",
};

/** Filas por página que se ofrecen; la primera es la de omisión. */
const TAMANOS = [10, 25, 50] as const;
const TAMANO_POR_DEFECTO = TAMANOS[0];

/** `?size=` válido, o el de omisión. */
const tamanoDeUrl = (valor: string | null): number => {
  const numero = Number(valor);
  return (TAMANOS as readonly number[]).includes(numero) ? numero : TAMANO_POR_DEFECTO;
};

/** `?page=` (desde 1 en la URL) como índice desde 0; lo que no es una página, la primera. */
const paginaDeUrl = (valor: string | null): number => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 ? numero - 1 : 0;
};

const porPestana = <T,>(valor: T): Record<Pestana, T> => ({
  vehiculos: valor,
  conductores: valor,
  garajes: valor,
});

/** «07:30» → «07H30», como lo escribe el servidor. */
const horaConH = (hora: string): string => hora.replace(":", "H");

/**
 * El motivo por el que la baja no procede, con las mismas palabras que el 409 del servidor. Se
 * dice ANTES de confirmar: ofrecer «Sí, dar de baja» para que el servidor lo rechace es un engaño.
 */
const textoBajaBloqueada = (sujeto: string, impacto: ImpactoBaja): string => {
  const primera = impacto.primeraAsignacion;
  const otros = impacto.asignacionesVigentes - 1;
  const donde = primera
    ? ` el ${fechaLarga(primera.fecha)} a las ${horaConH(primera.horaInicio)} (operativo ${primera.identificador})`
    : "";
  const mas = otros > 0 ? ` y ${otros} ${otros === 1 ? "operativo más" : "operativos más"}` : "";
  return `${sujeto} tiene transporte asignado${donde}${mas}. Libere esa asignación en «Planificar el día» antes de darlo de baja.`;
};

const AdminFlotaPage = () => {
  const [params, setParams] = useSearchParams();
  const pestana: Pestana = esPestana(params.get("tab")) ? (params.get("tab") as Pestana) : "vehiculos";
  const filtroUrl = params.get("filtro") as FiltroIndicador | null;
  const indicador = filtroUrl && INDICADORES_DE[pestana].includes(filtroUrl) ? filtroUrl : null;

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [garajes, setGarajes] = useState<UbicacionFlota[]>([]);
  const [resumen, setResumen] = useState<ResumenFlota | null>(null);
  const [zonales, setZonales] = useState<{ id: number; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [busquedas, setBusquedas] = useState<Record<Pestana, string>>({
    vehiculos: "",
    conductores: "",
    garajes: "",
  });
  const [estados, setEstados] = useState<Record<Pestana, FiltroEstado>>({
    vehiculos: "activos",
    conductores: "activos",
    garajes: "activos",
  });

  /**
   * La página (desde 0) y las filas por página DE CADA PESTAÑA: al volver a una, sigue donde se
   * dejó. La de la pestaña abierta arranca de `?page=` / `?size=`.
   */
  const [paginas, setPaginas] = useState<Record<Pestana, number>>(() => ({
    ...porPestana(0),
    [pestana]: paginaDeUrl(params.get("page")),
  }));
  const [tamanos, setTamanos] = useState<Record<Pestana, number>>(() => ({
    ...porPestana<number>(TAMANO_POR_DEFECTO),
    [pestana]: tamanoDeUrl(params.get("size")),
  }));
  /**
   * La fila guardada o reactivada cuya página hay que abrir cuando llegue la lista RECARGADA: se
   * guarda la lista de antes (`origen`) para no buscarla en la vieja.
   */
  const filaPorMostrar = useRef<{ fila: NonNullable<Resaltado>; origen: unknown[] } | null>(null);
  const refTabla = useRef<HTMLDivElement>(null);

  const [edicion, setEdicion] = useState<Edicion | null>(null);
  /** Cambia en cada apertura: el cajón se monta de nuevo con sus valores iniciales. */
  const [apertura, setApertura] = useState(0);
  const [errorCajon, setErrorCajon] = useState<string | null>(null);
  const [baja, setBaja] = useState<PorDarDeBaja | null>(null);
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  const [resaltado, setResaltado] = useState<Resaltado>(null);

  /**
   * Ausencias de los conductores (2026-10-16, permiso `flota:ausencias`): el cajón abierto y el
   * distintivo de la tabla. El cajón de ausencias y el de edición nunca están abiertos a la vez.
   */
  const puedeAusencias = usePermiso("flota:ausencias");
  const [enAusencias, setEnAusencias] = useState<Conductor | null>(null);
  const hoyFlota = hoyEnGuayaquil();
  const { porConductor: ausenciasPorConductor, refrescar: refrescarAusencias } =
    useAusenciasDeLaFlota(puedeAusencias, hoyFlota);

  /** `?conductor=<id>` se lee UNA vez: abre su ficha y la URL se limpia. */
  const conductorDeUrl = useRef(params.get("conductor"));

  const abrir = useCallback((nueva: Edicion) => {
    setErrorCajon(null);
    setEnAusencias(null);
    setApertura((antes) => antes + 1);
    setEdicion(nueva);
  }, []);

  /**
   * Los tres maestros, **siempre con los de baja** (quien no encuentra un registro lo vuelve a dar
   * de alta y choca con la unicidad), y el resumen aparte: si los indicadores fallan, la flota se
   * administra igual.
   */
  const cargar = useCallback(async () => {
    try {
      const [flota, personas, ubicaciones] = await Promise.all([
        FlotaService.listarVehiculos(true),
        FlotaService.listarConductores(true),
        FlotaService.listarUbicaciones(true),
      ]);
      setVehiculos(flota);
      setConductores(personas);
      setGarajes(ubicaciones);
      setAviso(null);

      if (conductorDeUrl.current) {
        const pedido = personas.find((persona) => String(persona.id) === conductorDeUrl.current);
        conductorDeUrl.current = null;
        if (pedido) abrir({ tipo: "conductor", registro: pedido });
        setParams(
          (actuales) => {
            const siguiente = new URLSearchParams(actuales);
            siguiente.delete("conductor");
            if (pedido) {
              siguiente.set("tab", "conductores");
              siguiente.delete("filtro");
            }
            return siguiente;
          },
          { replace: true },
        );
      }
    } catch (fallo: unknown) {
      setAviso(avisoDeFallo(fallo));
    } finally {
      setCargando(false);
    }

    try {
      setResumen(await FlotaService.resumen());
    } catch {
      setResumen(null);
    }
  }, [abrir, setParams]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    // Aparte: si el catálogo de zonales falla, la flota se administra igual.
    void CatalogoCuadroService.listarZonales()
      .then((lista) => setZonales(lista.map((zonal) => ({ id: zonal.id, nombre: zonal.nombre }))))
      .catch(() => setZonales([]));
  }, []);

  /**
   * La URL dice la página de la pestaña abierta (`?page=` desde 1, `?size=`), sin los valores de
   * omisión, y nunca `?fecha=`: el menú de la DAF la añade a sus enlaces y esta pantalla no depende
   * de ninguna jornada (la baja la valida el servidor con el día de hoy en Quito). Se reemplaza la
   * entrada del historial: paginar no es navegar.
   */
  const paginaActual = paginas[pestana];
  const tamanoActual = tamanos[pestana];
  useEffect(() => {
    const page = paginaActual > 0 ? String(paginaActual + 1) : null;
    const size = tamanoActual !== TAMANO_POR_DEFECTO ? String(tamanoActual) : null;
    if (
      params.get("page") === page &&
      params.get("size") === size &&
      !params.has("fecha")
    ) {
      return;
    }
    setParams(
      (actuales) => {
        const siguiente = new URLSearchParams(actuales);
        siguiente.delete("fecha");
        if (page) siguiente.set("page", page);
        else siguiente.delete("page");
        if (size) siguiente.set("size", size);
        else siguiente.delete("size");
        return siguiente;
      },
      { replace: true },
    );
  }, [paginaActual, tamanoActual, params, setParams]);

  // El resaltado se apaga solo.
  useEffect(() => {
    if (!resaltado) return;
    const espera = window.setTimeout(() => setResaltado(null), MS_RESALTADO);
    return () => window.clearTimeout(espera);
  }, [resaltado]);
  const cerrarCajon = useCallback(() => {
    setEdicion(null);
    setErrorCajon(null);
  }, []);

  // ─────────────────────────── Navegación ───────────────────────────

  const irA = (destino: Pestana, filtro: FiltroIndicador | null = null) => {
    setParams(
      (actuales) => {
        const siguiente = new URLSearchParams(actuales);
        siguiente.set("tab", destino);
        if (filtro) siguiente.set("filtro", filtro);
        else siguiente.delete("filtro");
        return siguiente;
      },
      { replace: true },
    );
  };

  /** Cambiar lo que se filtra vuelve a la primera página de esa pestaña. */
  const aPrimeraPagina = (destino: Pestana) =>
    setPaginas((antes) => (antes[destino] === 0 ? antes : { ...antes, [destino]: 0 }));

  /** Un indicador abre su pestaña en «Activos», con su filtro, desde la primera página. */
  const irAIndicador = (destino: Pestana, filtro: FiltroIndicador | null) => {
    setEstados((antes) => ({ ...antes, [destino]: "activos" }));
    aPrimeraPagina(destino);
    irA(destino, filtro);
  };

  /** Quitar la ficha del indicador también vuelve a la primera página. */
  const quitarIndicador = () => {
    aPrimeraPagina(pestana);
    irA(pestana);
  };

  /** Cambiar de página lleva, con suavidad, al inicio de la tabla. */
  const cambiarPagina = (pagina: number) => {
    setPaginas((antes) => ({ ...antes, [pestana]: pagina }));
    refTabla.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const cambiarTamano = (tamano: number) =>
    setTamanos((antes) => ({ ...antes, [pestana]: tamano }));

  // ─────────────────────────── Filas visibles ───────────────────────────

  const filtros = { busqueda: busquedas[pestana], estado: estados[pestana], indicador };

  const vehiculosVisibles = useMemo(
    () =>
      filtrarVehiculos(
        vehiculos,
        { busqueda: busquedas.vehiculos, estado: estados.vehiculos, indicador: pestana === "vehiculos" ? indicador : null },
        conductores,
      ),
    [vehiculos, conductores, busquedas.vehiculos, estados.vehiculos, pestana, indicador],
  );
  const conductoresVisibles = useMemo(
    () =>
      filtrarConductores(conductores, {
        busqueda: busquedas.conductores,
        estado: estados.conductores,
        indicador: pestana === "conductores" ? indicador : null,
      }),
    [conductores, busquedas.conductores, estados.conductores, pestana, indicador],
  );
  const garajesVisibles = useMemo(
    () => filtrarGarajes(garajes, { busqueda: busquedas.garajes, estado: estados.garajes }),
    [garajes, busquedas.garajes, estados.garajes],
  );

  const vigentes: Record<Pestana, number> = {
    vehiculos: vehiculos.filter((uno) => uno.activo).length,
    conductores: conductores.filter((uno) => uno.activo).length,
    garajes: garajes.filter(esGarajeVigente).length,
  };
  const totales: Record<Pestana, number> = {
    vehiculos: vehiculos.length,
    conductores: conductores.length,
    garajes: garajes.length,
  };
  const visibles: Record<Pestana, number> = {
    vehiculos: vehiculosVisibles.length,
    conductores: conductoresVisibles.length,
    garajes: garajesVisibles.length,
  };

  /** Los ids visibles de cada pestaña, en orden: para saber en qué página quedó una fila. */
  const idsVisibles: Record<Pestana, number[]> = useMemo(
    () => ({
      vehiculos: vehiculosVisibles.map((uno) => uno.id),
      conductores: conductoresVisibles.map((uno) => uno.id),
      garajes: garajesVisibles.map((uno) => uno.id),
    }),
    [vehiculosVisibles, conductoresVisibles, garajesVisibles],
  );

  /**
   * PAGINADO EN EL NAVEGADOR (A8): la flota son decenas de filas y ya llegan todas. `paginar` corrige
   * la página si el filtro —o una baja— la deja vacía: dar de baja la última fila de la página 3
   * vuelve a la 2, y el efecto de abajo lo lleva al estado y a la URL.
   */
  const paginaVehiculos = paginar(vehiculosVisibles, paginas.vehiculos, tamanos.vehiculos);
  const paginaConductores = paginar(conductoresVisibles, paginas.conductores, tamanos.conductores);
  const paginaGarajes = paginar(garajesVisibles, paginas.garajes, tamanos.garajes);
  const efectiva: Record<Pestana, number> = {
    vehiculos: paginaVehiculos.pagina,
    conductores: paginaConductores.pagina,
    garajes: paginaGarajes.pagina,
  };
  const paginaEfectiva = efectiva[pestana];

  // Mientras carga no se corrige: con las listas vacías, `?page=3` caería a la primera.
  useEffect(() => {
    if (cargando || paginaEfectiva === paginaActual) return;
    setPaginas((antes) => ({ ...antes, [pestana]: paginaEfectiva }));
  }, [cargando, paginaEfectiva, paginaActual, pestana]);

  /*
   * Tras guardar o reactivar, a la página donde quedó la fila (que además se resalta). Se mira UNA
   * vez, cuando llega la lista recargada; si el filtro la oculta, no se busca más.
   */
  useEffect(() => {
    const pedido = filaPorMostrar.current;
    if (!pedido) return;
    const fuente = { vehiculos, conductores, garajes }[pedido.fila.tipo];
    if (fuente === pedido.origen) return;
    filaPorMostrar.current = null;
    const objetivo = pedido.fila;
    const indice = idsVisibles[objetivo.tipo].indexOf(objetivo.id);
    if (indice < 0) return;
    const destino = Math.floor(indice / tamanos[objetivo.tipo]);
    setPaginas((antes) => (antes[objetivo.tipo] === destino ? antes : { ...antes, [objetivo.tipo]: destino }));
  }, [idsVisibles, tamanos, vehiculos, conductores, garajes]);

  const mensajeVacio = (): string => {
    if (cargando) return "Cargando…";
    if (filtros.busqueda.trim() || filtros.indicador) return "Ningún registro coincide con el filtro.";
    if (filtros.estado === "inactivos") return "No hay registros dados de baja.";
    if (pestana === "vehiculos") {
      return "No hay ningún vehículo registrado. Empiece por aquí: sin vehículos no se puede asignar uno habitual a los conductores.";
    }
    if (pestana === "conductores") {
      return "No hay ningún conductor registrado. Sin conductores, la DAF no puede asignar transporte a ningún operativo.";
    }
    return "No hay garajes registrados. Sin ellos, la DAF no puede declarar dónde queda la flota.";
  };

  // ─────────────────────────── Guardar ───────────────────────────

  /** Resalta la fila y, cuando llegue la lista recargada, abre su página. */
  const mostrarFila = (fila: NonNullable<Resaltado>) => {
    setResaltado(fila);
    filaPorMostrar.current = { fila, origen: { vehiculos, conductores, garajes }[fila.tipo] };
  };

  /** Tras un alta, la fila se ve aunque el filtro estuviera en «De baja». */
  const verActivos = (destino: Pestana) =>
    setEstados((antes) => (antes[destino] === "inactivos" ? { ...antes, [destino]: "activos" } : antes));

  const guardar = async (
    accion: () => Promise<{ id: number; texto: string; tipo: Pestana; alta: boolean }>,
  ) => {
    setProcesando(true);
    setErrorCajon(null);
    try {
      const hecha = await accion();
      if (hecha.alta) verActivos(hecha.tipo);
      toast.exito(hecha.texto);
      mostrarFila({ tipo: hecha.tipo, id: hecha.id });
      setEdicion(null);
      await cargar();
    } catch (fallo: unknown) {
      setErrorCajon(presentarError(fallo).mensaje);
    } finally {
      setProcesando(false);
    }
  };

  const guardarVehiculo = (original: Vehiculo | null, valores: ValoresVehiculo) =>
    void guardar(async () => {
      const cuerpo = cuerpoVehiculo(valores);
      if (original === null) {
        const creado = await FlotaService.crearVehiculo(cuerpo);
        return {
          id: creado.id,
          tipo: "vehiculos",
          alta: true,
          texto: `El vehículo ${normalizarPlaca(creado.placa)} quedó registrado. Asígnelo como habitual a un conductor para que la DAF pueda usarlo.`,
        };
      }
      const guardado = await FlotaService.actualizarVehiculo(original.id, cuerpo);
      return { id: guardado.id, tipo: "vehiculos", alta: false, texto: `El vehículo ${normalizarPlaca(guardado.placa)} quedó guardado.` };
    });

  const guardarConductor = (original: Conductor | null, valores: ValoresConductor) =>
    void guardar(async () => {
      if (original === null) {
        const creado = await FlotaService.crearConductor(cuerpoAltaConductor(valores));
        return {
          id: creado.id,
          tipo: "conductores",
          alta: true,
          texto:
            `${creado.nombreCompleto} quedó registrado como conductor.` +
            (valores.vehiculoHabitualId
              ? " Ya se le puede asignar transporte."
              : " Todavía no tiene vehículo habitual: la DAF no podrá proponerle placa."),
        };
      }
      const guardado = await FlotaService.actualizarConductor(original.id, cambiosDeConductor(valores));
      return {
        id: guardado.id,
        tipo: "conductores",
        alta: false,
        texto: `Los datos de ${guardado.nombreCompleto} quedaron guardados.`,
      };
    });

  const guardarGaraje = (original: UbicacionFlota | null, valores: ValoresGaraje) =>
    void guardar(async () => {
      const cuerpo = cuerpoGaraje(valores);
      if (original === null) {
        const creado = await FlotaService.crearUbicacion(cuerpo);
        return {
          id: creado.id,
          tipo: "garajes",
          alta: true,
          texto: `${creado.nombre} quedó registrado como garaje autorizado.`,
        };
      }
      const guardado = await FlotaService.actualizarUbicacion(original.id, cuerpo);
      return { id: guardado.id, tipo: "garajes", alta: false, texto: `${guardado.nombre} quedó guardado.` };
    });

  // ─────────────────────────── Baja y reactivación ───────────────────────────

  /** El error de una acción (no de la carga): el mensaje estándar, con el texto del servidor. */
  const mostrarFallo = (fallo: unknown, titulo: string) => {
    void mensaje.errorDe(fallo, { titulo });
  };

  /** Antes de confirmar, qué pasaría: con transporte asignado no se ofrece la baja. */
  const pedirBaja = async (
    objetivo: { tipo: "vehiculo"; registro: Vehiculo } | { tipo: "conductor"; registro: Conductor },
  ) => {
    setProcesando(true);
    try {
      const impacto = await FlotaService.impactoBaja(
        objetivo.tipo === "vehiculo" ? "vehiculos" : "conductores",
        objetivo.registro.id,
      );
      if (impacto.asignacionesVigentes > 0) {
        const sujeto =
          objetivo.tipo === "vehiculo"
            ? `El vehículo de placa ${normalizarPlaca(objetivo.registro.placa)}`
            : objetivo.registro.nombreCompleto;
        void mensaje.error({ titulo: "No se puede dar de baja", mensaje: textoBajaBloqueada(sujeto, impacto) });
        return;
      }
      setBaja(
        objetivo.tipo === "vehiculo"
          ? { tipo: "vehiculo", registro: objetivo.registro, impacto }
          : { tipo: "conductor", registro: objetivo.registro, impacto },
      );
    } catch (fallo: unknown) {
      mostrarFallo(fallo, "No se pudo revisar la baja");
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Si el servidor la rechaza —un 409 `RECURSO_CON_ASIGNACION`: alguien asignó transporte entre el
   * aviso y la confirmación—, lanza, y el MISMO modal pasa a error con el mensaje tal cual.
   */
  const confirmarBaja = async () => {
    if (!baja) return;
    if (baja.tipo === "vehiculo") {
      const hecha = await FlotaService.desactivarVehiculo(baja.registro.id);
      toast.exito(hecha.mensaje);
      setResaltado({ tipo: "vehiculos", id: baja.registro.id });
    } else if (baja.tipo === "conductor") {
      const hecha = await FlotaService.desactivarConductor(baja.registro.id);
      toast.exito(hecha.mensaje);
      setResaltado({ tipo: "conductores", id: baja.registro.id });
    } else {
      const hecha = await FlotaService.darDeBajaUbicacion(baja.registro.id);
      toast.exito(`${hecha.nombre} se dio de baja: ya no se ofrece como destino de la flota.`);
      setResaltado({ tipo: "garajes", id: baja.registro.id });
    }
    setBaja(null);
    await cargar();
  };

  const reactivar = async (tipo: Pestana, id: number, nombre: string) => {
    setProcesando(true);
    try {
      if (tipo === "vehiculos") await FlotaService.reactivarVehiculo(id);
      else if (tipo === "conductores") await FlotaService.reactivarConductor(id);
      else await FlotaService.reactivarUbicacion(id);
      toast.exito(
        tipo === "garajes" ? `${nombre} vuelve a estar vigente.` : `${nombre} quedó reactivado.`,
      );
      mostrarFila({ tipo, id });
      await cargar();
    } catch (fallo: unknown) {
      mostrarFallo(fallo, "No se pudo reactivar");
    } finally {
      setProcesando(false);
    }
  };

  /** El texto de la confirmación, con quienes quedarán sin vehículo (D3). */
  const mensajeBaja = (objetivo: PorDarDeBaja): string => {
    const base = TEXTO_BAJA[objetivo.tipo];
    if (objetivo.tipo !== "vehiculo") return base;
    const quienes = objetivo.impacto.conductoresHabituales.map((uno) => uno.nombreCompleto);
    return quienes.length > 0 ? `${base} Quedarán sin vehículo habitual: ${quienes.join(", ")}.` : base;
  };

  const nombreDe = (objetivo: PorDarDeBaja): string =>
    objetivo.tipo === "vehiculo"
      ? normalizarPlaca(objetivo.registro.placa)
      : objetivo.tipo === "conductor"
        ? objetivo.registro.nombreCompleto
        : objetivo.registro.nombre;

  // ─────────────────────────── Indicadores ───────────────────────────

  /** La tarjeta cuyo filtro está puesto. «Vehículos activos» no filtra nada: nunca queda marcada. */
  const kpiActiva = (destino: Pestana, filtro: FiltroIndicador) =>
    pestana === destino && indicador === filtro;

  const deBaja = resumen?.vehiculos.deBaja ?? 0;
  /**
   * Documentos (A5): ámbar si hay vencidos o por vencer; borde ámbar suave si solo faltan fechas
   * (las dos o una: `sinFechas` = SIN_FECHAS + INCOMPLETO, F1). La tarjeta abre «Con alertas de
   * documentos», que los reúne a todos.
   */
  const porVencer = resumen?.vehiculos.documentosPorVencer ?? 0;
  const sinFechas = resumen?.vehiculos.sinFechas ?? 0;
  const pagina = {
    vehiculos: paginaVehiculos,
    conductores: paginaConductores,
    garajes: paginaGarajes,
  }[pestana];
  const configuracion = PESTANAS.find((una) => una.id === pestana) ?? PESTANAS[0];
  const resaltadoAqui = resaltado?.tipo === pestana ? resaltado.id : null;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">{ANTETITULO_DAF}</p>
        <h1 className="page-heading-title">Flota y garajes</h1>
        <p className="page-heading-subtitle text-sm">
          Lo que la DAF puede asignar al planificar el día: vehículos, conductores y dónde se guarda
          la flota.
        </p>
      </header>

      <div
        role="group"
        aria-label="Indicadores de la flota"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <TarjetaIndicador
          titulo="Vehículos activos"
          valor={resumen?.vehiculos.activos ?? null}
          detalle={resumen ? `${deBaja} ${deBaja === 1 ? "dado de baja" : "dados de baja"}` : "Sin datos del resumen"}
          onClick={() => irAIndicador("vehiculos", null)}
        />
        <TarjetaIndicador
          titulo="Documentos por vencer"
          valor={resumen?.vehiculos.documentosPorVencer ?? null}
          detalle={
            resumen
              ? `Matrícula o SOAT en ≤ ${resumen.diasAviso} días o vencidos`
              : "Matrícula o SOAT vencidos o por vencer"
          }
          nota={sinFechas > 0 ? `${sinFechas} con fechas faltantes` : null}
          atencion={porVencer > 0 ? true : sinFechas > 0 ? "suave" : false}
          activa={kpiActiva("vehiculos", "alertas-documentos")}
          onClick={() => irAIndicador("vehiculos", "alertas-documentos")}
        />
        <TarjetaIndicador
          titulo="Vehículos sin conductor habitual"
          valor={resumen?.vehiculos.sinConductorHabitual ?? null}
          detalle="No se proponen automáticamente"
          atencion={(resumen?.vehiculos.sinConductorHabitual ?? 0) > 0}
          activa={kpiActiva("vehiculos", "sin-conductor")}
          onClick={() => irAIndicador("vehiculos", "sin-conductor")}
        />
        <TarjetaIndicador
          titulo="Conductores con datos incompletos"
          valor={resumen?.conductores.incompletos ?? null}
          detalle="Falta vehículo, contrato o patrón"
          atencion={(resumen?.conductores.incompletos ?? 0) > 0}
          activa={kpiActiva("conductores", "incompletos")}
          onClick={() => irAIndicador("conductores", "incompletos")}
        />
      </div>

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudo cargar la flota"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      <section
        aria-label="Flota"
        className="app-shell-surface flex flex-col gap-4 rounded-3xl border border-base-300 bg-base-100 px-4 pt-2 pb-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] md:px-6"
      >
        <Pestanas
          etiqueta="Maestro"
          pestanas={PESTANAS.map((una) => ({
            id: una.id,
            titulo: una.titulo,
            cuenta: vigentes[una.id],
            etiquetaCuenta: una.id === "garajes" ? "vigentes" : "activos",
          }))}
          activa={pestana}
          onElegir={(id) => irA(id)}
        />

        <div
          id={`panel-${pestana}`}
          role="tabpanel"
          aria-labelledby={`pestana-${pestana}`}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              className="input input-bordered w-full sm:w-80"
              placeholder={configuracion.marcador}
              aria-label={configuracion.marcador.replace("…", "")}
              value={busquedas[pestana]}
              onChange={(evento) => {
                setBusquedas((antes) => ({ ...antes, [pestana]: evento.target.value }));
                aPrimeraPagina(pestana);
              }}
            />
            {indicador && (
              <Boton
                variante="enlace"
                tamano="sm"
                onClick={quitarIndicador}
                aria-label={`Quitar el filtro «${NOMBRE_INDICADOR[indicador]}»`}
              >
                <Insignia variante="aviso">{NOMBRE_INDICADOR[indicador]}</Insignia>
                <span aria-hidden="true">✕</span>
              </Boton>
            )}
            <SelectorSegmentado
              id={`estado-${pestana}`}
              etiqueta="Estado"
              etiquetaOculta
              opciones={opcionesEstado(pestana)}
              valor={estados[pestana]}
              onCambiar={(valor) => {
                setEstados((antes) => ({ ...antes, [pestana]: valor as FiltroEstado }));
                aPrimeraPagina(pestana);
              }}
            />
            <span
              className="text-sm text-app-strong"
              role="status"
            >
              {cargando ? "Cargando…" : `${visibles[pestana]} de ${totales[pestana]}`}
            </span>
            <Boton
              variante="primario"
              tamano="md"
              className="sm:ml-auto"
              deshabilitado={cargando || procesando}
              onClick={() =>
                abrir(
                  pestana === "vehiculos"
                    ? { tipo: "vehiculo", registro: null }
                    : pestana === "conductores"
                      ? { tipo: "conductor", registro: null }
                      : { tipo: "garaje", registro: null },
                )
              }
            >
              {configuracion.nuevo}
            </Boton>
          </div>

          <p className="text-xs text-app-muted">{configuracion.ayuda}</p>

          <div
            ref={refTabla}
            className="scroll-mt-4"
          >
          {pestana === "vehiculos" && (
            <TablaVehiculos
              vehiculos={paginaVehiculos.filas}
              conductores={conductores}
              procesando={procesando}
              kmMaximo={resumen?.kmMaximo ?? KM_MAXIMO_POR_DEFECTO}
              resaltado={resaltadoAqui}
              mensajeVacio={mensajeVacio()}
              onEditar={(registro) => abrir({ tipo: "vehiculo", registro })}
              onDarDeBaja={(registro) => void pedirBaja({ tipo: "vehiculo", registro })}
              onReactivar={(registro) => void reactivar("vehiculos", registro.id, normalizarPlaca(registro.placa))}
            />
          )}
          {pestana === "conductores" && (
            <TablaConductores
              conductores={paginaConductores.filas}
              vehiculos={vehiculos}
              procesando={procesando}
              resaltado={resaltadoAqui}
              mensajeVacio={mensajeVacio()}
              onEditar={(registro) => abrir({ tipo: "conductor", registro })}
              onDarDeBaja={(registro) => void pedirBaja({ tipo: "conductor", registro })}
              onReactivar={(registro) =>
                void reactivar("conductores", registro.id, registro.nombreCompleto)
              }
              ausencias={puedeAusencias ? ausenciasPorConductor : undefined}
              onAusencias={
                puedeAusencias
                  ? (registro) => {
                      setEdicion(null);
                      setEnAusencias(registro);
                    }
                  : undefined
              }
            />
          )}
          {pestana === "garajes" && (
            <TablaGarajes
              garajes={paginaGarajes.filas}
              hoy={hoyEnGuayaquil()}
              procesando={procesando}
              resaltado={resaltadoAqui}
              mensajeVacio={mensajeVacio()}
              onEditar={(registro) => abrir({ tipo: "garaje", registro })}
              onDarDeBaja={(registro) => setBaja({ tipo: "garaje", registro })}
              onReactivar={(registro) => void reactivar("garajes", registro.id, registro.nombre)}
            />
          )}
          </div>

          {!cargando && (
            <Paginacion
              page={pagina.pagina}
              pageSize={tamanoActual}
              total={pagina.total}
              etiqueta=""
              opciones={[...TAMANOS]}
              onPage={cambiarPagina}
              onPageSize={cambiarTamano}
            />
          )}
        </div>
      </section>

      {edicion?.tipo === "vehiculo" && (
        <DrawerVehiculo
          key={apertura}
          vehiculo={edicion.registro}
          vehiculos={vehiculos}
          diasAviso={resumen?.diasAviso ?? null}
          kmMaximo={resumen?.kmMaximo ?? KM_MAXIMO_POR_DEFECTO}
          guardando={procesando}
          errorServidor={errorCajon}
          onGuardar={(valores) => guardarVehiculo(edicion.registro, valores)}
          onCerrar={cerrarCajon}
        />
      )}
      {edicion?.tipo === "conductor" && (
        <DrawerConductor
          key={apertura}
          conductor={edicion.registro}
          conductores={conductores}
          vehiculos={vehiculos}
          guardando={procesando}
          errorServidor={errorCajon}
          onGuardar={(valores) => guardarConductor(edicion.registro, valores)}
          onCerrar={cerrarCajon}
        />
      )}
      {enAusencias && (
        <PanelAusenciasConductor
          key={enAusencias.id}
          conductor={enAusencias}
          hoy={hoyFlota}
          onCambio={refrescarAusencias}
          onCerrar={() => setEnAusencias(null)}
        />
      )}
      {edicion?.tipo === "garaje" && (
        <DrawerGaraje
          key={apertura}
          garaje={edicion.registro}
          garajes={garajes}
          zonales={zonales}
          guardando={procesando}
          errorServidor={errorCajon}
          onGuardar={(valores) => guardarGaraje(edicion.registro, valores)}
          onCerrar={cerrarCajon}
        />
      )}

      <MensajeModal
        abierto={baja !== null}
        variante="peligro"
        titulo={baja ? `¿Dar de baja ${nombreDe(baja)}?` : ""}
        mensaje={baja ? mensajeBaja(baja) : ""}
        textoPrincipal="Sí, dar de baja"
        tituloError="No se pudo dar de baja"
        onPrincipal={confirmarBaja}
        onSecundario={() => setBaja(null)}
      />
    </section>
  );
};

export default AdminFlotaPage;
