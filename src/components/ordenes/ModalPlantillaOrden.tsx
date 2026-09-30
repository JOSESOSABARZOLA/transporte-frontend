/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: ModalPlantillaOrden.tsx
 * Responsabilidad: Editar y previsualizar la plantilla compartida de la orden de servicio.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-15
 *
 * UNA PLANTILLA ÚNICA, PARA TODAS LAS ÓRDENES. Se pueden añadir, quitar, reordenar y editar
 * apartados. La VISTA PREVIA ES EL PDF REAL (2026-09-22): «Previsualizar» genera el memorando con
 * los apartados en pantalla —aún sin guardar— y datos de muestra, y lo pinta con `VisorPdf`, tal
 * cual saldrá. Antes era un mock HTML porque la CSP no dejaba embeber el PDF; ya está resuelto. Los
 * `{{tokens}}` se sustituyen por los datos de cada persona al generar cada orden.
 */

import { useEffect, useState, type ChangeEvent, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";
import Iconos from "../common/Iconos.tsx";
import VisorPdf from "./VisorPdf.tsx";
import type { Apartado, TipoApartado } from "../../interfaces/Documento.ts";
import { DocumentoService } from "../../services/documento.service.ts";
import { presentarError } from "../../utils/errorApi.util.ts";

type ModalPlantillaOrdenProps = {
  onCerrar: () => void;
};

const TIPOS: { valor: TipoApartado; nombre: string }[] = [
  { valor: "texto", nombre: "Texto (párrafo)" },
  { valor: "lista", nombre: "Lista (viñetas)" },
  { valor: "campos", nombre: "Campos (Etiqueta: valor)" },
  { valor: "operativos", nombre: "Tabla de operativos" },
];

const TOKENS = [
  "nombre",
  "cargo",
  "dependencia",
  "fechaEmision",
  "ciudadFecha",
  "direccionResponsable",
  "numeroMemorando",
  "numeroOrden",
  "nut",
  "firmante",
  "elaboradoPor",
  "siglasUnidad",
];

const ModalPlantillaOrden: FC<ModalPlantillaOrdenProps> = ({ onCerrar }) => {
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    void (async () => {
      setCargando(true);
      try {
        const plantilla = await DocumentoService.obtenerPlantilla();
        if (vigente) setApartados(plantilla);
      } catch (fallo: unknown) {
        if (vigente) setError(presentarError(fallo).mensaje);
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    return () => {
      vigente = false;
    };
  }, []);

  const editar = (indice: number, cambio: Partial<Apartado>): void =>
    setApartados((actual) =>
      actual.map((a, i) => (i === indice ? { ...a, ...cambio } : a)),
    );

  const quitar = (indice: number): void =>
    setApartados((actual) => actual.filter((_, i) => i !== indice));

  const mover = (indice: number, direccion: -1 | 1): void =>
    setApartados((actual) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= actual.length) return actual;
      const copia = [...actual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });

  const anadir = (): void =>
    setApartados((actual) => [
      ...actual,
      {
        id: `nuevo-${Date.now()}`,
        titulo: "NUEVO APARTADO",
        tipo: "texto",
        contenido: "",
      },
    ]);

  /** Genera el PDF de la plantilla en edición (datos de muestra) y lo muestra a la derecha. */
  const previsualizar = async (): Promise<void> => {
    setPrevisualizando(true);
    setError(null);
    try {
      const pdf = await DocumentoService.previsualizarPlantilla(apartados);
      setVistaPrevia(pdf);
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    } finally {
      setPrevisualizando(false);
    }
  };

  const guardar = async (): Promise<void> => {
    setGuardando(true);
    setError(null);
    try {
      const guardada = await DocumentoService.guardarPlantilla(apartados);
      setApartados(guardada);
      onCerrar();
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const ocupado = guardando || previsualizando;

  return (
    <MarcoModal
      abierto
      etiqueta="Editar la plantilla de la orden de servicio"
      ancho="7xl"
      onCerrar={ocupado ? undefined : onCerrar}
      antetitulo="Orden de servicio"
      titulo="Plantilla del documento"
      pie={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={anadir}
            disabled={cargando || ocupado}
          >
            <Iconos nombre="agregar" /> Añadir apartado
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onCerrar}
              disabled={ocupado}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void previsualizar()}
              disabled={cargando || ocupado}
            >
              {previsualizando ? (
                <>
                  <span
                    className="loading loading-spinner loading-sm"
                    aria-hidden="true"
                  />
                  Generando…
                </>
              ) : (
                "Previsualizar"
              )}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void guardar()}
              disabled={cargando || ocupado}
            >
              {guardando ? (
                <>
                  <span
                    className="loading loading-spinner loading-sm"
                    aria-hidden="true"
                  />
                  Guardando…
                </>
              ) : (
                "Guardar plantilla"
              )}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="alert alert-error mb-4" role="alert">
          <span className="text-xs">{error}</span>
        </div>
      )}

      {cargando ? (
        <p className="py-6 text-center text-sm text-base-content/70">
          Cargando la plantilla…
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-base-content/70">
            Los <code>{"{{tokens}}"}</code> se reemplazan por los datos de cada
            persona al generar. Disponibles:{" "}
            {TOKENS.map((t) => `{{${t}}}`).join(", ")}.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Izquierda: editor de apartados */}
            <div className="flex flex-col gap-3">
            {apartados.map((apartado, indice) => (
              <div
                key={apartado.id}
                className="rounded-md border border-base-300 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    className="input input-bordered input-sm min-w-0 flex-1"
                    value={apartado.titulo}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editar(indice, { titulo: e.target.value })
                    }
                    aria-label={`Título del apartado ${indice + 1}`}
                  />
                  <select
                    className="select select-bordered select-sm"
                    value={apartado.tipo}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      editar(indice, { tipo: e.target.value as TipoApartado })
                    }
                    aria-label={`Tipo del apartado ${indice + 1}`}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label="Subir apartado"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === apartados.length - 1}
                    aria-label="Bajar apartado"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => quitar(indice)}
                    aria-label="Quitar apartado"
                  >
                    ✕
                  </button>
                </div>
                {apartado.tipo === "operativos" ? (
                  <p className="text-xs text-base-content/70">
                    Este apartado pinta la tabla de operativos de la persona
                    (IDS · Memorando u oficio · Motivo).
                  </p>
                ) : (
                  <textarea
                    className="textarea textarea-bordered textarea-sm w-full"
                    rows={3}
                    value={apartado.contenido}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      editar(indice, { contenido: e.target.value })
                    }
                    placeholder={
                      apartado.tipo === "campos"
                        ? "Una línea por campo: Etiqueta: valor"
                        : apartado.tipo === "lista"
                          ? "Una línea por viñeta"
                          : "Texto del apartado"
                    }
                    aria-label={`Contenido del apartado ${indice + 1}`}
                  />
                )}
              </div>
            ))}
            </div>

            {/* Derecha: el PDF REAL de la plantilla (con datos de muestra), tras «Previsualizar». */}
            <div className="flex flex-col gap-2">
              <span className="app-section-heading">Vista previa</span>
              <div className="rounded-md border border-base-300 bg-base-200/30 p-2">
                <VisorPdf
                  pdf={vistaPrevia}
                  cargando={previsualizando}
                  ancho={560}
                  vacio="Pulse «Previsualizar» para ver el documento con la plantilla actual."
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </MarcoModal>
  );
};

export default ModalPlantillaOrden;
