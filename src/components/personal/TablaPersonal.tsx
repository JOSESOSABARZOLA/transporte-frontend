/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: TablaPersonal.tsx
 * Responsabilidad: Listar el maestro con su situación, y dejar obrar sobre cada ficha.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REDISEÑO DEL 2026-10-08.
 *
 *   · Cabecera de UNA fila (sin los grupos «Área / Zonal» y «Contacto») y FIJA al desplazarse: la
 *     tabla vive en su propia caja con alto acotado (`max-h-[70vh] overflow-auto`, el mismo patrón
 *     de la matriz de cobertura) y el `thead` es `sticky top-0`.
 *   · Correos: «Inst.» siempre (con «—» si falta) y «Pers.» SOLO si existe. La segunda línea vacía
 *     duplicaba la altura de todas las filas.
 *   · Estado: el mismo distintivo para «Activo» e «Inactivo» (solo cambia la variante) y, debajo,
 *     «Ausente dd/mm–dd/mm» en ámbar para la ausencia en curso o la próxima. Sale de UNA consulta
 *     de todo el maestro, no de una por fila.
 *   · Acciones (estándar de botones, 2026-10-15): «Editar» · «Ausencias» (acento) · «Desactivar» /
 *     «Activar», todas visibles con `AccionesFila`; sin «⋮».
 *
 * NI LA AUSENCIA NI LA BAJA DEPENDEN DEL COLOR (regla 6): cada distintivo lleva su texto.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA CÉDULA Y EL TELÉFONO SE MUESTRAN AQUÍ Y EN NINGÚN OTRO SITIO. Es la única pantalla
 * cuyo contrato los devuelve —`FuncionarioResponseDto`—; el resto del sistema trabaja con
 * nombre y área. Ver RN-34.
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";

import type {
  AusenciaDelMaestro,
  Funcionario,
} from "../../interfaces/Personal.ts";
import type { Zonal } from "../../interfaces/Formulario.ts";
import {
  NOMBRE_AREA,
  NOMBRE_CONTRATO,
  NOMBRE_ESTADO_DISPONIBILIDAD,
  nombreCompleto,
} from "../../utils/personal.util.ts";
import { fechaCorta } from "../../utils/ausencias.util.ts";

type TablaPersonalProps = {
  personal: Funcionario[];
  /** Catálogo de zonales: la ficha guarda solo el `zonalId` y aquí se pinta el nombre. */
  zonales: Zonal[];
  /**
   * La ausencia a mostrar de cada ficha (la en curso o, si no, la próxima), por `funcionarioId`.
   * Ausente = no tiene. Sale de `GET /administracion/personal/ausencias`.
   */
  ausencias: Record<number, AusenciaDelMaestro>;
  seleccionadoId: number | null;
  /** Ficha recién guardada/editada: se resalta en verde unos segundos (`MS_RESALTADO`). */
  resaltadoId?: number | null;
  onAusencias: (funcionario: Funcionario) => void;
  onEditar: (funcionario: Funcionario) => void;
  onDarDeBaja: (funcionario: Funcionario) => void;
  onReactivar: (funcionario: Funcionario) => void;
  /**
   * Si quien mira administra el maestro. Sin ello no se pintan «Editar» ni el «⋮» (se ocultan, no
   * se apagan: a ese perfil no le servirán nunca). «Ausencias» queda para todos.
   */
  puedeAdministrar: boolean;
  mensajeVacio: string;
};

const COLUMNAS = [
  "Cédula",
  "Apellidos y nombres",
  "Área",
  "Zonal",
  "Contrato",
  "Teléfono",
  "Correos",
  "Estado",
  "Acciones",
];

