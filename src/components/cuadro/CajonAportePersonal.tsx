/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Aporte de personal
 * Archivo: CajonAportePersonal.tsx
 * Responsabilidad: El cajón «Agregar personal» de quien aporta a un formulario de otro departamento,
 *                  el mismo para el operativo simple y para la patrulla, en Mis operativos y Registro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-29
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * TODAS LAS VARIANTES SE CONFIRMAN CON «GUARDAR CAMBIOS» (2026-10-29). Hasta hoy cada pantalla
 * montaba `DrawerOperativo` en «personal» con su propio borrador, y la patrulla (5/6) guardaba cada
 * código en su clic con el `grupoRegistro` (un UUID) por título. Aquí van juntos:
 *
 *   · el borrador, el pie y el guardado por lote: `useBorradorAporte`;
 *   · el título: «Personal de operativo <id>» o «Personal de patrulla», con los códigos del registro
 *     en el subtítulo;
 *   · los candidatos: quien aporta solo pone Personal de Instrucción (el dueño ve todas las áreas);
 *   · el rechazo del servidor, junto a la persona, con el texto tal cual.
 *
 * La confirmación al cerrar con cambios la pone `DrawerLateral` (✕, Cancelar, Escape y el velo).
 * Se monta por apertura (`{… && <CajonAportePersonal key=… />}`): cada vez nace con el borrador
 * limpio.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import DrawerOperativo from "./DrawerOperativo.tsx";
import type { CatalogosFormulario, PuntoEncuentro } from "../../interfaces/Formulario.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import type { AvisoTexto } from "../../utils/errorApi.util.ts";
import type { ConfirmarLiberacion } from "../../hooks/useConfirmarLiberacion.tsx";
import { useBorradorAporte, type GuardadoDelBorrador } from "../../hooks/useBorradorAporte.ts";

export type CajonAportePersonalProps = {
  operativo: Operativo;
  /** Los códigos del registro (mismo `grupoRegistro`): la patrulla los lee todos. */
  grupo: readonly Operativo[];
  roles: readonly string[];
  catalogos: CatalogosFormulario | null;
  puntos: PuntoEncuentro[];
  cargandoPuntos: boolean;
  onZonalesElegidas: (zonalesIds: number[]) => void;
  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  /** La ventana de carga o el cuadro se cerraron: «Guardar cambios» se apaga con su motivo. */
  bloqueado: boolean;
  /** El aviso estándar de la ventana o el cuadro cerrados, al principio del cuerpo. */
  avisoContexto?: ReactNode;
  errorServidor?: AvisoTexto | null;
  conLiberacion: ConfirmarLiberacion["ejecutar"];
  /** Cierra sin guardar (ya confirmado si había cambios). */
  onCerrar: () => void;
  /** Se guardó: la página avisa, cierra y relee la tabla. */
  onGuardado: (guardado: GuardadoDelBorrador) => void;
};

const CajonAportePersonal: FC<CajonAportePersonalProps> = ({
  operativo,
  grupo,
  roles,
  catalogos,
  puntos,
  cargandoPuntos,
  onZonalesElegidas,
  candidatos,
  cargandoPersonal,
  bloqueado,
  avisoContexto,
  errorServidor = null,
  conLiberacion,
  onCerrar,
  onGuardado,
}) => {
  const borrador = useBorradorAporte({
    operativo,
    grupo,
    roles,
    prefijosPorArea: catalogos?.prefijosPorArea,
    bloqueado,
    conLiberacion,
  });

  const esDueno = roles.includes(operativo.formulario.rolDueno);

  const guardar = async () => {
    const guardado = await borrador.guardar();
    if (guardado) onGuardado(guardado);
  };

  return (
    <DrawerOperativo
      modo="personal"
      titulo={
        borrador.esPatrulla
          ? "Personal de patrulla"
          : `Personal de operativo ${operativo.identificador}`
      }
      identificadores={borrador.identificadores}
      onCerrar={onCerrar}
      errorServidor={errorServidor}
      avisoContexto={avisoContexto}
      // El panel pinta el borrador: en la patrulla, una persona por código del registro.
      operativo={{ ...operativo, personal: borrador.personal }}
      catalogos={catalogos}
      puntos={puntos}
      cargandoPuntos={cargandoPuntos}
      onZonalesElegidas={onZonalesElegidas}
      // Quien aporta solo pone y quita Personal de INSTRUCCIÓN: ofrecerle otras áreas sería
      // ofrecerle un rechazo. El dueño ve todas.
      candidatos={
        esDueno ? candidatos : candidatos.filter((persona) => persona.area === "INSTRUCCION")
      }
      cargandoPersonal={cargandoPersonal}
      onAgregarPersona={borrador.agregar}
      onRetirarPersona={borrador.quitar}
      onCambiarHorarioPersona={borrador.cambiarHorario}
      puedeEditarPersona={borrador.editable}
      avisoPersonal={borrador.rechazo?.mensaje ?? null}
      idPersonaRechazada={borrador.rechazo?.funcionarioId ?? null}
      bloqueado={bloqueado}
      soloPersonal
      guardando={borrador.guardando}
      borrador={{
        resumen: borrador.resumen,
        horariosInvalidos: borrador.horariosInvalidos,
        onGuardarPersonal: () => void guardar(),
        rotulosNuevos: borrador.rotulosNuevos,
      }}
      // El formulario del cajón no se envía: el aporte se guarda con su lote.
      onGuardar={() => undefined}
    />
  );
};

export default CajonAportePersonal;
