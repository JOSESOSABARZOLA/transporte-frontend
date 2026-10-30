/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: TablaConductores.tsx
 * Responsabilidad: La pestaña «Conductores» de «Flota y garajes»: conductor, identificación,
 *                  teléfono, vehículo habitual, sector y contrato, patrón, estado y acciones.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REDISEÑO DEL 2026-10-14. De once columnas a siete: la cédula y la licencia bajan bajo el
 * nombre, y el parqueadero, bajo el vehículo. Las filas llegan filtradas por la página.
 *
 * LO QUE FALTA SE DICE EN LA CELDA DONDE FALTA, con el efecto en el `title` (regla 6):
 *   · «⚠ Sin vehículo» — sin habitual, o con uno dado de baja: la DAF no puede proponerle placa.
 *   · «⚠ Sin jornada» — sin jornada laboral (2026-10-23) no se le asigna transporte.
 *   · «Sin patrón» — la propuesta del mes no tiene qué seguir.
 * Son los tres `faltantes` del servidor; el indicador «Conductores con datos incompletos» los
 * cuenta.
 *
 * AJUSTES FINALES (2026-10-15): la cédula sale de debajo del nombre a su propia columna
 * «Identificación» (mono), «Contacto» pasa a «Teléfono» y bajo el nombre queda solo «Licencia X».
 * Las acciones van con icono y tooltip (`AccionesFila modo="icono"`, 2026-10-20) bajo «Acciones»; «De baja»
 * dice en su tooltip cuándo y quién (`EstadoRegistroFlota`).
 *
 * AUSENCIAS (2026-10-16): «📅 Ausencias» en la fila (con `flota:ausencias`) y, en «Estado», el
 * distintivo «Ausente dd/mm–dd/mm» (en curso) o «Ausencia dd/mm–dd/mm» (próxima).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import FichasPatron from "./FichasPatron.tsx";
import AccionesFila from "../common/AccionesFila.tsx";
import EstadoRegistroFlota from "./EstadoRegistroFlota.tsx";
import Iconos from "../common/Iconos.tsx";
import Insignia from "../common/Insignia.tsx";
import type { AusenciaDeLaFlota } from "../../interfaces/Flota.ts";
import type { Conductor, Vehiculo } from "../../interfaces/Transporte.ts";
import { fechaCorta } from "../../utils/ausencias.util.ts";
import { NOMBRE_ESTADO_DISPONIBILIDAD } from "../../utils/personal.util.ts";
import { descripcionVisible, normalizarPlaca, tieneVehiculoUtil } from "../../utils/flota.util.ts";
import { useJornadasLaborales } from "../../hooks/useJornadasLaborales.ts";
import { nombreDeJornada } from "../../utils/jornadaLaboral.util.ts";

const NOMBRE_SECTOR: Record<NonNullable<Conductor["sector"]>, string> = {
  NORTE: "Norte",
  SUR: "Sur",
  CENTRO: "Centro",
  VALLE: "Valle",
};

const AYUDA_SIN_JORNADA = "Sin jornada laboral no se le asigna transporte.";
const AYUDA_SIN_VEHICULO = "Sin vehículo habitual activo, la DAF no puede proponerle placa.";

type TablaConductoresProps = {
  conductores: Conductor[];
  /** La flota, para saber el tipo del vehículo habitual: la descripción que solo lo repite no se pinta. */
  vehiculos?: Vehiculo[];
  procesando: boolean;
  resaltado: number | null;
  mensajeVacio: string;
  onEditar: (conductor: Conductor) => void;
  onDarDeBaja: (conductor: Conductor) => void;
  onReactivar: (conductor: Conductor) => void;
  /**
   * La ausencia a mostrar de cada conductor (en curso o próxima), por `conductorId` (2026-10-16).
   * Sale de UNA consulta de la flota; sin ella no hay distintivo.
   */
  ausencias?: Record<number, AusenciaDeLaFlota>;
  /** Abre el cajón de ausencias. Sin él (sin `flota:ausencias`), la acción no se ofrece. */
  onAusencias?: (conductor: Conductor) => void;
};

