/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Planificar el día (Transporte · DAF)
 * Archivo: AsignacionTransportePage.tsx
 * Responsabilidad: Pantalla P-03. Resolver el transporte de la jornada como un flujo guiado en
 *                  cuatro pasos: Preparar → Asignar → Fin del día → Emitir.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO LA DAF. La ruta la protege `RutaProtegida` (permiso `transporte:asignar`) y el servidor sus
 * endpoints bajo `/transporte`. **Ningún otro perfil monta este componente.**
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REDISEÑO 2026-10-08: UN PASO A LA VEZ. La pantalla mostraba todo junto —lista de chequeo, cinco
 * indicadores, cuatro controles, dos paneles y la línea de tiempo— y no se sabía por dónde empezar.
 * Ahora es un stepper con una acción principal por paso. La lógica no cambió (optimizador, libres,
 * compartir vehículo, fin del día, hoja de ruta, capacidad confirmada): cambió el orden.
 *
 * EL PASO NO SE GUARDA, SE DERIVA del estado de la jornada (`GET /transporte/jornada-daf/:fecha`)
 * con `derivarPaso`, espejo de la política del servidor: al volver otro día o recargar, la pantalla
 * abre en el paso que corresponde. Se puede volver a cualquier paso ya alcanzado, nunca saltar.
 *
 * LA VENTANA CIERRA LA ESCRITURA, NO LA CONSULTA. Con la ventana cerrada todo se ve en solo
 * lectura y cada botón deshabilitado dice por qué (`motivoBloqueo`). La emisión de hojas de ruta y
 * la confirmación de vehículos no dependen de la ventana.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { toast } from "../utils/mensaje.ts";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import Stepper from "../components/common/Stepper.tsx";
import PasoAsignar, {
  type VistaConductores,
} from "../components/transporte/planificar/PasoAsignar.tsx";
import PasoEmitir from "../components/transporte/planificar/PasoEmitir.tsx";
import PasoFinDelDia from "../components/transporte/planificar/PasoFinDelDia.tsx";
import PasoPreparar from "../components/transporte/planificar/PasoPreparar.tsx";
import { ROLES_DE_TRANSPORTE } from "../config/env.ts";
import { useFechaDaf } from "../context/FechaDafContext.tsx";
import { useVentanaCarga } from "../hooks/useVentanaCarga.ts";
import type { Paso, ResumenJornadaDaf } from "../interfaces/JornadaDaf.ts";
import { JornadaDafService } from "../services/jornadaDaf.service.ts";
import { ANTETITULO_DAF } from "../utils/daf.util.ts";
import { presentarError } from "../utils/errorApi.util.ts";
import { comoHoraInstitucional } from "../utils/horario.util.ts";
import {
  datosDelPaso,
  derivarPaso,
  pasoAlcanzable,
  PASOS,
} from "../utils/planificarDia.util.ts";
import {
  momentoRespectoDeVentana,
  textoDeVentana,
} from "../utils/ventanaCarga.util.ts";

