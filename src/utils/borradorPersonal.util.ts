/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal del operativo
 * Archivo: borradorPersonal.util.ts
 * Responsabilidad: Comparar el borrador de personal con lo guardado y decirlo en el pie: cuántas
 *                  altas, bajas y horarios cambian, si algún horario está mal y qué se envía.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-28
 *
 * EL APORTE SE CONFIRMA CON «GUARDAR CAMBIOS» (2026-10-28). Hasta hoy el cajón de aporte (Mis
 * operativos, Registro) y el de personal de la Jornada guardaban cada persona en su clic. Ahora
 * agregar, quitar y cambiar horas solo tocan el borrador, y «Guardar cambios» envía el conjunto
 * final en una sola llamada (`PUT /operativos/:id/personal/lote`). Estas reglas puras son las que
 * leen los tres: el pie, la etiqueta «Nuevo» y lo que viaja.
 *
 * LA PATRULLA TAMBIÉN (2026-10-29). En la patrulla con grupo (5/6) cada persona es un código del
 * registro, así que el borrador es el personal de TODO el registro, una persona por código
 * (`personalDelRegistro`), y una persona nueva dice qué código tendrá («Nuevo código INECU… al
 * guardar»). Lo usan `useBorradorAporte` y, a través de él, todas las variantes del cajón.
 */

import type { EstadoPie } from "../components/common/DrawerLateral.tsx";
import type { Operativo, PersonaAsignada } from "../interfaces/Operativo.ts";
import { motivoHorarioPersona } from "./politicasOperativo.util.ts";

/** Lo mínimo de una persona del borrador: quién es y su turno. */
type PersonaDelBorrador = {
  funcionarioId: number;
  horaInicio?: string | null;
  horaFin?: string | null;
};

export type ResumenBorrador = {
  altas: number;
  bajas: number;
  horarios: number;
  total: number;
  /** Quienes se agregaron y aún no se guardan: llevan «Nuevo». */
  idsNuevos: ReadonlySet<number>;
};

/** Altas, bajas y cambios de horario del borrador respecto de lo guardado. */
export const resumenDelBorrador = (
  original: readonly PersonaDelBorrador[],
  borrador: readonly PersonaDelBorrador[],
): ResumenBorrador => {
  const antes = new Map(original.map((persona) => [persona.funcionarioId, persona]));
  const ahora = new Set(borrador.map((persona) => persona.funcionarioId));

  const idsNuevos = new Set<number>();
  let horarios = 0;
  for (const persona of borrador) {
    const guardada = antes.get(persona.funcionarioId);
    if (!guardada) {
      idsNuevos.add(persona.funcionarioId);
    } else if (
      (guardada.horaInicio ?? "") !== (persona.horaInicio ?? "") ||
      (guardada.horaFin ?? "") !== (persona.horaFin ?? "")
    ) {
      horarios += 1;
    }
  }
  const bajas = original.filter((persona) => !ahora.has(persona.funcionarioId)).length;
  const altas = idsNuevos.size;
  return { altas, bajas, horarios, total: altas + bajas + horarios, idsNuevos };
};

const plural = (cantidad: number, singular: string, varios: string) =>
  `${cantidad} ${cantidad === 1 ? singular : varios}`;

/** «2 cambios sin guardar · +1 persona · −1 persona», o «Sin cambios pendientes». */
export const textoDelBorrador = (resumen: ResumenBorrador): string => {
  if (resumen.total === 0) return "Sin cambios pendientes";
  const partes = [`${plural(resumen.total, "cambio", "cambios")} sin guardar`];
  if (resumen.altas > 0) partes.push(`+${plural(resumen.altas, "persona", "personas")}`);
  if (resumen.bajas > 0) partes.push(`−${plural(resumen.bajas, "persona", "personas")}`);
  if (resumen.horarios > 0) partes.push(plural(resumen.horarios, "horario", "horarios"));
  return partes.join(" · ");
};

/** ¿Algún horario del borrador está vacío o mal escrito? Entonces no se puede guardar. */
export const hayHorariosInvalidos = (borrador: readonly PersonaDelBorrador[]): boolean =>
  borrador.some(
    (persona) => motivoHorarioPersona(persona.horaInicio ?? "", persona.horaFin ?? "") !== null,
  );

/** El estado del pie del cajón con borrador: horarios mal, cambios o nada que guardar. */
export const estadoPieDelBorrador = (
  resumen: ResumenBorrador,
  horariosInvalidos: boolean,
): EstadoPie =>
  horariosInvalidos
    ? { tono: "error", texto: "Revise los horarios" }
    : resumen.total > 0
      ? { tono: "cambios", texto: textoDelBorrador(resumen) }
      : { tono: "sinCambios", texto: "Sin cambios pendientes" };

