/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: ModalEditarOrden.tsx
 * Responsabilidad: Completar los HUECOS de una orden antes de generar su PDF.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-15
 *
 * ES SOLO PARA LOS HUECOS DE ESTA ORDEN (número de memorando, NUT, firmante…). La
 * estructura y los textos del documento —los apartados— viven en la PLANTILLA compartida,
 * que se edita aparte (`ModalPlantillaOrden`). El nombre y los operativos los fija el
 * servidor (RN-51).
 *
 * EDITAR → PREVISUALIZAR → GENERAR (2026-09-22). Se completa a la izquierda y se ve el PDF
 * REAL a la derecha: «Previsualizar» genera el memorando con lo escrito y lo pinta en línea
 * (react-pdf, `VisorPdf`); «Descargar PDF» lo baja. Antes la CSP no dejaba ver el PDF en la
 * app y solo se descargaba; ya está resuelto (ver `VisorPdf.tsx`).
 */

import { useEffect, useState, type ChangeEvent, type FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";
import VisorPdf from "./VisorPdf.tsx";
import type {
  DatosMemorando,
  EditablesMemorando,
} from "../../interfaces/Documento.ts";
import { DocumentoService } from "../../services/documento.service.ts";
import { descargarArchivo } from "../../utils/banner.util.ts";
import { presentarError } from "../../utils/errorApi.util.ts";

type ModalEditarOrdenProps = {
  codigo: string;
  onCerrar: () => void;
};

const VACIO: EditablesMemorando = {
  numeroMemorando: "",
  numeroOrden: "",
  nut: "",
  paraCargo: "",
  paraDependencia: "",
  direccionResponsable: "",
  firmanteNombre: "",
  firmanteCargo: "",
  firmanteDependencia: "",
  elaboradoPor: "",
  siglasUnidad: "",
};

const ModalEditarOrden: FC<ModalEditarOrdenProps> = ({ codigo, onCerrar }) => {
  const [datos, setDatos] = useState<DatosMemorando | null>(null);
  const [form, setForm] = useState<EditablesMemorando>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    void (async () => {
      setCargando(true);
      setError(null);

      try {
        const base = await DocumentoService.obtenerDatosMemorando(codigo);
        if (!vigente) return;

        setDatos(base);
        setForm({
          numeroMemorando: base.numeroMemorando,
          numeroOrden: base.numeroOrden,
          nut: base.nut,
          paraCargo: base.para.cargo,
          paraDependencia: base.para.dependencia,
          direccionResponsable: base.direccionResponsable,
          firmanteNombre: base.firmante.nombre,
          firmanteCargo: base.firmante.cargo,
          firmanteDependencia: base.firmante.dependencia,
          elaboradoPor: base.elaboradoPor,
          siglasUnidad: base.siglasUnidad,
        });
      } catch (fallo: unknown) {
        if (vigente) setError(presentarError(fallo).mensaje);
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [codigo]);

  const cambiar =
    (campo: keyof EditablesMemorando) =>
    (evento: ChangeEvent<HTMLInputElement>) =>
      setForm((actual) => ({ ...actual, [campo]: evento.target.value }));

  /** Genera el memorando con lo escrito y lo muestra a la derecha (react-pdf). */
  const previsualizar = async (): Promise<void> => {
    setPrevisualizando(true);
    setError(null);

    try {
      const pdf = await DocumentoService.generarMemorandoEditado(codigo, form);
      setVistaPrevia(pdf);
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    } finally {
      setPrevisualizando(false);
    }
  };

  /** Descarga el memorando con lo escrito (siempre lo más reciente). */
  const descargar = async (): Promise<void> => {
    setGenerando(true);
    setError(null);

    try {
      const pdf = await DocumentoService.generarMemorandoEditado(codigo, form);
      setVistaPrevia(pdf);
      descargarArchivo(pdf, `orden-${codigo}.pdf`);
    } catch (fallo: unknown) {
      setError(presentarError(fallo).mensaje);
    } finally {
      setGenerando(false);
    }
  };

  const ocupado = generando || previsualizando;

  return (
    <MarcoModal
      abierto
      etiqueta={`Editar orden ${codigo}`}
      ancho="7xl"
      onCerrar={ocupado ? undefined : onCerrar}
      antetitulo="Orden de servicio"
      titulo="Completar los datos de la orden"
      pie={
        <div className="flex flex-wrap justify-end gap-2">
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
            onClick={() => void descargar()}
            disabled={cargando || ocupado}
          >
            {generando ? (
              <>
                <span
                  className="loading loading-spinner loading-sm"
                  aria-hidden="true"
                />
                Generando…
              </>
            ) : (
              "Descargar PDF"
            )}
          </button>
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
          Cargando los datos de la orden…
        </p>
      ) : (
        datos && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Izquierda: los datos que se completan. */}
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-base-200/40 p-3 text-xs text-base-content/70">
                <p>
                  <span className="font-semibold text-base-content">
                    {datos.para.nombre}
                  </span>{" "}
                  · {datos.ciudadFecha}
                </p>
                <p className="mt-1">
                  Operativos:{" "}
                  {datos.operativos.length > 0
                    ? datos.operativos.map((o) => o.identificador).join(", ")
                    : "sin operativos en la jornada"}
                </p>
                <p className="mt-1">
                  Los apartados y textos del documento se editan en la plantilla
                  (botón «Editar plantilla»).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {campo("Nº de memorando", form.numeroMemorando, cambiar("numeroMemorando"))}
                {campo("Nº de orden", form.numeroOrden, cambiar("numeroOrden"))}
                {campo("NUT", form.nut, cambiar("nut"))}
                {campo("Dirección responsable", form.direccionResponsable, cambiar("direccionResponsable"))}
                {campo("Cargo del destinatario", form.paraCargo, cambiar("paraCargo"))}
                {campo("Dependencia del destinatario", form.paraDependencia, cambiar("paraDependencia"))}
                {campo("Firmante", form.firmanteNombre, cambiar("firmanteNombre"))}
                {campo("Cargo del firmante", form.firmanteCargo, cambiar("firmanteCargo"))}
                {campo("Dependencia del firmante", form.firmanteDependencia, cambiar("firmanteDependencia"))}
                {campo("Elaborado por", form.elaboradoPor, cambiar("elaboradoPor"))}
                {campo("Siglas de la unidad", form.siglasUnidad, cambiar("siglasUnidad"))}
              </div>
            </div>

            {/* Derecha: el PDF REAL con lo que se ha escrito (tras «Previsualizar»). */}
            <div className="flex flex-col gap-2">
              <span className="label-text">Vista previa</span>
              <div className="rounded-md border border-base-300 bg-base-200/30 p-2">
                <VisorPdf
                  pdf={vistaPrevia}
                  cargando={previsualizando}
                  ancho={560}
                  vacio="Pulse «Previsualizar» para ver el documento con lo que escribió."
                />
              </div>
            </div>
          </div>
        )
      )}
    </MarcoModal>
  );
};

/** Un campo de texto de una línea, con su etiqueta. */
function campo(
  etiqueta: string,
  valor: string | undefined,
  onChange: (evento: ChangeEvent<HTMLInputElement>) => void,
) {
  return (
    <label className="form-control w-full">
      <span className="label-text mb-1">{etiqueta}</span>
      <input
        type="text"
        className="input input-bordered input-sm w-full"
        value={valor ?? ""}
        onChange={onChange}
      />
    </label>
  );
}

export default ModalEditarOrden;
