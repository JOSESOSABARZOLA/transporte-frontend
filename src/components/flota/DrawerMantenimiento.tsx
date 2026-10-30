/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mantenimiento de vehículos
 * Archivo: DrawerMantenimiento.tsx
 * Responsabilidad: «Programar mantenimiento» de un vehículo desde la pestaña Vehículos de Flota:
 *                  la parada nueva y las paradas que ya tiene. RN-DAF-05.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31 · cajón estándar 2026-10-15 · pestaña Vehículos 2026-10-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DESDE EL 2026-10-20 (plan «flota-mantenimiento-baja», D4) ES UN SOLO CAJÓN `md`, abierto desde la
 * fila del vehículo, que reemplaza a los dos de la página retirada («Ver paradas» y «Registrar
 * parada»):
 *
 *   · Sección «Parada»: Desde*, Hasta* (no anterior a Desde) y Motivo* (`MOTIVOS_PARADA`), con la
 *     ayuda «Durante la parada el vehículo no se ofrecerá en Planificar el día.».
 *   · «Cita en el taller (opcional)», plegada: taller, hora y zonal. Con hora, la cita crea la TAREA
 *     «Llevar a taller» para un conductor (Fase 5); por eso no se retiró.
 *   · Sección «Paradas programadas»: las del vehículo, con su estado y sus acciones (Marcar en
 *     taller / listo, Eliminar con confirmación).
 *
 * VALIDACIONES ANTES DE GUARDAR:
 *   · Un cruce con otra parada del mismo vehículo se dice en rojo («Se cruza con la parada del … al
 *     … (motivo)») y apaga Guardar: es el espejo del 409 `VEHICULO_OCUPADO`, que sigue de respaldo.
 *   · Si la placa ya tiene traslados asignados en el rango (`impactoMantenimiento`), un
 *     `MensajeModal` de advertencia los nombra: la parada NO los retira y se reasignan en «Planificar
 *     el día» (el mismo criterio que la ausencia de un conductor). «Programar igual» la guarda.
 *
 * LAS FECHAS SON `DateTextInput` (cadena AAAA-MM-DD), NO `DateInput`: aquél convierte a `Date` y en
 * Quito —UTC−5— eso desplaza la fecha un día. Regla 12 de CLAUDE.md.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Field, Formik } from "formik";
import { useCallback, useEffect, useState, type FC } from "react";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import Boton from "../common/Boton.tsx";
import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral, { type EstadoPie } from "../common/DrawerLateral.tsx";
import Insignia from "../common/Insignia.tsx";
import MensajeModal from "../common/MensajeModal.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import { DateTextInput, TextInput } from "../forms/FormikField.tsx";
import EnfocarPrimerError from "../forms/EnfocarPrimerError.tsx";
import { esquemaMantenimiento } from "../../config/validationSchemas.ts";
import type { TramoAfectadoPorParada } from "../../interfaces/Flota.ts";
import type {
  EstadoMantenimiento,
  MantenimientoVehiculo,
  Vehiculo,
} from "../../interfaces/Transporte.ts";
import { PlanificacionService } from "../../services/planificacion.service.ts";
import { TransporteService } from "../../services/transporte.service.ts";
import { fechaLarga } from "../../utils/ausencias.util.ts";
import { presentarError } from "../../utils/errorApi.util.ts";
import { textoPorCompletar } from "../../utils/estadoPieDrawer.util.ts";
import {
  MOTIVOS_PARADA,
  NOMBRE_ESTADO_PARADA,
  normalizarPlaca,
  paradaQueSeCruza,
  textoCruceParada,
} from "../../utils/flota.util.ts";
import { mensaje, toast } from "../../utils/mensaje.ts";

export type ValoresMantenimiento = {
  desde: string;
  hasta: string;
  motivo: string;
  taller: string;
  hora: string;
  /** Zonal del taller: con hora, destino de la TAREA «Llevar a taller» (Fase 5). */
  zonalTallerId: string;
};

/** Aviso de la tarea que generará la cita: el texto exacto que se ve en el cajón. */
export const AVISO_TAREA_TALLER =
  "Se creará la tarea “Llevar a taller” en la planificación de ese día.";

export const AYUDA_PARADA = "Durante la parada el vehículo no se ofrecerá en Planificar el día.";

/** El id del formulario: el pie del cajón (fuera del `<form>`) lo envía con `formId`. */
const ID_FORMULARIO = "form-mantenimiento";

