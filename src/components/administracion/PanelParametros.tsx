/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Ventanas y parámetros
 * Archivo: PanelParametros.tsx
 * Responsabilidad: La pestaña «Parámetros»: buscador, filtros, secciones plegables y la barra del
 *                  guardado único.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * Reemplaza a `TablaParametros` (una tabla plana con «Guardar» por fila). El borrador vive en la
 * página —cambiar de pestaña no lo pierde— y llega aquí con `borrador` y `onCambiar`.
 *
 *   · Las secciones salen de `config/catalogoParametros.ts`; lo que no está catalogado, en «Otros».
 *   · Con búsqueda o filtro, las secciones con resultados se abren solas y las vacías no se pintan.
 */

import { useState, type FC } from "react";

import Boton from "../common/Boton.tsx";
import SelectorSegmentado from "../forms/SelectorSegmentado.tsx";
import BarraCambiosParametros from "./BarraCambiosParametros.tsx";
import FilaParametro from "./FilaParametro.tsx";
import GrupoParametros from "./GrupoParametros.tsx";

import type { IdGrupoParametros } from "../../config/catalogoParametros.ts";
import type { ParametroPolitica } from "../../interfaces/Administracion.ts";
import {
  agruparParametros,
  filtrarParametros,
  type FiltroParametros,
} from "../../utils/catalogoParametros.util.ts";

const FILTROS: { id: FiltroParametros; texto: string }[] = [
  { id: "todos", texto: "Todos" },
  { id: "modificados", texto: "Modificados" },
  { id: "sinConfigurar", texto: "Sin configurar" },
];

type PanelParametrosProps = {
  parametros: ParametroPolitica[];
  cargando: boolean;
  /** Clave → valor escrito y aún no guardado. */
  borrador: Readonly<Record<string, string>>;
  onCambiar: (clave: string, valor: string) => void;
  /** Rechazos del servidor por clave, del último guardado. */
  erroresServidor: Readonly<Record<string, string>>;
  /** Cuántos valores del borrador no son admisibles (apaga «Guardar cambios»). */
  errores: number;
  guardando: boolean;
  resaltadas: ReadonlySet<string>;
  onGuardar: () => void;
  onDescartar: () => void;
};

const PanelParametros: FC<PanelParametrosProps> = ({
  parametros,
  cargando,
  borrador,
  onCambiar,
  erroresServidor,
  errores,
  guardando,
  resaltadas,
  onGuardar,
  onDescartar,
}) => {
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<FiltroParametros>("todos");
  /** Las secciones abiertas a mano. Abre con la primera, como el prototipo. */
  const [abiertos, setAbiertos] = useState<ReadonlySet<IdGrupoParametros>>(
    () => new Set<IdGrupoParametros>(["cuadro"]),
  );

  const visibles = filtrarParametros(parametros, texto, filtro);
  const grupos = agruparParametros(visibles);
  const forzado = texto.trim() !== "" || filtro !== "todos";
  const cambios = Object.keys(borrador).length;

  const alternar = (id: IdGrupoParametros) =>
    setAbiertos((antes) => {
      const siguiente = new Set(antes);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <div className="flex flex-col gap-3">
      {/* Sin contador «N de M» (2026-10-24) y con `flex-wrap`: el segmentado ya no se encima. */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            className="input input-bordered input-sm w-full min-w-[320px] sm:max-w-md"
            placeholder="Buscar por nombre, código o descripción"
            aria-label="Buscar parámetros"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
          <SelectorSegmentado
            id="filtro-parametros"
            etiqueta="Filtrar parámetros"
            etiquetaOculta
            opciones={FILTROS.map((una) => ({
              valor: una.id,
              nombre: una.texto,
            }))}
            valor={filtro}
            onCambiar={(valor) => setFiltro(valor as FiltroParametros)}
          />
        </div>
        <div className="flex gap-2">
          <Boton
            variante="enlace"
            tamano="sm"
            onClick={() =>
              setAbiertos(new Set(grupos.map((uno) => uno.grupo.id)))
            }
          >
            Expandir todo
          </Boton>
          <Boton
            variante="enlace"
            tamano="sm"
            onClick={() => setAbiertos(new Set())}
          >
            Contraer todo
          </Boton>
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          {cargando
            ? "Cargando los parámetros…"
            : parametros.length === 0
              ? "No hay parámetros que su rol administre."
              : "Ningún parámetro coincide con la búsqueda."}
        </p>
      ) : (
        grupos.map(({ grupo, parametros: delGrupo }) => (
          <GrupoParametros
            key={grupo.id}
            grupo={grupo}
            abierto={forzado || abiertos.has(grupo.id)}
            onAlternar={() => alternar(grupo.id)}
          >
            <table className="table table-sm w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-app-label">
                  <th scope="col">Parámetro</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Última modificación</th>
                </tr>
              </thead>
              <tbody>
                {delGrupo.map((parametro) => (
                  <FilaParametro
                    key={parametro.clave}
                    parametro={parametro}
                    valor={borrador[parametro.clave] ?? parametro.valor}
                    onCambiar={(valor) => onCambiar(parametro.clave, valor)}
                    errorServidor={erroresServidor[parametro.clave]}
                    deshabilitado={guardando}
                    resaltada={resaltadas.has(parametro.clave)}
                  />
                ))}
              </tbody>
            </table>
          </GrupoParametros>
        ))
      )}

      <BarraCambiosParametros
        cambios={cambios}
        errores={errores}
        guardando={guardando}
        onDescartar={onDescartar}
        onGuardar={onGuardar}
      />
    </div>
  );
};

export default PanelParametros;