const TablaPersonal: FC<TablaPersonalProps> = ({
  personal,
  zonales,
  ausencias,
  seleccionadoId,
  resaltadoId = null,
  onAusencias,
  onEditar,
  onDarDeBaja,
  onReactivar,
  puedeAdministrar,
  mensajeVacio,
}) => {
  const nombreZonal = new Map(zonales.map((zonal) => [zonal.id, zonal.nombre]));


  return (
    <div className="max-h-[70vh] overflow-auto rounded-md border border-base-300">
      <table className="table table-sm table-zebra">
        <thead className="sticky top-0 z-10 bg-base-100">
          <tr className="text-xs uppercase tracking-wider">
            {COLUMNAS.map((columna) => (
              <th
                key={columna}
                scope="col"
                className={columna === "Acciones" ? "text-right" : undefined}
              >
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personal.length === 0 ? (
            <tr>
              <td
                colSpan={COLUMNAS.length}
                className="px-3 py-6 text-center text-sm text-app-muted"
              >
                {mensajeVacio}
              </td>
            </tr>
          ) : (
            personal.map((funcionario) => {
              const ausencia = ausencias[funcionario.id];
              const nombre = nombreCompleto(funcionario);

              return (
                <tr
                  key={funcionario.id}
                  data-resaltado={funcionario.id === resaltadoId || undefined}
                  className={
                    funcionario.id === resaltadoId
                      ? "bg-success/10 transition-colors"
                      : funcionario.id === seleccionadoId
                        ? "bg-primary/5"
                        : "hover:bg-primary/5"
                  }
                >
                  <td className="px-3 py-1 align-top font-mono">
                    {funcionario.cedula}
                  </td>
                  <td className="px-3 py-1 align-top">
                    <span className="block font-semibold">{nombre}</span>
                    {funcionario.cargo && (
                      <span className="block text-xs text-app-muted">
                        {funcionario.cargo}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1 align-top">
                    {NOMBRE_AREA[funcionario.area]}
                  </td>
                  {/* Una zonal fuera del catálogo vigente también se ve como «—», no como un id. */}
                  <td className="px-3 py-1 align-top">
                    {funcionario.zonalId != null
                      ? (nombreZonal.get(funcionario.zonalId) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-3 py-1 align-top">
                    {NOMBRE_CONTRATO[funcionario.tipoContrato] ??
                      funcionario.tipoContrato}
                  </td>
                  <td className="px-3 py-1 align-top font-mono">
                    {funcionario.telefono ?? "—"}
                  </td>
                  <td
                    className="px-3 py-1 align-top"
                    data-correos
                  >
                    <span className="block">
                      <span className="text-xs text-app-muted">Inst. </span>
                      {funcionario.correoInstitucional ?? "—"}
                    </span>
                    {funcionario.correoPersonal && (
                      <span className="block">
                        <span className="text-xs text-app-muted">Pers. </span>
                        {funcionario.correoPersonal}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1 align-top">
                    <span
                      className={`badge badge-sm whitespace-nowrap ${
                        funcionario.activo ? "badge-success" : "badge-ghost"
                      }`}
                    >
                      {funcionario.activo ? "Activo" : "Inactivo"}
                    </span>
                    {ausencia && (
                      <span className="mt-1 block">
                        <span
                          className="badge badge-warning badge-sm whitespace-nowrap"
                          title={NOMBRE_ESTADO_DISPONIBILIDAD[ausencia.estado]}
                        >
                          {`Ausente ${fechaCorta(ausencia.desde)}–${fechaCorta(ausencia.hasta)}`}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1 align-top">
                    <AccionesFila
                      nombre={nombre}
                      editar={
                        puedeAdministrar
                          ? { onClick: () => onEditar(funcionario) }
                          : null
                      }
                      propia={{
                        texto: "Ausencias",
                        icono: "ausencias",
                        etiqueta: "Ausencias de",
                        onClick: () => onAusencias(funcionario),
                        motivo: funcionario.activo
                          ? null
                          : "Una ficha inactiva no registra ausencias: actívela primero.",
                      }}
                      estado={
                        puedeAdministrar
                          ? funcionario.activo
                            ? { tipo: "desactivar", onClick: () => onDarDeBaja(funcionario) }
                            : { tipo: "activar", onClick: () => onReactivar(funcionario) }
                          : null
                      }
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaPersonal;
