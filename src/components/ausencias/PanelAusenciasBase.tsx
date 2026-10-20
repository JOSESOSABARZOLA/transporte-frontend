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
 * se quita al instante, así que el pie es solo [Cerrar]. Con algo escrito sin registrar, cerrar
 * pregunta «¿Descartar cambios?».
 */

import { useEffect, useMemo, useState, type FC } from "react";

import Boton from "../common/Boton.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
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

  /** El mensaje en vivo bajo el formulario. */
  const mensajeEnVivo = (() => {
    switch (diagnostico.tipo) {
      case "incompleto":
        return intento ? (
          <span className="text-error">Indique desde y hasta.</span>
        ) : (
          <span className="text-app-muted">Ambas fechas se incluyen.</span>
        );
      case "invertido":
        return (
          <span className="text-error">
            «Hasta» no puede ser anterior a «Desde».
          </span>
        );
      case "solapado":
        return (
          <span className="text-error">
            Se cruza con una ausencia ya registrada (del{" "}
            {fechaLarga(diagnostico.con.desde)} al{" "}
            {fechaLarga(diagnostico.con.hasta)}).
          </span>
        );
      case "valido":
        return (
          <span className="text-app-strong">
            {diagnostico.dias === 1 ? "1 día" : `${diagnostico.dias} días`} · del{" "}
            {fechaLarga(valores.desde)} al {fechaLarga(valores.hasta)}
          </span>
        );
    }
  })();

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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="text-sm"
              role="status"
              aria-live="polite"
            >
              {mensajeEnVivo}
            </p>
            <Boton
              variante="acento"
              tamano="md"
              type="submit"
              cargando={guardando}
              deshabilitado={!valido}
              onClickApagado={() => void registrar()}
            >
              {guardando ? "Registrando…" : "Registrar ausencia"}
            </Boton>
          </div>

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
                        ) : (
                          <Boton
                            variante="peligroTexto"
                            tamano="sm"
                            icono="eliminar"
                            onClick={() => setPorQuitar(periodo.id)}
                            deshabilitado={guardando}
                            motivoDeshabilitado={
                              pasada
                                ? "Una ausencia que ya terminó es historial: no se quita."
                                : null
                            }
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
