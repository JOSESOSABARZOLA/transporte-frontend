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
 * Por eso pasa por una confirmación (`MensajeModal`) y por eso el aviso enumera lo que la Dirección está
 * firmando: cuántos operativos, cuántas alertas y cuántos formularios quedaron sin cargar.
 *
 * REABRIR (2026-10-08). El endpoint existía desde el inicio y ninguna pantalla lo llamaba: la
 * Dirección no tenía cómo deshacer un cierre. Con el cuadro cerrado, quien tiene
 * `cuadro:cerrar-reabrir` ve «Reabrir cuadro» en lugar del botón apagado. El cuadro vuelve a
 * APROBADO —la única marcha atrás de INV-03— y la confirmación dice lo que NO hace: no abre la
 * carga de los departamentos ni de la DAF (siguen sus ventanas) y no recoge las órdenes ya
 * emitidas. Lo que sí vuelve a admitir son los adicionales, que no dependen de la ventana.
 *
 * PLANTILLA VISUAL (2026-10-24). El encabezado es `EncabezadoPagina`: el antetítulo es el módulo y
 * el perfil de la sesión va como chip (decía «Dirección» fijo); los chips —código · fecha en
 * palabras · semana · estado, y después operativos, alertas y flota— suben al encabezado, con la
 * «Fecha del cuadro» a la derecha. La tabla va en `PanelTabla`: «Exportar PDF» y «Cerrar /
 * Reabrir cuadro» siguen en la cabecera azul (las variantes de barra las pone el panel), el filtro
 * de formulario baja a la barra blanca y la leyenda, a la nota del pie.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import FiltroFormulario, {
  TODOS_LOS_FORMULARIOS,
} from "../components/matriz/FiltroFormulario.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import EncabezadoPagina from "../components/common/EncabezadoPagina.tsx";
import MensajeModal from "../components/common/MensajeModal.tsx";
import PanelTabla from "../components/common/PanelTabla.tsx";
import TablaMatriz from "../components/matriz/TablaMatriz.tsx";
import { colorEstado } from "../config/env.ts";
import { usePermiso, useTieneRol } from "../hooks/usePermiso.ts";
import { useUser } from "../hooks/useUser.ts";
import { ROLES_REQUERIDOS } from "../config/routes.tsx";
import { nombreEstadoCuadro } from "../interfaces/CuadroDiario.ts";
import type { Matriz } from "../interfaces/Documento.ts";
import { CuadroDiarioService } from "../services/cuadroDiario.service.ts";
import { DocumentoService } from "../services/documento.service.ts";
import { descargarArchivo } from "../utils/banner.util.ts";
import { presentarError, varianteDeAviso, type AvisoTexto } from "../utils/errorApi.util.ts";
import { fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import { fechaEnPalabras } from "../utils/texto.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";

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
  const [confirmandoReapertura, setConfirmandoReapertura] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const puedeReabrir = usePermiso("cuadro:cerrar-reabrir");
  const { user } = useUser();
  // «Ver órdenes» solo a quien abre esa pantalla: el permiso Y el rol que exige la ruta.
  const navegar = useNavigate();
  const conPermisoOrdenes = usePermiso("ordenes:gestionar");
  const conRolOrdenes = useTieneRol(ROLES_REQUERIDOS["cuadro/ordenes"]);
  const puedeVerOrdenes = conPermisoOrdenes && conRolOrdenes;

  /** Solo el error de CARGA de la matriz; los de las acciones son mensajes estándar. */
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  /** Cerrar o reabrir se confirma con un aviso breve (antes, `ModalExito`): la cabecera ya dice el estado. */

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
        setAviso({ texto: error.mensaje, variante: varianteDeAviso(error.trato) });
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

    try {
      const documento = await DocumentoService.exportarMatriz(fecha);
      descargarArchivo(documento, `matriz-consolidada-${fecha}.pdf`);
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudo exportar la matriz" });
    } finally {
      setExportando(false);
    }
  }, [fecha]);

  const cerrar = useCallback(async () => {
    setCerrando(true);

    try {
      const cuadro = await CuadroDiarioService.cerrar(fecha);
      setConfirmandoCierre(false);
      // Un HITO (M7): modal de éxito, con el paso siguiente a mano si se puede dar.
      void mensaje.exito({
        titulo: `Cuadro ${cuadro.ordenTrabajo} cerrado`,
        mensaje: "Ya se pueden emitir las órdenes de servicio.",
        ...(puedeVerOrdenes
          ? {
              textoSecundario: "Cerrar",
              textoPrincipal: "Ver órdenes",
              onPrincipal: () => navegar(`/home/cuadro/ordenes?fecha=${fecha}`),
            }
          : { textoPrincipal: "Aceptar" }),
      });
      await cargar();
      // Si falla, lanza: el 409 nombra el operativo nocturno que sigue sin conductor y se muestra
      // tal cual en el mismo modal, porque es lo que hay que resolver antes de volver a intentarlo.
    } finally {
      setCerrando(false);
    }
  }, [fecha, cargar, puedeVerOrdenes, navegar]);

  const reabrir = useCallback(async () => {
    setReabriendo(true);

    try {
      const cuadro = await CuadroDiarioService.reabrir(fecha);
      setConfirmandoReapertura(false);
      toast.exito(
        `Cuadro ${cuadro.ordenTrabajo} reabierto. Vuelve a estar aprobado; ciérrelo de nuevo cuando termine los cambios.`,
      );
      await cargar();
      // Si falla, lanza: el error queda en el modal de la confirmación.
    } finally {
      setReabriendo(false);
    }
  }, [fecha, cargar]);

  const cabecera = matriz?.cabecera;
  const estado = cabecera ? nombreEstadoCuadro[cabecera.estado] : null;
  const cerrado = cabecera?.estado === "CERRADO";
  const sinOperativos = (cabecera?.totalOperativos ?? 0) === 0;

  return (
    <section className="app-page-shell">
      {/* El chip «Perfil» dice quién mira. En un sistema cuyo encargo nació del aislamiento
          de la información, esa línea no es adorno. */}
      <EncabezadoPagina
        modulo="Cuadro de Colores"
        titulo="Matriz Consolidada del Día"
        subtitulo="El compilado de los nueve formularios. Ningún otro perfil lo ve completo."
        perfil={user?.rolName}
        chips={
          cabecera && (
            <>
              <span className="badge badge-ghost badge-sm">
                {cabecera.ordenTrabajo}
              </span>
              <span className="badge badge-ghost badge-sm">
                {fechaEnPalabras(cabecera.fecha)}
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
            </>
          )
        }
        contexto={
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaMatriz"
            >
              <span className="text-app-label text-xs uppercase tracking-[0.12em]">
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
        }
      />

      {sinJornada && (
        <AvisoEnLinea variante="info">
          No hay una jornada abierta para el {fecha}. El administrador debe
          abrir el cuadro del día.
        </AvisoEnLinea>
      )}

      {/* RN-53. Lo que falta se dice arriba, no solo dentro de cada sección. */}
      {cabecera && cabecera.formulariosSinCarga > 0 && (
        <AvisoEnLinea variante="advertencia">
          {cabecera.formulariosSinCarga}{" "}
          {cabecera.formulariosSinCarga === 1
            ? "formulario no fue ingresado"
            : "formularios no fueron ingresados"}
          . Cada uno deja constancia en su sección, con el departamento
          responsable y la hora de cierre de su ventana.
        </AvisoEnLinea>
      )}

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudo cargar la matriz"
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
        titulo="Matriz consolidada"
        acciones={
          <>
            <Boton
              variante="secundario"
              tamano="md"
              onClick={() => void exportar()}
              cargando={exportando}
              deshabilitado={!matriz}
              motivoDeshabilitado={
                sinOperativos ? "No hay operativos que exportar en esta jornada." : null
              }
            >
              {exportando ? "Exportando…" : "Exportar PDF"}
            </Boton>

            {cerrado && puedeReabrir ? (
              <Boton
                variante="secundario"
                tamano="md"
                onClick={() => setConfirmandoReapertura(true)}
                cargando={reabriendo}
                title="Devuelve el cuadro a Aprobado para corregirlo."
              >
                {reabriendo ? "Reabriendo…" : "Reabrir cuadro"}
              </Boton>
            ) : (
              <Boton
                variante="primario"
                tamano="md"
                onClick={() => setConfirmandoCierre(true)}
                cargando={cerrando}
                deshabilitado={!matriz}
                motivoDeshabilitado={cerrado ? "El cuadro ya fue cerrado." : null}
                title="Cerrar habilita la emisión de órdenes de servicio."
              >
                {cerrado ? "Cuadro cerrado" : "Cerrar cuadro"}
              </Boton>
            )}
          </>
        }
        filtros={
          matriz && (
            <FiltroFormulario
              secciones={matriz.secciones}
              seleccionado={formulario}
              onSeleccionar={setFormulario}
            />
          )
        }
        /* Regla 6: la leyenda traduce a palabras lo que el color señala. */
        nota="Las celdas en Amarillo de Alerta indican asignación logística pendiente; el borde marcado señala un vehículo obligatorio sin conductor. Todas llevan el motivo en el texto emergente."
      >
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
      </PanelTabla>

      <MensajeModal
        abierto={confirmandoCierre}
        variante="advertencia"
        titulo="¿Cerrar el cuadro del día?"
        mensaje={
          cabecera
            ? `Se cerrará ${cabecera.ordenTrabajo} con ${cabecera.totalOperativos} operativos, ${cabecera.totalAlertas} alertas y ${cabecera.formulariosSinCarga} formularios sin carga. Al cerrarlo se habilita la emisión de órdenes de servicio.`
            : ""
        }
        textoPrincipal="Sí, cerrar"
        tituloError="No se pudo cerrar el cuadro"
        onPrincipal={cerrar}
        onSecundario={() => setConfirmandoCierre(false)}
      />

      <MensajeModal
        abierto={confirmandoReapertura}
        variante="advertencia"
        titulo="¿Reabrir el cuadro del día?"
        mensaje={
          cabecera
            ? `${cabecera.ordenTrabajo} volverá al estado Aprobado. Se podrán registrar operativos adicionales; la carga de los departamentos y la asignación de transporte siguen sujetas a sus ventanas. Las órdenes de servicio ya emitidas no se anulan. Cuando termine, vuelva a cerrarlo desde esta pantalla.`
            : ""
        }
        textoPrincipal="Sí, reabrir"
        tituloError="No se pudo reabrir el cuadro"
        onPrincipal={reabrir}
        onSecundario={() => setConfirmandoReapertura(false)}
      />
    </section>
  );
};

export default MatrizConsolidadaPage;
