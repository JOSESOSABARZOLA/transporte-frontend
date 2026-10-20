/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: DrawerVehiculo.tsx
 * Responsabilidad: El cajón de alta y edición de un vehículo, en tres secciones.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA AL MODAL `ModalVehiculo`. Secciones: Identificación (placa, tipo, descripción),
 * Capacidad y uso (asientos, kilometraje) y Documentos (matrícula y SOAT).
 *
 * LA PLACA (D4). Se escribe en mayúsculas y el guion se agrega solo al guardar. El formato
 * AAA-999 / AAA-9999 se exige al crear o al CAMBIARLA: las placas registradas antes del formato
 * (`PMA7056`) se pueden seguir editando sin tocarlas. La REPETIDA se avisa en vivo, comparando
 * sin guion —`PMA-7056` choca con `PMA7056`— y contra los dados de baja.
 *
 * EL AVISO DE DOCUMENTOS ES EN VIVO, sobre fechas que todavía no se guardaron: `estadoDocumentos`
 * es el espejo de la regla del servidor, con su anticipación (`DAF_DIAS_AVISO_VENCIMIENTO`, que
 * llega en el resumen). Sin ese dato no se adivina: no se avisa.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useId, useMemo, useState, type FC } from "react";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import { CampoCajon } from "./PiezasCajonFlota.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import type { Vehiculo } from "../../interfaces/Transporte.ts";
import { fechaLarga } from "../../utils/ausencias.util.ts";
import {
  descripcionVisible,
  estadoDocumentos,
  hoyEnGuayaquil,
  normalizarPlaca,
  textoDocumentos,
} from "../../utils/flota.util.ts";
import {
  TIPOS_VEHICULO,
  erroresVehiculo,
  estadoDelPie,
  obligatoriosVaciosVehiculo,
  pendientesVehiculo,
  placaRepetida,
  textoPlacaRepetida,
  valoresVehiculo,
  type ValoresVehiculo,
} from "../../utils/formularioFlota.util.ts";

type DrawerVehiculoProps = {
  /** El que se edita; `null` es un alta. */
  vehiculo: Vehiculo | null;
  /** La flota entera (con los de baja), para la placa repetida. */
  vehiculos: Vehiculo[];
  /** `DAF_DIAS_AVISO_VENCIMIENTO`; `null` si el resumen no llegó. */
  diasAviso: number | null;
  /** `DAF_KM_MAXIMO` del resumen (o su valor por omisión si no llegó). */
  kmMaximo: number;
  guardando: boolean;
  errorServidor: string | null;
  onGuardar: (valores: ValoresVehiculo) => void;
  onCerrar: () => void;
};

