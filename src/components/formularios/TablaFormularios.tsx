/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: TablaFormularios.tsx
 * Responsabilidad: La tabla de «Formularios del cuadro»: identidad, dueño, áreas, comportamiento,
 *                  transporte por defecto, estado y acciones de cada formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA A `TablaCatalogo` en esta pantalla (rediseño del 2026-10-13). Las filas llegan ya
 * filtradas por la página (búsqueda y Vigentes | Inactivos | Todos); aquí solo se pintan.
 *
 * Los distintivos salen todos de `Insignia` (componente único). Las ÁREAS se leen, no se editan:
 * una sola por su nombre, varias como «N áreas» con la lista en el `title`, y ninguna como
 * «⚠ Sin áreas» en ámbar, porque el registro no ofrecerá personal hasta configurarlas.
 *
 * ESTÁNDAR DE BOTONES (2026-10-15): [✎ Editar] [⊘ Desactivar | ↺ Activar] a la vista, con
 * `AccionesFila`. El «⋮» se retiró: solo tenía esa acción. Pagina de a 10 en la página.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import CuadroFormulario from "./CuadroFormulario.tsx";
import Insignia from "../common/Insignia.tsx";
import AccionesFila from "../common/AccionesFila.tsx";
import type { FormularioAdmin } from "../../interfaces/Formulario.ts";
import { etiquetasComportamiento } from "../../utils/formularioAdmin.util.ts";
import { NOMBRE_AREA, NOMBRE_DIRECCION } from "../../utils/personal.util.ts";
import { nombreTipoTransporte } from "../../utils/tipoTransporte.util.ts";

type TablaFormulariosProps = {
  filas: FormularioAdmin[];
  procesando: boolean;
  /** El código de la fila recién guardada (se resalta en verde durante `MS_RESALTADO`). */
  resaltado: string | null;
  mensajeVacio: string;
  onEditar: (fila: FormularioAdmin) => void;
  onDesactivar: (fila: FormularioAdmin) => void;
  onReactivar: (fila: FormularioAdmin) => void;
};

/** La celda de áreas: nombre, «N áreas» con la lista, o el aviso de que no tiene ninguna. */
const CeldaAreas: FC<{ fila: FormularioAdmin }> = ({ fila }) => {
  if (fila.areas.length === 0) return <Insignia variante="aviso">⚠ Sin áreas</Insignia>;
  if (fila.areas.length === 1) return <>{NOMBRE_AREA[fila.areas[0]]}</>;
  const lista = fila.areas.map((area) => NOMBRE_AREA[area]).join(", ");
  return (
    <span title={lista}>
      {fila.areas.length} áreas
      <span className="sr-only">: {lista}</span>
    </span>
  );
};

const TablaFormularios: FC<TablaFormulariosProps> = ({
  filas,
  procesando,
  resaltado,
  mensajeVacio,
  onEditar,
  onDesactivar,
  onReactivar,
}) => {
  if (filas.length === 0) {
    return <p className="px-2 py-6 text-center text-sm text-app-muted">{mensajeVacio}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="app-data-table table table-sm"
        aria-label="Formularios del cuadro"
      >
        <thead>
          <tr>
            <th scope="col">Formulario</th>
            <th scope="col">Dueño</th>
            <th scope="col">Áreas de personal</th>
            <th scope="col">Comportamiento</th>
            <th scope="col">Transporte por defecto</th>
            <th scope="col">Estado</th>
            <th
              scope="col"
              className="text-right"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => {
            const resaltada = fila.codigo === resaltado;
            const etiquetas = etiquetasComportamiento(fila);
            return (
              <tr
                key={fila.codigo}
                data-resaltado={resaltada || undefined}
                className={`transition-colors ${resaltada ? "bg-success/10" : ""}`}
              >
                <td>
                  <div className="flex items-center gap-3">
                    <CuadroFormulario numero={fila.numero} colorFondo={fila.colorFondo} />
                    <div className="flex min-w-0 flex-col">
                      <span className={`font-semibold ${fila.activo ? "text-app-strong" : "text-app-muted"}`}>
                        <span className="sr-only">{fila.numero}. </span>
                        {fila.nombre}
                      </span>
                      <span className="font-mono text-xs text-app-muted">
                        {fila.codigo}
                        {fila.prefijoMostrado ? ` · prefijo ${fila.prefijoMostrado}` : ""}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{NOMBRE_DIRECCION[fila.rolDueno]}</td>
                <td>
                  <CeldaAreas fila={fila} />
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {etiquetas.map((etiqueta) => (
                      <Insignia
                        key={etiqueta}
                        variante="suave"
                      >
                        {etiqueta}
                      </Insignia>
                    ))}
                  </div>
                </td>
                <td>
                  {fila.tipoTransportePorDefecto
                    ? nombreTipoTransporte(fila.tipoTransportePorDefecto)
                    : "—"}
                </td>
                <td>
                  <Insignia variante={fila.activo ? "exito" : "neutro"}>
                    {fila.activo ? "Vigente" : "Inactivo"}
                  </Insignia>
                </td>
                <td>
                  <AccionesFila
                    nombre={`${fila.numero}. ${fila.nombre}`}
                    procesando={procesando}
                    editar={{ onClick: () => onEditar(fila) }}
                    estado={
                      fila.activo
                        ? { tipo: "desactivar", onClick: () => onDesactivar(fila) }
                        : { tipo: "activar", onClick: () => onReactivar(fila) }
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TablaFormularios;