const AsignacionTransportePage = () => {
  // La fecha de trabajo compartida de la DAF: la de `?fecha=` si viene, si no la última elegida.
  const { fecha, setFecha } = useFechaDaf();
  const [params, setParams] = useSearchParams();
  // La ventana de la DAF, no la del primer rol de quien entra (ver `useVentanaCarga`).
  const ventana = useVentanaCarga(ROLES_DE_TRANSPORTE);

  const [resumen, setResumen] = useState<ResumenJornadaDaf | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paso, setPaso] = useState<Paso>(1);
  // Los avisos de los pasos son éxitos rutinarios: aviso breve global.
  const avisar = useCallback((texto: string) => {
    toast.exito(texto);
  }, []);

  // La vista de los conductores va en la URL (`?vista=tabla`): la antigua «Jornada de los
  // conductores» redirige aquí abierta en la tabla, y recargar no la pierde.
  const vista: VistaConductores = params.get("vista") === "tabla" ? "tabla" : "linea";
  const setVista = (nueva: VistaConductores) => {
    const siguiente = new URLSearchParams(params);
    if (nueva === "tabla") siguiente.set("vista", "tabla");
    else siguiente.delete("vista");
    setParams(siguiente, { replace: true });
  };

  const momento = momentoRespectoDeVentana(ventana.ventana);
  const soloLectura = !ventana.puedeEscribir;
  const horaApertura = ventana.ventana?.horaApertura
    ? comoHoraInstitucional(ventana.ventana.horaApertura)
    : null;
  const estadoVentana = textoDeVentana(
    momento,
    ventana.cuentaAtras,
    horaApertura,
    ventana.horaCierre,
    ventana.ventana?.motivoApertura ?? null,
  );
  /** El `title` de todo botón deshabilitado por la ventana: nunca un gris sin motivo. */
  const motivoBloqueo = soloLectura
    ? momento === "ANTES" && horaApertura
      ? `Disponible a las ${horaApertura}`
      : estadoVentana.texto
    : null;

  const derivado = useMemo(
    () => (resumen ? derivarPaso(datosDelPaso(resumen)) : null),
    [resumen],
  );

  /*
    SOLO MANDA LA ÚLTIMA LECTURA (2026-10-08). Cambiar la fecha dispara una lectura nueva mientras la
    anterior sigue en vuelo —el selector nativo emite un cambio por cada segmento tecleado—. Sin este
    contador, la respuesta que llega TARDE (la de la fecha abandonada) pisaba el resumen y el paso de
    la fecha elegida: la pantalla abría en «Preparar» con las hojas ya emitidas.
  */
  const ultimaLectura = useRef(0);

  /** Lee la jornada. Al cargar y al cambiar de fecha, abre en el paso que corresponde. */
  const cargar = useCallback(
    async (abrirEnPasoInicial: boolean): Promise<ResumenJornadaDaf | null> => {
      const lectura = ++ultimaLectura.current;
      const vigente = () => lectura === ultimaLectura.current;
      try {
        const datos = await JornadaDafService.resumen(fecha);
        if (!vigente()) return null;
        setResumen(datos);
        setError(null);
        const { pasoInicial, completos } = derivarPaso(datosDelPaso(datos));
        setPaso((actual) =>
          abrirEnPasoInicial || !pasoAlcanzable(actual, completos, pasoInicial)
            ? pasoInicial
            : actual,
        );
        return datos;
      } catch (fallo: unknown) {
        if (!vigente()) return null;
        setResumen(null);
        setError(presentarError(fallo).mensaje);
        return null;
      } finally {
        if (vigente()) setCargando(false);
      }
    },
    [fecha],
  );

  useEffect(() => {
    setCargando(true);
    void cargar(true);
  }, [cargar]);

  const recargar = useCallback(() => cargar(false), [cargar]);

  const ir = (destino: number) => {
    if (!derivado) return;
    const numero = destino as Paso;
    if (pasoAlcanzable(numero, derivado.completos, derivado.pasoInicial)) setPaso(numero);
  };

  const subtitulos: Partial<Record<number, string>> = resumen
    ? {
        1: resumen.preparacion.listos ? "Todo listo" : "Revisar requisitos",
        2: `${resumen.totales.cubiertos} de ${resumen.totales.operativos} cubiertos`,
        3: "Dónde se guarda cada vehículo",
        4: "Hojas de ruta",
      }
    : {};

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="page-heading-kicker font-semibold uppercase">{ANTETITULO_DAF}</p>
          <h1 className="page-heading-title">Planificar el día</h1>
        </div>
        <div className="app-page-header-actions flex">
          <div className="form-control">
            <label className="label" htmlFor="fechaCuadro">
              <span className="text-app-label text-xs uppercase tracking-[0.12em]">
                Fecha de la jornada
              </span>
            </label>
            <input
              id="fechaCuadro"
              type="date"
              className="input input-bordered input-sm"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
          </div>
        </div>
      </header>

      {derivado && (
        <div className="rounded-3xl border border-base-300 bg-base-100 px-6 py-4">
          <Stepper
            etiqueta="Pasos de la planificación"
            pasos={[...PASOS]}
            actual={paso}
            completados={PASOS.filter((p) => derivado.completos[p.numero]).map((p) => p.numero)}
            subtitulos={subtitulos}
            alcanzables={PASOS.filter((p) =>
              pasoAlcanzable(p.numero, derivado.completos, derivado.pasoInicial),
            ).map((p) => p.numero)}
            onIr={ir}
          />
        </div>
      )}

      {cargando && (
        <p className="py-6 text-center text-sm text-app-muted" role="status">
          Cargando la jornada…
        </p>
      )}

      {!cargando && error && (
        <AvisoEnLinea
          variante="error"
          titulo="No se pudo cargar la jornada"
          accion={
            <Boton tamano="sm" onClick={() => void recargar()}>
              Reintentar
            </Boton>
          }
        >
          {error}
        </AvisoEnLinea>
      )}

      {!cargando && resumen && paso === 1 && (
        <PasoPreparar
          fecha={fecha}
          resumen={resumen}
          onRecargar={async () => {
            await recargar();
          }}
          onContinuar={() => ir(2)}
          onAviso={avisar}
        />
      )}
      {!cargando && resumen && paso === 2 && (
        <PasoAsignar
          fecha={fecha}
          resumen={resumen}
          soloLectura={soloLectura}
          motivoBloqueo={motivoBloqueo}
          vista={vista}
          onVista={setVista}
          onRecargar={recargar}
          onVolver={() => ir(1)}
          onContinuar={() => ir(3)}
          onAviso={avisar}
        />
      )}
      {!cargando && resumen && paso === 3 && (
        <PasoFinDelDia
          key={fecha}
          fecha={fecha}
          resumen={resumen}
          soloLectura={soloLectura}
          motivoBloqueo={motivoBloqueo}
          onRecargar={recargar}
          onVolver={() => ir(2)}
          onContinuar={() => setPaso(4)}
          onAviso={avisar}
        />
      )}
      {!cargando && resumen && paso === 4 && (
        <PasoEmitir
          fecha={fecha}
          resumen={resumen}
          onRecargar={recargar}
          onVolver={() => ir(3)}
          onAviso={avisar}
        />
      )}

    </section>
  );
};

export default AsignacionTransportePage;
