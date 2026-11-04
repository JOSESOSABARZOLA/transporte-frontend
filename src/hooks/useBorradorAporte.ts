/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Aporte de personal
 * Archivo: useBorradorAporte.ts
 * Responsabilidad: El borrador del cajón «Agregar personal», el mismo en todas sus variantes:
 *                  agregar, quitar y cambiar horas sin tocar el servidor, el pie y un solo
 *                  guardado por lote.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-29
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO LUGAR PARA QUE LAS VARIANTES NO VUELVAN A DIVERGIR (2026-10-29). Hasta hoy el operativo
 * simple (Form 4) tenía borrador y «Guardar cambios», y la patrulla (Form 6) guardaba cada código en
 * su clic. Cada pantalla (Mis operativos, Registro, Jornada) llevaba su propia copia. Ahora las tres
 * usan este hook:
 *
 * | Variante | Borrador | Al guardar |
 * |---|---|---|
 * | Simple | el personal del operativo | `PUT /operativos/:id/personal/lote` |
 * | Patrulla (5/6) | la persona de cada código del registro | el mismo endpoint, con el registro entero: crea, retira y ajusta códigos |
 *
 * Agregar, quitar y cambiar horas solo tocan el borrador. Un rechazo del servidor no guarda nada:
 * su motivo queda en `rechazo` (texto del servidor tal cual) y el borrador se conserva.
 *
 * EL ORIGINAL SE FIJA AL MONTAR: el componente que lo usa se monta por apertura, así que releer la
 * tabla mientras el cajón está abierto no anula el diff. Quien todavía no tiene el operativo (la
 * Jornada lo pide al abrir) monta con `operativo: null` y llama a `iniciar` cuando llega, sin
 * remontar el cajón.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useMemo, useState } from "react";

import type { RolDepartamental } from "../config/env.ts";
import type { Operativo, PersonaAsignada } from "../interfaces/Operativo.ts";
import { nombreDePersona, type PersonaElegible } from "../interfaces/Personal.ts";
import { OperativoService } from "../services/operativo.service.ts";
import { identificadorCorto } from "../utils/rangoIdentificadores.util.ts";
import { funcionarioDelRechazo, presentarError } from "../utils/errorApi.util.ts";
import {
  comoLoteDePersonal,
  conReemplazo,
  esAporteDePatrulla,
  estadoPieDelBorrador,
  hayHorariosInvalidos,
  motivoGuardarBorrador,
  personalDelRegistro,
  puedeTocarPersona,
  resumenDelBorrador,
  rolQueAgrega,
  rotuloDeNuevo,
  textoPersonalGuardado,
} from "../utils/borradorPersonal.util.ts";
import type { ConfirmarLiberacion } from "./useConfirmarLiberacion.tsx";

export type OpcionesBorradorAporte = {
  /** El operativo del cajón; en la patrulla, el código por el que se abrió. `null` mientras carga. */
  operativo: Operativo | null;
  /** Los códigos del registro (mismo `grupoRegistro`). Solo los lee la patrulla. */
  grupo?: readonly Operativo[];
  /** Los roles de quien mira: deciden con qué rol agrega y a quién puede tocar. */
  roles: readonly string[];
  /** El prefijo de cada área (catálogos): el rótulo «Nuevo código INECU… al guardar». */
  prefijosPorArea?: readonly { area: string; prefijo: string }[];
  /** La ventana de carga o el cuadro se cerraron: «Guardar cambios» se apaga con su motivo. */
  bloqueado: boolean;
  /** El guardado con la confirmación de liberar el transporte (`useConfirmarLiberacion`). */
  conLiberacion: ConfirmarLiberacion["ejecutar"];
};

export type RechazoDelBorrador = { mensaje: string; funcionarioId: number | null };

export type GuardadoDelBorrador = { operativo: Operativo; mensaje: string };

type PersonalInicial = ReturnType<typeof personalDelRegistro>;

const SIN_PERSONAL: PersonalInicial = { personal: [], codigoDe: new Map() };

/** Lo guardado: el personal del operativo o, en la patrulla, el de cada código del registro. */
const personalInicial = (
  operativo: Operativo,
  grupo: readonly Operativo[],
): PersonalInicial =>
  esAporteDePatrulla(operativo)
    ? personalDelRegistro(grupo.length > 0 ? grupo : [operativo])
    : { personal: operativo.personal, codigoDe: new Map() };

