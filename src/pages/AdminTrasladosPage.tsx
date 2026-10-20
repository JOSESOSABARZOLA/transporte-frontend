/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Traslados entre zonales
 * Archivo: AdminTrasladosPage.tsx
 * Responsabilidad: Pantalla M-37. Minutos de traslado de una zonal a otra (origen × destino).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Es lo que la planificación usa para saber si un conductor llega de un operativo al siguiente.
 * Cada celda acepta de 0 a 600 minutos; VACÍA significa «se aplica la regla general» (misma zonal,
 * mismo sector u otro sector), y la regla se muestra arriba y como sugerencia en la celda.
 *
 * Se guarda en bloque: «Guardar cambios» envía SOLO los pares tocados (un vacío viaja como `null`,
 * que devuelve el par a la regla general). Mientras haya algo sin guardar, se dice en palabras.
 * Permiso `flota:administrar`, el mismo en la ruta y en el menú (regla 4).
 *
 * DMQ NO ENTRA EN LA MATRIZ (2026-10-06). «DMQ» es todo el distrito (operativos distritales): no
 * tiene punto de partida propio y sus traslados usan siempre la regla de otro sector. El servidor la
 * marca con `esTodoElDistrito` y aquí se excluye de filas y columnas; tampoco figura ya en el aviso
 * de «zonales sin sector», que queda solo para las que de verdad tienen el dato pendiente.
 *
 * ESCALA DE COLOR FIJA: ≤ 30 min corto, 31–60 medio, > 60 largo (`utils/traslados.util.ts`).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import PanelCatalogo from "../components/catalogos/PanelCatalogo.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import Insignia from "../components/common/Insignia.tsx";
import {
  TrasladosService,
  type MatrizTraslados,
  type ParTraslado,
  type ZonalTraslado,
} from "../services/traslados.service.ts";
import { avisoDeFallo, type AvisoTexto } from "../utils/errorApi.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";
import { ANTETITULO_DAF } from "../utils/daf.util.ts";
import {
  CLASE_RANGO_TRASLADO,
  LIMITE_CORTO_MIN,
  LIMITE_MEDIO_MIN,
  rangoTraslado,
  textoCobertura,
} from "../utils/traslados.util.ts";

const SECTOR: Record<string, string> = {
  NORTE: "Norte",
  SUR: "Sur",
  CENTRO: "Centro",
  VALLE: "Valle",
};

const nombreSector = (sector: string | null): string =>
  sector ? (SECTOR[sector] ?? sector) : "Sin sector";

const clave = (origen: number, destino: number): string => `${origen}-${destino}`;

/** Vacío o un entero de 0 a 600. */
const esValido = (texto: string): boolean =>
  texto.trim() === "" ||
  (/^\d{1,3}$/.test(texto.trim()) && Number(texto.trim()) <= 600);

