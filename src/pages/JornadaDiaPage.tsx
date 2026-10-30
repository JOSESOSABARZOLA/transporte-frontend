/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: JornadaDiaPage.tsx
 * Responsabilidad: Pantalla P-13. Seguir la jornada y asignar personal donde corresponde.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO ES LA MATRIZ CONSOLIDADA, AUNQUE SE LE PAREZCA. Y LA DIFERENCIA ES LA RAZÓN DE SER.
 *
 * P-04 es de la Dirección: los nueve formularios, exportable a PDF y con el cierre de la
 * jornada. Esto es de **DMIT Instrucción**: los nueve en pantalla, el personal editable
 * solo donde su rol participa, y **ni exportación ni cierre**.
 *
 * El PDF no está por decisión, no por olvido: es el artefacto que circulaba por WhatsApp
 * y que RN-44 retiró de los canales informales. Que el DMIT vea la jornada en pantalla se
 * decidió el 2026-08-26; que pueda llevársela en un archivo firmable, no se pidió.
 *
 * Y NO COMPARTE NI UN COMPONENTE CON P-04. `components/jornada/` es copia de
 * `components/matriz/`, a propósito: dos pantallas con modelos de permiso distintos que
 * compartieran piezas son por donde se cuela una regresión, y la que se llevaría la
 * sorpresa sería la que más se restringe.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * VE MÁS DE LO QUE PUEDE TOCAR, Y ESO SE DICE CON PALABRAS.
 *
 * De los nueve formularios, el DMIT participa hoy en cuatro. En los otros cinco solo mira.
 * La diferencia no puede quedar cifrada en la presencia o ausencia de un botón al final
 * de cada fila: cada banner la escribe —«personal editable» o «solo lectura»— y el
 * desplegable del filtro la repite (regla 6).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA PROTECCIÓN ES DOBLE Y NINGUNA SUSTITUYE A LA OTRA. `RutaProtegida` impide entrar por
 * URL; `@Roles(DMIT_INSTRUCTOR)` en `/jornada` impide obtener los datos; y
 * `exigirParticipacion` impide escribir donde no corresponde, mire lo que mire la
 * pantalla. Si alguna vez discrepan, manda el servidor.
 *
 * PLANTILLA VISUAL (2026-10-24). El encabezado es `EncabezadoPagina`: el antetítulo es el módulo
 * y el perfil va como chip, el de la sesión (decía «DMIT Instrucción» fijo, y la abren los tres
 * departamentales). Los chips —código · fecha en palabras · semana · estado, y después operativos,
 * alertas y editables— suben al encabezado; el banner de la ventana queda justo debajo. La tabla va
 * en `PanelTabla`: el filtro de formulario baja a la barra blanca y la leyenda, a la nota del pie.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import AvisoVentana from "../components/common/AvisoVentana.tsx";
