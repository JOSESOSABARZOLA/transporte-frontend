/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: TablaGarajes.tsx
 * Responsabilidad: La pestaña «Garajes autorizados»: garaje, zonal, vehículos que lo usan,
 *                  estado y acciones.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA A `PanelUbicaciones` (2026-10-14). Lo que se retiró, y por qué:
 *   · el combo de zonal editable dentro de la fila: cambiaba el dato al elegir, sin «Guardar» ni
 *     confirmación. La zonal se edita en el cajón;
 *   · el alta en línea: el alta va por el cajón, con su aviso de repetido;
 *   · la doble acción «Quitar autorización» / «Dar de baja»: hacían cosas distintas (sin
 *     autorización el garaje dejaba de sugerirse pero seguía admitiendo destinos), y el negocio la
 *     unificó (D2). Queda una sola, «Dar de baja», que apaga las dos.
 *
 * «Vigente» = activo y autorizado. Un garaje sin zonal no se sugiere al planificar el día, y se
 * dice en la celda. «Vehículos que lo usan» es la última vez que cada uno quedó ahí. Las acciones
 * van como botones visibles bajo «Acciones» (2026-10-15).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import AccionesFila from "../common/AccionesFila.tsx";
import Insignia from "../common/Insignia.tsx";
import type { UbicacionFlota } from "../../interfaces/Transporte.ts";
import { esGarajeVigente, normalizarPlaca, ultimaVez } from "../../utils/flota.util.ts";

/** Cuántos vehículos se nombran en la celda; el resto se resume. */
const USOS_VISIBLES = 3;

type TablaGarajesProps = {
  garajes: UbicacionFlota[];
  /** Hoy en Quito, para «hoy» / «ayer». */
  hoy: string;
  procesando: boolean;
  resaltado: number | null;
  mensajeVacio: string;
  onEditar: (garaje: UbicacionFlota) => void;
  onDarDeBaja: (garaje: UbicacionFlota) => void;
  onReactivar: (garaje: UbicacionFlota) => void;
};

const TablaGarajes: FC<TablaGarajesProps> = ({
  garajes,
  hoy,
  procesando,
  resaltado,
  mensajeVacio,
  onEditar,
  onDarDeBaja,
  onReactivar,
}) => {
  if (garajes.length === 0) {
    return <p className="px-2 py-6 text-center text-sm text-app-muted">{mensajeVacio}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="app-data-table table table-sm"
        aria-label="Garajes autorizados"
      >
        <thead>
          <tr>
            <th scope="col">Garaje</th>
            <th scope="col">Zonal</th>
            <th scope="col">Vehículos que lo usan</th>
            <th scope="col">Estado</th>
            <th scope="col" className="w-[230px] text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {garajes.map((garaje) => {
            const vigente = esGarajeVigente(garaje);
            const usos = garaje.usos ?? [];
            const resaltada = garaje.id === resaltado;
            return (
              <tr
                key={garaje.id}
                data-resaltado={resaltada || undefined}
                className={`transition-colors ${resaltada ? "bg-success/10" : ""}`}
              >
                <td>
                  <span className={`font-semibold ${vigente ? "text-app-strong" : "text-app-muted"}`}>
                    {garaje.nombre}
                  </span>
                </td>
                <td>
                  {garaje.zonal ? (
                    garaje.zonal.nombre
                  ) : (
                    <Insignia
                      variante="aviso"
                      title="Al planificar el día solo se sugieren los garajes con zonal."
                    >
                      ⚠ Sin zonal: no se sugerirá
                    </Insignia>
                  )}
                </td>
                <td>
                  {usos.length === 0 ? (
                    <span className="text-app-muted">—</span>
                  ) : (
                    <span>
                      {usos
                        .slice(0, USOS_VISIBLES)
                        .map((uso) => `${normalizarPlaca(uso.placa)} (${ultimaVez(uso.ultimaFecha, hoy)})`)
                        .join(", ")}
                      {usos.length > USOS_VISIBLES && (
                        <span className="text-app-muted"> y {usos.length - USOS_VISIBLES} más</span>
                      )}
                    </span>
                  )}
                </td>
                <td>
                  <Insignia variante={vigente ? "exito" : "neutro"}>
                    {vigente ? "Vigente" : "De baja"}
                  </Insignia>
                </td>
                <td className="text-right">
                  <AccionesFila
                    nombre={garaje.nombre}
                    procesando={procesando}
                    editar={{ onClick: () => onEditar(garaje) }}
                    estado={
                      vigente
                        ? { tipo: "baja", onClick: () => onDarDeBaja(garaje) }
                        : { tipo: "reactivar", onClick: () => onReactivar(garaje) }
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

export default TablaGarajes;
