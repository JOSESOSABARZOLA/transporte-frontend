/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: DrawerCandidatos.tsx
 * Responsabilidad: Asignar, cambiar o quitar el conductor de UN operativo, eligiendo entre los
 *                  conductores sugeridos con su motivo en palabras.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA LISTA Y SU ORDEN SON DEL SERVIDOR (`GET /transporte/candidatos/:operativoId`): disponibles,
 * fuera de turno, no disponibles y, al final, el asignado actual. Cada fila dice POR QUÉ con la
 * frase del servidor tal cual (regla 7) y su botón lo dice otra vez (regla 6):
 *
 *   · Disponible        → «Asignar» (primario).
 *   · Fuera de turno    → «Asignar igual» (ámbar): se puede, y el aviso queda en su carril.
 *   · Ocupado / de libre sin activar → «No disponible», deshabilitado. Con «Usar conductores de
 *     libre» activa, el de libre ofrece «Activar y asignar» (exige el motivo de las horas extra).
 *
 * Asignar va por `POST /transporte/tramos/asignar` (el mismo que reasigna un operativo ya cubierto);
 * quitar, por un `DELETE` por cada tramo con conductor. Propios medios y pedir priorización se
 * conservan como acciones secundarias, en el pie.
 *
 * CAJÓN ESTÁNDAR (2026-10-16, mensajes estándar). Era un `MarcoModal`; es un `DrawerLateral` `lg` en
 * modo lectura —cada fila actúa por sí sola, no hay un «Guardar»—: «Asignación actual» y
 * «Conductores sugeridos» en secciones, el error del servidor con sus motivos sobre el pie y
 * «Quitar asignación» confirmado con `MensajeModal` peligro (si el servidor rechaza, el error queda
 * en ese mismo modal). Mientras una acción corre, el cajón no se cierra.
 *
 * LA PLACA SE PUEDE CAMBIAR (sustitución de flota, 2026-10-15). Cada candidato asignable trae la
 * placa que propone el servidor; «Cambiar vehículo» pide, SOLO para ese candidato,
 * `POST /transporte/evaluar/vehiculos` y abre un desplegable con la flota del día evaluada para
 * él: las placas que darían 409 van deshabilitadas con su motivo en la opción («— en taller»,
 * «— ocupada por …»), las de aviso se eligen y el aviso se lee debajo. Se envía la elegida; «Sin
 * vehículo» manda `null` y el mensaje lo dice («falta la placa»). La DAF sigue escribiendo solo
 * conductor y placa (RN-40).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, type FC } from "react";

import Boton from "../../common/Boton.tsx";
import DrawerLateral from "../../common/DrawerLateral.tsx";
import Insignia from "../../common/Insignia.tsx";
import MensajeModal from "../../common/MensajeModal.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import type {
  AnfitrionCompartible,
  Candidato,
  EvaluacionDeVehiculos,
  OperativoJornada,
  RespuestaCandidatos,
  RespuestaCompartibles,
} from "../../../interfaces/JornadaDaf.ts";
import { JornadaDafService } from "../../../services/jornadaDaf.service.ts";
import { PlanificacionService } from "../../../services/planificacion.service.ts";
import { TransporteService } from "../../../services/transporte.service.ts";
import {
  motivosDelServidor,
  presentarError,
} from "../../../utils/errorApi.util.ts";
import {
  franja,
  motivoPlacaNoElegible,
  textoConductor,
  textoOpcionVehiculo,
} from "../../../utils/planificarDia.util.ts";
import { nombreTipoTransporte } from "../../../utils/tipoTransporte.util.ts";
import {
  accionCompartir,
  detalleMismaUnidad,
  intencionParaLaDaf,
  textoAsientos,
} from "../../../utils/compartirUnidad.util.ts";
import { toast } from "../../../utils/mensaje.ts";

type DrawerCandidatosProps = {
  fecha: string;
  operativo: OperativoJornada;
  soloLectura: boolean;
  motivoBloqueo: string | null;
  /** Con «Usar conductores de libre» activa, un libre se puede activar (con motivo) y asignar. */
  usarLibres: boolean;
  /**
   * Compartir unidad (2026-10-19): los operativos que viajan en la unidad de ÉSTE. Quitar su
   * asignación los deja sin conductor, y la confirmación lo dice.
   */
  invitados?: string[];
  onCerrar: () => void;
  /** Tras asignar, quitar o declarar: la pantalla vuelve a leer la jornada. */
  onHecho: (mensaje: string) => void;
};

