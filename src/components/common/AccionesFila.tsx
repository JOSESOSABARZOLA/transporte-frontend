/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Acciones de fila
 * Archivo: AccionesFila.tsx
 * Responsabilidad: El grupo de acciones de una fila, el mismo en todas las tablas: Editar, la
 *                  acción propia de la pantalla, el cambio de estado y un «⋮» con el resto.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTÁNDAR DE BOTONES (2026-10-15). Antes había seis maneras de pintar las acciones de una fila
 * (24 px, 32 px, con y sin borde, la baja dentro o fuera del menú). Ahora:
 *
 *   ORDEN FIJO: [✎ Editar] → [acción propia] → [estado] → [⋮ resto]. Como mucho tres visibles.
 *   TODOS `<Boton tamano="sm">` (32 px, 13 px), 6 px entre ellos, sin partir el rótulo, alineados
 *   a la derecha (la celda lleva `text-right`).
 *   ESTADO, un solo par de verbos por pantalla:
 *     · Desactivar / Activar: catálogos, formularios, personal, cuentas.
 *     · Dar de baja / Reactivar: flota.
 *     · Retirar: solo Roles de Auth central.
 *   Sacar de uso va en `peligro` (borde rojo) y volver a ponerlo, en `exito` (borde verde); la
 *   confirmación, si la hay, es de quien llama.
 *   EL «⋮» (`MenuFila`) guarda lo raro: «Ver detalle», y el borrado definitivo, en rojo con la
 *   papelera. Una opción apagada sigue en el menú, con su motivo en el `title`.
 *
 * Cada control lleva el nombre del registro en su nombre accesible («Editar PBA-1235»).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, MouseEvent } from "react";

import Boton, { type VarianteBoton } from "./Boton.tsx";
import Tooltip from "./Tooltip.tsx";
import Iconos, { type NombreIcono } from "./Iconos.tsx";
import SubMenuDropdown from "./SubMenuDropdown.tsx";

/** El cambio de estado de la fila: sacar de uso o volver a ponerlo. */
export type EstadoFila = "desactivar" | "activar" | "baja" | "reactivar" | "retirar";

const ESTADO: Record<EstadoFila, { texto: string; icono: NombreIcono; variante: VarianteBoton }> = {
  desactivar: { texto: "Desactivar", icono: "desactivar", variante: "peligro" },
  activar: { texto: "Activar", icono: "activar", variante: "exito" },
  baja: { texto: "Dar de baja", icono: "desactivar", variante: "peligro" },
  reactivar: { texto: "Reactivar", icono: "activar", variante: "exito" },
  retirar: { texto: "Retirar", icono: "desactivar", variante: "peligro" },
};

/** Una acción que puede no aplicar en esta fila: con `motivo`, se ve apagada y lo explica. */
type Condicionada = {
  onClick: () => void;
  motivo?: string | null;
};

export type AccionEditar = Condicionada & {
  /** «Editar» por omisión; «Ver» cuando la fila es de consulta. */
  texto?: string;
  icono?: NombreIcono;
};

export type AccionPropia = Condicionada & {
  texto: string;
  icono: NombreIcono;
  /** `acento` (crear o agregar en la fila) por omisión. */
  variante?: "acento" | "primario" | "secundario";
  /** Nombre accesible, si el texto visible no basta («Agregar Personal»). */
  etiqueta?: string;
};

export type AccionEstado = Condicionada & { tipo: EstadoFila };

export type OpcionMenu = Condicionada & {
  texto: string;
  icono?: NombreIcono;
  /** El borrado definitivo: rojo y con la papelera. */
  peligro?: boolean;
  /** Línea divisoria antes de esta opción. */
  separadorAntes?: boolean;
};

/** El «⋮» de una fila. Se exporta para quien compone sus propios casilleros (Mis operativos). */
export const MenuFila: FC<{
  nombre: string;
  opciones: OpcionMenu[];
  procesando?: boolean;
  /** Nombre accesible del «⋮»; por omisión, «Más acciones de <nombre>». */
  etiqueta?: string;
}> = ({ nombre, opciones, procesando = false, etiqueta }) => (
  <SubMenuDropdown<OpcionMenu>
    disparador={{ etiqueta: etiqueta ?? `Más acciones de ${nombre}` }}
    items={opciones}
    renderItem={(lista) =>
      lista.flatMap((opcion) => {
        const apagado = Boolean(opcion.motivo) || procesando;
        const item = (
          <li key={opcion.texto}>
            <button
              type="button"
              className={
                apagado
                  ? "cursor-not-allowed text-app-disabled"
                  : opcion.peligro
                    ? "text-error"
                    : undefined
              }
              aria-disabled={apagado || undefined}
              title={opcion.motivo ?? undefined}
              onClick={(evento: MouseEvent<HTMLButtonElement>) => {
                if (apagado) {
                  // Apagada: el menú sigue abierto para que el motivo se lea.
                  evento.stopPropagation();
                  return;
                }
                opcion.onClick();
              }}
            >
              <Iconos nombre={opcion.icono ?? (opcion.peligro ? "eliminar" : undefined)} />
              {opcion.texto}
            </button>
          </li>
        );
        return opcion.separadorAntes
          ? [
              <li
                key={`separador-${opcion.texto}`}
                role="separator"
                className="my-1 h-px bg-base-300 p-0"
              />,
              item,
            ]
          : [item];
      })
    }
  />
);