/** El motivo por el que «Guardar cambios» queda apagado, o `null` si se puede guardar. */
export const motivoGuardarBorrador = (
  resumen: ResumenBorrador,
  horariosInvalidos: boolean,
  bloqueado: boolean,
): string | null =>
  bloqueado
    ? "No se puede guardar: el cuadro o la ventana de carga están cerrados."
    : horariosInvalidos
      ? "Revise los horarios"
      : resumen.total === 0
        ? "Sin cambios"
        : null;

/** Lo que viaja al servidor: el conjunto final con su turno. */
export const comoLoteDePersonal = (
  borrador: readonly PersonaDelBorrador[],
): { funcionarioId: number; horaInicio: string; horaFin: string }[] =>
  borrador.map((persona) => ({
    funcionarioId: persona.funcionarioId,
    horaInicio: persona.horaInicio ?? "",
    horaFin: persona.horaFin ?? "",
  }));

/**
 * ¿El aporte crea un código por persona? La patrulla con grupo (5/6): sus códigos comparten
 * `grupoRegistro` y cada uno lleva a una sola persona. El Form 8 es lote pero no patrulla.
 */
export const esAporteDePatrulla = (
  operativo: Pick<Operativo, "esLote"> & { formulario: Pick<Operativo["formulario"], "esPatrulla"> },
): boolean => operativo.esLote && operativo.formulario.esPatrulla;

/**
 * El personal de una patrulla: la persona de cada código, en el orden de sus identificadores, y
 * de qué código es cada una. Un código sin persona no aporta a nadie.
 */
export const personalDelRegistro = (
  grupo: readonly Pick<Operativo, "identificador" | "personal">[],
): { personal: PersonaAsignada[]; codigoDe: ReadonlyMap<number, string> } => {
  const codigos = [...grupo].sort((una, otra) =>
    una.identificador.localeCompare(otra.identificador),
  );
  const codigoDe = new Map<number, string>();
  const personal: PersonaAsignada[] = [];
  for (const codigo of codigos) {
    const persona = codigo.personal[0];
    if (!persona || codigoDe.has(persona.funcionarioId)) continue;
    codigoDe.set(persona.funcionarioId, codigo.identificador);
    personal.push(persona);
  }
  return { personal, codigoDe };
};

type FormularioConRoles = { rolDueno: string; roles: { rol: string }[] };

/**
 * El rol con que se agrega a alguien: el mismo que elige el servidor (`rolParticipanteEntre`). El
 * dueño del formulario primero, luego quien registró la fila y, si no, el primero que participa.
 * Así la persona nueva queda editable para quien la puso.
 */
export const rolQueAgrega = (
  operativo: { creadoPorRol: string; formulario: FormularioConRoles },
  roles: readonly string[],
): string => {
  const participantes = roles.filter((rol) =>
    operativo.formulario.roles.some((fila) => fila.rol === rol),
  );
  return (
    participantes.find((rol) => rol === operativo.formulario.rolDueno) ??
    participantes.find((rol) => rol === operativo.creadoPorRol) ??
    participantes[0] ??
    operativo.creadoPorRol
  );
};

/**
 * RF-063, el espejo del servidor: el dueño del formulario toca a cualquiera; quien aporta, solo a
 * quien asignó él. Lo demás llega «Del dueño del formulario · lectura».
 */
export const puedeTocarPersona = (
  operativo: { formulario: FormularioConRoles },
  roles: readonly string[],
  persona: Pick<PersonaAsignada, "asignadoPorRol">,
): boolean =>
  roles.includes(operativo.formulario.rolDueno) || roles.includes(persona.asignadoPorRol);

/** El rótulo de quien se agregó y aún no se guarda: en la patrulla, el código que tendrá. */
export const rotuloDeNuevo = (
  area: string,
  esPatrulla: boolean,
  prefijosPorArea: readonly { area: string; prefijo: string }[] = [],
): string => {
  if (!esPatrulla) return "Nuevo";
  const prefijo = prefijosPorArea.find((fila) => fila.area === area)?.prefijo;
  return prefijo ? `Nuevo código ${prefijo}… al guardar` : "Nuevo código al guardar";
};

/**
 * El aviso tras guardar: «Personal guardado: N personas en <identificador>» o, en la patrulla, «…
 * en la patrulla <códigos>», con los códigos del registro que devuelve el servidor.
 */
export const textoPersonalGuardado = (
  guardado: Pick<Operativo, "identificador" | "personal" | "identificadoresDelRegistro">,
  esPatrulla: boolean,
): string => {
  const codigos = guardado.identificadoresDelRegistro ?? [];
  const patrulla = esPatrulla && codigos.length > 0;
  const cuantos = patrulla ? codigos.length : guardado.personal.length;
  const personas = `${cuantos} ${cuantos === 1 ? "persona" : "personas"}`;
  return patrulla
    ? `Personal guardado: ${personas} en la patrulla ${codigos.join(" · ")}`
    : `Personal guardado: ${personas} en ${guardado.identificador}`;
};