/**
 * La categoría en un distintivo con su nombre (regla 6). El color va en el distintivo, que tiene
 * contraste verificado (docs/estilos.md); el motivo, en texto pleno o secundario.
 */
const CATEGORIA: Record<Candidato["categoria"], { texto: string; distintivo: string; motivo: string }> = {
  DISPONIBLE: { texto: "Disponible", distintivo: "badge-success", motivo: "text-app-strong" },
  COMPARTE: { texto: "Misma unidad", distintivo: "app-insignia-suave", motivo: "text-app-strong" },
  FUERA_TURNO: { texto: "Fuera de turno", distintivo: "badge-warning", motivo: "text-app-strong" },
  OCUPADO: { texto: "No disponible", distintivo: "badge-ghost", motivo: "text-app-muted" },
  LIBRE_INACTIVO: { texto: "De libre", distintivo: "badge-ghost", motivo: "text-app-muted" },
};

const DrawerCandidatos: FC<DrawerCandidatosProps> = ({
  fecha,
  operativo,
  soloLectura,
  motivoBloqueo,
  usarLibres,
  invitados = [],
  onCerrar,
  onHecho,
}) => {
  const [datos, setDatos] = useState<RespuestaCandidatos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<{ texto: string; motivos: string[] } | null>(null);
  /** El libre que se está por activar, y el motivo que exige la activación (horas extra). */
  const [activando, setActivando] = useState<number | null>(null);
  const [motivoActivacion, setMotivoActivacion] = useState("");
  /** Las placas evaluadas por candidato: se piden solo al pulsar «Cambiar vehículo». */
  const [placas, setPlacas] = useState<
    Record<number, EvaluacionDeVehiculos | "cargando" | { error: string }>
  >({});
  /** La placa elegida por candidato, si cambió la propuesta (`null` = sin vehículo). */
  const [elegidas, setElegidas] = useState<Record<number, number | null>>({});
  /** «Quitar asignación» pidió confirmar. */
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);
  /**
   * COMPARTIR UNIDAD (2026-10-19): con qué operativos ya asignados puede viajar éste. Si la
   * consulta falla, la sección no aparece y el resto del cajón funciona igual.
   */
  const [compartibles, setCompartibles] = useState<RespuestaCompartibles | null>(null);
  /** Lo que avisó el servidor al quitar (invitados que quedaron sin conductor). */
  const avisosAlQuitar = useRef<string[]>([]);

  useEffect(() => {
    let vigente = true;
    PlanificacionService.compartibles(operativo.id)
      .then((respuesta) => {
        if (vigente) setCompartibles(respuesta);
      })
      .catch(() => {
        // Silencioso: sin la lista no se ofrece compartir; asignar sigue disponible.
      });
    return () => {
      vigente = false;
    };
  }, [operativo.id]);

  useEffect(() => {
    let vigente = true;
    JornadaDafService.candidatos(fecha, operativo.id)
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((fallo: unknown) => {
        if (vigente) setError({ texto: presentarError(fallo).mensaje, motivos: [] });
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [fecha, operativo.id]);

  const ejecutar = async (accion: () => Promise<string>) => {
    setTrabajando(true);
    setError(null);
    try {
      onHecho(await accion());
    } catch (fallo: unknown) {
      setError({ texto: presentarError(fallo).mensaje, motivos: motivosDelServidor(fallo) });
    } finally {
      setTrabajando(false);
    }
  };

  /** La placa con la que se asigna: la elegida o, si no se cambió, la propuesta. */
  const vehiculoDe = (candidato: Candidato): number | null =>
    candidato.conductorId in elegidas ? elegidas[candidato.conductorId] : candidato.vehiculoId;

  const cambiarVehiculo = (candidato: Candidato) => {
    const id = candidato.conductorId;
    setPlacas((antes) => ({ ...antes, [id]: "cargando" }));
    PlanificacionService.evaluarVehiculos({
      fecha,
      operativoIds: [operativo.id],
      conductorId: id,
    })
      .then((evaluacion) => setPlacas((antes) => ({ ...antes, [id]: evaluacion })))
      .catch((fallo: unknown) =>
        setPlacas((antes) => ({ ...antes, [id]: { error: presentarError(fallo).mensaje } })),
      );
  };

  /** Sin placa, el mensaje dice que falta: el operativo sigue pendiente hasta tenerla. */
  const sinPlaca = (candidato: Candidato): string =>
    vehiculoDe(candidato) === null ? " sin vehículo: falta la placa" : "";

  const asignar = (candidato: Candidato) =>
    void ejecutar(async () => {
      await PlanificacionService.asignar({
        fecha,
        operativoIds: [operativo.id],
        conductorId: candidato.conductorId,
        vehiculoId: vehiculoDe(candidato),
      });
      return `${operativo.identificador} asignado a ${candidato.nombre}${sinPlaca(candidato)}.`;
    });

  /** Activar a un libre (horas extra, con su motivo) y asignarle el operativo. */
  const activarYAsignar = (candidato: Candidato) =>
    void ejecutar(async () => {
      await PlanificacionService.activar(fecha, candidato.conductorId, motivoActivacion.trim());
      await PlanificacionService.asignar({
        fecha,
        operativoIds: [operativo.id],
        conductorId: candidato.conductorId,
        vehiculoId: vehiculoDe(candidato),
      });
      return `${candidato.nombre} queda activado (horas extra) y asignado a ${operativo.identificador}${sinPlaca(candidato)}.`;
    });

  /**
   * Lo corre la confirmación: si el servidor rechaza, lanza y el error queda en el mismo modal. Al
   * terminar, `onHecho` cierra el cajón con su aviso.
   */
  const quitar = async () => {
    avisosAlQuitar.current = [];
    for (const tramo of operativo.tramos.filter((t) => t.conductorId !== null)) {
      const { aviso } = await PlanificacionService.quitar(tramo.id);
      if (aviso) avisosAlQuitar.current.push(aviso);
    }
  };

  /** Viajar en la unidad de un operativo ya asignado: mismo conductor y misma placa (RN-40). */
  const compartirCon = (anfitrion: AnfitrionCompartible) =>
    void ejecutar(async () => {
      const { compartidoCon, aviso } = await PlanificacionService.compartir(
        operativo.id,
        anfitrion.operativoId,
      );
      // «La misma unidad» (2026-10-19): si un traslado propio quedó pendiente, se dice aparte.
      if (aviso) toast.advertencia("Falta un traslado por asignar", { texto: aviso });
      return `${operativo.identificador} comparte la unidad de ${compartidoCon.identificador} (${anfitrion.conductor.nombre} · ${anfitrion.vehiculo.placa}).`;
    });

  /**
   * «Comparte unidad con X» (2026-10-21): el conductor ya lleva un traslado con el que este operativo
   * viaja en su misma unidad. Es la misma acción de la sección «Compartir unidad».
   */
  const compartirDesdeCandidato = (candidato: Candidato) => {
    const con = candidato.compartirCon;
    if (!con) return;
    const anfitrion = compartibles?.anfitriones.find((a) => a.operativoId === con.operativoId);
    if (anfitrion) {
      compartirCon(anfitrion);
      return;
    }
    void ejecutar(async () => {
      const { compartidoCon, aviso } = await PlanificacionService.compartir(
        operativo.id,
        con.operativoId,
      );
      if (aviso) toast.advertencia("Falta un traslado por asignar", { texto: aviso });
      return `${operativo.identificador} comparte la unidad de ${compartidoCon.identificador} (${candidato.nombre}${candidato.placa ? ` · ${candidato.placa}` : ""}).`;
    });
  };

  const propiosMedios = () =>
    void ejecutar(async () => {
      const resultado = await TransporteService.declararPropiosMedios(operativo.id);
      return `${resultado.identificador} se cubrirá por propios medios.`;
    });

  const priorizar = () =>
    void ejecutar(async () => {
      const solicitud = await PlanificacionService.pedirPriorizacion(operativo.id);
      return `Solicitud de priorización enviada a ${solicitud.rolRequerido}${
        solicitud.creada ? "" : " (ya estaba abierta)"
      }.`;
    });

  const bloqueo = soloLectura
    ? (motivoBloqueo ?? "La ventana de asignación no está abierta")
    : undefined;
  const actual = datos?.actual ?? null;
  const subtitulo = [
    operativo.formulario,
    franja(operativo.horaInicio, operativo.horaFin),
    operativo.zonal,
    nombreTipoTransporte(operativo.tipoTransporte),
    operativo.esMacrooperativo ? "Macrooperativo (vehículo exclusivo)" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  /** «Cambiar vehículo» y, una vez pedidas, las placas del día evaluadas para ese candidato. */
  const selectorVehiculo = (candidato: Candidato) => {
    const puedeCambiar =
      !candidato.actual &&
      !soloLectura &&
      (candidato.asignable || (candidato.categoria === "LIBRE_INACTIVO" && usarLibres));
    if (!puedeCambiar) return null;
    const estado = placas[candidato.conductorId];
    if (estado === undefined) {
      return (
        <Boton
          variante="enlace"
          tamano="sm"
          className="self-start"
          deshabilitado={trabajando}
          onClick={() => cambiarVehiculo(candidato)}
          aria-label={`Cambiar vehículo de ${candidato.nombre}`}
        >
          Cambiar vehículo
        </Boton>
      );
    }
    if (estado === "cargando") {
      return (
        <span className="text-xs text-app-muted" role="status">
          Buscando vehículos…
        </span>
      );
    }
    if ("error" in estado) {
      return (
        <span className="text-xs text-error" role="alert">
          {estado.error}
        </span>
      );
    }
    const elegidoId = vehiculoDe(candidato);
    const elegido = estado.vehiculos.find((v) => v.vehiculoId === elegidoId) ?? null;
    const avisos = (elegido?.motivos ?? []).filter((m) => m.tipo === "AVISO");
    const idSelect = `vehiculo-candidato-${candidato.conductorId}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={idSelect} className="text-xs text-app-label">
          Vehículo de {candidato.nombre}
        </label>
        <select
          id={idSelect}
          className="select select-bordered select-sm w-full sm:w-80"
          value={elegidoId === null ? "" : String(elegidoId)}
          disabled={trabajando}
          onChange={(evento) =>
            setElegidas((antes) => ({
              ...antes,
              [candidato.conductorId]:
                evento.target.value === "" ? null : Number(evento.target.value),
            }))
          }
        >
          <option value="">Sin vehículo (falta la placa)</option>
          {estado.vehiculos.map((vehiculo) => (
            <option
              key={vehiculo.vehiculoId}
              value={vehiculo.vehiculoId}
              disabled={motivoPlacaNoElegible(vehiculo) !== null}
            >
              {textoOpcionVehiculo(vehiculo)}
              {vehiculo.propuesto ? " · propuesta" : ""}
            </option>
          ))}
        </select>
        {elegidoId === null && (
          <span className="text-xs text-app-muted">
            ⚠ Sin vehículo: el operativo sigue pendiente hasta tener placa.
          </span>
        )}
        {avisos.map((aviso) => (
          <span key={aviso.codigo} className="text-xs text-app-muted">
            ⚠ {aviso.mensaje}
          </span>
        ))}
      </div>
    );
  };

  const boton = (candidato: Candidato) => {
    if (candidato.actual) {
      return <span className="badge badge-ghost badge-sm">Asignado hoy</span>;
    }
    if (candidato.categoria === "LIBRE_INACTIVO" && usarLibres && !soloLectura) {
      return (
        <Boton
          variante="acento"
          tamano="sm"
          deshabilitado={trabajando}
          onClick={() => {
            setActivando(candidato.conductorId);
            setMotivoActivacion("");
          }}
        >
          Activar y asignar
        </Boton>
      );
    }
    if (candidato.categoria === "COMPARTE" && candidato.compartirCon) {
      return (
        <Boton
          variante="acento"
          tamano="sm"
          deshabilitado={trabajando}
          motivoDeshabilitado={bloqueo}
          onClick={() => compartirDesdeCandidato(candidato)}
          aria-label={`Compartir unidad con ${candidato.compartirCon.identificador} (${candidato.nombre})`}
        >
          Compartir unidad
        </Boton>
      );
    }
    // Quien no puede tomarlo se MUESTRA apagado y con su motivo (regla 14), no con un rótulo
    // «No disponible» que repetía en gris lo que ya dice la línea del motivo.
    if (!candidato.asignable) {
      return (
        <Boton
          variante="acento"
          tamano="sm"
          motivoDeshabilitado={candidato.motivo || "No disponible para este operativo."}
          aria-label={`Asignar a ${candidato.nombre}`}
        >
          Asignar
        </Boton>
      );
    }
    const fuera = candidato.categoria === "FUERA_TURNO";
    return (
      <Boton
        variante="acento"
        tamano="sm"
        deshabilitado={trabajando}
        motivoDeshabilitado={bloqueo}
        onClick={() => asignar(candidato)}
        aria-label={`${fuera ? "Asignar igual" : "Asignar"} a ${candidato.nombre}`}
      >
        {fuera ? "Asignar igual" : "Asignar"}
      </Boton>
    );
  };

  return (
    <DrawerLateral
      abierto
      titulo={`${actual ? "Cambiar" : "Asignar"} conductor · ${operativo.identificador}`}
      subtitulo={subtitulo}
      // Compartir unidad (2026-10-19): lo que pidió quien registró, para que la DAF lo vea.
      ayuda={intencionParaLaDaf(operativo) ?? undefined}
      ancho="lg"
      modo="lectura"
      guardando={trabajando}
      onCerrar={onCerrar}
      errorServidor={
        error && (
          <div className="flex flex-col gap-1">
            <span>{error.texto}</span>
            {error.motivos.map((motivo) => (
              <span key={motivo} className="text-xs">
                ✕ {motivo}
              </span>
            ))}
          </div>
        )
      }
      accionesPie={
        !actual && (
          <>
            <Boton
              tamano="lg"
              deshabilitado={trabajando}
              motivoDeshabilitado={bloqueo}
              onClick={propiosMedios}
            >
              Propios medios
            </Boton>
            <Boton
              tamano="lg"
              deshabilitado={trabajando}
              motivoDeshabilitado={bloqueo}
              onClick={priorizar}
            >
              Pedir priorización
            </Boton>
          </>
        )
      }
    >
      {actual && (
        <SeccionDrawer
          titulo="Asignación actual"
          rejilla={false}
          accion={
            <Boton
              variante="peligro"
              tamano="sm"
              deshabilitado={trabajando}
              motivoDeshabilitado={bloqueo}
              onClick={() => setConfirmandoQuitar(true)}
            >
              Quitar asignación
            </Boton>
          }
        >
          <p className="text-sm text-app-strong">Asignado hoy a {actual.nombre}</p>
        </SeccionDrawer>
      )}

      {!actual && compartibles && compartibles.anfitriones.length > 0 && (
        <SeccionDrawer
          titulo="Compartir unidad"
          descripcion="Operativos ya asignados con los que puede viajar en la misma unidad."
          rejilla={false}
        >
          <ul className="flex flex-col divide-y divide-base-300" aria-label="Compartir unidad">
            {compartibles.anfitriones.map((anfitrion) => (
              <li
                key={anfitrion.operativoId}
                className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`compartible-${anfitrion.operativoId}`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-app-strong">
                      {anfitrion.identificador}
                    </span>
                    {anfitrion.solicitado && (
                      <Insignia variante="suave">Solicitado por el registrante</Insignia>
                    )}
                  </span>
                  <span className="text-xs text-app-muted">
                    {[
                      anfitrion.conductor.nombre,
                      anfitrion.vehiculo.placa,
                      // Los asientos de cada momento de la unidad (2026-10-21).
                      textoAsientos(anfitrion),
                      franja(anfitrion.horaInicio, anfitrion.horaFin),
                    ].join(" · ")}
                  </span>
                  {/* «La misma unidad» (2026-10-19): qué harían juntos y si la unidad hace lo propio. */}
                  {detalleMismaUnidad(anfitrion) && (
                    <span
                      className="text-xs text-app-strong"
                      data-testid={`misma-unidad-${anfitrion.operativoId}`}
                    >
                      {detalleMismaUnidad(anfitrion)}
                    </span>
                  )}
                  {!anfitrion.compatible && anfitrion.motivo && (
                    <span className="text-sm text-app-muted">{anfitrion.motivo}</span>
                  )}
                </div>
                <Boton
                  variante="acento"
                  tamano="sm"
                  deshabilitado={trabajando}
                  motivoDeshabilitado={
                    bloqueo ??
                    (anfitrion.compatible ? null : (anfitrion.motivo ?? "No pueden compartir la unidad."))
                  }
                  onClick={() => compartirCon(anfitrion)}
                  aria-label={`${accionCompartir(anfitrion)} con ${anfitrion.identificador}`}
                >
                  {accionCompartir(anfitrion)}
                </Boton>
              </li>
            ))}
          </ul>
        </SeccionDrawer>
      )}

      <SeccionDrawer
        titulo="Conductores sugeridos"
        descripcion="Los más convenientes primero."
        rejilla={false}
      >
        {cargando && (
          <p className="text-sm text-app-muted" role="status">
            Buscando conductores…
          </p>
        )}
        {datos && datos.candidatos.length === 0 && (
          <p className="text-sm text-app-muted">No hay conductores activos para esta jornada.</p>
        )}
        {datos && datos.candidatos.length > 0 && (
          <ul className="flex flex-col divide-y divide-base-300" aria-label="Conductores sugeridos">
            {datos.candidatos.map((candidato) => (
              <li
                key={candidato.conductorId}
                className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`candidato-${candidato.conductorId}`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-app-strong">{candidato.nombre}</span>
                    <span className={`badge badge-sm ${CATEGORIA[candidato.categoria].distintivo}`}>
                      {CATEGORIA[candidato.categoria].texto}
                    </span>
                  </span>
                  <span className="text-xs text-app-muted">{textoConductor(candidato)}</span>
                  <span className={`text-sm ${CATEGORIA[candidato.categoria].motivo}`}>
                    {candidato.motivo}
                  </span>
                  {candidato.avisos.map((aviso) => (
                    <span key={aviso} className="text-xs text-app-muted">
                      ⚠ {aviso}
                    </span>
                  ))}
                  {selectorVehiculo(candidato)}
                </div>
                {boton(candidato)}
                {activando === candidato.conductorId && (
                  <div className="flex w-full flex-col gap-2 sm:w-72">
                    <label className="flex flex-col gap-1">
                      <span className="label-text">Motivo de la activación (obligatorio)</span>
                      <input
                        type="text"
                        className="input input-bordered input-sm"
                        value={motivoActivacion}
                        maxLength={200}
                        onChange={(e) => setMotivoActivacion(e.target.value)}
                      />
                    </label>
                    <Boton
                      variante="primario"
                      tamano="sm"
                      deshabilitado={trabajando}
                      motivoDeshabilitado={
                        motivoActivacion.trim() === "" ? "Escriba el motivo de la activación." : null
                      }
                      onClick={() => activarYAsignar(candidato)}
                    >
                      Confirmar activación
                    </Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SeccionDrawer>

      {actual && (
        <MensajeModal
          abierto={confirmandoQuitar}
          variante="peligro"
          titulo={`¿Quitar la asignación de ${operativo.identificador}?`}
          mensaje={`${actual.nombre} deja de cubrirlo y el operativo vuelve a quedar sin conductor.${
            invitados.length > 0
              ? ` ${invitados.length === 1 ? "1 operativo que comparte esta unidad quedará" : `${invitados.length} operativos que comparten esta unidad quedarán`} sin conductor: ${invitados.join(", ")}.`
              : ""
          }`}
          textoSecundario="No quitar"
          textoPrincipal="Sí, quitar"
          tituloError="No se pudo quitar la asignación"
          onPrincipal={quitar}
          onSecundario={() => setConfirmandoQuitar(false)}
          onExito={() => {
            setConfirmandoQuitar(false);
            onHecho(
              [`${operativo.identificador} vuelve a quedar sin conductor.`, ...avisosAlQuitar.current].join(
                " ",
              ),
            );
          }}
        />
      )}
    </DrawerLateral>
  );
};

export default DrawerCandidatos;
