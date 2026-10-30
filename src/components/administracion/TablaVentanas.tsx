/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: TablaVentanas.tsx
 * Responsabilidad: Mostrar las seis ventanas de carga, su franja del día y su estado en vivo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * «SIN RESTRICCIÓN HORARIA» NO ES LO MISMO QUE «SIN DATOS».
 *
 * Una ventana desactivada, o con la hora de apertura nula, **no está incompleta**: dice
 * que ese rol no tiene esa restricción. Escribir «—» en esas celdas las haría parecer datos que
 * alguien olvidó cargar, y el siguiente administrador «los completaría» cerrando una ventana que
 * nadie pidió cerrar.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO HAY BOTÓN DE AGREGAR NI DE ELIMINAR, y no falta ninguno: hay exactamente una ventana
 * por rol y el contrato no expone `POST` ni `DELETE`.
 *
 * REDISEÑO (2026-10-24, prototipo CARGA1). Cada fila dice:
 *   · el tipo con su horario («Desde 00H00 hasta 15H00»);
 *   · la franja permitida en una barra de 24 h, con la marca de «ahora»;
 *   · el estado EN VIVO («Abierta · cierra 15H00 (en 50 min)»), de `estadoVentana.util.ts`;
 *   · el mensaje; si trae una hora escrita a mano que no es la de la ventana, el aviso ámbar «El
 *     mensaje no coincide con el horario» y «Usar mensaje sugerido», que abre el cajón con el
 *     texto ya puesto (no guarda solo).
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import Boton from "../common/Boton.tsx";
import Insignia, { type VarianteInsignia } from "../common/Insignia.tsx";
import BarraFranja24h from "./BarraFranja24h.tsx";

import type {
  TipoVentana,
  VentanaCarga,
} from "../../interfaces/Administracion.ts";
import {
  comoHoraInstitucional,
  detectarHoraInconsistente,
  mensajeSugerido,
  resolverMensajeVentana,
} from "../../utils/mensajeVentana.util.ts";
import {
  detalleDeHorario,
  estadoEnVivo,
  franjasDelDia,
  partesEstado,
  type EstadoEnVivo,
} from "../../utils/estadoVentana.util.ts";
import { minutosEnZona } from "../../utils/ventanaCarga.util.ts";
import type { RolDepartamental } from "../../config/env.ts";

type TablaVentanasProps = {
  /** Nombre legible de un rol: sale del catálogo del servidor, no de un mapa del navegador. */
  nombreDe: (rol: RolDepartamental) => string;
  ventanas: VentanaCarga[];
  cargando: boolean;
  procesando: boolean;
  /** Abre el cajón; `mensajeInicial` llega con «Usar mensaje sugerido». */
  onEditar: (ventana: VentanaCarga, mensajeInicial?: string) => void;
  /** La fila recién guardada, resaltada en verde unos segundos (2026-10-07). */
  resaltado?: RolDepartamental | null;
  /** El reloj de la página: se refresca cada minuto. */
  ahora: Date;
};

/** El tipo en una palabra, como en el prototipo. */
const TIPO_CORTO: Record<TipoVentana, string> = {
  DIARIO: "Diario",
  LABORABLE: "Laborables",
  SIN_RESTRICCION: "Sin restricción",
  SEMANAL: "Semanal",
  INTERVALO: "Intervalo",
};

const VARIANTE_ESTADO: Record<EstadoEnVivo["tipo"], VarianteInsignia> = {
  ABIERTA: "exito",
  CERRADA: "avisoSuave",
  SIN_RESTRICCION: "neutro",
  POR_DIAS: "neutro",
};

const sinRestriccion = (ventana: VentanaCarga): boolean =>
  !ventana.activo || ventana.tipo === "SIN_RESTRICCION";

/**
 * El estado ahora (2026-10-24): etiqueta de esquinas `rounded-lg`, sin cortes de línea dentro de
 * cada parte; si no cabe, el detalle «(en 5 h 3 min)» baja a una segunda línea DENTRO de la
 * etiqueta, nunca fuera de su borde. «Sin restricción» es siempre la misma etiqueta gris.
 */
const EtiquetaEstado: FC<{ estado: EstadoEnVivo }> = ({ estado }) => {
  const { principal, detalle } = partesEstado(estado);
  return (
    <Insignia
      variante={VARIANTE_ESTADO[estado.tipo]}
      className="h-auto max-w-full flex-wrap justify-start gap-x-1 gap-y-0 rounded-lg py-0.5"
    >
      <span className="whitespace-nowrap">{principal}</span>
      {detalle && (
        <span className="whitespace-nowrap text-xs font-normal">{detalle}</span>
      )}
    </Insignia>
  );
};

