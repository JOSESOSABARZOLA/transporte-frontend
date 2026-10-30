/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Detalle del operativo
 * Archivo: DetalleOperativoLectura.tsx
 * Responsabilidad: El cajón «Detalle del operativo» («Ver» y «Ver detalle» de Registro de operativo
 *                  y Mis operativos): solo los datos registrados, sin controles.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-27
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIRAR NO ES EDITAR CON TODO APAGADO (2026-10-27). Hasta hoy el detalle era el formulario de
 * edición dentro de un `fieldset` deshabilitado: se veían el buscador, las pestañas por área, los
 * «+ Agregar» apagados, el paginador, «Completar con…» y «Ver reparto de carga». Aquí solo está lo
 * registrado.
 *
 * FICHA DE SOLO LECTURA (2026-10-28). Mismos datos, otra presentación: el cuerpo es gris claro
 * (`--app-detalle-fondo`) y cada sección, una tarjeta blanca con su icono y título azul.
 *
 * | Bloque | Qué dice |
 * |---|---|
 * | Resumen | tres tarjetas: horario, lugar (zonal y punto) y personal (personas y códigos) |
 * | Aviso | «Transporte pendiente…» si hace falta vehículo y la DAF aún no asigna conductor |
 * | Personal asignado | avatar con iniciales, nombre, cargo · teléfono, trámite y horario |
 * | Lugar y control | zonal, punto de encuentro, instituciones y tipo de control (2×2) |
 * | Transporte | el estado junto al título; requerido, conductor y placa |
 * | Observaciones | las notas (`NotasObservacion`) o «Sin observaciones» |
 *
 * Lo vacío se lee «—». El horario, como en las tablas: «08H00 a 16H30» (`horarioLegible`). Con
 * «Propios medios» u «Otra institución», Conductor y Placa dicen «—» y no hay aviso: el tipo ya se
 * lee en «Requerido». «Sin asignar» va en ámbar y con su palabra (regla 6). El pie dice quién lo
 * registró y, debajo, cuándo; «Editar» aparece solo si la página lo pasa (`onEditar`): fila propia
 * con la ventana y el cuadro abiertos. Abre el mismo camino que el «Editar» de la fila.
 *
 * LA PATRULLA ES UN REGISTRO CON VARIOS CÓDIGOS (2026-10-27). Con `grupo` (los códigos del mismo
 * `grupoRegistro`), el título es «Detalle de patrulla» y debajo van todos los identificadores; el
 * UUID del registro no se muestra. «Personal asignado» lista a la gente de TODOS los códigos, cada
 * persona con el identificador del suyo, y el horario del resumen es la envolvente de los códigos.
 * Lugar, control, transporte y notas son los del código abierto: son los generales del registro,
 * comunes a todo el lote.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import Boton from "../common/Boton.tsx";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import Iconos, { type NombreIcono } from "../common/Iconos.tsx";
import Insignia from "../common/Insignia.tsx";
import NotasObservacion from "../common/NotasObservacion.tsx";
import ChipFormulario from "./ChipFormulario.tsx";
import { colorEstado } from "../../config/env.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import { comoHorario, envolventeDeHorarios } from "../../utils/horario.util.ts";
import {
  SIN_TELEFONO,
  filasDePersonal,
  nombreEstadoDeFila,
  tiposDelOperativo,
  valorDeColumna,
} from "../../utils/listadoOperativos.util.ts";
import { notasDe } from "../../utils/notasDeTabla.util.ts";
import { fechaDeNota } from "../../utils/notasOperativo.util.ts";
import { horarioLegible } from "../../utils/texto.util.ts";
import { DISTINTIVO_EXCLUSIVO, nombreTipoTransporte } from "../../utils/tipoTransporte.util.ts";

/** Lo que se lee en un campo sin dato. */
const VACIO = "—";

/** Colores suaves de los avatares, alternados por posición. El texto pasa AA sobre cada fondo. */
const COLORES_AVATAR = [
  "bg-[var(--app-msg-info-bg)] text-[var(--app-msg-info-fg)]",
  "bg-[var(--app-msg-exito-bg)] text-[var(--app-msg-exito-fg)]",
  "bg-[var(--app-nota-informativa-bg)] text-app-strong",
  "bg-[var(--app-nota-bg)] text-app-strong",
];

