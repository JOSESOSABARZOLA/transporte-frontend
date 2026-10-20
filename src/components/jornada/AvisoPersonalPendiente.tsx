/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: AvisoPersonalPendiente.tsx
 * Responsabilidad: Decirle al departamento, esté donde esté, qué personal le espera.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-27
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OCUPA EL SITIO DE UNA NOTIFICACIÓN QUE NO EXISTE, Y POR ESO VIVE EN EL MARCO.
 *
 * El sistema **no tiene subsistema de notificaciones**: no hay tabla, ni módulo, ni
 * endpoint, y la campana de la barra superior devuelve la lista vacía por código. Los
 * canales NOT-01 a NOT-07 de `FASE2` §18 siguen `PENDIENTE DE VALIDACIÓN`, con una
 * advertencia escrita de que las fuentes «no establecen canal».
 *
 * El encargo sí era concreto: que el DMIT se entere de que otro departamento registró un
 * operativo que necesita a su gente. Se resolvió sin inventar canal ni destinatario:
 * **el aviso se da en la propia aplicación, en todas las pantallas**, porque un aviso que
 * solo aparece en la pantalla a la que hay que entrar para verlo no avisa de nada.
 *
 * Es ALV-08 de `FASE2` §18.1.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * TRES DECISIONES QUE CONVIENE NO DESHACER SIN LEER ESTO.
 *
 * **1 · No se monta para quien no puede actuar.** Regla 4 de `CLAUDE.md`: las pantallas
 * se montan según el rol, no se ocultan controles. Sin fila de participación, este
 * componente devuelve `null` antes de pedir nada, y `GET /jornada/:fecha` está reservado
 * con `@Roles` a quien corresponde: pedirla desde otro perfil daría un 403 en cada
 * navegación, y un error de consola no es una interfaz.
 *
 * **2 · No se pinta en la pantalla de la jornada.** Allí ya hay un recuento propio, y
 * ese sí sigue a la fecha que el usuario elija con el selector; este siempre habla de la
 * jornada que se está armando. Dos avisos con el mismo texto y distinto número serían
 * peor que ninguno.
 *
 * **3 · Se vuelve a consultar en cada cambio de ruta**, y no hace falta más. Es lo que
 * lo mantiene fresco sin eventos ni estado compartido: al asignar personal se navega, y
 * al navegar se recuenta. Mientras no se navega, el número no puede haber cambiado por
 * obra de quien mira.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, type FC } from "react";
import { useLocation } from "react-router-dom";

import BotonEnlace from "../common/BotonEnlace.tsx";

import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import { JornadaService } from "../../services/jornada.service.ts";
import { NOMBRE_AREA } from "../../utils/personal.util.ts";
import { fechaDeJornadaPorDefecto } from "../../utils/jornada.util.ts";
import { rolUser } from "../../config/env.ts";
import { useUser } from "../../hooks/useUser.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL DESTINO CAMBIÓ EL 2026-08-31, y con él la ruta en la que el aviso se calla.
 *
 * Hasta hoy llevaba a la Jornada del Día, que es donde se contaba lo pendiente. El
 * negocio pidió que lleve a **Mis operativos**, que es donde el DMIT ve los operativos
 * ajenos en los que le toca poner gente y tiene el botón para hacerlo.
 *
 * `RUTA_SILENCIO` sigue al destino, no se quedó en la jornada: un aviso que sigue
 * gritando en la pantalla a la que acaba de llevarte es ruido. En la Jornada del Día
 * vuelve a pintarse, y está bien —allí hay un recuento propio, pero ya no es el sitio
 * donde el aviso te deja—.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Y LLEVA `/home` DELANTE, QUE ES LO QUE FALTABA Y ROMPÍA EL ENLACE.
 *
 * Las dieciséis pantallas cuelgan de `/home` en `config/routes.tsx`: la ruta real de Mis
 * operativos es `/home/cuadro/mis-operativos`, no `/cuadro/mis-operativos`. Con la barra
 * inicial el enlace es ABSOLUTO y no casa con ninguna ruta, así que el enrutador no monta
 * nada y **la pantalla queda en blanco**, con el marco pintado y el contenido vacío.
 *
 * El defecto estuvo aquí desde que este componente se escribió, el 2026-08-27, apuntando
 * entonces a `/cuadro/jornada`. No lo detectó ninguna prueba porque el `MemoryRouter` de
 * la suite declara sus propias rutas sin el prefijo, de modo que allí sí casaba. La
 * prueba que lo fija ahora comprueba **el `href` completo**, que es lo que ve el navegador.
 *
 * El menú lateral nunca lo sufrió: usa rutas RELATIVAS —`cuadro/mis-operativos`, sin
 * barra— y se pinta dentro de `/home`, así que el enrutador las resuelve solas.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const RUTA_DESTINO = "/home/cuadro/mis-operativos";
