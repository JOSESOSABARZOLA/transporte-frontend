/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: ModalDirectorioAuth.tsx
 * Responsabilidad: Elegir del directorio de Auth a quién se le va a crear la ficha.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES EL PRIMER PASO DEL ALTA, NO UNA CONSULTA.
 *
 * Hasta el 2026-08-24 el directorio era una pestaña al lado del maestro y «Nuevo
 * funcionario» abría una ficha en blanco. Ahora el alta empieza aquí: se elige a la
 * persona y el formulario llega con lo que Auth ya sabe de ella.
 *
 * Auth central es la base de usuarios de la institución —`GET /users` devuelve la AMC
 * entera, y este módulo solo descarta a los inactivos—, así que teclear una ficha desde
 * cero es, casi siempre, copiar a mano algo que ya está escrito en otro sitio. Es PV-02.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA SALIDA MANUAL NO ES UN ADORNO Y NO SE QUITA. `CLAUDE.md` §7 lo exige: «el maestro
 * sigue administrándose igual. No acople una a la otra». Con Auth caído, o con alguien a
 * quien Auth no conoce —o conoce **sin cédula**, que es un caso real de la propia tabla—,
 * «Registrar a mano» abre la ficha en blanco y `POST /administracion/personal` no toca
 * Auth por ningún lado. Está comprobado en el servidor: `funcionarios.service.ts` no tiene
 * ni una referencia a Auth.
 *
 * Por eso el pie con esa salida se pinta **siempre**, también —y sobre todo— cuando el
 * directorio no está disponible.
 *
 * SE FILTRA EN MEMORIA. El servidor entrega la lista entera de una vez y no admite buscar:
 * el mismo criterio que en el maestro, y el mismo que usa el módulo de Instrucción.
 */

