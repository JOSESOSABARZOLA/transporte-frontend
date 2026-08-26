/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: MatrizConsolidadaPage.tsx
 * Responsabilidad: Pantalla P-04. Revisar la jornada completa, exportarla y cerrarla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PANTALLA QUE ORIGINÓ EL ENCARGO, VISTA DEL REVÉS.
 *
 * El cuadro completo circulaba por WhatsApp y los intervenidos se anticipaban al
 * operativo. La vista consolidada existe, pero **solo para la Dirección** (RN-48): ningún
 * perfil departamental monta este componente, y tampoco la DAF, que ve los nueve
 * formularios pero únicamente para asignar transporte.
 *
 * La protección es doble y ninguna de las dos sustituye a la otra: `RutaProtegida` impide
 * entrar por URL y `@Roles(DIRECTOR)` en `/matriz` impide obtener los datos. Si alguna vez
 * discrepan, manda el servidor.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CERRAR EL CUADRO ES IRREVERSIBLE EN LA PRÁCTICA, aunque exista `reabrir`: el cierre
 * habilita la emisión de órdenes de servicio, y una orden emitida ya salió del sistema.
 * Por eso pasa por `ModalConfirmacion` y por eso el aviso enumera lo que la Dirección está
 * firmando: cuántos operativos, cuántas alertas y cuántos formularios quedaron sin cargar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import FiltroFormulario, {
  TODOS_LOS_FORMULARIOS,
} from "../components/matriz/FiltroFormulario.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import TablaMatriz from "../components/matriz/TablaMatriz.tsx";
import { colorEstado } from "../config/env.ts";
import { nombreEstadoCuadro } from "../interfaces/CuadroDiario.ts";
import type { Matriz } from "../interfaces/Documento.ts";
import { CuadroDiarioService } from "../services/cuadroDiario.service.ts";
import { DocumentoService } from "../services/documento.service.ts";
import { descargarArchivo } from "../utils/banner.util.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";

