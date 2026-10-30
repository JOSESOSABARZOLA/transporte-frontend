/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: PanelJornadasLaborales.tsx
 * Responsabilidad: El catálogo de jornadas laborales en «Ventanas y parámetros»: listar, crear, editar y desactivar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA JORNADA LABORAL REEMPLAZA AL TIPO DE CONTRATO (2026-10-23). Cada persona y cada conductor
 * tienen una jornada de este catálogo, que decide en qué días y horas se los convoca. Sin jornada
 * no se los convoca. La administran el ADMINISTRADOR y el ADMINISTRADOR_DMIP (permiso
 * `jornadas:administrar`), los mismos que fijaban las horas del nombramiento.
 *
 * NO SE BORRA, SE DESACTIVA: quien ya la tiene la conserva y sus reglas siguen; solo deja de
 * ofrecerse. Por eso la confirmación dice a cuántas fichas afecta.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";
import { Link } from "react-router-dom";

import AccionesFila from "../common/AccionesFila.tsx";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import EtiquetaEstado from "../common/EtiquetaEstado.tsx";
import Boton from "../common/Boton.tsx";
import DrawerJornadaLaboral from "./DrawerJornadaLaboral.tsx";
import { useJornadasLaborales } from "../../hooks/useJornadasLaborales.ts";
import { usePermiso } from "../../hooks/usePermiso.ts";
import type {
  GuardarJornadaLaboral,
  JornadaLaboral,
} from "../../interfaces/JornadaLaboral.ts";
import { JornadasLaboralesService } from "../../services/jornadasLaborales.service.ts";
import { traducirError } from "../../utils/traductorErrores.ts";
import { DIAS_SEMANA, textoHorario } from "../../utils/jornadaLaboral.util.ts";
import { mensaje, toast } from "../../utils/mensaje.ts";

/** «12 fichas de personal y 3 conductores», o «Nadie la tiene asignada». */
const textoUso = (jornada: JornadaLaboral): string => {
  const partes = [
    jornada.funcionarios > 0
      ? `${jornada.funcionarios} ${jornada.funcionarios === 1 ? "ficha de personal" : "fichas de personal"}`
      : null,
    jornada.conductores > 0
      ? `${jornada.conductores} ${jornada.conductores === 1 ? "conductor" : "conductores"}`
      : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" y ") : "Nadie la tiene asignada";
};

/**
 * «Asignada a» (2026-10-24): las fichas de personal llevan a «Personal y disponibilidad» ya filtrada
 * por esa jornada, si quien mira puede abrirla. Los conductores siguen como texto: Flota no filtra
 * por jornada.
 */
const AsignadaA: FC<{ jornada: JornadaLaboral; puedeVerPersonal: boolean }> = ({
  jornada,
  puedeVerPersonal,
}) => {
  if (jornada.funcionarios === 0 || !puedeVerPersonal) {
    return <span className="text-xs text-app-muted">{textoUso(jornada)}</span>;
  }
  const fichas = `${jornada.funcionarios} ${jornada.funcionarios === 1 ? "ficha de personal" : "fichas de personal"}`;
  return (
    <span className="text-xs">
      <Link
        to={`/administracion/personal?jornada=${jornada.id}`}
        className="link link-primary"
        aria-label={`Ver las ${fichas} con la jornada ${jornada.nombre}`}
      >
        {fichas} →
      </Link>
      {jornada.conductores > 0 && (
        <span className="text-app-muted">
          {" "}
          y {jornada.conductores}{" "}
          {jornada.conductores === 1 ? "conductor" : "conductores"}
        </span>
      )}
    </span>
  );
};

/**
 * PLANTILLA VISUAL (2026-10-24): «+ Nueva jornada» vive en la cabecera azul de la página, así que
 * el alta la abre la página (`altaAbierta`) y este panel la cierra con `onCerrarAlta`. La ayuda
 * pasó a la nota al pie del panel, que pone la página.
 */
type PanelJornadasLaboralesProps = {
  altaAbierta?: boolean;
  onCerrarAlta?: () => void;
};

