/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz mensual de turnos (Instrucción y conductores)
 * Archivo: DrawerAsignarTurnos.tsx
 * Responsabilidad: El cajón único «Asignar turnos»: a quién, qué horario y desde cuándo, con vista previa.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA A «APLICAR PATRÓN» Y A «CONTINUAR ROTACIÓN» (2026-10-24, cobertura simplificada). Tres
 * preguntas en palabras —¿A quién? ¿Qué horario? ¿Desde cuándo?— y una vista previa de cómo
 * quedará la primera persona. Lo que se escribe sale de las mismas piezas de antes:
 *
 * · los horarios tipo y el personalizado se despliegan con `planificarPatron` y SIEMPRE escriben
 *   el horario desde la fecha elegida (no hay «solo celdas vacías»): lo que ya tenía otro turno se
 *   reemplaza, y se dice cuánto;
 * · «Seguir el ciclo» es la propuesta del servidor (`proponerRotacion`, que no escribe), filtrada
 *   a celdas vacías: el ciclo nunca toca lo planificado;
 * · las ausencias no se tocan NUNCA, con ninguna opción.
 *
 * Abierto desde la fila de una persona, el alcance es solo ella: una tarjeta fija en lugar de la
 * lista, y los pasos se numeran 1 · ¿Qué horario? y 2 · ¿Desde cuándo?.
 *
 * El cajón no escribe: entrega los cambios y la matriz los envía en UN lote, con su «Deshacer».
 * Estados, letras y horarios salen de la configuración, así que en la DAF son los suyos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useState, type FC } from "react";

import DrawerLateral, { type EstadoPie } from "../../common/DrawerLateral.tsx";
import Boton from "../../common/Boton.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import type { CambioCelda, PersonaCobertura } from "../../../interfaces/Cobertura.ts";
import {
  cambiosDelCiclo,
  DIAS_VISTA_PREVIA,
  LARGO_MAXIMO_CICLO,
  LARGO_MINIMO_CICLO,
  letrasDelEditor,
  patronLunesAViernes,
  personasSinNingunTurno,
  resumenAsignacion,
  siguienteEnEditor,
  vistaPrevia,
} from "../../../utils/asignarTurnos.util.ts";
import {
  desplazarMes,
  nombreDiaSemana,
  nombreMes,
  planificarPatron,
} from "../../../utils/cobertura.util.ts";
import { expandirPatronCon } from "../../../utils/matrizTurnos.util.ts";
import { fechaEnPalabras } from "../../../utils/texto.util.ts";
import type { ConfigMatriz } from "./configMatriz.ts";

type DrawerAsignarTurnosProps = {
  mes: string;
  dias: string[];
  /** Todas las personas de la matriz: la lista de «¿A quién?». */
  personas: PersonaCobertura[];
  /** Quiénes llegan marcados, según desde dónde se abrió (todos o los que faltan). */
  marcadasIniciales: number[];
  /**
   * Abierto desde el icono de una fila: el alcance es SOLO esa persona (`marcadasIniciales[0]`).
   * En lugar de «¿A quién?» va una tarjeta fija, y los pasos se numeran 1 y 2.
   */
  unaPersona?: boolean;
  config: ConfigMatriz;
  /** Los cambios y el aviso que se dirá tras escribirlos («Turnos asignados a …»). */
  onAplicar: (cambios: CambioCelda[], aviso: string) => void;
  onCerrar: () => void;
};

/** La opción de horario elegida: una tarjeta. */
type Opcion =
  | { tipo: "semana" }
  | { tipo: "patron"; indice: number }
  | { tipo: "ciclo" }
  | { tipo: "personalizado" };

const mismaOpcion = (a: Opcion, b: Opcion): boolean =>
  a.tipo === b.tipo &&
  (a.tipo !== "patron" || (b.tipo === "patron" && a.indice === b.indice));

/** «Domingo 1 de noviembre»: la fecha completa sin el año (el mes ya lo dice el cajón). */
const fechaSinAnio = (fecha: string): string =>
  fechaEnPalabras(fecha).replace(/ de \d{4}$/, "");

/** «AG» de «AYALA GALÁRRAGA CAMILA»: las dos primeras palabras. */
const iniciales = (nombre: string): string =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0))
    .join("");

