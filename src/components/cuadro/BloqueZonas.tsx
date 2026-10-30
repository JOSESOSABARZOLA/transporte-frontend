/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro por zonas del formulario 8
 * Archivo: BloqueZonas.tsx
 * Responsabilidad: El bloque «3 · Zonas»: una tarjeta por zona con zonal, punto, cantidad,
 *                  instituciones y tipo de control; «+ Agregar zona» y el resumen de identificadores.
 * Fecha: 2026-10-28
 *
 * Reemplaza en la columna derecha a Zonales, Punto, Instituciones y Tipo de control cuando el
 * formulario tiene `cantidadPorZona` (hoy el 8). Las reglas viven en `utils/registroPorZonas.util.ts`;
 * este componente solo las pinta. Los números de la cabecera de cada tarjeta son VISTA PREVIA: los
 * asigna el servidor al registrar.
 */

import type { FC } from "react";

import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import {
  agregarZona,
  cantidadAcotada,
  MAX_CANTIDAD_POR_ZONA,
  resumenDeZonas,
  zonalesUsadasPorOtras,
  type ZonaCaptura,
} from "../../utils/registroPorZonas.util.ts";
import Boton from "../common/Boton.tsx";
import Insignia from "../common/Insignia.tsx";
import SelectorTokens from "../forms/SelectorTokens.tsx";

type Institucion = CatalogosFormulario["instituciones"][number];
type TipoControl = CatalogosFormulario["tiposControl"][number];

/* Etiquetas fuera del componente: `SelectorTokens` las lleva en las dependencias de su filtro. */
const siglaDeInstitucion = (institucion: Institucion): string => institucion.sigla;
const nombreDeInstitucion = (institucion: Institucion): string =>
  institucion.sigla === institucion.nombre
    ? institucion.nombre
    : `${institucion.sigla} · ${institucion.nombre}`;
const nombreDeTipo = (tipo: TipoControl): string => tipo.nombre;

type BloqueZonasProps = {
  zonas: ZonaCaptura[];
  onCambiar: (zonas: ZonaCaptura[]) => void;
  catalogos: CatalogosFormulario | null;
  /** La zona principal (origen del transporte) y si coincide con la zonal del Maestro. */
  indicePrincipal: number;
  principalEsDelMaestro: boolean;
  /** «IG-030 a IG-042» por zona; `null` mientras no llega el número del día. */
  rangos: string[] | null;
  /** Sin persona elegida, el bloque solo invita a elegirla. */
  sinPersona: boolean;
  deshabilitado: boolean;
  /** Ya se intentó registrar: lo que falta se marca en rojo. */
  intentado: boolean;
};

