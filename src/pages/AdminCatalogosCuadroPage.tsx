/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: AdminCatalogosCuadroPage.tsx
 * Responsabilidad: Pantalla P-08. Administrar áreas, zonales, puntos, tipos e instituciones de
 *                  cada formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PANTALLA QUE DESBLOQUEA PV-01: aquí se carga la matriz zonal ↔ punto, formulario por
 * formulario, que la cascada del registro necesita.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REDISEÑO DEL 2026-10-12.
 *
 *   · CABECERA con el selector del formulario que se configura (`SelectorFormularioCabecera`, con
 *     su color). Si las áreas tienen cambios sin guardar, se pregunta antes de cambiar.
 *   · ÁREAS en una barra plegable (`PanelAreasFormulario`).
 *   · TRES PESTAÑAS (tablist de daisyUI `tabs tabs-border`), cada una con el número de activos y la
 *     misma barra: buscar, Todos | Activos | Inactivos, contador y alta (`BarraCatalogo`).
 *   · ZONALES EN ACORDEÓN (`AcordeonZonales`). Las abiertas las guarda ESTA página: «Expandir /
 *     Contraer todo», la búsqueda que abre las que coinciden y que se recuerden al cambiar de
 *     pestaña o de formulario. Por omisión, abierta solo la primera.
 *   · CREAR Y EDITAR EN UN CAJÓN (`DrawerValorCatalogo`); `MensajeModal` solo confirma.
 *   · «ELIMINAR» llega apagado con su motivo desde el servidor (`puedeEliminar`), y el banner que
 *     decía «los valores no se eliminan» —falso desde el 2026-09-24— pasa a una nota al pie.
 *   · Avisos breves (`toast`, `utils/mensaje.ts`) y resaltado de lo recién guardado durante `MS_RESALTADO`.
 *
 * AJUSTES DEL 2026-10-13: el interruptor «Solo zonales con puntos en este formulario» (encendido
 * por omisión) con un único resumen «N zonales sin puntos en este formulario · Ver / Ocultarlas»;
 * el contador dice «N zonales con puntos · X de Y puntos activos» mientras filtra.
 *
 * CADA FORMULARIO TIENE SU CONFIGURACIÓN PROPIA (2026-10-13). Al elegir un formulario se cargan
 * SOLO sus áreas, zonales, puntos, tipos e instituciones; nada se comparte, copia ni vincula entre
 * formularios, y un cambio en uno nunca toca a otro. Al cambiar de formulario se limpia la búsqueda
 * y se cierran los acordeones. Todo se lee y se escribe por `/administracion/catalogos/:codigo/…`:
 * `GET :codigo` (con los desactivados y sus usos), `GET :codigo/zonales` y
 * `GET :codigo/zonas-disponibles` (las zonas de la ciudad que una zonal nueva puede tomar).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AcordeonZonales, {
  type Resaltado,
} from "../components/catalogos/AcordeonZonales.tsx";
import BarraCatalogo from "../components/catalogos/BarraCatalogo.tsx";
import DrawerValorCatalogo, {
  type EdicionCatalogo,
  type TipoCatalogo,
  type ValoresCatalogo,
} from "../components/catalogos/DrawerValorCatalogo.tsx";
import PanelAreasFormulario from "../components/catalogos/PanelAreasFormulario.tsx";
import SelectorFormularioCabecera from "../components/catalogos/SelectorFormularioCabecera.tsx";
import TablaValoresCatalogo from "../components/catalogos/TablaValoresCatalogo.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import Iconos from "../components/common/Iconos.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import Pestanas from "../components/common/Pestanas.tsx";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import { useFormulariosPermitidos } from "../hooks/useFormulariosPermitidos.ts";
import type {
  AreaPersonal,
  Institucion,
  PuntoEncuentro,
  TipoControl,
  Zonal,
  ZonalAdmin,
} from "../interfaces/Formulario.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
import {
  clave,
  contadorPuntos,
  estaActivo,
  formularioPedido,
  leerPedidoCatalogos,
  pasaEstado,
  textoSinPuntos,
  tienePuntos,
  zonalesQueCoinciden,
  type FiltroEstado,
} from "../utils/catalogos.util.ts";
import { avisoDeFallo, presentarError, varianteDeAviso, type AvisoTexto } from "../utils/errorApi.util.ts";
import { MS_RESALTADO } from "../utils/listadoOperativos.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