import Boton from "../components/common/Boton.tsx";
import EncabezadoPagina from "../components/common/EncabezadoPagina.tsx";
import PanelTabla from "../components/common/PanelTabla.tsx";
import FiltroJornada, {
  TODOS_LOS_FORMULARIOS,
} from "../components/jornada/FiltroJornada.tsx";
import PanelPersonalJornada from "../components/jornada/PanelPersonalJornada.tsx";
import TablaJornada from "../components/jornada/TablaJornada.tsx";
import { colorEstado, rolUser } from "../config/env.ts";
import { useUser } from "../hooks/useUser.ts";
import { useVentanaCarga } from "../hooks/useVentanaCarga.ts";
import { nombreEstadoCuadro } from "../interfaces/CuadroDiario.ts";
import type {
  FilaJornada,
  Jornada,
  SeccionJornada,
} from "../interfaces/Jornada.ts";
import { JornadaService } from "../services/jornada.service.ts";
import { NOMBRE_AREA } from "../utils/personal.util.ts";
import { presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import { esperaDeLaJornada, fechaDeJornadaPorDefecto } from "../utils/jornada.util.ts";
import { fechaEnPalabras } from "../utils/texto.util.ts";

/** Los roles bajo los que opera esta pantalla. Hoy es uno. */
const ROLES_DE_LA_PANTALLA = [rolUser.rolDmitInstructor] as const;

const JornadaDiaPage = () => {
  /**
   * LA JORNADA QUE SE PROPONE ES LA DE MAÑANA, no la de hoy. RN-01.
   *
   * Es la que se está armando, que es justamente lo que esta pantalla vino a resolver:
   * ver cómo se llena el cuadro mientras se llena. Para revisar una ya ejecutada se
   * retrocede con el selector, que admite cualquier fecha.
   */
  const [fecha, setFecha] = useState(() => fechaDeJornadaPorDefecto());

  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinJornada, setSinJornada] = useState(false);
  const [formulario, setFormulario] = useState(TODOS_LOS_FORMULARIOS);
  const [aviso, setAviso] = useState<AvisoTexto | null>(
    null,
  );

  /** La fila cuyo personal se está editando. `null` con el panel cerrado. */
  const [enPanel, setEnPanel] = useState<{
    fila: FilaJornada;
    seccion: SeccionJornada;
  } | null>(null);

  const ventana = useVentanaCarga(ROLES_DE_LA_PANTALLA);
  const { user } = useUser();

  const cargar = useCallback(async () => {
    setCargando(true);
    setSinJornada(false);

    try {
      setJornada(await JornadaService.consultarJornada(fecha));
      setAviso(null);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setJornada(null);

      // Un 404 es una jornada que nadie abrió, no una avería del sistema.
      if (error.estado === 404) {
        setSinJornada(true);
      } else {
        // Que la jornada no cargue es un ERROR (no una advertencia): no hay nada que corregir aquí.
        setAviso({ texto: error.mensaje, variante: "error" });
      }
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const secciones = useMemo(() => {
    if (!jornada) return [];
    if (formulario === TODOS_LOS_FORMULARIOS) return jornada.secciones;

    return jornada.secciones.filter((seccion) => seccion.codigo === formulario);
  }, [jornada, formulario]);

  const cabecera = jornada?.cabecera;
  const estado = cabecera ? nombreEstadoCuadro[cabecera.estado] : null;
  const cerrado = cabecera?.estado === "CERRADO";

  /**
   * Cuándo no se puede asignar, y por qué.
   *
   * Son dos motivos distintos y el funcionario necesita saber cuál le toca: el cuadro
   * cerrado es definitivo para él —solo la Dirección escribe sobre él (RN-63)— y la
   * ventana cerrada es cuestión de hora. Devolverlos como un solo booleano dejaría el
   * botón apagado sin explicación, que es lo que este sistema existe para evitar.
   */
  const motivoBloqueo = cerrado
    ? "El cuadro del día ya fue cerrado: solo la Dirección puede modificarlo."
    : !ventana.puedeEscribir
      ? ventana.mensaje ||
        "La ventana de carga de su departamento está cerrada."
      : null;

  const editables = useMemo(
    () =>
      (jornada?.secciones ?? []).filter(
        (seccion) => seccion.acceso !== "LECTURA",
      ).length,
    [jornada],
  );

  /**
   * ════════════════════════════════════════════════════════════════════════════════
   * CUÁNTO TRABAJO DE PERSONAL LE ESPERA, Y DE QUÉ ÁREAS.
   *
   * OCUPA EL SITIO DE UNA NOTIFICACIÓN QUE NO EXISTE, y conviene decirlo aquí para que
   * nadie lo tome por un adorno. El encargo era avisar al DMIT cuando DMIP Operativos
   * registra un operativo que necesita a su gente. El sistema **no tiene subsistema de
   * notificaciones** —la campana de la barra superior no consulta nada, y los canales
   * NOT-01 a NOT-07 de FASE2 §18 siguen sin validar—, así que el aviso se da donde el
   * DMIT ya trabaja: en su propia jornada.
   *
   * SE CUENTA SOBRE LA JORNADA ENTERA, NO SOBRE EL FILTRO. Filtrar es una forma de mirar,
   * no de que el trabajo desaparezca: si el recuento siguiera al filtro, elegir un
   * formulario ocultaría lo que falta en los otros, que es justo lo que este aviso existe
   * para que no pase.
   *
   * LAS ÁREAS LLEGAN CALCULADAS del servidor (`areasPendientesDelRol`). Aquí solo se
   * suman y se traducen: el navegador no sabe de `farea_es_compartida`, y recalcularlo
   * podría reclamar gente que el servidor rechazaría al asignarla.
   * ════════════════════════════════════════════════════════════════════════════════
   */
  const esperando = useMemo(
    () =>
      esperaDeLaJornada(
        (jornada?.secciones ?? []).flatMap((seccion) => seccion.filas),
      ),
    [jornada],
  );

  return (
    <section className="app-page-shell">
      {/* El chip «Perfil» dice quién mira. En un sistema cuyo encargo nació del aislamiento
          de la información, esa línea no es adorno. */}
      <EncabezadoPagina
        modulo="Cuadro de Colores"
        titulo="Jornada del Día"
        subtitulo="La jornada completa. Puede asignar personal en los formularios en los que su departamento participa; el resto se muestra en lectura."
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
              {/* Cuántos puede tocar, dicho con número y palabra. */}
              <span className="badge badge-ghost badge-sm">
                {editables} de {jornada?.secciones.length ?? 0} formularios
                editables
              </span>
            </>
          )
        }
        contexto={
          <div className="form-control">
            <label
              className="label"
              htmlFor="fechaJornada"
            >
              <span className="text-app-label text-xs uppercase tracking-[0.12em]">
                Fecha del cuadro
              </span>
            </label>
            <input
              id="fechaJornada"
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

      <AvisoVentana cuentaAtras={ventana.cuentaAtras} />

      {sinJornada && (
        <AvisoEnLinea variante="info">
          No hay una jornada abierta para el {fecha}. El administrador debe
          abrir el cuadro del día.
        </AvisoEnLinea>
      )}

      {/*
        EL AVISO QUE SUSTITUYE A LA NOTIFICACIÓN. Va antes que el de RN-53 porque es el
        único de esta pantalla sobre el que el DMIT puede actuar ahora mismo.

        `role="status"` y no `role="alert"`: es un recuento que baja a medida que se
        asigna personal, no una condición de error que interrumpa. Lleva el número **y**
        las áreas en palabras (regla 6), de modo que quien no distinga el amarillo lee
        exactamente lo mismo.
      */}
      {esperando.operativos > 0 && (
        <AvisoEnLinea variante="advertencia">
          {esperando.operativos}{" "}
          {esperando.operativos === 1
            ? "operativo espera"
            : "operativos esperan"}{" "}
          personal que a su departamento le toca asignar:{" "}
          {esperando.areas.map((area) => NOMBRE_AREA[area]).join(", ")}. Cada
          fila lo indica en la columna Acciones.
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

      <PanelTabla
        titulo="Jornada del día"
        filtros={
          jornada && (
            <FiltroJornada
              secciones={jornada.secciones}
              seleccionado={formulario}
              onSeleccionar={setFormulario}
            />
          )
        }
        /* Regla 6: la leyenda traduce a palabras lo que el color señala. */
        nota="Las celdas en Amarillo de Alerta indican asignación logística pendiente; el borde marcado señala un vehículo obligatorio sin conductor. Todas llevan el motivo en el texto emergente. Aquí solo aparecen los formularios en los que su departamento participa."
      >
        <TablaJornada
          secciones={secciones}
          mensajeVacio={
            cargando
              ? "Cargando la jornada…"
              : sinJornada
                ? "Sin jornada abierta para esta fecha."
                : "No hay formularios que mostrar con el filtro aplicado."
          }
          onEditarPersonal={(fila, seccion) => setEnPanel({ fila, seccion })}
          bloqueado={Boolean(motivoBloqueo)}
          motivoBloqueo={motivoBloqueo}
        />
      </PanelTabla>

      {enPanel && (
        <PanelPersonalJornada
          fila={enPanel.fila}
          seccion={enPanel.seccion}
          fecha={fecha}
          roles={user?.rolCodes ?? []}
          // Si la ventana o el cuadro se cierran con el cajón abierto, «Guardar cambios» se apaga.
          motivoBloqueo={motivoBloqueo}
          onCerrar={() => setEnPanel(null)}
          onCambio={() => void cargar()}
        />
      )}
    </section>
  );
};

export default JornadaDiaPage;
