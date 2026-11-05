/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Zonas de la ciudad
 * Archivo: AdminZonasCiudadPage.tsx
 * Responsabilidad: Administrar las zonas de la ciudad, la tabla maestra de las zonales.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-05
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS ZONALES SALEN DE AQUÍ (2026-11-05). Cada zonal de un formulario (Catálogos del cuadro), la
 * ficha de personal, la flota, los tramos y la matriz de traslados apuntan a una zona de esta
 * lista. Antes, una zona nueva («Matriz») exigía una migración.
 *
 * Una pantalla aparte y no una pestaña de Catálogos, porque Catálogos se configura por formulario
 * y estas zonas no son de ninguno. Mismo permiso: `catalogos:administrar`.
 *
 * Desactivar y eliminar llegan apagados con el motivo del servidor (`puedeDesactivar`,
 * `puedeEliminar`): la misma regla decide el botón y el 409. El DMQ no se toca.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AccionesFila from "../components/common/AccionesFila.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import EncabezadoPagina from "../components/common/EncabezadoPagina.tsx";
import EtiquetaEstado from "../components/common/EtiquetaEstado.tsx";
import PanelTabla from "../components/common/PanelTabla.tsx";
import DrawerZonaCiudad from "../components/administracion/DrawerZonaCiudad.tsx";
import type { GuardarZonaCiudad, ZonaCiudad } from "../interfaces/ZonaCiudad.ts";
import { ZonasCiudadService } from "../services/zonasCiudad.service.ts";
import { avisoDeFallo, type AvisoTexto } from "../utils/errorApi.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";
import { traducirError } from "../utils/traductorErrores.ts";
import { MOTIVO_DMQ, nombreSector, textoUso } from "../utils/zonaCiudad.util.ts";