/** El día del mes sin el día de la semana: «30 de noviembre». */
const diaYMes = (fecha: string): string =>
  fechaSinAnio(fecha).replace(/^\S+ /, "");

const DrawerAsignarTurnos: FC<DrawerAsignarTurnosProps> = ({
  mes,
  dias,
  personas,
  marcadasIniciales,
  unaPersona = false,
  config,
  onAplicar,
  onCerrar,
}) => {
  const { estados } = config;
  // Sin «¿A quién?» (una persona) los pasos empiezan en 1; con la lista, en 2.
  const paso = (numero: number): number => (unaPersona ? numero : numero + 1);
  const porValor = useMemo(
    () => new Map(estados.map((estado) => [estado.valor, estado])),
    [estados],
  );

  const [marcadas, setMarcadas] = useState<Set<number>>(
    () => new Set(marcadasIniciales),
  );
  const [opcion, setOpcion] = useState<Opcion>({ tipo: "semana" });
  const [personalizado, setPersonalizado] = useState<string[]>(
    () =>
      expandirPatronCon(config.patronesRapidos[0]?.patron ?? "", estados) ??
      estados.slice(0, 2).map((estado) => estado.valor),
  );
  const [desde, setDesde] = useState(0);

  // «Seguir el ciclo»: una sola consulta al abrir, para todas; luego se filtra por las marcadas.
  const [ciclo, setCiclo] = useState<{
    propuestas: CambioCelda[];
    estado: "cargando" | "listo" | "error";
  }>({ propuestas: [], estado: "cargando" });
  const { servicio } = config;
  const claveIds = personas.map((persona) => persona.funcionarioId).join(",");
  useEffect(() => {
    let vigente = true;
    const ids = claveIds ? claveIds.split(",").map(Number) : [];
    servicio
      .proponerRotacion(mes, ids)
      .then((respuesta) => {
        if (vigente) setCiclo({ propuestas: respuesta.propuestas, estado: "listo" });
      })
      .catch(() => {
        if (vigente) setCiclo({ propuestas: [], estado: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [servicio, mes, claveIds]);

  const mesAnterior = nombreMes(desplazarMes(mes, -1)).replace(/ de \d{4}$/, "");
  const sinCiclo = ciclo.estado === "listo" && ciclo.propuestas.length === 0;
  const motivoCiclo =
    ciclo.estado === "cargando"
      ? "Buscando el ciclo…"
      : ciclo.estado === "error"
        ? "No se pudo leer el ciclo del mes anterior."
        : sinCiclo
          ? `${mesAnterior.charAt(0).toUpperCase()}${mesAnterior.slice(1)} no tiene turnos cargados`
          : null;

  const listaMarcadas = useMemo(
    () => personas.filter((persona) => marcadas.has(persona.funcionarioId)),
    [personas, marcadas],
  );
  const desdeFecha = dias[desde] ?? dias[0] ?? "";
  const esCiclo = opcion.tipo === "ciclo";

  /** El ciclo que se despliega (todas las opciones salvo «Seguir el ciclo»). */
  const patron = useMemo((): string[] | null => {
    if (opcion.tipo === "semana") {
      return patronLunesAViernes(desdeFecha, config.estadoDia, config.estadoDescanso);
    }
    if (opcion.tipo === "patron") {
      return expandirPatronCon(config.patronesRapidos[opcion.indice]?.patron ?? "", estados);
    }
    if (opcion.tipo === "personalizado") {
      // Las casillas se leen como el patrón libre de siempre: misma validación.
      return expandirPatronCon(letrasDelEditor(personalizado, estados), estados);
    }
    return null;
  }, [opcion, desdeFecha, config, estados, personalizado]);

  /*
    ASIGNAR SIEMPRE ESCRIBE EL HORARIO DESDE LA FECHA ELEGIDA (2026-10-24): no hay «solo celdas
    vacías», así que se despliega con `soloVacias: false` y solo viaja lo que de verdad cambia (un día
    que ya tiene ese turno no se reescribe). Las ausencias las omite siempre `planificarPatron`. El
    ciclo del servidor, en cambio, solo propone días vacíos.
  */
  const cambios = useMemo((): CambioCelda[] => {
    if (esCiclo) return cambiosDelCiclo(ciclo.propuestas, listaMarcadas, desdeFecha);
    if (!patron) return [];
    const actual = new Map(
      listaMarcadas.flatMap((persona) =>
        persona.celdas.map((celda) => [`${persona.funcionarioId}|${celda.fecha}`, celda.estado]),
      ),
    );
    return planificarPatron({
      personas: listaMarcadas,
      indicesDias: dias.map((_, i) => i),
      desdeIndice: desde,
      patron,
      soloVacias: false,
    }).cambios.filter(
      (cambio) => actual.get(`${cambio.funcionarioId}|${cambio.fecha}`) !== cambio.estado,
    );
  }, [esCiclo, ciclo.propuestas, listaMarcadas, desdeFecha, patron, dias, desde]);

  const resumen = resumenAsignacion(cambios, listaMarcadas, desde);
  const primera = listaMarcadas[0] ?? null;
  const previa = primera ? vistaPrevia(primera, desde, cambios) : [];

  const sinPersonas = marcadas.size === 0;
  const sinCambios = cambios.length === 0;
  const textoListo = `Se asignarán ${resumen.dias} ${resumen.dias === 1 ? "día" : "días"} de ${resumen.personas} ${
    resumen.personas === 1 ? config.sujeto.singular : config.sujeto.plural
  }`;
  const textoAusencias =
    resumen.ausencias === 0
      ? "Vacaciones, reposo y permisos nunca se tocan."
      : resumen.ausencias === 1
        ? "El día de vacaciones o permiso no se toca."
        : `Los ${resumen.ausencias} días de vacaciones o permisos no se tocan.`;
  const textoReemplazos =
    resumen.reemplazos === 0
      ? ""
      : resumen.reemplazos === 1
        ? "1 día que ya tenía otro turno se reemplaza."
        : `${resumen.reemplazos} días que ya tenían otro turno se reemplazan.`;
  const estadoPie: EstadoPie = sinPersonas
    ? { tono: "pendiente", texto: `Elija al menos una ${config.sujeto.singular}` }
    : sinCambios
      ? { tono: "pendiente", texto: "Ya tiene ese horario" }
      : { tono: "listo", texto: textoListo };
  // El aviso tras asignar: con el nombre si fue una sola persona.
  const unicaAfectada =
    resumen.personas === 1
      ? listaMarcadas.find((persona) => persona.funcionarioId === cambios[0]?.funcionarioId)
      : undefined;
  const aviso = unicaAfectada
    ? `Turnos asignados a ${unicaAfectada.nombre}`
    : `Turnos asignados a ${resumen.personas} ${config.sujeto.plural}`;

  const sucio =
    !mismaOpcion(opcion, { tipo: "semana" }) ||
    desde !== 0 ||
    marcadas.size !== marcadasIniciales.length ||
    marcadasIniciales.some((id) => !marcadas.has(id));

  const alternar = (id: number) =>
    setMarcadas((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  /** Catorce cuadros con la letra y el color de cada estado (regla 6: la letra es la información). */
  const cuadros = (valores: (string | null)[], clave: string) => (
    <span className="flex flex-wrap gap-0.5" aria-hidden="true">
      {valores.map((valor, i) => {
        const estado = valor ? porValor.get(valor) : undefined;
        return (
          <span
            key={`${clave}-${i}`}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-sm text-xs font-semibold ${
              estado?.clase ?? "border border-dashed border-base-300"
            }`}
          >
            {estado?.letra ?? ""}
          </span>
        );
      })}
    </span>
  );

  const repetir = (ciclo14: string[]) =>
    Array.from({ length: DIAS_VISTA_PREVIA }, (_, i) => ciclo14[i % ciclo14.length]);

  const tarjeta = (
    clave: Opcion,
    nombre: string,
    descripcion: string,
    valores: string[] | null,
    motivo: string | null = null,
  ) => {
    const elegida = mismaOpcion(opcion, clave);
    const apagada = motivo !== null;
    return (
      <button
        key={nombre}
        type="button"
        role="radio"
        aria-checked={elegida}
        aria-disabled={apagada}
        title={motivo ?? undefined}
        onClick={() => {
          if (!apagada) setOpcion(clave);
        }}
        className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left ${
          elegida ? "border-primary bg-primary/10" : "border-base-300"
        } ${apagada ? "cursor-not-allowed text-app-disabled" : "cursor-pointer hover:bg-base-200"}`}
      >
        <span className={`text-sm font-semibold ${apagada ? "" : "text-app-strong"}`}>{nombre}</span>
        <span className="text-xs text-app-muted">{motivo ?? descripcion}</span>
        {valores && !apagada && cuadros(repetir(valores), nombre)}
      </button>
    );
  };

  const nombreDescanso = porValor.get(config.estadoDescanso)?.nombre.toLowerCase() ?? "";
  // La vista de «lunes a viernes» en la tarjeta arranca en lunes, para leerse como semana.
  const semanaDesdeLunes = patronLunesAViernes(
    "2026-10-05",
    config.estadoDia,
    config.estadoDescanso,
  );

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo="Asignar turnos"
      subtitulo={`${config.contexto} · ${nombreMes(mes).charAt(0).toUpperCase()}${nombreMes(mes).slice(1)}`}
      onCerrar={onCerrar}
      sucio={sucio}
      textoGuardar="Asignar turnos"
      onGuardar={() => onAplicar(cambios, aviso)}
      estadoPie={estadoPie}
      motivoGuardar={
        sinPersonas
          ? `Elija al menos una ${config.sujeto.singular}.`
          : sinCambios
            ? "Ya tiene ese horario."
            : null
      }
    >
      {/* Abierto desde la fila de una persona: sin lista, una tarjeta fija con ella. */}
      {unaPersona && primera ? (
        <div
          className="flex items-center gap-3 rounded-xl border border-base-300 p-3"
          aria-label={`Se asignan turnos a ${primera.nombre}`}
        >
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
            aria-hidden="true"
          >
            {iniciales(primera.nombre)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-app-strong">{primera.nombre}</span>
            <span className="text-xs text-app-muted">{primera.zona ?? config.grupo.sinGrupo}</span>
          </span>
        </div>
      ) : (
        <SeccionDrawer titulo="1 · ¿A quién?" rejilla={false}>
          <div className="flex flex-wrap gap-3 text-sm">
            <Boton
              variante="enlace"
              tamano="sm"
              onClick={() => setMarcadas(new Set(personas.map((p) => p.funcionarioId)))}
            >
              Todos
            </Boton>
            <Boton variante="enlace" tamano="sm" onClick={() => setMarcadas(new Set())}>
              Ninguno
            </Boton>
            <Boton
              variante="enlace"
              tamano="sm"
              onClick={() =>
                setMarcadas(new Set(personasSinNingunTurno(personas).map((p) => p.funcionarioId)))
              }
            >
              Solo quienes no tienen turno
            </Boton>
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2" aria-label={`${config.sujeto.plural} a las que se asignan turnos`}>
            {personas.map((persona) => (
              <li key={persona.funcionarioId}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-base-300 p-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm mt-0.5"
                    checked={marcadas.has(persona.funcionarioId)}
                    onChange={() => alternar(persona.funcionarioId)}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-app-strong" title={persona.nombre}>
                      {persona.nombre}
                    </span>
                    <span className="text-xs text-app-muted">
                      {persona.zona ?? config.grupo.sinGrupo}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </SeccionDrawer>
      )}

      <SeccionDrawer titulo={`${paso(1)} · ¿Qué horario?`} rejilla={false}>
        <div role="radiogroup" aria-label="Horario" className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {tarjeta(
            { tipo: "semana" },
            "Lunes a viernes de día",
            `${nombreDescanso.charAt(0).toUpperCase()}${nombreDescanso.slice(1)} sábado y domingo`,
            semanaDesdeLunes,
          )}
          {config.patronesRapidos.map((rapido, indice) =>
            tarjeta(
              { tipo: "patron", indice },
              rapido.nombre,
              rapido.descripcion,
              expandirPatronCon(rapido.patron, estados),
            ),
          )}
          {tarjeta(
            { tipo: "ciclo" },
            `Seguir el ciclo de ${mesAnterior}`,
            `Continúa el ciclo de cada ${config.sujeto.singular} en los días vacíos`,
            null,
            motivoCiclo,
          )}
          {tarjeta(
            { tipo: "personalizado" },
            "Personalizado",
            "Arme su propio ciclo tocando los días",
            personalizado,
          )}
        </div>

        {opcion.tipo === "personalizado" && (
          <div className="flex flex-col gap-2 rounded-lg border border-base-300 p-3">
            <span className="text-xs text-app-muted">
              Toque cada día para cambiarlo: {estados.map((e) => e.nombre).join(" → ")}.
            </span>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Días del ciclo">
              {personalizado.map((valor, i) => {
                const estado = porValor.get(valor);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Día ${i + 1} del ciclo: ${estado?.nombre ?? ""}`}
                    onClick={() =>
                      setPersonalizado((actual) =>
                        actual.map((v, j) => (j === i ? siguienteEnEditor(v, estados) : v)),
                      )
                    }
                    className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-xs font-semibold ${
                      estado?.clase ?? ""
                    }`}
                  >
                    {estado?.letra}
                  </button>
                );
              })}
              <Boton
                tamano="sm"
                aria-label="Quitar un día del ciclo"
                motivoDeshabilitado={
                  personalizado.length <= LARGO_MINIMO_CICLO
                    ? `El ciclo tiene al menos ${LARGO_MINIMO_CICLO} días.`
                    : null
                }
                onClick={() => setPersonalizado((actual) => actual.slice(0, -1))}
              >
                −
              </Boton>
              <Boton
                tamano="sm"
                aria-label="Agregar un día al ciclo"
                motivoDeshabilitado={
                  personalizado.length >= LARGO_MAXIMO_CICLO
                    ? `El ciclo tiene como mucho ${LARGO_MAXIMO_CICLO} días.`
                    : null
                }
                onClick={() =>
                  setPersonalizado((actual) => [...actual, estados[0]?.valor ?? ""])
                }
              >
                +
              </Boton>
              <span className="text-xs text-app-muted">
                Ciclo de {personalizado.length} días
              </span>
            </div>
          </div>
        )}
      </SeccionDrawer>

      <SeccionDrawer titulo={`${paso(2)} · ¿Desde cuándo?`} rejilla={false}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            className="select select-bordered select-sm"
            aria-label="Desde el día"
            value={desde}
            onChange={(evento) => setDesde(Number(evento.target.value))}
          >
            {dias.map((fecha, indice) => (
              <option key={fecha} value={indice}>
                {fechaSinAnio(fecha)}
              </option>
            ))}
          </select>
          {dias.length > 0 && (
            <span className="text-app-muted">hasta el {diaYMes(dias[dias.length - 1])}</span>
          )}
        </div>

        {primera && (
          <div className="flex flex-col gap-2 rounded-lg border border-base-300 p-3">
            <span className="text-sm font-semibold text-app-strong">
              Así quedará {primera.nombre} (primeras dos semanas)
            </span>
            {/* Dos semanas, una por renglón de siete días. */}
            <div className="flex flex-col gap-1" aria-label={`Vista previa de ${primera.nombre}`}>
              {[previa.slice(0, 7), previa.slice(7)].map((semana, numero) => (
                <div key={numero} className="flex gap-1">
                  {semana.map((dia) => {
                    const estado = dia.estado ? porValor.get(dia.estado) : undefined;
                    const ausencia = dia.esAusencia
                      ? config.ausencias.find((a) => a.valor === dia.estado)
                      : undefined;
                    const nombre = ausencia?.nombre ?? estado?.nombre ?? "sin turno";
                    return (
                      <span
                        key={dia.fecha}
                        className="flex flex-1 flex-col items-center gap-0.5 text-xs text-app-muted"
                      >
                        <span>{nombreDiaSemana(dia.fecha).slice(0, 2)}</span>
                        <span
                          className={`inline-flex h-6 w-full items-center justify-center rounded-sm text-xs font-semibold ${
                            ausencia?.clase ?? estado?.clase ?? "border border-dashed border-base-300"
                          }`}
                          title={`${fechaSinAnio(dia.fecha)} · ${nombre}`}
                        >
                          {ausencia?.letra ?? estado?.letra ?? ""}
                        </span>
                        <span>{Number(dia.fecha.slice(8, 10))}</span>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="text-sm text-app-label" role="status">
              {[sinCambios ? "Ya tiene ese horario." : `${textoListo}.`, textoAusencias, textoReemplazos]
                .filter(Boolean)
                .join(" ")}
            </p>
          </div>
        )}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerAsignarTurnos;
