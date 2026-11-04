/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Editar patrulla (Form 5/6)
 * Archivo: CajonEditarPatrulla.tsx
 * Responsabilidad: «Editar» de una patrulla propia en el cajón lateral estándar, igual en Registro de
 *   operativo y en Mis operativos: datos comunes y personal en borrador, guardados juntos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PATRULLA SE EDITA COMO CUALQUIER OPERATIVO (2026-10-31). Hasta hoy, en Registro cargaba la
 * patrulla en el formulario de alta de arriba —que quedaba ocupado y decía «Falta: personal»— y las
 * dos pantallas montaban `RosterPatrulla`, que guardaba cada persona en su clic. Ahora:
 *
 *   · `DrawerOperativo` en «editar», título «Editar patrulla» y los códigos del registro en el
 *     subtítulo («IGECU-001 · ITECU-001»), nunca el `grupoRegistro`; las cuatro secciones de siempre.
 *   · El personal va en el borrador de `useBorradorAporte` (variante patrulla): cada persona con su
 *     código, «Nuevo código IGECU… al guardar» para quien se agrega y «Cambiar por…» (misma área)
 *     que CONSERVA el código (`reemplazaA`). Nada se guarda hasta «Guardar cambios».
 *   · «Guardar cambios»: primero el personal (`PUT …/personal/lote`, todo o nada) y después, si los
 *     datos comunes cambiaron, la patrulla (`PATCH /operativos/patrulla/:grupo`, lo hace la página
 *     con `onGuardarGenerales`). Un rechazo de una persona va bajo ella y el cajón queda abierto.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC, type ReactNode } from "react";
import type { FormikHelpers } from "formik";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import DrawerOperativo from "./DrawerOperativo.tsx";
import type { ExtrasDelEnvio } from "./FormOperativo.tsx";
import type { PersonaAgregada } from "./SelectorPersonal.tsx";
import type { CatalogosFormulario, PuntoEncuentro } from "../../interfaces/Formulario.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import { nombreDePersona, type PersonaElegible } from "../../interfaces/Personal.ts";
import type { ConfirmarLiberacion } from "../../hooks/useConfirmarLiberacion.tsx";
import { useBorradorAporte, type GuardadoDelBorrador } from "../../hooks/useBorradorAporte.ts";
import type { AvisoTexto } from "../../utils/errorApi.util.ts";
import type { ValoresOperativo } from "../../utils/valoresOperativo.util.ts";

export type CajonEditarPatrullaProps = {
  /** La cabeza de la patrulla (el código por el que se abrió). */
  operativo: Operativo;
  /** Todos los códigos del registro (mismo `grupoRegistro`). */
  grupo: readonly Operativo[];
  roles: readonly string[];
  catalogos: CatalogosFormulario | null;
  puntos: PuntoEncuentro[];
  cargandoPuntos: boolean;
  onZonalesElegidas: (zonalesIds: number[]) => void;
  candidatos: PersonaElegible[];
  cargandoPersonal: boolean;
  /** La ventana o el cuadro se cerraron: «Guardar cambios» se apaga con su motivo. */
  bloqueado: boolean;
  avisoContexto?: ReactNode;
  errorServidor?: AvisoTexto | null;
  conLiberacion: ConfirmarLiberacion["ejecutar"];
  /** Guarda los datos comunes de la patrulla (PATCH). Si falla, la página deja su error. */
  onGuardarGenerales: (
    valores: ValoresOperativo,
    ayudas: FormikHelpers<ValoresOperativo>,
    extras?: ExtrasDelEnvio,
  ) => Promise<void>;
  /** Solo cambió el personal y ya se guardó: la página avisa, cierra y relee. */
  onPersonalGuardado: (guardado: GuardadoDelBorrador) => void;
  onCerrar: () => void;
  guardando: boolean;
};

