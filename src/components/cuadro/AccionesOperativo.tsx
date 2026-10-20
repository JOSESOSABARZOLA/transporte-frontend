/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: AccionesOperativo.tsx
 * Responsabilidad: Pintar el grupo de acciones de una fila, el mismo en todas las filas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13 · solo con icono desde el 2026-10-19
 * ═══════════════════════════════════════════════════════════════════════════════
 * CUATRO ACCIONES CON ICONO, SIN «⋮» (2026-10-19, plan «acciones-icono-notas»). Las tablas de
 * operativos son DENSAS (más de ocho columnas), así que van en `modo` icono del estándar de botones:
 * botones cuadrados de 32 px, 4 px entre ellos, el nombre en el `<Tooltip>` y en `aria-label` con
 * el identificador. Siempre en el mismo orden y en casilleros fijos, para que la columna no cambie
 * de ancho de una fila a otra:
 *   [✎ Editar · secundario]  [+ Agregar adicional · acento]  [👁 Ver detalle · secundario]  [🗑 Eliminar · peligro]
 *
 *  - EDITAR: «Agregar personal» (personas) para quien APORTA a un formulario ajeno; vacío en las
 *    filas de una patrulla que no son su cabeza. En una fila de CONSULTA (`consulta`: cuadro cerrado
 *    o ventana vencida) se oculta: «Ver detalle» abre en solo lectura.
 *  - AGREGAR ADICIONAL: `null` lo oculta (cuadro cerrado). CON LA VENTANA VENCIDA SIGUE: es la única
 *    escritura que ignora la ventana (RN-61 a RN-64, regla 11). Un formulario que no admite
 *    adicionales lo ve apagado con su motivo, para que la columna no se corra.
 *  - VER DETALLE: siempre.
 *  - ELIMINAR: se oculta en una fila de consulta; sin permiso, apagado con el motivo en el tooltip.
 *    La confirmación es de la pantalla (`PanelOperativos`).
 * Antes había tres casilleros con texto —principal, «+ Adicional» y «⋮» con Ver detalle y
 * Eliminar—. La patrulla registrada por quien también aporta sumaba «Agregar personal» al menú:
 * ahora es un botón más, antes de «Ver detalle».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import { BotonIcono } from "../common/AccionesFila.tsx";
import type { NombreIcono } from "../common/Iconos.tsx";

/** El botón principal de la fila. */
export type AccionPrincipal = {
  tipo: "editar" | "ver" | "personal";
  onClick: () => void;
  deshabilitado?: boolean;
  /** Por qué está apagado, o qué hace en esta fila: va al tooltip. */
  motivo?: string;
};

/** Una acción que puede no estar disponible: con `motivo`, se ve apagada y lo explica. */
export type AccionCondicionada = {
  onClick: () => void;
  motivo: string | null;
};

type AccionesOperativoProps = {
  identificador: string;
  /** `null`: el casillero queda vacío (fila de patrulla que no es la cabeza). */
  principal: AccionPrincipal | null;
  /** `null`: el casillero queda vacío (cuadro cerrado). */
  adicional: AccionCondicionada | null;
  onVerDetalle: () => void;
  /**
   * Fila de CONSULTA (cuadro cerrado o ventana vencida): sin Editar ni Eliminar. El adicional lo
   * decide `adicional`, no esto: la ventana no lo cierra.
   */
  consulta?: boolean;
  /**
   * Acciones extra, antes de «Ver detalle». La usa la patrulla cuando quien la registró también
   * aporta a ella: «Agregar personal» no cabe en el casillero principal, que ya es «Editar».
   */
  masAcciones?: { etiqueta: string; onClick: () => void }[];
  eliminar: AccionCondicionada;
  procesando?: boolean;
};

const PRINCIPAL: Record<"editar" | "personal", { rotulo: string; icono: NombreIcono }> = {
  editar: { rotulo: "Editar", icono: "editar" },
  personal: { rotulo: "Agregar personal", icono: "personal" },
};

const EN_CURSO = "Espere a que termine la operación en curso.";
const SIN_PERMISO_EDITAR = "No tiene permiso para editar este operativo.";

/** Un casillero de 32 px: ocupa su sitio aunque esté vacío. */
const Casillero: FC<{ children?: ReactNode }> = ({ children }) => (
  <span className="inline-flex w-8 shrink-0 justify-center">{children}</span>
);

const AccionesOperativo: FC<AccionesOperativoProps> = ({
  identificador,
  principal,
  adicional,
  onVerDetalle,
  consulta = false,
  masAcciones = [],
  eliminar,
  procesando = false,
}) => {
  /*
    «Ver» ya no es un botón propio: la consulta la da «Ver detalle». Fuera de una fila de consulta,
    un «Ver» es una fila que este rol no puede editar (otro departamento): «Editar» va apagado con
    el motivo (sin permiso), no oculto, para que la columna no cambie.
  */
  const editar = !consulta && principal ? principal : null;
  const sinPermiso = editar?.tipo === "ver";
  const rotulo = editar ? PRINCIPAL[sinPermiso ? "editar" : (editar.tipo as "editar" | "personal")] : null;
  const motivoEditar = sinPermiso
    ? (editar?.motivo ?? SIN_PERMISO_EDITAR)
    : editar?.deshabilitado
      ? (editar.motivo ?? EN_CURSO)
      : null;

  return (
    <div className="app-acciones-icono" data-acciones-operativo>
      <Casillero>
        {editar && rotulo && (
          <BotonIcono
            icono={rotulo.icono}
            rotulo={rotulo.rotulo}
            nombre={identificador}
            motivo={motivoEditar}
            procesando={procesando}
            onClick={editar.onClick}
          />
        )}
      </Casillero>

      <Casillero>
        {adicional && (
          <BotonIcono
            icono="agregar"
            rotulo="Agregar adicional"
            nombre={identificador}
            variante="acento"
            motivo={adicional.motivo}
            procesando={procesando}
            onClick={adicional.onClick}
          />
        )}
      </Casillero>

      {!consulta &&
        masAcciones.map((accion) => (
          <Casillero key={accion.etiqueta}>
            <BotonIcono
              icono="personal"
              rotulo={accion.etiqueta}
              nombre={identificador}
              procesando={procesando}
              onClick={accion.onClick}
            />
          </Casillero>
        ))}

      <Casillero>
        <BotonIcono
          icono="ver"
          rotulo="Ver detalle"
          nombre={identificador}
          onClick={onVerDetalle}
          alinear={consulta ? "fin" : undefined}
        />
      </Casillero>

      <Casillero>
        {!consulta && (
          <BotonIcono
            icono="eliminar"
            rotulo="Eliminar"
            nombre={identificador}
            variante="peligro"
            motivo={eliminar.motivo}
            procesando={procesando}
            alinear="fin"
            onClick={eliminar.onClick}
          />
        )}
      </Casillero>
    </div>
  );
};

export default AccionesOperativo;