const AdminTrasladosPage = () => {
  /** «Aplicar también a B→A»: al escribir A→B se copia en la celda simétrica. */
  const [simetrico, setSimetrico] = useState(false);
  const [matriz, setMatriz] = useState<MatrizTraslados | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  /** Lo tecleado y aún no guardado, por par «origen-destino». */
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setMatriz(await TrasladosService.obtener());
      setAviso(null);
    } catch (fallo: unknown) {
      setAviso(avisoDeFallo(fallo));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Lo guardado en el servidor, como texto («» = regla general). */
  const guardados = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const par of matriz?.pares ?? []) {
      mapa[clave(par.zonalOrigenId, par.zonalDestinoId)] =
        par.minutos === null ? "" : String(par.minutos);
    }
    return mapa;
  }, [matriz]);

  /** Los pares que difieren de lo guardado. */
  const cambiados = useMemo(
    () =>
      Object.entries(borrador).filter(
        ([par, texto]) => texto.trim() !== (guardados[par] ?? ""),
      ),
    [borrador, guardados],
  );
  const invalidos = cambiados.filter(([, texto]) => !esValido(texto)).length;

  /** Lo que la regla general daría para un par (sugerencia de la celda vacía). */
  const reglaPara = (origen: ZonalTraslado, destino: ZonalTraslado): number | null => {
    if (!matriz) return null;
    const regla = matriz.reglaGeneral;
    if (origen.id === destino.id) return regla.mismaZona;
    if (origen.sector && origen.sector === destino.sector) return regla.mismoSector;
    return regla.otroSector;
  };

  /** Escribe una celda (y su simétrica si está marcado «aplicar también a B→A»). */
  const escribir = (origenId: number, destinoId: number, texto: string) =>
    setBorrador((previo) => ({
      ...previo,
      [clave(origenId, destinoId)]: texto,
      ...(simetrico && origenId !== destinoId
        ? { [clave(destinoId, origenId)]: texto }
        : {}),
    }));

  /** Todas las celdas con minutos propios (guardados o tecleados). */
  const personalizadas = Object.keys({ ...guardados, ...borrador }).filter(
    (par) => (borrador[par] ?? guardados[par] ?? "").trim() !== "",
  );

  /** «Restablecer todo a la regla general»: vacía cada celda propia; se aplica al guardar. */
  const restablecerTodo = () =>
    setBorrador((previo) => {
      const siguiente = { ...previo };
      for (const par of personalizadas) siguiente[par] = "";
      return siguiente;
    });

  const guardar = async () => {
    if (cambiados.length === 0 || invalidos > 0) return;
    const pares: ParTraslado[] = cambiados.map(([par, texto]) => {
      const [origen, destino] = par.split("-").map(Number);
      return {
        zonalOrigenId: origen,
        zonalDestinoId: destino,
        minutos: texto.trim() === "" ? null : Number(texto.trim()),
      };
    });

    setGuardando(true);
    try {
      const { guardados: cuantos } = await TrasladosService.guardar(pares);
      setBorrador({});
      toast.exito(cuantos === 1 ? "Se guardó 1 traslado" : `Se guardaron ${cuantos} traslados`);
      await cargar();
    } catch (fallo: unknown) {
      // Regla 7: el mensaje del servidor, tal cual. Lo tecleado se conserva.
      void mensaje.errorDe(fallo, { titulo: "No se pudieron guardar los traslados" });
    } finally {
      setGuardando(false);
    }
  };

  // DMQ (todo el distrito) no tiene traslados propios: fuera de la matriz.
  const zonales = (matriz?.zonales ?? []).filter((zonal) => !zonal.esTodoElDistrito);
  const idsDistrito = new Set(
    (matriz?.zonales ?? []).filter((zonal) => zonal.esTodoElDistrito).map((zonal) => zonal.id),
  );
  const sinSector = (matriz?.zonalesSinSector ?? []).filter(
    (zonal) => !idsDistrito.has(zonal.id),
  );

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="page-heading-kicker font-semibold uppercase">
            {ANTETITULO_DAF}
          </p>
          <h1 className="page-heading-title">Traslados entre zonales</h1>
          <p className="page-heading-subtitle text-sm">
            Minutos que tarda un vehículo de una zonal (fila) a otra (columna). Con
            ellos la planificación sabe si un conductor llega a su siguiente
            operativo.
          </p>
        </div>
      </header>

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudieron cargar los traslados"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      <PanelCatalogo
        titulo="Minutos de traslado"
        distintivo={
          <span className="flex flex-wrap items-center gap-2">
            <span className="badge badge-ghost badge-sm whitespace-nowrap">
              {cargando
                ? "Cargando…"
                : `${zonales.length} ${zonales.length === 1 ? "zonal" : "zonales"}`}
            </span>
            {matriz?.cobertura && matriz.cobertura.sinTiempo > 0 && (
              <Insignia
                variante="avisoSuave"
                className="whitespace-nowrap"
                title={textoCobertura(matriz.cobertura, matriz.reglaGeneral)}
              >
                Pares sin tiempo: {matriz.cobertura.sinTiempo}
              </Insignia>
            )}
            {cambiados.length > 0 && (
              <span
                className="badge badge-warning badge-sm whitespace-nowrap"
                role="status"
              >
                Cambios sin guardar: {cambiados.length}
              </span>
            )}
          </span>
        }
        procesando={cargando || guardando}
        onAgregar={() => void guardar()}
        textoAccion={guardando ? "Guardando…" : "Guardar cambios"}
        accionDeshabilitada={guardando}
        motivoAccion={
          invalidos > 0
            ? "Hay celdas inválidas: corríjalas antes de guardar."
            : cambiados.length === 0
              ? "Sin cambios."
              : null
        }
      >
        <div className="flex flex-col gap-3 px-1 pt-1">
          {matriz && (
            <AvisoEnLinea variante="info" className="text-xs">
              Celda vacía = regla general: misma zonal{" "}
              {matriz.reglaGeneral.mismaZona} min · mismo sector{" "}
              {matriz.reglaGeneral.mismoSector} min · otro sector{" "}
              {matriz.reglaGeneral.otroSector} min.
            </AvisoEnLinea>
          )}

          {matriz?.cobertura && matriz.cobertura.sinTiempo > 0 && (
            <p className="text-xs text-app-muted" data-testid="cobertura-traslados">
              {textoCobertura(matriz.cobertura, matriz.reglaGeneral)}
            </p>
          )}

          {/* Una zonal sin sector cae siempre en «otro sector»: se dice, y dónde corregirlo. */}
          {sinSector.length > 0 && (
            <AvisoEnLinea variante="advertencia" className="text-xs">
              Zonales sin sector:{" "}
              {sinSector.map((zonal) => zonal.nombre).join(", ")} — revíselos en{" "}
              <Link to="/home/administracion/catalogos-cuadro" className="link link-hover">
                Catálogos
              </Link>
              .
            </AvisoEnLinea>
          )}

          {matriz && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={simetrico}
                  onChange={(evento) => setSimetrico(evento.target.checked)}
                />
                Aplicar también a B→A
              </label>
              {/* Leyenda del color (regla 6): el borde nunca es la única señal. */}
              <span className="flex flex-wrap items-center gap-2" aria-label="Leyenda">
                <span className="rounded-md border border-success px-2">
                  Corto (≤ {LIMITE_CORTO_MIN} min)
                </span>
                <span className="rounded-md border border-base-300 px-2">
                  Medio ({LIMITE_CORTO_MIN + 1}–{LIMITE_MEDIO_MIN} min)
                </span>
                <span className="rounded-md border border-error px-2">
                  Largo (&gt; {LIMITE_MEDIO_MIN} min)
                </span>
                <span className="rounded-md bg-primary/10 px-2 font-semibold">Propio</span>
                <span className="text-app-muted">Gris = regla general</span>
              </span>
              <Boton
                variante="enlace"
                tamano="sm"
                deshabilitado={guardando}
                motivoDeshabilitado={
                  personalizadas.length === 0
                    ? "Todas las celdas usan ya la regla general"
                    : null
                }
                onClick={restablecerTodo}
              >
                Restablecer todo a la regla general
              </Boton>
            </div>
          )}

          {invalidos > 0 && (
            <AvisoEnLinea variante="advertencia" rol="alert" className="text-xs">
              {invalidos === 1
                ? "Hay 1 celda fuera de rango: use minutos enteros de 0 a 600, o déjela vacía."
                : `Hay ${invalidos} celdas fuera de rango: use minutos enteros de 0 a 600, o déjelas vacías.`}
            </AvisoEnLinea>
          )}

          {!cargando && zonales.length === 0 ? (
            <p className="px-2 py-4 text-sm text-app-muted">
              No hay zonales en el catálogo del cuadro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-xs table-zebra">
                <caption className="sr-only">
                  Minutos de traslado de la zonal de la fila a la de la columna
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-base-100 text-left"
                    >
                      Desde \ Hacia
                    </th>
                    {zonales.map((destino) => (
                      <th key={destino.id} scope="col" className="text-center">
                        <span className="flex flex-col">
                          <span>{destino.nombre}</span>
                          <span className="text-xs font-normal text-app-muted">
                            {nombreSector(destino.sector)}
                          </span>
                          {destino.descripcion && (
                            <span className="text-xs font-normal text-app-muted">
                              {destino.descripcion}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zonales.map((origen) => (
                    <tr key={origen.id} className="hover:bg-primary/5">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-base-100 text-left font-normal"
                      >
                        <span className="flex flex-col">
                          <span className="font-semibold">{origen.nombre}</span>
                          <span className="text-xs text-app-muted">
                            {nombreSector(origen.sector)}
                          </span>
                          {origen.descripcion && (
                            <span className="text-xs text-app-muted">
                              {origen.descripcion}
                            </span>
                          )}
                        </span>
                      </th>
                      {zonales.map((destino) => {
                        const par = clave(origen.id, destino.id);
                        const valor = borrador[par] ?? guardados[par] ?? "";
                        const valido = esValido(valor);
                        const propio = valor.trim() !== "";
                        const regla = reglaPara(origen, destino);
                        const efectivo = propio && valido ? Number(valor.trim()) : regla;
                        const rango = efectivo !== null ? rangoTraslado(efectivo) : null;
                        return (
                          <td key={destino.id} className="text-center">
                            <span className="flex items-center justify-center gap-0.5">
                              <input
                                type="text"
                                inputMode="numeric"
                                className={[
                                  "input input-bordered input-xs w-12 text-center",
                                  // Propio: negrita y fondo; regla general: el gris del placeholder.
                                  propio ? "bg-primary/10 font-semibold" : "",
                                  rango && valido ? CLASE_RANGO_TRASLADO[rango] : "",
                                ].join(" ")}
                                value={valor}
                                placeholder={String(regla ?? "")}
                                disabled={guardando}
                                aria-invalid={!valido}
                                aria-label={`Minutos de ${origen.nombre} a ${destino.nombre}`}
                                title={
                                  rango
                                    ? `${propio ? "Propio" : "Regla general"} · traslado ${rango}`
                                    : undefined
                                }
                                onChange={(evento) =>
                                  escribir(origen.id, destino.id, evento.target.value)
                                }
                              />
                              {propio && (
                                <Boton
                                  variante="enlace"
                                  tamano="sm"
                                  icono="activar"
                                  deshabilitado={guardando}
                                  aria-label={`Restablecer ${origen.nombre} a ${destino.nombre} a la regla general`}
                                  title="Restablecer a la regla general"
                                  onClick={() => escribir(origen.id, destino.id, "")}
                                />
                              )}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PanelCatalogo>
    </section>
  );
};

export default AdminTrasladosPage;
