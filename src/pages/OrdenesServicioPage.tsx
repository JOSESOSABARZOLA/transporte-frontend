/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: OrdenesServicioPage.tsx
 * Responsabilidad: Pantalla P-05. Emitir las órdenes de la jornada, y comprobar qué dicen.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EMITIR ES UN ACTO DE LA DIRECCIÓN, Y ES LA SALIDA DEL SISTEMA.
 *
 * Una orden emitida se entrega a una persona: ya no se puede recoger. Reemitir no borra
 * la anterior —la marca no vigente y la conserva—, así que el error no se deshace, se
 * documenta. Por eso la emisión pasa por confirmación y por eso, antes de emitir, la
 * pantalla muestra **qué va a decir cada hoja**.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * DE DÓNDE SALE LA LISTA DE OPERATIVOS. El plan asigna a este módulo dos endpoints de
 * órdenes y ninguno que enumere operativos. La lista se toma de `GET /matriz/:fecha`, que
 * ya se consume en P-04, es exclusivo del `DIRECTOR` y trae de cada fila justo lo que hace
 * falta: su identificador, su personal —para el caso 4— y el estado del cuadro. Pedirla
 * por `GET /operativos` habría traído lo mismo con un contrato más y sin el estado.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormikHelpers } from "formik";
import { useSearchParams } from "react-router-dom";

import MensajeModal from "../components/common/MensajeModal.tsx";
import DrawerOperativo from "../components/cuadro/DrawerOperativo.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import { macroSegunTipo } from "../utils/tipoTransporte.util.ts";
import { MS_RESALTADO } from "../utils/listadoOperativos.util.ts";
import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";
import VistaPreviaOrden from "../components/ordenes/VistaPreviaOrden.tsx";
import EditorPlantillaOrden from "../components/ordenes/EditorPlantillaOrden.tsx";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import type { Operativo } from "../interfaces/Operativo.ts";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../interfaces/Personal.ts";
import { OperativoService } from "../services/operativo.service.ts";
import { PersonalService } from "../services/personal.service.ts";
import {
  OPCION_ADICIONALES,
  type ValoresOperativo,
} from "../utils/valoresOperativo.util.ts";
import { colorEstado } from "../config/env.ts";
import { nombreEstadoCuadro } from "../interfaces/CuadroDiario.ts";
import type { Matriz, OrdenServicio } from "../interfaces/Documento.ts";
import { DocumentoService } from "../services/documento.service.ts";
import { avisoDeFallo, presentarError, varianteDeAviso, type AvisoTexto } from "../utils/errorApi.util.ts";
import { turnoDePrimera } from "../utils/personal.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import { conDiaYMesEnMayuscula } from "../utils/texto.util.ts";
import {
  motivoParaNoEmitir,
  operativosDeLaMatriz,
  contarEstados,
  partesResumenCabecera,
  resumenEstado,
  type OperativoEmisible,
} from "../utils/ordenes.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

