/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Capacidad de flota
 * Archivo: CapacidadFlotaPage.tsx
 * Responsabilidad: Pantalla P-15. Declarar cuántos vehículos y conductores hay hábiles.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ENDPOINT EXISTÍA Y NINGUNA PANTALLA LO LLAMABA.
 *
 * `PUT /transporte/capacidad/:fecha` está construido y probado desde M-18, y hasta hoy
 * **ningún componente lo invocaba**. La consecuencia es que RN-46 —la única regla de
 * negocio propia de la capacidad— no se disparaba nunca en producción: sin declaración no
 * hay con qué comparar la demanda, y el indicador de P-03 mostraba «sin declarar».
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * RN-46 ADVIERTE, NO BLOQUEA, y esta pantalla no puede sugerir lo contrario. El Product
 * Owner lo fijó así: nadie sabe con certeza cuántos conductores hábiles hay, y bloquear una
 * asignación con un número provisional dejaría un operativo sin transporte —y el cuadro
 * volvería a llenarse por WhatsApp, que es el problema que el sistema existe para
 * resolver—. Por eso la advertencia se muestra en `alert-warning` y jamás deshabilita nada.
 *
 * DECLARAR CERO NO ES LO MISMO QUE NO DECLARAR. El servidor distingue `declarada: null`
 * —nadie dijo nada— de un cero explícito —hoy no hay flota—, y la pantalla conserva esa
 * distinción: con `null` no se escribe «0 / 0», se dice que falta declararla.
 */

import { Field, Form, Formik } from "formik";
import { useCallback, useEffect, useState } from "react";

import CamposCalculados from "../components/cuadro/CamposCalculados.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import { TextInput } from "../components/forms/FormikField.tsx";
import EnfocarPrimerError from "../components/forms/EnfocarPrimerError.tsx";
import { esquemaCapacidad } from "../config/validationSchemas.ts";
import { ROLES_DE_TRANSPORTE } from "../config/env.ts";
import { useCuadroDiario } from "../hooks/useCuadroDiario.ts";
import { useVentanaCarga } from "../hooks/useVentanaCarga.ts";
import type { CapacidadFlota } from "../interfaces/Transporte.ts";
import { TransporteService } from "../services/transporte.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import { momentoRespectoDeVentana } from "../utils/ventanaCarga.util.ts";

type ValoresCapacidad = {
  vehiculosHabiles: number | "";
  conductoresHabiles: number | "";
  observacion: string;
};