import { useState, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";
import Paginacion from "../common/Paginacion.tsx";
import {
  NOMBRE_TIPO_INSPECTOR,
  type FilaDirectorio,
} from "../../interfaces/DirectorioAuth.ts";
import { normalizar } from "../../utils/texto.util.ts";

/** Busca en lo que se ve de la fila: cédula, nombre, usuario, correo y dependencia. */
const coincide = (fila: FilaDirectorio, busqueda: string): boolean => {
  const aguja = normalizar(busqueda);
  if (!aguja) return true;

  return [fila.cedula, fila.nombre, fila.usuario, fila.correo, fila.dependencia]
    .filter((campo): campo is string => Boolean(campo))
    .some((campo) => normalizar(campo).includes(aguja));
};

type ModalDirectorioAuthProps = {
  abierto: boolean;
  personas: FilaDirectorio[];
  /** `false` cuando Auth no se pudo consultar. No es un error: es el estado. */
  disponible: boolean;
  /** Lo que dijo el servidor. Se muestra tal cual (regla 7). */
  motivo: string | null;
  cargando: boolean;
  procesando: boolean;
  onElegir: (fila: FilaDirectorio) => void;
  /** La salida que no pasa por Auth. Abre la ficha en blanco. */
  onRegistrarAMano: () => void;
  onActualizar: () => void;
  onCerrar: () => void;
};

const ModalDirectorioAuth: FC<ModalDirectorioAuthProps> = ({
  abierto,
  personas,
  disponible,
  motivo,
  cargando,
  procesando,
  onElegir,
  onRegistrarAMano,
  onActualizar,
  onCerrar,
}) => {
  const [busqueda, setBusqueda] = useState("");
  /**
   * NACE ACTIVADA, y no es lo que hacía la pestaña.
   *
   * Allí era una consulta y tenía sentido ver a todos. Aquí se ha pulsado «Nuevo
   * funcionario»: lo que se busca es precisamente a quien todavía no tiene ficha.
   */
  const [soloSinFicha, setSoloSinFicha] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [tamanio, setTamanio] = useState(10);

  if (!abierto) return null;

  const filtradas = personas.filter(
    (fila) => (!soloSinFicha || fila.ficha === null) && coincide(fila, busqueda),
  );

  const sinFicha = personas.filter((fila) => fila.ficha === null).length;

  const desde = pagina * tamanio;
  const visibles = filtradas.slice(desde, desde + tamanio);

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta="Nuevo funcionario: elegir del directorio de Auth central"
      ancho="2xl"
      onCerrar={procesando ? undefined : onCerrar}
      antetitulo="Nuevo funcionario · paso 1 de 2"
      titulo="Elegir del directorio de Auth central"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-md text-xs text-base-content/70">
          Los datos que Auth conoce llegan al formulario; el área, el tipo de
          contrato y el teléfono se completan allí.
        </p>
        <div className="flex items-center gap-2">
          {!cargando && disponible && sinFicha > 0 && (
            <span className="badge badge-warning badge-sm">
              {sinFicha} sin ficha
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onActualizar}
            disabled={cargando || procesando}
          >
            {cargando ? "Consultando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {/* El motivo lo redacta el servidor. La ventana no lo reescribe (regla 7). */}
      {!disponible && motivo && (
        <div
          className="alert alert-warning mb-4"
          role="alert"
        >
          <span className="text-sm">{motivo}</span>
        </div>
      )}

      {disponible && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            className="input input-bordered input-sm w-full sm:max-w-xs"
            placeholder="Buscar por cédula, nombre, correo o dependencia…"
            aria-label="Buscar en el directorio de Auth"
            value={busqueda}
            onChange={(evento) => {
              setBusqueda(evento.target.value);
              setPagina(0);
            }}
          />
          <label className="label cursor-pointer gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={soloSinFicha}
              onChange={(evento) => {
                setSoloSinFicha(evento.target.checked);
                setPagina(0);
              }}
            />
            <span className="label-text">Solo quienes no tienen ficha</span>
          </label>
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="py-6 text-center text-sm text-base-content/70">
          {cargando
            ? "Consultando el directorio de Auth central…"
            : !disponible
              ? "El directorio no está disponible. Puede registrar la ficha a mano."
              : busqueda || soloSinFicha
                ? "Ninguna persona coincide con el filtro."
                : "Auth central no devolvió personas activas."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((fila) => (
            <li
              key={fila.authId}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-base-300 p-2 hover:bg-info/10"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium">{fila.nombre}</span>

                <span className="text-xs text-base-content/70">
                  {fila.cedula ? (
                    <span className="font-mono">{fila.cedula}</span>
                  ) : (
                    <span className="badge badge-warning badge-sm">
                      Sin cédula en Auth
                    </span>
                  )}
                  {" · "}
                  {fila.usuario}
                  {fila.correo ? ` · ${fila.correo}` : ""}
                </span>

                <span className="text-xs text-base-content/70">
                  {fila.dependencia ?? "Sin dependencia"}
                </span>

                {/*
                  Los roles llegan de Auth como `(Subsistema) Rol` y NO se filtran por
                  subsistema: aquí se ven también los de Instrucción o Resolución. Es
                  correcto —el directorio es la institución entera— y ayuda a reconocer
                  a la persona.
                */}
                {(fila.roles.length > 0 || fila.inspector) && (
                  <div className="flex flex-wrap gap-1">
                    {fila.roles.map((rol) => (
                      <span
                        key={rol}
                        className="badge badge-outline badge-xs"
                      >
                        {rol}
                      </span>
                    ))}
                    {/* La sigla NO va sola: `IT` no significa nada para quien no conoce
                        la nomenclatura de Auth. Regla 6. */}
                    {fila.inspector && (
                      <span className="badge badge-info badge-xs">
                        {NOMBRE_TIPO_INSPECTOR[fila.inspector.tipo] ??
                          fila.inspector.tipo}
                        {fila.inspector.zonal ? ` · ${fila.inspector.zonal}` : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {fila.ficha ? (
                  <>
                    <span
                      className={`badge badge-sm ${
                        fila.ficha.activo ? "badge-success" : "badge-ghost"
                      }`}
                    >
                      {fila.ficha.activo ? "Con ficha" : "Ficha dada de baja"}
                    </span>
                    <span className="text-xs text-base-content/70">
                      {fila.ficha.apellidos} {fila.ficha.nombres}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="badge badge-warning badge-sm">
                      Sin ficha: no puede ser convocado
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => onElegir(fila)}
                      disabled={procesando || !fila.cedula}
                      title={
                        fila.cedula
                          ? undefined
                          : "Sin cédula en Auth no se puede crear la ficha: es la llave con la que se enlazan."
                      }
                    >
                      Crear ficha
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {filtradas.length > tamanio && (
        <div className="mt-3">
          <Paginacion
            page={pagina}
            pageSize={tamanio}
            total={filtradas.length}
            onPage={setPagina}
            onPageSize={setTamanio}
            etiqueta="personas"
          />
        </div>
      )}

      {/* SIEMPRE VISIBLE, también con el directorio caído. Ver la cabecera. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-3">
        <p className="text-xs text-base-content/70">
          ¿La persona no está en Auth central, o no tiene cédula registrada
          allí?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCerrar}
            disabled={procesando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onRegistrarAMano}
            disabled={procesando}
          >
            Registrar a mano
          </button>
        </div>
      </div>
    </MarcoModal>
  );
};

export default ModalDirectorioAuth;