const AdminZonasCiudadPage = () => {
  const [zonas, setZonas] = useState<ZonaCiudad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<AvisoTexto | null>(null);
  /** `undefined` = cajón cerrado; `null` = alta; una zona = edición. */
  const [enEdicion, setEnEdicion] = useState<ZonaCiudad | null | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [resaltadoId, setResaltadoId] = useState<number | null>(null);

  useEffect(() => {
    if (resaltadoId === null) return undefined;
    const quitar = window.setTimeout(() => setResaltadoId(null), 4000);
    return () => window.clearTimeout(quitar);
  }, [resaltadoId]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setZonas(await ZonasCiudadService.listar());
      setAviso(null);
    } catch (fallo: unknown) {
      setZonas([]);
      setAviso(avisoDeFallo(fallo));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = (zona: ZonaCiudad | null) => {
    setErrorServidor(null);
    setEnEdicion(zona);
  };

  const guardar = async (datos: GuardarZonaCiudad) => {
    setGuardando(true);
    setErrorServidor(null);
    try {
      const guardada = enEdicion
        ? await ZonasCiudadService.actualizar(enEdicion.id, datos)
        : await ZonasCiudadService.crear(datos);
      toast.exito(
        enEdicion ? `Zona «${guardada.nombre}» actualizada` : `Zona «${guardada.nombre}» creada`,
      );
      setEnEdicion(undefined);
      setResaltadoId(guardada.id);
      await cargar();
    } catch (fallo: unknown) {
      // El mensaje del servidor, tal cual (regla 7): queda en el pie del cajón.
      setErrorServidor(traducirError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const conProceso = async (zona: ZonaCiudad, accion: () => Promise<unknown>) => {
    setProcesandoId(zona.id);
    try {
      await accion();
    } finally {
      setProcesandoId(null);
    }
  };

  const desactivar = async (zona: ZonaCiudad) => {
    const confirmado = await mensaje.confirmar({
      variante: "peligro",
      titulo: `¿Desactivar «${zona.nombre}»?`,
      mensaje:
        "Dejará de ofrecerse en las fichas, la flota y las zonales nuevas de los formularios. " +
        `Quien ya la tiene la conserva: ${textoUso(zona.uso).toLowerCase()}.`,
      textoPrincipal: "Desactivar",
      onPrincipal: () => conProceso(zona, () => ZonasCiudadService.desactivar(zona.id)),
    });
    if (confirmado) {
      toast.exito(`«${zona.nombre}» desactivada`);
      setResaltadoId(zona.id);
      await cargar();
    }
  };

  const reactivar = async (zona: ZonaCiudad) => {
    try {
      await conProceso(zona, () => ZonasCiudadService.reactivar(zona.id));
      toast.exito(`«${zona.nombre}» reactivada`);
      setResaltadoId(zona.id);
      await cargar();
    } catch (fallo: unknown) {
      mensaje.errorDe(fallo, { titulo: "No se pudo reactivar la zona" });
    }
  };

  const eliminar = async (zona: ZonaCiudad) => {
    let texto = "";
    const confirmado = await mensaje.confirmar({
      variante: "peligro",
      titulo: `¿Eliminar «${zona.nombre}»?`,
      mensaje:
        "Se borrará la zona y sus tiempos en la matriz de traslados. Esta acción no se puede deshacer.",
      textoPrincipal: "Eliminar",
      onPrincipal: () =>
        conProceso(zona, async () => {
          texto = (await ZonasCiudadService.eliminar(zona.id)).mensaje;
        }),
    });
    if (confirmado) {
      toast.exito(texto);
      await cargar();
    }
  };

  return (
    <section className="app-page-shell">
      <EncabezadoPagina
        modulo="Administración"
        titulo="Zonas de la ciudad"
        subtitulo="La lista maestra de las zonales. Cada formulario, la ficha de personal, la flota y la matriz de traslados eligen de aquí."
      />

      {aviso && (
        <AvisoEnLinea
          variante={aviso.variante}
          titulo="No se pudieron cargar las zonas"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {aviso.texto}
        </AvisoEnLinea>
      )}

      <PanelTabla
        titulo="Zonas"
        acciones={
          <Boton
            variante="primario"
            tamano="sm"
            onClick={() => abrir(null)}
            deshabilitado={cargando || guardando}
          >
            + Nueva zona
          </Boton>
        }
        nota={
          <>
            Una zona nueva no aparece sola en los formularios: agréguela a cada uno en{" "}
            <Link to="/administracion/catalogos-cuadro" className="link link-primary">
              Catálogos del cuadro
            </Link>
            . Para desactivarla, primero desactive su zonal en los formularios que la usan. Solo
            se elimina una zona que nunca se usó.
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="table table-sm table-zebra">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-app-label">
                <th scope="col">Zona</th>
                <th scope="col">Sector</th>
                <th scope="col">Uso</th>
                <th scope="col">Estado</th>
                <th scope="col" className="text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {zonas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-app-muted">
                    {cargando ? "Cargando las zonas…" : "No hay zonas de la ciudad registradas."}
                  </td>
                </tr>
              ) : (
                zonas.map((zona) => (
                  <tr
                    key={zona.id}
                    className={resaltadoId === zona.id ? "bg-primary/5" : "hover:bg-primary/5"}
                  >
                    <td className="px-3 py-2 align-top">
                      <span className="block font-medium">{zona.nombre}</span>
                      <span className="block font-mono text-xs text-app-muted">
                        {zona.codigo}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">{nombreSector(zona.sector)}</td>
                    <td className="px-3 py-2 align-top text-xs">
                      <span className="block">{textoUso(zona.uso)}</span>
                      {zona.formulariosActivos.length > 0 && (
                        <span className="block text-app-muted">
                          Activa en {zona.formulariosActivos.length === 1 ? "el formulario" : "los formularios"}{" "}
                          {zona.formulariosActivos.join(", ")}
                        </span>
                      )}
                    </td>
                    {/* El estado lleva color y palabra (regla 6). */}
                    <td className="px-3 py-2 align-top">
                      <EtiquetaEstado tono={zona.activo ? "activo" : "inactivo"}>
                        {zona.activo ? "Activa" : "Inactiva"}
                      </EtiquetaEstado>
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <AccionesFila
                        nombre={`la zona ${zona.nombre}`}
                        procesando={procesandoId === zona.id}
                        editar={{
                          onClick: () => abrir(zona),
                          motivo: zona.esDmq ? MOTIVO_DMQ : null,
                        }}
                        estado={
                          zona.activo
                            ? {
                                tipo: "desactivar",
                                onClick: () => void desactivar(zona),
                                motivo: zona.puedeDesactivar ? null : zona.motivoNoDesactivar,
                              }
                            : { tipo: "activar", onClick: () => void reactivar(zona) }
                        }
                        eliminar={{
                          onClick: () => void eliminar(zona),
                          motivo: zona.puedeEliminar ? null : zona.motivoNoEliminar,
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelTabla>

      {enEdicion !== undefined && (
        <DrawerZonaCiudad
          key={enEdicion?.id ?? "nueva"}
          zona={enEdicion}
          zonas={zonas}
          guardando={guardando}
          errorServidor={errorServidor}
          onGuardar={(datos) => void guardar(datos)}
          onCerrar={() => setEnEdicion(undefined)}
        />
      )}
    </section>
  );
};

export default AdminZonasCiudadPage;
