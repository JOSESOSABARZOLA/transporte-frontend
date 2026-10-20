/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: CompletarConductor.tsx
 * Responsabilidad: Abrir la ficha de un conductor incompleto sin salir de «Planificar el día».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * NO ES UN FORMULARIO NUEVO (regla 2 de §9): monta `DrawerConductor`, el mismo cajón de «Flota y
 * garajes», con lo que falta señalado (`senalarFaltantes`) y el mismo mapeo al servidor
 * (`cambiosDeConductor`). Se corrige en el cajón, se guarda y el paso 1 se vuelve a leer. Hasta el
 * cajón estándar (2026-10-15) era un modal centrado (`ModalCompletarConductor` + `ModalConductor`).
 * Mientras llega la ficha, o si no se encuentra, el cajón se abre en modo lectura con el aviso.
 */

import { useEffect, useState, type FC } from "react";

import DrawerConductor from "../../flota/DrawerConductor.tsx";
import DrawerLateral from "../../common/DrawerLateral.tsx";
import type { Conductor, Vehiculo } from "../../../interfaces/Transporte.ts";
import { FlotaService } from "../../../services/flota.service.ts";
import { presentarError } from "../../../utils/errorApi.util.ts";
import {
  cambiosDeConductor,
  type ValoresConductor,
} from "../../../utils/formularioFlota.util.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";

type CompletarConductorProps = {
  conductorId: number;
  onCerrar: () => void;
  /** Tras guardar: la pantalla vuelve a pedir el resumen. */
  onGuardado: (mensaje: string) => void;
};

const CompletarConductor: FC<CompletarConductorProps> = ({
  conductorId,
  onCerrar,
  onGuardado,
}) => {
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([FlotaService.listarConductores(true), FlotaService.listarVehiculos(true)])
      .then(([maestro, flota]) => {
        if (!vigente) return;
        setConductores(maestro);
        setVehiculos(flota);
        setCargado(true);
        if (!maestro.some((c) => c.id === conductorId)) {
          setError("No se encontró la ficha de este conductor.");
        }
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(presentarError(fallo).mensaje);
      });
    return () => {
      vigente = false;
    };
  }, [conductorId]);

  const guardar = async (valores: ValoresConductor) => {
    setGuardando(true);
    setAviso(null);
    try {
      const actualizado = await FlotaService.actualizarConductor(
        conductorId,
        cambiosDeConductor(valores),
      );
      onGuardado(`Los datos de ${actualizado.nombreCompleto} quedaron guardados.`);
    } catch (fallo: unknown) {
      setAviso(presentarError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const conductor = conductores.find((c) => c.id === conductorId) ?? null;

  if (error || !cargado || !conductor) {
    return (
      <DrawerLateral
        abierto
        ancho="lg"
        modo="lectura"
        titulo="Editar conductor"
        onCerrar={onCerrar}
      >
        {error ? (
          <AvisoEnLinea variante="error">{error}</AvisoEnLinea>
        ) : (
          <p
            className="text-sm text-app-muted"
            role="status"
          >
            Abriendo la ficha del conductor…
          </p>
        )}
      </DrawerLateral>
    );
  }

  return (
    <DrawerConductor
      conductor={conductor}
      conductores={conductores}
      vehiculos={vehiculos}
      guardando={guardando}
      errorServidor={aviso}
      onGuardar={(valores) => void guardar(valores)}
      onCerrar={onCerrar}
      senalarFaltantes
    />
  );
};

export default CompletarConductor;