const CapacidadFlotaPage = () => {
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

  const { cuadro, cargando: cargandoCuadro } = useCuadroDiario(fecha);
  const ventana = useVentanaCarga(ROLES_DE_TRANSPORTE);

  const [capacidad, setCapacidad] = useState<CapacidadFlota | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  const momento = momentoRespectoDeVentana(ventana.ventana);
  const soloLectura = !ventana.puedeEscribir;

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      setCapacidad(await TransporteService.consultarCapacidad(fecha));
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setCapacidad(null);
      // Un 404 es una jornada que nadie abrió, no una avería.
      if (error.estado !== 404) {
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      }
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const declarar = useCallback(
    async (valores: ValoresCapacidad) => {
      setGuardando(true);

      try {
        const resultado = await TransporteService.declararCapacidad(fecha, {
          vehiculosHabiles: Number(valores.vehiculosHabiles),
          conductoresHabiles: Number(valores.conductoresHabiles),
          observacion: valores.observacion.trim() || undefined,
        });

        setCapacidad(resultado);
        setExito(
          `Capacidad declarada para el ${fecha}: ${resultado.declarada?.vehiculosHabiles ?? 0} vehículos y ${resultado.declarada?.conductoresHabiles ?? 0} conductores hábiles.`,
        );
        setAviso(null);
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      } finally {
        setGuardando(false);
      }
    },
    [fecha],
  );

  /**
   * El formulario nace con lo ya declarado, para que corregir sea cambiar un número.
   *
   * Con `null` nace vacío y NO en cero: proponer un cero sugeriría que alguien declaró que
   * no hay flota, cuando lo que ocurre es que nadie ha declarado nada.
   */
  const iniciales: ValoresCapacidad = {
    vehiculosHabiles: capacidad?.declarada?.vehiculosHabiles ?? "",
    conductoresHabiles: capacidad?.declarada?.conductoresHabiles ?? "",
    observacion: capacidad?.declarada?.observacion ?? "",
  };

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-2">
        <p className="page-heading-kicker font-semibold uppercase">
          DAF
        </p>
        <h1 className="page-heading-title">
          Capacidad de flota
        </h1>
        <CamposCalculados
          cuadro={cuadro}
          cargando={cargandoCuadro}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaCapacidad"
            >
              <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
                Fecha de la jornada
              </span>
            </label>
            <input
              id="fechaCapacidad"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
          </div>
        </div>
      </header>

      {!ventana.cargando && <AvisoVentana cuentaAtras={ventana.cuentaAtras} />}

      {/*
        Fuera de la ventana la pantalla se consulta pero no se declara. Se distingue
        «todavía no» de «ya no»: en el primer caso no se ha perdido nada.
      */}
      {soloLectura && !ventana.cargando && (
        <div
          className="alert alert-info"
          role="status"
        >
          <span>
            {momento === "ANTES"
              ? `Todavía no es el turno de la DAF. ${ventana.mensaje}`
              : ventana.mensaje}
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

      {/* VAL-24. Se muestra tal cual y NO impide nada (RN-46). */}
      {capacidad?.hayAdvertencia && capacidad.advertencia && (
        <div
          className="alert alert-warning"
          role="alert"
        >
          <span>{capacidad.advertencia}</span>
        </div>
      )}

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Lo que la jornada necesita
          </h2>
          <span className="badge badge-ghost badge-sm">
            {cargando
              ? "Cargando…"
              : `${capacidad?.demanda.vehiculos ?? 0} operativos con vehículo`}
          </span>
        </div>

        <div className="app-data-panel-body grid grid-cols-1 gap-3 px-4 pb-4 pt-3 sm:grid-cols-2 md:px-6">
          <Comparacion
            titulo="Vehículos"
            holgura={capacidad?.vehiculos ?? null}
            requeridos={capacidad?.demanda.vehiculos ?? 0}
          />
          <Comparacion
            titulo="Conductores"
            holgura={capacidad?.conductores ?? null}
            requeridos={capacidad?.demanda.conductores ?? 0}
          />
        </div>
      </div>

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4">
          <h2 className="app-section-heading text-sm font-semibold uppercase text-primary/95">
            Declarar la capacidad del día
          </h2>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-4 pb-4 pt-3 md:px-6">
          <Formik<ValoresCapacidad>
            initialValues={iniciales}
            enableReinitialize
            validationSchema={esquemaCapacidad}
            onSubmit={(valores) => void declarar(valores)}
          >
            <Form className="flex flex-col gap-3">
              <EnfocarPrimerError />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  name="vehiculosHabiles"
                  component={TextInput}
                  type="number"
                  label="Vehículos hábiles"
                  required
                  disabled={soloLectura || guardando}
                />
                <Field
                  name="conductoresHabiles"
                  component={TextInput}
                  type="number"
                  label="Conductores hábiles"
                  required
                  disabled={soloLectura || guardando}
                />
              </div>

              <Field
                name="observacion"
                component={TextInput}
                label="Observación"
                placeholder="Dos unidades en el taller hasta el jueves"
                disabled={soloLectura || guardando}
              />

              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={soloLectura || guardando}
                >
                  {guardando ? "Guardando…" : "Declarar capacidad"}
                </button>
              </div>
            </Form>
          </Formik>

          {capacidad?.declarada && (
            <p className="text-xs text-base-content/70">
              Declarada el{" "}
              {capacidad.declarada.declaradoEn.slice(0, 10)}. Volver a
              declararla sustituye lo anterior.
            </p>
          )}
        </div>
      </div>

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

/**
 * Un recurso comparado contra lo declarado.
 *
 * Sin declaración **no se escribe «0 / 0»**: se dice que falta declararla. Es la misma
 * distinción que hace `IndicadorFlota` en P-03, y el motivo es que un cero inventado
 * parecería una afirmación de la DAF cuando es una ausencia de afirmación.
 */
const Comparacion = ({
  titulo,
  holgura,
  requeridos,
}: {
  titulo: string;
  holgura: { declarados: number; requeridos: number; suficiente: boolean } | null;
  requeridos: number;
}) => (
  <div className="rounded-md border border-base-300 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-base-content/70">
      {titulo}
    </p>
    {holgura ? (
      <>
        <p className="text-lg font-semibold">
          {holgura.declarados} hábiles · {holgura.requeridos} necesarios
        </p>
        {/* Regla 6: el veredicto se lee, no se deduce del color del distintivo. */}
        <span
          className={`badge badge-sm ${holgura.suficiente ? "badge-ghost" : "badge-error"}`}
        >
          {holgura.suficiente ? "Alcanza" : "No alcanza"}
        </span>
      </>
    ) : (
      <>
        <p className="text-lg font-semibold">{requeridos} necesarios</p>
        <span className="badge badge-ghost badge-sm">
          Capacidad sin declarar
        </span>
      </>
    )}
  </div>
);

export default CapacidadFlotaPage;
