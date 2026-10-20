/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de flota
 * Archivo: AusenciasConductor.tsx
 * Responsabilidad: El cajón de ausencias de un conductor en «Flota y garajes».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PLAN «ausencias-conductores-flota» (A1–A8). Los conductores no están en el maestro de personal
 * (`t_conductor` no se vincula con `t_funcionario`), así que su ausencia se guarda por conductor y
 * se registra aquí, con el permiso `flota:ausencias`. Toda la planificación DAF ya la lee: un
 * conductor ausente no se ofrece al asignar, ni en el optimizador, ni en los turnos del mes.
 *
 *   · El cajón es el MISMO de Personal (`ausencias/PanelAusenciasBase.tsx`): mismas situaciones
 *     —sin `DISPONIBLE` ni `MANTENIMIENTO`—, mismo mensaje en vivo, mismas reglas (409
 *     `AUSENCIA_SOLAPADA`, `AUSENCIA_PASADA`).
 *   · A5: si el conductor YA tiene tramos asignados en el rango, el servidor los devuelve al
 *     registrar (`tramosAfectados`) y se avisa en ámbar: la ausencia NO los retira.
 *   · El distintivo de la tabla lo da `hooks/useAusenciasDeLaFlota.ts` (UNA consulta, sin motivo).
 *
 * Contrato: `transporte-backend/docs/CONTRATO-ausencias-conductor.md`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState, type FC } from "react";

import PanelAusenciasBase, {
  type ValoresAusencia,
} from "../ausencias/PanelAusenciasBase.tsx";
import type { AusenciaConductor } from "../../interfaces/Flota.ts";
import type { Conductor } from "../../interfaces/Transporte.ts";
import { FlotaService } from "../../services/flota.service.ts";
import { fechaLarga, textoTramosAfectados } from "../../utils/ausencias.util.ts";
import { presentarError } from "../../utils/errorApi.util.ts";
import { toast } from "../../utils/mensaje.ts";
import { SITUACIONES_DE_AUSENCIA } from "../../utils/personal.util.ts";

/** Lo que deja de pasar mientras el conductor esté ausente. */
const DESCRIPCION_CONDUCTOR =
  "Mientras esté ausente no se ofrecerá al asignar transporte en «Planificar el día», ni en la asignación automática ni en los turnos del mes.";

type PanelAusenciasConductorProps = {
  conductor: Conductor;
  hoy: string;
  /** Tras registrar o quitar: la página refresca los distintivos. */
  onCambio: () => void;
  onCerrar: () => void;
};

const PanelAusenciasConductor: FC<PanelAusenciasConductorProps> = ({
  conductor,
  hoy,
  onCambio,
  onCerrar,
}) => {
  const [ausencias, setAusencias] = useState<AusenciaConductor[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoTramos, setAvisoTramos] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setAusencias(await FlotaService.ausenciasDeConductor(conductor.id));
    } catch (fallo: unknown) {
      setAusencias([]);
      setAviso(presentarError(fallo).mensaje);
    }
  }, [conductor.id]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const registrar = async (valores: ValoresAusencia): Promise<boolean> => {
    setGuardando(true);
    setAviso(null);
    setAvisoTramos(null);
    try {
      const registrada = await FlotaService.registrarAusenciaConductor(conductor.id, {
        estado: valores.estado,
        desde: valores.desde,
        hasta: valores.hasta,
        motivo: valores.motivo.trim() || undefined,
      });
      setAvisoTramos(
        textoTramosAfectados(registrada.tramosAfectados ?? [], valores.desde, valores.hasta),
      );
      await recargar();
      onCambio();
      toast.exito(
        `Ausencia registrada: ${conductor.nombreCompleto}, del ${fechaLarga(valores.desde)} al ${fechaLarga(valores.hasta)}.`,
      );
      return true;
    } catch (fallo: unknown) {
      // 409 AUSENCIA_SOLAPADA: el servidor conoce también lo que otro acaba de registrar.
      setAviso(presentarError(fallo).mensaje);
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const retirar = async (periodoId: number) => {
    setGuardando(true);
    setAviso(null);
    setAvisoTramos(null);
    try {
      await FlotaService.retirarAusenciaConductor(conductor.id, periodoId);
      await recargar();
      onCambio();
      toast.exito("Ausencia quitada.");
    } catch (fallo: unknown) {
      // 409 AUSENCIA_PASADA: una ausencia que ya terminó es historial.
      setAviso(presentarError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PanelAusenciasBase
      nombre={conductor.nombreCompleto}
      identificacion={conductor.cedula}
      situaciones={SITUACIONES_DE_AUSENCIA}
      ausencias={ausencias ?? []}
      cargando={ausencias === null}
      guardando={guardando}
      hoy={hoy}
      aviso={aviso}
      descripcionRegistradas={DESCRIPCION_CONDUCTOR}
      avisoImpacto={avisoTramos}
      onRegistrar={registrar}
      onRetirar={(periodoId) => void retirar(periodoId)}
      onCerrar={onCerrar}
    />
  );
};

export default PanelAusenciasConductor;
