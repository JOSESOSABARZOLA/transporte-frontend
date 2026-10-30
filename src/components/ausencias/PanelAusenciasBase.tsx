/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Ausencias
 * Archivo: PanelAusenciasBase.tsx
 * Responsabilidad: El cajón de ausencias de una persona o de un conductor: registrar, ver y quitar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL NÚCLEO DE `PanelAusencias` (Personal), SACADO PARA QUE LO USE TAMBIÉN «FLOTA Y GARAJES».
 *
 * Hasta el 2026-10-16 el cajón vivía entero en `personal/PanelAusencias.tsx` y estaba atado a
 * `Funcionario` (nombre, cédula, `PersonalService.operativosDe`). Las ausencias de los
 * conductores tienen la misma forma y las mismas reglas (plan «ausencias-conductores-flota»),
 * así que el cajón se generaliza aquí y cada pantalla pone solo lo suyo:
 *
 *   · `nombre` e `identificacion`: la cabecera («NOMBRE · cédula»).
 *   · `consultarImpacto`: el aviso ANTES de registrar (Personal: los operativos que la persona
 *     ya tiene en el rango). Devuelve el texto o `null`.
 *   · `avisoImpacto`: un aviso que llega DESPUÉS de registrar (Flota: los tramos que la
 *     respuesta del servidor dice que quedan por reasignar).
 *
 * El comportamiento de Personal no cambia: `PanelAusencias` es ahora un envoltorio que le pasa
 * exactamente lo que este cajón hacía antes, y sus pruebas no se tocaron.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REDISEÑO DEL 2026-10-08 · «Registrar ausencia» con mensaje EN VIVO («N días · del … al …», el
 * error de rango o el de solape, calculado por `diagnosticarRango`, espejo del 409
 * `AUSENCIA_SOLAPADA`), y «Registradas (N)» con En curso / Próxima / Pasada; las pasadas no se
 * quitan (el servidor responde 409 `AUSENCIA_PASADA`). FECHAS COMO TEXTO `AAAA-MM-DD` (regla 12).
 *
 * CAJÓN ESTÁNDAR (2026-10-15): `DrawerLateral` `lg` en modo LECTURA. Cada ausencia se registra o
 * se quita al instante. Con algo escrito sin registrar, cerrar pregunta «¿Descartar cambios?».
 *
 * PIE ESTÁNDAR (2026-10-24, Personal y Flota): «Registrar ausencia» salió del formulario y es la
 * acción principal del pie, junto a [Cerrar]. A la izquierda, el estado: «✓ Se bloquearán N días
 * (dd/mm al dd/mm)» con un rango válido, o «Revise las fechas» —y el botón apagado— con uno que no
 * lo es. El porqué va EN LÍNEA bajo el formulario, con los textos del servidor (`textoSolape`). Una
 * ausencia «Pasada» ya no ofrece «Quitar» apagado: dice «Historial».
 */

import { useEffect, useMemo, useState, type FC } from "react";

import Boton from "../common/Boton.tsx";
import DrawerLateral, { type EstadoPie } from "../common/DrawerLateral.tsx";
import Tooltip from "../common/Tooltip.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import type {
  EstadoDisponibilidad,
  MomentoAusencia,
} from "../../interfaces/Personal.ts";
import { NOMBRE_ESTADO_DISPONIBILIDAD } from "../../utils/personal.util.ts";
import {
  NOMBRE_MOMENTO,
  VARIANTE_MOMENTO,
  diagnosticarRango,
  estadoDeAusencia,
  fechaCorta,
  fechaLarga,
} from "../../utils/ausencias.util.ts";

export type ValoresAusencia = {
  estado: EstadoDisponibilidad;
  desde: string;
  hasta: string;
  motivo: string;
};

/** Lo que el cajón necesita de cada periodo: lo comparten `Disponibilidad` y `AusenciaConductor`. */
export interface PeriodoDeAusencia {
  id: number;
  estado: EstadoDisponibilidad;
  desde: string;
  hasta: string;
  motivo: string | null;
  momento?: MomentoAusencia;
}

export type PanelAusenciasBaseProps = {
  /** Cabecera: «NOMBRE · identificación». */
  nombre: string;
  identificacion: string;
  /** Las situaciones que se ofrecen, en su orden. */
  situaciones: readonly EstadoDisponibilidad[];
  ausencias: PeriodoDeAusencia[];
  cargando: boolean;
  guardando: boolean;
  hoy: string;
  /** Error del servidor, tal cual (regla 7). */
  aviso: string | null;
  /** Bajo «Registradas (N)»: qué deja de pasar mientras esté ausente. */
  descripcionRegistradas: string;
  /** Bajo las fechas: qué significa el rango. Por omisión, «Ambas fechas se incluyen.». */
  ayudaFechas?: string;
  /** El choque con otra ausencia, con el texto del servidor de cada uno (persona o conductor). */
  textoSolape: (desde: string, hasta: string) => string;
  /** Aviso previo con un rango válido (Personal). Su fallo no impide registrar. */
  consultarImpacto?: (desde: string, hasta: string) => Promise<string | null>;
  /** Aviso posterior a registrar (Flota: tramos por reasignar). */
  avisoImpacto?: string | null;
  /** Devuelve si se registró: solo entonces se limpia el formulario. */
  onRegistrar: (valores: ValoresAusencia) => Promise<boolean>;
  onRetirar: (periodoId: number) => void;
  onCerrar: () => void;
};