/**
 * Transiciones admitidas (Fase 5): PROGRAMADO → EN_TALLER o LISTO; EN_TALLER → LISTO o vuelve a
 * PROGRAMADO; LISTO es final. El servidor las vuelve a validar.
 */
const TRANSICIONES: Record<EstadoMantenimiento, { a: EstadoMantenimiento; texto: string }[]> = {
  PROGRAMADO: [
    { a: "EN_TALLER", texto: "Marcar en taller" },
    { a: "LISTO", texto: "Marcar listo" },
  ],
  EN_TALLER: [
    { a: "LISTO", texto: "Marcar listo" },
    { a: "PROGRAMADO", texto: "Volver a programado" },
  ],
  LISTO: [],
};

/** «OCPMO-001-21-OCT-2026 · 21/10/2026 de 08H00 a 16H30». */
const textoTramo = (tramo: TramoAfectadoPorParada): string =>
  `${tramo.identificador} · ${fechaLarga(tramo.fecha)} de ${tramo.horaInicio.replace(":", "H")} a ${tramo.horaFin.replace(":", "H")}`;

type DrawerMantenimientoProps = {
  vehiculo: Vehiculo;
  /** Con lo que nace «Desde» y «Hasta»: la fecha de «Estado el día». */
  desdeInicial: string;
  zonales?: { id: number; nombre: string }[];
  /** Tras guardar, cambiar el estado o eliminar: la página relee disponibilidad, calendario y KPIs. */
  onCambio: () => void;
  onCerrar: () => void;
};