const PanelJornadasLaborales: FC<PanelJornadasLaboralesProps> = ({
  altaAbierta = false,
  onCerrarAlta,
}) => {
  const { jornadas, cargando, error, recargar } = useJornadasLaborales();
  const puedeVerPersonal = usePermiso("personal:administrar");
  /** `undefined` = cajón cerrado; `null` = alta; una jornada = edición. */
  const [enEdicion, setEnEdicion] = useState<JornadaLaboral | null | undefined>(
    undefined,
  );
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  const abrir = (jornada: JornadaLaboral | null) => {
    setErrorServidor(null);
    setEnEdicion(jornada);
  };

  /** Lo que muestra el cajón: el alta que pidió la página, o la edición de una fila. */
  const enCajon = altaAbierta ? null : enEdicion;

  const cerrar = () => {
    setErrorServidor(null);
    setEnEdicion(undefined);
    onCerrarAlta?.();
  };

  const guardar = async (datos: GuardarJornadaLaboral) => {
    setGuardando(true);
    setErrorServidor(null);
    try {
      if (enCajon) await JornadasLaboralesService.actualizar(enCajon.id, datos);
      else await JornadasLaboralesService.crear(datos);
      toast.exito(
        enCajon
          ? `Jornada «${datos.nombre}» actualizada`
          : `Jornada «${datos.nombre}» creada`,
      );
      cerrar();
      recargar();
    } catch (fallo: unknown) {
      // El mensaje del servidor, tal cual (regla 7): queda en el pie del cajón.
      setErrorServidor(traducirError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarActivo = async (jornada: JornadaLaboral) => {
    const desactivar = jornada.activo;
    const asignada = jornada.funcionarios + jornada.conductores > 0;
    const confirmado = await mensaje.confirmar({
      // Desactivar una jornada asignada es una ADVERTENCIA (2026-10-24): nadie la pierde, pero deja
      // de ofrecerse; sin nadie que la use, el riesgo es el de siempre.
      variante: desactivar && !asignada ? "peligro" : "advertencia",
      titulo: desactivar
        ? `¿Desactivar «${jornada.nombre}»?`
        : `¿Reactivar «${jornada.nombre}»?`,
      mensaje: desactivar
        ? `Dejará de ofrecerse en las fichas. Quien ya la tiene la conserva: ${textoUso(jornada).toLowerCase()}.`
        : "Volverá a ofrecerse en las fichas del personal y de los conductores.",
      textoPrincipal: desactivar ? "Desactivar" : "Reactivar",
      onPrincipal: async () => {
        setProcesandoId(jornada.id);
        try {
          await JornadasLaboralesService.cambiarActivo(jornada.id, !desactivar);
        } finally {
          setProcesandoId(null);
        }
      },
    });
    if (confirmado) {
      toast.exito(
        desactivar
          ? `«${jornada.nombre}» desactivada`
          : `«${jornada.nombre}» reactivada`,
      );
      recargar();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {Boolean(error) && (
        <AvisoEnLinea
          variante="error"
          titulo="No se pudieron cargar las jornadas laborales"
          accion={
            <Boton tamano="sm" onClick={recargar}>
              Reintentar
            </Boton>
          }
        >
          {traducirError(error).mensaje}
        </AvisoEnLinea>
      )}

      <div className="overflow-x-auto">
        <table className="table table-sm table-zebra">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-app-label">
              <th scope="col">Nombre</th>
              <th scope="col">Días</th>
              <th scope="col">Horario</th>
              <th scope="col">Asignada a</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {jornadas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm text-app-muted"
                >
                  {cargando
                    ? "Cargando las jornadas…"
                    : "No hay jornadas laborales registradas."}
                </td>
              </tr>
            ) : (
              jornadas.map((jornada) => (
                <tr key={jornada.id} className="hover:bg-primary/5">
                  <td className="px-3 py-2 align-top font-medium">
                    {jornada.nombre}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {/* Cada día con su letra, todas del mismo ancho (2026-10-24): activa azul, inactiva gris con
                        borde. El nombre completo, para el lector de pantalla. */}
                    <span className="flex gap-1">
                      {DIAS_SEMANA.map((dia) => {
                        const trabaja = jornada.dias.includes(dia.dia);
                        return (
                          <span
                            key={dia.dia}
                            title={dia.nombre}
                            className={`badge badge-sm w-7 justify-center ${
                              trabaja
                                ? "badge-primary"
                                : "badge-outline border-base-300 text-app-muted"
                            }`}
                          >
                            {dia.letra}
                            <span className="sr-only">
                              {trabaja
                                ? `: ${dia.nombre}`
                                : `: ${dia.nombre}, no`}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {textoHorario(jornada)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <AsignadaA
                      jornada={jornada}
                      puedeVerPersonal={puedeVerPersonal}
                    />
                  </td>
                  {/* El estado lleva color **y** palabra (regla 6). */}
                  <td className="px-3 py-2 align-top">
                    <EtiquetaEstado
                      tono={jornada.activo ? "activo" : "inactivo"}
                    >
                      {jornada.activo ? "Activa" : "Inactiva"}
                    </EtiquetaEstado>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <AccionesFila
                      nombre={`la jornada ${jornada.nombre}`}
                      procesando={procesandoId === jornada.id}
                      editar={{ onClick: () => abrir(jornada) }}
                      estado={{
                        tipo: jornada.activo ? "desactivar" : "activar",
                        onClick: () => void cambiarActivo(jornada),
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {enCajon !== undefined && (
        <DrawerJornadaLaboral
          key={enCajon?.id ?? "nueva"}
          jornada={enCajon}
          jornadas={jornadas}
          guardando={guardando}
          errorServidor={errorServidor}
          onGuardar={(datos) => void guardar(datos)}
          onCerrar={cerrar}
        />
      )}
    </div>
  );
};

export default PanelJornadasLaborales;
