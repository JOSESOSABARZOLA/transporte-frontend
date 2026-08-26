/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: MisOrdenesPage.tsx
 * Responsabilidad: Pantalla P-06. Entregar al funcionario su propia asignación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO SE LE PASA NINGÚN IDENTIFICADOR AL SERVIDOR, Y ESA AUSENCIA ES LA GARANTÍA.
 *
 * `GET /ordenes-servicio/mias` resuelve de quién son las órdenes a partir de la identidad
 * autenticada. Si el funcionario viajara en la ruta o en la consulta, bastaría cambiar un
 * número para leer la asignación de otra persona —y RN-49 dice que cada quien recibe
 * únicamente la suya—.
 *
 * Por eso esta pantalla **no tiene ningún control que elija destinatario**, ni podría
 * tenerlo: el servicio no acepta el parámetro.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA CUENTA SIN FICHA DE PERSONAL SE EXPLICA, NO SE DEJA EN BLANCO. Si el usuario no está
 * enlazado a un funcionario, el servidor responde con el motivo redactado; mostrar «no
 * tiene órdenes» haría creer que no salió a ningún operativo, cuando lo que ocurre es que
 * el administrador no completó su ficha.
 */

import { useCallback, useEffect, useState } from "react";

import TarjetaOrden from "../components/ordenes/TarjetaOrden.tsx";
import type { OrdenServicio } from "../interfaces/Documento.ts";
import { DocumentoService } from "../services/documento.service.ts";
import { descargarArchivo } from "../utils/banner.util.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";

const MisOrdenesPage = () => {
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );

  useEffect(() => {
    let vigente = true;

    DocumentoService.consultarMias()
      .then((propias) => {
        if (vigente) {
          setOrdenes(propias);
          setAviso(null);
        }
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;

        // El mensaje del servidor se muestra tal cual (regla 7): explica si la cuenta no
        // tiene ficha de personal, que es distinto de no tener órdenes.
        const error = presentarError(fallo);
        setOrdenes([]);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const descargar = useCallback(async (codigo: string) => {
    setDescargando(codigo);

    try {
      const documento = await DocumentoService.descargarOrden(codigo);
      descargarArchivo(documento, `orden-${codigo}.pdf`);
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setDescargando(null);
    }
  }, []);

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          Funcionario
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
          Mis órdenes de servicio
        </h1>
        <p className="page-heading-subtitle text-sm">
          Su asignación para las próximas jornadas.
        </p>
      </header>

      {aviso && (
        <div
          className={`alert ${aviso.clase}`}
          role="alert"
        >
          <span>{aviso.texto}</span>
        </div>
      )}

      {cargando ? (
        <span className="badge badge-ghost badge-sm">Cargando sus órdenes…</span>
      ) : ordenes.length === 0 && !aviso ? (
        <div className="alert alert-info">
          <span>
            No tiene órdenes de servicio emitidas. Cuando la Dirección cierre el
            cuadro de una jornada en la que participe, aparecerá aquí.
          </span>
        </div>
      ) : (
        /* FASE5 §9.6: del teléfono hacia arriba. Una, dos y tres columnas. */
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ordenes.map((orden) => (
            <TarjetaOrden
              key={orden.codigo}
              orden={orden}
              descargando={descargando === orden.codigo}
              onDescargar={(codigo) => void descargar(codigo)}
            />
          ))}
        </div>
      )}

      {/* El aviso de aislamiento del esquema. Explica una ausencia, no adorna. */}
      <p className="text-xs text-base-content/70">
        Este documento contiene únicamente su asignación. No incluye el punto de
        encuentro ni el resto del personal del operativo: esa información se
        entrega por el canal que corresponda a cada jornada.
      </p>
    </section>
  );
};

export default MisOrdenesPage;