export const useBorradorAporte = ({
  operativo,
  grupo = [],
  roles,
  prefijosPorArea = [],
  bloqueado,
  conLiberacion,
}: OpcionesBorradorAporte) => {
  const esPatrulla = operativo !== null && esAporteDePatrulla(operativo);

  // Lo guardado al abrir: contra esto se mide el borrador.
  const [inicial, setInicial] = useState(() =>
    operativo ? personalInicial(operativo, grupo) : SIN_PERSONAL,
  );
  const [personal, setPersonal] = useState<PersonaAsignada[]>(inicial.personal);

  /** Fija lo guardado cuando el operativo llega después de montar (la Jornada). */
  const iniciar = useCallback((cargado: Operativo, delRegistro: readonly Operativo[]) => {
    const nuevo = personalInicial(cargado, delRegistro);
    setInicial(nuevo);
    setPersonal(nuevo.personal);
  }, []);
  const [rechazo, setRechazo] = useState<RechazoDelBorrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  const agregar = useCallback(
    (persona: PersonaElegible) => {
      if (!operativo) return;
      setRechazo(null);
      setPersonal((actual) =>
        actual.some((fila) => fila.funcionarioId === persona.id)
          ? actual
          : [
              ...actual,
              {
                funcionarioId: persona.id,
                nombre: nombreDePersona(persona),
                area: persona.area,
                telefono: null,
                // El cargo del Maestro, hasta que el servidor confirme (2026-10-27).
                cargo: persona.cargo?.trim() || null,
                esResponsable: false,
                asignadoPorRol: rolQueAgrega(operativo, roles) as RolDepartamental,
                // Como el servidor al asignar: la ventana del operativo.
                horaInicio: operativo.horaInicio,
                horaFin: operativo.horaFin,
              },
            ],
      );
    },
    [operativo, roles],
  );

  // PATRULLA (2026-10-31): quién reemplaza a quién (entrante → saliente original). Viaja como
  // `reemplazaA` y el servidor conserva el código.
  const [reemplazos, setReemplazos] = useState<ReadonlyMap<number, number>>(() => new Map());

  const quitar = useCallback((funcionarioId: number) => {
    setRechazo(null);
    setPersonal((actual) => actual.filter((fila) => fila.funcionarioId !== funcionarioId));
    setReemplazos((actuales) => {
      if (!actuales.has(funcionarioId)) return actuales;
      const siguiente = new Map(actuales);
      siguiente.delete(funcionarioId);
      return siguiente;
    });
  }, []);

  /**
   * «Cambiar por…» de la patrulla (2026-10-31): la persona nueva ocupa el lugar —y al guardar el
   * CÓDIGO— de quien sale, con su mismo horario. Nada se guarda todavía.
   */
  const cambiar = useCallback(
    (salienteId: number, entrante: PersonaElegible) => {
      if (!operativo) return;
      setRechazo(null);
      setPersonal((actual) =>
        actual.map((fila) =>
          fila.funcionarioId === salienteId
            ? {
                ...fila,
                funcionarioId: entrante.id,
                nombre: nombreDePersona(entrante),
                area: entrante.area,
                telefono: null,
                cargo: entrante.cargo?.trim() || null,
                asignadoPorRol: rolQueAgrega(operativo, roles) as RolDepartamental,
              }
            : fila,
        ),
      );
      setReemplazos((actuales) => conReemplazo(actuales, salienteId, entrante.id));
    },
    [operativo, roles],
  );

  const cambiarHorario = useCallback(
    (funcionarioId: number, horaInicio: string, horaFin: string) => {
      setRechazo(null);
      setPersonal((actual) =>
        actual.map((fila) =>
          fila.funcionarioId === funcionarioId ? { ...fila, horaInicio, horaFin } : fila,
        ),
      );
    },
    [],
  );

  const resumen = useMemo(
    () => resumenDelBorrador(inicial.personal, personal),
    [inicial, personal],
  );
  const horariosInvalidos = hayHorariosInvalidos(personal);

  const editable = useCallback(
    (persona: Pick<PersonaAsignada, "asignadoPorRol">) =>
      operativo !== null && puedeTocarPersona(operativo, roles, persona),
    [operativo, roles],
  );

  // El rótulo de cada persona nueva: «Nuevo» o, en la patrulla, el código que tendrá. Quien
  // reemplaza a otro conserva su código: «IGECU-001 · cambio» (2026-10-31).
  const rotulosNuevos = useMemo(
    () =>
      new Map(
        personal
          .filter((fila) => resumen.idsNuevos.has(fila.funcionarioId))
          .map((fila) => {
            const saliente = reemplazos.get(fila.funcionarioId);
            const codigo = saliente !== undefined ? inicial.codigoDe.get(saliente) : undefined;
            return [
              fila.funcionarioId,
              codigo
                ? `${identificadorCorto(codigo)} · cambio`
                : rotuloDeNuevo(fila.area, esPatrulla, prefijosPorArea),
            ];
          }),
      ),
    [personal, resumen, esPatrulla, prefijosPorArea, reemplazos, inicial],
  );

  /** El código de quien ya estaba en la patrulla («IGECU-001»), para pintarlo junto a su nombre. */
  const codigoDe = useCallback(
    (funcionarioId: number): string | null => {
      const codigo = inicial.codigoDe.get(funcionarioId);
      return codigo ? identificadorCorto(codigo) : null;
    },
    [inicial],
  );

  /**
   * Guarda el borrador en UNA llamada. Devuelve el operativo y el aviso de éxito, o `null` si no se
   * guardó (rechazo del servidor o liberación no confirmada).
   */
  const guardar = useCallback(async (): Promise<GuardadoDelBorrador | null> => {
    if (!operativo) return null;
    setRechazo(null);
    setGuardando(true);
    try {
      const guardado = await conLiberacion((confirmarLiberacion) =>
        OperativoService.guardarPersonal(
          operativo.id,
          comoLoteDePersonal(personal, reemplazos),
          confirmarLiberacion,
        ),
      );
      if (guardado === null) return null;
      return { operativo: guardado, mensaje: textoPersonalGuardado(guardado, esPatrulla) };
    } catch (fallo: unknown) {
      setRechazo({
        mensaje: presentarError(fallo).mensaje,
        funcionarioId: funcionarioDelRechazo(fallo),
      });
      return null;
    } finally {
      setGuardando(false);
    }
  }, [conLiberacion, operativo, personal, reemplazos, esPatrulla]);

  return {
    iniciar,
    esPatrulla,
    /** Los códigos del registro al abrir (patrulla), para el subtítulo del cajón. */
    identificadores: esPatrulla ? [...new Set(inicial.codigoDe.values())] : [],
    personal,
    agregar,
    quitar,
    cambiar,
    codigoDe,
    cambiarHorario,
    resumen,
    horariosInvalidos,
    estadoPie: estadoPieDelBorrador(resumen, horariosInvalidos),
    motivoGuardar: motivoGuardarBorrador(resumen, horariosInvalidos, bloqueado),
    editable,
    rotulosNuevos,
    rechazo,
    guardando,
    guardar,
  };
};