/** La tarjeta blanca de la ficha: borde suave y esquinas `rounded-xl`. */
const TARJETA =
  "rounded-xl border border-[var(--app-detalle-borde)] bg-[var(--app-detalle-tarjeta)] p-3.5";

type DetalleOperativoLecturaProps = {
  operativo: Operativo;
  onCerrar: () => void;
  /**
   * Los códigos de la patrulla (mismo `grupoRegistro`, por identificador), incluido `operativo`.
   * Con más de uno, el detalle es el de la patrulla entera.
   */
  grupo?: Operativo[];
  /** Aviso de la pantalla al principio del cuerpo (ventana o cuadro cerrados). */
  avisoContexto?: ReactNode;
  /** Solo con permiso y ventana abierta: cierra el detalle y abre la edición. */
  onEditar?: () => void;
};

/** Una sección: tarjeta con icono y título de 13 px; `accion` va a la derecha del título. */
const Seccion: FC<{
  titulo: string;
  icono: NombreIcono;
  accion?: ReactNode;
  children: ReactNode;
}> = ({ titulo, icono, accion, children }) => (
  <section aria-label={titulo} className={`flex flex-col gap-3 ${TARJETA}`}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-[0.8125rem] font-bold text-[var(--app-detalle-titulo)]">
        <Iconos nombre={icono} />
        {titulo}
      </h3>
      {accion}
    </div>
    {children}
  </section>
);

/** Un par rótulo/valor: rótulo de 11 px gris en mayúsculas, valor de 13 px. */
const Par: FC<{ rotulo: string; children: ReactNode }> = ({ rotulo, children }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-app-muted">
      {rotulo}
    </dt>
    <dd className="min-w-0 break-words text-[0.8125rem] text-app-strong">{children}</dd>
  </div>
);

/** Una tarjeta pequeña del resumen: icono y rótulo, valor principal y, si la hay, una línea debajo. */
const TarjetaResumen: FC<{
  rotulo: string;
  icono: NombreIcono;
  valor: string;
  detalle?: string;
}> = ({ rotulo, icono, valor, detalle }) => (
  <div className={`flex min-w-0 flex-col gap-0.5 ${TARJETA}`} data-tarjeta-resumen>
    <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-app-muted">
      <Iconos nombre={icono} />
      {rotulo}
    </span>
    <span className="truncate text-[0.8125rem] font-bold text-app-strong" title={valor}>
      {valor}
    </span>
    {detalle && (
      <span className="truncate text-xs text-app-muted" title={detalle}>
        {detalle}
      </span>
    )}
  </div>
);

/** Una lista de textos separados por coma, o «—». */
const lista = (textos: (string | null | undefined)[]): string => {
  const conDato = textos.filter((texto): texto is string => Boolean(texto?.trim()));
  return conDato.length > 0 ? conDato.join(", ") : VACIO;
};

/**
 * Las iniciales del avatar: primer nombre + primer apellido. El maestro escribe «APELLIDOS
 * NOMBRES» (dos apellidos con tres palabras o más, como `partirNombre`), así que el primer nombre
 * es la tercera palabra, o la segunda si solo hay dos.
 */
const inicialesDe = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const primerNombre = partes.length > 2 ? partes[2] : partes[1];
  return `${primerNombre?.[0] ?? ""}${partes[0][0]}`.toUpperCase();
};

