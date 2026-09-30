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
 *   · Quien está de baja lleva un distintivo con fondo que dice «Inactivo». Ya NO se atenúa la
 *     fila (2026-09-30): la opacidad hacía la fila inactiva difícil de leer y era una señal solo
 *     visual; el estado lo dice el chip, siempre con fondo y con su texto.
 *
 * ACCIONES: «Editar» queda visible; el resto —Ausencias y Dar de baja / Reactivar— vive en un
 * menú «⋯» (`SubMenuDropdown`) para no saturar la fila.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA CÉDULA Y EL TELÉFONO SE MUESTRAN AQUÍ Y EN NINGÚN OTRO SITIO. Es la única pantalla
 * cuyo contrato los devuelve —`FuncionarioResponseDto`, solo `ADMINISTRADOR`—; el resto
 * del sistema trabaja con nombre y área. Ver RN-34.
 */

import type { FC } from "react";

import Iconos, { type NombreIcono } from "../common/Iconos.tsx";
import SubMenuDropdown from "../common/SubMenuDropdown.tsx";

import type { Disponibilidad, Funcionario } from "../../interfaces/Personal.ts";
import type { Zonal } from "../../interfaces/Formulario.ts";
import {
  NOMBRE_AREA,
  NOMBRE_CONTRATO,
  ausenciaVigente,
  nombreCompleto,
  textoDeAusencia,
} from "../../utils/personal.util.ts";

/** Una entrada del menú «⋯» de una fila: rótulo, icono, acción y tono opcional (rojo/verde). */
type AccionFila = {
  clave: string;
  texto: string;
  icono: NombreIcono;
  onClick: () => void;
  tono?: string;
};

type TablaPersonalProps = {
  personal: Funcionario[];
  /**
   * Catálogo de zonales, para mostrar el NOMBRE de la zona que gestiona cada persona
   * (la ficha guarda solo el `zonalId`). Solo el personal DMIP la lleva; el resto va sin ella.
   */
  zonales: Zonal[];
  /** Ausencias ya consultadas, por funcionario. Ausente = todavía no se sabe. */
  ausencias: Record<number, Disponibilidad[]>;
  hoy: string;
  seleccionadoId: number | null;
  /** Ficha recién guardada/editada: se resalta (distinto de la selección) tras navegar a su fila. */
  resaltadoId?: number | null;
  onSeleccionar: (funcionario: Funcionario) => void;
  onEditar: (funcionario: Funcionario) => void;
  onDarDeBaja: (funcionario: Funcionario) => void;
  /** Reingreso de una ficha desactivada. Sin él, las inactivas no se pueden readmitir. */
  onReactivar?: (funcionario: Funcionario) => void;
  /**
   * Si quien mira administra el maestro. Falso para los tres roles departamentales, que
   * desde el 2026-08-27 consultan la ficha y anotan ausencias, pero no editan ni dan de
   * baja.
   *
   * SE OCULTAN LOS BOTONES, NO SE APAGAN. Un botón apagado insinúa que en otro momento
   * serviría, y a ese perfil no le servirá nunca: el servidor los cierra con su propio
   * `@Roles`. Mismo criterio que el modo «solo personal» de P-02.
   */
  puedeAdministrar: boolean;
  mensajeVacio: string;
};