/**
 * ¿Rótulo o solo icono? (2026-10-19, plan «acciones-icono-notas»). Las tablas DENSAS —más de ocho
 * columnas— usan `icono`: botones cuadrados de 32 px, sin texto visible, con el nombre en el
 * `<Tooltip>` (o el motivo si está apagado) y en `aria-label` junto al registro. El resto, icono y texto.
 */
export type ModoAcciones = "texto" | "icono";

/** Un botón de acción de fila en modo icono: cuadrado, sin texto, con su tooltip. */
export const BotonIcono: FC<{
  icono: NombreIcono;
  rotulo: string;
  nombre: string;
  variante?: VarianteBoton;
  motivo?: string | null;
  procesando?: boolean;
  alinear?: "centro" | "fin";
  onClick: () => void;
}> = ({ icono, rotulo, nombre, variante = "secundario", motivo, procesando = false, alinear, onClick }) => (
  <Tooltip texto={motivo || rotulo} alinear={alinear}>
    <Boton
      variante={variante}
      tamano="sm"
      icono={icono}
      className="[--fontsize:1rem]"
      deshabilitado={Boolean(motivo) || procesando}
      onClick={onClick}
      aria-label={`${rotulo} ${nombre}`}
    />
  </Tooltip>
);

type AccionesFilaProps = {
  /** El nombre del registro para los lectores de pantalla: «PBA-1235», «Garaje Calderón». */
  nombre: string;
  /** `texto` (por omisión) o `icono` en tablas densas. */
  modo?: ModoAcciones;
  procesando?: boolean;
  editar?: AccionEditar | null;
  propia?: AccionPropia | null;
  estado?: AccionEstado | null;
  menu?: OpcionMenu[];
};

const AccionesFila: FC<AccionesFilaProps> = ({
  nombre,
  procesando = false,
  editar,
  propia,
  estado,
  menu = [],
  modo = "texto",
}) => {
  const rotuloEstado = estado ? ESTADO[estado.tipo] : null;
  if (modo === "icono") {
    const ultimo = menu.length > 0 ? "menu" : estado ? "estado" : propia ? "propia" : "editar";
    return (
      <div className="app-acciones-icono">
        {editar && (
          <BotonIcono
            icono={editar.icono ?? "editar"}
            rotulo={editar.texto ?? "Editar"}
            nombre={nombre}
            motivo={editar.motivo}
            procesando={procesando}
            alinear={ultimo === "editar" ? "fin" : undefined}
            onClick={editar.onClick}
          />
        )}
        {propia && (
          <BotonIcono
            icono={propia.icono}
            rotulo={propia.etiqueta ?? propia.texto}
            nombre={nombre}
            variante={propia.variante ?? "acento"}
            motivo={propia.motivo}
            procesando={procesando}
            alinear={ultimo === "propia" ? "fin" : undefined}
            onClick={propia.onClick}
          />
        )}
        {estado && rotuloEstado && (
          <BotonIcono
            icono={rotuloEstado.icono}
            rotulo={rotuloEstado.texto}
            nombre={nombre}
            variante={rotuloEstado.variante}
            motivo={estado.motivo}
            procesando={procesando}
            alinear={ultimo === "estado" ? "fin" : undefined}
            onClick={estado.onClick}
          />
        )}
        {menu.length > 0 && <MenuFila nombre={nombre} opciones={menu} procesando={procesando} />}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      {editar && (
        <Boton
          tamano="sm"
          icono={editar.icono ?? "editar"}
          deshabilitado={procesando}
          motivoDeshabilitado={editar.motivo}
          onClick={editar.onClick}
          aria-label={`${editar.texto ?? "Editar"} ${nombre}`}
        >
          {editar.texto ?? "Editar"}
        </Boton>
      )}
      {propia && (
        <Boton
          variante={propia.variante ?? "acento"}
          tamano="sm"
          icono={propia.icono}
          deshabilitado={procesando}
          motivoDeshabilitado={propia.motivo}
          onClick={propia.onClick}
          aria-label={`${propia.etiqueta ?? propia.texto} ${nombre}`}
        >
          {propia.texto}
        </Boton>
      )}
      {estado && rotuloEstado && (
        <Boton
          variante={rotuloEstado.variante}
          tamano="sm"
          icono={rotuloEstado.icono}
          deshabilitado={procesando}
          motivoDeshabilitado={estado.motivo}
          onClick={estado.onClick}
          aria-label={`${rotuloEstado.texto} ${nombre}`}
        >
          {rotuloEstado.texto}
        </Boton>
      )}
      {menu.length > 0 && <MenuFila nombre={nombre} opciones={menu} procesando={procesando} />}
    </div>
  );
};

export default AccionesFila;
