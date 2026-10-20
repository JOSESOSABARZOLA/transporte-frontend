/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: PanelPersonalJornada.tsx
 * Responsabilidad: Asignar y retirar personal de un operativo desde la jornada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLO EL PERSONAL. NI UN CAMPO MÁS.
 *
 * Es lo único que P-13 escribe. El horario, el punto, el tipo y las instituciones son de
 * quien registró el operativo, y en muchas de estas filas ese no es el DMIT. No están
 * deshabilitados: **no están**. Un campo apagado insinúa que en otro momento serviría, y
 * aquí no serviría nunca.
 *
 * Es el mismo criterio que el modo «solo personal» de P-02, y la misma razón por la que
 * la DAF recibe todo apagado menos conductor y placa en P-03 (regla 9).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE PIDE EL OPERATIVO AL ABRIR, Y NO SE REUTILIZA LO QUE TRAE LA TABLA.
 *
 * La jornada entrega de cada fila lo justo para pintarla: el personal llega con
 * `funcionarioId`, `nombre` y `esResponsable`, sin área ni teléfono. `SelectorPersonal`
 * necesita los dos. Es el mismo precedente de P-05, que también pide el operativo al
 * abrir una fila de la matriz.
 *
 * Y el detalle trae además `horaInicio` y `horaFin` **sin formatear**, que es lo que
 * `GET /personal/elegible` necesita para aplicar las reglas de descanso: la tabla los
 * muestra como «08H00 A 12H00», que es texto para leer, no un rango para consultar.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CADA ASIGNACIÓN VIAJA SOLA, no se acumula para guardar al final. Cada una tiene su
 * propio veredicto de descanso y de cupo, y puede fallar por su cuenta: agruparlas
 * obligaría a decidir qué hacer con las cinco que sí entraron cuando la sexta se rechaza.
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` de 4xl con la versalita del formulario; ahora es
 * `DrawerLateral` `lg` en modo LECTURA (cada persona se guarda al instante: el pie es [Cerrar]).
 * «Reparto de carga» se abre DENTRO de este cajón (`repartoEnCajon`), como una vista con «← Volver»:
 * antes era un cajón aparte (z-40) que quedaba DETRÁS del modal (z-10002) y no se veía (H7).
 */

import { useCallback, useEffect, useState, type FC } from "react";

import DrawerLateral from "../common/DrawerLateral.tsx";
import SelectorPersonal from "../cuadro/SelectorPersonal.tsx";
import type { Operativo } from "../../interfaces/Operativo.ts";
import {
  nombreDePersona,
  type PersonaElegible,
} from "../../interfaces/Personal.ts";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";
import { presentarError } from "../../utils/errorApi.util.ts";
import { toast } from "../../utils/mensaje.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

type PanelPersonalJornadaProps = {
  fila: FilaJornada;
  seccion: SeccionJornada;
  /** Fecha de la jornada, para consultar la elegibilidad de ese día. */
  fecha: string;
  onCerrar: () => void;
  /** Se llama tras cada cambio, para que la tabla vuelva a leer la jornada. */
  onCambio: () => void;
};

const PanelPersonalJornada: FC<PanelPersonalJornadaProps> = ({
  fila,
  seccion,
  fecha,
  onCerrar,
  onCambio,
}) => {
  const [operativo, setOperativo] = useState<Operativo | null>(null);
  const [candidatos, setCandidatos] = useState<PersonaElegible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPersonal, setCargandoPersonal] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  /**
   * Que la asignación se guardó, dicho en palabras. 2026-09-01.
   *
   * Este panel solo hablaba cuando algo fallaba. Quien aporta personal desde la jornada
   * lo abre para poner a una persona y lo cierra: si el éxito no dice nada, la única
   * señal es que el nombre aparezca en la bandeja, y ahí aparecería igual si la petición
   * se hubiera perdido. Mismo criterio y mismo texto que P-01 en modo aporte.
   */

  /**
   * El detalle del operativo: es de donde salen el área, el teléfono y las horas.
   *
   * NO SE PONE `cargando` A `true` AQUÍ: ya nace así, y el panel se monta de nuevo con
   * cada fila que se abre —vive bajo un `enPanel &&`—, así que este efecto corre una sola
   * vez por apertura. Escribir estado de forma síncrona dentro de un efecto encadena
   * renders y el lint lo señala con razón.
   */
  useEffect(() => {
    let vigente = true;

    OperativoService.obtener(fila.id)
      .then((detalle) => {
        if (vigente) setOperativo(detalle);
      })
      .catch((fallo: unknown) => {
        if (vigente) setAviso(presentarError(fallo).mensaje);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [fila.id]);

  /**
   * Los candidatos, **con el horario del operativo**.
   *
   * Sin él el servidor solo puede descartar por área y por ausencia: las seis reglas de
   * descanso necesitan el rango. Por eso se espera al detalle en lugar de pedirlos a la
   * vez, aunque cueste un viaje más.
   */
  useEffect(() => {
    if (!operativo) return;

    let vigente = true;

    PersonalService.consultarElegibles({
      formulario: seccion.codigo,
      inicio: fecha,
      horaInicio: operativo.horaInicio,
      horaFin: operativo.horaFin,
    })
      .then((personas) => {
        if (vigente) setCandidatos(personas);
      })
      .catch(() => {
        if (vigente) setCandidatos([]);
      })
      .finally(() => {
        if (vigente) setCargandoPersonal(false);
      });

    return () => {
      vigente = false;
    };
  }, [operativo, seccion.codigo, fecha]);

  const agregar = useCallback(
    async (persona: PersonaElegible) => {
      setAviso(null);

      try {
        setOperativo(
          await OperativoService.asignarPersonal(fila.id, {
            funcionarioId: persona.id,
          }),
        );
        toast.exito(
          `Se agregó a ${nombreDePersona(persona)} al operativo ${fila.identificador}.`,
        );
        onCambio();
      } catch (fallo: unknown) {
        // El motivo lo redacta el servidor —cupo excedido, descanso, área no
        // compartida— y se muestra tal cual (regla 7).
        setAviso(presentarError(fallo).mensaje);
      }
    },
    [fila.id, fila.identificador, onCambio],
  );

  const retirar = useCallback(
    async (funcionarioId: number) => {
      setAviso(null);

      // El nombre se toma antes de llamar: la respuesta ya no trae a esa persona.
      const retirada = operativo?.personal.find(
        (persona) => persona.funcionarioId === funcionarioId,
      );

      try {
        setOperativo(
          await OperativoService.retirarPersonal(fila.id, funcionarioId),
        );
        toast.exito(
          retirada
            ? `Se retiró a ${retirada.nombre} del operativo ${fila.identificador}.`
            : `Se retiró a la persona del operativo ${fila.identificador}.`,
        );
        onCambio();
      } catch (fallo: unknown) {
        // «Esa persona fue asignada por otro departamento» llega por aquí, y es
        // información útil: dice a quién hay que pedirle el retiro.
        setAviso(presentarError(fallo).mensaje);
      }
    },
    [fila.id, fila.identificador, operativo, onCambio],
  );

  return (
    <DrawerLateral
      abierto
      ancho="lg"
      modo="lectura"
      titulo={`Personal de ${fila.identificador}`}
      subtitulo={`${seccion.numero}. ${seccion.nombre} · ${fila.horario}`}
      ayuda={
        seccion.acceso === "APORTA"
          ? "Este formulario no es de su departamento: aporta personal dentro de su cupo."
          : undefined
      }
      onCerrar={onCerrar}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">

        {aviso && (
          <AvisoEnLinea variante="error">{aviso}</AvisoEnLinea>
        )}

        {cargando ? (
          <p className="text-sm text-app-muted">Cargando el operativo…</p>
        ) : (
          <SelectorPersonal
            candidatos={candidatos}
            cargando={cargandoPersonal}
            agregadas={(operativo?.personal ?? []).map((persona) => ({
              funcionarioId: persona.funcionarioId,
              nombre: persona.nombre,
              telefono: persona.telefono,
            }))}
            onAgregar={(persona) => void agregar(persona)}
            onRetirar={(funcionarioId) => void retirar(funcionarioId)}
            deshabilitado={false}
            avisoRechazo={null}
            /* El reparto, como vista de este mismo cajón; cada cambio se guarda al instante. */
            repartoEnCajon
            guardadoInmediato
          />
        )}
      </div>
    </DrawerLateral>
  );
};

export default PanelPersonalJornada;