const OrdenesServicioPage = () => {
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * LA JORNADA QUE SE PROPONE ES LA DE MAÑANA, como en las demás pantallas. RN-01.
   *
   * ES EL FLUJO NORMAL DE ESTA PANTALLA: la Dirección consolida la matriz de la jornada
   * siguiente, cierra el cuadro y **emite las órdenes de esa misma jornada**. Proponer hoy
   * dejaba delante un cuadro ya ejecutado, sobre el que no hay nada que emitir.
   *
   * EL ADICIONAL DE URGENCIA ES EL CASO QUE NO ENCAJA, y conviene saberlo. RN-62 dice que
   * se dispone «el mismo día en que se ejecuta», y el adicional entra siempre en la jornada
   * de su operativo padre, no en la que muestre este selector. Para disponer uno hay que
   * **retroceder un día** y elegir el operativo de hoy; si no, colgará de un operativo de
   * mañana y será un adicional de mañana.
   *
   * Decidido así el 2026-08-21, sabiendo lo anterior. Si la urgencia se vuelve frecuente,
   * lo que corresponde no es mover este valor por defecto sino dar al adicional su propia
   * vía, con su propia fecha.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  // Para devolver el foco a «Editar plantilla» al salir del editor a pantalla completa (E15).
  const editarPlantillaRef = useRef<HTMLButtonElement>(null);
  // `?fecha=AAAA-MM-DD` la fija quien llega desde la matriz (cuadro recién cerrado → «Ver órdenes»).
  const [parametros] = useSearchParams();
  const [fecha, setFecha] = useState(() => {
    const pedida = parametros.get("fecha");
    return pedida && /^\d{4}-\d{2}-\d{2}$/.test(pedida) ? pedida : fechaDeJornadaPorDefecto();
  });

  const [matriz, setMatriz] = useState<Matriz | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinJornada, setSinJornada] = useState(false);

  const [seleccionado, setSeleccionado] = useState<OperativoEmisible | null>(
    null,
  );
  const [emitidas, setEmitidas] = useState<OrdenServicio[]>([]);
  const [cargandoEmitidas, setCargandoEmitidas] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoTodas, setConfirmandoTodas] = useState(false);
  const [plantillaAbierta, setPlantillaAbierta] = useState(false);
  /**
   * Sube al VOLVER del editor de plantilla (bug H35, 2026-10-05): guardar la plantilla puede pasar
   * borradores a Vigente en el servidor, y la lista en memoria seguía mostrando los faltantes viejos.
   * Re-pide las órdenes de la jornada y, con él, el estado de la plantilla propia.
   */
  const [recargaOrdenes, setRecargaOrdenes] = useState(0);
  /**
   * ¿A la plantilla PROPIA le faltan datos generales? (punto 5). `null` mientras no se sabe o si
   * falló la consulta: el aviso es una ayuda, no bloquea la página.
   */
  const [plantillaIncompleta, setPlantillaIncompleta] = useState<boolean | null>(
    null,
  );

  /**
   * ESTADO DE EMISIÓN POR OPERATIVO (2026-10-01). La matriz no dice cuántas hojas de cada
   * operativo están emitidas, así que para pintar el chip «Emitidas N/N» / «Pendiente» por fila
   * y contar los pendientes se consulta `GET /operativos/:id/ordenes-servicio` de cada uno con el
   * MISMO endpoint que el panel (no hay uno masivo). Se refresca al emitir/reemitir.
   */
  const [ordenesPorOperativo, setOrdenesPorOperativo] = useState<
    Record<number, OrdenServicio[]>
  >({});

  // Los operativos cuya orden NO se generó al emitir en bloque: se muestran para revisarlos y
  // reenviarlos uno a uno. `reintentandoId` es el que se está reenviando en este momento.
  const [fallidas, setFallidas] = useState<OperativoEmisible[]>([]);
  const [reintentandoId, setReintentandoId] = useState<number | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);

  /** El error de CARGA de la matriz; los de las acciones son mensajes estándar o van en su cajón. */
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL ADICIONAL DE LA DIRECCIÓN VIVE AQUÍ, Y NO EN P-02. 2026-08-20.
   *
   * P-02 es «Mis operativos»: la usan los tres roles departamentales sobre lo suyo, y
   * mientras el cuadro siga abierto. Pero la urgencia llega **después** —cuadro armado,
   * matriz consolidada, cuadro cerrado— y entonces el único perfil que puede disponer un
   * adicional es la Dirección, porque RN-58 exige su autorización y ella es la autorización.
   *
   * Ésta es su pantalla, y además es donde tendrá que **emitir la orden del adicional
   * inmediatamente después**: crear y emitir sin cambiar de sitio es el flujo real de una
   * urgencia. Por eso la lista se recarga al guardar y el adicional aparece ya emisible.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const [creandoAdicional, setCreandoAdicional] = useState<Operativo | null>(
    null,
  );
  const [abriendoAdicional, setAbriendoAdicional] = useState(false);
  /** Error del servidor al registrar el adicional: se muestra dentro de su cajón. */
  const [errorAdicional, setErrorAdicional] = useState<AvisoTexto | null>(null);
  /**
   * Aviso breve tras registrar un adicional o emitir órdenes (abajo a la derecha, desaparece
   * solo). La emisión también va por aquí desde el 2026-10-15: `ModalExito` se retiró.
   */
  /** El adicional recién registrado: su fila se resalta unos segundos. */
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);
  useEffect(() => {
    if (resaltadoId === null) return undefined;
    const apagar = window.setTimeout(() => setResaltadoId(null), MS_RESALTADO);
    return () => window.clearTimeout(apagar);
  }, [resaltadoId]);
  const [personalAdicional, setPersonalAdicional] = useState<PersonaAgregada[]>(
    [],
  );
  const [candidatos, setCandidatos] = useState<PersonaElegible[]>([]);
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  const [avisoPersonal, setAvisoPersonal] = useState<string | null>(null);

  /**
   * Fija el horario propio de una persona del adicional (2026-09-08, RN-66). Obligatorio: el
   * adicional no tiene horario propio y el servidor toma su ventana de las de su gente.
   * Espeja `cambiarHorarioPersona` de P-01.
   */
  const cambiarHorarioAdicional = useCallback(
    (funcionarioId: number, horaInicio: string, horaFin: string) => {
      setPersonalAdicional((actuales) =>
        actuales.map((persona) =>
          persona.funcionarioId === funcionarioId
            ? {
                ...persona,
                horaInicio: horaInicio || undefined,
                horaFin: horaFin || undefined,
              }
            : persona,
        ),
      );
    },
    [],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setSinJornada(false);
    setSeleccionado(null);
    setEmitidas([]);

    try {
      setMatriz(await DocumentoService.consultarMatriz(fecha));
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setMatriz(null);

      if (error.estado === 404) {
        setSinJornada(true);
      } else {
        setAviso({ texto: error.mensaje, variante: varianteDeAviso(error.trato) });
      }
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cuadroCerrado = matriz?.cabecera.estado === "CERRADO";
  const operativos = useMemo(() => operativosDeLaMatriz(matriz), [matriz]);

  // Los operativos sobre los que HOY se puede emitir (con personal y cuadro cerrado): son los
  // que abarca el botón «Emitir todas». Se calcula con el MISMO `motivoParaNoEmitir` que cada
  // fila, para que lo que el botón hace coincida con lo que las filas ofrecen.
  const emisibles = useMemo(
    () =>
      operativos.filter(
        (operativo) => motivoParaNoEmitir(operativo, cuadroCerrado) === null,
      ),
    [operativos, cuadroCerrado],
  );

  // Al cambiar la jornada se pide el estado de órdenes de CADA operativo (una por una, con el
  // endpoint de siempre), para los chips de la tabla y el conteo de pendientes.
  useEffect(() => {
    if (operativos.length === 0) {
      setOrdenesPorOperativo({});
      return;
    }

    let vigente = true;
    void Promise.all(
      operativos.map((operativo) =>
        DocumentoService.consultarOrdenesDeOperativo(operativo.id)
          .then((ordenes) => [operativo.id, ordenes] as const)
          .catch(() => [operativo.id, [] as OrdenServicio[]] as const),
      ),
    ).then((pares) => {
      if (vigente) setOrdenesPorOperativo(Object.fromEntries(pares));
    });

    return () => {
      vigente = false;
    };
    // `recargaOrdenes` re-pide la lista al volver del editor de plantilla (H35).
  }, [operativos, recargaOrdenes]);

  // La plantilla PROPIA del Director en sesión (la crea el servidor desde la base si no existe): si le
  // faltan datos generales, la página lo avisa con un acceso directo al editor. Un fallo aquí no
  // bloquea nada: simplemente no se muestra el aviso.
  useEffect(() => {
    let vigente = true;
    DocumentoService.obtenerPlantilla()
      .then((plantilla) => {
        if (!vigente) return;
        const dg = plantilla.datosGenerales;
        setPlantillaIncompleta(
          [
            dg.direccionResponsable,
            dg.numeroMemorando,
            dg.fechaMemorando,
            dg.designado,
            dg.firmante,
            dg.firmanteCargo,
            dg.firmanteDependencia,
          ].some((valor) => (valor ?? "").trim() === ""),
        );
      })
      .catch(() => {
        if (vigente) setPlantillaIncompleta(null);
      });
    return () => {
      vigente = false;
    };
  }, [recargaOrdenes]);

  /** Las hojas VIGENTES ya emitidas de un operativo (una reemisión deja las viejas no vigentes). */
  const vigentesDe = useCallback(
    (operativoId: number) =>
      (ordenesPorOperativo[operativoId] ?? []).filter((orden) => orden.vigente),
    [ordenesPorOperativo],
  );

  /** ¿Están emitidas TODAS las hojas del operativo? (la emisión es todo-o-nada por operativo). */
  const estaEmitido = useCallback(
    (operativo: OperativoEmisible) =>
      operativo.personal.length > 0 &&
      vigentesDe(operativo.id).length >= operativo.personal.length,
    [vigentesDe],
  );

  // Pendientes = emisibles SIN ninguna hoja vigente. Es lo que abarca «Emitir pendientes».
  const pendientes = useMemo(
    () => emisibles.filter((operativo) => vigentesDe(operativo.id).length === 0),
    [emisibles, vigentesDe],
  );

  // «X de Y con TODAS sus órdenes vigentes» (A2): X = operativos cuyas hojas están TODAS vigentes y
  // sin borradores (completas). Un operativo con alguna hoja en borrador NO cuenta como completo.
  const conOrdenes = useMemo(
    () =>
      operativos.filter((operativo) => {
        const vg = vigentesDe(operativo.id);
        // Estado único (A2): una hoja es borrador por su `estado`, no por contar sus faltantes.
        const borradores = vg.filter((o) => o.estado === "BORRADOR").length;
        return (
          operativo.personal.length > 0 &&
          vg.length >= operativo.personal.length &&
          borradores === 0
        );
      }).length,
    [operativos, vigentesDe],
  );

  // Resumen de la jornada por ESTADO (punto 10): sin los que estén en 0 (nunca «0 vigente»).
  const partesCabecera = useMemo(
    () =>
      partesResumenCabecera(
        contarEstados(ordenesPorOperativo, pendientes.length),
      ),
    [ordenesPorOperativo, pendientes.length],
  );

  /**
   * Si el operativo abierto tiene órdenes VIGENTES de OTRO Director, reemitir no es de quien mira
   * (punto 8): el motivo, con el nombre del dueño, o `null` si se puede.
   */
  const reemisionAjena = useMemo(() => {
    const ajena = emitidas.find((orden) => orden.vigente && !orden.esPropia);
    return ajena
      ? `Estas órdenes las generó ${ajena.directorNombre ?? "otro Director"}: solo él puede reemitirlas.`
      : null;
  }, [emitidas]);

  // ─────────────────── El adicional de la Dirección ───────────────────

  const catalogos = useCatalogosFormulario(
    creandoAdicional?.formulario.codigo ?? null,
  );

  // Varias zonales (2026-09-21): la clave estable evita re-pedir los puntos en cada render.
  const zonalesDelAdicionalKey = (creandoAdicional?.zonales ?? [])
    .map((zonal) => zonal.id)
    .join(",");
  const cargarPuntosDeZonales = catalogos.cargarPuntosDeZonales;

  useEffect(() => {
    const ids = zonalesDelAdicionalKey
      ? zonalesDelAdicionalKey.split(",").map(Number)
      : [];
    if (ids.length > 0) void cargarPuntosDeZonales(ids);
  }, [zonalesDelAdicionalKey, cargarPuntosDeZonales]);

  useEffect(() => {
    if (!creandoAdicional) {
      setCandidatos([]);
      return;
    }

    let vigente = true;
    setCargandoPersonal(true);

    // RN-66: sin horario. El adicional ya no tiene uno único; los elegibles se piden por
    // área y ausencia, y el cruce por hora lo valida el servidor por persona al registrar.
    PersonalService.consultarElegibles({
      formulario: creandoAdicional.formulario.codigo,
      inicio: fecha,
    })
      .then((personas) => {
        if (vigente) setCandidatos(personas);
      })
      .catch(() => {
        if (vigente) setCandidatos([]);
      })
      .finally(() => {
        if (vigente) setCargandoPersonal(false);
      });

    return () => {
      vigente = false;
    };
  }, [creandoAdicional, fecha]);

  /**
   * Abre el panel con la ficha COMPLETA del operativo padre.
   *
   * La matriz trae de cada fila lo justo para emitir; el formulario del adicional necesita
   * zonal, punto, tipo e instituciones, que solo vienen en `GET /operativos/:id`. La
   * Dirección ya está autorizada ahí: figura entre los roles que ven la jornada entera.
   */
  // Frena el doble clic mientras se pide el operativo: el botón no se deshabilita (ver la fila).
  const abriendoAdicionalRef = useRef(false);
  const abrirAdicional = useCallback(async (operativoId: number) => {
    if (abriendoAdicionalRef.current) return;
    abriendoAdicionalRef.current = true;
    setAbriendoAdicional(true);
    setAvisoPersonal(null);
    setPersonalAdicional([]);
    setErrorAdicional(null);

    try {
      setCreandoAdicional(await OperativoService.obtener(operativoId));
      setSeleccionado(null);
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo abrir el adicional" });
    } finally {
      abriendoAdicionalRef.current = false;
      setAbriendoAdicional(false);
    }
  }, []);

  const cerrarAdicional = useCallback(() => {
    setCreandoAdicional(null);
    setPersonalAdicional([]);
    setErrorAdicional(null);
  }, []);

  const guardarAdicional = useCallback(
    async (
      valores: ValoresOperativo,
      ayudas: FormikHelpers<ValoresOperativo>,
    ) => {
      if (!creandoAdicional) return;

      setEmitiendo(true);
      setErrorAdicional(null);

      try {
        // La jornada y el formulario los hereda del padre y no viajan: el servidor
        // responde 400 si se envían. Ver `CrearAdicional`.
        const adicional = await OperativoService.crearAdicional(
          creandoAdicional.id,
          {
            // RN-66: el adicional no manda su horario; el servidor lo deriva de las personas.
            zonalesIds: valores.zonalesIds,
            puntoEncuentroId:
              valores.punto === OPCION_ADICIONALES || valores.punto === ""
                ? undefined
                : Number(valores.punto),
            puntoLibre:
              valores.punto === OPCION_ADICIONALES
                ? valores.puntoLibre
                : undefined,
            tipoControlId:
              valores.tipoControl === OPCION_ADICIONALES ||
              valores.tipoControl === ""
                ? undefined
                : Number(valores.tipoControl),
            tipoLibre:
              valores.tipoControl === OPCION_ADICIONALES
                ? valores.tipoLibre
                : undefined,
            institucionesIds: valores.institucionesIds,
            // Cómo se moviliza (2026-10-06): lo elige quien registra; por defecto, completo.
            tipoTransporte: valores.tipoTransporte ?? "COMPLETO",
            esMacrooperativo: macroSegunTipo(
              valores.tipoTransporte ?? "COMPLETO",
              valores.esMacrooperativo,
            ),
            // Cada persona lleva su horario, OBLIGATORIO (2026-09-08, RN-66): el adicional no
            // tiene horario propio; el servidor toma su ventana de las de su gente.
            personal: personalAdicional.map((persona) => ({
              funcionarioId: persona.funcionarioId,
              horaInicio: persona.horaInicio || undefined,
              horaFin: persona.horaFin || undefined,
            })),
            observaciones: valores.observaciones || undefined,
          },
        );

        /*
          AVISO BREVE Y FILA RESALTADA (2026-10-08), en lugar del `ModalExito`: el cajón se cierra,
          la tabla se recarga y la fila nueva se marca unos segundos, lista para emitir su orden.
        */
        toast.exito(
          `Operativo adicional ${adicional.identificador} registrado.` +
            (cuadroCerrado
              ? " Vuelva a descargar la matriz para que la incluya."
              : "") +
            // A esta hora la ventana de la DAF también cerró, así que si no heredó
            // transporte no hay quien se lo asigne hoy. Hay que decirlo.
            (adicional.estadoTransporte === "ASIGNADO"
              ? " Heredó el conductor y la placa del operativo original."
              : " NO heredó transporte: queda pendiente de la DAF.") +
            " Ya puede emitir su orden de servicio.",
        );

        cerrarAdicional();
        ayudas.resetForm();
        await cargar();
        setResaltadoId(adicional.id);
      } catch (fallo: unknown) {
        // El cajón sigue abierto con lo capturado: un rechazo se corrige y se reintenta
        // sin volver a escribirlo todo, que es lo que importa cuando hay prisa. El error se
        // muestra DENTRO del cajón, sobre su pie (2026-10-08).
        setErrorAdicional(avisoDeFallo(fallo));
      } finally {
        setEmitiendo(false);
      }
    },
    [creandoAdicional, personalAdicional, cuadroCerrado, cargar, cerrarAdicional],
  );

  /** Lo ya emitido para el operativo elegido, para no reemitir a ciegas. */
  const cargarEmitidas = useCallback(async (operativoId: number) => {
    setCargandoEmitidas(true);

    try {
      const ordenes =
        await DocumentoService.consultarOrdenesDeOperativo(operativoId);
      setEmitidas(ordenes);
      setOrdenesPorOperativo((previo) => ({ ...previo, [operativoId]: ordenes }));
    } catch {
      // Que no haya emisiones previas no es un fallo del que haya que informar: la vista
      // previa simplemente queda vacía hasta que se emita.
      setEmitidas([]);
    } finally {
      setCargandoEmitidas(false);
    }
  }, []);

  const elegir = useCallback(
    (operativo: OperativoEmisible) => {
      setSeleccionado(operativo);
      void cargarEmitidas(operativo.id);
    },
    [cargarEmitidas],
  );

  const emitir = useCallback(async () => {
    if (!seleccionado) return;

    setEmitiendo(true);

    try {
      const nuevas = await DocumentoService.emitirOrdenes(seleccionado.id);
      setEmitidas(nuevas);
      setOrdenesPorOperativo((previo) => ({
        ...previo,
        [seleccionado.id]: nuevas,
      }));
      setConfirmando(false);
      setResaltadoId(seleccionado.id);
      // B4: cuántas hojas quedaron en BORRADOR por datos faltantes (no consumen número).
      const borradores = nuevas.filter(
        (orden) => orden.faltantes.length > 0,
      ).length;
      // Un HITO (M7): modal de éxito.
      void mensaje.exito({
        titulo: `${nuevas.length === 1 ? "Orden emitida" : "Órdenes emitidas"} para ${seleccionado.identificador}`,
        mensaje: `Se ${nuevas.length === 1 ? "emitió" : "emitieron"} ${nuevas.length} ${
          nuevas.length === 1 ? "orden" : "órdenes"
        }, una por funcionario.${
          borradores > 0
            ? ` ${borradores} ${
                borradores === 1 ? "quedó" : "quedaron"
              } en borrador por datos faltantes.`
            : ""
        }`,
        textoPrincipal: "Aceptar",
      });
      // Si falla, lanza: el error queda en el modal de la confirmación.
    } finally {
      setEmitiendo(false);
    }
  }, [seleccionado]);

  /**
   * EMITE LAS ÓRDENES DE TODA LA JORNADA CON UN SOLO CLIC. 2026-09-23.
   *
   * El servidor no tiene endpoint masivo: se emite operativo por operativo con el mismo
   * `POST /operativos/:id/ordenes-servicio`, de uno en uno, así cada fallo se atribuye a SU
   * operativo y los demás se emiten igual (una emisión defectuosa no aborta el resto). Abarca
   * solo los EMISIBLES —la misma vara que cada fila—; los demás ya salen apagados con su motivo.
   */
  const emitirPendientes = useCallback(async () => {
    // El modal sigue abierto con «Procesando…» hasta que termina la última.
    setEmitiendo(true);
    setFallidas([]);

    let operativosOk = 0;
    let ordenesTotales = 0;
    let borradoresTotales = 0;
    const noGeneradas: OperativoEmisible[] = [];
    const nuevasPorOperativo: Record<number, OrdenServicio[]> = {};

    for (const operativo of pendientes) {
      try {
        const nuevas = await DocumentoService.emitirOrdenes(operativo.id);
        operativosOk += 1;
        ordenesTotales += nuevas.length;
        borradoresTotales += nuevas.filter(
          (orden) => orden.faltantes.length > 0,
        ).length;
        nuevasPorOperativo[operativo.id] = nuevas;
      } catch {
        // No se aborta el resto: la que falla se aparta para revisarla y reenviarla.
        noGeneradas.push(operativo);
      }
    }

    setEmitiendo(false);
    setConfirmandoTodas(false);
    setFallidas(noGeneradas);
    // Refresca el estado de las filas emitidas sin re-pedir toda la jornada.
    setOrdenesPorOperativo((previo) => ({ ...previo, ...nuevasPorOperativo }));

    // Si hay un operativo abierto en la vista previa, se refresca lo suyo para verlo emitido.
    if (seleccionado && nuevasPorOperativo[seleccionado.id]) {
      setEmitidas(nuevasPorOperativo[seleccionado.id]);
    }

    if (noGeneradas.length === 0) {
      // Un HITO (M7): modal de éxito.
      void mensaje.exito({
        titulo: "Órdenes emitidas",
        mensaje: `Se emitieron ${ordenesTotales} ${
          ordenesTotales === 1 ? "orden" : "órdenes"
        } de ${operativosOk} ${
          operativosOk === 1 ? "operativo" : "operativos"
        } pendientes, una por funcionario.${
          borradoresTotales > 0
            ? ` ${borradoresTotales} ${
                borradoresTotales === 1 ? "hoja quedó" : "hojas quedaron"
              } en borrador por datos faltantes.`
            : ""
        }`,
        textoPrincipal: "Aceptar",
      });
    } else {
      // Emisión PARCIAL: no es un error (lo emitido quedó emitido), es una advertencia. El detalle
      // —cuáles y con su botón de reenviar— vive en el panel «Órdenes no generadas».
      void mensaje.advertencia({
        titulo: "Emisión parcial",
        mensaje: `Se emitieron ${operativosOk} de ${pendientes.length} operativos. Las ${noGeneradas.length} no generadas aparecen abajo para revisarlas y reenviarlas.`,
      });
    }
  }, [pendientes, seleccionado]);

  /** Reenvía SOLO la orden de un operativo que falló; si sale, desaparece de la lista. */
  const reintentar = useCallback(
    async (operativo: OperativoEmisible) => {
      setReintentandoId(operativo.id);

      try {
        const nuevas = await DocumentoService.emitirOrdenes(operativo.id);
        setFallidas((actuales) =>
          actuales.filter((otro) => otro.id !== operativo.id),
        );
        setOrdenesPorOperativo((previo) => ({
          ...previo,
          [operativo.id]: nuevas,
        }));
        // Si es el que está abierto en la vista previa, se refleja lo recién emitido.
        if (seleccionado?.id === operativo.id) setEmitidas(nuevas);
        setResaltadoId(operativo.id);
        toast.exito(
          `Se emitió la orden de ${operativo.identificador}, una por funcionario.`,
        );
      } catch (fallo: unknown) {
        void mensaje.errorDe(fallo, {
          titulo: `No se pudo emitir ${operativo.identificador}`,
        });
      } finally {
        setReintentandoId(null);
      }
    },
    [seleccionado],
  );

  const cabecera = matriz?.cabecera;
  const estado = cabecera ? nombreEstadoCuadro[cabecera.estado] : null;

  // EDITAR PLANTILLA: vista a pantalla completa DENTRO del layout (ya no un modal). Reemplaza la
  // página mientras se edita; «← Órdenes de servicio» vuelve (con confirmación si hay cambios).
  if (plantillaAbierta) {
    return (
      <section className="app-page-shell">
        <EditorPlantillaOrden
          onVolver={() => {
            setPlantillaAbierta(false);
            // H35: guardar la plantilla pudo promover borradores en el servidor; se re-piden las
            // órdenes de la jornada y las del operativo abierto para no mostrar faltantes viejos.
            setRecargaOrdenes((valor) => valor + 1);
            if (seleccionado) void cargarEmitidas(seleccionado.id);
            // Devuelve el foco al disparador una vez remontada la página (E15).
            requestAnimationFrame(() => editarPlantillaRef.current?.focus());
          }}
        />
      </section>
    );
  }

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-2">
            <p className="page-heading-kicker font-semibold uppercase">
              Dirección
            </p>
            <h1 className="page-heading-title">Órdenes de servicio</h1>
          </div>
          {/*
            «Editar plantilla» abre la plantilla DEL DIRECTOR EN SESIÓN (2026-10-05): cada Director
            tiene la suya y sus órdenes se generan con ella. Vive en el encabezado de la página.
          */}
          <Boton
            ref={editarPlantillaRef}
            variante="secundario"
            tamano="md"
            icono="editar"
            onClick={() => setPlantillaAbierta(true)}
          >
            Editar plantilla
          </Boton>
        </div>

        {/* Punto 5: la plantilla propia tiene datos generales vacíos → no se puede emitir en firme. */}
        {plantillaIncompleta === true && (
          <AvisoEnLinea
            variante="advertencia"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => setPlantillaAbierta(true)}>
                Editar plantilla
              </Boton>
            }
          >
            Completa los datos de tu plantilla para emitir órdenes.
          </AvisoEnLinea>
        )}

        {cabecera && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-ghost badge-sm">
              {cabecera.ordenTrabajo}
            </span>
            <span className="badge badge-ghost badge-sm">
              {conDiaYMesEnMayuscula(cabecera.fechaNatural)}
            </span>
            <span className={`badge badge-sm ${colorEstado(estado ?? "")}`}>
              {estado}
            </span>
          </div>
        )}

        <div className="form-control w-fit">
          <label
            className="label"
            htmlFor="fechaOrdenes"
          >
            <span className="text-app-label text-xs uppercase tracking-[0.12em]">
              Fecha del cuadro
            </span>
          </label>
          <input
            id="fechaOrdenes"
            type="date"
            className="input input-bordered input-sm"
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
          />
        </div>
      </header>

      {sinJornada && (
        <AvisoEnLinea variante="info">
          No hay una jornada abierta para el {fecha}. El administrador debe
          abrir el cuadro del día.
        </AvisoEnLinea>
      )}

      {/*
        El flujo aprobado es cerrar el cuadro y después emitir (FASE5 §6.1 y §7). Mientras
        no esté cerrado se explica, y los botones quedan deshabilitados con el motivo.
      */}
      {matriz && !cuadroCerrado && (
        <AvisoEnLinea variante="advertencia">
          El cuadro del {fecha} todavía está {estado?.toLowerCase()}. Las
          órdenes se emiten una vez cerrado, desde la Matriz Consolidada.
        </AvisoEnLinea>
      )}

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudo cargar la jornada"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      {/*
        EL ADICIONAL, EN EL CAJÓN ÚNICO (2026-10-08). Hasta entonces se insertaba aquí, encima de la
        tabla, y la empujaba hacia abajo. Ahora es `DrawerOperativo` en modo «adicional», el mismo que Mis
        operativos: la tabla no se mueve y el cajón se cierra con ✕, Cancelar, Escape o el velo.

        SE DICE QUE ESTO ES UNA EXCEPCIÓN, y se dice antes de capturar: escribir sobre un cuadro
        que ya se cerró y se distribuyó no puede parecer rutinario. RN-58 lo admite porque quien lo
        hace es la Dirección; el aviso va al principio del cuerpo del cajón.
      */}
      {creandoAdicional && (
        <DrawerOperativo
          modo="adicional"
          key={creandoAdicional.id}
          errorServidor={errorAdicional}
          onCerrar={cerrarAdicional}
          avisoContexto={
            cuadroCerrado ? (
              <AvisoEnLinea variante="advertencia">
                El cuadro del {fecha} está <strong>cerrado</strong> y su matriz ya
                se consolidó. Un adicional dispuesto ahora se suma a la jornada
                bajo su autorización (RN-58), queda registrado en la auditoría, y
                la matriz que ya se distribuyó dejará de coincidir: vuelva a
                descargarla al terminar.
              </AvisoEnLinea>
            ) : null
          }
          origen={creandoAdicional}
          catalogos={catalogos.catalogos}
          puntos={catalogos.puntos}
          cargandoPuntos={catalogos.cargandoPuntos}
          onZonalesElegidas={(zonalesIds) => {
            void catalogos.cargarPuntosDeZonales(zonalesIds);
          }}
          candidatos={candidatos}
          cargandoPersonal={cargandoPersonal}
          personalAgregado={personalAdicional}
          // Sin llamada al servidor: el adicional todavía no existe. Entran con él.
          onAgregarPersona={(persona) =>
            setPersonalAdicional((actuales) =>
              actuales.some(
                (agregada) => agregada.funcionarioId === persona.id,
              )
                ? actuales
                : [
                    ...actuales,
                    {
                      funcionarioId: persona.id,
                      nombre: nombreDePersona(persona),
                      // RN-34: el teléfono lo resuelve el servidor al asignar.
                      telefono: null,
                      // DEFAULT-FROM-FIRST (RN-66): el horario arranca copiando el de la
                      // primera persona; la primera queda vacía y hay que llenarla.
                      ...turnoDePrimera(actuales),
                    },
                  ],
            )
          }
          onRetirarPersona={(funcionarioId) =>
            setPersonalAdicional((actuales) =>
              actuales.filter(
                (agregada) => agregada.funcionarioId !== funcionarioId,
              ),
            )
          }
          onCambiarHorarioPersona={cambiarHorarioAdicional}
          avisoPersonal={avisoPersonal}
          // La Dirección no la bloquea el cuadro cerrado: es su autorización.
          bloqueado={false}
          ventanaCerrada={false}
          guardando={emitiendo}
          onGuardar={guardarAdicional}
        />
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
              Operativos de la jornada
            </h2>
            {operativos.length > 0 && (
              <span className="text-xs text-app-muted">
                {conOrdenes} de {operativos.length} con todas sus órdenes
                vigentes
              </span>
            )}
            {partesCabecera.length > 0 && (
              <div
                className="flex flex-wrap gap-1"
                aria-label="Resumen de la jornada por estado"
              >
                {partesCabecera.map((parte) => (
                  <span
                    key={parte.clave}
                    className={`badge badge-sm whitespace-nowrap ${parte.clase}`}
                  >
                    {parte.texto}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/*
            EMITIR PENDIENTES. Abarca solo los operativos emisibles SIN órdenes vigentes; se OCULTA
            cuando no queda ninguno (N=0). Emite de uno en uno (no hay endpoint masivo).
          */}
          {pendientes.length > 0 && (
            <Boton
              variante="primario"
              tamano="md"
              enBarraOscura
              cargando={emitiendo}
              title={`Emitir las órdenes de los ${pendientes.length} operativos pendientes.`}
              onClick={() => setConfirmandoTodas(true)}
            >
              {emitiendo ? "Emitiendo…" : `Emitir pendientes (${pendientes.length})`}
            </Boton>
          )}
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-app-label">
                  <th scope="col">Identificador</th>
                  <th scope="col">Formulario</th>
                  <th scope="col">Horario</th>
                  <th scope="col">Personal</th>
                  <th scope="col">Órdenes</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {operativos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-sm text-app-muted"
                    >
                      {cargando
                        ? "Cargando la jornada…"
                        : "No hay operativos registrados en esta fecha."}
                    </td>
                  </tr>
                ) : (
                  operativos.map((operativo) => {
                    const motivo = motivoParaNoEmitir(operativo, cuadroCerrado);
                    const emitido = estaEmitido(operativo);
                    const hojas = operativo.personal.length;
                    // ESTADO ÚNICO por operativo: la MISMA función que pinta el chip del panel
                    // (nunca «0 vigente» ni «0 borrador»; las reemplazadas no cuentan).
                    const resumen = resumenEstado(vigentesDe(operativo.id), hojas);
                    const abierta = operativo.id === seleccionado?.id;

                    return (
                      <tr
                        key={operativo.id}
                        // La fila abierta se resalta: fondo azul claro + borde izquierdo (regla 6).
                        // El adicional recién registrado se resalta unos segundos (`bg-primary/10`).
                        data-resaltado={
                          operativo.id === resaltadoId || undefined
                        }
                        className={
                          abierta
                            ? "border-l-4 border-primary bg-primary/5"
                            : operativo.id === resaltadoId
                              ? "bg-primary/10 transition-colors"
                              : "transition-colors hover:bg-primary/5"
                        }
                      >
                        <td className="px-3 py-1 align-top">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <span className="font-medium">
                              {operativo.identificador}
                            </span>
                            {/* «Adicional» es un chip junto al identificador (regla 6). */}
                            {operativo.origen && (
                              <span className="badge badge-outline badge-xs whitespace-nowrap">
                                Adicional de {operativo.origen}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1 align-top">
                          {operativo.formulario}
                        </td>
                        <td className="px-3 py-1 align-top">
                          {operativo.horario}
                        </td>
                        <td className="px-3 py-1 align-top">
                          {hojas > 0
                            ? operativo.personal.join(", ")
                            : "Sin personal"}
                        </td>
                        <td className="px-3 py-1 align-top">
                          <span
                            className={`badge badge-sm whitespace-nowrap ${resumen.clase}`}
                          >
                            {resumen.texto}
                          </span>
                        </td>
                        <td className="px-3 py-1 align-top">
                          {/*
                            UN SOLO BOTÓN: «Mostrando» (fila abierta, cierra al pulsar), «Ver
                            órdenes» (ya emitida) o «Revisar y emitir» (pendiente, deshabilitado con
                            su motivo en el `title`, regla 6).
                          */}
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <Boton
                            variante={abierta || emitido ? "secundario" : "primario"}
                            tamano="sm"
                            onClick={() =>
                              abierta ? setSeleccionado(null) : elegir(operativo)
                            }
                            deshabilitado={emitiendo}
                            motivoDeshabilitado={!abierta && !emitido ? motivo : null}
                          >
                            {abierta
                              ? "Mostrando"
                              : emitido
                                ? "Ver órdenes"
                                : "Revisar y emitir"}
                          </Boton>
                          {/*
                            «+ ADICIONAL» · LA URGENCIA (2026-08-20; a la columna Acción el 2026-10-08,
                            junto a «Ver órdenes», como en Mis operativos). Abre el cajón del
                            adicional. Se ofrece aunque el cuadro esté cerrado (RN-58, es la
                            Dirección); NO sobre un adicional ni en formularios que no los admiten
                            (RN-61, dato del servidor). NO se deshabilita mientras carga el
                            operativo: un botón deshabilitado pierde el foco, y al cerrar el cajón
                            el foco tiene que volver aquí; el doble clic lo frena `abrirAdicional`.
                          */}
                          {!operativo.esAdicional &&
                            operativo.admiteAdicionales && (
                              <Boton
                                variante="acento"
                                tamano="sm"
                                icono="agregar"
                                onClick={() => void abrirAdicional(operativo.id)}
                                deshabilitado={emitiendo}
                                aria-busy={abriendoAdicional || undefined}
                                title={`Registrar un operativo adicional a partir de ${operativo.identificador}`}
                              >
                                Adicional
                              </Boton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/*
        ÓRDENES NO GENERADAS. Aparece solo si alguna falló al emitir en bloque. Cada una lleva
        su mensaje «Orden no generada» —texto, no solo color (regla 6)— y un botón para
        REENVIAR solo esa; al salir bien, desaparece de la lista.
      */}
      {fallidas.length > 0 && (
        <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
          <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
              Órdenes no generadas ({fallidas.length})
            </h2>
          </div>

          <div className="app-data-panel-body flex flex-col gap-2 px-2 pb-4 pt-2 md:px-4">
            {fallidas.map((operativo) => (
              <div
                key={operativo.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-base-300 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {operativo.identificador}
                    </span>
                    <span className="badge badge-error badge-sm">
                      Orden no generada
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-app-muted">
                    {operativo.formulario}
                  </p>
                </div>

                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono="actualizar"
                  cargando={reintentandoId === operativo.id}
                  deshabilitado={reintentandoId !== null || emitiendo}
                  onClick={() => void reintentar(operativo)}
                >
                  {reintentandoId === operativo.id ? "Reenviando…" : "Reintentar"}
                </Boton>
              </div>
            ))}
          </div>
        </div>
      )}

      {seleccionado && (
        <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
          <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
                Órdenes de {seleccionado.identificador}
              </h2>
              {/*
                RESUMEN DE ESTADO (A2): la MISMA función `resumenEstado` que pinta la columna de la
                tabla, así el chip del panel y la fila nunca se contradicen. `total` es cuántas hojas
                debería tener el operativo (una por persona). Una reemisión deja la anterior
                «Reemplazada» y esa ya no cuenta aquí.
              */}
              {(() => {
                const resumen = resumenEstado(
                  emitidas,
                  seleccionado.personal.length,
                );
                return (
                  <span
                    className={`badge badge-sm whitespace-nowrap ${resumen.clase}`}
                  >
                    {resumen.texto}
                  </span>
                );
              })()}
            </div>
            {/* El panel se cierra con la fila «Mostrando» o al abrir otra: ya no hay botón «Cerrar». */}
            {/* Regla 6: apagado CON su motivo. Solo el Director que generó las órdenes las reemite. */}
            <Boton
              variante="primario"
              tamano="md"
              enBarraOscura
              onClick={() => setConfirmando(true)}
              cargando={emitiendo}
              motivoDeshabilitado={
                reemisionAjena ??
                (cuadroCerrado ? null : "Disponible cuando el cuadro esté cerrado.")
              }
            >
              {emitidas.length > 0
                ? "Reemitir órdenes"
                : `Emitir órdenes (${seleccionado.personal.length})`}
            </Boton>
          </div>

          <div className="app-data-panel-body flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6">
            {/*
              «Consultando…» SOLO en la primera carga (aún sin emitidas). En un REFRESCO in-situ
              —tras completar datos/configuración/perfil desde el visor— se mantiene montado
              `VistaPreviaOrden` con los datos actuales, para que el cajón del visor NO se cierre.
            */}
            {cargandoEmitidas && emitidas.length === 0 ? (
              <span className="badge badge-ghost badge-sm">
                Consultando lo emitido…
              </span>
            ) : emitidas.length > 0 ? (
              <VistaPreviaOrden
                ordenes={emitidas}
                onEditarPlantilla={() => setPlantillaAbierta(true)}
              />
            ) : (
              <p className="text-sm text-app-muted">
                Aún no se emiten las órdenes de este operativo. Se emitirá una
                por cada una de las {seleccionado.personal.length} personas
                asignadas, y cada hoja contendrá únicamente horario, funcionario,
                conductor y placa.
              </p>
            )}
          </div>
        </div>
      )}

      <MensajeModal
        abierto={confirmando}
        variante="advertencia"
        titulo={
          emitidas.length > 0
            ? "¿Reemitir las órdenes?"
            : "¿Emitir las órdenes de servicio?"
        }
        mensaje={
          seleccionado
            ? emitidas.length > 0
              ? "Se genera una versión nueva con la plantilla y los datos actuales. La anterior queda como «Reemplazada»."
              : `Se emitirá una orden por cada una de las ${seleccionado.personal.length} personas de ${seleccionado.identificador}.`
            : ""
        }
        textoPrincipal={emitidas.length > 0 ? "Sí, reemitir" : "Sí, emitir"}
        tituloError="No se pudieron emitir las órdenes"
        onPrincipal={emitir}
        onSecundario={() => setConfirmando(false)}
      />

      <MensajeModal
        abierto={confirmandoTodas}
        variante="advertencia"
        titulo="¿Emitir las órdenes pendientes?"
        mensaje={`Se emitirán las órdenes de ${pendientes.length} ${
          pendientes.length === 1 ? "operativo" : "operativos"
        } pendientes, una por cada funcionario asignado.`}
        textoPrincipal="Sí, emitir pendientes"
        onPrincipal={emitirPendientes}
        onSecundario={() => setConfirmandoTodas(false)}
      />
    </section>
  );
};

export default OrdenesServicioPage;
