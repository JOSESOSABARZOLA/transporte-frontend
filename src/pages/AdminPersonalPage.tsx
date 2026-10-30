/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: AdminPersonalPage.tsx
 * Responsabilidad: Pantalla P-07. Mantener el maestro de personal y sus ausencias.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA ÚNICA PANTALLA QUE MUESTRA CÉDULAS Y TELÉFONOS.
 *
 * `FuncionarioResponseDto` es el único contrato del sistema que los devuelve. El resto del
 * módulo trabaja con nombre y área: `PersonaElegibleResponseDto` **no tiene** teléfono, y esa
 * ausencia es lo que impide que se filtre por descuido en una pantalla nueva (RN-34).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REDISEÑO DEL 2026-10-08:
 *   · Abre en «Activos» (selector segmentado Activos | Inactivos | Todos) con un solo contador:
 *     «N funcionarios · X activos de Y en el maestro». Antes abría con todos y decía «68 de 68»
 *     aunque 38 fueran bajas. Y es de SUS direcciones; el directorio de Auth mira toda la AMC.
 *   · 10 por página, como Mis operativos. La columna «Estado» sale de UNA consulta de ausencias de
 *     todo el maestro (antes, una por fila).
 *   · Avisos breves abajo a la derecha (`toast`, `utils/mensaje.ts`) en lugar de `ModalExito`, y la fila
 *     recién creada o editada se resalta en verde `MS_RESALTADO` ms en su página.
 *   · Baja con su modal centrado (motivo obligatorio) y REACTIVAR también con confirmación.
 *
 * PLANTILLA VISUAL (2026-10-24): encabezado `EncabezadoPagina` y la tabla en `PanelTabla`, con
 * cabecera azul «Maestro de personal», «+ Nuevo funcionario» en ella y los filtros en la barra
 * blanca. El contador «N funcionarios · X activos de Y» se retiró: el total lo dice el paginador.
 *
 * DOS PESTAÑAS (2026-10-24): «Maestro de personal» y, para quien gestiona Instrucción, «Cobertura
 * por turnos», en UN panel y con UN encabezado (antes la cobertura iba apilada debajo, con el suyo).
 * La pestaña va en `?tab=maestro|cobertura`. La matriz queda montada mientras se ve el maestro, así
 * cada pestaña conserva sus filtros; entrega sus piezas por `marco` y aquí se colocan. Entre las dos
 * hay enlaces de NAVEGACIÓN: «Ver turnos» y «Ausente …» llevan a la persona en la cobertura, y su
 * nombre en la cobertura abre sus Ausencias. Registrar o quitar una ausencia relee la matriz.
 *
 * DAR DE BAJA NO BORRA. El histórico de quién salió en cada operativo depende de la ficha, y
 * quien sale hoy puede reingresar con su historial intacto. El servidor dice cuántos operativos
 * conserva, y se muestra.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ModalBajaConMotivo from "../components/personal/ModalBajaConMotivo.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import PanelAusencias, {
  type ValoresAusencia,
} from "../components/personal/PanelAusencias.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import EncabezadoPagina from "../components/common/EncabezadoPagina.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import PanelTabla from "../components/common/PanelTabla.tsx";
import Pestanas, { type DefinicionPestana } from "../components/common/Pestanas.tsx";
import SelectorSegmentado from "../components/forms/SelectorSegmentado.tsx";
import DrawerFlujoAlta, {
  type OrigenAlta,
  type ResultadoGuardado,
} from "../components/personal/DrawerFlujoAlta.tsx";
import type { ValoresFichaAlta } from "../components/personal/PasoFichaFuncionario.tsx";
import { PARA_FICHA } from "../components/personal/propositoDirectorio.ts";
import TablaPersonal from "../components/personal/TablaPersonal.tsx";
import type { AreaPersonal, Zonal } from "../interfaces/Formulario.ts";
import MatrizCobertura, {
  type PartesCobertura,
} from "../components/personal/MatrizCobertura.tsx";
import type { FilaDirectorio } from "../interfaces/DirectorioAuth.ts";
import type {
  AusenciaDelMaestro,
  BajaFuncionario,
  Disponibilidad,
  Funcionario,
} from "../interfaces/Personal.ts";
import { PersonalService } from "../services/personal.service.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
import { avisoDeFallo, presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import { DatetimeUtil } from "../utils/datetime.util.ts";
import { MS_RESALTADO, paginar } from "../utils/listadoOperativos.util.ts";
import { ausenciaAMostrar } from "../utils/ausencias.util.ts";
import {
  FILTROS_INICIALES,
  filtrosDesdeUrl,
  NOMBRE_AREA,
  FILTRO_SIN_JORNADA,
  filtrarPersonal,
  hayFiltrosDePersonal,
  nombreCompleto,
  type FiltrosPersonal,
} from "../utils/personal.util.ts";
import { toast } from "../utils/mensaje.ts";
import { useJornadasLaborales } from "../hooks/useJornadasLaborales.ts";

/** Opciones del selector de estado. «Todos» es el valor vacío del filtro. */
const OPCIONES_ESTADO = [
  { valor: "activos", nombre: "Activos" },
  { valor: "inactivos", nombre: "Inactivos" },
  { valor: "", nombre: "Todos" },
];

/** Las dos pestañas de la página; la cobertura solo para quien gestiona Instrucción. */
type PestanaPersonal = "maestro" | "cobertura";
const PESTANAS: DefinicionPestana<PestanaPersonal>[] = [
  { id: "maestro", titulo: "Maestro de personal" },
  { id: "cobertura", titulo: "Cobertura por turnos" },
];

const SUBTITULO: Record<PestanaPersonal, string> = {
  maestro: "Maestro de funcionarios de la AMC. Es la única pantalla que muestra cédulas y teléfonos.",
  cobertura:
    "Qué días y en qué turno puede salir cada persona de Instrucción. Se guarda solo al editar.",
};

/** Códigos del servidor que dicen «Auth no tiene a esta persona o no responde»: salida manual. */
const SIN_AUTH = new Set(["PERSONA_NO_ENCONTRADA_EN_AUTH", "AUTH_NO_DISPONIBLE"]);

const AdminPersonalPage = () => {
  /**
   * QUÉ ÁREAS PUEDE DAR DE ALTA QUIEN ESTÁ MIRANDO (2026-09-01). Nace vacío y no con las cuatro:
   * una lista completa por omisión haría que un alta rápida cayera en un área ajena.
   */
  const [areasQueGestiona, setAreasQueGestiona] = useState<AreaPersonal[]>([]);
  const [zonales, setZonales] = useState<Zonal[]>([]);

  /**
   * SI QUIEN MIRA ADMINISTRA EL MAESTRO (2026-09-02): se deriva del alcance que dice el servidor
   * contra `t_rol_direccion`, no de un rol quemado. Es presentación, no autorización.
   */
  const puedeAdministrar = areasQueGestiona.length > 0;

  const hoy = useMemo(() => DatetimeUtil.formatDate(new Date()), []);

  const [personal, setPersonal] = useState<Funcionario[]>([]);
  const [cargando, setCargando] = useState(true);
  /** Ausencias en curso y próximas de todo el maestro (una consulta). */
  const [ausenciasMaestro, setAusenciasMaestro] = useState<AusenciaDelMaestro[]>(
    [],
  );

  // «N fichas de personal →» de «Jornadas laborales» abre con `?jornada=` (2026-10-24).
  const [filtros, setFiltros] = useState<FiltrosPersonal>(() =>
    filtrosDesdeUrl(window.location.search),
  );
  // El catálogo de jornadas laborales (2026-10-23), para el filtro «Jornada».
  const { jornadas } = useJornadasLaborales();
  const [pagina, setPagina] = useState(0);
  // 10 por página, como Mis operativos (2026-10-08).
  const [tamanio, setTamanio] = useState(10);

  /** La ventana del directorio, que es por donde empieza un alta. */
  const [eligiendoDeAuth, setEligiendoDeAuth] = useState(false);
  const [directorio, setDirectorio] = useState<FilaDirectorio[]>([]);
  const [cargandoDirectorio, setCargandoDirectorio] = useState(false);
  /** Que Auth no esté es un ESTADO (`{ disponible, motivo, personas }`), no un error. */
  const [directorioDisponible, setDirectorioDisponible] = useState(true);
  const [motivoDirectorio, setMotivoDirectorio] = useState<string | null>(null);

  // ALTA y EDICIÓN comparten el cajón (`DrawerFlujoAlta`).
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [enAusencias, setEnAusencias] = useState<Funcionario | null>(null);
  /** Ausencias de la persona del modal (con motivo y las pasadas). `null` = consultando. */
  const [ausenciasDe, setAusenciasDe] = useState<Disponibilidad[] | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<Funcionario | null>(null);
  const [porReactivar, setPorReactivar] = useState<Funcionario | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);

  const [avisoAusencia, setAvisoAusencia] = useState<string | null>(null);

  // ── Pestañas y enlaces con la cobertura (2026-10-24) ──
  const [params, setParams] = useSearchParams();
  const gestionaInstruccion = areasQueGestiona.includes("INSTRUCCION" as AreaPersonal);
  /** Llevar la cobertura a una persona (y su mes); `clave` lo vuelve a aplicar aunque se repita. */
  const [enfoque, setEnfoque] = useState<{ texto: string; mes?: string; clave: number } | null>(
    null,
  );
  /** Sube al registrar o quitar una ausencia: la matriz se relee para poner o quitar el candado. */
  const [recargaCobertura, setRecargaCobertura] = useState(0);

  const elegirPestana = useCallback(
    (pestana: PestanaPersonal) => {
      const siguientes = new URLSearchParams(params);
      siguientes.set("tab", pestana);
      setParams(siguientes, { replace: true });
    },
    [params, setParams],
  );

  /** A la cobertura, con la persona en el buscador y, si se pide, en un mes. */
  const verEnCobertura = useCallback(
    (funcionario: Funcionario, mes?: string) => {
      setEnfoque((previo) => ({
        texto: nombreCompleto(funcionario),
        mes,
        clave: (previo?.clave ?? 0) + 1,
      }));
      elegirPestana("cobertura");
    },
    [elegirPestana],
  );
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  /** Aviso breve, abajo a la derecha. */

  /** Ausencias del maestro. Un fallo no tumba la lista: solo se pierde el distintivo. */
  const cargarAusenciasMaestro = useCallback(async () => {
    try {
      setAusenciasMaestro(await PersonalService.listarAusenciasDelMaestro());
    } catch {
      setAusenciasMaestro([]);
    }
  }, []);

  /** Siempre con inactivos: el filtro de estado decide qué se ve. */
  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const [fichas, areas, zonalesDelCatalogo] = await Promise.all([
        PersonalService.listar(true),
        PersonalService.areasQueGestiona(),
        // Para el campo Zonal de la ficha. Con las desactivadas (2026-10-26): una ficha puede
        // conservar una zonal que se desactivó después, y debe verse cuál es. Si falla, el maestro
        // sigue sirviendo.
        CatalogoCuadroService.listarZonales(true).catch(() => [] as Zonal[]),
        cargarAusenciasMaestro(),
      ]);
      setPersonal(fichas);
      setAreasQueGestiona(areas);
      setZonales(zonalesDelCatalogo);
      setAviso(null);
    } catch (fallo: unknown) {
      setPersonal([]);
      setAviso(avisoDeFallo(fallo));
    } finally {
      setCargando(false);
    }
  }, [cargarAusenciasMaestro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * El directorio de Auth: se pide al abrir la ventana del alta, no al entrar. Su fallo se anuncia
   * DENTRO de la ventana; el maestro sigue estando bien.
   */
  const cargarDirectorio = useCallback(async () => {
    setCargandoDirectorio(true);

    try {
      const respuesta = await PersonalService.consultarDirectorio();
      setDirectorio(respuesta.personas);
      setDirectorioDisponible(respuesta.disponible);
      setMotivoDirectorio(respuesta.motivo);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setDirectorio([]);
      setDirectorioDisponible(false);
      setMotivoDirectorio(error.mensaje);
    } finally {
      setCargandoDirectorio(false);
    }
  }, []);

  /** Una sola vez por visita: se conserva lo consultado y «Actualizar» vuelve a preguntar. */
  const directorioPedido = useRef(false);

  const abrirDirectorio = useCallback(() => {
    setEligiendoDeAuth(true);
    if (directorioPedido.current) return;
    directorioPedido.current = true;
    void cargarDirectorio();
  }, [cargarDirectorio]);

  const coincidentes = useMemo(
    () => filtrarPersonal(personal, filtros),
    [personal, filtros],
  );

  /** Las áreas del desplegable salen del maestro SIN filtrar (PER-09). */
  const areasPresentes = useMemo(
    () =>
      (Object.keys(NOMBRE_AREA) as AreaPersonal[]).filter((area) =>
        personal.some((funcionario) => funcionario.area === area),
      ),
    [personal],
  );

  const pagina0 = useMemo(
    () => paginar(coincidentes, pagina, tamanio),
    [coincidentes, pagina, tamanio],
  );

  useEffect(() => {
    if (pagina0.pagina !== pagina) setPagina(pagina0.pagina);
  }, [pagina0.pagina, pagina]);

  /** La ausencia a mostrar de cada ficha: la en curso o, si no, la próxima. */
  const ausenciaPorFicha = useMemo(() => {
    const porFicha = new Map<number, AusenciaDelMaestro[]>();
    for (const ausencia of ausenciasMaestro) {
      const lista = porFicha.get(ausencia.funcionarioId) ?? [];
      lista.push(ausencia);
      porFicha.set(ausencia.funcionarioId, lista);
    }
    const resultado: Record<number, AusenciaDelMaestro> = {};
    for (const [id, lista] of porFicha) {
      const elegida = ausenciaAMostrar(lista, hoy);
      if (elegida) resultado[id] = elegida;
    }
    return resultado;
  }, [ausenciasMaestro, hoy]);

  const cerrarCajon = useCallback(() => {
    setEligiendoDeAuth(false);
    setEditando(null);
  }, []);

  /**
   * Valores del cajón a partir de la ficha que se edita. MEMOIZADOS: el formulario usa
   * `enableReinitialize`, y un objeto nuevo en cada render de la página lo reiniciaría.
   */
  const valoresEdicion = useMemo<ValoresFichaAlta | null>(
    () =>
      editando
        ? {
            cedula: editando.cedula,
            apellidos: editando.apellidos,
            nombres: editando.nombres,
            telefono: editando.telefono ?? "",
            correoInstitucional: editando.correoInstitucional ?? "",
            correoPersonal: editando.correoPersonal ?? "",
            cargo: editando.cargo ?? "",
            area: editando.area,
            jornadaLaboralId:
              editando.jornadaLaboralId != null ? String(editando.jornadaLaboralId) : "",
            zonalId: editando.zonalId != null ? String(editando.zonalId) : "",
          }
        : null,
    [editando],
  );

  /** Tras guardar: si los filtros ocultan la ficha, vuelven a los iniciales; se resalta la fila. */
  const resaltarFicha = useCallback(
    (funcionario: Funcionario) => {
      if (filtrarPersonal([funcionario], filtros).length === 0) {
        setFiltros(FILTROS_INICIALES);
      }
      setResaltadoId(funcionario.id);
    },
    [filtros],
  );

  /** Crea (alta) o actualiza (edición) desde el cajón y devuelve el resultado enrutado. */
  const guardarDesdeDrawer = useCallback(
    async (
      valores: ValoresFichaAlta,
      { crearOtro, origen }: { crearOtro: boolean; origen: OrigenAlta },
    ): Promise<ResultadoGuardado> => {
      // Vacía: en el alta no se envía; al editar va `null` y la quita (2026-10-26). El campo
      // muestra la zonal que tiene la ficha, así que dejarlo en «Sin zonal» es quitarla.
      const zonalId =
        valores.zonalId !== "" ? Number(valores.zonalId) : editando ? null : undefined;

      const datos = {
        apellidos: valores.apellidos,
        nombres: valores.nombres,
        telefono: valores.telefono || undefined,
        correoInstitucional: valores.correoInstitucional || undefined,
        correoPersonal: valores.correoPersonal || undefined,
        cargo: valores.cargo || undefined,
        area: valores.area as AreaPersonal,
        jornadaLaboralId: Number(valores.jornadaLaboralId),
        zonalId,
      };

      try {
        // Con AUTH el servidor toma el correo institucional de Auth central y descarta el enviado.
        const guardado = editando
          ? await PersonalService.actualizar(editando.id, datos)
          : await PersonalService.crear({
              ...datos,
              cedula: valores.cedula,
              origen,
            });

        const nombre = `${valores.apellidos} ${valores.nombres}`;

        await Promise.all([
          cargar(),
          !editando && directorioPedido.current
            ? cargarDirectorio()
            : Promise.resolve(),
        ]);

        toast.exito(
          editando
            ? `Ficha de ${nombre} actualizada.`
            : `Ficha de ${nombre} creada.`,
        );
        if (!crearOtro) {
          setEditando(null);
          setEligiendoDeAuth(false);
          resaltarFicha(guardado);
        }

        return { ok: true, nombre };
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        if (error.codigo === "CEDULA_CON_FICHA") {
          return { ok: false, errorCedula: error.mensaje };
        }
        return {
          ok: false,
          aviso: error.mensaje,
          ofrecerManual: SIN_AUTH.has(error.codigo),
        };
      }
    },
    [editando, cargar, cargarDirectorio, resaltarFicha],
  );

  /** Navega a la página de la fila resaltada y la apaga a los `MS_RESALTADO` ms. */
  useEffect(() => {
    if (resaltadoId == null) return;
    const indice = coincidentes.findIndex((f) => f.id === resaltadoId);
    if (indice >= 0) setPagina(Math.floor(indice / tamanio));
    const temporizador = setTimeout(() => setResaltadoId(null), MS_RESALTADO);
    return () => clearTimeout(temporizador);
  }, [resaltadoId, coincidentes, tamanio]);

  const abrirAusencias = useCallback(async (funcionario: Funcionario) => {
    setEnAusencias(funcionario);
    setAvisoAusencia(null);
    setAusenciasDe(null);
    try {
      setAusenciasDe(await PersonalService.listarAusencias(funcionario.id));
    } catch (fallo: unknown) {
      setAusenciasDe([]);
      setAvisoAusencia(presentarError(fallo).mensaje);
    }
  }, []);

  const refrescarAusenciasDe = useCallback(async (funcionarioId: number) => {
    const [suyas] = await Promise.all([
      PersonalService.listarAusencias(funcionarioId),
      cargarAusenciasMaestro(),
    ]);
    setAusenciasDe(suyas);
  }, [cargarAusenciasMaestro]);

  const registrarAusencia = useCallback(
    async (valores: ValoresAusencia): Promise<boolean> => {
      if (!enAusencias) return false;

      setProcesando(true);
      setAvisoAusencia(null);

      try {
        await PersonalService.registrarAusencia(enAusencias.id, {
          estado: valores.estado,
          desde: valores.desde,
          hasta: valores.hasta,
          motivo: valores.motivo.trim() || undefined,
        });
        await refrescarAusenciasDe(enAusencias.id);
        setRecargaCobertura((valor) => valor + 1);
        toast.exito("Ausencia registrada: esos días quedan bloqueados en la cobertura");
        return true;
      } catch (fallo: unknown) {
        // 409 AUSENCIA_SOLAPADA: el servidor conoce también lo que otro acaba de registrar.
        setAvisoAusencia(presentarError(fallo).mensaje);
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [enAusencias, refrescarAusenciasDe],
  );

  const retirarAusencia = useCallback(
    async (periodoId: number) => {
      if (!enAusencias) return;

      setProcesando(true);
      setAvisoAusencia(null);

      try {
        await PersonalService.retirarAusencia(enAusencias.id, periodoId);
        await refrescarAusenciasDe(enAusencias.id);
        setRecargaCobertura((valor) => valor + 1);
        toast.exito("Ausencia quitada: los turnos de esos días vuelven a verse");
      } catch (fallo: unknown) {
        // 409 AUSENCIA_PASADA: una ausencia que ya terminó es historial.
        setAvisoAusencia(presentarError(fallo).mensaje);
      } finally {
        setProcesando(false);
      }
    },
    [enAusencias, refrescarAusenciasDe],
  );

  const darDeBaja = useCallback(
    async (datosBaja: BajaFuncionario) => {
      if (!porDarDeBaja) return;

      // Si el servidor la rechaza, lanza: el error queda en el modal de la baja.
      const baja = await PersonalService.desactivar(porDarDeBaja.id, datosBaja);
      setPorDarDeBaja(null);
      // El servidor redacta cuántos operativos conserva la ficha. Se muestra tal cual.
      toast.exito(baja.mensaje);
      await cargar();
    },
    [porDarDeBaja, cargar],
  );

  const reactivar = useCallback(async () => {
    if (!porReactivar) return;
    const funcionario = porReactivar;
    // Si el servidor lo rechaza, lanza: el error queda en el modal de la confirmación.
    await PersonalService.reactivar(funcionario.id);
    setPorReactivar(null);
    toast.exito(`${nombreCompleto(funcionario)} vuelve al maestro.`);
    await cargar();
  }, [porReactivar, cargar]);

  const filtrando = hayFiltrosDePersonal(filtros);

  const cambiarFiltro = (cambio: Partial<FiltrosPersonal>) => {
    setFiltros((actuales) => ({ ...actuales, ...cambio }));
    setPagina(0);
  };

  /** El nombre en la cobertura abre las Ausencias de esa ficha (el mismo cajón del maestro). */
  const verAusenciasDe = (funcionarioId: number) => {
    const funcionario = personal.find((ficha) => ficha.id === funcionarioId);
    if (funcionario) void abrirAusencias(funcionario);
  };

  /** «Ausente …» lleva al mes de la ausencia: el de su inicio o, si ya empezó, el actual. */
  const verAusenciaEnCobertura = (
    funcionario: Funcionario,
    ausencia: AusenciaDelMaestro,
  ) => verEnCobertura(funcionario, (ausencia.desde > hoy ? ausencia.desde : hoy).slice(0, 7));

  const filtrosMaestro = (
    <>
      <input
        type="search"
        className="input input-bordered input-sm min-w-[320px]"
        placeholder="Buscar por cédula, nombre o cargo…"
        aria-label="Buscar en el maestro"
        value={filtros.busqueda ?? ""}
        onChange={(evento) => cambiarFiltro({ busqueda: evento.target.value })}
      />

      <select
        className="select select-bordered select-sm"
        aria-label="Filtrar por área"
        value={filtros.area ?? ""}
        onChange={(evento) =>
          cambiarFiltro({ area: evento.target.value as AreaPersonal | "" })
        }
      >
        <option value="">Todas las áreas</option>
        {areasPresentes.map((area) => (
          <option
            key={area}
            value={area}
          >
            {NOMBRE_AREA[area]}
          </option>
        ))}
      </select>

      <select
        className="select select-bordered select-sm"
        aria-label="Filtrar por jornada laboral"
        value={filtros.jornada ?? ""}
        onChange={(evento) => cambiarFiltro({ jornada: evento.target.value })}
      >
        <option value="">Toda jornada</option>
        <option value={FILTRO_SIN_JORNADA}>Sin jornada</option>
        {jornadas.map((jornada) => (
          <option
            key={jornada.id}
            value={String(jornada.id)}
          >
            {jornada.nombre}
          </option>
        ))}
      </select>

      <SelectorSegmentado
        id="filtro-estado"
        etiqueta="Estado"
        etiquetaOculta
        opciones={OPCIONES_ESTADO}
        valor={filtros.estado ?? ""}
        onCambiar={(valor) =>
          cambiarFiltro({ estado: valor as "" | "activos" | "inactivos" })
        }
      />

      {/* «Limpiar filtros» solo con filtros distintos de los iniciales. */}
      {filtrando && (
        <Boton
          variante="enlace"
          tamano="sm"
          onClick={() => {
            setFiltros(FILTROS_INICIALES);
            setPagina(0);
          }}
        >
          Limpiar filtros
        </Boton>
      )}
    </>
  );

  const contenidoMaestro = (
    <>
      <TablaPersonal
        personal={pagina0.filas}
        zonales={zonales}
        ausencias={ausenciaPorFicha}
        seleccionadoId={enAusencias?.id ?? null}
        resaltadoId={resaltadoId}
        onAusencias={(funcionario) => void abrirAusencias(funcionario)}
        onEditar={(funcionario) => setEditando(funcionario)}
        onDarDeBaja={setPorDarDeBaja}
        onReactivar={setPorReactivar}
        puedeAdministrar={puedeAdministrar}
        mensajeVacio={
          cargando
            ? "Cargando el maestro…"
            : filtrando
              ? "Ningún funcionario coincide con el filtro."
              : "No hay funcionarios activos. Registre el primero."
        }
        // Los enlaces a la cobertura, solo con su pestaña.
        onVerTurnos={gestionaInstruccion ? (funcionario) => verEnCobertura(funcionario) : undefined}
        onVerAusenciaEnCobertura={gestionaInstruccion ? verAusenciaEnCobertura : undefined}
      />

      {coincidentes.length > 0 && (
        <Paginacion
          page={pagina0.pagina}
          pageSize={tamanio}
          total={pagina0.total}
          onPage={setPagina}
          onPageSize={setTamanio}
          etiqueta="funcionarios"
        />
      )}
    </>
  );

  /**
   * LA PÁGINA, con o sin la cobertura. `partes` llega de la matriz (solo para quien gestiona
   * Instrucción); sin ella, o si el servidor dijo 404, no hay pestañas y la cabecera dice
   * «Maestro de personal», como siempre.
   */
  const pintar = (partes: PartesCobertura | null) => {
    const conCobertura = Boolean(partes?.disponible);
    const activa: PestanaPersonal =
      conCobertura && params.get("tab") === "cobertura" ? "cobertura" : "maestro";
    const enCobertura = activa === "cobertura" && partes !== null;

    return (
      <section className="app-page-shell">
        <EncabezadoPagina
          modulo="Administración"
          titulo="Personal y disponibilidad"
          subtitulo={SUBTITULO[activa]}
          chips={enCobertura ? partes.estadoMes : undefined}
          contexto={enCobertura ? partes.selectorMes : undefined}
        />

        {aviso && (
          <AvisoEnLinea
            variante={aviso.variante}
            titulo="No se pudo cargar el maestro"
            accion={
              <Boton tamano="sm" onClick={() => void cargar()}>
                Reintentar
              </Boton>
            }
          >
            {aviso.texto}
          </AvisoEnLinea>
        )}

        <PanelTabla
          titulo={conCobertura ? undefined : "Maestro de personal"}
          cabecera={
            conCobertura ? (
              <Pestanas
                etiqueta="Personal y disponibilidad"
                pestanas={PESTANAS}
                activa={activa}
                onElegir={elegirPestana}
                sobreBarra
              />
            ) : undefined
          }
          acciones={
            enCobertura
              ? partes.acciones
              : puedeAdministrar && (
                  <Boton
                    variante="primario"
                    onClick={abrirDirectorio}
                  >
                    + Nuevo funcionario
                  </Boton>
                )
          }
          filtros={enCobertura ? partes.filtros : filtrosMaestro}
          nota={enCobertura ? partes.nota : undefined}
          cuerpo={
            conCobertura
              ? { id: `panel-${activa}`, role: "tabpanel", "aria-labelledby": `pestana-${activa}` }
              : undefined
          }
        >
          {enCobertura ? partes.contenido : contenidoMaestro}
        </PanelTabla>

        {/* EL CAJÓN, compartido por el ALTA (dos pasos) y la EDICIÓN (directo en la ficha). */}
        <DrawerFlujoAlta
          abierto={eligiendoDeAuth || editando !== null}
          proposito={PARA_FICHA}
          filas={directorio}
          disponible={directorioDisponible}
          motivo={motivoDirectorio}
          cargando={cargandoDirectorio}
          onActualizar={() => void cargarDirectorio()}
          onCerrar={cerrarCajon}
          areasQueGestiona={areasQueGestiona}
          zonales={zonales}
          onGuardar={guardarDesdeDrawer}
          edicion={editando !== null}
          valoresEdicion={valoresEdicion}
        />

        {enAusencias && (
          <PanelAusencias
            funcionario={enAusencias}
            ausencias={ausenciasDe ?? []}
            cargando={ausenciasDe === null}
            guardando={procesando}
            hoy={hoy}
            aviso={avisoAusencia}
            onRegistrar={registrarAusencia}
            onRetirar={(periodoId) => void retirarAusencia(periodoId)}
            onCerrar={() => {
              setEnAusencias(null);
              setAusenciasDe(null);
            }}
          />
        )}

        {/* La baja exige un motivo. `key` por ficha remonta el modal limpio en cada apertura. */}
        <ModalBajaConMotivo
          key={porDarDeBaja?.id ?? "baja"}
          abierto={porDarDeBaja !== null}
          funcionario={porDarDeBaja}
          onConfirmar={darDeBaja}
          onCancelar={() => setPorDarDeBaja(null)}
        />

        {/*
          Reactivar vuelve a ofrecer a la persona en los desplegables de TODOS los formularios: un
          clic suelto en la fila no debería bastar para eso (2026-10-08). Advertencia, no peligro.
        */}
        <MensajeModal
          abierto={porReactivar !== null}
          variante="advertencia"
          titulo={porReactivar ? `¿Reactivar a ${nombreCompleto(porReactivar)}?` : ""}
          mensaje="Volverá a aparecer para asignar a operativos, con su historial intacto."
          textoPrincipal="Reactivar"
          tituloError="No se pudo activar"
          onPrincipal={reactivar}
          onSecundario={() => setPorReactivar(null)}
        />
      </section>
    );
  };

  // COBERTURA POR TURNOS · SOLO INSTRUCCIÓN: la matriz se monta (y queda montada en la pestaña
  // Maestro, con su estado) y entrega sus piezas; sin ese alcance, la página va sola.
  return gestionaInstruccion ? (
    <MatrizCobertura
      onZonaCambiada={() => void cargar()}
      marco={pintar}
      enfoque={enfoque}
      onVerAusencias={verAusenciasDe}
      recarga={recargaCobertura}
    />
  ) : (
    pintar(null)
  );
};

export default AdminPersonalPage;