const RUTA_SILENCIO = RUTA_DESTINO;

/** Los roles que reciben el aviso: los que tienen la jornada y pueden asignar en ella. */
const ROLES_CON_JORNADA = [rolUser.rolDmitInstructor] as const;

type Pendiente = { operativos: number; areas: AreaPersonal[] };

const AvisoPersonalPendiente: FC = () => {
  const { user } = useUser();
  const { pathname } = useLocation();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  const corresponde = Boolean(
    user?.rolCodes.some((rol) =>
      (ROLES_CON_JORNADA as readonly string[]).includes(rol),
    ),
  );

  useEffect(() => {
    /*
     * La guarda solo corta el efecto; **no toca el estado**. Vaciarlo aquí sería un
     * `setState` síncrono dentro del efecto, que encadena un render de más, y además
     * sobra: lo que decide si se pinta es `corresponde`, comprobado abajo, de modo que
     * un recuento viejo no puede llegar a la pantalla aunque siga en memoria.
     */
    if (!corresponde) return;

    let vigente = true;

    void (async () => {
      try {
        const jornada = await JornadaService.consultarJornada(
          fechaDeJornadaPorDefecto(),
        );

        const filas = jornada.secciones
          .flatMap((seccion) => seccion.filas)
          .filter((fila) => fila.areasPendientesDelRol.length > 0);

        if (vigente) {
          setPendiente({
            operativos: filas.length,
            areas: [
              ...new Set(filas.flatMap((fila) => fila.areasPendientesDelRol)),
            ],
          });
        }
      } catch {
        /*
         * EL AVISO CALLA SI NO PUEDE CONTAR, y no anuncia su propio fallo.
         *
         * Un 404 aquí es lo más corriente que hay: significa que nadie ha abierto todavía
         * el cuadro de mañana. Convertirlo en un banner de error pondría una franja roja
         * en las nueve pantallas todos los días hasta que el administrador abra el
         * cuadro, y quien la viera dejaría de leer los avisos que sí importan.
         *
         * Lo que de verdad falla se ve donde se puede resolver: la pantalla de la jornada
         * sí distingue el 404 del error y lo dice con palabras.
         */
        if (vigente) setPendiente(null);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [corresponde, pathname]);

  if (!corresponde) return null;
  if (!pendiente || pendiente.operativos === 0) return null;
  if (pathname === RUTA_SILENCIO) return null;

  return (
    /*
     * `role="status"` y no `role="alert"`: es un recuento que baja a medida que se asigna
     * personal, no una condición de error que deba interrumpir lo que se esté haciendo.
     *
     * Lleva el número **y** las áreas en palabras (regla 6), de modo que quien no
     * distinga el amarillo lee exactamente lo mismo. Y termina en un enlace, porque un
     * aviso que no se puede resolver desde donde se lee obliga a buscar el camino.
     */
    <AvisoEnLinea variante="advertencia" className="mb-4">
        {pendiente.operativos}{" "}
        {pendiente.operativos === 1 ? "operativo espera" : "operativos esperan"}{" "}
        personal que a su departamento le toca asignar:{" "}
        {pendiente.areas.map((area) => NOMBRE_AREA[area]).join(", ")}.{" "}
        <BotonEnlace to={RUTA_DESTINO} variante="enlace" tamano="sm">
          Ir a Mis operativos
        </BotonEnlace>
      </AvisoEnLinea>
  );
};

export default AvisoPersonalPendiente;
