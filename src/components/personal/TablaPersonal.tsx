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
 * NI LA AUSENCIA NI LA BAJA DEPENDEN DEL COLOR. Regla 6, casos 3 y 4 del plan.
 *
 *   · Quien está ausente lleva `badge badge-warning` **con la situación y hasta cuándo**:
 *     «Vacaciones hasta el 2026-08-08», no un cuadrito naranja.
 *   · Quien está de baja lleva la fila atenuada **y** un distintivo que dice «Inactivo».
 *     La atenuación sola es indistinguible de una fila normal para quien no percibe bien
 *     el contraste, y en un maestro de personal confundir activo con inactivo significa
 *     convocar a alguien que ya no trabaja aquí.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA CÉDULA Y EL TELÉFONO SE MUESTRAN AQUÍ Y EN NINGÚN OTRO SITIO. Es la única pantalla
 * cuyo contrato los devuelve —`FuncionarioResponseDto`, solo `ADMINISTRADOR`—; el resto
 * del sistema trabaja con nombre y área. Ver RN-34.
 */

import type { FC } from "react";

import type { Disponibilidad, Funcionario } from "../../interfaces/Personal.ts";
import {
  NOMBRE_AREA,
  NOMBRE_CONTRATO,
  ausenciaVigente,
  nombreCompleto,
  textoDeAusencia,
} from "../../utils/personal.util.ts";

type TablaPersonalProps = {
  personal: Funcionario[];
  /** Ausencias ya consultadas, por funcionario. Ausente = todavía no se sabe. */
  ausencias: Record<number, Disponibilidad[]>;
  hoy: string;
  seleccionadoId: number | null;
  onSeleccionar: (funcionario: Funcionario) => void;
  onEditar: (funcionario: Funcionario) => void;
  onDarDeBaja: (funcionario: Funcionario) => void;
  mensajeVacio: string;
};

const TablaPersonal: FC<TablaPersonalProps> = ({
  personal,
  ausencias,
  hoy,
  seleccionadoId,
  onSeleccionar,
  onEditar,
  onDarDeBaja,
  mensajeVacio,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          <th scope="col">Cédula</th>
          <th scope="col">Apellidos y nombres</th>
          <th scope="col">Área</th>
          <th scope="col">Contrato</th>
          <th scope="col">Teléfono</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {personal.length === 0 ? (
          <tr>
            <td
              colSpan={7}
              className="px-3 py-6 text-center text-sm text-base-content/70"
            >
              {mensajeVacio}
            </td>
          </tr>
        ) : (
          personal.map((funcionario) => {
            const suyas = ausencias[funcionario.id];
            const ausente = suyas ? ausenciaVigente(suyas, hoy) : null;

            return (
              <tr
                key={funcionario.id}
                className={[
                  funcionario.activo ? "" : "opacity-60",
                  funcionario.id === seleccionadoId
                    ? "bg-primary/5"
                    : "hover:bg-info/10",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td className="px-3 py-1 align-top font-mono text-xs">
                  {funcionario.cedula}
                </td>
                <td className="px-3 py-1 align-top font-medium">
                  {nombreCompleto(funcionario)}
                  {funcionario.cargo && (
                    <span className="block text-xs font-normal text-base-content/70">
                      {funcionario.cargo}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1 align-top">
                  {NOMBRE_AREA[funcionario.area]}
                </td>
                <td className="px-3 py-1 align-top">
                  {NOMBRE_CONTRATO[funcionario.tipoContrato]}
                </td>
                <td className="px-3 py-1 align-top">
                  {funcionario.telefono ?? "—"}
                </td>

                <td className="px-3 py-1 align-top">
                  {!funcionario.activo ? (
                    <span className="badge badge-ghost badge-sm">Inactivo</span>
                  ) : ausente ? (
                    <span
                      className="badge badge-warning badge-sm"
                      title={ausente.motivo ?? undefined}
                    >
                      {textoDeAusencia(ausente)}
                    </span>
                  ) : suyas ? (
                    <span className="badge badge-success badge-sm">Activo</span>
                  ) : (
                    /* Sin consultar todavía: se dice, en lugar de afirmar «Activo». */
                    <span className="badge badge-ghost badge-sm">
                      Consultando…
                    </span>
                  )}
                </td>

                <td className="px-3 py-1 align-top">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onEditar(funcionario)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onSeleccionar(funcionario)}
                    >
                      Ausencias
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => onDarDeBaja(funcionario)}
                      disabled={!funcionario.activo}
                      title={
                        funcionario.activo
                          ? undefined
                          : "Esta ficha ya está fuera del maestro."
                      }
                    >
                      Dar de baja
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default TablaPersonal;