const DetalleOperativoLectura: FC<DetalleOperativoLecturaProps> = ({
  operativo,
  onCerrar,
  grupo,
  avisoContexto,
  onEditar,
}) => {
  const codigos = grupo && grupo.length > 1 ? grupo : [operativo];
  const esPatrulla = codigos.length > 1;
  // Cada persona con el código al que va: en la patrulla se pinta su identificador.
  const personas = codigos.flatMap((codigo) =>
    codigo.personal.length > 0
      ? filasDePersonal(codigo).map((fila, indice) => ({
          ...fila,
          identificador: codigo.identificador,
          persona: codigo.personal[indice],
        }))
      : [],
  );
  const asignados = operativo.transporteAsignado ?? [];
  // «Propios medios» u «Otra institución»: no hay conductor que esperar, y el tipo ya se lee arriba.
  const sinVehiculo =
    valorDeColumna(operativo, "conductor") !== "" ||
    operativo.tipoTransporte === "PROPIOS_MEDIOS";
  const transportePendiente = !sinVehiculo && asignados.length === 0;
  const estado = nombreEstadoDeFila(operativo);
  const notas = notasDe(operativo);
  const registradoPor = operativo.registradoPor ?? operativo.creadoPorRol.replace(/_/g, " ");
  // «28/10/2026 · 09h05»: la fecha y la hora de Quito, separadas por un punto medio.
  const registradoEn = Number.isNaN(Date.parse(operativo.creadoEn))
    ? ""
    : fechaDeNota(operativo.creadoEn).replace(" ", " · ");

  // El horario del resumen: la envolvente de los códigos (en un operativo suelto, la suya); sin
  // horas legibles, el texto del servidor o «—».
  const envolvente = envolventeDeHorarios(codigos);
  const horario = envolvente
    ? horarioLegible(comoHorario(envolvente.horaInicio, envolvente.horaFin))
    : operativo.horario
      ? horarioLegible(operativo.horario)
      : VACIO;
  const zonales = lista(operativo.zonales.map((zonal) => zonal.nombre));
  const punto = lista([operativo.puntoEncuentro?.nombre ?? operativo.puntoLibre]);

  /** Conductor o placa: lo asignado, «Sin asignar» en ámbar o «—» sin vehículo de la DAF. */
  const celdaTransporte = (valor: (par: (typeof asignados)[number]) => string, mono = false) => {
    if (asignados.length > 0) {
      return asignados.map((par, indice) => (
        <span key={`${par.conductor}-${indice}`} className={`block${mono ? " font-mono" : ""}`}>
          {valor(par)}
        </span>
      ));
    }
    if (sinVehiculo) return VACIO;
    return (
      <span className="font-semibold text-[var(--app-detalle-pendiente)]">Sin asignar</span>
    );
  };

  return (
    <DrawerLateral
      abierto
      ancho="md"
      modo="lectura"
      titulo={esPatrulla ? "Detalle de patrulla" : "Detalle del operativo"}
      subtitulo={
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span>{codigos.map((codigo) => codigo.identificador).join(" · ")}</span>
          <ChipFormulario operativo={operativo} />
        </span>
      }
      onCerrar={onCerrar}
      claseCuerpo="bg-[var(--app-detalle-fondo)]"
      extraPie={
        <div
          role="status"
          className="flex min-w-0 flex-col text-sm leading-tight text-[var(--app-cajon-texto-suave)]"
        >
          <span>
            Registrado por{" "}
            <strong className="font-semibold text-[var(--app-cajon-texto)]">{registradoPor}</strong>
          </span>
          {registradoEn && <span className="text-xs">{registradoEn}</span>}
        </div>
      }
      accionesPie={
        onEditar && (
          <Boton tamano="lg" icono="editar" onClick={onEditar}>
            Editar
          </Boton>
        )
      }
    >
      <div className="flex flex-col gap-3" data-detalle-operativo={operativo.id}>
        {avisoContexto}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Resumen" role="group">
          <TarjetaResumen rotulo="Horario" icono="horario" valor={horario} />
          <TarjetaResumen rotulo="Lugar" icono="lugar" valor={zonales} detalle={punto} />
          <TarjetaResumen
            rotulo="Personal"
            icono="personal"
            valor={`${personas.length} ${personas.length === 1 ? "persona" : "personas"}`}
            detalle={esPatrulla ? `${codigos.length} códigos de patrulla` : "1 código"}
          />
        </div>

        {transportePendiente && (
          <AvisoEnLinea variante="advertencia">
            <strong>Transporte pendiente:</strong> la DAF todavía no asigna conductor ni vehículo.
          </AvisoEnLinea>
        )}

        <Seccion titulo="Personal asignado" icono="personaAsignada">
          {personas.length === 0 ? (
            <p className="text-[0.8125rem] text-app-muted">Sin personal asignado.</p>
          ) : (
            <ul
              className="flex flex-col border-t border-[var(--app-detalle-borde)] pt-2.5"
              aria-label="Personal asignado"
            >
              {personas.map((fila, posicion) => {
                const { persona } = fila;
                const tramite = persona.tramiteInspeccion;
                const sinTelefono = fila.telefono === SIN_TELEFONO;
                return (
                  <li
                    key={`${fila.identificador}-${persona.funcionarioId}`}
                    className="flex items-center gap-3 border-t border-[var(--app-detalle-borde)] py-2.5 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        COLORES_AVATAR[posicion % COLORES_AVATAR.length]
                      }`}
                    >
                      {inicialesDe(persona.nombre)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {esPatrulla && (
                        <span className="font-mono text-[0.625rem] text-app-muted">
                          {fila.identificador}
                        </span>
                      )}
                      <span className="truncate text-[0.8125rem] font-bold text-app-strong">
                        {persona.nombre}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-app-muted">
                        {fila.cargo && <span>{fila.cargo}</span>}
                        {fila.cargo && <span aria-hidden="true">·</span>}
                        <span
                          className={`font-mono ${sinTelefono ? "text-app-disabled" : "text-app-label"}`}
                        >
                          ☎ {fila.telefono}
                        </span>
                      </span>
                      {tramite && (
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          <Insignia variante="info">
                            Trámite <span className="ml-1 font-mono">{tramite.codigoTramite}</span>
                          </Insignia>
                          {[tramite.nroSitra && `SITRA ${tramite.nroSitra}`, tramite.predio]
                            .filter(Boolean)
                            .map((parte) => (
                              <span key={parte} className="text-xs text-app-muted">
                                {parte}
                              </span>
                            ))}
                        </span>
                      )}
                    </div>
                    <Insignia variante="suave" className="shrink-0 whitespace-nowrap">
                      {horarioLegible(fila.horario)}
                    </Insignia>
                  </li>
                );
              })}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Lugar y control" icono="lugarYControl">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Par rotulo="Zonal">{zonales}</Par>
            <Par rotulo="Punto de encuentro">{punto}</Par>
            <Par rotulo="Instituciones">
              {lista(operativo.instituciones.map((institucion) => institucion.sigla))}
            </Par>
            <Par rotulo="Tipo de control">
              {lista([...tiposDelOperativo(operativo), operativo.tipoLibre])}
            </Par>
          </dl>
        </Seccion>

        <Seccion
          titulo="Transporte"
          icono="transporte"
          accion={
            <span
              className={`badge badge-sm whitespace-nowrap rounded-full ${colorEstado(estado)}`}
            >
              {estado}
            </span>
          }
        >
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
            <Par rotulo="Requerido">
              {operativo.tipoTransporte ? (
                <Insignia
                  variante="info"
                  className="h-auto whitespace-normal rounded-full border-[var(--app-msg-info-fg)]!"
                >
                  {`${nombreTipoTransporte(operativo.tipoTransporte)}${
                    operativo.esMacrooperativo ? ` · ${DISTINTIVO_EXCLUSIVO}` : ""
                  }`}
                </Insignia>
              ) : (
                VACIO
              )}
            </Par>
            <Par rotulo="Conductor">{celdaTransporte((par) => par.conductor)}</Par>
            <Par rotulo="Placa">{celdaTransporte((par) => par.placa ?? VACIO, true)}</Par>
          </dl>
        </Seccion>

        <Seccion titulo="Observaciones" icono="observaciones">
          {notas.length > 0 ? (
            <NotasObservacion
              notas={notas}
              modo="lectura"
              max={notas.length}
              etiqueta={`Observaciones de ${operativo.identificador}`}
            />
          ) : (
            <p className="text-[0.8125rem] text-app-muted">Sin observaciones</p>
          )}
        </Seccion>
      </div>
    </DrawerLateral>
  );
};

export default DetalleOperativoLectura;