type Pestana = "puntos" | "tipos" | "instituciones";

const PESTANAS: { id: Pestana; titulo: string }[] = [
  { id: "puntos", titulo: "Puntos de encuentro y zonales" },
  { id: "tipos", titulo: "Tipos de control" },
  { id: "instituciones", titulo: "Instituciones participantes" },
];

const MARCADORES: Record<Pestana, string> = {
  puntos: "Buscar zonal o punto…",
  tipos: "Buscar tipo de control…",
  instituciones: "Buscar sigla o denominación…",
};

/** Un valor por confirmar (desactivar o eliminar). */
type Pendiente = {
  tipo: TipoCatalogo;
  id: number;
  nombre: string;
  /** Solo la zonal: cuántos puntos activos de este formulario arrastra su baja. */
  puntosActivos?: number;
};

const NOTA_ELIMINAR =
  "Solo se puede eliminar un valor que nunca se usó en un cuadro. Los que ya se usaron se desactivan: dejan de ofrecerse, pero los cuadros anteriores se siguen leyendo.";

const AdminCatalogosCuadroPage = () => {
  const {
    formularios,
    cargando: cargandoFormularios,
    recargar: recargarFormularios,
  } = useFormulariosPermitidos();
  const [codigo, setCodigo] = useState("");
  const [codigoPendiente, setCodigoPendiente] = useState<string | null>(null);
  const [areasSucias, setAreasSucias] = useState(false);

  const catalogos = useCatalogosFormulario(codigo || null, true);
  const recargar = catalogos.recargar;

  const [zonales, setZonales] = useState<ZonalAdmin[]>([]);
  /** Zonas de la ciudad que este formulario aún no tiene: las que admite una zonal nueva. */
  const [zonasLibres, setZonasLibres] = useState<Zonal[]>([]);
  const [pestana, setPestana] = useState<Pestana>("puntos");
  const [busquedas, setBusquedas] = useState<Record<Pestana, string>>({
    puntos: "",
    tipos: "",
    instituciones: "",
  });
  const [filtros, setFiltros] = useState<Record<Pestana, FiltroEstado>>({
    puntos: "activos",
    tipos: "activos",
    instituciones: "activos",
  });
  /**
   * «Solo zonales con puntos en este formulario», encendido por omisión: la mayoría de las zonales
   * no tienen puntos en cada formulario y listarlas todas escondía las que sí. Es estado de la
   * página, así que se conserva al cambiar de pestaña o de formulario.
   */
  const [soloConPuntos, setSoloConPuntos] = useState(true);
  /**
   * Zonales abiertas. `null` hasta la primera carga: entonces se abre solo la primera. Al cambiar
   * de formulario se cierran todas (son otras zonales).
   */
  const [abiertas, setAbiertas] = useState<Set<number> | null>(null);

  const [edicion, setEdicion] = useState<EdicionCatalogo | null>(null);
  const [zonalInicial, setZonalInicial] = useState<number | null>(null);
  const [errorDrawer, setErrorDrawer] = useState<string | null>(null);
  const [baja, setBaja] = useState<Pendiente | null>(null);
  const [eliminacion, setEliminacion] = useState<Pendiente | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  const [resaltado, setResaltado] = useState<{ tipo: TipoCatalogo; id: number } | null>(
    null,
  );

  /**
   * `?formulario=…&areas=abierto` (2026-10-13): se lee UNA vez al entrar, desde «Formularios del
   * cuadro». Se lee de `window.location` y no con el enrutador: la pantalla también se monta sola.
   */
  const [pedido] = useState(() => leerPedidoCatalogos(window.location.search));

  /** El pedido por la dirección o, si no, el primero: entrar a una pantalla vacía no informa. */
  useEffect(() => {
    if (!codigo && formularios.length > 0) {
      setCodigo(formularioPedido(pedido.formulario, formularios) ?? formularios[0].codigo);
    }
  }, [formularios, codigo, pedido]);

  const formulario = useMemo(
    () => formularios.find((candidato) => candidato.codigo === codigo),
    [formularios, codigo],
  );
  /**
   * El formulario cuyas zonales se están mostrando. Una respuesta que llega tarde, de un formulario
   * que ya se dejó, no pinta sus zonales sobre las del nuevo.
   */
  const codigoVigente = useRef(codigo);
  useEffect(() => {
    codigoVigente.current = codigo;
  }, [codigo]);

  const cargarZonales = useCallback(async () => {
    if (!codigo) return;
    try {
      const [lista, libres] = await Promise.all([
        CatalogoCuadroService.listarZonalesAdmin(codigo),
        CatalogoCuadroService.zonasDisponibles(codigo),
      ]);
      if (codigoVigente.current !== codigo) return;
      setZonales(lista);
      setZonasLibres(libres);
      // Primera carga: abierta solo la primera zonal.
      setAbiertas((antes) => antes ?? new Set(lista.length > 0 ? [lista[0].id] : []));
    } catch (fallo: unknown) {
      if (codigoVigente.current !== codigo) return;
      setAviso(avisoDeFallo(fallo));
    }
  }, [codigo]);

  useEffect(() => {
    void cargarZonales();
  }, [cargarZonales]);

  // El resaltado se apaga solo.
  useEffect(() => {
    if (!resaltado) return;
    const espera = window.setTimeout(() => setResaltado(null), MS_RESALTADO);
    return () => window.clearTimeout(espera);
  }, [resaltado]);

  const puntos = useMemo(() => catalogos.catalogos?.puntos ?? [], [catalogos.catalogos]);
  const tiposControl = useMemo(
    () => catalogos.catalogos?.tiposControl ?? [],
    [catalogos.catalogos],
  );
  const instituciones = useMemo(
    () => catalogos.catalogos?.instituciones ?? [],
    [catalogos.catalogos],
  );

  const existentes = useMemo(
    () => ({ zonales, puntos, tiposControl, instituciones }),
    [zonales, puntos, tiposControl, instituciones],
  );

  // ─── Formulario: cambiar, con confirmación si hay áreas sin guardar ───
  /**
   * Otro formulario es otra configuración: lo cargado del anterior se descarta, la búsqueda se
   * limpia y los acordeones se cierran. Las zonales del nuevo llegan con `cargarZonales`.
   */
  const cambiarFormulario = (nuevo: string) => {
    if (nuevo === codigo) return;
    setCodigo(nuevo);
    setZonales([]);
    setZonasLibres([]);
    setBusquedas({ puntos: "", tipos: "", instituciones: "" });
    setAbiertas(new Set());
    setAviso(null);
  };

  const pedirFormulario = (nuevo: string) => {
    if (nuevo === codigo) return;
    if (areasSucias) setCodigoPendiente(nuevo);
    else cambiarFormulario(nuevo);
  };

  // ─── Acordeón ───
  const zonalesConPuntos = useMemo(
    () => zonales.filter((zonal) => tienePuntos(zonal.id, puntos)),
    [zonales, puntos],
  );
  const zonalesListadas = soloConPuntos ? zonalesConPuntos : zonales;
  const cuantasSinPuntos = zonales.length - zonalesConPuntos.length;

  const abiertasEfectivas = useMemo(() => {
    const base = new Set(abiertas ?? []);
    if (busquedas.puntos.trim()) {
      for (const id of zonalesQueCoinciden(zonales, puntos, busquedas.puntos)) base.add(id);
    }
    return base;
  }, [abiertas, busquedas.puntos, zonales, puntos]);

  // Se parte de lo que SE VE (incluidas las que abrió la búsqueda), para que cerrar funcione.
  const alternarZonal = (id: number) => {
    const siguiente = new Set(abiertasEfectivas);
    if (siguiente.has(id)) siguiente.delete(id);
    else siguiente.add(id);
    setAbiertas(siguiente);
  };

  const abrirZonal = (id: number) =>
    setAbiertas((antes) => new Set([...(antes ?? []), id]));

  // ─── Alta y edición ───
  const abrir = (nueva: EdicionCatalogo, zonal: number | null = null) => {
    setZonalInicial(zonal);
    setErrorDrawer(null);
    setEdicion(nueva);
  };

  const cerrarDrawer = useCallback(() => {
    setEdicion(null);
    setErrorDrawer(null);
  }, []);

  const guardar = useCallback(
    async (valores: ValoresCatalogo, agregarOtro: boolean): Promise<boolean> => {
      if (!edicion || !formulario) return false;
      const codigoForm = formulario.codigo;
      setProcesando(true);
      setErrorDrawer(null);
      try {
        let mensaje = "";

        if (edicion.tipo === "zonal") {
          if (edicion.fila) {
            await CatalogoCuadroService.actualizarZonal(codigoForm, edicion.fila.id, {
              nombre: valores.nombre,
            });
            setResaltado({ tipo: "zonal", id: edicion.fila.id });
            mensaje = "Zonal actualizada.";
          } else {
            const creada = await CatalogoCuadroService.crearZonal(codigoForm, {
              zonaId: valores.zonaId ?? 0,
              nombre: valores.nombre,
            });
            setResaltado({ tipo: "zonal", id: creada.id });
            abrirZonal(creada.id);
            // Nace sin puntos: con el interruptor encendido no se vería la que se acaba de crear.
            setSoloConPuntos(false);
            mensaje = `Zonal «${valores.nombre}» creada.`;
          }
          await cargarZonales();
        } else {
          if (edicion.tipo === "punto") {
            const zonalId = valores.zonalId ?? 0;
            let idPunto: number;
            if (edicion.fila) {
              idPunto = edicion.fila.id;
              await CatalogoCuadroService.actualizarPunto(codigoForm, idPunto, {
                nombre: valores.nombre,
                zonalId,
              });
              mensaje = "Punto de encuentro actualizado.";
            } else {
              const creado = await CatalogoCuadroService.crearPunto(codigoForm, {
                nombre: valores.nombre,
                zonalId,
              });
              idPunto = creado.id;
              mensaje = `Punto «${valores.nombre}» agregado.`;
            }
            abrirZonal(zonalId);
            setResaltado({ tipo: "punto", id: idPunto });
            await cargarZonales();
          } else if (edicion.tipo === "tipoControl") {
            let idTipo: number;
            if (edicion.fila) {
              idTipo = edicion.fila.id;
              await CatalogoCuadroService.actualizarTipoControl(codigoForm, idTipo, {
                nombre: valores.nombre,
              });
              mensaje = "Tipo de control actualizado.";
            } else {
              const creado = await CatalogoCuadroService.crearTipoControl(codigoForm, {
                nombre: valores.nombre,
              });
              idTipo = creado.id;
              mensaje = `Tipo de control «${valores.nombre}» agregado.`;
            }
            setResaltado({ tipo: "tipoControl", id: idTipo });
          } else {
            let idInst: number;
            const datos = { sigla: valores.sigla, nombre: valores.nombre };
            if (edicion.fila) {
              idInst = edicion.fila.id;
              await CatalogoCuadroService.actualizarInstitucion(codigoForm, idInst, datos);
              mensaje = "Institución actualizada.";
            } else {
              const creada = await CatalogoCuadroService.crearInstitucion(codigoForm, datos);
              idInst = creada.id;
              mensaje = `Institución «${valores.sigla}» agregada.`;
            }
            setResaltado({ tipo: "institucion", id: idInst });
          }
          recargar();
        }

        toast.exito(mensaje);
        if (!agregarOtro) setEdicion(null);
        return true;
      } catch (fallo: unknown) {
        // El duplicado (409) y los demás rechazos se muestran en el cajón, sin perder lo escrito.
        setErrorDrawer(presentarError(fallo).mensaje);
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [edicion, formulario, recargar, cargarZonales],
  );

  // ─── Desactivar, activar, eliminar ───
  const desactivar = useCallback(async () => {
    if (!baja || !codigo) return;
    // Si el servidor lo rechaza, lanza: el error queda en el modal de la confirmación.
    const resultado =
      baja.tipo === "punto"
        ? await CatalogoCuadroService.desactivarPunto(codigo, baja.id)
        : baja.tipo === "tipoControl"
          ? await CatalogoCuadroService.desactivarTipoControl(codigo, baja.id)
          : baja.tipo === "institucion"
            ? await CatalogoCuadroService.desactivarInstitucion(codigo, baja.id)
            : await CatalogoCuadroService.desactivarZonal(codigo, baja.id);
    setBaja(null);
    // El servidor redacta cuántos operativos anteriores lo usan: se dice tal cual (regla 7).
    toast.exito(resultado.mensaje);
    if (baja.tipo === "zonal" || baja.tipo === "punto") await cargarZonales();
    recargar();
  }, [baja, codigo, recargar, cargarZonales]);

  const eliminar = useCallback(async () => {
    if (!eliminacion || !codigo) return;
    // Si falla (409 CATALOGO_EN_USO), lanza: el motivo del servidor, tal cual, en el mismo modal.
    const resultado =
      eliminacion.tipo === "punto"
        ? await CatalogoCuadroService.eliminarPunto(codigo, eliminacion.id)
        : eliminacion.tipo === "tipoControl"
          ? await CatalogoCuadroService.eliminarTipoControl(codigo, eliminacion.id)
          : eliminacion.tipo === "institucion"
            ? await CatalogoCuadroService.eliminarInstitucion(codigo, eliminacion.id)
            : await CatalogoCuadroService.eliminarZonal(codigo, eliminacion.id);
    setEliminacion(null);
    toast.exito(resultado.mensaje);
    if (eliminacion.tipo === "zonal" || eliminacion.tipo === "punto") await cargarZonales();
    recargar();
  }, [eliminacion, codigo, recargar, cargarZonales]);

  /** Reactivar: reversible y sin destruir nada, así que no pide confirmación (PV-36). */
  const activar = useCallback(
    async (tipo: TipoCatalogo, id: number, nombre: string) => {
      if (!codigo) return;
      setProcesando(true);
      try {
        if (tipo === "punto")
          await CatalogoCuadroService.actualizarPunto(codigo, id, { activo: true });
        else if (tipo === "tipoControl")
          await CatalogoCuadroService.actualizarTipoControl(codigo, id, { activo: true });
        else if (tipo === "institucion")
          await CatalogoCuadroService.actualizarInstitucion(codigo, id, { activo: true });
        else await CatalogoCuadroService.actualizarZonal(codigo, id, { activo: true });
        toast.exito(`«${nombre}» vuelve a ofrecerse al registrar operativos.`);
        setResaltado({ tipo, id });
        if (tipo === "zonal" || tipo === "punto") await cargarZonales();
        recargar();
      } catch (fallo: unknown) {
        void mensaje.errorDe(fallo, { titulo: `No se pudo activar «${nombre}»` });
      } finally {
        setProcesando(false);
      }
    },
    [codigo, recargar, cargarZonales],
  );

  /**
   * Áreas. RECARGA LOS FORMULARIOS: las áreas viajan en `GET /formularios/permitidos`. El rechazo
   * (operativos con personal de esa área) se muestra tal cual (regla 7).
   */
  const guardarAreas = useCallback(
    async (areas: AreaPersonal[]) => {
      if (!formulario) return;
      setProcesando(true);
      try {
        await CatalogoCuadroService.reemplazarAreas(formulario.codigo, areas);
        toast.exito(`Áreas de ${formulario.numero}. ${formulario.nombre} guardadas.`);
        recargarFormularios();
      } catch (fallo: unknown) {
        void mensaje.errorDe(fallo, { titulo: "No se pudieron guardar las áreas" });
      } finally {
        setProcesando(false);
      }
    },
    [formulario, recargarFormularios],
  );

  const activos: Record<Pestana, number> = {
    puntos: puntos.filter(estaActivo).length,
    tipos: tiposControl.filter(estaActivo).length,
    instituciones: instituciones.filter(estaActivo).length,
  };

  const busqueda = busquedas[pestana];
  const filtro = filtros[pestana];
  const termino = clave(busqueda);

  const tiposVisibles = tiposControl.filter(
    (tipo) =>
      pasaEstado(estaActivo(tipo), filtros.tipos) &&
      (clave(busquedas.tipos) === "" || clave(tipo.nombre).includes(clave(busquedas.tipos))),
  );
  const institucionesVisibles = instituciones.filter(
    (inst) =>
      pasaEstado(estaActivo(inst), filtros.instituciones) &&
      (clave(busquedas.instituciones) === "" ||
        clave(`${inst.sigla} ${inst.nombre}`).includes(clave(busquedas.instituciones))),
  );

  const contador =
    pestana === "puntos"
      ? contadorPuntos(zonalesListadas.length, puntos, soloConPuntos)
      : pestana === "tipos"
        ? `${tiposVisibles.length} de ${tiposControl.length}`
        : `${institucionesVisibles.length} de ${instituciones.length}`;

  const resaltadoZonas: Resaltado =
    resaltado && (resaltado.tipo === "zonal" || resaltado.tipo === "punto")
      ? { tipo: resaltado.tipo, id: resaltado.id }
      : null;

  const cargando = catalogos.cargando || cargandoFormularios;

  const todasAbiertas =
    zonalesListadas.length > 0 &&
    zonalesListadas.every((zonal) => abiertasEfectivas.has(zonal.id));

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="page-heading-kicker font-semibold uppercase">Administración</p>
          <h1 className="page-heading-title">Catálogos del cuadro</h1>
          <p className="page-heading-subtitle text-sm">
            Opciones que verá el registro de operativos de cada formulario.
          </p>
        </div>
        <SelectorFormularioCabecera
          formularios={formularios}
          seleccionado={codigo}
          onSeleccionar={pedirFormulario}
          deshabilitado={procesando}
        />
      </header>

      {catalogos.error && (
        <AvisoEnLinea
          variante={varianteDeAviso(catalogos.error.trato)}
          titulo="No se pudieron cargar los catálogos"
          accion={
            <Boton tamano="sm" onClick={recargar}>
              Reintentar
            </Boton>
          }
        >
          {catalogos.error.mensaje}
        </AvisoEnLinea>
      )}

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudieron cargar las zonales"
          accion={
            <Boton tamano="sm" onClick={() => void cargarZonales()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      <PanelAreasFormulario
        areas={formulario?.areas ?? []}
        cargando={cargando}
        procesando={procesando}
        onGuardar={(areas) => void guardarAreas(areas)}
        onCambiosPendientes={setAreasSucias}
        desplegadoInicial={pedido.areasAbiertas}
      />

      <section
        aria-label="Catálogos del formulario"
        className="app-shell-surface flex flex-col gap-4 rounded-3xl border border-base-300 bg-base-100 px-4 pt-2 pb-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] md:px-6"
      >
        <Pestanas
          etiqueta="Catálogo"
          pestanas={PESTANAS.map((p) => ({
            id: p.id,
            titulo: p.titulo,
            cuenta: activos[p.id],
            etiquetaCuenta: "activos",
          }))}
          activa={pestana}
          onElegir={setPestana}
        />

        <div
          id={`panel-${pestana}`}
          role="tabpanel"
          aria-labelledby={`pestana-${pestana}`}
          className="flex flex-col gap-4"
        >
          <BarraCatalogo
            id={pestana}
            marcador={MARCADORES[pestana]}
            busqueda={busqueda}
            onBuscar={(texto) => setBusquedas((antes) => ({ ...antes, [pestana]: texto }))}
            filtro={filtro}
            onFiltro={(valor) => setFiltros((antes) => ({ ...antes, [pestana]: valor }))}
            contador={contador}
            complemento={
              pestana === "puntos" && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={soloConPuntos}
                    onChange={(evento) => setSoloConPuntos(evento.target.checked)}
                  />
                  <span className="text-app-label max-w-56 text-sm leading-tight">
                    Solo zonales con puntos en este formulario
                  </span>
                </label>
              )
            }
          >
            {pestana === "puntos" && (
              <>
                <Boton
                  onClick={() =>
                    setAbiertas(
                      todasAbiertas
                        ? new Set()
                        : new Set(zonalesListadas.map((zonal) => zonal.id)),
                    )
                  }
                >
                  {todasAbiertas ? "Contraer todo" : "Expandir todo"}
                </Boton>
                <Boton
                  variante="acento"
                  deshabilitado={procesando || !formulario}
                  onClick={() => abrir({ tipo: "punto", fila: null })}
                >
                  + Nuevo punto de encuentro
                </Boton>
                <Boton
                  variante="primario"
                  deshabilitado={procesando || !formulario}
                  motivoDeshabilitado={
                    zonasLibres.length === 0
                      ? "Este formulario ya tiene una zonal por cada zona de la ciudad."
                      : null
                  }
                  onClick={() => abrir({ tipo: "zonal", fila: null })}
                >
                  + Nueva zonal
                </Boton>
              </>
            )}
            {pestana === "tipos" && (
              <Boton
                variante="primario"
                deshabilitado={procesando || !formulario}
                onClick={() => abrir({ tipo: "tipoControl", fila: null })}
              >
                + Nuevo tipo de control
              </Boton>
            )}
            {pestana === "instituciones" && (
              <Boton
                variante="primario"
                deshabilitado={procesando || !formulario}
                onClick={() => abrir({ tipo: "institucion", fila: null })}
              >
                + Nueva institución
              </Boton>
            )}
          </BarraCatalogo>

          {cargando && !catalogos.catalogos ? (
            <div
              className="flex justify-center py-8"
              role="status"
            >
              <span
                className="loading loading-spinner loading-md"
                aria-hidden="true"
              />
              <span className="sr-only">Cargando catálogos…</span>
            </div>
          ) : pestana === "puntos" ? (
            <div className="flex flex-col gap-2">
              {cuantasSinPuntos > 0 && (
                <AvisoEnLinea variante="info">
                  <span>
                    {textoSinPuntos(cuantasSinPuntos, soloConPuntos)}
                    {" · "}
                    <Boton
                      variante="enlace"
                      tamano="sm"
                      onClick={() => setSoloConPuntos(!soloConPuntos)}
                    >
                      {soloConPuntos ? "Ver todas" : "Ocultarlas"}
                    </Boton>
                  </span>
                </AvisoEnLinea>
              )}
              <AcordeonZonales
                zonales={zonalesListadas}
                puntos={puntos}
                busqueda={busqueda}
                filtro={filtro}
                abiertas={abiertasEfectivas}
                onAlternar={alternarZonal}
                resaltado={resaltadoZonas}
                procesando={procesando}
                onAgregarPunto={(zonalId) => abrir({ tipo: "punto", fila: null }, zonalId)}
                onEditarZonal={(zonal) => abrir({ tipo: "zonal", fila: zonal })}
                onDesactivarZonal={(zonal) =>
                  setBaja({
                    tipo: "zonal",
                    id: zonal.id,
                    nombre: zonal.nombre,
                    puntosActivos: zonal.puntosActivos,
                  })
                }
                onActivarZonal={(zonal) => void activar("zonal", zonal.id, zonal.nombre)}
                onEliminarZonal={(zonal) =>
                  setEliminacion({ tipo: "zonal", id: zonal.id, nombre: zonal.nombre })
                }
                onEditarPunto={(punto: PuntoEncuentro) => abrir({ tipo: "punto", fila: punto })}
                onDesactivarPunto={(punto) =>
                  setBaja({ tipo: "punto", id: punto.id, nombre: punto.nombre })
                }
                onActivarPunto={(punto) => void activar("punto", punto.id, punto.nombre)}
                onEliminarPunto={(punto) =>
                  setEliminacion({ tipo: "punto", id: punto.id, nombre: punto.nombre })
                }
              />
            </div>
          ) : pestana === "tipos" ? (
            <TablaValoresCatalogo<TipoControl>
              etiqueta="Tipos de control"
              filas={tiposVisibles}
              columnas={[{ titulo: "Nombre", valor: (tipo) => tipo.nombre, fuerte: true }]}
              nombreDe={(tipo) => tipo.nombre}
              mensajeVacio={
                termino
                  ? `Ningún tipo de control coincide con «${busqueda.trim()}».`
                  : "Este formulario no tiene tipos de control con este filtro."
              }
              resaltadoId={resaltado?.tipo === "tipoControl" ? resaltado.id : null}
              procesando={procesando}
              onEditar={(tipo) => abrir({ tipo: "tipoControl", fila: tipo })}
              onDesactivar={(tipo) =>
                setBaja({ tipo: "tipoControl", id: tipo.id, nombre: tipo.nombre })
              }
              onActivar={(tipo) => void activar("tipoControl", tipo.id, tipo.nombre)}
              onEliminar={(tipo) =>
                setEliminacion({ tipo: "tipoControl", id: tipo.id, nombre: tipo.nombre })
              }
            />
          ) : (
            <TablaValoresCatalogo<Institucion>
              etiqueta="Instituciones participantes"
              filas={institucionesVisibles}
              columnas={[
                { titulo: "Sigla", valor: (inst) => inst.sigla, fuerte: true },
                { titulo: "Denominación", valor: (inst) => inst.nombre },
              ]}
              nombreDe={(inst) => inst.sigla}
              mensajeVacio={
                termino
                  ? `Ninguna institución coincide con «${busqueda.trim()}».`
                  : "Este formulario no tiene instituciones con este filtro."
              }
              resaltadoId={resaltado?.tipo === "institucion" ? resaltado.id : null}
              procesando={procesando}
              onEditar={(inst) => abrir({ tipo: "institucion", fila: inst })}
              onDesactivar={(inst) =>
                setBaja({ tipo: "institucion", id: inst.id, nombre: `${inst.sigla} · ${inst.nombre}` })
              }
              onActivar={(inst) =>
                void activar("institucion", inst.id, `${inst.sigla} · ${inst.nombre}`)
              }
              onEliminar={(inst) =>
                setEliminacion({
                  tipo: "institucion",
                  id: inst.id,
                  nombre: `${inst.sigla} · ${inst.nombre}`,
                })
              }
            />
          )}

          <p className="text-app-muted flex items-start gap-2 text-xs">
            <Iconos nombre="informacion" />
            <span>{NOTA_ELIMINAR}</span>
          </p>
        </div>
      </section>

      <DrawerValorCatalogo
        edicion={edicion}
        formulario={formulario}
        zonales={zonales}
        zonasDisponibles={zonasLibres}
        zonalInicial={zonalInicial}
        existentes={existentes}
        guardando={procesando}
        errorServidor={errorDrawer}
        onGuardar={guardar}
        onCerrar={cerrarDrawer}
      />

      <MensajeModal
        abierto={codigoPendiente !== null}
        variante="peligro"
        titulo="¿Cambiar de formulario?"
        mensaje="Las áreas de personal tienen cambios sin guardar y se perderán."
        textoPrincipal="Cambiar y descartar"
        textoSecundario="Seguir aquí"
        onPrincipal={() => {
          if (codigoPendiente) cambiarFormulario(codigoPendiente);
          setCodigoPendiente(null);
          setAreasSucias(false);
        }}
        onSecundario={() => setCodigoPendiente(null)}
      />

      {/* La confirmación dice qué pasa de verdad, no «¿está seguro?». */}
      <MensajeModal
        abierto={baja !== null}
        variante="peligro"
        titulo={baja?.tipo === "zonal" ? `¿Desactivar ${baja.nombre}?` : "¿Desactivar este valor?"}
        mensaje={
          baja?.tipo === "zonal"
            ? `Sus ${baja.puntosActivos ?? 0} puntos de este formulario dejarán de ofrecerse en el registro. Los demás formularios no cambian, y los cuadros anteriores se siguen leyendo.`
            : baja
              ? `«${baja.nombre}» dejará de ofrecerse al registrar operativos. Los cuadros anteriores que lo usaron se siguen leyendo, y puede reactivarlo después.`
              : ""
        }
        textoPrincipal="Sí, desactivar"
        tituloError="No se pudo desactivar"
        onPrincipal={desactivar}
        onSecundario={() => setBaja(null)}
      />

      <MensajeModal
        abierto={eliminacion !== null}
        variante="peligro"
        titulo={eliminacion ? `¿Eliminar «${eliminacion.nombre}»?` : "¿Eliminar?"}
        mensaje="Nunca se usó en un cuadro, así que se borra definitivamente."
        textoPrincipal="Sí, eliminar"
        tituloError="No se pudo eliminar"
        onPrincipal={eliminar}
        onSecundario={() => setEliminacion(null)}
      />
    </section>
  );
};

export default AdminCatalogosCuadroPage;
