/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: PanelAusencias.tsx
 * Responsabilidad: Registrar y quitar los periodos de ausencia de una persona.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DESDE EL 2026-10-16 ES UN ENVOLTORIO de `ausencias/PanelAusenciasBase.tsx`, el cajón que
 * comparte con las ausencias de los conductores de «Flota y garajes». Le pasa lo propio de una
 * persona del maestro —nombre y cédula, las situaciones de ausencia y el aviso de los operativos
 * que YA tiene en el rango— y el comportamiento es el mismo de antes.
 *
 * Rediseño del 2026-10-08: mensaje en vivo del rango, aviso en ámbar de los operativos ya
 * asignados (la ausencia NO los retira y no se notifica a nadie: el texto lo dice) y «Registradas
 * (N)» con En curso / Próxima / Pasada. Cajón estándar desde el 2026-10-15.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, type FC } from "react";

import PanelAusenciasBase, {
  type ValoresAusencia,
} from "../ausencias/PanelAusenciasBase.tsx";
import type {
  Disponibilidad,
  Funcionario,
  OperativoDeLaPersona,
} from "../../interfaces/Personal.ts";
import { PersonalService } from "../../services/personal.service.ts";
import {
  SITUACIONES_DE_AUSENCIA,
  nombreCompleto,
} from "../../utils/personal.util.ts";
import { fechaLarga } from "../../utils/ausencias.util.ts";

export type { ValoresAusencia };

type PanelAusenciasProps = {
  funcionario: Funcionario;
  ausencias: Disponibilidad[];
  cargando: boolean;
  guardando: boolean;
  hoy: string;
  /** Error del servidor, tal cual (regla 7). */
  aviso: string | null;
  /** Devuelve si se registró: solo entonces se limpia el formulario. */
  onRegistrar: (valores: ValoresAusencia) => Promise<boolean>;
  onRetirar: (periodoId: number) => void;
  onCerrar: () => void;
};

/** El aviso de operativos ya asignados, con el texto acordado. */
const textoOperativos = (operativos: OperativoDeLaPersona[]): string =>
  operativos.length === 1
    ? `Tiene un operativo asignado el ${fechaLarga(operativos[0].fecha)} (${operativos[0].identificador}). La ausencia no lo retira: avise al responsable para reemplazarlo.`
    : `Tiene ${operativos.length} operativos asignados: ${operativos
        .map((op) => `el ${fechaLarga(op.fecha)} (${op.identificador})`)
        .join(", ")}. La ausencia no los retira: avise al responsable para reemplazarlos.`;

const PanelAusencias: FC<PanelAusenciasProps> = ({ funcionario, ...resto }) => {
  // Los operativos que la persona YA TIENE en el rango, para avisar antes de registrar.
  const consultarImpacto = useCallback(
    async (desde: string, hasta: string): Promise<string | null> => {
      const lista = await PersonalService.operativosDe(funcionario.id, desde, hasta);
      return lista.length > 0 ? textoOperativos(lista) : null;
    },
    [funcionario.id],
  );

  return (
    <PanelAusenciasBase
      {...resto}
      nombre={nombreCompleto(funcionario)}
      identificacion={funcionario.cedula}
      situaciones={SITUACIONES_DE_AUSENCIA}
      descripcionRegistradas="Mientras esté ausente no aparecerá como disponible al asignar personal a operativos ni en la cobertura por turnos."
      consultarImpacto={consultarImpacto}
    />
  );
};

export default PanelAusencias;