const BloqueZonas: FC<BloqueZonasProps> = ({
  zonas,
  onCambiar,
  catalogos,
  indicePrincipal,
  principalEsDelMaestro,
  rangos,
  sinPersona,
  deshabilitado,
  intentado,
}) => {
  const zonales = catalogos?.zonales ?? [];
  const puntos = (catalogos?.puntos ?? []).filter((punto) => punto.activo !== false);
  const nombreDeZonal = (zonalId: number | null): string =>
    zonales.find((zonal) => zonal.id === zonalId)?.nombre ?? "Sin zonal";

  const cambiarZona = (indice: number, cambio: Partial<ZonaCaptura>): void =>
    onCambiar(zonas.map((zona, i) => (i === indice ? { ...zona, ...cambio } : zona)));

  if (sinPersona) {
    return (
      <section aria-labelledby="titulo-zonas" className="flex min-w-0 flex-col gap-2">
        <h3 id="titulo-zonas" className="text-sm font-semibold text-app-strong">
          3 · Zonas
        </h3>
        <p className="text-sm text-app-muted">
          Elija primero el tipo de personal y la persona.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-zonas" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 id="titulo-zonas" className="text-sm font-semibold text-app-strong">
            3 · Zonas <span className="text-error">*</span>
          </h3>
          <p className="text-xs text-app-muted">
            Cada zona con su lugar, control y cantidad. «Agregar zona» copia los datos de la anterior.
          </p>
        </div>
        <Boton
          variante="acento"
          tamano="sm"
          icono="agregar"
          deshabilitado={deshabilitado || zonas.length >= zonales.length}
          motivoDeshabilitado={
            zonas.length >= zonales.length ? "Ya están todas las zonales del formulario." : null
          }
          onClick={() => onCambiar(agregarZona(zonas))}
        >
          Agregar zona
        </Boton>
      </div>

      {zonas.map((zona, indice) => {
        const usadas = zonalesUsadasPorOtras(zonas, indice);
        const puntosDeLaZona = puntos.filter((punto) => punto.zonalId === zona.zonalId);
        const esPrincipal = indice === indicePrincipal;
        const numero = indice + 1;
        const id = (campo: string) => `zona-${numero}-${campo}`;
        const falta = (vacio: boolean) => intentado && vacio;
        return (
          <article
            key={indice}
            aria-label={`Zona ${numero}`}
            className={`flex min-w-0 flex-col gap-3 rounded-xl border p-3 ${
              esPrincipal ? "border-primary" : "border-base-200"
            }`}
          >
            <header className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-app-strong">Zona {numero}</span>
              {esPrincipal && (
                <Insignia variante={principalEsDelMaestro ? "exito" : "info"}>
                  {principalEsDelMaestro
                    ? "✓ Su zonal (del Maestro) · principal para transporte"
                    : "Principal para transporte"}
                </Insignia>
              )}
              <span className="flex-1" />
              {rangos && (
                <span className="badge badge-ghost badge-sm font-mono" title="Números de vista previa">
                  {rangos[indice]}
                </span>
              )}
              {zonas.length > 1 && (
                <Boton
                  variante="peligro"
                  tamano="sm"
                  icono="cerrar"
                  aria-label={`Quitar la zona ${numero}`}
                  deshabilitado={deshabilitado}
                  onClick={() => onCambiar(zonas.filter((_, i) => i !== indice))}
                />
              )}
            </header>

            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="form-control min-w-0">
                <label className="label" htmlFor={id("zonal")}>
                  <span className="label-text">
                    Zonal<span className="text-error ml-1">*</span>
                  </span>
                </label>
                <select
                  id={id("zonal")}
                  className={`select select-bordered w-full ${falta(zona.zonalId === null) ? "select-error" : ""}`}
                  value={zona.zonalId ?? ""}
                  disabled={deshabilitado}
                  aria-required="true"
                  aria-invalid={falta(zona.zonalId === null)}
                  onChange={(evento) => {
                    const zonalId = evento.target.value === "" ? null : Number(evento.target.value);
                    // El punto es de la zonal: si solo hay uno, se propone; si no, se elige.
                    const propios = puntos.filter((punto) => punto.zonalId === zonalId);
                    cambiarZona(indice, {
                      zonalId,
                      puntoId: propios.length === 1 ? propios[0].id : null,
                    });
                  }}
                >
                  <option value="">Seleccionar…</option>
                  {zonales.map((zonal) => (
                    <option
                      key={zonal.id}
                      value={zonal.id}
                      disabled={usadas.has(zonal.id)}
                    >
                      {zonal.nombre}
                      {usadas.has(zonal.id) ? " (ya está en otra zona)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control min-w-0">
                <label className="label" htmlFor={id("punto")}>
                  <span className="label-text">
                    Punto de encuentro<span className="text-error ml-1">*</span>
                  </span>
                </label>
                <select
                  id={id("punto")}
                  className={`select select-bordered w-full ${falta(zona.puntoId === null) ? "select-error" : ""}`}
                  value={zona.puntoId ?? ""}
                  disabled={deshabilitado || zona.zonalId === null}
                  aria-required="true"
                  aria-invalid={falta(zona.puntoId === null)}
                  onChange={(evento) =>
                    cambiarZona(indice, {
                      puntoId: evento.target.value === "" ? null : Number(evento.target.value),
                    })
                  }
                >
                  <option value="">
                    {zona.zonalId === null
                      ? "Elija primero la zonal"
                      : puntosDeLaZona.length === 0
                        ? "No hay puntos configurados para esta zonal"
                        : "Seleccionar…"}
                  </option>
                  {puntosDeLaZona.map((punto) => (
                    <option key={punto.id} value={punto.id}>
                      {punto.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <span className="label">
                  <span className="label-text" id={id("cantidad")}>
                    Cantidad<span className="text-error ml-1">*</span>
                  </span>
                </span>
                <div className="join" role="group" aria-labelledby={id("cantidad")}>
                  <button
                    type="button"
                    aria-label={`Un identificador menos en la zona ${numero}`}
                    // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                    className="join-item btn btn-sm"
                    disabled={deshabilitado || zona.cantidad <= 1}
                    onClick={() => cambiarZona(indice, { cantidad: cantidadAcotada(zona.cantidad - 1) })}
                  >
                    −
                  </button>
                  <span
                    aria-label={`Cantidad de la zona ${numero}`}
                    // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                    className="join-item btn btn-sm pointer-events-none w-14 text-center"
                  >
                    {zona.cantidad}
                  </span>
                  <button
                    type="button"
                    aria-label={`Un identificador más en la zona ${numero}`}
                    // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                    className="join-item btn btn-sm"
                    disabled={deshabilitado || zona.cantidad >= MAX_CANTIDAD_POR_ZONA}
                    onClick={() => cambiarZona(indice, { cantidad: cantidadAcotada(zona.cantidad + 1) })}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
              <SelectorTokens
                id={id("instituciones")}
                etiqueta="Instituciones"
                obligatorio
                opciones={catalogos?.instituciones ?? []}
                seleccionadas={zona.institucionIds}
                onCambio={(ids) => cambiarZona(indice, { institucionIds: ids })}
                etiquetaCorta={siglaDeInstitucion}
                etiquetaLarga={nombreDeInstitucion}
                marcador="Agregar institución…"
                flotante
                deshabilitado={deshabilitado}
                error={falta(zona.institucionIds.length === 0) ? "Elija al menos una institución." : null}
              />
              <SelectorTokens
                id={id("tipos")}
                etiqueta="Tipo de control"
                obligatorio
                opciones={catalogos?.tiposControl ?? []}
                seleccionadas={zona.tipoControlIds}
                onCambio={(ids) => cambiarZona(indice, { tipoControlIds: ids })}
                etiquetaCorta={nombreDeTipo}
                etiquetaLarga={nombreDeTipo}
                marcador="Agregar tipo de control…"
                flotante
                deshabilitado={deshabilitado}
                error={falta(zona.tipoControlIds.length === 0) ? "Elija al menos un tipo de control." : null}
              />
            </div>
          </article>
        );
      })}

      <p role="status" className="text-sm text-app-label">
        {resumenDeZonas(zonas, nombreDeZonal, rangos)}
        {rangos && " Números de vista previa: los asigna el sistema al registrar."}
      </p>
    </section>
  );
};

export default BloqueZonas;
