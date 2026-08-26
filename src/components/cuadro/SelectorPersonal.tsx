/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: SelectorPersonal.tsx
 * Responsabilidad: Elegir personal, con el veredicto de cada persona a la vista.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CADA PERSONA LLEGA CON SU VEREDICTO · PV-37, RESUELTO EL 2026-08-11.
 *
 * `GET /personal/elegible` devuelve **todos** los candidatos del formulario, con
 * `elegible` y, si no lo es, el motivo redactado. Quien no puede salir aparece
 * deshabilitado y con su explicación, en lugar de desaparecer.
 *
 * Esa desaparición era la pérdida que el análisis quiso evitar: una persona que falta
 * sin decir por qué obliga a levantar el teléfono, que es el canal que este sistema
 * existe para reemplazar. Entre el 07 y el 11 de agosto se ofreció «lo que el servidor
 * ofrece» —solo los aptos— porque el endpoint no daba más; ahora sí lo da.
 *
 * EL MOTIVO SE MUESTRA TAL CUAL, sin reescribirlo: lo redacta el servidor, que es quien
 * conoce la regla. Duplicar aquí el texto dejaría dos versiones que acabarían diciendo
 * cosas distintas de la misma norma.
 *
 * QUE UNA AUSENCIA NO DIGA SU CAUSA ES DELIBERADO. El servidor informa de que la persona
 * no está disponible y nunca de si es reposo médico o calamidad doméstica.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL TELÉFONO NO SE DIGITA (RN-34): viene del maestro y se muestra en el distintivo de
 * cada persona ya agregada.
 */

import { useMemo, useState, type FC } from "react";

import {
  nombreDePersona,
  type PersonaElegible,
} from "../../interfaces/Personal.ts";

/** Persona ya agregada al operativo en construcción. */
export type PersonaAgregada = {
  funcionarioId: number;
  nombre: string;
  telefono: string | null;
};

type SelectorPersonalProps = {
  candidatos: PersonaElegible[];
  cargando: boolean;
  agregadas: PersonaAgregada[];
  onAgregar: (persona: PersonaElegible) => void;
  onRetirar: (funcionarioId: number) => void;
  deshabilitado: boolean;
  /** Aviso del servidor tras un `409`. Se muestra tal cual. */
  avisoRechazo: string | null;
};

const SelectorPersonal: FC<SelectorPersonalProps> = ({
  candidatos,
  cargando,
  agregadas,
  onAgregar,
  onRetirar,
  deshabilitado,
  avisoRechazo,
}) => {
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const yaAgregadas = new Set(agregadas.map((persona) => persona.funcionarioId));

    return candidatos
      .filter((persona) => !yaAgregadas.has(persona.id))
      .filter((persona) =>
        nombreDePersona(persona).toLowerCase().includes(texto),
      );
  }, [busqueda, candidatos, agregadas]);

  return (
    <div className="flex flex-col gap-2">
      <label
        className="label"
        htmlFor="busquedaPersonal"
      >
        <span className="label-text font-medium">Personal asignado</span>
      </label>

      {agregadas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agregadas.map((persona) => (
            <span
              key={persona.funcionarioId}
              className="badge badge-primary gap-2"
            >
              {persona.nombre}
              {persona.telefono && (
                <span className="opacity-80">{persona.telefono}</span>
              )}
              <button
                type="button"
                aria-label={`Retirar a ${persona.nombre}`}
                disabled={deshabilitado}
                onClick={() => onRetirar(persona.funcionarioId)}
                className="btn btn-ghost btn-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Caso 7 del plan: el motivo del servidor se muestra tal cual, y lo capturado en
          el resto del formulario **no se pierde**. */}
      {avisoRechazo && (
        <div
          className="alert alert-error"
          role="alert"
        >
          <span>{avisoRechazo}</span>
        </div>
      )}

      <input
        id="busquedaPersonal"
        type="search"
        className="input input-bordered w-full"
        placeholder="Buscar por apellido…"
        value={busqueda}
        disabled={deshabilitado}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="max-h-48 overflow-y-auto rounded-box border border-base-300">
        {cargando && (
          <p className="px-3 py-2 text-sm text-base-content/70">
            Consultando personal disponible…
          </p>
        )}

        {!cargando && visibles.length === 0 && (
          <p className="px-3 py-2 text-sm text-base-content/70">
            No hay personal que coincida con la búsqueda.
          </p>
        )}

        {!cargando &&
          visibles.map((persona) => (
            <button
              key={persona.id}
              type="button"
              disabled={deshabilitado || !persona.elegible}
              // El motivo también en `title`: en una lista larga es lo que se lee al
              // pasar por encima, sin tener que buscar la línea correspondiente.
              title={persona.motivo ?? undefined}
              onClick={() => onAgregar(persona)}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-base-200"
            >
              <span className="text-sm font-medium">
                {nombreDePersona(persona)}
              </span>
              <span className="text-xs text-base-content/70">
                {persona.area}
                {persona.cargo ? ` · ${persona.cargo}` : ""}
              </span>
              {/*
                PV-37. El motivo del servidor se muestra TAL CUAL y con el nombre que él
                redacta: «SOSA BARZOLA JOSE LUIS ya está asignada al operativo
                OCF-001-12-AGO-2026 de 08H00 A 14H30, que se cruza con este horario».
                Reescribirlo aquí duplicaría la regla y las dos versiones se separarían.
              */}
              {!persona.elegible && persona.motivo && (
                <span className="text-xs text-warning">{persona.motivo}</span>
              )}
            </button>
          ))}
      </div>
    </div>
  );
};

export default SelectorPersonal;