const DrawerMantenimiento: FC<DrawerMantenimientoProps> = ({
  vehiculo,
  desdeInicial,
  zonales = [],
  onCambio,
  onCerrar,
}) => {
  const placa = normalizarPlaca(vehiculo.placa);
  const [paradas, setParadas] = useState<MantenimientoVehiculo[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [conCita, setConCita] = useState(false);
  /** La parada pendiente de confirmar porque choca con traslados ya asignados. */
  const [porConfirmar, setPorConfirmar] = useState<{
    valores: ValoresMantenimiento;
    tramos: TramoAfectadoPorParada[];
  } | null>(null);
  const [porEliminar, setPorEliminar] = useState<MantenimientoVehiculo | null>(null);

  const cargarParadas = useCallback(async () => {
    try {
      setParadas(await TransporteService.listarMantenimientos(vehiculo.id));
    } catch {
      setParadas([]);
    }
  }, [vehiculo.id]);

  useEffect(() => {
    void cargarParadas();
  }, [cargarParadas]);

  const guardar = async (valores: ValoresMantenimiento) => {
    setGuardando(true);
    setErrorServidor(null);
    try {
      await TransporteService.registrarMantenimiento(vehiculo.id, {
        desde: valores.desde,
        hasta: valores.hasta,
        motivo: valores.motivo,
        // Los opcionales se omiten en blanco: una cadena vacía guardaría un taller que se llama «».
        taller: valores.taller.trim() || undefined,
        hora: valores.hora.trim() || undefined,
        zonalTallerId: valores.zonalTallerId === "" ? undefined : Number(valores.zonalTallerId),
      });
      setPorConfirmar(null);
      toast.exito(`Mantenimiento de ${placa} programado`);
      onCambio();
      onCerrar();
    } catch (fallo: unknown) {
      setPorConfirmar(null);
      setErrorServidor(presentarError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  /** Antes de guardar, ¿la placa ya tiene traslados en el rango? Si sí, se pregunta. */
  const revisarYGuardar = async (valores: ValoresMantenimiento) => {
    setGuardando(true);
    setErrorServidor(null);
    let tramos: TramoAfectadoPorParada[] = [];
    try {
      tramos = await TransporteService.impactoMantenimiento(vehiculo.id, valores.desde, valores.hasta);
    } catch (fallo: unknown) {
      setGuardando(false);
      setErrorServidor(presentarError(fallo).mensaje);
      return;
    }
    setGuardando(false);
    if (tramos.length > 0) {
      setPorConfirmar({ valores, tramos });
      return;
    }
    await guardar(valores);
  };

  const cambiarEstado = async (parada: MantenimientoVehiculo, estado: EstadoMantenimiento) => {
    setGuardando(true);
    try {
      await PlanificacionService.cambiarEstadoMantenimiento(vehiculo.id, parada.id, estado);
      await cargarParadas();
      onCambio();
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo cambiar el estado de la parada" });
    } finally {
      setGuardando(false);
    }
  };

  /** Si el servidor lo rechaza, lanza: el error queda en el modal de la confirmación. */
  const eliminar = async () => {
    if (!porEliminar) return;
    await TransporteService.retirarMantenimiento(vehiculo.id, porEliminar.id);
    setPorEliminar(null);
    toast.exito(`La parada de ${placa} se eliminó.`);
    await cargarParadas();
    onCambio();
  };

  const iniciales: ValoresMantenimiento = {
    desde: desdeInicial,
    hasta: desdeInicial,
    motivo: "",
    taller: "",
    hora: "",
    zonalTallerId: "",
  };

  return (
    <>
      <Formik<ValoresMantenimiento>
        initialValues={iniciales}
        validationSchema={esquemaMantenimiento}
        onSubmit={(valores) => void revisarYGuardar(valores)}
      >
        {({ values, errors, dirty, submitCount, handleSubmit }) => {
          const faltan = [
            values.desde ? null : "desde",
            values.hasta ? null : "hasta",
            values.motivo ? null : "motivo",
          ].filter((campo): campo is string => campo !== null);
          const cruce =
            values.desde && values.hasta && values.hasta >= values.desde
              ? paradaQueSeCruza(paradas ?? [], values.desde, values.hasta)
              : null;
          const textoCruce = cruce ? textoCruceParada(cruce) : null;
          const conErrores = Object.keys(errors).length > 0;

          const estadoPie: EstadoPie =
            faltan.length > 0
              ? submitCount > 0
                ? { tono: "error", texto: `Falta: ${faltan.join(", ")}` }
                : { tono: "pendiente", texto: textoPorCompletar(faltan.length) }
              : textoCruce
                ? { tono: "error", texto: "La parada se cruza con otra" }
                : submitCount > 0 && conErrores
                  ? { tono: "error", texto: "Revise los campos marcados" }
                  : { tono: "listo", texto: "Listo para programar" };

          return (
            <DrawerLateral
              abierto
              ancho="md"
              titulo="Programar mantenimiento"
              subtitulo={
                <>
                  <span className="font-mono font-semibold">{placa}</span>
                  {vehiculo.tipo ? ` · ${vehiculo.tipo}` : ""}
                </>
              }
              onCerrar={onCerrar}
              sucio={dirty}
              guardando={guardando}
              formId={ID_FORMULARIO}
              textoGuardar="Programar"
              estadoPie={estadoPie}
              motivoGuardar={textoCruce}
              guardarPendiente={faltan.length > 0}
              errorServidor={errorServidor}
            >
              <form
                id={ID_FORMULARIO}
                className="flex flex-col gap-4"
                noValidate
                onSubmit={(evento) => {
                  evento.preventDefault();
                  if (textoCruce) return;
                  handleSubmit();
                }}
              >
                <EnfocarPrimerError />
                <SeccionDrawer titulo="Parada" descripcion={AYUDA_PARADA} obligatoria>
                  <Field name="desde" component={DateTextInput} label="Desde" required />
                  <Field name="hasta" component={DateTextInput} label="Hasta" required />
                  {textoCruce && (
                    <p
                      role="alert"
                      className="text-sm text-[var(--app-msg-error-fg)] md:col-span-2"
                    >
                      {textoCruce}
                    </p>
                  )}
                  <CampoDrawer
                    etiqueta="Motivo"
                    requerido
                    ancha
                    error={submitCount > 0 ? (errors.motivo ?? null) : null}
                  >
                    <Field
                      as="select"
                      name="motivo"
                      aria-label="Motivo"
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="">Elija el motivo…</option>
                      {MOTIVOS_PARADA.map((motivo) => (
                        <option key={motivo} value={motivo}>
                          {motivo}
                        </option>
                      ))}
                    </Field>
                  </CampoDrawer>
                </SeccionDrawer>

                <SeccionDrawer
                  titulo="Cita en el taller (opcional)"
                  descripcion="El taller, la hora y su zonal se pueden completar después."
                  accion={
                    <Boton
                      variante="enlace"
                      tamano="sm"
                      aria-expanded={conCita}
                      onClick={() => setConCita((antes) => !antes)}
                    >
                      {conCita ? "Ocultar" : "Agregar cita"}
                    </Boton>
                  }
                >
                  {conCita && (
                    <>
                      <Field name="taller" component={TextInput} label="Taller" placeholder="AMBACAR" />
                      <Field name="hora" component={TextInput} label="Hora de la cita" placeholder="08:00" />
                      <CampoDrawer
                        etiqueta="Zonal del taller"
                        ancha
                        ayuda="Con hora de la cita, se crea la tarea «Llevar a taller» para asignarla a un conductor."
                      >
                        <Field
                          as="select"
                          name="zonalTallerId"
                          aria-label="Zonal del taller"
                          className="select select-bordered select-sm w-full"
                        >
                          <option value="">Sin zonal</option>
                          {zonales.map((zonal) => (
                            <option key={zonal.id} value={zonal.id}>
                              {zonal.nombre}
                            </option>
                          ))}
                        </Field>
                      </CampoDrawer>
                      {values.hora.trim() !== "" && (
                        <AvisoEnLinea variante="info" className="md:col-span-2">
                          {AVISO_TAREA_TALLER}
                        </AvisoEnLinea>
                      )}
                    </>
                  )}
                </SeccionDrawer>

                <SeccionDrawer titulo="Paradas programadas" rejilla={false}>
                  {paradas === null ? (
                    <p className="text-sm text-app-muted">Cargando…</p>
                  ) : paradas.length === 0 ? (
                    <p className="text-sm text-app-muted">Este vehículo no tiene paradas registradas.</p>
                  ) : (
                    <ul className="flex flex-col gap-2" aria-label={`Paradas de ${placa}`}>
                      {paradas.map((parada) => {
                        const estado = parada.estado ?? "PROGRAMADO";
                        return (
                          <li
                            key={parada.id}
                            className="flex flex-col gap-1.5 rounded-md border border-base-300 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-app-strong">
                                {fechaLarga(parada.desde)} al {fechaLarga(parada.hasta)}
                              </span>
                              <Insignia variante={estado === "LISTO" ? "neutro" : "aviso"}>
                                {NOMBRE_ESTADO_PARADA[estado]}
                              </Insignia>
                            </div>
                            <span className="text-xs text-app-muted">
                              {[parada.motivo, parada.taller, parada.hora].filter(Boolean).join(" · ") ||
                                "Sin motivo registrado"}
                            </span>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {TRANSICIONES[estado].map((t) => (
                                <Boton
                                  key={t.a}
                                  tamano="sm"
                                  deshabilitado={guardando}
                                  onClick={() => void cambiarEstado(parada, t.a)}
                                >
                                  {t.texto}
                                </Boton>
                              ))}
                              <Boton
                                variante="peligroTexto"
                                tamano="sm"
                                icono="eliminar"
                                deshabilitado={guardando}
                                aria-label={`Eliminar la parada del ${parada.desde} al ${parada.hasta}`}
                                onClick={() => setPorEliminar(parada)}
                              >
                                Eliminar
                              </Boton>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </SeccionDrawer>
              </form>
            </DrawerLateral>
          );
        }}
      </Formik>

      <MensajeModal
        abierto={porConfirmar !== null}
        variante="advertencia"
        titulo={`¿Programar la parada de ${placa}?`}
        mensaje={
          porConfirmar && (
            <div className="flex flex-col gap-2">
              <p>
                {porConfirmar.tramos.length === 1
                  ? "Tiene 1 traslado asignado en esas fechas."
                  : `Tiene ${porConfirmar.tramos.length} traslados asignados en esas fechas.`}{" "}
                La parada no los retira: reasígnelos en «Planificar el día».
              </p>
              <ul className="list-disc pl-5 text-sm">
                {porConfirmar.tramos.map((tramo) => (
                  <li key={`${tramo.operativoId}-${tramo.fecha}-${tramo.horaInicio}`}>{textoTramo(tramo)}</li>
                ))}
              </ul>
            </div>
          )
        }
        textoPrincipal="Programar igual"
        tituloError="No se pudo programar el mantenimiento"
        onPrincipal={() => (porConfirmar ? guardar(porConfirmar.valores) : undefined)}
        onSecundario={() => setPorConfirmar(null)}
      />

      <MensajeModal
        abierto={porEliminar !== null}
        variante="peligro"
        titulo="¿Eliminar la parada?"
        mensaje={
          porEliminar
            ? `La parada del ${fechaLarga(porEliminar.desde)} al ${fechaLarga(porEliminar.hasta)} se eliminará y el vehículo volverá a ofrecerse en esas fechas.`
            : ""
        }
        textoPrincipal="Sí, eliminar"
        tituloError="No se pudo eliminar la parada"
        onPrincipal={eliminar}
        onSecundario={() => setPorEliminar(null)}
      />
    </>
  );
};

export default DrawerMantenimiento;