const CajonEditarPatrulla: FC<CajonEditarPatrullaProps> = ({
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
  onGuardarGenerales,
  onPersonalGuardado,
  onCerrar,
  guardando,
}) => {
  const borrador = useBorradorAporte({
    operativo,
    grupo,
    roles,
    prefijosPorArea: catalogos?.prefijosPorArea,
    bloqueado,
    conLiberacion,
  });
  // El personal ya se guardó y falló el PATCH: se dice, para no hacer creer que nada quedó.
  const [personalYaGuardado, setPersonalYaGuardado] = useState(false);

  const guardar = async (
    valores: ValoresOperativo,
    ayudas: FormikHelpers<ValoresOperativo>,
    extras?: ExtrasDelEnvio,
  ) => {
    if (borrador.resumen.total > 0 && !personalYaGuardado) {
      const guardado = await borrador.guardar();
      if (!guardado) return;
      setPersonalYaGuardado(true);
      if (!extras?.generalesCambiaron) {
        onPersonalGuardado(guardado);
        return;
      }
    }
    await onGuardarGenerales(valores, ayudas, extras);
  };

  /** «Cambiar por…»: candidatos elegibles de la MISMA área, que no estén ya en la patrulla. */
  const cambiarPor = (persona: PersonaAgregada) => {
    const area = borrador.personal.find((fila) => fila.funcionarioId === persona.funcionarioId)?.area;
    const yaEstan = new Set(borrador.personal.map((fila) => fila.funcionarioId));
    const opciones = candidatos.filter(
      (candidato) => candidato.area === area && candidato.elegible && !yaEstan.has(candidato.id),
    );
    if (opciones.length === 0) return null;
    return (
      <select
        aria-label={`Cambiar a ${persona.nombre}`}
        className="select select-bordered select-sm w-auto shrink-0"
        value=""
        disabled={bloqueado || guardando || borrador.guardando}
        onChange={(evento) => {
          const elegido = opciones.find((opcion) => opcion.id === Number(evento.target.value));
          if (elegido) borrador.cambiar(persona.funcionarioId, elegido);
        }}
      >
        <option value="">Cambiar por…</option>
        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {nombreDePersona(opcion)}
          </option>
        ))}
      </select>
    );
  };

  return (
    <DrawerOperativo
      modo="editar"
      titulo="Editar operativo"
      identificadores={borrador.identificadores}
      personalPendiente={false}
      horarioCambiado={borrador.resumen.horarios > 0}
      borrador={{
        resumen: borrador.resumen,
        horariosInvalidos: borrador.horariosInvalidos,
        rotulosNuevos: borrador.rotulosNuevos,
      }}
      onCerrar={onCerrar}
      errorServidor={errorServidor}
      avisoContexto={
        <>
          {avisoContexto}
          {personalYaGuardado && errorServidor && (
            <AvisoEnLinea variante="info">
              El personal ya quedó guardado; falta guardar los datos del operativo.
            </AvisoEnLinea>
          )}
        </>
      }
      mensajeDescarte="Se perderán las personas agregadas, cambiadas o quitadas, los horarios y los cambios en los datos del operativo. Nada se ha guardado todavía."
      // El panel pinta el borrador: una persona por código del registro.
      operativo={{ ...operativo, personal: borrador.personal }}
      grupo={[...grupo]}
      catalogos={catalogos}
      puntos={puntos}
      cargandoPuntos={cargandoPuntos}
      onZonalesElegidas={onZonalesElegidas}
      candidatos={candidatos}
      cargandoPersonal={cargandoPersonal}
      onAgregarPersona={borrador.agregar}
      onRetirarPersona={borrador.quitar}
      onCambiarHorarioPersona={borrador.cambiarHorario}
      puedeEditarPersona={borrador.editable}
      avisoPersonal={borrador.rechazo?.mensaje ?? null}
      idPersonaRechazada={borrador.rechazo?.funcionarioId ?? null}
      detalleDePersona={(persona) => borrador.codigoDe(persona.funcionarioId)}
      accionDePersona={cambiarPor}
      bloqueado={bloqueado}
      guardando={guardando || borrador.guardando}
      onGuardar={guardar}
    />
  );
};

export default CajonEditarPatrulla;
