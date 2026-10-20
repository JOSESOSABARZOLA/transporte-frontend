/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos adicionales
 * Archivo: useAdicionalOperativo.ts
 * Responsabilidad: Capturar y registrar un operativo adicional desde el cajón único, igual en
 *   Registro de operativo y en Mis operativos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * «+ ADICIONAL» ABRE EL MISMO CAJÓN EN LAS DOS TABLAS. 2026-10-13.
 *
 * Hasta hoy solo Mis operativos lo ofrecía, con su estado escrito en la página. Con la tabla única
 * de operativos, Registro de operativo también lo ofrece, y copiar ese estado habría hecho dos
 * capturas que empiezan a diferir en cuanto se corrige una. Aquí vive todo lo que es del adicional:
 * de qué operativo nace, su personal mientras se captura y el registro en el servidor.
 *
 * LA JORNADA Y EL FORMULARIO NO VIAJAN: los hereda del operativo del que nace, y el servidor
 * rechaza con 400 si se envían (`CrearAdicional`). Y RN-66: el adicional no manda su horario;
 * cada persona trae el suyo, obligatorio, y el servidor deriva la ventana de las de su gente.
 *
 * Se salta la ventana de carga (regla 11, RN-61): lo único que lo impide es el cuadro cerrado, y
 * eso lo decide cada pantalla con `bloqueado`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormikHelpers } from "formik";

import type { PersonaAgregada } from "../components/cuadro/SelectorPersonal.tsx";
import type { Operativo } from "../interfaces/Operativo.ts";
import { nombreDePersona, type PersonaElegible } from "../interfaces/Personal.ts";
import { OperativoService } from "../services/operativo.service.ts";
import { macroSegunTipo } from "../utils/tipoTransporte.util.ts";
import { avisoDeFallo, type AvisoTexto } from "../utils/errorApi.util.ts";
import { turnoDePrimera } from "../utils/personal.util.ts";
import {
  OPCION_ADICIONALES,
  type ValoresOperativo,
} from "../utils/valoresOperativo.util.ts";

type AvisoServidor = AvisoTexto;

type Opciones = {
  /** ¿Está abierta la ventana de carga? Solo cambia el texto del aviso: el adicional se la salta. */
  ventanaAbierta: boolean;
  /** Tras registrarlo: la pantalla recarga su lista, avisa y resalta la fila. */
  alRegistrar: (adicional: Operativo, aviso: string) => void | Promise<void>;
};

