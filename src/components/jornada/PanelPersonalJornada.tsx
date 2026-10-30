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
 * SE GUARDA CON «GUARDAR CAMBIOS», EN TODAS LAS VARIANTES (2026-10-28; la patrulla, 2026-10-29).
 * Agregar, quitar y cambiar horas tocan el borrador (`useBorradorAporte`, el mismo de Mis
 * operativos y Registro) y el lote va en una sola llamada (`PUT /operativos/:id/personal/lote`): el
 * servidor aplica todo o nada. En la patrulla con grupo (5/6) el borrador es la persona de cada
 * código del registro y una persona nueva dice qué código tendrá al guardar. Si el servidor rechaza
 * a alguien, el motivo va junto a esa persona y el borrador se conserva.
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` de 4xl con la versalita del formulario; ahora es
 * `DrawerLateral` `lg`, con [Cancelar] [Guardar cambios] y la confirmación al cerrar con cambios.
 * «Reparto de carga» se abre DENTRO de este cajón (`repartoEnCajon`), como una vista con «← Volver»:
 * antes era un cajón aparte (z-40) que quedaba DETRÁS del modal (z-10002) y no se veía (H7).
 */

import { useEffect, useState, type FC } from "react";

import DrawerLateral from "../common/DrawerLateral.tsx";
import SelectorPersonal from "../cuadro/SelectorPersonal.tsx";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
import { OperativoService } from "../../services/operativo.service.ts";
import { PersonalService } from "../../services/personal.service.ts";
import { presentarError } from "../../utils/errorApi.util.ts";
import { toast } from "../../utils/mensaje.ts";
import { useBorradorAporte } from "../../hooks/useBorradorAporte.ts";
import { useCatalogosFormulario } from "../../hooks/useCatalogosFormulario.ts";
import { useConfirmarLiberacion } from "../../hooks/useConfirmarLiberacion.tsx";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import AvisoVentanaCerrada from "../common/AvisoVentanaCerrada.tsx";

type PanelPersonalJornadaProps = {
  fila: FilaJornada;
  seccion: SeccionJornada;
  /** Fecha de la jornada, para consultar la elegibilidad de ese día. */
  fecha: string;
  /** Los roles de quien mira: con qué rol agrega y a quién puede tocar. */
  roles: readonly string[];
  /** Por qué no se puede guardar (cuadro o ventana cerrados), o `null`. */
  motivoBloqueo: string | null;
  onCerrar: () => void;
  /** Se llama tras guardar, para que la tabla vuelva a leer la jornada. */
  onCambio: () => void;
};

const PanelPersonalJornada: FC<PanelPersonalJornadaProps> = ({
  fila,
  seccion,
  fecha,
  roles,
  motivoBloqueo,
  onCerrar,
  onCambio,
}) => {
  const [operativo, setOperativo] = useState<Operativo | null>(null);
  const [candidatos, setCandidatos] = useState<PersonaElegible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPersonal, setCargandoPersonal] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const catalogos = useCatalogosFormulario(seccion.codigo);
  const { ejecutar: conLiberacion, modal: modalLiberacion } = useConfirmarLiberacion();

  const borrador = useBorradorAporte({
    operativo,
    roles,
    prefijosPorArea: catalogos.catalogos?.prefijosPorArea,
    bloqueado: motivoBloqueo !== null,
    conLiberacion,
  });
  const { iniciar } = borrador;

  /**
   * El detalle del operativo y, en la patrulla, el de cada código de su registro: de ahí salen el
   * área, el teléfono, las horas y la persona de cada código. Se pide una vez por apertura y fija
   * lo guardado del borrador.
   *
   * NO SE PONE `cargando` A `true` AQUÍ: ya nace así, y el panel se monta de nuevo con cada fila
   * que se abre —vive bajo un `enPanel &&`—, así que este efecto corre una sola vez por apertura.
   */
  useEffect(() => {
    let vigente = true;

    const cargarRegistro = async () => {
      const detalle = await OperativoService.obtener(fila.id);
      if (!(detalle.esLote && detalle.formulario.esPatrulla)) {
        return { detalle, grupo: [detalle] };
      }
      const otros = seccion.filas.filter(
        (otra) => otra.grupoRegistro === fila.grupoRegistro && otra.id !== fila.id,
      );
      const resto = await Promise.all(otros.map((otra) => OperativoService.obtener(otra.id)));
      return { detalle, grupo: [detalle, ...resto] };
    };

    cargarRegistro()
      .then(({ detalle, grupo }) => {
        if (!vigente) return;
        iniciar(detalle, grupo);
        setOperativo(detalle);
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
  }, [fila.id, fila.grupoRegistro, seccion.filas, iniciar]);

  /**
   * Los candidatos, **con el horario del operativo**. Sin él el servidor solo puede descartar por
   * área y por ausencia: las seis reglas de descanso necesitan el rango. Por eso se espera al
   * detalle en lugar de pedirlos a la vez, aunque cueste un viaje más.
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

  const guardar = async () => {
    const guardado = await borrador.guardar();
    if (!guardado) return;
    toast.exito(guardado.mensaje);
    onCambio();
    onCerrar();
  };

  // Quien aporta solo pone Personal de Instrucción; el dueño del formulario, todas las áreas.
  const esDueno = operativo !== null && roles.includes(operativo.formulario.rolDueno);

  return (
    <DrawerLateral
      abierto
      ancho="lg"
      modo="form"
      titulo={borrador.esPatrulla ? "Personal de patrulla" : `Personal de ${fila.identificador}`}
      // La patrulla se nombra por sus códigos, no por su `grupoRegistro`.
      subtitulo={`${
        borrador.identificadores.length > 0 ? `${borrador.identificadores.join(" · ")} · ` : ""
      }${seccion.numero}. ${seccion.nombre} · ${fila.horario}`}
      ayuda={
        seccion.acceso === "APORTA"
          ? "Su departamento aporta personal a este operativo. El resto de los datos los mantiene el departamento dueño del formulario y llega en lectura."
          : undefined
      }
      onCerrar={onCerrar}
      sucio={borrador.resumen.total > 0}
      guardando={borrador.guardando}
      onGuardar={() => void guardar()}
      textoGuardar="Guardar cambios"
      estadoPie={borrador.estadoPie}
      motivoGuardar={operativo ? (motivoBloqueo ?? borrador.motivoGuardar) : "Cargando el operativo…"}
      mensajeDescarte="Se perderán las personas agregadas, las quitadas y los horarios cambiados. Nada se ha guardado todavía."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* La ventana o el cuadro se cerraron con el cajón abierto: por qué no se puede guardar. */}
        {motivoBloqueo && <AvisoVentanaCerrada>{motivoBloqueo}</AvisoVentanaCerrada>}
        {aviso && <AvisoEnLinea variante="error">{aviso}</AvisoEnLinea>}

        {cargando ? (
          <p className="text-sm text-app-muted">Cargando el operativo…</p>
        ) : (
          operativo && (
            <SelectorPersonal
              candidatos={
                esDueno
                  ? candidatos
                  : candidatos.filter((persona) => persona.area === "INSTRUCCION")
              }
              cargando={cargandoPersonal}
              agregadas={borrador.personal.map((persona) => ({
                funcionarioId: persona.funcionarioId,
                nombre: persona.nombre,
                telefono: persona.telefono,
                horaInicio: persona.horaInicio,
                horaFin: persona.horaFin,
                editable: borrador.editable(persona),
              }))}
              onAgregar={borrador.agregar}
              onRetirar={borrador.quitar}
              onCambiarHorario={borrador.cambiarHorario}
              deshabilitado={borrador.guardando}
              // El rechazo del servidor, tal cual, junto a la persona que nombra.
              avisoRechazo={borrador.rechazo?.mensaje ?? null}
              idPersonaRechazada={borrador.rechazo?.funcionarioId ?? null}
              listaCompacta
              horarioInline
              /* El reparto, como vista de este mismo cajón. */
              repartoEnCajon
              conGuardarCambios
              idsNuevos={borrador.resumen.idsNuevos}
              rotulosNuevos={borrador.rotulosNuevos}
              rotuloLectura={esDueno ? undefined : "Del dueño del formulario · lectura"}
            />
          )
        )}
      </div>
      {modalLiberacion}
    </DrawerLateral>
  );
};

export default PanelPersonalJornada;
