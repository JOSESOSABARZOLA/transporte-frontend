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

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormikHelpers } from "formik";

import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import PanelAdicionalOperativo from "../components/cuadro/PanelAdicionalOperativo.tsx";
import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";
import VistaPreviaOrden from "../components/ordenes/VistaPreviaOrden.tsx";
import ModalPlantillaOrden from "../components/ordenes/ModalPlantillaOrden.tsx";
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
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { turnoDePrimera } from "../utils/personal.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import { conDiaYMesEnMayuscula } from "../utils/texto.util.ts";
import {
  motivoParaNoEmitir,
  operativosDeLaMatriz,
  type OperativoEmisible,
} from "../utils/ordenes.util.ts";

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
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

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

  // Los operativos cuya orden NO se generó al emitir en bloque: se muestran para revisarlos y
  // reenviarlos uno a uno. `reintentandoId` es el que se está reenviando en este momento.
  const [fallidas, setFallidas] = useState<OperativoEmisible[]>([]);
  const [reintentandoId, setReintentandoId] = useState<number | null>(null);
  const [emitiendo, setEmitiendo] = useState(false);

  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

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
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
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

  /** Por qué NO se puede emitir en bloque, o `null` si sí. Va en el `title` del botón (regla 6). */
  const motivoNoEmitirTodas = (() => {
    if (operativos.length === 0) return "No hay operativos en la jornada.";
    if (!cuadroCerrado) {
      return "El cuadro del día todavía no está cerrado. Las órdenes se emiten después del cierre.";
    }
    if (emisibles.length === 0) {
      return "Ningún operativo tiene personal asignado: no hay a quién entregar la orden.";
    }
    return null;
  })();

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
  const abrirAdicional = useCallback(async (operativoId: number) => {
    setAbriendoAdicional(true);
    setAvisoPersonal(null);
    setPersonalAdicional([]);

    try {
      setCreandoAdicional(await OperativoService.obtener(operativoId));
      setSeleccionado(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setAbriendoAdicional(false);
    }
  }, []);

  const cerrarAdicional = useCallback(() => {
    setCreandoAdicional(null);
    setPersonalAdicional([]);
  }, []);

  const guardarAdicional = useCallback(
    async (
      valores: ValoresOperativo,
      ayudas: FormikHelpers<ValoresOperativo>,
    ) => {
      if (!creandoAdicional) return;

      setEmitiendo(true);
      setAviso(null);

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

        setExito(
          `Operativo adicional ${adicional.identificador} registrado sobre ${creandoAdicional.identificador}.` +
            (cuadroCerrado
              ? " El cuadro estaba cerrado: queda constancia en la auditoría de que lo dispuso la Dirección. Vuelva a descargar la matriz para que la incluya."
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
      } catch (fallo: unknown) {
        // El panel sigue abierto con lo capturado: un rechazo se corrige y se reintenta
        // sin volver a escribirlo todo, que es lo que importa cuando hay prisa.
        const error = presentarError(fallo);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
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
      setEmitidas(
        await DocumentoService.consultarOrdenesDeOperativo(operativoId),
      );
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
      setAviso(null);
      void cargarEmitidas(operativo.id);
    },
    [cargarEmitidas],
  );

  const emitir = useCallback(async () => {
    if (!seleccionado) return;

    setEmitiendo(true);
    setAviso(null);

    try {
      const nuevas = await DocumentoService.emitirOrdenes(seleccionado.id);
      setEmitidas(nuevas);
      setConfirmando(false);
      setExito(
        `Se emitieron ${nuevas.length} ${
          nuevas.length === 1 ? "orden" : "órdenes"
        } para ${seleccionado.identificador}, una por funcionario.`,
      );
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setConfirmando(false);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
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
  const emitirTodas = useCallback(async () => {
    setConfirmandoTodas(false);
    setEmitiendo(true);
    setAviso(null);
    setFallidas([]);

    let operativosOk = 0;
    let ordenesTotales = 0;
    const noGeneradas: OperativoEmisible[] = [];

    for (const operativo of emisibles) {
      try {
        const nuevas = await DocumentoService.emitirOrdenes(operativo.id);
        operativosOk += 1;
        ordenesTotales += nuevas.length;
      } catch {
        // No se aborta el resto: la que falla se aparta para revisarla y reenviarla.
        noGeneradas.push(operativo);
      }
    }

    setEmitiendo(false);
    setFallidas(noGeneradas);

    // Si hay un operativo abierto en la vista previa, se refresca lo suyo para verlo emitido.
    if (seleccionado) void cargarEmitidas(seleccionado.id);

    if (noGeneradas.length === 0) {
      setExito(
        `Se emitieron ${ordenesTotales} ${
          ordenesTotales === 1 ? "orden" : "órdenes"
        } de ${operativosOk} ${
          operativosOk === 1 ? "operativo" : "operativos"
        } de la jornada, una por funcionario.`,
      );
    } else {
      // El detalle —cuáles y con su botón de reenviar— vive en el panel «Órdenes no generadas».
      setAviso({
        texto: `Se emitieron ${operativosOk} de ${emisibles.length} operativos. Las ${noGeneradas.length} no generadas aparecen abajo para revisarlas y reenviarlas.`,
        clase: claseDeAviso("generico"),
      });
    }
  }, [emisibles, seleccionado, cargarEmitidas]);

  /** Reenvía SOLO la orden de un operativo que falló; si sale, desaparece de la lista. */
  const reintentar = useCallback(
    async (operativo: OperativoEmisible) => {
      setReintentandoId(operativo.id);
      setAviso(null);

      try {
        const nuevas = await DocumentoService.emitirOrdenes(operativo.id);
        setFallidas((actuales) =>
          actuales.filter((otro) => otro.id !== operativo.id),
        );
        // Si es el que está abierto en la vista previa, se refleja lo recién emitido.
        if (seleccionado?.id === operativo.id) setEmitidas(nuevas);
        setExito(
          `Se emitió la orden de ${operativo.identificador}, una por funcionario.`,
        );
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAviso({
          texto: `No se pudo emitir ${operativo.identificador}: ${error.mensaje}`,
          clase: claseDeAviso(error.trato),
        });
      } finally {
        setReintentandoId(null);
      }
    },
    [seleccionado],
  );

  const cabecera = matriz?.cabecera;
  const estado = cabecera ? nombreEstadoCuadro[cabecera.estado] : null;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker font-semibold uppercase">
          Dirección
        </p>
        <h1 className="page-heading-title">
          Órdenes de servicio
        </h1>

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
            <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
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
        <div className="alert alert-info">
          <span>
            No hay una jornada abierta para el {fecha}. El administrador debe
            abrir el cuadro del día.
          </span>
        </div>
      )}

      {/*
        El flujo aprobado es cerrar el cuadro y después emitir (FASE5 §6.1 y §7). Mientras
        no esté cerrado se explica, y los botones quedan deshabilitados con el motivo.
      */}
      {matriz && !cuadroCerrado && (
        <div className="alert alert-warning">
          <span>
            El cuadro del {fecha} todavía está {estado?.toLowerCase()}. Las
            órdenes se emiten una vez cerrado, desde la Matriz Consolidada.
          </span>
        </div>
      )}

      {aviso && (
        <div
          className={`alert ${aviso.clase}`}
          role="alert"
        >
          <span>{aviso.texto}</span>
        </div>
      )}

      {creandoAdicional && (
        <>
          {/*
            SE DICE QUE ESTO ES UNA EXCEPCIÓN, y se dice antes de capturar.

            Escribir sobre un cuadro que ya se cerró y se distribuyó no puede parecer una
            operación rutinaria. RN-58 lo admite porque quien lo hace es la Dirección; que
            la pantalla lo calle enseñaría que el cierre no significa nada.
          */}
          {cuadroCerrado && (
            <div
              className="alert alert-warning"
              role="status"
            >
              <span className="text-sm">
                El cuadro del {fecha} está <strong>cerrado</strong> y su matriz ya
                se consolidó. Un adicional dispuesto ahora se suma a la jornada
                bajo su autorización (RN-58), queda registrado en la auditoría, y
                la matriz que ya se distribuyó dejará de coincidir: vuelva a
                descargarla al terminar.
              </span>
            </div>
          )}

          <PanelAdicionalOperativo
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
            onCancelar={cerrarAdicional}
          />
        </>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Operativos de la jornada
          </h2>

          {/*
            EMITIR TODAS DE UNA VEZ. Abarca solo los operativos EMISIBLES; si no hay ninguno,
            queda deshabilitado con el motivo en el `title` (regla 6), igual que cada fila.
          */}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={motivoNoEmitirTodas !== null || emitiendo}
            title={
              motivoNoEmitirTodas ??
              `Emitir las órdenes de los ${emisibles.length} operativos de la jornada.`
            }
            onClick={() => setConfirmandoTodas(true)}
          >
            {emitiendo ? (
              <>
                <span
                  className="loading loading-spinner loading-sm"
                  aria-hidden="true"
                />
                Emitiendo…
              </>
            ) : (
              `Emitir todas${emisibles.length > 0 ? ` (${emisibles.length})` : ""}`
            )}
          </button>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-base-content/70">
                  <th scope="col">Identificador</th>
                  <th scope="col">Formulario</th>
                  <th scope="col">Horario</th>
                  <th scope="col">Personal</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {operativos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-sm text-base-content/70"
                    >
                      {cargando
                        ? "Cargando la jornada…"
                        : "No hay operativos registrados en esta fecha."}
                    </td>
                  </tr>
                ) : (
                  operativos.map((operativo) => {
                    const motivo = motivoParaNoEmitir(operativo, cuadroCerrado);

                    return (
                      <tr
                        key={operativo.id}
                        className={
                          operativo.id === seleccionado?.id
                            ? "bg-primary/5"
                            : "hover:bg-primary/5"
                        }
                      >
                        <td className="px-3 py-1 align-top">
                          <span className="font-medium">
                            {operativo.identificador}
                          </span>
                          {/* Con palabras, no con el prefijo: el documento tiene dos
                              versiones desde que la Dirección puede añadir sobre lo
                              cerrado, y hay que ver qué se sumó (regla 6). */}
                          {operativo.origen && (
                            <span className="badge badge-outline badge-xs mt-1 block w-fit">
                              Adicional de {operativo.origen}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1 align-top">
                          {operativo.formulario}
                        </td>
                        <td className="px-3 py-1 align-top">
                          {operativo.horario}
                        </td>
                        <td className="px-3 py-1 align-top">
                          {operativo.personal.length > 0
                            ? `${operativo.personal.length} · ${operativo.personal.join(", ")}`
                            : "Sin personal"}
                        </td>
                        <td className="px-3 py-1 align-top">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => elegir(operativo)}
                              /* Caso 4: deshabilitado, con la explicación en el `title`. */
                              disabled={motivo !== null || emitiendo}
                              title={motivo ?? undefined}
                            >
                              Revisar y emitir
                            </button>

                            {/*
                              LA URGENCIA · 2026-08-20.

                              Se ofrece **aunque el cuadro esté cerrado**: es el momento
                              para el que existe. RN-58 exige autorización de la Dirección
                              y ella es quien está en esta pantalla.

                              SOBRE UN ADICIONAL NO SE OFRECE: no se encadenan. El botón
                              desaparece en lugar de aparecer apagado, porque «apagado»
                              insinúa que en otras circunstancias se podría.

                              Y DESDE EL 2026-08-24, TAMPOCO EN LOS FORMULARIOS QUE NO LOS
                              ADMITEN. Un formulario admite adicionales si tiene un prefijo
                              marcado para ellos (RN-61): el **2 · PMO** con `OCAPMO`, y desde
                              el 2026-09-08 el **8 · INSPECCIONES** con `IGA`/`ITA`. El
                              servidor ya lo rechazaba en los demás —«el formulario X no
                              admite operativos adicionales»—, pero la pantalla ofrecía el
                              botón en los nueve y fallaba al pulsarlo. Ofrecer lo que va a
                              fallar enseña a desconfiar de lo que se lee.

                              El dato llega del servidor, no se deduce aquí: cambiar qué
                              formularios los admiten es un `UPDATE`, no un despliegue.
                            */}
                            {!operativo.esAdicional &&
                              operativo.admiteAdicionales && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => void abrirAdicional(operativo.id)}
                                disabled={emitiendo || abriendoAdicional}
                                title="Disponer un operativo adicional por urgencia sobre éste."
                              >
                                Adicional
                              </button>
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
                  <p className="mt-1 text-xs text-base-content/70">
                    {operativo.formulario}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={reintentandoId !== null || emitiendo}
                  onClick={() => void reintentar(operativo)}
                >
                  {reintentandoId === operativo.id ? (
                    <>
                      <span
                        className="loading loading-spinner loading-sm"
                        aria-hidden="true"
                      />
                      Reenviando…
                    </>
                  ) : (
                    "Reintentar"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {seleccionado && (
        <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
          <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
              Órdenes de {seleccionado.identificador}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-sm app-modules-panel-action"
                onClick={() => setPlantillaAbierta(true)}
              >
                Editar plantilla
              </button>
              <button
                type="button"
                className="btn btn-sm app-modules-panel-action"
                onClick={() => setSeleccionado(null)}
                disabled={emitiendo}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-sm app-modules-panel-action"
                onClick={() => setConfirmando(true)}
                disabled={emitiendo || !cuadroCerrado}
              >
                {emitidas.length > 0 ? "Reemitir órdenes" : "Emitir órdenes"}
              </button>
            </div>
          </div>

          <div className="app-data-panel-body flex flex-col gap-4 px-4 pb-4 pt-3 md:px-6">
            {cargandoEmitidas ? (
              <span className="badge badge-ghost badge-sm">
                Consultando lo emitido…
              </span>
            ) : emitidas.length > 0 ? (
              <VistaPreviaOrden ordenes={emitidas} />
            ) : (
              <p className="text-sm text-base-content/70">
                Todavía no se han emitido órdenes para este operativo. Se
                emitirá una por cada una de las {seleccionado.personal.length}{" "}
                personas asignadas, y cada hoja contendrá únicamente horario,
                funcionario, conductor y placa.
              </p>
            )}
          </div>
        </div>
      )}

      {plantillaAbierta && (
        <ModalPlantillaOrden onCerrar={() => setPlantillaAbierta(false)} />
      )}

      <ModalConfirmacion
        abierto={confirmando}
        titulo={
          emitidas.length > 0
            ? "¿Reemitir las órdenes?"
            : "¿Emitir las órdenes de servicio?"
        }
        mensaje={
          seleccionado
            ? `Se emitirá una orden por cada una de las ${seleccionado.personal.length} personas de ${seleccionado.identificador}.${
                emitidas.length > 0
                  ? " Las órdenes anteriores quedarán marcadas como sustituidas; no se borran."
                  : ""
              }`
            : ""
        }
        textoSi={emitidas.length > 0 ? "Sí, reemitir" : "Sí, emitir"}
        textoNo="Cancelar"
        procesando={emitiendo}
        onConfirmar={() => void emitir()}
        onCancelar={() => setConfirmando(false)}
      />

      <ModalConfirmacion
        abierto={confirmandoTodas}
        titulo="¿Emitir todas las órdenes de la jornada?"
        mensaje={`Se emitirán las órdenes de ${emisibles.length} ${
          emisibles.length === 1 ? "operativo" : "operativos"
        } de la jornada, una por cada funcionario asignado. Si alguno ya tenía órdenes, las anteriores quedarán marcadas como sustituidas; no se borran.`}
        textoSi="Sí, emitir todas"
        textoNo="Cancelar"
        procesando={emitiendo}
        onConfirmar={() => void emitirTodas()}
        onCancelar={() => setConfirmandoTodas(false)}
      />

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

export default OrdenesServicioPage;