export const useAdicionalOperativo = ({ ventanaAbierta, alRegistrar }: Opciones) => {
  /** El operativo del que nace el adicional, mientras el cajón está abierto. */
  const [origen, setOrigen] = useState<Operativo | null>(null);
  /**
   * Personal del adicional, mientras se captura. Vive aquí y no en el operativo —como sí ocurre al
   * editar— porque **todavía no existe el operativo al que colgarlo**: entra con él en una sola
   * transacción, todo o nada.
   */
  const [personal, setPersonal] = useState<PersonaAgregada[]>([]);
  /** Error del servidor al registrar: se muestra dentro del cajón, sin cerrarlo. */
  const [error, setError] = useState<AvisoServidor | null>(null);
  const [guardando, setGuardando] = useState(false);
  // La última versión del aviso de la pantalla: la recarga que llama puede declararse después.
  const alRegistrarRef = useRef(alRegistrar);
  useEffect(() => {
    alRegistrarRef.current = alRegistrar;
  });

  const abrir = useCallback((operativo: Operativo) => {
    setError(null);
    setPersonal([]);
    setOrigen(operativo);
  }, []);

  /** Cierra el cajón y descarta lo capturado (aún no existía nada que guardar). */
  const cerrar = useCallback(() => {
    setOrigen(null);
    setPersonal([]);
    setError(null);
  }, []);

  /** Sin llamada al servidor: el adicional todavía no existe. Las personas entran con él. */
  const agregarPersona = useCallback((persona: PersonaElegible) => {
    setPersonal((actuales) =>
      actuales.some((agregada) => agregada.funcionarioId === persona.id)
        ? actuales
        : [
            ...actuales,
            {
              funcionarioId: persona.id,
              nombre: nombreDePersona(persona),
              // RN-34: el teléfono lo resuelve el servidor al asignar. Aquí todavía no se
              // conoce, y **no se inventa**.
              telefono: null,
              // DEFAULT-FROM-FIRST (RN-66): el horario arranca copiando el de la primera
              // persona; la primera queda vacía y hay que llenarla.
              ...turnoDePrimera(actuales),
            },
          ],
    );
  }, []);

  const retirarPersona = useCallback((funcionarioId: number) => {
    setPersonal((actuales) =>
      actuales.filter((agregada) => agregada.funcionarioId !== funcionarioId),
    );
  }, []);

  /** El horario propio de una persona (RN-66). Obligatorio: el adicional no tiene horario propio. */
  const cambiarHorarioPersona = useCallback(
    (funcionarioId: number, horaInicio: string, horaFin: string) => {
      setPersonal((actuales) =>
        actuales.map((persona) =>
          persona.funcionarioId === funcionarioId
            ? {
                ...persona,
                horaInicio: horaInicio || undefined,
                horaFin: horaFin || undefined,
              }
            : persona,
        ),
      );
    },
    [],
  );

  /** TRÁMITE DE INSPECCIÓN (2026-10-07): entra con el adicional al registrar. */
  const cambiarTramitePersona = useCallback(
    (funcionarioId: number, codigoTramite: string | null) => {
      setPersonal((actuales) =>
        actuales.map((persona) =>
          persona.funcionarioId === funcionarioId
            ? { ...persona, tramiteCodigo: codigoTramite }
            : persona,
        ),
      );
    },
    [],
  );

  const guardar = useCallback(
    async (valores: ValoresOperativo, ayudas: FormikHelpers<ValoresOperativo>) => {
      if (!origen) return;

      setGuardando(true);
      setError(null);

      try {
        const adicional = await OperativoService.crearAdicional(origen.id, {
          zonalesIds: valores.zonalesIds,
          puntoEncuentroId:
            valores.punto === OPCION_ADICIONALES || valores.punto === ""
              ? undefined
              : Number(valores.punto),
          puntoLibre: valores.punto === OPCION_ADICIONALES ? valores.puntoLibre : undefined,
          tipoControlId:
            valores.tipoControl === OPCION_ADICIONALES || valores.tipoControl === ""
              ? undefined
              : Number(valores.tipoControl),
          tipoLibre: valores.tipoControl === OPCION_ADICIONALES ? valores.tipoLibre : undefined,
          institucionesIds: valores.institucionesIds,
          // Cómo se moviliza (2026-10-06): lo elige quien registra; por defecto, completo.
          tipoTransporte: valores.tipoTransporte ?? "COMPLETO",
          esMacrooperativo: macroSegunTipo(
              valores.tipoTransporte ?? "COMPLETO",
              valores.esMacrooperativo,
            ),
          // Cada persona con su horario, OBLIGATORIO (RN-66): el servidor toma la ventana del
          // adicional de las de su gente.
          personal: personal.map((persona) => ({
            funcionarioId: persona.funcionarioId,
            horaInicio: persona.horaInicio || undefined,
            horaFin: persona.horaFin || undefined,
            // Trámite de Inspección (2026-10-07): solo el código; el servidor copia el resto.
            tramiteInspeccion: persona.tramiteCodigo
              ? { codigoTramite: persona.tramiteCodigo }
              : undefined,
          })),
          observaciones: valores.observaciones || undefined,
        });

        /*
          AVISO BREVE, CAJÓN CERRADO Y FILA RESALTADA (2026-10-08). Se conserva lo que importa del
          transporte heredado: el servidor lo hereda solo si el conductor puede conducir a esa hora.
          Decirlo evita que alguien lo dé por hecho y el operativo salga sin vehículo: la ventana de
          la DAF también está cerrada a esa hora.
        */
        const aviso =
          `Operativo adicional ${adicional.identificador} registrado.` +
          (ventanaAbierta
            ? ""
            : " Se creó fuera de la ventana de carga y queda constancia en la auditoría.") +
          (adicional.estadoTransporte === "ASIGNADO"
            ? " Heredó el conductor y la placa del operativo original."
            : " NO heredó transporte: queda pendiente de la DAF.");
        setOrigen(null);
        setPersonal([]);
        ayudas.resetForm();
        await alRegistrarRef.current(adicional, aviso);
      } catch (fallo: unknown) {
        // El cajón sigue abierto con lo capturado: un rechazo del servidor —una persona no
        // elegible, el cuadro ya cerrado— se corrige y se reintenta sin volver a escribirlo todo.
        setError(avisoDeFallo(fallo));
      } finally {
        setGuardando(false);
      }
    },
    [origen, personal, ventanaAbierta],
  );

  return {
    origen,
    abrir,
    cerrar,
    guardando,
    /** Lo que el cajón en modo «adicional» recibe de aquí; la pantalla pone catálogos y personal. */
    cajon: {
      errorServidor: error,
      onCerrar: cerrar,
      personalAgregado: personal,
      onAgregarPersona: agregarPersona,
      onRetirarPersona: retirarPersona,
      onCambiarHorarioPersona: cambiarHorarioPersona,
      onCambiarTramitePersona: cambiarTramitePersona,
      guardando,
      onGuardar: guardar,
    },
  };
};
