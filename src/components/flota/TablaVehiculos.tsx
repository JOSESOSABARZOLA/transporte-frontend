/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: TablaVehiculos.tsx
 * Responsabilidad: La vista «Lista» de la pestaña «Vehículos» de «Flota y garajes»: placa,
 *                  descripción, asientos, kilometraje, documentos, conductores habituales,
 *                  disponibilidad, estado y acciones.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REDISEÑO DEL 2026-10-14. Las filas llegan filtradas por la página; aquí solo se pintan. Los
 * distintivos salen todos de `Insignia`.
 *
 * DOCUMENTOS: el estado MÁS CRÍTICO de matrícula y SOAT, que calcula el servidor (`documentos`),
 * con las dos fechas debajo. Rojo solo vencido, ámbar «vence en N d», verde al día y ámbar SUAVE
 * sin fechas o con una que falta («Falta SOAT», 2026-10-15: es un dato que falta), y siempre con
 * su texto (regla 6).
 *
 * KILOMETRAJE A REVISAR (2026-10-15): sobre el tope o desde 500.000 (`kmSospechoso`) lleva un
 * «Revisar» ámbar con el porqué en el `title` y para el lector de pantalla. Las acciones van como
 * acciones de la fila van bajo el encabezado «Acciones» (con icono desde el 2026-10-20, abajo).
 *
 * AJUSTES DEL 2026-10-15: la placa se pinta normalizada (`PMA-3370`), bajo ella solo la
 * descripción real —nada si está vacía o repite el tipo— y las celdas de dos líneas van
 * `leading-tight`, para que la fila no crezca. Las filas llegan ya paginadas.
 *
 * UN VEHÍCULO SIN CONDUCTOR HABITUAL NO SE PROPONE AUTOMÁTICAMENTE al planificar el día: desde
 * PV-33 (2026-08-31) se puede asignar, pero la placa propuesta sale del conductor y el optimizador
 * lo deja de último. El alta no da ningún error, así que se señala en la fila, con el porqué en el `title` y para el lector de pantalla. Solo cuentan
 * los conductores activos, como en el indicador del servidor.
 *
 * MANTENIMIENTO INTEGRADO (2026-10-20, plan «flota-mantenimiento-baja»):
 *   · «Tipo · asientos» se partió en «Descripción del vehículo» (tipo + descripción real) y
 *     «Asientos» (número o «—»). Orden: Placa · Descripción · Asientos · Kilometraje · Documentos ·
 *     Conductores habituales · Disponibilidad · Estado · Acciones.
 *   · «Disponibilidad» en la fecha de «Estado el día»: «Disponible» (verde), «En taller hasta jue
 *     23/10» (ámbar, el motivo en el tooltip) o «—» si está de baja.
 *   · Nueve columnas: acciones con icono (`AccionesFila modo="icono"`, regla 17). Activo: Editar ·
 *     Programar mantenimiento · Dar de baja; de baja: Editar · Reactivar. «De baja» lleva en su
 *     tooltip cuándo y quién (`textoDeBaja`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import Insignia from "../common/Insignia.tsx";
import Tooltip from "../common/Tooltip.tsx";
import EstadoRegistroFlota from "./EstadoRegistroFlota.tsx";
import type { DisponibilidadDeVehiculo } from "../../interfaces/Flota.ts";
import type { Conductor, Vehiculo } from "../../interfaces/Transporte.ts";
import { fechaLarga } from "../../utils/ausencias.util.ts";
import {
  conductoresHabitualesDe,
  descripcionDelVehiculo,
  formatoKilometraje,
  kmSospechoso,
  normalizarPlaca,
  textoDisponibilidad,
  textoDocumentos,
  varianteDocumentos,
} from "../../utils/flota.util.ts";

/** El motivo de «Programar mantenimiento» apagado, sin el permiso `flota:mantenimiento`. */
export const SIN_PERMISO_MANTENIMIENTO = "No tiene permiso para programar mantenimiento.";

const AYUDA_KM = "Kilometraje inusual: confirme el dato.";

const AYUDA_SIN_CONDUCTOR =
  "Ningún conductor lo tiene como habitual: no se propondrá automáticamente al planificar el día.";

type TablaVehiculosProps = {
  vehiculos: Vehiculo[];
  /** El maestro entero de conductores, para saber quién lleva cada placa. */
  conductores: Conductor[];
  procesando: boolean;
  /** `DAF_KM_MAXIMO` del resumen: sobre él (o desde 500.000) el kilometraje se marca «Revisar». */
  kmMaximo: number;
  /** El id de la fila recién guardada (se resalta durante `MS_RESALTADO`). */
  resaltado: number | null;
  mensajeVacio: string;
  /** La disponibilidad de cada vehículo en la fecha elegida; sin dato, la celda dice «—». */
  disponibilidad: ReadonlyMap<number, DisponibilidadDeVehiculo>;
  /** Con `flota:mantenimiento`; sin él, «Programar mantenimiento» se ve apagado con su motivo. */
  puedeProgramar: boolean;
  onProgramar: (vehiculo: Vehiculo) => void;
  onEditar: (vehiculo: Vehiculo) => void;
  onDarDeBaja: (vehiculo: Vehiculo) => void;
  onReactivar: (vehiculo: Vehiculo) => void;
};

/** «Matrícula 10/03/2027 · SOAT 02/11/2026», con lo que haya. */
const fechasDocumentos = (vehiculo: Vehiculo): string =>
  [
    vehiculo.matriculaVencimiento ? `Matrícula ${fechaLarga(vehiculo.matriculaVencimiento)}` : null,
    vehiculo.soatVencimiento ? `SOAT ${fechaLarga(vehiculo.soatVencimiento)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

const TablaVehiculos: FC<TablaVehiculosProps> = ({
  vehiculos,
  conductores,
  procesando,
  kmMaximo,
  resaltado,
  mensajeVacio,
  disponibilidad,
  puedeProgramar,
  onProgramar,
  onEditar,
  onDarDeBaja,
  onReactivar,
}) => {
  if (vehiculos.length === 0) {
    return <p className="px-2 py-6 text-center text-sm text-app-muted">{mensajeVacio}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="table table-sm table-zebra w-full text-sm"
        aria-label="Vehículos"
      >
        <thead>
          <tr className="text-xs uppercase tracking-wider text-app-label">
            <th scope="col">Placa</th>
            <th scope="col">Descripción del vehículo</th>
            <th scope="col">Asientos</th>
            <th scope="col">Kilometraje</th>
            <th scope="col">Documentos</th>
            <th scope="col">Conductores habituales</th>
            <th scope="col">Disponibilidad</th>
            <th scope="col">Estado</th>
            <th scope="col" className="w-[9.5rem] text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {vehiculos.map((vehiculo) => {
            const habituales = conductoresHabitualesDe(vehiculo.id, conductores);
            const resaltada = vehiculo.id === resaltado;
            const fechas = fechasDocumentos(vehiculo);
            const disponible = disponibilidad.get(vehiculo.id);
            return (
              <tr
                key={vehiculo.id}
                data-resaltado={resaltada || undefined}
                className={`transition-colors hover:bg-primary/5 ${resaltada ? "bg-success/10" : ""}`}
              >
                <td>
                  <span
                    className={`font-mono font-semibold ${vehiculo.activo ? "text-app-strong" : "text-app-muted"}`}
                  >
                    {normalizarPlaca(vehiculo.placa)}
                  </span>
                </td>
                <td>{descripcionDelVehiculo(vehiculo)}</td>
                <td>{vehiculo.asientos ?? "—"}</td>
                <td>
                  {vehiculo.kilometraje != null ? (
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      {formatoKilometraje(vehiculo.kilometraje)}
                      {kmSospechoso(vehiculo.kilometraje, kmMaximo) && (
                        <Insignia variante="aviso" title={AYUDA_KM}>
                          Revisar
                          <span className="sr-only">: {AYUDA_KM}</span>
                        </Insignia>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <div className="flex flex-col items-start gap-0.5 leading-tight">
                    {fechas && <span className="text-xs leading-tight text-app-muted">{fechas}</span>}
                    {vehiculo.documentos && (
                      <Insignia variante={varianteDocumentos(vehiculo.documentos.estado)}>
                        {textoDocumentos(vehiculo.documentos)}
                      </Insignia>
                    )}
                  </div>
                </td>
                <td>
                  {habituales.length > 0 ? (
                    <ul className="flex flex-col">
                      {habituales.map((conductor) => (
                        <li key={conductor.id}>{conductor.nombreCompleto}</li>
                      ))}
                    </ul>
                  ) : vehiculo.activo ? (
                    <Insignia
                      variante="aviso"
                      title={AYUDA_SIN_CONDUCTOR}
                    >
                      ⚠ Sin conductor habitual
                      <span className="sr-only">: {AYUDA_SIN_CONDUCTOR}</span>
                    </Insignia>
                  ) : (
                    <span className="text-app-muted">—</span>
                  )}
                </td>
                <td>
                  {disponible?.disponibilidad === "EN_TALLER" ? (
                    <Tooltip texto={disponible.enTaller?.motivo ?? "Sin motivo registrado"}>
                      <span tabIndex={0} className="inline-flex">
                        <Insignia variante="aviso">
                          {textoDisponibilidad(disponible)}
                          {disponible.enTaller?.motivo && (
                            <span className="sr-only">: {disponible.enTaller.motivo}</span>
                          )}
                        </Insignia>
                      </span>
                    </Tooltip>
                  ) : disponible?.disponibilidad === "DISPONIBLE" ? (
                    <Insignia variante="exito">Disponible</Insignia>
                  ) : (
                    <span className="text-app-muted">—</span>
                  )}
                </td>
                <td>
                  <EstadoRegistroFlota enUso={vehiculo.activo} textoEnUso="Activo" registro={vehiculo} />
                </td>
                <td className="whitespace-nowrap text-right">
                  <AccionesFila
                    modo="icono"
                    nombre={normalizarPlaca(vehiculo.placa)}
                    procesando={procesando}
                    editar={{ onClick: () => onEditar(vehiculo) }}
                    propia={
                      vehiculo.activo
                        ? {
                            texto: "Programar mantenimiento",
                            icono: "mantenimiento",
                            variante: "secundario",
                            motivo: puedeProgramar ? null : SIN_PERMISO_MANTENIMIENTO,
                            onClick: () => onProgramar(vehiculo),
                          }
                        : null
                    }
                    estado={
                      vehiculo.activo
                        ? { tipo: "baja", onClick: () => onDarDeBaja(vehiculo) }
                        : { tipo: "reactivar", onClick: () => onReactivar(vehiculo) }
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

export default TablaVehiculos;