const TablaPersonal: FC<TablaPersonalProps> = ({
  personal,
  zonales,
  ausencias,
  hoy,
  seleccionadoId,
  resaltadoId = null,
  onSeleccionar,
  onEditar,
  onDarDeBaja,
  onReactivar,
  puedeAdministrar,
  mensajeVacio,
}) => {
  // La ficha guarda `zonalId`; aquí se pinta el nombre de la zona que gestiona la persona.
  const nombreZonal = new Map(zonales.map((zonal) => [zonal.id, zonal.nombre]));

  /**
   * Acciones del menú «⋯» de una fila. Ausencias está para todos (los departamentales consultan
   * ausencias sin administrar); Dar de baja / Reactivar solo si `puedeAdministrar`. La baja va en
   * `text-error` y el reingreso en `text-success` (el color acompaña al texto, regla 6).
   */
  const accionesDe = (funcionario: Funcionario): AccionFila[] => {
    const acciones: AccionFila[] = [
      {
        clave: "ausencias",
        texto: "Ausencias",
        icono: "ausencias",
        onClick: () => onSeleccionar(funcionario),
      },
    ];

    if (puedeAdministrar) {
      acciones.push(
        funcionario.activo
          ? {
              clave: "baja",
              texto: "Dar de baja",
              icono: "eliminar",
              onClick: () => onDarDeBaja(funcionario),
              tono: "text-error",
            }
          : {
              clave: "reactivar",
              texto: "Reactivar",
              icono: "activar",
              onClick: () => onReactivar?.(funcionario),
              tono: "text-success",
            },
      );
    }

    return acciones;
  };

  return (
  <div className="overflow-x-auto">
    <table className="table table-sm table-zebra">
      {/*
        COLUMNAS AGRUPADAS (2026-09-30): «Área / Zonal» y «Contacto» (teléfono + correo) se agrupan
        con una cabecera de dos filas (rowspan/colspan). Las columnas hoja —Área, Zonal, Teléfono,
        Correo— siguen siendo `columnheader` con su propio nombre, así que nada que las consulte por
        nombre cambia.
      */}
      <thead>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          <th scope="col" rowSpan={2}>Cédula</th>
          <th scope="col" rowSpan={2}>Apellidos y nombres</th>
          <th scope="colgroup" colSpan={2}>Área / Zonal</th>
          <th scope="col" rowSpan={2}>Contrato</th>
          <th scope="colgroup" colSpan={2}>Contacto</th>
          <th scope="col" rowSpan={2}>Estado</th>
          <th scope="col" rowSpan={2}>Acciones</th>
        </tr>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          <th scope="col">Área</th>
          <th scope="col">Zonal</th>
          <th scope="col">Teléfono</th>
          <th scope="col">Correo</th>
        </tr>
      </thead>
      <tbody>
        {personal.length === 0 ? (
          <tr>
            <td
              colSpan={9}
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
                className={
                  funcionario.id === resaltadoId
                    ? "bg-success/10"
                    : funcionario.id === seleccionadoId
                      ? "bg-primary/5"
                      : "hover:bg-primary/5"
                }
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
                {/*
                  LA ZONA QUE GESTIONA LA PERSONA. Solo el personal DMIP la lleva; para el resto,
                  la raya dice «no hay», igual que en teléfono y correo (regla 6). Si la zonal
                  quedó fuera del catálogo vigente, también se ve la raya en vez de un id crudo.
                */}
                <td className="px-3 py-1 align-top">
                  {funcionario.zonalId != null
                    ? (nombreZonal.get(funcionario.zonalId) ?? "—")
                    : "—"}
                </td>
                <td className="px-3 py-1 align-top">
                  {NOMBRE_CONTRATO[funcionario.tipoContrato]}
                </td>
                <td className="px-3 py-1 align-top">
                  {funcionario.telefono ?? "—"}
                </td>
                {/*
                  LA RAYA DICE «NO HAY», IGUAL QUE EN EL TELÉFONO. Una celda vacía se
                  confunde con una columna que no cargó; el guion afirma que se miró y no
                  hay dato, que es información distinta (regla 6).
                */}
                <td className="px-3 py-1 align-top">
                  {funcionario.correo ?? "—"}
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
                  {/*
                    «EDITAR» VISIBLE + MENÚ «⋯». Los iconos acompañan, nunca sustituyen (regla 13);
                    el rótulo queda —en «Dar de baja» corrige lo que el tacho sugiere: la ficha NO
                    se borra, se retira y su histórico sobrevive—. El resto de acciones va en el
                    menú `SubMenuDropdown` (en portal, no lo recorta el scroll de la tabla). El «⋯»
                    lleva `label` para tener nombre accesible aunque sea icónico.
                  */}
                  <div className="flex flex-wrap items-center gap-1">
                    {puedeAdministrar && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => onEditar(funcionario)}
                      >
                        <Iconos nombre="editar" />
                        Editar
                      </button>
                    )}
                    <SubMenuDropdown<AccionFila>
                      botonProps={{
                        estilos: "btn btn-ghost btn-xs",
                        icono: "subMenu",
                        deshabilitado: false,
                        label: `Acciones de ${nombreCompleto(funcionario)}`,
                      }}
                      items={accionesDe(funcionario)}
                      renderItem={(acciones) =>
                        acciones.map((accion) => (
                          <li key={accion.clave}>
                            <button
                              type="button"
                              className={accion.tono}
                              onClick={accion.onClick}
                            >
                              <Iconos nombre={accion.icono} />
                              {accion.texto}
                            </button>
                          </li>
                        ))
                      }
                    />
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
};

export default TablaPersonal;