/** El mensaje como lo leerá el funcionario. */
const mensajeDe = (ventana: VentanaCarga): string =>
  ventana.mensajeResuelto ??
  resolverMensajeVentana(
    ventana.mensajeCierre,
    ventana.horaApertura,
    ventana.horaCierre,
  );

/** La celda del mensaje: el texto, o el aviso de que no coincide con el horario. */
const CeldaMensaje: FC<{
  ventana: VentanaCarga;
  procesando: boolean;
  onSugerido: (mensaje: string) => void;
}> = ({ ventana, procesando, onSugerido }) => {
  if (sinRestriccion(ventana)) {
    return <span className="text-app-muted">No se muestra mensaje.</span>;
  }
  const inconsistente = detectarHoraInconsistente(
    ventana.mensajeCierre,
    ventana.horaApertura,
    ventana.horaCierre,
  );
  if (!inconsistente) return <span>{mensajeDe(ventana)}</span>;

  const hasta = ventana.horaCierre
    ? comoHoraInstitucional(ventana.horaCierre)
    : "24H00";
  const horario = ventana.horaApertura
    ? `de ${comoHoraInstitucional(ventana.horaApertura)} a ${hasta}`
    : `hasta ${hasta}`;
  return (
    <div className="flex flex-col items-start gap-1">
      <Insignia variante="avisoSuave">
        ⚠ El mensaje no coincide con el horario
      </Insignia>
      <span className="text-xs text-app-muted">
        Dice «{inconsistente.texto}» y el horario es {horario}.
      </span>
      <Boton
        variante="enlace"
        tamano="sm"
        deshabilitado={procesando}
        onClick={() => onSugerido(mensajeSugerido(ventana.rol, ventana.tipo))}
      >
        Usar mensaje sugerido
      </Boton>
    </div>
  );
};

const TablaVentanas: FC<TablaVentanasProps> = ({
  ventanas,
  cargando,
  procesando,
  onEditar,
  nombreDe,
  resaltado = null,
  ahora,
}) => (
  <div className="overflow-x-auto">
    <table className="table table-sm table-zebra w-full text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-app-label">
          <th scope="col">Rol</th>
          <th scope="col">Tipo</th>
          <th scope="col">Franja permitida (00H00 – 24H00)</th>
          <th scope="col">Estado ahora</th>
          <th scope="col">Mensaje</th>
          <th scope="col" className="text-right">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {ventanas.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              className="px-3 py-6 text-center text-sm text-app-muted"
            >
              {cargando
                ? "Cargando las ventanas…"
                : "No hay ventanas de carga registradas."}
            </td>
          </tr>
        ) : (
          ventanas.map((ventana) => {
            const estado = estadoEnVivo(ventana, ahora);
            const minutos = minutosEnZona(ventana.zonaHoraria, ahora);
            const horaAhora = comoHoraInstitucional(
              `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`,
            );
            return (
              <tr
                key={ventana.rol}
                className={
                  ventana.rol === resaltado
                    ? "bg-success/10"
                    : "hover:bg-primary/5"
                }
              >
                <td className="px-3 py-2 align-top font-medium">
                  {nombreDe(ventana.rol)}
                </td>
                <td className="px-3 py-2 align-top">
                  <span className="block">
                    {sinRestriccion(ventana)
                      ? "Sin restricción"
                      : TIPO_CORTO[ventana.tipo]}
                  </span>
                  <span className="block text-xs text-app-muted">
                    {detalleDeHorario(ventana)}
                  </span>
                </td>
                <td className="px-3 py-2 align-top">
                  <BarraFranja24h
                    franjas={franjasDelDia(ventana)}
                    todoElDia={sinRestriccion(ventana)}
                    ahora={minutos}
                    descripcion={`${detalleDeHorario(ventana)}; ahora ${horaAhora}`}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <EtiquetaEstado estado={estado} />
                </td>
                <td className="px-3 py-2 align-top text-sm">
                  <CeldaMensaje
                    ventana={ventana}
                    procesando={procesando}
                    onSugerido={(mensaje) => onEditar(ventana, mensaje)}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <AccionesFila
                    nombre={`la ventana de ${nombreDe(ventana.rol)}`}
                    procesando={procesando}
                    editar={{ onClick: () => onEditar(ventana) }}
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

export default TablaVentanas;