const VACIO: ValoresAusencia = {
  estado: "VACACIONES",
  desde: "",
  hasta: "",
  motivo: "",
};

const PanelAusenciasBase: FC<PanelAusenciasBaseProps> = ({
  nombre,
  identificacion,
  situaciones,
  ausencias,
  cargando,
  guardando,
  hoy,
  aviso,
  descripcionRegistradas,
  ayudaFechas = "Ambas fechas se incluyen.",
  textoSolape,
  consultarImpacto,
  avisoImpacto = null,
  onRegistrar,
  onRetirar,
  onCerrar,
}) => {
  const [valores, setValores] = useState<ValoresAusencia>(VACIO);
  const [intento, setIntento] = useState(false);
  const [porQuitar, setPorQuitar] = useState<number | null>(null);
  const [impacto, setImpacto] = useState<string | null>(null);

  const diagnostico = useMemo(
    () => diagnosticarRango(valores, ausencias),
    [valores, ausencias],
  );
  const valido = diagnostico.tipo === "valido";

  // Aviso previo: solo con un rango válido, y se descarta la respuesta de un rango que ya cambió.
  useEffect(() => {
    if (!valido || !consultarImpacto) return undefined;
    let vigente = true;
    consultarImpacto(valores.desde, valores.hasta)
      .then((texto) => {
        if (vigente) setImpacto(texto);
      })
      .catch(() => {
        // No poder preguntarlo no impide registrar: el aviso es una ayuda.
        if (vigente) setImpacto(null);
      });
    return () => {
      vigente = false;
    };
  }, [valido, consultarImpacto, valores.desde, valores.hasta]);

  const cambiar = (campo: keyof ValoresAusencia, valor: string) => {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    if (campo === "desde" || campo === "hasta") setImpacto(null);
  };

  const registrar = async () => {
    setIntento(true);
    if (!valido || guardando) return;
    const ok = await onRegistrar(valores);
    if (ok) {
      setValores(VACIO);
      setIntento(false);
      setImpacto(null);
    }
  };

  /** Por qué el rango no sirve, en línea bajo el formulario (los textos del servidor). */
  const errorRango =
    diagnostico.tipo === "invertido"
      ? "La ausencia no puede terminar antes de empezar."
      : diagnostico.tipo === "solapado"
        ? textoSolape(fechaLarga(diagnostico.con.desde), fechaLarga(diagnostico.con.hasta))
        : diagnostico.tipo === "incompleto" && intento
          ? "Indique desde y hasta."
          : null;

  /** El estado del pie, a la izquierda, y el motivo del botón apagado. */
  const estadoPie: EstadoPie =
    diagnostico.tipo === "valido"
      ? {
          tono: "listo",
          texto: `Se bloquearán ${diagnostico.dias === 1 ? "1 día" : `${diagnostico.dias} días`} (${fechaCorta(valores.desde)} al ${fechaCorta(valores.hasta)})`,
        }
      : diagnostico.tipo === "incompleto"
        ? { tono: intento ? "error" : "pendiente", texto: "Indique desde y hasta" }
        : { tono: "error", texto: "Revise las fechas" };
  const motivoRegistrar =
    diagnostico.tipo === "valido"
      ? null
      : diagnostico.tipo === "incompleto"
        ? "Indique desde y hasta."
        : "Revise las fechas.";

  /** Hay algo escrito sin registrar: cerrar pregunta antes. */
  const sucio =
    valores.desde !== "" ||
    valores.hasta !== "" ||
    valores.motivo.trim() !== "" ||
    valores.estado !== VACIO.estado;

  return (
    <DrawerLateral
      abierto
      ancho="lg"
      modo="lectura"
      titulo="Ausencias"
      subtitulo={
        <span className="block truncate">
          {nombre} · <span className="font-mono">{identificacion}</span>
        </span>
      }
      /* Mientras se guarda no cierra nada: no se interrumpe la escritura. */
      guardando={guardando}
      sucio={sucio}
      mensajeDescarte="La ausencia que escribió y no registró se perderá."
      onCerrar={onCerrar}
      errorServidor={aviso}
      estadoPie={estadoPie}
      textoAccionLectura={guardando ? "Registrando…" : "Registrar ausencia"}
      onAccionLectura={() => void registrar()}
      motivoGuardar={motivoRegistrar}
    >
      <SeccionDrawer titulo="Registrar ausencia" rejilla={false}>
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault();
            void registrar();
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="form-control w-full">
              <span className="label-text mb-1">
                Situación
                <span
                  className="text-error ml-1"
                  aria-hidden="true"
                >
                  *
                </span>
              </span>
              <select
                className="select select-bordered w-full"
                aria-required
                value={valores.estado}
                onChange={(evento) => cambiar("estado", evento.target.value)}
              >
                {situaciones.map((estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {NOMBRE_ESTADO_DISPONIBILIDAD[estado]}
                  </option>
                ))}
              </select>
            </label>
            {(["desde", "hasta"] as const).map((campo) => (
              <label
                key={campo}
                className="form-control w-full"
              >
                <span className="label-text mb-1">
                  {campo === "desde" ? "Desde" : "Hasta"}
                  <span
                    className="text-error ml-1"
                    aria-hidden="true"
                  >
                    *
                  </span>
                </span>
                {/*
                  Fecha nativa con su texto `AAAA-MM-DD`. No usa `DateInput` de `FormikField`, que
                  convierte a `Date` y en Quito (UTC−5) movería el día (regla 12).
                */}
                <input
                  type="date"
                  className="input input-bordered w-full"
                  aria-required
                  aria-invalid={
                    diagnostico.tipo === "invertido" ||
                    diagnostico.tipo === "solapado" ||
                    (intento && diagnostico.tipo === "incompleto")
                      ? true
                      : undefined
                  }
                  value={valores[campo]}
                  onChange={(evento) => cambiar(campo, evento.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-app-muted">{ayudaFechas}</p>
          <label className="form-control w-full">
            <span className="label-text mb-1">Motivo (opcional)</span>
            <input
              type="text"
              className="input input-bordered w-full"
              maxLength={220}
              placeholder="Ej. Memorando GADDMQ-AMC-2026-0123"
              value={valores.motivo}
              onChange={(evento) => cambiar("motivo", evento.target.value)}
            />
          </label>

          {errorRango && (
            <p className="text-sm text-error" role="alert">
              {errorRango}
            </p>
          )}

          {valido && impacto && (
            <AvisoEnLinea variante="advertencia">{impacto}</AvisoEnLinea>
          )}
          {avisoImpacto && (
            <AvisoEnLinea variante="advertencia">{avisoImpacto}</AvisoEnLinea>
          )}
        </form>
      </SeccionDrawer>

      <SeccionDrawer
        titulo={`Registradas (${ausencias.length})`}
        descripcion={descripcionRegistradas}
        rejilla={false}
      >
        {cargando ? (
          <p className="py-4 text-center text-sm text-app-muted">
            Consultando sus ausencias…
          </p>
        ) : ausencias.length === 0 ? (
          <p className="rounded-md border border-dashed border-base-300 py-4 text-center text-sm text-app-muted">
            No tiene ausencias registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm table-zebra">
              <thead>
                <tr className="text-xs uppercase tracking-wider">
                  <th scope="col">Situación</th>
                  <th scope="col">Desde</th>
                  <th scope="col">Hasta</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ausencias.map((periodo) => {
                  const momento =
                    periodo.momento ?? estadoDeAusencia(periodo, hoy);
                  const pasada = momento === "PASADA";
                  return (
                    <tr key={periodo.id}>
                      <td className="px-3 py-1 align-top">
                        {NOMBRE_ESTADO_DISPONIBILIDAD[periodo.estado] ??
                          periodo.estado}
                      </td>
                      <td className="px-3 py-1 align-top whitespace-nowrap">
                        {fechaLarga(periodo.desde)}
                      </td>
                      <td className="px-3 py-1 align-top whitespace-nowrap">
                        {fechaLarga(periodo.hasta)}
                      </td>
                      {/* El motivo puede describir una condición de salud: no sale de aquí. */}
                      <td className="px-3 py-1 align-top">
                        {periodo.motivo ?? "—"}
                      </td>
                      <td className="px-3 py-1 align-top">
                        <span
                          className={`badge badge-sm whitespace-nowrap ${VARIANTE_MOMENTO[momento]}`}
                        >
                          {NOMBRE_MOMENTO[momento]}
                        </span>
                      </td>
                      <td className="px-3 py-1 align-top">
                        {porQuitar === periodo.id ? (
                          <div
                            className="flex flex-wrap items-center gap-1"
                            role="group"
                            aria-label="Confirmar quitar la ausencia"
                          >
                            <span className="text-xs font-semibold">
                              ¿Quitar?
                            </span>
                            <Boton
                              variante="peligro"
                              tamano="sm"
                              onClick={() => {
                                setPorQuitar(null);
                                onRetirar(periodo.id);
                              }}
                              deshabilitado={guardando}
                              autoFocus
                            >
                              Sí, quitar
                            </Boton>
                            <Boton
                              tamano="sm"
                              onClick={() => setPorQuitar(null)}
                            >
                              No
                            </Boton>
                          </div>
                        ) : pasada ? (
                          // Ya terminó: es historial y el servidor no la deja quitar (409).
                          <Tooltip texto="Ya terminó: forma parte del historial y no se puede quitar">
                            <span className="text-xs text-app-muted" tabIndex={0}>
                              Historial
                            </span>
                          </Tooltip>
                        ) : (
                          <Boton
                            variante="peligroTexto"
                            tamano="sm"
                            icono="eliminar"
                            onClick={() => setPorQuitar(periodo.id)}
                            deshabilitado={guardando}
                          >
                            Quitar
                          </Boton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default PanelAusenciasBase;