const TablaConductores: FC<TablaConductoresProps> = ({
  conductores,
  vehiculos = [],
  procesando,
  resaltado,
  mensajeVacio,
  onEditar,
  onDarDeBaja,
  onReactivar,
  ausencias = {},
  onAusencias,
}) => {
  // La jornada laboral (2026-10-23): el conductor guarda el id y aquí se pinta el nombre.
  const { jornadas } = useJornadasLaborales();
  if (conductores.length === 0) {
    return <p className="px-2 py-6 text-center text-sm text-app-muted">{mensajeVacio}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="table table-sm table-zebra w-full text-sm"
        aria-label="Conductores"
      >
        <thead>
          <tr className="text-xs uppercase tracking-wider text-app-label">
            <th scope="col">Conductor</th>
            <th scope="col">Identificación</th>
            <th scope="col">Teléfono</th>
            <th scope="col">Vehículo habitual</th>
            <th scope="col">Sector · jornada</th>
            <th scope="col">Patrón</th>
            <th scope="col">Estado</th>
            <th scope="col" className="w-[9.5rem] text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {conductores.map((conductor) => {
            const resaltada = conductor.id === resaltado;
            const ausencia = ausencias[conductor.id];
            const habitual = conductor.vehiculoHabitual;
            const descripcionHabitual = habitual
              ? descripcionVisible({
                  descripcion: habitual.descripcion,
                  tipo: vehiculos.find((uno) => uno.id === habitual.id)?.tipo ?? null,
                })
              : null;
            return (
              <tr
                key={conductor.id}
                data-resaltado={resaltada || undefined}
                className={`transition-colors hover:bg-primary/5 ${resaltada ? "bg-success/10" : ""}`}
              >
                <td>
                  <div className="flex flex-col leading-tight">
                    <span
                      className={`font-semibold ${conductor.activo ? "text-app-strong" : "text-app-muted"}`}
                    >
                      {conductor.nombreCompleto}
                    </span>
                    <span className="text-xs leading-tight text-app-muted">
                      {conductor.licenciaTipo ? `Licencia ${conductor.licenciaTipo}` : "Sin licencia"}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="font-mono">{conductor.cedula}</span>
                </td>
                <td>
                  {conductor.telefono ? (
                    <span className="font-mono">{conductor.telefono}</span>
                  ) : (
                    <span className="text-app-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="flex flex-col items-start gap-0.5 leading-tight">
                    {habitual && tieneVehiculoUtil(conductor) ? (
                      <>
                        <span className="font-mono font-semibold">{normalizarPlaca(habitual.placa)}</span>
                        {descripcionHabitual && (
                          <span className="text-xs leading-tight text-app-muted">{descripcionHabitual}</span>
                        )}
                      </>
                    ) : (
                      <Insignia
                        variante="aviso"
                        title={AYUDA_SIN_VEHICULO}
                      >
                        ⚠ Sin vehículo
                        <span className="sr-only">: {AYUDA_SIN_VEHICULO}</span>
                      </Insignia>
                    )}
                    {conductor.parqueaderoAutorizado && (
                      <Insignia variante="suave">
                        <Iconos nombre="parqueadero" /> Parqueadero autorizado
                      </Insignia>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col items-start gap-0.5 leading-tight">
                    <span>{conductor.sector ? NOMBRE_SECTOR[conductor.sector] : "Sin sector"}</span>
                    {nombreDeJornada(conductor.jornadaLaboralId, jornadas) ? (
                      <span className="text-xs leading-tight text-app-muted">
                        {nombreDeJornada(conductor.jornadaLaboralId, jornadas)}
                      </span>
                    ) : (
                      <Insignia
                        variante="aviso"
                        title={AYUDA_SIN_JORNADA}
                      >
                        ⚠ Sin jornada
                        <span className="sr-only">: {AYUDA_SIN_JORNADA}</span>
                      </Insignia>
                    )}
                  </div>
                </td>
                <td>
                  <FichasPatron patron={conductor.patronRotacion} />
                </td>
                <td>
                  <EstadoRegistroFlota enUso={conductor.activo} textoEnUso="Activo" registro={conductor} />
                  {/* Regla 6: el texto dice si está ausente hoy o si lo estará, y las fechas. */}
                  {ausencia && (
                    <span className="mt-1 block">
                      <Insignia
                        variante="aviso"
                        title={NOMBRE_ESTADO_DISPONIBILIDAD[ausencia.estado]}
                      >
                        {`${ausencia.momento === "PROXIMA" ? "Ausencia" : "Ausente"} ${fechaCorta(ausencia.desde)}–${fechaCorta(ausencia.hasta)}`}
                      </Insignia>
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap text-right">
                  <AccionesFila
                    modo="icono"
                    nombre={conductor.nombreCompleto}
                    procesando={procesando}
                    editar={{ onClick: () => onEditar(conductor) }}
                    propia={
                      onAusencias
                        ? {
                            texto: "Ausencias",
                            icono: "ausencias",
                            etiqueta: "Ausencias de",
                            variante: "secundario",
                            onClick: () => onAusencias(conductor),
                            motivo: conductor.activo
                              ? null
                              : "Un conductor de baja no registra ausencias: reactívelo primero.",
                          }
                        : undefined
                    }
                    estado={
                      conductor.activo
                        ? { tipo: "baja", onClick: () => onDarDeBaja(conductor) }
                        : { tipo: "reactivar", onClick: () => onReactivar(conductor) }
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

export default TablaConductores;