const MatrizConsolidadaPage = () => {
  /**
   * LA JORNADA QUE SE PROPONE ES LA DE MAÑANA, no la de hoy. RN-01.
   *
   * La Dirección consolida la víspera lo que se ejecutará al día siguiente, así que la
   * matriz que viene a mirar es la que se está armando. Para revisar una jornada ya
   * ejecutada se retrocede con el selector, que sigue admitiendo cualquier fecha.
   */
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

  const [matriz, setMatriz] = useState<Matriz | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinJornada, setSinJornada] = useState(false);

  const [formulario, setFormulario] = useState(TODOS_LOS_FORMULARIOS);
  const [exportando, setExportando] = useState(false);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setSinJornada(false);

    try {
      setMatriz(await DocumentoService.consultarMatriz(fecha));
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setMatriz(null);

      // Un 404 es una jornada que nadie abrió, no una avería del sistema.
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

  const secciones = useMemo(() => {
    if (!matriz) return [];
    if (formulario === TODOS_LOS_FORMULARIOS) return matriz.secciones;

    return matriz.secciones.filter(
      (seccion) => seccion.codigo === formulario,
    );
  }, [matriz, formulario]);

  const exportar = useCallback(async () => {
    setExportando(true);
    setAviso(null);

    try {
      const documento = await DocumentoService.exportarMatriz(fecha);
      descargarArchivo(documento, `matriz-consolidada-${fecha}.pdf`);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setExportando(false);
    }
  }, [fecha]);

  const cerrar = useCallback(async () => {
    setCerrando(true);
    setAviso(null);

    try {
      const cuadro = await CuadroDiarioService.cerrar(fecha);
      setConfirmandoCierre(false);
      setExito(
        `Cuadro ${cuadro.ordenTrabajo} cerrado. Ya se pueden emitir las órdenes de servicio.`,
      );
      await cargar();
    } catch (fallo: unknown) {
      // El 409 nombra el operativo nocturno que sigue sin conductor: se muestra tal cual,
      // porque es exactamente lo que hay que resolver antes de volver a intentarlo.
      const error = presentarError(fallo);
      setConfirmandoCierre(false);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setCerrando(false);
    }
  }, [fecha, cargar]);

  const cabecera = matriz?.cabecera;
  const estado = cabecera ? nombreEstadoCuadro[cabecera.estado] : null;
  const cerrado = cabecera?.estado === "CERRADO";
  const sinOperativos = (cabecera?.totalOperativos ?? 0) === 0;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          {/* El antetítulo dice de quién es la pantalla. En un sistema cuyo encargo nació
              del aislamiento de la información, esa línea no es adorno. */}
          <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
            Dirección
          </p>
          <h1 className="page-heading-title text-2xl font-semibold">
            Matriz Consolidada del Día
          </h1>
          <p className="page-heading-subtitle text-sm">
            El compilado de los nueve formularios. Ningún otro perfil lo ve
            completo.
          </p>
        </div>

        <div className="app-page-header-actions flex">
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaMatriz"
            >
              <span className="label-text text-xs font-semibold uppercase tracking-[0.12em]">
                Fecha del cuadro
              </span>
            </label>
            <input
              id="fechaMatriz"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => {
                setFecha(evento.target.value);
                setFormulario(TODOS_LOS_FORMULARIOS);
              }}
            />
          </div>
        </div>
      </header>

      {cabecera && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-ghost badge-sm">
            {cabecera.ordenTrabajo}
          </span>
          <span className="badge badge-ghost badge-sm">
            {cabecera.fechaNatural}
          </span>
          <span className="badge badge-ghost badge-sm">
            Semana {cabecera.nroSemana} de {cabecera.anioSemana}
          </span>
          {/* El estado lleva color **y** palabra (regla 6). */}
          <span className={`badge badge-sm ${colorEstado(estado ?? "")}`}>
            {estado}
          </span>
          <span className="badge badge-ghost badge-sm">
            {cabecera.totalOperativos} operativos
          </span>
          <span
            className={`badge badge-sm ${
              cabecera.totalAlertas > 0 ? "badge-warning" : "badge-ghost"
            }`}
          >
            {cabecera.totalAlertas} alertas
          </span>
          {cabecera.flota && (
            <span
              className={`badge badge-sm ${
                cabecera.flota.hayAdvertencia ? "badge-error" : "badge-ghost"
              }`}
            >
              Flota {cabecera.flota.requeridos}/{cabecera.flota.declarados}
            </span>
          )}
        </div>
      )}

      {sinJornada && (
        <div className="alert alert-info">
          <span>
            No hay una jornada abierta para el {fecha}. El administrador debe
            abrir el cuadro del día.
          </span>
        </div>
      )}

      {/* RN-53. Lo que falta se dice arriba, no solo dentro de cada sección. */}
      {cabecera && cabecera.formulariosSinCarga > 0 && (
        <div className="alert alert-warning">
          <span>
            {cabecera.formulariosSinCarga}{" "}
            {cabecera.formulariosSinCarga === 1
              ? "formulario no fue ingresado"
              : "formularios no fueron ingresados"}
            . Cada uno deja constancia en su sección, con el departamento
            responsable y la hora de cierre de su ventana.
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

      <div className="app-modules-panel app-data-panel app-shell-surface overflow-visible rounded-md border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-[2px]">
        <div className="app-section-header flex flex-col gap-3 border-b border-base-300 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="app-section-heading text-sm font-semibold uppercase tracking-[0.18em] text-primary/95">
            Matriz consolidada
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {matriz && (
              <FiltroFormulario
                secciones={matriz.secciones}
                seleccionado={formulario}
                onSeleccionar={setFormulario}
              />
            )}

            <button
              type="button"
              className="btn btn-sm app-modules-panel-action"
              onClick={() => void exportar()}
              disabled={!matriz || sinOperativos || exportando}
              title={
                sinOperativos
                  ? "No hay operativos que exportar en esta jornada."
                  : undefined
              }
            >
              {exportando ? "Exportando…" : "Exportar PDF"}
            </button>

            <button
              type="button"
              className="btn btn-sm app-modules-panel-action"
              onClick={() => setConfirmandoCierre(true)}
              disabled={!matriz || cerrado || cerrando}
              title={
                cerrado
                  ? "El cuadro ya fue cerrado."
                  : "Cerrar habilita la emisión de órdenes de servicio."
              }
            >
              {cerrado ? "Cuadro cerrado" : "Cerrar cuadro"}
            </button>
          </div>
        </div>

        <div className="app-data-panel-body flex flex-col gap-3 px-2 pb-4 pt-2 md:px-4">
          <TablaMatriz
            secciones={secciones}
            mensajeVacio={
              cargando
                ? "Cargando la matriz…"
                : sinJornada
                  ? "Sin jornada abierta para esta fecha."
                  : "No hay formularios que mostrar con el filtro aplicado."
            }
          />

          {/* Regla 6: la leyenda traduce a palabras lo que el color señala. */}
          <p className="text-xs text-base-content/70">
            Las celdas en Amarillo de Alerta indican asignación logística
            pendiente; el borde marcado señala un vehículo obligatorio sin
            conductor. Todas llevan el motivo en el texto emergente.
          </p>
        </div>
      </div>

      <ModalConfirmacion
        abierto={confirmandoCierre}
        titulo="¿Cerrar el cuadro del día?"
        mensaje={
          cabecera
            ? `Se cerrará ${cabecera.ordenTrabajo} con ${cabecera.totalOperativos} operativos, ${cabecera.totalAlertas} alertas y ${cabecera.formulariosSinCarga} formularios sin carga. Al cerrarlo se habilita la emisión de órdenes de servicio.`
            : ""
        }
        textoSi="Sí, cerrar"
        textoNo="Cancelar"
        procesando={cerrando}
        onConfirmar={() => void cerrar()}
        onCancelar={() => setConfirmandoCierre(false)}
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

export default MatrizConsolidadaPage;
