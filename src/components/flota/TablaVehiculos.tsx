/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: TablaVehiculos.tsx
 * Responsabilidad: La pestaña «Vehículos» de «Flota y garajes»: placa, tipo y asientos,
 *                  kilometraje, documentos, conductores habituales, estado y acciones.
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
 * botones visibles (`AccionesFila modo="botones"`) bajo el encabezado «Acciones».
 *
 * AJUSTES DEL 2026-10-15: la placa se pinta normalizada (`PMA-3370`), bajo ella solo la
 * descripción real —nada si está vacía o repite el tipo— y las celdas de dos líneas van
 * `leading-tight`, para que la fila no crezca. Las filas llegan ya paginadas.
 *
 * UN VEHÍCULO SIN CONDUCTOR HABITUAL NO SE PROPONE AUTOMÁTICAMENTE al planificar el día: desde
 * PV-33 (2026-08-31) se puede asignar, pero la placa propuesta sale del conductor y el optimizador
 * lo deja de último. El alta no da ningún error, así que se señala en la fila, con el porqué en el `title` y para el lector de pantalla. Solo cuentan
 * los conductores activos, como en el indicador del servidor.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import Insignia from "../common/Insignia.tsx";
import type { Conductor, Vehiculo } from "../../interfaces/Transporte.ts";
import { fechaLarga } from "../../utils/ausencias.util.ts";
import {
  conductoresHabitualesDe,
  descripcionVisible,
  formatoKilometraje,
  kmSospechoso,
  normalizarPlaca,
  textoDocumentos,
  varianteDocumentos,
} from "../../utils/flota.util.ts";

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
        className="app-data-table table table-sm"
        aria-label="Vehículos"
      >
        <thead>
          <tr>
            <th scope="col">Vehículo</th>
            <th scope="col">Tipo · asientos</th>
            <th scope="col">Kilometraje</th>
            <th scope="col">Documentos</th>
            <th scope="col">Conductores habituales</th>
            <th scope="col">Estado</th>
            <th scope="col" className="w-[230px] text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {vehiculos.map((vehiculo) => {
            const habituales = conductoresHabitualesDe(vehiculo.id, conductores);
            const resaltada = vehiculo.id === resaltado;
            const fechas = fechasDocumentos(vehiculo);
            const descripcion = descripcionVisible(vehiculo);
            return (
              <tr
                key={vehiculo.id}
                data-resaltado={resaltada || undefined}
                className={`transition-colors ${resaltada ? "bg-success/10" : ""}`}
              >
                <td>
                  <div className="flex flex-col leading-tight">
                    <span
                      className={`font-mono font-semibold ${vehiculo.activo ? "text-app-strong" : "text-app-muted"}`}
                    >
                      {normalizarPlaca(vehiculo.placa)}
                    </span>
                    {descripcion && (
                      <span className="text-xs leading-tight text-app-muted">{descripcion}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col leading-tight">
                    <span>{vehiculo.tipo ?? "—"}</span>
                    <span className="text-xs text-app-muted">
                      {vehiculo.asientos != null
                        ? `${vehiculo.asientos} ${vehiculo.asientos === 1 ? "pasajero" : "pasajeros"}`
                        : "Sin asientos"}
                    </span>
                  </div>
                </td>
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
                  <Insignia variante={vehiculo.activo ? "exito" : "neutro"}>
                    {vehiculo.activo ? "Activo" : "De baja"}
                  </Insignia>
                </td>
                <td className="text-right">
                  <AccionesFila
                    nombre={normalizarPlaca(vehiculo.placa)}
                    procesando={procesando}
                    editar={{ onClick: () => onEditar(vehiculo) }}
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