const DrawerVehiculo: FC<DrawerVehiculoProps> = ({
  vehiculo,
  vehiculos,
  diasAviso,
  kmMaximo,
  guardando,
  errorServidor,
  onGuardar,
  onCerrar,
}) => {
  const idBase = useId();
  const id = (campo: keyof ValoresVehiculo) => `${idBase}-${campo}`;
  const esAlta = vehiculo === null;
  const iniciales = useMemo(() => valoresVehiculo(vehiculo), [vehiculo]);
  const [valores, setValores] = useState<ValoresVehiculo>(iniciales);
  const [intentado, setIntentado] = useState(false);

  const errores = erroresVehiculo(valores, vehiculo, vehiculos, kmMaximo);
  const pendientes = pendientesVehiculo(errores);
  const hayCambios = JSON.stringify(valores) !== JSON.stringify(iniciales);
  const repetida = placaRepetida(valores.placa, vehiculos, vehiculo?.id ?? null);

  const cambiar = (campo: keyof ValoresVehiculo, valor: string) =>
    setValores((antes) => ({ ...antes, [campo]: valor }));

  const errorDe = (campo: keyof ValoresVehiculo): string | null => {
    if (campo === "placa" && repetida) return textoPlacaRepetida(repetida);
    return intentado ? (errores[campo] ?? null) : null;
  };

  const guardar = () => {
    setIntentado(true);
    if (pendientes.length > 0 || guardando) return;
    if (!esAlta && !hayCambios) return;
    onGuardar(valores);
  };

  const tipos: string[] = [...TIPOS_VEHICULO];
  if (valores.tipo && !tipos.includes(valores.tipo)) tipos.push(valores.tipo);

  // El aviso en vivo de los documentos. Sin la anticipación del servidor no se calcula.
  const documentos =
    diasAviso === null
      ? null
      : estadoDocumentos(
          valores.matriculaVencimiento,
          valores.soatVencimiento,
          hoyEnGuayaquil(),
          diasAviso,
        );
  const enAlerta = documentos?.estado === "VENCIDO" || documentos?.estado === "POR_VENCER";

  const sinCambios = !esAlta && !hayCambios;

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo={esAlta ? "Nuevo vehículo" : "Editar vehículo"}
      subtitulo={
        esAlta
          ? "Un vehículo sin conductor habitual no se propone automáticamente al planificar el día."
          : [normalizarPlaca(vehiculo.placa), descripcionVisible(vehiculo)].filter(Boolean).join(" · ")
      }
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      onGuardar={guardar}
      estadoPie={estadoDelPie(intentado, pendientes, obligatoriosVaciosVehiculo(valores), !esAlta, hayCambios)}
      motivoGuardar={sinCambios ? "Sin cambios" : null}
      guardarPendiente={pendientes.length > 0}
      errorServidor={errorServidor}
    >
      <SeccionDrawer titulo="Identificación" rejilla={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoCajon
            id={id("placa")}
            etiqueta="Placa"
            obligatorio
            error={errorDe("placa")}
            ayuda="AAA-999 o AAA-9999. El guion se agrega solo."
          >
            <input
              id={id("placa")}
              className="input input-bordered w-full font-mono"
              placeholder="PBA-1234"
              maxLength={10}
              value={valores.placa}
              aria-invalid={Boolean(errorDe("placa"))}
              onChange={(evento) => cambiar("placa", evento.target.value.toUpperCase())}
            />
          </CampoCajon>
          <CampoCajon
            id={id("tipo")}
            etiqueta="Tipo"
          >
            <select
              id={id("tipo")}
              className="select select-bordered w-full"
              value={valores.tipo}
              onChange={(evento) => cambiar("tipo", evento.target.value)}
            >
              <option value="">Sin registrar</option>
              {tipos.map((tipo) => (
                <option
                  key={tipo}
                  value={tipo}
                >
                  {tipo}
                </option>
              ))}
            </select>
          </CampoCajon>
        </div>
        <CampoCajon
          id={id("descripcion")}
          etiqueta="Descripción"
          error={errorDe("descripcion")}
          ayuda="Distingue placas parecidas cuando la DAF asigna con prisa."
        >
          <input
            id={id("descripcion")}
            className="input input-bordered w-full"
            placeholder="Camioneta doble cabina blanca"
            value={valores.descripcion}
            aria-invalid={Boolean(errorDe("descripcion"))}
            onChange={(evento) => cambiar("descripcion", evento.target.value)}
          />
        </CampoCajon>
      </SeccionDrawer>

      <SeccionDrawer titulo="Capacidad y uso" rejilla={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoCajon
            id={id("asientos")}
            etiqueta="Asientos"
            error={errorDe("asientos")}
            ayuda="Plazas de pasajeros: decide si cabe el personal de un operativo."
          >
            <input
              id={id("asientos")}
              className="input input-bordered w-full"
              inputMode="numeric"
              placeholder="4"
              value={valores.asientos}
              aria-invalid={Boolean(errorDe("asientos"))}
              onChange={(evento) => cambiar("asientos", evento.target.value.replace(/\D/g, ""))}
            />
          </CampoCajon>
          <CampoCajon
            id={id("kilometraje")}
            etiqueta="Kilometraje"
            error={errorDe("kilometraje")}
            ayuda="En kilómetros, sin puntos."
          >
            <input
              id={id("kilometraje")}
              className="input input-bordered w-full"
              inputMode="numeric"
              placeholder="85000"
              value={valores.kilometraje}
              aria-invalid={Boolean(errorDe("kilometraje"))}
              onChange={(evento) =>
                cambiar("kilometraje", evento.target.value.replace(/\D/g, ""))
              }
            />
          </CampoCajon>
        </div>
      </SeccionDrawer>

      <SeccionDrawer titulo="Documentos" rejilla={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoCajon
            id={id("matriculaVencimiento")}
            etiqueta="Matrícula vence"
          >
            <input
              id={id("matriculaVencimiento")}
              type="date"
              className="input input-bordered w-full"
              value={valores.matriculaVencimiento}
              onChange={(evento) => cambiar("matriculaVencimiento", evento.target.value)}
            />
          </CampoCajon>
          <CampoCajon
            id={id("soatVencimiento")}
            etiqueta="SOAT vence"
          >
            <input
              id={id("soatVencimiento")}
              type="date"
              className="input input-bordered w-full"
              value={valores.soatVencimiento}
              onChange={(evento) => cambiar("soatVencimiento", evento.target.value)}
            />
          </CampoCajon>
        </div>
        {documentos && enAlerta && documentos.vence && (
          <AvisoEnLinea variante={documentos.estado === "VENCIDO" ? "error" : "advertencia"}>
            {textoDocumentos(documentos)} ({fechaLarga(documentos.vence)}).
            {documentos.estado === "VENCIDO"
              ? " Renuévelo antes de que salga a un operativo."
              : ` Se avisa con ${diasAviso} días de anticipación.`}
          </AvisoEnLinea>
        )}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerVehiculo;
